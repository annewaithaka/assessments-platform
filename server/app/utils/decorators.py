# server/app/utils/decorators.py

"""
Custom decorators for route protection.

A decorator is a function that wraps another function. In Flask, 
decorators are used to add checks BEFORE a route runs.

The flow:
1. Request comes in
2. @jwt_required() checks for a valid token
3. @admin_required checks if the user is an admin
4. If both pass, the actual route function runs
5. If either fails, an error response is returned

This is called the "middleware pattern" — layers of checks 
that a request must pass through.
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from app.models.user import User


def admin_required(fn):
    """
    Decorator that checks if the current user is an admin.
    Must be used AFTER @jwt_required() — it needs the JWT 
    identity to look up the user.
    
    Usage:
        @app.route('/admin/something')
        @jwt_required()
        @admin_required
        def admin_only_route():
            ...
    
    Why functools.wraps? Without it, the decorated function loses 
    its original name and docstring. Flask uses function names to 
    identify routes, so losing the name causes conflicts. wraps() 
    preserves the original function's metadata.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
            # 403 = Forbidden — you're authenticated but not authorized
            # This is different from 401 (Unauthorized) which means 
            # you're not authenticated at all.
        
        return fn(*args, **kwargs)
    
    return wrapper