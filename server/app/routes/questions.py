# server/app/routes/questions.py

"""
Question CRUD routes — all admin-only.

Questions always belong to an assessment. The URL structure 
reflects this relationship:
    /admin/assessments/1/questions     — all questions for assessment 1
    /admin/assessments/1/questions/5   — question 5 in assessment 1

This is called "nested routes" and it makes the API intuitive. 
You can tell from the URL alone that questions live under assessments.
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.assessment import Assessment
from app.models.question import Question
from flask_jwt_extended import jwt_required
from app.utils.decorators import admin_required
import json

questions_bp = Blueprint('questions', __name__, url_prefix='/api/admin/assessments')


@questions_bp.route('/<int:assessment_id>/questions', methods=['GET'])
@jwt_required()
@admin_required
def get_questions(assessment_id):
    """Get all questions for an assessment (with correct answers)."""
    assessment = Assessment.query.get(assessment_id)
    
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404
    
    questions = Question.query.filter_by(assessment_id=assessment_id)\
        .order_by(Question.order).all()
    
    return jsonify({
        'questions': [q.to_dict(include_answer=True) for q in questions]
    }), 200


@questions_bp.route('/<int:assessment_id>/questions', methods=['POST'])
@jwt_required()
@admin_required
def create_question(assessment_id):
    """
    Add a question to an assessment.
    
    Expects JSON for MCQ:
    {
        "question_text": "What is Python?",
        "question_type": "mcq",
        "options": ["A snake", "A programming language", "A movie", "A food"],
        "correct_answer": "A programming language",
        "points": 2
    }
    
    For True/False:
    {
        "question_text": "Python is a compiled language",
        "question_type": "true_false",
        "correct_answer": "false",
        "points": 1
    }
    
    For Short Answer:
    {
        "question_text": "What keyword is used to define a function in Python?",
        "question_type": "short_answer",
        "correct_answer": "def",
        "points": 1
    }
    """
    assessment = Assessment.query.get(assessment_id)
    
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Validate required fields
    question_text = data.get('question_text', '').strip()
    question_type = data.get('question_type', '').strip()
    correct_answer = data.get('correct_answer', '').strip()
    
    if not question_text:
        return jsonify({'error': 'Question text is required'}), 400
    
    if question_type not in ['mcq', 'true_false', 'short_answer']:
        return jsonify({
            'error': 'Question type must be mcq, true_false, or short_answer'
        }), 400
    
    if not correct_answer:
        return jsonify({'error': 'Correct answer is required'}), 400
    
    # Type-specific validation
    if question_type == 'mcq':
        options = data.get('options', [])
        if not options or len(options) < 2:
            return jsonify({'error': 'MCQ questions need at least 2 options'}), 400
        if correct_answer not in options:
            return jsonify({
                'error': 'Correct answer must be one of the options'
            }), 400
    
    if question_type == 'true_false':
        if correct_answer.lower() not in ['true', 'false']:
            return jsonify({'error': 'True/False answer must be "true" or "false"'}), 400
        correct_answer = correct_answer.lower()
    
    # Auto-set the order to be last
    # Count existing questions and add 1
    current_count = Question.query.filter_by(assessment_id=assessment_id).count()
    
    question = Question(
        assessment_id=assessment_id,
        question_text=question_text,
        question_type=question_type,
        correct_answer=correct_answer,
        points=data.get('points', 1),
        order=current_count + 1
    )
    
    # Set options for MCQ
    if question_type == 'mcq':
        question.set_options(data['options'])
    elif question_type == 'true_false':
        question.set_options(['True', 'False'])
    
    db.session.add(question)
    db.session.commit()
    
    return jsonify({
        'message': 'Question added successfully',
        'question': question.to_dict(include_answer=True)
    }), 201


@questions_bp.route('/<int:assessment_id>/questions/<int:question_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_question(assessment_id, question_id):
    """Update a question. Only updates provided fields."""
    question = Question.query.filter_by(
        id=question_id, 
        assessment_id=assessment_id
    ).first()
    
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'question_text' in data:
        text = data['question_text'].strip()
        if not text:
            return jsonify({'error': 'Question text cannot be empty'}), 400
        question.question_text = text
    
    if 'question_type' in data:
        if data['question_type'] not in ['mcq', 'true_false', 'short_answer']:
            return jsonify({'error': 'Invalid question type'}), 400
        question.question_type = data['question_type']
    
    if 'options' in data:
        question.set_options(data['options'])
    
    if 'correct_answer' in data:
        answer = data['correct_answer'].strip()
        if not answer:
            return jsonify({'error': 'Correct answer cannot be empty'}), 400
        question.correct_answer = answer
    
    if 'points' in data:
        question.points = data.get('points', 1)
    
    if 'order' in data:
        question.order = data['order']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Question updated successfully',
        'question': question.to_dict(include_answer=True)
    }), 200


@questions_bp.route('/<int:assessment_id>/questions/<int:question_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_question(assessment_id, question_id):
    """Delete a question from an assessment."""
    question = Question.query.filter_by(
        id=question_id, 
        assessment_id=assessment_id
    ).first()
    
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    db.session.delete(question)
    db.session.commit()
    
    # Reorder remaining questions so there are no gaps
    # e.g., if you delete question 2 of 5, questions 3,4,5 
    # become 2,3,4
    remaining = Question.query.filter_by(assessment_id=assessment_id)\
        .order_by(Question.order).all()
    for i, q in enumerate(remaining):
        q.order = i + 1
    db.session.commit()
    
    return jsonify({'message': 'Question deleted successfully'}), 200