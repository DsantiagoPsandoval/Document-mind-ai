/**
 * tests/test_private_repos.js
 * ============================================================================
 * Suite de Pruebas de Integración y Seguridad para Repositorios Públicos y
 * Privados de GitHub (Multi-Cuenta, Aislamiento, Permisos Mínimos y Revocación)
 * ============================================================================
 */

const assert = require('assert');
const http = require('http');
const app = require('../server');

const TEST_PORT = 3119;
let server;

function httpRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = http.request({
            hostname: '127.0.0.1',
            port: TEST_PORT,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
                ...headers
            }
        }, (res) => {
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

async function runTests() {
    console.log('\n====================================================================');
    console.log('🔒 TEST SUITE: REPOSITORIOS PÚBLICOS Y PRIVADOS DE GITHUB (MULTI-CUENTA)');
    console.log('====================================================================\n');

    server = http.createServer(app);
    await new Promise(resolve => server.listen(TEST_PORT, resolve));

    try {
        // --------------------------------------------------------------------
        // 1. AUTORIZACIÓN NATIVA GITHUB APP (SIN SCOPES, PRIORIDAD DE CLIENT_ID Y VALIDACIÓN REDIRECT_URI)
        // --------------------------------------------------------------------
        console.log('--- 1. Autorización Nativa GitHub App (Sin Scopes, Prioridad de Variables y Callback Exacto) ---');

        // 1.A Validación de error si falta Client ID (eliminación de fallback silencioso)
        const oldAppId = process.env.GITHUB_APP_CLIENT_ID;
        const oldClientId = process.env.GITHUB_CLIENT_ID;
        delete process.env.GITHUB_APP_CLIENT_ID;
        delete process.env.GITHUB_CLIENT_ID;

        const missingIdRes = await httpRequest('GET', '/api/github/connect', null, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(missingIdRes.status, 500, 'Debe devolver HTTP 500 si falta el Client ID de GitHub App');
        assert.ok(missingIdRes.body.error.includes('Client ID de GitHub App no configurado'), 'Debe devolver un mensaje de error claro');

        // 1.B Prioridad de variables: GITHUB_APP_CLIENT_ID tiene prioridad sobre GITHUB_CLIENT_ID
        process.env.GITHUB_CLIENT_ID = 'Iv1_legacy_oauth_id';
        process.env.GITHUB_APP_CLIENT_ID = 'Iv1.real_production_app_id';
        process.env.APP_URL = 'https://document-mind-ai.onrender.com';

        const connInit = await httpRequest('GET', '/api/github/connect', null, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(connInit.status, 200);

        // Validar que NO contiene el parámetro scope
        assert.strictEqual(connInit.body.url.includes('scope='), false, 'La URL de GitHub App NO debe incluir ningún scope');

        // Validar client_id con prioridad estricta a GITHUB_APP_CLIENT_ID
        assert.ok(connInit.body.url.includes('client_id=Iv1.real_production_app_id'), 'Debe utilizar con prioridad GITHUB_APP_CLIENT_ID');
        assert.strictEqual(connInit.body.url.includes('Iv1_legacy_oauth_id'), false, 'No debe utilizar la variable secundaria GITHUB_CLIENT_ID');

        // Validar redirect_uri exacto de Render
        const expectedCallback = encodeURIComponent('https://document-mind-ai.onrender.com/api/github/callback');
        assert.ok(connInit.body.url.includes(`redirect_uri=${expectedCallback}`), 'redirect_uri debe coincidir exactamente con https://document-mind-ai.onrender.com/api/github/callback');

        // Validar que se conserva el state anti-CSRF
        assert.ok(connInit.body.url.includes(`state=${encodeURIComponent(connInit.body.state)}`), 'La URL debe conservar el parámetro state');

        // 1.C Validar la ruta GET /api/github/authorize
        const authorizeRouteRes = await httpRequest('GET', '/api/github/authorize', null, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(authorizeRouteRes.status, 200);
        assert.strictEqual(authorizeRouteRes.body.authMethod, 'github_app');
        assert.strictEqual(authorizeRouteRes.body.url.includes('scope='), false);

        console.log('  ✅ [PASS] URL de GitHub App verificada: 0 scopes, prioridad de GITHUB_APP_CLIENT_ID, error explícito si falta, y redirect_uri exacto.');

        // --------------------------------------------------------------------
        // 2. BLOQUEO DE ACCESO A REPOSITORIOS PRIVADOS SIN CONEXIÓN AUTORIZADA
        // --------------------------------------------------------------------
        console.log('\n--- 2. Protección de Repositorios Privados ante Usuarios No Conectados ---');
        const unauthAttempt = await httpRequest('POST', '/api/project/analyze', {
            repoUrl: 'https://github.com/empresa/core-banking-api'
        }, { 'x-user-id': 'usr_unconnected' });
        assert.strictEqual(unauthAttempt.status, 401, 'Debe bloquear con HTTP 401 a usuarios que no han conectado su cuenta de GitHub');
        assert.ok(unauthAttempt.body.error.includes('es privado'), 'Debe informar claramente que el repositorio es privado');
        console.log('  ✅ [PASS] Usuario sin cuenta de GitHub conectada recibe HTTP 401 al intentar analizar un repositorio privado');

        // --------------------------------------------------------------------
        // 3. CONEXIÓN DE CUENTA 1 (@dev-enterprise-user) Y CUENTA 2 (@fundacion-esperanza-priv)
        // --------------------------------------------------------------------
        console.log('\n--- 3. Conexión Segura de Dos Cuentas Diferentes de GitHub y Cero Exposición de Tokens ---');
        const authAcc1 = await httpRequest('POST', '/api/github/connect-token', {
            account: 'dev-enterprise-user'
        }, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(authAcc1.status, 200);
        assert.strictEqual(authAcc1.body.connected, true);
        assert.strictEqual(authAcc1.body.username, 'dev-enterprise-user');
        assert.strictEqual(authAcc1.body.accessToken, undefined, 'El token jamás debe exponerse al frontend');
        assert.strictEqual(authAcc1.body.encryptedToken, undefined, 'El token cifrado jamás debe exponerse al frontend');

        const authAcc2 = await httpRequest('POST', '/api/github/connect-token', {
            account: 'fundacion-esperanza-priv'
        }, { 'x-user-id': 'usr_account_2' });
        assert.strictEqual(authAcc2.status, 200);
        assert.strictEqual(authAcc2.body.connected, true);
        assert.strictEqual(authAcc2.body.username, 'fundacion-esperanza-priv');
        assert.strictEqual(authAcc2.body.accessToken, undefined);
        console.log('  ✅ [PASS] Cuentas @dev-enterprise-user y @fundacion-esperanza-priv conectadas en sesiones aisladas sin exponer tokens');

        // --------------------------------------------------------------------
        // 4. LISTADO Y FILTRADO DE REPOSITORIOS PÚBLICOS Y PRIVADOS POR CUENTA
        // --------------------------------------------------------------------
        console.log('\n--- 4. Selección y Filtrado de Repositorios Públicos y Privados ---');
        const listAllAcc1 = await httpRequest('GET', '/api/github/repos?visibility=all', null, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(listAllAcc1.status, 200);
        assert.strictEqual(listAllAcc1.body.repositories.length, 3);

        const listPrivAcc1 = await httpRequest('GET', '/api/github/repos?visibility=private', null, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(listPrivAcc1.body.repositories.length, 2);
        assert.ok(listPrivAcc1.body.repositories.every(r => r.private === true));

        const listPubAcc1 = await httpRequest('GET', '/api/github/repos?visibility=public', null, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(listPubAcc1.body.repositories.length, 1);
        assert.strictEqual(listPubAcc1.body.repositories[0].private, false);
        console.log('  ✅ [PASS] Listado y filtrado de repositorios públicos y privados verificado para Cuenta 1');

        // --------------------------------------------------------------------
        // 5. AISLAMIENTO ESTRICTO ENTRE USUARIOS (CROSS-ACCOUNT PROTECTION)
        // --------------------------------------------------------------------
        console.log('\n--- 5. Aislamiento Estricto: Cuenta 1 NO puede analizar Repositorios Privados de Cuenta 2 ---');
        const crossAttempt1 = await httpRequest('POST', '/api/project/analyze', {
            repoUrl: 'https://github.com/fundacion-esperanza-priv/portal-social-interno'
        }, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(crossAttempt1.status, 403, 'Cuenta 1 debe recibir HTTP 403 al intentar leer un repo privado de Cuenta 2');
        assert.ok(crossAttempt1.body.error.includes('Acceso denegado'));

        const crossAttempt2 = await httpRequest('POST', '/api/project/analyze', {
            repoUrl: 'https://github.com/empresa/core-banking-api'
        }, { 'x-user-id': 'usr_account_2' });
        assert.strictEqual(crossAttempt2.status, 403, 'Cuenta 2 debe recibir HTTP 403 al intentar leer un repo privado de Cuenta 1');
        console.log('  ✅ [PASS] Aislamiento cruzado verificado: ninguna cuenta puede acceder a los repositorios privados de otra (HTTP 403)');

        // --------------------------------------------------------------------
        // 6. ANÁLISIS COMPLETO DE REPOSITORIOS PRIVADOS (SOFTWARE Y FUNDACIÓN)
        // --------------------------------------------------------------------
        console.log('\n--- 6. Análisis Completo de Repositorios Privados con Comprensión Contextual y Seguridad ---');

        // 6A. Cuenta 1 analiza su repositorio privado de software (empresa/core-banking-api)
        const analyzePriv1 = await httpRequest('POST', '/api/project/analyze', {
            repoUrl: 'https://github.com/empresa/core-banking-api',
            branch: 'main'
        }, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(analyzePriv1.status, 200);
        assert.strictEqual(analyzePriv1.body.success, true);
        assert.strictEqual(analyzePriv1.body.repository.private, true);
        assert.strictEqual(analyzePriv1.body.endpoints.length, 3, 'Debe extraer los 3 endpoints de src/server.js del repo privado');
        assert.strictEqual(analyzePriv1.body.dataModels.length, 2, 'Debe extraer las 2 tablas SQL de sql/schema.sql del repo privado');
        assert.ok(analyzePriv1.body.documentation.product.srs.includes('/api/v1/accounts'));
        assert.ok(typeof analyzePriv1.body.security.score === 'number');
        console.log(`  ✅ [PASS] Cuenta 1 analizó su repositorio privado "empresa/core-banking-api" (3 endpoints, 2 tablas SQL, Security Score: ${analyzePriv1.body.security.score}/100)`);

        // 6B. Cuenta 2 analiza su repositorio privado de fundación (fundacion-esperanza-priv/portal-social-interno)
        const analyzePriv2 = await httpRequest('POST', '/api/project/analyze', {
            repoUrl: 'https://github.com/fundacion-esperanza-priv/portal-social-interno',
            branch: 'main'
        }, { 'x-user-id': 'usr_account_2' });
        assert.strictEqual(analyzePriv2.status, 200);
        assert.strictEqual(analyzePriv2.body.success, true);
        assert.strictEqual(analyzePriv2.body.repository.private, true);
        assert.strictEqual(analyzePriv2.body.projectCategory, 'foundation_nonprofit', 'Debe comprender que el repo privado pertenece a una fundación');
        assert.ok(analyzePriv2.body.documentation.presentation.includes('Fundación Esperanza Viva'));
        assert.ok(analyzePriv2.body.documentation.presentation.includes('comedores comunitarios'));
        assert.strictEqual(analyzePriv2.body.endpoints.length, 0, 'No debe inventar endpoints para el portal privado de la fundación');
        console.log('  ✅ [PASS] Cuenta 2 analizó su repositorio privado "fundacion-esperanza-priv/portal-social-interno" con comprensión contextual de fundación');

        // 6C. Análisis de repositorio público real sin requerir conexión privada
        const analyzePub = await httpRequest('POST', '/api/project/analyze', {
            repoUrl: 'https://github.com/DsantiagoPsandoval/Puertas-D-e-Colores'
        }, { 'x-user-id': 'usr_guest_public' });
        assert.strictEqual(analyzePub.status, 200);
        assert.strictEqual(analyzePub.body.repository.private, false);
        assert.strictEqual(analyzePub.body.projectCategory, 'foundation_nonprofit');
        console.log('  ✅ [PASS] Repositorio público real "DsantiagoPsandoval/Puertas-D-e-Colores" analizado correctamente');

        // --------------------------------------------------------------------
        // 7. GESTIÓN DE ERRORES DE RAMA INEXISTENTE Y REVOCACIÓN DE CONEXIÓN
        // --------------------------------------------------------------------
        console.log('\n--- 7. Manejo de Errores de Rama y Revocación Inmediata de Conexión ---');
        const badBranchRes = await httpRequest('POST', '/api/project/analyze', {
            repoUrl: 'https://github.com/empresa/core-banking-api',
            branch: 'rama-inexistente'
        }, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(badBranchRes.status, 404);
        assert.ok(badBranchRes.body.error.includes('Ramas disponibles'));

        // Revocar conexión de Cuenta 1
        const revokeRes = await httpRequest('POST', '/api/github/disconnect', {}, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(revokeRes.status, 200);
        assert.strictEqual(revokeRes.body.connected, false);

        // Intentar analizar nuevamente el repositorio privado tras revocar debe fallar con HTTP 401
        const afterRevokeAttempt = await httpRequest('POST', '/api/project/analyze', {
            repoUrl: 'https://github.com/empresa/core-banking-api'
        }, { 'x-user-id': 'usr_account_1' });
        assert.strictEqual(afterRevokeAttempt.status, 401, 'Tras revocar la conexión, el acceso al repositorio privado debe bloquearse');
        console.log('  ✅ [PASS] Revocación de conexión verificada: credenciales eliminadas y acceso privado bloqueado inmediatamente');

    } finally {
        server.close();
    }

    console.log('\n====================================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE REPOSITORIOS PÚBLICOS Y PRIVADOS PASARON (7/7)');
    console.log('====================================================================\n');
}

runTests().catch(err => {
    console.error('❌ Fallo en test_private_repos:', err);
    if (server) server.close();
    process.exit(1);
});
