/**
 * DOCUMENT-MIND AI — SECURITY INTELLIGENCE SCORE ENGINE
 * Computes a mathematically grounded, deterministic, and transparent Security Score (0-100).
 * Evaluates 12 architectural security dimensions totaling 100% weight.
 * Features strict capping for critical vulnerabilities and coverage confidence metrics.
 */

// Mathematical severity penalty deductions
const SEVERITY_WEIGHTS = {
    CRITICAL: 25,
    HIGH: 12,
    MEDIUM: 5,
    LOW: 2,
    INFO: 0
};

// 12 Official Architectural Security Dimensions (Weights sum exactly to 1.00 / 100%)
const SECURITY_DIMENSIONS = [
    {
        id: 'secretsManagement',
        name: 'Gestión de secretos y credenciales',
        weight: 0.15,
        icon: 'fa-key',
        description: 'Detección de API keys, tokens Bearer, contraseñas hardcodeadas y llaves privadas.'
    },
    {
        id: 'authentication',
        name: 'Autenticación y autorización',
        weight: 0.15,
        icon: 'fa-user-shield',
        description: 'Mecanismos de verificación de identidad, tokens JWT, robustez de credenciales y roles.'
    },
    {
        id: 'inputValidation',
        name: 'Validación y sanitización de entradas',
        weight: 0.10,
        icon: 'fa-filter',
        description: 'Esquemas de validación de carga (Zod, Joi, Pydantic) y sanitización contra datos no confiables.'
    },
    {
        id: 'injectionProtection',
        name: 'Protección contra inyecciones',
        weight: 0.10,
        icon: 'fa-shield-virus',
        description: 'Prevención de SQL Injection, Command Injection, XSS y ejecución dinámica eval/unserialize.'
    },
    {
        id: 'apiSecurity',
        name: 'Seguridad de APIs',
        weight: 0.10,
        icon: 'fa-network-wired',
        description: 'Configuración de CORS, prevención de SSRF, rate limiting y contratos seguros de comunicación.'
    },
    {
        id: 'serverConfig',
        name: 'Configuración de servidores',
        weight: 0.05,
        icon: 'fa-server',
        description: 'Cabeceras HTTP seguras (Helmet, HSTS, CSP), deshabilitación de banners de servidor y TLS.'
    },
    {
        id: 'dependencies',
        name: 'Seguridad de dependencias',
        weight: 0.10,
        icon: 'fa-boxes-stacked',
        description: 'Auditoría de bibliotecas de terceros, análisis de versiones obsoletas, CVEs y rangos comodín.'
    },
    {
        id: 'dataProtection',
        name: 'Protección de datos y privacidad',
        weight: 0.05,
        icon: 'fa-database',
        description: 'Criptografía moderna, cifrado en reposo/tránsito y prevención de almacenamiento en texto plano.'
    },
    {
        id: 'sessionManagement',
        name: 'Gestión de sesiones',
        weight: 0.05,
        icon: 'fa-clock-rotate-left',
        description: 'Configuración segura de cookies (HttpOnly, Secure, SameSite) y expiración de tokens.'
    },
    {
        id: 'errorHandling',
        name: 'Manejo de errores y exposición de información',
        weight: 0.05,
        icon: 'fa-bug-slash',
        description: 'Prevención de fugas de stack traces en producción, endpoints de depuración y mensajes verbosos.'
    },
    {
        id: 'infrastructure',
        name: 'Seguridad de infraestructura y despliegue',
        weight: 0.05,
        icon: 'fa-cloud',
        description: 'Gestión de archivos .env en VCS, buckets públicos, contenedores Docker y flags de depuración.'
    },
    {
        id: 'accessControl',
        name: 'Configuración de permisos y políticas de acceso',
        weight: 0.05,
        icon: 'fa-lock',
        description: 'Prevención de Broken Object Level Authorization (BOLA/IDOR) y rutas privilegiadas sin middleware.'
    }
];

/**
 * Maps any finding or rule to one of the 12 official dimensions.
 * @param {object} finding
 * @returns {string} dimension id
 */
function mapToDimension(finding) {
    if (finding.dimensionId && SECURITY_DIMENSIONS.some(d => d.id === finding.dimensionId)) {
        return finding.dimensionId;
    }

    const type = (finding.type || '').toLowerCase();
    const name = (finding.name || '').toLowerCase();
    const ruleId = (finding.ruleId || finding.id || '').toUpperCase();
    const owasp = (finding.owaspCategory || finding.owasp || '').toLowerCase();

    // 1. Secrets Management
    if (type.includes('secret') || type.includes('api key') || type.includes('token') ||
        ruleId.includes('SECRET') || name.includes('secreto') || name.includes('hardcoded') || name.includes('api key')) {
        return 'secretsManagement';
    }

    // 4. Injection Protection (SQLi, CMDi, XSS, Eval, Deserialization)
    if (ruleId.includes('SQLI') || ruleId.includes('CMDI') || ruleId.includes('XSS') || ruleId.includes('EVAL') || ruleId.includes('DESER') ||
        name.includes('inyección') || name.includes('sqli') || name.includes('xss') || name.includes('eval') || name.includes('deserializ')) {
        return 'injectionProtection';
    }

    // 3. Input Validation & Sanitization
    if (ruleId.includes('INPUT') || ruleId.includes('VALID') || name.includes('sanitiz') || name.includes('validación') || name.includes('esquema')) {
        return 'inputValidation';
    }

    // 9. Session Management
    if (ruleId.includes('SESS') || ruleId.includes('COOKIE') || name.includes('sesión') || name.includes('cookie') || name.includes('httponly')) {
        return 'sessionManagement';
    }

    // 10. Error Handling & Info Leak
    if (ruleId.includes('LEAK') || ruleId.includes('STACK') || ruleId.includes('LOG') || name.includes('stack trace') || name.includes('fuga') || name.includes('exposición de información')) {
        return 'errorHandling';
    }

    // 11. Infrastructure & Deployment
    if (ruleId.includes('INFRA') || ruleId.includes('ENV') || ruleId.includes('CLOUD') || name.includes('.env') || name.includes('bucket') || name.includes('docker') || name.includes('infraestructura')) {
        return 'infrastructure';
    }

    // 12. Access Control (IDOR / BOLA)
    if (ruleId.includes('IDOR') || ruleId.includes('BOLA') || name.includes('control de acceso') || name.includes('idor') || name.includes('bola')) {
        return 'accessControl';
    }

    // 2. Authentication & Authorization
    if (ruleId.includes('AUTH') || ruleId.includes('JWT') || name.includes('autenticación') || name.includes('autorización') || name.includes('jwt') || name.includes('password')) {
        return 'authentication';
    }

    // 5. API Security (CORS, SSRF, Rate Limiting)
    if (ruleId.includes('CORS') || ruleId.includes('SSRF') || ruleId.includes('RATE') || name.includes('cors') || name.includes('ssrf') || name.includes('api')) {
        return 'apiSecurity';
    }

    // 6. Server Configuration (Helmet, Security Headers, HSTS, CSP)
    if (ruleId.includes('HEADER') || ruleId.includes('HELMET') || ruleId.includes('SERVER') || name.includes('servidor') || name.includes('helmet') || name.includes('cabecera')) {
        return 'serverConfig';
    }

    // 7. Dependencies (SCA, package.json, requirements.txt)
    if (ruleId.includes('DEP') || name.includes('dependencia') || name.includes('paquete') || name.includes('outdated')) {
        return 'dependencies';
    }

    // 8. Data Protection & Privacy (Crypto, Weak Hash)
    if (ruleId.includes('CRYPTO') || ruleId.includes('HASH') || name.includes('cripto') || name.includes('cifrado') || name.includes('privacidad')) {
        return 'dataProtection';
    }

    // Fallback based on OWASP Top 10
    if (owasp.includes('a01')) return 'accessControl';
    if (owasp.includes('a02')) return 'dataProtection';
    if (owasp.includes('a03')) return 'injectionProtection';
    if (owasp.includes('a04')) return 'inputValidation';
    if (owasp.includes('a05')) return 'serverConfig';
    if (owasp.includes('a06')) return 'dependencies';
    if (owasp.includes('a07')) return 'authentication';
    if (owasp.includes('a08')) return 'dataProtection';
    if (owasp.includes('a09')) return 'errorHandling';
    if (owasp.includes('a10')) return 'apiSecurity';

    return 'serverConfig';
}

/**
 * Calculates classification metadata based on official 0-100 tiers.
 * 90–100: Excelente
 * 80–89:  Bueno
 * 70–79:  Aceptable
 * 50–69:  Riesgo moderado
 * 30–49:  Riesgo alto
 * 0–29:   Riesgo crítico
 */
function getClassification(score, criticalCount = 0) {
    if (score >= 90 && criticalCount === 0) {
        return {
            classification: 'Excelente',
            grade: 'A+',
            riskLevel: 'Bajo',
            color: '#34D399', // Emerald
            description: 'Excelente blindaje de seguridad. No se identificaron vulnerabilidades críticas ni altas dentro del alcance evaluado.'
        };
    }
    if (score >= 80 && criticalCount === 0) {
        return {
            classification: 'Bueno',
            grade: 'A',
            riskLevel: 'Bajo-Moderado',
            color: '#38BDF8', // Cyan
            description: 'Buen nivel de seguridad general. Controles sólidos con oportunidades puntuales de optimización preventiva.'
        };
    }
    if (score >= 70 && criticalCount === 0) {
        return {
            classification: 'Aceptable',
            grade: 'B',
            riskLevel: 'Moderado',
            color: '#FBBF24', // Amber
            description: 'Nivel aceptable pero requiere atención en validación de entradas o dependencias desactualizadas.'
        };
    }
    if (score >= 50 && criticalCount === 0) {
        return {
            classification: 'Riesgo moderado',
            grade: 'C',
            riskLevel: 'Moderado-Alto',
            color: '#FB923C', // Orange
            description: 'Se observan múltiples deficiencias medias o configuraciones inseguras que elevan la superficie de ataque.'
        };
    }
    if (score >= 30) {
        return {
            classification: 'Riesgo alto',
            grade: 'D',
            riskLevel: 'Alto',
            color: '#F87171', // Red
            description: 'Presencia de vulnerabilidades severas o acumulación crítica de fallas de seguridad que comprometen el sistema.'
        };
    }
    return {
        classification: 'Riesgo crítico',
        grade: 'F',
        riskLevel: 'Crítico',
        color: '#EF4444', // Dark Red
        description: 'Exposición o deficiencias críticas generalizadas. Requiere intervención inmediata antes de cualquier despliegue.'
    };
}

/**
 * Computes coverage percentage and confidence level.
 * @param {object} projectStats
 * @returns {{ coveragePct: number, confidenceLevel: string, filesAnalyzed: number, totalFiles: number }}
 */
function calculateCoverage(projectStats = {}) {
    const filesAnalyzed = projectStats.filesAnalyzed || projectStats.totalAnalyzedFiles || projectStats.codeFiles || 0;
    const totalFiles = projectStats.totalFiles || projectStats.allFilesCount || (filesAnalyzed > 0 ? filesAnalyzed : 1);
    
    let coveragePct = 100;
    if (totalFiles > 0) {
        coveragePct = Math.min(100, Math.max(1, Math.round((filesAnalyzed / totalFiles) * 100)));
    }

    let confidenceLevel = 'Alta';
    if (coveragePct < 50) {
        confidenceLevel = 'Básica';
    } else if (coveragePct < 80) {
        confidenceLevel = 'Media';
    }

    return {
        coveragePct,
        confidenceLevel,
        filesAnalyzed,
        totalFiles
    };
}

/**
 * Computes overall Security Score and categorical distribution based on findings.
 * @param {Array<object>} findings - Combined list of SAST findings, secrets, and dependency issues
 * @param {object} projectStats - Statistics about analyzed files
 * @returns {object} Calculated score, 12 dimensions breakdown, counts, coverage, and explanation
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

    // Initialize deduction counters for all 12 dimensions
    const dimensionDeductions = {};
    const dimensionFindingsCount = {};
    SECURITY_DIMENSIONS.forEach(dim => {
        dimensionDeductions[dim.id] = 0;
        dimensionFindingsCount[dim.id] = 0;
    });

    let totalDeductions = 0;
    const detailedDeductions = [];

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

        const dimId = mapToDimension(f);
        dimensionDeductions[dimId] = (dimensionDeductions[dimId] || 0) + penalty;
        dimensionFindingsCount[dimId] = (dimensionFindingsCount[dimId] || 0) + 1;

        // Injections stem fundamentally from input validation failures (CWE-20/OWASP A03/A04)
        if (dimId === 'injectionProtection') {
            dimensionDeductions['inputValidation'] = (dimensionDeductions['inputValidation'] || 0) + Math.round(penalty * 0.6);
        }

        if (penalty > 0) {
            detailedDeductions.push({
                findingId: f.id,
                name: f.name || f.title,
                dimensionId: dimId,
                severity: sev,
                deduction: penalty,
                file: f.file || 'General',
                line: f.line || 1
            });
        }
    });

    // Base score calculation: 100 - sum(deductions)
    let rawScore = 100 - totalDeductions;
    rawScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // STRICT CAPPING RULE:
    // Any confirmed CRITICAL finding prevents "Excelente" (90-100) and "Bueno" (80-89).
    // If critical findings exist, maximum score is capped at 49 (Riesgo alto / Riesgo crítico).
    let isCappedByCritical = false;
    let finalScore = rawScore;
    if (counts.critical > 0 && finalScore > 49) {
        finalScore = 49;
        isCappedByCritical = true;
    }

    // Categorical Scores (0 - 100 per dimension)
    // Normalized deduction per dimension: 100 - (deductions * 2.5) clamped to [0, 100]
    const dimensions = {};
    SECURITY_DIMENSIONS.forEach(dim => {
        const ded = dimensionDeductions[dim.id] || 0;
        const count = dimensionFindingsCount[dim.id] || 0;
        const dScore = Math.max(0, Math.min(100, 100 - Math.round(ded * 2.2)));
        
        let dStatus = 'Excelente';
        if (dScore < 30) dStatus = 'Crítico';
        else if (dScore < 50) dStatus = 'Alto Riesgo';
        else if (dScore < 70) dStatus = 'Atención';
        else if (dScore < 90) dStatus = 'Bueno';

        dimensions[dim.id] = {
            id: dim.id,
            name: dim.name,
            weight: dim.weight,
            weightPct: Math.round(dim.weight * 100),
            icon: dim.icon,
            score: dScore,
            status: dStatus,
            findingsCount: count,
            deductions: ded
        };
    });

    // Coverage & Confidence
    const coverage = calculateCoverage(projectStats);

    // Classification metadata
    const classMeta = getClassification(finalScore, counts.critical);

    // Mathematical Transparent Explanation
    let formulaExplanation = `Puntaje Base (100) - [Críticos (${counts.critical} × 25) + Altos (${counts.high} × 12) + Medios (${counts.medium} × 5) + Bajos (${counts.low} × 2)] = ${rawScore}/100.`;
    if (isCappedByCritical) {
        formulaExplanation += ` Puntuación acotada estrictamente a 49/100 debido a la presencia de ${counts.critical} vulnerabilidad(es) crítica(s) de seguridad identificada(s).`;
    }
    formulaExplanation += ` Cobertura del análisis: ${coverage.coveragePct}% (${coverage.filesAnalyzed}/${coverage.totalFiles} archivos evaluados). Nivel de confianza: ${coverage.confidenceLevel}.`;

    return {
        score: finalScore,
        rawScore,
        grade: classMeta.grade,
        classification: classMeta.classification,
        riskLevel: classMeta.riskLevel,
        gradeColor: classMeta.color,
        classificationDescription: classMeta.description,
        isCappedByCritical,
        counts,
        dimensions,
        categoryScores: Object.fromEntries(Object.entries(dimensions).map(([k, v]) => [k, v.score])),
        deductions: detailedDeductions,
        coverage,
        explanation: formulaExplanation
    };
}

module.exports = {
    SECURITY_DIMENSIONS,
    SEVERITY_WEIGHTS,
    calculateSecurityScore,
    mapToDimension,
    getClassification,
    calculateCoverage
};
