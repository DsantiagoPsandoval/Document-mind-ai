/**
 * DOCUMIND AI — EVENT-DRIVEN ARCHITECTURE (EDA)
 * Event Contracts, Canonical Types, and Payload Validation
 */

const crypto = require('crypto');
const { redactAllSecrets } = require('../analyzer/security/secretScanner');

// Canonical Event Types
const EVENT_TYPES = {
    // Repository Events
    REPOSITORY_REGISTERED: 'repository.registered',
    REPOSITORY_IMPORT_STARTED: 'repository.import.started',
    REPOSITORY_IMPORT_COMPLETED: 'repository.import.completed',
    REPOSITORY_IMPORT_FAILED: 'repository.import.failed',
    REPOSITORY_COMMIT_DETECTED: 'repository.commit.detected',

    // Analysis Events
    ANALYSIS_REQUESTED: 'analysis.requested',
    ANALYSIS_STARTED: 'analysis.started',
    ANALYSIS_COMPLETED: 'analysis.completed',
    ANALYSIS_FAILED: 'analysis.failed',

    // Documentation Events
    DOCUMENTATION_GENERATION_REQUESTED: 'documentation.generation.requested',
    DOCUMENTATION_GENERATED: 'documentation.generated',
    DOCUMENTATION_UPDATED: 'documentation.updated',
    DOCUMENTATION_GENERATION_FAILED: 'documentation.generation.failed',

    // Security & SAST Events
    SECURITY_SCAN_REQUESTED: 'security.scan.requested',
    SECURITY_SCAN_COMPLETED: 'security.scan.completed',
    SECURITY_ISSUE_DETECTED: 'security.issue.detected',

    // Simulation Events (M/M/c & MCDA)
    SIMULATION_STARTED: 'simulation.started',
    SIMULATION_COMPLETED: 'simulation.completed',
    SIMULATION_FAILED: 'simulation.failed',

    // User & Identity Events
    USER_SESSION_STARTED: 'user.session.started',
    USER_PROJECT_CREATED: 'user.project.created'
};

const EVENT_STATUS = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    DEAD_LETTER: 'DEAD_LETTER'
};

/**
 * Deep sanitization of event payloads to guarantee zero raw credentials or infinite recursion.
 */
function sanitizePayload(obj, depth = 0) {
    if (depth > 6) return '[MAX_DEPTH]';
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
        // Redact secrets and limit length if excessive
        const clean = redactAllSecrets(obj);
        return clean.length > 50000 ? clean.substring(0, 50000) + '...[TRUNCATED]' : clean;
    }
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj.slice(0, 200).map(item => sanitizePayload(item, depth + 1));
    }

    const sanitized = {};
    for (const [key, val] of Object.entries(obj)) {
        const keyLower = key.toLowerCase();
        if (keyLower.includes('password') || keyLower.includes('token') || keyLower.includes('secret') || keyLower.includes('key') || keyLower.includes('auth') || keyLower.includes('credential')) {
            if (typeof val === 'string') {
                sanitized[key] = val.length > 8 ? `${val.substring(0, 3)}...[REDACTED]` : '[REDACTED]';
                continue;
            }
        }
        sanitized[key] = sanitizePayload(val, depth + 1);
    }
    return sanitized;
}

/**
 * Validates whether an event object satisfies the EDA contract.
 */
function validateEvent(event) {
    if (!event || typeof event !== 'object') {
        throw new Error('El evento debe ser un objeto válido.');
    }
    if (!event.event_type || typeof event.event_type !== 'string') {
        throw new Error('Campo obligatorio ausente: event_type');
    }
    if (!event.aggregate_id || typeof event.aggregate_id !== 'string') {
        throw new Error('Campo obligatorio ausente: aggregate_id');
    }
    if (!event.correlation_id || typeof event.correlation_id !== 'string') {
        throw new Error('Campo obligatorio ausente: correlation_id');
    }
    if (event.payload === undefined) {
        throw new Error('Campo obligatorio ausente: payload');
    }
    return true;
}

/**
 * Factory function to construct a well-formed EDA Event.
 */
function createEvent(eventType, payload = {}, options = {}) {
    const eventId = options.event_id || crypto.randomUUID();
    const correlationId = options.correlation_id || `corr_${crypto.randomUUID()}`;
    const aggregateId = String(options.aggregate_id || payload.repoUrl || payload.projectId || 'system');
    const causationId = options.causation_id || null;
    const userId = options.user_id || null;

    const event = {
        event_id: eventId,
        event_type: eventType,
        event_version: options.event_version || '1.0.0',
        aggregate_id: aggregateId,
        correlation_id: correlationId,
        causation_id: causationId,
        user_id: userId,
        payload: sanitizePayload(payload),
        status: options.status || EVENT_STATUS.PENDING,
        retry_count: options.retry_count || 0,
        max_retries: options.max_retries !== undefined ? options.max_retries : 3,
        next_retry_at: options.next_retry_at || new Date().toISOString(),
        error_message: options.error_message || null,
        created_at: options.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    validateEvent(event);
    return event;
}

module.exports = {
    EVENT_TYPES,
    EVENT_STATUS,
    sanitizePayload,
    validateEvent,
    createEvent
};
