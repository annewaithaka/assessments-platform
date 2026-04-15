# server/app/__init__.py

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail

# ---------------------------------------------------------------
# Why are these created OUTSIDE the factory function?
# 
# These are "extension instances." We create them here without 
# attaching them to any app yet. Then inside create_app(), we 
# call .init_app(app) to bind them to the actual Flask app.
# 
# This avoids circular imports: your models.py can import `db` 
# from here without needing to import the app itself.
# ---------------------------------------------------------------

db = SQLAlchemy()
cors = CORS()
jwt = JWTManager()
mail = Mail()


def create_app():
    """
    App factory function.
    
    Call this to create a configured Flask application.
    You can call it multiple times with different configs 
    (e.g., for testing) — each call gives you a fresh app.
    """
    
    # Create the Flask app instance
    # __name__ tells Flask where to find templates, static files, etc.
    app = Flask(__name__)
    
    # Load configuration from our Config class
    app.config.from_object('app.config.Config')
    
    # Initialize extensions with this app
    db.init_app(app)
    cors.init_app(app)  # Allows React (port 5173) to call Flask (port 5000)
    jwt.init_app(app)
    mail.init_app(app)
    
    # ---------------------------------------------------------------
    # Register blueprints (route groups)
    # We'll add these as we build each feature. For now, just one 
    # test route to prove everything works.
    # ---------------------------------------------------------------
    
    # A simple test route — we'll remove this later
    @app.route('/api/hello')
    def hello():
        return {'message': 'Hello from Flask! Your backend is running.'}
    
    # Create database tables
    # ---------------------------------------------------------------
    # app.app_context() is needed because Flask needs to know WHICH 
    # app the database belongs to. Outside of a request (like at 
    # startup), there's no "current app," so we push one manually.
    # ---------------------------------------------------------------
    with app.app_context():
        db.create_all()
    
    return app