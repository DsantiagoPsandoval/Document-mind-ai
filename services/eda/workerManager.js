/**
 * DOCUMIND AI — EDA WORKER MANAGER & ORCHESTRATOR
 * Bootstraps all independent domain workers, coordinates crash recovery,
 * controls processing concurrency, and runs the Transactional Outbox sweeper.
 */

const { eventBus } = require('./eventBus');
const { eventStore } = require('./eventStore');
const { initRepoImportWorker } = require('./workers/repoImportWorker');
const { initAstAnalysisWorker } = require('./workers/astAnalysisWorker');
const { initDocGenerationWorker } = require('./workers/docGenerationWorker');
const { initSecurityScanWorker } = require('./workers/securityScanWorker');
const { initSimulationWorker } = require('./workers/simulationWorker');
const { initCommitWatcherWorker, getCommitWatcher } = require('./workers/commitWatcherWorker');

class WorkerManager {
    constructor() {
        this.eventBus = eventBus;
        this.eventStore = eventStore;
        this.isInitialized = false;
        this.activeJobsCount = 0;
        this.maxConcurrentJobs = 4; // Concurrency limit for Render free/standard tier
        this.sweeperInterval = null;
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log('[EDA WorkerManager] Inicializando orquestador y registrando workers independientes...');

        // 1. Initialize Workers
        initRepoImportWorker(this.eventBus);
        initAstAnalysisWorker(this.eventBus);
        initDocGenerationWorker(this.eventBus);
        initSecurityScanWorker(this.eventBus);
        initSimulationWorker(this.eventBus);
        const commitWatcher = initCommitWatcherWorker(this.eventBus);

        // 2. Crash Recovery: Recover orphaned tasks from previous crash/restart
        try {
            await this.eventStore.recoverPendingEvents();
        } catch (e) {
            console.warn('[EDA WorkerManager] Aviso durante recuperación de arranque:', e.message);
        }

        // 3. Start Outbox Sweeper (picks up pending / retryable events every 10s)
        this.startOutboxSweeper(10000);

        // 4. Start periodic commit watch
        commitWatcher.startPeriodicWatch(300000); // 5 min

        this.isInitialized = true;
        console.log('✅ [EDA WorkerManager] Todos los workers (Import, AST, Docs, Security, Simulation, Commits) están activos y sincronizados.');
    }

    /**
     * Periodically sweeps the outbox for pending or retry-ready tasks.
     */
    startOutboxSweeper(intervalMs = 10000) {
        if (this.sweeperInterval) clearInterval(this.sweeperInterval);

        this.sweeperInterval = setInterval(async () => {
            if (this.activeJobsCount >= this.maxConcurrentJobs) return;

            const pending = this.eventStore.getPendingEvents(this.maxConcurrentJobs - this.activeJobsCount);
            for (const event of pending) {
                // If not already in flight, trigger local bus emission
                this.eventBus.emit(event.event_type, event);
            }
        }, intervalMs);

        if (this.sweeperInterval.unref) this.sweeperInterval.unref();
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            activeJobsCount: this.activeJobsCount,
            maxConcurrentJobs: this.maxConcurrentJobs,
            registeredWorkers: [
                'RepoImportWorker',
                'AstAnalysisWorker',
                'DocGenerationWorker',
                'SecurityScanWorker',
                'SimulationWorker',
                'CommitWatcherWorker'
            ]
        };
    }
}

const workerManager = new WorkerManager();

module.exports = {
    WorkerManager,
    workerManager
};
