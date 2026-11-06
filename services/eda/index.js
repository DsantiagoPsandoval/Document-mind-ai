/**
 * DOCUMIND AI — EVENT-DRIVEN ARCHITECTURE (EDA) BARREL EXPORT
 */

const { EVENT_TYPES, EVENT_STATUS, createEvent, validateEvent, sanitizePayload } = require('./eventContract');
const { eventBus } = require('./eventBus');
const { eventStore } = require('./eventStore');
const { workerManager } = require('./workerManager');
const { eventMonitor } = require('./eventMonitor');
const { getCommitWatcher } = require('./workers/commitWatcherWorker');

module.exports = {
    EVENT_TYPES,
    EVENT_STATUS,
    createEvent,
    validateEvent,
    sanitizePayload,
    eventBus,
    eventStore,
    workerManager,
    eventMonitor,
    getCommitWatcher
};
