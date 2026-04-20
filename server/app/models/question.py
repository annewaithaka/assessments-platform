# server/app/models/question.py

from app import db
import json


class Question(db.Model):
    """
    Question model — belongs to an assessment.
    
    Supports three types:
    - 'mcq': Multiple choice — options stored as JSON, one correct answer
    - 'true_false': True or False — correct_answer is 'true' or 'false'
    - 'short_answer': Free text — correct_answer is the expected text 
      (we'll do case-insensitive exact match for auto-grading)
    
    Why store options as JSON in a text column?
    Because MCQ options are tightly coupled to the question — they're 
    not a separate entity you'd ever query independently. Storing them 
    as JSON in one column is simpler than creating a separate Options 
    table with a foreign key. This is a pragmatic trade-off.
    """
    
    __tablename__ = 'questions'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(20), nullable=False)  # 'mcq', 'true_false', 'short_answer'
    options = db.Column(db.Text, nullable=True)  # JSON string for MCQ options, e.g., '["Option A", "Option B", "Option C", "Option D"]'
    correct_answer = db.Column(db.String(500), nullable=False)
    points = db.Column(db.Integer, default=1)  # Points this question is worth
    order = db.Column(db.Integer, default=0)  # Display order within the assessment
    
    def get_options(self):
        """Parse the JSON options string into a Python list."""
        if self.options:
            return json.loads(self.options)
        return []
    
    def set_options(self, options_list):
        """Convert a Python list to a JSON string for storage."""
        self.options = json.dumps(options_list)
    
    def to_dict(self, include_answer=False):
        """
        include_answer=False by default. Why?
        
        When a user is TAKING a test, you send them the question 
        and options but NOT the correct answer. That would defeat 
        the purpose of the test! You only include the answer in 
        admin views or after the test is submitted.
        """
        data = {
            'id': self.id,
            'assessment_id': self.assessment_id,
            'question_text': self.question_text,
            'question_type': self.question_type,
            'options': self.get_options(),
            'points': self.points,
            'order': self.order
        }
        if include_answer:
            data['correct_answer'] = self.correct_answer if self.question_type != 'likert' else 'N/A'
        return data