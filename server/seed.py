# server/seed.py

"""
Database seed script — creates the admin account.

Run this ONCE after setting up the database:
    python seed.py

If you ever delete your database file (assessments.db) and start 
fresh, run this again to recreate the admin.

Why is this a separate file and not part of the app?
Because seeding is a one-time setup action, not something that 
runs every time the app starts. Keeping it separate makes the 
intention clear and prevents accidentally creating duplicate 
admins on every server restart.
"""

from app import create_app, db
from app.models.user import User


def seed_admin():
    """Create the admin user if they don't already exist."""
    
    app = create_app()
    
    # We need app context because database operations require 
    # Flask to know which app (and therefore which database) 
    # we're working with.
    with app.app_context():
        # Check if admin already exists — prevents duplicates 
        # if you accidentally run the script twice
        existing_admin = User.query.filter_by(role='admin').first()
        
        if existing_admin:
            print(f'Admin already exists: {existing_admin.email}')
            print('No changes made.')
            return
        
        # Create the admin user
        # IMPORTANT: Change these credentials before deploying!
        admin = User(
            name='Admin',
            email='admin@cognos.com',
            role='admin'
        )
        admin.set_password('admin123456')  # Change this!
        
        db.session.add(admin)
        db.session.commit()
        
        print('Admin account created successfully!')
        print(f'  Email: {admin.email}')
        print(f'  Role:  {admin.role}')
        print('')
        print('⚠️  Remember to change the default password in production!')


if __name__ == '__main__':
    seed_admin()