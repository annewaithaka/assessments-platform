# server/app/utils/certificate.py

"""
Certificate PDF generator using ReportLab.

After testing xhtml2pdf, we found it doesn't handle landscape 
layout and compact spacing well. ReportLab gives us exact control 
over every element's position and size — guaranteed one page.
"""

import os
import uuid
from datetime import datetime
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm


def generate_certificate(
    user_name,
    assessment_title,
    score,
    max_score,
    completion_date,
    certificate_id=None,
    output_path=None
):
    if not certificate_id:
        certificate_id = str(uuid.uuid4())[:12].upper()
    
    if not output_path:
        cert_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'certificates'
        )
        os.makedirs(cert_dir, exist_ok=True)
        output_path = os.path.join(cert_dir, f'cert_{certificate_id}.pdf')
    
    percentage = round((score / max_score) * 100) if max_score > 0 else 0
    
    if percentage >= 90:
        level, level_color = 'Outstanding', '#16a34a'
    elif percentage >= 75:
        level, level_color = 'Excellent', '#2563eb'
    elif percentage >= 60:
        level, level_color = 'Good', '#7c3aed'
    elif percentage >= 40:
        level, level_color = 'Satisfactory', '#d97706'
    else:
        level, level_color = 'Completed', '#6b7280'
    
    if isinstance(completion_date, str):
        try:
            completion_date = datetime.fromisoformat(completion_date)
        except (ValueError, TypeError):
            completion_date = datetime.now()
    
    formatted_date = (completion_date or datetime.now()).strftime('%d %B %Y')
    
    # --- Setup ---
    w, h = landscape(A4)  # 841 x 595 points
    c = canvas.Canvas(output_path, pagesize=landscape(A4))
    c.setTitle(f'Certificate - {user_name}')
    cx = w / 2  # center x
    
    # --- Colors ---
    bg = HexColor('#eef2ff')
    primary = HexColor('#4f46e5')
    primary_dark = HexColor('#1e1b4b')
    gold = HexColor('#d97706')
    green = HexColor(level_color)
    text_dark = HexColor('#1f2937')
    text_mid = HexColor('#6b7280')
    text_light = HexColor('#9ca3af')
    white = HexColor('#ffffff')
    
    # --- Background ---
    c.setFillColor(bg)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    
    # --- Outer Border ---
    c.setStrokeColor(primary)
    c.setLineWidth(3)
    c.roundRect(15*mm, 10*mm, w - 30*mm, h - 20*mm, 3*mm, fill=0, stroke=1)
    
    # --- Inner Border ---
    c.setStrokeColor(HexColor('#a5b4fc'))
    c.setLineWidth(0.75)
    c.roundRect(18*mm, 13*mm, w - 36*mm, h - 26*mm, 2*mm, fill=0, stroke=1)
    
    # --- Gold Corner Accents ---
    c.setStrokeColor(gold)
    c.setLineWidth(2.5)
    corner_len = 12*mm
    m = 15*mm  # margin matching outer border
    
    # Top-left
    c.line(m, h - m, m + corner_len, h - m)
    c.line(m, h - m, m, h - m - corner_len)
    # Top-right
    c.line(w - m, h - m, w - m - corner_len, h - m)
    c.line(w - m, h - m, w - m, h - m - corner_len)
    # Bottom-left
    c.line(m, m, m + corner_len, m)
    c.line(m, m, m, m + corner_len)
    # Bottom-right
    c.line(w - m, m, w - m - corner_len, m)
    c.line(w - m, m, w - m, m + corner_len)
    
    # === CONTENT ===
    y = h - 45*mm  # start position
    
    # --- Organization Name ---
    c.setFillColor(primary)
    c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(cx, y, 'C O G N O S')
    
    # --- Title ---
    y -= 14*mm
    c.setFillColor(primary_dark)
    c.setFont('Helvetica-Bold', 30)
    c.drawCentredString(cx, y, 'CERTIFICATE')
    
    y -= 8*mm
    c.setFillColor(gold)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(cx, y, 'O F   C O M P L E T I O N')
    
    # --- Gold Divider ---
    y -= 5*mm
    c.setStrokeColor(gold)
    c.setLineWidth(1.5)
    c.line(cx - 40*mm, y, cx + 40*mm, y)
    # Diamond
    c.setFillColor(gold)
    c.saveState()
    c.translate(cx, y)
    c.rotate(45)
    c.rect(-2.5, -2.5, 5, 5, fill=1, stroke=0)
    c.restoreState()
    
    # --- "This is to certify that" ---
    y -= 10*mm
    c.setFillColor(text_mid)
    c.setFont('Helvetica', 10)
    c.drawCentredString(cx, y, 'This is to certify that')
    
    # --- User Name ---
    y -= 12*mm
    c.setFillColor(HexColor('#3730a3'))
    c.setFont('Helvetica-Bold', 24)
    c.drawCentredString(cx, y, user_name)
    
    # Name underline
    name_w = c.stringWidth(user_name, 'Helvetica-Bold', 24)
    y -= 3*mm
    c.setStrokeColor(HexColor('#c7d2fe'))
    c.setLineWidth(0.75)
    c.line(cx - name_w/2 - 10*mm, y, cx + name_w/2 + 10*mm, y)
    
    # --- "has successfully completed" ---
    y -= 8*mm
    c.setFillColor(text_mid)
    c.setFont('Helvetica', 10)
    c.drawCentredString(cx, y, 'has successfully completed the assessment')
    
    # --- Assessment Title ---
    y -= 10*mm
    c.setFillColor(primary)
    c.setFont('Helvetica-Bold', 17)
    c.drawCentredString(cx, y, f'\u201c{assessment_title}\u201d')
    
    # === SCORE BOX ===
    y -= 10*mm
    box_w = 180*mm
    box_h = 42*mm
    box_x = cx - box_w/2
    box_y = y - box_h
    
    # White box with border
    c.setFillColor(white)
    c.setStrokeColor(HexColor('#e0e7ff'))
    c.setLineWidth(0.75)
    c.roundRect(box_x, box_y, box_w, box_h, 2*mm, fill=1, stroke=1)
    
    # Score number
    score_y = box_y + box_h - 14*mm
    c.setFillColor(green)
    c.setFont('Helvetica-Bold', 36)
    score_text = str(percentage)
    score_w = c.stringWidth(score_text, 'Helvetica-Bold', 36)
    c.drawString(cx - score_w/2 - 8*mm, score_y, score_text)
    
    # "/100"
    c.setFillColor(text_light)
    c.setFont('Helvetica', 16)
    c.drawString(cx - score_w/2 - 8*mm + score_w + 2, score_y + 2, ' / 100')
    
    # Level badge
    level_y = score_y - 8*mm
    c.setFillColor(green)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(cx, level_y, level)
    
    # --- Score Scale ---
    scale_y = box_y + 5*mm
    scale_w = 150*mm
    cell_w = scale_w / 5
    scale_x = cx - scale_w/2
    cell_h = 8*mm
    
    ranges = [
        ('0-20', 0, 20), ('21-40', 21, 40), ('41-60', 41, 60),
        ('61-80', 61, 80), ('81-100', 81, 100)
    ]
    
    for i, (label, low, high) in enumerate(ranges):
        cell_x = scale_x + i * cell_w
        is_active = low <= percentage <= high
        
        if is_active:
            c.setFillColor(primary)
            c.roundRect(cell_x, scale_y, cell_w - 1*mm, cell_h, 1*mm, fill=1, stroke=0)
            c.setFillColor(white)
            c.setFont('Helvetica-Bold', 8)
        else:
            c.setFillColor(HexColor('#e5e7eb'))
            c.roundRect(cell_x, scale_y, cell_w - 1*mm, cell_h, 1*mm, fill=1, stroke=0)
            c.setFillColor(text_mid)
            c.setFont('Helvetica', 8)
        
        c.drawCentredString(cell_x + (cell_w - 1*mm)/2, scale_y + 2.5*mm, label)
    
    # Points detail
    c.setFillColor(text_light)
    c.setFont('Helvetica', 7)
    c.drawCentredString(cx, box_y - 3*mm, f'Score: {score}/{max_score} points ({percentage}%)')
    
    # === BOTTOM SECTION ===
    bottom_y = box_y - 16*mm
    
    # Date completed (left)
    left_x = cx - 70*mm
    c.setFillColor(text_light)
    c.setFont('Helvetica', 7)
    c.drawString(left_x, bottom_y + 5*mm, 'DATE COMPLETED')
    c.setFillColor(text_dark)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(left_x, bottom_y - 1*mm, formatted_date)
    
    # Administrator signature (center)
    c.setStrokeColor(HexColor('#d1d5db'))
    c.setLineWidth(0.5)
    c.line(cx - 25*mm, bottom_y + 2*mm, cx + 25*mm, bottom_y + 2*mm)
    c.setFillColor(text_light)
    c.setFont('Helvetica', 7)
    c.drawCentredString(cx, bottom_y - 3*mm, 'ADMINISTRATOR')
    
    # Awarded on (right)
    right_x = cx + 45*mm
    c.setFillColor(text_light)
    c.setFont('Helvetica', 7)
    c.drawString(right_x, bottom_y + 5*mm, 'AWARDED ON')
    c.setFillColor(text_dark)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(right_x, bottom_y - 1*mm, formatted_date)
    
    # === CERTIFICATE ID ===
    c.setFillColor(text_light)
    c.setFont('Courier', 6)
    c.drawCentredString(cx, 16*mm, f'Certificate ID: {certificate_id}  |  Verify at cognos.com/verify/{certificate_id}')

    # --- Bottom decorative line ---
    c.setStrokeColor(gold)
    c.setLineWidth(1)
    c.line(cx - 30*mm, 21*mm, cx + 30*mm, 21*mm)
    
    c.save()
    return output_path, certificate_id