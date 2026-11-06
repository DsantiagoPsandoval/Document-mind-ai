/**
 * DOCUMIND AI — EDA AST ANALYSIS WORKER
 * Consumes: analysis.requested OR repository.import.completed
 * Produces: analysis.started, analysis.completed, analysis.failed
 */

const { EVENT_TYPES } = require('../eventContract');

function initAstAnalysisWorker(eventBus) {
    // 1. Triggered on repository.import.completed
    eventBus.subscribe(EVENT_TYPES.REPOSITORY_IMPORT_COMPLETED, async (event) => {
        const { projectData, categories = {} } = event.payload;
        if (!projectData) {
            throw new Error('projectData no encontrado en el payload de importación.');
        }

        console.log(`[Worker:AstAnalysis] Iniciando análisis AST para ${projectData.repository.fullName} [Corr: ${event.correlation_id}]`);

        // Emit analysis started
        await eventBus.publish(EVENT_TYPES.ANALYSIS_STARTED, {
            projectName: projectData.repository.name,
            totalFiles: projectData.stats.totalFiles
        }, {
            correlation_id: event.correlation_id,
            causation_id: event.event_id,
            aggregate_id: event.aggregate_id,
            user_id: event.user_id
        });

        // The AST, endpoints and data models are already parsed or structured in projectData
        const analysisSummary = {
            detectedTechnologies: projectData.detectedTechnologies || [],
            endpointsCount: (projectData.endpoints || []).length,
            modelsCount: (projectData.dataModels || []).length,
            relevantFilesCount: projectData.stats.relevantFilesCount
        };

        console.log(`[Worker:AstAnalysis] Análisis AST finalizado: ${analysisSummary.endpointsCount} endpoints, ${analysisSummary.modelsCount} modelos.`);

        // Emit analysis completed
        await eventBus.publish(EVENT_TYPES.ANALYSIS_COMPLETED, {
            projectData,
            categories,
            analysisSummary
        }, {
            correlation_id: event.correlation_id,
            causation_id: event.event_id,
            aggregate_id: event.aggregate_id,
            user_id: event.user_id
        });

        return analysisSummary;
    }, {
        name: 'AstAnalysisWorker',
        timeoutMs: 30000
    });

    // 2. Also listen for direct analysis.requested events (e.g. for uploaded files or manual entry)
    eventBus.subscribe(EVENT_TYPES.ANALYSIS_REQUESTED, async (event) => {
        const { projectData, categories = {} } = event.payload;
        if (!projectData) {
            throw new Error('projectData ausente en analysis.requested.');
        }

        await eventBus.publish(EVENT_TYPES.ANALYSIS_STARTED, {
            projectName: projectData.repository.name,
            totalFiles: projectData.stats.totalFiles
        }, {
            correlation_id: event.correlation_id,
            causation_id: event.event_id,
            aggregate_id: event.aggregate_id,
            user_id: event.user_id
        });

        await eventBus.publish(EVENT_TYPES.ANALYSIS_COMPLETED, {
            projectData,
            categories
        }, {
            correlation_id: event.correlation_id,
            causation_id: event.event_id,
            aggregate_id: event.aggregate_id,
            user_id: event.user_id
        });
    }, {
        name: 'DirectAstAnalysisWorker',
        timeoutMs: 30000
    });
}

module.exports = { initAstAnalysisWorker };
