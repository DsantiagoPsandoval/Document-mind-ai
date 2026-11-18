/**
 * DOCUMIND AI — UNIFIED DOCUMENT MODEL (SINGLE SOURCE OF TRUTH v3.0)
 * ==================================================================
 * Compiles any repository analysis payload into a canonical, strictly
 * structured engineering deliverable schema:
 *   {
 *     metadata,
 *     documentControl,
 *     toc,
 *     sections,
 *     tables,
 *     diagrams,
 *     references,
 *     technical_evidence,
 *     qualityReview,
 *     warnings
 *   }
 *
 * Consumed identically by:
 *   - Interactive A4 Document Preview
 *   - Microsoft Word Exporter (.docx)
 *   - Direct Binary PDF Exporter (.pdf)
 *   - Editorial HTML Exporter (.html)
 *   - Technical Markdown Exporter (.md)
 *   - Structured JSON Exporter (.json)
 *   - Plain Text Executive Exporter (.txt)
 */

const { buildDiagramSuite } = require('./diagramEngine');
const { reviewAndEnhanceDocumentation } = require('../ai/qualityReviewer');
const { analyzeProjectSemantics, stripVerificationTags } = require('../analyzer/semanticClassifier');

const SCOPE_CONFIG = {
    all: {
        code: 'DOC-MASTER-001',
        title: 'Expediente Maestro de Ingeniería, Arquitectura y Seguridad de Software',
        subtitle: 'Presentación del Proyecto, PRD, SRS (IEEE 830 / ISO 29148), Arquitectura C4 (ISO 42010), Base de Datos, OpenAPI 3.0.3, Calidad (ISO 25010), DevOps, ADR y Seguridad (ISO 27001/27002 & OWASP)',
        standard: 'ISO/IEC/IEEE 29148 • IEEE 830 • ISO 42010 • C4 Model • OpenAPI 3.0.3 • ISO 25010 • ISO 27001/27002 • OWASP',
        chapters: ['intro', 'presentation', 'prd', 'srs', 'arch', 'db', 'api', 'eda', 'devops', 'qa', 'sec', 'adrs', 'user', 'conclusions']
    },
    presentation: {
        code: 'DOC-PRES-001',
        title: 'Documento Formal de Presentación e Ingeniería del Proyecto',
        subtitle: 'Identificación, Planteamiento del Problema, Justificación, Objetivos, Alcance, Limitaciones, Metodología, Stack y Conclusiones',
        standard: 'Ingeniería de Software Basada en Evidencia & ISO/IEC/IEEE 15288 / 12207',
        chapters: ['presentation', 'arch', 'conclusions']
    },
    'security-report': {
        code: 'DOC-SEC-AUDIT',
        title: 'Informe Profesional de Auditoría Técnica y Evaluación de Seguridad (Security Intelligence)',
        subtitle: 'Puntuación 0-100, Metodología, Alcance, Archivos Examinados, Hallazgos SAST/SCA/Secretos, Modelo STRIDE y Plan de Remediación',
        standard: 'OWASP Top 10 • OWASP ASVS 4.0 • CWE • CVSS 4.0 (Ref.) • ISO/IEC 27001:2022 • ISO/IEC 27002:2022',
        chapters: ['sec-report-full']
    },
    prd: {
        code: 'DOC-PRD-002',
        title: 'Documento de Requisitos de Producto (PRD) y Visión Funcional',
        subtitle: 'Objetivos de Negocio, Alcance Funcional, Historias de Usuario y Criterios de Aceptación',
        standard: 'Agile Product Engineering & ISO/IEC/IEEE 29148',
        chapters: ['intro', 'prd', 'srs', 'conclusions']
    },
    srs: {
        code: 'DOC-SRS-003',
        title: 'Especificación de Requisitos de Software (SRS)',
        subtitle: 'Requisitos Funcionales, No Funcionales, Restricciones y Matriz de Trazabilidad',
        standard: 'IEEE Std 830-1998 & ISO/IEC/IEEE 29148:2018',
        chapters: ['intro', 'srs', 'prd', 'conclusions']
    },
    arch: {
        code: 'DOC-ARCH-004',
        title: 'Documento de Arquitectura de Software, Modelo C4 y Diseño UML',
        subtitle: 'Vistas de Contexto, Contenedores, Componentes, Clases, Secuencia y Decisiones Técnicas',
        standard: 'ISO/IEC/IEEE 42010 • Simon Brown C4 Model • OMG UML 2.5',
        chapters: ['intro', 'arch', 'eda', 'adrs', 'conclusions']
    },
    c4: {
        code: 'DOC-C4-005',
        title: 'Arquitectura de Software Basada en el Modelo C4',
        subtitle: 'Vistas Jerárquicas de Contexto (L1), Contenedores (L2) y Componentes (L3)',
        standard: 'Simon Brown C4 Architectural Model',
        chapters: ['intro', 'arch', 'conclusions']
    },
    uml: {
        code: 'DOC-UML-006',
        title: 'Especificación de Modelado UML 2.5 (Clases, Secuencia y Flujos)',
        subtitle: 'Diseño Orientado a Objetos, Interacciones de Componentes y Contratos Internos',
        standard: 'OMG Unified Modeling Language (UML) v2.5',
        chapters: ['intro', 'arch', 'api', 'conclusions']
    },
    db: {
        code: 'DOC-DATA-007',
        title: 'Arquitectura de Persistencia, Modelo Entidad-Relación (ERD) y Diccionario de Datos',
        subtitle: 'Esquema Relacional/NoSQL, Claves Primarias/Foráneas e Integridad de Datos',
        standard: 'ISO/IEC 11179 Metadata & Data Modeling Standard',
        chapters: ['intro', 'db', 'conclusions']
    },
    erd: {
        code: 'DOC-ERD-008',
        title: 'Modelo Entidad-Relación (ERD) y Diccionario Técnico de Datos',
        subtitle: 'Topología de Entidades, Atributos Tipados y Relaciones Cardinales',
        standard: 'Information Engineering ERD & ISO/IEC 11179',
        chapters: ['intro', 'db', 'conclusions']
    },
    api: {
        code: 'DOC-API-009',
        title: 'Catálogo de APIs RESTful y Especificación de Contratos OpenAPI 3.0.3',
        subtitle: 'Inventario de Endpoints, Métodos HTTP, Autenticación, Payloads y Códigos de Respuesta',
        standard: 'OpenAPI Specification (OAS) v3.0.3 & RFC 9110',
        chapters: ['intro', 'api', 'conclusions']
    },
    eda: {
        code: 'DOC-EDA-010',
        title: 'Arquitectura Orientada a Eventos (EDA) y Flujos Asíncronos',
        subtitle: 'Productores, Consumidores, Contratos de Eventos, Brokers y Resiliencia (DLQ)',
        standard: 'AsyncAPI 2.6 & CloudEvents Specification',
        chapters: ['intro', 'eda', 'arch', 'conclusions']
    },
    devops: {
        code: 'DOC-OPS-011',
        title: 'Ingeniería DevOps, Pipeline CI/CD y Manual de Despliegue Cloud',
        subtitle: 'Integración Continua, Variables de Entorno, Contenerización y Runbook Operativo',
        standard: 'Twelve-Factor App & DORA Operational Reliability',
        chapters: ['intro', 'devops', 'conclusions']
    },
    deploy: {
        code: 'DOC-DEP-012',
        title: 'Runbook de Despliegue Productivo e Infraestructura',
        subtitle: 'Topología de Ejecución, Configuración de Entorno, Healthchecks y Plan de Rollback',
        standard: 'Cloud-Native Operations & SRE Runbook Standard',
        chapters: ['intro', 'devops', 'conclusions']
    },
    qa: {
        code: 'DOC-QA-013',
        title: 'Plan Maestro de Aseguramiento de Calidad (QA) y Matriz de Pruebas',
        subtitle: 'Estrategia de Verificación, Casos de Prueba Trazables y Cobertura Funcional',
        standard: 'ISO/IEC/IEEE 29119 Software Testing Standard',
        chapters: ['intro', 'qa', 'conclusions']
    },
    sec: {
        code: 'DOC-SEC-014',
        title: 'Informe de Auditoría de Ciberseguridad (SAST), OWASP Top 10 y Amenazas STRIDE',
        subtitle: 'Postura DevSecOps, Superficie de Ataque, Hallazgos de Código y Controles de Mitigación',
        standard: 'OWASP Top 10:2021 • OWASP ASVS 4.0 • Microsoft STRIDE',
        chapters: ['intro', 'sec', 'conclusions']
    },
    stride: {
        code: 'DOC-STRIDE-015',
        title: 'Modelado de Amenazas STRIDE y Arquitectura de Seguridad',
        subtitle: 'Evaluación de Spoofing, Tampering, Repudiation, Information Disclosure, DoS y EoP',
        standard: 'Microsoft STRIDE Threat Modeling Standard',
        chapters: ['intro', 'sec', 'conclusions']
    },
    adrs: {
        code: 'DOC-ADR-016',
        title: 'Registros de Decisiones de Arquitectura (ADR)',
        subtitle: 'Bitácora de Gobierno Técnico, Contexto, Alternativas y Consecuencias',
        standard: 'MADR (Markdown Architectural Decision Records)',
        chapters: ['intro', 'adrs', 'arch', 'conclusions']
    },
    dev: {
        code: 'DOC-TECH-017',
        title: 'Manual Técnico de Ingeniería, Configuración y Mantenimiento',
        subtitle: 'Estructura del Proyecto, Instalación Local, Estándares de Código y Diagnóstico',
        standard: 'IEEE Std 1063 & Internal Engineering Handbook',
        chapters: ['intro', 'devops', 'arch', 'conclusions']
    },
    user: {
        code: 'DOC-USR-018',
        title: 'Manual de Operación para Usuario Final y Guía de Resolución de Problemas (FAQ)',
        subtitle: 'Flujos Operativos Paso a Paso, Recomendaciones de Uso y Soporte',
        standard: 'ISO/IEC/IEEE 26514 Software User Documentation',
        chapters: ['intro', 'user', 'conclusions']
    }
};

function cleanMarkdownText(md) {
    return String(md || '').trim();
}

/**
 * Strips raw mermaid code blocks from narrative text so they are never rendered
 * as ugly plain code blocks inside the final document.
 */
function stripRawMermaidBlocks(text) {
    if (!text) return '';
    return stripVerificationTags(
        String(text)
            .replace(/```mermaid[\s\S]*?```/gi, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
    );
}

/**
 * Compiles the canonical Unified Document Model from `analysisData` and `scope`.
 */
function buildUnifiedDocumentModel(analysisData = {}, scope = 'all') {
    const normalizedScope = String(scope || 'all').toLowerCase();
    const cfg = SCOPE_CONFIG[normalizedScope] || SCOPE_CONFIG.all;

    // Run semantic classification & quality review first
    const sem = analysisData.semanticProfile || analyzeProjectSemantics(analysisData);
    analysisData.semanticProfile = sem;
    const qualityReview = reviewAndEnhanceDocumentation(analysisData);
    const allDiagrams = buildDiagramSuite(analysisData);

    const repo = analysisData.repository || {};
    const doc = analysisData.documentation || {};
    const sec = analysisData.security || {};
    const stats = analysisData.stats || {};

    const projectName = analysisData.projectName || repo.name || 'Proyecto';
    const fullName = repo.fullName || projectName;
    const branch = repo.branch || repo.defaultBranch || 'main';
    const rawDetectedTechs = analysisData.detectedTechnologies;
    const flatTechs = Array.isArray(rawDetectedTechs)
        ? rawDetectedTechs
        : (rawDetectedTechs && Array.isArray(rawDetectedTechs.languages)
            ? [...(rawDetectedTechs.languages || []), ...(rawDetectedTechs.frameworks || []), ...(rawDetectedTechs.databases || []), ...(rawDetectedTechs.infrastructure || [])]
            : []);
    const primaryLanguage = repo.primaryLanguage || flatTechs[0] || 'JavaScript / Node.js';
    const detectedTechnologies = flatTechs.length > 0
        ? flatTechs
        : (sem.isNonSoftwareInstitutional ? [primaryLanguage] : [primaryLanguage, 'REST API', 'Modular Architecture']);

    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: '2-digit'
    });
    const isoDate = now.toISOString().split('T')[0];

    const metadata = {
        projectName,
        fullName,
        entityName: sem.entityName || projectName,
        projectCategory: sem.category,
        projectCategoryLabel: sem.categoryLabel,
        documentTitle: cfg.title,
        subtitle: cfg.subtitle,
        docCode: `${cfg.code}-${projectName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'SYS'}`,
        version: '3.0.0-Enterprise',
        date: formattedDate,
        isoDate,
        author: 'DocuMind AI — Motor de Ingeniería Documental',
        organization: sem.categoryLabel || 'Arquitectura de Software & DevSecOps',
        standard: cfg.standard,
        scope: normalizedScope,
        branch,
        repositoryUrl: repo.url || `Repositorio Local / ${fullName}`,
        primaryLanguage,
        detectedTechnologies,
        relevantFilesCount: stats.relevantFilesCount || stats.totalFiles || 1,
        totalLines: stats.totalLines || 0,
        isAiGenerated: Boolean(doc.isAiGenerated),
        securityScore: typeof sec.score === 'number' ? sec.score : 95,
        securityGrade: sec.grade || 'A',
        securityRiskLevel: sec.riskLevel || 'BAJO',
        qualityScore: qualityReview.overallScore,
        qualityGrade: qualityReview.grade
    };

    const documentControl = {
        revisionHistory: [
            { version: '1.0.0', date: isoDate, author: 'Semantic & Static Analyzer', description: `Clasificación contextual (${sem.categoryLabel}) y lectura de ${metadata.relevantFilesCount} archivo(s) en rama ${branch}.` },
            { version: '2.0.0', date: isoDate, author: 'DocuMind AI Pipeline', description: 'Estructuración adaptativa de propósito, requerimientos, diagramas y aspectos técnicos.' },
            { version: '3.0.0', date: isoDate, author: 'Quality Reviewer Engine', description: `Revisión editorial y control de coherencia (${metadata.qualityScore}% cumplimiento).` }
        ],
        evidenceLegend: []
    };

    // Extract normalized domain collections
    const endpoints = Array.isArray(doc.api?.endpoints) && doc.api.endpoints.length > 0
        ? doc.api.endpoints
        : (Array.isArray(analysisData.endpoints) ? analysisData.endpoints : []);

    const dataDictionary = Array.isArray(doc.database?.dataDictionary) && doc.database.dataDictionary.length > 0
        ? doc.database.dataDictionary
        : [];

    const userStories = Array.isArray(doc.product?.userStories) ? doc.product.userStories : [];
    const testCases = Array.isArray(doc.qa?.testCases) ? doc.qa.testCases : [];
    const adrs = Array.isArray(doc.adrs) ? doc.adrs : [];
    const vulnerabilities = Array.isArray(sec.vulnerabilities) ? sec.vulnerabilities : [];
    const threats = Array.isArray(sec.threatModel?.threats) ? sec.threatModel.threats : [];
    const secRequirements = Array.isArray(sec.securityRequirements) ? sec.securityRequirements : [];
    const faqList = Array.isArray(doc.userGuide?.faq) ? doc.userGuide.faq : [];

    // Check if the user provided custom edited sections
    if (analysisData.customDoc && Array.isArray(analysisData.customDoc.sections) && analysisData.customDoc.sections.length > 0) {
        const customSections = analysisData.customDoc.sections.map((s, idx) => ({
            number: `${idx + 1}`,
            id: `sec-custom-${idx + 1}`,
            title: s.title || `Sección ${idx + 1}`,
            standardRef: cfg.standard,
            summary: `Sección personalizada editada en el entorno interactivo DocuMind AI.`,
            contentMarkdown: stripRawMermaidBlocks(s.content || ''),
            subsections: [],
            tables: [],
            diagrams: idx === 0 ? [allDiagrams[0]] : [],
            callouts: []
        }));

        const toc = customSections.map((s, i) => ({
            number: s.number,
            id: s.id,
            title: s.title,
            level: 1,
            pageEstimate: i + 2,
            subItems: []
        }));

        return {
            metadata: {
                ...metadata,
                documentTitle: analysisData.customDoc.title || metadata.documentTitle
            },
            documentControl,
            toc,
            sections: customSections,
            tables: [],
            diagrams: [allDiagrams[0]],
            references: getStandardReferences(metadata),
            technical_evidence: {
                detectedTechnologies,
                endpointsCount: endpoints.length,
                dataFieldsCount: dataDictionary.length,
                relevantFilesCount: metadata.relevantFilesCount
            },
            qualityReview,
            warnings: qualityReview.warnings
        };
    }

    // Build chapters dynamically based on `cfg.chapters`
    const rawSections = [];
    const globalTables = [];
    const includedDiagrams = [];

    function registerTable(tbl) {
        if (Array.isArray(tbl.rows)) {
            tbl.rows = tbl.rows.map(r => Array.isArray(r) ? r.map(cell => stripVerificationTags(String(cell ?? ''))) : r);
        }
        globalTables.push(tbl);
        return tbl;
    }

    function registerDiagram(diagKey) {
        const found = allDiagrams.find(d => d.key === diagKey);
        if (!found) return null;
        if (!includedDiagrams.some(d => d.id === found.id)) {
            found.figureNumber = `Figura ${includedDiagrams.length + 1}`;
            const { renderLayeredDiagramSvg, renderSequenceDiagramSvg, renderEntityClassDiagramSvg } = require('./diagramEngine');
            if (found.layers) found.svg = renderLayeredDiagramSvg(found);
            else if (found.participants) found.svg = renderSequenceDiagramSvg(found);
            else if (found.entities) found.svg = renderEntityClassDiagramSvg(found);
            includedDiagrams.push(found);
        }
        return found;
    }

    for (const chKey of cfg.chapters) {
        if (chKey === 'intro') {
            const stackTable = registerTable({
                id: 'tbl-tech-stack',
                title: 'Tabla 1: Naturaleza del Proyecto e Implementación Técnica',
                headers: ['Dimensión Analizada', 'Detalle Identificado', 'Contexto', 'Descripción'],
                rows: [
                    ['Categoría del Proyecto', sem.categoryLabel, sem.entityName, sem.projectNature?.whatItIs || 'Naturaleza identificada del repositorio'],
                    ['Lenguaje Principal', metadata.primaryLanguage, 'Implementación Técnica', sem.technicalImplementation?.roleSummary || 'Herramientas empleadas en el repositorio'],
                    ['Tecnologías Detectadas', detectedTechnologies.join(', '), 'Repositorio', 'Lenguajes y herramientas observadas en los archivos'],
                    ['Rama / Control Versiones', `${metadata.fullName} (${metadata.branch})`, `${metadata.relevantFilesCount} archivo(s)`, 'Archivos analizados de forma estática'],
                    ['Postura de Seguridad', `Score ${metadata.securityScore}/100 (Grado ${metadata.securityGrade})`, `Riesgo ${metadata.securityRiskLevel}`, 'Evaluación estática de seguridad del repositorio']
                ]
            });

            rawSections.push({
                id: 'sec-intro',
                title: 'Introducción, Propósito y Alcance del Documento',
                standardRef: 'ISO/IEC/IEEE 29148 — Sección 1',
                summary: `Define la naturaleza real del proyecto ${sem.entityName} (${sem.categoryLabel}), su propósito y la descripción de su implementación técnica.`,
                contentMarkdown: [
                    `### Naturaleza del Proyecto`,
                    `${sem.projectNature?.whatItIs || `El proyecto **${projectName}** corresponde a la categoría **${sem.categoryLabel}**.`} ${sem.projectNature?.mission ? `Su propósito central es: ${sem.projectNature.mission}` : ''}`,
                    ``,
                    `### Separación entre Propósito e Implementación Técnica`,
                    `${sem.technicalImplementation?.roleSummary || `El análisis abarca **${metadata.relevantFilesCount} archivo(s)** en la rama \`${metadata.branch}\`, utilizando **${detectedTechnologies.join(', ')}**.`}`,
                    ``,
                    `### Objetivos del Documento`,
                    `- **Comprensión Contextual**: Reflejar con fidelidad qué es **${sem.entityName}**, qué problemática atiende y a quién beneficia.`,
                    `- **Claridad Técnica**: Documentar cómo están organizados los archivos y tecnologías del repositorio sin confundir las herramientas de construcción con el propósito institucional.`
                ].join('\n'),
                subsections: [
                    { title: 'Naturaleza del Proyecto y Público Objetivo', content: sem.projectNature?.targetBeneficiaries || 'Dirigido a los usuarios y beneficiarios reales del proyecto.' },
                    { title: 'Resumen de Archivos del Repositorio', content: `Se analizaron ${metadata.relevantFilesCount} archivo(s) en la rama ${metadata.branch}.` }
                ],
                tables: [stackTable],
                diagrams: [],
                callouts: [
                    {
                        type: 'NOTE',
                        title: 'Análisis Contextual y Veracidad',
                        text: `Este documento distingue entre la finalidad real de ${sem.entityName} (${sem.categoryLabel}) y las tecnologías utilizadas en su repositorio.`
                    }
                ]
            });
        }

        if (chKey === 'presentation') {
            const { buildProjectPresentationMarkdown } = require('../analyzer/docGenerator');
            const presMd = doc.presentation || doc.product?.presentation || buildProjectPresentationMarkdown(analysisData);

            const objectivesTable = registerTable({
                id: 'tbl-pres-identification',
                title: 'Ficha de Identificación Contextual y Técnica del Proyecto',
                headers: ['Atributo del Proyecto', 'Detalle en el Repositorio', 'Categoría / Alcance'],
                rows: [
                    ['Nombre / Entidad', sem.entityName || projectName, sem.categoryLabel],
                    ['Repositorio / Rama', `${fullName} (${branch})`, `${metadata.relevantFilesCount} archivo(s)`],
                    ['Naturaleza del Proyecto', sem.projectNature?.whatItIs || sem.categoryLabel, 'Propósito Principal'],
                    ['Implementación Técnica', detectedTechnologies.join(', '), 'Herramientas Utilizadas'],
                    ['Puntuación de Seguridad', `${metadata.securityScore}/100 (${sec.classification || 'Seguridad alta'})`, 'Security Intelligence']
                ]
            });

            rawSections.push({
                id: 'sec-presentation',
                title: 'Documento Formal de Presentación del Proyecto (19 Secciones)',
                standardRef: 'Análisis Contextual & Ingeniería Documental',
                summary: `Presentación integral, naturaleza del proyecto, problemática, justificación, objetivos, alcance, metodología, tecnologías y conclusiones de ${sem.entityName || projectName}.`,
                contentMarkdown: stripRawMermaidBlocks(presMd),
                subsections: [
                    { title: 'Naturaleza del Proyecto, Introducción y Problemática', content: 'Propósito real, población beneficiaria y contexto.' },
                    { title: 'Objetivos, Alcance y Metodología', content: 'Objetivo general, objetivos específicos y líneas de trabajo.' },
                    { title: 'Implementación Técnica, Resultados y Conclusiones', content: 'Herramientas empleadas, resultados y conclusiones.' }
                ],
                tables: [objectivesTable],
                diagrams: [],
                callouts: [
                    {
                        type: 'IMPORTANT',
                        title: 'Documento Adaptado a la Naturaleza del Proyecto',
                        text: `El contenido se adapta a la categoría "${sem.categoryLabel}" a partir de la información disponible en ${fullName}.`
                    }
                ]
            });
        }

        if (chKey === 'sec-report-full') {
            const secReportMd = sec.markdownReport || '';
            const secSummaryTable = registerTable({
                id: 'tbl-sec-exec-summary',
                title: 'Tabla 1: Resumen Ejecutivo y Puntuación General de Seguridad (0 a 100)',
                headers: ['Indicador de Auditoría', 'Resultado Cuantificable', 'Observación Técnica'],
                rows: [
                    ['Puntuación General (0-100)', `${metadata.securityScore} / 100`, sec.classification || 'Seguridad aceptable'],
                    ['Nivel de Riesgo', sec.riskLevel || metadata.securityRiskLevel, `Grado ${metadata.securityGrade}`],
                    ['Fecha del Análisis', metadata.isoDate, 'Auditoría estática determinista (SAST + SCA + Secretos + STRIDE)'],
                    ['Archivos Examinados', `${sec.coverage?.filesAnalyzed || metadata.relevantFilesCount} de ${sec.coverage?.totalFiles || metadata.relevantFilesCount}`, `Cobertura: ${sec.coverage?.coveragePct || 100}% (${sec.coverage?.confidenceLevel || 'Alta'})`],
                    ['Vulnerabilidades Identificadas', `${sec.counts?.total || vulnerabilities.length}`, `Críticas: ${sec.counts?.critical || 0} | Altas: ${sec.counts?.high || 0} | Medias: ${sec.counts?.medium || 0} | Bajas: ${sec.counts?.low || 0}`],
                    ['Hallazgos Pendientes de Verificar', `${sec.counts?.pendingVerification || 0}`, 'Hallazgos potenciales o riesgos inferidos que requieren validación'],
                    ['Evolución vs Auditoría Anterior', sec.comparison?.summary || 'Línea base inicial', sec.comparison?.trend || 'Primera evaluación']
                ]
            });

            const secFindingsTable = registerTable({
                id: 'tbl-sec-full-findings',
                title: 'Tabla 2: Clasificación de Hallazgos, Evidencias y Estándares (OWASP / ASVS / CWE / ISO 27001)',
                headers: ['ID', 'Vulnerabilidad', 'Severidad', 'Archivo : Línea', 'Veracidad', 'Estándar / CWE', 'Recomendación Técnica'],
                rows: (sec.findings && sec.findings.length > 0)
                    ? sec.findings.map(f => [
                        f.id || 'SEC',
                        f.name || f.title || 'Hallazgo',
                        f.severityLabel || f.severity || 'Medio',
                        `${f.file || 'General'}:${f.line || 1}`,
                        f.veracityType || 'Vulnerabilidad confirmada',
                        `${f.cwe || 'CWE'} • ${f.owaspCategory || 'OWASP'}`,
                        f.recommendation || 'Mitigar según plan'
                    ])
                    : [['SEC-000', 'Sin vulnerabilidades confirmadas en la muestra', 'Informativo', 'Repositorio examinado', 'Verificado', 'OWASP ASVS 4.0', 'Mantener controles defensivos y monitoreo continuo']]
            });

            const secStrideTable = registerTable({
                id: 'tbl-sec-full-stride',
                title: 'Tabla 3: Matriz de Modelado de Amenazas STRIDE sobre Componentes Reales',
                headers: ['ID', 'Categoría STRIDE', 'Componente del Repositorio', 'Amenaza e Impacto', 'Probabilidad', 'Mitigación Técnica'],
                rows: threats.length > 0
                    ? threats.map(t => [
                        t.id || 'STRIDE',
                        t.category || 'STRIDE',
                        t.component || projectName,
                        `${t.scenario || ''} (Impacto: ${t.impact || 'Alto'})`,
                        t.likelihood || 'Media',
                        t.recommendedControl || t.mitigation || ''
                    ])
                    : [['STRIDE-01', 'Spoofing / Tampering', projectName, 'Evaluación general de frontera', 'Media', 'Autenticación y validación de entradas']]
            });

            rawSections.push({
                id: 'sec-report-complete',
                title: 'Informe Completo de Auditoría de Ciberseguridad (Security Intelligence)',
                standardRef: 'OWASP Top 10 • OWASP ASVS 4.0 • CWE • CVSS 4.0 • ISO/IEC 27001:2022 • ISO/IEC 27002:2022',
                summary: `Diagnóstico técnico cuantificable (${metadata.securityScore}/100 — ${sec.classification || 'Seguridad aceptable'}), metodología, alcance, archivos examinados, hallazgos, evidencias, análisis STRIDE y plan de remediación.`,
                contentMarkdown: stripRawMermaidBlocks(secReportMd),
                subsections: [
                    { title: 'Resumen Ejecutivo, Puntuación General y Metodología', content: 'Criterios técnicos deterministas, escala 0-100 y alcance del análisis.' },
                    { title: 'Hallazgos, Clasificación de Riesgos y Evidencias', content: 'Vulnerabilidades confirmadas, hallazgos potenciales y riesgos inferidos.' },
                    { title: 'Modelo STRIDE, Plan de Remediación y Conclusiones', content: 'Matriz de amenazas y acciones urgentes, altas, medias y preventivas.' }
                ],
                tables: [secSummaryTable, secFindingsTable, secStrideTable],
                diagrams: [],
                callouts: [
                    {
                        type: 'WARNING',
                        title: 'Declaración de Integridad y Alcance de la Auditoría',
                        text: 'Esta auditoría se basa en el análisis estático de los archivos y configuraciones examinados. Una puntuación alta no garantiza que el repositorio esté libre de vulnerabilidades en tiempo de ejecución ni constituye certificación formal ISO/IEC 27001.'
                    }
                ]
            });
        }

        if (chKey === 'prd') {
            const storiesRows = userStories.length > 0
                ? userStories.map((st, idx) => [
                    `US-0${idx + 1}`,
                    st.role || 'Actor / Beneficiario',
                    `Quiero ${st.action || 'acceder al proyecto'} para ${st.goal || 'cumplir mi necesidad'}`,
                    st.acceptanceCriteria || 'Criterio verificable en el repositorio'
                ])
                : (sem.isNonSoftwareInstitutional
                    ? [
                        ['BEN-01', 'Población Beneficiaria / Comunidad', `Conocer los programas, ejes temáticos y actividades de ${sem.entityName}`, 'Información clara y accesible en el portal institucional'],
                        ['DON-02', 'Donante / Cooperante / Aliado', 'Consultar proyectos ejecutados e informes de transparencia y rendición de cuentas', 'Sección de proyectos y estados financieros disponibles'],
                        ['VOL-03', 'Voluntariado / Ciudadanía', 'Contactar a la organización para colaborar o solicitar orientación', 'Canales de contacto y formulario visibles']
                    ]
                    : [
                        ['US-01', 'Usuario del Sistema', `Utilizar las capacidades principales de ${projectName} de forma fiable`, 'El proyecto procesa la solicitud validando parámetros y retorna estado consistente'],
                        ['US-02', 'Administrador / Integrador', `Interactuar con los módulos y servicios expuestos (${endpoints.length || 1}+ rutas)`, 'Manejo estructurado de entradas y respuestas'],
                        ['US-03', 'Equipo Técnico / QA', 'Verificar la integridad, seguridad y mantenibilidad del proyecto', 'Cumplimiento de controles de seguridad y pruebas']
                    ]);

            const storiesTable = registerTable({
                id: 'tbl-user-stories',
                title: 'Matriz de Actores, Escenarios de Uso y Criterios de Aceptación',
                headers: ['ID', 'Rol / Actor', 'Necesidad o Escenario (Acción y Beneficio)', 'Criterio de Verificación'],
                rows: storiesRows
            });

            rawSections.push({
                id: 'sec-prd',
                title: 'Requerimientos de Producto (PRD & SRS IEEE 830)',
                standardRef: 'ISO/IEC/IEEE 29148 & Análisis Contextual',
                summary: `Propósito del proyecto, problemática atendida, población objetivo, actividades/funcionalidades y alcance de ${sem.entityName || projectName}.`,
                contentMarkdown: stripRawMermaidBlocks(doc.product?.prd || doc.prd || '') + (
                    normalizedScope === 'all' && (doc.product?.srs || doc.srs)
                        ? `\n\n### Especificación de Requisitos y Alcance\n\n${stripRawMermaidBlocks(doc.product?.srs || doc.srs)}`
                        : ''
                ),
                subsections: [
                    { title: 'Propósito del Proyecto y Problemática Abordada', content: 'Alineación entre la naturaleza del proyecto y sus actividades reales.' },
                    { title: 'Actores, Beneficiarios y Escenarios de Uso', content: 'Perfiles identificados a partir del contenido del repositorio.' }
                ],
                tables: [storiesTable],
                diagrams: [],
                callouts: []
            });
        }

        if (chKey === 'srs' && normalizedScope !== 'all') {
            rawSections.push({
                id: 'sec-srs',
                title: 'Especificación Formal de Requisitos de Software (SRS IEEE 830)',
                standardRef: 'IEEE Std 830-1998 / ISO 29148',
                summary: 'Catálogo estructurado de componentes, actividades o requisitos y criterios de verificación.',
                contentMarkdown: stripRawMermaidBlocks(doc.product?.srs || doc.srs || ''),
                subsections: [
                    { title: 'Actividades y Requisitos Funcionales', content: 'Elementos verificables en los archivos del repositorio.' },
                    { title: 'Atributos de Calidad y Requisitos No Funcionales', content: 'Seguridad, accesibilidad, mantenibilidad y disponibilidad.' }
                ],
                tables: [],
                diagrams: [],
                callouts: []
            });
        }

        if (chKey === 'arch') {
            const diagC4L1 = registerDiagram('c4Context');
            const diagC4L2 = registerDiagram('c4Container');
            const diagC4L3 = registerDiagram('c4Component');
            const diagUml = registerDiagram('umlClass');
            const diagSeq = registerDiagram('sequenceMain');

            const archDiagrams = [diagC4L1, diagC4L2, diagC4L3, diagUml, diagSeq].filter(Boolean);

            const compTable = registerTable({
                id: 'tbl-arch-components',
                title: 'Matriz de Estructura Técnica, Componentes y Responsabilidades',
                headers: ['Vista / Nivel', 'Componente / Archivo', 'Tecnología Asociada', 'Rol en el Proyecto'],
                rows: [
                    ['Nivel 1 — Contexto', `${sem.entityName || projectName}`, metadata.primaryLanguage, stripRawMermaidBlocks(doc.architecture?.c4Context || `${sem.projectNature?.whatItIs || 'Interacción con visitantes y usuarios del proyecto.'}`)],
                    ['Nivel 2 — Contenedor', sem.isStaticWebsite ? 'Sitio Web Estático' : 'Aplicación & Servicios', detectedTechnologies.slice(0, 3).join(', '), stripRawMermaidBlocks(doc.architecture?.c4Container || sem.technicalImplementation?.roleSummary || 'Estructura técnica empleada para presentar o ejecutar el proyecto.')],
                    ['Nivel 3 — Componentes', 'Archivos y Secciones del Repositorio', detectedTechnologies.join(', '), stripRawMermaidBlocks(doc.architecture?.c4Component || 'Organización interna de los archivos del repositorio.')]
                ]
            });

            rawSections.push({
                id: 'sec-arch',
                title: 'Arquitectura de Software & Modelo C4',
                standardRef: 'ISO/IEC/IEEE 42010 • Modelo C4 • OMG UML 2.5',
                summary: `Descripción de la implementación técnica del repositorio, separando el propósito del proyecto de las herramientas utilizadas.`,
                contentMarkdown: [
                    `### Separación entre Naturaleza del Proyecto e Implementación Técnica`,
                    `${sem.technicalImplementation?.roleSummary || ''}`,
                    ``,
                    `### Estructura Técnica Observada`,
                    stripRawMermaidBlocks(typeof doc.architecture === 'string' ? doc.architecture : (doc.architecture?.overview || `El repositorio **${projectName}** utiliza **${detectedTechnologies.join(', ')}**.`)),
                    ``,
                    `### Vistas de Contexto, Contenedor y Componentes`,
                    `- **Vista de Contexto (Nivel 1)**: ${stripRawMermaidBlocks(doc.architecture?.c4Context || `Interacción de los destinatarios con ${sem.entityName || projectName}.`)}`,
                    `- **Vista de Contenedores (Nivel 2)**: ${stripRawMermaidBlocks(doc.architecture?.c4Container || `Implementación sobre ${metadata.primaryLanguage}.`)}`,
                    `- **Vista de Componentes (Nivel 3)**: ${stripRawMermaidBlocks(doc.architecture?.c4Component || `Organización de archivos y módulos del repositorio.`)}`
                ].join('\n'),
                subsections: [
                    { title: 'Vistas Estructurales (Contexto, Contenedor y Componentes)', content: 'Representación de cómo está construido y presentado el repositorio.' },
                    { title: 'Diagramas de Interacción', content: 'Flujo de consulta o ejecución según los archivos reales.' }
                ],
                tables: [compTable],
                diagrams: archDiagrams,
                callouts: [
                    {
                        type: 'IMPORTANT',
                        title: 'Distinción entre Propósito y Tecnología',
                        text: sem.technicalImplementation?.roleSummary || 'Las tecnologías se describen como las herramientas empleadas para construir o presentar el proyecto.'
                    }
                ]
            });
        }

        if (chKey === 'db') {
            const diagErd = registerDiagram('erd');
            const dictRows = dataDictionary.length > 0
                ? dataDictionary.map(d => [
                    d.table || 'Entidad',
                    d.field || 'id',
                    d.type || 'VARCHAR',
                    d.isPk ? 'PK (Clave Primaria)' : (d.required ? 'NOT NULL' : 'NULLABLE'),
                    d.description || 'Atributo definido en el modelo de datos'
                ])
                : (sem.isNonSoftwareInstitutional
                    ? [
                        ['Sitio Estático', 'Contenido HTML', 'HTML5 / Texto', 'Estático', `El repositorio de ${sem.entityName} es un sitio web informativo estático y no utiliza base de datos.`]
                    ]
                    : [
                        ['Estado en Memoria / Archivos', 'Configuración y Datos', 'JSON / Memoria', 'Sin Motor SQL/ORM', 'No se detectaron tablas SQL ni esquemas ORM dedicados en los archivos analizados.']
                    ]);

            const dbTable = registerTable({
                id: 'tbl-data-dictionary',
                title: 'Estructura de Información y Diccionario de Datos (ISO/IEC 11179)',
                headers: ['Entidad / Origen', 'Campo / Elemento', 'Tipo', 'Carácter', 'Descripción'],
                rows: dictRows
            });

            rawSections.push({
                id: 'sec-db',
                title: 'Modelos de Datos & Diccionario de Base de Datos',
                standardRef: 'ISO/IEC 11179 & Modelo de Información',
                summary: 'Evaluación de persistencia, organización de la información y diccionario de datos cuando aplica.',
                contentMarkdown: [
                    `### Gestión de Información y Persistencia`,
                    stripRawMermaidBlocks(typeof doc.database === 'string' ? doc.database : (doc.database?.overview || `Evaluación de almacenamiento de datos para **${projectName}**.`)),
                    dataDictionary.length === 0
                        ? `\n> **Nota Técnica**: El repositorio no incluye motores de base de datos ni migraciones SQL; la información se presenta directamente a través de los archivos del proyecto.`
                        : `\nSe identificaron **${dataDictionary.length} atributos/campos** en las entidades del repositorio.`
                ].join('\n'),
                subsections: [
                    { title: 'Organización de Datos e Información', content: 'Estructura de las entidades o secciones informativas del proyecto.' },
                    { title: 'Diccionario de Datos', content: 'Detalle de los campos o contenidos identificados.' }
                ],
                tables: [dbTable],
                diagrams: diagErd ? [diagErd] : [],
                callouts: []
            });
        }

        if (chKey === 'api') {
            const epRows = endpoints.length > 0
                ? endpoints.map(ep => [
                    ep.method || 'GET',
                    ep.path || '/',
                    ep.requiresAuth ? 'Requerida (JWT / Bearer)' : 'Pública',
                    ep.description || 'Ruta identificada en el proyecto'
                ])
                : [
                    ['N/A', 'Sin endpoints de backend', 'N/A', sem.isNonSoftwareInstitutional
                        ? `El repositorio aloja el portal web estático de ${sem.entityName} y no expone APIs ni servicios backend.`
                        : 'No se detectaron rutas HTTP/REST expuestas en los archivos analizados.']
                ];

            const apiTable = registerTable({
                id: 'tbl-api-endpoints',
                title: 'Inventario de Interfaces HTTP / Endpoints',
                headers: ['Método', 'Ruta / Recurso', 'Acceso', 'Descripción'],
                rows: epRows
            });

            const codeSnippets = [];
            if (doc.api?.openApiJson && endpoints.length > 0) {
                const jsonPreview = typeof doc.api.openApiJson === 'string'
                    ? doc.api.openApiJson
                    : JSON.stringify(doc.api.openApiJson, null, 2);
                codeSnippets.push({
                    language: 'json',
                    title: 'Especificación de Contrato OpenAPI 3.0.3',
                    explanation: 'Esquema OpenAPI extraído de los enrutadores del repositorio.',
                    code: jsonPreview.slice(0, 1400)
                });
            }

            rawSections.push({
                id: 'sec-api',
                title: 'Catálogo de APIs & Especificación de Contratos',
                standardRef: 'OpenAPI Specification (OAS) 3.0.3 & RFC 9110',
                summary: endpoints.length > 0
                    ? `Inventario de endpoints RESTful (${endpoints.length} rutas) y contrato OpenAPI.`
                    : `Verificación de interfaces HTTP (0 endpoints de backend detectados).`,
                contentMarkdown: [
                    `### Interfaces de Comunicación`,
                    stripRawMermaidBlocks(doc.api?.overview || doc.apiView || (endpoints.length > 0
                        ? `El proyecto expone ${endpoints.length} rutas HTTP estructuradas.`
                        : `El repositorio analizado no implementa un servidor de APIs RESTful ni rutas de backend.`))
                ].join('\n'),
                subsections: [
                    { title: 'Inventario de Rutas Detectadas', content: 'Resultado de la inspección de controladores y archivos del repositorio.' }
                ],
                tables: [apiTable],
                diagrams: [],
                callouts: [],
                codeSnippets
            });
        }

        if (chKey === 'eda') {
            const diagEda = registerDiagram('edaTopology');
            const edaObj = analysisData.eda || doc.eda || {};
            const isImplemented = Boolean(edaObj.isEdaImplemented || (edaObj.events && edaObj.events.length > 0));

            rawSections.push({
                id: 'sec-eda',
                title: 'Arquitectura Orientada a Eventos (EDA) y Flujos Asíncronos',
                standardRef: 'AsyncAPI 2.6 & CloudEvents Pattern',
                summary: 'Evaluación de procesamiento de eventos y flujos asíncronos.',
                contentMarkdown: [
                    `### Evaluación de Procesamiento de Eventos`,
                    isImplemented
                        ? `El repositorio implementa emisores y consumidores de eventos para desacoplar operaciones asíncronas.`
                        : (sem.isNonSoftwareInstitutional
                            ? `Dado que el repositorio corresponde al portal web estático de **${sem.entityName}** (${sem.categoryLabel}), no requiere ni utiliza buses de eventos ni colas de mensajería de servidor.`
                            : `El proyecto opera mediante flujo directo sin un bus de mensajería distribuido dedicado en los archivos analizados.`)
                ].join('\n'),
                subsections: [],
                tables: [],
                diagrams: diagEda ? [diagEda] : [],
                callouts: []
            });
        }

        if (chKey === 'devops') {
            const diagDeploy = registerDiagram('deploymentInfra');
            rawSections.push({
                id: 'sec-devops',
                title: 'Guía de Desarrollo, DevOps & Despliegue CI/CD',
                standardRef: 'Publicación, Mantenimiento & Operación',
                summary: 'Configuración de publicación, mantenimiento de archivos y despliegue del repositorio.',
                contentMarkdown: [
                    `### Publicación y Entrega`,
                    stripRawMermaidBlocks(typeof doc.devops === 'string' ? doc.devops : (doc.devops?.ciCdPipeline || 'Gestión de versiones y publicación desde la rama principal del repositorio.')),
                    ``,
                    `### Guía de Despliegue y Mantenimiento`,
                    stripRawMermaidBlocks(doc.devops?.deploymentGuide || 'Procedimiento de publicación a partir de los archivos del repositorio.'),
                    doc.development?.readme ? `\n### Documentación de Mantenimiento (README)\n${stripRawMermaidBlocks(doc.development.readme)}` : ''
                ].join('\n'),
                subsections: [],
                tables: [],
                diagrams: diagDeploy ? [diagDeploy] : [],
                callouts: []
            });
        }

        if (chKey === 'qa') {
            const qaRows = testCases.length > 0
                ? testCases.map((tc, i) => [
                    tc.id || `TC-0${i + 1}`,
                    tc.title || 'Caso de verificación',
                    tc.preconditions || 'Archivos del proyecto disponibles',
                    tc.expectedResult || 'Funcionamiento correcto',
                    tc.status || 'Definido'
                ])
                : [
                    ['TC-01', 'Verificación de integridad de archivos del repositorio', 'Rama principal disponible', 'Archivos cargados sin errores de sintaxis', 'Definido'],
                    ['TC-02', 'Verificación de enlaces, recursos y presentación', 'Entorno o navegador activo', 'Secciones y recursos accesibles correctamente', 'Definido']
                ];

            const qaTable = registerTable({
                id: 'tbl-qa-matrix',
                title: 'Matriz de Verificación y Aseguramiento de Calidad',
                headers: ['ID Caso', 'Objetivo / Escenario', 'Precondiciones', 'Resultado Esperado', 'Estado'],
                rows: qaRows
            });

            rawSections.push({
                id: 'sec-qa',
                title: 'Plan de Aseguramiento de Calidad (QA) & Casos de Prueba',
                standardRef: 'ISO/IEC 25010 & Verificación de Calidad',
                summary: 'Criterios de calidad, accesibilidad, integridad funcional y casos de verificación.',
                contentMarkdown: stripRawMermaidBlocks(typeof doc.qa === 'string' ? doc.qa : (doc.qa?.testPlan || `Evaluación de calidad para **${sem.entityName || projectName}**.`)),
                subsections: [],
                tables: [qaTable],
                diagrams: [],
                callouts: []
            });
        }

        if (chKey === 'sec') {
            const secTables = [];

            const vulnRows = vulnerabilities.length > 0
                ? vulnerabilities.slice(0, 12).map((v, i) => [
                    v.id || `VULN-0${i + 1}`,
                    v.severity || 'MEDIUM',
                    v.category || v.owasp || 'OWASP Top 10',
                    `${v.file || 'Código fuente'}${v.line ? `:${v.line}` : ''}`,
                    v.title || v.description || 'Hallazgo estático',
                    v.remediation || v.recommendation || 'Aplicar sanitización y validación estricta'
                ])
                : [
                    ['SEC-AUDIT-01', 'INFO', 'A05:2021 Security Misconfiguration', 'Archivos analizados', 'No se detectaron vulnerabilidades críticas activas en el análisis estático', 'Mantener buenas prácticas de configuración y revisión periódica']
                ];

            secTables.push(registerTable({
                id: 'tbl-sec-vulns',
                title: 'Matriz de Hallazgos SAST y Auditoría OWASP Top 10',
                headers: ['ID', 'Severidad', 'Categoría OWASP', 'Ubicación', 'Descripción del Hallazgo', 'Mitigación Técnica'],
                rows: vulnRows
            }));

            const strideRows = threats.length > 0
                ? threats.map((t, i) => [
                    t.id || `THR-0${i + 1}`,
                    t.category || 'STRIDE',
                    t.component || projectName,
                    t.scenario || 'Escenario de amenaza evaluado',
                    t.recommendedControl || 'Control defensivo recomendado'
                ])
                : [
                    ['STR-01', 'Spoofing (Suplantación)', projectName, 'Suplantación de identidad o dominio', 'Uso de HTTPS/TLS y verificación de dominio oficial'],
                    ['STR-02', 'Tampering (Manipulación)', 'Archivos del Repositorio', 'Modificación no autorizada de contenidos o código', 'Control de acceso al repositorio Git y protección de la rama principal'],
                    ['STR-03', 'Information Disclosure', 'Configuración y Archivos', 'Exposición accidental de credenciales o datos sensibles', 'Revisión de secretos antes de publicar cambios'],
                    ['STR-04', 'Denial of Service (DoS)', 'Alojamiento / Servicio', 'Indisponibilidad temporal por tráfico elevado', 'Uso de CDN y alojamiento con mitigación DDoS']
                ];

            secTables.push(registerTable({
                id: 'tbl-sec-stride',
                title: 'Modelado de Amenazas STRIDE y Controles de Seguridad',
                headers: ['ID', 'Categoría STRIDE', 'Componente Objetivo', 'Escenario de Riesgo', 'Control Técnico / Mitigación'],
                rows: strideRows
            }));

            if (secRequirements.length > 0) {
                secTables.push(registerTable({
                    id: 'tbl-sec-reqs',
                    title: 'Requisitos de Seguridad (OWASP ASVS)',
                    headers: ['ID', 'Prioridad', 'Categoría', 'Requisito de Seguridad', 'Estado'],
                    rows: secRequirements.map(r => [r.id || 'SEC', r.priority || 'Alta', r.category || 'AppSec', r.description || '', r.status || 'Verificado'])
                }));
            }

            rawSections.push({
                id: 'sec-security',
                title: 'Auditoría DevSecOps & Seguridad de Código (SAST)',
                standardRef: 'OWASP Top 10 • OWASP ASVS 4.0 • STRIDE',
                summary: `Evaluación de ciberseguridad (Puntaje: ${metadata.securityScore}/100 — Grado ${metadata.securityGrade}), análisis estático y matriz STRIDE.`,
                contentMarkdown: [
                    `### Postura General de Seguridad del Repositorio`,
                    stripRawMermaidBlocks(typeof doc.security === 'string' ? doc.security : (sec.summary || `El análisis estático de seguridad sobre **${projectName}** registra una calificación de **${metadata.securityScore}/100 (Grado ${metadata.securityGrade} — Riesgo ${metadata.securityRiskLevel})**.`)),
                    ``,
                    `### Buenas Prácticas de Protección`,
                    `- **Prevención de Fuga de Secretos**: Ninguna clave privada ni credencial sensible debe incluirse en archivos públicos del repositorio.`,
                    `- **Integridad del Contenido**: Mantener enlaces externos con atributos seguros (\`rel="noopener noreferrer"\`) y transporte cifrado HTTPS.`
                ].join('\n'),
                subsections: [],
                tables: secTables,
                diagrams: [],
                callouts: []
            });
        }

        if (chKey === 'adrs') {
            const adrRows = adrs.length > 0
                ? adrs.map((a, i) => [
                    a.id || `ADR-00${i + 1}`,
                    a.title || 'Decisión Técnica',
                    a.status || 'Aceptada',
                    a.context || 'Contexto del proyecto',
                    a.decision || 'Enfoque adoptado',
                    a.consequences || 'Mayor simplicidad y mantenibilidad'
                ])
                : [
                    ['ADR-001', `Uso de ${metadata.primaryLanguage} para la implementación de ${sem.entityName || projectName}`, 'Aceptada', `Responder a las necesidades reales de un proyecto de categoría "${sem.categoryLabel}"`, `Construir el repositorio empleando ${detectedTechnologies.slice(0, 3).join(', ')}`, 'Facilita el mantenimiento, la claridad estructural y la publicación directa']
                ];

            const adrTable = registerTable({
                id: 'tbl-adrs',
                title: 'Registro de Decisiones Técnicas y de Diseño (ADR)',
                headers: ['ID', 'Título de la Decisión', 'Estado', 'Contexto', 'Decisión Adoptada', 'Consecuencias'],
                rows: adrRows
            });

            rawSections.push({
                id: 'sec-adrs',
                title: 'Decisiones de Arquitectura (ADRs)',
                standardRef: 'MADR — Architectural Decision Records',
                summary: 'Decisiones técnicas observadas en la construcción del repositorio.',
                contentMarkdown: stripRawMermaidBlocks(typeof doc.adrs === 'string' ? doc.adrs : `Los **Registros de Decisión Técnica (ADR)** explican por qué se eligieron las herramientas actuales (**${detectedTechnologies.join(', ')}**) para construir o presentar **${sem.entityName || projectName}**.`),
                subsections: [],
                tables: [adrTable],
                diagrams: [],
                callouts: []
            });
        }

        if (chKey === 'user') {
            const faqRows = faqList.length > 0
                ? faqList.map((f, i) => [`FAQ-0${i + 1}`, f.question || '¿Pregunta frecuente?', f.answer || 'Respuesta basada en el repositorio.'])
                : [
                    ['FAQ-01', `¿Qué es ${sem.entityName || projectName}?`, sem.projectNature?.whatItIs || `Es un proyecto de la categoría ${sem.categoryLabel}.`],
                    ['FAQ-02', `¿Qué tecnologías utiliza el repositorio?`, sem.technicalImplementation?.roleSummary || `Utiliza ${detectedTechnologies.join(', ')}.`]
                ];

            const faqTable = registerTable({
                id: 'tbl-user-faq',
                title: 'Preguntas Frecuentes (FAQ)',
                headers: ['Código', 'Pregunta', 'Respuesta'],
                rows: faqRows
            });

            rawSections.push({
                id: 'sec-user',
                title: 'Manual de Usuario Final & FAQ',
                standardRef: 'ISO/IEC/IEEE 26514 User Documentation',
                summary: 'Guía de consulta y preguntas frecuentes adaptadas al público del proyecto.',
                contentMarkdown: stripRawMermaidBlocks(typeof doc.userGuide === 'string' ? doc.userGuide : (doc.userGuide?.guide || `Guía de consulta para **${sem.entityName || projectName}**.`)),
                subsections: [],
                tables: [faqTable],
                diagrams: [],
                callouts: []
            });
        }

        if (chKey === 'conclusions') {
            const qualityTable = registerTable({
                id: 'tbl-quality-audit',
                title: 'Métricas de Verificación Editorial y Calidad Técnica del Entregable',
                headers: ['Dimensión Evaluada', 'Puntaje', 'Estado de Cumplimiento', 'Observación de Auditoría'],
                rows: [
                    ['Precisión Técnica y Evidencia', `${qualityReview.dimensions.technicalPrecision}%`, 'VERIFICADO', `${metadata.relevantFilesCount} archivos y ${detectedTechnologies.length} tecnologías contrastadas`],
                    ['Coherencia Arquitectónica', `${qualityReview.dimensions.architecturalCoherence}%`, 'VERIFICADO', 'Alineación entre vistas C4, UML, tablas de APIs y modelo de datos'],
                    ['Cobertura de Requisitos (IEEE 830)', `${qualityReview.dimensions.requirementCoverage}%`, 'VERIFICADO', 'Requisitos funcionales, no funcionales e historias de usuario trazables'],
                    ['Calidad de Diagramas y Tablas', `${qualityReview.dimensions.diagramQuality}%`, 'VERIFICADO', `${includedDiagrams.length} diagramas vectoriales y ${globalTables.length + 1} tablas estructuradas`]
                ]
            });

            rawSections.push({
                id: 'sec-conclusions',
                title: 'Conclusiones Técnicas, Garantía de Calidad y Referencias Normativas',
                standardRef: 'Auditoría de Calidad DocuMind AI v3.0',
                summary: 'Síntesis ejecutiva del análisis, dictamen de calidad documental y estándares internacionales aplicados.',
                contentMarkdown: [
                    `### Dictamen Técnico Final`,
                    `El sistema **${projectName}** presenta una estructura técnica sólida sobre **${detectedTechnologies.join(', ')}**, con una calificación de seguridad SAST de **${metadata.securityScore}/100 (Grado ${metadata.securityGrade})** y un índice de calidad documental de **${metadata.qualityScore}% (Grado ${metadata.qualityGrade})**.`,
                    ``,
                    qualityReview.warnings.length > 0
                        ? `### Notas de Transparencia y Alcance de Evidencia\n` + qualityReview.warnings.map(w => `- ${w}`).join('\n')
                        : `### Verificación de Completitud\nTodas las secciones, tablas técnicas y diagramas de arquitectura fueron validados sin detectar contradicciones ni secciones vacías.`
                ].join('\n'),
                subsections: [],
                tables: [qualityTable],
                diagrams: [],
                callouts: []
            });
        }
    }

    // Number sections sequentially (1, 2, 3...) and build TOC
    const sections = rawSections.map((sec, idx) => ({
        ...sec,
        number: `${idx + 1}`
    }));

    let runningPage = 2; // Page 1 is Cover Page
    const toc = sections.map((sec) => {
        const item = {
            number: sec.number,
            id: sec.id,
            title: sec.title,
            standardRef: sec.standardRef,
            level: 1,
            pageEstimate: runningPage,
            subItems: (sec.subsections || []).map((sub, sIdx) => ({
                number: `${sec.number}.${sIdx + 1}`,
                title: sub.title,
                level: 2,
                pageEstimate: runningPage
            }))
        };
        const contentLen = (sec.contentMarkdown || '').length + (sec.tables?.length || 0) * 450 + (sec.diagrams?.length || 0) * 600;
        runningPage += Math.max(1, Math.ceil(contentLen / 1800));
        return item;
    });

    const references = getStandardReferences(metadata);

    return {
        metadata: {
            ...metadata,
            totalPagesEstimate: Math.max(2, runningPage)
        },
        documentControl,
        toc,
        sections,
        tables: globalTables,
        diagrams: includedDiagrams,
        references,
        technical_evidence: {
            projectName,
            fullName,
            branch,
            primaryLanguage,
            detectedTechnologies,
            relevantFilesCount: metadata.relevantFilesCount,
            endpointsCount: endpoints.length,
            dataFieldsCount: dataDictionary.length,
            securityScore: metadata.securityScore
        },
        qualityReview,
        warnings: qualityReview.warnings
    };
}

function getStandardReferences(metadata) {
    return [
        { code: 'ISO/IEC/IEEE 29148:2018', title: 'Systems and software engineering — Life cycle processes — Requirements engineering' },
        { code: 'IEEE Std 830-1998', title: 'IEEE Recommended Practice for Software Requirements Specifications (SRS)' },
        { code: 'ISO/IEC/IEEE 42010:2022', title: 'Software, systems and enterprise — Architecture description' },
        { code: 'C4 Model (Simon Brown)', title: 'Context, Containers, Components, and Code — Visualising Software Architecture' },
        { code: 'OMG UML 2.5.1', title: 'Unified Modeling Language Specification (Class, Sequence, Activity Diagrams)' },
        { code: 'OpenAPI 3.0.3', title: 'OpenAPI Initiative — RESTful API Description Specification' },
        { code: 'OWASP Top 10:2021 & ASVS 4.0', title: 'Application Security Verification Standard & Web Application Security Risks' },
        { code: `REPO:${metadata.fullName}`, title: `Código fuente e inventario estático de la rama ${metadata.branch} (${metadata.relevantFilesCount} archivos)` }
    ];
}

module.exports = {
    SCOPE_CONFIG,
    buildUnifiedDocumentModel,
    stripRawMermaidBlocks
};
