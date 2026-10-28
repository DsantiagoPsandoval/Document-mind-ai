/**
 * DOCUMENT-MIND AI — SECURITY SCORE ENGINE
 * Computes a mathematically grounded, transparent Security Score (0-100).
 * Calculates scores across 8 security categories and counts severity distributions.
 * Explains deduction formulas clearly without inventing or mocking data.
 */

// Weight deductions per finding severity
const SEVERITY_WEIGHTS = {
    CRITICAL: 25,
    HIGH: 12,
    MEDIUM: 5,
    LOW: 2,
    INFO: 0
};

// 8 Security Categories
const SECURITY_CATEGORIES = [
    { id: 'authentication', name: 'Authentication', weight: 0.15 },
    { id: 'authorization', name: 'Authorization', weight: 0.15 },
    { id: 'inputValidation', name: 'Input Validation', weight: 0.20 },
    { id: 'apiSecurity', name: 'API Security', weight: 0.15 },
    { id: 'secretsManagement', name: 'Secrets Management', weight: 0.15 },
    { id: 'dependencies', name: 'Dependencies', weight: 0.10 },
    { id: 'configuration', name: 'Configuration', weight: 0.05 },
    { id: 'dataProtection', name: 'Data Protection', weight: 0.05 }
];

/**
 * Maps an OWASP category or finding name to one of the 8 Security Categories.
 */
function mapToCategory(finding) {
    const owasp = (finding.owaspCategory || '').toLowerCase();
    const name = (finding.name || '').toLowerCase();
    const type = (finding.type || '').toLowerCase();

    if (type.includes('secret') || type.includes('api key') || type.includes('token') || name.includes('secreto') || name.includes('clave')) {
        return 'secretsManagement';
    }
    if (owasp.includes('a01') || name.includes('access control') || name.includes('autorización') || name.includes('idor')) {
        return 'authorization';
    }
    if (owasp.includes('a07') || name.includes('autenticación') || name.includes('password') || name.includes('login') || name.includes('jwt')) {
        return 'authentication';
    }
    if (owasp.includes('a03') || name.includes('inyección') || name.includes('sqli') || name.includes('xss') || name.includes('eval') || name.includes('command')) {
        return 'inputValidation';
    }
    if (owasp.includes('a10') || name.includes('cors') || name.includes('api') || name.includes('endpoint') || name.includes('ssrf')) {
        return 'apiSecurity';
    }
    if (owasp.includes('a06') || name.includes('dependencia') || name.includes('paquete') || name.includes('lockfile')) {
        return 'dependencies';
    }
    if (owasp.includes('a05') || name.includes('configuración') || name.includes('headers') || name.includes('csp')) {
        return 'configuration';
    }
    if (owasp.includes('a02') || owasp.includes('a08') || owasp.includes('a09') || name.includes('crypto') || name.includes('hashing') || name.includes('log')) {
        return 'dataProtection';
    }

    return 'configuration';
}

/**
 * Computes overall Security Score and categorical distribution based on findings.
 * @param {Array<object>} findings - Combined list of SAST findings, secrets, and dependency issues
 * @param {object} projectStats - Statistics about analyzed files
 * @returns {object} Calculated score, category breakdown, counts, and explanation
 */
function calculateSecurityScore(findings = [], projectStats = {}) {
    const counts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        total: findings.length
    };

    const categoryDeductions = {
        authentication: 0,
        authorization: 0,
        inputValidation: 0,
        apiSecurity: 0,
        secretsManagement: 0,
        dependencies: 0,
        configuration: 0,
        dataProtection: 0
    };

    let totalDeductions = 0;

    // Process findings
    findings.forEach(f => {
        const sev = (f.severity || 'INFO').toUpperCase();
        if (sev === 'CRITICAL') counts.critical++;
        else if (sev === 'HIGH') counts.high++;
        else if (sev === 'MEDIUM') counts.medium++;
        else if (sev === 'LOW') counts.low++;
        else counts.info++;

        const penalty = SEVERITY_WEIGHTS[sev] || 0;
        totalDeductions += penalty;

        const cat = mapToCategory(f);
        categoryDeductions[cat] = (categoryDeductions[cat] || 0) + penalty;
    });

    // Base score is 100, clamped between 0 and 100
    const rawScore = 100 - totalDeductions;
    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Categorical Scores (0 - 100 per category)
    const categoryScores = {};
    SECURITY_CATEGORIES.forEach(cat => {
        const catDed = categoryDeductions[cat.id] || 0;
        categoryScores[cat.id] = Math.max(0, Math.min(100, 100 - (catDed * 2))); // Normalized scale
    });

    // Determine security grade
    let grade = 'A';
    let riskLevel = 'Bajo';
    let gradeColor = '#34D399'; // Emerald

    if (finalScore < 50 || counts.critical > 0) {
        grade = 'F';
        riskLevel = 'Crítico';
        gradeColor = '#FB7185'; // Rose
    } else if (finalScore < 65 || counts.high >= 2) {
        grade = 'D';
        riskLevel = 'Alto';
        gradeColor = '#FB7185';
    } else if (finalScore < 75 || counts.high === 1) {
        grade = 'C';
        riskLevel = 'Moderado';
        gradeColor = '#F59E0B'; // Amber
    } else if (finalScore < 90 || counts.medium > 1) {
        grade = 'B';
        riskLevel = 'Aceptable';
        gradeColor = '#38BDF8'; // Cyan
    }

    // Mathematical explanation
    const formulaExplanation = `Puntaje Base (100) - [Críticos (${counts.critical} × 25) + Altos (${counts.high} × 12) + Medios (${counts.medium} × 5) + Bajos (${counts.low} × 2)] = ${finalScore}/100. Puntuación calculada exclusivamente a partir de los hallazgos técnicos reales comprobados en el código.`;

    return {
        score: finalScore,
        grade,
        riskLevel,
        gradeColor,
        counts,
        categoryScores,
        explanation: formulaExplanation
    };
}

module.exports = {
    calculateSecurityScore,
    mapToCategory,
    SEVERITY_WEIGHTS
};
