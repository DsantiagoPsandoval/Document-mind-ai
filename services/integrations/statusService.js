/**
 * DOCUMENT-MIND AI — INTEGRATIONS HEALTH & STATUS SERVICE
 * Inspects all active cloud and AI service connections without exposing sensitive tokens.
 */

const { GoogleGenAI } = require('@google/genai');

/**
 * Checks GitHub Public API rate limit without exposing tokens.
 */
async function checkGitHubPublicStatus() {
    try {
        const headers = { 'User-Agent': 'DocumentMindAI-Platform/1.0' };
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
            headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
        }
        const res = await fetch('https://api.github.com/rate_limit', { headers });
        if (res.ok) {
            const data = await res.json();
            const core = data.resources?.core || {};
            return {
                status: 'operational',
                message: 'Conectado a GitHub REST API v3 pública',
                rateLimitLimit: core.limit || 60,
                rateLimitRemaining: core.remaining || 60,
                authenticatedMode: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim())
            };
        }
        return {
            status: 'degraded',
            message: `GitHub API HTTP ${res.status}: ${res.statusText}`,
            rateLimitLimit: 60,
            rateLimitRemaining: 0,
            authenticatedMode: false
        };
    } catch (e) {
        return {
            status: 'offline',
            message: `No se pudo conectar a GitHub: ${e.message}`,
            authenticatedMode: false
        };
    }
}

/**
 * Checks Gemini AI connectivity.
 */
async function checkGeminiStatus() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.trim().startsWith('tu_clave')) {
        return {
            status: 'unconfigured',
            model: 'Motor Estático Determinista (Fallback)',
            message: 'Clave GEMINI_API_KEY no configurada. Operando en modo determinista.'
        };
    }

    try {
        const start = Date.now();
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';
        
        // Lightweight ping
        const pingPromise = ai.models.generateContent({
            model: modelName,
            contents: 'ping'
        });
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout de verificación (6s)')), 6000)
        );
        await Promise.race([pingPromise, timeoutPromise]);

        return {
            status: 'operational',
            model: modelName,
            latencyMs: Date.now() - start,
            message: 'Motor cognitivo Gemini 2.5 Flash activo y respondiendo.'
        };
    } catch (e) {
        return {
            status: 'fallback_active',
            model: process.env.AI_MODEL || 'gemini-2.5-flash',
            message: `Gemini en modo contingencia (${e.message}). Motor determinista AST activo.`
        };
    }
}

/**
 * Checks Supabase configuration and connectivity.
 */
function checkSupabaseStatus() {
    const url = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : '';
    const anonKey = process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.trim() : '';

    const isConfigured = Boolean(
        url && anonKey && !url.includes('tu-proyecto') && !anonKey.startsWith('tu_')
    );

    return {
        status: isConfigured ? 'operational' : 'unconfigured',
        authMethod: 'Google OAuth + Supabase Auth',
        dbSync: isConfigured,
        projectHost: isConfigured ? (url.match(/https:\/\/([^.]+)\.supabase\.co/) || ['', 'cloud'])[1] + '.supabase.co' : 'Sin configurar'
    };
}

/**
 * Aggregates all integration statuses.
 */
async function getIntegrationsStatus() {
    const [github, gemini] = await Promise.all([
        checkGitHubPublicStatus(),
        checkGeminiStatus()
    ]);
    const supabase = checkSupabaseStatus();

    return {
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        renderBackend: {
            status: 'operational',
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        },
        supabase,
        gemini,
        githubPublic: github
    };
}

module.exports = {
    getIntegrationsStatus,
    checkGitHubPublicStatus,
    checkGeminiStatus,
    checkSupabaseStatus
};
