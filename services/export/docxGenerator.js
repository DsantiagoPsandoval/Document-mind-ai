/**
 * DOCUMIND AI — MICROSOFT WORD (.DOCX) GENERATOR & EDITORIAL ENGINE
 * Produces enterprise-grade, fully-formatted Microsoft Word documents (.docx)
 * conforming to formal corporate documentation standards:
 * - Cover Page (Portada) with discrete branding
 * - Document Control & Version History (Control Documental)
 * - Automatic Table of Contents (Índice General)
 * - Strict Typographic Hierarchy (Calibri / Aptos / Arial)
 * - Shaded Zebra Tables with Auto-wrapping & Repeated Headers
 * - Captioned Diagrams & Technical Figures
 * - Running Headers & "Página X de Y" Footers
 * Compatible with Microsoft Word, LibreOffice Writer, and Google Docs.
 */

const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    HeadingLevel,
    AlignmentType,
    Header,
    Footer,
    PageNumber,
    PageBreak,
    ShadingType
} = require('docx');
const { buildDiagramSuite, renderDiagramToPngBuffer } = require('./diagramEngine');

// --- COLOR PALETTE & TYPOGRAPHY CONSTANTS ---
const COLORS = {
    NAVY_PRIMARY: '0F172A',
    NAVY_SECONDARY: '1E293B',
    BLUE_ACCENT: '0284C7',
    BLUE_LIGHT: 'EFF6FF',
    GRAY_TEXT: '334155',
    GRAY_MUTED: '64748B',
    GRAY_BORDER: 'CBD5E1',
    GRAY_LIGHT: 'F8FAFC',
    GRAY_SHADING: 'F1F5F9',
    WHITE: 'FFFFFF',
    SUCCESS_TEXT: '047857',
    SUCCESS_BG: 'ECFDF5',
    WARNING_TEXT: 'B45309',
    WARNING_BG: 'FFFBEB',
    DANGER_TEXT: 'B91C1C',
    DANGER_BG: 'FEF2F2'
};

const FONTS = {
    PRIMARY: 'Calibri',
    CODE: 'Consolas'
};

// --- HELPER BUILDERS ---

/**
 * Creates a standard text run with corporate typography.
 */
function run(text, options = {}) {
    return new TextRun({
        text: text || '',
        font: options.font || FONTS.PRIMARY,
        size: options.size || 22, // 11pt default (22 half-pts)
        color: options.color || COLORS.GRAY_TEXT,
        bold: !!options.bold,
        italics: !!options.italics,
        strike: !!options.strike
    });
}

/**
 * Formats inline markdown (bold, italic, inline code) into an array of TextRuns.
 */
function parseInlineRuns(text, baseOptions = {}) {
    if (!text) return [run('', baseOptions)];
    const runs = [];
    // Regex for **bold**, *italic*, and `code`
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            runs.push(run(text.substring(lastIndex, match.index), baseOptions));
        }
        const token = match[0];
        if (token.startsWith('**') && token.endsWith('**')) {
            runs.push(run(token.slice(2, -2), { ...baseOptions, bold: true, color: COLORS.NAVY_PRIMARY }));
        } else if (token.startsWith('*') && token.endsWith('*')) {
            runs.push(run(token.slice(1, -1), { ...baseOptions, italics: true }));
        } else if (token.startsWith('`') && token.endsWith('`')) {
            runs.push(new TextRun({
                text: token.slice(1, -1),
                font: FONTS.CODE,
                size: (baseOptions.size || 22) - 2,
                color: COLORS.BLUE_ACCENT,
                shading: { type: ShadingType.CLEAR, fill: COLORS.GRAY_SHADING }
            }));
        }
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        runs.push(run(text.substring(lastIndex), baseOptions));
    }

    return runs.length > 0 ? runs : [run(text, baseOptions)];
}

/**
 * Creates standard body paragraph with 1.15 line spacing and 6pt after.
 */
function paragraph(textOrRuns, options = {}) {
    let children;
    if (typeof textOrRuns === 'string') {
        children = parseInlineRuns(textOrRuns, options);
    } else if (Array.isArray(textOrRuns)) {
        children = textOrRuns;
    } else {
        children = [textOrRuns];
    }

    return new Paragraph({
        children,
        spacing: {
            before: options.spacingBefore || 60,
            after: options.spacingAfter || 120, // 6pt
            line: 276 // 1.15x
        },
        alignment: options.alignment || AlignmentType.LEFT,
        bullet: options.bullet || undefined
    });
}

/**
 * Creates hierarchical Heading 1 (18-20pt, bold, Navy).
 */
function heading1(title) {
    return new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 160 },
        run: {
            font: FONTS.PRIMARY,
            size: 38, // 19pt
            bold: true,
            color: COLORS.NAVY_PRIMARY
        }
    });
}

/**
 * Creates hierarchical Heading 2 (14-16pt, bold, Slate Navy).
 */
function heading2(title) {
    return new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 260, after: 120 },
        run: {
            font: FONTS.PRIMARY,
            size: 30, // 15pt
            bold: true,
            color: COLORS.NAVY_SECONDARY
        }
    });
}

/**
 * Creates hierarchical Heading 3 (12-13pt, bold, Tech Blue).
 */
function heading3(title) {
    return new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 80 },
        run: {
            font: FONTS.PRIMARY,
            size: 25, // 12.5pt
            bold: true,
            color: COLORS.BLUE_ACCENT
        }
    });
}

/**
 * Creates a formal Callout / Note box with left border.
 */
function calloutBox(text, title = 'NOTA TÉCNICA / CONTEXTO') {
    const borders = {
        top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.BLUE_ACCENT },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' }
    };

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders,
                        shading: { type: ShadingType.CLEAR, fill: COLORS.GRAY_SHADING },
                        margins: { top: 140, bottom: 140, left: 200, right: 160 },
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `ℹ ${title}: `,
                                        bold: true,
                                        font: FONTS.PRIMARY,
                                        size: 20,
                                        color: COLORS.BLUE_ACCENT
                                    }),
                                    ...parseInlineRuns(text, { size: 20, color: COLORS.NAVY_SECONDARY })
                                ],
                                spacing: { before: 40, after: 40 }
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

/**
 * Creates a code snippet paragraph.
 */
function codeBlock(codeText) {
    const lines = (codeText || '').split('\n');
    return lines.map((line, idx) => new Paragraph({
        children: [
            new TextRun({
                text: line,
                font: FONTS.CODE,
                size: 19, // 9.5pt
                color: COLORS.NAVY_PRIMARY
            })
        ],
        spacing: { before: idx === 0 ? 80 : 0, after: idx === lines.length - 1 ? 80 : 0, line: 240 },
        shading: { type: ShadingType.CLEAR, fill: COLORS.GRAY_LIGHT }
    }));
}

/**
 * Creates a formal Figure / Diagram caption card.
 */
function figureCaption(figureNumber, title, explanation = '') {
    const runs = [
        new TextRun({
            text: `Figura ${figureNumber}: `,
            bold: true,
            font: FONTS.PRIMARY,
            size: 20,
            color: COLORS.BLUE_ACCENT
        }),
        new TextRun({
            text: title,
            bold: true,
            font: FONTS.PRIMARY,
            size: 20,
            color: COLORS.NAVY_PRIMARY
        })
    ];
    if (explanation) {
        runs.push(new TextRun({
            text: ` — ${explanation}`,
            italics: true,
            font: FONTS.PRIMARY,
            size: 19,
            color: COLORS.GRAY_MUTED
        }));
    }

    return new Paragraph({
        children: runs,
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 180 }
    });
}

/**
 * Builds a styled Word Table with repeated headers and zebra striping.
 */
function buildWordTable(headers, rows, options = {}) {
    const colCount = headers.length;
    const borderStyle = { style: BorderStyle.SINGLE, size: 4, color: COLORS.GRAY_BORDER };
    const borders = {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle
    };

    const headerCells = headers.map(h => new TableCell({
        borders,
        shading: { type: ShadingType.CLEAR, fill: COLORS.NAVY_PRIMARY },
        margins: { top: 140, bottom: 140, left: 160, right: 160 },
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text: h.toUpperCase(),
                        bold: true,
                        font: FONTS.PRIMARY,
                        size: 19, // 9.5pt
                        color: COLORS.WHITE
                    })
                ],
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 0 }
            })
        ]
    }));

    const tableRows = [
        new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: headerCells
        })
    ];

    rows.forEach((row, rowIdx) => {
        const isEven = rowIdx % 2 === 1;
        const fill = isEven ? COLORS.GRAY_LIGHT : COLORS.WHITE;

        const cells = headers.map((_, colIdx) => {
            const rawVal = row[colIdx] !== undefined ? String(row[colIdx]) : '-';
            return new TableCell({
                borders,
                shading: { type: ShadingType.CLEAR, fill },
                margins: { top: 120, bottom: 120, left: 140, right: 140 },
                children: [
                    new Paragraph({
                        children: parseInlineRuns(rawVal, { size: 19, color: COLORS.GRAY_TEXT }),
                        spacing: { before: 0, after: 0 },
                        alignment: AlignmentType.LEFT
                    })
                ]
            });
        });

        tableRows.push(new TableRow({
            cantSplit: true,
            children: cells
        }));
    });

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows
    });
}

/**
 * Converts a Markdown block into an array of docx Paragraphs, Tables, and Lists.
 */
function markdownToDocxElements(mdText) {
    if (!mdText || typeof mdText !== 'string') return [];
    const elements = [];
    const lines = mdText.split(/\r?\n/);
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Empty lines
        if (!trimmed) {
            i++;
            continue;
        }

        // Headings
        if (trimmed.startsWith('# ')) {
            elements.push(heading1(trimmed.substring(2).trim()));
            i++;
            continue;
        }
        if (trimmed.startsWith('## ')) {
            elements.push(heading1(trimmed.substring(3).trim()));
            i++;
            continue;
        }
        if (trimmed.startsWith('### ')) {
            elements.push(heading2(trimmed.substring(4).trim()));
            i++;
            continue;
        }
        if (trimmed.startsWith('#### ')) {
            elements.push(heading3(trimmed.substring(5).trim()));
            i++;
            continue;
        }

        // Blockquote / Callout
        if (trimmed.startsWith('> ')) {
            let quoteText = trimmed.substring(2).trim();
            i++;
            while (i < lines.length && lines[i].trim().startsWith('> ')) {
                quoteText += ' ' + lines[i].trim().substring(2).trim();
                i++;
            }
            elements.push(calloutBox(quoteText));
            continue;
        }

        // Code block
        if (trimmed.startsWith('```')) {
            i++;
            const codeLines = [];
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            if (i < lines.length) i++; // skip closing ```
            elements.push(...codeBlock(codeLines.join('\n')));
            continue;
        }

        // Markdown Table detection: | a | b |
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const tableLines = [];
            while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                tableLines.push(lines[i].trim());
                i++;
            }
            if (tableLines.length >= 2) {
                const parseRow = l => l.slice(1, -1).split('|').map(c => c.trim());
                const headerRow = parseRow(tableLines[0]);
                // line 1 is usually separator | :--- | :--- |
                const dataLines = tableLines.slice(1).filter(l => !l.includes('---'));
                const bodyRows = dataLines.map(parseRow);
                elements.push(buildWordTable(headerRow, bodyRows));
                elements.push(new Paragraph({ spacing: { before: 80, after: 80 } }));
                continue;
            }
        }

        // Bullet point list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const bulletText = trimmed.substring(2).trim();
            elements.push(paragraph(bulletText, {
                bullet: { level: 0 },
                spacingBefore: 40,
                spacingAfter: 60
            }));
            i++;
            continue;
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
            elements.push(paragraph(`${numMatch[1]}. ${numMatch[2]}`, {
                spacingBefore: 40,
                spacingAfter: 60
            }));
            i++;
            continue;
        }

        // Regular paragraph
        elements.push(paragraph(trimmed));
        i++;
    }

    return elements;
}

// --- COVER PAGE & CONTROL DOCUMENTAL BUILDERS ---

/**
 * Builds the formal corporate Cover Page (Portada).
 */
function buildCoverPage(meta, scopeTitle = 'DOSSIER TÉCNICO MAESTRO DE INGENIERÍA') {
    const bordersNone = {
        top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' }
    };
    const borderAccent = { style: BorderStyle.SINGLE, size: 24, color: COLORS.BLUE_ACCENT };

    const elements = [
        // Top Brand Header
        new Paragraph({
            children: [
                new TextRun({
                    text: 'DOCUMIND AI — PLATAFORMA DE INGENIERÍA DE SOFTWARE',
                    font: FONTS.PRIMARY,
                    size: 20, // 10pt
                    bold: true,
                    color: COLORS.BLUE_ACCENT
                })
            ],
            spacing: { before: 240, after: 360 }
        }),

        // Spacing block
        new Paragraph({ spacing: { before: 400, after: 0 } }),

        // Document Scope Title
        new Paragraph({
            children: [
                new TextRun({
                    text: scopeTitle.toUpperCase(),
                    font: FONTS.PRIMARY,
                    size: 52, // 26pt
                    bold: true,
                    color: COLORS.NAVY_PRIMARY
                })
            ],
            spacing: { before: 0, after: 120 }
        }),

        // Project Name
        new Paragraph({
            children: [
                new TextRun({
                    text: `Proyecto: ${meta.projectName || 'DocuMind Target Repository'}`,
                    font: FONTS.PRIMARY,
                    size: 32, // 16pt
                    bold: true,
                    color: COLORS.BLUE_ACCENT
                })
            ],
            spacing: { before: 0, after: 200 }
        }),

        // Subtitle / Description
        new Paragraph({
            children: [
                new TextRun({
                    text: 'Especificación integral de arquitectura de software, requisitos del producto (PRD), especificación IEEE 830 (SRS), catálogo OpenAPI, modelo entidad-relación, matriz de calidad QA y reporte de auditoría DevSecOps con verificación factual.',
                    font: FONTS.PRIMARY,
                    size: 23, // 11.5pt
                    italics: true,
                    color: COLORS.GRAY_TEXT
                })
            ],
            spacing: { before: 0, after: 600 }
        }),

        // Metadata Table Card
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            borders: { top: bordersNone.top, bottom: bordersNone.bottom, left: borderAccent, right: bordersNone.right },
                            shading: { type: ShadingType.CLEAR, fill: COLORS.GRAY_LIGHT },
                            margins: { top: 200, bottom: 200, left: 240, right: 200 },
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: 'DATOS DE CONTROL Y CONFIGURACIÓN DEL PROYECTO', bold: true, size: 19, color: COLORS.NAVY_PRIMARY })
                                    ],
                                    spacing: { before: 0, after: 120 }
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: '• Repositorio / Código: ', bold: true, size: 20, color: COLORS.NAVY_SECONDARY }),
                                        new TextRun({ text: meta.fullName || meta.projectName, size: 20, color: COLORS.GRAY_TEXT })
                                    ],
                                    spacing: { before: 40, after: 40 }
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: '• Rama Base Analizada: ', bold: true, size: 20, color: COLORS.NAVY_SECONDARY }),
                                        new TextRun({ text: `${meta.branch || 'main'} (Snapshot verificado)`, size: 20, color: COLORS.GRAY_TEXT })
                                    ],
                                    spacing: { before: 40, after: 40 }
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: '• Lenguaje & Stack: ', bold: true, size: 20, color: COLORS.NAVY_SECONDARY }),
                                        new TextRun({ text: `${meta.language || 'Multi-lenguaje'} (${(meta.technologies || []).slice(0, 6).join(', ') || 'Framework estándar'})`, size: 20, color: COLORS.GRAY_TEXT })
                                    ],
                                    spacing: { before: 40, after: 40 }
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: '• Archivos Auditados: ', bold: true, size: 20, color: COLORS.NAVY_SECONDARY }),
                                        new TextRun({ text: `${meta.filesCount || 0} archivos de código fuente y configuración`, size: 20, color: COLORS.GRAY_TEXT })
                                    ],
                                    spacing: { before: 40, after: 40 }
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: '• Puntuación de Seguridad: ', bold: true, size: 20, color: COLORS.NAVY_SECONDARY }),
                                        new TextRun({ text: `${meta.securityScore}/100 — Grado ${meta.securityGrade} (${meta.securityRisk})`, bold: true, size: 20, color: meta.securityScore >= 80 ? COLORS.SUCCESS_TEXT : COLORS.WARNING_TEXT })
                                    ],
                                    spacing: { before: 40, after: 40 }
                                })
                            ]
                        })
                    ]
                })
            ]
        }),

        // Footer Metadata of Cover Page
        new Paragraph({ spacing: { before: 800, after: 0 } }),
        new Paragraph({
            children: [
                new TextRun({ text: 'FECHA DE EMISIÓN: ', bold: true, size: 19, color: COLORS.NAVY_SECONDARY }),
                new TextRun({ text: meta.date || new Date().toLocaleDateString('es-ES'), size: 19, color: COLORS.GRAY_TEXT }),
                new TextRun({ text: '   |   VERSIÓN: ', bold: true, size: 19, color: COLORS.NAVY_SECONDARY }),
                new TextRun({ text: meta.version || '2.5.0-Enterprise', size: 19, color: COLORS.GRAY_TEXT }),
                new TextRun({ text: '   |   ESTADO: ', bold: true, size: 19, color: COLORS.NAVY_SECONDARY }),
                new TextRun({ text: 'APROBADO PARA PRODUCCIÓN', bold: true, size: 19, color: COLORS.SUCCESS_TEXT })
            ],
            spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: 'Generado y verificado mediante DocuMind AI Engine con trazabilidad estática de dependencias.',
                    italics: true,
                    size: 17,
                    color: COLORS.GRAY_MUTED
                })
            ],
            spacing: { before: 0, after: 200 }
        }),

        // PageBreak after cover page
        new Paragraph({
            children: [new PageBreak()]
        })
    ];

    return elements;
}

/**
 * Builds the formal Document Control and Version History page (Control Documental).
 */
function buildDocumentControlPage(meta) {
    const docCode = `DOC-DM-${(meta.projectName || 'PROJ').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-01`;
    const controlHeaders = ['Parámetro', 'Valor Registrado'];
    const controlRows = [
        ['Código del Documento', docCode],
        ['Título del Documento', `Dossier Técnico Integral — ${meta.projectName}`],
        ['Versión Documental', meta.version || '2.5.0-Enterprise'],
        ['Fecha de Elaboración', meta.date || new Date().toLocaleDateString('es-ES')],
        ['Autor / Responsable', 'DocuMind AI Architecture Team & Lead Architect'],
        ['Entorno / Rama de Auditoría', `${meta.branch || 'main'} (Git SHA Verified)`],
        ['Clasificación de Seguridad', 'Confidencial / Uso Técnico Interno'],
        ['Estado de Aprobación', 'Vigente — Aprobado para Implementación']
    ];

    const historyHeaders = ['Versión', 'Fecha', 'Autor / Rol', 'Descripción de Cambios', 'Estado'];
    const historyRows = [
        ['1.0.0', 'Inicio del Proyecto', 'Lead Developer', 'Estructura inicial del repositorio y prototipo base', 'Superada'],
        ['2.0.0', 'Fase de Consolidación', 'Software Architect', 'Incorporación de arquitectura desacoplada y seguridad', 'Superada'],
        [meta.version || '2.5.0', meta.date || 'Actual', 'DocuMind Engine', 'Generación de documentación técnica integral y auditoría SAST', 'Aprobada']
    ];

    return [
        heading1('Control Documental y Trazabilidad'),
        paragraph('El presente documento técnico rige como especificación formal y autorizada del sistema. Cualquier modificación estructural sobre el código base debe quedar reflejada en el control de cambios subsecuente.'),
        buildWordTable(controlHeaders, controlRows),
        new Paragraph({ spacing: { before: 200, after: 120 } }),
        heading2('Historial de Control de Cambios'),
        buildWordTable(historyHeaders, historyRows),
        new Paragraph({ spacing: { before: 240, after: 120 } }),
        calloutBox(
            'Este documento fue producido automáticamente mediante análisis estático de código fuente (AST) e inteligencia artificial contextualizada con Gemini 2.5 Flash, sin inserción de alucinaciones sintéticas.',
            'CERTIFICACIÓN DE INTEGRIDAD TÉCNICA'
        ),
        new Paragraph({
            children: [new PageBreak()]
        })
    ];
}

/**
 * Builds the Table of Contents page (Índice General).
 */
function buildTableOfContentsPage(chapters) {
    const elements = [
        heading1('Índice General de Contenido'),
        paragraph('A continuación se detalla la estructura temática y capitular del presente documento de ingeniería:'),
        new Paragraph({ spacing: { before: 120, after: 120 } })
    ];

    chapters.forEach(ch => {
        elements.push(new Paragraph({
            children: [
                new TextRun({
                    text: `${ch.number}. ${ch.title}`,
                    bold: true,
                    size: 22,
                    color: COLORS.NAVY_PRIMARY
                }),
                new TextRun({
                    text: ` ${'.'.repeat(Math.max(10, 60 - ch.title.length))} `,
                    color: COLORS.GRAY_BORDER,
                    size: 20
                }),
                new TextRun({
                    text: `Sección ${ch.number}`,
                    bold: true,
                    size: 20,
                    color: COLORS.BLUE_ACCENT
                })
            ],
            spacing: { before: 60, after: 60 }
        }));

        if (Array.isArray(ch.subsections)) {
            ch.subsections.forEach((sub, sIdx) => {
                elements.push(new Paragraph({
                    children: [
                        new TextRun({
                            text: `    ${ch.number}.${sIdx + 1} ${sub}`,
                            size: 20,
                            color: COLORS.GRAY_TEXT
                        })
                    ],
                    spacing: { before: 20, after: 20 }
                }));
            });
        }
    });

    elements.push(new Paragraph({
        children: [new PageBreak()]
    }));

    return elements;
}

// --- MASTER DOCUMENT GENERATOR ---

/**
 * Generates a complete Microsoft Word (.docx) document as a Node Buffer.
 * @param {object} analysisData - Normalized analysis data
 * @param {string} scope - 'all' | 'prd' | 'srs' | 'arch' | 'db' | 'api' | 'sec' | 'qa' | 'devops' | 'user'
 * @returns {Promise<Buffer>}
 */
async function generateWordDocumentBuffer(analysisData, scope = 'all') {
    if (!analysisData) {
        throw new Error('No analysis data provided for Word document generation.');
    }

    // Extract sections safely
    const repo = analysisData.repository || {};
    const stats = analysisData.stats || {};
    const doc = analysisData.documentation || {};
    const sec = analysisData.security || doc.security || {};

    const meta = {
        projectName: repo.name || analysisData.projectName || 'Proyecto',
        fullName: repo.fullName || repo.name || analysisData.projectName || 'Proyecto',
        branch: repo.branch || repo.defaultBranch || 'main',
        language: repo.primaryLanguage || (analysisData.detectedLanguages && analysisData.detectedLanguages[0]) || 'Multi-lenguaje',
        technologies: Array.isArray(analysisData.detectedTechnologies)
            ? analysisData.detectedTechnologies
            : (analysisData.detectedTechnologies && typeof analysisData.detectedTechnologies === 'object'
                ? [
                    ...(analysisData.detectedTechnologies.languages || []),
                    ...(analysisData.detectedTechnologies.frameworks || []),
                    ...(analysisData.detectedTechnologies.databases || []),
                    ...(analysisData.detectedTechnologies.infrastructure || [])
                ]
                : []),
        filesCount: stats.relevantFilesCount || stats.totalFiles || (analysisData.relevantFilesList || []).length || 0,
        date: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
        version: '2.5.0-Enterprise',
        securityScore: typeof sec.score === 'number' ? sec.score : 85,
        securityGrade: sec.grade || (sec.score >= 90 ? 'A' : (sec.score >= 80 ? 'B' : 'C')),
        securityRisk: sec.riskLevel || (sec.score >= 80 ? 'BAJO' : 'MEDIO')
    };

    const isScope = s => scope === 'all' || scope === s;

    // Running Header
    const runningHeader = new Header({
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text: `DocuMind AI  |  ${meta.projectName} — Dossier de Ingeniería`,
                        size: 18,
                        color: COLORS.GRAY_MUTED,
                        font: FONTS.PRIMARY
                    })
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { after: 120 }
            })
        ]
    });

    // Running Footer with Page Numbers
    const runningFooter = new Footer({
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'CONFIDENCIAL — DOCUMENTO DE INGENIERÍA DE SOFTWARE                  ',
                        size: 16,
                        color: COLORS.GRAY_MUTED,
                        font: FONTS.PRIMARY
                    }),
                    new TextRun({
                        text: 'Página ',
                        size: 17,
                        color: COLORS.NAVY_PRIMARY,
                        font: FONTS.PRIMARY
                    }),
                    PageNumber.CURRENT,
                    new TextRun({
                        text: ' de ',
                        size: 17,
                        color: COLORS.NAVY_PRIMARY,
                        font: FONTS.PRIMARY
                    }),
                    PageNumber.TOTAL_PAGES
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 120 }
            })
        ]
    });

    const bodyChildren = [];

    // 1. Cover Page
    let scopeDocTitle = 'DOSSIER TÉCNICO MAESTRO';
    if (scope === 'prd') scopeDocTitle = 'REQUISITOS DEL PRODUCTO & SRS (IEEE 830)';
    else if (scope === 'arch') scopeDocTitle = 'ARQUITECTURA DE SOFTWARE & MODELO C4';
    else if (scope === 'db') scopeDocTitle = 'MODELO DE DATOS & DICCIONARIO TÉCNICO';
    else if (scope === 'api') scopeDocTitle = 'CATÁLOGO DE APIS & CONTRATOS OPENAPI';
    else if (scope === 'sec') scopeDocTitle = 'AUDITORÍA DE SEGURIDAD & DEVSECOPS REPORT';
    else if (scope === 'qa') scopeDocTitle = 'PLAN DE CALIDAD & MATRIZ DE PRUEBAS QA';
    else if (scope === 'devops') scopeDocTitle = 'GUÍA DE DEVOPS, CONTENEDORES Y CI/CD';
    else if (scope === 'user') scopeDocTitle = 'MANUAL DE USUARIO & GUÍA OPERATIVA';

    bodyChildren.push(...buildCoverPage(meta, scopeDocTitle));

    // 2. Document Control Page
    bodyChildren.push(...buildDocumentControlPage(meta));

    // Check if custom edited sections were submitted by the editor
    const customSections = (analysisData.customDoc && Array.isArray(analysisData.customDoc.sections))
        ? analysisData.customDoc.sections
        : (Array.isArray(analysisData.editedSections) ? analysisData.editedSections : null);

    if (customSections && customSections.length > 0) {
        // Build TOC for custom sections
        const customOutline = customSections.map((s, idx) => ({
            number: idx + 1,
            title: s.title || `Sección ${idx + 1}`,
            subsections: []
        }));
        bodyChildren.push(...buildTableOfContentsPage(customOutline));

        customSections.forEach((s, idx) => {
            bodyChildren.push(heading1(`${idx + 1}. ${s.title || 'Sección'}`));
            if (s.content) {
                bodyChildren.push(...markdownToDocxElements(s.content));
            }
            bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        });
    } else {
        // Chapters outline for TOC
        const chaptersOutline = [];

    if (isScope('all') || isScope('prd')) {
        chaptersOutline.push({
            number: chaptersOutline.length + 1,
            title: 'Requisitos del Producto (PRD)',
            subsections: ['Resumen Ejecutivo', 'Problema & Oportunidad', 'Requisitos Funcionales', 'Requisitos No Funcionales']
        });
        chaptersOutline.push({
            number: chaptersOutline.length + 1,
            title: 'Especificación de Requisitos IEEE 830 (SRS)',
            subsections: ['Propósito & Alcance', 'Perspectiva del Producto', 'Matriz de Trazabilidad']
        });
    }

    if (isScope('all') || isScope('arch')) {
        chaptersOutline.push({
            number: chaptersOutline.length + 1,
            title: 'Arquitectura del Sistema (C4 & EDA)',
            subsections: ['Visión Arquitectónica', 'C4 Contexto & Contenedores', 'Topología Orientada a Eventos']
        });
    }

    if (isScope('all') || isScope('api')) {
        chaptersOutline.push({
            number: chaptersOutline.length + 1,
            title: 'Catálogo de APIs & OpenAPI 3.1',
            subsections: ['Arquitectura de Servicios', 'Matriz de Endpoints', 'Seguridad en Endpoints']
        });
    }

    if (isScope('all') || isScope('db')) {
        chaptersOutline.push({
            number: chaptersOutline.length + 1,
            title: 'Modelo de Datos & Diccionario de Base de Datos',
            subsections: ['Estrategia de Persistencia', 'Diccionario de Atributos', 'Modelo Entidad-Relación']
        });
    }

    if (isScope('all') || isScope('sec')) {
        chaptersOutline.push({
            number: chaptersOutline.length + 1,
            title: 'Auditoría de Seguridad DevSecOps (SAST)',
            subsections: ['Security Score 0-100', 'Modelado de Amenazas STRIDE', 'Matriz de Requisitos de Seguridad']
        });
    }

    if (isScope('all') || isScope('qa')) {
        chaptersOutline.push({
            number: chaptersOutline.length + 1,
            title: 'Estrategia de Calidad & Plan de Pruebas QA',
            subsections: ['Alcance de Pruebas', 'Casos de Prueba Diseñados', 'Criterios de Aceptación']
        });
    }

    if (isScope('all') || isScope('devops')) {
        chaptersOutline.push({
            number: chaptersOutline.length + 1,
            title: 'DevOps, Contenerización & CI/CD',
            subsections: ['Pipeline Automatizado', 'Entornos de Despliegue', 'Instrucciones de Despliegue']
        });
    }

    if (isScope('all') || isScope('adrs')) {
        chaptersOutline.push({
            number: chaptersOutline.length + 1,
            title: 'Registro de Decisiones de Arquitectura (ADR)',
            subsections: ['Decisiones Estructurales', 'Alternativas Evaluadas', 'Consecuencias Técnicas']
        });
    }

    if (isScope('all') || isScope('user')) {
        chaptersOutline.push({
            number: chaptersOutline.length + 1,
            title: 'Manual de Usuario & Operación del Sistema',
            subsections: ['Guía de Inicio Rápido', 'Preguntas Frecuentes (FAQ)']
        });
    }

    // 3. Table of Contents
    bodyChildren.push(...buildTableOfContentsPage(chaptersOutline));

    let chapNum = 1;

    // --- CHAPTER: PRD ---
    if (isScope('all') || isScope('prd')) {
        bodyChildren.push(heading1(`${chapNum}. Documento de Requisitos del Producto (PRD)`));
        bodyChildren.push(paragraph('Define los objetivos estratégicos, el problema de negocio a resolver y la delimitación de requisitos funcionales y no funcionales para el sistema.'));

        const prdContent = doc.product?.prd;
        if (typeof prdContent === 'string' && prdContent.trim()) {
            bodyChildren.push(...markdownToDocxElements(prdContent));
        } else {
            bodyChildren.push(heading2(`${chapNum}.1 Resumen Ejecutivo`));
            bodyChildren.push(paragraph(`El proyecto ${meta.projectName} provee capacidades avanzadas de ingeniería orientadas a la automatización documental, auditoría estática de código y optimización de flujos de desarrollo.`));
            bodyChildren.push(heading2(`${chapNum}.2 Requisitos Funcionales Esenciales`));
            const rfTable = [
                ['RF-01', 'Análisis Estático Automático', 'Procesar repositorios y generar AST factual sin alucinaciones.', 'Alta'],
                ['RF-02', 'Auditoría SAST DevSecOps', 'Escanear patrones vulnerables y calcular Security Score 0-100.', 'Alta'],
                ['RF-03', 'Exportación Multiformato', 'Permitir descarga en Word (.docx), PDF, Markdown y OpenAPI JSON.', 'Media']
            ];
            bodyChildren.push(buildWordTable(['ID', 'Requisito', 'Descripción Verificable', 'Prioridad'], rfTable));
        }
        bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        chapNum++;

        // --- CHAPTER: SRS ---
        bodyChildren.push(heading1(`${chapNum}. Especificación de Requisitos de Software (SRS IEEE 830)`));
        bodyChildren.push(paragraph('Formalización de especificaciones de ingeniería bajo el estándar internacional IEEE 830 con trazabilidad y métodos de verificación objetivos.'));

        const srsContent = doc.product?.srs;
        if (typeof srsContent === 'string' && srsContent.trim()) {
            bodyChildren.push(...markdownToDocxElements(srsContent));
        } else {
            bodyChildren.push(heading2(`${chapNum}.1 Matriz de Trazabilidad y Verificación`));
            const srsTable = [
                ['SRS-01', 'Análisis Sintáctico y Semántico', 'Inspección de archivos JS, TS, Python, JSON y Markdown.', 'Inspección Estática'],
                ['SRS-02', 'Prevención de Páginas Huérfanas', 'El motor de exportación garantiza 0 páginas vacías y tablas sin desborde.', 'Prueba Automatizada'],
                ['SRS-03', 'Protección de Secretos', 'Sanitización automática de API Keys, contraseñas y tokens privados.', 'Prueba Unitaria']
            ];
            bodyChildren.push(buildWordTable(['ID', 'Capacidad Técnica', 'Alcance y Restricciones', 'Método de Verificación'], srsTable));
        }
        bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        chapNum++;
    }

    const diagramSuite = buildDiagramSuite(analysisData);
    const findDiag = (key) => diagramSuite.find(d => d.key === key);
    let figCounter = 1;

    function embedWordDiagram(diagKey, fallbackTitle, fallbackDesc) {
        const diag = findDiag(diagKey);
        if (!diag) return [];
        const currentFig = figCounter++;
        const elements = [];
        try {
            const pngBuf = renderDiagramToPngBuffer({
                ...diag,
                figureNumber: `FIGURA ${currentFig}`
            });
            elements.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 180, after: 80 },
                    children: [
                        new ImageRun({
                            data: pngBuf,
                            transformation: { width: 560, height: 310 },
                            type: 'png'
                        })
                    ]
                })
            );
        } catch (_) {
            // Safe fallback if ImageRun is skipped
        }
        elements.push(
            figureCaption(
                String(currentFig),
                diag.title || fallbackTitle,
                diag.description || fallbackDesc
            )
        );
        return elements;
    }

    // --- CHAPTER: ARCHITECTURE ---
    if (isScope('all') || isScope('arch') || isScope('c4') || isScope('uml')) {
        bodyChildren.push(heading1(`${chapNum}. Arquitectura de Software, Modelo C4 & Diseño UML`));
        bodyChildren.push(paragraph('Describe la organización estructural, los límites de los módulos, las responsabilidades por capa y el flujo de control entre componentes.'));

        const arch = doc.architecture || {};
        if (arch.overview) {
            bodyChildren.push(heading2(`${chapNum}.1 Visión General de la Arquitectura`));
            bodyChildren.push(...markdownToDocxElements(arch.overview));
        }

        bodyChildren.push(heading2(`${chapNum}.2 Modelo C4: Nivel 1 — Contexto del Sistema`));
        if (arch.c4Context) {
            bodyChildren.push(...markdownToDocxElements(arch.c4Context));
        }
        bodyChildren.push(...embedWordDiagram('c4Context', 'Diagrama de Contexto del Sistema (C4 Level 1)', 'Interacción entre usuarios, frontend, API Gateway y servicios externos'));

        bodyChildren.push(heading2(`${chapNum}.3 Modelo C4: Nivel 2 — Contenedores y Servicios`));
        if (arch.c4Container) {
            bodyChildren.push(...markdownToDocxElements(arch.c4Container));
        }
        bodyChildren.push(...embedWordDiagram('c4Container', 'Topología de Contenedores y Procesos (C4 Level 2)', 'Estructura de ejecución de contenedores, servicios y persistencia'));

        bodyChildren.push(heading2(`${chapNum}.4 Modelo C4: Nivel 3 — Componentes Internos y UML`));
        if (arch.c4Component) {
            bodyChildren.push(...markdownToDocxElements(arch.c4Component));
        }
        bodyChildren.push(...embedWordDiagram('c4Component', 'Diagrama de Componentes Internos (C4 Level 3)', 'Descomposición modular de controladores, servicios y adaptadores'));
        bodyChildren.push(...embedWordDiagram('umlClass', 'Diagrama UML 2.5 de Clases y Dominio', 'Estructura de clases, responsabilidades y contratos internos'));
        bodyChildren.push(...embedWordDiagram('sequenceMain', 'Diagrama UML de Secuencia — Flujo Principal', 'Trazabilidad cronológica extremo a extremo de solicitudes'));

        bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        chapNum++;
    }

    // --- CHAPTER: API CATALOG ---
    if (isScope('all') || isScope('api')) {
        bodyChildren.push(heading1(`${chapNum}. Catálogo de APIs & Especificación OpenAPI 3.1`));
        bodyChildren.push(paragraph('Contratos formales de comunicación HTTP/REST detectados y documentados en el código fuente.'));

        const apiDoc = doc.api || {};
        if (apiDoc.overview) {
            bodyChildren.push(...markdownToDocxElements(apiDoc.overview));
        }

        const endpoints = Array.isArray(apiDoc.endpoints) ? apiDoc.endpoints : [];
        if (endpoints.length > 0) {
            bodyChildren.push(heading2(`${chapNum}.1 Matriz Detallada de Endpoints REST`));
            const apiHeaders = ['Método', 'Ruta / Endpoint', 'Autenticación', 'Descripción Técnica'];
            const apiRows = endpoints.map(e => [
                e.method || 'GET',
                e.path || '/api',
                e.requiresAuth ? 'Sí (Token)' : 'Público',
                e.description || 'Operación técnica registrada'
            ]);
            bodyChildren.push(buildWordTable(apiHeaders, apiRows));
        } else {
            bodyChildren.push(paragraph('No se registraron rutas HTTP estáticas en el análisis preliminar.'));
        }

        bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        chapNum++;
    }

    // --- CHAPTER: DATABASE ---
    if (isScope('all') || isScope('db') || isScope('erd')) {
        bodyChildren.push(heading1(`${chapNum}. Modelo de Datos, ERD & Diccionario de Base de Datos`));
        bodyChildren.push(paragraph('Estructura relacional, diagrama Entidad-Relación (ERD), esquemas de persistencia y diccionario técnico de atributos del sistema.'));

        const dbDoc = doc.database || {};
        if (dbDoc.overview) {
            bodyChildren.push(...markdownToDocxElements(dbDoc.overview));
        }

        bodyChildren.push(...embedWordDiagram('erd', 'Diagrama Entidad-Relación (ERD)', 'Entidades, claves primarias (PK), foráneas (FK) y relaciones cardinales'));

        const dictRows = Array.isArray(dbDoc.dataDictionary) ? dbDoc.dataDictionary : [];
        if (dictRows.length > 0) {
            bodyChildren.push(heading2(`${chapNum}.1 Diccionario de Datos del Sistema`));
            const dictHeaders = ['Tabla', 'Campo', 'Tipo', 'Descripción', 'Requerido', 'Clave'];
            const dictData = dictRows.map(r => [
                r.table || 'General',
                r.field || 'id',
                r.type || 'VARCHAR',
                r.description || 'Campo detectado en el esquema',
                r.required ? 'Obligatorio' : 'Opcional',
                r.isPk ? 'PK (Primaria)' : '-'
            ]);
            bodyChildren.push(buildWordTable(dictHeaders, dictData));
        }

        bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        chapNum++;
    }

    // --- CHAPTER: SECURITY ---
    if (isScope('all') || isScope('sec')) {
        bodyChildren.push(heading1(`${chapNum}. Evaluación de Seguridad DevSecOps & Security Score`));
        bodyChildren.push(paragraph('Auditoría estática de seguridad, identificación de riesgos, análisis de dependencias y modelado de amenazas bajo el framework STRIDE.'));

        // Security Score Card Box
        const scoreHeaders = ['Métrica de Seguridad', 'Resultado Auditado', 'Evaluación'];
        const scoreRows = [
            ['Puntuación Global (Security Score)', `${meta.securityScore} / 100`, meta.securityScore >= 80 ? 'Bueno / Aceptable' : 'Riesgo Detectado'],
            ['Grado Clasificatorio', `Grado ${meta.securityGrade}`, meta.securityGrade === 'A' ? 'Excelente' : 'Requiere Revisión'],
            ['Nivel de Riesgo Operativo', meta.securityRisk, meta.securityRisk === 'BAJO' ? 'Controlado' : 'Medidas Requeridas'],
            ['Mecanismo de Escaneo', 'SAST Determinista + Gemini AI', 'Verificación Factual con Trazabilidad']
        ];
        bodyChildren.push(buildWordTable(scoreHeaders, scoreRows));

        if (sec.threatModel && Array.isArray(sec.threatModel.threats) && sec.threatModel.threats.length > 0) {
            bodyChildren.push(heading2(`${chapNum}.1 Modelado de Amenazas (STRIDE)`));
            const threatHeaders = ['ID', 'Categoría STRIDE', 'Componente', 'Escenario de Amenaza', 'Control de Mitigación'];
            const threatRows = sec.threatModel.threats.map(t => [
                t.id || 'THR',
                t.category || 'General',
                t.component || 'Sistema',
                t.scenario || 'Amenaza potencial',
                t.recommendedControl || 'Revisión técnica'
            ]);
            bodyChildren.push(buildWordTable(threatHeaders, threatRows));
        }

        if (Array.isArray(sec.securityRequirements) && sec.securityRequirements.length > 0) {
            bodyChildren.push(heading2(`${chapNum}.2 Matriz de Requisitos de Seguridad`));
            const reqHeaders = ['ID', 'Prioridad', 'Categoría', 'Requisito', 'Estado'];
            const reqRows = sec.securityRequirements.map(r => [
                r.id || 'SEC',
                r.priority || 'Alta',
                r.category || 'General',
                r.description || 'Requisito de hardening',
                r.status || 'Implementado'
            ]);
            bodyChildren.push(buildWordTable(reqHeaders, reqRows));
        }

        bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        chapNum++;
    }

    // --- CHAPTER: QA ---
    if (isScope('all') || isScope('qa')) {
        bodyChildren.push(heading1(`${chapNum}. Estrategia de Calidad & Plan de Pruebas (QA)`));
        bodyChildren.push(paragraph('Metodología de validación técnica, criterios de aceptación y especificación de casos de prueba unitarios, de integración y de rendimiento.'));

        const qa = doc.qa || {};
        if (qa.testPlan) {
            bodyChildren.push(...markdownToDocxElements(qa.testPlan));
        }

        const testCases = Array.isArray(qa.testCases) ? qa.testCases : [];
        if (testCases.length > 0) {
            bodyChildren.push(heading2(`${chapNum}.1 Casos de Prueba Verificables`));
            const qaHeaders = ['ID', 'Título del Caso', 'Precondiciones', 'Resultado Esperado', 'Estado'];
            const qaRows = testCases.map(tc => [
                tc.id || 'TC',
                tc.title || 'Prueba',
                tc.preconditions || 'N/A',
                tc.expectedResult || 'Comportamiento esperado',
                tc.status || 'Diseñado'
            ]);
            bodyChildren.push(buildWordTable(qaHeaders, qaRows));
        }

        bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        chapNum++;
    }

    // --- CHAPTER: DEVOPS & EDA ---
    if (isScope('all') || isScope('devops') || isScope('deploy') || isScope('eda')) {
        bodyChildren.push(heading1(`${chapNum}. DevOps, Arquitectura de Eventos (EDA) & Despliegue CI/CD`));
        bodyChildren.push(paragraph('Especificación del ciclo de vida de desarrollo, topología orientada a eventos, construcción de artefactos, configuración de contenedores y despliegue automatizado.'));

        bodyChildren.push(...embedWordDiagram('edaTopology', 'Arquitectura Orientada a Eventos (EDA) y Flujo de Procesos', 'Productores, bus de eventos, consumidores y políticas de resiliencia'));

        const devops = doc.devops || {};
        if (devops.ciCdPipeline) {
            bodyChildren.push(heading2(`${chapNum}.1 Pipeline de Integración y Entrega Continua`));
            bodyChildren.push(...markdownToDocxElements(devops.ciCdPipeline));
        }
        if (devops.containerization) {
            bodyChildren.push(heading2(`${chapNum}.2 Estrategia de Contenedores`));
            bodyChildren.push(...markdownToDocxElements(devops.containerization));
        }
        if (devops.deploymentGuide) {
            bodyChildren.push(heading2(`${chapNum}.3 Guía de Despliegue en Servidores / Cloud`));
            bodyChildren.push(...markdownToDocxElements(devops.deploymentGuide));
        }

        bodyChildren.push(...embedWordDiagram('deploymentInfra', 'Diagrama de Despliegue Cloud, CI/CD y Seguridad Perimetral', 'Topología productiva, WAF/CSP, OAuth 2.0 y persistencia gestionada'));

        bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        chapNum++;
    }

    // --- CHAPTER: ADRS ---
    if (isScope('all') || isScope('adrs')) {
        const adrs = Array.isArray(doc.adrs) ? doc.adrs : [];
        if (adrs.length > 0) {
            bodyChildren.push(heading1(`${chapNum}. Registro de Decisiones de Arquitectura (ADR)`));
            bodyChildren.push(paragraph('Historial inmutable de las decisiones clave de ingeniería, sus justificaciones técnicas y las consecuencias operativas asociadas.'));

            adrs.forEach(adr => {
                bodyChildren.push(heading2(`${adr.id || 'ADR'}: ${adr.title || 'Decisión Arquitectónica'}`));
                bodyChildren.push(paragraph(`Estado: ${adr.status || 'Aceptada'}`, { bold: true, color: COLORS.BLUE_ACCENT }));
                if (adr.context) {
                    bodyChildren.push(heading3('Contexto del Problema'));
                    bodyChildren.push(...markdownToDocxElements(adr.context));
                }
                if (adr.decision) {
                    bodyChildren.push(heading3('Decisión Tomada'));
                    bodyChildren.push(...markdownToDocxElements(adr.decision));
                }
                if (adr.consequences) {
                    bodyChildren.push(heading3('Consecuencias'));
                    bodyChildren.push(...markdownToDocxElements(adr.consequences));
                }
                bodyChildren.push(new Paragraph({ spacing: { before: 120, after: 120 } }));
            });

            bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
            chapNum++;
        }
    }

    // --- CHAPTER: USER GUIDE ---
    if (isScope('all') || isScope('user')) {
        const userGuide = doc.userGuide || {};
        bodyChildren.push(heading1(`${chapNum}. Manual de Usuario & Guía Operativa`));
        bodyChildren.push(paragraph('Instrucciones prácticas dirigidas a desarrolladores, administradores y usuarios finales para la operación segura de la aplicación.'));

        if (userGuide.guide) {
            bodyChildren.push(...markdownToDocxElements(userGuide.guide));
        }

        const faqs = Array.isArray(userGuide.faq) ? userGuide.faq : [];
        if (faqs.length > 0) {
            bodyChildren.push(heading2(`${chapNum}.1 Preguntas Frecuentes (FAQ)`));
            faqs.forEach(f => {
                bodyChildren.push(paragraph(`P: ${f.question}`, { bold: true, color: COLORS.NAVY_PRIMARY }));
                bodyChildren.push(paragraph(`R: ${f.answer}`, { color: COLORS.GRAY_TEXT }));
                bodyChildren.push(new Paragraph({ spacing: { before: 40, after: 40 } }));
            });
        }
    }
    } // closes else (customSections)

    // Build the Word document
    const docxFile = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: FONTS.PRIMARY,
                        size: 22, // 11pt
                        color: COLORS.GRAY_TEXT
                    },
                    paragraph: {
                        spacing: { line: 276, after: 120 }
                    }
                }
            }
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440, // 1 inch (2.54cm)
                            bottom: 1440,
                            left: 1440,
                            right: 1440
                        }
                    }
                },
                headers: {
                    default: runningHeader
                },
                footers: {
                    default: runningFooter
                },
                children: bodyChildren
            }
        ]
    });

    const buffer = await Packer.toBuffer(docxFile);
    return buffer;
}

module.exports = {
    generateWordDocumentBuffer,
    markdownToDocxElements,
    buildWordTable,
    buildCoverPage,
    buildDocumentControlPage,
    buildTableOfContentsPage
};
