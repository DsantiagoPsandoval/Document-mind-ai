/**
 * DOCUMENT-MIND AI — STRUCTURED MEMORY & CACHE ENGINE
 * Reduces Gemini token consumption drastically by persisting structured analyses,
 * performing semantic slice queries, and calculating cross-version structural diffs.
 */

// In-memory memory store (capped at 50 recent projects)
const analysisCache = new Map();
const MAX_CACHE_ENTRIES = 50;

/**
 * Stores a project's structured analysis into memory cache.
 */
function setCachedAnalysis(projectId, analysisData) {
    if (!projectId || !analysisData) return;

    if (analysisCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = analysisCache.keys().next().value;
        analysisCache.delete(oldestKey);
    }

    analysisCache.set(projectId, {
        ...analysisData,
        cachedAt: new Date().toISOString()
    });
}

/**
 * Retrieves a cached structured analysis.
 */
function getCachedAnalysis(projectId) {
    return analysisCache.get(projectId) || null;
}

/**
 * Gets targeted contextual slice for a chat query without sending the whole project.
 * E.g., if asking about database, returns database schemas, models, and db files.
 */
function getTargetedChatContext(analysisData, query) {
    const q = (query || '').toLowerCase();
    const { summary, architecture, projectMap, keyFiles, detectedTechnologies } = analysisData;

    let focusedContext = `PROYECTO: ${analysisData.projectName || 'Proyecto'}\n`;
    focusedContext += `TECNOLOGÍAS: ${detectedTechnologies ? detectedTechnologies.join(', ') : 'No especificadas'}\n\n`;

    // Check query intent
    const isDbQuery = /base de datos|database|bd|tabla|schema|modelo|sql|postgres|mongo|mysql|sqlite/i.test(q);
    const isAuthQuery = /auth|autenticación|login|token|jwt|sesión|usuario|password|seguridad/i.test(q);
    const isApiQuery = /api|endpoint|ruta|get|post|put|delete|servicio|controlador/i.test(q);
    const isDevOpsQuery = /docker|deploy|despliegue|ci\/cd|pipeline|k8s|kubernetes|servidor|nube/i.test(q);
    const isQaQuery = /test|prueba|qa|unit|cobertura|jest|cypress/i.test(q);

    if (isDbQuery && projectMap && projectMap.database) {
        focusedContext += `SECCIÓN BASE DE DATOS:\n`;
        focusedContext += `Modelos detectados: ${JSON.stringify(projectMap.database.models || [])}\n`;
        if (analysisData.databaseDoc) {
            focusedContext += `Resumen DB: ${analysisData.databaseDoc.overview || ''}\n`;
        }
    } else if (isAuthQuery && projectMap && projectMap.auth) {
        focusedContext += `SECCIÓN AUTENTICACIÓN:\n`;
        focusedContext += `Archivos de autenticación: ${JSON.stringify(projectMap.auth.files || [])}\n`;
    } else if (isApiQuery && projectMap && projectMap.api) {
        focusedContext += `SECCIÓN API Y ENDPOINTS:\n`;
        focusedContext += `Endpoints detectados: ${JSON.stringify((projectMap.api.endpoints || []).slice(0, 15))}\n`;
    } else if (isDevOpsQuery && projectMap && projectMap.devops) {
        focusedContext += `SECCIÓN DEVOPS E INFRAESTRUCTURA:\n`;
        focusedContext += `Archivos DevOps: ${JSON.stringify(projectMap.devops.files || [])}\n`;
    } else if (isQaQuery && projectMap && projectMap.tests) {
        focusedContext += `SECCIÓN PRUEBAS Y QA:\n`;
        focusedContext += `Archivos de prueba: ${projectMap.tests.testFilesCount || 0} detectados.\n`;
    } else {
        // General query: provide architectural summary and top components
        focusedContext += `ARQUITECTURA GENERAL:\n${architecture ? (architecture.overview || '') : ''}\n`;
    }

    // Include top relevant file snippets matching query terms
    const relevantSnippets = [];
    if (Array.isArray(keyFiles)) {
        for (const file of keyFiles) {
            const pathLower = file.path.toLowerCase();
            const contentLower = (file.content || '').toLowerCase();
            const words = q.match(/[a-záéíóúüñ]{3,}/gi) || [];
            const matchesWord = words.some(w => pathLower.includes(w) || contentLower.includes(w));
            if (matchesWord && relevantSnippets.length < 3) {
                relevantSnippets.push(`[ARCHIVO: ${file.path}]\n${(file.content || '').substring(0, 2000)}`);
            }
        }
    }

    if (relevantSnippets.length > 0) {
        focusedContext += `\nARCHIVOS DIRECTAMENTE RELEVANTES:\n` + relevantSnippets.join('\n\n');
    }

    return focusedContext;
}

/**
 * Compares two versions of project analyses to generate a structural diff.
 */
function compareAnalyses(oldAnalysis, newAnalysis) {
    if (!oldAnalysis || !newAnalysis) {
        return { diffs: [], summary: 'No hay suficientes versiones para comparar.' };
    }

    const diffs = [];

    // 1. Files Comparison
    const oldFiles = new Set((oldAnalysis.classifiedFiles || []).map(f => f.path));
    const newFiles = new Set((newAnalysis.classifiedFiles || []).map(f => f.path));

    newFiles.forEach(f => {
        if (!oldFiles.has(f)) {
            diffs.push({ type: 'added', category: 'Archivo', text: `+ Nuevo archivo agregado: ${f}` });
        }
    });

    oldFiles.forEach(f => {
        if (!newFiles.has(f)) {
            diffs.push({ type: 'removed', category: 'Archivo', text: `- Archivo eliminado: ${f}` });
        }
    });

    // 2. Endpoints Comparison
    const oldEndpoints = new Set((oldAnalysis.endpoints || []).map(e => `${e.method} ${e.path}`));
    const newEndpoints = new Set((newAnalysis.endpoints || []).map(e => `${e.method} ${e.path}`));

    newEndpoints.forEach(ep => {
        if (!oldEndpoints.has(ep)) {
            diffs.push({ type: 'added', category: 'API', text: `+ Nuevo endpoint: ${ep}` });
        }
    });

    oldEndpoints.forEach(ep => {
        if (!newEndpoints.has(ep)) {
            diffs.push({ type: 'removed', category: 'API', text: `- Endpoint eliminado: ${ep}` });
        }
    });

    // 3. Models Comparison
    const oldModels = new Set((oldAnalysis.dataModels || []).map(m => m.name));
    const newModels = new Set((newAnalysis.dataModels || []).map(m => m.name));

    newModels.forEach(m => {
        if (!oldModels.has(m)) {
            diffs.push({ type: 'added', category: 'Base de Datos', text: `+ Nueva entidad/tabla: ${m}` });
        }
    });

    oldModels.forEach(m => {
        if (!newModels.has(m)) {
            diffs.push({ type: 'removed', category: 'Base de Datos', text: `- Entidad eliminada: ${m}` });
        }
    });

    return {
        diffs,
        totalChanges: diffs.length,
        comparedAt: new Date().toISOString()
    };
}

module.exports = {
    setCachedAnalysis,
    getCachedAnalysis,
    getTargetedChatContext,
    compareAnalyses
};
