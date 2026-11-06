/**
 * DOCUMENT-MIND AI — GITHUB PUBLIC REPO SYNC & DRIFT DETECTION SERVICE
 * Monitors public GitHub repositories without requiring client GitHub authentication.
 * Implements change detection, commit comparison, and architectural drift tracking.
 */

const { parseGitHubUrl } = require('./analyzer');

function getApiHeaders() {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DocumentMindAI-Platform/1.0'
    };
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
    }
    return headers;
}

/**
 * Lists available branches for a public GitHub repository.
 */
async function getBranchList(rawUrl) {
    const parsed = parseGitHubUrl(rawUrl);
    if (!parsed.valid) {
        const err = new Error(parsed.error);
        err.statusCode = 400;
        throw err;
    }

    const { owner, repo } = parsed;
    const headers = getApiHeaders();

    // 1. Fetch repo metadata to know default branch
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (repoRes.status === 404) {
        const err = new Error(`El repositorio "${owner}/${repo}" no fue encontrado o es privado.`);
        err.statusCode = 404;
        throw err;
    }
    if (!repoRes.ok) {
        const err = new Error(`Error consultando repositorio en GitHub API: ${repoRes.status}`);
        err.statusCode = repoRes.status;
        throw err;
    }
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    // 2. Fetch branches list
    const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=30`, { headers });
    let branches = [defaultBranch];
    if (branchRes.ok) {
        const list = await branchRes.json();
        if (Array.isArray(list)) {
            branches = list.map(b => b.name);
            if (!branches.includes(defaultBranch)) {
                branches.unshift(defaultBranch);
            }
        }
    }

    return {
        valid: true,
        owner,
        repo,
        defaultBranch,
        branches
    };
}

/**
 * Checks if a public GitHub repository has new commits compared to last known SHA.
 */
async function checkRepoUpdate(rawUrl, lastKnownSha = null, branch = null) {
    const parsed = parseGitHubUrl(rawUrl);
    if (!parsed.valid) {
        const err = new Error(parsed.error);
        err.statusCode = 400;
        throw err;
    }

    const { owner, repo } = parsed;
    const headers = getApiHeaders();

    // If branch not specified, get default
    let targetBranch = branch;
    if (!targetBranch) {
        const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        if (!metaRes.ok) {
            const err = new Error(`No se pudo verificar el repositorio "${owner}/${repo}": ${metaRes.statusText}`);
            err.statusCode = metaRes.status;
            throw err;
        }
        const meta = await metaRes.json();
        targetBranch = meta.default_branch || 'main';
    }

    // Fetch latest commit on target branch
    const commitUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(targetBranch)}`;
    const commitRes = await fetch(commitUrl, { headers });

    if (!commitRes.ok) {
        const err = new Error(`No se pudo consultar el commit más reciente de ${owner}/${repo} en la rama ${targetBranch}`);
        err.statusCode = commitRes.status;
        throw err;
    }

    const commitData = await commitRes.json();
    const currentSha = commitData.sha;
    const commitMessage = commitData.commit?.message || 'Sin mensaje de commit';
    const commitDate = commitData.commit?.committer?.date || new Date().toISOString();
    const author = commitData.commit?.author?.name || commitData.author?.login || 'Autor Desconocido';

    const hasUpdate = Boolean(lastKnownSha && currentSha && lastKnownSha !== currentSha);

    return {
        success: true,
        owner,
        repo,
        branch: targetBranch,
        currentSha,
        lastKnownSha,
        hasUpdate,
        commit: {
            sha: currentSha.substring(0, 7),
            fullSha: currentSha,
            message: commitMessage.split('\n')[0],
            date: commitDate,
            author
        },
        checkedAt: new Date().toISOString()
    };
}

/**
 * Calculates code and documentation drift between two versions of an analysis.
 */
function calculateRepoDrift(oldAnalysis, newAnalysis) {
    if (!oldAnalysis || !newAnalysis) {
        return {
            hasDrift: false,
            summary: 'Se requiere tanto el análisis previo como el nuevo para calcular la desviación.'
        };
    }

    const oldFiles = new Map((oldAnalysis.classifiedFiles || []).map(f => [f.path, f]));
    const newFiles = new Map((newAnalysis.classifiedFiles || []).map(f => [f.path, f]));

    const addedFiles = [];
    const modifiedFiles = [];
    const removedFiles = [];

    // Detect added and modified
    for (const [path, newF] of newFiles) {
        if (!oldFiles.has(path)) {
            addedFiles.push(path);
        } else {
            const oldF = oldFiles.get(path);
            if (oldF.hash && newF.hash && oldF.hash !== newF.hash) {
                modifiedFiles.push(path);
            } else if (oldF.size !== newF.size) {
                modifiedFiles.push(path);
            }
        }
    }

    // Detect removed
    for (const [path] of oldFiles) {
        if (!newFiles.has(path)) {
            removedFiles.push(path);
        }
    }

    // Compare Endpoints
    const oldEndpoints = new Set((oldAnalysis.endpoints || []).map(e => `${e.method} ${e.path}`));
    const newEndpoints = new Set((newAnalysis.endpoints || []).map(e => `${e.method} ${e.path}`));

    const addedEndpoints = [...newEndpoints].filter(e => !oldEndpoints.has(e));
    const removedEndpoints = [...oldEndpoints].filter(e => !newEndpoints.has(e));

    // Compare Models / DB
    const oldModels = new Set((oldAnalysis.dataModels || []).map(m => m.name));
    const newModels = new Set((newAnalysis.dataModels || []).map(m => m.name));

    const addedModels = [...newModels].filter(m => !oldModels.has(m));
    const removedModels = [...oldModels].filter(m => !newModels.has(m));

    // Affected Document Suite Sections
    const affectedDocs = [];
    if (addedEndpoints.length > 0 || removedEndpoints.length > 0) {
        affectedDocs.push({
            document: 'API Reference & OpenAPI 3.0.3',
            reason: `Se detectaron ${addedEndpoints.length} endpoints nuevos y ${removedEndpoints.length} endpoints obsoletos/eliminados.`,
            priority: 'Alta'
        });
    }
    if (addedModels.length > 0 || removedModels.length > 0) {
        affectedDocs.push({
            document: 'Diccionario de Datos & Diagrama ER',
            reason: `Cambios en entidades de datos (${addedModels.join(', ') || 'modelos alterados'}).`,
            priority: 'Alta'
        });
    }
    if (addedFiles.length > 0 || removedFiles.length > 0 || modifiedFiles.length > 0) {
        affectedDocs.push({
            document: 'README.md & Arquitectura C4',
            reason: `Estructura de archivos modificada (${addedFiles.length} agregados, ${modifiedFiles.length} modificados, ${removedFiles.length} eliminados).`,
            priority: 'Media'
        });
    }

    const hasDrift = addedFiles.length > 0 || modifiedFiles.length > 0 || removedFiles.length > 0 ||
                     addedEndpoints.length > 0 || removedEndpoints.length > 0 ||
                     addedModels.length > 0 || removedModels.length > 0;

    return {
        hasDrift,
        stats: {
            addedFilesCount: addedFiles.length,
            modifiedFilesCount: modifiedFiles.length,
            removedFilesCount: removedFiles.length,
            addedEndpointsCount: addedEndpoints.length,
            removedEndpointsCount: removedEndpoints.length,
            addedModelsCount: addedModels.length,
            removedModelsCount: removedModels.length
        },
        driftDetails: {
            addedFiles: addedFiles.slice(0, 30),
            modifiedFiles: modifiedFiles.slice(0, 30),
            removedFiles: removedFiles.slice(0, 30),
            addedEndpoints,
            removedEndpoints,
            addedModels,
            removedModels
        },
        affectedDocumentation: affectedDocs,
        calculatedAt: new Date().toISOString()
    };
}

module.exports = {
    getBranchList,
    checkRepoUpdate,
    calculateRepoDrift
};
