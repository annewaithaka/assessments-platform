# server/app/routes/payments.py

"""
Payment routes.

Two groups:
1. User routes — submit a payment, check payment status
2. Admin routes — view all payments, verify or reject them

The key business rule: a user can only take an assessment if they 
have a verified payment for it. This is enforced here and again 
in the assessment-taking endpoints (defense in depth).
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.payment import Payment
from app.models.assessment import Assessment
from app.models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorators import admin_required
from datetime import datetime, timezone

payments_bp = Blueprint('payments', __name__, url_prefix='/api')


# ===================================================================
# USER ROUTES
# ===================================================================

@payments_bp.route('/payments', methods=['POST'])
@jwt_required()
def submit_payment():
    """
    Submit a payment for an assessment.
    
    Expects JSON:
    {
        "assessment_id": 1,
        "payment_reference": "QBH123XYZ9"  (e.g., M-Pesa code)
    }
    
    Business rules:
    - Can't pay for an inactive assessment
    - Can't submit duplicate payment references
    - Can't pay for the same assessment if a pending/verified payment exists
    """
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    assessment_id = data.get('assessment_id')
    payment_reference = data.get('payment_reference', '').strip()
    
    if not assessment_id:
        return jsonify({'error': 'Assessment ID is required'}), 400
    
    if not payment_reference:
        return jsonify({'error': 'Payment reference is required'}), 400
    
    # Check assessment exists and is active
    assessment = Assessment.query.get(assessment_id)
    if not assessment or not assessment.is_active:
        return jsonify({'error': 'Assessment not found or not available'}), 404
    
    # Check for existing pending or verified payment
    existing_payment = Payment.query.filter_by(
        user_id=current_user_id,
        assessment_id=assessment_id
    ).filter(Payment.status.in_(['pending', 'verified'])).first()
    # .in_() is SQLAlchemy's way of doing SQL's IN operator:
    # WHERE status IN ('pending', 'verified')
    
    if existing_payment:
        if existing_payment.status == 'verified':
            return jsonify({'error': 'You already have access to this assessment'}), 400
        else:
            return jsonify({'error': 'You already have a pending payment for this assessment'}), 400
    
    # Check for duplicate payment reference (across all users)
    duplicate_ref = Payment.query.filter_by(
        payment_reference=payment_reference
    ).first()
    
    if duplicate_ref:
        return jsonify({'error': 'This payment reference has already been used'}), 400
    
    # Create the payment
    payment = Payment(
        user_id=current_user_id,
        assessment_id=assessment_id,
        amount=assessment.price,
        payment_reference=payment_reference,
        status='pending'
    )
    
    db.session.add(payment)
    db.session.commit()
    
    return jsonify({
        'message': 'Payment submitted successfully. Awaiting admin verification.',
        'payment': payment.to_dict()
    }), 201


@payments_bp.route('/payments/my', methods=['GET'])
@jwt_required()
def get_my_payments():
    """
    Get all payments for the current user.
    
    This powers the user's dashboard — they can see which 
    assessments they've paid for and the status of each payment.
    """
    current_user_id = int(get_jwt_identity())
    
    payments = Payment.query.filter_by(user_id=current_user_id)\
        .order_by(Payment.created_at.desc()).all()
    
    return jsonify({
        'payments': [p.to_dict() for p in payments]
    }), 200


@payments_bp.route('/payments/check/<int:assessment_id>', methods=['GET'])
@jwt_required()
def check_payment_status(assessment_id):
    """
    Check if the current user has paid for a specific assessment.
    
    Returns the payment status so the frontend can decide whether 
    to show "Pay", "Pending", or "Start Test" buttons.
    
    This is a convenience endpoint — you could get this info from 
    /payments/my, but this is faster when you just need to check 
    one assessment.
    """
    current_user_id = int(get_jwt_identity())
    
    payment = Payment.query.filter_by(
        user_id=current_user_id,
        assessment_id=assessment_id
    ).order_by(Payment.created_at.desc()).first()
    # order_by desc gets the most recent payment if there are 
    # multiple (e.g., a rejected one followed by a new one)
    
    if not payment:
        return jsonify({'status': 'unpaid', 'payment': None}), 200
    
    return jsonify({
        'status': payment.status,
        'payment': payment.to_dict()
    }), 200


# ===================================================================
# ADMIN ROUTES
# ===================================================================

@payments_bp.route('/admin/payments', methods=['GET'])
@jwt_required()
@admin_required
def admin_get_payments():
    """
    Get all payments, with optional filtering.
    
    Query parameters:
    - status: filter by status ('pending', 'verified', 'rejected')
    - Example: /admin/payments?status=pending
    
    request.args reads query parameters from the URL 
    (everything after the ?). This is different from request.get_json() 
    which reads the request body.
    """
    status_filter = request.args.get('status')
    
    query = Payment.query.order_by(Payment.created_at.desc())
    
    if status_filter:
        query = query.filter_by(status=status_filter)
    
    payments = query.all()
    
    return jsonify({
        'payments': [p.to_dict() for p in payments]
    }), 200


@payments_bp.route('/admin/payments/<int:payment_id>/verify', methods=['PUT'])
@jwt_required()
@admin_required
def verify_payment(payment_id):
    """
    Verify (approve) a payment.
    
    The admin has checked their M-Pesa/bank account and confirmed 
    the payment reference is legit. Now the user can take the test.
    """
    payment = Payment.query.get(payment_id)
    
    if not payment:
        return jsonify({'error': 'Payment not found'}), 404
    
    if payment.status != 'pending':
        return jsonify({
            'error': f'Payment is already {payment.status}'
        }), 400
    
    payment.status = 'verified'
    payment.verified_at = datetime.now(timezone.utc)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Payment verified successfully',
        'payment': payment.to_dict()
    }), 200


@payments_bp.route('/admin/payments/<int:payment_id>/reject', methods=['PUT'])
@jwt_required()
@admin_required
def reject_payment(payment_id):
    """
    Reject a payment.
    
    The admin couldn't find the payment reference in their account, 
    or it was for the wrong amount, or something else was wrong.
    The user will need to submit a new payment.
    """
    payment = Payment.query.get(payment_id)
    
    if not payment:
        return jsonify({'error': 'Payment not found'}), 404
    
    if payment.status != 'pending':
        return jsonify({
            'error': f'Payment is already {payment.status}'
        }), 400
    
    payment.status = 'rejected'
    
    db.session.commit()
    
    return jsonify({
        'message': 'Payment rejected',
        'payment': payment.to_dict()
    }), 200