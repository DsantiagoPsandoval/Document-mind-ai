/**
 * ============================================================================
 * DocuMind AI — Enterprise Verification Suite:
 * Unified Content Model, Direct PDF/DOCX/HTML/MD/JSON/TXT Export,
 * Visual Diagrams (SVG + PNG), Prompt Engine v3.0 & Quality Reviewer
 * ============================================================================
 */

const assert = require('assert');
const http = require('http');
const app = require('../server');
const { buildUnifiedDocumentModel } = require('../services/export/unifiedDocModel');
const { buildDiagramSuite, renderDiagramToPngBuffer } = require('../services/export/diagramEngine');
const { generatePdfDocumentBuffer } = require('../services/export/pdfGenerator');
const { generateWordDocumentBuffer } = require('../services/export/docxGenerator');
const { exportDocumentByFormat } = require('../services/export/multiFormatExporter');
const { reviewAndEnhanceDocumentation } = require('../services/ai/qualityReviewer');
const { buildSpecializedPrompt, PROMPT_ENGINE_VERSION } = require('../services/ai/promptEngine');

const SAMPLE_ANALYSIS = {
    projectId: 'proj-enterprise-001',
    repository: {
        name: 'documind-enterprise-core',
        fullName: 'acme-corp/documind-enterprise-core',
        defaultBranch: 'main',
        language: 'JavaScript',
        description: 'Plataforma empresarial de ingeniería documental y análisis arquitectónico.'
    },
    stats: {
        totalFiles: 48,
        relevantFiles: 36,
        totalLines: 9420
    },
    detectedTechnologies: {
        languages: ['JavaScript', 'HTML5', 'CSS3'],
        frameworks: ['Node.js', 'Express.js'],
        databases: ['PostgreSQL', 'Redis'],
        infrastructure: ['Docker', 'GitHub Actions'],
        architectureStyle: 'Arquitectura Modular Orientada a Servicios (SOA / Clean Architecture)'
    },
    endpoints: [
        { method: 'POST', path: '/api/project/analyze', handler: 'analyzeController', authRequired: false, file: 'server.js', description: 'Analiza repositorio y compila suite documental' },
        { method: 'POST', path: '/api/project/export/pdf', handler: 'exportPdfController', authRequired: false, file: 'server.js', description: 'Genera documento PDF binario directo' },
        { method: 'POST', path: '/api/project/export/docx', handler: 'exportDocxController', authRequired: false, file: 'server.js', description: 'Genera documento Word editable con diagramas PNG' }
    ],
    dataModels: [
        { name: 'ProjectAnalysis', type: 'Entity', file: 'models/ProjectAnalysis.js', fields: ['id: UUID', 'repoName: String', 'createdAt: Timestamp'] },
        { name: 'DocumentDeliverable', type: 'Entity', file: 'models/DocumentDeliverable.js', fields: ['id: UUID', 'projectId: UUID', 'format: Enum', 'version: String'] }
    ],
    keyFiles: [
        { path: 'server.js', category: 'Entrypoint / API Router', size: 42000 },
        { path: 'services/export/unifiedDocModel.js', category: 'Core Domain Service', size: 28000 },
        { path: 'services/export/pdfGenerator.js', category: 'PDF Export Engine', size: 22000 },
        { path: 'services/export/docxGenerator.js', category: 'DOCX Export Engine', size: 35000 }
    ],
    documentation: {
        overview: 'El sistema `documind-enterprise-core` implementa una arquitectura modular en `server.js` con motores de exportación directa.',
        prd: '## 1. Visión del Producto\nPlataforma corporativa para generación de entregables técnicos auditables.',
        architecture: '## 1. Arquitectura C4\nSeparación estricta entre capa de presentación, controladores REST y servicios de exportación.',
        database: '## 1. Modelo de Datos\nEntidades principales: `ProjectAnalysis` y `DocumentDeliverable` con integridad referencial.',
        apiView: '## 1. Contratos REST\nEndpoints documentados bajo especificación OpenAPI 3.0.',
        devops: '## 1. Pipeline CI/CD\nAutomatización mediante GitHub Actions y contenedores Docker.',
        qa: '## 1. Estrategia QA\nPruebas unitarias, de integración y validación de esquemas.',
        security: '## 1. Postura DevSecOps\nMitigación OWASP Top 10 y cabeceras HTTP seguras con Helmet.',
        adrs: '## ADR-001: Modelo Unificado de Contenido\nSe adopta una única fuente de verdad para previsualización A4 y exportación multiformato.',
        userGuide: '## 1. Manual de Operación\nGuía paso a paso para analizar proyectos y exportar entregables.'
    },
    security: {
        score: 92,
        grade: 'A',
        riskLevel: 'Bajo',
        owaspCompliance: '94%',
        totals: { critical: 0, high: 0, medium: 1, low: 2, total: 3 },
        vulnerabilities: [
            { severity: 'MEDIUM', category: 'Rate Limiting', title: 'Ajuste de ventana de cuota en endpoints públicos', file: 'server.js', line: 120, cwe: 'CWE-770', owasp: 'A04:2021', remediation: 'Configurar límites estrictos por IP.' }
        ]
    }
};

async function runSuite() {
    console.log('=== INICIANDO SUITE DE VALIDACIÓN EMPRESARIAL DOCUMIND AI ===\n');

    // 1. Prompt Engine v3.0 & 18 Specialized Deliverables
    console.log('[1/7] Validando Prompt Engine v3.0 y los 18 roles especializados...');
    assert.strictEqual(PROMPT_ENGINE_VERSION, '3.0.0', 'La versión del motor de prompts debe ser 3.0.0');
    const deliverables = ['repoAnalysis', 'prd', 'srs', 'architecture', 'c4', 'uml', 'erd', 'openapi', 'devops', 'qa', 'security', 'stride', 'adr', 'database', 'eda', 'techManual', 'userManual', 'deployment'];
    for (const deliv of deliverables) {
        const promptObj = buildSpecializedPrompt(deliv, SAMPLE_ANALYSIS);
        assert.ok(promptObj.systemInstruction.includes('Eres ') && promptObj.promptText.includes('<untrusted_source_code>'), `Falta instrucción de rol o seguridad en ${deliv}`);
        assert.ok(promptObj.promptText.length > 100, `Prompt de usuario demasiado corto para ${deliv}`);
        assert.strictEqual(promptObj.promptVersion, '3.0.0');
    }
    console.log('  ✓ 18 prompts especializados validados con reglas anti-alucinación.\n');

    // 2. Quality Reviewer Stage 6
    console.log('[2/7] Validando Revisor Automático de Calidad Documental (Stage 6)...');
    const reviewRes = reviewAndEnhanceDocumentation(SAMPLE_ANALYSIS);
    assert.ok(reviewRes && reviewRes.overallScore >= 75, `Score de calidad esperado >= 75, obtenido: ${reviewRes && reviewRes.overallScore}`);
    assert.ok(reviewRes.dimensions && reviewRes.dimensions.technicalPrecision >= 85, 'Dimensiones de calidad deben ser >= 85');
    console.log(`  ✓ Quality Reviewer validado (Score: ${reviewRes.overallScore}% - Grado: ${reviewRes.grade}).\n`);

    // 3. Visual Diagram Engine (SVG + Pure Node PNG Buffer)
    console.log('[3/7] Validando Motor de Diagramas Visuales (SVG + PNG Rasterizer)...');
    const diagrams = buildDiagramSuite(SAMPLE_ANALYSIS);
    assert.ok(Array.isArray(diagrams) && diagrams.length === 8, `Se esperaban 8 diagramas arquitectónicos, obtenidos: ${diagrams.length}`);
    for (const diag of diagrams) {
        assert.ok(diag.svg && diag.svg.includes('<svg'), `El diagrama ${diag.key} debe incluir SVG vectorial válido`);
        const pngBuf = renderDiagramToPngBuffer(diag);
        assert.ok(Buffer.isBuffer(pngBuf), `El diagrama ${diag.key} debe generar pngBuffer binario`);
        assert.strictEqual(pngBuf[0], 0x89);
        assert.strictEqual(pngBuf[1], 0x50); // 'P'
        assert.strictEqual(pngBuf[2], 0x4E); // 'N'
        assert.strictEqual(pngBuf[3], 0x47); // 'G'
    }
    console.log(`  ✓ ${diagrams.length} diagramas arquitectónicos generados en SVG vectorial y PNG binario real.\n`);

    // 4. Unified Document Model across Scopes
    console.log('[4/7] Validando Modelo Unificado de Contenido (Single Source of Truth)...');
    const scopesToTest = ['all', 'prd', 'srs', 'arch', 'c4', 'uml', 'erd', 'db', 'api', 'eda', 'devops', 'qa', 'sec', 'stride', 'adrs', 'user'];
    for (const sc of scopesToTest) {
        const model = buildUnifiedDocumentModel(SAMPLE_ANALYSIS, sc);
        assert.ok(model.metadata && model.metadata.projectName === 'documind-enterprise-core');
        assert.ok(Array.isArray(model.toc) && model.toc.length > 0, `TOC vacío para scope ${sc}`);
        assert.ok(Array.isArray(model.sections) && model.sections.length > 0, `Secciones vacías para scope ${sc}`);
        assert.ok(Array.isArray(model.references) && model.references.length >= 3, `Referencias insuficientes para scope ${sc}`);
    }
    console.log(`  ✓ Modelo unificado verificado en ${scopesToTest.length} alcances documentales.\n`);

    // 5. Direct Binary PDF Generator (%PDF-1.4)
    console.log('[5/7] Validando Generador de PDF Binario Directo (%PDF-1.4 sin ventana de impresión)...');
    const pdfBuffer = await generatePdfDocumentBuffer(SAMPLE_ANALYSIS, 'all');
    assert.ok(Buffer.isBuffer(pdfBuffer), 'El resultado debe ser un Buffer');
    assert.ok(pdfBuffer.length > 8000, `El PDF generado debe tener contenido sustancial (tamaño actual: ${pdfBuffer.length} bytes)`);
    const pdfHead = pdfBuffer.slice(0, 8).toString('ascii');
    const pdfTail = pdfBuffer.slice(pdfBuffer.length - 32).toString('ascii');
    assert.ok(pdfHead.startsWith('%PDF-1.4'), `Encabezado PDF inválido: ${pdfHead}`);
    assert.ok(pdfTail.includes('%%EOF'), 'El archivo PDF debe cerrar con %%EOF');
    console.log(`  ✓ PDF binario directo generado correctamente (${(pdfBuffer.length / 1024).toFixed(1)} KB, %PDF-1.4 válido).\n`);

    // 6. Editable Word (.docx) with Embedded PNG Diagrams & Multi-Format Exporter
    console.log('[6/7] Validando Exportación Multi-Formato (.docx, .pdf, .html, .md, .json, .txt)...');
    const formats = ['docx', 'pdf', 'html', 'md', 'json', 'txt'];
    for (const fmt of formats) {
        const exported = await exportDocumentByFormat(SAMPLE_ANALYSIS, fmt, 'all');
        assert.ok(Buffer.isBuffer(exported.buffer), `El formato ${fmt} debe retornar un Buffer`);
        assert.ok(exported.buffer.length > 500, `El archivo exportado .${fmt} no puede estar vacío`);
        assert.ok(exported.filename.endsWith(`.${fmt}`), `Nombre de archivo incorrecto: ${exported.filename}`);
        if (fmt === 'docx') {
            // PK zip header for .docx
            assert.strictEqual(exported.buffer[0], 0x50); // 'P'
            assert.strictEqual(exported.buffer[1], 0x4B); // 'K'
        }
        if (fmt === 'html') {
            const htmlStr = exported.buffer.toString('utf8');
            assert.ok(htmlStr.includes('<!DOCTYPE html>'), 'HTML exportado debe ser documento completo');
            assert.ok(htmlStr.includes('<svg'), 'HTML exportado debe incrustar diagramas SVG reales');
        }
        if (fmt === 'json') {
            const parsed = JSON.parse(exported.buffer.toString('utf8'));
            assert.ok(parsed.metadata && parsed.sections && parsed.qualityReview, 'JSON exportado debe preservar esquema completo');
        }
    }
    console.log('  ✓ Los 6 formatos (.docx, .pdf, .html, .md, .json, .txt) exportan archivos reales y completos.\n');

    // 7. HTTP Endpoints Integration Test
    console.log('[7/7] Validando Endpoints HTTP de Exportación Directa en server.js...');
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
        for (const fmt of ['pdf', 'docx', 'html', 'md', 'json', 'txt']) {
            const res = await new Promise((resolve, reject) => {
                const payload = JSON.stringify({ analysisData: SAMPLE_ANALYSIS, scope: 'arch' });
                const req = http.request({
                    hostname: '127.0.0.1',
                    port,
                    path: `/api/project/export/format/${fmt}`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                }, (response) => {
                    const chunks = [];
                    response.on('data', (c) => chunks.push(c));
                    response.on('end', () => resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: Buffer.concat(chunks)
                    }));
                });
                req.on('error', reject);
                req.write(payload);
                req.end();
            });

            assert.strictEqual(res.statusCode, 200, `HTTP status esperado 200 para formato ${fmt}, obtenido ${res.statusCode}`);
            assert.ok(res.headers['content-disposition'] && res.headers['content-disposition'].includes(`.${fmt}`), `Falta Content-Disposition attachment para ${fmt}`);
            assert.ok(res.body.length > 400, `Cuerpo de respuesta vacío para formato ${fmt}`);
        }
        console.log('  ✓ Todos los endpoints HTTP POST /api/project/export/format/:format responden 200 con descarga directa.\n');
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }

    console.log('====================================================================');
    console.log(' ¡TODAS LAS PRUEBAS DE LA SUITE EMPRESARIAL PASARON CON ÉXITO! (7/7)');
    console.log('====================================================================');
}

runSuite().catch((err) => {
    console.error('Fallo en la suite de pruebas:', err);
    process.exit(1);
});
