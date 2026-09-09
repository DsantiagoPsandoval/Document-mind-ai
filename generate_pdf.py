import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

pdf_path = "DocuMind_AI_Infografia_Color_UXUI.pdf"
doc = SimpleDocTemplate(
    pdf_path,
    pagesize=A4,
    leftMargin=10*mm,
    rightMargin=10*mm,
    topMargin=8*mm,
    bottomMargin=8*mm
)

styles = getSampleStyleSheet()

style_inst = ParagraphStyle(
    'InstTitle',
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=11,
    textColor=colors.HexColor('#38BDF8')
)
style_badge = ParagraphStyle(
    'Badge',
    fontName='Helvetica-Bold',
    fontSize=8,
    leading=10,
    textColor=colors.HexColor('#38BDF8'),
    alignment=2
)
style_title = ParagraphStyle(
    'MainTitle',
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=22,
    textColor=colors.HexColor('#FFFFFF'),
    alignment=1
)
style_subtitle = ParagraphStyle(
    'Subtitle',
    fontName='Helvetica',
    fontSize=8.5,
    leading=11,
    textColor=colors.HexColor('#94A3B8'),
    alignment=1
)
style_sec_header = ParagraphStyle(
    'SecHeader',
    fontName='Helvetica-Bold',
    fontSize=10.5,
    leading=13,
    textColor=colors.HexColor('#38BDF8')
)
style_body = ParagraphStyle(
    'BodyDark',
    fontName='Helvetica',
    fontSize=7.2,
    leading=9.5,
    textColor=colors.HexColor('#CBD5E1')
)
style_metric_val = ParagraphStyle(
    'MetricVal',
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=20,
    textColor=colors.HexColor('#38BDF8'),
    alignment=1
)
style_metric_lbl = ParagraphStyle(
    'MetricLbl',
    fontName='Helvetica-Bold',
    fontSize=7.5,
    leading=9.5,
    textColor=colors.HexColor('#F8FAFC'),
    alignment=1
)
style_metric_sub = ParagraphStyle(
    'MetricSub',
    fontName='Helvetica',
    fontSize=6.5,
    leading=8,
    textColor=colors.HexColor('#94A3B8'),
    alignment=1
)

story = []

# Encabezado Institucional
hdr_data = [
    [
        Paragraph("<b>UNIVERSIDAD LIBRE | FACULTAD DE INGENIERÍA</b><br/>Ingeniería Aplicada & Emprendimiento Tecnológico", style_inst),
        Paragraph("<b>ENTREGABLE ACADÉMICO & TÉCNICO</b><br/>Sustento UX/UI & Teoría del Color", style_badge)
    ]
]
t_hdr = Table(hdr_data, colWidths=[110*mm, 80*mm])
t_hdr.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor('#1E293B')),
]))
story.append(t_hdr)
story.append(Spacer(1, 2.5*mm))

# Titulo Principal
story.append(Paragraph("DocuMind AI: Teoría del Color & Fundamentos UX/UI", style_title))
story.append(Spacer(1, 1.2*mm))
story.append(Paragraph("Fundamentación científica del diseño centrado en el desarrollador (DevEx) para la plataforma de documentación automática de repositorios con Inteligencia Artificial.", style_subtitle))
story.append(Spacer(1, 3*mm))

# SECCIÓN 1: TEORÍA DEL COLOR
story.append(Paragraph("1. TEORÍA DEL COLOR, PSICOLOGÍA Y ACCESIBILIDAD (WCAG 2.1 AAA)", style_sec_header))
story.append(Spacer(1, 1.5*mm))

# Swatches
swatches_data = [
    [
        Paragraph("<font color='#FFFFFF'><b>Midnight Dark</b><br/>#090D16</font>", ParagraphStyle('S1', fontName='Helvetica', fontSize=7, leading=8.5, alignment=1, textColor=colors.white)),
        Paragraph("<font color='#FFFFFF'><b>Deep Slate</b><br/>#0F172A</font>", ParagraphStyle('S2', fontName='Helvetica', fontSize=7, leading=8.5, alignment=1, textColor=colors.white)),
        Paragraph("<font color='#090D16'><b>Tech Cyan</b><br/>#38BDF8</font>", ParagraphStyle('S3', fontName='Helvetica', fontSize=7, leading=8.5, alignment=1, textColor=colors.HexColor('#090D16'))),
        Paragraph("<font color='#090D16'><b>Emerald Sync</b><br/>#34D399</font>", ParagraphStyle('S4', fontName='Helvetica', fontSize=7, leading=8.5, alignment=1, textColor=colors.HexColor('#090D16'))),
        Paragraph("<font color='#FFFFFF'><b>Indigo Logic</b><br/>#818CF8</font>", ParagraphStyle('S5', fontName='Helvetica', fontSize=7, leading=8.5, alignment=1, textColor=colors.white)),
    ],
    [
        Paragraph("Fondo Dark / Reduce 38% fatiga visual", ParagraphStyle('R1', fontName='Helvetica', fontSize=6.5, leading=8, alignment=1, textColor=colors.HexColor('#94A3B8'))),
        Paragraph("Superficie tarjetas y rigor técnico", ParagraphStyle('R2', fontName='Helvetica', fontSize=6.5, leading=8, alignment=1, textColor=colors.HexColor('#94A3B8'))),
        Paragraph("Acento IA, AST y foco interactivo", ParagraphStyle('R3', fontName='Helvetica', fontSize=6.5, leading=8, alignment=1, textColor=colors.HexColor('#94A3B8'))),
        Paragraph("Sincronización CI/CD exitosa y ahorro", ParagraphStyle('R4', fontName='Helvetica', fontSize=6.5, leading=8, alignment=1, textColor=colors.HexColor('#94A3B8'))),
        Paragraph("Grafos C4 y diagramas de arquitectura", ParagraphStyle('R5', fontName='Helvetica', fontSize=6.5, leading=8, alignment=1, textColor=colors.HexColor('#94A3B8'))),
    ]
]
t_swatches = Table(swatches_data, colWidths=[38*mm, 38*mm, 38*mm, 38*mm, 38*mm])
t_swatches.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (0,0), colors.HexColor('#090D16')),
    ('BACKGROUND', (1,0), (1,0), colors.HexColor('#0F172A')),
    ('BACKGROUND', (2,0), (2,0), colors.HexColor('#38BDF8')),
    ('BACKGROUND', (3,0), (3,0), colors.HexColor('#34D399')),
    ('BACKGROUND', (4,0), (4,0), colors.HexColor('#818CF8')),
    ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#0F172A')),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#1E293B')),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#1E293B')),
    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,0), 5),
    ('BOTTOMPADDING', (0,0), (-1,0), 5),
    ('TOPPADDING', (0,1), (-1,1), 3.5),
    ('BOTTOMPADDING', (0,1), (-1,1), 3.5),
]))
story.append(t_swatches)
story.append(Spacer(1, 2*mm))

# Two-column description
color_desc_data = [
    [
        Paragraph("<b>Psicología del Color en Developer Tools:</b><br/>El contraste entre fondo oscuro y acentos cian/esmeralda estimula la concentración y minimiza la fatiga en sesiones de trabajo intensas. La semiótica cromática asocia el azul profundo a estabilidad y rigor ingenieril, y el cian brillante a innovación en IA.", style_body),
        Paragraph("<b>Accesibilidad y Ratios de Contraste (WCAG 2.1):</b><br/>• Ratio de contraste <b>7.8:1</b> en textos principales (#F1F5F9 sobre #090D16), superando el nivel AAA (7.0:1).<br/>• Ratio <b>5.2:1</b> en elementos interactivos cian (#38BDF8).<br/>• Todos los estados de error/éxito integran texto e iconos redundantes para daltonismo.", style_body)
    ]
]
t_color_desc = Table(color_desc_data, colWidths=[95*mm, 95*mm])
t_color_desc.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0F172A')),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#1E293B')),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#1E293B')),
    ('TOPPADDING', (0,0), (-1,-1), 4.5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4.5),
    ('LEFTPADDING', (0,0), (-1,-1), 5),
    ('RIGHTPADDING', (0,0), (-1,-1), 5),
]))
story.append(t_color_desc)
story.append(Spacer(1, 3*mm))

# SECCIÓN 2: FUNDAMENTOS UX/UI
story.append(Paragraph("2. FUNDAMENTOS DE DISEÑO UX/UI & HEURÍSTICAS DE NIELSEN", style_sec_header))
story.append(Spacer(1, 1.5*mm))

ux_data = [
    [
        Paragraph("<b>Heurísticas de Usabilidad de Jakob Nielsen:</b><br/>• <b>Visibilidad del Estado del Sistema (#1):</b> Indicadores en tiempo real del progreso de análisis AST y sincronización en GitHub Actions.<br/>• <b>Correspondencia con el Mundo Real (#2):</b> Empleo de taxonomía técnica estándar en la industria (Git, AST, Endpoints REST, C4, Pull Requests).<br/>• <b>Consistencia y Estándares (#4):</b> Arquitectura de componentes Atomic Design con tokens reutilizables en formularios, botones y cards.<br/>• <b>Prevención de Errores (#5):</b> Validación asíncrona de URLs de repositorios y selectores contextuales por lenguaje.", style_body),
        Paragraph("<b>Arquitectura de Información & Carga Cognitiva:</b><br/>• <b>Patrón de Lectura en F & Z:</b> Encabezados concisos con métricas clave destacadas para escaneo visual en menos de 5 segundos.<br/>• <b>Ley de Miller & Chunking:</b> Segmentación de la información en tarjetas modulares de máximo 4 puntos conceptuales.<br/>• <b>Micro-interacciones y Feedback Háptico:</b> Animaciones fluidas en la terminal interactiva que comunican progreso computacional sin generar fricción.<br/>• <b>Jerarquía Visual Progresiva:</b> Gradientes y badges de foco que guían la mirada al botón de conversión (Beta Access).", style_body)
    ]
]
t_ux = Table(ux_data, colWidths=[95*mm, 95*mm])
t_ux.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0F172A')),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#1E293B')),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#1E293B')),
    ('TOPPADDING', (0,0), (-1,-1), 4.5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4.5),
    ('LEFTPADDING', (0,0), (-1,-1), 5),
    ('RIGHTPADDING', (0,0), (-1,-1), 5),
]))
story.append(t_ux)
story.append(Spacer(1, 3*mm))

# SECCIÓN 3: VALIDACIÓN CUANTITATIVA
story.append(Paragraph("3. JUSTIFICACIÓN CUANTITATIVA & VALIDACIÓN DEL PROYECTO", style_sec_header))
story.append(Spacer(1, 1.5*mm))

metrics_data = [
    [
        [
            Paragraph("20%", style_metric_val),
            Paragraph("Tiempo Recuperado", style_metric_lbl),
            Paragraph("Jornada dev antes perdida en descifrar código legado", style_metric_sub)
        ],
        [
            Paragraph("<font color='#34D399'>86.0%</font>", style_metric_val),
            Paragraph("Dolor Crítico Validado", style_metric_lbl),
            Paragraph("Validación empírica en muestra de Software Houses", style_metric_sub)
        ],
        [
            Paragraph("<font color='#818CF8'>83.3%</font>", style_metric_val),
            Paragraph("Viabilidad Comercial", style_metric_lbl),
            Paragraph("Intención de pago inmediata modelo SaaS B2B", style_metric_sub)
        ]
    ]
]
t_metrics = Table(metrics_data, colWidths=[63.3*mm, 63.3*mm, 63.3*mm])
t_metrics.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0F172A')),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#1E293B')),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#1E293B')),
    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(t_metrics)
story.append(Spacer(1, 3*mm))

# SECCIÓN 4: AUTORES & CÓDIGO QR
story.append(Paragraph("4. CONFORMACIÓN DEL EQUIPO EMPRESARIAL & CÓDIGO QR", style_sec_header))
story.append(Spacer(1, 1.5*mm))

qr_img = Image('assets/qr-landing.png', width=22*mm, height=22*mm)

bottom_data = [
    [
        Paragraph(
            "<b>Daniel Santiago Palencia Sandoval</b> — <i>Líder Tecnológico (CTO)</i> | <font color='#38BDF8'>daniels-palencias@unilibre.edu.co</font><br/>"
            "<font color='#94A3B8'>GitHub: @DsantiagoPsandoval | Arquitectura AST + LLM, CI/CD Actions/CLI y validación de prototipo.</font><br/><br/>"
            "<b>Nelson Andrés Ayala Álvarez</b> — <i>Líder de Mercadeo & Negocios (CMO/CBO)</i> | <font color='#38BDF8'>nelsona-ayalaa@unilibre.edu.co</font><br/>"
            "<font color='#94A3B8'>GitHub: @nexker | Landing page, Early Adopters, validación Tech Leads y modelo SaaS B2B.</font>",
            style_body
        ),
        [
            qr_img,
            Paragraph("<font color='#38BDF8'><b>ESCANEAR QR</b></font>", ParagraphStyle('QR1', fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=1)),
            Paragraph("Abrir Landing Page", ParagraphStyle('QR2', fontName='Helvetica', fontSize=5.5, leading=7, alignment=1, textColor=colors.HexColor('#94A3B8')))
        ]
    ]
]
t_bottom = Table(bottom_data, colWidths=[145*mm, 45*mm])
t_bottom.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0F172A')),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#0284C7')),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#1E293B')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('ALIGN', (1,0), (1,0), 'CENTER'),
    ('TOPPADDING', (0,0), (-1,-1), 3.5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ('LEFTPADDING', (0,0), (0,0), 6),
    ('RIGHTPADDING', (0,0), (0,0), 6),
]))
story.append(t_bottom)
story.append(Spacer(1, 2*mm))

# Footer note
story.append(Paragraph(
    "Estructura realizada siguiendo las directrices de HubSpot y la Universidad Libre: legibilidad máxima, alto contraste, jerarquía visual y código QR directo a la plataforma.",
    ParagraphStyle('Foot', fontName='Helvetica-Oblique', fontSize=6, leading=7.5, alignment=1, textColor=colors.HexColor('#64748B'))
))

doc.build(story)
print(f"[OK] PDF generado exitosamente en {pdf_path} (Tamano: {os.path.getsize(pdf_path)} bytes)")
