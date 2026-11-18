/**
 * DOCUMENT-MIND AI — SPECIALIZED PROMPT ENGINEERING ENGINE
 * Centralized dynamic prompt constructor for Gemini AI.
 * Produces structured, grounded prompts separating system roles, verified AST context,
 * task instructions, sanitized source code evidence, output formats, and acceptance criteria.
 */

const { redactAllSecrets } = require('../analyzer/security/secretScanner');
const { packFilesForContext, formatFilesContext, estimateTokens } = require('./tokenManager');
const { analyzeProjectSemantics } = require('../analyzer/semanticClassifier');

/**
 * Standard System Roles for each specialized domain.
 */
const SYSTEM_ROLES = {
    repoAnalysis: `Eres Document-Mind AI, un Analista Contextual Senior, Arquitecto de Sistemas y Auditor Técnico.
Tu objetivo es comprender la naturaleza real del proyecto antes de documentarlo y realizar un análisis riguroso y objetivo basado únicamente en la evidencia del repositorio.
DIRECTIVAS INMUTABLES:
1. Identificar primero qué es el proyecto en la realidad (fundación, organización social, institución educativa, empresa, tienda virtual, proyecto de investigación, portafolio, biblioteca o aplicación de software).
2. Separar estrictamente la Naturaleza del Proyecto (qué es, para qué existe, qué problemática aborda y a quién beneficia) de la Implementación Técnica (lenguajes y herramientas usadas para construirlo o presentarlo).
3. No asumir que todo repositorio de GitHub es una aplicación de software comercial o un sistema de automatización empresarial.
4. No inventar funcionalidades, arquitecturas, integraciones, bases de datos ni usuarios técnicos que no existan en la evidencia.
5. No incluir etiquetas como [Información verificada], [Información inferida], [Información no verificada], [Encontrado], [Inferido] o [Recomendado] en el texto visible; redactar de forma natural, limpia y profesional.
6. Si falta información en los archivos analizados, expresarlo de manera breve y profesional.`,

    prd: `Eres un Especialista Senior en Análisis de Proyectos, Estrategia Institucional y Gestión de Producto.
Tu objetivo es redactar un documento de visión, propósito, alcance y requerimientos adaptado a la verdadera naturaleza del repositorio analizado.
DIRECTIVAS INMUTABLES:
1. Si el repositorio corresponde a una fundación, organización social, institución educativa o portal informativo, orientar el documento a su misión, visión, problemática atendida, población beneficiaria, ejes temáticos, programas, actividades e impacto, describiendo la tecnología únicamente como el medio de presentación digital.
2. Si corresponde a una aplicación de software o plataforma SaaS, documentar visión de producto, usuarios, casos de uso y requisitos funcionales/no funcionales.
3. No inventar objetivos empresariales ni procesos de automatización sin evidencia en el repositorio.
4. No incluir etiquetas como [Información verificada], [Información inferida] o [Información no verificada].`,

    srs: `Eres un Especialista Senior en Especificación Documental y Requisitos bajo estándares IEEE 830 e ISO/IEC/IEEE 29148.
Tu objetivo es generar una especificación formal, trazable y fiel a la naturaleza real del proyecto.
DIRECTIVAS INMUTABLES:
1. Adaptar el enfoque según la categoría del proyecto: para fundaciones u organizaciones sociales, documentar sus ejes programáticos, servicios comunitarios y las secciones reales de su presencia web; para sistemas de software, documentar sus requisitos funcionales y no funcionales técnicos.
2. Cada requisito debe incluir ID, Nombre, Descripción, Prioridad, Fuente en el repositorio y Criterio de Verificación.
3. No utilizar etiquetas de verificación entre corchetes en el documento final.`,

    architecture: `Eres un Software Architect Fellow especializado en arquitectura de sistemas y análisis estructural de proyectos digitales.
Tu objetivo es documentar con precisión cómo está construido técnicamente el repositorio sin confundir la estructura del código con el propósito institucional del proyecto.
DIRECTIVAS INMUTABLES:
1. Los diagramas y descripciones deben representar ÚNICAMENTE los archivos, páginas, estilos, scripts o módulos reales presentes en el repositorio.
2. Si el proyecto es un sitio web estático (HTML5, CSS3, JavaScript) para una fundación, institución o portafolio, describirlo honestamente como un sitio web informativo estático y no inventar servidores backend, APIs ni bases de datos.
3. No incluir etiquetas como [Encontrado], [Inferido], [Propuesto] ni [Información verificada] en el texto final.`,

    eda: `Eres un Distributed Systems Architect especializado en Arquitecturas Orientadas a Eventos (EDA).
Tu objetivo es evaluar con veracidad si el repositorio utiliza procesamiento orientado a eventos.
DIRECTIVAS INMUTABLES:
1. Si el repositorio no cuenta con un sistema EDA implementado (por ejemplo, si es un sitio web institucional o una aplicación síncrona), declararlo de forma clara y concisa sin inventar brokers como RabbitMQ, Kafka o Redis.
2. Evitar etiquetas entre corchetes como [Encontrado] o [Recomendación Arquitectónica]; redactar con prosa limpia y profesional.`,

    security: `Eres un Lead Application Security (AppSec) Engineer y Auditor DevSecOps experto en OWASP Top 10 y CWE.
Tu objetivo es auditar la postura de seguridad de los archivos del repositorio basándote únicamente en evidencias reales.
DIRECTIVAS INMUTABLES:
1. Clasificar severidades con rigor: CRITICAL, HIGH, MEDIUM, LOW, INFO.
2. Cada hallazgo debe incluir: ID, Severidad, Archivo, Línea/Snippet, Impacto, Probabilidad y Recomendación técnica concreta.
3. No declarar una vulnerabilidad sin evidencia suficiente en el código fuente.`,

    qa: `Eres un QA Lead y Especialista en Aseguramiento de Calidad.
Tu objetivo es diseñar una matriz de verificación y calidad adaptada a la naturaleza real del repositorio.
DIRECTIVAS INMUTABLES:
1. Diferenciar con claridad entre pruebas existentes en el repositorio y verificaciones recomendadas (como accesibilidad, enlaces, formularios o contratos de servicio según el tipo de proyecto).
2. No marcar ninguna prueba como ejecutada o aprobada si no ha sido corrida realmente.`,

    openapi: `Eres un API Architect especialista en la especificación OpenAPI 3.0.3 y contratos HTTP.
Tu objetivo es documentar las interfaces HTTP del proyecto si existen en el código.
DIRECTIVAS INMUTABLES:
1. Extraer ÚNICAMENTE las rutas y métodos HTTP que existan realmente en el código analizado.
2. No inventar endpoints ni parámetros que no estén implementados.
3. Producir una especificación OpenAPI 3.0.3 válida en formato JSON estricto.`,

    c4: `Eres un Principal Software Architect experto en el Modelo C4 de Simon Brown (Contexto, Contenedores, Componentes).
Tu objetivo es documentar las vistas del Modelo C4 basadas estrictamente en los archivos reales del repositorio, adaptando los actores a los beneficiarios o visitantes reales del proyecto y redactando sin etiquetas entre corchetes.`,

    uml: `Eres un Ingeniero de Modelado certificado en OMG UML 2.5.
Tu objetivo es describir la estructura e interacciones reales de los archivos o módulos del repositorio sin inventar clases ni procesos inexistentes.`,

    erd: `Eres un Data Architect especialista en Modelado de Datos.
Tu objetivo es documentar las entidades o estructuras de información reales del repositorio. Si el proyecto es un sitio web estático sin base de datos, declararlo de forma directa y describir la estructura de su contenido.`,

    devops: `Eres un Staff DevOps / SRE Platform Architect especializado en publicación web, dominios (CNAME), CI/CD y operación.
Tu objetivo es documentar cómo se publica y despliega el repositorio en la realidad, sin usar etiquetas entre corchetes.`,

    stride: `Eres un Principal Cybersecurity Architect especialista en Modelado de Amenazas STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
Tu objetivo es evaluar los componentes reales del repositorio frente a las 6 categorías STRIDE y definir controles de mitigación claros.`,

    adr: `Eres un Principal Staff Engineer especialista en Decisiones Técnicas y de Diseño (ADR).
Tu objetivo es documentar las decisiones técnicas reales observadas en la construcción del repositorio (por ejemplo, elección de sitio estático HTML5/CSS3 para un portal de fundación, o arquitectura modular para una aplicación).`,

    database: `Eres un Especialista en Arquitectura de Información y Bases de Datos (ISO/IEC 11179).
Tu objetivo es documentar los modelos de datos reales o, si el proyecto no utiliza base de datos, explicar con claridad cómo organiza y presenta su información estática.`,

    techManual: `Eres un Ingeniero Senior responsable del Manual Técnico y de Mantenimiento (IEEE 1063).
Tu objetivo es documentar la estructura de archivos del repositorio, las herramientas empleadas para construirlo o presentarlo y cómo mantenerlo.`,

    userManual: `Eres un Especialista Senior en Comunicación y Guías de Usuario (ISO/IEC/IEEE 26514).
Tu objetivo es redactar una guía clara adaptada al público real del proyecto (beneficiarios, donantes, visitantes, estudiantes o usuarios) y preguntas frecuentes reales.`,

    deployment: `Eres un Ingeniero de Publicación e Infraestructura Web.
Tu objetivo es documentar los pasos reales para publicar, alojar y mantener operativo el proyecto según su naturaleza técnica.`
};

const PROMPT_ENGINE_VERSION = '3.0.0';

const PROMPT_STANDARDS = {
    repoAnalysis: 'ISO/IEC 25010 & AST Static Forensics',
    prd: 'IEEE 830 / Agile Product Discovery',
    srs: 'ISO/IEC/IEEE 29148 & IEEE Std 830-1998',
    architecture: 'ISO/IEC/IEEE 42010 & C4 Model',
    c4: 'Simon Brown C4 Model (Levels 1-3)',
    uml: 'OMG UML 2.5 Specification',
    erd: 'Crow\'s Foot Entity-Relationship Standard',
    openapi: 'OpenAPI Specification (OAS) 3.0.3',
    devops: 'DORA & Twelve-Factor CI/CD Standard',
    qa: 'ISO/IEC/IEEE 29119 Software Testing',
    security: 'OWASP Top 10:2021 & ASVS 4.0',
    stride: 'Microsoft STRIDE Threat Modeling',
    adr: 'MADR Architectural Decision Records',
    database: 'ISO/IEC 11179 Data Dictionary Standard',
    eda: 'AsyncAPI & CloudEvents EDA Standard',
    techManual: 'IEEE 1063 Technical Maintainer Standard',
    userManual: 'ISO/IEC/IEEE 26514 User Documentation',
    deployment: 'Cloud-Native Release & Runbook Standard'
};

/**
 * Builds formatted project context from AST and static analysis.
 */
function buildProjectContext(ctx = {}) {
    const {
        projectName = 'Proyecto',
        repoDescription = '',
        detectedLanguages = [],
        detectedFrameworks = [],
        detectedDatabases = [],
        detectedInfra = [],
        endpoints = [],
        dataModels = [],
        treeDiagram = '',
        projectMap = null,
        securityAudit = null
    } = ctx;

    const sem = ctx.semanticProfile || analyzeProjectSemantics(ctx);

    let text = `=== CLASIFICACIÓN SEMÁNTICA Y NATURALEZA REAL DEL PROYECTO ===\n`;
    text += `Categoría Identificada: ${sem.categoryLabel} (${sem.category})\n`;
    text += `Entidad / Nombre Real: ${sem.entityName}\n`;
    text += `Naturaleza del Proyecto: ${sem.projectNature?.whatItIs || ''}\n`;
    text += `Misión / Propósito Real: ${sem.projectNature?.mission || ''}\n`;
    text += `Problemática que Aborda: ${sem.projectNature?.problemAddressed || ''}\n`;
    text += `Población Beneficiaria / Público Objetivo: ${sem.projectNature?.targetBeneficiaries || ''}\n`;
    if (Array.isArray(sem.projectNature?.programsAndActivities) && sem.projectNature.programsAndActivities.length > 0) {
        text += `Actividades, Ejes Temáticos o Servicios Reales:\n`;
        sem.projectNature.programsAndActivities.slice(0, 6).forEach(pa => {
            text += `- ${pa.title}: ${pa.detail}\n`;
        });
    }
    if (Array.isArray(sem.projectNature?.executedProjects) && sem.projectNature.executedProjects.length > 0) {
        text += `Proyectos Ejecutados / Iniciativas Reales:\n`;
        sem.projectNature.executedProjects.forEach(ep => {
            text += `- ${ep.name} (${ep.ally}): ${ep.summary}\n`;
        });
    }
    text += `\n=== SEPARACIÓN ENTRE PROPÓSITO E IMPLEMENTACIÓN TÉCNICA ===\n`;
    text += `Rol de la Tecnología en este Proyecto: ${sem.technicalImplementation?.roleSummary || ''}\n`;
    text += `Nombre del Repositorio: ${projectName}\n`;
    text += `Descripción: ${repoDescription || sem.signals?.metaDescription || 'No provista en el repositorio'}\n`;
    text += `Lenguajes Detectados: ${detectedLanguages.join(', ') || 'No determinados'}\n`;
    text += `Frameworks Detectados: ${detectedFrameworks.join(', ') || 'No determinados'}\n`;
    text += `Bases de Datos / Persistencia: ${detectedDatabases.join(', ') || 'No identificadas en código'}\n`;
    text += `Infraestructura / Despliegue: ${detectedInfra.join(', ') || (sem.customDomain ? `Sitio web bajo dominio ${sem.customDomain}` : 'No identificada')}\n`;

    if (endpoints && endpoints.length > 0) {
        text += `\nRutas / Endpoints HTTP Detectados (${endpoints.length}):\n`;
        endpoints.slice(0, 30).forEach(e => {
            text += `- ${e.method} ${e.path} ${e.auth ? '[Requiere Auth]' : ''}\n`;
        });
        if (endpoints.length > 30) text += `  [... y ${endpoints.length - 30} endpoints adicionales]\n`;
    }

    if (dataModels && dataModels.length > 0) {
        text += `\nModelos de Datos / Entidades Detectadas (${dataModels.length}):\n`;
        dataModels.slice(0, 20).forEach(m => {
            text += `- ${m.name} (${(m.fields || []).map(f => f.name).join(', ') || 'campos no tipados'})\n`;
        });
    }

    if (securityAudit && typeof securityAudit.score === 'number') {
        text += `\nPostura de Seguridad SAST Previa: Score ${securityAudit.score}/100 | Nivel de Riesgo: ${securityAudit.riskLevel || 'N/A'}\n`;
        text += `Hallazgos Totales: ${securityAudit.counts ? securityAudit.counts.total : (securityAudit.findings || []).length}\n`;
    }

    if (treeDiagram) {
        text += `\nÁrbol Estructural de Directorios:\n${treeDiagram.substring(0, 2200)}\n`;
    }

    return text;
}

/**
 * Central Prompt Engine: Constructs tailored prompts according to task type.
 * @param {string} taskType - 'repoAnalysis' | 'prd' | 'srs' | 'architecture' | 'eda' | 'security' | 'qa' | 'openapi'
 * @param {object} analysisContext - Extracted metadata and files
 * @param {object} [options] - Configuration options { language: 'es' | 'en', tokenBudget: number }
 * @returns {{ systemInstruction: string, promptText: string, taskType: string, tokenEstimate: number, packedFilesCount: number }}
 */
function buildSpecializedPrompt(taskType, analysisContext = {}, options = {}) {
    const systemInstruction = SYSTEM_ROLES[taskType] || SYSTEM_ROLES.repoAnalysis;
    const projectMetadata = buildProjectContext(analysisContext);
    const language = options.language === 'en' ? 'en' : 'es';
    const tokenBudget = options.tokenBudget || 28000;

    // Pack prioritized files
    const allFiles = analysisContext.keyFiles || analysisContext.prioritizedFiles || [];
    const { packedFiles, totalTokens, omittedCount } = packFilesForContext(allFiles, tokenBudget);

    // Redact secrets from source files to prevent accidental leakage
    const rawFilesContext = formatFilesContext(packedFiles);
    const sanitizedFilesContext = redactAllSecrets(rawFilesContext);

    let specificInstructions = '';
    let responseSchemaGuide = '';

    switch (taskType) {
        // -------------------------------------------------------------
        // 1. REPOSITORY DEEP TECHNICAL AUDIT
        // -------------------------------------------------------------
        case 'repoAnalysis':
            specificInstructions = `Realiza una auditoría técnica profunda del repositorio abordando obligatoriamente los 12 ejes siguientes:
1. Propósito real y problema que resuelve el software.
2. Arquitectura existente y estilo arquitectónico (Monolito, Microservicios, Modular, Capas, Serverless).
3. Componentes principales y cómo interactúan entre sí.
4. Responsabilidades asignadas a cada módulo y nivel de cohesión.
5. Dependencias internas entre módulos y librerías externas de terceros.
6. Flujo de ejecución principal de datos e interacciones usuario-servidor.
7. Entradas y salidas del sistema (formatos, payloads, protocolos).
8. Patrones de diseño detectados (ej. Factory, Repository, Middleware, Observer, Singleton).
9. Problemas arquitectónicos y code smells (acoplamiento alto, código duplicado, falta de abstracción).
10. Riesgos técnicos críticos para estabilidad y mantenimiento.
11. Deuda técnica acumulada e ítems sin finalizar (TODOs, hardcoding).
12. Oportunidades concretas de modernización y optimización.`;

            responseSchemaGuide = `Formato de salida requerido: Objeto JSON estricto con la siguiente estructura:
{
  "systemPurpose": "Propósito real y problema resuelto",
  "architecturalStyle": "Estilo identificado con evidencia",
  "components": [
    { "name": "Nombre", "responsibility": "Responsabilidad", "evidenceFile": "ruta/archivo" }
  ],
  "internalDependencies": ["Descripción de dependencias clave entre módulos"],
  "externalDependencies": ["Librerías principales y su justificación"],
  "executionFlow": "Flujo de ejecución de inicio a fin",
  "dataIo": { "inputs": ["Entradas"], "outputs": ["Salidas"] },
  "designPatterns": [
    { "pattern": "Nombre del patrón", "location": "Archivo y contexto", "purpose": "Propósito" }
  ],
  "architecturalSmells": ["Smell 1 con archivo", "Smell 2"],
  "technicalRisks": ["Riesgo 1 con impacto", "Riesgo 2"],
  "technicalDebt": ["Ítem de deuda técnica 1", "Ítem 2"],
  "improvementOpportunities": ["Oportunidad de modernización 1", "Oportunidad 2"]
}`;
            break;

        // -------------------------------------------------------------
        // 2. PRODUCT REQUIREMENTS DOCUMENT (PRD)
        // -------------------------------------------------------------
        case 'prd':
            specificInstructions = `Genera un Product Requirements Document (PRD) profesional para el producto.
El documento debe contener:
- Resumen ejecutivo del producto.
- Problema concreto que resuelve y justificación de negocio.
- Objetivos cuantificables del producto.
- Personas y usuarios objetivo identificados.
- Casos de uso de alto nivel (CU-01, CU-02...).
- Historias de usuario completas con criterios de aceptación en formato Given-When-Then.
- Requisitos funcionales detallados (RF-001, RF-002...) con prioridad.
- Requisitos no funcionales (RNF-001...) con métricas verificables (Rendimiento, Disponibilidad, Seguridad).
- Restricciones técnicas y operativas comprobadas.
- Métricas de éxito (KPIs) recomendadas.
- Matriz de riesgos de producto y mitigaciones.
- Alcance actual (In-Scope) y exclusiones explícitas (Out-of-Scope).`;

            responseSchemaGuide = `Formato de salida requerido: Objeto JSON estricto con la siguiente estructura:
{
  "executiveSummary": "Resumen ejecutivo del producto",
  "problemStatement": "Problema que resuelve",
  "objectives": ["Objetivo 1", "Objetivo 2"],
  "targetUsers": [
    { "role": "Rol de usuario", "description": "Perfil y necesidades", "painPoints": "Dolores resueltos" }
  ],
  "useCases": [
    { "id": "CU-01", "name": "Nombre del caso de uso", "actor": "Actor", "description": "Descripción", "flow": "Flujo principal" }
  ],
  "userStories": [
    { "id": "US-01", "asA": "Como...", "iWant": "Quiero...", "soThat": "Para...", "acceptanceCriteria": "Dado que... Cuando... Entonces..." }
  ],
  "functionalRequirements": [
    { "id": "RF-001", "title": "Título", "description": "Descripción verificable", "priority": "Alta | Media | Baja" }
  ],
  "nonFunctionalRequirements": [
    { "id": "RNF-001", "category": "Rendimiento | Seguridad | Escalabilidad", "requirement": "Requisito con métrica", "metric": "Valor medible" }
  ],
  "constraints": ["Restricción técnica o de diseño 1"],
  "successMetrics": ["Métrica / KPI 1"],
  "risks": [
    { "risk": "Riesgo", "impact": "Alto | Medio", "mitigation": "Estrategia de mitigación" }
  ],
  "scope": {
    "inScope": ["Funcionalidad incluida 1"],
    "outOfScope": ["Exclusión 1"]
  }
}`;
            break;

        // -------------------------------------------------------------
        // 3. SOFTWARE REQUIREMENTS SPECIFICATION (IEEE 830)
        // -------------------------------------------------------------
        case 'srs':
            specificInstructions = `Genera una Especificación de Requisitos de Software siguiendo el estándar IEEE 830 como referencia formal.
Estructura obligatoria:
1. Introducción: Propósito, Alcance del sistema, Definiciones y Acrónimos.
2. Descripción General: Perspectiva del producto, Funciones generales del sistema, Características de usuarios, Restricciones de diseño e implementación.
3. Requisitos Específicos:
   - Requisitos de Interfaces Externas (Interfaces de usuario, interfaces de hardware, interfaces de software, interfaces de comunicación).
   - Requisitos Funcionales con estructura: ID (RF-xxx), Nombre, Descripción técnica, Prioridad (Alta/Media/Baja), Evidencia en código (archivo), y Criterio de Verificación.
   - Requisitos de Rendimiento (tiempos de respuesta, concurrencia).
   - Atributos de Calidad del Software (Fiabilidad, Disponibilidad, Seguridad, Mantenibilidad, Portabilidad).
   - Casos de prueba de verificación para cada requisito.`;

            responseSchemaGuide = `Formato de salida requerido: Objeto JSON estricto con la siguiente estructura:
{
  "introduction": {
    "purpose": "Propósito del documento SRS",
    "scope": "Alcance del software especificado",
    "definitions": [
      { "term": "Término", "definition": "Definición técnica" }
    ]
  },
  "generalDescription": {
    "productPerspective": "Perspectiva del producto en su ecosistema",
    "productFunctions": ["Función principal 1", "Función principal 2"],
    "userCharacteristics": ["Perfil técnico de usuarios"],
    "generalConstraints": ["Restricciones de diseño"]
  },
  "specificRequirements": [
    {
      "id": "SRS-RF-001",
      "name": "Nombre del requisito",
      "description": "Descripción formal completa",
      "priority": "Alta | Media | Baja",
      "evidenceSource": "Ruta de archivo o módulo",
      "verificationMethod": "Inspección | Prueba Unitaria | Demostración | Análisis"
    }
  ],
  "performanceRequirements": ["Requisito de rendimiento 1"],
  "qualityAttributes": {
    "reliability": "Fiabilidad esperada",
    "availability": "Disponibilidad de servicio",
    "security": "Requisitos de seguridad y control de acceso",
    "maintainability": "Mantenibilidad y modularidad",
    "portability": "Portabilidad y despliegue"
  }
}`;
            break;

        // -------------------------------------------------------------
        // 4. SOFTWARE ARCHITECTURE (C4 & MERMAID)
        // -------------------------------------------------------------
        case 'architecture':
            specificInstructions = `Elabora la documentación de arquitectura de software para el sistema.
Debe incluir:
- Visión general de arquitectura y capas detectadas (Presentación, Aplicación, Dominio, Datos).
- Diagrama C4 Nivel 1: Contexto del Sistema (en sintaxis Mermaid válida).
- Diagrama C4 Nivel 2: Contenedores (Frontend, API Gateway, Backend Workers, DBs).
- Diagrama C4 Nivel 3: Componentes principales del backend (controladores, servicios, repositorios).
- Descripción detallada de responsabilidades de cada componente y sus interfaces de comunicación.
- Matriz de Decisiones de Arquitectura (ADR) identificadas en el código.
- Evaluación de escalabilidad, rendimiento y puntos de fallo único (SPOF).
- Riesgos arquitectónicos detectados.`;

            responseSchemaGuide = `Formato de salida requerido: Objeto JSON estricto con la siguiente estructura:
{
  "architectureOverview": "Descripción narrativa de la arquitectura de software y estilo",
  "layers": [
    { "name": "Nombre de la Capa", "description": "Propósito", "modules": ["módulo 1", "módulo 2"] }
  ],
  "c4ContextMermaid": "flowchart TD o C4Context en sintaxis Mermaid válida",
  "c4ContainerMermaid": "flowchart TD de Contenedores en sintaxis Mermaid válida",
  "c4ComponentMermaid": "flowchart TD de Componentes en sintaxis Mermaid válida",
  "componentResponsibilities": [
    { "component": "Componente", "responsibility": "Responsabilidad", "protocols": "Protocolos" }
  ],
  "architecturalDecisions": [
    { "id": "ADR-001", "decision": "Decisión observada", "context": "Contexto", "consequences": "Consecuencias" }
  ],
  "scalabilityAssessment": "Análisis de escalabilidad vertical/horizontal",
  "spofRisks": ["Punto de fallo único 1 con mitigación"]
}`;
            break;

        // -------------------------------------------------------------
        // 5. EVENT-DRIVEN ARCHITECTURE (EDA)
        // -------------------------------------------------------------
        case 'eda':
            specificInstructions = `Audita exhaustivamente las capacidades de Arquitectura Orientada a Eventos (EDA) del repositorio.
Analiza con rigor:
1. Productores de eventos (dónde y cómo se emiten eventos en el código).
2. Consumidores / Workers (qué componentes escuchan y procesan tareas).
3. Bus de eventos o mecanismo de mensajería (EventBus en memoria, Redis, Supabase, RabbitMQ, Kafka).
4. Catálogo de tipos de eventos y contratos de eventos implementados.
5. Estructura de payloads de eventos (event_id, event_type, aggregate_id, correlation_id, causation_id, timestamp, status).
6. Persistencia de eventos (Event Store) y soporte de Event Sourcing o Outbox Pattern.
7. Mecanismos de reintentos con backoff exponencial.
8. Control de idempotencia y prevención de eventos duplicados.
9. Dead Letter Queue (DLQ) para gestión de fallos fatales no recuperables.
10. Diagrama de flujo y secuencia de eventos en formato Mermaid validado.
Si el repositorio NO tiene arquitectura EDA implementada, indícalo claramente de forma directa y profesional sin usar etiquetas entre corchetes.`;

            responseSchemaGuide = `Formato de salida requerido: Objeto JSON estricto con la siguiente estructura:
{
  "isEdaImplemented": true o false,
  "edaMaturityLevel": "Básico (Eventos en memoria) | Intermedio (Event Store + Reintentos) | Avanzado (Broker distribuido + DLQ) | No implementado",
  "eventProducers": [
    { "name": "Productor", "eventEmitted": "nombre.evento", "file": "ruta/archivo" }
  ],
  "eventConsumers": [
    { "name": "Consumidor / Worker", "eventHandled": "nombre.evento", "responsibility": "Responsabilidad" }
  ],
  "eventBusEngine": "Mecanismo de mensajería detectado o 'No detectado'",
  "eventContracts": [
    { "eventType": "nombre.evento", "version": "1.0", "description": "Propósito", "payloadSample": "{ ... }" }
  ],
  "traceability": {
    "supportsCorrelationId": true o false,
    "supportsCausationId": true o false,
    "notes": "Detalles de trazabilidad observados"
  },
  "resilience": {
    "retriesWithBackoff": true o false,
    "idempotencyControl": true o false,
    "deadLetterQueue": true o false
  },
  "eventSequenceMermaid": "sequenceDiagram en sintaxis Mermaid válida ilustrando el ciclo de eventos",
  "architecturalRecommendations": ["Recomendación EDA 1", "Recomendación EDA 2"]
}`;
            break;

        // -------------------------------------------------------------
        // 6. APPLICATION SECURITY (APPSEC & SAST)
        // -------------------------------------------------------------
        case 'security':
            specificInstructions = `Actúa como especialista de AppSec y audita la seguridad del repositorio sobre los 12 ejes normativos:
1. Gestión de secretos (API keys, credenciales hardcodeadas, llaves privadas).
2. Autenticación y autorización (flujos de login, JWT sin verificación, bypasses de rol).
3. Validación y sanitización de entradas (Zod, Joi, express-validator, inyección de tipos).
4. Protección contra inyecciones (SQLi, XSS, Command Injection, Deserialización insegura).
5. Seguridad de APIs (CORS restrictivo vs wildcard, SSRF, rate limiting).
6. Configuración de servidores (Helmet, HSTS, CSP, banner masking).
7. Seguridad de dependencias (paquetes obsoletos, comodines '*', lockfile).
8. Protección de datos y privacidad (hashing MD5/SHA-1 obsoleto, logs con credenciales).
9. Gestión de sesiones (cookies con HttpOnly, Secure, SameSite).
10. Manejo de errores y exposición de información (fuga de stack traces).
11. Seguridad de infraestructura y despliegue (.env versionado, modo debug).
12. Configuración de permisos y políticas de acceso (IDOR/BOLA).
Regla: Toda vulnerabilidad debe contar con evidencia verificable o ser calificada como 'Uso sospechoso / potencial'.`;

            responseSchemaGuide = `Formato de salida requerido: Objeto JSON estricto con la siguiente estructura:
{
  "executiveSecuritySummary": "Resumen ejecutivo del nivel de seguridad del software",
  "globalRiskLevel": "Bajo | Moderado | Alto | Crítico",
  "findings": [
    {
      "id": "SEC-VULN-001",
      "name": "Nombre técnico de la vulnerabilidad",
      "dimension": "Nombre de la dimensión afectada",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFO",
      "certainty": "Confirmado | Uso sospechoso / potencial",
      "file": "ruta/archivo",
      "line": 1,
      "evidenceSnippet": "Fragmento de código sanitizado",
      "impact": "Impacto técnico y de negocio",
      "likelihood": "Alta | Media | Baja",
      "recommendation": "Instrucción de mitigación concreta con código seguro",
      "verificationMethod": "Comando o prueba para verificar que la vulnerabilidad se resolvió"
    }
  ],
  "owaspComplianceChecklist": [
    { "category": "A01:2021-Broken Access Control", "status": "Cumple | Atención requerida", "notes": "Detalle" }
  ]
}`;
            break;

        // -------------------------------------------------------------
        // 7. QA TEST MATRIX & TESTING PLAN
        // -------------------------------------------------------------
        case 'qa':
            specificInstructions = `Genera una matriz técnica de pruebas de software profesional para el repositorio.
Debe abarcar:
- Estrategia global de pruebas y pirámide de testing (Unitarias, Integración, E2E, Seguridad).
- Casos de prueba específicos para cada módulo crítico del sistema (autenticación, controladores, transformadores de datos, persistencia).
- Cada caso de prueba debe tener: ID único (TC-001...), Módulo afectado, Objetivo específico, Precondiciones necesarias, Datos de entrada (payloads/parámetros), Pasos secuenciales de ejecución, Resultado esperado medible, Severidad/Prioridad, y Tipo de prueba.
- Dicotomía estricta: Indicar claramente el estado: "Diseñado / Propuesto" para pruebas generadas para el plan de calidad; NO marcar pruebas como "Ejecutadas" ni "Aprobadas" sin ejecución verificada.`;

            responseSchemaGuide = `Formato de salida requerido: Objeto JSON estricto con la siguiente estructura:
{
  "testStrategy": "Estrategia de calidad y alcance de testing del sistema",
  "testingPyramidDistribution": {
    "unit": "Porcentaje recomendado o detectado",
    "integration": "Porcentaje recomendado o detectado",
    "e2e": "Porcentaje recomendado o detectado"
  },
  "testCases": [
    {
      "id": "TC-001",
      "module": "Nombre del módulo",
      "objective": "Objetivo concreto de la prueba",
      "type": "Unitaria | Integración | E2E | Seguridad | Rendimiento",
      "priority": "Crítica | Alta | Media | Baja",
      "preconditions": "Precondiciones de entorno o base de datos",
      "inputData": "Datos de entrada o payload JSON",
      "steps": ["Paso 1", "Paso 2", "Paso 3"],
      "expectedResult": "Comportamiento y código de respuesta esperado",
      "status": "Diseñado / Propuesto"
    }
  ],
  "mockingGuidelines": "Estrategia recomendada para aislar dependencias externas (bases de datos, APIs de terceros)"
}`;
            break;

        // -------------------------------------------------------------
        // 8. OPENAPI 3.0.3 SPECIFICATION
        // -------------------------------------------------------------
        case 'openapi':
            specificInstructions = `Analiza los endpoints reales detectados en los routers y controladores del backend.
Construye una especificación OpenAPI 3.0.3 válida y completa.
Reglas estrictas:
- Reflejar EXCLUSIVAMENTE los endpoints que existan en el código analizado.
- Especificar métodos HTTP reales (GET, POST, PUT, DELETE, PATCH).
- Definir parámetros de consulta (query), de ruta (path) y cabeceras de autorización requeridas.
- Definir esquemas para requestBody cuando los endpoints reciban JSON.
- Detallar códigos de respuesta HTTP (200, 201, 400, 401, 403, 404, 500) con esquemas de error estructurados.
- Proveer ejemplos representativos para solicitudes y respuestas.
- Configurar esquemas de seguridad (BearerAuth / ApiKeyAuth) si el sistema utiliza tokens.`;

            responseSchemaGuide = `Formato de salida requerido: Objeto JSON estricto conforme a la especificación OpenAPI 3.0.3:
{
  "openapi": "3.0.3",
  "info": {
    "title": "API de ${analysisContext.projectName || 'Proyecto'}",
    "description": "Especificación formal OpenAPI 3.0.3 generada por DocuMind AI",
    "version": "1.0.0"
  },
  "servers": [
    { "url": "http://localhost:3000", "description": "Servidor de desarrollo local" }
  ],
  "paths": {
    "/ruta": {
      "metodo": {
        "summary": "Resumen de la operación",
        "description": "Descripción técnica",
        "parameters": [],
        "requestBody": {},
        "responses": {
          "200": { "description": "Respuesta exitosa", "content": { "application/json": { "schema": {} } } },
          "400": { "description": "Petición inválida" }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
    "schemas": {}
  }
}`;
            break;

        case 'c4':
            specificInstructions = `Genera la documentación completa del Modelo C4 (Nivel 1 Contexto, Nivel 2 Contenedores, Nivel 3 Componentes) fundamentada en los archivos reales del repositorio, sin utilizar etiquetas entre corchetes.`;
            responseSchemaGuide = `{ "c4Context": "...", "c4Container": "...", "c4Component": "...", "c4Mermaid": "flowchart TD\\n..." }`;
            break;

        case 'uml':
            specificInstructions = `Genera la especificación formal UML 2.5 de Clases, Secuencia y Actividad basada en los módulos y controladores reales del repositorio.`;
            responseSchemaGuide = `{ "classDiagram": "...", "sequenceDiagram": "...", "activityDiagram": "...", "umlNotes": "..." }`;
            break;

        case 'erd':
        case 'database':
            specificInstructions = `Extrae y documenta el Modelo Entidad-Relación (ERD) y el Diccionario de Datos completo (ISO/IEC 11179) a partir de los modelos y esquemas detectados.`;
            responseSchemaGuide = `{ "overview": "...", "erdMermaid": "erDiagram\\n...", "dataDictionary": [{ "table": "...", "field": "...", "type": "...", "description": "...", "required": true, "isPk": false }] }`;
            break;

        case 'devops':
        case 'deployment':
            specificInstructions = `Documenta la estrategia DevOps, pipeline CI/CD, variables de entorno, contenerización, despliegue productivo, healthchecks y rollback.`;
            responseSchemaGuide = `{ "ciCdPipeline": "...", "deploymentGuide": "...", "environmentVariables": [], "rollbackStrategy": "..." }`;
            break;

        case 'stride':
            specificInstructions = `Ejecuta un modelado de amenazas STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) sobre los componentes reales del sistema.`;
            responseSchemaGuide = `{ "methodology": "STRIDE", "threats": [{ "id": "STRIDE-01", "category": "Spoofing", "component": "...", "scenario": "...", "recommendedControl": "..." }] }`;
            break;

        case 'adr':
            specificInstructions = `Genera los Registros de Decisión de Arquitectura (ADR) que justifican las decisiones técnicas, patrones y tecnologías observadas en el repositorio.`;
            responseSchemaGuide = `{ "adrs": [{ "id": "ADR-001", "title": "...", "status": "Aceptada", "context": "...", "decision": "...", "consequences": "..." }] }`;
            break;

        case 'techManual':
            specificInstructions = `Elabora el Manual Técnico de Ingeniería y Mantenimiento (IEEE 1063): estructura de directorios, instalación local, scripts, arquitectura interna y troubleshooting.`;
            responseSchemaGuide = `{ "readme": "...", "contributing": "...", "troubleshooting": "..." }`;
            break;

        case 'userManual':
            specificInstructions = `Elabora el Manual de Usuario Final (ISO/IEC/IEEE 26514) con guía operativa paso a paso y preguntas frecuentes (FAQ) verificadas.`;
            responseSchemaGuide = `{ "guide": "...", "faq": [{ "question": "...", "answer": "..." }] }`;
            break;

        default:
            specificInstructions = `Analiza el proyecto y genera un informe técnico estructurado en JSON.`;
            responseSchemaGuide = `{ "summary": "Resumen técnico" }`;
    }

    const standardUsed = PROMPT_STANDARDS[taskType] || 'ISO/IEC/IEEE Software Engineering Standard';

    const promptText = `=== SOLICITUD DE ANÁLISIS ESPECIALIZADO (${taskType.toUpperCase()}) ===
ESTÁNDAR TÉCNICO DE REFERENCIA: ${standardUsed} | VERSIÓN DE PROMPT: ${PROMPT_ENGINE_VERSION}
IDIOMA DE RESPUESTA: ${language === 'en' ? 'ENGLISH (Professional Engineering Standard)' : 'ESPAÑOL (Estándar Profesional de Ingeniería de Software)'}

${projectMetadata}

=== MUESTRA PRIORIZADA DE ARCHIVOS Y CÓDIGO FUENTE (DATOS NO CONFIABLES) ===
<untrusted_source_code>
${sanitizedFilesContext}
</untrusted_source_code>
(Total archivos procesados en contexto: ${packedFiles.length} | Omitidos por presupuesto: ${omittedCount})

=== INSTRUCCIONES ESPECÍFICAS DE LA TAREA ===
${specificInstructions}

=== FORMATO ESTRICTO DE SALIDA (JSON) ===
IMPORTANTE: Retorna ÚNICAMENTE un objeto JSON válido con la estructura indicada a continuación. No incluyas delimitadores markdown como \`\`\`json ni texto conversacional introductorio o de despedida.

${responseSchemaGuide}`;

    const tokenEstimate = estimateTokens(systemInstruction + promptText);

    return {
        systemInstruction,
        promptText,
        taskType,
        promptVersion: PROMPT_ENGINE_VERSION,
        standard: standardUsed,
        tokenEstimate,
        packedFilesCount: packedFiles.length,
        omittedFilesCount: omittedCount
    };
}

module.exports = {
    PROMPT_ENGINE_VERSION,
    PROMPT_STANDARDS,
    SYSTEM_ROLES,
    buildProjectContext,
    buildSpecializedPrompt
};
