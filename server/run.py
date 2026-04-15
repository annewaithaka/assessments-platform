# server/run.py

"""
Entry point for the Flask application.

This file does ONE thing: imports the factory, creates the app, and runs it.
Keeping this minimal is intentional — all the setup logic lives in the 
factory (app/__init__.py), not here.
"""

from app import create_app

app = create_app()

if __name__ == '__main__':
    # debug=True gives you:
    # 1. Auto-reload when you save a file (huge time saver)
    # 2. Detailed error pages in the browser
    # NEVER use debug=True in production — it exposes your code
    app.run(debug=True, port=5000)