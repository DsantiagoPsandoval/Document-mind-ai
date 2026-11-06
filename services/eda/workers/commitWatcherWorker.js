/**
 * DOCUMIND AI — EDA COMMIT WATCHER WORKER
 * Periodically polls monitored public GitHub repositories without requiring client tokens.
 * Produces: repository.commit.detected
 */

const { EVENT_TYPES } = require('../eventContract');
const { checkRepoUpdates } = require('../../github/syncService');

class CommitWatcherWorker {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.monitoredRepos = new Map(); // repoUrl -> { branch, lastKnownSha, lastCheck }
        this.pollInterval = null;
    }

    registerMonitoredRepo(repoUrl, branch = 'main', initialSha = null) {
        this.monitoredRepos.set(repoUrl, {
            branch,
            lastKnownSha: initialSha,
            lastCheck: new Date().toISOString()
        });
        console.log(`[Worker:CommitWatcher] Repositorio registrado para monitoreo de commits: ${repoUrl} (${branch})`);
    }

    async checkRepo(repoUrl) {
        const item = this.monitoredRepos.get(repoUrl);
        if (!item) return null;

        try {
            const check = await checkRepoUpdates(repoUrl, item.branch, item.lastKnownSha);
            if (check.hasUpdate) {
                console.log(`[Worker:CommitWatcher] [NUEVO COMMIT DETECTADO] en ${repoUrl}: ${check.commit.sha} - "${check.commit.message}"`);

                const oldSha = item.lastKnownSha;
                item.lastKnownSha = check.currentSha;
                item.lastCheck = new Date().toISOString();

                // Publish real repository.commit.detected event
                const event = await this.eventBus.publish(EVENT_TYPES.REPOSITORY_COMMIT_DETECTED, {
                    repoUrl,
                    branch: item.branch,
                    oldSha,
                    newSha: check.currentSha,
                    commit: check.commit,
                    detectedAt: new Date().toISOString()
                }, {
                    aggregate_id: repoUrl,
                    correlation_id: `commit_sync_${Date.now()}`
                });

                return event;
            }
        } catch (err) {
            console.warn(`[Worker:CommitWatcher] Verificación omitida para ${repoUrl}:`, err.message);
        }
        return null;
    }

    startPeriodicWatch(intervalMs = 300000) { // Default 5 minutes
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(async () => {
            for (const repoUrl of this.monitoredRepos.keys()) {
                await this.checkRepo(repoUrl);
            }
        }, intervalMs);
        if (this.pollInterval.unref) this.pollInterval.unref();
        console.log(`[Worker:CommitWatcher] Monitoreo periódico de commits activo (${intervalMs / 1000}s).`);
    }

    stop() {
        if (this.pollInterval) clearInterval(this.pollInterval);
    }
}

let commitWatcherInstance = null;

function initCommitWatcherWorker(eventBus) {
    if (!commitWatcherInstance) {
        commitWatcherInstance = new CommitWatcherWorker(eventBus);
        
        // Auto-register any repository that completes import
        eventBus.subscribe(EVENT_TYPES.REPOSITORY_IMPORT_COMPLETED, async (event) => {
            const { repoUrl, branch, projectData } = event.payload;
            if (repoUrl && projectData) {
                const sha = projectData.repository?.commitSha || null;
                commitWatcherInstance.registerMonitoredRepo(repoUrl, branch || 'main', sha);
            }
        }, { name: 'CommitWatcherAutoRegistrar' });
    }
    return commitWatcherInstance;
}

module.exports = {
    CommitWatcherWorker,
    initCommitWatcherWorker,
    getCommitWatcher: () => commitWatcherInstance
};
