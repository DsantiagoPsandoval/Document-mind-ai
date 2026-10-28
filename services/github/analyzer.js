/**
 * DOCUMENT-MIND AI — GITHUB REPOSITORY ANALYZER SERVICE
 * Validates, fetches, filters, sanitizes secrets, and extracts real architectural context
 * from public GitHub repositories.
 */

const { sanitizeContent, sanitizeEnvFile } = require('../analyzer/sanitizer');
const { classifyFile, shouldIgnoreFile, computeFileHash } = require('../analyzer/fileClassifier');
const {
    detectLanguages,
    detectFrameworks,
    detectDatabases,
    detectInfrastructure,
    extractEndpoints,
    extractDataModels,
    buildProjectMap
} = require('../analyzer/localAnalyzer');

const MAX_KEY_FILES = 25;
const MAX_TOTAL_BYTES = 220 * 1024; // 220 KB total content limit for AI synthesis
const MAX_SINGLE_FILE_BYTES = 45 * 1024; // 45 KB per file limit

// Manifest and config files given top reading priority
const MANIFEST_FILES = [
    'package.json', 'requirements.txt', 'pyproject.toml', 'Pipfile',
    'pubspec.yaml', 'pom.xml', 'build.gradle', 'go.mod', 'Cargo.toml',
    'composer.json', 'Gemfile', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'
];

/**
 * Validates and extracts owner and repo name from various GitHub URL formats.
 */
function parseGitHubUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
        return { valid: false, error: 'Por favor ingresa una URL de repositorio GitHub.' };
    }

    const trimmed = rawUrl.trim();

    // SSRF Protection: Block localhost, loopback, private IP ranges and cloud metadata endpoints
    if (/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|169\.254\.169\.254|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+|\[::1\]|^file:\/\/|^ftp:\/\/|^gopher:\/\/)/i.test(trimmed)) {
        return {
            valid: false,
            error: 'Seguridad SSRF: Destino bloqueado. Solo se permiten repositorios alojados en github.com vía HTTPS.'
        };
    }

    const regex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+?)(?:\.git|\/.*)?$/i;
    const match = trimmed.match(regex);

    if (!match) {
        return {
            valid: false,
            error: 'La URL ingresada no es válida. Debe tener el formato: https://github.com/usuario/repositorio'
        };
    }

    const owner = match[1];
    const repo = match[2];

    if (!owner || !repo) {
        return { valid: false, error: 'No se pudo identificar el propietario o el nombre del repositorio.' };
    }

    return { valid: true, owner, repo, cleanUrl: `https://github.com/${owner}/${repo}` };
}

/**
 * Creates GitHub API headers (optional GITHUB_TOKEN for higher rate limits).
 */
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
 * Builds a visual directory structure tree string (up to 4 levels deep).
 */
function buildTreeDiagram(files) {
    const paths = files.map(f => f.path).sort();
    const tree = {};

    paths.forEach(p => {
        const parts = p.split('/');
        let current = tree;
        parts.forEach((part, idx) => {
            if (idx === parts.length - 1) {
                current[part] = null; // file
            } else {
                current[part] = current[part] || {};
                current = current[part];
            }
        });
    });

    const lines = [];
    function printNode(node, prefix = '', depth = 0) {
        if (depth > 4) return;
        const entries = Object.keys(node).sort((a, b) => {
            const isDirA = node[a] !== null;
            const isDirB = node[b] !== null;
            if (isDirA && !isDirB) return -1;
            if (!isDirA && isDirB) return 1;
            return a.localeCompare(b);
        });

        entries.slice(0, 20).forEach((name, idx) => {
            const isLast = idx === entries.length - 1;
            const pointer = isLast ? '└── ' : '├── ';
            const isDir = node[name] !== null;
            lines.push(prefix + pointer + name + (isDir ? '/' : ''));
            if (isDir) {
                printNode(node[name], prefix + (isLast ? '    ' : '│   '), depth + 1);
            }
        });
        if (entries.length > 20) {
            lines.push(prefix + '└── ... (' + (entries.length - 20) + ' elementos más)');
        }
    }

    printNode(tree, '', 0);
    return lines.join('\n');
}

/**
 * Main function: Analyzes a public GitHub repository.
 */
async function fetchAndAnalyzeRepo(rawUrl) {
    const parsed = parseGitHubUrl(rawUrl);
    if (!parsed.valid) {
        const err = new Error(parsed.error);
        err.statusCode = 400;
        throw err;
    }

    const { owner, repo, cleanUrl } = parsed;
    const headers = getApiHeaders();

    // 1. Fetch Repository Metadata
    const repoMetaUrl = `https://api.github.com/repos/${owner}/${repo}`;
    let repoData;
    try {
        const res = await fetch(repoMetaUrl, { headers });
        if (res.status === 404) {
            const err = new Error(`El repositorio "${owner}/${repo}" no fue encontrado o es privado. Asegúrate de que sea un repositorio público.`);
            err.statusCode = 404;
            throw err;
        }
        if (res.status === 403) {
            const err = new Error('Límite de solicitudes de la API de GitHub alcanzado. Intenta de nuevo más tarde o configura un GITHUB_TOKEN en el archivo .env.');
            err.statusCode = 429;
            throw err;
        }
        if (!res.ok) {
            const err = new Error(`Error de GitHub API (${res.status}): ${res.statusText}`);
            err.statusCode = res.status;
            throw err;
        }
        repoData = await res.json();
    } catch (netErr) {
        if (netErr.statusCode) throw netErr;
        const err = new Error(`No se pudo conectar con GitHub: ${netErr.message}`);
        err.statusCode = 502;
        throw err;
    }

    const defaultBranch = repoData.default_branch || 'main';

    // 2. Fetch Git Tree recursively
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
    let treeData = { tree: [] };
    try {
        const treeRes = await fetch(treeUrl, { headers });
        if (treeRes.ok) {
            treeData = await treeRes.json();
        }
    } catch (treeErr) {
        console.warn(`[GitHub Analyzer] Warning fetching tree for ${owner}/${repo}:`, treeErr.message);
    }

    const rawTree = Array.isArray(treeData.tree) ? treeData.tree : [];

    // 3. Filter relevant files and classify them
    const relevantFiles = [];
    const ignoredFiles = [];

    rawTree.forEach(item => {
        if (item.type !== 'blob') return;
        if (shouldIgnoreFile(item.path)) {
            ignoredFiles.push({ path: item.path, size: item.size || 0 });
        } else {
            const category = classifyFile(item.path);
            relevantFiles.push({
                path: item.path,
                size: item.size || 0,
                category
            });
        }
    });

    // 4. Sort and prioritize files to download
    relevantFiles.sort((a, b) => {
        const aName = a.path.split('/').pop().toLowerCase();
        const bName = b.path.split('/').pop().toLowerCase();

        const aIsManifest = MANIFEST_FILES.includes(aName);
        const bIsManifest = MANIFEST_FILES.includes(bName);
        if (aIsManifest && !bIsManifest) return -1;
        if (!aIsManifest && bIsManifest) return 1;

        const aIsReadme = aName.startsWith('readme');
        const bIsReadme = bName.startsWith('readme');
        if (aIsReadme && !bIsReadme) return -1;
        if (!aIsReadme && bIsReadme) return 1;

        const aIsCore = /^(index|app|main|server)\./i.test(aName);
        const bIsCore = /^(index|app|main|server)\./i.test(bName);
        if (aIsCore && !bIsCore) return -1;
        if (!aIsCore && bIsCore) return 1;

        return a.path.localeCompare(b.path);
    });

    const keyFilesToFetch = relevantFiles.slice(0, MAX_KEY_FILES);
    const prioritizedFiles = [];
    const manifests = {};
    let totalBytesFetched = 0;

    for (const file of keyFilesToFetch) {
        if (totalBytesFetched >= MAX_TOTAL_BYTES) break;

        const rawFileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`;
        try {
            const fRes = await fetch(rawFileUrl);
            if (fRes.ok) {
                const rawContent = await fRes.text();
                const fileName = file.path.split('/').pop().toLowerCase();

                // SANITIZATION: Strict protection of secrets
                let cleanContent;
                if (fileName.startsWith('.env')) {
                    const envRes = sanitizeEnvFile(rawContent);
                    cleanContent = envRes.sanitizedContent;
                } else {
                    cleanContent = sanitizeContent(rawContent);
                }

                const contentSnippet = cleanContent.substring(0, MAX_SINGLE_FILE_BYTES);
                totalBytesFetched += contentSnippet.length;

                const hash = computeFileHash(contentSnippet);
                const category = classifyFile(file.path, contentSnippet);

                prioritizedFiles.push({
                    path: file.path,
                    size: file.size || contentSnippet.length,
                    category,
                    hash,
                    content: contentSnippet
                });

                if (fileName === 'package.json') {
                    try { manifests['package.json'] = JSON.parse(contentSnippet); } catch (e) {}
                } else if (MANIFEST_FILES.includes(fileName)) {
                    manifests[fileName] = contentSnippet;
                }
            }
        } catch (fErr) {
            console.warn(`[GitHub Analyzer] Failed to fetch ${file.path}:`, fErr.message);
        }
    }

    // 5. Local Static Analysis
    const detectedLanguages = detectLanguages(relevantFiles);
    const detectedFrameworks = detectFrameworks(manifests, relevantFiles);
    const detectedDatabases = detectDatabases(manifests, relevantFiles);
    const detectedInfra = detectInfrastructure(manifests, relevantFiles);
    const endpoints = extractEndpoints(prioritizedFiles);
    const dataModels = extractDataModels(prioritizedFiles);

    const allDetectedTechnologies = Array.from(new Set([
        ...detectedLanguages,
        ...detectedFrameworks,
        ...detectedDatabases,
        ...detectedInfra
    ]));

    const treeDiagram = buildTreeDiagram(relevantFiles);
    const projectMap = buildProjectMap(prioritizedFiles, allDetectedTechnologies, endpoints, dataModels);

    return {
        repository: {
            name: repoData.name,
            fullName: repoData.full_name,
            owner: repoData.owner ? repoData.owner.login : owner,
            description: repoData.description || 'Sin descripción provista por el repositorio.',
            url: cleanUrl,
            stars: repoData.stargazers_count || 0,
            forks: repoData.forks_count || 0,
            openIssues: repoData.open_issues_count || 0,
            defaultBranch,
            primaryLanguage: repoData.language || (detectedLanguages[0] || 'Multi-lenguaje'),
            createdAt: repoData.created_at,
            updatedAt: repoData.updated_at,
            analysisDate: new Date().toISOString()
        },
        stats: {
            totalFiles: rawTree.length,
            relevantFilesCount: relevantFiles.length,
            ignoredFilesCount: ignoredFiles.length,
            analyzedFilesCount: prioritizedFiles.length,
            technologiesCount: allDetectedTechnologies.length
        },
        detectedLanguages,
        detectedFrameworks,
        detectedDatabases,
        detectedInfra,
        detectedTechnologies: allDetectedTechnologies,
        treeDiagram,
        relevantFilesList: relevantFiles.map(f => ({ path: f.path, category: f.category, size: f.size })),
        ignoredFilesList: ignoredFiles.slice(0, 100),
        prioritizedFiles,
        endpoints,
        dataModels,
        projectMap
    };
}

module.exports = {
    parseGitHubUrl,
    fetchAndAnalyzeRepo,
    detectLanguages,
    detectFrameworks,
    detectDatabases,
    detectInfrastructure,
    buildTreeDiagram
};
