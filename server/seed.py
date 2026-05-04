from app import create_app, db
from app.models.user import User


def seed_admin():
    app = create_app()

    with app.app_context():

        admin_email = "annewaithaka86@gmail.com"
        admin_password = "anneric26"

        # CHECK BY EMAIL (correct way)
        existing_admin = User.query.filter_by(email=admin_email).first()

        if existing_admin:
            print(f"Admin already exists: {existing_admin.email}")
            return

        admin = User(
            name="Admin",
            email=admin_email,
            role="admin"
        )

        admin.set_password(admin_password)

        db.session.add(admin)
        db.session.commit()

        print("✅ Admin created successfully!")
        print(f"Email: {admin_email}")


if __name__ == "__main__":
    seed_admin()