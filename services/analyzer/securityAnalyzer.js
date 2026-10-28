/**
 * DOCUMENT-MIND AI — SECURITY ANALYZER (CORE ORCHESTRATOR)
 * Unifies SAST code analysis, Secret Scanner, Dependency Auditor, Security Score Engine,
 * STRIDE Threat Modeler, Requirements Generator, and Gemini AI contextual analysis.
 */

const { scanProjectSecrets } = require('./security/secretScanner');
const { analyzeStaticRules } = require('./security/staticRules');
const { auditDependencies } = require('./security/dependencyAuditor');
const { calculateSecurityScore } = require('./security/scoreCalculator');
const { generateStrideThreatModel } = require('./security/threatModeler');
const { generateSecurityRequirements } = require('./security/requirementsGenerator');
const { generateSecurityMarkdownReport, generateSecurityJsonReport } = require('./security/securityReportGenerator');

/**
 * Runs a complete, rigorous security audit on the project data.
 * @param {object} projectData - The parsed project structure, files, endpoints, and models
 * @returns {object} Full security audit suite
 */
async function runSecurityAnalysis(projectData) {
    const files = projectData.prioritizedFiles || [];
    const projectName = projectData.repository?.name || projectData.projectName || 'Proyecto';

    // 1. Secret Scanner (Detect API keys, JWTs, DB passwords, private keys)
    const secrets = scanProjectSecrets(files);

    // 2. Static SAST Analysis (SQLi, XSS, Command Injection, Path Traversal, Eval, SSRF)
    const sastFindings = analyzeStaticRules(files);

    // 3. Dependency Security Audit (package.json, requirements.txt)
    const dependencyFindings = auditDependencies(files);

    // Combine all findings
    const allFindings = [
        ...secrets,
        ...sastFindings,
        ...dependencyFindings
    ];

    // 4. Calculate Mathematical Security Score (0 - 100) & Categories
    const scoreData = calculateSecurityScore(allFindings, projectData.stats);

    // 5. Generate STRIDE Threat Model
    const threatModel = generateStrideThreatModel(
        projectData.projectMap || {},
        projectData.endpoints || [],
        projectData.detectedDatabases || []
    );

    // 6. Generate Automated Security Requirements (SEC-001...)
    const securityRequirements = generateSecurityRequirements(allFindings, projectData);

    const securityAudit = {
        score: scoreData.score,
        grade: scoreData.grade,
        riskLevel: scoreData.riskLevel,
        gradeColor: scoreData.gradeColor,
        counts: scoreData.counts,
        categoryScores: scoreData.categoryScores,
        explanation: scoreData.explanation,
        secrets,
        findings: allFindings,
        sastFindings,
        dependencyFindings,
        threatModel,
        securityRequirements
    };

    // 7. Generate Full Markdown and JSON Reports
    securityAudit.markdownReport = generateSecurityMarkdownReport(securityAudit, projectName);
    securityAudit.jsonReport = generateSecurityJsonReport(securityAudit, projectName);

    return securityAudit;
}

module.exports = {
    runSecurityAnalysis
};
