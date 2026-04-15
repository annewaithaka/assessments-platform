# server/app/routes/auth.py

"""
Authentication routes — register and login.

These are grouped in a Blueprint. A Blueprint is Flask's way of 
organizing related routes into a separate module. Without blueprints, 
ALL your routes would be in __init__.py — a nightmare to maintain.

Think of a Blueprint as a mini-app that gets "plugged into" the 
main app. Each Blueprint can have its own routes, error handlers, 
and even templates.
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User
from flask_jwt_extended import (
    create_access_token, 
    create_refresh_token,
    jwt_required, 
    get_jwt_identity
)
from datetime import timedelta

# Create the Blueprint
# 'auth' = name (used internally by Flask)
# __name__ = tells Flask where this module is located
# url_prefix = all routes in this blueprint start with /api/auth
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user.
    
    Expects JSON:
    {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "securepassword123"
    }
    
    Why do we validate on the server even if we validate on the frontend?
    Because ANYONE can send a request to your API — not just your React app.
    Someone could use Postman, curl, or a script. Server-side validation 
    is your last line of defense. Never trust the client.
    """
    data = request.get_json()
    
    # --- Validation ---
    # Check that all required fields are present
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password are required'}), 400
    
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    # Check if email is already taken
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists'}), 409
        # 409 = Conflict — the right HTTP status code for "this already exists"
    
    # --- Create the user ---
    user = User(name=name, email=email)
    user.set_password(password)  # Hash the password
    
    db.session.add(user)
    db.session.commit()
    # db.session is like a "staging area." You add changes to it, 
    # then commit() writes them all to the database at once.
    # If something fails between add and commit, nothing is saved — 
    # this prevents partial/corrupted data.
    
    return jsonify({
        'message': 'Registration successful',
        'user': user.to_dict()
    }), 201  # 201 = Created


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Log in an existing user.
    
    Expects JSON:
    {
        "email": "john@example.com",
        "password": "securepassword123"
    }
    
    Returns a JWT access token and a refresh token.
    
    Why two tokens?
    - Access token: short-lived (1 hour). Used for every API request.
    - Refresh token: long-lived (30 days). Used ONLY to get a new 
      access token when the old one expires. This way, users don't 
      have to log in again every hour.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Find the user by email
    user = User.query.filter_by(email=email).first()
    
    # Verify password
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401
        # 401 = Unauthorized
        # IMPORTANT: We give the SAME error for "wrong email" and "wrong password"
        # Why? If we said "email not found," an attacker could figure out which 
        # emails are registered. This is called "user enumeration" — a real 
        # security vulnerability.
    
    # Create tokens
    # identity= is what gets stored INSIDE the token. We use the user ID 
    # because it's unique and never changes (unlike email or name).
    access_token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(hours=1),
        additional_claims={'role': user.role}
        # We include the role in the token so the frontend can check 
        # if someone is an admin without making another API call.
    )
    refresh_token = create_refresh_token(
        identity=str(user.id),
        expires_delta=timedelta(days=30)
    )
    
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Get a new access token using a refresh token.
    
    The client calls this when their access token expires (1 hour).
    The refresh token must be sent in the Authorization header.
    
    @jwt_required(refresh=True) means this endpoint ONLY accepts 
    refresh tokens, not regular access tokens.
    """
    current_user_id = get_jwt_identity()
    new_access_token = create_access_token(
        identity=current_user_id,
        expires_delta=timedelta(hours=1)
    )
    
    return jsonify({
        'access_token': new_access_token
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Get the currently logged-in user's profile.
    
    @jwt_required() means this endpoint requires a valid access token.
    If no token is provided, Flask-JWT automatically returns a 401 error.
    
    get_jwt_identity() extracts the user ID we stored in the token 
    during login. We use it to look up the full user record.
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200