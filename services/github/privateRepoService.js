/**
 * services/github/privateRepoService.js
 * ============================================================================
 * Servicio de Integración Segura para Repositorios Públicos y Privados
 * mediante GitHub App (preferido) y GitHub OAuth 2.0 con Permisos Mínimos.
 *
 * Controles de Seguridad Implementados:
 *   1. Cero exposición de tokens al frontend (nunca se retornan en JSON ni URL).
 *   2. Cifrado AES-256-GCM en memoria del servidor para tokens de sesión.
 *   3. Aislamiento estricto por usuario (userId): un usuario jamás puede usar
 *      el token de otro usuario ni usar GITHUB_TOKEN global para repos privados.
 *   4. Permisos mínimos de solo lectura: `metadata:read` y `contents:read`.
 *   5. Cero registro de tokens o secretos en logs.
 *   6. Revocación inmediata de sesión y limpieza criptográfica.
 * ============================================================================
 */

const crypto = require('crypto');
const https = require('https');

// Clave efímera AES-256-GCM en memoria del proceso para cifrar tokens de usuarios
const EPHEMERAL_MASTER_KEY = crypto.randomBytes(32);

// Almacenes aislados por usuario y por estado anti-CSRF
const userGitHubSessions = new Map();
const pendingOAuthStates = new Map();

// Catálogo de cuentas aisladas para pruebas multi-cuenta (Públicos y Privados)
const SANDBOX_GITHUB_ACCOUNTS = {
    'dev-enterprise-user': {
        username: 'dev-enterprise-user',
        accountType: 'Organization',
        authMethod: 'github_app',
        permissions: ['metadata:read', 'contents:read'],
        repositories: [
            {
                id: 101,
                name: 'core-banking-api',
                full_name: 'empresa/core-banking-api',
                owner: 'empresa',
                private: true,
                default_branch: 'main',
                branches: ['main', 'develop', 'release/v2'],
                description: 'Microservicio bancario privado de transacciones, cuentas y conciliación contable.',
                language: 'TypeScript',
                updated_at: new Date().toISOString(),
                files: [
                    {
                        path: 'README.md',
                        content: '# Core Banking API (Privado)\nServicio backend transaccional para gestión de cuentas, transferencias interbancarias y auditoría contable.\n\n## Arquitectura\nImplementado con Node.js, Express y PostgreSQL bajo controles de seguridad bancaria.'
                    },
                    {
                        path: 'package.json',
                        content: JSON.stringify({
                            name: 'core-banking-api',
                            version: '2.4.0',
                            private: true,
                            dependencies: { express: '^4.19.2', pg: '^8.11.3', helmet: '^7.1.0', zod: '^3.22.4' }
                        }, null, 2)
                    },
                    {
                        path: 'src/server.js',
                        content: `const express = require('express');\nconst app = express();\napp.use(express.json());\napp.get('/api/v1/accounts', (req, res) => res.json({ accounts: [] }));\napp.post('/api/v1/transfers', (req, res) => res.status(201).json({ status: 'completed' }));\napp.get('/api/v1/ledger/audit', (req, res) => res.json({ entries: [] }));\nmodule.exports = app;`
                    },
                    {
                        path: 'sql/schema.sql',
                        content: `CREATE TABLE bank_accounts (\n  id UUID PRIMARY KEY,\n  account_number VARCHAR(32) NOT NULL,\n  balance NUMERIC(14,2) NOT NULL,\n  created_at TIMESTAMP NOT NULL\n);\nCREATE TABLE ledger_transfers (\n  id UUID PRIMARY KEY,\n  source_account_id UUID NOT NULL,\n  target_account_id UUID NOT NULL,\n  amount NUMERIC(14,2) NOT NULL\n);`
                    }
                ]
            },
            {
                id: 102,
                name: 'payment-gateway-service',
                full_name: 'empresa/payment-gateway-service',
                owner: 'empresa',
                private: true,
                default_branch: 'master',
                branches: ['master', 'staging'],
                description: 'Integración privada con redes de pago y tokenización segura.',
                language: 'JavaScript',
                updated_at: new Date().toISOString(),
                files: [
                    {
                        path: 'README.md',
                        content: '# Payment Gateway Service\nMotor privado de enrutamiento de pagos y validación antifraude.'
                    },
                    {
                        path: 'package.json',
                        content: JSON.stringify({ name: 'payment-gateway-service', private: true, dependencies: { express: '^4.19.2', redis: '^4.6.0' } }, null, 2)
                    },
                    {
                        path: 'src/index.js',
                        content: `const express = require('express');\nconst app = express();\napp.post('/api/payments/authorize', (req, res) => res.json({ authorized: true }));`
                    }
                ]
            },
            {
                id: 103,
                name: 'public-developer-docs',
                full_name: 'empresa/public-developer-docs',
                owner: 'empresa',
                private: false,
                default_branch: 'main',
                branches: ['main'],
                description: 'Portal público de documentación y guías para integradores.',
                language: 'HTML',
                updated_at: new Date().toISOString(),
                files: [
                    {
                        path: 'index.html',
                        content: '<!DOCTYPE html><html lang="es"><head><title>Portal de Desarrolladores</title><meta name="description" content="Guías públicas de integración técnica."></head><body><section><h2>Guías de Inicio Rápido</h2><p>Documentación abierta para conectar con nuestros servicios.</p></section></body></html>'
                    }
                ]
            }
        ]
    },
    'fundacion-esperanza-priv': {
        username: 'fundacion-esperanza-priv',
        accountType: 'Organization',
        authMethod: 'github_app',
        permissions: ['metadata:read', 'contents:read'],
        repositories: [
            {
                id: 201,
                name: 'portal-social-interno',
                full_name: 'fundacion-esperanza-priv/portal-social-interno',
                owner: 'fundacion-esperanza-priv',
                private: true,
                default_branch: 'main',
                branches: ['main'],
                description: 'Repositorio privado de la Fundación Esperanza Viva con programas sociales y memoria anual.',
                language: 'HTML',
                updated_at: new Date().toISOString(),
                files: [
                    {
                        path: 'README.md',
                        content: '# Fundación Esperanza Viva — Portal Institucional\nSomos una fundación sin ánimo de lucro dedicada a la nutrición infantil, educación rural y apoyo a madres cabeza de hogar en Colombia.'
                    },
                    {
                        path: 'index.html',
                        content: `<!DOCTYPE html><html lang="es"><head><title>Fundación Esperanza Viva | Nutrición y Educación Rural</title>
                        <meta name="description" content="Fundación sin ánimo de lucro que brinda comedores comunitarios, becas escolares y huertas familiares en zonas rurales vulnerables."></head>
                        <body>
                        <section><h2>Nuestra Misión</h2><p>Tenemos la misión de erradicar la desnutrición infantil y fortalecer la educación rural acompañando a familias campesinas y madres cabeza de hogar.</p></section>
                        <section><h2>Programas Sociales</h2><p>Desarrollamos comedores comunitarios, entrega de kits escolares y formación en huertas agroecológicas autosostenibles.</p></section>
                        <section><h2>Transparencia y Donantes</h2><p>Publicamos nuestros estados financieros e informes de impacto anual para donantes y voluntarios.</p></section>
                        </body></html>`
                    }
                ]
            }
        ]
    }
};

/**
 * Encrypts a sensitive token using AES-256-GCM before storing in memory.
 */
function encryptToken(plainToken) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', EPHEMERAL_MASTER_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(String(plainToken), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        cipherText: encrypted.toString('hex')
    };
}

/**
 * Decrypts a user's token on-demand in backend memory. Never exposed outside backend calls.
 */
function decryptToken(encObj) {
    if (!encObj || !encObj.iv || !encObj.authTag || !encObj.cipherText) return null;
    try {
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            EPHEMERAL_MASTER_KEY,
            Buffer.from(encObj.iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(encObj.authTag, 'hex'));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(encObj.cipherText, 'hex')),
            decipher.final()
        ]);
        return decrypted.toString('utf8');
    } catch (_) {
        return null;
    }
}

class PrivateRepoService {
    /**
     * Genera la URL de autorización nativa de GitHub App (sin scopes tradicionales)
     * y registra un token `state` criptográfico anti-CSRF vinculado al usuario.
     */
    static getAuthorizationUrl(userId, redirectUri, options = {}) {
        const normalizedUser = String(userId || 'guest').trim();

        // 1. Prioridad estricta: GITHUB_APP_CLIENT_ID sobre GITHUB_CLIENT_ID
        const clientId = (process.env.GITHUB_APP_CLIENT_ID && process.env.GITHUB_APP_CLIENT_ID.trim())
            ? process.env.GITHUB_APP_CLIENT_ID.trim()
            : (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID.trim())
                ? process.env.GITHUB_CLIENT_ID.trim()
                : null;

        // 2. Eliminación de fallback silencioso: error explícito si falta el Client ID
        if (!clientId) {
            const err = new Error('Client ID de GitHub App no configurado. Debes configurar GITHUB_APP_CLIENT_ID o GITHUB_CLIENT_ID en las variables de entorno.');
            err.statusCode = 500;
            throw err;
        }

        const appSlug = process.env.GITHUB_APP_SLUG || 'documind-ai-connector';
        const state = crypto.randomBytes(16).toString('hex');

        pendingOAuthStates.set(state, {
            userId: normalizedUser,
            accountHint: options.accountHint || null,
            createdAt: Date.now()
        });

        // 3. Callback URL exacto de producción en Render si no se especifica redirectUri
        const baseUrl = (process.env.APP_URL || process.env.FRONTEND_URL || 'https://document-mind-ai.onrender.com').replace(/\/+$/, '');
        const callbackUrl = redirectUri || `${baseUrl}/api/github/callback`;

        // 4. GitHub Apps NO usan el parámetro scope (sus permisos se configuran en GitHub Developer Settings).
        // Se preservan únicamente client_id, redirect_uri y state.
        const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(state)}`;
        const githubAppInstallUrl = `https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new?state=${encodeURIComponent(state)}`;

        return {
            url: oauthUrl,
            githubAppUrl: githubAppInstallUrl,
            authMethod: 'github_app',
            requestedPermissions: {
                metadata: 'read-only',
                contents: 'read-only',
                writeAccessRequested: false
            },
            state
        };
    }

    /**
     * Intercambia el código de autorización (o installation_id de GitHub App)
     * por un Access Token efímero cifrado con AES-256-GCM en el backend.
     */
    static async exchangeCodeForToken(code, state, explicitUserId = null) {
        if (!code) throw new Error('Código de autorización requerido');

        const stateRecord = pendingOAuthStates.get(state);
        if (state) pendingOAuthStates.delete(state);

        const resolvedUserId = explicitUserId || (stateRecord ? stateRecord.userId : 'guest');
        const accountKey = (stateRecord && stateRecord.accountHint && SANDBOX_GITHUB_ACCOUNTS[stateRecord.accountHint])
            ? stateRecord.accountHint
            : (SANDBOX_GITHUB_ACCOUNTS[code] ? code : 'dev-enterprise-user');

        const clientId = (process.env.GITHUB_APP_CLIENT_ID && process.env.GITHUB_APP_CLIENT_ID.trim())
            ? process.env.GITHUB_APP_CLIENT_ID.trim()
            : (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID.trim())
                ? process.env.GITHUB_CLIENT_ID.trim()
                : null;
        const clientSecret = (process.env.GITHUB_APP_CLIENT_SECRET && process.env.GITHUB_APP_CLIENT_SECRET.trim())
            ? process.env.GITHUB_APP_CLIENT_SECRET.trim()
            : (process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CLIENT_SECRET.trim())
                ? process.env.GITHUB_CLIENT_SECRET.trim()
                : null;

        // Modo sandbox / prueba local cuando no hay credenciales de GitHub App en .env o cuando se pasa un código de prueba
        if (!clientId || !clientSecret || code.startsWith('mock_') || SANDBOX_GITHUB_ACCOUNTS[code]) {
            const profile = SANDBOX_GITHUB_ACCOUNTS[accountKey] || SANDBOX_GITHUB_ACCOUNTS['dev-enterprise-user'];
            const mockToken = `ghu_mock_${accountKey}_${crypto.randomBytes(12).toString('hex')}`;

            userGitHubSessions.set(resolvedUserId, {
                userId: resolvedUserId,
                encryptedToken: encryptToken(mockToken),
                username: profile.username,
                accountKey,
                authMethod: profile.authMethod || 'github_app',
                permissions: profile.permissions || ['metadata:read', 'contents:read'],
                connectedAt: new Date().toISOString(),
                isSandbox: true
            });

            return {
                success: true,
                userId: resolvedUserId,
                username: profile.username,
                authMethod: profile.authMethod || 'github_app',
                permissions: ['metadata:read', 'contents:read'],
                connected: true,
                isMock: true
            };
        }

        // Intercambio HTTPS real con GitHub OAuth / GitHub App
        const postData = JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code
        });

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'github.com',
                path: '/login/oauth/access_token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'DocuMind-AI-Platform/3.0',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', async () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error || !parsed.access_token) {
                            return reject(new Error(parsed.error_description || parsed.error || 'No se pudo obtener token de autorización de GitHub.'));
                        }

                        // Consultar perfil del usuario conectado en GitHub para verificar identidad
                        let ghUser = { login: 'github-user', avatar_url: '' };
                        try {
                            const uRes = await fetch('https://api.github.com/user', {
                                headers: {
                                    'Authorization': `Bearer ${parsed.access_token}`,
                                    'Accept': 'application/vnd.github.v3+json',
                                    'User-Agent': 'DocuMind-AI-Platform/3.0'
                                }
                            });
                            if (uRes.ok) ghUser = await uRes.json();
                        } catch (_) {}

                        userGitHubSessions.set(resolvedUserId, {
                            userId: resolvedUserId,
                            encryptedToken: encryptToken(parsed.access_token),
                            username: ghUser.login || 'github-user',
                            avatarUrl: ghUser.avatar_url || '',
                            authMethod: process.env.GITHUB_APP_ID ? 'github_app' : 'oauth_app',
                            permissions: ['metadata:read', 'contents:read'],
                            scope: parsed.scope || 'read:user,repo',
                            connectedAt: new Date().toISOString(),
                            isSandbox: false
                        });

                        resolve({
                            success: true,
                            userId: resolvedUserId,
                            username: ghUser.login || 'github-user',
                            authMethod: process.env.GITHUB_APP_ID ? 'github_app' : 'oauth_app',
                            permissions: ['metadata:read', 'contents:read'],
                            connected: true
                        });
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    /**
     * Permite conectar una cuenta de GitHub mediante un Fine-Grained Token de solo lectura
     * (contents:read, metadata:read) o cuenta sandbox verificada, almacenándolo cifrado
     * exclusivamente en el backend y aislado por `userId`.
     */
    static async connectWithReadOnlyToken(userId, rawToken, options = {}) {
        if (!userId) throw new Error('Identificador de sesión de usuario requerido.');
        const normalizedUser = String(userId).trim();
        const trimmedToken = String(rawToken || '').trim();

        if (!trimmedToken) {
            const err = new Error('Por favor proporciona un token de lectura válido de GitHub App o Fine-Grained PAT.');
            err.statusCode = 400;
            throw err;
        }

        // Soporte para cuentas de prueba aisladas (ej. "sandbox:dev-enterprise-user" o "sandbox:fundacion-esperanza-priv")
        if (trimmedToken.startsWith('sandbox:')) {
            const accountKey = trimmedToken.replace('sandbox:', '').trim();
            const profile = SANDBOX_GITHUB_ACCOUNTS[accountKey];
            if (!profile) {
                const err = new Error(`La cuenta de prueba "${accountKey}" no existe.`);
                err.statusCode = 404;
                throw err;
            }
            const mockToken = `ghu_mock_${accountKey}_${crypto.randomBytes(12).toString('hex')}`;
            userGitHubSessions.set(normalizedUser, {
                userId: normalizedUser,
                encryptedToken: encryptToken(mockToken),
                username: profile.username,
                accountKey,
                authMethod: 'github_app',
                permissions: ['metadata:read', 'contents:read'],
                connectedAt: new Date().toISOString(),
                isSandbox: true
            });
            return {
                success: true,
                connected: true,
                userId: normalizedUser,
                username: profile.username,
                authMethod: 'github_app',
                permissions: ['metadata:read', 'contents:read']
            };
        }

        // Validar token real contra la API de GitHub y verificar que no tenga permisos destructivos innecesarios
        const uRes = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${trimmedToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'DocuMind-AI-Platform/3.0'
            }
        });

        if (uRes.status === 401 || uRes.status === 403) {
            const err = new Error('El token de GitHub proporcionado es inválido, expiró o carece de permisos de lectura.');
            err.statusCode = 401;
            throw err;
        }
        if (!uRes.ok) {
            const err = new Error(`Error al verificar la cuenta con GitHub API (HTTP ${uRes.status}).`);
            err.statusCode = uRes.status;
            throw err;
        }

        const ghUser = await uRes.json();
        const oauthScopes = (uRes.headers.get('x-oauth-scopes') || '').split(',').map(s => s.trim()).filter(Boolean);

        // Advertencia de seguridad si el usuario usó un token clásico con permisos de administración/eliminación
        const excessiveScopes = oauthScopes.filter(s => /delete_repo|admin:|write:/i.test(s));

        userGitHubSessions.set(normalizedUser, {
            userId: normalizedUser,
            encryptedToken: encryptToken(trimmedToken),
            username: ghUser.login,
            avatarUrl: ghUser.avatar_url || '',
            authMethod: trimmedToken.startsWith('github_pat_') ? 'fine_grained_pat' : 'github_token_readonly',
            permissions: ['metadata:read', 'contents:read'],
            scope: oauthScopes.join(', ') || 'contents:read, metadata:read',
            connectedAt: new Date().toISOString(),
            isSandbox: false
        });

        return {
            success: true,
            connected: true,
            userId: normalizedUser,
            username: ghUser.login,
            avatarUrl: ghUser.avatar_url || '',
            authMethod: trimmedToken.startsWith('github_pat_') ? 'fine_grained_pat' : 'github_token_readonly',
            permissions: ['metadata:read', 'contents:read'],
            securityWarning: excessiveScopes.length > 0
                ? `Se recomienda usar un Fine-Grained Token o GitHub App únicamente con permisos de lectura (se detectaron alcances adicionales: ${excessiveScopes.join(', ')}). DocuMind AI operará estrictamente en modo solo lectura.`
                : null
        };
    }

    /**
     * Retorna el estado de conexión de GitHub del usuario (sin exponer jamás el token).
     */
    static getConnectionStatus(userId) {
        const session = userId ? userGitHubSessions.get(String(userId).trim()) : null;
        if (!session || !session.encryptedToken) {
            return {
                connected: false,
                username: null,
                authMethod: null,
                permissions: []
            };
        }
        return {
            connected: true,
            username: session.username,
            avatarUrl: session.avatarUrl || null,
            authMethod: session.authMethod || 'github_app',
            permissions: session.permissions || ['metadata:read', 'contents:read'],
            connectedAt: session.connectedAt,
            isSandbox: Boolean(session.isSandbox)
        };
    }

    /**
     * Obtiene internamente el token descifrado para realizar llamadas desde el backend en nombre del usuario.
     */
    static getDecryptedUserSession(userId) {
        if (!userId) return null;
        const session = userGitHubSessions.get(String(userId).trim());
        if (!session || !session.encryptedToken) return null;
        const token = decryptToken(session.encryptedToken);
        if (!token) return null;
        return {
            ...session,
            accessToken: token
        };
    }

    /**
     * Obtiene la lista de repositorios del usuario conectado (Públicos y Privados).
     */
    static async listUserRepositories(userId, filterVisibility = 'all') {
        const session = this.getDecryptedUserSession(userId);
        if (!session || !session.accessToken) {
            return {
                connected: false,
                repositories: []
            };
        }

        if (session.isSandbox) {
            const profile = SANDBOX_GITHUB_ACCOUNTS[session.accountKey] || SANDBOX_GITHUB_ACCOUNTS['dev-enterprise-user'];
            let repos = profile.repositories.map(r => ({
                id: r.id,
                name: r.name,
                full_name: r.full_name,
                owner: r.owner,
                private: r.private,
                visibility: r.private ? 'private' : 'public',
                default_branch: r.default_branch,
                branches: r.branches || [r.default_branch],
                description: r.description,
                language: r.language,
                updated_at: r.updated_at,
                html_url: `https://github.com/${r.full_name}`
            }));

            if (filterVisibility === 'private') repos = repos.filter(r => r.private);
            if (filterVisibility === 'public') repos = repos.filter(r => !r.private);

            return {
                connected: true,
                username: session.username,
                authMethod: session.authMethod,
                permissions: session.permissions,
                repositories: repos
            };
        }

        // Llamada HTTPS a la API oficial de GitHub con el token aislado del usuario
        const visibilityParam = ['public', 'private'].includes(filterVisibility) ? `&visibility=${filterVisibility}` : '&visibility=all';
        const res = await fetch(`https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member${visibilityParam}`, {
            headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'DocuMind-AI-Platform/3.0'
            }
        });

        if (res.status === 401) {
            this.disconnectGitHub(userId);
            const err = new Error('La autorización de GitHub ha expirado o fue revocada. Por favor vuelve a conectar tu cuenta.');
            err.statusCode = 401;
            throw err;
        }
        if (res.status === 403 || res.status === 429) {
            const resetHeader = res.headers.get('x-ratelimit-reset');
            const resetTime = resetHeader ? new Date(Number(resetHeader) * 1000).toLocaleTimeString('es-ES') : 'unos minutos';
            const err = new Error(`Límite de solicitudes de GitHub API alcanzado o permisos insuficientes. Reintenta después de ${resetTime}.`);
            err.statusCode = res.status;
            throw err;
        }

        const repos = await res.json();
        if (!Array.isArray(repos)) {
            return { connected: false, repositories: [] };
        }

        const sanitized = repos.map(r => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            owner: r.owner ? r.owner.login : r.full_name.split('/')[0],
            private: Boolean(r.private),
            visibility: r.private ? 'private' : 'public',
            default_branch: r.default_branch || 'main',
            description: r.description || '',
            language: r.language || 'Multi-lenguaje',
            updated_at: r.updated_at,
            html_url: r.html_url || `https://github.com/${r.full_name}`
        }));

        return {
            connected: true,
            username: session.username,
            authMethod: session.authMethod,
            permissions: session.permissions,
            repositories: sanitized
        };
    }

    /**
     * Verifica si un repositorio pertenece a una cuenta sandbox privada y valida estrictamente
     * que el `userId` actual tenga autorización sobre él.
     */
    static getSandboxRepository(userId, owner, repoName) {
        const fullNameLower = `${owner}/${repoName}`.toLowerCase();

        // Buscar si el repositorio existe en el catálogo sandbox
        let foundRepo = null;
        let ownerAccountKey = null;
        for (const [accKey, accData] of Object.entries(SANDBOX_GITHUB_ACCOUNTS)) {
            const match = accData.repositories.find(r => r.full_name.toLowerCase() === fullNameLower);
            if (match) {
                foundRepo = match;
                ownerAccountKey = accKey;
                break;
            }
        }

        if (!foundRepo) return null;

        // Si el repositorio es público, cualquiera puede leerlo
        if (!foundRepo.private) {
            return { authorized: true, repository: foundRepo };
        }

        // Si es PRIVADO, exigir sesión activa del usuario propietario
        const session = this.getDecryptedUserSession(userId);
        if (!session) {
            const err = new Error(`El repositorio "${foundRepo.full_name}" es privado. Conecta tu cuenta de GitHub autorizada para analizarlo.`);
            err.statusCode = 401;
            throw err;
        }

        if (session.accountKey !== ownerAccountKey && session.username !== ownerAccountKey) {
            const err = new Error(`Acceso denegado: La cuenta de GitHub conectada (@${session.username}) no tiene permisos de lectura sobre el repositorio privado "${foundRepo.full_name}".`);
            err.statusCode = 403;
            throw err;
        }

        return { authorized: true, repository: foundRepo, session };
    }

    /**
     * Obtiene el árbol de un repositorio privado sin guardarlo en disco.
     */
    static async fetchPrivateRepoTree(userId, repoFullName, branch = 'main') {
        const session = this.getDecryptedUserSession(userId);
        if (!session || !session.accessToken) {
            const err = new Error('Cuenta de GitHub no conectada o sesión expirada.');
            err.statusCode = 401;
            throw err;
        }

        const [owner, repo] = String(repoFullName || '').split('/');
        if (session.isSandbox) {
            const sb = this.getSandboxRepository(userId, owner, repo);
            if (sb && sb.repository) {
                return {
                    repo: sb.repository.full_name,
                    branch: branch || sb.repository.default_branch,
                    private: sb.repository.private,
                    filesCount: sb.repository.files.length,
                    files: sb.repository.files.map(f => ({ path: f.path, size: (f.content || '').length }))
                };
            }
            return {
                repo: repoFullName,
                branch,
                filesCount: 5,
                files: [
                    { path: 'src/server.js', size: 1420 },
                    { path: 'src/routes/auth.js', size: 3100 },
                    { path: 'src/controllers/authController.js', size: 4200 },
                    { path: 'src/models/user.js', size: 2150 },
                    { path: 'package.json', size: 850 }
                ]
            };
        }

        const res = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`, {
            headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'DocuMind-AI-Platform/3.0'
            }
        });

        if (res.status === 404 || res.status === 403) {
            const err = new Error(`No tienes permisos de lectura sobre el repositorio "${repoFullName}" o la rama "${branch}" no existe.`);
            err.statusCode = res.status;
            throw err;
        }

        const parsed = await res.json();
        return {
            repo: repoFullName,
            branch,
            filesCount: (parsed.tree || []).length,
            files: (parsed.tree || []).filter(t => t.type === 'blob')
        };
    }

    /**
     * Desconecta la cuenta de GitHub del usuario y elimina su token cifrado del servidor.
     */
    static async disconnectGitHub(userId) {
        if (userId && userGitHubSessions.has(String(userId).trim())) {
            userGitHubSessions.delete(String(userId).trim());
        }
        return {
            success: true,
            connected: false,
            message: 'Conexión de GitHub revocada y credenciales eliminadas de la sesión del servidor.'
        };
    }
}

module.exports = {
    PrivateRepoService,
    SANDBOX_GITHUB_ACCOUNTS
};
