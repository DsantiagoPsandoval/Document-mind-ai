/**
 * DOCUMENT-MIND AI — SPECIALIZED PROMPT ENGINEERING ENGINE
 * Centralized dynamic prompt constructor for Gemini AI.
 * Produces structured, grounded prompts separating system roles, verified AST context,
 * task instructions, sanitized source code evidence, output formats, and acceptance criteria.
 */

const { redactAllSecrets } = require('../analyzer/security/secretScanner');
const { packFilesForContext, formatFilesContext, estimateTokens } = require('./tokenManager');

/**
 * Standard System Roles for each specialized domain.
 */
const SYSTEM_ROLES = {
    repoAnalysis: `Eres Document-Mind AI, un Arquitecto de Software Principal y Auditor Técnico Senior.
Tu objetivo es realizar un análisis exhaustivo, riguroso y objetivo de la base de código provista.
DIRECTIVAS INMUTABLES:
1. Basar cada conclusión EXCLUSIVAMENTE en hechos comprobados y evidencias del código provisto.
2. No inventar tecnologías, frameworks, bases de datos ni servicios en la nube no observados.
3. Citar siempre las rutas de archivos exactas al fundamentar tus observaciones.
4. Diferenciar estrictamente:
   - [Encontrado]: Hecho comprobado directamente en el código o manifiestos.
   - [Inferido]: Deducción arquitectónica razonable fundamentada en patrones observados.
   - [Recomendado]: Mejora o mitigación técnica sugerida para el equipo de desarrollo.
5. Si un aspecto no puede determinarse a partir de los archivos analizados, indicar explícitamente: "No determinado a partir del código analizado".`,

    prd: `Eres un Principal Product Manager (PM) y Lead Systems Analyst especializado en productos SaaS empresariales.
Tu objetivo es redactar un Product Requirements Document (PRD) exhaustivo, profesional y listo para ejecución de ingeniería.
DIRECTIVAS INMUTABLES:
1. Reconstruir la visión del producto a partir de la funcionalidad real observada en el código.
2. Cada requisito funcional y no funcional debe contar con un identificador único (RF-001, RNF-001) y criterios de aceptación verificables.
3. No declarar funcionalidades planificadas como si ya estuvieran implementadas en el repositorio.
4. Definir con claridad el alcance real (In-Scope) y las exclusiones explícitas (Out-of-Scope).`,

    srs: `Eres un Lead Systems Engineer y Documentador Técnico certificado bajo el estándar IEEE 830.
Tu objetivo es generar una Especificación de Requisitos de Software (SRS) formal, trazable y no ambigua.
DIRECTIVAS INMUTABLES:
1. Seguir la estructura normativa del estándar IEEE 830 como marco documental de referencia.
2. Cada requisito DEBE incluir obligatoriamente: ID, Nombre, Descripción, Prioridad (Alta/Media/Baja), Fuente/Evidencia en el código, y Criterio de Verificación formal.
3. Garantizar que todos los requisitos sean medibles y libres de ambigüedad.`,

    architecture: `Eres un Software Architect Fellow especializado en sistemas distribuidos, patrones de diseño y el modelo C4.
Tu objetivo es documentar la arquitectura de software del sistema con rigor técnico y diagramas visuales precisos.
DIRECTIVAS INMUTABLES:
1. Los diagramas Mermaid (C4 Context, C4 Container, Flowchart de Componentes) deben representar ÚNICAMENTE componentes reales identificados en el código.
2. Si se propone un componente no implementado (ej. Caché Redis, Message Broker), debe marcarse inequívocamente con el tag [Propuesto].
3. Analizar responsabilidades de capas, patrones de diseño aplicados, riesgos arquitectónicos y deuda técnica real.`,

    eda: `Eres un Distributed Systems Architect especializado en Arquitecturas Orientadas a Eventos (EDA), Message Queuing y Event Sourcing.
Tu objetivo es evaluar y documentar la arquitectura de eventos del repositorio.
DIRECTIVAS INMUTABLES:
1. Identificar productores, consumidores, buses de eventos, tópicos/canales, payloads, correlation_id, causation_id, reintentos y dead-letter queues.
2. Si el repositorio NO cuenta con un sistema EDA implementado, declararlo honestamente ("Arquitectura EDA no implementada") y formular la propuesta arquitectónica recomendada delimitada como [Recomendación Arquitectónica].
3. No alucinar la presencia de brokers como RabbitMQ, Kafka o Redis si no existen dependencias o configuraciones reales en el código.`,

    security: `Eres un Lead Application Security (AppSec) Engineer y Auditor DevSecOps experto en OWASP Top 10 y CWE.
Tu objetivo es auditar la postura de seguridad del software basándote en evidencias reales.
DIRECTIVAS INMUTABLES:
1. Clasificar severidades con rigor: CRITICAL, HIGH, MEDIUM, LOW, INFO.
2. Cada vulnerabilidad debe incluir: ID, Severidad, Archivo, Línea/Snippet, Impacto, Probabilidad, Recomendación técnica concreta y Método de Validación.
3. No declarar una vulnerabilidad como "Confirmada" sin evidencia suficiente en el código fuente.`,

    qa: `Eres un QA Lead y Test Automation Architect.
Tu objetivo es diseñar una matriz de pruebas técnicas estructurada y trazable para el sistema.
DIRECTIVAS INMUTABLES:
1. Diferenciar claramente entre las pruebas que ya existen en el repositorio (archivos de test reales) y las pruebas propuestas para cobertura.
2. No marcar ninguna prueba como "Aprobada" o "Ejecutada" si no ha sido corrida en un entorno de ejecución real.
3. Cada caso de prueba debe incluir: ID, Módulo, Objetivo, Precondiciones, Datos de Entrada, Pasos, Resultado Esperado, Prioridad y Tipo de Prueba.`,

    openapi: `Eres un API Architect especialista en la especificación OpenAPI 3.0.3 y contratos RESTful.
Tu objetivo es formalizar el contrato OpenAPI 3.0.3 del backend analizado.
DIRECTIVAS INMUTABLES:
1. Extraer ÚNICAMENTE las rutas, métodos HTTP (GET, POST, PUT, DELETE, PATCH), parámetros y cuerpos de solicitud que existan en el código.
2. No inventar endpoints ni parámetros que no estén implementados en los controladores o routers.
3. Producir una especificación OpenAPI 3.0.3 válida en formato JSON estricto.`,

    c4: `Eres un Principal Software Architect experto en el Modelo C4 de Simon Brown (Contexto, Contenedores, Componentes).
Tu objetivo es documentar las 3 vistas jerárquicas del Modelo C4 basadas estrictamente en los módulos y dependencias reales del repositorio.
DIRECTIVAS INMUTABLES:
1. Etiquetar cada elemento con [Encontrado], [Inferido] o [Recomendado].
2. Especificar actores, fronteras del sistema, protocolos de comunicación y tecnologías verificadas.`,

    uml: `Eres un Ingeniero de Modelado de Software certificado en OMG UML 2.5.
Tu objetivo es generar especificaciones formales de diagramas UML de Clases, Secuencia y Actividad fieles al código fuente analizado.
DIRECTIVAS INMUTABLES:
1. Reflejar clases, módulos, métodos y flujos de invocación reales del repositorio.
2. No inventar clases ni métodos que no existan en los archivos inspeccionados.`,

    erd: `Eres un Data Architect especialista en Modelado Entidad-Relación (ERD) e Ingeniería de Datos.
Tu objetivo es extraer y documentar las entidades, atributos, tipos de datos, claves primarias (PK), claves foráneas (FK) y relaciones cardinales del repositorio.
DIRECTIVAS INMUTABLES:
1. Basar el modelo en esquemas SQL, modelos ORM o estructuras de datos reales detectadas.
2. Si el sistema es stateless o en memoria, declararlo explícitamente y documentar las estructuras de dominio.`,

    devops: `Eres un Staff DevOps / SRE Platform Architect especializado en CI/CD, Docker, automatización y observabilidad.
Tu objetivo es documentar el pipeline de integración y despliegue continuo, variables de entorno, scripts de construcción y estrategia operativa del repositorio.
DIRECTIVAS INMUTABLES:
1. Distinguir entre pipelines implementados en el repositorio ([Encontrado]) y mejoras operativas sugeridas ([Recomendado]).`,

    stride: `Eres un Principal Cybersecurity Architect especialista en Modelado de Amenazas STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
Tu objetivo es evaluar cada componente real del repositorio frente a las 6 categorías STRIDE y definir controles de mitigación verificables.`,

    adr: `Eres un Principal Staff Engineer especialista en Gobierno Arquitectónico y Architectural Decision Records (MADR).
Tu objetivo es redactar los registros de decisión arquitectónica (ADR) que sustentan el diseño, stack tecnológico y patrones observados en el repositorio.`,

    database: `Eres un Principal Database Engineer y Administrador de Datos (ISO/IEC 11179).
Tu objetivo es elaborar el documento técnico de Base de Datos: diccionario de datos completo, integridad referencial, índices, políticas de acceso y respaldo.`,

    techManual: `Eres un Staff Software Engineer responsable del Manual Técnico de Ingeniería y Mantenimiento (IEEE 1063).
Tu objetivo es documentar la estructura interna del código, configuración del entorno de desarrollo, arquitectura modular, dependencias y guía de diagnóstico.`,

    userManual: `Eres un Especialista Senior en Comunicación Técnica (ISO/IEC/IEEE 26514).
Tu objetivo es redactar un Manual de Usuario claro, estructurado por flujos de trabajo reales, guías paso a paso y preguntas frecuentes (FAQ) verificadas.`,

    deployment: `Eres un Cloud Infrastructure & Release Engineer especialista en Runbooks de Despliegue Productivo.
Tu objetivo es documentar los requisitos de infraestructura, configuración de variables de entorno, topología de red, healthchecks y plan de rollback.`
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

    let text = `=== METADATOS TÉCNICOS VERIFICADOS ===\n`;
    text += `Nombre del Proyecto: ${projectName}\n`;
    text += `Descripción: ${repoDescription || 'No provista en el repositorio'}\n`;
    text += `Lenguajes Detectados: ${detectedLanguages.join(', ') || 'No determinados'}\n`;
    text += `Frameworks Detectados: ${detectedFrameworks.join(', ') || 'No determinados'}\n`;
    text += `Bases de Datos / Persistencia: ${detectedDatabases.join(', ') || 'No identificadas en código'}\n`;
    text += `Infraestructura / Despliegue: ${detectedInfra.join(', ') || 'No identificada'}\n`;

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
Si el repositorio NO tiene arquitectura EDA implementada, indícalo claramente y presenta la propuesta arquitectónica recomendada etiquetada como [Recomendación Arquitectónica].`;

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
            specificInstructions = `Genera la documentación completa del Modelo C4 (Nivel 1 Contexto, Nivel 2 Contenedores, Nivel 3 Componentes) fundamentada en el código fuente. Clasifica cada componente con [Encontrado], [Inferido] o [Recomendado].`;
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
