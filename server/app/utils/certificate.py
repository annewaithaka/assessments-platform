# server/app/utils/certificate.py

"""
Certificate PDF generator using ReportLab.

Creates a branded, landscape-oriented certificate with:
- Decorative border
- Title and organization name
- User's name prominently displayed
- Assessment title and score
- Date of completion
- Unique certificate ID for verification

Why ReportLab? It gives us pixel-level control over the PDF layout.
Unlike HTML-to-PDF converters, ReportLab generates PDFs natively — 
they're smaller, faster to create, and look consistent everywhere.
"""

import os
import uuid
from datetime import datetime
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


def generate_certificate(
    user_name,
    assessment_title,
    score,
    max_score,
    completion_date,
    certificate_id=None,
    output_path=None
):
    """
    Generate a branded PDF certificate.
    
    Parameters:
        user_name: The name displayed on the certificate
        assessment_title: Name of the completed assessment
        score: User's score
        max_score: Maximum possible score
        completion_date: When the assessment was completed
        certificate_id: Unique ID for verification (auto-generated if None)
        output_path: Where to save the PDF (auto-generated if None)
    
    Returns:
        tuple: (output_path, certificate_id)
    """
    
    if not certificate_id:
        certificate_id = str(uuid.uuid4())[:12].upper()
    
    if not output_path:
        # Create certificates directory if it doesn't exist
        cert_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'certificates'
        )
        os.makedirs(cert_dir, exist_ok=True)
        output_path = os.path.join(cert_dir, f'cert_{certificate_id}.pdf')
    
    # Page setup — landscape A4
    page_width, page_height = landscape(A4)
    
    c = canvas.Canvas(output_path, pagesize=landscape(A4))
    c.setTitle(f'Certificate - {user_name} - {assessment_title}')
    c.setAuthor('Assessments Platform')
    
    # --- Color Palette ---
    primary = HexColor('#4f46e5')       # Indigo (matches your app)
    primary_dark = HexColor('#3730a3')
    gold = HexColor('#d97706')
    gold_light = HexColor('#f59e0b')
    text_dark = HexColor('#1f2937')
    text_medium = HexColor('#4b5563')
    text_light = HexColor('#9ca3af')
    bg_cream = HexColor('#fefce8')
    white = HexColor('#ffffff')
    
    # --- Background ---
    c.setFillColor(white)
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    
    # --- Decorative Outer Border ---
    border_margin = 20
    c.setStrokeColor(primary)
    c.setLineWidth(3)
    c.rect(
        border_margin, border_margin,
        page_width - 2 * border_margin,
        page_height - 2 * border_margin,
        fill=0, stroke=1
    )
    
    # Inner border
    inner_margin = 28
    c.setStrokeColor(gold)
    c.setLineWidth(1)
    c.rect(
        inner_margin, inner_margin,
        page_width - 2 * inner_margin,
        page_height - 2 * inner_margin,
        fill=0, stroke=1
    )
    
    # --- Corner Decorations ---
    corner_size = 30
    corners = [
        (inner_margin, inner_margin),
        (inner_margin, page_height - inner_margin - corner_size),
        (page_width - inner_margin - corner_size, inner_margin),
        (page_width - inner_margin - corner_size, page_height - inner_margin - corner_size),
    ]
    
    c.setFillColor(gold)
    for x, y in corners:
        c.rect(x, y, corner_size, corner_size, fill=1, stroke=0)
    
    c.setFillColor(primary)
    for x, y in corners:
        c.rect(x + 4, y + 4, corner_size - 8, corner_size - 8, fill=1, stroke=0)
    
    # --- Top Decorative Line ---
    center_x = page_width / 2
    top_y = page_height - 70
    
    c.setStrokeColor(gold)
    c.setLineWidth(2)
    c.line(center_x - 150, top_y, center_x + 150, top_y)
    
    # Small diamond in the center of the line
    c.setFillColor(gold)
    diamond_y = top_y
    c.saveState()
    c.translate(center_x, diamond_y)
    c.rotate(45)
    c.rect(-5, -5, 10, 10, fill=1, stroke=0)
    c.restoreState()
    
    # --- Organization Name ---
    c.setFillColor(primary)
    c.setFont('Helvetica-Bold', 14)
    c.drawCentredString(center_x, top_y + 18, 'ASSESSMENTS PLATFORM')
    
    # --- "Certificate of Completion" Title ---
    title_y = page_height - 120
    
    c.setFillColor(text_dark)
    c.setFont('Helvetica', 12)
    c.drawCentredString(center_x, title_y + 35, 'This is to certify that')
    
    c.setFillColor(primary_dark)
    c.setFont('Helvetica-Bold', 32)
    c.drawCentredString(center_x, title_y - 5, 'CERTIFICATE')
    
    c.setFillColor(gold)
    c.setFont('Helvetica', 16)
    c.drawCentredString(center_x, title_y - 28, 'OF COMPLETION')
    
    # --- Decorative Line Under Title ---
    c.setStrokeColor(gold)
    c.setLineWidth(1)
    c.line(center_x - 120, title_y - 42, center_x + 120, title_y - 42)
    
    # --- User Name ---
    name_y = page_height - 220
    
    c.setFillColor(primary_dark)
    c.setFont('Helvetica-Bold', 28)
    c.drawCentredString(center_x, name_y, user_name.upper())
    
    # Underline the name
    name_width = c.stringWidth(user_name.upper(), 'Helvetica-Bold', 28)
    c.setStrokeColor(gold)
    c.setLineWidth(1.5)
    c.line(
        center_x - name_width / 2 - 20, name_y - 8,
        center_x + name_width / 2 + 20, name_y - 8
    )
    
    # --- Assessment Details ---
    details_y = name_y - 50
    
    c.setFillColor(text_dark)
    c.setFont('Helvetica', 13)
    c.drawCentredString(
        center_x, details_y,
        'has successfully completed the assessment'
    )
    
    c.setFillColor(primary)
    c.setFont('Helvetica-Bold', 20)
    c.drawCentredString(center_x, details_y - 30, f'"{assessment_title}"')
    
    # --- Score ---
    score_y = details_y - 70
    percentage = round((score / max_score) * 100) if max_score > 0 else 0
    
    c.setFillColor(text_dark)
    c.setFont('Helvetica', 12)
    c.drawCentredString(
        center_x, score_y,
        f'with a score of {score}/{max_score} ({percentage}%)'
    )
    
    # --- Date ---
    date_y = score_y - 30
    
    if isinstance(completion_date, str):
        try:
            completion_date = datetime.fromisoformat(completion_date)
        except (ValueError, TypeError):
            completion_date = datetime.now()
    
    formatted_date = completion_date.strftime('%B %d, %Y')
    
    c.setFillColor(text_medium)
    c.setFont('Helvetica', 11)
    c.drawCentredString(center_x, date_y, f'Completed on {formatted_date}')
    
    # --- Bottom Section: Signature Line + Certificate ID ---
    bottom_y = 75
    
    # Signature line (left)
    sig_x = page_width * 0.3
    c.setStrokeColor(text_light)
    c.setLineWidth(0.5)
    c.line(sig_x - 80, bottom_y + 20, sig_x + 80, bottom_y + 20)
    
    c.setFillColor(text_medium)
    c.setFont('Helvetica', 10)
    c.drawCentredString(sig_x, bottom_y + 5, 'Administrator')
    
    # Date line (right)
    date_x = page_width * 0.7
    c.line(date_x - 80, bottom_y + 20, date_x + 80, bottom_y + 20)
    c.drawCentredString(date_x, bottom_y + 5, 'Date of Issue')
    c.setFont('Helvetica', 10)
    c.drawCentredString(date_x, bottom_y + 25, formatted_date)
    
    # --- Certificate ID (bottom center) ---
    c.setFillColor(text_light)
    c.setFont('Helvetica', 8)
    c.drawCentredString(
        center_x, 45,
        f'Certificate ID: {certificate_id} | Verify at assessments-platform.com/verify/{certificate_id}'
    )
    
    # --- Bottom Decorative Line ---
    c.setStrokeColor(gold)
    c.setLineWidth(2)
    c.line(center_x - 150, 60, center_x + 150, 60)
    
    # Small diamond
    c.setFillColor(gold)
    c.saveState()
    c.translate(center_x, 60)
    c.rotate(45)
    c.rect(-5, -5, 10, 10, fill=1, stroke=0)
    c.restoreState()
    
    # --- Save ---
    c.save()
    
    return output_path, certificate_id