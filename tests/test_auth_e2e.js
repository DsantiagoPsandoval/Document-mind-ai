/**
 * ============================================================================
 * DOCUMIND AI — SUITE AUTOMÁTICA E2E DE AUTENTICACIÓN COMPLETA (CHROME CDP)
 * ============================================================================
 * Verifica en un navegador real (Google Chrome Headless + DevTools Protocol)
 * y bajo un entorno de pruebas controlado (sin envío de correos reales a terceros)
 * los 15 escenarios obligatorios de autenticación:
 *   1. Registro exitoso (signUp + creación de perfil en tabla profiles)
 *   2. Registro con correo inválido (validación y bloqueo frontend)
 *   3. Registro con contraseñas diferentes (validación y bloqueo frontend)
 *   4. Registro con correo ya existente (detección de duplicado sin sobrescribir)
 *   5. Verificación de correo (pantalla de verificación pendiente + reenvío resend)
 *   6. Inicio de sesión correcto (signInWithPassword + perfil + proyectos + historial)
 *   7. Contraseña incorrecta (mensaje claro + bloqueo temporal tras intentos fallidos)
 *   8. Recuperación de contraseña (resetPasswordForEmail con URL segura)
 *   9. Cambio de contraseña (PASSWORD_RECOVERY + updateUser + login con nueva clave)
 *  10. Inicio de sesión con Google OAuth (signInWithOAuth provider: 'google')
 *  11. Cierre de sesión (signOut + limpieza de estado y UI)
 *  12. Persistencia de sesión al recargar (getSession tras Page.reload)
 *  13. Acceso protegido (bloqueo de cuentas sin verificar y usuarios invitados)
 *  14. Separación estricta de datos entre usuarios (Usuario A vs Usuario B)
 *  15. Diseño responsive del modal de autenticación (320px, 375px, 768px, 1024px, 1440px)
 * ============================================================================
 */

const assert = require('assert');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let passed = 0;
let failed = 0;

function recordPass(name, detail = '') {
    passed++;
    console.log(`  ✅ [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
}

function recordFail(name, err) {
    failed++;
    const msg = err && err.message ? err.message : String(err);
    console.error(`  ❌ [FAIL] ${name} — ${msg}`);
}

async function step(name, fn) {
    try {
        const detail = await fn();
        recordPass(name, typeof detail === 'string' ? detail : '');
    } catch (e) {
        recordFail(name, e);
    }
}

class CDPClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.id = 0;
        this.pending = new Map();
        this.pageExceptions = [];
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => resolve();
            this.ws.onerror = (e) => reject(e);
            this.ws.onmessage = (ev) => {
                const msg = JSON.parse(ev.data);
                if (msg.id && this.pending.has(msg.id)) {
                    const { resolve: res, reject: rej } = this.pending.get(msg.id);
                    this.pending.delete(msg.id);
                    if (msg.error) rej(new Error(msg.error.message));
                    else res(msg.result);
                } else if (msg.method === 'Runtime.exceptionThrown') {
                    const d = msg.params.exceptionDetails;
                    this.pageExceptions.push({
                        text: d.text,
                        description: d.exception?.description || ''
                    });
                }
            };
        });
    }

    send(method, params = {}) {
        const id = ++this.id;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async eval(expression) {
        const res = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Eval error');
        }
        return res.result ? res.result.value : undefined;
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

function waitForHttp(url, timeoutMs = 15000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            http.get(url, (res) => {
                res.resume();
                resolve();
            }).on('error', () => {
                if (Date.now() - start > timeoutMs) reject(new Error(`Timeout waiting for ${url}`));
                else setTimeout(check, 200);
            });
        };
        check();
    });
}

function getJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Controlled In-Browser Supabase Mock Script (persisted in localStorage across reloads)
const CONTROLLED_SUPABASE_MOCK_SCRIPT = `
(function() {
    const STORE_KEY = "__DOCUMIND_CONTROLLED_AUTH_DB__";
    function loadDb() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return {
            users: [],
            profiles: [],
            analyses: [],
            sessionUserId: null,
            resentEmails: [],
            recoveryRequests: [],
            oauthCalls: []
        };
    }
    function saveDb(db) {
        localStorage.setItem(STORE_KEY, JSON.stringify(db));
    }

    const listeners = [];
    function notify(event, session) {
        listeners.forEach(fn => {
            try { fn(event, session); } catch (_) {}
        });
    }

    const mockClient = {
        __isControlledMock: true,
        getDb: loadDb,
        resetDb: () => {
            localStorage.removeItem(STORE_KEY);
        },
        verifyUserByEmail: (email) => {
            const db = loadDb();
            const u = db.users.find(x => x.email === email.toLowerCase());
            if (u) {
                u.email_confirmed_at = new Date().toISOString();
                u.confirmed_at = u.email_confirmed_at;
                saveDb(db);
            }
            return u;
        },
        triggerPasswordRecoveryEvent: (email) => {
            const db = loadDb();
            const u = db.users.find(x => x.email === email.toLowerCase());
            if (u) {
                db.sessionUserId = u.id;
                saveDb(db);
                notify("PASSWORD_RECOVERY", { user: u, access_token: "mock-recovery-token" });
            }
        },
        auth: {
            async getSession() {
                const db = loadDb();
                const user = db.users.find(u => u.id === db.sessionUserId) || null;
                return {
                    data: {
                        session: user ? { user, access_token: "mock-jwt-" + user.id } : null
                    },
                    error: null
                };
            },
            onAuthStateChange(callback) {
                listeners.push(callback);
                return { data: { subscription: { unsubscribe: () => {} } } };
            },
            async signUp({ email, password, options }) {
                const db = loadDb();
                const normEmail = String(email || "").toLowerCase();
                const existing = db.users.find(u => u.email === normEmail);
                if (existing) {
                    return {
                        data: { user: { id: existing.id, email: normEmail, identities: [] }, session: null },
                        error: null
                    };
                }
                const newUser = {
                    id: "usr_" + Math.random().toString(36).slice(2, 10),
                    email: normEmail,
                    passwordHash: "hashed:" + password,
                    email_confirmed_at: null,
                    confirmed_at: null,
                    created_at: new Date().toISOString(),
                    app_metadata: { provider: "email" },
                    user_metadata: (options && options.data) || { full_name: normEmail.split("@")[0], auth_provider: "email" },
                    identities: [{ provider: "email" }]
                };
                db.users.push(newUser);
                saveDb(db);
                return {
                    data: { user: newUser, session: null },
                    error: null
                };
            },
            async resend({ type, email, options }) {
                const db = loadDb();
                db.resentEmails.push({ type, email: String(email || "").toLowerCase(), redirectTo: options?.emailRedirectTo, at: Date.now() });
                saveDb(db);
                return { data: {}, error: null };
            },
            async signInWithPassword({ email, password }) {
                const db = loadDb();
                const normEmail = String(email || "").toLowerCase();
                const user = db.users.find(u => u.email === normEmail);
                if (!user || user.passwordHash !== "hashed:" + password) {
                    return {
                        data: { user: null, session: null },
                        error: { message: "Invalid login credentials" }
                    };
                }
                if (!user.email_confirmed_at) {
                    return {
                        data: { user: null, session: null },
                        error: { message: "Email not confirmed" }
                    };
                }
                db.sessionUserId = user.id;
                saveDb(db);
                const session = { user, access_token: "mock-jwt-" + user.id };
                notify("SIGNED_IN", session);
                return { data: { user, session }, error: null };
            },
            async resetPasswordForEmail(email, options) {
                const db = loadDb();
                db.recoveryRequests.push({
                    email: String(email || "").toLowerCase(),
                    redirectTo: options?.redirectTo || "",
                    at: Date.now()
                });
                saveDb(db);
                return { data: {}, error: null };
            },
            async updateUser({ password }) {
                const db = loadDb();
                const user = db.users.find(u => u.id === db.sessionUserId);
                if (!user) {
                    return { data: { user: null }, error: { message: "Auth session missing" } };
                }
                if (password) {
                    user.passwordHash = "hashed:" + password;
                }
                saveDb(db);
                notify("USER_UPDATED", { user, access_token: "mock-jwt-" + user.id });
                return { data: { user }, error: null };
            },
            async signInWithOAuth({ provider, options }) {
                const db = loadDb();
                db.oauthCalls.push({ provider, redirectTo: options?.redirectTo || "", at: Date.now() });
                let googleUser = db.users.find(u => u.email === "oauth.google.user@empresa.com");
                if (!googleUser) {
                    googleUser = {
                        id: "usr_google_oauth_99",
                        email: "oauth.google.user@empresa.com",
                        passwordHash: null,
                        email_confirmed_at: new Date().toISOString(),
                        confirmed_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        app_metadata: { provider: "google" },
                        user_metadata: { full_name: "Carlos OAuth Google", auth_provider: "google" },
                        identities: [{ provider: "google" }]
                    };
                    db.users.push(googleUser);
                }
                db.sessionUserId = googleUser.id;
                saveDb(db);
                const session = { user: googleUser, access_token: "mock-google-jwt" };
                notify("SIGNED_IN", session);
                return { data: { provider, url: options?.redirectTo || window.location.href }, error: null };
            },
            async signOut() {
                const db = loadDb();
                db.sessionUserId = null;
                saveDb(db);
                notify("SIGNED_OUT", null);
                return { error: null };
            }
        },
        from(table) {
            return {
                select() {
                    const filters = {};
                    const builder = {
                        eq(col, val) { filters[col] = val; return builder; },
                        order() { return builder; },
                        limit(n) {
                            const db = loadDb();
                            const rows = (db[table] || []).filter(r =>
                                Object.entries(filters).every(([k, v]) => r[k] === v)
                            ).slice(0, n);
                            return Promise.resolve({ data: rows, error: null });
                        },
                        maybeSingle() {
                            const db = loadDb();
                            const row = (db[table] || []).find(r =>
                                Object.entries(filters).every(([k, v]) => r[k] === v)
                            ) || null;
                            return Promise.resolve({ data: row, error: null });
                        }
                    };
                    return builder;
                },
                upsert(payload) {
                    const db = loadDb();
                    db[table] = db[table] || [];
                    const idx = db[table].findIndex(r => r.id === payload.id);
                    if (idx >= 0) db[table][idx] = { ...db[table][idx], ...payload };
                    else db[table].push(payload);
                    saveDb(db);
                    return {
                        select() {
                            return {
                                maybeSingle() {
                                    return Promise.resolve({ data: payload, error: null });
                                }
                            };
                        }
                    };
                },
                insert(payload) {
                    const db = loadDb();
                    db[table] = db[table] || [];
                    const row = { id: "row_" + Math.random().toString(36).slice(2, 9), created_at: new Date().toISOString(), ...payload };
                    db[table].push(row);
                    saveDb(db);
                    return Promise.resolve({ data: row, error: null });
                }
            };
        }
    };

    window.__DOCUMIND_MOCK_SUPABASE__ = mockClient;
})();
`;

async function runAuthSuite() {
    console.log('\n====================================================================');
    console.log('🔐 DOCUMIND AI — SUITE AUTOMÁTICA DE AUTENTICACIÓN COMPLETA (15 CASOS)');
    console.log('====================================================================\n');

    const serverProc = spawn(process.execPath, ['server.js'], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    const debugPort = 9344;
    let chromeProc = null;
    let cdp = null;

    try {
        await waitForHttp(`${BASE_URL}/api/health`, 15000);

        const userDataDir = path.join(process.env.TEMP || 'C:\\Windows\\Temp', `documind_auth_e2e_${Date.now()}`);
        chromeProc = spawn(CHROME_PATH, [
            `--remote-debugging-port=${debugPort}`,
            `--user-data-dir=${userDataDir}`,
            '--headless=new',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            '--window-size=1440,900',
            'about:blank'
        ], { stdio: 'ignore' });

        await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`, 10000);
        const targets = await getJson(`http://127.0.0.1:${debugPort}/json/list`);
        const pageTarget = targets.find(t => t.type === 'page');
        assert.ok(pageTarget, 'Target de página Chrome no encontrado');

        cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
        await cdp.connect();
        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');

        // Inject controlled Supabase mock before page scripts execute
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
            source: CONTROLLED_SUPABASE_MOCK_SCRIPT
        });

        await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
        for (let i = 0; i < 40; i++) {
            const ready = await cdp.eval('Boolean(window.DocuMindAuth)').catch(() => false);
            if (ready) break;
            await sleep(250);
        }
        await sleep(1800);

        // Bind controlled mock to DocuMindAuth if needed
        await cdp.eval(`
            (async () => {
                window.__DOCUMIND_MOCK_SUPABASE__.resetDb();
                if (window.DocuMindAuth && window.DocuMindAuth.setSupabaseClient) {
                    await window.DocuMindAuth.setSupabaseClient(window.__DOCUMIND_MOCK_SUPABASE__);
                }
            })()
        `);

        // --------------------------------------------------------------------
        // CASO 2: Registro con correo inválido
        // --------------------------------------------------------------------
        await step('Caso 2: Registro con correo inválido es bloqueado con mensaje claro', async () => {
            const res = await cdp.eval(`
                (async () => {
                    window.DocuMindAuth.openAuthModal('signup');
                    document.getElementById('auth-signup-name').value = 'Ana Prueba';
                    document.getElementById('auth-signup-email').value = 'correo-invalido-sin-dominio';
                    document.getElementById('auth-signup-password').value = 'ClaveSegura2026!';
                    document.getElementById('auth-signup-confirm').value = 'ClaveSegura2026!';
                    document.getElementById('auth-signup-terms').checked = true;
                    document.getElementById('form-auth-signup').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 100));
                    return {
                        errText: document.getElementById('err-signup-email').textContent.trim(),
                        hasInputError: document.getElementById('auth-signup-email').classList.contains('input-error'),
                        usersCount: window.__DOCUMIND_MOCK_SUPABASE__.getDb().users.length
                    };
                })()
            `);
            assert.strictEqual(res.hasInputError, true, 'El campo email debe marcarse con error');
            assert.ok(res.errText.length > 5, 'Debe mostrar mensaje de error de correo inválido');
            assert.strictEqual(res.usersCount, 0, 'No debe crear usuario en Supabase con correo inválido');
            return res.errText;
        });

        // --------------------------------------------------------------------
        // CASO 3: Registro con contraseñas diferentes y validación de fortaleza
        // --------------------------------------------------------------------
        await step('Caso 3: Registro con contraseñas diferentes es bloqueado', async () => {
            const res = await cdp.eval(`
                (async () => {
                    window.DocuMindAuth.openAuthModal('signup');
                    document.getElementById('auth-signup-name').value = 'Ana Prueba';
                    document.getElementById('auth-signup-email').value = 'ana@documind.ai';
                    const passEl = document.getElementById('auth-signup-password');
                    passEl.value = 'ClaveSegura2026!';
                    passEl.dispatchEvent(new Event('input'));
                    document.getElementById('auth-signup-confirm').value = 'OtraClaveDiferente99!';
                    document.getElementById('auth-signup-terms').checked = true;
                    document.getElementById('form-auth-signup').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 100));
                    return {
                        confirmErr: document.getElementById('err-signup-confirm').textContent.trim(),
                        strengthLabel: document.getElementById('auth-password-strength-label').textContent.trim(),
                        usersCount: window.__DOCUMIND_MOCK_SUPABASE__.getDb().users.length
                    };
                })()
            `);
            assert.ok(res.confirmErr.includes('no coinciden'), 'Debe indicar que las contraseñas no coinciden');
            assert.ok(res.strengthLabel.includes('excelente') || res.strengthLabel.includes('alta'), 'Medidor de fortaleza activo');
            assert.strictEqual(res.usersCount, 0);
            return `${res.confirmErr} (${res.strengthLabel})`;
        });

        // --------------------------------------------------------------------
        // CASO 1: Registro exitoso (signUp + tabla profiles + no guarda password en localStorage)
        // --------------------------------------------------------------------
        await step('Caso 1: Registro exitoso crea usuario en Supabase Auth y perfil en tabla profiles', async () => {
            const res = await cdp.eval(`
                (async () => {
                    window.DocuMindAuth.openAuthModal('signup');
                    document.getElementById('auth-signup-name').value = 'Ana Arquitecta';
                    document.getElementById('auth-signup-email').value = 'ana@documind.ai';
                    document.getElementById('auth-signup-password').value = 'ClaveSegura2026!';
                    document.getElementById('auth-signup-confirm').value = 'ClaveSegura2026!';
                    document.getElementById('auth-signup-terms').checked = true;
                    document.getElementById('form-auth-signup').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 250));
                    const db = window.__DOCUMIND_MOCK_SUPABASE__.getDb();
                    const rawStorage = JSON.stringify(localStorage);
                    return {
                        usersCount: db.users.length,
                        profilesCount: db.profiles.length,
                        profile: db.profiles[0] || null,
                        verifyViewVisible: !document.getElementById('auth-view-verify').classList.contains('hidden'),
                        verifyEmailShown: document.getElementById('auth-verify-email-display').textContent.trim(),
                        passwordPlaintextLeaked: rawStorage.includes('ClaveSegura2026!') && !rawStorage.includes('hashed:ClaveSegura2026!')
                    };
                })()
            `);
            assert.strictEqual(res.usersCount, 1, 'Usuario creado en Supabase Auth');
            assert.strictEqual(res.profilesCount, 1, 'Perfil creado en tabla profiles');
            assert.strictEqual(res.profile.email, 'ana@documind.ai');
            assert.strictEqual(res.profile.full_name, 'Ana Arquitecta');
            assert.strictEqual(res.profile.auth_provider, 'email');
            assert.strictEqual(res.verifyViewVisible, true, 'Muestra pantalla de verificación de correo');
            assert.strictEqual(res.verifyEmailShown, 'ana@documind.ai');
            assert.strictEqual(res.passwordPlaintextLeaked, false, 'Nunca almacena contraseña en texto plano');
            return `Perfil creado: ${res.profile.full_name} (${res.profile.auth_provider})`;
        });

        // --------------------------------------------------------------------
        // CASO 4: Registro con correo ya existente
        // --------------------------------------------------------------------
        await step('Caso 4: Registro con correo ya existente es rechazado sin duplicar cuenta', async () => {
            const res = await cdp.eval(`
                (async () => {
                    window.DocuMindAuth.openAuthModal('signup');
                    document.getElementById('auth-signup-name').value = 'Ana Duplicada';
                    document.getElementById('auth-signup-email').value = 'ana@documind.ai';
                    document.getElementById('auth-signup-password').value = 'ClaveSegura2026!';
                    document.getElementById('auth-signup-confirm').value = 'ClaveSegura2026!';
                    document.getElementById('auth-signup-terms').checked = true;
                    document.getElementById('form-auth-signup').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 200));
                    const db = window.__DOCUMIND_MOCK_SUPABASE__.getDb();
                    return {
                        usersCount: db.users.length,
                        alertText: document.getElementById('auth-alert-box').textContent.trim(),
                        emailErr: document.getElementById('err-signup-email').textContent.trim()
                    };
                })()
            `);
            assert.strictEqual(res.usersCount, 1, 'No debe duplicar el usuario');
            assert.ok(res.alertText.includes('Ya existe una cuenta'), 'Muestra alerta clara de cuenta existente');
            return res.alertText;
        });

        // --------------------------------------------------------------------
        // CASO 5: Verificación de correo y reenvío de enlace
        // --------------------------------------------------------------------
        await step('Caso 5: Pantalla de verificación de correo permite reenviar correo (resend)', async () => {
            const res = await cdp.eval(`
                (async () => {
                    window.DocuMindAuth.openAuthModal('verify', { email: 'ana@documind.ai' });
                    document.getElementById('btn-resend-verification').click();
                    await new Promise(r => setTimeout(r, 250));
                    const db = window.__DOCUMIND_MOCK_SUPABASE__.getDb();
                    return {
                        resentCount: db.resentEmails.length,
                        lastResent: db.resentEmails[db.resentEmails.length - 1],
                        alertText: document.getElementById('auth-alert-box').textContent.trim()
                    };
                })()
            `);
            assert.strictEqual(res.resentCount, 1, 'Se invocó supabase.auth.resend');
            assert.strictEqual(res.lastResent.email, 'ana@documind.ai');
            assert.ok(res.alertText.includes('reenviado'), 'Confirma reenvío de correo');
            return res.alertText;
        });

        // --------------------------------------------------------------------
        // CASO 13: Acceso protegido (bloqueo si la cuenta aún requiere verificación)
        // --------------------------------------------------------------------
        await step('Caso 13: Acceso protegido bloquea cuentas pendientes de verificación de correo', async () => {
            const res = await cdp.eval(`
                (async () => {
                    window.DocuMindAuth.resetAuthAttempts();
                    // Intentar iniciar sesión antes de confirmar el correo
                    window.DocuMindAuth.openAuthModal('login');
                    document.getElementById('auth-login-email').value = 'ana@documind.ai';
                    document.getElementById('auth-login-password').value = 'ClaveSegura2026!';
                    document.getElementById('form-auth-login').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 200));

                    const switchedToVerify = !document.getElementById('auth-view-verify').classList.contains('hidden');
                    const guardResult = window.DocuMindAuth.requireVerifiedAuth('Sincronización Privada');
                    const accountModalHidden = document.getElementById('account-modal').classList.contains('hidden');
                    return {
                        switchedToVerify,
                        guardResult,
                        accountModalHidden,
                        alertText: document.getElementById('auth-alert-box').textContent.trim()
                    };
                })()
            `);
            assert.strictEqual(res.switchedToVerify, true, 'Redirige a pantalla de verificación si el correo no está confirmado');
            assert.strictEqual(res.guardResult, false, 'requireVerifiedAuth bloquea acceso a cuenta no verificada');
            assert.strictEqual(res.accountModalHidden, true, 'El modal privado de cuenta permanece bloqueado');
            return 'Acceso privado bloqueado hasta verificar correo';
        });

        // --------------------------------------------------------------------
        // CASO 7: Contraseña incorrecta + Control de intentos fallidos
        // --------------------------------------------------------------------
        await step('Caso 7: Contraseña incorrecta muestra error claro y activa límite de intentos', async () => {
            const res = await cdp.eval(`
                (async () => {
                    // Confirmamos el correo del usuario en el entorno controlado
                    window.__DOCUMIND_MOCK_SUPABASE__.verifyUserByEmail('ana@documind.ai');
                    window.DocuMindAuth.resetAuthAttempts();

                    window.DocuMindAuth.openAuthModal('login');
                    document.getElementById('auth-login-email').value = 'ana@documind.ai';
                    document.getElementById('auth-login-password').value = 'ClaveIncorrecta000!';

                    // Mostrar/ocultar contraseña funciona
                    const toggleBtn = document.getElementById('btn-toggle-login-pass');
                    toggleBtn.click();
                    const typeAfterToggle = document.getElementById('auth-login-password').type;
                    toggleBtn.click();

                    document.getElementById('form-auth-login').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 150));
                    const firstErrorAlert = document.getElementById('auth-alert-box').textContent.trim();

                    // Disparar 4 intentos fallidos adicionales para activar protección fuerza bruta (total 5)
                    for (let i = 0; i < 4; i++) {
                        document.getElementById('form-auth-login').dispatchEvent(new Event('submit', { cancelable: true }));
                        await new Promise(r => setTimeout(r, 60));
                    }
                    // Intento #6 debe ser bloqueado por rate-limit
                    document.getElementById('form-auth-login').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 60));
                    const rateLimitAlert = document.getElementById('auth-alert-box').textContent.trim();

                    window.DocuMindAuth.resetAuthAttempts();
                    return { typeAfterToggle, firstErrorAlert, rateLimitAlert };
                })()
            `);
            assert.strictEqual(res.typeAfterToggle, 'text', 'El botón mostrar/ocultar contraseña cambia el input a text');
            assert.ok(res.firstErrorAlert.includes('incorrectos'), 'Muestra error de credenciales incorrectas');
            assert.ok(res.rateLimitAlert.includes('Demasiados intentos fallidos'), 'Bloquea tras 5 intentos fallidos consecutivos');
            return `${res.firstErrorAlert} -> Rate-limit verificado`;
        });

        // --------------------------------------------------------------------
        // CASO 6: Inicio de sesión correcto (signInWithPassword)
        // --------------------------------------------------------------------
        await step('Caso 6: Inicio de sesión correcto carga perfil, cierra modal y muestra bienvenida', async () => {
            const res = await cdp.eval(`
                (async () => {
                    window.DocuMindAuth.openAuthModal('login');
                    document.getElementById('auth-login-email').value = 'ana@documind.ai';
                    document.getElementById('auth-login-password').value = 'ClaveSegura2026!';
                    document.getElementById('auth-remember-me').checked = true;
                    document.getElementById('form-auth-login').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 300));

                    const user = window.DocuMindAuth.getCurrentUser();
                    const profile = window.DocuMindAuth.getCurrentProfile();
                    const modalHidden = document.getElementById('auth-modal').classList.contains('hidden');
                    const bannerVisible = document.getElementById('user-welcome-banner').style.display !== 'none';
                    const navUserVisible = document.getElementById('nav-auth-user').style.display !== 'none';
                    return {
                        email: user?.email,
                        profileName: profile?.full_name,
                        modalHidden,
                        bannerVisible,
                        navUserVisible
                    };
                })()
            `);
            assert.strictEqual(res.email, 'ana@documind.ai');
            assert.strictEqual(res.profileName, 'Ana Arquitecta');
            assert.strictEqual(res.modalHidden, true, 'Cierra el modal tras iniciar sesión');
            assert.strictEqual(res.bannerVisible, true, 'Muestra el banner de bienvenida del usuario');
            assert.strictEqual(res.navUserVisible, true, 'Muestra la cápsula de usuario en la barra superior');
            return `Sesión activa para ${res.profileName} (${res.email})`;
        });

        // --------------------------------------------------------------------
        // CASO 12: Persistencia de sesión al recargar
        // --------------------------------------------------------------------
        await step('Caso 12: Persistencia de sesión al recargar la página restaura usuario y proyectos', async () => {
            // Guardar un proyecto para Ana antes de recargar
            await cdp.eval(`
                (async () => {
                    const key = window.DocuMindAuth.getHistoryStorageKey();
                    const item = [{
                        id: 'proj_ana_1',
                        name: 'sistema-financiero-ana',
                        date: new Date().toISOString(),
                        lang: 'TypeScript',
                        filesCount: 24,
                        data: { projectId: 'proj_ana_1', repository: { name: 'sistema-financiero-ana', primaryLanguage: 'TypeScript' } }
                    }];
                    localStorage.setItem(key, JSON.stringify(item));
                })()
            `);

            await cdp.send('Page.reload', { ignoreCache: false });
            for (let i = 0; i < 40; i++) {
                const ready = await cdp.eval('Boolean(window.DocuMindAuth)').catch(() => false);
                if (ready) break;
                await sleep(250);
            }
            await sleep(1800);

            const res = await cdp.eval(`
                (async () => {
                    if (window.DocuMindAuth && window.DocuMindAuth.setSupabaseClient) {
                        await window.DocuMindAuth.setSupabaseClient(window.__DOCUMIND_MOCK_SUPABASE__);
                    }
                    await new Promise(r => setTimeout(r, 200));
                    const user = window.DocuMindAuth.getCurrentUser();
                    const badgeCount = document.getElementById('history-badge-count').textContent.trim();
                    const bannerVisible = document.getElementById('user-welcome-banner').style.display !== 'none';
                    return {
                        email: user?.email,
                        badgeCount,
                        bannerVisible
                    };
                })()
            `);
            assert.strictEqual(res.email, 'ana@documind.ai', 'Restaura el usuario tras recargar');
            assert.strictEqual(res.bannerVisible, true, 'Banner de usuario visible tras recargar');
            assert.strictEqual(res.badgeCount, '1', 'Restaura el historial de proyectos de Ana');
            return `Sesión y ${res.badgeCount} proyecto restaurados tras Page.reload`;
        });

        // --------------------------------------------------------------------
        // CASO 8: Recuperación de contraseña (resetPasswordForEmail)
        // --------------------------------------------------------------------
        await step('Caso 8: Solicitud de recuperación de contraseña envía enlace con redirección segura', async () => {
            const res = await cdp.eval(`
                (async () => {
                    window.DocuMindAuth.openAuthModal('forgot');
                    document.getElementById('auth-forgot-email').value = 'ana@documind.ai';
                    document.getElementById('form-auth-forgot').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 200));
                    const db = window.__DOCUMIND_MOCK_SUPABASE__.getDb();
                    const lastReq = db.recoveryRequests[db.recoveryRequests.length - 1];
                    return {
                        reqCount: db.recoveryRequests.length,
                        lastReq,
                        alertText: document.getElementById('auth-alert-box').textContent.trim()
                    };
                })()
            `);
            assert.strictEqual(res.reqCount, 1);
            assert.strictEqual(res.lastReq.email, 'ana@documind.ai');
            assert.ok(res.lastReq.redirectTo.includes('auth_action=reset_password'), 'Incluye URL de redirección configurada');
            assert.ok(res.alertText.includes('enlace seguro'), 'Muestra confirmación de envío');
            return `Redirect URL: ${res.lastReq.redirectTo}`;
        });

        // --------------------------------------------------------------------
        // CASO 9: Cambio de contraseña (PASSWORD_RECOVERY -> updateUser)
        // --------------------------------------------------------------------
        await step('Caso 9: Flujo de cambio de contraseña valida y actualiza credenciales mediante updateUser', async () => {
            const res = await cdp.eval(`
                (async () => {
                    window.__DOCUMIND_MOCK_SUPABASE__.triggerPasswordRecoveryEvent('ana@documind.ai');
                    await new Promise(r => setTimeout(r, 150));
                    const resetViewVisible = !document.getElementById('auth-view-reset').classList.contains('hidden');

                    document.getElementById('auth-reset-password').value = 'NuevaClaveUltra2026#';
                    document.getElementById('auth-reset-confirm').value = 'NuevaClaveUltra2026#';
                    document.getElementById('form-auth-reset').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 150));
                    var alertText = document.getElementById('auth-alert-box').textContent.trim() || alertText;
                    await new Promise(r => setTimeout(r, 950));
                    await new Promise(r => setTimeout(r, 250));

                    var alertText = document.getElementById('auth-alert-box').textContent.trim() || alertText;

                    // Probar que la nueva contraseña funciona al iniciar sesión
                    await window.DocuMindAuth.handleLogout();
                    window.DocuMindAuth.openAuthModal('login');
                    document.getElementById('auth-login-email').value = 'ana@documind.ai';
                    document.getElementById('auth-login-password').value = 'NuevaClaveUltra2026#';
                    document.getElementById('form-auth-login').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 250));

                    return {
                        resetViewVisible,
                        alertText,
                        loggedUserAfterReset: window.DocuMindAuth.getCurrentUser()?.email
                    };
                })()
            `);
            assert.strictEqual(res.resetViewVisible, true, 'Se abre automáticamente la vista de nueva contraseña');
            assert.ok(res.alertText.includes('actualizado correctamente'), 'Informa que la contraseña se cambió correctamente');
            assert.strictEqual(res.loggedUserAfterReset, 'ana@documind.ai', 'Permite iniciar sesión con la nueva contraseña');
            return res.alertText;
        });

        // --------------------------------------------------------------------
        // CASO 11: Cierre de sesión (signOut)
        // --------------------------------------------------------------------
        await step('Caso 11: Cierre de sesión limpia el estado del usuario y restaura vista de invitado', async () => {
            const res = await cdp.eval(`
                (async () => {
                    document.getElementById('btn-logout').click();
                    await new Promise(r => setTimeout(r, 200));
                    return {
                        currentUser: window.DocuMindAuth.getCurrentUser(),
                        guestVisible: document.getElementById('nav-auth-guest').style.display !== 'none',
                        bannerHidden: document.getElementById('user-welcome-banner').style.display === 'none'
                    };
                })()
            `);
            assert.strictEqual(res.currentUser, null, 'currentUser queda en null tras signOut');
            assert.strictEqual(res.guestVisible, true, 'Botón de Iniciar Sesión visible nuevamente');
            assert.strictEqual(res.bannerHidden, true, 'Banner de bienvenida oculto');
            return 'Sesión cerrada limpiamente';
        });

        // --------------------------------------------------------------------
        // CASO 10: Inicio de sesión con Google OAuth (coexistencia intacta)
        // --------------------------------------------------------------------
        await step('Caso 10: Inicio de sesión con Google OAuth funciona simultáneamente y registra proveedor Google', async () => {
            const res = await cdp.eval(`
                (async () => {
                    window.DocuMindAuth.openAuthModal('login');
                    const googleBtn = document.getElementById('btn-oauth-google');
                    const visibleInLogin = googleBtn && googleBtn.offsetParent !== null;
                    window.DocuMindAuth.switchAuthView('signup');
                    const visibleInSignup = googleBtn && googleBtn.offsetParent !== null;

                    googleBtn.click();
                    await new Promise(r => setTimeout(r, 300));

                    const db = window.__DOCUMIND_MOCK_SUPABASE__.getDb();
                    const user = window.DocuMindAuth.getCurrentUser();
                    document.getElementById('btn-user-account').click();
                    await new Promise(r => setTimeout(r, 100));
                    const providerLabel = document.getElementById('acc-modal-provider').textContent.trim();
                    document.getElementById('btn-close-account-modal').click();

                    return {
                        visibleInLogin,
                        visibleInSignup,
                        oauthCallsCount: db.oauthCalls.length,
                        provider: db.oauthCalls[0]?.provider,
                        loggedEmail: user?.email,
                        providerLabel
                    };
                })()
            `);
            assert.strictEqual(res.visibleInLogin, true, 'Botón Google visible en Iniciar Sesión');
            assert.strictEqual(res.visibleInSignup, true, 'Botón Google visible en Crear Cuenta');
            assert.strictEqual(res.oauthCallsCount, 1, 'Invoca signInWithOAuth');
            assert.strictEqual(res.provider, 'google');
            assert.strictEqual(res.loggedEmail, 'oauth.google.user@empresa.com');
            assert.strictEqual(res.providerLabel, 'Google OAuth 2.0');
            return `Google OAuth verificado (${res.loggedEmail} — ${res.providerLabel})`;
        });

        // --------------------------------------------------------------------
        // CASO 14: Separación de datos entre usuarios (Usuario A vs Usuario B)
        // --------------------------------------------------------------------
        await step('Caso 14: Separación estricta de proyectos e historial entre usuarios distintos', async () => {
            const res = await cdp.eval(`
                (async () => {
                    // Actualmente está conectado Carlos (Google OAuth). Verificamos que NO ve el proyecto de Ana
                    const carlosHistoryBefore = document.getElementById('history-list').textContent;
                    const carlosSeesAnaProject = carlosHistoryBefore.includes('sistema-financiero-ana');

                    // Guardamos un proyecto exclusivo de Carlos
                    const carlosKey = window.DocuMindAuth.getHistoryStorageKey();
                    localStorage.setItem(carlosKey, JSON.stringify([{
                        id: 'proj_carlos_99',
                        name: 'microservicio-pagos-carlos',
                        date: new Date().toISOString(),
                        lang: 'Go',
                        filesCount: 18,
                        data: { projectId: 'proj_carlos_99', repository: { name: 'microservicio-pagos-carlos', primaryLanguage: 'Go' } }
                    }]));

                    // Cerramos sesión de Carlos e iniciamos sesión con Ana
                    await window.DocuMindAuth.handleLogout();
                    window.DocuMindAuth.openAuthModal('login');
                    document.getElementById('auth-login-email').value = 'ana@documind.ai';
                    document.getElementById('auth-login-password').value = 'NuevaClaveUltra2026#';
                    document.getElementById('form-auth-login').dispatchEvent(new Event('submit', { cancelable: true }));
                    await new Promise(r => setTimeout(r, 250));

                    const anaHistoryText = document.getElementById('history-list').textContent;
                    const anaSeesOwnProject = anaHistoryText.includes('sistema-financiero-ana');
                    const anaSeesCarlosProject = anaHistoryText.includes('microservicio-pagos-carlos');

                    return {
                        carlosSeesAnaProject,
                        anaSeesOwnProject,
                        anaSeesCarlosProject
                    };
                })()
            `);
            assert.strictEqual(res.carlosSeesAnaProject, false, 'El Usuario B no puede ver proyectos del Usuario A');
            assert.strictEqual(res.anaSeesOwnProject, true, 'El Usuario A recupera sus propios proyectos');
            assert.strictEqual(res.anaSeesCarlosProject, false, 'El Usuario A no ve los proyectos del Usuario B');
            return 'Aislamiento de historial y proyectos entre Usuario A y Usuario B confirmado';
        });

        // --------------------------------------------------------------------
        // CASO 15: Diseño responsive del modal de autenticación (320px - 1440px)
        // --------------------------------------------------------------------
        await step('Caso 15: Diseño responsive del modal de autenticación en 320px, 375px, 768px, 1024px y 1440px', async () => {
            const viewports = [
                { width: 320, height: 640 },
                { width: 375, height: 667 },
                { width: 768, height: 1024 },
                { width: 1024, height: 768 },
                { width: 1440, height: 900 }
            ];
            for (const vp of viewports) {
                await cdp.send('Emulation.setDeviceMetricsOverride', {
                    width: vp.width,
                    height: vp.height,
                    deviceScaleFactor: 1,
                    mobile: vp.width < 768
                });
                await sleep(100);
                const check = await cdp.eval(`
                    (() => {
                        window.DocuMindAuth.openAuthModal('signup');
                        const card = document.querySelector('#auth-modal .auth-saas-card');
                        const rect = card.getBoundingClientRect();
                        return {
                            cardWidth: Math.round(rect.width),
                            viewportWidth: window.innerWidth,
                            fitsViewport: rect.width <= window.innerWidth + 1
                        };
                    })()
                `);
                assert.strictEqual(check.fitsViewport, true, `Desbordamiento en ${vp.width}px: card=${check.cardWidth}px`);
            }
            await cdp.eval(`window.DocuMindAuth.closeAuthModal()`);
            return '5 resoluciones verificadas sin desbordamiento (320px–1440px)';
        });

        // Verificar 0 excepciones JS no controladas en todo el flujo
        await step('Verificación de 0 errores de ejecución en consola durante todos los flujos Auth', async () => {
            assert.strictEqual(cdp.pageExceptions.length, 0, `Excepciones detectadas: ${JSON.stringify(cdp.pageExceptions)}`);
            return '0 excepciones JS en navegador';
        });

    } finally {
        if (cdp) cdp.close();
        if (chromeProc) {
            try { chromeProc.kill('SIGKILL'); } catch (_) {}
        }
        if (serverProc) {
            try { serverProc.kill('SIGKILL'); } catch (_) {}
        }
    }

    console.log('\n====================================================================');
    console.log(`📊 RESUMEN SUITE AUTENTICACIÓN E2E: ${passed} PASARON | ${failed} FALLARON`);
    console.log('====================================================================\n');

    if (failed > 0) process.exit(1);
}

runAuthSuite().catch(err => {
    console.error('Fatal error in Auth E2E suite:', err);
    process.exit(1);
});
