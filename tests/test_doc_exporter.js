const assert = require('assert');
const { 
    normalizeData, 
    buildDocumentHtml, 
    getDocumentMarkdown, 
    analyzeLayoutQuality, 
    PRINT_AND_PREVIEW_CSS 
} = require('../js/document-exporter');

console.log('🧪 INICIANDO TEST SUITE: DOCUMIND EXPORTER & PAGINATION ENGINE');
console.log('============================================================');

// Test Case 1: Minimal / Empty input resilience
console.log('Test 1: Resiliencia ante datos nulos o mínimos...');
const normalizedEmpty = normalizeData({});
assert.strictEqual(normalizedEmpty.meta.projectName, 'Proyecto');
assert.strictEqual(normalizedEmpty.meta.version, '2.5.0-Enterprise');
assert.ok(Array.isArray(normalizedEmpty.database.dataDictionary));
assert.ok(Array.isArray(normalizedEmpty.api.endpoints));
console.log('  ✔ [PASS] Normalización con objeto vacío funciona con fallbacks');

// Test Case 2: Full repository sample (Express.js / DocuMind)
console.log('Test 2: Normalización de repositorio completo con datos mixtos...');
const mockFullAnalysis = {
    projectId: 'express-test-123',
    projectName: 'express',
    repository: {
        name: 'express',
        fullName: 'expressjs/express',
        url: 'https://github.com/expressjs/express',
        defaultBranch: 'master',
        branch: 'master',
        primaryLanguage: 'JavaScript'
    },
    stats: {
        totalFiles: 42,
        relevantFilesCount: 38
    },
    detectedTechnologies: ['JavaScript', 'Node.js', 'Express', 'Mocha'],
    documentation: {
        isAiGenerated: true,
        product: {
            prd: '# PRD Express\n\nFast, unopinionated, minimalist web framework for Node.js.',
            srs: '## SRS Express\n\n### RF-01: Enrutamiento HTTP\nEl sistema provee enrutamiento HTTP robusto.',
            userStories: [
                { role: 'Desarrollador', action: 'definir rutas HTTP', goal: 'construir APIs REST', acceptanceCriteria: 'Given app.get()\nWhen request arrives\nThen respond 200' }
            ]
        },
        architecture: {
            overview: 'Arquitectura basada en middlewares con tubería de ejecución en serie.',
            c4Context: 'Express actúa como servidor HTTP embebible.',
            c4Container: 'Node.js Runtime con motor V8.',
            c4Component: 'Router, Layer, Request, Response'
        },
        diagrams: {
            c4Mermaid: 'flowchart TD\nClient --> Router\nRouter --> Layer',
            erdMermaid: 'erDiagram\nROUTE ||--o{ LAYER : contains'
        },
        database: {
            overview: 'Express es stateless y delega la persistencia en bases de datos externas.',
            dataDictionary: []
        },
        api: {
            overview: 'Endpoints y middleware HTTP.',
            endpoints: [
                { method: 'GET', path: '/api/v1/health', description: 'Healthcheck endpoint', requiresAuth: false },
                { method: 'POST', path: '/api/v1/users', description: 'User creation endpoint', requiresAuth: true }
            ],
            openApiJson: { openapi: '3.0.3', info: { title: 'Express API', version: '1.0' } }
        },
        development: {
            readme: '# Express\n\n`npm install express`',
            contributing: '## Contributing\n\nSubmit PRs with test coverage.'
        },
        devops: {
            ciCdPipeline: 'GitHub Actions workflow en .github/workflows/ci.yml',
            deploymentGuide: 'Ejecutar `npm start` con reverse proxy Nginx.'
        },
        qa: {
            testPlan: 'Suite Mocha con cobertura del 98%.',
            testCases: [
                { id: 'TC-01', title: 'Route registration', preconditions: 'App initialized', expectedResult: 'Route matches request', status: 'Aprobado' }
            ]
        },
        adrs: [
            { id: 'ADR-001', title: 'Middleware Pipeline', context: 'Request processing flow', decision: 'Use middleware chain', consequences: 'High flexibility', status: 'Aceptada' }
        ],
        userGuide: {
            guide: 'Guía rápida de inicio para Express.',
            faq: [
                { question: '¿Cómo inicio el servidor?', answer: 'app.listen(3000)' }
            ]
        }
    },
    security: {
        score: 95,
        grade: 'A',
        riskLevel: 'BAJO',
        summary: 'Sin vulnerabilidades críticas.',
        vulnerabilities: []
    }
};

const normFull = normalizeData(mockFullAnalysis);
assert.strictEqual(normFull.meta.projectName, 'express');
assert.strictEqual(normFull.meta.fullName, 'expressjs/express');
assert.strictEqual(normFull.meta.securityScore, 95);
assert.strictEqual(normFull.api.endpoints.length, 2);
console.log('  ✔ [PASS] Normalización completa preserva el 100% de la metadata');

// Test Case 3: HTML Generation and Blank Page Elimination
console.log('Test 3: Generación de HTML editorial y verificación de paginación...');
const htmlFull = buildDocumentHtml(mockFullAnalysis, 'all');

// Verify NO blank page classes or indiscriminate page-break-after divs
assert.ok(!htmlFull.includes('<div class="page-break"></div>'), 'ERROR: Encontrado div class="page-break" residual');
assert.ok(!htmlFull.includes('page-break-after: always !important;'), 'ERROR: Encontrado page-break-after: always indiscriminado');

// Verify orphan prevention rules exist
assert.ok(htmlFull.includes('break-after: avoid'), 'ERROR: Falta regla break-after: avoid para títulos');
assert.ok(htmlFull.includes('orphans: 3'), 'ERROR: Falta regla orphans: 3 para títulos');

// Verify table layout rules exist
assert.ok(htmlFull.includes('table-layout: auto'), 'ERROR: Falta table-layout auto');
assert.ok(htmlFull.includes('thead {\n            display: table-header-group !important;'), 'ERROR: Falta thead repeating header rule');
assert.ok(htmlFull.includes('overflow-wrap: anywhere'), 'ERROR: Falta overflow-wrap anywhere');

// Verify all sections exist in the output
assert.ok(htmlFull.includes('Requerimientos de Producto (PRD &amp; SRS IEEE 830)'), 'Falta sección PRD');
assert.ok(htmlFull.includes('Arquitectura de Software &amp; Modelo C4'), 'Falta sección Arquitectura');
assert.ok(htmlFull.includes('Modelos de Datos &amp; Diccionario de Base de Datos'), 'Falta sección Base de Datos');
assert.ok(htmlFull.includes('Catálogo de APIs &amp; Especificación de Contratos'), 'Falta sección APIs');
assert.ok(htmlFull.includes('Auditoría DevSecOps &amp; Seguridad de Código (SAST)'), 'Falta sección Seguridad');
console.log('  ✔ [PASS] HTML editorial generado con 0 saltos ciegos y reglas completas contra huérfanos y desborde');

// Test Case 4: Scope filtering (PRD, Architecture, Security)
console.log('Test 4: Filtrado individual por documento (PRD, Arquitectura, Seguridad)...');
const htmlPrd = buildDocumentHtml(mockFullAnalysis, 'prd');
assert.ok(htmlPrd.includes('Requerimientos de Producto (PRD &amp; SRS IEEE 830)'));
assert.ok(!htmlPrd.includes('Arquitectura de Software &amp; Modelo C4'), 'El filtro individual no debe incluir otras secciones');

const htmlSec = buildDocumentHtml(mockFullAnalysis, 'sec');
assert.ok(htmlSec.includes('Auditoría DevSecOps &amp; Seguridad de Código (SAST)'));
assert.ok(!htmlSec.includes('Catálogo de APIs &amp; Especificación de Contratos'));
console.log('  ✔ [PASS] Exportación individual de documentos filtra con exactitud');

// Test Case 5: Markdown export
console.log('Test 5: Exportación a Markdown limpio...');
const mdFull = getDocumentMarkdown(mockFullAnalysis, 'all');
assert.ok(mdFull.includes('# expressjs/express — Documentación Técnica de Software'));
assert.ok(mdFull.includes('Fast, unopinionated, minimalist web framework'));
assert.ok(mdFull.includes('## Arquitectura de Software & Modelo C4'));
assert.ok(mdFull.includes('## Catálogo de APIs & Endpoints'));

const mdPrd = getDocumentMarkdown(mockFullAnalysis, 'prd');
assert.ok(mdPrd.includes('Fast, unopinionated, minimalist web framework'));
assert.ok(!mdPrd.includes('## Arquitectura de Software & Modelo C4'));
console.log('  ✔ [PASS] Generación de Markdown limpio y filtrado validado');

// Test Case 6: Diagnostic quality analyzer
console.log('Test 6: Analizador diagnóstico de calidad para vista previa...');
const metrics = analyzeLayoutQuality(mockFullAnalysis, 'all');
assert.ok(metrics.pageEstimate >= 2, 'Estimación de páginas debe ser coherente');
assert.strictEqual(metrics.qualityScore, 100);
assert.strictEqual(metrics.emptySectionsCount, 0);
console.log(`  ✔ [PASS] Diagnóstico: ~${metrics.pageEstimate} páginas estimadas, 0 secciones vacías, calidad ${metrics.qualityScore}%`);

console.log('============================================================');
console.log('🎉 TODAS LAS PRUEBAS DEL MOTOR DE EXPORTACIÓN Y PAGINACIÓN PASARON (6/6)');
