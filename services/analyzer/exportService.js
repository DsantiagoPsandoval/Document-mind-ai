/**
 * DOCUMENT-MIND AI — EXPORT SERVICE
 * Packages complete technical documentation suites into organized ZIP archives.
 */

const archiver = require('archiver');
const { Readable } = require('stream');

function getZipArchive(options = { zlib: { level: 9 } }) {
    if (typeof archiver === 'function') {
        return archiver('zip', options);
    }
    if (archiver && archiver.ZipArchive) {
        return new archiver.ZipArchive(options);
    }
    if (archiver && typeof archiver.create === 'function') {
        return archiver.create('zip', options);
    }
    throw new Error('No compatible archiver engine found');
}

/**
 * Creates a ZIP archive containing all generated documentation and diagrams.
 * @param {object} analysis - Complete project analysis with doc suites
 * @returns {archiver.Archiver} Active archiver stream
 */
function createDocumentationZip(analysis) {
    const archive = getZipArchive({
        zlib: { level: 9 }
    });

    const doc = analysis.documentation || {};
    const rootFolder = 'documentacion';

    // 1. Root documents
    if (doc.development && doc.development.readme) {
        archive.append(doc.development.readme, { name: `${rootFolder}/README.md` });
    }
    if (doc.development && doc.development.contributing) {
        archive.append(doc.development.contributing, { name: `${rootFolder}/CONTRIBUTING.md` });
    }
    if (doc.product && doc.product.prd) {
        archive.append(doc.product.prd, { name: `${rootFolder}/PRD.md` });
    }
    if (doc.product && doc.product.srs) {
        archive.append(doc.product.srs, { name: `${rootFolder}/SRS.md` });
    }

    // Architecture
    let archContent = `# Arquitectura de Software — ${analysis.projectName || 'Proyecto'}\n\n`;
    if (doc.architecture) {
        archContent += `## Visión General\n${doc.architecture.overview || ''}\n\n`;
        archContent += `## Modelo C4: Contexto\n${doc.architecture.c4Context || ''}\n\n`;
        archContent += `## Modelo C4: Contenedores\n${doc.architecture.c4Container || ''}\n\n`;
        archContent += `## Modelo C4: Componentes\n${doc.architecture.c4Component || ''}\n`;
    }
    archive.append(archContent, { name: `${rootFolder}/ARCHITECTURE.md` });

    // 2. API folder
    if (doc.api) {
        let apiMd = `# Documentación de API — ${analysis.projectName || 'Proyecto'}\n\n`;
        apiMd += `${doc.api.overview || ''}\n\n`;
        apiMd += `## Endpoints Registrados\n\n`;
        (doc.api.endpoints || []).forEach(e => {
            apiMd += `### \`${e.method} ${e.path}\`\n`;
            apiMd += `- **Propósito**: ${e.description || 'Operación de API'}\n`;
            apiMd += `- **Requiere Autenticación**: ${e.requiresAuth ? 'Sí' : 'No'}\n`;
            apiMd += `- **Parámetros**: ${e.params || 'N/A'}\n`;
            apiMd += `- **Respuesta**: ${e.response || '200 OK'}\n\n`;
        });
        archive.append(apiMd, { name: `${rootFolder}/API/API.md` });

        if (doc.api.openApiJson) {
            const specStr = typeof doc.api.openApiJson === 'string'
                ? doc.api.openApiJson
                : JSON.stringify(doc.api.openApiJson, null, 2);
            archive.append(specStr, { name: `${rootFolder}/API/openapi.json` });
        }
    }

    // 3. Database folder
    if (doc.database) {
        let dbMd = `# Documentación de Base de Datos — ${analysis.projectName || 'Proyecto'}\n\n`;
        dbMd += `${doc.database.overview || ''}\n\n`;
        archive.append(dbMd, { name: `${rootFolder}/DATABASE/DATABASE.md` });

        // Data dictionary table
        let dictMd = `# Diccionario de Datos — ${analysis.projectName || 'Proyecto'}\n\n`;
        dictMd += `| Tabla | Campo | Tipo | Descripción | Obligatorio | Clave |\n`;
        dictMd += `| :--- | :--- | :--- | :--- | :---: | :---: |\n`;
        const dictRows = Array.isArray(doc.database.dataDictionary) ? doc.database.dataDictionary : [];
        dictRows.forEach(row => {
            dictMd += `| ${row.table} | ${row.field} | ${row.type} | ${row.description} | ${row.required ? 'Sí' : 'No'} | ${row.isPk ? 'PK' : '-'} |\n`;
        });
        archive.append(dictMd, { name: `${rootFolder}/DATABASE/DATA-DICTIONARY.md` });
    }

    // 4. DevOps folder
    if (doc.devops) {
        let devopsMd = `# Guía DevOps & Despliegue — ${analysis.projectName || 'Proyecto'}\n\n`;
        devopsMd += `## Pipeline CI/CD\n${doc.devops.ciCdPipeline || 'No detectado'}\n\n`;
        devopsMd += `## Contenedorización\n${doc.devops.containerization || 'No detectada'}\n\n`;
        devopsMd += `## Guía de Despliegue\n${doc.devops.deploymentGuide || ''}\n`;
        archive.append(devopsMd, { name: `${rootFolder}/DEVOPS/DEPLOYMENT.md` });
    }

    // 5. QA folder
    if (doc.qa) {
        let qaMd = `# Plan de Calidad & Pruebas — ${analysis.projectName || 'Proyecto'}\n\n`;
        qaMd += `${doc.qa.testPlan || ''}\n\n`;
        qaMd += `## Casos de Prueba Diseñados\n\n`;
        qaMd += `| ID | Título | Precondiciones | Resultado Esperado | Estado |\n`;
        qaMd += `| :--- | :--- | :--- | :--- | :---: |\n`;
        const testCaseRows = Array.isArray(doc.qa.testCases) ? doc.qa.testCases : [];
        testCaseRows.forEach(tc => {
            qaMd += `| ${tc.id} | ${tc.title} | ${tc.preconditions} | ${tc.expectedResult} | ${tc.status} |\n`;
        });
        archive.append(qaMd, { name: `${rootFolder}/QA/TEST-PLAN.md` });
    }

    // 6. User Guide folder
    if (doc.userGuide) {
        let userMd = `${doc.userGuide.guide || ''}\n\n## Preguntas Frecuentes (FAQ)\n\n`;
        const faqRows = Array.isArray(doc.userGuide.faq) ? doc.userGuide.faq : [];
        faqRows.forEach(f => {
            userMd += `### ${f.question}\n${f.answer}\n\n`;
        });
        archive.append(userMd, { name: `${rootFolder}/USER-GUIDE/USER-GUIDE.md` });
    }

    // 7. ADR folder
    if (Array.isArray(doc.adrs)) {
        doc.adrs.forEach(adr => {
            let adrMd = `# ${adr.id}: ${adr.title}\n\n`;
            adrMd += `**Estado**: ${adr.status || 'Aceptada'}\n\n`;
            adrMd += `## Contexto\n${adr.context}\n\n`;
            adrMd += `## Decisión\n${adr.decision}\n\n`;
            adrMd += `## Alternativas Consideradas\n${adr.alternatives || 'No especificadas'}\n\n`;
            adrMd += `## Consecuencias\n${adr.consequences}\n`;
            archive.append(adrMd, { name: `${rootFolder}/ADR/${adr.id}.md` });
        });
    }

    // 8. Diagrams folder (Mermaid syntax files)
    if (doc.diagrams) {
        if (doc.diagrams.c4Mermaid) {
            archive.append(doc.diagrams.c4Mermaid, { name: `${rootFolder}/diagrams/c4-architecture.mmd` });
        }
        if (doc.diagrams.erdMermaid) {
            archive.append(doc.diagrams.erdMermaid, { name: `${rootFolder}/diagrams/database-erd.mmd` });
        }
        if (doc.diagrams.sequenceMermaid) {
            archive.append(doc.diagrams.sequenceMermaid, { name: `${rootFolder}/diagrams/sequence.mmd` });
        }
        if (doc.diagrams.componentMermaid) {
            archive.append(doc.diagrams.componentMermaid, { name: `${rootFolder}/diagrams/components.mmd` });
        }
        if (doc.diagrams.processFlowMermaid) {
            archive.append(doc.diagrams.processFlowMermaid, { name: `${rootFolder}/diagrams/process-flow.mmd` });
        }
    }

    // 9. Security folder (Audit Report, DevSecOps JSON, STRIDE & Requirements)
    const sec = (doc.security && typeof doc.security === 'object' && !Array.isArray(doc.security))
        ? doc.security
        : (analysis.security || null);

    if (sec) {
        if (sec.markdownReport) {
            archive.append(sec.markdownReport, { name: `${rootFolder}/SECURITY/SECURITY-REPORT.md` });
        }
        if (sec.jsonReport) {
            const jsonStr = typeof sec.jsonReport === 'string' ? sec.jsonReport : JSON.stringify(sec.jsonReport, null, 2);
            archive.append(jsonStr, { name: `${rootFolder}/SECURITY/security-report.json` });
        }
        if (sec.threatModel) {
            let tm = `# Modelado de Amenazas (STRIDE) — ${analysis.projectName || 'Proyecto'}\n\n`;
            tm += `${sec.threatModel.summary || ''}\n\n`;
            tm += `| ID | Categoría | Componente | Amenaza | Mitigación Recomendada |\n`;
            tm += `| :--- | :--- | :--- | :--- | :--- |\n`;
            (sec.threatModel.threats || []).forEach(t => {
                tm += `| \`${t.id}\` | **${t.category}** | ${t.component} | ${t.scenario} | ${t.recommendedControl} |\n`;
            });
            archive.append(tm, { name: `${rootFolder}/SECURITY/THREAT-MODEL.md` });
        }
        if (Array.isArray(sec.securityRequirements)) {
            let reqMd = `# Requisitos de Seguridad (Security Requirements) — ${analysis.projectName || 'Proyecto'}\n\n`;
            reqMd += `| ID | Prioridad | Categoría | Requisito | Estado |\n`;
            reqMd += `| :--- | :---: | :--- | :--- | :---: |\n`;
            sec.securityRequirements.forEach(r => {
                reqMd += `| \`${r.id}\` | **${r.priority}** | ${r.category} | ${r.description} | \`${r.status}\` |\n`;
            });
            archive.append(reqMd, { name: `${rootFolder}/SECURITY/SECURITY-REQUIREMENTS.md` });
        }
    }

    return archive;
}

module.exports = {
    createDocumentationZip
};
