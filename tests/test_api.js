/**
 * DOCUMENT-MIND AI — COMPREHENSIVE AUTOMATED TEST SUITE
 * Verifies document parser, GitHub analyzer, secret sanitizer, file classifier,
 * local AST analyzer, cache service, documentation generator, export service, and server API endpoints.
 */

const assert = require('assert');
const http = require('http');
const path = require('path');

const { parseDocument, validateFile } = require('../services/documents/parser');
const { parseGitHubUrl, detectTechnologies, buildTreeDiagram } = require('../services/github/analyzer');
const { analyzeDocument, chatWithDocument, analyzeRepository, chatWithRepository } = require('../services/ai/gemini');
const { sanitizeContent, sanitizeEnvFile } = require('../services/analyzer/sanitizer');
const { classifyFile, shouldIgnoreFile, computeFileHash, CATEGORIES } = require('../services/analyzer/fileClassifier');
const {
    detectLanguages,
    detectFrameworks,
    detectDatabases,
    extractEndpoints,
    extractDataModels,
    buildProjectMap
} = require('../services/analyzer/localAnalyzer');
const {
    setCachedAnalysis,
    getCachedAnalysis,
    getTargetedChatContext,
    compareAnalyses
} = require('../services/analyzer/cacheService');
const { generateDocumentationSuite } = require('../services/analyzer/docGenerator');
const { createDocumentationZip } = require('../services/analyzer/exportService');
const { scanFileForSecrets, scanProjectSecrets, redactAllSecrets, maskToken } = require('../services/analyzer/security/secretScanner');
const { analyzeStaticRules, SAST_RULES } = require('../services/analyzer/security/staticRules');
const { calculateSecurityScore } = require('../services/analyzer/security/scoreCalculator');
const { generateStrideThreatModel } = require('../services/analyzer/security/threatModeler');
const { generateSecurityRequirements } = require('../services/analyzer/security/requirementsGenerator');
const { runSecurityAnalysis } = require('../services/analyzer/securityAnalyzer');
const { extractSafeZipFiles, sanitizeZipEntryPath } = require('../services/analyzer/safeZip');
const {
    PRESET_SCENARIOS,
    validateSimulationInput,
    runArchitectureSimulation,
    runMultiScenarioComparison,
    saveSimulationRun,
    getSimulationHistory,
    generateSimulationMarkdownReport
} = require('../services/simulator/architectureSimulator');
const app = require('../server');

async function runTests() {
    console.log('\n🧪 INICIANDO SUITE DE PRUEBAS COMPLETA — DOCUMENT-MIND AI\n' + '='.repeat(60));
    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        return (async () => {
            try {
                await fn();
                console.log(`  ✔ [PASS] ${name}`);
                passed++;
            } catch (err) {
                console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
                failed++;
            }
        })();
    }

    // ============================================================
    // 1. Secret Sanitizer & Security Tests (Rule 6)
    // ============================================================
    await test('Sanitizador: enmascara variables en archivos .env preservando estructura', () => {
        const fakeKey = ['AQ', 'Ab8RN6J89ajEUhHD0fuWrQS4D901AZW3FLYUtbzWoc1xi5Ypuw'].join('.');
        const rawEnv = `
PORT=3000
DATABASE_URL=postgres://admin:supersecret123@localhost:5432/mydb
GEMINI_API_KEY=${fakeKey}
JWT_SECRET=myjwtsecretstring999
        `;
        const res = sanitizeEnvFile(rawEnv);
        assert.ok(!res.sanitizedContent.includes('supersecret123'), 'Debe ocultar la contraseña de DB');
        assert.ok(!res.sanitizedContent.includes(fakeKey), 'Debe ocultar la clave Gemini');
        assert.ok(!res.sanitizedContent.includes('myjwtsecretstring999'), 'Debe ocultar el JWT secret');
        assert.ok(res.sanitizedContent.includes('DATABASE_URL=********'));
        assert.ok(res.sanitizedContent.includes('GEMINI_API_KEY=********'));
        assert.strictEqual(res.detectedVariables.length, 4);
    });

    await test('Sanitizador: enmascara claves privadas y tokens Bearer en código fuente', () => {
        const codeSnippet = `
const auth = "Bearer a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
const connection = "mongodb://user:myPass123@cluster0.mongodb.net/app";
        `;
        const clean = sanitizeContent(codeSnippet);
        assert.ok(!clean.includes('myPass123'), 'Debe ocultar contraseña en mongodb string');
        assert.ok(!clean.includes('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'), 'Debe enmascarar token Bearer');
    });

    // ============================================================
    // 2. File Classifier & Ignored Files (Rule 5, 8, 9)
    // ============================================================
    await test('Clasificador: identifica carpetas que deben ser ignoradas estrictamente', () => {
        assert.strictEqual(shouldIgnoreFile('node_modules/express/index.js'), true);
        assert.strictEqual(shouldIgnoreFile('.git/HEAD'), true);
        assert.strictEqual(shouldIgnoreFile('dist/bundle.js'), true);
        assert.strictEqual(shouldIgnoreFile('build/static/main.js'), true);
        assert.strictEqual(shouldIgnoreFile('package-lock.json'), true);
        assert.strictEqual(shouldIgnoreFile('assets/logo.png'), true);
        assert.strictEqual(shouldIgnoreFile('src/components/Header.jsx'), false);
    });

    await test('Clasificador: asigna correctamente las 16 categorías de ingeniería de software', () => {
        assert.strictEqual(classifyFile('src/routes/api.js'), CATEGORIES.API);
        assert.strictEqual(classifyFile('src/models/User.js'), CATEGORIES.MODEL);
        assert.strictEqual(classifyFile('src/controllers/authController.js'), CATEGORIES.AUTHENTICATION);
        assert.strictEqual(classifyFile('Dockerfile'), CATEGORIES.DEVOPS);
        assert.strictEqual(classifyFile('tests/unit.test.js'), CATEGORIES.TEST);
        assert.strictEqual(classifyFile('README.md'), CATEGORIES.DOCUMENTATION);
        assert.strictEqual(classifyFile('src/components/Button.tsx'), CATEGORIES.COMPONENT);
        assert.strictEqual(classifyFile('package.json'), CATEGORIES.CONFIGURATION);
    });

    await test('Hashing: genera hash SHA-256 consistente para optimización de tokens', () => {
        const hash1 = computeFileHash('console.log("hello world");');
        const hash2 = computeFileHash('console.log("hello world");');
        const hash3 = computeFileHash('console.log("different");');
        assert.strictEqual(hash1, hash2);
        assert.notStrictEqual(hash1, hash3);
        assert.strictEqual(hash1.length, 16);
    });

    // ============================================================
    // 3. Local AST & Heuristics Analyzer (Rule 7, 49)
    // ============================================================
    await test('Analizador Local: detecta lenguajes y frameworks a partir de manifiestos y código', () => {
        const files = [
            { path: 'package.json', size: 500 },
            { path: 'src/App.tsx', size: 2000 },
            { path: 'src/server.ts', size: 1500 }
        ];
        const pkg = { dependencies: { react: '^18.0.0', express: '^4.18.0', '@prisma/client': '^5.0.0' } };
        const langs = detectLanguages(files);
        assert.ok(langs.includes('TypeScript (React)') || langs.includes('TypeScript'));

        const frameworks = detectFrameworks({ 'package.json': pkg }, files);
        assert.ok(frameworks.includes('React'));
        assert.ok(frameworks.includes('Express'));

        const dbs = detectDatabases({ 'package.json': pkg }, files);
        assert.ok(dbs.includes('Prisma ORM'));
    });

    await test('Analizador Local: extrae endpoints HTTP estáticamente sin ejecutar código', () => {
        const mockCode = `
const express = require('express');
const router = express.Router();
router.get('/users', authMiddleware, (req, res) => res.json([]));
router.post('/users/:id/activate', (req, res) => res.json({ ok: true }));
app.delete('/items/:id', (req, res) => res.send());
        `;
        const endpoints = extractEndpoints([{ path: 'src/routes.js', content: mockCode }]);
        assert.strictEqual(endpoints.length, 3);
        assert.ok(endpoints.some(e => e.method === 'GET' && e.path === '/users'));
        assert.ok(endpoints.some(e => e.method === 'POST' && e.path === '/users/:id/activate'));
        assert.ok(endpoints.some(e => e.method === 'DELETE' && e.path === '/items/:id'));
    });

    await test('Analizador Local: extrae tablas y esquemas SQL sin conexión a base de datos', () => {
        const sql = `
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP
);
        `;
        const models = extractDataModels([{ path: 'schema.sql', content: sql }]);
        assert.strictEqual(models.length, 1);
        assert.strictEqual(models[0].name, 'users');
        assert.strictEqual(models[0].fields.length, 3);
        assert.ok(models[0].fields.some(f => f.name === 'id' && f.isPk));
    });

    // ============================================================
    // 4. Cache Service & Targeted Slicing (Rule 11, 42, 43)
    // ============================================================
    await test('Caché & Memoria: almacena y recupera análisis estructurados', () => {
        const mockAnalysis = {
            projectId: 'test-project-123',
            projectName: 'MyTestProject',
            stats: { totalFiles: 10 },
            detectedTechnologies: ['Node.js', 'PostgreSQL'],
            projectMap: {
                database: { models: ['users', 'orders'] },
                auth: { files: ['src/auth.js'] }
            }
        };
        setCachedAnalysis('test-project-123', mockAnalysis);
        const retrieved = getCachedAnalysis('test-project-123');
        assert.strictEqual(retrieved.projectName, 'MyTestProject');

        // Verify targeted slicing for database questions
        const dbSlice = getTargetedChatContext(retrieved, '¿Qué base de datos utiliza el sistema?');
        assert.ok(dbSlice.includes('SECCIÓN BASE DE DATOS'));
        assert.ok(dbSlice.includes('PostgreSQL'));
    });

    await test('Comparador de Versiones: detecta adiciones y eliminaciones entre dos análisis', () => {
        const oldVer = {
            classifiedFiles: [{ path: 'src/index.js' }],
            endpoints: [{ method: 'GET', path: '/users' }],
            dataModels: [{ name: 'User' }]
        };
        const newVer = {
            classifiedFiles: [{ path: 'src/index.js' }, { path: 'src/services/billing.js' }],
            endpoints: [{ method: 'GET', path: '/users' }, { method: 'POST', path: '/checkout' }],
            dataModels: [{ name: 'User' }, { name: 'Order' }]
        };
        const diff = compareAnalyses(oldVer, newVer);
        assert.strictEqual(diff.totalChanges, 3);
        assert.ok(diff.diffs.some(d => d.type === 'added' && d.text.includes('billing.js')));
        assert.ok(diff.diffs.some(d => d.type === 'added' && d.text.includes('/checkout')));
        assert.ok(diff.diffs.some(d => d.type === 'added' && d.text.includes('Order')));
    });

    // ============================================================
    // 5. Documentation Suite & Mermaid Generator (Rule 12 to 28)
    // ============================================================
    await test('Generador Documental: genera PRD, SRS, C4, OpenAPI y Diagramas Mermaid estructurados', async () => {
        const ctx = {
            projectName: 'BillingService',
            repoDescription: 'Microservicio de facturación y cobros electrónicos.',
            detectedLanguages: ['TypeScript', 'JavaScript'],
            detectedFrameworks: ['Express', 'Node.js'],
            detectedDatabases: ['PostgreSQL'],
            detectedInfra: ['Docker', 'GitHub Actions'],
            endpoints: [
                { method: 'POST', path: '/api/v1/charge', file: 'src/routes.ts', requiresAuth: true },
                { method: 'GET', path: '/api/v1/invoices', file: 'src/routes.ts', requiresAuth: true }
            ],
            dataModels: [
                { name: 'Invoice', fields: [{ name: 'id', type: 'UUID', isPk: true }, { name: 'amount', type: 'DECIMAL' }] }
            ],
            treeDiagram: '├── src\n│   └── routes.ts',
            keyFiles: [{ path: 'src/routes.ts', content: 'router.post("/api/v1/charge")' }]
        };

        const docSuite = await generateDocumentationSuite(ctx);
        assert.ok(docSuite.product && (docSuite.product.prd.includes('BillingService') || docSuite.product.prd.length > 50));
        assert.ok(docSuite.product.srs.includes('Requisitos Funcionales'));
        assert.ok(docSuite.architecture && docSuite.architecture.c4Container);
        assert.ok(docSuite.diagrams && (docSuite.diagrams.c4Mermaid.includes('flowchart') || docSuite.diagrams.c4Mermaid.includes('C4Context') || docSuite.diagrams.c4Mermaid.includes('graph')));
        assert.ok(docSuite.diagrams.erdMermaid.includes('erDiagram'));
        assert.ok(docSuite.database && docSuite.database.dataDictionary.length > 0);
        assert.ok(docSuite.api && docSuite.api.endpoints.length === 2);
        assert.ok(docSuite.api.openApiJson && docSuite.api.openApiJson.openapi === '3.0.3');
        assert.ok(docSuite.devops && docSuite.devops.ciCdPipeline.includes('GitHub Actions'));
        assert.ok(docSuite.qa && docSuite.qa.testCases.length > 0);
        assert.ok(docSuite.development && (docSuite.development.readme.includes('BillingService') || docSuite.development.readme.length > 50));
    });

    await test('Exportador ZIP: genera archivo comprimido con árbol completo de carpetas', async () => {
        const sampleAnalysis = {
            projectName: 'DocuMindTest',
            documentation: {
                development: { readme: '# README', contributing: '# CONTRIBUTING' },
                product: { prd: '# PRD', srs: '# SRS' },
                architecture: { overview: 'Arquitectura' },
                database: { overview: 'Overview DB', dataDictionary: [{ table: 'users', field: 'id', type: 'UUID', required: true }] },
                api: { overview: 'API Overview', endpoints: [], openApiJson: { openapi: '3.0.3' } },
                diagrams: { c4Mermaid: 'flowchart TD\n A-->B' }
            }
        };

        const archive = createDocumentationZip(sampleAnalysis);
        assert.ok(archive && typeof archive.pipe === 'function');
    });

    // ============================================================
    // 6. Server Endpoints Integration Tests
    // ============================================================
    await test('Servidor Express: endpoint /api/health reporta estado saludable', async () => {
        const server = http.createServer(app);
        await new Promise((resolve) => server.listen(3095, resolve));
        try {
            const res = await fetch('http://localhost:3095/api/health');
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.status, 'healthy');
            assert.strictEqual(data.platform, 'Document-Mind AI');
        } finally {
            server.close();
        }
    });

    await test('Servidor Express: POST /api/project/analyze procesa texto manual y genera suite', async () => {
        const server = http.createServer(app);
        await new Promise((resolve) => server.listen(3094, resolve));
        try {
            const res = await fetch('http://localhost:3094/api/project/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName: 'TestAuthProject',
                    manualText: 'Proyecto backend en Express y PostgreSQL que implementa endpoints para login, registro y validación de tokens JWT con base de datos de usuarios.'
                })
            });
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.success, true);
            assert.ok(data.projectId);
            assert.ok(data.documentation);
            assert.ok(data.documentation.product.prd);
            assert.ok(data.documentation.diagrams.c4Mermaid);
        } finally {
            server.close();
        }
    });

    await test('Servidor Express: GET /api/project/export/zip/:projectId transmite archivo ZIP', async () => {
        const server = http.createServer(app);
        await new Promise((resolve) => server.listen(3093, resolve));
        try {
            // First analyze to seed cache
            const analyzeRes = await fetch('http://localhost:3093/api/project/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName: 'ZipTestApp',
                    manualText: 'Especificación de prueba para exportación de archivos ZIP con documentación técnica y diagramas.'
                })
            });
            const analyzeData = await analyzeRes.json();
            const pId = analyzeData.projectId;

            // Request ZIP download
            const zipRes = await fetch(`http://localhost:3093/api/project/export/zip/${pId}`);
            assert.strictEqual(zipRes.status, 200);
            assert.strictEqual(zipRes.headers.get('content-type'), 'application/zip');
            const buffer = await zipRes.arrayBuffer();
            assert.ok(buffer.byteLength > 100);
        } finally {
            server.close();
        }
    });

    await test('Servidor Express: POST /api/project/compare compara versiones estructurales', async () => {
        const server = http.createServer(app);
        await new Promise((resolve) => server.listen(3092, resolve));
        try {
            const res = await fetch('http://localhost:3092/api/project/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    oldAnalysis: { classifiedFiles: [{ path: 'a.js' }] },
                    newAnalysis: { classifiedFiles: [{ path: 'a.js' }, { path: 'b.js' }] }
                })
            });
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.success, true);
            assert.ok(data.comparison.diffs.some(d => d.text.includes('b.js')));
        } finally {
            server.close();
        }
    });

    await test('Secret Scanner: detecta claves Gemini, Bearer tokens y enmascara de forma segura', async () => {
        const fakeGcp = ['AIza', 'SyD9876543210ZYXWVUTSRQPONMLKJIHGFED'].join('');
        const dummyCode = `
            const geminiKey = "${fakeGcp}";
            const token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.validSignature1234567890abcdef";
        `;
        const results = scanFileForSecrets('config.js', dummyCode);
        assert.ok(results.length >= 2, `Debe detectar al menos 2 secretos, detectó ${results.length}`);
        
        const geminiFinding = results.find(r => (r.type || '').includes('Gemini') || (r.type || '').includes('API Key'));
        assert.ok(geminiFinding, 'Debe detectar la clave de Gemini');
        assert.ok(geminiFinding.maskedSecret.includes('****'), 'El secreto debe estar parcialmente enmascarado');
        assert.ok(!geminiFinding.maskedSecret.includes('9876543210ZYXW'), 'El secreto no debe contener la clave completa');

        // Test redaction
        const redacted = redactAllSecrets(dummyCode);
        assert.ok(!redacted.includes(fakeGcp), 'El texto redactado no debe incluir la clave en texto plano');
        assert.ok(redacted.includes('****') || redacted.includes('[REDACTED_'), 'Debe incluir placeholder o máscara de redacción');
    });

    await test('SAST Engine: detecta inyección SQL y eval inseguro con mapeo ASVS / OWASP', async () => {
        const vulnerableCode = `
            app.get('/user', (req, res) => {
                db.query("SELECT * FROM users WHERE id = '" + req.query.id + "'");
                eval(req.body.payload);
            });
        `;
        const findings = analyzeStaticRules([{ path: 'routes/users.js', content: vulnerableCode }]);
        assert.ok(findings.length >= 2, `Debe detectar al menos 2 vulnerabilidades SAST, detectó ${findings.length}`);
        
        const sqli = findings.find(f => f.ruleId === 'SAST-SQLI-001' || f.id === 'SAST-SQLI-001');
        assert.ok(sqli, 'Debe detectar SQL Injection');
        assert.strictEqual(sqli.severity, 'CRITICAL');
        assert.ok(sqli.owaspCategory.includes('A03'), 'Debe mapear a OWASP A03:2021');

        const evalFinding = findings.find(f => f.ruleId === 'SAST-EVAL-001' || f.id === 'SAST-EVAL-001');
        assert.ok(evalFinding, 'Debe detectar Remote Code Execution / eval');
    });

    await test('Score Calculator: calcula deducciones deterministas (-25 Crítico) y desglosa 8 dimensiones', async () => {
        const mockFindings = [
            { id: 'SAST-SQLI-001', severity: 'CRITICAL', name: 'SQL Injection', owaspCategory: 'A03:2021-Injection' },
            { id: 'SAST-CORS-001', severity: 'MEDIUM', name: 'Open CORS', owaspCategory: 'A10:2021-SSRF' },
            { type: 'Google / Gemini API Key', severity: 'CRITICAL', name: 'Secret: Gemini API Key' }
        ];

        const result = calculateSecurityScore(mockFindings, {});
        assert.ok(result.score < 100, 'El puntaje debe ser menor a 100 tras deducciones');
        assert.strictEqual(result.counts.critical, 2);
        assert.strictEqual(result.counts.medium, 1);
        assert.ok((100 - result.score) >= 50, 'Deducción total debe ser al menos 50 puntos');
        assert.ok(result.categoryScores.inputValidation < 100, 'Categoría inputValidation debe tener puntaje reducido');
        assert.ok(result.categoryScores.secretsManagement < 100, 'Categoría secretsManagement debe tener puntaje reducido');
    });

    await test('Threat Modeler: genera matriz STRIDE adaptada a los componentes de arquitectura', async () => {
        const projectMap = {
            frontend: { detected: true },
            backend: { detected: true },
            api: { detected: true }
        };
        const endpoints = [{ method: 'POST', path: '/api/login' }];
        const databases = ['PostgreSQL'];

        const tm = generateStrideThreatModel(projectMap, endpoints, databases);
        assert.ok(tm.threats.length >= 6, 'Debe generar amenazas para cada vector STRIDE');
        const categories = tm.threats.map(t => t.category);
        assert.ok(categories.some(v => v && v.includes('Spoofing')));
        assert.ok(categories.some(v => v && v.includes('Tampering')));
        assert.ok(categories.some(v => v && v.includes('Denial of Service')));
    });

    await test('Security Requirements: genera matriz de requisitos SEC-001... SEC-N estructurados', async () => {
        const findings = [
            { type: 'Secret: Gemini API Key', severity: 'CRITICAL' },
            { cwe: 'CWE-89', severity: 'CRITICAL', name: 'SQL Injection' }
        ];

        const reqs = generateSecurityRequirements(findings, {});
        assert.ok(reqs.length >= 5, 'Debe generar matriz con requisitos base y específicos');
        assert.strictEqual(reqs[0].id, 'SEC-001');
        assert.ok(reqs.some(r => r.id.startsWith('SEC-')));
        assert.ok(reqs.some(r => r.priority === 'CRITICAL'));
    });

    await test('SafeZip: bloquea path traversal (../evil.js) y extrae archivos en memoria con cuotas estrictas', async () => {
        // Test path traversal sanitization
        assert.strictEqual(sanitizeZipEntryPath('../../evil.js'), null, 'Path traversal debe devolver null');
        assert.strictEqual(sanitizeZipEntryPath('..\\..\\evil.js'), null, 'Backslash traversal debe devolver null');
        assert.strictEqual(sanitizeZipEntryPath('src/safe.js'), 'src/safe.js', 'Ruta segura debe ser preservada');

        const AdmZip = require('adm-zip');
        const zip = new AdmZip();
        
        // Add safe file
        zip.addFile('safe.js', Buffer.from('console.log("hello");', 'utf8'));
        // Add forbidden executable
        zip.addFile('malicious.exe', Buffer.from('MZBinaryExecutable', 'utf8'));

        const zipBuffer = zip.toBuffer();
        const extracted = extractSafeZipFiles(zipBuffer);

        assert.ok(extracted.some(f => f.path.includes('safe.js')), 'Debe extraer el archivo seguro');
        assert.ok(!extracted.some(f => f.path.includes('.exe')), 'No debe permitir ejecutables');
        assert.strictEqual(extracted.length, 1, 'Solo debe haber extraído 1 archivo válido');
    });

    await test('Analizador de Seguridad: análisis integral genera score, matriz STRIDE y reporte Markdown', async () => {
        const projectData = {
            repository: { name: 'DemoProject' },
            prioritizedFiles: [
                { path: 'server.js', content: 'app.get("/search", (req, res) => { const q = req.query.q; });' },
                { path: 'package.json', content: '{"name":"demo","dependencies":{"express":"4.18.2"}}' }
            ],
            endpoints: [{ method: 'GET', path: '/search' }],
            detectedDatabases: []
        };
        const secAudit = await runSecurityAnalysis(projectData);
        assert.ok(secAudit.score >= 0 && secAudit.score <= 100);
        assert.ok(secAudit.threatModel);
        assert.ok(secAudit.securityRequirements);
        assert.ok(secAudit.markdownReport.includes('Informe Técnico de Seguridad'));
        assert.ok(secAudit.jsonReport);
    });

    await test('Servidor Express: GET /api/project/export/security-json/:projectId exporta informe JSON', async () => {
        const mockAudit = {
            score: 92,
            grade: 'A',
            status: 'Excelente',
            summary: { totalFindings: 0, critical: 0, high: 0, medium: 0, low: 0, secretsFound: 0 },
            vulnerabilities: [],
            secrets: [],
            threatModel: { threats: [] },
            securityRequirements: []
        };
        setCachedAnalysis('test-sec-json-proj', { security: mockAudit });

        const server = http.createServer(app);
        await new Promise((resolve) => server.listen(3094, resolve));
        try {
            const res = await fetch('http://localhost:3094/api/project/export/security-json/test-sec-json-proj');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.headers.get('content-type'), 'application/json; charset=utf-8');
            const data = await res.json();
            assert.strictEqual(data.score, 92);
            assert.strictEqual(data.grade, 'A');
        } finally {
            server.close();
        }
    });

    await test('Servidor Express: GET /api/project/export/security-md/:projectId exporta informe Markdown', async () => {
        const mockAudit = {
            score: 88,
            grade: 'B',
            markdownReport: '# REPORTE EJECUTIVO DE SEGURIDAD\n\n**DocuMind AI DevSecOps**'
        };
        setCachedAnalysis('test-sec-md-proj', { security: mockAudit });

        const server = http.createServer(app);
        await new Promise((resolve) => server.listen(3095, resolve));
        try {
            const res = await fetch('http://localhost:3095/api/project/export/security-md/test-sec-md-proj');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.headers.get('content-type'), 'text/markdown; charset=utf-8');
            const text = await res.text();
            assert.ok(text.includes('# REPORTE EJECUTIVO DE SEGURIDAD'));
        } finally {
            server.close();
        }
    });

    // ============================================================
    // 7. ACTIVIDAD 9: SIMULADOR DE ARQUITECTURA (5 PRUEBAS FORMALES)
    // ============================================================
    await test('Simulador (TEST-SIM-01): Baja concurrencia / Nodo único recomienda Monolito por cero saltos RPC', () => {
        const res = runArchitectureSimulation({
            inputs: PRESET_SCENARIOS.SINGLE_MACHINE_LIGHT.inputs
        });
        const mono = res.alternatives.find(a => a.alternativeId === 'MONOLITH_MVC');
        const micro = res.alternatives.find(a => a.alternativeId === 'MICROSERVICES_K8S');
        assert.ok(mono.metrics.latencyMs < micro.metrics.latencyMs, 'En carga ligera, el monolito debe tener menor latencia que microservicios');
        assert.ok(mono.metrics.memoryUsageMb < micro.metrics.memoryUsageMb, 'El monolito debe consumir menos memoria base');
        assert.strictEqual(res.recommendation.recommendedId, 'MONOLITH_MVC');
    });

    await test('Simulador (TEST-SIM-02): Escala Empresarial degrada el Monolito y favorece arquitecturas distribuidas', () => {
        const res = runArchitectureSimulation({
            inputs: PRESET_SCENARIOS.ENTERPRISE_SCALE.inputs
        });
        const mono = res.alternatives.find(a => a.alternativeId === 'MONOLITH_MVC');
        const micro = res.alternatives.find(a => a.alternativeId === 'MICROSERVICES_K8S');
        assert.ok(mono.metrics.utilizationPct > 95, 'El monolito debe saturar su cola en alta concurrencia');
        assert.ok(micro.metrics.latencyMs < mono.metrics.latencyMs, 'Microservicios debe tener menor latencia que el monolito saturado');
        assert.notStrictEqual(res.recommendation.recommendedId, 'MONOLITH_MVC');
    });

    await test('Simulador (TEST-SIM-03): Estrés Extremo JMeter demuestra máxima resiliencia y disponibilidad en EDA', () => {
        const res = runArchitectureSimulation({
            inputs: PRESET_SCENARIOS.EXTREME_STRESS_PUSH.inputs
        });
        const eda = res.alternatives.find(a => a.alternativeId === 'EDA_SERVERLESS');
        const mono = res.alternatives.find(a => a.alternativeId === 'MONOLITH_MVC');
        assert.ok(eda.metrics.availabilityPct > mono.metrics.availabilityPct, 'EDA debe preservar mayor disponibilidad SLA bajo estrés');
        assert.strictEqual(res.recommendation.recommendedId, 'EDA_SERVERLESS');
    });

    await test('Simulador (TEST-SIM-04): Sensibilidad a restricciones presupuestarias penaliza alternativas costosas', () => {
        const res = runArchitectureSimulation({
            inputs: PRESET_SCENARIOS.BASELINE.inputs,
            projectConfig: {
                constraints: { maxMonthlyBudgetUsd: 45, maxMemoryGb: 8 }
            }
        });
        const micro = res.alternatives.find(a => a.alternativeId === 'MICROSERVICES_K8S');
        assert.strictEqual(micro.compliance.budgetOk, false, 'Microservicios ($115+ USD) debe incumplir presupuesto de $45 USD');
        assert.ok(micro.mcda.constraintPenalty >= 12, 'Debe aplicar penalización verificable al puntaje MCDA');
    });

    await test('Simulador (TEST-SIM-05): Control de entradas inválidas rechaza valores fuera de rango vía API y validador', async () => {
        const check = validateSimulationInput({
            inputs: { concurrentUsers: -20, payloadSizeMb: 55, repoComplexityFiles: 0, aiDepthFactor: 9, trafficBurstFactor: 8 }
        });
        assert.strictEqual(check.valid, false);
        assert.ok(check.errors.length >= 4);

        const server = http.createServer(app);
        await new Promise((resolve) => server.listen(3096, resolve));
        try {
            const badRes = await fetch('http://localhost:3096/api/simulator/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inputs: { concurrentUsers: -10, payloadSizeMb: 99 } })
            });
            assert.strictEqual(badRes.status, 400);
            const badData = await badRes.json();
            assert.strictEqual(badData.success, false);

            const okRes = await fetch('http://localhost:3096/api/simulator/scenarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            assert.strictEqual(okRes.status, 200);
            const okData = await okRes.json();
            assert.strictEqual(okData.success, true);
            assert.ok(okData.scenarios.BASELINE && okData.scenarios.EXTREME_STRESS_PUSH);
        } finally {
            server.close();
        }
    });

    await test('Simulador (TEST-SIM-06): Reproducibilidad determinista exacta bajo las mismas entradas y versión de modelo', () => {
        const runA = runArchitectureSimulation({ inputs: PRESET_SCENARIOS.BASELINE.inputs });
        const runB = runArchitectureSimulation({ inputs: PRESET_SCENARIOS.BASELINE.inputs });
        assert.strictEqual(runA.modelVersion, runB.modelVersion);
        assert.strictEqual(runA.recommendation.recommendedId, runB.recommendation.recommendedId);
        assert.strictEqual(runA.recommendation.score, runB.recommendation.score);
        assert.strictEqual(runA.alternatives[0].metrics.latencyMs, runB.alternatives[0].metrics.latencyMs);
    });

    await test('Simulador (TEST-SIM-07): Sensibilidad a la demanda (mayor concurrencia incrementa utilización y latencia)', () => {
        const lowDemand = runArchitectureSimulation({
            inputs: { concurrentUsers: 25, payloadSizeMb: 2.0, repoComplexityFiles: 60, aiDepthFactor: 2, trafficBurstFactor: 1.0 }
        });
        const highDemand = runArchitectureSimulation({
            inputs: { concurrentUsers: 180, payloadSizeMb: 2.0, repoComplexityFiles: 60, aiDepthFactor: 2, trafficBurstFactor: 1.0 }
        });
        const monoLow = lowDemand.alternatives.find(a => a.alternativeId === 'MONOLITH_MVC');
        const monoHigh = highDemand.alternatives.find(a => a.alternativeId === 'MONOLITH_MVC');
        assert.ok(monoHigh.metrics.utilizationPct > monoLow.metrics.utilizationPct, 'La utilización debe crecer cuando sube la demanda');
        assert.ok(monoHigh.metrics.latencyMs > monoLow.metrics.latencyMs, 'La latencia debe crecer por encolamiento M/M/c');
    });

    await test('Simulador (TEST-SIM-08): Detección de saturación cuando la demanda supera la capacidad efectiva', () => {
        const overload = runArchitectureSimulation({
            inputs: { concurrentUsers: 500, payloadSizeMb: 10.0, repoComplexityFiles: 300, aiDepthFactor: 3, trafficBurstFactor: 2.0 }
        });
        const mono = overload.alternatives.find(a => a.alternativeId === 'MONOLITH_MVC');
        assert.ok(mono.metrics.utilizationPct > 100, 'Debe detectar utilización > 100% (estado de saturación)');
        assert.strictEqual(mono.compliance.latencyOk, false, 'En saturación severa no debe dar por cumplido el SLA de latencia');
    });

    await test('Simulador (TEST-SIM-09): Persistencia inmutable de ejecuciones y exportación de informe Markdown', () => {
        const sim = runArchitectureSimulation({ inputs: PRESET_SCENARIOS.BASELINE.inputs });
        const saved = saveSimulationRun(sim, { projectId: 'proj-audit-99', scenarioName: 'Audit Run' });
        const history = getSimulationHistory('proj-audit-99');
        assert.ok(history.length >= 1);
        assert.strictEqual(history[0].runId, saved.runId);
        assert.strictEqual(history[0].inputs.concurrentUsers, PRESET_SCENARIOS.BASELINE.inputs.concurrentUsers);

        const md = generateSimulationMarkdownReport(sim);
        assert.ok(md.includes('# INFORME TÉCNICO DE SIMULACIÓN DE ARQUITECTURA'));
        assert.ok(md.includes('Monolito Modular MVC'));
    });

    await test('Simulador (TEST-SIM-10): Independencia total de Gemini y protección SSRF en URLs de GitHub', () => {
        const prevKey = process.env.GEMINI_API_KEY;
        process.env.GEMINI_API_KEY = '';
        try {
            const simOffline = runArchitectureSimulation({ inputs: PRESET_SCENARIOS.ENTERPRISE_SCALE.inputs });
            assert.ok(simOffline.recommendation && simOffline.recommendation.recommendedId);
            assert.strictEqual(simOffline.alternatives.length, 3);
        } finally {
            if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
        }

        // Verify SSRF block in parseGitHubUrl
        const ssrfCheck = parseGitHubUrl('http://169.254.169.254/latest/meta-data/');
        assert.strictEqual(ssrfCheck.valid, false);
        assert.ok(ssrfCheck.error.includes('SSRF'));
    });

    console.log('='.repeat(60));
    console.log(`RESULTADOS FINALES: ${passed} pruebas exitosas, ${failed} pruebas fallidas.\n`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
