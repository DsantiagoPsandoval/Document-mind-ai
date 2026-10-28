/**
 * DOCUMENT-MIND AI — FILE CLASSIFIER & HASHING ENGINE
 * Accurately categorizes files into 16 software engineering categories,
 * filters noise directories/binaries, and computes SHA-256 signatures for incremental caching.
 */

const crypto = require('crypto');
const path = require('path');

// 16 Standard Categories
const CATEGORIES = {
    SOURCE_CODE: 'SOURCE_CODE',
    CONFIGURATION: 'CONFIGURATION',
    DATABASE: 'DATABASE',
    API: 'API',
    AUTHENTICATION: 'AUTHENTICATION',
    TEST: 'TEST',
    DOCUMENTATION: 'DOCUMENTATION',
    DEVOPS: 'DEVOPS',
    FRONTEND: 'FRONTEND',
    BACKEND: 'BACKEND',
    MODEL: 'MODEL',
    CONTROLLER: 'CONTROLLER',
    SERVICE: 'SERVICE',
    COMPONENT: 'COMPONENT',
    UTILITY: 'UTILITY',
    UNKNOWN: 'UNKNOWN'
};

// Strict directories to ignore
const IGNORED_DIRS = [
    'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
    'coverage', '.venv', 'venv', 'env', '__pycache__', 'vendor',
    'target', 'bin', 'obj', '.idea', '.vscode', '.gradle', '.turbo',
    '.cache', '.output', 'out', '.bundle', 'tmp', 'temp'
];

// Strict extensions to ignore
const IGNORED_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff',
    '.mp4', '.mov', '.avi', '.mp3', '.wav', '.ogg',
    '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2',
    '.exe', '.dll', '.so', '.dylib', '.bin', '.iso',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.pdf', '.docx', '.xlsx', '.pptx',
    '.pyc', '.pyd', '.class', '.jar', '.war',
    '.map', '.min.js', '.min.css'
];

/**
 * Checks if a relative file path should be ignored.
 */
function shouldIgnoreFile(filePath) {
    if (!filePath || typeof filePath !== 'string') return true;
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    const parts = normalized.split('/');

    // Check directory names
    for (const part of parts) {
        if (IGNORED_DIRS.includes(part)) {
            return true;
        }
    }

    // Check extensions
    const ext = path.extname(normalized);
    if (ext && IGNORED_EXTENSIONS.includes(ext)) {
        return true;
    }

    // Lockfiles are ignored unless explicit manifest is absent
    const fileName = parts[parts.length - 1];
    if (['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock', 'gemfile.lock', 'cargo.lock'].includes(fileName)) {
        return true;
    }

    return false;
}

/**
 * Computes SHA-256 hash of a content string or buffer.
 */
function computeFileHash(content) {
    if (!content) return '';
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Classifies a file based on path, name, extension, and content hints.
 */
function classifyFile(filePath, content = '') {
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    const fileName = normalized.split('/').pop();
    const ext = path.extname(normalized);

    // 1. Documentation
    if (fileName.startsWith('readme') || fileName.startsWith('license') || fileName.startsWith('changelog') ||
        fileName.startsWith('contributing') || normalized.includes('/docs/') || normalized.includes('/doc/') ||
        ext === '.md' || ext === '.rst' || ext === '.txt') {
        return CATEGORIES.DOCUMENTATION;
    }

    // 2. DevOps & Infrastructure
    if (fileName === 'dockerfile' || fileName.startsWith('docker-compose') || fileName === 'vagrantfile' ||
        normalized.includes('.github/workflows') || normalized.includes('.gitlab-ci') ||
        normalized.includes('/k8s/') || normalized.includes('/kubernetes/') || normalized.includes('/terraform/') ||
        fileName === 'jenkinsfile' || fileName === 'procfile' || fileName === 'vercel.json' || fileName === 'netlify.toml') {
        return CATEGORIES.DEVOPS;
    }

    // 3. Tests
    if (normalized.includes('/test/') || normalized.includes('/tests/') || normalized.includes('/__tests__/') ||
        normalized.includes('/spec/') || fileName.includes('.test.') || fileName.includes('.spec.') ||
        fileName.startsWith('test_') || fileName.endsWith('_test.py') || fileName.endsWith('_test.go')) {
        return CATEGORIES.TEST;
    }

    // 4. Configuration
    if (fileName.startsWith('.env') || fileName === 'package.json' || fileName === 'tsconfig.json' ||
        fileName === 'webpack.config.js' || fileName === 'vite.config.js' || fileName === 'vite.config.ts' ||
        fileName === 'tailwind.config.js' || fileName === 'eslint.config.js' || fileName.startsWith('.babel') ||
        fileName === 'pyproject.toml' || fileName === 'requirements.txt' || fileName === 'cargo.toml' ||
        fileName === 'pom.xml' || fileName === 'build.gradle' || fileName === 'go.mod' || fileName === 'pubspec.yaml') {
        return CATEGORIES.CONFIGURATION;
    }

    // 5. Authentication
    if (normalized.includes('/auth') || fileName.includes('auth') || fileName.includes('login') ||
        fileName.includes('jwt') || fileName.includes('session') || fileName.includes('passport') ||
        fileName.includes('oauth') || (content && /jwt\.verify|passport\.authenticate|bcrypt|argon2|signInWithPassword/i.test(content))) {
        return CATEGORIES.AUTHENTICATION;
    }

    // 6. Database & Migration & Models
    if (normalized.includes('/database/') || normalized.includes('/db/') || normalized.includes('/migrations/') ||
        normalized.includes('/schema') || ext === '.sql' || fileName === 'schema.prisma' ||
        normalized.includes('/seeds/')) {
        return CATEGORIES.DATABASE;
    }

    if (normalized.includes('/models/') || normalized.includes('/model/') || fileName.includes('.model.') ||
        (content && /(?:mongoose\.Schema|prisma\.|@Entity|class\s+\w+\(models\.Model\)|BaseModel)/i.test(content))) {
        return CATEGORIES.MODEL;
    }

    // 7. Controllers
    if (normalized.includes('/controllers/') || normalized.includes('/controller/') || fileName.includes('controller') ||
        (content && /@Controller|extends\s+Controller|exports\.handle/i.test(content))) {
        return CATEGORIES.CONTROLLER;
    }

    // 8. Services
    if (normalized.includes('/services/') || normalized.includes('/service/') || fileName.includes('service') ||
        (content && /@Injectable|Service\b/i.test(content))) {
        return CATEGORIES.SERVICE;
    }

    // 9. API & Routes
    if (normalized.includes('/routes/') || normalized.includes('/route/') || normalized.includes('/api/') ||
        fileName.includes('router') || fileName.includes('routes') ||
        (content && /(?:router\.(get|post|put|delete)|app\.(get|post|put|delete)|@GetMapping|@PostMapping|urlpatterns)/i.test(content))) {
        return CATEGORIES.API;
    }

    // 10. Frontend Components
    if (normalized.includes('/components/') || normalized.includes('/views/') || normalized.includes('/pages/') ||
        ext === '.jsx' || ext === '.tsx' || ext === '.vue' || ext === '.svelte' ||
        fileName.includes('.component.') || normalized.includes('/templates/')) {
        return CATEGORIES.COMPONENT;
    }

    // 11. Utilities / Helpers
    if (normalized.includes('/utils/') || normalized.includes('/util/') || normalized.includes('/helpers/') ||
        normalized.includes('/lib/') || fileName.includes('helper') || fileName.includes('util')) {
        return CATEGORIES.UTILITY;
    }

    // 12. Frontend styles / markup
    if (ext === '.css' || ext === '.scss' || ext === '.sass' || ext === '.less' || ext === '.html') {
        return CATEGORIES.FRONTEND;
    }

    // 13. General Backend vs Frontend by location
    if (normalized.includes('/frontend/') || normalized.includes('/client/') || normalized.includes('/web/')) {
        return CATEGORIES.FRONTEND;
    }
    if (normalized.includes('/backend/') || normalized.includes('/server/') || normalized.includes('/api/')) {
        return CATEGORIES.BACKEND;
    }

    // 14. Code Extensions fallback
    const codeExtensions = ['.js', '.ts', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.cs', '.php', '.rb', '.dart', '.kt', '.swift'];
    if (codeExtensions.includes(ext)) {
        return CATEGORIES.SOURCE_CODE;
    }

    return CATEGORIES.UNKNOWN;
}

module.exports = {
    CATEGORIES,
    IGNORED_DIRS,
    IGNORED_EXTENSIONS,
    shouldIgnoreFile,
    computeFileHash,
    classifyFile
};
