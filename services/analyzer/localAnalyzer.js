/**
 * DOCUMENT-MIND AI — LOCAL STATIC CODE ANALYZER (AST & HEURISTICS)
 * Performs safe, deep static analysis of files without executing any code.
 * Extracts languages, frameworks, databases, infrastructure, API endpoints, and data models.
 */

const { classifyFile, CATEGORIES } = require('./fileClassifier');

/**
 * Detects languages from repository files.
 */
function detectLanguages(files) {
    const counts = {};
    const extToLang = {
        '.js': 'JavaScript',
        '.jsx': 'JavaScript (React)',
        '.mjs': 'JavaScript',
        '.ts': 'TypeScript',
        '.tsx': 'TypeScript (React)',
        '.py': 'Python',
        '.java': 'Java',
        '.cs': 'C#',
        '.php': 'PHP',
        '.dart': 'Dart',
        '.kt': 'Kotlin',
        '.swift': 'Swift',
        '.cpp': 'C++',
        '.cc': 'C++',
        '.c': 'C',
        '.h': 'C/C++ Header',
        '.go': 'Go (Golang)',
        '.rs': 'Rust',
        '.rb': 'Ruby',
        '.html': 'HTML5',
        '.css': 'CSS3',
        '.sql': 'SQL',
        '.sh': 'Shell Script'
    };

    files.forEach(f => {
        const ext = (f.path.match(/\.[a-zA-Z0-9]+$/) || [''])[0].toLowerCase();
        if (extToLang[ext]) {
            counts[extToLang[ext]] = (counts[extToLang[ext]] || 0) + (f.size || 100);
        }
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([lang]) => lang);
}

/**
 * Detects frameworks, libraries, and engines.
 */
function detectFrameworks(manifests, files) {
    const frameworks = new Set();
    const pkg = manifests['package.json'] || {};
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const depNames = Object.keys(deps);

    // Node.js Ecosystem
    if (pkg.name || depNames.length > 0 || files.some(f => f.path.endsWith('package.json'))) {
        frameworks.add('Node.js');
    }
    if (depNames.includes('react') || files.some(f => f.path.endsWith('.jsx') || f.path.endsWith('.tsx'))) frameworks.add('React');
    if (depNames.includes('next') || files.some(f => f.path.includes('next.config'))) frameworks.add('Next.js');
    if (depNames.includes('vue') || files.some(f => f.path.endsWith('.vue'))) frameworks.add('Vue.js');
    if (depNames.includes('nuxt')) frameworks.add('Nuxt');
    if (depNames.includes('@angular/core')) frameworks.add('Angular');
    if (depNames.includes('svelte')) frameworks.add('Svelte');
    if (depNames.includes('express')) frameworks.add('Express');
    if (depNames.includes('fastify')) frameworks.add('Fastify');
    if (depNames.includes('@nestjs/core')) frameworks.add('NestJS');
    if (depNames.includes('tailwindcss')) frameworks.add('Tailwind CSS');
    if (depNames.includes('bootstrap')) frameworks.add('Bootstrap');
    if (depNames.includes('three')) frameworks.add('Three.js');
    if (depNames.includes('electron')) frameworks.add('Electron');

    // Python Ecosystem
    const pyReqs = manifests['requirements.txt'] || manifests['pyproject.toml'] || '';
    if (pyReqs || files.some(f => f.path.endsWith('.py'))) {
        const lowerReqs = pyReqs.toLowerCase();
        if (lowerReqs.includes('django') || files.some(f => f.path.includes('manage.py'))) frameworks.add('Django');
        if (lowerReqs.includes('fastapi')) frameworks.add('FastAPI');
        if (lowerReqs.includes('flask')) frameworks.add('Flask');
        if (lowerReqs.includes('celery')) frameworks.add('Celery');
        if (lowerReqs.includes('pytorch') || lowerReqs.includes('torch')) frameworks.add('PyTorch');
        if (lowerReqs.includes('tensorflow')) frameworks.add('TensorFlow');
        if (lowerReqs.includes('streamlit')) frameworks.add('Streamlit');
    }

    // Java Ecosystem
    const pomXml = manifests['pom.xml'] || manifests['build.gradle'] || '';
    if (pomXml.includes('spring-boot') || pomXml.includes('springframework')) frameworks.add('Spring Boot');

    // PHP Ecosystem
    const composer = manifests['composer.json'] || {};
    if (composer.require && (composer.require['laravel/framework'] || composer.require['symfony/framework-bundle'])) {
        if (composer.require['laravel/framework']) frameworks.add('Laravel');
        if (composer.require['symfony/framework-bundle']) frameworks.add('Symfony');
    }

    // Dart / Flutter
    if (manifests['pubspec.yaml'] && manifests['pubspec.yaml'].includes('flutter:')) {
        frameworks.add('Flutter');
    }

    return Array.from(frameworks);
}

/**
 * Detects databases and ORMs.
 */
function detectDatabases(manifests, files) {
    const databases = new Set();
    const pkg = manifests['package.json'] || {};
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const depNames = Object.keys(deps);
    const allFilePaths = files.map(f => f.path.toLowerCase()).join(' ');

    if (depNames.includes('pg') || depNames.includes('postgres') || depNames.includes('typeorm') || allFilePaths.includes('postgres')) {
        databases.add('PostgreSQL');
    }
    if (depNames.includes('mysql') || depNames.includes('mysql2')) databases.add('MySQL');
    if (depNames.includes('mongoose') || depNames.includes('mongodb')) databases.add('MongoDB');
    if (depNames.includes('sqlite3') || depNames.includes('better-sqlite3') || allFilePaths.includes('.sqlite')) databases.add('SQLite');
    if (depNames.includes('redis') || depNames.includes('ioredis')) databases.add('Redis');
    if (depNames.includes('@supabase/supabase-js') || allFilePaths.includes('supabase')) databases.add('Supabase');
    if (depNames.includes('firebase') || depNames.includes('firebase-admin')) databases.add('Firebase');
    if (depNames.includes('prisma') || depNames.includes('@prisma/client') || allFilePaths.includes('schema.prisma')) {
        databases.add('Prisma ORM');
    }
    if (depNames.includes('sequelize')) databases.add('Sequelize ORM');

    // Python DBs
    const pyReqs = (manifests['requirements.txt'] || manifests['pyproject.toml'] || '').toLowerCase();
    if (pyReqs.includes('psycopg2') || pyReqs.includes('asyncpg')) databases.add('PostgreSQL');
    if (pyReqs.includes('sqlalchemy')) databases.add('SQLAlchemy ORM');
    if (pyReqs.includes('pymongo')) databases.add('MongoDB');

    return Array.from(databases);
}

/**
 * Detects DevOps, Cloud, and CI/CD tools.
 */
function detectInfrastructure(manifests, files) {
    const infra = new Set();
    const filePaths = files.map(f => f.path.toLowerCase());

    if (filePaths.some(p => p.includes('dockerfile'))) infra.add('Docker');
    if (filePaths.some(p => p.includes('docker-compose'))) infra.add('Docker Compose');
    if (filePaths.some(p => p.includes('.github/workflows'))) infra.add('GitHub Actions');
    if (filePaths.some(p => p.includes('.gitlab-ci'))) infra.add('GitLab CI');
    if (filePaths.some(p => p.includes('jenkinsfile'))) infra.add('Jenkins');
    if (filePaths.some(p => p.includes('/k8s/') || p.includes('kubernetes'))) infra.add('Kubernetes');
    if (filePaths.some(p => p.includes('vercel.json'))) infra.add('Vercel');
    if (filePaths.some(p => p.includes('netlify.toml'))) infra.add('Netlify');
    if (filePaths.some(p => p.includes('terraform') || p.endsWith('.tf'))) infra.add('Terraform');

    return Array.from(infra);
}

/**
 * Statically extracts API endpoints from source files.
 */
function extractEndpoints(files) {
    const endpoints = [];
    const seen = new Set();

    files.forEach(file => {
        if (!file.content) return;
        const content = file.content;
        const filePath = file.path;

        // Express / Fastify / Koa: app.get('/path', ...), router.post('/path', ...)
        const expressRegex = /(?:app|router)\s*\.\s*(get|post|put|delete|patch|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
        let match;
        while ((match = expressRegex.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const route = match[2];
            const key = `${method} ${route}`;
            if (!seen.has(key)) {
                seen.add(key);
                endpoints.push({
                    method,
                    path: route,
                    file: filePath,
                    evidence: `Línea con ${match[0]}`,
                    requiresAuth: /auth|verify|jwt|protect|token/i.test(content.substring(match.index, match.index + 200))
                });
            }
        }

        // Python FastAPI / Flask: @app.get('/path'), @router.post('/path')
        const pyRouteRegex = /@(?:app|router|blueprint)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
        while ((match = pyRouteRegex.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const route = match[2];
            const key = `${method} ${route}`;
            if (!seen.has(key)) {
                seen.add(key);
                endpoints.push({
                    method,
                    path: route,
                    file: filePath,
                    evidence: match[0],
                    requiresAuth: /depends\(|auth|token/i.test(content.substring(match.index, match.index + 250))
                });
            }
        }

        // Java Spring: @GetMapping("/path"), @PostMapping("/path")
        const springRegex = /@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?['"`]([^'"`]+)['"`]/gi;
        while ((match = springRegex.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const route = match[2];
            const key = `${method} ${route}`;
            if (!seen.has(key)) {
                seen.add(key);
                endpoints.push({
                    method,
                    path: route,
                    file: filePath,
                    evidence: match[0],
                    requiresAuth: /@PreAuthorize|@Secured/i.test(content.substring(match.index - 100, match.index + 200))
                });
            }
        }
    });

    return endpoints;
}

/**
 * Statically extracts database entities and models.
 */
function extractDataModels(files) {
    const models = [];
    const seen = new Set();

    files.forEach(file => {
        if (!file.content) return;
        const content = file.content;
        const filePath = file.path;

        // 1. Prisma schema: model User { id String @id ... }
        if (filePath.endsWith('schema.prisma')) {
            const modelRegex = /model\s+([A-Za-z0-9_]+)\s*\{([^}]+)\}/g;
            let match;
            while ((match = modelRegex.exec(content)) !== null) {
                const modelName = match[1];
                const fieldsRaw = match[2].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('@@'));
                const fields = fieldsRaw.map(f => {
                    const parts = f.split(/\s+/);
                    return {
                        name: parts[0],
                        type: parts[1] || 'String',
                        isPk: f.includes('@id'),
                        isRequired: !f.includes('?') && !f.includes('@default')
                    };
                });
                models.push({
                    name: modelName,
                    source: filePath,
                    fields
                });
            }
        }

        // 2. SQL CREATE TABLE: CREATE TABLE users ( id UUID PRIMARY KEY, email TEXT NOT NULL, ... )
        const sqlTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
        let sqlMatch;
        while ((sqlMatch = sqlTableRegex.exec(content)) !== null) {
            const tableName = sqlMatch[1];
            if (!seen.has(tableName)) {
                seen.add(tableName);
                const colLines = sqlMatch[2].split(',').map(l => l.trim()).filter(l => l && !l.startsWith('--') && !l.toUpperCase().startsWith('CONSTRAINT') && !l.toUpperCase().startsWith('PRIMARY KEY ('));
                const fields = colLines.map(c => {
                    const parts = c.split(/\s+/);
                    return {
                        name: parts[0].replace(/['"`]/g, ''),
                        type: parts[1] || 'TEXT',
                        isPk: c.toUpperCase().includes('PRIMARY KEY'),
                        isRequired: c.toUpperCase().includes('NOT NULL')
                    };
                });
                models.push({
                    name: tableName,
                    source: filePath,
                    fields: fields.slice(0, 15)
                });
            }
        }

        // 3. Mongoose Schema: const UserSchema = new Schema({ name: String, ... })
        const mongooseRegex = /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*new\s+Schema\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
        let mMatch;
        while ((mMatch = mongooseRegex.exec(content)) !== null) {
            const schemaName = mMatch[1].replace(/Schema$/i, '');
            if (!seen.has(schemaName)) {
                seen.add(schemaName);
                models.push({
                    name: schemaName,
                    source: filePath,
                    fields: [{ name: '_id', type: 'ObjectId', isPk: true, isRequired: true }]
                });
            }
        }
    });

    return models;
}

/**
 * Builds the Interactive Project Map hierarchy.
 */
function buildProjectMap(classifiedFiles, detectedTechs, endpoints, models) {
    const projectMap = {
        name: 'PROJECT_ROOT',
        frontend: {
            detected: classifiedFiles.some(f => [CATEGORIES.FRONTEND, CATEGORIES.COMPONENT].includes(f.category)),
            componentsCount: classifiedFiles.filter(f => f.category === CATEGORIES.COMPONENT).length,
            technologies: detectedTechs.filter(t => ['React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Tailwind CSS', 'HTML5', 'CSS3', 'Three.js'].includes(t))
        },
        backend: {
            detected: classifiedFiles.some(f => [CATEGORIES.BACKEND, CATEGORIES.CONTROLLER, CATEGORIES.SERVICE].includes(f.category)),
            controllersCount: classifiedFiles.filter(f => f.category === CATEGORIES.CONTROLLER).length,
            servicesCount: classifiedFiles.filter(f => f.category === CATEGORIES.SERVICE).length,
            technologies: detectedTechs.filter(t => ['Node.js', 'Express', 'NestJS', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Laravel'].includes(t))
        },
        api: {
            detected: endpoints.length > 0 || classifiedFiles.some(f => f.category === CATEGORIES.API),
            endpointsCount: endpoints.length,
            endpoints: endpoints.slice(0, 10)
        },
        database: {
            detected: models.length > 0 || classifiedFiles.some(f => [CATEGORIES.DATABASE, CATEGORIES.MODEL].includes(f.category)),
            modelsCount: models.length,
            models: models.map(m => m.name)
        },
        auth: {
            detected: classifiedFiles.some(f => f.category === CATEGORIES.AUTHENTICATION) || endpoints.some(e => e.requiresAuth),
            files: classifiedFiles.filter(f => f.category === CATEGORIES.AUTHENTICATION).map(f => f.path)
        },
        tests: {
            detected: classifiedFiles.some(f => f.category === CATEGORIES.TEST),
            testFilesCount: classifiedFiles.filter(f => f.category === CATEGORIES.TEST).length
        },
        devops: {
            detected: classifiedFiles.some(f => f.category === CATEGORIES.DEVOPS),
            files: classifiedFiles.filter(f => f.category === CATEGORIES.DEVOPS).map(f => f.path)
        }
    };

    return projectMap;
}

module.exports = {
    detectLanguages,
    detectFrameworks,
    detectDatabases,
    detectInfrastructure,
    extractEndpoints,
    extractDataModels,
    buildProjectMap
};
