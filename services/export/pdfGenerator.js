/**
 * DOCUMIND AI — DIRECT BINARY PDF GENERATOR ENGINE (v3.0)
 * =======================================================
 * Generates real, multi-page A4 PDF documents (%PDF-1.4 binary Buffer)
 * directly on the server from the Unified Document Model without ever
 * invoking browser print dialogs (window.print / Ctrl+P) or requiring
 * fragile headless browser binaries on cloud containers.
 *
 * Features:
 *   - True A4 Page Geometry (595.28 x 841.89 pt) with corporate margins
 *   - Independent Editorial Cover Page + Document Control Table
 *   - Automatic Table of Contents with Section Numbers & Page Numbers
 *   - Running Headers & Footers with "Página X de Y"
 *   - Full Spanish/Latin-1 Typography (/WinAnsiEncoding)
 *   - Multi-Column Auto-Wrapping Technical Tables with Repeating Headers
 *   - Native Vector Diagrams (C4, UML, Sequence, ERD, EDA, Deployment)
 *   - Syntax-Styled Code Blocks & Callout Boxes
 */

const { buildUnifiedDocumentModel } = require('./unifiedDocModel');

const PAGE_W = 595.28; // A4 width in points (210mm)
const PAGE_H = 841.89; // A4 height in points (297mm)
const MARGIN_L = 46;
const MARGIN_R = 46;
const MARGIN_TOP = 58;
const MARGIN_BOTTOM = 54;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

/**
 * Converts a UTF-8 JavaScript string into a PDF literal string using
 * WinAnsiEncoding (Windows-1252 / Latin-1) so all Spanish accents and
 * typographic symbols render cleanly.
 */
function encodePdfText(str) {
    const clean = String(str == null ? '' : str)
        .replace(/\u2014|\u2013/g, '-')
        .replace(/\u2022/g, '\x95') // Bullet in WinAnsi
        .replace(/\u2026/g, '...')
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[^\x20-\x7E\xA0-\xFF\x95]/g, ' ');

    let out = '(';
    for (let i = 0; i < clean.length; i++) {
        const code = clean.charCodeAt(i);
        if (code === 0x28 || code === 0x29 || code === 0x5C) {
            out += '\\' + clean[i];
        } else if (code >= 0x20 && code <= 0x7E) {
            out += clean[i];
        } else if (code <= 0xFF) {
            out += '\\' + code.toString(8).padStart(3, '0');
        } else {
            out += ' ';
        }
    }
    out += ')';
    return out;
}

function hexToPdfRgb(hex) {
    const clean = String(hex || '#0F172A').replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16) || 0;
    const r = (((num >> 16) & 255) / 255).toFixed(3);
    const g = (((num >> 8) & 255) / 255).toFixed(3);
    const b = ((num & 255) / 255).toFixed(3);
    return `${r} ${g} ${b}`;
}

/**
 * Wraps plain text into lines that fit within `maxWidthPt` at `fontSize`.
 */
function wrapPdfText(text, maxWidthPt, fontSize = 9.5) {
    const avgCharWidth = fontSize * 0.51;
    const maxChars = Math.max(10, Math.floor(maxWidthPt / avgCharWidth));
    const paragraphs = String(text == null ? '' : text).split(/\r?\n/);
    const lines = [];

    for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) {
            lines.push('');
            continue;
        }
        const words = trimmed.split(/\s+/);
        let current = '';
        for (const word of words) {
            if (!current) {
                current = word;
            } else if ((current.length + 1 + word.length) <= maxChars) {
                current += ' ' + word;
            } else {
                lines.push(current);
                current = word.length > maxChars ? word.slice(0, maxChars) : word;
            }
        }
        if (current) lines.push(current);
    }
    return lines.length > 0 ? lines : [''];
}

/**
 * Low-level PDF Page Canvas Builder
 */
class PdfDocumentBuilder {
    constructor(metadata) {
        this.metadata = metadata;
        this.pages = [];
        this.currentOps = [];
        this.cursorY = PAGE_H - MARGIN_TOP;
        this.isCoverPage = false;
    }

    startNewPage(isCover = false) {
        if (this.currentOps.length > 0) {
            this.pages.push({ ops: this.currentOps, isCover: this.isCoverPage });
        }
        this.currentOps = [];
        this.isCoverPage = isCover;
        this.cursorY = isCover ? PAGE_H - 36 : PAGE_H - MARGIN_TOP;
    }

    ensureSpace(neededHeightPt) {
        if (this.cursorY - neededHeightPt < MARGIN_BOTTOM) {
            this.startNewPage(false);
            return true;
        }
        return false;
    }

    fillRect(x, yTop, w, h, hexColor) {
        const yBottom = yTop - h;
        this.currentOps.push(`${hexToPdfRgb(hexColor)} rg ${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    }

    strokeRect(x, yTop, w, h, hexColor, lineWidth = 0.8) {
        const yBottom = yTop - h;
        this.currentOps.push(`${lineWidth.toFixed(2)} w ${hexToPdfRgb(hexColor)} RG ${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
    }

    fillAndStrokeRect(x, yTop, w, h, fillHex, strokeHex, lineWidth = 0.8) {
        const yBottom = yTop - h;
        this.currentOps.push(`${lineWidth.toFixed(2)} w ${hexToPdfRgb(fillHex)} rg ${hexToPdfRgb(strokeHex)} RG ${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`);
    }

    drawLine(x1, y1, x2, y2, hexColor = '#CBD5E1', lineWidth = 0.8) {
        this.currentOps.push(`${lineWidth.toFixed(2)} w ${hexToPdfRgb(hexColor)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    }

    /**
     * Fonts: /F1 = Helvetica, /F2 = Helvetica-Bold, /F3 = Courier
     */
    drawText(text, x, yBaseline, options = {}) {
        const font = options.font || 'F1';
        const size = options.size || 9.5;
        const color = options.color || '#0F172A';
        const align = options.align || 'left';
        const cleanStr = String(text == null ? '' : text);

        let drawX = x;
        if (align === 'center') {
            drawX = x - (cleanStr.length * size * 0.25);
        } else if (align === 'right') {
            drawX = x - (cleanStr.length * size * 0.50);
        }

        this.currentOps.push(
            `BT /${font} ${size.toFixed(1)} Tf ${hexToPdfRgb(color)} rg ${drawX.toFixed(2)} ${yBaseline.toFixed(2)} Td ${encodePdfText(cleanStr)} Tj ET`
        );
    }

    /**
     * Renders a vector diagram directly onto the PDF page canvas.
     */
    drawVectorDiagram(diagram) {
        const boxH = 225;
        this.ensureSpace(boxH + 22);

        const topY = this.cursorY;
        const leftX = MARGIN_L;
        const w = CONTENT_W;

        // Outer card & header bar
        this.fillAndStrokeRect(leftX, topY, w, boxH, '#FFFFFF', '#CBD5E1', 1);
        this.fillRect(leftX, topY, w, 30, '#0F172A');

        const headerTitle = `${diagram.figureNumber || 'Figura'}: ${diagram.title || 'Diagrama de Arquitectura'}`;
        this.drawText(headerTitle.slice(0, 78), leftX + 10, topY - 13, { font: 'F2', size: 9, color: '#FFFFFF' });
        this.drawText((diagram.description || '').slice(0, 96), leftX + 10, topY - 24, { font: 'F1', size: 7.5, color: '#94A3B8' });
        this.drawText((diagram.standard || 'C4 / UML').slice(0, 22), leftX + w - 10, topY - 18, { font: 'F2', size: 7.5, color: '#38BDF8', align: 'right' });

        const bodyTop = topY - 36;
        const bodyH = boxH - 56;

        if (Array.isArray(diagram.layers) && diagram.layers.length > 0) {
            const layers = diagram.layers.slice(0, 3);
            const lH = bodyH / layers.length;
            const nodeCoords = new Map();

            layers.forEach((layer, lIdx) => {
                const ly = bodyTop - lIdx * lH;
                this.fillAndStrokeRect(leftX + 8, ly, w - 16, lH - 4, lIdx % 2 === 0 ? '#F8FAFC' : '#F1F5F9', '#E2E8F0', 0.6);
                this.drawText((layer.title || `CAPA ${lIdx + 1}`).toUpperCase().slice(0, 48), leftX + 14, ly - 9, { font: 'F2', size: 6.5, color: '#64748B' });

                const nodes = (layer.nodes || []).slice(0, 4);
                const slotW = (w - 28) / Math.max(nodes.length, 1);
                const nw = Math.min(126, slotW - 10);
                const nh = Math.min(34, lH - 15);

                nodes.forEach((n, nIdx) => {
                    const cx = leftX + 14 + nIdx * slotW + slotW / 2;
                    const nx = cx - nw / 2;
                    const ny = ly - 12;
                    const accent = n.color || '#0284C7';

                    this.fillAndStrokeRect(nx, ny, nw, nh, '#FFFFFF', accent, 1.1);
                    this.fillRect(nx, ny, nw, 9, accent);
                    this.drawText((n.stereotype || 'MODULE').slice(0, 20), cx, ny - 6.8, { font: 'F2', size: 5.8, color: '#FFFFFF', align: 'center' });
                    this.drawText((n.label || n.id).slice(0, 22), cx, ny - 18, { font: 'F2', size: 7.2, color: '#0F172A', align: 'center' });
                    this.drawText((n.subtitle || '').slice(0, 25), cx, ny - 27, { font: 'F1', size: 6.2, color: '#475569', align: 'center' });

                    nodeCoords.set(n.id, { cx, topY: ny, bottomY: ny - nh });
                });
            });

            (diagram.edges || []).forEach(e => {
                const s = nodeCoords.get(e.from);
                const t = nodeCoords.get(e.to);
                if (!s || !t) return;
                this.drawLine(s.cx, s.bottomY, t.cx, t.topY, '#475569', 0.9);
            });
        } else if (Array.isArray(diagram.participants) && diagram.participants.length > 0) {
            const parts = diagram.participants.slice(0, 5);
            const slotW = (w - 20) / parts.length;
            const pMap = new Map();

            parts.forEach((p, idx) => {
                const cx = leftX + 10 + idx * slotW + slotW / 2;
                pMap.set(p.id, cx);
                const pw = Math.min(92, slotW - 8);
                const accent = p.color || '#0284C7';
                this.fillAndStrokeRect(cx - pw / 2, bodyTop - 4, pw, 24, '#FFFFFF', accent, 1);
                this.fillRect(cx - pw / 2, bodyTop - 4, pw, 8, accent);
                this.drawText((p.stereotype || 'ACTOR').slice(0, 14), cx, bodyTop - 10, { font: 'F2', size: 5.5, color: '#FFFFFF', align: 'center' });
                this.drawText((p.label || '').slice(0, 16), cx, bodyTop - 21, { font: 'F2', size: 7, color: '#0F172A', align: 'center' });
                this.drawLine(cx, bodyTop - 28, cx, topY - boxH + 22, '#CBD5E1', 0.7);
            });

            (diagram.messages || []).slice(0, 7).forEach((m, idx) => {
                const x1 = pMap.get(m.from);
                const x2 = pMap.get(m.to);
                if (x1 == null || x2 == null) return;
                const my = bodyTop - 42 - idx * 18;
                this.drawLine(x1, my, x2, my, m.type === 'return' ? '#059669' : '#0F172A', 1);
                this.drawText(`${idx + 1}. ${(m.label || '').slice(0, 42)}`, (x1 + x2) / 2, my + 3, { font: 'F1', size: 6.5, color: '#0F172A', align: 'center' });
            });
        } else if (Array.isArray(diagram.entities) && diagram.entities.length > 0) {
            const ents = diagram.entities.slice(0, 3);
            const slotW = (w - 24) / Math.max(ents.length, 1);
            ents.forEach((ent, idx) => {
                const cx = leftX + 12 + idx * slotW + slotW / 2;
                const ew = Math.min(150, slotW - 10);
                const eh = bodyH - 12;
                const ex = cx - ew / 2;
                const ey = bodyTop - 6;
                const accent = ent.color || '#4F46E5';
                this.fillAndStrokeRect(ex, ey, ew, eh, '#FFFFFF', accent, 1);
                this.fillRect(ex, ey, ew, 16, accent);
                this.drawText((ent.name || 'ENTITY').slice(0, 22), cx, ey - 11, { font: 'F2', size: 7.5, color: '#FFFFFF', align: 'center' });
                (ent.attributes || []).slice(0, 5).forEach((attr, aIdx) => {
                    const ay = ey - 28 - aIdx * 18;
                    this.drawText(`${attr.key || 'COL'} ${attr.name || ''}`.slice(0, 18), ex + 6, ay, { font: 'F3', size: 6.5, color: '#0F172A' });
                    this.drawText((attr.type || 'VARCHAR').slice(0, 10), ex + ew - 6, ay, { font: 'F3', size: 6.2, color: '#64748B', align: 'right' });
                });
            });
        }

        // Caption bar at bottom of diagram card
        const footerY = topY - boxH + 16;
        this.fillRect(leftX + 2, footerY, w - 4, 15, '#F8FAFC');
        this.drawText(
            `${diagram.figureNumber || 'Figura'}: ${diagram.title} — Generado automáticamente desde el Modelo Documental Unificado.`,
            leftX + 10,
            footerY - 10,
            { font: 'F1', size: 7, color: '#475569' }
        );

        this.cursorY = topY - boxH - 14;
    }

    /**
     * Renders a multi-column technical table with repeating header on page breaks.
     */
    drawTable(table) {
        if (!table || !Array.isArray(table.headers) || table.headers.length === 0) return;

        this.ensureSpace(64);
        if (table.title) {
            this.drawText(table.title, MARGIN_L, this.cursorY - 10, { font: 'F2', size: 9, color: '#0F172A' });
            this.cursorY -= 16;
        }

        const colCount = table.headers.length;
        const colW = CONTENT_W / colCount;
        const fontSize = 8;
        const lineHeight = 10.5;

        const renderHeaderRow = () => {
            const hHeight = 20;
            this.fillAndStrokeRect(MARGIN_L, this.cursorY, CONTENT_W, hHeight, '#0F172A', '#0F172A', 0.8);
            table.headers.forEach((hText, cIdx) => {
                const cx = MARGIN_L + cIdx * colW + 5;
                this.drawText(String(hText || '').slice(0, Math.floor(colW / 4.4)), cx, this.cursorY - 13, {
                    font: 'F2',
                    size: 7.8,
                    color: '#FFFFFF'
                });
            });
            this.cursorY -= hHeight;
        };

        renderHeaderRow();

        (table.rows || []).forEach((row, rIdx) => {
            const cellLines = row.map(cell => wrapPdfText(String(cell == null ? '' : cell), colW - 10, fontSize).slice(0, 4));
            const maxLines = Math.max(1, ...cellLines.map(l => l.length));
            const rowH = maxLines * lineHeight + 8;

            if (this.cursorY - rowH < MARGIN_BOTTOM) {
                this.startNewPage(false);
                renderHeaderRow();
            }

            const rowFill = rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
            this.fillAndStrokeRect(MARGIN_L, this.cursorY, CONTENT_W, rowH, rowFill, '#CBD5E1', 0.5);

            cellLines.forEach((lines, cIdx) => {
                const cellX = MARGIN_L + cIdx * colW;
                if (cIdx > 0) {
                    this.drawLine(cellX, this.cursorY, cellX, this.cursorY - rowH, '#E2E8F0', 0.5);
                }
                lines.forEach((ln, lIdx) => {
                    this.drawText(ln, cellX + 5, this.cursorY - 11 - lIdx * lineHeight, {
                        font: cIdx === 0 ? 'F2' : 'F1',
                        size: fontSize,
                        color: '#1E293B'
                    });
                });
            });

            this.cursorY -= rowH;
        });

        this.cursorY -= 12;
    }

    /**
     * Renders markdown-formatted narrative blocks (headings, bullets, paragraphs).
     */
    drawMarkdownNarrative(markdownText) {
        const blocks = String(markdownText || '').split(/\r?\n/);
        for (const rawLine of blocks) {
            const line = rawLine.trim();
            if (!line) {
                this.cursorY -= 5;
                continue;
            }
            // Skip markdown table rows if they were already structured or parse simple ones
            if (line.startsWith('|') && line.includes('|---')) continue;

            if (line.startsWith('### ')) {
                this.ensureSpace(28);
                this.cursorY -= 6;
                const cleanH3 = line.replace(/^###\s+/, '').replace(/\*\*/g, '');
                this.drawText(cleanH3, MARGIN_L, this.cursorY - 10, { font: 'F2', size: 10.5, color: '#0284C7' });
                this.cursorY -= 18;
            } else if (line.startsWith('## ')) {
                this.ensureSpace(32);
                this.cursorY -= 8;
                const cleanH2 = line.replace(/^##\s+/, '').replace(/\*\*/g, '');
                this.drawText(cleanH2, MARGIN_L, this.cursorY - 11, { font: 'F2', size: 11.5, color: '#0F172A' });
                this.cursorY -= 20;
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                const cleanBullet = '• ' + line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').replace(/`/g, '');
                const wrapped = wrapPdfText(cleanBullet, CONTENT_W - 14, 9.2);
                this.ensureSpace(wrapped.length * 12 + 4);
                wrapped.forEach((wLine, idx) => {
                    this.drawText(wLine, MARGIN_L + (idx === 0 ? 6 : 14), this.cursorY - 10, {
                        font: 'F1',
                        size: 9.2,
                        color: '#1E293B'
                    });
                    this.cursorY -= 12.5;
                });
            } else {
                const cleanPara = line.replace(/\*\*/g, '').replace(/`/g, '');
                const wrapped = wrapPdfText(cleanPara, CONTENT_W, 9.3);
                this.ensureSpace(wrapped.length * 12.5 + 4);
                wrapped.forEach(wLine => {
                    this.drawText(wLine, MARGIN_L, this.cursorY - 10, {
                        font: 'F1',
                        size: 9.3,
                        color: '#1E293B'
                    });
                    this.cursorY -= 12.5;
                });
            }
        }
        this.cursorY -= 6;
    }

    /**
     * Compiles all pages into a valid binary %PDF-1.4 Buffer.
     */
    toBuffer() {
        if (this.currentOps.length > 0) {
            this.pages.push({ ops: this.currentOps, isCover: this.isCoverPage });
            this.currentOps = [];
        }

        const totalPages = this.pages.length;

        // Add running headers & footers to non-cover pages
        this.pages.forEach((page, idx) => {
            const pageNum = idx + 1;
            if (page.isCover) return;

            const headerY = PAGE_H - 32;
            const footerY = 28;
            const hfOps = [];

            // Header line and text
            hfOps.push(`0.60 w ${hexToPdfRgb('#CBD5E1')} RG ${MARGIN_L} ${(headerY - 6).toFixed(2)} m ${(PAGE_W - MARGIN_R).toFixed(2)} ${(headerY - 6).toFixed(2)} l S`);
            hfOps.push(`BT /F2 7.5 Tf ${hexToPdfRgb('#475569')} rg ${MARGIN_L} ${headerY.toFixed(2)} Td ${encodePdfText(`DOCUMIND AI | ${this.metadata.projectName.toUpperCase()} — ${this.metadata.docCode}`)} Tj ET`);
            hfOps.push(`BT /F1 7.5 Tf ${hexToPdfRgb('#64748B')} rg ${(PAGE_W - MARGIN_R - 145).toFixed(2)} ${headerY.toFixed(2)} Td ${encodePdfText(`Versión ${this.metadata.version}`)} Tj ET`);

            // Footer line and page numbering
            hfOps.push(`0.60 w ${hexToPdfRgb('#CBD5E1')} RG ${MARGIN_L} ${(footerY + 11).toFixed(2)} m ${(PAGE_W - MARGIN_R).toFixed(2)} ${(footerY + 11).toFixed(2)} l S`);
            hfOps.push(`BT /F1 7.5 Tf ${hexToPdfRgb('#64748B')} rg ${MARGIN_L} ${footerY.toFixed(2)} Td ${encodePdfText(`Entregable Técnico Verificado • ${this.metadata.date}`)} Tj ET`);
            hfOps.push(`BT /F2 8.0 Tf ${hexToPdfRgb('#0F172A')} rg ${(PAGE_W - MARGIN_R - 68).toFixed(2)} ${footerY.toFixed(2)} Td ${encodePdfText(`Página ${pageNum} de ${totalPages}`)} Tj ET`);

            page.ops.push(...hfOps);
        });

        // Object allocation:
        // 1: Catalog
        // 2: Pages
        // 3: Font F1 (Helvetica)
        // 4: Font F2 (Helvetica-Bold)
        // 5: Font F3 (Courier)
        // 6..: Page and Content Stream pairs
        const objects = [];
        const addObj = (body) => {
            objects.push(body);
            return objects.length;
        };

        addObj('<< /Type /Catalog /Pages 2 0 R >>'); // 1
        addObj(''); // 2 placeholder for Pages
        addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); // 3
        addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'); // 4
        addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'); // 5

        const pageObjIds = [];
        for (const page of this.pages) {
            const streamContent = page.ops.join('\n');
            const streamByteLen = Buffer.byteLength(streamContent, 'binary');
            const contentObjId = addObj(`<< /Length ${streamByteLen} >>\nstream\n${streamContent}\nendstream`);
            const pageObjId = addObj(
                `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] ` +
                `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentObjId} 0 R >>`
            );
            pageObjIds.push(pageObjId);
        }

        objects[1] = `<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`;

        // Serialize PDF with XREF table
        let pdfOut = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
        const offsets = [0];
        for (let i = 0; i < objects.length; i++) {
            offsets.push(Buffer.byteLength(pdfOut, 'binary'));
            pdfOut += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
        }

        const xrefOffset = Buffer.byteLength(pdfOut, 'binary');
        pdfOut += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
        for (let i = 1; i <= objects.length; i++) {
            pdfOut += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
        }
        pdfOut += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

        return Buffer.from(pdfOut, 'binary');
    }
}

/**
 * Generates a complete, downloadable A4 PDF Buffer from `analysisData` and `scope`.
 */
async function generatePdfDocumentBuffer(analysisData = {}, scope = 'all') {
    const model = analysisData.metadata && analysisData.sections
        ? analysisData
        : buildUnifiedDocumentModel(analysisData, scope);

    const { metadata, documentControl, toc, sections } = model;
    const pdf = new PdfDocumentBuilder(metadata);

    // =========================================================================
    // PAGE 1: INDEPENDENT CORPORATE COVER PAGE & DOCUMENT CONTROL
    // =========================================================================
    pdf.startNewPage(true);

    // Top Navy Banner
    pdf.fillRect(0, PAGE_H, PAGE_W, 250, '#0F172A');
    pdf.fillRect(0, PAGE_H - 250, PAGE_W, 5, '#0284C7');

    // Badge
    pdf.fillAndStrokeRect(MARGIN_L, PAGE_H - 42, 230, 22, '#1E293B', '#38BDF8', 1);
    pdf.drawText(`CÓDIGO: ${metadata.docCode} | ${metadata.version}`, MARGIN_L + 10, PAGE_H - 56, {
        font: 'F2',
        size: 8.5,
        color: '#38BDF8'
    });

    // Project Name & Document Title
    pdf.drawText(metadata.projectName.toUpperCase(), MARGIN_L, PAGE_H - 96, {
        font: 'F2',
        size: 22,
        color: '#FFFFFF'
    });

    const titleLines = wrapPdfText(metadata.documentTitle, CONTENT_W, 14);
    titleLines.slice(0, 3).forEach((ln, idx) => {
        pdf.drawText(ln, MARGIN_L, PAGE_H - 126 - idx * 19, {
            font: 'F2',
            size: 13.5,
            color: '#E2E8F0'
        });
    });

    const subLines = wrapPdfText(metadata.subtitle, CONTENT_W, 9.5);
    subLines.slice(0, 2).forEach((ln, idx) => {
        pdf.drawText(ln, MARGIN_L, PAGE_H - 190 - idx * 14, {
            font: 'F1',
            size: 9.5,
            color: '#94A3B8'
        });
    });

    // Metadata Card on Cover Page
    pdf.cursorY = PAGE_H - 285;
    pdf.drawTable({
        title: 'FICHA TÉCNICA Y METADATOS DEL ENTREGABLE',
        headers: ['Atributo de Control', 'Valor Verificado'],
        rows: [
            ['Proyecto / Repositorio', `${metadata.fullName} (Rama: ${metadata.branch})`],
            ['Código del Documento', metadata.docCode],
            ['Versión y Fecha de Emisión', `${metadata.version} — ${metadata.date}`],
            ['Autor / Generador', `${metadata.author} (${metadata.organization})`],
            ['Estándares Normativos', metadata.standard],
            ['Stack Tecnológico Detectado', metadata.detectedTechnologies.join(', ')],
            ['Calificación SAST / Calidad', `Seguridad: ${metadata.securityScore}/100 (Grado ${metadata.securityGrade}) | Calidad Documental: ${metadata.qualityScore}% (${metadata.qualityGrade})`]
        ]
    });

    // Revision History Table on Cover Page
    pdf.drawTable({
        title: 'HISTORIAL DE REVISIONES Y CONTROL DE CAMBIOS',
        headers: ['Versión', 'Fecha', 'Responsable / Motor', 'Descripción de la Revisión'],
        rows: documentControl.revisionHistory.map(r => [r.version, r.date, r.author, r.description])
    });

    // =========================================================================
    // PAGE 2: AUTOMATIC TABLE OF CONTENTS (ÍNDICE GENERAL)
    // =========================================================================
    pdf.startNewPage(false);
    pdf.fillRect(MARGIN_L, pdf.cursorY, CONTENT_W, 28, '#0F172A');
    pdf.drawText('TABLA DE CONTENIDO AUTOMÁTICA', MARGIN_L + 12, pdf.cursorY - 18, {
        font: 'F2',
        size: 11,
        color: '#FFFFFF'
    });
    pdf.cursorY -= 42;

    toc.forEach((item) => {
        pdf.ensureSpace(24);
        pdf.drawText(`${item.number}. ${item.title}`, MARGIN_L + 4, pdf.cursorY - 10, {
            font: 'F2',
            size: 9.8,
            color: '#0F172A'
        });
        pdf.drawText(`Pág. ${item.pageEstimate}`, PAGE_W - MARGIN_R - 8, pdf.cursorY - 10, {
            font: 'F2',
            size: 9,
            color: '#0284C7',
            align: 'right'
        });
        pdf.drawLine(MARGIN_L + 4, pdf.cursorY - 14, PAGE_W - MARGIN_R, pdf.cursorY - 14, '#E2E8F0', 0.5);
        pdf.cursorY -= 20;

        (item.subItems || []).forEach(sub => {
            pdf.ensureSpace(16);
            pdf.drawText(`${sub.number}  ${sub.title}`, MARGIN_L + 22, pdf.cursorY - 9, {
                font: 'F1',
                size: 8.6,
                color: '#475569'
            });
            pdf.cursorY -= 14;
        });
    });

    // =========================================================================
    // CONTENT CHAPTERS (SECTIONS, DIAGRAMS, TABLES, CALLOUTS, CODE)
    // =========================================================================
    sections.forEach((sec) => {
        pdf.startNewPage(false);

        // Chapter Header Banner
        pdf.fillAndStrokeRect(MARGIN_L, pdf.cursorY, CONTENT_W, 38, '#F8FAFC', '#CBD5E1', 0.9);
        pdf.fillRect(MARGIN_L, pdf.cursorY, 5, 38, '#0284C7');
        pdf.drawText(`${sec.number}. ${sec.title.toUpperCase()}`, MARGIN_L + 14, pdf.cursorY - 15, {
            font: 'F2',
            size: 11.5,
            color: '#0F172A'
        });
        pdf.drawText(`Estándar: ${sec.standardRef || metadata.standard}`, MARGIN_L + 14, pdf.cursorY - 29, {
            font: 'F1',
            size: 8,
            color: '#64748B'
        });
        pdf.cursorY -= 50;

        // Narrative content
        if (sec.contentMarkdown) {
            pdf.drawMarkdownNarrative(sec.contentMarkdown);
        }

        // Callout boxes
        (sec.callouts || []).forEach(c => {
            const lines = wrapPdfText(c.text, CONTENT_W - 24, 8.8);
            const ch = lines.length * 12 + 24;
            pdf.ensureSpace(ch + 10);
            pdf.fillAndStrokeRect(MARGIN_L, pdf.cursorY, CONTENT_W, ch, '#F0F9FF', '#0284C7', 0.8);
            pdf.drawText(c.title || 'Nota Técnica', MARGIN_L + 10, pdf.cursorY - 12, { font: 'F2', size: 8.8, color: '#0369A1' });
            lines.forEach((ln, idx) => {
                pdf.drawText(ln, MARGIN_L + 10, pdf.cursorY - 25 - idx * 12, { font: 'F1', size: 8.5, color: '#0F172A' });
            });
            pdf.cursorY -= ch + 10;
        });

        // Visual Vector Diagrams
        (sec.diagrams || []).forEach(diag => {
            pdf.drawVectorDiagram(diag);
        });

        // Technical Tables
        (sec.tables || []).forEach(tbl => {
            pdf.drawTable(tbl);
        });

        // Code blocks (only when adding technical value)
        (sec.codeSnippets || []).forEach(snip => {
            const codeLines = String(snip.code || '').split(/\r?\n/).slice(0, 26);
            const boxH = codeLines.length * 10 + 26;
            pdf.ensureSpace(boxH + 12);
            pdf.fillAndStrokeRect(MARGIN_L, pdf.cursorY, CONTENT_W, boxH, '#F8FAFC', '#CBD5E1', 0.7);
            pdf.drawText(`${snip.title || 'Especificación Técnica'} (${snip.language || 'json'})`, MARGIN_L + 8, pdf.cursorY - 12, {
                font: 'F2',
                size: 8,
                color: '#334155'
            });
            codeLines.forEach((cl, idx) => {
                pdf.drawText(cl.slice(0, 92), MARGIN_L + 8, pdf.cursorY - 24 - idx * 10, {
                    font: 'F3',
                    size: 7.2,
                    color: '#0F172A'
                });
            });
            pdf.cursorY -= boxH + 10;
        });
    });

    return pdf.toBuffer();
}

module.exports = {
    generatePdfDocumentBuffer
};
