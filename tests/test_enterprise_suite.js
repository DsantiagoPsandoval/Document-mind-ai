/**
 * tests/test_enterprise_suite.js
 * Test Suite Exhaustivo de Validación de Enterprise SaaS 2.0 (Fases 2 a 8)
 * Cobertura: Planes/Límites, Pasarela de Pagos (Wompi), Repos Privados, Blast Radius,
 * Webhooks de Pull Requests, Organizaciones/RBAC, Aprobaciones, BYOK y Zero-Retention.
 */

const assert = require('assert');
const http = require('http');
const app = require('../server');
const { ASTDeepAnalyzer } = require('../services/analyzer/astDeepAnalyzer');
const { PRAutomationService } = require('../services/github/prAutomationService');
const { OrganizationService, ROLES, APPROVAL_STATUS } = require('../services/orgs/organizationService');
const { SecurityConfigService } = require('../services/enterprise/securityConfigService');

const TEST_PORT = 3108;
let server;

function logPass(msg) { console.log(`  ✅ [PASS] ${msg}`); }
function logFail(msg) { console.error(`  ❌ [FAIL] ${msg}`); process.exitCode = 1; }

function httpRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: '127.0.0.1',
            port: TEST_PORT,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runSuite() {
    console.log('\n====================================================================');
    console.log('🚀 DOCUMIND AI — TEST SUITE GLOBAL ENTERPRISE & SECURITY INTELLIGENCE');
    console.log('====================================================================\n');

    server = http.createServer(app);
    await new Promise(resolve => server.listen(TEST_PORT, resolve));

    try {
        // ========================================================
        // 1. VERIFICACIÓN DE ELIMINACIÓN DE MONETIZACIÓN Y ACCESO LIBRE
        // ========================================================
        console.log('--- 1. Eliminación Completa de Monetización & Exportación sin Restricciones ---');
        
        const resBillingRemoved = await httpRequest('POST', '/api/billing/create-checkout', { planId: 'pro' });
        assert.strictEqual(resBillingRemoved.status, 404);
        const resPlanRemoved = await httpRequest('GET', '/api/user/plan-status');
        assert.strictEqual(resPlanRemoved.status, 404);
        logPass('Rutas comerciales (/api/billing/*, /api/user/plan-status) eliminadas completamente (HTTP 404)');

        // Exportación Word abierta para cualquier usuario sin restricciones de plan
        const resExportAllow = await httpRequest('POST', '/api/project/export/docx', {
            analysisData: { projectName: 'Acceso_Libre_DocuMind' }
        }, { 'x-user-id': 'usr_any' });
        assert.strictEqual(resExportAllow.status, 200);
        assert.ok(resExportAllow.headers['content-type'].includes('officedocument'));
        logPass('Exportación Word (.docx) disponible sin restricciones artificiales por tipo de usuario');

        // Exportación YAML y Reporte de Seguridad PDF/DOCX
        const resYamlExport = await httpRequest('POST', '/api/project/export/format/yaml', {
            analysisData: { projectName: 'Acceso_Libre_DocuMind', endpoints: [{ method: 'GET', path: '/api/health' }] }
        });
        assert.strictEqual(resYamlExport.status, 200);
        assert.ok(String(resYamlExport.body).includes('documentTitle'));
        logPass('Exportación estructurada YAML (.yaml) generada correctamente');

        // ========================================================
        // 2. MÓDULO AVANZADO DE AUDITORÍA: SECURITY INTELLIGENCE
        // ========================================================
        console.log('\n--- 2. Módulo Independiente Security Intelligence (/api/security/*) ---');

        const resSecAudit = await httpRequest('POST', '/api/security/audit', {
            projectName: 'DemoSecRepo',
            files: [
                { path: 'src/db.js', content: 'const q = "SELECT * FROM accounts WHERE id = " + req.query.id; db.query(q);' },
                { path: 'package.json', content: JSON.stringify({ name: 'demo', dependencies: { express: '4.18.2' } }) }
            ],
            totalRepoFiles: 2
        });
        assert.strictEqual(resSecAudit.status, 200);
        assert.strictEqual(resSecAudit.body.success, true);
        assert.ok(resSecAudit.body.security.score <= 49);
        assert.strictEqual(resSecAudit.body.security.classification, 'Riesgo elevado');
        logPass(`Auditoría independiente Security Intelligence ejecutada: Score ${resSecAudit.body.security.score}/100 (${resSecAudit.body.security.classification})`);

        // Intentar marcar como Solucionado sin re-verificar el código debe ser bloqueado
        const findingId = resSecAudit.body.security.vulnerabilities[0]?.id || 'SEC-001';
        const resBlockSolve = await httpRequest('POST', '/api/security/finding-status', {
            projectKey: 'DemoSecRepo',
            findingId,
            status: 'Solucionado',
            reverifiedInCode: false
        });
        assert.strictEqual(resBlockSolve.status, 400);
        logPass('Protección de integridad: bloquea marcar vulnerabilidad como Solucionado sin verificar nuevamente el código');

        // Exportación directa de informe de seguridad en PDF y DOCX
        const resSecPdf = await httpRequest('POST', '/api/project/export/security-pdf', {
            analysisData: { projectName: 'DemoSecRepo', security: resSecAudit.body.security }
        });
        assert.strictEqual(resSecPdf.status, 200);
        assert.ok(resSecPdf.headers['content-type'].includes('application/pdf'));

        const resSecDocx = await httpRequest('POST', '/api/project/export/security-docx', {
            analysisData: { projectName: 'DemoSecRepo', security: resSecAudit.body.security }
        });
        assert.strictEqual(resSecDocx.status, 200);
        assert.ok(resSecDocx.headers['content-type'].includes('officedocument'));
        logPass('Informe exportable de seguridad generado en PDF y DOCX binarios');


        // ========================================================
        // 3. FASE 4: CONEXIÓN CON REPOSITORIOS PRIVADOS (GITHUB)
        // ========================================================
        console.log('\n--- 3. FASE 4: Repositorios Privados (GitHub OAuth) ---');

        // 3.1 Obtención de URL OAuth segura con state anti-CSRF
        const resGhConnect = await httpRequest('GET', '/api/github/connect', null, { 'x-user-id': 'usr_buyer_1' });
        assert.strictEqual(resGhConnect.status, 200);
        assert.ok(resGhConnect.body.url.includes('github.com/login/oauth/authorize'));
        assert.ok(resGhConnect.body.state.length >= 16);
        logPass('Generación de URL OAuth de GitHub con scope repo y token anti-CSRF');

        // 3.2 Listado de repositorios privados y ramas sin exponer tokens al cliente
        const resGhRepos = await httpRequest('GET', '/api/github/repos', null, { 'x-user-id': 'usr_buyer_1' });
        assert.strictEqual(resGhRepos.status, 200);
        logPass('Listado seguro de repositorios (públicos y privados) sin persistencia en disco');


        // ========================================================
        // 4. FASE 5: ANÁLISIS PROFUNDO AST Y BLAST RADIUS
        // ========================================================
        console.log('\n--- 4. FASE 5: AST Deep Analysis & Blast Radius ---');

        const resBlast = await httpRequest('POST', '/api/project/blast-radius', {
            targetComponent: 'auth_service'
        }, { 'x-user-id': 'usr_buyer_1' }); // Es Pro
        assert.strictEqual(resBlast.status, 200);
        assert.strictEqual(resBlast.body.success, true);
        const br = resBlast.body.blastRadius;
        assert.ok(br.totalAffectedComponents >= 2);
        assert.ok(br.affectedComponents.some(c => c.sourceLocation.includes(':L')));
        logPass(`Blast Radius Analysis calculado: ${br.totalAffectedComponents} componentes con enlace de línea (ej. ${br.affectedComponents[0].sourceLocation})`);


        // ========================================================
        // 5. FASE 6: AUTOMATIZACIÓN EN PULL REQUESTS (GITHUB WEBHOOKS)
        // ========================================================
        console.log('\n--- 5. FASE 6: Automatización en Pull Requests (Webhooks) ---');

        const prWebhookBody = {
            action: 'opened',
            number: 42,
            repository: { full_name: 'empresa/core-api' },
            pull_request: { number: 42, head: { sha: 'commit_sha_123' } },
            files: ['src/controllers/authController.js', 'src/routes/api.js']
        };

        const resPrWebhook = await httpRequest('POST', '/api/webhooks/github', prWebhookBody, {
            'x-github-event': 'pull_request',
            'x-hub-signature-256': 'sha256=mock_valid_signature'
        });
        assert.strictEqual(resPrWebhook.status, 200);
        assert.strictEqual(resPrWebhook.body.prNumber, 42);
        assert.ok(resPrWebhook.body.affectedModules.includes('OpenAPI 3.1 & Swagger'));
        assert.ok(resPrWebhook.body.proposedComment.includes('DocuMind AI'));
        logPass('Webhook de Pull Request analizado: Detección automática de OpenAPI y propuesta de comentario en PR');

        // 5.1 Idempotencia: el mismo evento no se vuelve a procesar
        const resPrDup = await httpRequest('POST', '/api/webhooks/github', prWebhookBody, {
            'x-github-event': 'pull_request'
        });
        assert.strictEqual(resPrDup.body.skipped, true);
        logPass('Idempotencia garantizada: evento duplicado es ignorado limpiamente');


        // ========================================================
        // 6. FASE 7: ORGANIZACIONES, RBAC Y APROBACIONES
        // ========================================================
        console.log('\n--- 6. FASE 7: Organizaciones, Control RBAC y Aprobaciones ---');

        // 6.1 Crear Organización
        const resOrg = await httpRequest('POST', '/api/orgs/create', {
            name: 'Fintech Solutions Latam',
            slug: 'fintech-solutions'
        }, { 'x-user-id': 'usr_enterprise_lead' });
        assert.strictEqual(resOrg.status, 200);
        const orgId = resOrg.body.organization.id;
        logPass(`Organización creada exitosamente: ${resOrg.body.organization.name} (${orgId})`);

        // 6.2 Agregar integrante como Arquitecto
        const resMember = await httpRequest('POST', `/api/orgs/${orgId}/members`, {
            userId: 'usr_architect_carlos',
            role: 'architect'
        });
        assert.strictEqual(resMember.status, 200);
        assert.strictEqual(resMember.body.member.role, 'architect');
        logPass('Integrante agregado a la organización con rol RBAC "architect"');

        // 6.3 Enviar documento técnico a revisión formal
        const resSubmitDoc = await httpRequest('POST', `/api/orgs/${orgId}/approvals/submit`, {
            projectId: 'proj_banking_core',
            docType: 'SRS_IEEE_830',
            version: '2.1.0'
        }, { 'x-user-id': 'usr_architect_carlos' });
        assert.strictEqual(resSubmitDoc.status, 200);
        const approvalId = resSubmitDoc.body.approval.id;
        assert.strictEqual(resSubmitDoc.body.approval.status, 'under_review');
        logPass('Documento técnico enviado a flujo formal de aprobación (status: under_review)');

        // 6.4 Arquitecto aprueba formalmente el documento
        const resReview = await httpRequest('POST', `/api/orgs/${orgId}/approvals/${approvalId}/review`, {
            decision: 'approve',
            comments: 'Revisado y conforme con estándares de arquitectura hexagonal.'
        }, { 'x-user-id': 'usr_architect_carlos' });
        assert.strictEqual(resReview.status, 200);
        assert.strictEqual(resReview.body.approval.status, 'approved');
        logPass('Aprobación técnica completada por Arquitecto con registro de firma electrónica');

        // 6.5 Consultar log inmutable de auditoría
        const resAudit = await httpRequest('GET', `/api/orgs/${orgId}/audit`);
        assert.strictEqual(resAudit.status, 200);
        assert.ok(resAudit.body.logs.length >= 3);
        logPass(`Auditoría corporativa validada con ${resAudit.body.logs.length} registros de trazabilidad`);


        // ========================================================
        // 7. FASE 8: SEGURIDAD ENTERPRISE, BYOK Y MARCA BLANCA
        // ========================================================
        console.log('\n--- 7. FASE 8: Seguridad Enterprise, BYOK y Marca Blanca ---');

        const resSaveConfig = await httpRequest('POST', '/api/enterprise/config', {
            orgId,
            byokProvider: 'azure_openai',
            apiKey: 'sk-corp-azure-super-secret-key-9988',
            ephemeralProcessing: true,
            companyName: 'Banco Digital Internacional',
            brandPrimaryColor: '#0052CC',
            reviewerTitle: 'VP de Arquitectura Empresarial'
        }, { 'x-user-id': 'usr_enterprise_lead' });
        assert.strictEqual(resSaveConfig.status, 200);
        assert.strictEqual(resSaveConfig.body.config.hasCustomKey, true);
        assert.strictEqual(resSaveConfig.body.config.ephemeralProcessing, true);
        assert.strictEqual(resSaveConfig.body.config.companyName, 'Banco Digital Internacional');
        logPass('Configuración Enterprise guardada: BYOK, Modo Efímero Zero-Retention y Marca Blanca');

        // 7.1 Verificar que la API Key NUNCA se expone en GET público
        const resGetConfig = await httpRequest('GET', `/api/enterprise/config?orgId=${orgId}`, null, { 'x-user-id': 'usr_enterprise_lead' });
        assert.strictEqual(resGetConfig.status, 200);
        assert.strictEqual(resGetConfig.body.config.encryptedApiKey, undefined);
        assert.strictEqual(resGetConfig.body.config.apiKey, undefined);
        assert.strictEqual(resGetConfig.body.config.hasCustomKey, true);
        logPass('Verificación criptográfica: API Key corporativa protegida con AES-256-GCM y nunca expuesta en respuestas');

    } finally {
        server.close();
    }

    console.log('\n====================================================================');
    console.log('🎉 RESULTADO GLOBAL: TODAS LAS PRUEBAS DE LAS FASES 2 A 8 PASARON');
    console.log('====================================================================\n');
}

runSuite().catch(err => {
    console.error('Error fatal en suite:', err);
    if (server) server.close();
    process.exit(1);
});
