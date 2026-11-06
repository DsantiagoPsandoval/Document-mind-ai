/**
 * DOCUMENT-MIND AI — SECURITY ANALYZER (CORE ORCHESTRATOR)
 * Unifies SAST code analysis, Secret Scanner, Dependency Auditor, Security Score Engine,
 * 12-Dimension Evaluation, Remediation Planner, STRIDE Threat Modeler, and DevSecOps Exporters.
 */

const { scanProjectSecrets } = require('./security/secretScanner');
const { analyzeStaticRules } = require('./security/staticRules');
const { auditDependencies } = require('./security/dependencyAuditor');
const { calculateSecurityScore, SECURITY_DIMENSIONS } = require('./security/scoreCalculator');
const { buildRemediationPlan } = require('./security/remediationPlanner');
const { compareSecurityRuns } = require('./security/runComparator');
const { generateStrideThreatModel } = require('./security/threatModeler');
const { generateSecurityRequirements } = require('./security/requirementsGenerator');
const { generateSecurityMarkdownReport, generateSecurityJsonReport } = require('./security/securityReportGenerator');

/**
 * Runs a complete, rigorous security audit on the project data.
 * @param {object} projectData - The parsed project structure, files, endpoints, and models
 * @param {object} [options] - Optional previousRun to compute historical comparison
 * @returns {object} Full security audit suite
 */
async function runSecurityAnalysis(projectData, options = {}) {
    const files = projectData.prioritizedFiles || projectData.files || [];
    const projectName = projectData.repository?.name || projectData.projectName || 'Proyecto';

    // 1. Secret Scanner (Detect API keys, JWTs, DB passwords, private keys)
    const secrets = scanProjectSecrets(files);

    // 2. Static SAST Analysis (SQLi, XSS, CMDi, Path Traversal, Eval, SSRF, CORS, etc.)
    const sastFindings = analyzeStaticRules(files);

    // 3. Dependency Security Audit (package.json, requirements.txt)
    const dependencyFindings = auditDependencies(files);

    // Combine all findings
    const allFindings = [
        ...secrets,
        ...sastFindings,
        ...dependencyFindings
    ];

    // Compute project statistics for coverage calculation
    const stats = projectData.stats || {
        filesAnalyzed: files.length,
        totalFiles: projectData.fileTree?.length || files.length || 1
    };

    // 4. Calculate Mathematical Security Score (0 - 100) & 12 Dimensions Breakdown
    const scoreData = calculateSecurityScore(allFindings, stats);

    // 5. Build Actionable Remediation Plan (4 Queues)
    const remediationPlan = buildRemediationPlan(allFindings);

    // 6. Generate STRIDE Threat Model
    const threatModel = generateStrideThreatModel(
        projectData.projectMap || {},
        projectData.endpoints || [],
        projectData.detectedDatabases || []
    );

    // 7. Generate Automated Security Requirements (SEC-001...)
    const securityRequirements = generateSecurityRequirements(allFindings, projectData);

    const securityAudit = {
        title: 'DocuMind Security Intelligence',
        score: scoreData.score,
        rawScore: scoreData.rawScore,
        grade: scoreData.grade,
        classification: scoreData.classification,
        riskLevel: scoreData.riskLevel,
        gradeColor: scoreData.gradeColor,
        classificationDescription: scoreData.classificationDescription,
        isCappedByCritical: scoreData.isCappedByCritical,
        counts: scoreData.counts,
        dimensions: scoreData.dimensions,
        categoryScores: scoreData.categoryScores,
        categories: scoreData.dimensions, // Backward compatibility for UI
        deductions: scoreData.deductions,
        coverage: scoreData.coverage,
        explanation: scoreData.explanation,
        remediationPlan,
        secrets,
        findings: allFindings,
        vulnerabilities: sastFindings,
        sastFindings,
        dependencyFindings,
        dependencies: {
            findings: dependencyFindings,
            count: dependencyFindings.length
        },
        threatModel,
        securityRequirements,
        timestamp: new Date().toISOString()
    };

    // 8. Historical comparison if previous run provided
    if (options.previousRun) {
        securityAudit.comparison = compareSecurityRuns(options.previousRun, securityAudit);
    }

    // 9. Generate Full Markdown and JSON Reports
    securityAudit.markdownReport = generateSecurityMarkdownReport(securityAudit, projectName);
    securityAudit.jsonReport = generateSecurityJsonReport(securityAudit, projectName);

    return securityAudit;
}

module.exports = {
    runSecurityAnalysis,
    compareSecurityRuns,
    SECURITY_DIMENSIONS
};
