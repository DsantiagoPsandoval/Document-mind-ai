/**
 * DOCUMIND AI — SECURITY ANALYZER (CORE ORCHESTRATOR — SECURITY INTELLIGENCE)
 * Unifies SAST code analysis, Secret Scanner, Dependency Auditor, Security Score Engine,
 * 12-Dimension Evaluation, Remediation Planner, STRIDE Threat Modeler, Audit History,
 * and Veracity / Integrity Classification.
 */

const { scanProjectSecrets } = require('./security/secretScanner');
const { analyzeStaticRules } = require('./security/staticRules');
const { auditDependencies } = require('./security/dependencyAuditor');
const { calculateSecurityScore, SECURITY_DIMENSIONS, OFFICIAL_SCORE_SCALE } = require('./security/scoreCalculator');
const { buildRemediationPlan } = require('./security/remediationPlanner');
const { compareSecurityRuns, getFindingSignature } = require('./security/runComparator');
const { generateStrideThreatModel } = require('./security/threatModeler');
const { generateSecurityRequirements } = require('./security/requirementsGenerator');
const { generateSecurityMarkdownReport, generateSecurityJsonReport } = require('./security/securityReportGenerator');

// In-memory audit history store per project key
const projectAuditHistoryStore = new Map();

function getProjectAuditKey(projectData = {}) {
    const raw = projectData.repository?.fullName || projectData.repository?.name || projectData.projectName || 'default_project';
    return String(raw).toLowerCase().trim().replace(/[^a-z0-9_\-\/]/g, '_');
}

function computeTopAffectedFiles(findings = []) {
    const fileMap = new Map();
    findings.forEach(f => {
        const file = f.file || 'General';
        if (!fileMap.has(file)) {
            fileMap.set(file, { file, total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 });
        }
        const entry = fileMap.get(file);
        entry.total++;
        const sev = (f.severity || 'INFO').toUpperCase();
        if (sev === 'CRITICAL') entry.critical++;
        else if (sev === 'HIGH') entry.high++;
        else if (sev === 'MEDIUM') entry.medium++;
        else if (sev === 'LOW') entry.low++;
        else entry.info++;
    });

    return Array.from(fileMap.values())
        .sort((a, b) => (b.critical - a.critical) || (b.high - a.high) || (b.total - a.total))
        .slice(0, 10);
}

function buildVeracityBreakdown(findings = [], projectData = {}, coverage = {}) {
    const confirmed = findings.filter(f => (f.veracityType || '').includes('confirmad'));
    const potential = findings.filter(f => (f.veracityType || '').includes('potencial'));
    const inferred = findings.filter(f => (f.veracityType || '').includes('inferid'));
    const nonEvaluableFindings = findings.filter(f => (f.veracityType || '').includes('no evaluable'));

    const unexecutedTests = [
        {
            id: 'TEST-DAST-01',
            name: 'Pruebas Dinámicas de Penetración en Tiempo de Ejecución (DAST)',
            status: 'Prueba no ejecutada',
            reason: 'El motor ejecuta análisis estático de código (SAST) sin levantar ni atacar el servidor en vivo.'
        },
        {
            id: 'TEST-FUZZ-01',
            name: 'Fuzzing Interactivo de Payloads y Sesiones OAuth en Vivo',
            status: 'Prueba no ejecutada',
            reason: 'Requiere credenciales activas de usuario y entorno de staging aislado.'
        }
    ];

    const ignoredList = projectData.ignoredFilesList || [];
    const nonEvaluable = [
        ...nonEvaluableFindings.map(f => ({
            item: f.file,
            reason: f.description || 'Archivo con formato no evaluable estáticamente.'
        })),
        {
            item: 'Variables de entorno privadas en servidor de despliegue (.env de producción / Secret Manager)',
            reason: 'Por seguridad, las variables de entorno en tiempo de ejecución no están versionadas en el repositorio.'
        }
    ];
    if (ignoredList.length > 0 || (coverage.uninspectedFilesCount || 0) > 0) {
        nonEvaluable.push({
            item: `${coverage.uninspectedFilesCount || ignoredList.length} archivo(s) binarios, multimedia o fuera del límite de muestreo`,
            reason: 'Excluidos del análisis textual estático.'
        });
    }

    return {
        confirmed,
        potential,
        inferred,
        unexecutedTests,
        nonEvaluable,
        summary: {
            confirmedCount: confirmed.length,
            potentialCount: potential.length,
            inferredCount: inferred.length,
            unexecutedTestsCount: unexecutedTests.length,
            nonEvaluableCount: nonEvaluable.length
        }
    };
}

/**
 * Runs a complete, rigorous security audit on the project data.
 * @param {object} projectData - The parsed project structure, files, endpoints, and models
 * @param {object} [options] - Optional previousRun or statusOverrides
 * @returns {object} Full Security Intelligence audit suite
 */
async function runSecurityAnalysis(projectData, options = {}) {
    const files = projectData.prioritizedFiles || projectData.keyFiles || projectData.files || [];
    const projectName = projectData.repository?.name || projectData.projectName || 'Proyecto';
    const projectKey = getProjectAuditKey(projectData);

    // 1. Secret Scanner
    const secrets = scanProjectSecrets(files);

    // 2. Static SAST Analysis
    const sastFindings = analyzeStaticRules(files);

    // 3. Dependency Security Audit
    const dependencyFindings = auditDependencies(files);

    // Combine all findings with deterministic IDs when possible
    const allFindings = [
        ...secrets,
        ...sastFindings,
        ...dependencyFindings
    ].map((f, idx) => ({
        ...f,
        id: f.id || `SEC-${String(idx + 1).padStart(3, '0')}`,
        findingStatus: f.findingStatus || 'Pendiente',
        verifiedFixed: Boolean(f.verifiedFixed)
    }));

    // Apply user status overrides (only Pendiente / En proceso allowed without code verification)
    if (options.statusOverrides && typeof options.statusOverrides === 'object') {
        allFindings.forEach(f => {
            const sig = getFindingSignature(f);
            const override = options.statusOverrides[f.id] || options.statusOverrides[sig];
            if (override === 'En proceso' || override === 'en_proceso') {
                f.findingStatus = 'En proceso';
            } else if (override === 'Pendiente' || override === 'pendiente') {
                f.findingStatus = 'Pendiente';
            }
        });
    }

    const stats = {
        ...(projectData.stats || {}),
        filesAnalyzed: files.length,
        totalFiles: projectData.stats?.totalFiles || projectData.fileTree?.length || files.length || 1
    };

    // 4. Calculate Mathematical Security Score (0 - 100) & 12 Dimensions Breakdown
    const scoreData = calculateSecurityScore(allFindings, stats);

    // 5. Build Actionable Remediation Plan (4 Queues)
    const remediationPlan = buildRemediationPlan(allFindings);

    // 6. Generate STRIDE Threat Model linked to real components
    const threatModel = generateStrideThreatModel(
        projectData.projectMap || {},
        projectData.endpoints || [],
        projectData.detectedDatabases || [],
        files,
        allFindings
    );

    // 7. Generate Automated Security Requirements (SEC-001...)
    const securityRequirements = generateSecurityRequirements(allFindings, projectData);

    // 8. Top Affected Files & Veracity Breakdown
    const topAffectedFiles = computeTopAffectedFiles(allFindings);
    const veracityBreakdown = buildVeracityBreakdown(allFindings, projectData, scoreData.coverage);
    const examinedFiles = files.map(f => ({
        path: f.path,
        category: f.category || 'SOURCE_CODE',
        size: f.size || (f.content ? f.content.length : 0)
    }));

    const hasManifest = files.some(f => /package\.json$|requirements\.txt$|pyproject\.toml$|pom\.xml$/i.test(f.path || ''));
    const manifestType = files.some(f => /package\.json$/i.test(f.path || ''))
        ? 'package.json (Node.js)'
        : (files.some(f => /requirements\.txt$/i.test(f.path || '')) ? 'requirements.txt (Python)' : 'Manifiesto');

    const mitigationSummary = {
        pendientes: allFindings.filter(f => f.findingStatus === 'Pendiente').length,
        enProceso: allFindings.filter(f => f.findingStatus === 'En proceso').length,
        solucionados: allFindings.filter(f => f.findingStatus === 'Solucionado' && f.verifiedFixed).length,
        total: allFindings.length
    };

    // Retrieve previous run from options or project history store
    const historyList = projectAuditHistoryStore.get(projectKey) || [];
    const previousRun = options.previousRun || (historyList.length > 0 ? historyList[historyList.length - 1] : null);

    const securityAudit = {
        title: 'Security Intelligence',
        projectName,
        projectKey,
        score: scoreData.score,
        rawScore: scoreData.rawScore,
        grade: scoreData.grade,
        classification: scoreData.classification,
        riskLevel: scoreData.riskLevel,
        gradeColor: scoreData.gradeColor,
        classificationDescription: scoreData.classificationDescription,
        isCappedByCritical: scoreData.isCappedByCritical,
        scale: OFFICIAL_SCORE_SCALE,
        methodology: scoreData.methodology,
        counts: scoreData.counts,
        summary: {
            totalFindings: scoreData.counts.total,
            critical: scoreData.counts.critical,
            high: scoreData.counts.high,
            medium: scoreData.counts.medium,
            low: scoreData.counts.low,
            info: scoreData.counts.info,
            secretsFound: secrets.length,
            pendingVerification: scoreData.counts.pendingVerification
        },
        dimensions: scoreData.dimensions,
        categoryScores: scoreData.categoryScores,
        categories: scoreData.dimensions,
        deductions: scoreData.deductions,
        coverage: scoreData.coverage,
        explanation: scoreData.explanation,
        veracityBreakdown,
        topAffectedFiles,
        examinedFiles,
        mitigationSummary,
        remediationPlan,
        secrets,
        findings: allFindings,
        vulnerabilities: allFindings,
        sastFindings,
        dependencyFindings,
        dependencies: {
            manifestFound: hasManifest,
            manifestType: hasManifest ? manifestType : null,
            findings: dependencyFindings,
            vulnerabilities: dependencyFindings.filter(d => d.id && d.id.startsWith('DEP-VULN')).map(d => ({
                package: d.name.replace(/^Dependencia Vulnerable Detectada:\s*/i, ''),
                version: d.snippet,
                reason: d.description,
                recommendedVersion: 'última versión estable'
            })),
            floatingVersions: dependencyFindings.filter(d => d.id && (d.id.startsWith('DEP-RISK') || d.id.startsWith('DEP-PY'))).map(d => ({
                package: d.name.split(':').pop().trim(),
                version: d.snippet
            })),
            count: dependencyFindings.length
        },
        threatModel,
        securityRequirements,
        timestamp: new Date().toISOString()
    };

    // 9. Historical Comparison
    securityAudit.comparison = compareSecurityRuns(previousRun, securityAudit);

    // Save snapshot into project audit history (keep up to 15 runs per project)
    const snapshot = {
        runId: `AUDIT-${Date.now().toString(36).toUpperCase()}`,
        timestamp: securityAudit.timestamp,
        score: securityAudit.score,
        classification: securityAudit.classification,
        riskLevel: securityAudit.riskLevel,
        grade: securityAudit.grade,
        counts: securityAudit.counts,
        filesAnalyzed: scoreData.coverage.filesAnalyzed,
        findings: allFindings.map(f => ({
            id: f.id,
            ruleId: f.ruleId,
            name: f.name,
            severity: f.severity,
            severityLabel: f.severityLabel,
            file: f.file,
            line: f.line
        }))
    };

    if (!options.skipHistorySave) {
        historyList.push(snapshot);
        if (historyList.length > 15) historyList.shift();
        projectAuditHistoryStore.set(projectKey, historyList);
    }

    securityAudit.auditHistory = historyList;

    // 10. Generate Full Markdown and JSON Reports
    securityAudit.markdownReport = generateSecurityMarkdownReport(securityAudit, projectName);
    securityAudit.jsonReport = generateSecurityJsonReport(securityAudit, projectName);

    return securityAudit;
}

/**
 * Updates the status of a finding.
 * Rule: Cannot mark as "Solucionado" automatically without re-verifying the code.
 */
function updateFindingStatus(securityAudit, findingId, requestedStatus, updatedFileContent = null) {
    const list = securityAudit?.findings || securityAudit?.vulnerabilities;
    if (!securityAudit || !Array.isArray(list)) {
        throw new Error('No se encontró una auditoría de seguridad activa.');
    }
    securityAudit.findings = list;

    const finding = list.find(f => f.id === findingId || f.ruleId === findingId) || list[0];
    if (!finding) {
        throw new Error(`Hallazgo ${findingId} no encontrado en la auditoría activa.`);
    }

    const normStatus = String(requestedStatus || '').toLowerCase().trim();

    if (normStatus === 'pendiente') {
        finding.findingStatus = 'Pendiente';
        finding.verifiedFixed = false;
    } else if (normStatus === 'en_proceso' || normStatus === 'en proceso') {
        finding.findingStatus = 'En proceso';
        finding.verifiedFixed = false;
    } else if (normStatus === 'solucionado') {
        // Must verify against code before marking as Solucionado
        if (typeof updatedFileContent === 'string' && updatedFileContent.trim().length > 0) {
            const tempFiles = [{ path: finding.file || 'verified.js', content: updatedFileContent }];
            const remainingSecrets = scanProjectSecrets(tempFiles);
            const remainingSast = analyzeStaticRules(tempFiles);
            const remainingDeps = auditDependencies(tempFiles);
            const combined = [...remainingSecrets, ...remainingSast, ...remainingDeps];

            const stillPresent = combined.some(c =>
                (c.ruleId && c.ruleId === finding.ruleId) ||
                (c.name && c.name === finding.name)
            );

            if (stillPresent) {
                const msg = `Verificación fallida: el patrón vulnerable (${finding.ruleId || finding.name}) sigue presente en el código proporcionado de ${finding.file}. El hallazgo permanece en estado "${finding.findingStatus}".`;
                return {
                    success: false,
                    verified: false,
                    status: finding.findingStatus,
                    finding,
                    error: msg,
                    message: msg
                };
            }

            finding.findingStatus = 'Solucionado';
            finding.verifiedFixed = true;
            finding.verifiedAt = new Date().toISOString();
        } else {
            const msg = 'Por política de integridad técnica, un hallazgo no puede marcarse como "Solucionado" sin verificar nuevamente el código fuente. Ejecuta un nuevo análisis o proporciona el archivo corregido.';
            return {
                success: false,
                verified: false,
                status: finding.findingStatus,
                finding,
                requiresCodeVerification: true,
                error: msg,
                message: msg
            };
        }
    }

    // Recompute mitigation summary & score
    securityAudit.mitigationSummary = {
        pendientes: securityAudit.findings.filter(f => f.findingStatus === 'Pendiente').length,
        enProceso: securityAudit.findings.filter(f => f.findingStatus === 'En proceso').length,
        solucionados: securityAudit.findings.filter(f => f.findingStatus === 'Solucionado' && f.verifiedFixed).length,
        total: securityAudit.findings.length
    };

    const recalc = calculateSecurityScore(securityAudit.findings, securityAudit.coverage);
    securityAudit.score = recalc.score;
    securityAudit.classification = recalc.classification;
    securityAudit.riskLevel = recalc.riskLevel;
    securityAudit.grade = recalc.grade;
    securityAudit.counts = recalc.counts;

    return {
        success: true,
        verified: Boolean(finding.verifiedFixed),
        status: finding.findingStatus,
        finding,
        securityAudit,
        message: finding.verifiedFixed
            ? `Hallazgo ${finding.id} verificado en código y marcado como Solucionado. Nuevo puntaje: ${securityAudit.score}/100.`
            : `Estado del hallazgo ${finding.id} actualizado a "${finding.findingStatus}".`
    };
}

function getProjectSecurityHistory(projectKey) {
    const key = String(projectKey || '').toLowerCase().trim().replace(/[^a-z0-9_\-\/]/g, '_');
    return projectAuditHistoryStore.get(key) || [];
}

module.exports = {
    runSecurityAnalysis,
    compareSecurityRuns,
    updateFindingStatus,
    getProjectSecurityHistory,
    SECURITY_DIMENSIONS,
    OFFICIAL_SCORE_SCALE
};
