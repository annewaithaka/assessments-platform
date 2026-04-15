# server/app/models/assessment.py

from app import db
from datetime import datetime, timezone


class Assessment(db.Model):
    """
    Assessment model — a test that users can purchase and take.
    
    The admin creates these, sets a price and duration, then 
    publishes them. Users browse published assessments, pay, 
    and then take them.
    """
    
    __tablename__ = 'assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=False)  # Time limit for the test
    price = db.Column(db.Float, nullable=False)  # Amount in KES
    is_active = db.Column(db.Boolean, default=False)  # Only active assessments are visible to users
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
    # onupdate= automatically updates this timestamp whenever 
    # the row is modified. Useful for tracking when an assessment 
    # was last edited.
    
    # Relationships
    questions = db.relationship('Question', backref='assessment', lazy=True, cascade='all, delete-orphan')
    payments = db.relationship('Payment', backref='assessment', lazy=True)
    attempts = db.relationship('Attempt', backref='assessment', lazy=True)
    # cascade='all, delete-orphan' on questions means: if you delete 
    # an assessment, all its questions are automatically deleted too.
    # This prevents orphaned questions sitting in the database 
    # pointing to an assessment that no longer exists.
    
    def to_dict(self, include_questions=False):
        """
        include_questions is False by default because when listing 
        all assessments, you don't need every question — that would 
        be a massive payload. You only include them when viewing 
        a single assessment in detail.
        """
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'duration_minutes': self.duration_minutes,
            'price': self.price,
            'is_active': self.is_active,
            'question_count': len(self.questions),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        if include_questions:
            data['questions'] = [q.to_dict() for q in self.questions]
        return data