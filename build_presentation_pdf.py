import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

pdf_filename = "DocuMind_AI_Presentacion_Ejecutiva.pdf"
doc = SimpleDocTemplate(
    pdf_filename,
    pagesize=A4,
    leftMargin=12*mm,
    rightMargin=12*mm,
    topMargin=12*mm,
    bottomMargin=12*mm
)

# Color Palette (Corporate Modern Dark & Accents)
C_PRIMARY = colors.HexColor('#0F172A')    # Deep Slate
C_SECONDARY = colors.HexColor('#1E293B')  # Dark Slate
C_ACCENT_BLUE = colors.HexColor('#0284C7')# Ocean Blue
C_ACCENT_CYAN = colors.HexColor('#06B6D4')# Cyan
C_PURPLE = colors.HexColor('#7C3AED')     # Violet
C_GREEN = colors.HexColor('#059669')      # Emerald
C_AMBER = colors.HexColor('#D97706')      # Amber
C_RED = colors.HexColor('#DC2626')        # Rose / Red
C_BG_LIGHT = colors.HexColor('#F8FAFC')   # Surface Light
C_BORDER = colors.HexColor('#E2E8F0')     # Border Light
C_TEXT_DARK = colors.HexColor('#0F172A')
C_TEXT_MUTED = colors.HexColor('#475569')

# Typography & Styles
styles = getSampleStyleSheet()

style_cover_badge = ParagraphStyle(
    'CoverBadge',
    fontName='Helvetica-Bold',
    fontSize=8.5,
    leading=11,
    textColor=colors.HexColor('#0284C7'),
    alignment=0
)

style_cover_title = ParagraphStyle(
    'CoverTitle',
    fontName='Helvetica-Bold',
    fontSize=26,
    leading=30,
    textColor=C_PRIMARY,
    alignment=0
)

style_cover_subtitle = ParagraphStyle(
    'CoverSubtitle',
    fontName='Helvetica',
    fontSize=11,
    leading=15,
    textColor=C_TEXT_MUTED,
    alignment=0
)

style_sec_header = ParagraphStyle(
    'SecHeader',
    fontName='Helvetica-Bold',
    fontSize=13,
    leading=16,
    textColor=C_PRIMARY,
    spaceAfter=4
)

style_sec_subtitle = ParagraphStyle(
    'SecSubTitle',
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=13,
    textColor=C_ACCENT_BLUE,
    spaceBefore=4,
    spaceAfter=3
)

style_body = ParagraphStyle(
    'Body',
    fontName='Helvetica',
    fontSize=8.5,
    leading=11.5,
    textColor=C_TEXT_DARK
)

style_body_muted = ParagraphStyle(
    'BodyMuted',
    fontName='Helvetica',
    fontSize=8,
    leading=10.5,
    textColor=C_TEXT_MUTED
)

style_card_title = ParagraphStyle(
    'CardTitle',
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=11,
    textColor=C_PRIMARY
)

style_card_body = ParagraphStyle(
    'CardBody',
    fontName='Helvetica',
    fontSize=8,
    leading=10.5,
    textColor=C_TEXT_MUTED
)

style_th = ParagraphStyle(
    'TableHeader',
    fontName='Helvetica-Bold',
    fontSize=8,
    leading=10,
    textColor=colors.white
)

style_td = ParagraphStyle(
    'TableCell',
    fontName='Helvetica',
    fontSize=7.8,
    leading=10,
    textColor=C_TEXT_DARK
)

style_td_bold = ParagraphStyle(
    'TableCellBold',
    fontName='Helvetica-Bold',
    fontSize=7.8,
    leading=10,
    textColor=C_PRIMARY
)

style_badge_red = ParagraphStyle('BadgeRed', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=C_RED)
style_badge_green = ParagraphStyle('BadgeGreen', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=C_GREEN)
style_badge_blue = ParagraphStyle('BadgeBlue', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=C_ACCENT_BLUE)
style_badge_amber = ParagraphStyle('BadgeAmber', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=C_AMBER)

story = []

# =========================================================================
# PÁGINA 1: PORTADA & VISIÓN GENERAL
# =========================================================================
cover_header_data = [
    [
        Paragraph("<b>DOSSIER EJECUTIVO & TÉCNICO</b> • VERSIÓN 2.0 SECURE BY DESIGN", style_cover_badge),
        Paragraph("<font color='#64748B'>DocuMind AI Platform • Septiembre 2026</font>", ParagraphStyle('HRight', fontName='Helvetica', fontSize=8, leading=10, alignment=2))
    ]
]
t_cover_header = Table(cover_header_data, colWidths=[110*mm, 76*mm])
t_cover_header.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ('TOPPADDING', (0,0), (-1,-1), 0),
]))
story.append(t_cover_header)
story.append(Spacer(1, 6*mm))

# Main Title Box
title_box_data = [
    [
        Paragraph("<b>DocuMind <font color='#0284C7'>AI</font></b>", style_cover_title)
    ],
    [
        Paragraph("Plataforma Integral de Ingeniería de Software Asistida por Inteligencia Artificial con Auditoría Estática de Ciberseguridad (SAST), Modelado de Amenazas STRIDE y Arquitectura Secure by Design.", style_cover_subtitle)
    ]
]
t_title_box = Table(title_box_data, colWidths=[186*mm])
t_title_box.setStyle(TableStyle([
    ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ('TOPPADDING', (0,0), (-1,-1), 0),
]))
story.append(t_title_box)
story.append(Spacer(1, 4*mm))

# Highlight Cards in Cover
card1 = [
    Paragraph("<b>Auditoría SAST & SCA Real</b>", style_card_title),
    Paragraph("Inspección estática profunda basada en OWASP Top 10 y ASVS v4.0.3, detección de 10+ tipos de secretos y cálculo de Score 0-100 determinista.", style_card_body)
]
card2 = [
    Paragraph("<b>Suite Documental Completa</b>", style_card_title),
    Paragraph("Generación automatizada de PRD, SRS, Arquitectura C4 con Trust Boundaries, Diagramas Mermaid en vivo, OpenAPI 3.0, CI/CD, QA y ADRs.", style_card_body)
]
card3 = [
    Paragraph("<b>Hardening de Producción</b>", style_card_title),
    Paragraph("Seguridad integrada: Helmet CSP estricto, CORS dinámico, doble rate limiter, SafeZip contra Zip Bombs y defensas anti-prompt injection.", style_card_body)
]

t_cards = Table([[card1, card2, card3]], colWidths=[60*mm, 60*mm, 60*mm])
t_cards.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), C_BG_LIGHT),
    ('BOX', (0,0), (-1,-1), 1, C_BORDER),
    ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
    ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
]))
story.append(t_cards)
story.append(Spacer(1, 5*mm))

# Seccion 1: Arquitectura de Ingesta y Motor Local
story.append(Paragraph("1. Canales de Ingesta & Motor de Inspección Local", style_sec_header))
story.append(Paragraph("DocuMind AI procesa proyectos sin ejecutar código de usuario en el servidor anfitrión, garantizando aislamiento total:", style_body))
story.append(Spacer(1, 2*mm))

ingesta_table = [
    [
        Paragraph("Canal de Entrada", style_th),
        Paragraph("Mecanismo Técnico", style_th),
        Paragraph("Garantía de Seguridad", style_th)
    ],
    [
        Paragraph("<b>Repositorios GitHub</b>", style_td_bold),
        Paragraph("Clonación e inspección estática del branch principal.", style_td),
        Paragraph("<font color='#059669'><b>Solo lectura</b></font> (sin permisos de escritura en repo).", style_td)
    ],
    [
        Paragraph("<b>Carga de Archivos ZIP</b>", style_td_bold),
        Paragraph("Descompresión en memoria con módulo <code>safeZip.js</code>.", style_td),
        Paragraph("Protección contra <b>Zip Bombs</b> y <b>Path Traversal</b>.", style_td)
    ],
    [
        Paragraph("<b>Prompt / Manual</b>", style_td_bold),
        Paragraph("Ingesta de requerimientos en lenguaje natural.", style_td),
        Paragraph("Defensa contra inyecciones y escape de contexto.", style_td)
    ]
]
t_ingesta = Table(ingesta_table, colWidths=[45*mm, 85*mm, 56*mm])
t_ingesta.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
    ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
    ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, C_BG_LIGHT]),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
]))
story.append(t_ingesta)
story.append(Spacer(1, 4*mm))

# Local AST & Inspection capabilities
local_caps = [
    [
        Paragraph("<b>Detección de Stack:</b> Identifica lenguajes (TS, JS, Python, Go, Java, PHP) y frameworks (Express, Nest, FastAPI, React, etc.).", style_body),
        Paragraph("<b>Extractor de Endpoints:</b> Mapea rutas HTTP, verbos REST y parámetros sin levantar el servidor.", style_body)
    ],
    [
        Paragraph("<b>Extracción de DB:</b> Reconstruye esquemas DDL SQL y modelos ORM (Prisma, TypeORM, SQLAlchemy).", style_body),
        Paragraph("<b>Hashing SHA-256:</b> Genera digests criptográficos que reducen más del 60% del consumo de tokens.", style_body)
    ]
]
t_caps = Table(local_caps, colWidths=[92*mm, 92*mm])
t_caps.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ('TOPPADDING', (0,0), (-1,-1), 0),
    ('LEFTPADDING', (0,0), (-1,-1), 0),
    ('RIGHTPADDING', (0,0), (-1,-1), 0),
]))
story.append(t_caps)
story.append(Spacer(1, 4*mm))

# Authors footer on page 1
story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceBefore=4, spaceAfter=4))
p_foot = Paragraph("<font color='#64748B'><b>DocuMind AI</b> • Autores: Daniel Santiago Palencia Sandoval & Nelson Andres Ayala Alvarez • Página 1 de 4</font>", style_body_muted)
story.append(p_foot)

story.append(PageBreak())

# =========================================================================
# PÁGINA 2: DEVSECOPS & SECURE BY DESIGN HUB
# =========================================================================
story.append(Paragraph("2. Núcleo DevSecOps 'Secure by Design'", style_sec_header))
story.append(Paragraph("DocuMind AI integra un auditor estático de ciberseguridad que evalúa el código contra estándares internacionales (OWASP Top 10, ASVS v4.0.3 y STRIDE):", style_body))
story.append(Spacer(1, 3*mm))

# Score Banner Table
score_banner_data = [
    [
        Paragraph("<font size='22' color='#FFFFFF'><b>100</b></font><br/><font size='7' color='#A7F3D0'>SCORE BASE</font>", ParagraphStyle('ScoreBox', fontName='Helvetica-Bold', alignment=1)),
        Paragraph("<b>Modelo de Puntuación Determinista (0 a 100) & Deducciones Técnicas</b><br/><font color='#CBD5E1'>Cálculo matemático sin valoraciones simuladas: Hallazgo Crítico (-25 pts), Alto (-12 pts), Medio (-5 pts) y Bajo (-2 pts). La plataforma califica 8 dimensiones arquitectónicas fundamentales: Autenticación, Autorización, Validación de Entrada, APIs, Secretos, Dependencias, Configuración y Protección de Datos.</font>", ParagraphStyle('ScoreTxt', fontName='Helvetica', fontSize=8, leading=11, textColor=colors.white))
    ]
]
t_score = Table(score_banner_data, colWidths=[28*mm, 158*mm])
t_score.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (0,0), C_GREEN),
    ('BACKGROUND', (1,0), (1,0), C_PRIMARY),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
    ('RIGHTPADDING', (0,0), (-1,-1), 8),
]))
story.append(t_score)
story.append(Spacer(1, 4*mm))

story.append(Paragraph("Módulos del Motor de Seguridad (services/analyzer/security/)", style_sec_subtitle))

sast_table = [
    [
        Paragraph("Componente", style_th),
        Paragraph("Reglas & Patrones Auditados", style_th),
        Paragraph("Mitigación & Salvaguarda", style_th)
    ],
    [
        Paragraph("<b>Secret Scanner</b><br/><font color='#DC2626'>10+ Firmas</font>", style_td),
        Paragraph("Claves Gemini (<code>AIza...</code>), OpenAI (<code>sk-...</code>), AWS, GitHub PATs, Stripe, Slack, JWTs, claves privadas RSA/SSH y contraseñas hardcodeadas.", style_td),
        Paragraph("<b>Enmascaramiento visual seguro</b> (<code>AIza...****...8F2</code>) y <b>redacción criptográfica obligatoria</b> previa al envío al modelo de IA.", style_td)
    ],
    [
        Paragraph("<b>Motor SAST</b><br/><font color='#0284C7'>OWASP Top 10</font>", style_td),
        Paragraph("Inyección SQL, Cross-Site Scripting (XSS), Inyección de Comandos OS, ejecución peligrosa con <code>eval()</code>, Path Traversal, SSRF, Deserialización Insegura, Hashes MD5/SHA1 y exposición de endpoints.", style_td),
        Paragraph("Diferenciación de certeza técnica: <b>Detectado/Confirmado</b> frente a <b>Uso potencialmente peligroso</b>, con snippets higienizados.", style_td)
    ],
    [
        Paragraph("<b>Dependency Auditor</b><br/><font color='#D97706'>SCA Estático</font>", style_td),
        Paragraph("Inspección no destructiva de <code>package.json</code>, <code>package-lock.json</code> y <code>requirements.txt</code>.", style_td),
        Paragraph("Detección de dependencias vulnerables conocidas y advertencia por uso de versiones flotantes inseguras (<code>*</code>, <code>^</code>, <code>latest</code>).", style_td)
    ],
    [
        Paragraph("<b>STRIDE Modeler</b><br/><font color='#7C3AED'>Threat Matrix</font>", style_td),
        Paragraph("Modelado de amenazas STRIDE (Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation of Privilege).", style_td),
        Paragraph("Mapeo directo contra componentes del sistema: Frontend UI, API Gateway, Servicios Backend y Base de Datos.", style_td)
    ],
    [
        Paragraph("<b>Security Reqs</b><br/><font color='#059669'>SEC-001..N</font>", style_td),
        Paragraph("Matriz estructurada de requerimientos no funcionales de ciberseguridad.", style_td),
        Paragraph("Clasificados por ID formal, prioridad, estándar ASVS y estado de mitigación listos para el backlog de ingeniería.", style_td)
    ]
]
t_sast = Table(sast_table, colWidths=[38*mm, 82*mm, 66*mm])
t_sast.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
    ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
    ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, C_BG_LIGHT]),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
]))
story.append(t_sast)
story.append(Spacer(1, 4*mm))

# STRIDE Matrix Brief Table
story.append(Paragraph("Matriz de Amenazas STRIDE Mapeada por Componente", style_sec_subtitle))

stride_table = [
    [
        Paragraph("Amenaza STRIDE", style_th),
        Paragraph("Componente Objetivo", style_th),
        Paragraph("Control Arquitectónico Mitigante", style_th)
    ],
    [
        Paragraph("<font color='#DC2626'><b>Spoofing (Suplantación)</b></font>", style_td),
        Paragraph("Frontend & API Gateway", style_td),
        Paragraph("Autenticación robusta con tokens JWT firmados criptográficamente y rotación.", style_td)
    ],
    [
        Paragraph("<font color='#D97706'><b>Tampering (Alteración)</b></font>", style_td),
        Paragraph("Tránsito de Datos & APIs", style_td),
        Paragraph("Cifrado forzado TLS 1.3 y firmas de integridad HMAC en payloads críticos.", style_td)
    ],
    [
        Paragraph("<font color='#0284C7'><b>Repudiation (Repudio)</b></font>", style_td),
        Paragraph("Controladores Backend", style_td),
        Paragraph("Trazabilidad centralizada de auditoría con correlation IDs e inmutabilidad.", style_td)
    ],
    [
        Paragraph("<font color='#DC2626'><b>Info Disclosure (Fuga)</b></font>", style_td),
        Paragraph("Base de Datos & Logs", style_td),
        Paragraph("Almacenamiento cifrado en reposo (AES-256) y redacción automática de logs.", style_td)
    ],
    [
        Paragraph("<font color='#D97706'><b>Denial of Service (DoS)</b></font>", style_td),
        Paragraph("Endpoints HTTP Públicos", style_td),
        Paragraph("Rate limiting multicapa por IP y límites estrictos de tamaño en peticiones.", style_td)
    ],
    [
        Paragraph("<font color='#DC2626'><b>Elevation of Privilege</b></font>", style_td),
        Paragraph("Lógica de Negocio & RBAC", style_td),
        Paragraph("Control de acceso basado en roles (RBAC) validado en middleware central.", style_td)
    ]
]
t_stride = Table(stride_table, colWidths=[48*mm, 48*mm, 90*mm])
t_stride.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), C_SECONDARY),
    ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
    ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, C_BG_LIGHT]),
    ('TOPPADDING', (0,0), (-1,-1), 3),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
]))
story.append(t_stride)

story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceBefore=4, spaceAfter=4))
story.append(Paragraph("<font color='#64748B'><b>DocuMind AI</b> • Autores: Daniel Santiago Palencia Sandoval & Nelson Andres Ayala Alvarez • Página 2 de 4</font>", style_body_muted))

story.append(PageBreak())

# =========================================================================
# PÁGINA 3: SUITE DOCUMENTAL & EXPERIENCIA FRONTEND
# =========================================================================
story.append(Paragraph("3. Suite Documental Completa & Frontend Studio", style_sec_header))
story.append(Paragraph("DocuMind AI automatiza la generación integral de la documentación del software a lo largo de todo su ciclo de vida:", style_body))
story.append(Spacer(1, 3*mm))

docs_table = [
    [
        Paragraph("Documento / Artefacto", style_th),
        Paragraph("Estándar / Formato", style_th),
        Paragraph("Contenido y Elementos Generados", style_th)
    ],
    [
        Paragraph("<b>PRD (Product Requirements)</b>", style_td_bold),
        Paragraph("Markdown Formal", style_td),
        Paragraph("Visión del producto, objetivos de negocio, personas de usuario, casos de uso clave, supuestos y KPIs de éxito medibles.", style_td)
    ],
    [
        Paragraph("<b>SRS (Software Requirements)</b>", style_td_bold),
        Paragraph("IEEE-830 Standard", style_td),
        Paragraph("Catálogo formal de Requisitos Funcionales (RF-01...) y Requisitos No Funcionales (RNF: rendimiento, disponibilidad, seguridad).", style_td)
    ],
    [
        Paragraph("<b>Arquitectura C4 & Zonas</b>", style_td_bold),
        Paragraph("C4 Model + Mermaid", style_td),
        Paragraph("Diagramas de Contenedores interactivos enriquecidos con <b>Trust Boundaries</b> (zonas de confianza), canales TLS y microservicios.", style_td)
    ],
    [
        Paragraph("<b>Base de Datos & Diccionario</b>", style_td_bold),
        Paragraph("DDL SQL + Mermaid ERD", style_td),
        Paragraph("Diccionario de datos completo (tablas, columnas, tipos, PK/FK) y diagrama Entidad-Relación (ERD) interactivo renderizado en vivo.", style_td)
    ],
    [
        Paragraph("<b>Catálogo de API REST</b>", style_td_bold),
        Paragraph("OpenAPI 3.0.3 (JSON/MD)", style_td),
        Paragraph("Especificación de endpoints, contratos de solicitud/respuesta, códigos HTTP (200, 400, 401, 500) y exportación directa <code>openapi.json</code>.", style_td)
    ],
    [
        Paragraph("<b>DevOps & Despliegue</b>", style_td_bold),
        Paragraph("GitHub Actions + Docker", style_td),
        Paragraph("Workflows de CI/CD para testing y despliegue automático, <code>Dockerfile</code> multi-etapa optimizado y <code>docker-compose.yml</code>.", style_td)
    ],
    [
        Paragraph("<b>Aseguramiento de Calidad (QA)</b>", style_td_bold),
        Paragraph("Matriz de Testing", style_td),
        Paragraph("Casos de prueba estructurados: pruebas unitarias, de integración, de regresión y pruebas específicas de seguridad.", style_td)
    ],
    [
        Paragraph("<b>Decisiones de Arquitectura (ADR)</b>", style_td_bold),
        Paragraph("ADR Log Standard", style_td),
        Paragraph("Registros formales de decisiones de diseño con contexto, alternativas evaluadas, justificación técnica y consecuencias.", style_td)
    ],
    [
        Paragraph("<b>Manual de Usuario & README</b>", style_td_bold),
        Paragraph("Guía Operativa", style_td),
        Paragraph("Instrucciones paso a paso para instalación, variables de entorno requeridas, endpoints de verificación y solución de problemas.", style_td)
    ]
]
t_docs = Table(docs_table, colWidths=[48*mm, 38*mm, 100*mm])
t_docs.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
    ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
    ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, C_BG_LIGHT]),
    ('TOPPADDING', (0,0), (-1,-1), 3),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
]))
story.append(t_docs)
story.append(Spacer(1, 4*mm))

# Frontend Studio Capabilities
story.append(Paragraph("Frontend Studio: Experiencia Interactiva en Tiempo Real", style_sec_subtitle))

fe_card1 = [
    Paragraph("<b>Security Center Interactivo</b>", style_card_title),
    Paragraph("Gauge visual SVG con calificación de grado (A-F), KPIs por severidad, desglose de deducciones y filtros interactivos de hallazgos SAST (All/Crit/High/Med/Low).", style_card_body)
]
fe_card2 = [
    Paragraph("<b>Mermaid Studio en Vivo</b>", style_card_title),
    Paragraph("Renderizado en tiempo real de diagramas de arquitectura C4 y modelos relacionales ERD con controles de zoom, paneo y vista de código fuente.", style_card_body)
]
fe_card3 = [
    Paragraph("<b>Comparador de Versiones</b>", style_card_title),
    Paragraph("Herramienta de análisis diff que compara dos versiones de un proyecto e identifica adiciones, modificaciones y eliminaciones de archivos.", style_card_body)
]
fe_card4 = [
    Paragraph("<b>Asistente IA Contextualizado</b>", style_card_title),
    Paragraph("Chatbot técnico contextualizado con el análisis actual para responder consultas de arquitectura, código y remediación de vulnerabilidades.", style_card_body)
]

t_fe = Table([[fe_card1, fe_card2], [fe_card3, fe_card4]], colWidths=[92*mm, 92*mm])
t_fe.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), C_BG_LIGHT),
    ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
    ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
    ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
]))
story.append(t_fe)

story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceBefore=4, spaceAfter=4))
story.append(Paragraph("<font color='#64748B'><b>DocuMind AI</b> • Autores: Daniel Santiago Palencia Sandoval & Nelson Andres Ayala Alvarez • Página 3 de 4</font>", style_body_muted))

story.append(PageBreak())

# =========================================================================
# PÁGINA 4: HARDENING, EXPORTACIÓN & CERTIFICACIÓN DE CALIDAD
# =========================================================================
story.append(Paragraph("4. Hardening de Producción, Exportación & Verificación", style_sec_header))
story.append(Paragraph("DocuMind AI no solo analiza la seguridad de terceros, sino que implementa defensas de nivel bancario en su propia infraestructura:", style_body))
story.append(Spacer(1, 3*mm))

hardening_table = [
    [
        Paragraph("Vector de Vulnerabilidad", style_th),
        Paragraph("Salvaguarda Implementada en DocuMind AI", style_th),
        Paragraph("Estado de Protección", style_th)
    ],
    [
        Paragraph("<b>Cross-Site Scripting (XSS)</b>", style_td_bold),
        Paragraph("Cabeceras <b>Helmet</b> con Content Security Policy (CSP) restrictiva. Autorización explícita solo para librerías requeridas (Three.js, Mermaid, Marked).", style_td),
        Paragraph("<font color='#059669'><b>✔ Mitigado 100%</b></font>", style_td)
    ],
    [
        Paragraph("<b>Cross-Origin Resource Sharing</b>", style_td_bold),
        Paragraph("Eliminación de comodín <code>*</code>; lista blanca estricta configurable mediante <code>process.env.CORS_ORIGIN</code>.", style_td),
        Paragraph("<font color='#059669'><b>✔ Mitigado 100%</b></font>", style_td)
    ],
    [
        Paragraph("<b>Ataques de Denegación (DoS)</b>", style_td_bold),
        Paragraph("Doble limitador de tasa: <b>generalLimiter</b> (120 req/min) y <b>analysisLimiter</b> (20 req/min) en rutas intensivas.", style_td),
        Paragraph("<font color='#059669'><b>✔ Mitigado 100%</b></font>", style_td)
    ],
    [
        Paragraph("<b>Zip Bombs & Path Traversal</b>", style_td_bold),
        Paragraph("Procesamiento en memoria (<code>safeZip.js</code>) con límite de 35 MB, ratio máximo 100:1 y descarte de secuencias <code>../</code>.", style_td),
        Paragraph("<font color='#059669'><b>✔ Mitigado 100%</b></font>", style_td)
    ],
    [
        Paragraph("<b>Inyección de Prompts en IA</b>", style_td_bold),
        Paragraph("Encapsulación de código en etiquetas <code>&lt;untrusted_source_code&gt;</code> e instrucciones de sistema que prohíben reescribir directivas.", style_td),
        Paragraph("<font color='#059669'><b>✔ Mitigado 100%</b></font>", style_td)
    ],
    [
        Paragraph("<b>Exposición de Secretos</b>", style_td_bold),
        Paragraph("Redacción criptográfica obligatoria previa a la llamada de API de Gemini; ningún secreto en texto claro es procesado por el LLM.", style_td),
        Paragraph("<font color='#059669'><b>✔ Mitigado 100%</b></font>", style_td)
    ]
]
t_hard = Table(hardening_table, colWidths=[52*mm, 100*mm, 34*mm])
t_hard.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
    ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
    ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, C_BG_LIGHT]),
    ('TOPPADDING', (0,0), (-1,-1), 3),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
]))
story.append(t_hard)
story.append(Spacer(1, 4*mm))

# Sistema de Exportacion
story.append(Paragraph("Sistema de Exportación Multiformato", style_sec_subtitle))

exp_data = [
    [
        Paragraph("<b>1. Paquete ZIP Estructurado</b><br/><font color='#475569'>Descarga comprimida con árbol completo de carpetas estándar: <code>PRODUCT/</code>, <code>ARCHITECTURE/</code>, <code>DATABASE/</code>, <code>API/</code>, <code>DEVOPS/</code>, <code>QA/</code>, <code>ADR/</code>, <code>USER_GUIDE/</code> y <code>SECURITY/</code>.</font>", style_body),
        Paragraph("<b>2. DevSecOps JSON & MD</b><br/><font color='#475569'>Endpoints directos <code>/api/project/export/security-json/:id</code> y <code>/security-md/:id</code> para interoperabilidad directa con pipelines de CI/CD, SonarQube o DefectDojo.</font>", style_body),
        Paragraph("<b>3. Modo Impresión PDF</b><br/><font color='#475569'>Hoja de estilos dedicada <code>@media print</code> en el frontend que permite exportar la auditoría completa y los diagramas a documento PDF limpio y paginado.</font>", style_body)
    ]
]
t_exp = Table(exp_data, colWidths=[60*mm, 63*mm, 63*mm])
t_exp.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), C_BG_LIGHT),
    ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
    ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
]))
story.append(t_exp)
story.append(Spacer(1, 4*mm))

# Quality & Test Certification Box
test_box_data = [
    [
        Paragraph("<font size='16' color='#FFFFFF'><b>✔ 25 / 25</b></font><br/><font size='7' color='#A7F3D0'>100% PASS RATE</font>", ParagraphStyle('TestBox', fontName='Helvetica-Bold', alignment=1)),
        Paragraph("<b>Certificación de Calidad y Pruebas Automatizadas (Node.js Nativo)</b><br/><font color='#CBD5E1'>Suite ejecutada íntegramente mediante <code>node tests/test_api.js</code> con <b>cero fallos</b>: Sanitizador de variables, clasificador de 16 categorías, hashing SHA-256, extractor de endpoints y tablas SQL, generador documental, exportador ZIP, escáner de secretos, motor SAST, calculador de score, modelador STRIDE, descompresor SafeZip y endpoints de exportación de seguridad.</font>", ParagraphStyle('TestTxt', fontName='Helvetica', fontSize=7.8, leading=10.5, textColor=colors.white))
    ]
]
t_test = Table(test_box_data, colWidths=[30*mm, 156*mm])
t_test.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (0,0), C_GREEN),
    ('BACKGROUND', (1,0), (1,0), C_PRIMARY),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
    ('RIGHTPADDING', (0,0), (-1,-1), 8),
]))
story.append(t_test)
story.append(Spacer(1, 4*mm))

# Final sign-off
final_sign = [
    [
        Paragraph("<b>DocuMind AI Platform</b> — Ingeniería de Software Asistida por Inteligencia Artificial y DevSecOps.<br/><font color='#64748B'>Desarrollado por Daniel Santiago Palencia Sandoval & Nelson Andres Ayala Alvarez • Licencia MIT</font>", style_body_muted),
        Paragraph("<font color='#0284C7'><b>LISTO PARA PRODUCCIÓN</b></font>", ParagraphStyle('StatusReady', fontName='Helvetica-Bold', fontSize=9, alignment=2))
    ]
]
t_final = Table(final_sign, colWidths=[136*mm, 50*mm])
t_final.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 2),
    ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ('LEFTPADDING', (0,0), (-1,-1), 0),
    ('RIGHTPADDING', (0,0), (-1,-1), 0),
]))
story.append(t_final)

story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceBefore=4, spaceAfter=4))
story.append(Paragraph("<font color='#64748B'><b>DocuMind AI</b> • Autores: Daniel Santiago Palencia Sandoval & Nelson Andres Ayala Alvarez • Página 4 de 4</font>", style_body_muted))

# Build Document
doc.build(story)
print(f"SUCCESS: PDF generated successfully at {os.path.abspath(pdf_filename)}")
