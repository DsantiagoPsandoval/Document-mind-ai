/**
 * DOCUMIND AI — SECURITY REPORT GENERATOR
 * Produces comprehensive, professional technical security reports in Markdown and structured JSON.
 * Includes all 13 formal sections:
 *  1. Portada
 *  2. Resumen ejecutivo
 *  3. Puntuación general
 *  4. Metodología
 *  5. Alcance del análisis
 *  6. Archivos examinados
 *  7. Hallazgos
 *  8. Clasificación de riesgos
 *  9. Evidencias
 *  10. Análisis STRIDE
 *  11. Recomendaciones
 *  12. Plan de remediación
 *  13. Conclusiones
 */

function generateSecurityMarkdownReport(securityAudit, projectName = 'Proyecto') {
    const {
        score = 85,
        grade = 'A',
        classification = 'Seguridad aceptable',
        riskLevel = 'Moderado-Bajo',
        counts = {},
        dimensions = {},
        coverage = {},
        remediationPlan = {},
        findings = [],
        secrets = [],
        threatModel = {},
        securityRequirements = [],
        dependencyFindings = [],
        topAffectedFiles = [],
        veracityBreakdown = {},
        examinedFiles = [],
        comparison = null
    } = securityAudit || {};

    const dateStr = new Date().toISOString().split('T')[0];

    let md = `# Informe Técnico de Seguridad — DocuMind Security Intelligence\n\n`;

    // 1. Portada
    md += `## 1. Portada e Identificación de la Auditoría\n\n`;
    md += `| Metadato de Auditoría | Valor Verificado |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Proyecto Evaluado** | **${projectName}** |\n`;
    md += `| **Módulo Auditor** | DocuMind AI — Security Intelligence (SAST, Secret Scanner, SCA & STRIDE) |\n`;
    md += `| **Fecha del Análisis** | ${dateStr} |\n`;
    md += `| **Puntuación General** | **${score} / 100** (${classification}) |\n`;
    md += `| **Nivel de Riesgo Global** | **${riskLevel}** (Grado ${grade}) |\n`;
    md += `| **Estándares de Referencia** | OWASP Top 10:2021, OWASP ASVS 4.0, CWE, CVSS 4.0 (Ref.), ISO/IEC 27001:2022, ISO/IEC 27002:2022 |\n\n`;

    // 2. Resumen Ejecutivo
    md += `## 2. Resumen Ejecutivo\n\n`;
    md += `El presente informe documenta el diagnóstico técnico y cuantificable de ciberseguridad realizado sobre el repositorio **${projectName}**. El análisis se fundamenta estrictamente en la inspección estática del código fuente y los archivos de configuración efectivamente procesados.\n\n`;
    md += `- **Puntuación de Seguridad**: **${score}/100 — ${classification}** (Nivel de riesgo: **${riskLevel}**)\n`;
    md += `- **Archivos Analizados**: **${coverage.filesAnalyzed || examinedFiles.length || 0}** de **${coverage.totalFiles || examinedFiles.length || 1}** (${coverage.coveragePct || 100}% de cobertura)\n`;
    md += `- **Total de Hallazgos Identificados**: **${counts.total || findings.length || 0}** (Críticos: ${counts.critical || 0}, Altos: ${counts.high || 0}, Medios: ${counts.medium || 0}, Bajos: ${counts.low || 0}, Informativos: ${counts.info || 0})\n`;
    md += `- **Hallazgos Pendientes de Verificar**: **${counts.pendingVerification || 0}**\n`;
    if (comparison && comparison.hasPrevious) {
        md += `- **Evolución respecto a Auditoría Anterior**: **${comparison.summary}**\n`;
    }
    md += `\n`;

    // 3. Puntuación General y Escala Oficial
    md += `## 3. Puntuación General de Seguridad y Escala Técnica\n\n`;
    md += `${securityAudit.explanation || ''}\n\n`;
    md += `| Rango de Puntuación | Nivel de Seguridad | Estado del Proyecto |\n`;
    md += `| :---: | :--- | :---: |\n`;
    md += `| **90 – 100** | Seguridad alta | ${score >= 90 ? '◀ **ACTUAL**' : ''} |\n`;
    md += `| **75 – 89** | Seguridad aceptable | ${score >= 75 && score < 90 ? '◀ **ACTUAL**' : ''} |\n`;
    md += `| **50 – 74** | Requiere mejoras | ${score >= 50 && score < 75 ? '◀ **ACTUAL**' : ''} |\n`;
    md += `| **25 – 49** | Riesgo elevado | ${score >= 25 && score < 50 ? '◀ **ACTUAL**' : ''} |\n`;
    md += `| **0 – 24** | Riesgo crítico | ${score < 25 ? '◀ **ACTUAL**' : ''} |\n\n`;

    // 4. Metodología
    md += `## 4. Metodología de Evaluación e Integridad Técnica\n\n`;
    md += `La evaluación utiliza un modelo matemático determinista sobre 12 dimensiones arquitectónicas ponderadas (100% total), combinando:\n`;
    md += `1. **Escaneo de Secretos y Credenciales (Secret Scanner)**: Detección y redacción parcial de claves API, tokens y cadenas de conexión.\n`;
    md += `2. **Análisis Estático de Código (SAST)**: Evaluación de sumideros peligrosos (SQLi, XSS, CSRF, SSRF, RCE, Path Traversal, JWT, sesiones, cabeceras HTTP).\n`;
    md += `3. **Auditoría de Dependencias (SCA)**: Inspección de manifiestos (\`package.json\`, \`requirements.txt\`) frente a paquetes comprometidos y rangos flotantes.\n`;
    md += `4. **Modelado de Amenazas STRIDE**: Correlación con los componentes reales detectados en el repositorio.\n\n`;
    md += `> **Declaración de Integridad y Veracidad**: Esta auditoría corresponde a un análisis estático sobre los archivos examinados. No sustituye pruebas de penetración dinámicas en ejecución (DAST) ni constituye una certificación formal de cumplimiento ISO/IEC 27001. Una puntuación alta refleja la ausencia de hallazgos en la muestra evaluada, pero no garantiza que el repositorio esté libre de vulnerabilidades.\n\n`;

    // 5. Alcance del Análisis y Clasificación de Veracidad
    md += `## 5. Alcance del Análisis y Distinción de Evidencias\n\n`;
    md += `- **Cobertura Efectiva**: ${coverage.coveragePct || 100}% (${coverage.filesAnalyzed || 0} archivos analizados sobre ${coverage.totalFiles || 0} totales).\n`;
    md += `- **Vulnerabilidades Confirmadas**: ${(veracityBreakdown.confirmed || []).length}\n`;
    md += `- **Hallazgos Potenciales**: ${(veracityBreakdown.potential || []).length}\n`;
    md += `- **Riesgos Inferidos**: ${(veracityBreakdown.inferred || []).length}\n`;
    md += `- **Pruebas No Ejecutadas (Dinámicas / Runtime)**: ${(veracityBreakdown.unexecutedTests || []).length}\n`;
    md += `- **Elementos No Evaluables Estáticamente**: ${(veracityBreakdown.nonEvaluable || []).length}\n\n`;

    // 6. Archivos Examinados y Archivos con Más Hallazgos
    md += `## 6. Archivos Examinados y Concentración de Hallazgos\n\n`;
    if (topAffectedFiles.length > 0) {
        md += `### 6.1 Archivos con Mayor Concentración de Hallazgos\n\n`;
        md += `| Archivo Afectado | Total Hallazgos | Críticos | Altos | Medios | Bajos |\n`;
        md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;
        topAffectedFiles.forEach(tf => {
            md += `| \`${tf.file}\` | **${tf.total}** | ${tf.critical || 0} | ${tf.high || 0} | ${tf.medium || 0} | ${tf.low || 0} |\n`;
        });
        md += `\n`;
    }
    if (examinedFiles.length > 0) {
        md += `### 6.2 Muestra de Archivos Examinados (${examinedFiles.length})\n\n`;
        md += examinedFiles.slice(0, 30).map(f => `- \`${typeof f === 'string' ? f : f.path}\``).join('\n') + `\n\n`;
    }

    // 7. Hallazgos Detallados
    md += `## 7. Catálogo Técnico de Hallazgos\n\n`;
    if (findings.length === 0) {
        md += `✔ **No se identificaron vulnerabilidades confirmadas ni potenciales en los archivos examinados.**\n\n`;
    } else {
        findings.forEach(f => {
            md += `### [${f.severityLabel || f.severity}] ${f.name} (\`${f.id}\`)\n\n`;
            md += `- **Severidad**: **${f.severityLabel || f.severity}** (${f.severity}) | **Probabilidad Estimada**: ${f.likelihood || 'Media'}\n`;
            md += `- **Clasificación de Veracidad**: \`${f.veracityType || 'Vulnerabilidad confirmada'}\` | **Estado**: \`${f.findingStatus || 'Pendiente'}\`\n`;
            md += `- **Archivo Afectado**: \`${f.file}\` (Línea ${f.line || 1})\n`;
            md += `- **Estándares Asociados**: ${f.owaspCategory || 'OWASP'} | ${f.owaspAsvs || 'ASVS 4.0'} | ${f.cwe || 'CWE'} | ${f.iso27001 || 'ISO/IEC 27001:2022'}\n`;
            if (f.cvss4Reference) md += `- **Referencia CVSS 4.0**: \`${f.cvss4Reference}\`\n`;
            md += `- **Descripción Técnica**: ${f.description || f.explanation}\n`;
            md += `- **Posible Impacto**: ${f.impact}\n`;
            md += `- **Evidencia Encontrada (Sanitizada)**: \`${f.evidence || f.snippet || 'N/A'}\`\n`;
            md += `- **Recomendación de Solución**: ${f.recommendation}\n\n`;
        });
    }

    // 8. Clasificación de Riesgos por Dimensión
    md += `## 8. Clasificación de Riesgos por Dimensión Arquitectónica\n\n`;
    md += `| Dimensión de Seguridad | Peso | Puntuación | Hallazgos | Nivel |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: |\n`;
    Object.values(dimensions || {}).forEach(dim => {
        md += `| **${dim.name}** | ${dim.weightPct}% | **${dim.score}/100** | ${dim.findingsCount} | ${dim.status} |\n`;
    });
    md += `\n`;

    // 9. Evidencias y Auditoría de Secretos
    md += `## 9. Registro de Evidencias y Secretos Enmascarados\n\n`;
    if (secrets.length === 0) {
        md += `✔ **0 secretos o claves API expuestas en texto plano en los archivos inspeccionados.**\n\n`;
    } else {
        md += `| ID | Tipo de Credencial | Archivo : Línea | Evidencia Enmascarada | Severidad |\n`;
        md += `| :--- | :--- | :--- | :--- | :---: |\n`;
        secrets.forEach(s => {
            md += `| \`${s.id}\` | ${s.type} | \`${s.file}:${s.line}\` | \`${s.maskedSecret}\` | **${s.severityLabel || s.severity}** |\n`;
        });
        md += `\n`;
    }

    // 10. Análisis STRIDE
    md += `## 10. Análisis de Amenazas Bajo el Modelo STRIDE\n\n`;
    md += `${threatModel.summary || ''}\n\n`;
    md += `| ID | Amenaza STRIDE | Componente Real del Repositorio | Descripción e Impacto | Probabilidad | Mitigación Técnica |\n`;
    md += `| :--- | :--- | :--- | :--- | :---: | :--- |\n`;
    (threatModel.threats || []).forEach(t => {
        md += `| \`${t.id}\` | **${t.category}** | ${t.component} | ${t.scenario} (*Impacto: ${t.impact || 'Alto'}*) | ${t.likelihood || 'Media'} | ${t.recommendedControl} |\n`;
    });
    md += `\n`;

    // 11. Recomendaciones y Requisitos de Seguridad
    md += `## 11. Recomendaciones Normativas y Controles (OWASP / ISO 27002)\n\n`;
    md += `| Código | Prioridad | Categoría | Recomendación / Control Técnico | Estado |\n`;
    md += `| :--- | :---: | :--- | :--- | :---: |\n`;
    (securityRequirements || []).forEach(req => {
        md += `| \`${req.id}\` | **${req.priority}** | ${req.category} | ${req.description} | \`${req.status}\` |\n`;
    });
    md += `\n`;

    // 12. Plan de Mejoras y Remediación
    md += `## 12. Plan de Mejoras y Remediación Técnica (4 Niveles)\n\n`;
    const queues = remediationPlan.queues || {};
    const queueOrder = [
        { key: 'urgentes', label: '12.1 Acciones Urgentes (0 a 24 horas)' },
        { key: 'alta', label: '12.2 Mejoras de Alta Prioridad (1 a 3 días)' },
        { key: 'media', label: '12.3 Mejoras de Prioridad Media (1 a 2 semanas)' },
        { key: 'preventivas', label: '12.4 Recomendaciones Preventivas (Mejora Continua)' }
    ];

    if (remediationPlan.totalActions === 0) {
        md += `✔ **No existen acciones correctivas urgentes pendientes sobre los archivos analizados.** Se recomienda mantener revisiones continuas en cada Pull Request.\n\n`;
    } else {
        queueOrder.forEach(q => {
            const list = queues[q.key] || [];
            if (list.length > 0) {
                md += `### ${q.label}\n\n`;
                list.forEach(item => {
                    md += `#### ${item.id}: ${item.title}\n`;
                    md += `- **Qué está mal**: ${item.whatIsWrong}\n`;
                    md += `- **Por qué representa un riesgo**: ${item.whyItIsARisk}\n`;
                    md += `- **Cómo podría afectar al sistema**: ${item.systemImpact}\n`;
                    md += `- **Qué debe modificarse**: ${item.whatToModify}\n`;
                    md += `- **Prioridad**: ${item.priority} | **Esfuerzo estimado**: ${item.estimatedEffort}\n`;
                    md += `- **Resultado esperado**: ${item.expectedOutcome}\n\n`;
                    if (item.codeExample) {
                        md += `**Ejemplo de Solución Técnica**:\n\`\`\`javascript\n${item.codeExample.remediated}\n\`\`\`\n\n`;
                    }
                });
            }
        });
    }

    // 13. Conclusiones
    md += `## 13. Conclusiones y Dictamen de Auditoría\n\n`;
    md += `1. El repositorio **${projectName}** obtuvo una puntuación técnica determinista de **${score}/100**, situándose en la categoría **${classification}** (Riesgo **${riskLevel}**).\n`;
    md += `2. Se inspeccionaron **${coverage.filesAnalyzed || 0} archivos** con una cobertura del **${coverage.coveragePct || 100}%**, identificando **${counts.confirmed || 0} vulnerabilidades confirmadas** y **${counts.pendingVerification || 0} hallazgos potenciales o inferidos pendientes de verificación**.\n`;
    md += `3. Ninguna vulnerabilidad debe marcarse como solucionada sin ejecutar nuevamente la verificación sobre el código fuente modificado.\n`;

    return md;
}

function generateSecurityJsonReport(securityAudit, projectName = 'Proyecto') {
    return {
        metadata: {
            platform: 'DocuMind AI',
            module: 'Security Intelligence',
            version: '3.0.0',
            projectName,
            timestamp: securityAudit.timestamp || new Date().toISOString(),
            standards: [
                'OWASP Top 10:2021',
                'OWASP ASVS v4.0',
                'CWE',
                'CVSS v4.0 (Reference)',
                'ISO/IEC 27001:2022',
                'ISO/IEC 27002:2022',
                'Microsoft STRIDE'
            ],
            disclaimer: 'Análisis estático basado en evidencia de código y configuración examinada. No constituye certificación formal ni garantiza ausencia absoluta de vulnerabilidades en tiempo de ejecución.'
        },
        executiveSummary: {
            securityScore: securityAudit.score,
            classification: securityAudit.classification,
            grade: securityAudit.grade,
            riskLevel: securityAudit.riskLevel,
            totalFindings: securityAudit.counts ? securityAudit.counts.total : 0,
            pendingVerificationCount: securityAudit.counts ? securityAudit.counts.pendingVerification : 0,
            severityBreakdown: securityAudit.counts || {},
            coverage: securityAudit.coverage || {},
            explanation: securityAudit.explanation,
            methodology: securityAudit.methodology || {}
        },
        veracityBreakdown: securityAudit.veracityBreakdown || {},
        topAffectedFiles: securityAudit.topAffectedFiles || [],
        examinedFiles: securityAudit.examinedFiles || [],
        dimensions: securityAudit.dimensions || {},
        remediationPlan: securityAudit.remediationPlan || {},
        secretsDetected: (securityAudit.secrets || []).map(s => ({
            id: s.id,
            type: s.type,
            file: s.file,
            line: s.line,
            maskedSnippet: s.maskedSecret,
            severity: s.severity,
            severityLabel: s.severityLabel,
            veracityType: s.veracityType,
            findingStatus: s.findingStatus,
            standards: s.standards
        })),
        findings: (securityAudit.findings || []).map(f => ({
            id: f.id,
            ruleId: f.ruleId,
            name: f.name || f.title,
            dimensionId: f.dimensionId,
            category: f.category,
            severity: f.severity,
            severityLabel: f.severityLabel,
            file: f.file,
            line: f.line,
            evidence: f.evidence || f.snippet,
            description: f.description || f.explanation,
            impact: f.impact,
            likelihood: f.likelihood,
            recommendation: f.recommendation,
            veracityType: f.veracityType,
            findingStatus: f.findingStatus,
            verifiedFixed: Boolean(f.verifiedFixed),
            standards: f.standards || {
                owaspTop10: f.owaspCategory,
                owaspAsvs: f.owaspAsvs,
                cwe: f.cwe,
                cvss4: f.cvss4Reference,
                iso27001: f.iso27001,
                iso27002: f.iso27002
            }
        })),
        threatModel: securityAudit.threatModel || {},
        securityRequirements: securityAudit.securityRequirements || [],
        dependenciesAudit: securityAudit.dependencyFindings || [],
        comparison: securityAudit.comparison || null,
        auditHistory: securityAudit.auditHistory || []
    };
}

module.exports = {
    generateSecurityMarkdownReport,
    generateSecurityJsonReport
};
