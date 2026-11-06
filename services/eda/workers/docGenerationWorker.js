/**
 * DOCUMIND AI — EDA DOCUMENTATION GENERATION WORKER
 * Consumes: analysis.completed OR documentation.generation.requested
 * Produces: documentation.generated, documentation.generation.failed
 */

const { EVENT_TYPES } = require('../eventContract');
const { generateDocumentationSuite } = require('../../analyzer/docGenerator');

function initDocGenerationWorker(eventBus) {
    eventBus.subscribe(EVENT_TYPES.ANALYSIS_COMPLETED, async (event) => {
        const { projectData, categories = {} } = event.payload;
        if (!projectData) {
            throw new Error('projectData no encontrado para generación documental.');
        }

        const projectName = projectData.repository?.name || 'Proyecto';
        console.log(`[Worker:DocGeneration] Generando suite documental para ${projectName} [Corr: ${event.correlation_id}]`);

        const ctx = {
            projectName,
            repoDescription: projectData.repository?.description || '',
            detectedLanguages: projectData.detectedLanguages || [projectData.repository?.primaryLanguage || 'JavaScript'],
            detectedFrameworks: projectData.detectedFrameworks || [],
            detectedDatabases: projectData.detectedDatabases || [],
            detectedInfra: projectData.detectedInfra || [],
            endpoints: projectData.endpoints || [],
            dataModels: projectData.dataModels || [],
            treeDiagram: projectData.treeDiagram || '',
            keyFiles: projectData.prioritizedFiles || [],
            projectMap: projectData.projectMap || null,
            securityAudit: projectData.security || null
        };

        const documentation = await generateDocumentationSuite(ctx, categories);
        const projectId = `${projectName}-${Date.now()}`.replace(/[^a-zA-Z0-9_\-]/g, '_');

        console.log(`[Worker:DocGeneration] Documentación generada con éxito (ID: ${projectId})`);

        // Publish documentation.generated
        await eventBus.publish(EVENT_TYPES.DOCUMENTATION_GENERATED, {
            projectId,
            projectName,
            projectData,
            documentation,
            categories
        }, {
            correlation_id: event.correlation_id,
            causation_id: event.event_id,
            aggregate_id: event.aggregate_id,
            user_id: event.user_id
        });

        return { projectId, documentation };
    }, {
        name: 'DocGenerationWorker',
        timeoutMs: 90000 // 90s for LLM or deterministic fallback
    });
}

module.exports = { initDocGenerationWorker };
