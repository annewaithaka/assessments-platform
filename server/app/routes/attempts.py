# server/app/routes/attempts.py

"""
Assessment attempt routes — the test-taking engine.

Flow:
1. User clicks "Start Test" → POST /api/attempts (creates an attempt)
2. Server returns the questions (WITHOUT correct answers)
3. User answers questions → PUT /api/attempts/:id/answer
4. User clicks "Submit" or timer expires → POST /api/attempts/:id/submit
5. Server grades the answers and returns the score

Key rules:
- Must have a verified payment to start
- Only one active attempt per assessment per user
- Timer is enforced server-side (can't cheat by modifying the frontend)
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.assessment import Assessment
from app.models.question import Question
from app.models.payment import Payment
from app.models.attempt import Attempt, Answer
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone, timedelta

attempts_bp = Blueprint('attempts', __name__, url_prefix='/api')


@attempts_bp.route('/attempts', methods=['POST'])
@jwt_required()
def start_attempt():
    """
    Start a new assessment attempt.
    
    Expects JSON: { "assessment_id": 1 }
    
    Checks:
    1. Assessment exists and is active
    2. User has a verified payment
    3. User doesn't already have an in-progress attempt
    
    Returns the questions WITHOUT correct answers.
    """
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data or not data.get('assessment_id'):
        return jsonify({'error': 'Assessment ID is required'}), 400
    
    assessment_id = data['assessment_id']
    
    # Check assessment exists and is active
    assessment = Assessment.query.get(assessment_id)
    if not assessment or not assessment.is_active:
        return jsonify({'error': 'Assessment not found or not available'}), 404
    
    # Check payment is verified
    payment = Payment.query.filter_by(
        user_id=current_user_id,
        assessment_id=assessment_id,
        status='verified'
    ).first()
    
    if not payment:
        return jsonify({'error': 'Payment required. Please pay for this assessment first.'}), 403
    
    # Check for existing in-progress attempt
    existing_attempt = Attempt.query.filter_by(
        user_id=current_user_id,
        assessment_id=assessment_id,
        status='in_progress'
    ).first()
    
    if existing_attempt:
        # Check if it's timed out
        time_limit = existing_attempt.start_time + timedelta(
            minutes=assessment.duration_minutes
        )
        
        if datetime.now(timezone.utc) > time_limit.replace(tzinfo=timezone.utc):
            # Auto-submit the timed-out attempt
            _grade_and_complete(existing_attempt, 'timed_out')
        else:
            # Return existing attempt so user can resume
            questions = Question.query.filter_by(
                assessment_id=assessment_id
            ).order_by(Question.order).all()
            
            # Get existing answers
            existing_answers = {
                a.question_id: a.user_answer 
                for a in existing_attempt.answers
            }
            
            return jsonify({
                'message': 'Resuming existing attempt',
                'attempt': existing_attempt.to_dict(),
                'questions': [q.to_dict(include_answer=False) for q in questions],
                'answers': existing_answers,
                'time_remaining': _get_time_remaining(
                    existing_attempt, assessment.duration_minutes
                )
            }), 200
    
    # Check for completed attempt (already took this test)
    completed_attempt = Attempt.query.filter_by(
        user_id=current_user_id,
        assessment_id=assessment_id
    ).filter(Attempt.status.in_(['completed', 'timed_out'])).first()
    
    if completed_attempt:
        return jsonify({
            'error': 'You have already completed this assessment'
        }), 400
    
    # Create new attempt
    questions = Question.query.filter_by(
        assessment_id=assessment_id
    ).order_by(Question.order).all()
    
    if not questions:
        return jsonify({'error': 'This assessment has no questions'}), 400
    
    # Calculate max possible score (exclude Likert — they're not graded)
    max_score = sum(q.points for q in questions if q.question_type != 'likert')
    
    attempt = Attempt(
        user_id=current_user_id,
        assessment_id=assessment_id,
        max_score=max_score,
        status='in_progress'
    )
    
    db.session.add(attempt)
    db.session.commit()
    
    return jsonify({
        'message': 'Assessment started',
        'attempt': attempt.to_dict(),
        'questions': [q.to_dict(include_answer=False) for q in questions],
        'answers': {},
        'time_remaining': assessment.duration_minutes * 60
        # Return seconds for the frontend timer
    }), 201


@attempts_bp.route('/attempts/<int:attempt_id>/answer', methods=['PUT'])
@jwt_required()
def save_answer(attempt_id):
    """
    Save or update an answer for a question.
    
    Expects JSON: { "question_id": 1, "answer": "A programming language" }
    
    We save answers one at a time as the user progresses. This way, 
    if they lose connection or their browser crashes, their previous 
    answers are preserved. Much better than saving everything at 
    the end and losing all progress on a crash.
    """
    current_user_id = int(get_jwt_identity())
    
    attempt = Attempt.query.get(attempt_id)
    
    if not attempt:
        return jsonify({'error': 'Attempt not found'}), 404
    
    if attempt.user_id != current_user_id:
        return jsonify({'error': 'This is not your attempt'}), 403
    
    if attempt.status != 'in_progress':
        return jsonify({'error': 'This attempt is already completed'}), 400
    
    # Check time limit
    assessment = Assessment.query.get(attempt.assessment_id)
    time_limit = attempt.start_time + timedelta(minutes=assessment.duration_minutes)
    
    if datetime.now(timezone.utc) > time_limit.replace(tzinfo=timezone.utc):
        _grade_and_complete(attempt, 'timed_out')
        return jsonify({'error': 'Time is up! Your test has been auto-submitted.'}), 400
    
    data = request.get_json()
    question_id = data.get('question_id')
    user_answer = data.get('answer', '')
    
    if not question_id:
        return jsonify({'error': 'Question ID is required'}), 400
    
    # Verify the question belongs to this assessment
    question = Question.query.filter_by(
        id=question_id,
        assessment_id=attempt.assessment_id
    ).first()
    
    if not question:
        return jsonify({'error': 'Question not found in this assessment'}), 404
    
    # Check if answer already exists (update) or create new
    existing_answer = Answer.query.filter_by(
        attempt_id=attempt_id,
        question_id=question_id
    ).first()
    
    if existing_answer:
        existing_answer.user_answer = str(user_answer)
    else:
        answer = Answer(
            attempt_id=attempt_id,
            question_id=question_id,
            user_answer=str(user_answer)
        )
        db.session.add(answer)
    
    db.session.commit()
    
    return jsonify({'message': 'Answer saved'}), 200


@attempts_bp.route('/attempts/<int:attempt_id>/submit', methods=['POST'])
@jwt_required()
def submit_attempt(attempt_id):
    """
    Submit and grade the assessment.
    
    This is called when:
    1. User clicks "Submit" manually
    2. Timer reaches zero (frontend auto-submits)
    
    Grading logic:
    - MCQ: exact match with correct_answer
    - True/False: case-insensitive match
    - Short Answer: case-insensitive, trimmed match
    """
    current_user_id = int(get_jwt_identity())
    
    attempt = Attempt.query.get(attempt_id)
    
    if not attempt:
        return jsonify({'error': 'Attempt not found'}), 404
    
    if attempt.user_id != current_user_id:
        return jsonify({'error': 'This is not your attempt'}), 403
    
    if attempt.status != 'in_progress':
        return jsonify({'error': 'This attempt is already completed'}), 400
    
    # Grade and complete
    _grade_and_complete(attempt, 'completed')
    
    # Get detailed results
    results = _get_attempt_results(attempt)
    
    return jsonify({
        'message': 'Assessment submitted successfully',
        'attempt': attempt.to_dict(),
        'results': results
    }), 200


@attempts_bp.route('/attempts/<int:attempt_id>/results', methods=['GET'])
@jwt_required()
def get_results(attempt_id):
    """
    Get the results of a completed attempt.
    
    Shows each question, the user's answer, the correct answer, 
    and whether they got it right. This powers the results page.
    """
    current_user_id = int(get_jwt_identity())
    
    attempt = Attempt.query.get(attempt_id)
    
    if not attempt:
        return jsonify({'error': 'Attempt not found'}), 404
    
    if attempt.user_id != current_user_id:
        return jsonify({'error': 'This is not your attempt'}), 403
    
    if attempt.status == 'in_progress':
        return jsonify({'error': 'This attempt is still in progress'}), 400
    
    results = _get_attempt_results(attempt)
    
    return jsonify({
        'attempt': attempt.to_dict(),
        'results': results
    }), 200


# ===================================================================
# HELPER FUNCTIONS
# ===================================================================

def _grade_and_complete(attempt, status):
    """
    Grade all answers and mark the attempt as complete.
    
    Separated into a helper because it's called from multiple 
    places: manual submit, auto-submit on timeout, and timeout 
    detection when resuming.
    
    The underscore prefix is a Python convention meaning "this is 
    a private/internal function — don't call it from outside this 
    module."
    """
    questions = Question.query.filter_by(
        assessment_id=attempt.assessment_id
    ).all()
    
    # Build a lookup dict for fast access
    question_map = {q.id: q for q in questions}
    
    total_score = 0
    
    for answer in attempt.answers:
        question = question_map.get(answer.question_id)
        if not question:
            continue
        
        # Likert questions are not graded — they're behavioral
        if question.question_type == 'likert':
            answer.is_correct = None  # Not applicable
            continue
        
        # Grade based on question type
        is_correct = False
        
        if question.question_type == 'mcq':
            # Exact match for MCQ
            is_correct = (
                answer.user_answer.strip() == question.correct_answer.strip()
            )
        
        elif question.question_type == 'true_false':
            # Case-insensitive match for True/False
            is_correct = (
                answer.user_answer.strip().lower() == 
                question.correct_answer.strip().lower()
            )
        
        elif question.question_type == 'short_answer':
            # Case-insensitive, trimmed match for Short Answer
            is_correct = (
                answer.user_answer.strip().lower() == 
                question.correct_answer.strip().lower()
            )
        
        answer.is_correct = is_correct
        if is_correct:
            total_score += question.points
    
    attempt.score = total_score
    attempt.status = status
    attempt.end_time = datetime.now(timezone.utc)
    
    db.session.commit()


def _get_time_remaining(attempt, duration_minutes):
    """Calculate seconds remaining for an in-progress attempt."""
    elapsed = datetime.now(timezone.utc) - attempt.start_time.replace(
        tzinfo=timezone.utc
    )
    total_seconds = duration_minutes * 60
    remaining = total_seconds - elapsed.total_seconds()
    return max(0, int(remaining))


def _get_attempt_results(attempt):
    """
    Build detailed results for a completed attempt.
    
    Returns each question with the user's answer and the correct 
    answer so the results page can show a full breakdown.
    """
    questions = Question.query.filter_by(
        assessment_id=attempt.assessment_id
    ).order_by(Question.order).all()
    
    # Build answer lookup
    answer_map = {a.question_id: a for a in attempt.answers}
    
    results = []
    for question in questions:
        answer = answer_map.get(question.id)
        results.append({
            'question_id': question.id,
            'question_text': question.question_text,
            'question_type': question.question_type,
            'options': question.get_options(),
            'correct_answer': question.correct_answer,
            'user_answer': answer.user_answer if answer else None,
            'is_correct': answer.is_correct if answer else False,
            'points': question.points,
            'points_earned': question.points if (answer and answer.is_correct) else 0,
        })
    
    return results