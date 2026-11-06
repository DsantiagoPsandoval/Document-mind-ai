/**
 * DOCUMIND AI — EDA EVENT MONITOR & TELEMETRY SERVICE
 * Aggregates live system metrics, consumer health, latency distributions,
 * and filtered audit trails from real event records.
 */

const { eventStore } = require('./eventStore');
const { EVENT_TYPES, EVENT_STATUS } = require('./eventContract');

class EventMonitor {
    constructor() {
        this.eventStore = eventStore;
    }

    /**
     * Retrieves high-fidelity metrics dashboard data.
     */
    getDashboardMetrics(filters = {}) {
        const raw = this.eventStore.getMetrics(filters);

        // Calculate success rate
        const totalFinished = raw.completed + raw.failed + raw.dlqCount;
        const successRate = totalFinished > 0 ? ((raw.completed / totalFinished) * 100).toFixed(1) : 100;

        return {
            timestamp: new Date().toISOString(),
            metrics: {
                totalEvents: raw.totalEvents,
                completed: raw.completed,
                pending: raw.pending,
                processing: raw.processing,
                failed: raw.failed,
                deadLetterQueue: raw.dlqCount,
                successRatePct: Number(successRate),
                avgProcessingTimeMs: raw.averageProcessingTimeMs
            },
            typeDistribution: raw.typeCounts,
            availableEventTypes: Object.values(EVENT_TYPES),
            availableStatuses: Object.values(EVENT_STATUS),
            recentEvents: raw.recentEvents.slice(0, 25).map(e => ({
                event_id: e.event_id,
                event_type: e.event_type,
                aggregate_id: e.aggregate_id,
                correlation_id: e.correlation_id,
                status: e.status,
                retry_count: e.retry_count,
                created_at: e.created_at,
                updated_at: e.updated_at,
                error_message: e.error_message
            })),
            deadLetters: raw.recentDeadLetters.slice(0, 10).map(dl => ({
                dlq_id: dl.dlq_id,
                original_event_id: dl.original_event_id,
                event_type: dl.event_type,
                aggregate_id: dl.aggregate_id,
                correlation_id: dl.correlation_id,
                failed_at: dl.failed_at,
                retry_count: dl.retry_count,
                error_stack: dl.error_stack ? dl.error_stack.split('\n')[0] : 'Error desconocido'
            }))
        };
    }

    /**
     * Filters events by type, status, date range, or project keyword.
     */
    searchEvents(criteria = {}) {
        const { type, status, fromDate, toDate, project, limit = 50 } = criteria;
        let events = [...this.eventStore.localEvents];

        if (type) events = events.filter(e => e.event_type === type);
        if (status) events = events.filter(e => e.status === status);
        if (project) events = events.filter(e => e.aggregate_id.toLowerCase().includes(project.toLowerCase()));
        if (fromDate) events = events.filter(e => new Date(e.created_at) >= new Date(fromDate));
        if (toDate) events = events.filter(e => new Date(e.created_at) <= new Date(toDate));

        return events
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);
    }
}

const eventMonitor = new EventMonitor();

module.exports = {
    EventMonitor,
    eventMonitor
};
