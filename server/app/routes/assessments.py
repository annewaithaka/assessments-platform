# server/app/routes/assessments.py

"""
Assessment CRUD routes.

Two groups of endpoints:
1. Public — anyone can browse active assessments (for the catalog)
2. Admin — full CRUD (create, read, update, delete)

Why separate them? A regular user should see published assessments 
with limited info (no correct answers). The admin needs to see 
everything, including drafts and all question details.
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.assessment import Assessment
from app.models.question import Question
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorators import admin_required

assessments_bp = Blueprint('assessments', __name__, url_prefix='/api')


# ===================================================================
# PUBLIC ROUTES — any authenticated user can access these
# ===================================================================

@assessments_bp.route('/assessments', methods=['GET'])
def get_public_assessments():
    """
    List all active (published) assessments.
    
    This is the catalog page — users browse these to decide 
    which test to pay for. We only show active assessments 
    and don't include questions or correct answers.
    """
    assessments = Assessment.query.filter_by(is_active=True).all()
    return jsonify({
        'assessments': [a.to_dict() for a in assessments]
    }), 200


@assessments_bp.route('/assessments/<int:assessment_id>', methods=['GET'])
def get_public_assessment(assessment_id):
    """
    Get a single assessment's details (public view).
    
    Shows the assessment info and question count, but NOT the 
    questions themselves or correct answers. Users see the full 
    questions only after paying and starting the test.
    """
    assessment = Assessment.query.get(assessment_id)
    
    if not assessment or not assessment.is_active:
        return jsonify({'error': 'Assessment not found'}), 404
    
    return jsonify({'assessment': assessment.to_dict()}), 200


# ===================================================================
# ADMIN ROUTES — only the admin can access these
# ===================================================================

@assessments_bp.route('/admin/assessments', methods=['GET'])
@jwt_required()
@admin_required
def admin_get_assessments():
    """
    List ALL assessments (including inactive/draft ones).
    The admin needs to see everything they've created.
    """
    assessments = Assessment.query.order_by(Assessment.created_at.desc()).all()
    return jsonify({
        'assessments': [a.to_dict() for a in assessments]
    }), 200


@assessments_bp.route('/admin/assessments', methods=['POST'])
@jwt_required()
@admin_required
def admin_create_assessment():
    """
    Create a new assessment.
    
    Expects JSON:
    {
        "title": "Python Fundamentals",
        "description": "Test your Python knowledge",
        "duration_minutes": 60,
        "price": 1500
    }
    
    New assessments start as inactive (is_active=False). The admin 
    must explicitly publish them after adding questions. This prevents 
    publishing an empty test by accident.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Validate required fields
    title = data.get('title', '').strip()
    duration = data.get('duration_minutes')
    price = data.get('price')
    
    if not title:
        return jsonify({'error': 'Title is required'}), 400
    
    if not duration or not isinstance(duration, (int, float)) or duration <= 0:
        return jsonify({'error': 'Valid duration in minutes is required'}), 400
    
    if price is None or not isinstance(price, (int, float)) or price < 0:
        return jsonify({'error': 'Valid price is required (0 for free)'}), 400
    
    assessment = Assessment(
        title=title,
        description=data.get('description', '').strip(),
        duration_minutes=int(duration),
        price=float(price)
    )
    
    db.session.add(assessment)
    db.session.commit()
    
    return jsonify({
        'message': 'Assessment created successfully',
        'assessment': assessment.to_dict()
    }), 201


@assessments_bp.route('/admin/assessments/<int:assessment_id>', methods=['GET'])
@jwt_required()
@admin_required
def admin_get_assessment(assessment_id):
    """
    Get a single assessment with ALL details including questions 
    and correct answers. Admin-only because it exposes answers.
    """
    assessment = Assessment.query.get(assessment_id)
    
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404
    
    # include_questions=True sends all questions with correct answers
    data = assessment.to_dict(include_questions=True)
    # Override questions to include answers (admin view)
    data['questions'] = [
        q.to_dict(include_answer=True) 
        for q in sorted(assessment.questions, key=lambda x: x.order)
    ]
    
    return jsonify({'assessment': data}), 200


@assessments_bp.route('/admin/assessments/<int:assessment_id>', methods=['PUT'])
@jwt_required()
@admin_required
def admin_update_assessment(assessment_id):
    """
    Update an assessment's details.
    
    Only updates fields that are provided in the request.
    This is called a "partial update" — you don't have to send 
    every field, just the ones you want to change.
    """
    assessment = Assessment.query.get(assessment_id)
    
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Update only provided fields
    if 'title' in data:
        title = data['title'].strip()
        if not title:
            return jsonify({'error': 'Title cannot be empty'}), 400
        assessment.title = title
    
    if 'description' in data:
        assessment.description = data['description'].strip()
    
    if 'duration_minutes' in data:
        duration = data['duration_minutes']
        if not isinstance(duration, (int, float)) or duration <= 0:
            return jsonify({'error': 'Valid duration is required'}), 400
        assessment.duration_minutes = int(duration)
    
    if 'price' in data:
        price = data['price']
        if not isinstance(price, (int, float)) or price < 0:
            return jsonify({'error': 'Valid price is required'}), 400
        assessment.price = float(price)
    
    if 'is_active' in data:
        # Don't allow publishing an assessment with no questions
        if data['is_active'] and len(assessment.questions) == 0:
            return jsonify({
                'error': 'Cannot publish an assessment with no questions'
            }), 400
        assessment.is_active = bool(data['is_active'])
    
    db.session.commit()
    
    return jsonify({
        'message': 'Assessment updated successfully',
        'assessment': assessment.to_dict()
    }), 200


@assessments_bp.route('/admin/assessments/<int:assessment_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def admin_delete_assessment(assessment_id):
    """
    Delete an assessment and all its questions.
    
    The cascade='all, delete-orphan' we set on the Assessment model 
    means questions are automatically deleted. We don't have to 
    manually delete them first.
    """
    assessment = Assessment.query.get(assessment_id)
    
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404
    
    db.session.delete(assessment)
    db.session.commit()
    
    return jsonify({'message': 'Assessment deleted successfully'}), 200