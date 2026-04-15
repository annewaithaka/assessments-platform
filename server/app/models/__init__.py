# server/app/models/__init__.py

"""
This file makes the models/ folder a Python package and imports 
all models into one place.

Why import them here? So that when SQLAlchemy runs db.create_all(), 
it can "see" all the models and create their tables. If a model 
isn't imported anywhere before create_all() runs, its table won't 
be created. This is a common gotcha.
"""

from app.models.user import User
from app.models.assessment import Assessment
from app.models.question import Question
from app.models.payment import Payment
from app.models.attempt import Attempt, Answer