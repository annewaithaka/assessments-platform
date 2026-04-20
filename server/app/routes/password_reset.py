# server/app/routes/password_reset.py

"""
Password reset routes.

Uses itsdangerous to create signed tokens. "Signed" means the 
token contains data (the user's email) that's been cryptographically 
signed with your SECRET_KEY. If anyone tampers with the token, 
the signature check fails. This prevents attackers from crafting 
their own reset tokens.
"""

from flask import Blueprint, request, jsonify, current_app
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from app import db
from app.models.user import User
from app.utils.email import send_reset_email

password_reset_bp = Blueprint('password_reset', __name__, url_prefix='/api/auth')


def get_serializer():
    """
    Create a serializer for generating/verifying tokens.
    
    Why a function instead of a global variable? Because it needs 
    access to current_app.config, which is only available during 
    a request. Creating it at module level would fail.
    """
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'])


@password_reset_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """
    Request a password reset.
    
    Expects JSON: { "email": "user@example.com" }
    
    IMPORTANT: We return the same success message whether the email 
    exists or not. Why? Same reason as the login endpoint — we don't 
    want attackers to find out which emails are registered by testing 
    them through the password reset form.
    """
    data = request.get_json()
    
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400
    
    email = data['email'].strip().lower()
    
    # Always return success to prevent email enumeration
    success_response = jsonify({
        'message': 'If an account with this email exists, a reset link has been sent.'
    }), 200
    
    # Look up the user
    user = User.query.filter_by(email=email).first()
    
    if not user:
        # User doesn't exist, but we still return success
        return success_response
    
    # Generate a signed token containing the user's email
    serializer = get_serializer()
    token = serializer.dumps(email, salt='password-reset-salt')
    # The 'salt' adds extra uniqueness. If you used the same 
    # serializer for other purposes (like email verification), 
    # the salt ensures tokens from one purpose can't be used 
    # for another.
    
    # Build the reset URL pointing to the React frontend
    # In production, this would be your actual domain
    reset_url = f'http://localhost:5173/reset-password?token={token}'
    
    # Send the email (or print to console in development)
    send_reset_email(user.email, reset_url)
    
    return success_response


@password_reset_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Reset the password using a valid token.
    
    Expects JSON: { "token": "abc123...", "password": "newpassword123" }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    token = data.get('token', '')
    new_password = data.get('password', '')
    
    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400
    
    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    # Verify the token
    serializer = get_serializer()
    
    try:
        email = serializer.loads(
            token,
            salt='password-reset-salt',
            max_age=3600  # Token expires after 3600 seconds (1 hour)
        )
        # If this succeeds, we get back the email we stored in the token.
        # If the token is expired or tampered with, it raises an exception.
        
    except SignatureExpired:
        return jsonify({'error': 'Reset link has expired. Please request a new one.'}), 400
    except BadSignature:
        return jsonify({'error': 'Invalid reset link.'}), 400
    
    # Find the user and update their password
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'User not found.'}), 404
    
    user.set_password(new_password)
    db.session.commit()
    
    print(f'[PASSWORD RESET] Password updated for {email}')
    
    return jsonify({'message': 'Password has been reset successfully. You can now log in.'}), 200