/**
 * DOCUMIND AI — SECURITY INTELLIGENCE SCORE ENGINE
 * Computes a mathematically grounded, deterministic, and transparent Security Score (0-100).
 * Evaluates 12 architectural security dimensions totaling 100% weight.
 * Official Visual Scale:
 *   - 90–100: Seguridad alta
 *   - 75–89:  Seguridad aceptable
 *   - 50–74:  Requiere mejoras
 *   - 25–49:  Riesgo elevado
 *   - 0–24:   Riesgo crítico
 */

const SEVERITY_WEIGHTS = {
    CRITICAL: 25,
    HIGH: 12,
    MEDIUM: 5,
    LOW: 2,
    INFO: 0
};

const OFFICIAL_SCORE_SCALE = [
    { min: 90, max: 100, label: 'Seguridad alta', riskLevel: 'Bajo', grade: 'A+', color: '#34D399' },
    { min: 75, max: 89, label: 'Seguridad aceptable', riskLevel: 'Moderado-Bajo', grade: 'A', color: '#38BDF8' },
    { min: 50, max: 74, label: 'Requiere mejoras', riskLevel: 'Medio', grade: 'B', color: '#FBBF24' },
    { min: 25, max: 49, label: 'Riesgo elevado', riskLevel: 'Alto', grade: 'D', color: '#FB923C' },
    { min: 0, max: 24, label: 'Riesgo crítico', riskLevel: 'Crítico', grade: 'F', color: '#EF4444' }
];

// 12 Official Architectural Security Dimensions (Weights sum exactly to 1.00 / 100%)
const SECURITY_DIMENSIONS = [
    {
        id: 'secretsManagement',
        name: 'Gestión de secretos y credenciales',
        weight: 0.15,
        icon: 'fa-key',
        description: 'Detección de API keys, tokens Bearer, contraseñas expuestas y llaves privadas.'
    },
    {
        id: 'authentication',
        name: 'Autenticación y autorización',
        weight: 0.15,
        icon: 'fa-user-shield',
        description: 'Mecanismos de verificación de identidad, tokens JWT, robustez de credenciales y control de roles.'
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
        name: 'Protección contra inyecciones (SQLi / XSS / RCE)',
        weight: 0.10,
        icon: 'fa-shield-virus',
        description: 'Prevención de SQL Injection, Command Injection, XSS y ejecución dinámica eval/unserialize.'
    },
    {
        id: 'apiSecurity',
        name: 'Seguridad de APIs, CORS, CSRF y SSRF',
        weight: 0.10,
        icon: 'fa-network-wired',
        description: 'Configuración de CORS, protección CSRF, prevención de SSRF, rate limiting y contratos seguros.'
    },
    {
        id: 'serverConfig',
        name: 'Configuración de seguridad HTTP y políticas',
        weight: 0.05,
        icon: 'fa-server',
        description: 'Cabeceras HTTP seguras (Helmet, HSTS, CSP), políticas de seguridad y transporte TLS.'
    },
    {
        id: 'dependencies',
        name: 'Seguridad de dependencias (SCA)',
        weight: 0.10,
        icon: 'fa-boxes-stacked',
        description: 'Auditoría de bibliotecas de terceros, análisis de versiones vulnerables, CVEs y rangos comodín.'
    },
    {
        id: 'dataProtection',
        name: 'Protección de datos y criptografía',
        weight: 0.05,
        icon: 'fa-database',
        description: 'Criptografía moderna, cifrado en reposo/tránsito y prevención de exposición de datos sensibles.'
    },
    {
        id: 'sessionManagement',
        name: 'Manejo seguro de sesiones',
        weight: 0.05,
        icon: 'fa-clock-rotate-left',
        description: 'Configuración segura de cookies (HttpOnly, Secure, SameSite) y ciclo de vida de sesiones.'
    },
    {
        id: 'errorHandling',
        name: 'Manejo de errores y exposición de información',
        weight: 0.05,
        icon: 'fa-bug-slash',
        description: 'Prevención de fugas de stack traces en producción, endpoints de depuración y logs verbosos.'
    },
    {
        id: 'infrastructure',
        name: 'Seguridad de infraestructura y despliegue',
        weight: 0.05,
        icon: 'fa-cloud',
        description: 'Gestión de archivos .env en VCS, contenedores Docker, permisos y flags de depuración.'
    },
    {
        id: 'accessControl',
        name: 'Control de acceso y autorización (BOLA/IDOR)',
        weight: 0.05,
        icon: 'fa-lock',
        description: 'Prevención de Broken Object Level Authorization (BOLA/IDOR) y rutas privilegiadas sin validación.'
    }
];

function mapToDimension(finding) {
    if (finding.dimensionId && SECURITY_DIMENSIONS.some(d => d.id === finding.dimensionId)) {
        return finding.dimensionId;
    }

    const type = (finding.type || '').toLowerCase();
    const name = (finding.name || '').toLowerCase();
    const ruleId = (finding.ruleId || finding.id || '').toUpperCase();
    const owasp = (finding.owaspCategory || finding.owasp || '').toLowerCase();

    if (type.includes('secret') || type.includes('api key') || type.includes('token') ||
        ruleId.includes('SECRET') || name.includes('secreto') || name.includes('hardcoded') || name.includes('api key')) {
        return 'secretsManagement';
    }
    if (ruleId.includes('SQLI') || ruleId.includes('CMDI') || ruleId.includes('XSS') || ruleId.includes('EVAL') || ruleId.includes('DESER') ||
        name.includes('inyección') || name.includes('sqli') || name.includes('xss') || name.includes('eval') || name.includes('deserializ')) {
        return 'injectionProtection';
    }
    if (ruleId.includes('INPUT') || ruleId.includes('VALID') || name.includes('sanitiz') || name.includes('validación') || name.includes('esquema')) {
        return 'inputValidation';
    }
    if (ruleId.includes('SESS') || ruleId.includes('COOKIE') || name.includes('sesión') || name.includes('cookie') || name.includes('httponly')) {
        return 'sessionManagement';
    }
    if (ruleId.includes('LEAK') || ruleId.includes('STACK') || ruleId.includes('LOG') || name.includes('stack trace') || name.includes('fuga') || name.includes('exposición de información')) {
        return 'errorHandling';
    }
    if (ruleId.includes('INFRA') || ruleId.includes('ENV') || ruleId.includes('CLOUD') || name.includes('.env') || name.includes('bucket') || name.includes('docker') || name.includes('infraestructura')) {
        return 'infrastructure';
    }
    if (ruleId.includes('IDOR') || ruleId.includes('BOLA') || name.includes('control de acceso') || name.includes('idor') || name.includes('bola')) {
        return 'accessControl';
    }
    if (ruleId.includes('AUTH') || ruleId.includes('JWT') || name.includes('autenticación') || name.includes('autorización') || name.includes('jwt') || name.includes('password')) {
        return 'authentication';
    }
    if (ruleId.includes('CORS') || ruleId.includes('SSRF') || ruleId.includes('CSRF') || ruleId.includes('RATE') || name.includes('cors') || name.includes('ssrf') || name.includes('csrf') || name.includes('api')) {
        return 'apiSecurity';
    }
    if (ruleId.includes('HEADER') || ruleId.includes('HELMET') || ruleId.includes('CSP') || ruleId.includes('SERVER') || name.includes('servidor') || name.includes('helmet') || name.includes('cabecera')) {
        return 'serverConfig';
    }
    if (ruleId.includes('DEP') || name.includes('dependencia') || name.includes('paquete') || name.includes('outdated')) {
        return 'dependencies';
    }
    if (ruleId.includes('CRYPTO') || ruleId.includes('HASH') || name.includes('cripto') || name.includes('cifrado') || name.includes('privacidad')) {
        return 'dataProtection';
    }

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
 * Calculates classification metadata based on the official 0-100 scale:
 *   90–100: Seguridad alta
 *   75–89:  Seguridad aceptable
 *   50–74:  Requiere mejoras
 *   25–49:  Riesgo elevado
 *   0–24:   Riesgo crítico
 */
function getClassification(score, criticalCount = 0) {
    if (score >= 90 && criticalCount === 0) {
        return {
            classification: 'Seguridad alta',
            grade: 'A+',
            riskLevel: 'Bajo',
            color: '#34D399',
            description: 'Seguridad alta (90–100): El código y las configuraciones analizadas presentan controles defensivos robustos sin vulnerabilidades críticas ni altas confirmadas.'
        };
    }
    if (score >= 75 && criticalCount === 0) {
        return {
            classification: 'Seguridad aceptable',
            grade: 'A',
            riskLevel: 'Moderado-Bajo',
            color: '#38BDF8',
            description: 'Seguridad aceptable (75–89): Postura de seguridad adecuada en los archivos examinados, con oportunidades puntuales de endurecimiento preventivo.'
        };
    }
    if (score >= 50 && criticalCount === 0) {
        return {
            classification: 'Requiere mejoras',
            grade: 'B',
            riskLevel: 'Medio',
            color: '#FBBF24',
            description: 'Requiere mejoras (50–74): Se identificaron deficiencias de severidad media o validaciones incompletas que incrementan la superficie de exposición.'
        };
    }
    if (score >= 25) {
        return {
            classification: 'Riesgo elevado',
            grade: 'D',
            riskLevel: 'Alto',
            color: '#FB923C',
            description: 'Riesgo elevado (25–49): Presencia de vulnerabilidades severas o críticas que requieren remediación prioritaria antes de su despliegue en producción.'
        };
    }
    return {
        classification: 'Riesgo crítico',
        grade: 'F',
        riskLevel: 'Crítico',
        color: '#EF4444',
        description: 'Riesgo crítico (0–24): Exposición severa de credenciales o múltiples fallas críticas de seguridad. Requiere intervención urgente inmediata.'
    };
}

function calculateCoverage(projectStats = {}) {
    const filesAnalyzed = projectStats.filesAnalyzed || projectStats.analyzedFilesCount || projectStats.relevantFilesCount || projectStats.totalAnalyzedFiles || projectStats.codeFiles || 0;
    const totalFiles = projectStats.totalFiles || projectStats.allFilesCount || (filesAnalyzed > 0 ? filesAnalyzed : 1);

    let coveragePct = 100;
    if (totalFiles > 0) {
        coveragePct = Math.min(100, Math.max(1, Math.round((filesAnalyzed / totalFiles) * 100)));
    }

    let confidenceLevel = 'Alta';
    if (coveragePct < 50) {
        confidenceLevel = 'Parcial / Básica';
    } else if (coveragePct < 80) {
        confidenceLevel = 'Media';
    }

    return {
        coveragePct,
        confidenceLevel,
        filesAnalyzed,
        totalFiles,
        uninspectedFilesCount: Math.max(0, totalFiles - filesAnalyzed)
    };
}

function calculateSecurityScore(findings = [], projectStats = {}) {
    const counts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        total: findings.length,
        confirmed: 0,
        potential: 0,
        inferred: 0,
        pendingVerification: 0
    };

    const dimensionDeductions = {};
    const dimensionFindingsCount = {};
    SECURITY_DIMENSIONS.forEach(dim => {
        dimensionDeductions[dim.id] = 0;
        dimensionFindingsCount[dim.id] = 0;
    });

    let totalDeductions = 0;
    const detailedDeductions = [];

    findings.forEach(f => {
        const sev = (f.severity || 'INFO').toUpperCase();
        if (sev === 'CRITICAL') counts.critical++;
        else if (sev === 'HIGH') counts.high++;
        else if (sev === 'MEDIUM') counts.medium++;
        else if (sev === 'LOW') counts.low++;
        else counts.info++;

        const veracity = (f.veracityType || f.certainty || '').toLowerCase();
        const status = (f.status || '').toLowerCase();
        if (veracity.includes('confirmad') || status === 'confirmado') {
            counts.confirmed++;
        } else if (veracity.includes('inferid')) {
            counts.inferred++;
            counts.pendingVerification++;
        } else {
            counts.potential++;
            counts.pendingVerification++;
        }

        // Only deduct if finding is not verified as resolved
        const isResolved = (f.findingStatus || '').toLowerCase() === 'solucionado' && f.verifiedFixed === true;
        const penalty = isResolved ? 0 : (SEVERITY_WEIGHTS[sev] || 0);
        totalDeductions += penalty;

        const dimId = mapToDimension(f);
        dimensionDeductions[dimId] = (dimensionDeductions[dimId] || 0) + penalty;
        dimensionFindingsCount[dimId] = (dimensionFindingsCount[dimId] || 0) + 1;

        if (dimId === 'injectionProtection' && penalty > 0) {
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

    let rawScore = 100 - totalDeductions;
    rawScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Strict Capping Rule: Any active CRITICAL vulnerability caps the score at 49 (Riesgo elevado / Riesgo crítico)
    let isCappedByCritical = false;
    let finalScore = rawScore;
    if (counts.critical > 0 && finalScore > 49) {
        finalScore = 49;
        isCappedByCritical = true;
    }

    const dimensions = {};
    SECURITY_DIMENSIONS.forEach(dim => {
        const ded = dimensionDeductions[dim.id] || 0;
        const count = dimensionFindingsCount[dim.id] || 0;
        const dScore = Math.max(0, Math.min(100, 100 - Math.round(ded * 2.2)));

        let dStatus = 'Seguridad alta';
        if (dScore < 25) dStatus = 'Riesgo crítico';
        else if (dScore < 50) dStatus = 'Riesgo elevado';
        else if (dScore < 75) dStatus = 'Requiere mejoras';
        else if (dScore < 90) dStatus = 'Seguridad aceptable';

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

    const coverage = calculateCoverage(projectStats);
    const classMeta = getClassification(finalScore, counts.critical);

    let formulaExplanation = `Fórmula Técnica Determinista: Puntuación Base (100) − [Críticos (${counts.critical} × 25) + Altos (${counts.high} × 12) + Medios (${counts.medium} × 5) + Bajos (${counts.low} × 2)] = ${rawScore}/100.`;
    if (isCappedByCritical) {
        formulaExplanation += ` Puntuación limitada a 49/100 (Riesgo elevado) por la presencia de ${counts.critical} vulnerabilidad(es) crítica(s).`;
    }
    formulaExplanation += ` Cobertura estática: ${coverage.coveragePct}% (${coverage.filesAnalyzed} de ${coverage.totalFiles} archivos analizados).`;

    const methodology = {
        formula: 'Score = max(0, 100 - Σ(Crítico×25 + Alto×12 + Medio×5 + Bajo×2))',
        criticalCapRule: 'Si existen vulnerabilidades Críticas (≥1), la puntuación máxima se limita a 49/100 (Riesgo elevado).',
        scale: OFFICIAL_SCORE_SCALE,
        scopeLimitations: [
            `Análisis estático de código fuente (SAST), escaneo de secretos y auditoría de manifiestos sobre ${coverage.filesAnalyzed} de ${coverage.totalFiles} archivos (${coverage.coveragePct}% de cobertura).`,
            'No sustituye pruebas dinámicas de penetración en tiempo de ejecución (DAST), fuzzing interactivo ni auditoría de infraestructura cloud en vivo.',
            'Una puntuación alta refleja la ausencia de patrones vulnerables en los archivos examinados, pero NO garantiza que el repositorio esté libre de vulnerabilidades ni constituye certificación formal.'
        ]
    };

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
        explanation: formulaExplanation,
        methodology,
        scale: OFFICIAL_SCORE_SCALE
    };
}

module.exports = {
    SECURITY_DIMENSIONS,
    SEVERITY_WEIGHTS,
    OFFICIAL_SCORE_SCALE,
    calculateSecurityScore,
    mapToDimension,
    getClassification,
    calculateCoverage
};
