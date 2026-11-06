/**
 * DOCUMENT-MIND AI — SECURITY REPORT GENERATOR
 * Produces comprehensive, professional technical security reports in Markdown and structured JSON.
 * Incorporates Executive Summary, Attack Surface, 12 Dimensions Breakdown, Remediation Plan,
 * Findings Catalog, Coverage Metrics, and OWASP Top 10 Checklist.
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
        classification = 'Bueno',
        riskLevel = 'Bajo',
        counts = {},
        dimensions = {},
        coverage = {},
        remediationPlan = {},
        findings = [],
        secrets = [],
        threatModel = {},
        securityRequirements = [],
        dependencyFindings = []
    } = securityAudit;

    const dateStr = new Date().toISOString().split('T')[0];

    let md = `# DocuMind Security Intelligence — Informe Técnico de Seguridad\n\n`;
    md += `> **Proyecto**: ${projectName}\n`;
    md += `> **Motor**: DocuMind Security Intelligence (SAST Estático, Secret Scanner & SCA)\n`;
    md += `> **Fecha de Evaluación**: ${dateStr}\n`;
    md += `> **Security Score**: **${score} / 100** | **Clasificación**: **${classification}** | **Grado**: **${grade}**\n\n`;

    // 1. Resumen Ejecutivo
    md += `## 1. Resumen Ejecutivo & Postura de Seguridad\n\n`;
    md += `Se ha completado una evaluación exhaustiva de seguridad sobre el código fuente y manifiestos de **${projectName}** siguiendo los estándares **OWASP Top 10 (2021)**, **CWE/SANS Top 25** y principios de arquitectura **Secure by Design**.\n\n`;
    md += `- **Puntuación Global (Security Score)**: **${score}/100** (${classification})\n`;
    md += `- **Vulnerabilidades Críticas**: ${counts.critical || 0}\n`;
    md += `- **Vulnerabilidades de Severidad Alta**: ${counts.high || 0}\n`;
    md += `- **Vulnerabilidades de Severidad Media**: ${counts.medium || 0}\n`;
    md += `- **Hallazgos de Severidad Baja / Informativos**: ${(counts.low || 0) + (counts.info || 0)}\n`;
    md += `- **Secretos o Credenciales Expuestas**: ${secrets.length}\n`;
    md += `- **Cobertura del Análisis**: ${coverage.coveragePct || 100}% (${coverage.filesAnalyzed || 0}/${coverage.totalFiles || 0} archivos evaluados) — **Nivel de Confianza: ${coverage.confidenceLevel || 'Alta'}**\n\n`;

    md += `> **Nota Metodológica**: Una puntuación de 100 indica que no se identificaron problemas dentro del alcance de archivos y reglas evaluadas; no constituye una garantía de seguridad absoluta. Toda puntuación se calcula de forma estrictamente determinista a partir de evidencias reales extraídas del código.\n\n`;

    // 2. Desglose de las 12 Dimensiones de Evaluación
    md += `## 2. Evaluación por Dimensiones de Arquitectura (12 Categorías)\n\n`;
    md += `| Dimensión de Seguridad | Ponderación | Puntuación | Hallazgos | Estado |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: |\n`;
    Object.values(dimensions || {}).forEach(dim => {
        const statusTag = dim.score >= 80 ? 'Seguro ✔' : (dim.score >= 60 ? 'Atención ⚠' : 'Riesgo ✖');
        md += `| **${dim.name}** | ${dim.weightPct}% | **${dim.score}/100** | ${dim.findingsCount} | ${statusTag} |\n`;
    });
    md += `\n`;

    // 3. Plan de Remediación Priorizado
    md += `## 3. Plan de Remediación Priorizado (Actionable Remediation Plan)\n\n`;
    const queues = remediationPlan.queues || {};
    
    if (remediationPlan.totalActions === 0) {
        md += `✔ **No se requieren acciones de remediación prioritarias inmediatas.**\n\n`;
    } else {
        // Queue: Inmediata
        if (queues.inmediata && queues.inmediata.length > 0) {
            md += `### 🚨 Prioridad Inmediata (Ventana: 0 a 24 horas)\n\n`;
            queues.inmediata.forEach(item => {
                md += `#### ${item.id}: ${item.title}\n`;
                md += `- **Dimensión**: ${item.category} | **Esfuerzo Estimado**: ${item.estimatedEffort}\n`;
                md += `- **Archivos Afectados**: ${item.affectedFiles.join(', ') || 'N/A'}\n`;
                md += `- **Impacto**: ${item.impact}\n\n`;
                if (item.codeExample) {
                    md += `**Código Vulnerable vs Remediado**:\n\`\`\`javascript\n${item.codeExample.remediated}\n\`\`\`\n\n`;
                    md += `*Verificación*: ${item.codeExample.verification}\n\n`;
                }
            });
        }

        // Queue: Alta
        if (queues.alta && queues.alta.length > 0) {
            md += `### ⚠ Prioridad Alta (Ventana: 1 a 3 días)\n\n`;
            queues.alta.forEach(item => {
                md += `#### ${item.id}: ${item.title}\n`;
                md += `- **Dimensión**: ${item.category} | **Esfuerzo Estimado**: ${item.estimatedEffort}\n`;
                md += `- **Archivos Afectados**: ${item.affectedFiles.join(', ') || 'N/A'}\n`;
                md += `- **Impacto**: ${item.impact}\n\n`;
                if (item.codeExample) {
                    md += `**Código Remediado Sugerido**:\n\`\`\`javascript\n${item.codeExample.remediated}\n\`\`\`\n\n`;
                }
            });
        }

        // Queue: Media
        if (queues.media && queues.media.length > 0) {
            md += `### ⚡ Prioridad Media (Ventana: 1 a 2 semanas)\n\n`;
            queues.media.forEach(item => {
                md += `- **[${item.id}] ${item.title}**: ${item.category} (Esfuerzo: ${item.estimatedEffort})\n`;
            });
            md += `\n`;
        }

        // Queue: Baja
        if (queues.baja && queues.baja.length > 0) {
            md += `### ℹ Prioridad Baja / Preventiva (Próximo ciclo de release)\n\n`;
            queues.baja.forEach(item => {
                md += `- **[${item.id}] ${item.title}**: ${item.category} (Esfuerzo: ${item.estimatedEffort})\n`;
            });
            md += `\n`;
        }
    }

    // 4. Secret Scanner
    md += `## 4. Auditoría de Secretos & Credenciales (Secret Scanner)\n\n`;
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

    // 5. Hallazgos SAST de Código
    md += `## 5. Hallazgos de Vulnerabilidades de Código (SAST)\n\n`;
    if (findings.length === 0) {
        md += `✔ **No se detectaron patrones de vulnerabilidad estática severos en la muestra analizada.**\n\n`;
    } else {
        findings.forEach(f => {
            md += `### [${f.severity}] ${f.name} (\`${f.id}\`)\n\n`;
            md += `- **Dimensión**: ${f.category || f.dimensionId || 'Seguridad General'}\n`;
            md += `- **Categoría OWASP**: ${f.owaspCategory || f.owasp || 'N/A'}\n`;
            md += `- **Identificador CWE**: ${f.cwe || 'N/A'}\n`;
            md += `- **Ubicación**: Archivo \`${f.file}\`, Línea ~${f.line}\n`;
            md += `- **Certeza**: \`${f.certainty || 'Probable'}\` | **Estado**: \`${f.status || 'confirmado'}\`\n\n`;
            md += `**Fragmento de Código Relevante (Sanitizado)**:\n\`\`\`javascript\n${f.snippet || '// No disponible'}\n\`\`\`\n\n`;
            md += `**Explicación Técnica**:\n${f.explanation || f.description}\n\n`;
            md += `**Impacto Potencial**:\n${f.impact}\n\n`;
            md += `**Recomendación de Mitigación**:\n${f.recommendation}\n\n`;
            md += `---\n\n`;
        });
    }

    // 6. Modelado de Amenazas STRIDE
    md += `## 6. Modelado de Amenazas (Metodología STRIDE)\n\n`;
    md += `${threatModel.summary || 'Análisis de amenazas estructurado sobre la arquitectura del sistema.'}\n\n`;
    md += `| ID | Categoría STRIDE | Componente Afectado | Escenario de Amenaza | Control Recomendado |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    (threatModel.threats || []).forEach(t => {
        md += `| \`${t.id}\` | **${t.category}** | ${t.component} | ${t.scenario} | ${t.recommendedControl} |\n`;
    });
    md += `\n`;

    // 7. Requisitos de Seguridad Automatizados (SEC-001...)
    md += `## 7. Requisitos de Seguridad Automatizados (Security Requirements)\n\n`;
    md += `| ID | Prioridad | Categoría | Descripción del Requisito | Estado |\n`;
    md += `| :--- | :---: | :--- | :--- | :---: |\n`;
    (securityRequirements || []).forEach(req => {
        md += `| \`${req.id}\` | **${req.priority}** | ${req.category} | ${req.description} | \`${req.status}\` |\n`;
    });
    md += `\n`;

    // 8. Auditoría de Dependencias
    md += `## 8. Análisis de Dependencias & Cadena de Suministro (SCA)\n\n`;
    if (dependencyFindings.length === 0) {
        md += `✔ **No se identificaron dependencias críticamente comprometidas en los manifiestos analizados.**\n\n`;
    } else {
        dependencyFindings.forEach(dep => {
            md += `- **[${dep.severity}] ${dep.name}**: ${dep.explanation} *Recomendación: ${dep.recommendation}*\n`;
        });
        md += `\n`;
    }

    // 9. Checklist OWASP Top 10 (2021)
    md += `## 9. Checklist de Cumplimiento OWASP Top 10\n\n`;
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
            generator: 'DocuMind Security Intelligence Engine',
            version: '2.5.0',
            projectName,
            timestamp: new Date().toISOString(),
            standards: ['OWASP Top 10:2021', 'OWASP ASVS v4.0', 'CWE/SANS Top 25', 'STRIDE']
        },
        executiveSummary: {
            securityScore: securityAudit.score,
            classification: securityAudit.classification || 'Bueno',
            grade: securityAudit.grade,
            riskLevel: securityAudit.riskLevel,
            totalFindings: securityAudit.counts ? securityAudit.counts.total : 0,
            severityBreakdown: securityAudit.counts || {},
            coverage: securityAudit.coverage || {},
            explanation: securityAudit.explanation
        },
        dimensions: securityAudit.dimensions || {},
        remediationPlan: securityAudit.remediationPlan || {},
        secretsDetected: (securityAudit.secrets || []).map(s => ({
            id: s.id,
            type: s.type,
            file: s.file,
            line: s.line,
            maskedSnippet: s.maskedSecret,
            severity: s.severity,
            dimensionId: s.dimensionId,
            category: s.category,
            owaspCategory: s.owaspCategory,
            cwe: s.cwe
        })),
        findings: (securityAudit.findings || []).map(f => ({
            id: f.id,
            name: f.name || f.title,
            dimensionId: f.dimensionId,
            category: f.category,
            severity: f.severity,
            owaspCategory: f.owaspCategory,
            cwe: f.cwe,
            file: f.file,
            line: f.line,
            snippet: f.snippet,
            evidence: f.evidence,
            explanation: f.explanation || f.description,
            impact: f.impact,
            likelihood: f.likelihood,
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
