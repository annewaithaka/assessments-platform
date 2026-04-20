# server/app/utils/email.py

"""
Email utility — handles sending password reset emails.

We're using Flask-Mail which connects to an SMTP server 
(like Gmail) to send emails. In development, we'll also 
print the reset link to the console so you can test without 
configuring email.
"""

from flask import current_app
from flask_mail import Message
from app import mail


def send_reset_email(user_email, reset_url):
    """
    Send a password reset email.
    
    current_app is Flask's way of accessing the app inside 
    functions that don't directly receive it. It works because 
    Flask keeps track of the "current" app during a request.
    """
    try:
        msg = Message(
            subject='Password Reset - Assessments Platform',
            sender=current_app.config['MAIL_USERNAME'],
            recipients=[user_email]
        )
        
        msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Password Reset</h2>
            <p>You requested a password reset for your Assessments Platform account.</p>
            <p>Click the button below to set a new password. This link expires in 1 hour.</p>
            <a href="{reset_url}" 
               style="display: inline-block; padding: 12px 24px; 
                      background-color: #4f46e5; color: #ffffff; 
                      text-decoration: none; border-radius: 8px; 
                      margin: 16px 0;">
                Reset Password
            </a>
            <p style="color: #666; font-size: 14px;">
                If you didn't request this, ignore this email. Your password won't change.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
            <p style="color: #999; font-size: 12px;">Assessments Platform</p>
        </div>
        """
        
        mail.send(msg)
        print(f'[EMAIL SENT] Password reset email sent to {user_email}')
        return True
        
    except Exception as e:
        # In development, email sending will likely fail because 
        # we haven't configured real SMTP credentials yet.
        # So we print the link to the console as a fallback.
        print(f'[EMAIL FAILED] Could not send email: {e}')
        print(f'[DEV FALLBACK] Reset link for {user_email}: {reset_url}')
        return False