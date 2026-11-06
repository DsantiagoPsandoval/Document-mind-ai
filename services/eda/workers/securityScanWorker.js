/**
 * DOCUMIND AI — EDA SECURITY SCAN WORKER
 * Consumes: documentation.generated OR security.scan.requested
 * Produces: security.scan.completed, security.issue.detected
 */

const { EVENT_TYPES } = require('../eventContract');
const { runSecurityAnalysis } = require('../../analyzer/securityAnalyzer');
const { setCachedAnalysis } = require('../../analyzer/cacheService');

function initSecurityScanWorker(eventBus) {
    eventBus.subscribe(EVENT_TYPES.DOCUMENTATION_GENERATED, async (event) => {
        const { projectId, projectName, projectData, documentation } = event.payload;
        if (!projectData) {
            throw new Error('projectData no encontrado en documentation.generated.');
        }

        console.log(`[Worker:SecurityScan] Iniciando escaneo SAST y STRIDE para ${projectName} [Corr: ${event.correlation_id}]`);

        // Execute comprehensive security analysis
        const security = await runSecurityAnalysis(projectData);

        // Check for critical vulnerabilities or exposed secrets
        const criticalCount = (security.summary && security.summary.critical) || 0;
        const secretsCount = (security.summary && security.summary.secretsFound) || 0;

        if (criticalCount > 0 || secretsCount > 0) {
            console.warn(`[Worker:SecurityScan] [ALERTA] ${criticalCount} vulnerabilidades críticas y ${secretsCount} secretos detectados en ${projectName}.`);
            await eventBus.publish(EVENT_TYPES.SECURITY_ISSUE_DETECTED, {
                projectId,
                projectName,
                criticalCount,
                secretsCount,
                score: security.score,
                grade: security.grade
            }, {
                correlation_id: event.correlation_id,
                causation_id: event.event_id,
                aggregate_id: event.aggregate_id,
                user_id: event.user_id
            });
        }

        // Cache complete project analysis package for frontend and ZIP export
        const fullAnalysisResult = {
            projectId,
            projectName,
            repository: projectData.repository,
            stats: projectData.stats,
            detectedLanguages: projectData.detectedLanguages || [],
            detectedFrameworks: projectData.detectedFrameworks || [],
            detectedDatabases: projectData.detectedDatabases || [],
            detectedInfra: projectData.detectedInfra || [],
            detectedTechnologies: projectData.detectedTechnologies || [],
            treeDiagram: projectData.treeDiagram || '',
            relevantFilesList: projectData.relevantFilesList || [],
            ignoredFilesList: projectData.ignoredFilesList || [],
            prioritizedFiles: (projectData.prioritizedFiles || []).map(f => ({
                path: f.path,
                size: f.size,
                category: f.category,
                hash: f.hash
            })),
            keyFiles: projectData.prioritizedFiles || [],
            endpoints: projectData.endpoints || [],
            dataModels: projectData.dataModels || [],
            projectMap: projectData.projectMap || {},
            documentation,
            security
        };

        setCachedAnalysis(projectId, fullAnalysisResult);

        // Publish security.scan.completed
        await eventBus.publish(EVENT_TYPES.SECURITY_SCAN_COMPLETED, {
            projectId,
            projectName,
            security,
            score: security.score,
            grade: security.grade,
            fullResult: fullAnalysisResult
        }, {
            correlation_id: event.correlation_id,
            causation_id: event.event_id,
            aggregate_id: event.aggregate_id,
            user_id: event.user_id
        });

        console.log(`[Worker:SecurityScan] Escaneo completado para ${projectName}. Puntuación: ${security.score}/100 (Grado ${security.grade})`);
        return security;
    }, {
        name: 'SecurityScanWorker',
        timeoutMs: 30000
    });
}

module.exports = { initSecurityScanWorker };
