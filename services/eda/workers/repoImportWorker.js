/**
 * DOCUMIND AI — EDA REPOSITORY IMPORT WORKER
 * Consumes: repository.registered
 * Produces: repository.import.started, repository.import.completed, repository.import.failed
 */

const { EVENT_TYPES } = require('../eventContract');
const { fetchAndAnalyzeRepo } = require('../../github/analyzer');

function initRepoImportWorker(eventBus) {
    eventBus.subscribe(EVENT_TYPES.REPOSITORY_REGISTERED, async (event) => {
        const { repoUrl, branch, categories = {} } = event.payload;
        if (!repoUrl) {
            throw new Error('URL de repositorio no especificada en el payload del evento.');
        }

        console.log(`[Worker:RepoImport] Iniciando importación para: ${repoUrl} [Corr: ${event.correlation_id}]`);

        // Emit import started
        await eventBus.publish(EVENT_TYPES.REPOSITORY_IMPORT_STARTED, {
            repoUrl,
            branch
        }, {
            correlation_id: event.correlation_id,
            causation_id: event.event_id,
            aggregate_id: event.aggregate_id,
            user_id: event.user_id
        });

        // Execute fetch and static parse
        const projectData = await fetchAndAnalyzeRepo(repoUrl, branch);

        console.log(`[Worker:RepoImport] Importación completada con éxito: ${projectData.repository.fullName} (${projectData.stats.relevantFilesCount} archivos)`);

        // Emit import completed
        await eventBus.publish(EVENT_TYPES.REPOSITORY_IMPORT_COMPLETED, {
            repoUrl,
            branch,
            categories,
            projectData
        }, {
            correlation_id: event.correlation_id,
            causation_id: event.event_id,
            aggregate_id: event.aggregate_id,
            user_id: event.user_id
        });

        return projectData;
    }, {
        name: 'RepoImportWorker',
        timeoutMs: 60000 // 60s timeout for public zipball download & extract
    });
}

module.exports = { initRepoImportWorker };
