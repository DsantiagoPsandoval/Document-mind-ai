/**
 * DOCUMIND AI — EVENT BUS BROKER
 * Centralized publish/subscribe engine with Transactional Outbox guarantee,
 * automatic retries with exponential backoff, Dead Letter forwarding, and SSE/Realtime event broadcasting.
 */

const EventEmitter = require('events');
const { createEvent, validateEvent, EVENT_STATUS } = require('./eventContract');
const { eventStore } = require('./eventStore');

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100);
        this.eventStore = eventStore;

        // Active correlation listeners (for SSE stream to UI)
        this.correlationListeners = new Map(); // correlationId -> Set of callback functions
    }

    /**
     * Publishes an event to the Event Store (Transactional Outbox) and notifies consumers.
     */
    async publish(eventType, payload = {}, options = {}) {
        // 1. Create and validate event contract
        const event = createEvent(eventType, payload, options);

        // 2. Persist to outbox store before broadcasting
        await this.eventStore.saveEvent(event);

        // 3. Emit on local bus for immediate in-process worker handling
        setImmediate(() => {
            this.emit(eventType, event);
            this.emit('*', event); // Wildcard for monitors & loggers
        });

        // 4. Notify active real-time correlation listeners (SSE clients)
        this.broadcastToCorrelation(event);

        return event;
    }

    /**
     * Subscribes a consumer worker to an event type with idempotency, timeout, and backoff retries.
     */
    subscribe(eventType, handler, consumerConfig = {}) {
        const consumerName = consumerConfig.name || `consumer_${eventType}`;
        const timeoutMs = consumerConfig.timeoutMs || 45000;

        const wrappedHandler = async (event) => {
            // Idempotency check: avoid processing already completed event
            if (this.eventStore.isDuplicate(event.event_id)) {
                console.log(`[EventBus] [Idempotency] Evento duplicado omitido: ${event.event_id} (${eventType})`);
                return;
            }

            const startTime = Date.now();
            await this.eventStore.updateEventStatus(event.event_id, EVENT_STATUS.PROCESSING);
            await this.eventStore.logStep(event.event_id, consumerName, 'STARTED', 'PROCESSING', 0);

            this.broadcastToCorrelation({ ...event, status: EVENT_STATUS.PROCESSING });

            try {
                // Execute handler with strict timeout protection
                const executionPromise = handler(event);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Tiempo de espera excedido (${timeoutMs / 1000}s) en ${consumerName}`)), timeoutMs)
                );

                const result = await Promise.race([executionPromise, timeoutPromise]);
                const duration = Date.now() - startTime;

                // Mark COMPLETED
                await this.eventStore.updateEventStatus(event.event_id, EVENT_STATUS.COMPLETED);
                await this.eventStore.logStep(event.event_id, consumerName, 'COMPLETED', 'SUCCESS', duration, { resultSummary: 'Procesado con éxito' });

                this.broadcastToCorrelation({ ...event, status: EVENT_STATUS.COMPLETED, duration_ms: duration });
                return result;

            } catch (err) {
                const duration = Date.now() - startTime;
                const newRetryCount = (event.retry_count || 0) + 1;
                const maxRetries = event.max_retries !== undefined ? event.max_retries : 3;

                console.error(`[EventBus] Error en consumidor ${consumerName} para evento ${event.event_id}:`, err.message);

                await this.eventStore.logStep(event.event_id, consumerName, 'FAILED', 'ERROR', duration, { error: err.message, retry: newRetryCount });

                // Check if retries exhausted -> Move to Dead Letter Queue (DLQ)
                if (newRetryCount >= maxRetries) {
                    event.retry_count = newRetryCount;
                    await this.eventStore.moveToDeadLetter(event, err);
                    this.broadcastToCorrelation({ ...event, status: EVENT_STATUS.DEAD_LETTER, error: err.message });
                } else {
                    // Exponential backoff: 2^retry * 1000ms + jitter
                    const backoffMs = Math.pow(2, newRetryCount) * 1000 + Math.floor(Math.random() * 500);
                    const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

                    await this.eventStore.updateEventStatus(event.event_id, EVENT_STATUS.FAILED, {
                        error_message: err.message,
                        retry_count: newRetryCount,
                        next_retry_at: nextRetryAt
                    });

                    this.broadcastToCorrelation({ ...event, status: EVENT_STATUS.FAILED, error: err.message, next_retry_at: nextRetryAt });

                    // Schedule automatic retry
                    setTimeout(() => {
                        console.log(`[EventBus] Reintentando evento ${event.event_id} (Intento ${newRetryCount}/${maxRetries})...`);
                        this.emit(eventType, { ...event, retry_count: newRetryCount, next_retry_at: nextRetryAt });
                    }, backoffMs);
                }
            }
        };

        this.on(eventType, wrappedHandler);
        return () => this.off(eventType, wrappedHandler);
    }

    /**
     * Subscribe a real-time SSE client to all events sharing a correlation ID.
     */
    subscribeToCorrelation(correlationId, callback) {
        if (!this.correlationListeners.has(correlationId)) {
            this.correlationListeners.set(correlationId, new Set());
        }
        this.correlationListeners.get(correlationId).add(callback);

        return () => {
            const listeners = this.correlationListeners.get(correlationId);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.correlationListeners.delete(correlationId);
                }
            }
        };
    }

    broadcastToCorrelation(event) {
        if (!event || !event.correlation_id) return;
        const listeners = this.correlationListeners.get(event.correlation_id);
        if (listeners && listeners.size > 0) {
            listeners.forEach(cb => {
                try {
                    cb(event);
                } catch (e) {
                    // Ignore listener errors
                }
            });
        }
    }
}

const eventBus = new EventBus();

module.exports = {
    EventBus,
    eventBus
};
