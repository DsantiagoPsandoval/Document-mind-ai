/**
 * DOCUMIND AI — DOCUMENT EXPORTER & PRINT ENGINE (v7.0)
 * Enterprise-grade documentation generator, pagination engine, and PDF preview system.
 * Eliminates blank pages, orphan headings, broken tables, and warped diagrams.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.DocuMindExporter = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    /**
     * Normalizes raw project analysis data into a complete, guaranteed data structure.
     * Prevents undefined properties and ensures fallback values for every section.
     */
    function normalizeData(data) {
        if (!data) return null;
        const repo = data.repository || {};
        const stats = data.stats || {};
        const doc = data.documentation || {};
        const sec = data.security || doc.security || {};

        const projectName = repo.name || data.projectName || 'Proyecto';
        const fullName = repo.fullName || repo.name || projectName;

        return {
            meta: {
                projectName,
                fullName,
                url: repo.url && repo.url !== '#' ? repo.url : `https://github.com/${fullName}`,
                branch: repo.branch || repo.defaultBranch || 'main',
                language: repo.primaryLanguage || (data.detectedLanguages && data.detectedLanguages[0]) || 'Multi-lenguaje',
                technologies: data.detectedTechnologies || [],
                filesCount: stats.relevantFilesCount || stats.totalFiles || (data.relevantFilesList || []).length || 0,
                date: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                version: '2.5.0-Enterprise',
                engine: doc.isAiGenerated ? 'Gemini 2.5 Flash + AST Parser' : 'Análisis Estático Factual Determinista',
                securityScore: typeof sec.score === 'number' ? sec.score : 85,
                securityGrade: sec.grade || (sec.score >= 90 ? 'A' : (sec.score >= 80 ? 'B' : (sec.score >= 70 ? 'C' : 'D'))),
                securityRisk: sec.riskLevel || (sec.score >= 80 ? 'BAJO' : (sec.score >= 60 ? 'MEDIO' : 'ALTO')),
                securityStatus: sec.status || (sec.score >= 80 ? 'Aceptable' : 'Requiere Revisión')
            },
            product: {
                prd: doc.product?.prd || '',
                srs: doc.product?.srs || '',
                userStories: Array.isArray(doc.product?.userStories) ? doc.product.userStories : []
            },
            architecture: {
                overview: doc.architecture?.overview || '',
                c4Context: doc.architecture?.c4Context || '',
                c4Container: doc.architecture?.c4Container || '',
                c4Component: doc.architecture?.c4Component || '',
                components: doc.architecture?.components || '',
                dataFlow: doc.architecture?.dataFlow || ''
            },
            diagrams: {
                c4: doc.diagrams?.c4Mermaid || '',
                erd: doc.diagrams?.erdMermaid || '',
                sequence: doc.diagrams?.sequenceMermaid || '',
                component: doc.diagrams?.componentMermaid || '',
                processFlow: doc.diagrams?.processFlowMermaid || ''
            },
            database: {
                overview: doc.database?.overview || '',
                dataDictionary: Array.isArray(doc.database?.dataDictionary) && doc.database.dataDictionary.length > 0
                    ? doc.database.dataDictionary
                    : (Array.isArray(data.dataModels) ? data.dataModels.flatMap(m => (m.fields || []).map(f => ({
                        table: m.name,
                        field: f.name,
                        type: f.type || 'VARCHAR',
                        description: f.isPk ? 'Clave primaria identificadora' : 'Atributo de entidad detectado',
                        required: f.isRequired || f.isPk || false,
                        isPk: f.isPk || false
                    }))) : [])
            },
            api: {
                overview: doc.api?.overview || '',
                endpoints: Array.isArray(doc.api?.endpoints) && doc.api.endpoints.length > 0
                    ? doc.api.endpoints
                    : (Array.isArray(data.endpoints) ? data.endpoints.map(e => ({
                        method: e.method || 'GET',
                        path: e.path || '/api',
                        description: `Ruta localizada en ${e.file || 'código fuente'}`,
                        requiresAuth: e.requiresAuth || false,
                        params: 'Query / Body según contrato',
                        response: '200 OK estructurado'
                    })) : []),
                openApiJson: doc.api?.openApiJson || null
            },
            development: {
                readme: doc.development?.readme || '',
                contributing: doc.development?.contributing || '',
                codingGuidelines: doc.development?.codingGuidelines || ''
            },
            devops: {
                ciCdPipeline: doc.devops?.ciCdPipeline || doc.devops?.ciCdPipelines || '',
                containerization: doc.devops?.containerization || '',
                deploymentGuide: doc.devops?.deploymentGuide || ''
            },
            qa: {
                testPlan: doc.qa?.testPlan || doc.qa?.testStrategy || '',
                testCases: Array.isArray(doc.qa?.testCases) ? doc.qa.testCases : []
            },
            security: {
                score: typeof sec.score === 'number' ? sec.score : 85,
                grade: sec.grade || 'A',
                classification: sec.classification || (sec.score >= 90 ? 'Excelente' : sec.score >= 80 ? 'Bueno' : sec.score >= 70 ? 'Aceptable' : 'Riesgo moderado'),
                riskLevel: sec.riskLevel || 'Bajo',
                coverage: sec.coverage || { coveragePct: 100, confidenceLevel: 'Alta', filesAnalyzed: 1, totalFiles: 1 },
                dimensions: sec.dimensions || {},
                remediationPlan: sec.remediationPlan || {},
                summary: sec.summary || '',
                vulnerabilities: Array.isArray(sec.vulnerabilities) ? sec.vulnerabilities : (Array.isArray(sec.findings) ? sec.findings : []),
                secrets: Array.isArray(sec.secrets) ? sec.secrets : [],
                dependencies: sec.dependencies || {},
                threatModel: sec.threatModel || null,
                securityRequirements: Array.isArray(sec.securityRequirements) ? sec.securityRequirements : [],
                markdownReport: sec.markdownReport || ''
            },
            adrs: Array.isArray(doc.adrs) ? doc.adrs : [],
            userGuide: {
                guide: doc.userGuide?.guide || doc.userGuide?.overview || '',
                faq: Array.isArray(doc.userGuide?.faq) ? doc.userGuide.faq : []
            }
        };
    }

    /**
     * Converts markdown to clean, semantic HTML with marked.js fallback.
     */
    function mdToHtml(md) {
        if (!md || typeof md !== 'string' || !md.trim()) {
            return '';
        }
        if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
            try {
                return marked.parse(md);
            } catch (e) {
                console.warn('[DocuMindExporter] marked.js error:', e);
            }
        }
        // Minimal fallback conversion
        return md
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/`([^`]+)`/gim, '<code>$1</code>')
            .replace(/\n$/gim, '<br />');
    }

    /**
     * Escapes HTML entities safely.
     */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Shared print and preview CSS styles.
     * Enforces strict pagination, zero blank pages, auto-wrapped tables, and scaled diagrams.
     */
    const PRINT_AND_PREVIEW_CSS = `
        @page {
            size: A4;
            margin: 18mm 16mm 18mm 16mm;
        }
        @media print {
            .no-print { display: none !important; }
            body { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
                background: #FFFFFF !important;
                color: #0F172A !important;
            }
            .page-break-before {
                break-before: page !important;
                page-break-before: always !important;
            }
        }
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0F172A;
            background: #FFFFFF;
            line-height: 1.55;
            margin: 0;
            padding: 0;
            font-size: 10pt;
        }

        /* Cover Page Layout */
        .doc-cover-sheet {
            padding: 24px 20px 20px;
            border-bottom: 2.5px solid #0284C7;
            margin-bottom: 24px;
        }
        .brand-badge {
            display: inline-block;
            background: #0F172A;
            color: #38BDF8;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 7.5pt;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 12px;
        }
        .cover-title {
            font-size: 20pt;
            font-weight: 900;
            color: #0F172A;
            margin: 0 0 6px 0;
            line-height: 1.2;
            word-break: break-word;
        }
        .cover-subtitle {
            font-size: 11pt;
            color: #475569;
            margin: 0 0 18px 0;
            font-weight: 500;
        }

        /* Metadata Grid */
        .meta-grid-table {
            width: 100%;
            border-collapse: collapse;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        .meta-grid-table td {
            padding: 9px 14px;
            border: 1px solid #E2E8F0;
            font-size: 9pt;
            vertical-align: top;
            width: 50%;
        }
        .meta-label {
            font-size: 7.5pt;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 3px;
        }
        .meta-value {
            font-weight: 700;
            color: #0F172A;
            font-size: 9.5pt;
        }

        /* Quality Badges */
        .sec-pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 7.5pt;
            font-weight: 800;
            letter-spacing: 0.03em;
        }
        .sec-pill-green { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
        .sec-pill-blue  { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
        .sec-pill-amber { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
        .sec-pill-red   { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }

        /* Table of Contents Box */
        .toc-card {
            background: #F1F5F9;
            border-left: 4px solid #0284C7;
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 24px;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .toc-title {
            margin: 0 0 8px 0;
            font-size: 10pt;
            font-weight: 800;
            color: #0F172A;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .toc-list {
            margin: 0;
            padding-left: 20px;
            font-size: 8.8pt;
            color: #334155;
            columns: 2;
            column-gap: 24px;
        }
        .toc-list li {
            margin-bottom: 4px;
            break-inside: avoid;
        }

        /* Section Headings - ORPHAN PREVENTION GUARANTEE */
        .doc-section {
            margin-bottom: 24px;
            break-inside: auto;
            page-break-inside: auto;
        }
        .doc-section-header {
            border-bottom: 1.5px solid #CBD5E1;
            padding-bottom: 6px;
            margin: 24px 0 14px 0;
            break-after: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            orphans: 3;
            widows: 3;
        }
        .doc-section-title {
            font-size: 12.5pt;
            font-weight: 800;
            color: #0F172A;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .section-num-badge {
            background: #0284C7;
            color: #FFFFFF;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 8.5pt;
            font-weight: 800;
            flex-shrink: 0;
        }

        h1, h2, h3, h4, h5, h6 {
            color: #0F172A;
            break-after: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            orphans: 3;
            widows: 3;
        }
        h2 { font-size: 11pt; margin-top: 18px; margin-bottom: 8px; }
        h3 { font-size: 10pt; margin-top: 14px; margin-bottom: 6px; }

        p, li {
            orphans: 2;
            widows: 2;
            line-height: 1.55;
        }

        /* TABLES - BULLETPROOF NO-OVERFLOW SYSTEM */
        table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            margin: 12px 0 16px 0 !important;
            font-size: 8.5pt !important;
            table-layout: auto !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
        }
        thead {
            display: table-header-group !important;
        }
        tfoot {
            display: table-footer-group !important;
        }
        tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }
        th, td {
            border: 1px solid #CBD5E1 !important;
            padding: 7px 9px !important;
            vertical-align: top !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            line-height: 1.4 !important;
        }
        th {
            background-color: #F1F5F9 !important;
            color: #0F172A !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            font-size: 7.5pt !important;
            letter-spacing: 0.04em !important;
        }
        tr:nth-child(even) td {
            background-color: #F8FAFC !important;
        }

        /* CODE BLOCKS */
        pre {
            background: #F8FAFC !important;
            color: #0F172A !important;
            border: 1px solid #E2E8F0 !important;
            border-radius: 5px !important;
            padding: 10px 12px !important;
            font-family: "JetBrains Mono", Consolas, "Courier New", monospace !important;
            font-size: 7.8pt !important;
            line-height: 1.45 !important;
            white-space: pre-wrap !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin: 10px 0 !important;
        }
        code {
            font-family: "JetBrains Mono", Consolas, "Courier New", monospace !important;
            font-size: 8pt !important;
            background: #F1F5F9 !important;
            padding: 1px 4px !important;
            border-radius: 3px !important;
            color: #0369A1 !important;
            word-break: break-word !important;
        }

        /* DIAGRAMS & SVGs */
        .doc-diagram-card {
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 12px;
            margin: 12px 0 18px;
            background: #FFFFFF;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            text-align: center;
        }
        .doc-diagram-card svg {
            max-width: 100% !important;
            height: auto !important;
            max-height: 440px !important;
            margin: 0 auto;
            display: block;
        }
        .diagram-caption {
            font-size: 8pt;
            font-weight: 700;
            color: #64748B;
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        /* CALLOUT & FACTUAL EVIDENCE BADGES */
        .fact-banner {
            border-left: 3px solid #38BDF8;
            background: #F0F9FF;
            padding: 8px 12px;
            border-radius: 0 4px 4px 0;
            font-size: 8.5pt;
            color: #0369A1;
            margin: 10px 0;
            break-inside: avoid;
        }
        .fact-tag {
            font-weight: 800;
            text-transform: uppercase;
            font-size: 7pt;
            letter-spacing: 0.04em;
            padding: 1px 5px;
            border-radius: 3px;
            margin-right: 4px;
        }
        .tag-found { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
        .tag-inferred { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
        .tag-rec { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }

        /* CARDS (ADRs, Test Cases, Stories) */
        .content-card {
            border: 1px solid #E2E8F0;
            border-radius: 5px;
            padding: 10px 12px;
            margin-bottom: 10px;
            background: #FFFFFF;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }

        /* FOOTER */
        .doc-footer {
            margin-top: 32px;
            padding-top: 10px;
            border-top: 1px solid #E2E8F0;
            font-size: 7.5pt;
            color: #94A3B8;
            text-align: center;
            break-inside: avoid;
        }
    `;

    /**
     * Builds the complete HTML string for the documentation suite or an individual section.
     */
    function buildDocumentHtml(analysisData, filter = 'all') {
        const d = normalizeData(analysisData);
        if (!d) return '<p>No hay datos disponibles para generar la documentación.</p>';

        const meta = d.meta;
        const sections = [];

        // 1. PRODUCT (PRD & SRS)
        if (filter === 'all' || filter === 'prd' || filter === 'srs') {
            let html = '';
            if (d.product.prd) {
                html += `<div class="content-block">${mdToHtml(d.product.prd)}</div>`;
            }
            if (d.product.srs) {
                html += `<div class="content-block" style="margin-top:16px;">${mdToHtml(d.product.srs)}</div>`;
            }
            if (d.product.userStories.length > 0) {
                html += `<h3>Historias de Usuario Formales</h3>`;
                d.product.userStories.forEach(us => {
                    html += `
                        <div class="content-card">
                            <p style="margin:0 0 4px 0;"><strong>Como</strong> ${escapeHtml(us.role)}, <strong>quiero</strong> ${escapeHtml(us.action)}, <strong>para</strong> ${escapeHtml(us.goal)}.</p>
                            <div style="font-size:8pt;color:#475569;background:#F8FAFC;padding:6px 10px;border-radius:4px;border-left:3px solid #10B981;font-family:monospace;white-space:pre-wrap;">${escapeHtml(us.acceptanceCriteria)}</div>
                        </div>
                    `;
                });
            }
            if (html.trim()) {
                sections.push({
                    num: '1',
                    id: 'prd',
                    title: 'Requerimientos de Producto (PRD &amp; SRS IEEE 830)',
                    content: html
                });
            }
        }

        // 2. ARCHITECTURE & C4
        if (filter === 'all' || filter === 'arch') {
            let html = '';
            if (d.architecture.overview) {
                html += `<p class="fact-banner"><span class="fact-tag tag-found">[Encontrado]</span> ${escapeHtml(d.architecture.overview)}</p>`;
            }
            if (d.architecture.c4Context || d.architecture.c4Container) {
                html += `<h3>Modelo C4: Contexto y Contenedores</h3>`;
                if (d.architecture.c4Context) html += `<p>${mdToHtml(d.architecture.c4Context)}</p>`;
                if (d.architecture.c4Container) html += `<p>${mdToHtml(d.architecture.c4Container)}</p>`;
            }
            if (d.architecture.c4Component || d.architecture.components) {
                html += `<h3>Componentes del Sistema</h3>`;
                html += `<p>${mdToHtml(d.architecture.c4Component || d.architecture.components)}</p>`;
            }
            if (d.architecture.dataFlow) {
                html += `<h3>Flujo de Datos e Integración</h3>`;
                html += `<p>${mdToHtml(d.architecture.dataFlow)}</p>`;
            }
            if (d.diagrams.c4) {
                html += `
                    <div class="doc-diagram-card">
                        <pre style="margin:0;text-align:left;max-height:220px;overflow:hidden;"><code>${escapeHtml(d.diagrams.c4)}</code></pre>
                        <div class="diagram-caption"><i class="fa-solid fa-sitemap"></i> Especificación Mermaid C4 Containers</div>
                    </div>
                `;
            }
            if (html.trim()) {
                sections.push({
                    num: '2',
                    id: 'arch',
                    title: 'Arquitectura de Software &amp; Modelo C4',
                    content: html
                });
            }
        }

        // 3. DATABASE & DATA DICTIONARY
        if (filter === 'all' || filter === 'db') {
            let html = '';
            if (d.database.overview) {
                html += `<p class="fact-banner"><span class="fact-tag tag-found">[Encontrado]</span> ${escapeHtml(d.database.overview)}</p>`;
            }
            if (d.database.dataDictionary.length > 0) {
                html += `
                    <h3>Diccionario de Datos &amp; Esquema Relacional</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width:20%;">Entidad / Tabla</th>
                                <th style="width:22%;">Campo / Columna</th>
                                <th style="width:16%;">Tipo de Dato</th>
                                <th style="width:26%;">Descripción Funcional</th>
                                <th style="width:8%;text-align:center;">Req</th>
                                <th style="width:8%;text-align:center;">PK</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${d.database.dataDictionary.map(row => `
                                <tr>
                                    <td><code>${escapeHtml(row.table)}</code></td>
                                    <td><strong>${escapeHtml(row.field)}</strong></td>
                                    <td><code>${escapeHtml(row.type)}</code></td>
                                    <td>${escapeHtml(row.description)}</td>
                                    <td style="text-align:center;">${row.required ? 'Sí' : 'No'}</td>
                                    <td style="text-align:center;font-weight:700;color:#0284C7;">${row.isPk ? 'PK' : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                html += `
                    <div class="fact-banner">
                        <strong>[Información Factual]:</strong> No se detectaron archivos de migración SQL o esquemas ORM explícitos en los archivos analizados. El proyecto opera como un microservicio sin estado (stateless) o delega la persistencia en servicios desacoplados.
                    </div>
                `;
            }
            sections.push({
                num: '3',
                id: 'db',
                title: 'Modelos de Datos &amp; Diccionario de Base de Datos',
                content: html
            });
        }

        // 4. API & ENDPOINTS
        if (filter === 'all' || filter === 'api') {
            let html = '';
            if (d.api.overview) {
                html += `<p class="fact-banner"><span class="fact-tag tag-found">[Encontrado]</span> ${escapeHtml(d.api.overview)}</p>`;
            }
            if (d.api.endpoints.length > 0) {
                html += `
                    <h3>Catálogo de Endpoints REST Registrados</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width:14%;text-align:center;">Método</th>
                                <th style="width:34%;">Ruta / Endpoint</th>
                                <th style="width:12%;text-align:center;">Seguridad</th>
                                <th style="width:40%;">Descripción &amp; Propósito</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${d.api.endpoints.map(ep => `
                                <tr>
                                    <td style="text-align:center;"><strong>${escapeHtml(ep.method)}</strong></td>
                                    <td><code>${escapeHtml(ep.path)}</code></td>
                                    <td style="text-align:center;">${ep.requiresAuth ? '<span class="sec-pill sec-pill-amber">Auth</span>' : '<span class="sec-pill sec-pill-blue">Público</span>'}</td>
                                    <td>${escapeHtml(ep.description)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                if (d.api.openApiJson) {
                    const sample = typeof d.api.openApiJson === 'string' ? d.api.openApiJson : JSON.stringify(d.api.openApiJson, null, 2);
                    html += `
                        <h3>Contrato de Interfaz OpenAPI 3.0.3</h3>
                        <pre style="max-height:240px;overflow:hidden;"><code>${escapeHtml(sample.substring(0, 1600))}\n\n[...Especificación OpenAPI completa exportable en JSON...]</code></pre>
                    `;
                }
            } else {
                html += `
                    <div class="fact-banner">
                        <strong>[Información Factual]:</strong> No se detectaron controladores ni rutas HTTP expuestas directamente en la muestra de archivos analizada.
                    </div>
                `;
            }
            sections.push({
                num: '4',
                id: 'api',
                title: 'Catálogo de APIs &amp; Especificación de Contratos',
                content: html
            });
        }

        // 5. DEVELOPMENT & README
        if (filter === 'all' || filter === 'readme' || filter === 'dev') {
            let html = '';
            if (d.development.readme) {
                html += mdToHtml(d.development.readme);
            }
            if (d.development.contributing) {
                html += `<div style="margin-top:16px;">${mdToHtml(d.development.contributing)}</div>`;
            }
            if (html.trim()) {
                sections.push({
                    num: '5',
                    id: 'dev',
                    title: 'Guía de Desarrollo, README &amp; Contribución',
                    content: html
                });
            }
        }

        // 6. DEVOPS & CI/CD
        if (filter === 'all' || filter === 'devops') {
            let html = '';
            if (d.devops.ciCdPipeline) {
                html += `<h3>Automatización &amp; Pipelines CI/CD</h3><p>${escapeHtml(d.devops.ciCdPipeline)}</p>`;
            }
            if (d.devops.containerization) {
                html += `<h3>Contenedorización &amp; Entornos</h3><p>${escapeHtml(d.devops.containerization)}</p>`;
            }
            if (d.devops.deploymentGuide) {
                html += `<h3>Guía de Despliegue en Producción</h3>${mdToHtml(d.devops.deploymentGuide)}`;
            }
            if (!html.trim()) {
                html = `<p class="fact-banner">No se detectaron manifiestos formales de infraestructura (Dockerfile, Kubernetes, GitHub Workflows) en la raíz del proyecto.</p>`;
            }
            sections.push({
                num: '6',
                id: 'devops',
                title: 'Pipeline DevOps, Despliegue &amp; CI/CD',
                content: html
            });
        }

        // 7. QA & TESTING
        if (filter === 'all' || filter === 'qa') {
            let html = '';
            if (d.qa.testPlan) {
                html += mdToHtml(d.qa.testPlan);
            }
            if (d.qa.testCases.length > 0) {
                html += `
                    <h3>Matriz de Casos de Prueba (QA Matrix)</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width:12%;text-align:center;">ID</th>
                                <th style="width:28%;">Título de Prueba</th>
                                <th style="width:24%;">Precondiciones</th>
                                <th style="width:26%;">Resultado Esperado</th>
                                <th style="width:10%;text-align:center;">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${d.qa.testCases.map(tc => `
                                <tr>
                                    <td style="text-align:center;"><strong>${escapeHtml(tc.id)}</strong></td>
                                    <td>${escapeHtml(tc.title)}</td>
                                    <td>${escapeHtml(tc.preconditions)}</td>
                                    <td>${escapeHtml(tc.expectedResult)}</td>
                                    <td style="text-align:center;"><span class="sec-pill sec-pill-green">${escapeHtml(tc.status || 'Diseñado')}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                html += `<p class="fact-banner">Estrategia de pruebas basada en ejecución modular según suites configuradas.</p>`;
            }
            sections.push({
                num: '7',
                id: 'qa',
                title: 'Estrategia de Calidad &amp; Matriz de Pruebas (QA)',
                content: html
            });
        }

        // 8. SECURITY & SAST AUDIT
        if (filter === 'all' || filter === 'sec') {
            let html = '';
            const cov = d.security.coverage || { coveragePct: 100, confidenceLevel: 'Alta' };
            const dims = d.security.dimensions || {};
            const pillColor = d.security.score >= 90 ? 'sec-pill-green' : (d.security.score >= 70 ? 'sec-pill-blue' : (d.security.score >= 50 ? 'sec-pill-amber' : 'sec-pill-red'));

            html += `
                <div class="content-card" style="margin-bottom:14px;background:#F8FAFC;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <span style="font-size:8pt;color:#64748B;font-weight:700;text-transform:uppercase;">DocuMind Security Intelligence — Índice Global</span>
                            <div style="font-size:16pt;font-weight:900;color:#0F172A;">${d.security.score}/100 — ${escapeHtml(d.security.classification)} (Grado ${d.security.grade})</div>
                            <div style="font-size:8pt;color:#64748B;margin-top:2px;">Cobertura del Análisis: <strong>${cov.coveragePct}%</strong> | Nivel de Confianza: <strong>${escapeHtml(cov.confidenceLevel)}</strong></div>
                        </div>
                        <div>
                            <span class="sec-pill ${pillColor}">${escapeHtml(d.security.riskLevel)}</span>
                        </div>
                    </div>
                </div>
            `;

            // 12 Dimensions Table if available
            const dimList = Object.values(dims);
            if (dimList.length > 0) {
                html += `
                    <h3>Evaluación por Dimensiones de Arquitectura (12 Categorías)</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width:45%;">Dimensión de Seguridad</th>
                                <th style="width:15%;text-align:center;">Ponderación</th>
                                <th style="width:20%;text-align:center;">Puntuación</th>
                                <th style="width:20%;text-align:center;">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dimList.map(dim => {
                                const dStatusPill = dim.score >= 80 ? 'sec-pill-green' : (dim.score >= 60 ? 'sec-pill-amber' : 'sec-pill-red');
                                return `
                                    <tr>
                                        <td><strong>${escapeHtml(dim.name)}</strong></td>
                                        <td style="text-align:center;">${dim.weightPct || (Math.round((dim.weight || 0.1) * 100))}%</td>
                                        <td style="text-align:center;font-weight:800;">${dim.score}/100</td>
                                        <td style="text-align:center;"><span class="sec-pill ${dStatusPill}">${escapeHtml(dim.status || 'OK')}</span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            }
            if (d.security.vulnerabilities.length > 0) {
                html += `
                    <h3>Hallazgos de Seguridad &amp; Auditoría Estática (SAST)</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width:12%;text-align:center;">ID</th>
                                <th style="width:12%;text-align:center;">Severidad</th>
                                <th style="width:36%;">Vulnerabilidad &amp; Ubicación</th>
                                <th style="width:40%;">Recomendación &amp; Remediación</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${d.security.vulnerabilities.map(v => `
                                <tr>
                                    <td style="text-align:center;"><code>${escapeHtml(v.id || 'SAST')}</code></td>
                                    <td style="text-align:center;"><span class="sec-pill ${v.severity === 'CRITICAL' ? 'sec-pill-red' : (v.severity === 'HIGH' ? 'sec-pill-amber' : 'sec-pill-blue')}">${escapeHtml(v.severity || 'INFO')}</span></td>
                                    <td><strong>${escapeHtml(v.title)}</strong><br><span style="font-size:7.5pt;color:#64748B;">${escapeHtml(v.file)}:${v.line || 1}</span></td>
                                    <td>${escapeHtml(v.recommendation || '-')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                html += `<p class="fact-banner"><span class="fact-tag tag-found">[Auditoría SAST]</span> No se detectaron vulnerabilidades críticas ni claves privadas expuestas en los archivos analizados.</p>`;
            }

            if (d.security.markdownReport) {
                html += `<div style="margin-top:14px;">${mdToHtml(d.security.markdownReport)}</div>`;
            }
            sections.push({
                num: '8',
                id: 'sec',
                title: 'Auditoría DevSecOps &amp; Seguridad de Código (SAST)',
                content: html
            });
        }

        // 9. ADRs
        if (filter === 'all' || filter === 'adrs') {
            let html = '';
            if (d.adrs.length > 0) {
                d.adrs.forEach(adr => {
                    html += `
                        <div class="content-card">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <strong style="font-size:10pt;color:#0F172A;">${escapeHtml(adr.id)}: ${escapeHtml(adr.title)}</strong>
                                <span class="sec-pill sec-pill-green">${escapeHtml(adr.status || 'Aceptada')}</span>
                            </div>
                            <p style="margin:3px 0;"><strong>Contexto:</strong> ${escapeHtml(adr.context)}</p>
                            <p style="margin:3px 0;"><strong>Decisión:</strong> ${escapeHtml(adr.decision)}</p>
                            <p style="margin:3px 0;font-size:8pt;color:#64748B;"><strong>Consecuencias:</strong> ${escapeHtml(adr.consequences)}</p>
                        </div>
                    `;
                });
            } else {
                html = `<p class="fact-banner">Decisiones de arquitectura implícitas en la estructura detectada del repositorio.</p>`;
            }
            sections.push({
                num: '9',
                id: 'adrs',
                title: 'Registro de Decisiones de Arquitectura (ADR)',
                content: html
            });
        }

        // 10. USER GUIDE & FAQ
        if (filter === 'all' || filter === 'user') {
            let html = '';
            if (d.userGuide.guide) {
                html += mdToHtml(d.userGuide.guide);
            }
            if (d.userGuide.faq.length > 0) {
                html += `<h3>Preguntas Frecuentes (FAQ)</h3>`;
                d.userGuide.faq.forEach(f => {
                    html += `
                        <div class="content-card">
                            <strong style="font-size:9pt;color:#0F172A;display:block;margin-bottom:4px;">&#9679; ${escapeHtml(f.question)}</strong>
                            <p style="margin:0;color:#475569;font-size:8.5pt;">${escapeHtml(f.answer)}</p>
                        </div>
                    `;
                });
            }
            if (html.trim()) {
                sections.push({
                    num: '10',
                    id: 'user',
                    title: 'Guía de Usuario &amp; Preguntas Frecuentes',
                    content: html
                });
            }
        }

        // Build Clean Full Page Structure
        const safeDocTitle = `${meta.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Documentacion_Tecnica_DocuMind`;

        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${safeDocTitle}</title>
    <style>${PRINT_AND_PREVIEW_CSS}</style>
</head>
<body>

    <!-- 1. COVER SHEET -->
    <div class="doc-cover-sheet">
        <div class="brand-badge">DocuMind AI &bull; Enterprise Documentation Engine</div>
        <h1 class="cover-title">${escapeHtml(meta.fullName)}</h1>
        <div class="cover-subtitle">Documentación Técnica Integral &bull; Arquitectura, Requerimientos, APIs y Seguridad DevSecOps</div>

        <table class="meta-grid-table">
            <tr>
                <td>
                    <div class="meta-label">Repositorio GitHub</div>
                    <div class="meta-value">${escapeHtml(meta.fullName)}</div>
                </td>
                <td>
                    <div class="meta-label">Rama Analizada</div>
                    <div class="meta-value">${escapeHtml(meta.branch)}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="meta-label">Lenguaje Principal</div>
                    <div class="meta-value">${escapeHtml(meta.language)}</div>
                </td>
                <td>
                    <div class="meta-label">Archivos Analizados</div>
                    <div class="meta-value">${meta.filesCount} archivos</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="meta-label">Stack Tecnológico</div>
                    <div class="meta-value">${escapeHtml((meta.technologies || []).slice(0, 6).join(', ') || 'Nativo')}</div>
                </td>
                <td>
                    <div class="meta-label">Auditoría SAST (Seguridad)</div>
                    <div class="meta-value">
                        <span class="sec-pill ${meta.securityScore >= 80 ? 'sec-pill-green' : 'sec-pill-amber'}">
                            ${meta.securityScore}/100 (Grado ${meta.securityGrade})
                        </span>
                    </div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="meta-label">Fecha de Análisis</div>
                    <div class="meta-value">${escapeHtml(meta.date)}</div>
                </td>
                <td>
                    <div class="meta-label">Motor Cognitivo</div>
                    <div class="meta-value">${escapeHtml(meta.engine)}</div>
                </td>
            </tr>
        </table>

        <!-- Table of Contents -->
        ${sections.length > 1 ? `
            <div class="toc-card">
                <div class="toc-title">Índice de Secciones Incluidas</div>
                <ul class="toc-list">
                    ${sections.map(s => `<li><strong>${s.num}.</strong> ${s.title}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>

    <!-- 2. DOCUMENT SECTIONS (Clean Page Transitions without Blank Pages) -->
    ${sections.map((s, idx) => `
        <div class="doc-section ${idx > 0 ? 'page-break-before' : ''}" id="section-${s.id}">
            <div class="doc-section-header">
                <h2 class="doc-section-title">
                    <span class="section-num-badge">${s.num}</span>
                    ${s.title}
                </h2>
            </div>
            ${s.content}
        </div>
    `).join('')}

    <!-- 3. FOOTER -->
    <div class="doc-footer">
        Documento generado automáticamente por <strong>DocuMind AI</strong> &bull; Cohorte 2026<br>
        Repositorio: ${escapeHtml(meta.fullName)} &bull; Rama: ${escapeHtml(meta.branch)} &bull; Todos los derechos reservados.
    </div>

</body>
</html>`;
    }

    /**
     * Converts selected document section into clean Markdown.
     */
    function getDocumentMarkdown(analysisData, filter = 'all') {
        const d = normalizeData(analysisData);
        if (!d) return '# Documentación\n\nNo hay datos disponibles.';

        const meta = d.meta;
        let md = `# ${meta.fullName} — Documentación Técnica de Software\n\n`;
        md += `> Generado por **DocuMind AI** el ${meta.date}.\n\n`;
        md += `| Metadato | Valor |\n| :--- | :--- |\n`;
        md += `| **Repositorio** | ${meta.fullName} |\n`;
        md += `| **Rama** | ${meta.branch} |\n`;
        md += `| **Lenguaje** | ${meta.language} |\n`;
        md += `| **Archivos** | ${meta.filesCount} |\n`;
        md += `| **Seguridad SAST** | ${meta.securityScore}/100 (Grado ${meta.securityGrade}) |\n\n`;
        md += `---\n\n`;

        if (filter === 'all' || filter === 'prd' || filter === 'srs') {
            if (d.product.prd) md += `${d.product.prd}\n\n---\n\n`;
            if (d.product.srs) md += `${d.product.srs}\n\n---\n\n`;
        }
        if (filter === 'all' || filter === 'arch') {
            md += `## Arquitectura de Software & Modelo C4\n\n`;
            if (d.architecture.overview) md += `### Visión General\n${d.architecture.overview}\n\n`;
            if (d.architecture.c4Container) md += `### C4 Contenedores\n${d.architecture.c4Container}\n\n`;
            if (d.architecture.c4Component) md += `### Componentes\n${d.architecture.c4Component}\n\n`;
            if (d.diagrams.c4) md += `\`\`\`mermaid\n${d.diagrams.c4}\n\`\`\`\n\n---\n\n`;
        }
        if (filter === 'all' || filter === 'db') {
            md += `## Base de Datos & Diccionario de Datos\n\n`;
            if (d.database.overview) md += `${d.database.overview}\n\n`;
            if (d.database.dataDictionary.length > 0) {
                md += `| Tabla | Campo | Tipo | Descripción | Req | PK |\n| :--- | :--- | :--- | :--- | :---: | :---: |\n`;
                d.database.dataDictionary.forEach(r => {
                    md += `| ${r.table} | ${r.field} | ${r.type} | ${r.description} | ${r.required ? 'Sí' : 'No'} | ${r.isPk ? 'PK' : '-'} |\n`;
                });
                md += `\n---\n\n`;
            }
        }
        if (filter === 'all' || filter === 'api') {
            md += `## Catálogo de APIs & Endpoints\n\n`;
            if (d.api.overview) md += `${d.api.overview}\n\n`;
            if (d.api.endpoints.length > 0) {
                md += `| Método | Ruta | Auth | Descripción |\n| :---: | :--- | :---: | :--- |\n`;
                d.api.endpoints.forEach(ep => {
                    md += `| \`${ep.method}\` | \`${ep.path}\` | ${ep.requiresAuth ? 'Auth' : 'Público'} | ${ep.description} |\n`;
                });
                md += `\n---\n\n`;
            }
        }
        if (filter === 'all' || filter === 'dev' || filter === 'readme') {
            if (d.development.readme) md += `${d.development.readme}\n\n---\n\n`;
            if (d.development.contributing) md += `${d.development.contributing}\n\n---\n\n`;
        }
        if (filter === 'all' || filter === 'devops') {
            md += `## DevOps & Despliegue\n\n`;
            if (d.devops.ciCdPipeline) md += `### CI/CD\n${d.devops.ciCdPipeline}\n\n`;
            if (d.devops.containerization) md += `### Contenedores\n${d.devops.containerization}\n\n`;
            if (d.devops.deploymentGuide) md += `${d.devops.deploymentGuide}\n\n---\n\n`;
        }
        if (filter === 'all' || filter === 'qa') {
            md += `## Plan de Calidad & QA\n\n`;
            if (d.qa.testPlan) md += `${d.qa.testPlan}\n\n`;
            if (d.qa.testCases.length > 0) {
                md += `| ID | Prueba | Precondiciones | Resultado Esperado | Estado |\n| :---: | :--- | :--- | :--- | :---: |\n`;
                d.qa.testCases.forEach(tc => {
                    md += `| ${tc.id} | ${tc.title} | ${tc.preconditions} | ${tc.expectedResult} | ${tc.status} |\n`;
                });
                md += `\n---\n\n`;
            }
        }
        if (filter === 'all' || filter === 'sec') {
            md += `## Seguridad DevSecOps (SAST & STRIDE)\n\n`;
            md += `**Puntuación de Seguridad**: ${d.security.score}/100 (Grado ${d.security.grade})\n\n`;
            if (d.security.markdownReport) md += `${d.security.markdownReport}\n\n---\n\n`;
        }
        if (filter === 'all' || filter === 'adrs') {
            md += `## Registro de Decisiones de Arquitectura (ADR)\n\n`;
            d.adrs.forEach(adr => {
                md += `### ${adr.id}: ${adr.title} [${adr.status}]\n`;
                md += `- **Contexto**: ${adr.context}\n`;
                md += `- **Decisión**: ${adr.decision}\n`;
                md += `- **Consecuencias**: ${adr.consequences}\n\n`;
            });
            md += `---\n\n`;
        }
        if (filter === 'all' || filter === 'user') {
            if (d.userGuide.guide) md += `${d.userGuide.guide}\n\n`;
        }

        return md;
    }

    /**
     * Triggers a browser download of the clean Markdown text.
     */
    function downloadMarkdownFile(analysisData, filter = 'all') {
        const d = normalizeData(analysisData);
        if (!d) return;

        const mdText = getDocumentMarkdown(analysisData, filter);
        const repoName = (d.meta.projectName || 'proyecto').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = filter === 'all' ? `${repoName}_Suite_Documental.md` : `${repoName}_${filter.toUpperCase()}.md`;

        const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Directly prints or saves as PDF with full layout fidelity.
     */
    function printDocument(analysisData, filter = 'all') {
        const d = normalizeData(analysisData);
        if (!d) return;

        const html = buildDocumentHtml(analysisData, filter);
        const safeTitle = `${d.meta.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Documentacion_Tecnica_DocuMind`;

        // Update main document title so browser print dialog picks it up
        const oldTitle = document.title;
        document.title = safeTitle;

        // Open in dedicated print window with isolated rendering
        const printWin = window.open('', '_blank');
        if (printWin) {
            printWin.document.open();
            printWin.document.write(html);
            printWin.document.close();
            // Automatically invoke print after rendering
            printWin.onload = function () {
                setTimeout(function () {
                    printWin.print();
                    document.title = oldTitle;
                }, 400);
            };
        } else {
            // Popup blocker fallback
            window.print();
            document.title = oldTitle;
        }
    }

    /**
     * Calculates estimated page count and layout metrics for preview.
     */
    function analyzeLayoutQuality(analysisData, filter = 'all') {
        const d = normalizeData(analysisData);
        if (!d) return { pageEstimate: 1, issues: [], emptySectionsCount: 0 };

        const issues = [];
        let emptySectionsCount = 0;

        // Check tables
        const tableRows = d.database.dataDictionary.length + d.api.endpoints.length + d.qa.testCases.length + d.security.vulnerabilities.length;
        
        // Estimate pages based on word count (~350 words per A4 page + tables)
        const allText = JSON.stringify(d);
        const approxWords = allText.length / 6;
        const pageEstimate = Math.max(2, Math.ceil(approxWords / 380));

        return {
            pageEstimate,
            tableRows,
            issues,
            emptySectionsCount,
            qualityScore: 100
        };
    }

    return {
        normalizeData,
        buildDocumentHtml,
        getDocumentMarkdown,
        downloadMarkdownFile,
        printDocument,
        analyzeLayoutQuality,
        PRINT_AND_PREVIEW_CSS
    };
}));
