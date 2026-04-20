# server/app/routes/certificates.py

"""
Certificate routes.

Two endpoints:
1. Generate/download a certificate for a completed attempt
2. Verify a certificate by its ID (public — no auth required)

Business rule: certificates are only generated for completed attempts.
The certificate is generated on-the-fly each time it's requested 
(not stored permanently). This means if the user's name changes, 
the certificate reflects the current name.
"""

from flask import Blueprint, jsonify, send_file
from app import db
from app.models.attempt import Attempt
from app.models.user import User
from app.models.assessment import Assessment
from app.utils.certificate import generate_certificate
from flask_jwt_extended import jwt_required, get_jwt_identity
import os

certificates_bp = Blueprint('certificates', __name__, url_prefix='/api')


@certificates_bp.route('/certificates/<int:attempt_id>', methods=['GET'])
@jwt_required()
def download_certificate(attempt_id):
    """
    Generate and download a certificate PDF.
    
    The certificate is generated fresh each time rather than 
    being stored. This keeps things simple and ensures the 
    certificate always reflects current data.
    
    send_file() is Flask's way of returning a file as the response.
    The browser will download it with the specified filename.
    """
    current_user_id = int(get_jwt_identity())
    
    attempt = Attempt.query.get(attempt_id)
    
    if not attempt:
        return jsonify({'error': 'Attempt not found'}), 404
    
    if attempt.user_id != current_user_id:
        return jsonify({'error': 'This is not your attempt'}), 403
    
    if attempt.status not in ['completed', 'timed_out']:
        return jsonify({
            'error': 'Certificate is only available for completed assessments'
        }), 400
    
    user = User.query.get(attempt.user_id)
    assessment = Assessment.query.get(attempt.assessment_id)
    
    if not user or not assessment:
        return jsonify({'error': 'User or assessment not found'}), 404
    
    # Generate a consistent certificate ID based on the attempt
    # This ensures the same attempt always gets the same certificate ID
    certificate_id = f'CERT-{attempt.id:04d}-{attempt.user_id:04d}'
    
    try:
        output_path, cert_id = generate_certificate(
            user_name=user.name,
            assessment_title=assessment.title,
            score=attempt.score,
            max_score=attempt.max_score,
            completion_date=attempt.end_time,
            certificate_id=certificate_id
        )
        
        # send_file sends the PDF to the browser
        # as_attachment=True triggers a download instead of 
        # displaying in the browser
        return send_file(
            output_path,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'Certificate_{assessment.title.replace(" ", "_")}_{user.name.replace(" ", "_")}.pdf'
        )
        
    except Exception as e:
        print(f'[CERTIFICATE ERROR] {e}')
        return jsonify({'error': 'Failed to generate certificate'}), 500


@certificates_bp.route('/certificates/verify/<string:certificate_id>', methods=['GET'])
def verify_certificate(certificate_id):
    """
    Public endpoint to verify a certificate is legitimate.
    
    Anyone with a certificate ID can check if it's real.
    This is important for employers or institutions that want 
    to confirm someone actually earned a certificate.
    
    No authentication required — this is intentionally public.
    """
    # Parse the certificate ID to extract attempt and user IDs
    # Format: CERT-0001-0001
    try:
        parts = certificate_id.split('-')
        if len(parts) != 3 or parts[0] != 'CERT':
            return jsonify({'valid': False, 'error': 'Invalid certificate format'}), 400
        
        attempt_id = int(parts[1])
        user_id = int(parts[2])
    except (ValueError, IndexError):
        return jsonify({'valid': False, 'error': 'Invalid certificate format'}), 400
    
    # Look up the attempt
    attempt = Attempt.query.filter_by(
        id=attempt_id,
        user_id=user_id
    ).first()
    
    if not attempt or attempt.status not in ['completed', 'timed_out']:
        return jsonify({
            'valid': False,
            'error': 'Certificate not found'
        }), 404
    
    user = User.query.get(attempt.user_id)
    assessment = Assessment.query.get(attempt.assessment_id)
    
    return jsonify({
        'valid': True,
        'certificate': {
            'certificate_id': certificate_id,
            'user_name': user.name,
            'assessment_title': assessment.title,
            'score': attempt.score,
            'max_score': attempt.max_score,
            'completed_at': attempt.end_time.isoformat() if attempt.end_time else None
        }
    }), 200