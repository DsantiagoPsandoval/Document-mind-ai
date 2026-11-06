/**
 * DOCUMIND AI — EVENT STORE & TRANSACTIONAL OUTBOX
 * Dual persistence engine: Supabase PostgreSQL with local disk fallback (data/event_store.json).
 * Implements crash recovery, idempotency check, and Dead Letter Queue management.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { EVENT_STATUS } = require('./eventContract');

class EventStore {
    constructor() {
        this.storeDir = path.join(__dirname, '..', '..', 'data');
        this.storeFile = path.join(this.storeDir, 'event_store.json');
        this.dlqFile = path.join(this.storeDir, 'dead_letter_store.json');
        this.logsFile = path.join(this.storeDir, 'event_logs_store.json');

        // Ensure data directory exists
        if (!fs.existsSync(this.storeDir)) {
            try {
                fs.mkdirSync(this.storeDir, { recursive: true });
            } catch (e) {
                console.error('[EventStore] Error creating data directory:', e.message);
            }
        }

        // Local cache / in-memory indices
        this.localEvents = this.loadLocalFile(this.storeFile, []);
        this.localDLQ = this.loadLocalFile(this.dlqFile, []);
        this.localLogs = this.loadLocalFile(this.logsFile, []);

        // Processed event IDs cache for rapid in-memory deduplication
        this.processedEventIds = new Set();
        this.localEvents.forEach(e => {
            if (e.status === EVENT_STATUS.COMPLETED) {
                this.processedEventIds.add(e.event_id);
            }
        });

        // Supabase client initialization
        this.supabase = null;
        this.supabaseAvailable = true;
        this.initSupabase();

        // Save periodically if dirty
        this.isDirty = false;
        this.persistInterval = setInterval(() => {
            if (this.isDirty) {
                this.persistLocalFiles();
                this.isDirty = false;
            }
        }, 3000);
        if (this.persistInterval.unref) this.persistInterval.unref();
    }

    initSupabase() {
        const url = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : '';
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        const cleanKey = key ? key.trim() : '';

        if (url && cleanKey && !url.includes('placeholder') && !cleanKey.includes('placeholder')) {
            try {
                this.supabase = createClient(url, cleanKey, {
                    auth: { persistSession: false, autoRefreshToken: false }
                });
                console.log('[EventStore] Supabase PostgreSQL event store configurado.');
            } catch (err) {
                console.warn('[EventStore] Supabase init warning:', err.message);
                this.supabase = null;
                this.supabaseAvailable = false;
            }
        } else {
            this.supabaseAvailable = false;
            console.log('[EventStore] Operando en modo local persistente (data/event_store.json).');
        }
    }

    loadLocalFile(filepath, fallback) {
        if (!fs.existsSync(filepath)) return fallback;
        try {
            const raw = fs.readFileSync(filepath, 'utf8');
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    persistLocalFiles() {
        try {
            fs.writeFileSync(this.storeFile, JSON.stringify(this.localEvents.slice(-2000), null, 2), 'utf8');
            fs.writeFileSync(this.dlqFile, JSON.stringify(this.localDLQ.slice(-1000), null, 2), 'utf8');
            fs.writeFileSync(this.logsFile, JSON.stringify(this.localLogs.slice(-3000), null, 2), 'utf8');
        } catch (e) {
            console.error('[EventStore] Error persisting local files:', e.message);
        }
    }

    /**
     * Check if an event was already processed (Idempotency Guard).
     */
    isDuplicate(eventId) {
        if (!eventId) return false;
        return this.processedEventIds.has(eventId);
    }

    /**
     * Save event to Outbox / Store with status PENDING.
     */
    async saveEvent(event) {
        // 1. Store in local collection immediately
        const existingIdx = this.localEvents.findIndex(e => e.event_id === event.event_id);
        if (existingIdx !== -1) {
            this.localEvents[existingIdx] = { ...this.localEvents[existingIdx], ...event, updated_at: new Date().toISOString() };
        } else {
            this.localEvents.push(event);
        }
        this.isDirty = true;

        // 2. Persist to Supabase asynchronously without blocking local bus
        if (this.supabase && this.supabaseAvailable) {
            this.safeSupabaseCall(() => this.syncEventToSupabase(event));
        }

        return event;
    }

    async safeSupabaseCall(fn) {
        if (!this.supabase || !this.supabaseAvailable) return null;
        try {
            const res = await fn();
            if (res && res.error) {
                if (res.error.message && (res.error.message.includes('schema cache') || res.error.message.includes('does not exist'))) {
                    this.supabaseAvailable = false;
                    console.warn('[EventStore] Tablas EDA no detectadas en Supabase (ejecutar supabase_eda_schema.sql); operando con almacenamiento local.');
                }
                return null;
            }
            return res;
        } catch (err) {
            return null;
        }
    }

    async syncEventToSupabase(event) {
        return this.supabase
            .from('events')
            .upsert({
                event_id: event.event_id,
                event_type: event.event_type,
                event_version: event.event_version || '1.0.0',
                aggregate_id: event.aggregate_id,
                correlation_id: event.correlation_id,
                causation_id: event.causation_id,
                user_id: event.user_id,
                payload: event.payload,
                status: event.status,
                retry_count: event.retry_count,
                max_retries: event.max_retries,
                next_retry_at: event.next_retry_at,
                error_message: event.error_message,
                created_at: event.created_at,
                updated_at: new Date().toISOString()
            }, { onConflict: 'event_id' });
    }

    /**
     * Update event status (PROCESSING, COMPLETED, FAILED, DEAD_LETTER).
     */
    async updateEventStatus(eventId, status, details = {}) {
        const now = new Date().toISOString();
        const event = this.localEvents.find(e => e.event_id === eventId);
        if (event) {
            event.status = status;
            event.updated_at = now;
            if (details.error_message !== undefined) event.error_message = details.error_message;
            if (details.retry_count !== undefined) event.retry_count = details.retry_count;
            if (details.next_retry_at) event.next_retry_at = details.next_retry_at;
            this.isDirty = true;

            if (status === EVENT_STATUS.COMPLETED) {
                this.processedEventIds.add(eventId);
            }
        }

        if (this.supabase && this.supabaseAvailable) {
            this.safeSupabaseCall(() => this.syncStatusToSupabase(eventId, status, details, now));
        }

        return event;
    }

    async syncStatusToSupabase(eventId, status, details, now) {
        const updatePayload = {
            status,
            updated_at: now
        };
        if (details.error_message !== undefined) updatePayload.error_message = details.error_message;
        if (details.retry_count !== undefined) updatePayload.retry_count = details.retry_count;
        if (details.next_retry_at) updatePayload.next_retry_at = details.next_retry_at;

        return this.supabase
            .from('events')
            .update(updatePayload)
            .eq('event_id', eventId);
    }

    /**
     * Move an event to the Dead Letter Queue after exhausting all retries.
     */
    async moveToDeadLetter(event, error) {
        const dlqEntry = {
            dlq_id: crypto.randomUUID(),
            original_event_id: event.event_id,
            event_type: event.event_type,
            aggregate_id: event.aggregate_id,
            correlation_id: event.correlation_id,
            payload: event.payload,
            error_stack: error ? (error.stack || error.message || String(error)) : 'Desconocido',
            retry_count: event.retry_count,
            failed_at: new Date().toISOString(),
            resolved: false
        };

        this.localDLQ.push(dlqEntry);
        await this.updateEventStatus(event.event_id, EVENT_STATUS.DEAD_LETTER, {
            error_message: `DLQ: ${error ? error.message : 'Exhausted retries'}`
        });

        if (this.supabase && this.supabaseAvailable) {
            this.safeSupabaseCall(() => this.supabase.from('dead_letter_events').insert(dlqEntry));
        }

        console.error(`[EventStore] [DLQ] Evento ${event.event_id} (${event.event_type}) movido a Dead Letter Queue.`);
        return dlqEntry;
    }

    /**
     * Log a processing step for observability and timeline tracing.
     */
    async logStep(eventId, consumerId, step, status, durationMs = 0, details = {}) {
        const logEntry = {
            log_id: crypto.randomUUID(),
            event_id: eventId,
            consumer_id: consumerId,
            step,
            status,
            duration_ms: durationMs,
            details,
            created_at: new Date().toISOString()
        };

        this.localLogs.push(logEntry);
        this.isDirty = true;

        if (this.supabase && this.supabaseAvailable) {
            this.safeSupabaseCall(() => this.supabase.from('event_processing_logs').insert(logEntry));
        }

        return logEntry;
    }

    /**
     * Recover orphaned events upon server start / reboot.
     */
    async recoverPendingEvents() {
        let recoveredCount = 0;
        this.localEvents.forEach(e => {
            if (e.status === EVENT_STATUS.PROCESSING) {
                e.status = EVENT_STATUS.PENDING;
                e.next_retry_at = new Date().toISOString();
                recoveredCount++;
            }
        });

        if (recoveredCount > 0) {
            this.isDirty = true;
            this.persistLocalFiles();
            console.log(`[EventStore] Recuperación ante reinicio: ${recoveredCount} tareas reanudadas a estado PENDING.`);
        }

        if (this.supabase && this.supabaseAvailable) {
            this.safeSupabaseCall(() =>
                this.supabase
                    .from('events')
                    .update({ status: EVENT_STATUS.PENDING, next_retry_at: new Date().toISOString() })
                    .eq('status', EVENT_STATUS.PROCESSING)
            );
        }

        return recoveredCount;
    }

    /**
     * Fetch pending events due for processing.
     */
    getPendingEvents(limit = 10) {
        const now = new Date();
        return this.localEvents
            .filter(e => (e.status === EVENT_STATUS.PENDING) || (e.status === EVENT_STATUS.FAILED && e.retry_count < e.max_retries && new Date(e.next_retry_at) <= now))
            .slice(0, limit);
    }

    /**
     * Fetch all events belonging to a correlation ID (Ordered Timeline for UI Realtime).
     */
    getEventsByCorrelationId(correlationId) {
        if (!correlationId) return [];
        return this.localEvents
            .filter(e => e.correlation_id === correlationId)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    /**
     * Retrieve aggregated EDA metrics for telemetry and monitoring.
     */
    getMetrics(filters = {}) {
        let events = [...this.localEvents];
        if (filters.event_type) events = events.filter(e => e.event_type === filters.event_type);
        if (filters.status) events = events.filter(e => e.status === filters.status);
        if (filters.project) events = events.filter(e => e.aggregate_id.toLowerCase().includes(filters.project.toLowerCase()));

        const totalEvents = events.length;
        const completed = events.filter(e => e.status === EVENT_STATUS.COMPLETED).length;
        const pending = events.filter(e => e.status === EVENT_STATUS.PENDING).length;
        const processing = events.filter(e => e.status === EVENT_STATUS.PROCESSING).length;
        const failed = events.filter(e => e.status === EVENT_STATUS.FAILED).length;
        const dlqCount = this.localDLQ.length;

        const durations = this.localLogs.map(l => l.duration_ms || 0).filter(d => d > 0);
        const avgDurationMs = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

        const typeCounts = {};
        events.forEach(e => {
            typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;
        });

        return {
            totalEvents,
            completed,
            pending,
            processing,
            failed,
            dlqCount,
            averageProcessingTimeMs: avgDurationMs,
            typeCounts,
            recentEvents: events.slice(-30).reverse(),
            recentDeadLetters: this.localDLQ.slice(-15).reverse()
        };
    }
}

const eventStore = new EventStore();

module.exports = {
    EventStore,
    eventStore
};
