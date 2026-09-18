/**
 * DOCUMENT-MIND AI — GITHUB REPOSITORY ANALYZER SERVICE
 * Validates, fetches, filters, and extracts real architectural context from public GitHub repositories.
 */

const MAX_KEY_FILES = 12;
const MAX_TOTAL_BYTES = 160 * 1024; // 160 KB total content limit for AI synthesis
const MAX_SINGLE_FILE_BYTES = 40 * 1024; // 40 KB per file limit

// Directories to strictly ignore
const IGNORED_DIRS = [
    'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
    'coverage', '.venv', 'venv', 'env', '__pycache__', 'vendor',
    'target', 'bin', 'obj', '.idea', '.vscode', '.gradle'
];

// File extensions to strictly ignore
const IGNORED_EXTS = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
    '.mp4', '.mov', '.avi', '.mp3', '.wav',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.woff', '.woff2', '.ttf', '.eot',
    '.pdf', '.docx', '.xlsx', '.pptx',
    '.pyc', '.pyd', '.lock', '.class', '.jar',
    '.map'
];

// Manifest and config files given top reading priority
const MANIFEST_FILES = [
    'package.json', 'requirements.txt', 'pyproject.toml', 'Pipfile',
    'pubspec.yaml', 'pom.xml', 'build.gradle', 'go.mod', 'Cargo.toml',
    'composer.json', 'Gemfile', 'Dockerfile', 'docker-compose.yml'
];

/**
 * Validates and extracts owner and repo name from various GitHub URL formats.
 */
function parseGitHubUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
        return { valid: false, error: 'Por favor ingresa una URL de repositorio GitHub.' };
    }

    const trimmed = rawUrl.trim();
    // Support formats: https://github.com/owner/repo, http://..., github.com/owner/repo, owner/repo
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
 * Creates GitHub API headers (optional GITHUB_TOKEN for rate limits).
 */
function getApiHeaders() {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DocumentMindAI-Platform/1.0'
    };
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
}

/**
 * Detects software technologies and frameworks from package manifests and file types.
 */
function detectTechnologies(manifests, treeFiles) {
    const techSet = new Set();
    const pkgJson = manifests['package.json'];
    const reqsTxt = manifests['requirements.txt'] || manifests['pyproject.toml'] || '';
    const pubspec = manifests['pubspec.yaml'] || '';
    const pomXml = manifests['pom.xml'] || manifests['build.gradle'] || '';
    const goMod = manifests['go.mod'] || '';
    const cargoToml = manifests['Cargo.toml'] || '';

    // Node / JS / TS ecosystem
    if (pkgJson) {
        techSet.add('Node.js');
        const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
        const depNames = Object.keys(deps);

        if (depNames.includes('react')) techSet.add('React');
        if (depNames.includes('next')) techSet.add('Next.js');
        if (depNames.includes('vue')) techSet.add('Vue.js');
        if (depNames.includes('nuxt')) techSet.add('Nuxt');
        if (depNames.includes('@angular/core')) techSet.add('Angular');
        if (depNames.includes('express')) techSet.add('Express');
        if (depNames.includes('fastify')) techSet.add('Fastify');
        if (depNames.includes('nest') || depNames.some(d => d.startsWith('@nestjs/'))) techSet.add('NestJS');
        if (depNames.includes('typescript') || treeFiles.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))) techSet.add('TypeScript');
        if (depNames.includes('tailwindcss')) techSet.add('Tailwind CSS');
        if (depNames.includes('three')) techSet.add('Three.js');
        if (depNames.includes('prisma') || depNames.includes('@prisma/client')) techSet.add('Prisma ORM');
        if (depNames.includes('mongoose')) techSet.add('MongoDB (Mongoose)');
        if (depNames.includes('pg') || depNames.includes('typeorm')) techSet.add('PostgreSQL');
        if (depNames.includes('firebase')) techSet.add('Firebase');
        if (depNames.includes('@supabase/supabase-js')) techSet.add('Supabase');
    }

    // Python ecosystem
    if (reqsTxt || treeFiles.some(f => f.path.endsWith('.py'))) {
        techSet.add('Python');
        const lowerReqs = reqsTxt.toLowerCase();
        if (lowerReqs.includes('fastapi')) techSet.add('FastAPI');
        if (lowerReqs.includes('django')) techSet.add('Django');
        if (lowerReqs.includes('flask')) techSet.add('Flask');
        if (lowerReqs.includes('celery')) techSet.add('Celery');
        if (lowerReqs.includes('sqlalchemy')) techSet.add('SQLAlchemy');
        if (lowerReqs.includes('pandas')) techSet.add('Pandas');
        if (lowerReqs.includes('torch') || lowerReqs.includes('pytorch')) techSet.add('PyTorch');
        if (lowerReqs.includes('tensorflow')) techSet.add('TensorFlow');
    }

    // Flutter / Dart
    if (pubspec || treeFiles.some(f => f.path.endsWith('.dart'))) {
        techSet.add('Dart');
        if (pubspec.includes('flutter:')) techSet.add('Flutter');
    }

    // Java / Kotlin
    if (pomXml || treeFiles.some(f => f.path.endsWith('.java') || f.path.endsWith('.kt'))) {
        techSet.add('Java');
        if (pomXml.toLowerCase().includes('spring-boot')) techSet.add('Spring Boot');
    }

    // Go
    if (goMod || treeFiles.some(f => f.path.endsWith('.go'))) {
        techSet.add('Go (Golang)');
    }

    // Rust
    if (cargoToml || treeFiles.some(f => f.path.endsWith('.rs'))) {
        techSet.add('Rust');
    }

    // Docker
    if (manifests['Dockerfile'] || manifests['docker-compose.yml']) {
        techSet.add('Docker');
    }

    return Array.from(techSet);
}

/**
 * Builds a visual directory structure tree string (up to 3 levels deep).
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
        if (depth > 3) return;
        const entries = Object.keys(node).sort((a, b) => {
            const isDirA = node[a] !== null;
            const isDirB = node[b] !== null;
            if (isDirA && !isDirB) return -1;
            if (!isDirA && isDirB) return 1;
            return a.localeCompare(b);
        });

        entries.slice(0, 15).forEach((name, idx) => {
            const isLast = idx === entries.length - 1;
            const pointer = isLast ? '└── ' : '├── ';
            const isDir = node[name] !== null;
            lines.push(prefix + pointer + name + (isDir ? '/' : ''));
            if (isDir) {
                printNode(node[name], prefix + (isLast ? '    ' : '│   '), depth + 1);
            }
        });
        if (entries.length > 15) {
            lines.push(prefix + '└── ... (' + (entries.length - 15) + ' elementos más)');
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
            const err = new Error('Límite de solicitudes de la API de GitHub alcanzado. Intenta de nuevo más tarde o configura un GITHUB_TOKEN en el backend.');
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

    // 3. Filter relevant files
    const relevantFiles = rawTree.filter(item => {
        if (item.type !== 'blob') return false;
        const p = item.path;
        const parts = p.split('/');

        // Check ignored directories
        if (parts.some(part => IGNORED_DIRS.includes(part.toLowerCase()))) {
            return false;
        }

        // Check ignored extensions
        const extMatch = p.match(/\.[a-zA-Z0-9]+$/);
        if (extMatch && IGNORED_EXTS.includes(extMatch[0].toLowerCase())) {
            return false;
        }

        return true;
    });

    // 4. Select key files to download and inspect
    // Priority: Manifests > README > Core entry points (index, app, main, server) > Other source files
    const prioritizedFiles = [];
    const manifests = {};

    // Sort relevant files by priority
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
    let totalBytesFetched = 0;

    for (const file of keyFilesToFetch) {
        if (totalBytesFetched >= MAX_TOTAL_BYTES) break;

        const rawFileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`;
        try {
            const fRes = await fetch(rawFileUrl);
            if (fRes.ok) {
                const content = await fRes.text();
                const contentSnippet = content.substring(0, MAX_SINGLE_FILE_BYTES);
                totalBytesFetched += contentSnippet.length;

                prioritizedFiles.push({
                    path: file.path,
                    size: file.size || contentSnippet.length,
                    content: contentSnippet
                });

                const fileName = file.path.split('/').pop().toLowerCase();
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

    // 5. Detect technologies & generate diagram
    const detectedTechnologies = detectTechnologies(manifests, relevantFiles);
    const treeDiagram = buildTreeDiagram(relevantFiles);

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
            primaryLanguage: repoData.language || 'Multi-lenguaje',
            createdAt: repoData.created_at,
            updatedAt: repoData.updated_at,
            analysisDate: new Date().toISOString()
        },
        stats: {
            totalFiles: rawTree.length,
            relevantFilesCount: relevantFiles.length,
            analyzedFilesCount: prioritizedFiles.length,
            technologiesCount: detectedTechnologies.length
        },
        detectedTechnologies,
        treeDiagram,
        relevantFilesList: relevantFiles.map(f => f.path).slice(0, 100),
        prioritizedFiles
    };
}

module.exports = {
    parseGitHubUrl,
    fetchAndAnalyzeRepo,
    detectTechnologies,
    buildTreeDiagram
};
