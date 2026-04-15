# server/app/models/attempt.py

from app import db
from datetime import datetime, timezone


class Attempt(db.Model):
    """
    Attempt model — created when a user starts taking an assessment.
    
    Why a separate model from Payment? Because they're different concepts:
    - Payment = "I paid for this test"
    - Attempt = "I am taking / have taken this test"
    
    A user could pay once but potentially retake (if you allow it later).
    Keeping them separate gives you flexibility.
    """
    
    __tablename__ = 'attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    start_time = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    end_time = db.Column(db.DateTime, nullable=True)
    score = db.Column(db.Float, nullable=True)  # Calculated when test is submitted
    max_score = db.Column(db.Float, nullable=True)  # Total possible points
    status = db.Column(db.String(20), default='in_progress')  # 'in_progress', 'completed', 'timed_out'
    
    # Relationships
    answers = db.relationship('Answer', backref='attempt', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'assessment_id': self.assessment_id,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'score': self.score,
            'max_score': self.max_score,
            'status': self.status,
            'assessment_title': self.assessment.title if self.assessment else None
        }


class Answer(db.Model):
    """
    Answer model — stores each individual answer a user gives.
    
    Why store every answer separately? So you can:
    1. Show the user which questions they got right/wrong
    2. Let the admin see detailed results
    3. Generate analytics later (e.g., "80% of users get Q3 wrong")
    """
    
    __tablename__ = 'answers'
    
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('attempts.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    user_answer = db.Column(db.String(500), nullable=True)  # Nullable because they might skip a question
    is_correct = db.Column(db.Boolean, nullable=True)  # Graded when test is submitted
    
    # Relationship to get the question details
    question = db.relationship('Question', backref='answers', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'question_id': self.question_id,
            'user_answer': self.user_answer,
            'is_correct': self.is_correct
        }