/**
 * DOCUMENT-MIND AI — SMART GEMINI API CLIENT & TELEMETRY ENGINE
 * Manages Google Gemini API interactions via official @google/genai SDK.
 * Features rate-limit resilience, exponential backoff, intelligent caching,
 * and comprehensive administrative diagnostic telemetry.
 */

const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const { buildSpecializedPrompt } = require('./promptEngine');
const { validateResponse } = require('./responseValidator');
const { estimateTokens } = require('./tokenManager');

// Model selection preserving user environment variables
function getModelName() {
    return process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-2.5-flash';
}

/**
 * Returns an initialized GoogleGenAI instance if valid GEMINI_API_KEY is present.
 */
function getGenAIClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.trim().startsWith('tu_clave')) {
        return null;
    }
    return new GoogleGenAI({ apiKey: apiKey.trim() });
}

// In-Memory Telemetry Ring Buffer (Last 60 calls)
const TELEMETRY_BUFFER_SIZE = 60;
const aiTelemetryLog = [];

// In-Memory Response Cache to conserve quota across identical requests
const aiResponseCache = new Map();
const MAX_CACHE_ENTRIES = 100;

/**
 * Generates a SHA-256 cache key for a prompt request.
 */
function computeCacheKey(model, taskType, promptText) {
    return crypto.createHash('sha256')
        .update(`${model}::${taskType}::${promptText}`)
        .digest('hex');
}

/**
 * Records a diagnostic log entry into the telemetry buffer.
 */
function recordTelemetry(entry) {
    aiTelemetryLog.unshift({
        id: `AI-CALL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        ...entry
    });
    if (aiTelemetryLog.length > TELEMETRY_BUFFER_SIZE) {
        aiTelemetryLog.pop();
    }
}

/**
 * Returns administrative diagnostic metrics and call history.
 */
function getAiDiagnostics() {
    const totalCalls = aiTelemetryLog.length;
    const successfulCalls = aiTelemetryLog.filter(e => e.status === 'success').length;
    const cachedCalls = aiTelemetryLog.filter(e => e.cacheHit).length;
    const quotaExhaustedCalls = aiTelemetryLog.filter(e => e.status === 'quota_exhausted').length;
    const errorCalls = aiTelemetryLog.filter(e => e.status === 'error').length;

    const avgLatency = totalCalls > 0
        ? Math.round(aiTelemetryLog.reduce((sum, e) => sum + (e.latencyMs || 0), 0) / totalCalls)
        : 0;

    return {
        modelConfigured: getModelName(),
        isApiKeyPresent: !!getGenAIClient(),
        totalTrackedCalls: totalCalls,
        successfulCalls,
        cachedCalls,
        quotaExhaustedCalls,
        errorCalls,
        averageLatencyMs: avgLatency,
        cacheSize: aiResponseCache.size,
        recentCalls: aiTelemetryLog.slice(0, 20)
    };
}

/**
 * Executes a Gemini request with automatic retries and exponential backoff on transient errors.
 * @param {GoogleGenAI} client
 * @param {string} model
 * @param {string} promptText
 * @param {string} systemInstruction
 * @param {number} [maxRetries=2]
 * @returns {Promise<{ rawText: string, latencyMs: number, retryCount: number, error: any }>}
 */
async function callGeminiWithRetry(client, model, promptText, systemInstruction, maxRetries = 2) {
    let attempt = 0;
    let delayMs = 1200;
    const startTime = Date.now();

    while (attempt <= maxRetries) {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout de Gemini excedido (25s)')), 25000)
            );

            const callPromise = client.models.generateContent({
                model,
                contents: [
                    { role: 'user', parts: [{ text: promptText }] }
                ],
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    temperature: 0.2
                }
            });

            const response = await Promise.race([callPromise, timeoutPromise]);
            const latencyMs = Date.now() - startTime;

            return {
                rawText: response.text || '',
                latencyMs,
                retryCount: attempt,
                error: null
            };
        } catch (err) {
            attempt++;
            const isRateLimit = err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.includes('RESOURCE_EXHAUSTED'));
            const isTransient = err.message && (err.message.includes('Timeout') || err.message.includes('ECONNRESET') || err.message.includes('503'));

            // If it's a hard daily quota exhaustion, do NOT spin in retries
            if (isRateLimit && err.message && err.message.includes('requests per day')) {
                return {
                    rawText: '',
                    latencyMs: Date.now() - startTime,
                    retryCount: attempt - 1,
                    error: err,
                    isDailyQuotaExhausted: true
                };
            }

            if (attempt <= maxRetries && (isRateLimit || isTransient)) {
                console.warn(`[GeminiClient] Reintento ${attempt}/${maxRetries} tras error (${err.message}). Esperando ${delayMs}ms...`);
                await new Promise(r => setTimeout(r, delayMs));
                delayMs *= 2; // Exponential backoff
            } else {
                return {
                    rawText: '',
                    latencyMs: Date.now() - startTime,
                    retryCount: attempt - 1,
                    error: err,
                    isDailyQuotaExhausted: isRateLimit
                };
            }
        }
    }
}

/**
 * Main Orchestrator: Executes a specialized AI prompt task with caching, validation, and telemetry.
 * @param {string} taskType - 'repoAnalysis' | 'prd' | 'srs' | 'architecture' | 'eda' | 'security' | 'qa' | 'openapi'
 * @param {object} analysisContext - Project metadata and files
 * @param {object} [options] - Options { language, forceFresh, tokenBudget }
 * @returns {Promise<{ success: boolean, source: 'gemini'|'cache'|'deterministic_fallback', data: object, diagnostics: object }>}
 */
async function executeSpecializedTask(taskType, analysisContext = {}, options = {}) {
    const client = getGenAIClient();
    const model = getModelName();

    // 1. Build specialized prompt
    const promptPackage = buildSpecializedPrompt(taskType, analysisContext, options);
    const { systemInstruction, promptText, tokenEstimate, packedFilesCount } = promptPackage;

    // Diagnostic base payload
    const diagBase = {
        taskType,
        model,
        promptTokensEstimate: tokenEstimate,
        packedFilesCount,
        timestamp: new Date().toISOString()
    };

    // 2. Check if API client is available
    if (!client) {
        recordTelemetry({
            ...diagBase,
            status: 'no_api_key',
            latencyMs: 0,
            cacheHit: false,
            errorReason: 'GEMINI_API_KEY no configurada'
        });
        return {
            success: false,
            source: 'deterministic_fallback',
            reason: 'GEMINI_API_KEY no configurada. Operando en modo determinista local.',
            diagnostics: { ...diagBase, status: 'no_api_key' }
        };
    }

    // 3. Check in-memory cache
    const cacheKey = computeCacheKey(model, taskType, promptText);
    if (!options.forceFresh && aiResponseCache.has(cacheKey)) {
        const cached = aiResponseCache.get(cacheKey);
        recordTelemetry({
            ...diagBase,
            status: 'success',
            latencyMs: 5,
            cacheHit: true,
            completionTokensEstimate: estimateTokens(JSON.stringify(cached.data))
        });
        return {
            success: true,
            source: 'cache',
            data: cached.data,
            diagnostics: { ...diagBase, status: 'cache_hit', cacheHit: true }
        };
    }

    // 4. Call Gemini API
    const callResult = await callGeminiWithRetry(client, model, promptText, systemInstruction);

    if (callResult.error) {
        const isQuotaExhausted = callResult.isDailyQuotaExhausted || (callResult.error.message && callResult.error.message.includes('429'));
        const status = isQuotaExhausted ? 'quota_exhausted' : 'error';
        const errorReason = isQuotaExhausted
            ? 'Límite de cuota diaria de Gemini alcanzado (429 RESOURCE_EXHAUSTED). Operando en modo de alta fidelidad determinista.'
            : callResult.error.message;

        recordTelemetry({
            ...diagBase,
            status,
            latencyMs: callResult.latencyMs,
            cacheHit: false,
            retries: callResult.retryCount,
            errorReason
        });

        return {
            success: false,
            source: 'deterministic_fallback',
            isQuotaExhausted,
            error: errorReason,
            diagnostics: {
                ...diagBase,
                status,
                latencyMs: callResult.latencyMs,
                retries: callResult.retryCount,
                errorReason
            }
        };
    }

    // 5. Validate and repair response
    const validation = validateResponse(taskType, callResult.rawText);

    if (!validation.isValid) {
        recordTelemetry({
            ...diagBase,
            status: 'validation_failed',
            latencyMs: callResult.latencyMs,
            cacheHit: false,
            retries: callResult.retryCount,
            errorReason: validation.errors.join('; ')
        });

        return {
            success: false,
            source: 'deterministic_fallback',
            error: `Respuesta de Gemini inválida: ${validation.errors.join('; ')}`,
            partialData: validation.data,
            diagnostics: {
                ...diagBase,
                status: 'validation_failed',
                latencyMs: callResult.latencyMs,
                errors: validation.errors,
                warnings: validation.warnings
            }
        };
    }

    // 6. Save in cache
    if (aiResponseCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = aiResponseCache.keys().next().value;
        aiResponseCache.delete(firstKey);
    }
    aiResponseCache.set(cacheKey, { data: validation.data, timestamp: Date.now() });

    // 7. Record successful telemetry
    const completionTokensEstimate = estimateTokens(callResult.rawText);
    recordTelemetry({
        ...diagBase,
        status: 'success',
        latencyMs: callResult.latencyMs,
        cacheHit: false,
        retries: callResult.retryCount,
        completionTokensEstimate,
        isRepaired: validation.isRepaired,
        isTruncated: validation.isTruncated
    });

    return {
        success: true,
        source: 'gemini',
        data: validation.data,
        diagnostics: {
            ...diagBase,
            status: 'success',
            latencyMs: callResult.latencyMs,
            retries: callResult.retryCount,
            completionTokensEstimate,
            isRepaired: validation.isRepaired,
            isTruncated: validation.isTruncated
        }
    };
}

module.exports = {
    getModelName,
    getGenAIClient,
    executeSpecializedTask,
    getAiDiagnostics,
    callGeminiWithRetry,
    computeCacheKey
};
