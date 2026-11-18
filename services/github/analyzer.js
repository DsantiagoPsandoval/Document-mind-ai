/**
 * DOCUMENT-MIND AI — GITHUB REPOSITORY ANALYZER SERVICE
 * Validates, fetches, filters, sanitizes secrets, and extracts real architectural context
 * from public GitHub repositories.
 */

const { sanitizeContent, sanitizeEnvFile } = require('../analyzer/sanitizer');
const { classifyFile, shouldIgnoreFile, computeFileHash } = require('../analyzer/fileClassifier');
const { extractSafeZipFiles } = require('../analyzer/safeZip');
const {
    detectLanguages,
    detectFrameworks,
    detectDatabases,
    detectInfrastructure,
    extractEndpoints,
    extractDataModels,
    buildProjectMap
} = require('../analyzer/localAnalyzer');
const {
    compactHtmlForAnalysis,
    analyzeProjectSemantics
} = require('../analyzer/semanticClassifier');
const { PrivateRepoService } = require('./privateRepoService');

const MAX_KEY_FILES = 25;
const MAX_TOTAL_BYTES = 300 * 1024; // 300 KB total content limit for AI synthesis
const MAX_SINGLE_FILE_BYTES = 85 * 1024; // 85 KB per file limit (with HTML style/SVG compaction)

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
 * Creates GitHub API headers.
 * Uses the user's isolated OAuth/GitHub App token when available; falls back to optional
 * global GITHUB_TOKEN exclusively for public repository rate-limit relief.
 */
function getApiHeaders(userAccessToken = null) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DocumentMindAI-Platform/3.0'
    };
    if (userAccessToken && String(userAccessToken).trim()) {
        headers['Authorization'] = `Bearer ${String(userAccessToken).trim()}`;
    } else if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
    }
    return headers;
}

/**
 * Analyzes an in-memory / sandbox repository (public or private) after permission verification.
 */
function analyzeRepositoryFilesList(owner, repo, cleanUrl, targetBranch, isPrivate, rawFiles = [], description = '') {
    const prioritizedFiles = [];
    const relevantFiles = [];
    const manifests = {};

    rawFiles.forEach(f => {
        if (!f.path || shouldIgnoreFile(f.path)) return;
        const rawContent = f.content || '';
        const fileName = f.path.split('/').pop().toLowerCase();
        const cleanContent = fileName.startsWith('.env')
            ? sanitizeEnvFile(rawContent).sanitizedContent
            : sanitizeContent(rawContent);
        const isHtmlFile = /\.(html?|ejs|hbs)$/i.test(fileName);
        const contentSnippet = isHtmlFile
            ? compactHtmlForAnalysis(cleanContent, MAX_SINGLE_FILE_BYTES)
            : cleanContent.substring(0, MAX_SINGLE_FILE_BYTES);
        const category = classifyFile(f.path, contentSnippet);
        const hash = computeFileHash(contentSnippet);

        relevantFiles.push({ path: f.path, size: contentSnippet.length, category });
        prioritizedFiles.push({
            path: f.path,
            size: contentSnippet.length,
            category,
            hash,
            content: contentSnippet
        });

        if (fileName === 'package.json') {
            try { manifests['package.json'] = JSON.parse(contentSnippet); } catch (_) {}
        } else if (MANIFEST_FILES.includes(fileName)) {
            manifests[fileName] = contentSnippet;
        }
    });

    const detectedLanguages = detectLanguages(prioritizedFiles);
    const detectedFrameworks = detectFrameworks(manifests, prioritizedFiles);
    const detectedDatabases = detectDatabases(manifests, prioritizedFiles);
    const detectedInfra = detectInfrastructure(manifests, prioritizedFiles);
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

    const semanticProfile = analyzeProjectSemantics({
        projectName: repo,
        repoDescription: description,
        repository: { name: repo, fullName: `${owner}/${repo}`, description, private: isPrivate },
        detectedLanguages,
        detectedFrameworks,
        detectedDatabases,
        detectedInfra,
        endpoints,
        dataModels,
        prioritizedFiles
    });

    const effectiveDescription = description
        || semanticProfile.signals?.metaDescription
        || semanticProfile.projectNature?.whatItIs
        || 'Repositorio analizado por DocuMind AI.';

    return {
        repository: {
            name: repo,
            fullName: `${owner}/${repo}`,
            owner,
            private: Boolean(isPrivate),
            visibility: isPrivate ? 'private' : 'public',
            description: effectiveDescription,
            url: cleanUrl,
            stars: 0,
            forks: 0,
            openIssues: 0,
            defaultBranch: targetBranch,
            branch: targetBranch,
            primaryLanguage: detectedLanguages[0] || 'Multi-lenguaje',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            analysisDate: new Date().toISOString(),
            projectCategory: semanticProfile.category,
            projectCategoryLabel: semanticProfile.categoryLabel,
            entityName: semanticProfile.entityName
        },
        projectCategory: semanticProfile.category,
        projectCategoryLabel: semanticProfile.categoryLabel,
        semanticProfile,
        stats: {
            totalFiles: relevantFiles.length,
            relevantFilesCount: relevantFiles.length,
            ignoredFilesCount: 0,
            analyzedFilesCount: prioritizedFiles.length,
            technologiesCount: allDetectedTechnologies.length
        },
        detectedLanguages,
        detectedFrameworks,
        detectedDatabases,
        detectedInfra,
        detectedTechnologies: allDetectedTechnologies,
        treeDiagram,
        relevantFilesList: relevantFiles,
        ignoredFilesList: [],
        prioritizedFiles,
        endpoints,
        dataModels,
        projectMap
    };
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
 * Main function: Analyzes a public or authorized private GitHub repository.
 * @param {string} rawUrl - GitHub repository URL
 * @param {string|null} branch - Optional branch name
 * @param {object} [options] - Optional { userId, userAccessToken } for private repositories
 */
async function fetchAndAnalyzeRepo(rawUrl, branch = null, options = {}) {
    const parsed = parseGitHubUrl(rawUrl);
    if (!parsed.valid) {
        const err = new Error(parsed.error);
        err.statusCode = 400;
        throw err;
    }

    const { owner, repo, cleanUrl } = parsed;
    const userId = options.userId || null;

    // 0. Check if this is an authorized Sandbox repository (for multi-account private/public testing)
    const sandboxMatch = PrivateRepoService.getSandboxRepository(userId, owner, repo);
    if (sandboxMatch && sandboxMatch.repository) {
        const sbRepo = sandboxMatch.repository;
        const targetBranch = branch || sbRepo.default_branch || 'main';
        if (Array.isArray(sbRepo.branches) && !sbRepo.branches.includes(targetBranch)) {
            const err = new Error(`La rama "${targetBranch}" no existe en el repositorio "${sbRepo.full_name}". Ramas disponibles: ${sbRepo.branches.join(', ')}.`);
            err.statusCode = 404;
            throw err;
        }
        return analyzeRepositoryFilesList(
            owner,
            repo,
            cleanUrl,
            targetBranch,
            sbRepo.private,
            sbRepo.files || [],
            sbRepo.description || ''
        );
    }

    // Resolve user-specific GitHub token from isolated backend session
    const userSession = userId ? PrivateRepoService.getDecryptedUserSession(userId) : null;
    const userAccessToken = (userSession && !userSession.isSandbox)
        ? userSession.accessToken
        : (options.userAccessToken || null);

    const headers = getApiHeaders(userAccessToken);

    // 1. Fetch Repository Metadata
    const repoMetaUrl = `https://api.github.com/repos/${owner}/${repo}`;
    let repoData;
    try {
        const res = await fetch(repoMetaUrl, { headers });
        if (res.status === 401) {
            if (userId) PrivateRepoService.disconnectGitHub(userId);
            const err = new Error('Tu sesión de GitHub ha expirado o el token fue revocado. Vuelve a conectar tu cuenta de GitHub.');
            err.statusCode = 401;
            throw err;
        }
        if (res.status === 404) {
            const hint = userAccessToken
                ? `El repositorio "${owner}/${repo}" no existe o tu cuenta de GitHub conectada (${userSession?.username ? '@' + userSession.username : 'actual'}) no tiene permisos de lectura sobre él.`
                : `El repositorio "${owner}/${repo}" no fue encontrado o es privado. Si es un repositorio privado, conecta tu cuenta de GitHub en el panel superior.`;
            const err = new Error(hint);
            err.statusCode = 404;
            throw err;
        }
        if (res.status === 403 || res.status === 429) {
            if (userAccessToken) {
                const resetHeader = res.headers.get('x-ratelimit-reset');
                const resetTime = resetHeader ? new Date(Number(resetHeader) * 1000).toLocaleTimeString('es-ES') : 'unos minutos';
                const err = new Error(`Acceso restringido o límite de GitHub API alcanzado para "${owner}/${repo}". Verifica tus permisos de lectura o reintenta después de ${resetTime}.`);
                err.statusCode = res.status;
                throw err;
            }
            console.log(`[GitHub Analyzer] GitHub REST API rate limit reached (${res.status}). Activating public zipball fallback for ${owner}/${repo}`);
            return await fetchAndAnalyzeViaZipball(owner, repo, branch, cleanUrl);
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

    // SECURITY ISOLATION RULE: Never allow global GITHUB_TOKEN to unlock private repositories for unauthenticated users
    if (repoData.private && !userAccessToken) {
        const err = new Error(`El repositorio "${owner}/${repo}" es privado. Por seguridad y aislamiento de datos, debes conectar tu propia cuenta de GitHub autorizada para analizarlo.`);
        err.statusCode = 403;
        throw err;
    }

    // Verify read permissions if GitHub returned permissions object
    if (repoData.permissions && repoData.permissions.pull === false) {
        const err = new Error(`Permisos insuficientes: Tu cuenta de GitHub no cuenta con permiso de lectura (pull/contents:read) sobre "${owner}/${repo}".`);
        err.statusCode = 403;
        throw err;
    }

    const defaultBranch = repoData.default_branch || 'main';
    const targetBranch = branch || defaultBranch;

    // 2. Fetch Git Tree recursively
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`;
    let treeData = { tree: [] };
    try {
        const treeRes = await fetch(treeUrl, { headers });
        if ((treeRes.status === 403 || treeRes.status === 429) && !repoData.private) {
            console.log(`[GitHub Analyzer] GitHub tree rate limit reached (${treeRes.status}). Activating public zipball fallback for ${owner}/${repo}`);
            return await fetchAndAnalyzeViaZipball(owner, repo, targetBranch, cleanUrl);
        }
        if (treeRes.ok) {
            treeData = await treeRes.json();
        } else if (!repoData.private) {
            console.warn(`[GitHub Analyzer] Warning tree response not ok (${treeRes.status}). Activating public zipball fallback for ${owner}/${repo}`);
            return await fetchAndAnalyzeViaZipball(owner, repo, targetBranch, cleanUrl);
        } else {
            const err = new Error(`No se pudo obtener el árbol de archivos de la rama "${targetBranch}" en el repositorio privado "${owner}/${repo}" (HTTP ${treeRes.status}).`);
            err.statusCode = treeRes.status;
            throw err;
        }
    } catch (treeErr) {
        if (treeErr.statusCode) throw treeErr;
        if (!repoData.private) {
            console.warn(`[GitHub Analyzer] Warning fetching tree for ${owner}/${repo}:`, treeErr.message);
            return await fetchAndAnalyzeViaZipball(owner, repo, targetBranch, cleanUrl);
        }
        throw treeErr;
    }

    const rawTree = Array.isArray(treeData.tree) ? treeData.tree : [];
    if (rawTree.length === 0 && !repoData.private) {
        console.log(`[GitHub Analyzer] Empty Git tree received for ${owner}/${repo}. Activating public zipball fallback`);
        return await fetchAndAnalyzeViaZipball(owner, repo, targetBranch, cleanUrl);
    }

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

        try {
            let fRes;
            if (repoData.private || userAccessToken) {
                const encodedPath = file.path.split('/').map(encodeURIComponent).join('/');
                const apiContentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(targetBranch)}`;
                fRes = await fetch(apiContentUrl, {
                    headers: {
                        ...headers,
                        'Accept': 'application/vnd.github.v3.raw'
                    }
                });
            } else {
                const rawFileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(targetBranch)}/${file.path}`;
                fRes = await fetch(rawFileUrl);
            }

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

                const isHtmlFile = /\.(html?|ejs|hbs)$/i.test(fileName);
                const contentSnippet = isHtmlFile
                    ? compactHtmlForAnalysis(cleanContent, MAX_SINGLE_FILE_BYTES)
                    : cleanContent.substring(0, MAX_SINGLE_FILE_BYTES);
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
    const detectedLanguages = Array.from(new Set([...detectLanguages(relevantFiles), ...detectLanguages(prioritizedFiles)]));
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

    const semanticProfile = analyzeProjectSemantics({
        projectName: repoData.name,
        repoDescription: repoData.description || '',
        repository: { name: repoData.name, fullName: repoData.full_name, description: repoData.description || '' },
        detectedLanguages,
        detectedFrameworks,
        detectedDatabases,
        detectedInfra,
        endpoints,
        dataModels,
        prioritizedFiles
    });

    const effectiveDescription = repoData.description
        || semanticProfile.signals?.metaDescription
        || semanticProfile.projectNature?.whatItIs
        || 'Repositorio analizado por DocuMind AI.';

    return {
        repository: {
            name: repoData.name,
            fullName: repoData.full_name,
            owner: repoData.owner ? repoData.owner.login : owner,
            private: Boolean(repoData.private),
            visibility: repoData.private ? 'private' : 'public',
            description: effectiveDescription,
            url: cleanUrl,
            stars: repoData.stargazers_count || 0,
            forks: repoData.forks_count || 0,
            openIssues: repoData.open_issues_count || 0,
            defaultBranch,
            branch: targetBranch,
            primaryLanguage: repoData.language || (detectedLanguages[0] || 'Multi-lenguaje'),
            createdAt: repoData.created_at,
            updatedAt: repoData.updated_at,
            analysisDate: new Date().toISOString(),
            projectCategory: semanticProfile.category,
            projectCategoryLabel: semanticProfile.categoryLabel,
            entityName: semanticProfile.entityName
        },
        projectCategory: semanticProfile.category,
        projectCategoryLabel: semanticProfile.categoryLabel,
        semanticProfile,
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


/**
 * Seamless fallback that downloads and extracts public GitHub zipball directly
 * when GitHub REST API rate limits (60 req/h per IP) are reached on cloud environments like Render.
 */
async function fetchAndAnalyzeViaZipball(owner, repo, branch, cleanUrl) {
    const candidateBranches = [branch, 'main', 'master', 'dev', 'trunk'].filter(Boolean);
    const uniqueBranches = Array.from(new Set(candidateBranches));

    let zipRes = null;
    let resolvedBranch = branch || 'main';

    for (const b of uniqueBranches) {
        const zipUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${encodeURIComponent(b)}`;
        try {
            const r = await fetch(zipUrl);
            if (r.ok) {
                zipRes = r;
                resolvedBranch = b;
                break;
            }
        } catch (e) {}
    }

    if (!zipRes || !zipRes.ok) {
        for (const b of uniqueBranches) {
            const altZipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${encodeURIComponent(b)}.zip`;
            try {
                const r = await fetch(altZipUrl);
                if (r.ok) {
                    zipRes = r;
                    resolvedBranch = b;
                    break;
                }
            } catch (e) {}
        }
    }

    if (!zipRes || !zipRes.ok) {
        const err = new Error(`El repositorio "${owner}/${repo}" no fue encontrado o es privado. Asegúrate de que sea un repositorio público.`);
        err.statusCode = 404;
        throw err;
    }

    const arrayBuffer = await zipRes.arrayBuffer();
    const rawZipFiles = extractSafeZipFiles(Buffer.from(arrayBuffer));

    // Strip root archive directory prefix (e.g. "express-master/lib/express.js" -> "lib/express.js")
    const files = rawZipFiles.map(f => {
        const parts = f.path.split('/');
        parts.shift();
        return {
            ...f,
            path: parts.join('/')
        };
    }).filter(f => f.path && !shouldIgnoreFile(f.path));

    const manifests = {};
    files.forEach(f => {
        const fileName = f.path.split('/').pop().toLowerCase();
        if (MANIFEST_FILES.includes(fileName)) {
            manifests[fileName] = f.content;
        }
    });

    const detectedLanguages = detectLanguages(files);
    const detectedFrameworks = detectFrameworks(manifests, files);
    const detectedDatabases = detectDatabases(manifests, files);
    const detectedInfra = detectInfrastructure(manifests, files);

    const allDetectedTechnologies = Array.from(new Set([
        ...detectedLanguages,
        ...detectedFrameworks,
        ...detectedDatabases,
        ...detectedInfra
    ]));

    const endpoints = extractEndpoints(files);
    const dataModels = extractDataModels(files);
    const projectMap = buildProjectMap(files, allDetectedTechnologies, endpoints, dataModels);
    const treeDiagram = buildTreeDiagram(files);

    const prioritizedFiles = files.slice(0, MAX_KEY_FILES).map(f => {
        const isHtmlFile = /\.(html?|ejs|hbs)$/i.test(f.path || '');
        const cleanBody = isHtmlFile
            ? compactHtmlForAnalysis(f.content || '', MAX_SINGLE_FILE_BYTES)
            : (f.content || '').substring(0, MAX_SINGLE_FILE_BYTES);
        return {
            path: f.path,
            size: f.size,
            category: f.category || classifyFile(f.path),
            hash: computeFileHash(cleanBody),
            content: cleanBody
        };
    });

    const semanticProfile = analyzeProjectSemantics({
        projectName: repo,
        repoDescription: '',
        repository: { name: repo, fullName: `${owner}/${repo}` },
        detectedLanguages,
        detectedFrameworks,
        detectedDatabases,
        detectedInfra,
        endpoints,
        dataModels,
        prioritizedFiles
    });

    const effectiveDescription = semanticProfile.signals?.metaDescription
        || semanticProfile.projectNature?.whatItIs
        || `Repositorio público ${owner}/${repo}`;

    return {
        repository: {
            name: repo,
            fullName: `${owner}/${repo}`,
            owner: owner,
            description: effectiveDescription,
            url: cleanUrl,
            stars: 0,
            forks: 0,
            openIssues: 0,
            defaultBranch: resolvedBranch,
            branch: resolvedBranch,
            primaryLanguage: detectedLanguages[0] || 'Multi-lenguaje',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            analysisDate: new Date().toISOString(),
            projectCategory: semanticProfile.category,
            projectCategoryLabel: semanticProfile.categoryLabel,
            entityName: semanticProfile.entityName
        },
        projectCategory: semanticProfile.category,
        projectCategoryLabel: semanticProfile.categoryLabel,
        semanticProfile,
        stats: {
            totalFiles: files.length,
            relevantFilesCount: files.length,
            ignoredFilesCount: 0,
            analyzedFilesCount: prioritizedFiles.length,
            technologiesCount: allDetectedTechnologies.length
        },
        detectedLanguages,
        detectedFrameworks,
        detectedDatabases,
        detectedInfra,
        detectedTechnologies: allDetectedTechnologies,
        treeDiagram,
        relevantFilesList: files.map(f => ({ path: f.path, category: f.category || classifyFile(f.path), size: f.size })),
        ignoredFilesList: [],
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
