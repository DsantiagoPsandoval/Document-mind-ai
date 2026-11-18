/**
 * tests/test_semantic_classifier.js
 * ============================================================================
 * Suite de Pruebas del Motor de Análisis Semántico y Documentación Adaptativa:
 *   1. Prueba real con el repositorio Puertas-D-e-Colores (Fundación).
 *   2. Prueba de clasificación inteligente en las 12+ categorías de proyectos.
 *   3. Verificación de separación entre Naturaleza del Proyecto e Implementación Técnica.
 *   4. Verificación de eliminación total de etiquetas ([Información verificada],
 *      [Información inferida], [Información no verificada], [Encontrado], etc.).
 * ============================================================================
 */

const assert = require('assert');
const { fetchAndAnalyzeRepo } = require('../services/github/analyzer');
const { analyzeRepository } = require('../services/ai/gemini');
const { analyzeProjectSemantics, stripVerificationTags, PROJECT_CATEGORIES } = require('../services/analyzer/semanticClassifier');
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
    console.log('🧠 TEST SUITE: MOTOR DE ANÁLISIS SEMÁNTICO Y DOCUMENTACIÓN ADAPTATIVA');
    console.log('====================================================================\n');

    // ------------------------------------------------------------------------
    // 1. PRUEBA CON REPOSITORIO REAL: DsantiagoPsandoval/Puertas-D-e-Colores
    // ------------------------------------------------------------------------
    console.log('--- 1. Análisis Semántico Real de Puertas-D-e-Colores ---');
    const repoData = await fetchAndAnalyzeRepo('https://github.com/DsantiagoPsandoval/Puertas-D-e-Colores');

    assert.strictEqual(repoData.projectCategory, 'foundation_nonprofit', 'Debe clasificarse como foundation_nonprofit');
    assert.strictEqual(repoData.projectCategoryLabel, 'Fundaciones y organizaciones sin ánimo de lucro');
    assert.strictEqual(repoData.semanticProfile.entityName, 'Fundación Puertas de Colores');
    assert.strictEqual(repoData.semanticProfile.isSoftwareProduct, false);
    assert.strictEqual(repoData.semanticProfile.isNonSoftwareInstitutional, true);
    assert.strictEqual(repoData.semanticProfile.customDomain, 'puertasdcolores.org');
    console.log('  ✅ [PASS] Puertas-D-e-Colores clasificado como "Fundaciones y organizaciones sin ánimo de lucro"');

    const docs = await analyzeRepository(repoData);
    const unified = buildUnifiedDocumentModel({ ...repoData, documentation: docs }, 'all');

    // Verificar contenido social real de la fundación
    const presText = docs.presentation || '';
    const prdText = docs.product?.prd || '';
    assert.ok(presText.includes('Fundación Puertas de Colores'), 'Debe incluir el nombre real de la fundación');
    assert.ok(presText.includes('Bogotá, Colombia'), 'Debe identificar la sede en Bogotá, Colombia');
    assert.ok(presText.includes('Derechos Menstruales') && presText.includes('Línea Púrpura'), 'Debe identificar la Línea Púrpura (Derechos Menstruales)');
    assert.ok(presText.includes('Línea Verde') && presText.includes('Fortalecimiento de Organizaciones de Mujeres'), 'Debe identificar la Línea Verde');
    assert.ok(presText.includes('Línea Naranja') && presText.includes('ESCNNA'), 'Debe identificar la Línea Naranja (Prevención de Violencias y ESCNNA)');
    assert.ok(presText.includes('Embajada de Francia') && presText.includes('Gobernación de Cundinamarca'), 'Debe extraer los proyectos ejecutados reales y sus aliados');
    assert.ok(presText.includes('puertasdcolores.org'), 'Debe identificar el dominio configurado en CNAME');
    assert.ok(prdText.includes('sin constituir una aplicación de software comercial ni un sistema de automatización empresarial'), 'Debe separar el propósito social de la implementación técnica web');
    console.log('  ✅ [PASS] Documentación de Puertas-D-e-Colores refleja misión, visión, 3 ejes temáticos, proyectos territoriales, transparencia y separación propósito/tecnología');

    // Verificar eliminación total de etiquetas de verificación
    assertNoForbiddenTags(docs, 'docs de Puertas-D-e-Colores');
    assertNoForbiddenTags(unified.sections, 'unified.sections de Puertas-D-e-Colores');
    assertNoForbiddenTags(unified.tables, 'unified.tables de Puertas-D-e-Colores');
    const htmlExport = buildDocumentHtml({ ...repoData, documentation: docs }, 'all');
    const mdExport = getDocumentMarkdown({ ...repoData, documentation: docs }, 'all');
    assertNoForbiddenTags(htmlExport, 'HTML exportado de Puertas-D-e-Colores');
    assertNoForbiddenTags(mdExport, 'Markdown exportado de Puertas-D-e-Colores');
    console.log('  ✅ [PASS] Cero etiquetas [Información verificada], [Información inferida], [Encontrado] o similares en todos los documentos');

    // ------------------------------------------------------------------------
    // 2. PRUEBA MULTICATEGORÍA (12 CATEGORÍAS DISTINTAS DE PROYECTOS)
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Clasificación Contextual en Diferentes Categorías de Repositorios ---');

    const categorySamples = [
        {
            expectedCategory: 'social_community',
            ctx: {
                projectName: 'Red-Comunitaria-Sur',
                prioritizedFiles: [{
                    path: 'README.md',
                    content: '# Organización Comunitaria y Colectivo Social del Sur\nSomos una organización social y comunitaria conformada por lideresas comunitarias y juntas de acción comunal para el trabajo comunitario territorial.'
                }]
            }
        },
        {
            expectedCategory: 'educational_institution',
            ctx: {
                projectName: 'Portal-Colegio-San-Mateo',
                prioritizedFiles: [{
                    path: 'index.html',
                    content: '<html><head><title>Institución Educativa San Mateo</title></head><body><h1>Institución Educativa y Campus Universitario</h1><p>Conoce nuestro programa académico, plan de estudios y facultad.</p></body></html>'
                }]
            }
        },
        {
            expectedCategory: 'company_venture',
            ctx: {
                projectName: 'Consultora-Andina-Web',
                prioritizedFiles: [{
                    path: 'index.html',
                    content: '<html><head><title>Consultoría Corporativa Andina</title></head><body><h1>Empresa de Consultoría y Agencia Estratégica</h1><p>Conoce nuestros servicios para clientes corporativos y solicita cotizar.</p></body></html>'
                }]
            }
        },
        {
            expectedCategory: 'ecommerce_store',
            ctx: {
                projectName: 'Tienda-Artesanias-Colombia',
                prioritizedFiles: [{
                    path: 'index.html',
                    content: '<html><head><title>Tienda Virtual de Artesanías</title></head><body><h1>Catálogo de Productos y Carrito de Compras</h1><p>Plataforma e-commerce con checkout rápido y add to cart.</p></body></html>'
                }]
            }
        },
        {
            expectedCategory: 'research_project',
            ctx: {
                projectName: 'Tesis-Prediccion-Climatica',
                prioritizedFiles: [{
                    path: 'README.md',
                    content: '# Proyecto de Investigación en Predicción Climática\nEste repositorio contiene la hipótesis, metodología experimental, dataset y paper científico de nuestra tesis doctoral.'
                }]
            }
        },
        {
            expectedCategory: 'dev_library_tool',
            ctx: {
                projectName: 'fast-router-sdk',
                prioritizedFiles: [
                    { path: 'package.json', content: JSON.stringify({ name: 'fast-router-sdk', main: 'index.js', bin: './cli.js' }) },
                    { path: 'README.md', content: '# Fast Router SDK\nLightweight middleware library and CLI tool. Run `npm install fast-router-sdk`.' }
                ]
            }
        },
        {
            expectedCategory: 'government_project',
            ctx: {
                projectName: 'Portal-Alcaldia-Transparente',
                prioritizedFiles: [
                    { path: 'CNAME', content: 'tramites.alcaldia.gov.co' },
                    { path: 'index.html', content: '<html><head><title>Alcaldía Municipal — Trámites Ciudadanos</title></head><body><h1>Entidad Pública del Gobierno Local</h1><p>Portal oficial de trámites ciudadanos de la alcaldía.</p></body></html>' }
                ]
            }
        },
        {
            expectedCategory: 'personal_portfolio',
            ctx: {
                projectName: 'daniel-portfolio',
                prioritizedFiles: [{
                    path: 'index.html',
                    content: '<html><head><title>Mi Portafolio Personal | Freelance Developer</title></head><body><h1>Sobre mí (About me)</h1><p>Bienvenido a mi portafolio personal y currículum vitae.</p></body></html>'
                }]
            }
        },
        {
            expectedCategory: 'enterprise_system',
            ctx: {
                projectName: 'core-banking-erp',
                endpoints: [{ method: 'POST', path: '/api/v1/audit' }],
                dataModels: [{ name: 'Account', fields: [{ name: 'id', type: 'UUID', isPk: true }] }],
                detectedLanguages: ['TypeScript'],
                detectedFrameworks: ['NestJS'],
                detectedDatabases: ['PostgreSQL'],
                prioritizedFiles: [{
                    path: 'README.md',
                    content: '# Sistema Empresarial ERP & Core Financiero\nSistema empresarial con control RBAC, auditoría DevSecOps y especificación SRS/OpenAPI.'
                }]
            }
        }
    ];

    for (const sample of categorySamples) {
        const sem = analyzeProjectSemantics(sample.ctx);
        assert.strictEqual(
            sem.category,
            sample.expectedCategory,
            `Para ${sample.ctx.projectName} se esperaba "${sample.expectedCategory}", pero se obtuvo "${sem.category}"`
        );
        const sampleDocs = await analyzeRepository({
            ...sample.ctx,
            repository: { name: sample.ctx.projectName, fullName: sample.ctx.projectName },
            semanticProfile: sem
        });
        assertNoForbiddenTags(sampleDocs, `Documentación de ${sample.ctx.projectName}`);
        console.log(`  ✅ [PASS] ${sample.ctx.projectName} -> Clasificado como "${sem.categoryLabel}" (${sem.category})`);
    }

    console.log('\n====================================================================');
    console.log('🎉 TODAS LAS PRUEBAS DEL MOTOR SEMÁNTICO PASARON EXITOSAMENTE');
    console.log('====================================================================\n');
}

runTests().catch(err => {
    console.error('❌ Fallo en test_semantic_classifier:', err);
    process.exit(1);
});
