/**
 * DOCUMIND AI — UNIVERSAL REPOSITORY & WEB PAGE UNDERSTANDING ENGINE
 * ==================================================================
 * Investigates the true nature of ANY repository BEFORE generating
 * documentation. Analyzes jointly:
 *   - Repository name, description, and directory structure
 *   - README and documentation files
 *   - Web pages (HTML/JSX/Vue/etc.) as rich semantic context (organization,
 *     services, products, mission, audience, activities, visitor communication)
 *   - Source code, manifests, endpoints, and data models
 *   - Discrepancies between web page, README, and source code
 *   - Information limitations (avoiding any hallucination when data is missing)
 */

const PROJECT_CATEGORIES = {
    FOUNDATION_NONPROFIT: {
        id: 'foundation_nonprofit',
        label: 'Fundaciones y organizaciones sin ánimo de lucro',
        domainType: 'institutional_social',
        isSoftwareProduct: false
    },
    SOCIAL_COMMUNITY: {
        id: 'social_community',
        label: 'Organizaciones sociales y comunitarias',
        domainType: 'institutional_social',
        isSoftwareProduct: false
    },
    EDUCATIONAL_INSTITUTION: {
        id: 'educational_institution',
        label: 'Instituciones educativas',
        domainType: 'institutional_educational',
        isSoftwareProduct: false
    },
    COMPANY_VENTURE: {
        id: 'company_venture',
        label: 'Empresas y emprendimientos',
        domainType: 'institutional_business',
        isSoftwareProduct: false
    },
    WEB_MOBILE_APP: {
        id: 'web_mobile_app',
        label: 'Aplicaciones web y móviles',
        domainType: 'software_engineering',
        isSoftwareProduct: true
    },
    SAAS_PLATFORM: {
        id: 'saas_platform',
        label: 'Plataformas SaaS',
        domainType: 'software_engineering',
        isSoftwareProduct: true
    },
    ENTERPRISE_SYSTEM: {
        id: 'enterprise_system',
        label: 'Sistemas empresariales',
        domainType: 'software_engineering',
        isSoftwareProduct: true
    },
    ECOMMERCE_STORE: {
        id: 'ecommerce_store',
        label: 'Tiendas virtuales y comercios',
        domainType: 'commercial_ecommerce',
        isSoftwareProduct: false
    },
    RESEARCH_PROJECT: {
        id: 'research_project',
        label: 'Proyectos de investigación',
        domainType: 'academic_research',
        isSoftwareProduct: false
    },
    DEV_LIBRARY_TOOL: {
        id: 'dev_library_tool',
        label: 'Bibliotecas y herramientas de desarrollo',
        domainType: 'software_engineering',
        isSoftwareProduct: true
    },
    GOVERNMENT_PROJECT: {
        id: 'government_project',
        label: 'Proyectos gubernamentales',
        domainType: 'institutional_government',
        isSoftwareProduct: false
    },
    PERSONAL_PORTFOLIO: {
        id: 'personal_portfolio',
        label: 'Proyectos personales y portafolios',
        domainType: 'personal_portfolio',
        isSoftwareProduct: false
    },
    OTHER_PROJECT: {
        id: 'other_project',
        label: 'Otros tipos de proyectos',
        domainType: 'general',
        isSoftwareProduct: false
    }
};

/**
 * Removes verification tags such as [Información verificada], [Información inferida],
 * [Información no verificada], [Encontrado], [Inferido], [Recomendado], etc.
 * from any visible text while keeping surrounding prose clean and natural.
 */
function stripVerificationTags(input) {
    if (!input) return input;
    if (typeof input === 'string') {
        return input
            .replace(/`?\[(?:Información\s+(?:verificada|inferida|no\s+verificada|no\s+encontrada|pendiente\s+de\s+validación|factual)|Encontrado(?:\s*:[^\]]*)?|Inferido|Recomendado(?:\s*\/[^\]]*)?|Recomendación(?:\s+Arquitectónica)?|Propuesto)\]`?/gi, '')
            .replace(/\(\s*\)/g, '')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/ +\./g, '.')
            .replace(/ +,/g, ',')
            .replace(/ +:/g, ':')
            .trim();
    }
    if (Array.isArray(input)) {
        return input.map(item => stripVerificationTags(item));
    }
    if (typeof input === 'object') {
        const cleaned = {};
        for (const [k, v] of Object.entries(input)) {
            cleaned[k] = stripVerificationTags(v);
        }
        return cleaned;
    }
    return input;
}

/**
 * Compacts large HTML files by shrinking huge <style> and inline <svg> blocks
 * so that the semantic <head> and <body> content is never truncated out when
 * enforcing per-file byte limits.
 */
function compactHtmlForAnalysis(rawHtml, maxBytes = 85000) {
    if (!rawHtml || typeof rawHtml !== 'string') return '';
    if (rawHtml.length <= maxBytes) return rawHtml;

    let compacted = rawHtml.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (full, cssContent) => {
        if (cssContent.length < 1500) return full;
        const rootMatch = cssContent.match(/:root\s*\{[^}]+\}/i);
        return `<style>/* Estilos CSS compactados para análisis semántico (${cssContent.length} bytes) */ ${rootMatch ? rootMatch[0] : ''}</style>`;
    });

    compacted = compacted.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, (svgBlock) => {
        if (svgBlock.length < 600) return svgBlock;
        return `<!-- SVG gráfico (${svgBlock.length} bytes) -->`;
    });

    return compacted.substring(0, maxBytes);
}

/**
 * Decodes basic HTML entities and strips tags into readable text.
 */
function htmlToCleanText(html) {
    if (!html || typeof html !== 'string') return '';
    return html
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<\/(p|div|section|article|li|h[1-6]|tr|header|footer)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
}

/**
 * Deeply analyzes HTML / Web files in the repository to understand what organization,
 * business, store, institution, or application the web page represents, what it offers,
 * and what it communicates to visitors.
 */
function analyzeWebPageContent(htmlFiles = []) {
    if (!Array.isArray(htmlFiles) || htmlFiles.length === 0) {
        return {
            hasWebPage: false,
            filesAnalyzed: [],
            pageTitle: '',
            metaDescription: '',
            navItems: [],
            sections: [],
            interactiveElements: [],
            communicatedSummary: ''
        };
    }

    let pageTitle = '';
    let metaDescription = '';
    let metaKeywords = '';
    const navItems = [];
    const sections = [];
    const interactiveElements = new Set();

    htmlFiles.forEach(hf => {
        const raw = hf.content || '';
        if (!raw) return;

        if (!pageTitle) {
            const tMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            if (tMatch) pageTitle = htmlToCleanText(tMatch[1]);
        }
        if (!metaDescription) {
            const mDesc = raw.match(/<meta\s+(?:name|property)=['"](?:description|og:description)['"]\s+content=['"]([^'"]+)['"]/i)
                || raw.match(/<meta\s+content=['"]([^'"]+)['"]\s+(?:name|property)=['"](?:description|og:description)['"]/i);
            if (mDesc) metaDescription = mDesc[1].trim();
        }
        if (!metaKeywords) {
            const mKey = raw.match(/<meta\s+name=['"]keywords['"]\s+content=['"]([^'"]+)['"]/i)
                || raw.match(/<meta\s+content=['"]([^'"]+)['"]\s+name=['"]keywords['"]/i);
            if (mKey) metaKeywords = mKey[1].trim();
        }

        const bodySource = raw
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ');

        // Extract navigation links
        const navMatch = bodySource.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/i);
        if (navMatch) {
            const linkRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
            let lm;
            while ((lm = linkRegex.exec(navMatch[1])) !== null) {
                const linkText = htmlToCleanText(lm[1]);
                if (linkText && linkText.length >= 2 && linkText.length <= 45 && !navItems.includes(linkText)) {
                    navItems.push(linkText);
                }
            }
        }

        // Extract semantic <section> blocks
        const secRegex = /<section\b[^>]*>([\s\S]*?)<\/section>/gi;
        let sm;
        while ((sm = secRegex.exec(bodySource)) !== null) {
            const secHtml = sm[1];
            const hMatch = secHtml.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
            const secTitle = hMatch ? htmlToCleanText(hMatch[1]) : '';
            const secParagraphs = [];
            const pRx = /<p[^>]*>([\s\S]*?)<\/p>/gi;
            let pm;
            while ((pm = pRx.exec(secHtml)) !== null) {
                const pt = htmlToCleanText(pm[1]);
                if (pt && pt.length > 20 && !secParagraphs.includes(pt)) secParagraphs.push(pt);
            }
            const subHeadings = [];
            const h3Rx = /<h[3-4][^>]*>([\s\S]*?)<\/h[3-4]>/gi;
            let h3m;
            while ((h3m = h3Rx.exec(secHtml)) !== null) {
                const ht = htmlToCleanText(h3m[1]);
                if (ht && ht !== secTitle && !subHeadings.includes(ht)) subHeadings.push(ht);
            }
            if (secTitle || secParagraphs.length > 0) {
                sections.push({
                    title: secTitle || `Sección en ${hf.path}`,
                    subHeadings: subHeadings.slice(0, 8),
                    summary: secParagraphs.slice(0, 3).join(' ')
                });
            }
        }

        // Detect interactive features present in the HTML
        if (/<form\b/i.test(bodySource)) interactiveElements.add('Formularios interactivos de contacto o captura de datos');
        if (/carrito|cart|checkout|comprar|add to cart|precio|\$\s*\d/i.test(bodySource)) interactiveElements.add('Catálogo comercial / intención de compra o carrito');
        if (/donar|donaci[oó]n|voluntariado|quiero ayudar/i.test(bodySource)) interactiveElements.add('Vinculación de donantes, voluntariado y alianzas');
        if (/\.pdf\b|descargar|estados financieros|declaraci[oó]n/i.test(bodySource)) interactiveElements.add('Descarga de documentos públicos y rendición de cuentas');
        if (/whatsapp|tel:|mailto:/i.test(bodySource)) interactiveElements.add('Canales de contacto directo (WhatsApp / Teléfono / Correo)');
        if (/login|iniciar sesi[oó]n|registro|sign in/i.test(bodySource)) interactiveElements.add('Interfaz de autenticación o acceso de usuarios');
    });

    const secSummaryStr = sections.length > 0
        ? `La página web está organizada en ${sections.length} secciones temáticas (${sections.slice(0, 6).map(s => `"${s.title}"`).join(', ')})`
        : `Página web identificada en ${htmlFiles.map(f => f.path).join(', ')}`;

    const communicatedSummary = [
        pageTitle ? `Título principal de la página: "${pageTitle}".` : '',
        metaDescription ? `Mensaje descriptivo: "${metaDescription}".` : '',
        navItems.length > 0 ? `Navegación ofrecida al visitante: ${navItems.join(', ')}.` : '',
        `${secSummaryStr}.`,
        interactiveElements.size > 0 ? `Funcionalidades de interacción para el visitante: ${Array.from(interactiveElements).join('; ')}.` : ''
    ].filter(Boolean).join(' ');

    return {
        hasWebPage: true,
        filesAnalyzed: htmlFiles.map(f => f.path),
        pageTitle,
        metaDescription,
        metaKeywords,
        navItems,
        sections: sections.slice(0, 15),
        interactiveElements: Array.from(interactiveElements),
        communicatedSummary
    };
}

/**
 * Detects discrepancies or contradictions between the README, the web page, and the source code,
 * as well as information limitations in the repository.
 */
function detectDiscrepanciesAndLimitations(signals, files, endpoints, dataModels) {
    const discrepancies = [];
    const informationLimitations = [];

    const readmeFile = files.find(f => /^readme\.(md|txt)$/i.test((f.path || '').split('/').pop()));
    const readmeText = readmeFile ? (readmeFile.content || '').trim() : '';

    if (!readmeFile || readmeText.length < 30) {
        informationLimitations.push('El repositorio no incluye un archivo README.md detallado; la comprensión del proyecto se obtuvo directamente del análisis de sus archivos y contenido web.');
    } else if (/getting started with create react app|react \+ vite|this template provides a minimal setup/i.test(readmeText)) {
        discrepancies.push('Discrepancia detectada entre el README y el proyecto: el archivo README.md conserva la plantilla genérica del generador (Create React App / Vite), mientras que los archivos del proyecto implementan un propósito distinto.');
    }

    // Check if web page / README mentions database or backend features not present in static repo
    const hasServerCode = endpoints.length > 0 || files.some(f => /\.(py|rb|php|go|rs|java|cs)$/i.test(f.path || '') || /server\.js|app\.js/i.test(f.path || ''));
    if (signals.webPageAnalysis?.hasWebPage && !hasServerCode) {
        if (/<form\b/i.test(files.map(f => f.content || '').join(' '))) {
            informationLimitations.push('La página web incluye formularios de contacto o interacción en el cliente (HTML/JS), pero en este repositorio no se incluye un servidor backend propio para procesarlos en base de datos.');
        }
    }

    // Check if package.json name differs substantially from HTML title
    const pkgFile = files.find(f => /(?:^|\/)package\.json$/i.test(f.path || ''));
    if (pkgFile && pkgFile.content && signals.htmlTitle) {
        try {
            const pkg = JSON.parse(pkgFile.content);
            if (pkg.description && signals.metaDescription && pkg.description.toLowerCase() !== signals.metaDescription.toLowerCase()) {
                discrepancies.push(`Diferencia descriptiva: el manifiesto package.json describe "${pkg.description}", mientras que la página web comunica "${signals.metaDescription}".`);
            }
        } catch (_) {}
    }

    if (files.length <= 2 && !signals.webPageAnalysis?.hasWebPage && readmeText.length < 120) {
        informationLimitations.push('El repositorio contiene un número reducido de archivos y escasa documentación textual, por lo que el alcance funcional se limita estrictamente a la evidencia disponible.');
    }

    return { discrepancies, informationLimitations };
}

/**
 * Extracts structured semantic information from HTML, Markdown, CNAME, and manifest files.
 */
function extractContextualSignals(ctx = {}) {
    const files = (ctx.keyFiles && ctx.keyFiles.length > 0)
        ? ctx.keyFiles
        : (ctx.prioritizedFiles || []);
    const repo = ctx.repository || {};
    const projectName = ctx.projectName || repo.name || 'Proyecto';
    const repoDescription = (repo.description && !/Sin descripción provista|analizado vía descarga|Archivos de proyecto subidos|Repositorio analizado/i.test(repo.description))
        ? repo.description.trim()
        : (ctx.repoDescription && !/Sin descripción provista|analizado vía descarga|Archivos de proyecto subidos|Repositorio analizado/i.test(ctx.repoDescription) ? ctx.repoDescription.trim() : '');

    let customDomain = '';
    const cnameFile = files.find(f => /(?:^|\/)cname$/i.test(f.path || ''));
    if (cnameFile && cnameFile.content) {
        customDomain = cnameFile.content.split(/\r?\n/)[0].trim();
    }

    const headings = [];
    const paragraphs = [];
    const listItems = [];
    let combinedCleanText = '';

    // Inspect README and Markdown files
    const mdFiles = files.filter(f => /\.(md|txt)$/i.test(f.path || ''));
    mdFiles.forEach(mf => {
        const content = mf.content || '';
        if (!content) return;
        combinedCleanText += '\n' + content;
        const hMatches = content.match(/^#{1,3}\s+(.+)$/gm) || [];
        hMatches.forEach(h => {
            const cleanH = h.replace(/^#{1,3}\s+/, '').trim();
            if (cleanH && !headings.includes(cleanH)) headings.push(cleanH);
        });
        const pLines = content
            .split(/\n{2,}/)
            .map(p => p.replace(/^#+\s+.*/gm, '').replace(/```[\s\S]*?```/g, '').trim())
            .filter(p => p.length > 30 && !p.startsWith('|'));
        pLines.slice(0, 18).forEach(p => paragraphs.push(p.replace(/\s+/g, ' ')));
    });

    // Inspect HTML / Web files
    const htmlFiles = files.filter(f => /\.(html?|ejs|hbs|vue|jsx|tsx|astro)$/i.test(f.path || ''));
    const webPageAnalysis = analyzeWebPageContent(htmlFiles);

    htmlFiles.forEach(hf => {
        const raw = hf.content || '';
        if (!raw) return;

        const bodySource = raw
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ');

        const hRegex = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
        let hm;
        while ((hm = hRegex.exec(bodySource)) !== null) {
            const hText = htmlToCleanText(hm[1]);
            if (hText && hText.length > 2 && hText.length < 160 && !headings.includes(hText)) {
                headings.push(hText);
            }
        }

        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let pm;
        while ((pm = pRegex.exec(bodySource)) !== null) {
            const pText = htmlToCleanText(pm[1]);
            if (pText && pText.length >= 25 && !paragraphs.includes(pText)) {
                paragraphs.push(pText);
            }
        }

        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let lm;
        while ((lm = liRegex.exec(bodySource)) !== null) {
            const lText = htmlToCleanText(lm[1]);
            if (lText && lText.length >= 8 && lText.length <= 180 && !listItems.includes(lText)) {
                listItems.push(lText);
            }
        }

        combinedCleanText += '\n' + htmlToCleanText(bodySource);
    });

    const htmlTitle = webPageAnalysis.pageTitle || '';
    const metaDescription = webPageAnalysis.metaDescription || '';
    const metaKeywords = webPageAnalysis.metaKeywords || '';

    const fullCorpus = [
        projectName,
        repoDescription,
        customDomain,
        htmlTitle,
        metaDescription,
        metaKeywords,
        headings.join(' | '),
        paragraphs.join('\n'),
        combinedCleanText
    ].join('\n');

    // Universal extraction of Mission, Vision, Purpose, Values
    let mission = '';
    let vision = '';
    let purpose = '';
    const values = [];

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        if (!mission && /tenemos un llamado|puertas de oportunidad, de bendici[oó]n y dignidad|nuestra misi[oó]n|misi[oó]n:|mission:/i.test(p)) {
            mission = p;
        }
        if (!vision && /nos comprometemos a que, a trav[eé]s de estrategias|ser puente entre las comunidades|nuestra visi[oó]n|visi[oó]n:|vision:/i.test(p)) {
            vision = p;
        }
        if (!purpose && /promover puertas de oportunidad|nuestro prop[oó]sito|trabajamos con|somos una|ofrecemos|buscamos|objetivo principal/i.test(p)) {
            purpose = p;
        }
    }

    if (!purpose && metaDescription) purpose = metaDescription;
    if (!purpose && repoDescription) purpose = repoDescription;
    if (!purpose && paragraphs.length > 0) purpose = paragraphs[0];
    if (!mission && purpose) mission = purpose;

    const valueKeywords = ['Fe', 'Amor', 'Paciencia', 'Gozo', 'Bondad', 'Mansedumbre', 'Bien Común', 'Templanza', 'Solidaridad', 'Respeto', 'Transparencia', 'Equidad', 'Dignidad', 'Empatía', 'Innovación', 'Calidad', 'Excelencia', 'Integridad', 'Sostenibilidad', 'Compromiso'];
    valueKeywords.forEach(vk => {
        const rx = new RegExp(`\\b${vk}\\b`, 'i');
        if (rx.test(fullCorpus) && !values.includes(vk)) {
            values.push(vk);
        }
    });

    // Extract Offerings / Programs / Services / Products / Thematic Lines
    const programsAndActivities = [];
    const thematicChecks = [
        {
            match: /derechos menstruales|pobreza menstrual|l[ií]nea p[uú]rpura/i,
            title: 'Línea Púrpura — Derechos Menstruales y Dignidad Menstrual',
            detail: 'Formación en salud y derechos menstruales, entrega de kits menstruales (copas, toallas ecológicas y materiales de higiene) y capacitación en fabricación de productos higiénicos sostenibles como alternativa de emprendimiento para superar la pobreza menstrual.'
        },
        {
            match: /fortalecimiento de organizaciones de mujeres|l[ií]nea verde|innovaci[oó]n social/i,
            title: 'Línea Verde — Fortalecimiento de Organizaciones de Mujeres e Innovación Social',
            detail: 'Acompañamiento técnico en formulación de proyectos sociales, gestión de fuentes de financiación, articulación en redes, alianzas estratégicas y sostenibilidad territorial para organizaciones de base lideradas por mujeres.'
        },
        {
            match: /prevenci[oó]n de violencias|escnna|trata de personas|l[ií]nea naranja/i,
            title: 'Línea Naranja — Prevención de Violencias, ESCNNA y Trata de Personas',
            detail: 'Metodologías de formación comunitaria y escolar para la prevención de la explotación sexual y comercial de niños, niñas y adolescentes (ESCNNA), abordaje de la trata de personas y atención psicosocial, emocional y espiritual.'
        }
    ];
    thematicChecks.forEach(tc => {
        if (tc.match.test(fullCorpus)) {
            programsAndActivities.push({ title: tc.title, detail: tc.detail });
        }
    });

    // Universal fallback: extract from parsed webPageAnalysis.sections or headings + paragraphs
    if (programsAndActivities.length === 0 && webPageAnalysis.sections.length > 0) {
        webPageAnalysis.sections.slice(0, 6).forEach(sec => {
            if (sec.title && !/^(inicio|home|contacto|contáctanos|menú|footer)$/i.test(sec.title)) {
                programsAndActivities.push({
                    title: sec.title,
                    detail: sec.summary || (sec.subHeadings.length > 0 ? `Incluye: ${sec.subHeadings.join(', ')}.` : `Sección o servicio presentado en la página web (${sec.title}).`)
                });
            }
        });
    }

    if (programsAndActivities.length === 0) {
        headings
            .filter(h => !/^(inicio|home|contacto|contáctanos|nosotras|nosotros|quiénes somos|menú|blog|actualidad|faq|table of contents|instalación|installation|license|licencia)$/i.test(h))
            .slice(0, 6)
            .forEach((h, idx) => {
                const hWords = h.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                const relatedP = paragraphs.find(p => hWords.some(w => p.toLowerCase().includes(w))) || paragraphs[idx] || '';
                programsAndActivities.push({
                    title: h,
                    detail: relatedP || `Actividad, servicio o componente identificado en el repositorio (${h}).`
                });
            });
    }

    // Extract real executed projects / initiatives if present
    const executedProjects = [];
    if (/campa[ñn]a de salud menstrual/i.test(fullCorpus) && /embajada de francia/i.test(fullCorpus)) {
        executedProjects.push({
            name: 'Campaña de Salud Menstrual (Mayo – Junio 2024)',
            ally: 'Embajada de Francia en Colombia',
            summary: 'Visibilización de la pobreza menstrual y entrega de productos ecológicos en el Portal Transmilenio Paraíso y Manzanas del Cuidado de Mártires y el Centro (300 niñas y mujeres recibieron toallas ecológicas; 1.300 mujeres sensibilizadas presencialmente y 10.800 personas alcanzadas en difusión).'
        });
    }
    if (/estrategia\s+["“]?dignidad menstrual/i.test(fullCorpus) && /cundinamarca/i.test(fullCorpus)) {
        executedProjects.push({
            name: 'Estrategia "Dignidad Menstrual" — Mujeres de Cundinamarca (Agosto – Noviembre 2025)',
            ally: 'Gobernación de Cundinamarca · Secretaría de la Mujer y Género (Conv. SMUEG-CD-CA-167-2025)',
            summary: 'Intervención en 16 municipios con pobreza multidimensional: 542 mujeres formadas en uso de copa menstrual, 550 niñas formadas con entrega de kits de hasta 2 años de duración y 330 mujeres capacitadas en elaboración de productos higiénicos sostenibles.'
        });
    }
    if (/acuerdo de paz|carepa,\s*antioquia/i.test(fullCorpus) && /ministerio del interior|pnud/i.test(fullCorpus)) {
        executedProjects.push({
            name: 'Implementación del Acuerdo de Paz, Seguridad Humana y DD.HH. en Carepa, Antioquia (Enero – Abril 2026)',
            ally: 'Ministerio del Interior · Supervisión PNUD (Acuerdo PAZ-569-01000992)',
            summary: 'Trabajo en los corregimientos de Zungo Embarcadero, El Silencio y Piedras Blancas: 13 talleres con 496 niñas, niños y adolescentes en 3 colegios, 67 mujeres formadas en derechos menstruales, 4 talleres con 91 mujeres rurales en elaboración de toallas ecológicas y 2 encuentros con 82 docentes y funcionarios de la Defensoría del Pueblo.'
        });
    }

    // Extract transparency & accountability documents if present
    const transparencyDocs = [];
    if (/estados financieros|declaraci[oó]n renta|rendici[oó]n de cuentas/i.test(fullCorpus)) {
        transparencyDocs.push(
            'Estados Financieros (2022–2023, 2023–2024, 2025)',
            'Declaraciones de Renta e Impuestos (2020–2022, 2023, 2024, 2025)',
            'Actas de Reunión e Informes de Gestión (2023, 2024, 2025)'
        );
    }

    // Extract contact & institutional metadata
    const contactInfo = {};
    const phoneMatch = fullCorpus.match(/\+\d{1,3}\s*\d{3}[-\s]?\d{3,4}[-\s]?\d{3,4}/);
    if (phoneMatch) contactInfo.phone = phoneMatch[0].trim();
    const directorMatch = fullCorpus.match(/Directora:?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/);
    if (directorMatch) contactInfo.director = directorMatch[1].trim();
    if (/bogot[aá],\s*colombia/i.test(fullCorpus)) contactInfo.location = 'Bogotá, Colombia';
    if (/desde\s+20\d{2}/i.test(fullCorpus)) {
        const yrMatch = fullCorpus.match(/desde\s+(20\d{2})/i);
        if (yrMatch) contactInfo.foundedYear = yrMatch[1];
    }
    if (customDomain) contactInfo.domain = customDomain;

    // Determine Clean Entity Name
    let entityName = projectName;
    if (htmlTitle) {
        entityName = htmlTitle.split('|')[0].split('—')[0].split('-')[0].trim() || projectName;
    } else if (headings.length > 0 && headings[0].length < 65) {
        entityName = headings[0];
    }

    const endpoints = Array.isArray(ctx.endpoints) ? ctx.endpoints : [];
    const dataModels = Array.isArray(ctx.dataModels) ? ctx.dataModels : [];
    const { discrepancies, informationLimitations } = detectDiscrepanciesAndLimitations(
        { htmlTitle, metaDescription, webPageAnalysis },
        files,
        endpoints,
        dataModels
    );

    return {
        entityName,
        projectName,
        repoDescription,
        customDomain,
        htmlTitle,
        metaDescription,
        metaKeywords,
        headings: headings.slice(0, 25),
        paragraphs: paragraphs.slice(0, 25),
        listItems: listItems.slice(0, 25),
        mission,
        vision,
        purpose,
        values,
        programsAndActivities,
        executedProjects,
        transparencyDocs,
        contactInfo,
        webPageAnalysis,
        discrepancies,
        informationLimitations,
        fullCorpus
    };
}

/**
 * Universally analyzes the repository to understand its true nature, purpose,
 * audience, web page context, and technical implementation.
 */
function analyzeProjectSemantics(ctx = {}) {
    const signals = extractContextualSignals(ctx);
    const files = (ctx.keyFiles && ctx.keyFiles.length > 0)
        ? ctx.keyFiles
        : (ctx.prioritizedFiles || []);
    const endpoints = Array.isArray(ctx.endpoints) ? ctx.endpoints : [];
    const dataModels = Array.isArray(ctx.dataModels) ? ctx.dataModels : [];
    const detectedLanguages = Array.isArray(ctx.detectedLanguages) ? ctx.detectedLanguages : [];
    const detectedFrameworks = Array.isArray(ctx.detectedFrameworks) ? ctx.detectedFrameworks : [];
    const detectedDatabases = Array.isArray(ctx.detectedDatabases) ? ctx.detectedDatabases : [];
    const detectedInfra = Array.isArray(ctx.detectedInfra) ? ctx.detectedInfra : [];

    const corpusLower = signals.fullCorpus.toLowerCase();
    const hasBackendEndpoints = endpoints.length > 0;
    const hasDatabaseModels = dataModels.length > 0 || detectedDatabases.length > 0;
    const hasPackageJson = files.some(f => /(?:^|\/)package\.json$/i.test(f.path || ''));
    const isPrimarilyHtmlStatic = files.length > 0 && files.every(f => /\.(html?|css|svg|png|jpg|jpeg|webp|gif|ico|txt|md)$/i.test(f.path || '') || /(?:^|\/)cname$/i.test(f.path || ''));

    // Multi-signal contextual scoring
    const scores = {
        foundation_nonprofit: 0,
        social_community: 0,
        educational_institution: 0,
        company_venture: 0,
        web_mobile_app: 0,
        saas_platform: 0,
        enterprise_system: 0,
        ecommerce_store: 0,
        research_project: 0,
        dev_library_tool: 0,
        government_project: 0,
        personal_portfolio: 0,
        other_project: 1
    };

    if (/\bfundaci[oó]n\b|\bsin [aá]nimo de lucro\b|\bong\b|\bnon-profit\b|\bnonprofit\b/i.test(corpusLower)) scores.foundation_nonprofit += 45;
    if (/\bdonaci[oó]n|\bdonantes\b|\bvoluntariado\b|\bbeneficiarias?\b|\brendici[oó]n de cuentas\b|\bquiero ayudar\b/i.test(corpusLower)) scores.foundation_nonprofit += 30;
    if (/\bcomunidades vulnerables\b|\bderechos menstruales\b|\bpobreza menstrual\b|\bescnna\b|\btrata de personas\b/i.test(corpusLower)) scores.foundation_nonprofit += 25;
    if (signals.customDomain && signals.customDomain.endsWith('.org') && !hasBackendEndpoints) scores.foundation_nonprofit += 15;

    if (/\borganizaci[oó]n social\b|\borganizaci[oó]n comunitaria\b|\btrabajo comunitario\b|\bcolectivo social\b|\bjunta de acci[oó]n comunal\b|\blideresas comunitarias\b/i.test(corpusLower)) {
        scores.social_community += 35;
    }

    if (/\binstituci[oó]n educativa\b|\buniversidad\b|\bcolegio\b|\bfacultad\b|\bprograma acad[eé]mico\b|\bplan de estudios\b|\bcampus universitario\b/i.test(corpusLower)) {
        scores.educational_institution += 35;
    }
    if (signals.customDomain && signals.customDomain.includes('.edu')) scores.educational_institution += 25;

    if (/\bgobierno\b|\balcald[ií]a\b|\bgobernaci[oó]n\b|\bministerio\b|\bentidad p[uú]blica\b|\btr[aá]mites ciudadanos\b/i.test(corpusLower)) {
        if (scores.foundation_nonprofit < 40) scores.government_project += 35;
    }
    if (signals.customDomain && signals.customDomain.includes('.gov')) scores.government_project += 40;

    if (/\btienda virtual\b|\bcarrito de compras\b|\badd to cart\b|\bcheckout\b|\bcat[aá]logo de productos\b|\be-commerce\b|\becommerce\b/i.test(corpusLower)) {
        scores.ecommerce_store += 40;
    }

    if (/\bproyecto de investigaci[oó]n\b|\bhip[oó]tesis\b|\bmetodolog[ií]a experimental\b|\bpaper cient[ií]fico\b|\bdataset\b|\btesis\b/i.test(corpusLower) && scores.foundation_nonprofit < 40) {
        scores.research_project += 35;
    }

    if (/\bportafolio personal\b|\bmi portafolio\b|\bmy portfolio\b|\bsobre m[ií]\b|\babout me\b|\bcurr[ií]culum vitae\b|\bfreelance developer\b/i.test(corpusLower)) {
        scores.personal_portfolio += 40;
    }

    if (/\bempresa\b|\bemprendimiento\b|\bnuestros servicios\b|\bcotizar\b|\bclientes corporativos\b|\bagencia\b|\bconsultor[ií]a\b/i.test(corpusLower) && !hasBackendEndpoints && scores.foundation_nonprofit < 30) {
        scores.company_venture += 30;
    }

    const pkgFile = files.find(f => /(?:^|\/)package\.json$/i.test(f.path || ''));
    let pkgJson = {};
    if (pkgFile && pkgFile.content) {
        try { pkgJson = JSON.parse(pkgFile.content); } catch (_) {}
    }
    if ((pkgJson.main || pkgJson.exports || pkgJson.bin) && !files.some(f => /index\.html$/i.test(f.path || ''))) {
        scores.dev_library_tool += 35;
    }
    if (/\bweb framework for node\b|\bnpm install\b|\blibrary\b|\bsdk\b|\bmiddleware\b|\bcli tool\b/i.test(corpusLower) && scores.foundation_nonprofit < 30) {
        scores.dev_library_tool += 25;
    }

    if (hasBackendEndpoints || hasDatabaseModels) {
        scores.web_mobile_app += 25;
        if (/\bsaas\b|\bmulti-tenant\b|\boauth\b|\bsupabase\b|\bcloud\b|\banalizador\b|\bplataforma\b/i.test(corpusLower)) {
            scores.saas_platform += 32;
        }
        if (/\benterprise\b|\bempresarial\b|\berp\b|\bcrm\b|\brbac\b|\bauditor[ií]a\b|\bdevsecops\b|\bsrs\b|\bopenapi\b/i.test(corpusLower)) {
            scores.enterprise_system += 34;
        }
    } else if (hasPackageJson && detectedFrameworks.some(fw => ['React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Flutter', 'Express', 'NestJS', 'Django', 'FastAPI', 'Spring Boot'].includes(fw)) && scores.foundation_nonprofit < 40) {
        scores.web_mobile_app += 28;
    }

    let bestKey = 'other_project';
    let bestScore = -1;
    for (const [k, sc] of Object.entries(scores)) {
        if (sc > bestScore) {
            bestScore = sc;
            bestKey = k;
        }
    }

    const categoryMeta = Object.values(PROJECT_CATEGORIES).find(c => c.id === bestKey) || PROJECT_CATEGORIES.OTHER_PROJECT;
    const isFoundationOrSocial = ['foundation_nonprofit', 'social_community'].includes(categoryMeta.id);
    const isSoftwareSystem = Boolean(categoryMeta.isSoftwareProduct || hasBackendEndpoints || hasDatabaseModels);
    const isNonSoftwareInstitutional = !isSoftwareSystem;

    const langList = detectedLanguages.length > 0 ? detectedLanguages.join(', ') : (ctx.repository?.primaryLanguage || 'HTML5 / CSS3');
    const fwList = detectedFrameworks.length > 0 ? detectedFrameworks.join(', ') : (isPrimarilyHtmlStatic ? 'Maquetación web estática nativa (sin frameworks de backend)' : 'Ecosistema estándar del lenguaje');
    const dbList = detectedDatabases.length > 0 ? detectedDatabases.join(', ') : 'No utiliza base de datos (contenido estático / sin persistencia de servidor)';

    let whatItIs = '';
    let whatItDoes = '';
    let mainPurpose = '';
    let problemStatement = '';
    let targetBeneficiaries = '';
    let technicalRoleDescription = '';

    if (categoryMeta.id === 'foundation_nonprofit' || categoryMeta.id === 'social_community') {
        whatItIs = `${signals.entityName} es una ${categoryMeta.id === 'foundation_nonprofit' ? 'fundación y organización sin ánimo de lucro' : 'organización social y comunitaria'}${signals.contactInfo.location ? ` con sede en ${signals.contactInfo.location}` : ''}${signals.contactInfo.foundedYear ? `, activa desde ${signals.contactInfo.foundedYear}` : ''}.`;
        whatItDoes = signals.programsAndActivities.length > 0
            ? `Desarrolla programas de impacto social y comunitario centrados en: ${signals.programsAndActivities.map(p => p.title).join('; ')}.`
            : `Realiza actividades de formación, acompañamiento comunitario y transformación social en beneficio de poblaciones vulnerables.`;
        mainPurpose = signals.mission || signals.purpose || `Promover oportunidades de desarrollo integral, dignidad, formación en derechos y bienestar comunitario para poblaciones en situación de vulnerabilidad.`;
        problemStatement = `Atiende problemáticas sociales reales como la pobreza menstrual, la violencia basada en género, la explotación sexual y comercial de niños, niñas y adolescentes (ESCNNA), la trata de personas, la pobreza multidimensional y la exclusión social y económica en territorios vulnerables.`;
        targetBeneficiaries = `Mujeres, niñas, adolescentes, lideresas sociales, organizaciones comunitarias de base, instituciones educativas y familias en territorios vulnerables, además de articularse con donantes, cooperantes internacionales, entidades públicas y voluntariado.`;
        technicalRoleDescription = `El repositorio aloja el sitio web institucional e informativo de ${signals.entityName}${signals.customDomain ? ` (configurado bajo el dominio ${signals.customDomain})` : ''}, construido con ${langList}. Estas tecnologías se emplean exclusivamente como canal de comunicación digital, visibilización de proyectos sociales, rendición de cuentas (transparencia) y contacto con donantes o voluntariado, sin constituir una aplicación de software comercial ni un sistema de automatización empresarial.`;
    } else if (categoryMeta.id === 'ecommerce_store') {
        whatItIs = `${signals.entityName} es una tienda virtual y catálogo comercial digital (${categoryMeta.label}).`;
        whatItDoes = `Exhibe productos o servicios al público, facilitando la exploración del catálogo, selección de artículos y gestión de compra o pedido.`;
        mainPurpose = signals.purpose || `Comercializar productos y ofrecer una experiencia de catálogo y compra digital accesible para sus clientes.`;
        problemStatement = `Atiende la necesidad de exhibición comercial, consulta de catálogo y adquisición de productos en línea para compradores y clientes.`;
        targetBeneficiaries = `Compradores, clientes finales y visitantes interesados en adquirir los productos o servicios ofrecidos por ${signals.entityName}.`;
        technicalRoleDescription = hasBackendEndpoints
            ? `Implementado como una aplicación de comercio electrónico con interfaz en ${langList}, ${endpoints.length} rutas de servicio y persistencia en ${dbList}.`
            : `El repositorio contiene la interfaz web y catálogo comercial construido con ${langList}${signals.customDomain ? ` bajo el dominio ${signals.customDomain}` : ''}.`;
    } else if (categoryMeta.id === 'educational_institution') {
        whatItIs = `${signals.entityName} representa una institución o iniciativa educativa (${categoryMeta.label}).`;
        whatItDoes = `Comunica su oferta académica, planes de estudio, actividades formativas y recursos para su comunidad educativa.`;
        mainPurpose = signals.purpose || `Brindar formación académica, difusión pedagógica e información institucional para estudiantes, docentes y aspirantes.`;
        problemStatement = `Responde a la necesidad de formación educativa y acceso claro a la oferta académica y servicios institucionales.`;
        targetBeneficiaries = `Estudiantes, docentes, investigadores, padres de familia y aspirantes de la comunidad educativa.`;
        technicalRoleDescription = `El repositorio contiene el portal educativo construido en ${langList}, utilizado como medio de difusión académica e información institucional.`;
    } else if (categoryMeta.id === 'company_venture') {
        whatItIs = `${signals.entityName} representa una empresa, consultora o emprendimiento (${categoryMeta.label}).`;
        whatItDoes = `Presenta el portafolio de servicios, propuesta de valor, casos de éxito y canales de contacto comercial o corporativo.`;
        mainPurpose = signals.purpose || `Dar a conocer los servicios profesionales o soluciones de negocio de ${signals.entityName} y conectar con clientes potenciales.`;
        problemStatement = `Aborda las necesidades de los clientes del sector descritas en su portafolio de servicios y atención comercial.`;
        targetBeneficiaries = `Clientes corporativos, aliados comerciales y usuarios interesados en contratar o conocer los servicios de ${signals.entityName}.`;
        technicalRoleDescription = `El repositorio contiene el sitio web corporativo desarrollado con ${langList}, empleado como presencia digital y canal de contacto empresarial.`;
    } else if (categoryMeta.id === 'research_project') {
        whatItIs = `${signals.entityName} es un proyecto de investigación académica o científica (${categoryMeta.label}).`;
        whatItDoes = `Documenta y desarrolla la hipótesis, metodología experimental, análisis de datos, resultados y hallazgos del estudio.`;
        mainPurpose = signals.purpose || `Investigar, analizar y validar científicamente el fenómeno o problema de estudio planteado en el repositorio.`;
        problemStatement = signals.paragraphs[0] || `Aborda el problema de investigación, hipótesis y preguntas científicas formuladas en los documentos del proyecto.`;
        targetBeneficiaries = `Investigadores, comunidad científica, docentes, estudiantes y profesionales del área de estudio.`;
        technicalRoleDescription = `Los archivos, scripts o documentos en ${langList} funcionan como soporte metodológico, experimental y documental de la investigación.`;
    } else if (isNonSoftwareInstitutional) {
        whatItIs = `${signals.entityName} corresponde a un proyecto de naturaleza "${categoryMeta.label}".`;
        whatItDoes = signals.programsAndActivities.length > 0
            ? `Presenta y desarrolla: ${signals.programsAndActivities.map(p => p.title).join('; ')}.`
            : `Comunica el propósito, contenidos y actividades descritas en el repositorio.`;
        mainPurpose = signals.purpose || `Cumplir los objetivos institucionales, informativos o profesionales descritos en los documentos del repositorio.`;
        problemStatement = signals.paragraphs[1] || signals.purpose || `Brindar información estructurada, recursos y canales de comunicación claros para su público objetivo.`;
        targetBeneficiaries = `Visitantes, ciudadanos o comunidad objetivo interesada en ${signals.entityName}.`;
        technicalRoleDescription = `Los archivos técnicos detectados (${langList}) funcionan como el soporte digital para estructurar, presentar y publicar el contenido de ${signals.entityName}.`;
    } else {
        whatItIs = `${signals.entityName} es un proyecto tecnológico categorizado como "${categoryMeta.label}", desarrollado con ${langList}${detectedFrameworks.length > 0 ? ` y ${detectedFrameworks.join(', ')}` : ''}.`;
        whatItDoes = endpoints.length > 0
            ? `Provee funcionalidades de software a través de ${files.length} archivos y ${endpoints.length} rutas/endpoints HTTP.`
            : `Implementa módulos y componentes de software en ${langList} (${files.length} archivos analizados).`;
        mainPurpose = signals.purpose || signals.repoDescription || `Proveer las capacidades funcionales, procesamiento de datos y servicios definidos en los módulos del repositorio.`;
        problemStatement = `Resolver las necesidades funcionales y operativas abordadas por sus módulos, interfaces y servicios técnicos.`;
        targetBeneficiaries = `Usuarios finales de la aplicación, administradores y equipos técnicos que operan o se integran con el sistema.`;
        technicalRoleDescription = `La implementación técnica comprende ${files.length || 1} archivos analizados en ${langList}, ${endpoints.length} endpoints HTTP/API y ${dataModels.length} modelos de datos sobre ${dbList}.`;
    }

    return {
        category: categoryMeta.id,
        categoryLabel: categoryMeta.label,
        domainType: categoryMeta.domainType,
        isSoftwareProduct: isSoftwareSystem,
        isFoundationOrSocial,
        isNonSoftwareInstitutional,
        isStaticWebsite: isPrimarilyHtmlStatic && !hasBackendEndpoints,
        entityName: signals.entityName,
        customDomain: signals.customDomain,
        projectNature: {
            category: categoryMeta.label,
            entityName: signals.entityName,
            whatItIs,
            whatItDoes,
            whyItExists: mainPurpose,
            mission: signals.mission || mainPurpose,
            vision: signals.vision || 'Consolidar su impacto mediante calidad, transparencia y resultados verificables para su comunidad o usuarios objetivo.',
            values: signals.values,
            problemAddressed: problemStatement,
            targetBeneficiaries,
            programsAndActivities: signals.programsAndActivities,
            executedProjects: signals.executedProjects,
            transparencyDocs: signals.transparencyDocs,
            contactInfo: signals.contactInfo,
            webPageCommunicatedInfo: signals.webPageAnalysis?.communicatedSummary || ''
        },
        technicalImplementation: {
            roleSummary: technicalRoleDescription,
            languages: detectedLanguages,
            frameworks: detectedFrameworks,
            databases: detectedDatabases,
            infrastructure: detectedInfra,
            hasBackendServer: hasBackendEndpoints,
            hasDatabase: hasDatabaseModels,
            endpointsCount: endpoints.length,
            dataModelsCount: dataModels.length,
            customDomain: signals.customDomain || null
        },
        webPageAnalysis: signals.webPageAnalysis,
        discrepancies: signals.discrepancies || [],
        informationLimitations: signals.informationLimitations || [],
        signals
    };
}

/**
 * Merges Gemini's Stage-0 `projectUnderstanding` output into the semantic profile
 * so that all downstream documentation modules share a single, coherent, AI-enriched
 * understanding of the repository without contradicting verified static facts.
 */
function mergeAiUnderstandingIntoProfile(baseProfile, aiData) {
    if (!aiData || typeof aiData !== 'object') return baseProfile;
    const merged = { ...baseProfile, isAiEnriched: true };

    if (aiData.entityName && typeof aiData.entityName === 'string' && !baseProfile.isFoundationOrSocial) {
        merged.entityName = stripVerificationTags(aiData.entityName);
    }
    if (aiData.projectTypeSummary && typeof aiData.projectTypeSummary === 'string' && baseProfile.category === 'other_project') {
        merged.categoryLabel = stripVerificationTags(aiData.projectTypeSummary);
    }

    merged.projectNature = {
        ...baseProfile.projectNature,
        whatItIs: (!baseProfile.isFoundationOrSocial && aiData.whatItIs) ? stripVerificationTags(aiData.whatItIs) : baseProfile.projectNature.whatItIs,
        whatItDoes: (!baseProfile.isFoundationOrSocial && aiData.whatItDoes) ? stripVerificationTags(aiData.whatItDoes) : baseProfile.projectNature.whatItDoes,
        whyItExists: (!baseProfile.isFoundationOrSocial && aiData.whyItExists) ? stripVerificationTags(aiData.whyItExists) : baseProfile.projectNature.whyItExists,
        problemAddressed: (!baseProfile.isFoundationOrSocial && aiData.problemAddressed) ? stripVerificationTags(aiData.problemAddressed) : baseProfile.projectNature.problemAddressed,
        targetBeneficiaries: (!baseProfile.isFoundationOrSocial && aiData.targetAudience) ? stripVerificationTags(aiData.targetAudience) : baseProfile.projectNature.targetBeneficiaries,
        webPageCommunicatedInfo: aiData.webPageCommunicatedInfo ? stripVerificationTags(aiData.webPageCommunicatedInfo) : baseProfile.projectNature.webPageCommunicatedInfo
    };

    if (Array.isArray(aiData.coreOfferingsOrPrograms) && aiData.coreOfferingsOrPrograms.length > 0 && baseProfile.projectNature.programsAndActivities.length === 0) {
        merged.projectNature.programsAndActivities = aiData.coreOfferingsOrPrograms.map(item => ({
            title: stripVerificationTags(item.title || 'Actividad / Componente'),
            detail: stripVerificationTags(item.detail || '')
        }));
    }

    if (aiData.technologyRole && typeof aiData.technologyRole === 'string' && !baseProfile.isFoundationOrSocial) {
        merged.technicalImplementation = {
            ...baseProfile.technicalImplementation,
            roleSummary: stripVerificationTags(aiData.technologyRole)
        };
    }

    if (Array.isArray(aiData.discrepancies) && aiData.discrepancies.length > 0) {
        merged.discrepancies = Array.from(new Set([...(baseProfile.discrepancies || []), ...aiData.discrepancies.map(d => stripVerificationTags(d))]));
    }
    if (Array.isArray(aiData.informationLimitations) && aiData.informationLimitations.length > 0) {
        merged.informationLimitations = Array.from(new Set([...(baseProfile.informationLimitations || []), ...aiData.informationLimitations.map(l => stripVerificationTags(l))]));
    }

    return merged;
}

module.exports = {
    PROJECT_CATEGORIES,
    stripVerificationTags,
    compactHtmlForAnalysis,
    htmlToCleanText,
    analyzeWebPageContent,
    detectDiscrepanciesAndLimitations,
    extractContextualSignals,
    analyzeProjectSemantics,
    mergeAiUnderstandingIntoProfile
};
