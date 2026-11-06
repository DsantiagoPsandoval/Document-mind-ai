/**
 * DOCUMENT-MIND AI — INTELLIGENT TOKEN MANAGER & CONTEXT OPTIMIZER
 * Calculates token budgets, ranks and prioritizes project files by architectural relevance,
 * deduplicates context, and divides large repositories into cohesive analysis chunks.
 */

// Average conversion constants: ~4 characters per token for mixed code and JSON
const CHARS_PER_TOKEN = 4;

// Default context boundaries for Gemini models
const TOKEN_LIMITS = {
    DEFAULT_INPUT_BUDGET: 32000,    // ~128,000 characters safe input per task
    MAX_OUTPUT_BUDGET: 8192,        // Max output tokens for Gemini Flash
    COMPACT_INPUT_BUDGET: 16000,    // For rapid sub-tasks
    STAGE_BUDGET_RESERVE: 2000      // Headroom for system instructions & formatting
};

// Priority weights for file types during architectural analysis
const FILE_PRIORITY_PATTERNS = [
    // Tier 1: Project Identity & Dependencies (Highest)
    { pattern: /(?:^|\/)(?:package\.json|requirements\.txt|pom\.xml|build\.gradle|composer\.json|go\.mod|Cargo\.toml)$/i, priority: 100, weight: 'manifest' },
    { pattern: /(?:^|\/)(?:docker-compose\.ya?ml|Dockerfile|\.env\.example|serverless\.ya?ml|Procfile)$/i, priority: 95, weight: 'infrastructure' },
    { pattern: /(?:^|\/)README(?:\.md|\.txt)?$/i, priority: 90, weight: 'documentation' },

    // Tier 2: Server Entrypoints & Main Routing
    { pattern: /(?:^|\/)(?:server|app|index|main|application)\.(?:js|ts|py|go|java|rb|php|cs)$/i, priority: 85, weight: 'entrypoint' },
    { pattern: /(?:^|\/)(?:routes?|controllers?|endpoints?|api|handlers?)\/.*\.(?:js|ts|py|go|java|php)$/i, priority: 80, weight: 'routes' },

    // Tier 3: Core Domain Models & Data Persistence
    { pattern: /(?:^|\/)(?:models?|entities|schemas?|database|db|migrations?)\/.*\.(?:js|ts|py|go|java|sql)$/i, priority: 75, weight: 'models' },
    { pattern: /(?:^|\/)(?:services?|usecases?|domain|core)\/.*\.(?:js|ts|py|go|java)$/i, priority: 70, weight: 'services' },

    // Tier 4: Middleware, Event Handlers & Security
    { pattern: /(?:^|\/)(?:middleware|auth|security|events?|workers?|consumers?)\/.*\.(?:js|ts|py|go)$/i, priority: 65, weight: 'middleware' },

    // Tier 5: UI & Client Frontend
    { pattern: /(?:^|\/)(?:public|src\/components|views|pages)\/.*\.(?:jsx?|tsx?|vue|svelte|html)$/i, priority: 50, weight: 'frontend' },

    // Tier 6: Down-prioritized (Test suites, mocks, styles)
    { pattern: /(?:^|\/)(?:tests?|specs?|__tests__|mocks?)\/.*\.(?:js|ts|py)$/i, priority: 20, weight: 'tests' },
    { pattern: /\.(?:test|spec)\.(?:js|ts|py)$/i, priority: 15, weight: 'tests' },
    { pattern: /\.(?:css|scss|less|svg|png|jpg|ico|map)$/i, priority: 5, weight: 'assets' }
];

/**
 * Estimates token count for a given text string.
 * @param {string} text
 * @returns {number} Estimated tokens
 */
function estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Calculates priority score for a file based on its path.
 * @param {string} filePath
 * @returns {{ score: number, category: string }}
 */
function getFilePriority(filePath) {
    const normalized = (filePath || '').replace(/\\/g, '/');
    for (const rule of FILE_PRIORITY_PATTERNS) {
        if (rule.pattern.test(normalized)) {
            return { score: rule.priority, category: rule.weight };
        }
    }
    return { score: 40, category: 'general_code' };
}

/**
 * Ranks, deduplicates, and packs project files to fit within a specific token budget.
 * Ensures vital manifests, entry points, routes, and models are preserved first.
 * @param {Array<{ path: string, content: string }>} files
 * @param {number} maxTokensBudget
 * @returns {{ packedFiles: Array<{ path: string, content: string, tokenEstimate: number }>, totalTokens: number, omittedCount: number }}
 */
function packFilesForContext(files = [], maxTokensBudget = TOKEN_LIMITS.DEFAULT_INPUT_BUDGET) {
    if (!Array.isArray(files) || files.length === 0) {
        return { packedFiles: [], totalTokens: 0, omittedCount: 0 };
    }

    // 1. Score each file
    const scoredFiles = files.map(file => {
        const priorityMeta = getFilePriority(file.path);
        const content = file.content || '';
        const rawTokens = estimateTokens(content);
        return {
            path: file.path,
            content,
            priority: priorityMeta.score,
            category: priorityMeta.category,
            rawTokens
        };
    });

    // 2. Sort by priority descending
    scoredFiles.sort((a, b) => b.priority - a.priority);

    // 3. Greedily pack files into the budget
    const packedFiles = [];
    let currentTokens = 0;
    let omittedCount = 0;

    for (const file of scoredFiles) {
        // Individual file cap: don't let a single massive file consume the entire budget
        const maxSingleFileTokens = Math.floor(maxTokensBudget * 0.25);
        let contentToInclude = file.content;
        let tokenCount = file.rawTokens;

        if (tokenCount > maxSingleFileTokens) {
            const charLimit = maxSingleFileTokens * CHARS_PER_TOKEN;
            contentToInclude = file.content.substring(0, charLimit) + 
                `\n\n// [... Contenido restante truncado (${file.path}) para optimizar presupuesto de tokens ...]`;
            tokenCount = estimateTokens(contentToInclude);
        }

        if (currentTokens + tokenCount <= maxTokensBudget) {
            packedFiles.push({
                path: file.path,
                content: contentToInclude,
                category: file.category,
                tokenEstimate: tokenCount
            });
            currentTokens += tokenCount;
        } else {
            omittedCount++;
        }
    }

    return {
        packedFiles,
        totalTokens: currentTokens,
        omittedCount
    };
}

/**
 * Generates an optimized, token-conscious architectural summary of files.
 * @param {Array<{ path: string, content: string }>} packedFiles
 * @returns {string} Labeled formatted context
 */
function formatFilesContext(packedFiles = []) {
    return packedFiles.map(file => {
        return `[EVIDENCIA COMPROBADA: ${file.path} | Tipo: ${file.category} | ~${file.tokenEstimate} tokens]\n${file.content}\n---`;
    }).join('\n\n');
}

/**
 * Calculates budget headroom and warns if context is at risk of exceeding limits.
 * @param {string} promptText
 * @param {number} [maxBudget=32000]
 * @returns {{ currentTokens: number, maxBudget: number, availableTokens: number, isWithinLimit: boolean, usagePct: number }}
 */
function checkBudget(promptText, maxBudget = TOKEN_LIMITS.DEFAULT_INPUT_BUDGET) {
    const currentTokens = estimateTokens(promptText);
    const availableTokens = Math.max(0, maxBudget - currentTokens);
    const usagePct = Math.min(100, Math.round((currentTokens / maxBudget) * 100));

    return {
        currentTokens,
        maxBudget,
        availableTokens,
        isWithinLimit: currentTokens <= maxBudget,
        usagePct
    };
}

module.exports = {
    TOKEN_LIMITS,
    estimateTokens,
    getFilePriority,
    packFilesForContext,
    formatFilesContext,
    checkBudget
};
