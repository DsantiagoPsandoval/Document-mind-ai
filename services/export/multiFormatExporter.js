/**
 * DOCUMIND AI — UNIFIED MULTI-FORMAT EXPORT ENGINE (v3.0)
 * =======================================================
 * Consumes the Single Source of Truth (`unifiedDocModel.js`) to generate
 * real, standards-compliant deliverables across all supported formats:
 *   - WORD (.docx)
 *   - PDF (.pdf) — Direct binary file, zero browser print dialog
 *   - HTML (.html) — Standalone multi-page A4 editorial document with SVGs
 *   - MARKDOWN (.md) — Technical Markdown with tables and Mermaid diagrams
 *   - JSON (.json) — Canonical structured schema
 *   - TXT (.txt) — Formatted plain-text engineering report
 */

const { buildUnifiedDocumentModel } = require('./unifiedDocModel');
const { generateWordDocumentBuffer } = require('./docxGenerator');
const { generatePdfDocumentBuffer } = require('./pdfGenerator');

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderNarrativeHtml(mdText) {
    const lines = String(mdText || '').split(/\r?\n/);
    const out = [];
    let inList = false;

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) {
            if (inList) { out.push('</ul>'); inList = false; }
            continue;
        }
        if (line.startsWith('|')) continue; // Tables rendered via structured table registry
        if (line.startsWith('### ')) {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push(`<h3>${escapeHtml(line.replace(/^###\s+/, '').replace(/\*\*/g, ''))}</h3>`);
        } else if (line.startsWith('## ')) {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push(`<h3>${escapeHtml(line.replace(/^##\s+/, '').replace(/\*\*/g, ''))}</h3>`);
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            if (!inList) { out.push('<ul>'); inList = true; }
            const itemHtml = escapeHtml(line.replace(/^[-*]\s+/, ''))
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/`([^`]+)`/g, '<code>$1</code>');
            out.push(`<li>${itemHtml}</li>`);
        } else {
            if (inList) { out.push('</ul>'); inList = false; }
            const pHtml = escapeHtml(line)
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/`([^`]+)`/g, '<code>$1</code>');
            out.push(`<p>${pHtml}</p>`);
        }
    }
    if (inList) out.push('</ul>');
    return out.join('\n');
}

/**
 * Generates a standalone, multi-page A4 Editorial HTML document with embedded SVG diagrams.
 */
function generateHtmlDocument(analysisData = {}, scope = 'all') {
    const model = buildUnifiedDocumentModel(analysisData, scope);
    const { metadata, documentControl, toc, sections } = model;
    const totalPages = sections.length + 1;

    const tocHtml = toc.map(item => `
        <div class="toc-row">
            <a href="#${escapeHtml(item.id)}" class="toc-link">
                <span class="toc-num">${escapeHtml(item.number)}.</span>
                <span class="toc-title">${escapeHtml(item.title)}</span>
            </a>
            <span class="toc-dots"></span>
            <span class="toc-page">Pág. ${item.pageEstimate}</span>
        </div>
    `).join('\n');

    const pagesHtml = sections.map((sec, idx) => {
        const pageNum = idx + 2;
        const tablesHtml = (sec.tables || []).map(tbl => `
            <div class="doc-table-wrap">
                ${tbl.title ? `<div class="doc-table-caption">${escapeHtml(tbl.title)}</div>` : ''}
                <table class="doc-table">
                    <thead>
                        <tr>${tbl.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${(tbl.rows || []).map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `).join('\n');

        const diagramsHtml = (sec.diagrams || []).map(d => `
            <figure class="doc-figure" id="${escapeHtml(d.id)}">
                <div class="doc-svg-canvas">${d.svg || ''}</div>
                <figcaption class="doc-figcaption">
                    <strong>${escapeHtml(d.figureNumber)}: ${escapeHtml(d.title)}</strong> — ${escapeHtml(d.description || '')}
                </figcaption>
            </figure>
        `).join('\n');

        const calloutsHtml = (sec.callouts || []).map(c => `
            <div class="doc-callout">
                <div class="doc-callout-title">${escapeHtml(c.title || 'Nota Técnica')}</div>
                <div class="doc-callout-body">${escapeHtml(c.text || '')}</div>
            </div>
        `).join('\n');

        const codeHtml = (sec.codeSnippets || []).map(snip => `
            <div class="doc-code-card">
                <div class="doc-code-head">${escapeHtml(snip.title || 'Código')} <span>${escapeHtml(snip.language || 'json')}</span></div>
                <pre><code>${escapeHtml(snip.code || '')}</code></pre>
            </div>
        `).join('\n');

        return `
        <section class="a4-sheet" id="${escapeHtml(sec.id)}">
            <header class="a4-running-header">
                <span>DOCUMIND AI • ${escapeHtml(metadata.projectName.toUpperCase())}</span>
                <span>${escapeHtml(metadata.docCode)} | ${escapeHtml(metadata.version)}</span>
            </header>
            <div class="a4-sheet-body">
                <div class="chapter-banner">
                    <div class="chapter-num">CAPÍTULO ${escapeHtml(sec.number)} • ${escapeHtml(sec.standardRef || metadata.standard)}</div>
                    <h2 class="chapter-title">${escapeHtml(sec.number)}. ${escapeHtml(sec.title)}</h2>
                    ${sec.summary ? `<p class="chapter-lead">${escapeHtml(sec.summary)}</p>` : ''}
                </div>
                ${renderNarrativeHtml(sec.contentMarkdown)}
                ${calloutsHtml}
                ${diagramsHtml}
                ${tablesHtml}
                ${codeHtml}
            </div>
            <footer class="a4-running-footer">
                <span>Entregable Técnico Verificado • ${escapeHtml(metadata.date)}</span>
                <strong>Página ${pageNum} de ${totalPages}</strong>
            </footer>
        </section>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(metadata.projectName)} — ${escapeHtml(metadata.documentTitle)}</title>
    <style>
        :root {
            --navy: #0F172A;
            --slate: #334155;
            --muted: #64748B;
            --blue: #0284C7;
            --border: #CBD5E1;
            --bg-workspace: #E2E8F0;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 28px 16px;
            background: var(--bg-workspace);
            color: var(--navy);
            font-family: "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.6;
        }
        .a4-sheet {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto 24px auto;
            background: #FFFFFF;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.14);
            border: 1px solid #CBD5E1;
            padding: 16mm 18mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
        }
        .a4-running-header {
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
            font-weight: 700;
            color: var(--muted);
            border-bottom: 1px solid var(--border);
            padding-bottom: 6px;
            margin-bottom: 16px;
        }
        .a4-running-footer {
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
            color: var(--muted);
            border-top: 1px solid var(--border);
            padding-top: 8px;
            margin-top: 20px;
        }
        .a4-sheet-body { flex: 1; }
        .cover-hero {
            background: var(--navy);
            color: #FFFFFF;
            padding: 28px 26px;
            border-radius: 8px;
            border-bottom: 5px solid var(--blue);
            margin-bottom: 22px;
        }
        .cover-badge {
            display: inline-block;
            font-family: Consolas, monospace;
            font-size: 8.5pt;
            color: #38BDF8;
            background: #1E293B;
            border: 1px solid #38BDF8;
            padding: 3px 10px;
            border-radius: 999px;
            margin-bottom: 12px;
        }
        .cover-project { font-size: 22pt; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.02em; }
        .cover-title { font-size: 13.5pt; font-weight: 600; color: #E2E8F0; margin: 0 0 8px 0; }
        .cover-sub { font-size: 9.5pt; color: #94A3B8; margin: 0; }
        .chapter-banner {
            background: #F8FAFC;
            border: 1px solid var(--border);
            border-left: 5px solid var(--blue);
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 16px;
        }
        .chapter-num { font-size: 7.8pt; font-weight: 700; color: var(--blue); text-transform: uppercase; letter-spacing: 0.05em; }
        .chapter-title { font-size: 14pt; font-weight: 800; margin: 4px 0; color: var(--navy); }
        .chapter-lead { font-size: 9.2pt; color: var(--slate); margin: 4px 0 0 0; }
        h3 { font-size: 11pt; font-weight: 700; color: var(--navy); margin: 16px 0 6px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px; }
        p { margin: 0 0 10px 0; text-align: justify; color: #1E293B; }
        ul { margin: 0 0 12px 0; padding-left: 20px; }
        li { margin-bottom: 4px; color: #1E293B; }
        code { font-family: Consolas, monospace; font-size: 8.5pt; background: #F1F5F9; padding: 1px 5px; border-radius: 3px; }
        .toc-box {
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 14px 18px;
            background: #F8FAFC;
            margin-top: 16px;
        }
        .toc-row { display: flex; align-items: baseline; margin: 6px 0; font-size: 9.5pt; }
        .toc-link { color: var(--navy); text-decoration: none; font-weight: 600; }
        .toc-link:hover { color: var(--blue); }
        .toc-num { color: var(--blue); font-weight: 800; margin-right: 6px; }
        .toc-dots { flex: 1; border-bottom: 1px dotted #94A3B8; margin: 0 10px; }
        .toc-page { font-weight: 700; color: var(--slate); font-size: 8.5pt; }
        .doc-table-wrap { margin: 14px 0 18px 0; }
        .doc-table-caption { font-size: 8.8pt; font-weight: 700; color: var(--navy); margin-bottom: 5px; }
        .doc-table { width: 100%; border-collapse: collapse; font-size: 8.6pt; table-layout: auto; }
        .doc-table th { background: var(--navy); color: #FFFFFF; text-align: left; padding: 7px 9px; font-size: 8pt; text-transform: uppercase; }
        .doc-table td { border: 1px solid var(--border); padding: 6px 9px; vertical-align: top; color: #1E293B; overflow-wrap: anywhere; }
        .doc-table tbody tr:nth-child(even) { background: #F8FAFC; }
        .doc-figure { margin: 16px 0; border: 1px solid var(--border); border-radius: 8px; padding: 10px; background: #FFFFFF; text-align: center; }
        .doc-svg-canvas svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
        .doc-figcaption { font-size: 8.5pt; color: var(--slate); margin-top: 8px; text-align: left; background: #F8FAFC; padding: 6px 10px; border-radius: 4px; }
        .doc-callout { border-left: 4px solid var(--blue); background: #F0F9FF; padding: 10px 14px; border-radius: 4px; margin: 12px 0; }
        .doc-callout-title { font-weight: 700; font-size: 9pt; color: #0369A1; margin-bottom: 3px; }
        .doc-callout-body { font-size: 8.8pt; color: var(--navy); }
        .doc-code-card { border: 1px solid var(--border); border-radius: 6px; overflow: hidden; margin: 12px 0; }
        .doc-code-head { background: #1E293B; color: #F8FAFC; padding: 6px 12px; font-size: 8pt; font-weight: 700; display: flex; justify-content: space-between; }
        .doc-code-card pre { margin: 0; padding: 10px 12px; background: #F8FAFC; overflow-x: auto; font-size: 8pt; }
        @media (max-width: 860px) {
            body { padding: 8px; }
            .a4-sheet { width: 100%; min-height: auto; padding: 16px; }
        }
        @media print {
            body { background: #FFFFFF; padding: 0; }
            .a4-sheet { box-shadow: none; border: none; margin: 0; page-break-after: always; }
        }
    </style>
</head>
<body>
    <!-- PORTADA Y CONTROL DOCUMENTAL (PÁGINA 1) -->
    <section class="a4-sheet" id="cover-page">
        <div class="a4-sheet-body">
            <div class="cover-hero">
                <div class="cover-badge">${escapeHtml(metadata.docCode)} • ${escapeHtml(metadata.version)}</div>
                <h1 class="cover-project">${escapeHtml(metadata.projectName)}</h1>
                <div class="cover-title">${escapeHtml(metadata.documentTitle)}</div>
                <p class="cover-sub">${escapeHtml(metadata.subtitle)}</p>
            </div>

            <div class="doc-table-wrap">
                <div class="doc-table-caption">CONTROL DOCUMENTAL Y METADATOS DE AUDITORÍA</div>
                <table class="doc-table">
                    <tbody>
                        <tr><td><strong>Proyecto / Repositorio</strong></td><td>${escapeHtml(metadata.fullName)} (Rama: ${escapeHtml(metadata.branch)})</td></tr>
                        <tr><td><strong>Fecha de Emisión</strong></td><td>${escapeHtml(metadata.date)}</td></tr>
                        <tr><td><strong>Autor / Generador</strong></td><td>${escapeHtml(metadata.author)}</td></tr>
                        <tr><td><strong>Estándares Aplicados</strong></td><td>${escapeHtml(metadata.standard)}</td></tr>
                        <tr><td><strong>Stack Verificado</strong></td><td>${escapeHtml(metadata.detectedTechnologies.join(', '))}</td></tr>
                        <tr><td><strong>Métricas de Calidad & Seguridad</strong></td><td>Calidad Editorial: <strong>${metadata.qualityScore}% (${escapeHtml(metadata.qualityGrade)})</strong> • Seguridad SAST: <strong>${metadata.securityScore}/100 (Grado ${escapeHtml(metadata.securityGrade)})</strong></td></tr>
                    </tbody>
                </table>
            </div>

            <div class="doc-table-wrap">
                <div class="doc-table-caption">HISTORIAL DE VERSIONES Y TRAZABILIDAD</div>
                <table class="doc-table">
                    <thead><tr><th>Versión</th><th>Fecha</th><th>Autor</th><th>Descripción</th></tr></thead>
                    <tbody>
                        ${documentControl.revisionHistory.map(r => `<tr><td>${escapeHtml(r.version)}</td><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.author)}</td><td>${escapeHtml(r.description)}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>

            <div class="toc-box">
                <div class="doc-table-caption">TABLA DE CONTENIDO AUTOMÁTICA</div>
                ${tocHtml}
            </div>
        </div>
        <footer class="a4-running-footer">
            <span>${escapeHtml(metadata.organization)} • Documento Controlado</span>
            <strong>Página 1 de ${totalPages}</strong>
        </footer>
    </section>

    ${pagesHtml}
</body>
</html>`;
}

/**
 * Generates clean, structured Technical Markdown (.md) from the Unified Document Model.
 */
function generateMarkdownDocument(analysisData = {}, scope = 'all') {
    const model = buildUnifiedDocumentModel(analysisData, scope);
    const { metadata, toc, sections } = model;
    const lines = [];

    lines.push(`# ${metadata.fullName} — Documentación Técnica de Software`);
    lines.push(`## ${metadata.documentTitle}`);
    lines.push(`> **Código:** \`${metadata.docCode}\` | **Versión:** \`${metadata.version}\` | **Fecha:** ${metadata.date} | **Autor:** ${metadata.author}`);
    lines.push(`> **Stack Detectado:** ${metadata.detectedTechnologies.join(', ')} | **Seguridad SAST:** ${metadata.securityScore}/100 (${metadata.securityGrade}) | **Calidad:** ${metadata.qualityScore}%`);
    lines.push('');
    lines.push('---');
    lines.push('## Tabla de Contenido');
    toc.forEach(item => {
        lines.push(`${item.number}. [${item.title}](#${item.id})`);
    });
    lines.push('');

    sections.forEach(sec => {
        lines.push('---');
        lines.push(`## ${sec.number}. ${sec.title}`);
        lines.push(`*Estándar de referencia: ${sec.standardRef || metadata.standard}*`);
        lines.push('');
        if (sec.contentMarkdown) {
            lines.push(sec.contentMarkdown);
            lines.push('');
        }
        (sec.diagrams || []).forEach(d => {
            lines.push(`### ${d.figureNumber}: ${d.title}`);
            lines.push(`_${d.description}_`);
            lines.push('');
            if (d.mermaid) {
                lines.push('```mermaid');
                lines.push(d.mermaid);
                lines.push('```');
                lines.push('');
            }
        });
        (sec.tables || []).forEach(tbl => {
            if (tbl.title) lines.push(`#### ${tbl.title}`);
            lines.push(`| ${tbl.headers.join(' | ')} |`);
            lines.push(`| ${tbl.headers.map(() => ':---').join(' | ')} |`);
            (tbl.rows || []).forEach(r => {
                lines.push(`| ${r.map(c => String(c == null ? '' : c).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')).join(' | ')} |`);
            });
            lines.push('');
        });
    });

    return lines.join('\n');
}

/**
 * Generates a formatted Plain Text (.txt) engineering deliverable.
 */
function generatePlainTextDocument(analysisData = {}, scope = 'all') {
    const model = buildUnifiedDocumentModel(analysisData, scope);
    const { metadata, toc, sections } = model;
    const hr = '='.repeat(86);
    const subHr = '-'.repeat(86);
    const lines = [];

    lines.push(hr);
    lines.push(`DOCUMIND AI — ENTREGABLE TÉCNICO DE INGENIERÍA DE SOFTWARE`);
    lines.push(hr);
    lines.push(`PROYECTO        : ${metadata.fullName} (Rama: ${metadata.branch})`);
    lines.push(`TÍTULO          : ${metadata.documentTitle}`);
    lines.push(`CÓDIGO / VERSIÓN: ${metadata.docCode} / ${metadata.version}`);
    lines.push(`FECHA EMISIÓN   : ${metadata.date}`);
    lines.push(`AUTOR           : ${metadata.author}`);
    lines.push(`ESTÁNDARES      : ${metadata.standard}`);
    lines.push(`STACK DETECTADO : ${metadata.detectedTechnologies.join(', ')}`);
    lines.push(`SEGURIDAD SAST  : ${metadata.securityScore}/100 (Grado ${metadata.securityGrade}) | CALIDAD: ${metadata.qualityScore}%`);
    lines.push(hr);
    lines.push('');
    lines.push('TABLA DE CONTENIDO');
    lines.push(subHr);
    toc.forEach(item => {
        lines.push(`  ${item.number}. ${item.title} (Pág. est. ${item.pageEstimate})`);
    });
    lines.push('');

    sections.forEach(sec => {
        lines.push(hr);
        lines.push(`${sec.number}. ${sec.title.toUpperCase()}`);
        lines.push(`Estándar: ${sec.standardRef || metadata.standard}`);
        lines.push(subHr);
        if (sec.contentMarkdown) {
            lines.push(sec.contentMarkdown.replace(/[#*`]/g, ''));
            lines.push('');
        }
        (sec.diagrams || []).forEach(d => {
            lines.push(`[${d.figureNumber}: ${d.title}]`);
            lines.push(`  Descripción: ${d.description}`);
            lines.push('');
        });
        (sec.tables || []).forEach(tbl => {
            if (tbl.title) lines.push(`* ${tbl.title}:`);
            lines.push(`  [${tbl.headers.join(' | ')}]`);
            (tbl.rows || []).forEach(r => {
                lines.push(`  - ${r.join(' | ')}`);
            });
            lines.push('');
        });
    });

    lines.push(hr);
    lines.push(`FIN DEL DOCUMENTO — ${metadata.docCode} — GENERADO POR DOCUMIND AI`);
    lines.push(hr);
    return lines.join('\n');
}

/**
 * Generates canonical structured JSON string (.json) without massive raw SVG strings if compact,
 * or full canonical representation.
 */
function generateJsonDocument(analysisData = {}, scope = 'all') {
    const model = buildUnifiedDocumentModel(analysisData, scope);
    return JSON.stringify(model, null, 2);
}

/**
 * Unified export dispatcher returning `{ buffer, contentType, extension, filename }`.
 */
async function exportDocumentByFormat(analysisData = {}, format = 'pdf', scope = 'all') {
    const fmt = String(format || 'pdf').toLowerCase().replace(/^\./, '');
    const model = buildUnifiedDocumentModel(analysisData, scope);
    const safeProject = String(model.metadata.projectName || 'Proyecto')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');
    const scopeSuffix = scope && scope !== 'all' ? `_${scope.toUpperCase()}` : '_Completo';

    if (fmt === 'docx' || fmt === 'word') {
        const buffer = await generateWordDocumentBuffer(analysisData, scope);
        return {
            buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            extension: 'docx',
            filename: `${safeProject}_Documentacion_Tecnica${scopeSuffix}.docx`
        };
    }

    if (fmt === 'pdf') {
        const buffer = await generatePdfDocumentBuffer(model, scope);
        return {
            buffer,
            contentType: 'application/pdf',
            extension: 'pdf',
            filename: `${safeProject}_Documentacion_Tecnica${scopeSuffix}.pdf`
        };
    }

    if (fmt === 'html') {
        const htmlStr = generateHtmlDocument(analysisData, scope);
        return {
            buffer: Buffer.from(htmlStr, 'utf-8'),
            contentType: 'text/html; charset=utf-8',
            extension: 'html',
            filename: `${safeProject}_Documentacion_Tecnica${scopeSuffix}.html`
        };
    }

    if (fmt === 'md' || fmt === 'markdown') {
        const mdStr = generateMarkdownDocument(analysisData, scope);
        return {
            buffer: Buffer.from(mdStr, 'utf-8'),
            contentType: 'text/markdown; charset=utf-8',
            extension: 'md',
            filename: `${safeProject}_Documentacion_Tecnica${scopeSuffix}.md`
        };
    }

    if (fmt === 'json') {
        const jsonStr = generateJsonDocument(analysisData, scope);
        return {
            buffer: Buffer.from(jsonStr, 'utf-8'),
            contentType: 'application/json; charset=utf-8',
            extension: 'json',
            filename: `${safeProject}_Documentacion_Tecnica${scopeSuffix}.json`
        };
    }

    if (fmt === 'txt' || fmt === 'text') {
        const txtStr = generatePlainTextDocument(analysisData, scope);
        return {
            buffer: Buffer.from(txtStr, 'utf-8'),
            contentType: 'text/plain; charset=utf-8',
            extension: 'txt',
            filename: `${safeProject}_Documentacion_Tecnica${scopeSuffix}.txt`
        };
    }

    throw new Error(`Formato de exportación no soportado: ${format}`);
}

module.exports = {
    generateHtmlDocument,
    generateMarkdownDocument,
    generatePlainTextDocument,
    generateJsonDocument,
    exportDocumentByFormat
};
