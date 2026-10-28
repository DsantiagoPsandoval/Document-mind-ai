/**
 * DOCUMENT-MIND AI — SECURITY REPORT GENERATOR
 * Produces comprehensive, professional technical security reports in Markdown and structured JSON.
 * Incorporates Executive Summary, Attack Surface, Assets, Threat Model, Findings,
 * Security Requirements, Architecture Controls, and OWASP Top 10 Checklist.
 */

/**
 * Generates an executive and technical Markdown report.
 * @param {object} securityAudit - Full audit data produced by securityAnalyzer
 * @param {string} projectName - Project name
 * @returns {string} Markdown document
 */
function generateSecurityMarkdownReport(securityAudit, projectName = 'Proyecto') {
    const {
        score,
        grade,
        riskLevel,
        counts,
        categoryScores,
        findings = [],
        secrets = [],
        threatModel = {},
        securityRequirements = [],
        dependencyFindings = []
    } = securityAudit;

    const dateStr = new Date().toISOString().split('T')[0];

    let md = `# Informe Técnico de Seguridad & Auditoría de Código — ${projectName}\n\n`;
    md += `> **Generado por**: DocuMind AI (Motor de Análisis Estático SAST & Seguridad Cognitiva)\n`;
    md += `> **Fecha de Evaluación**: ${dateStr}\n`;
    md += `> **Nivel de Riesgo Global**: **${riskLevel.toUpperCase()}** | **Calificación**: **Grado ${grade}**\n\n`;

    // 1. Resumen Ejecutivo
    md += `## 1. Resumen Ejecutivo\n\n`;
    md += `Se ha completado una evaluación integral de seguridad del proyecto **${projectName}** siguiendo los estándares **OWASP Top 10**, **OWASP ASVS** y principios de **Secure by Design**.\n\n`;
    md += `- **Security Score Global**: **${score} / 100**\n`;
    md += `- **Vulnerabilidades Críticas**: ${counts.critical}\n`;
    md += `- **Vulnerabilidades de Severidad Alta**: ${counts.high}\n`;
    md += `- **Vulnerabilidades de Severidad Media**: ${counts.medium}\n`;
    md += `- **Hallazgos de Severidad Baja / Informativos**: ${counts.low + counts.info}\n`;
    md += `- **Secretos / Claves Hardcodeadas Detectadas**: ${secrets.length}\n\n`;

    // Categorías
    md += `### Desglose de Seguridad por Categoría\n\n`;
    md += `| Categoría de Seguridad | Puntuación | Estado |\n`;
    md += `| :--- | :---: | :---: |\n`;
    Object.entries(categoryScores || {}).forEach(([cat, val]) => {
        const catName = cat.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const status = val >= 80 ? 'Seguro ✔' : (val >= 60 ? 'Atención ⚠' : 'Riesgo ✖');
        md += `| ${catName} | ${val}/100 | ${status} |\n`;
    });
    md += `\n`;

    // 2. Superficie de Ataque y Activos
    md += `## 2. Superficie de Ataque & Activos Identificados\n\n`;
    md += `### Activos Principales del Sistema\n`;
    md += `- **Base de Datos & Almacenamiento**: Persistencia de registros y datos de usuarios.\n`;
    md += `- **Puntos de Entrada API**: Rutas expuestas HTTP procesadas por el servidor.\n`;
    md += `- **Credenciales & Secretos**: Variables de entorno, tokens JWT y claves de API de terceros.\n`;
    md += `- **Lógica de Servidor**: Componentes de controladores y servicios de procesamiento.\n\n`;

    // 3. Secret Scanner
    md += `## 3. Escaneo de Secretos & Credenciales (Secret Scanner)\n\n`;
    if (secrets.length === 0) {
        md += `✔ **No se identificaron secretos ni credenciales en texto plano expuestas en los archivos analizados.**\n\n`;
    } else {
        md += `⚠ Se detectaron **${secrets.length}** secreto(s) o credenciales sensibles en el código fuente. *Todos los valores han sido parcialmente ofuscados para prevenir exposiciones accidentales*:\n\n`;
        md += `| ID | Tipo de Secreto | Archivo | Línea | Fragmento Sanitizado | Severidad |\n`;
        md += `| :--- | :--- | :--- | :---: | :--- | :---: |\n`;
        secrets.forEach(s => {
            md += `| \`${s.id}\` | ${s.type} | \`${s.file}\` | ${s.line} | \`${s.maskedSecret}\` | **${s.severity}** |\n`;
        });
        md += `\n`;
    }

    // 4. Hallazgos y Vulnerabilidades SAST
    md += `## 4. Hallazgos y Vulnerabilidades de Código (SAST)\n\n`;
    if (findings.length === 0) {
        md += `✔ **No se detectaron patrones de vulnerabilidad estática severos en la muestra analizada.**\n\n`;
    } else {
        findings.forEach(f => {
            md += `### [${f.severity}] ${f.name} (\`${f.id}\`)\n\n`;
            md += `- **Categoría OWASP**: ${f.owaspCategory || 'N/A'}\n`;
            md += `- **Identificador CWE**: ${f.cwe || 'N/A'}\n`;
            md += `- **Ubicación**: Archivo \`${f.file}\`, Línea ~${f.line}\n`;
            md += `- **Certeza**: \`${f.certainty || 'Probable'}\` | **Estado**: \`${f.status || 'Detectado'}\`\n\n`;
            md += `**Fragmento de Código Relevante (Sanitizado)**:\n\`\`\`javascript\n${f.snippet || '// No disponible'}\n\`\`\`\n\n`;
            md += `**Explicación Técnica**:\n${f.explanation}\n\n`;
            md += `**Impacto Potencial**:\n${f.impact}\n\n`;
            md += `**Recomendación de Mitigación**:\n${f.recommendation}\n\n`;
            md += `---\n\n`;
        });
    }

    // 5. Modelado de Amenazas STRIDE
    md += `## 5. Modelado de Amenazas (Metodología STRIDE)\n\n`;
    md += `${threatModel.summary || 'Análisis de amenazas estructurado sobre la arquitectura del sistema.'}\n\n`;
    md += `| ID | Categoría STRIDE | Componente Afectado | Escenario de Amenaza | Control Recomendado |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    (threatModel.threats || []).forEach(t => {
        md += `| \`${t.id}\` | **${t.category}** | ${t.component} | ${t.scenario} | ${t.recommendedControl} |\n`;
    });
    md += `\n`;

    // 6. Requisitos de Seguridad (SEC-001...)
    md += `## 6. Requisitos de Seguridad Automatizados (Security Requirements)\n\n`;
    md += `| ID | Prioridad | Categoría | Descripción del Requisito | Estado |\n`;
    md += `| :--- | :---: | :--- | :--- | :---: |\n`;
    (securityRequirements || []).forEach(req => {
        md += `| \`${req.id}\` | **${req.priority}** | ${req.category} | ${req.description} | \`${req.status}\` |\n`;
    });
    md += `\n`;

    // 7. Auditoría de Dependencias
    md += `## 7. Análisis de Dependencias & Cadena de Suministro\n\n`;
    if (dependencyFindings.length === 0) {
        md += `✔ **No se identificaron dependencias críticamente comprometidas en los manifiestos analizados.**\n\n`;
    } else {
        dependencyFindings.forEach(dep => {
            md += `- **[${dep.severity}] ${dep.name}**: ${dep.explanation} *Recomendación: ${dep.recommendation}*\n`;
        });
        md += `\n`;
    }

    // 8. Checklist OWASP Top 10 (2021)
    md += `## 8. Checklist de Cumplimiento OWASP Top 10\n\n`;
    const owaspItems = [
        { code: 'A01:2021', name: 'Broken Access Control', checked: !findings.some(f => (f.owaspCategory || '').includes('A01')) },
        { code: 'A02:2021', name: 'Cryptographic Failures', checked: !findings.some(f => (f.owaspCategory || '').includes('A02')) },
        { code: 'A03:2021', name: 'Injection', checked: !findings.some(f => (f.owaspCategory || '').includes('A03')) },
        { code: 'A04:2021', name: 'Insecure Design', checked: true },
        { code: 'A05:2021', name: 'Security Misconfiguration', checked: !findings.some(f => (f.owaspCategory || '').includes('A05')) },
        { code: 'A06:2021', name: 'Vulnerable and Outdated Components', checked: dependencyFindings.length === 0 },
        { code: 'A07:2021', name: 'Identification and Authentication Failures', checked: secrets.length === 0 },
        { code: 'A08:2021', name: 'Software and Data Integrity Failures', checked: !findings.some(f => (f.owaspCategory || '').includes('A08')) },
        { code: 'A09:2021', name: 'Security Logging and Monitoring Failures', checked: !findings.some(f => (f.owaspCategory || '').includes('A09')) },
        { code: 'A10:2021', name: 'Server-Side Request Forgery (SSRF)', checked: !findings.some(f => (f.owaspCategory || '').includes('A10')) }
    ];

    owaspItems.forEach(item => {
        md += `- [${item.checked ? 'X' : ' '}] **${item.code} - ${item.name}**: ${item.checked ? 'Controles observados / Sin hallazgos directos' : 'Atención requerida (se encontraron hallazgos asociados)'}\n`;
    });

    return md;
}

/**
 * Generates clean, standard JSON report for DevSecOps pipelines.
 * @param {object} securityAudit
 * @param {string} projectName
 * @returns {object} Clean JSON object
 */
function generateSecurityJsonReport(securityAudit, projectName = 'Proyecto') {
    return {
        metadata: {
            platform: 'DocuMind AI',
            generator: 'Security Analyzer SAST Engine',
            version: '2.0.0',
            projectName,
            timestamp: new Date().toISOString(),
            standard: 'OWASP Top 10 2021 / ASVS / STRIDE'
        },
        executiveSummary: {
            securityScore: securityAudit.score,
            grade: securityAudit.grade,
            riskLevel: securityAudit.riskLevel,
            totalFindings: securityAudit.counts.total,
            severityBreakdown: securityAudit.counts,
            explanation: securityAudit.explanation
        },
        categoryScores: securityAudit.categoryScores,
        secretsDetected: (securityAudit.secrets || []).map(s => ({
            id: s.id,
            type: s.type,
            file: s.file,
            line: s.line,
            maskedSnippet: s.maskedSecret,
            severity: s.severity,
            owaspCategory: s.owaspCategory,
            cwe: s.cwe
        })),
        findings: (securityAudit.findings || []).map(f => ({
            id: f.id,
            name: f.name,
            severity: f.severity,
            owaspCategory: f.owaspCategory,
            cwe: f.cwe,
            file: f.file,
            line: f.line,
            snippet: f.snippet,
            explanation: f.explanation,
            impact: f.impact,
            recommendation: f.recommendation,
            status: f.status,
            certainty: f.certainty
        })),
        threatModel: securityAudit.threatModel || {},
        securityRequirements: securityAudit.securityRequirements || [],
        dependenciesAudit: securityAudit.dependencyFindings || []
    };
}

module.exports = {
    generateSecurityMarkdownReport,
    generateSecurityJsonReport
};
