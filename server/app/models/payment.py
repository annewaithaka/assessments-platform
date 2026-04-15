# server/app/models/payment.py

from app import db
from datetime import datetime, timezone


class Payment(db.Model):
    """
    Payment model — tracks payments from users for assessments.
    
    Flow:
    1. User selects an assessment and submits a payment reference 
       (e.g., M-Pesa transaction code)
    2. Payment is created with status='pending'
    3. Admin reviews it, verifies it's legit, sets status='verified'
    4. User can now take the assessment
    
    Why track payment_reference? It's proof. The admin can cross-check 
    the M-Pesa code or bank reference against their actual account 
    to confirm the money arrived.
    """
    
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_reference = db.Column(db.String(100), nullable=False)  # M-Pesa code, bank ref, etc.
    status = db.Column(db.String(20), default='pending')  # 'pending', 'verified', 'rejected'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    verified_at = db.Column(db.DateTime, nullable=True)  # Timestamp when admin verified
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'assessment_id': self.assessment_id,
            'amount': self.amount,
            'payment_reference': self.payment_reference,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            # The ternary above handles the case where verified_at is None 
            # (payment hasn't been verified yet). Calling .isoformat() on 
            # None would crash.
            'user_name': self.user.name if self.user else None,
            'assessment_title': self.assessment.title if self.assessment else None
        }