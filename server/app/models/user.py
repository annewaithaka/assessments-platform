# server/app/models/user.py

from app import db
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    """
    User model — represents both regular users and the admin.
    
    Why one model for both? Because they share 90% of the same fields 
    (name, email, password). The 'role' field is all we need to tell 
    them apart. This is simpler than maintaining two separate tables.
    """
    
    __tablename__ = 'users'  # Explicit table name. Without this, 
    # SQLAlchemy would name it 'user' (singular). Plural is convention.
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='user')  # 'user' or 'admin'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # ---------------------------------------------------------------
    # Relationships — these don't create columns in the database.
    # They tell SQLAlchemy how to JOIN tables when you query.
    # 'backref' creates a reverse relationship: from a Payment, 
    # you can access payment.user to get the User who made it.
    # 'lazy=True' means related data is loaded only when you access it.
    # ---------------------------------------------------------------
    payments = db.relationship('Payment', backref='user', lazy=True)
    attempts = db.relationship('Attempt', backref='user', lazy=True)
    
    def set_password(self, password):
        """
        Hash the password before storing it.
        
        Why not store the plain password? If your database is ever 
        breached, attackers get every user's password. Hashing is 
        one-way — you can verify a password against the hash, but 
        you can't reverse it to get the original password.
        
        werkzeug uses PBKDF2 by default — a strong, slow hashing 
        algorithm that's resistant to brute-force attacks.
        """
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify a password against the stored hash."""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """
        Convert the model to a dictionary for JSON responses.
        
        Why not just return the model directly? Flask can't serialize 
        SQLAlchemy objects to JSON. You need to convert to a dict first.
        Notice we NEVER include password_hash — that stays on the server.
        """
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }