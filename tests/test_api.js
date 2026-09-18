/**
 * DOCUMENT-MIND AI — COMPREHENSIVE AUTOMATED TEST SUITE
 * Verifies document parser, GitHub analyzer, AI fallback, and server endpoints.
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const { parseDocument, validateFile } = require('../services/documents/parser');
const { parseGitHubUrl, detectTechnologies } = require('../services/github/analyzer');
const { analyzeDocument, chatWithDocument } = require('../services/ai/gemini');
const app = require('../server');

async function runTests() {
    console.log('\n🧪 INICIANDO SUITE DE PRUEBAS — DOCUMENT-MIND AI\n' + '='.repeat(50));
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

    // 1. Parser Validation Tests
    await test('Validación: rechaza archivo nulo o vacío', () => {
        const res = validateFile(null);
        assert.strictEqual(res.valid, false);
    });

    await test('Validación: rechaza formato de archivo no permitido (.exe)', () => {
        const fakeFile = { originalname: 'malware.exe', size: 1024, buffer: Buffer.from('test') };
        const res = validateFile(fakeFile);
        assert.strictEqual(res.valid, false);
        assert.ok(res.error.includes('Formato no soportado'));
    });

    await test('Validación: rechaza archivo que excede 10 MB', () => {
        const bigFile = { originalname: 'large.pdf', size: 11 * 1024 * 1024, buffer: Buffer.from('test') };
        const res = validateFile(bigFile);
        assert.strictEqual(res.valid, false);
        assert.ok(res.error.includes('supera el tamaño máximo'));
    });

    await test('Extracción de Documento: procesa correctamente archivo TXT con métricas', async () => {
        const textContent = 'Document-Mind AI es una plataforma de ingeniería de software para documentación inteligente. Permite analizar repositorios de código y documentos técnicos mediante inteligencia artificial generativa y árboles sintácticos abstractos.';
        const txtFile = {
            originalname: 'documento_prueba.txt',
            size: Buffer.byteLength(textContent),
            buffer: Buffer.from(textContent)
        };
        const parsed = await parseDocument(txtFile);
        assert.strictEqual(parsed.filename, 'documento_prueba.txt');
        assert.strictEqual(parsed.extension, '.txt');
        assert.ok(parsed.wordCount > 15);
        assert.ok(parsed.charCount > 100);
        assert.strictEqual(parsed.pageCount, 1);
    });

    // 2. GitHub Analyzer Tests
    await test('GitHub: parsea correctamente URLs válidas en diversos formatos', () => {
        const r1 = parseGitHubUrl('https://github.com/facebook/react');
        assert.strictEqual(r1.valid, true);
        assert.strictEqual(r1.owner, 'facebook');
        assert.strictEqual(r1.repo, 'react');

        const r2 = parseGitHubUrl('github.com/nodejs/node.git');
        assert.strictEqual(r2.valid, true);
        assert.strictEqual(r2.owner, 'nodejs');
        assert.strictEqual(r2.repo, 'node');
    });

    await test('GitHub: rechaza URLs que no pertenecen a GitHub', () => {
        const res = parseGitHubUrl('https://gitlab.com/user/project');
        assert.strictEqual(res.valid, false);
    });

    await test('GitHub: detecta tecnologías basadas en package.json', () => {
        const fakePkg = {
            dependencies: {
                'react': '^18.0.0',
                'express': '^4.18.0',
                'tailwindcss': '^3.0.0'
            }
        };
        const techs = detectTechnologies({ 'package.json': fakePkg }, []);
        assert.ok(techs.includes('React'));
        assert.ok(techs.includes('Express'));
        assert.ok(techs.includes('Tailwind CSS'));
        assert.ok(techs.includes('Node.js'));
    });

    // 3. AI Service & Heuristic Fallback Tests
    await test('Servicio IA: genera análisis estructurado real (con o sin API key)', async () => {
        const sampleDoc = {
            filename: 'arquitectura.txt',
            text: 'En la arquitectura hexagonal, el dominio permanece desacoplado de los adaptadores perimetrales. Las solicitudes HTTP ingresan a través de controladores y son enviadas a los casos de uso. La persistencia se resuelve mediante repositorios implementados en la infraestructura.',
            pageCount: 1,
            wordCount: 35
        };
        const analysis = await analyzeDocument(sampleDoc);
        assert.ok(analysis.summary && analysis.summary.length > 10);
        assert.ok(Array.isArray(analysis.mainIdeas));
        assert.ok(Array.isArray(analysis.keyConcepts));
        assert.ok(analysis.explanations && analysis.explanations.basic);
        assert.ok(Array.isArray(analysis.studyQuestions));
    });

    await test('Chat Contextual: responde fundamentado en el texto del documento', async () => {
        const sampleText = 'Document-Mind AI utiliza Three.js para la representación gráfica del núcleo tridimensional en el Hero de la plataforma.';
        const res = await chatWithDocument(sampleText, [], '¿Qué tecnología utiliza para el núcleo 3D?');
        assert.ok(res && res.reply);
        assert.ok(res.reply.toLowerCase().includes('three.js') || res.reply.toLowerCase().includes('núcleo'));
    });

    // 4. Server Integration Endpoints Tests
    await test('Servidor Express: responde a /api/health con 200 y metadatos del sistema', async () => {
        const server = http.createServer(app);
        await new Promise((resolve) => server.listen(3099, resolve));

        try {
            const res = await fetch('http://localhost:3099/api/health');
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.status, 'healthy');
            assert.strictEqual(data.platform, 'Document-Mind AI');
        } finally {
            server.close();
        }
    });

    await test('Servidor Express: valida que /api/documents/analyze requiera un archivo', async () => {
        const server = http.createServer(app);
        await new Promise((resolve) => server.listen(3098, resolve));

        try {
            const res = await fetch('http://localhost:3098/api/documents/analyze', {
                method: 'POST'
            });
            assert.strictEqual(res.status, 400);
            const data = await res.json();
            assert.strictEqual(data.success, false);
            assert.ok(data.error.includes('archivo'));
        } finally {
            server.close();
        }
    });

    await test('Servidor Express: valida que /api/github/analyze rechace URLs vacías', async () => {
        const server = http.createServer(app);
        await new Promise((resolve) => server.listen(3097, resolve));

        try {
            const res = await fetch('http://localhost:3097/api/github/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl: '' })
            });
            assert.strictEqual(res.status, 400);
            const data = await res.json();
            assert.strictEqual(data.success, false);
        } finally {
            server.close();
        }
    });

    console.log('='.repeat(50));
    console.log(`RESULTADOS: ${passed} pruebas exitosas, ${failed} pruebas fallidas.\n`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
