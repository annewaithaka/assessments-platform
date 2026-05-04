# server/app/__init__.py

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_migrate import Migrate

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
migrate = Migrate()


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
    migrate.init_app(app, db)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": [
            "http://localhost:5173",  # local dev (Vite)
            "https://assessments-platform-plum.vercel.app"
        ]}},
        supports_credentials=True)  # Allows React (port 5173) to call Flask (port 5000)
    jwt.init_app(app)
    mail.init_app(app)

    # ---------------------------------------------------------------
    # Register blueprints (route groups)
    # We'll add these as we build each feature. For now, just one
    # test route to prove everything works.
    # ---------------------------------------------------------------

    # A simple test route — we'll remove this later
    # Test routes — we'll remove these later
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    from app.routes.password_reset import password_reset_bp
    app.register_blueprint(password_reset_bp)

    from app.routes.assessments import assessments_bp
    app.register_blueprint(assessments_bp)

    from app.routes.questions import questions_bp
    app.register_blueprint(questions_bp)

    from app.routes.payments import payments_bp
    app.register_blueprint(payments_bp)

    from app.routes.attempts import attempts_bp
    app.register_blueprint(attempts_bp)

    from app.routes.certificates import certificates_bp
    app.register_blueprint(certificates_bp)

    @app.route('/api/hello')
    def hello():
        return {'message': 'Hello from Flask! Your backend is running.'}

    @app.route('/api/status')
    def status():
        """
        A more detailed status endpoint. This is useful for:
        1. Verifying the API is reachable from React
        2. Confirming the database connection works
        3. Quick health check during development
        """
        from app.models import User, Assessment
        return {
            'status': 'online',
            'database': 'connected',
            'users_count': User.query.count(),
            'assessments_count': Assessment.query.count()
        }

    # Create database tables
    # ---------------------------------------------------------------
    # app.app_context() is needed because Flask needs to know WHICH
    # app the database belongs to. Outside of a request (like at
    # startup), there's no "current app," so we push one manually.
    # ---------------------------------------------------------------
    # Import models so SQLAlchemy knows about them before creating tables
    from app.models import User, Assessment, Question, Payment, Attempt, Answer

    # with app.app_context():
    #    db.create_all()

    return app
