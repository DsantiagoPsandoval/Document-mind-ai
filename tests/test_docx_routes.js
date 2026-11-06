/**
 * TEST SUITE: DOCX GENERATOR & EXPORT ROUTES
 * Validates Microsoft Word (.docx) generation, OpenXML package structure,
 * and API export endpoints.
 */

const assert = require('assert');
const http = require('http');
const app = require('../server');
const { generateWordDocumentBuffer } = require('../services/export/docxGenerator');

async function runTests() {
    console.log('🧪 Starting DOCX Generator & Export Routes test suite...\n');
    let passed = 0;
    let failed = 0;

    // Start ephemeral server
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    function report(name, fn) {
        return async () => {
            try {
                await fn();
                console.log(`  ✅ PASS: ${name}`);
                passed++;
            } catch (err) {
                console.error(`  ❌ FAIL: ${name}`);
                console.error(`     Error: ${err.message}`);
                failed++;
            }
        };
    }

    const sampleProject = {
        projectName: 'DocuMind_Hardened',
        repository: {
            name: 'DocuMind_Hardened',
            fullName: 'Org/DocuMind_Hardened',
            branch: 'feature/word-export',
            primaryLanguage: 'JavaScript'
        },
        detectedTechnologies: ['Node.js', 'Express', 'Supabase', 'Gemini AI'],
        stats: { relevantFilesCount: 38 },
        security: {
            score: 95,
            grade: 'A',
            riskLevel: 'BAJO',
            threatModel: {
                threats: [
                    { id: 'THR-01', category: 'Spoofing', component: 'Auth Gateway', scenario: 'Intento de falsificación JWT', recommendedControl: 'Validar firma HMAC SHA-256' }
                ]
            },
            securityRequirements: [
                { id: 'SEC-01', priority: 'Crítica', category: 'Secrets', description: 'Redacción automática en logs', status: 'Implementado' }
            ]
        },
        documentation: {
            product: {
                prd: '## 1. Resumen Ejecutivo\nPlataforma de generación documental con calidad editorial de Microsoft Word.\n\n## 2. Requisitos Funcionales\n| ID | Nombre | Prioridad |\n| :--- | :--- | :---: |\n| RF-1 | Exportar DOCX | Alta |\n| RF-2 | Estilos Word | Alta |\n'
            },
            architecture: {
                overview: 'Arquitectura basada en micro-servicios desacoplados.',
                c4Context: 'Diagrama de contexto que delimita el alcance del sistema.'
            },
            api: {
                endpoints: [
                    { method: 'GET', path: '/api/project/export/docx/:id', requiresAuth: false, description: 'Descarga archivo Word' },
                    { method: 'POST', path: '/api/project/export/docx', requiresAuth: false, description: 'Exporta documento personalizado' }
                ]
            },
            database: {
                dataDictionary: [
                    { table: 'documents', field: 'id', type: 'UUID', description: 'Identificador único', required: true, isPk: true },
                    { table: 'documents', field: 'title', type: 'VARCHAR', description: 'Título del documento', required: true, isPk: false }
                ]
            },
            qa: {
                testPlan: 'Plan exhaustivo con cobertura unitaria y de integración.',
                testCases: [
                    { id: 'TC-01', title: 'Generación DOCX sin errores', preconditions: 'Datos de análisis válidos', expectedResult: 'Buffer DOCX generado', status: 'Aprobado' }
                ]
            }
        }
    };

    // 1. Direct generator buffer test
    await report('DOCX Engine produces valid binary buffer for full suite', async () => {
        const buf = await generateWordDocumentBuffer(sampleProject, 'all');
        assert(Buffer.isBuffer(buf), 'Output must be a Buffer');
        assert(buf.length > 5000, `Buffer size too small: ${buf.length}`);
        // Check standard ZIP magic number PK (0x50, 0x4B, 0x03, 0x04)
        assert.strictEqual(buf[0], 0x50, 'Byte 0 must be 0x50 (P)');
        assert.strictEqual(buf[1], 0x4B, 'Byte 1 must be 0x4B (K)');
    })();

    // 2. Specialized scope test (PRD)
    await report('DOCX Engine produces specialized scoped document (PRD)', async () => {
        const buf = await generateWordDocumentBuffer(sampleProject, 'prd');
        assert(Buffer.isBuffer(buf), 'Output must be a Buffer');
        assert(buf.length > 3000, `Buffer size too small: ${buf.length}`);
    })();

    // 3. Custom edited document test
    await report('DOCX Engine renders custom user-edited sections', async () => {
        const customPayload = {
            projectName: 'EditedDoc',
            customDoc: {
                title: 'Informe Técnico Personalizado',
                sections: [
                    { title: 'Sección 1 Editada', content: 'Contenido personalizado guardado por el usuario.\n\n- Punto 1\n- Punto 2' },
                    { title: 'Sección 2 Editada', content: '| Parámetro | Valor |\n| :--- | :--- |\n| Estado | OK |' }
                ]
            }
        };
        const buf = await generateWordDocumentBuffer(customPayload, 'all');
        assert(Buffer.isBuffer(buf), 'Output must be a Buffer');
        assert(buf.length > 4000, 'Custom buffer should have valid size');
    })();

    // 4. API Endpoint GET 404 for invalid ID
    await report('GET /api/project/export/docx/:projectId returns 404 when project not cached', async () => {
        const res = await fetch(`${baseUrl}/api/project/export/docx/non-existent-proj-id`);
        assert.strictEqual(res.status, 404);
        const data = await res.json();
        assert.strictEqual(data.success, false);
    })();

    // 5. API Endpoint POST /api/project/export/docx
    await report('POST /api/project/export/docx generates downloadable docx file', async () => {
        const res = await fetch(`${baseUrl}/api/project/export/docx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectName: 'DocuMind_Live',
                analysisData: sampleProject,
                scope: 'all'
            })
        });

        assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
        const contentType = res.headers.get('content-type');
        assert(
            contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
            `Expected docx content-type, got: ${contentType}`
        );
        const contentDisposition = res.headers.get('content-disposition');
        assert(contentDisposition && contentDisposition.includes('.docx'), 'Should contain attachment filename .docx');

        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        assert(buf.length > 5000, `Received buffer too small: ${buf.length}`);
        assert.strictEqual(buf[0], 0x50);
        assert.strictEqual(buf[1], 0x4B);
    })();

    // Close server
    server.close();

    console.log(`\n========================================`);
    console.log(`DOCX Tests Completed: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
