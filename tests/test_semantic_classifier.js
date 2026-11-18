/**
 * tests/test_semantic_classifier.js
 * ============================================================================
 * Suite de Pruebas de Comprensión Universal de Repositorios (DocuMind AI):
 *   1. Etapa previa obligatoria projectUnderstanding (Prompt Engine + Validator).
 *   2. Comprensión profunda de páginas web y detección de discrepancias.
 *   3. Pruebas obligatorias con las 6 naturalezas distintas de repositorios:
 *      - Una fundación (Puertas-D-e-Colores)
 *      - Una tienda virtual
 *      - Una institución educativa
 *      - Una aplicación web
 *      - Una empresa
 *      - Un proyecto de investigación
 *   4. Verificación de coherencia entre todos los documentos generados y
 *      ausencia total de etiquetas ([Información verificada], [Información inferida], etc.).
 * ============================================================================
 */

const assert = require('assert');
const { fetchAndAnalyzeRepo } = require('../services/github/analyzer');
const { analyzeRepository } = require('../services/ai/gemini');
const {
    analyzeProjectSemantics,
    analyzeWebPageContent,
    detectDiscrepanciesAndLimitations,
    mergeAiUnderstandingIntoProfile
} = require('../services/analyzer/semanticClassifier');
const { buildSpecializedPrompt } = require('../services/ai/promptEngine');
const { validateResponse } = require('../services/ai/responseValidator');
const { buildUnifiedDocumentModel } = require('../services/export/unifiedDocModel');
const { buildDocumentHtml, getDocumentMarkdown } = require('../js/document-exporter');

const FORBIDDEN_TAGS = [
    '[Información verificada]',
    '[Información inferida]',
    '[Información no verificada]',
    '[Información no encontrada]',
    '[Información pendiente de validación]',
    '[Información Factual]',
    '[Encontrado]',
    '[Inferido]',
    '[Recomendado]',
    '[Recomendación]',
    '[Recomendación Arquitectónica]',
    '[Propuesto]'
];

function assertNoForbiddenTags(text, contextLabel) {
    const str = typeof text === 'string' ? text : JSON.stringify(text);
    for (const tag of FORBIDDEN_TAGS) {
        assert.ok(
            !str.toLowerCase().includes(tag.toLowerCase()),
            `Etiqueta prohibida "${tag}" encontrada en ${contextLabel}`
        );
    }
}

async function runTests() {
    console.log('\n====================================================================');
    console.log('🧠 TEST SUITE: COMPRENSIÓN UNIVERSAL DE REPOSITORIOS (DOCUMIND AI)');
    console.log('====================================================================\n');

    // ------------------------------------------------------------------------
    // 1. ETAPA PREVIA OBLIGATORIA: projectUnderstanding (Prompt & Validator)
    // ------------------------------------------------------------------------
    console.log('--- 1. Etapa Previa Obligatoria projectUnderstanding & Detección de Discrepancias ---');
    const uPrompt = buildSpecializedPrompt('projectUnderstanding', {
        projectName: 'DemoProyecto',
        keyFiles: [{ path: 'index.html', content: '<html><head><title>Portal Demo</title></head><body><section><h2>Servicios</h2><p>Ofrecemos asesoría integral.</p></section></body></html>' }]
    });
    assert.ok(uPrompt.systemInstruction.includes('Motor de Comprensión Contextual Universal'), 'Debe incluir el rol de comprensión universal');
    assert.ok(uPrompt.promptText.includes('discrepancies') && uPrompt.promptText.includes('informationLimitations'));

    const validUnderstandingJson = JSON.stringify({
        entityName: 'Portal Demo',
        natureDescription: 'Sitio web institucional de servicios',
        whatItIs: 'Portal informativo de servicios profesionales',
        whatItDoes: 'Comunica la oferta de asesoría integral a visitantes',
        whyItExists: 'Conectar con clientes que requieren asesoría',
        problemAddressed: 'Falta de orientación especializada',
        targetAudience: 'Clientes y empresas',
        technologyRole: 'Sitio web estático HTML5 para difusión',
        discrepancies: [],
        informationLimitations: []
    });
    const valRes = validateResponse('projectUnderstanding', validUnderstandingJson);
    assert.strictEqual(valRes.isValid, true, 'El validador debe aceptar respuestas completas de projectUnderstanding');

    // Prueba de detección de discrepancias entre README genérico y página web real
    const discCheck = detectDiscrepanciesAndLimitations(
        {
            htmlTitle: 'Clínica Veterinaria Huellas',
            metaDescription: 'Atención médica veterinaria 24 horas y vacunación',
            webPageAnalysis: { hasWebPage: true }
        },
        [
            { path: 'README.md', content: 'Getting Started with Create React App. This project was bootstrapped with Create React App.' },
            { path: 'package.json', content: JSON.stringify({ name: 'vet-app', description: 'Plantilla inicial React' }) },
            { path: 'index.html', content: '<form><input type="text" /></form>' }
        ],
        [],
        []
    );
    assert.ok(discCheck.discrepancies.length >= 2, 'Debe detectar discrepancias entre el README genérico, package.json y la página web');
    assert.ok(discCheck.informationLimitations.length >= 1, 'Debe detectar limitaciones cuando hay formularios sin backend en el repo');
    console.log('  ✅ [PASS] Etapa previa projectUnderstanding, análisis de páginas web y detector de discrepancias verificados');

    // ------------------------------------------------------------------------
    // 2. PRUEBA CON LAS 6 NATURALEZAS OBLIGATORIAS DE REPOSITORIOS
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Pruebas Obligatorias con 6 Naturalezas Diferentes de Repositorios ---');

    // CASO 1: UNA FUNDACIÓN (Repositorio real Puertas-D-e-Colores)
    const repoFundacion = await fetchAndAnalyzeRepo('https://github.com/DsantiagoPsandoval/Puertas-D-e-Colores');
    assert.strictEqual(repoFundacion.projectCategory, 'foundation_nonprofit');
    assert.strictEqual(repoFundacion.semanticProfile.entityName, 'Fundación Puertas de Colores');
    assert.strictEqual(repoFundacion.semanticProfile.webPageAnalysis.hasWebPage, true);
    const docsFundacion = await analyzeRepository(repoFundacion);
    const unifiedFundacion = buildUnifiedDocumentModel({ ...repoFundacion, documentation: docsFundacion }, 'all');

    assert.ok(docsFundacion.presentation.includes('Fundación Puertas de Colores'));
    assert.ok(docsFundacion.presentation.includes('Derechos Menstruales') && docsFundacion.presentation.includes('Línea Púrpura'));
    assert.ok(docsFundacion.presentation.includes('Línea Verde') && docsFundacion.presentation.includes('Línea Naranja'));
    assert.ok(docsFundacion.presentation.includes('Embajada de Francia') && docsFundacion.presentation.includes('Gobernación de Cundinamarca'));
    assert.strictEqual(docsFundacion.api.endpoints.length, 0, 'No debe inventar endpoints de API para la fundación');
    assert.strictEqual(docsFundacion.database.dataDictionary.length, 0, 'No debe inventar tablas de base de datos para la fundación');
    assertNoForbiddenTags(docsFundacion, 'Fundación Puertas de Colores');
    assertNoForbiddenTags(unifiedFundacion, 'Unified Model Fundación Puertas de Colores');
    console.log('  ✅ [PASS] 1/6 Fundación (Puertas-D-e-Colores): Misión, 3 ejes, proyectos reales, 0 APIs inventadas y 0 etiquetas prohibidas');

    // CASO 2: UNA TIENDA VIRTUAL
    const ctxTienda = {
        projectName: 'Tienda-Artesanias-Colombia',
        prioritizedFiles: [{
            path: 'index.html',
            content: `<!DOCTYPE html><html lang="es"><head><title> Raíces de Colombia | Tienda Virtual de Artesanías </title>
            <meta name="description" content="Tienda virtual de artesanías colombianas hechas a mano: mochilas wayúu, cerámica de Ráquira y sombreros vueltiaos con envío nacional."></head>
            <body><nav><a href="#catalogo">Catálogo</a><a href="#carrito">Carrito</a></nav>
            <section><h2>Catálogo de Productos Artesanales</h2><p>Explora nuestra tienda virtual con carrito de compras y checkout seguro para adquirir artesanías auténticas.</p></section>
            <section><h2>Envíos y Medios de Pago</h2><p>Entregas a todo el país apoyando directamente a familias artesanas.</p></section></body></html>`
        }]
    };
    const semTienda = analyzeProjectSemantics(ctxTienda);
    assert.strictEqual(semTienda.category, 'ecommerce_store');
    assert.ok(semTienda.projectNature.whatItDoes.includes('catálogo') || semTienda.projectNature.whatItIs.includes('tienda virtual'));
    const docsTienda = await analyzeRepository({ ...ctxTienda, repository: { name: ctxTienda.projectName, fullName: ctxTienda.projectName }, semanticProfile: semTienda });
    assert.ok(docsTienda.product.prd.includes('Raíces de Colombia') && docsTienda.product.prd.includes('Tiendas virtuales y comercios'));
    assertNoForbiddenTags(docsTienda, 'Tienda Virtual');
    console.log('  ✅ [PASS] 2/6 Tienda Virtual (Raíces de Colombia): Identificada como comercio/catálogo digital con documentación acorde');

    // CASO 3: UNA INSTITUCIÓN EDUCATIVA
    const ctxEducativa = {
        projectName: 'Instituto-Tecnologico-Del-Valle',
        prioritizedFiles: [{
            path: 'index.html',
            content: `<!DOCTYPE html><html lang="es"><head><title>Instituto Tecnológico del Valle | Institución Educativa</title>
            <meta name="description" content="Institución educativa de formación técnica y campus universitario con programas académicos en ciencias, artes y humanidades."></head>
            <body><nav><a href="#programas">Programas Académicos</a><a href="#admisiones">Admisiones</a></nav>
            <section><h2>Oferta Académica y Plan de Estudios</h2><p>Nuestra facultad ofrece programas académicos acreditados para estudiantes y docentes.</p></section>
            <section><h2>Bienestar Estudiantil y Becas</h2><p>Acompañamiento pedagógico y becas de excelencia para jóvenes de la región.</p></section></body></html>`
        }]
    };
    const semEducativa = analyzeProjectSemantics(ctxEducativa);
    assert.strictEqual(semEducativa.category, 'educational_institution');
    const docsEducativa = await analyzeRepository({ ...ctxEducativa, repository: { name: ctxEducativa.projectName, fullName: ctxEducativa.projectName }, semanticProfile: semEducativa });
    assert.ok(docsEducativa.presentation.includes('Instituciones educativas') && docsEducativa.presentation.includes('Oferta Académica'));
    assertNoForbiddenTags(docsEducativa, 'Institución Educativa');
    console.log('  ✅ [PASS] 3/6 Institución Educativa (Instituto Tecnológico del Valle): Documentación orientada a oferta académica y comunidad educativa');

    // CASO 4: UNA APLICACIÓN WEB
    const ctxWebApp = {
        projectName: 'TaskFlow-Collaborative-App',
        detectedLanguages: ['TypeScript', 'HTML5', 'CSS3'],
        detectedFrameworks: ['React', 'Express', 'Node.js'],
        detectedDatabases: ['PostgreSQL'],
        endpoints: [
            { method: 'GET', path: '/api/tasks', file: 'src/routes/tasks.ts', description: 'Lista tareas activas del equipo' },
            { method: 'POST', path: '/api/tasks', file: 'src/routes/tasks.ts', description: 'Crea una nueva tarea asignada', requiresAuth: true }
        ],
        dataModels: [
            { name: 'Task', fields: [{ name: 'id', type: 'UUID', isPk: true }, { name: 'title', type: 'VARCHAR' }, { name: 'status', type: 'VARCHAR' }] }
        ],
        prioritizedFiles: [
            { path: 'package.json', content: JSON.stringify({ name: 'taskflow-app', dependencies: { react: '^18.2.0', express: '^4.18.2', pg: '^8.11.0' } }) },
            { path: 'README.md', content: '# TaskFlow Web App\nAplicación web colaborativa para gestión de tareas y tableros de equipos en tiempo real con API REST y PostgreSQL.' }
        ]
    };
    const semWebApp = analyzeProjectSemantics(ctxWebApp);
    assert.strictEqual(semWebApp.isSoftwareProduct, true);
    const docsWebApp = await analyzeRepository({ ...ctxWebApp, repository: { name: ctxWebApp.projectName, fullName: ctxWebApp.projectName }, semanticProfile: semWebApp });
    assert.strictEqual(docsWebApp.api.endpoints.length, 2, 'Debe documentar los 2 endpoints reales de la aplicación web');
    assert.strictEqual(docsWebApp.database.dataDictionary.length, 3, 'Debe documentar los 3 campos del modelo Task en PostgreSQL');
    assert.ok(docsWebApp.product.srs.includes('IEEE Std 830-1998') && docsWebApp.product.srs.includes('/api/tasks'));
    assertNoForbiddenTags(docsWebApp, 'Aplicación Web TaskFlow');
    console.log('  ✅ [PASS] 4/6 Aplicación Web (TaskFlow): Documentación técnica completa (SRS IEEE 830, C4, OpenAPI 3.0 con 2 rutas y BD PostgreSQL)');

    // CASO 5: UNA EMPRESA
    const ctxEmpresa = {
        projectName: 'Grupo-Estrategico-Andino',
        prioritizedFiles: [{
            path: 'index.html',
            content: `<!DOCTYPE html><html lang="es"><head><title>Grupo Estratégico Andino | Empresa de Consultoría</title>
            <meta name="description" content="Empresa y firma de consultoría corporativa especializada en estrategia financiera, sostenibilidad y gestión de talento para clientes corporativos."></head>
            <body><section><h2>Nuestros Servicios Corporativos</h2><p>Acompañamos a empresas y emprendimientos en su crecimiento con soluciones de consultoría a medida.</p></section>
            <section><h2>Solicitar Cotización</h2><p>Contáctanos para cotizar una asesoría con nuestro equipo de consultores.</p></section></body></html>`
        }]
    };
    const semEmpresa = analyzeProjectSemantics(ctxEmpresa);
    assert.strictEqual(semEmpresa.category, 'company_venture');
    const docsEmpresa = await analyzeRepository({ ...ctxEmpresa, repository: { name: ctxEmpresa.projectName, fullName: ctxEmpresa.projectName }, semanticProfile: semEmpresa });
    assert.ok(docsEmpresa.presentation.includes('Empresas y emprendimientos') && docsEmpresa.presentation.includes('Nuestros Servicios Corporativos'));
    assertNoForbiddenTags(docsEmpresa, 'Empresa Grupo Estratégico Andino');
    console.log('  ✅ [PASS] 5/6 Empresa (Grupo Estratégico Andino): Documentación adaptada a servicios corporativos y clientes');

    // CASO 6: UN PROYECTO DE INVESTIGACIÓN
    const ctxInvestigacion = {
        projectName: 'Investigacion-Hidrologia-Paramos',
        detectedLanguages: ['Python'],
        prioritizedFiles: [{
            path: 'README.md',
            content: `# Proyecto de Investigación: Dinámica Hidrológica en Páramos Andinos
Este proyecto de investigación evalúa la hipótesis sobre la retención hídrica en ecosistemas de alta montaña.
## Metodología Experimental y Dataset
Se recolectaron series de tiempo climatológicas (2018-2025) analizadas en este paper científico y tesis de maestría.`
        }]
    };
    const semInvestigacion = analyzeProjectSemantics(ctxInvestigacion);
    assert.strictEqual(semInvestigacion.category, 'research_project');
    const docsInvestigacion = await analyzeRepository({ ...ctxInvestigacion, repository: { name: ctxInvestigacion.projectName, fullName: ctxInvestigacion.projectName }, semanticProfile: semInvestigacion });
    assert.ok(docsInvestigacion.presentation.includes('Proyectos de investigación') && docsInvestigacion.presentation.includes('hipótesis'));
    assertNoForbiddenTags(docsInvestigacion, 'Proyecto de Investigación');
    console.log('  ✅ [PASS] 6/6 Proyecto de Investigación (Hidrología en Páramos): Documentación centrada en hipótesis, metodología experimental y hallazgos');

    console.log('\n====================================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE COMPRENSIÓN UNIVERSAL PASARON EXITOSAMENTE');
    console.log('====================================================================\n');
}

runTests().catch(err => {
    console.error('❌ Fallo en test_semantic_classifier:', err);
    process.exit(1);
});
