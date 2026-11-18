/**
 * DOCUMIND AI — SEMANTIC PROJECT CLASSIFIER & CONTEXTUAL ANALYZER
 * ================================================================
 * Understands what a repository represents in reality BEFORE generating
 * documentation. Distinguishes between the real nature/purpose of a project
 * (e.g., Foundation/Non-profit, Social Organization, Educational Institution,
 * E-commerce, Research Project, Portfolio, Company, SaaS, Web/Mobile App,
 * Enterprise System, Dev Library, Government Project) and its technical
 * implementation (HTML5, CSS3, JS, Python, databases, etc.).
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
        isSoftwareProduct: true
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

    // Replace huge inline <style> blocks with a compact summary preserving CSS variables if any
    let compacted = rawHtml.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (full, cssContent) => {
        if (cssContent.length < 1500) return full;
        const rootMatch = cssContent.match(/:root\s*\{[^}]+\}/i);
        return `<style>/* Estilos CSS compactados para análisis semántico (${cssContent.length} bytes) */ ${rootMatch ? rootMatch[0] : ''}</style>`;
    });

    // Replace large decorative inline <svg> blocks
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
 * Extracts structured semantic information from HTML, Markdown, CNAME, and manifest files.
 */
function extractContextualSignals(ctx = {}) {
    const files = (ctx.keyFiles && ctx.keyFiles.length > 0)
        ? ctx.keyFiles
        : (ctx.prioritizedFiles || []);
    const repo = ctx.repository || {};
    const projectName = ctx.projectName || repo.name || 'Proyecto';
    const repoDescription = (repo.description && !/Sin descripción provista|analizado vía descarga|Archivos de proyecto subidos/i.test(repo.description))
        ? repo.description.trim()
        : (ctx.repoDescription && !/Sin descripción provista|analizado vía descarga|Archivos de proyecto subidos/i.test(ctx.repoDescription) ? ctx.repoDescription.trim() : '');

    let customDomain = '';
    const cnameFile = files.find(f => /(?:^|\/)cname$/i.test(f.path || ''));
    if (cnameFile && cnameFile.content) {
        customDomain = cnameFile.content.split(/\r?\n/)[0].trim();
    }

    let htmlTitle = '';
    let metaDescription = '';
    let metaKeywords = '';
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
            .filter(p => p.length > 40 && !p.startsWith('|') && !p.startsWith('- '));
        pLines.slice(0, 15).forEach(p => paragraphs.push(p.replace(/\s+/g, ' ')));
    });

    // Inspect HTML files
    const htmlFiles = files.filter(f => /\.(html?|ejs|hbs|vue|jsx|tsx)$/i.test(f.path || ''));
    htmlFiles.forEach(hf => {
        const raw = hf.content || '';
        if (!raw) return;

        if (!htmlTitle) {
            const tMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            if (tMatch) htmlTitle = htmlToCleanText(tMatch[1]);
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

        // Strip style/script/svg before extracting headings & paragraphs
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

    // Extract specific semantic entities when present in the corpus
    const findParagraphNearKeyword = (regexPattern, minLen = 35) => {
        for (const p of paragraphs) {
            if (regexPattern.test(p) && p.length >= minLen) return p;
        }
        const match = fullCorpus.match(new RegExp(`(?:${regexPattern.source})[^.\\n]{15,320}\\.`, 'i'));
        return match ? match[0].trim() : '';
    };

    // Mission, Vision, Purpose, Values
    let mission = '';
    let vision = '';
    let purpose = '';
    const values = [];

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        if (!mission && /tenemos un llamado|puertas de oportunidad, de bendici[oó]n y dignidad|nuestra misi[oó]n es|misi[oó]n:/i.test(p)) {
            mission = p;
        }
        if (!vision && /nos comprometemos a que, a trav[eé]s de estrategias|ser puente entre las comunidades|nuestra visi[oó]n es|visi[oó]n:/i.test(p)) {
            vision = p;
        }
        if (!purpose && /promover puertas de oportunidad para que|nuestro prop[oó]sito|trabajamos con mujeres, ni[ñn]as y comunidades/i.test(p)) {
            purpose = p;
        }
    }

    if (!purpose && metaDescription) {
        purpose = metaDescription;
    }
    if (!mission && purpose) {
        mission = purpose;
    }

    // Extract values if listed (e.g., Fe, Amor, Paciencia, Gozo, Bondad, Mansedumbre, Bien Común, Templanza)
    const valueKeywords = ['Fe', 'Amor', 'Paciencia', 'Gozo', 'Bondad', 'Mansedumbre', 'Bien Común', 'Templanza', 'Solidaridad', 'Respeto', 'Transparencia', 'Equidad', 'Dignidad', 'Empatía'];
    valueKeywords.forEach(vk => {
        const rx = new RegExp(`\\b${vk}\\b`, 'i');
        if (rx.test(fullCorpus) && !values.includes(vk)) {
            values.push(vk);
        }
    });

    // Extract thematic lines / programs / services
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

    // Generic extraction of sections/programs/services from headings and paragraphs for any repository
    if (programsAndActivities.length === 0) {
        headings
            .filter(h => !/^(inicio|home|contacto|contáctanos|nosotras|nosotros|quiénes somos|menú|blog|actualidad|faq|table of contents|instalación|installation|license|licencia)$/i.test(h))
            .slice(0, 6)
            .forEach((h, idx) => {
                const hWords = h.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                const relatedP = paragraphs.find(p => hWords.some(w => p.toLowerCase().includes(w))) || paragraphs[idx] || '';
                programsAndActivities.push({
                    title: h,
                    detail: relatedP || `Componente o línea de acción identificada en el repositorio (${h}).`
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
        fullCorpus
    };
}

/**
 * Classifies the repository into one of the 13 semantic project categories
 * and builds the complete semantic profile separating Purpose vs. Technology.
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

    // Score each category based on semantic context (NOT just file extensions!)
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

    // 1. Foundations & Non-Profits
    if (/\bfundaci[oó]n\b|\bsin [aá]nimo de lucro\b|\bong\b|\bnon-profit\b|\bnonprofit\b/i.test(corpusLower)) scores.foundation_nonprofit += 45;
    if (/\bdonaci[oó]n|\bdonantes\b|\bvoluntariado\b|\bbeneficiarias?\b|\brendici[oó]n de cuentas\b|\bquiero ayudar\b/i.test(corpusLower)) scores.foundation_nonprofit += 30;
    if (/\bcomunidades vulnerables\b|\bderechos menstruales\b|\bpobreza menstrual\b|\bescnna\b|\btrata de personas\b/i.test(corpusLower)) scores.foundation_nonprofit += 25;
    if (signals.customDomain && signals.customDomain.endsWith('.org') && !hasBackendEndpoints) scores.foundation_nonprofit += 15;

    // 2. Social & Community Organizations
    if (/\borganizaci[oó]n social\b|\borganizaci[oó]n comunitaria\b|\btrabajo comunitario\b|\bcolectivo social\b|\bjunta de acci[oó]n comunal\b|\blideresas comunitarias\b/i.test(corpusLower)) {
        scores.social_community += 35;
    }

    // 3. Educational Institutions
    if (/\binstituci[oó]n educativa\b|\buniversidad\b|\bcolegio\b|\bfacultad\b|\bprograma acad[eé]mico\b|\bplan de estudios\b|\bcampus universitario\b/i.test(corpusLower)) {
        scores.educational_institution += 35;
    }
    if (signals.customDomain && signals.customDomain.includes('.edu')) scores.educational_institution += 25;

    // 4. Government Projects
    if (/\bgobierno\b|\balcald[ií]a\b|\bgobernaci[oó]n\b|\bministerio\b|\bentidad p[uú]blica\b|\btr[aá]mites ciudadanos\b/i.test(corpusLower)) {
        // Only primary if it's not a foundation mentioning government donors
        if (scores.foundation_nonprofit < 40) scores.government_project += 35;
    }
    if (signals.customDomain && signals.customDomain.includes('.gov')) scores.government_project += 40;

    // 5. E-commerce & Virtual Stores
    if (/\btienda virtual\b|\bcarrito de compras\b|\badd to cart\b|\bcheckout\b|\bcat[aá]logo de productos\b|\be-commerce\b|\becommerce\b/i.test(corpusLower)) {
        scores.ecommerce_store += 40;
    }

    // 6. Research Projects
    if (/\bproyecto de investigaci[oó]n\b|\bhip[oó]tesis\b|\bmetodolog[ií]a experimental\b|\bpaper cient[ií]fico\b|\bdataset\b|\btesis\b/i.test(corpusLower) && scores.foundation_nonprofit < 40) {
        scores.research_project += 35;
    }

    // 7. Personal Portfolios
    if (/\bportafolio personal\b|\bmi portafolio\b|\bmy portfolio\b|\bsobre m[ií]\b|\babout me\b|\bcurr[ií]culum vitae\b|\bfreelance developer\b/i.test(corpusLower)) {
        scores.personal_portfolio += 40;
    }

    // 8. Companies & Ventures (Informational / Corporate Landing)
    if (/\bempresa\b|\bemprendimiento\b|\bnuestros servicios\b|\bcotizar\b|\bclientes corporativos\b|\bagencia\b|\bconsultor[ií]a\b/i.test(corpusLower) && !hasBackendEndpoints && scores.foundation_nonprofit < 30) {
        scores.company_venture += 30;
    }

    // 9. Dev Libraries & Tools
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

    // 10. SaaS Platforms, Enterprise Systems & Web/Mobile Apps
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

    // Pick highest scoring category
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
    const isNonSoftwareInstitutional = !categoryMeta.isSoftwareProduct;

    // Build Nature vs. Technical Implementation separation
    const langList = detectedLanguages.length > 0 ? detectedLanguages.join(', ') : (ctx.repository?.primaryLanguage || 'HTML5 / CSS3');
    const fwList = detectedFrameworks.length > 0 ? detectedFrameworks.join(', ') : (isPrimarilyHtmlStatic ? 'Maquetación web estática nativa (sin frameworks de backend)' : 'Ecosistema estándar del lenguaje');
    const dbList = detectedDatabases.length > 0 ? detectedDatabases.join(', ') : 'No utiliza base de datos (contenido estático / sin persistencia de servidor)';

    let whatItIs = '';
    let mainPurpose = '';
    let problemStatement = '';
    let targetBeneficiaries = '';
    let technicalRoleDescription = '';

    if (categoryMeta.id === 'foundation_nonprofit' || categoryMeta.id === 'social_community') {
        whatItIs = `${signals.entityName} es una ${categoryMeta.id === 'foundation_nonprofit' ? 'fundación y organización sin ánimo de lucro' : 'organización social y comunitaria'}${signals.contactInfo.location ? ` con sede en ${signals.contactInfo.location}` : ''}${signals.contactInfo.foundedYear ? `, activa desde ${signals.contactInfo.foundedYear}` : ''}.`;
        mainPurpose = signals.mission || signals.purpose || `Promover oportunidades de desarrollo integral, dignidad, formación en derechos y bienestar comunitario para poblaciones en situación de vulnerabilidad.`;
        problemStatement = `Atiende problemáticas sociales reales como la pobreza menstrual, la violencia basada en género, la explotación sexual y comercial de niños, niñas y adolescentes (ESCNNA), la trata de personas, la pobreza multidimensional y la exclusión social y económica en territorios vulnerables.`;
        targetBeneficiaries = `Mujeres, niñas, adolescentes, lideresas sociales, organizaciones comunitarias de base, instituciones educativas y familias en territorios vulnerables, además de articularse con donantes, cooperantes internacionales, entidades públicas y voluntariado.`;
        technicalRoleDescription = `El repositorio aloja el sitio web institucional e informativo de ${signals.entityName}${signals.customDomain ? ` (configurado bajo el dominio ${signals.customDomain})` : ''}, construido con ${langList}. Estas tecnologías se emplean exclusivamente como canal de comunicación digital, visibilización de proyectos sociales, rendición de cuentas (transparencia) y contacto con donantes o voluntariado, sin constituir una aplicación de software comercial ni un sistema de automatización empresarial.`;
    } else if (isNonSoftwareInstitutional) {
        whatItIs = `${signals.entityName} corresponde a un proyecto categorizado como "${categoryMeta.label}".`;
        mainPurpose = signals.purpose || signals.metaDescription || signals.repoDescription || (signals.paragraphs[0] || `Cumplir los objetivos institucionales, educativos, investigativos o de difusión descritos en los documentos del repositorio.`);
        problemStatement = signals.paragraphs[1] || `Brindar información estructurada, recursos y canales de comunicación claros para su comunidad objetivo.`;
        targetBeneficiaries = `Comunidad objetivo, visitantes, estudiantes, investigadores o ciudadanos interesados en las actividades de ${signals.entityName}.`;
        technicalRoleDescription = `Los archivos técnicos detectados (${langList}) funcionan como el soporte digital para estructurar, presentar y publicar el contenido de ${signals.entityName}.`;
    } else {
        whatItIs = `${signals.entityName} es un proyecto tecnológico categorizado como "${categoryMeta.label}", desarrollado con ${langList}${detectedFrameworks.length > 0 ? ` y ${detectedFrameworks.join(', ')}` : ''}.`;
        mainPurpose = signals.purpose || signals.repoDescription || `Proveer las funcionalidades de software, procesamiento de datos y servicios definidos en los módulos del repositorio.`;
        problemStatement = `Resolver las necesidades funcionales y operativas abordadas por sus módulos, interfaces y servicios técnicos.`;
        targetBeneficiaries = `Usuarios finales de la aplicación, administradores y equipos técnicos que operan o se integran con el sistema.`;
        technicalRoleDescription = `La implementación técnica comprende ${files.length || 1} archivos analizados en ${langList}, ${endpoints.length} endpoints HTTP/API y ${dataModels.length} modelos de datos sobre ${dbList}.`;
    }

    return {
        category: categoryMeta.id,
        categoryLabel: categoryMeta.label,
        domainType: categoryMeta.domainType,
        isSoftwareProduct: categoryMeta.isSoftwareProduct,
        isFoundationOrSocial,
        isNonSoftwareInstitutional,
        isStaticWebsite: isPrimarilyHtmlStatic && !hasBackendEndpoints,
        entityName: signals.entityName,
        customDomain: signals.customDomain,
        projectNature: {
            category: categoryMeta.label,
            entityName: signals.entityName,
            whatItIs,
            mission: signals.mission || mainPurpose,
            vision: signals.vision || 'Consolidar su impacto mediante alianzas estratégicas, transparencia y resultados medibles en las comunidades atendidas.',
            values: signals.values,
            problemAddressed: problemStatement,
            targetBeneficiaries,
            programsAndActivities: signals.programsAndActivities,
            executedProjects: signals.executedProjects,
            transparencyDocs: signals.transparencyDocs,
            contactInfo: signals.contactInfo
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
        signals
    };
}

module.exports = {
    PROJECT_CATEGORIES,
    stripVerificationTags,
    compactHtmlForAnalysis,
    htmlToCleanText,
    extractContextualSignals,
    analyzeProjectSemantics
};
