# server/app/config.py

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """
    Base configuration class.
    
    Why a class? Because later you can create subclasses like 
    TestingConfig or ProductionConfig that override specific values.
    This is much cleaner than a bunch of if/else statements.
    """
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'fallback-secret-key')
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///assessments.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # Disables a Flask-SQLAlchemy feature 
    # that uses extra memory to track every change to your models. 
    # You don't need it — SQLAlchemy itself handles change tracking.
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'fallback-jwt-secret')
    
    # Mail
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')