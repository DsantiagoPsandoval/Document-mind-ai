/**
 * DOCUMENT-MIND AI — BACKEND SERVER & API GATEWAY
 * Express.js production server with modular AI, local static AST analysis,
 * secret sanitization, multi-stage documentation generation, and ZIP export pipelines.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { parseDocument } = require('./services/documents/parser');
const { fetchAndAnalyzeRepo } = require('./services/github/analyzer');
const {
    analyzeDocument,
    chatWithDocument,
    analyzeRepository,
    chatWithRepository,
    getGenAIClient
} = require('./services/ai/gemini');
const { setCachedAnalysis, getCachedAnalysis, getTargetedChatContext, compareAnalyses } = require('./services/analyzer/cacheService');
const { createDocumentationZip } = require('./services/analyzer/exportService');
const { generateDocumentationSuite } = require('./services/analyzer/docGenerator');
const { classifyFile, computeFileHash } = require('./services/analyzer/fileClassifier');
const { sanitizeContent } = require('./services/analyzer/sanitizer');
const { extractSafeZipFiles } = require('./services/analyzer/safeZip');
const { runSecurityAnalysis } = require('./services/analyzer/securityAnalyzer');
const { redactAllSecrets } = require('./services/analyzer/security/secretScanner');
const {
    detectLanguages,
    detectFrameworks,
    detectDatabases,
    detectInfrastructure,
    extractEndpoints,
    extractDataModels,
    buildProjectMap
} = require('./services/analyzer/localAnalyzer');
const {
    ARCHITECTURE_ALTERNATIVES,
    PRESET_SCENARIOS,
    DEFAULT_PROJECT_CONFIG,
    validateSimulationInput,
    runArchitectureSimulation,
    runMultiScenarioComparison,
    getModelDocumentation,
    saveSimulationRun,
    getSimulationHistory,
    generateSimulationMarkdownReport
} = require('./services/simulator/architectureSimulator');

const app = express();

// ============================================================
// SECURITY & MIDDLEWARE HARDENING (SECURE BY DESIGN)
// ============================================================

// 1. Helmet Security Headers with adapted Content-Security-Policy
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https://*"],
            connectSrc: ["'self'", "https://*.supabase.co", "https://generativelanguage.googleapis.com", "https://api.github.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false
}));

// 2. Strict CORS Configuration
const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
    origin: allowedOrigin === '*' ? '*' : allowedOrigin.split(',').map(o => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Rate Limiting Protection (DoS Prevention)
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120, // 120 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Demasiadas solicitudes. Por favor espera un momento.' }
});

const analysisLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 analysis calls per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Has alcanzado el límite de solicitudes de análisis. Por favor espera un momento.' }
});

app.use(generalLimiter);
app.use(['/api/project/analyze', '/api/project/chat', '/api/documents/analyze', '/api/documents/chat', '/api/github/analyze', '/api/github/chat'], analysisLimiter);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Multer in-memory upload configuration (up to 20 MB, filtered)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024,
        files: 20
    }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname)));


// ============================================================
// SYSTEM & HEALTH ROUTES
// ============================================================

/**
 * Health Check Endpoint
 */
app.get('/api/health', (req, res) => {
    const hasGeminiKey = !!getGenAIClient();
    res.json({
        status: 'healthy',
        platform: 'Document-Mind AI',
        version: '1.0.0',
        uptime: Math.floor(process.uptime()),
        aiProvider: 'Google Gemini',
        aiModel: process.env.AI_MODEL || 'gemini-2.5-flash',
        aiKeyConfigured: hasGeminiKey,
        mode: hasGeminiKey ? 'Gemini 2.5 Flash Cognitive Engine' : 'Heuristic Static Analysis Mode',
        timestamp: new Date().toISOString()
    });
});

/**
 * Supabase Public Configuration Endpoint
 */
app.get('/api/config/supabase', (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.trim() : '';
    const isConfigured = Boolean(
        supabaseUrl &&
        supabaseAnonKey &&
        !supabaseUrl.includes('tu-proyecto') &&
        !supabaseAnonKey.startsWith('tu_')
    );

    res.json({
        configured: isConfigured,
        supabaseUrl: isConfigured ? supabaseUrl : '',
        supabaseAnonKey: isConfigured ? supabaseAnonKey : ''
    });
});

// ============================================================
// CORE PROJECT PIPELINE: UNIFIED DOCUMENTATION ENGINE
// ============================================================

/**
 * Unified Project Documentation Generation Endpoint (POST /api/project/analyze)
 * Accepts GitHub URL or uploaded files/text, executes local analysis, sanitization,
 * calls multi-stage doc generator, caches result and returns structured documentation.
 */
app.post('/api/project/analyze', upload.array('files', 15), async (req, res, next) => {
    try {
        const repoUrl = req.body.repoUrl;
        const manualText = req.body.manualText;
        const projectName = req.body.projectName || 'Proyecto-Analizado';
        let categories = {};
        if (req.body.categories) {
            try {
                categories = typeof req.body.categories === 'string' ? JSON.parse(req.body.categories) : req.body.categories;
            } catch (e) {
                categories = {};
            }
        }

        let projectData;

        // Mode A: GitHub Repository
        if (repoUrl && typeof repoUrl === 'string' && repoUrl.trim().length > 5) {
            projectData = await fetchAndAnalyzeRepo(repoUrl.trim());
        } 
        // Mode B: Uploaded Files or Manual Context (with SafeZip & Anti-Traversal)
        else if (req.files && req.files.length > 0) {
            let files = [];
            for (const f of req.files) {
                const safeName = path.basename(f.originalname || 'archivo').replace(/[\0<>:"|?*]/g, '');
                const ext = path.extname(safeName).toLowerCase();

                // If uploaded file is a ZIP archive, unpack safely using safeZip
                if (ext === '.zip') {
                    try {
                        const zipFiles = extractSafeZipFiles(f.buffer);
                        files.push(...zipFiles);
                        continue;
                    } catch (zipErr) {
                        return res.status(zipErr.statusCode || 400).json({
                            success: false,
                            error: `Error al procesar archivo comprimido (${safeName}): ${zipErr.message}`
                        });
                    }
                }

                // Extension whitelist check: reject dangerous executable extensions
                const FORBIDDEN_EXTS = ['.exe', '.dll', '.so', '.bat', '.cmd', '.vbs', '.msi', '.com', '.scr', '.pif'];
                if (FORBIDDEN_EXTS.includes(ext)) {
                    console.warn(`[Upload Shield] Archivo ejecutable prohibido descartado: ${safeName}`);
                    continue;
                }

                let content = '';
                if (['.pdf', '.docx', '.txt', '.md'].includes(ext)) {
                    try {
                        const parsed = await parseDocument({ ...f, originalname: safeName });
                        content = parsed.text;
                    } catch (pe) {
                        content = f.buffer.toString('utf8');
                    }
                } else {
                    content = f.buffer.toString('utf8');
                }

                const clean = sanitizeContent(content);
                const category = classifyFile(safeName, clean);
                const hash = computeFileHash(clean);

                files.push({
                    path: safeName,
                    size: f.size,
                    category,
                    hash,
                    content: clean.substring(0, 45000)
                });
            }


            const manifests = {};
            const pkgFile = files.find(f => f.path.toLowerCase().endsWith('package.json'));
            if (pkgFile) {
                try { manifests['package.json'] = JSON.parse(pkgFile.content); } catch (e) {}
            }

            const detectedLanguages = detectLanguages(files);
            const detectedFrameworks = detectFrameworks(manifests, files);
            const detectedDatabases = detectDatabases(manifests, files);
            const detectedInfra = detectInfrastructure(manifests, files);
            const endpoints = extractEndpoints(files);
            const dataModels = extractDataModels(files);

            const allTechs = Array.from(new Set([
                ...detectedLanguages,
                ...detectedFrameworks,
                ...detectedDatabases,
                ...detectedInfra
            ]));

            const treeDiagram = files.map(f => `├── ${f.path} (${f.category})`).join('\n');
            const projectMap = buildProjectMap(files, allTechs, endpoints, dataModels);

            projectData = {
                repository: {
                    name: projectName,
                    fullName: projectName,
                    owner: 'LocalUser',
                    description: 'Archivos de proyecto subidos para análisis y generación de documentación.',
                    url: '#',
                    stars: 0,
                    forks: 0,
                    openIssues: 0,
                    defaultBranch: 'main',
                    primaryLanguage: detectedLanguages[0] || 'JavaScript',
                    analysisDate: new Date().toISOString()
                },
                stats: {
                    totalFiles: files.length,
                    relevantFilesCount: files.length,
                    ignoredFilesCount: 0,
                    analyzedFilesCount: files.length,
                    technologiesCount: allTechs.length
                },
                detectedLanguages,
                detectedFrameworks,
                detectedDatabases,
                detectedInfra,
                detectedTechnologies: allTechs,
                treeDiagram,
                relevantFilesList: files.map(f => ({ path: f.path, category: f.category, size: f.size })),
                ignoredFilesList: [],
                prioritizedFiles: files,
                endpoints,
                dataModels,
                projectMap
            };
        } 
        // Mode C: Manual Text / Prompt
        else if (manualText && typeof manualText === 'string' && manualText.trim().length > 20) {
            const cleanText = sanitizeContent(manualText.trim());
            const pseudoFile = {
                path: 'manual-specification.md',
                size: cleanText.length,
                category: 'DOCUMENTATION',
                hash: computeFileHash(cleanText),
                content: cleanText
            };

            const files = [pseudoFile];
            const detectedLanguages = detectLanguages(files);
            const detectedFrameworks = detectFrameworks({}, files);
            const detectedDatabases = detectDatabases({}, files);
            const detectedInfra = detectInfrastructure({}, files);
            const endpoints = extractEndpoints(files);
            const dataModels = extractDataModels(files);

            const allTechs = Array.from(new Set([
                ...detectedLanguages,
                ...detectedFrameworks,
                ...detectedDatabases,
                ...detectedInfra
            ]));

            const projectMap = buildProjectMap(files, allTechs, endpoints, dataModels);

            projectData = {
                repository: {
                    name: projectName,
                    fullName: projectName,
                    owner: 'ManualEntry',
                    description: cleanText.substring(0, 200) + '...',
                    url: '#',
                    stars: 0,
                    forks: 0,
                    openIssues: 0,
                    defaultBranch: 'main',
                    primaryLanguage: detectedLanguages[0] || 'Especificación Técnica',
                    analysisDate: new Date().toISOString()
                },
                stats: {
                    totalFiles: 1,
                    relevantFilesCount: 1,
                    ignoredFilesCount: 0,
                    analyzedFilesCount: 1,
                    technologiesCount: allTechs.length
                },
                detectedLanguages,
                detectedFrameworks,
                detectedDatabases,
                detectedInfra,
                detectedTechnologies: allTechs,
                treeDiagram: `└── ${pseudoFile.path}`,
                relevantFilesList: [{ path: pseudoFile.path, category: pseudoFile.category, size: pseudoFile.size }],
                ignoredFilesList: [],
                prioritizedFiles: files,
                endpoints,
                dataModels,
                projectMap
            };
        } else {
            return res.status(400).json({
                success: false,
                error: 'Por favor ingresa una URL de GitHub, sube archivos de código/documentos, o introduce la especificación del proyecto.'
            });
        }

        // Execute Security Analyzer (SAST, Secret Scanner, Dependencies, STRIDE, Score)
        const security = await runSecurityAnalysis(projectData);
        projectData.security = security;

        // Generate complete documentation suite (incorporating Security Report)
        const documentation = await analyzeRepository(projectData, categories);

        // Generate unique project ID for caching and ZIP export
        const projectId = `${projectData.repository.name}-${Date.now()}`.replace(/[^a-zA-Z0-9_\-]/g, '_');

        const fullAnalysisResult = {
            projectId,
            projectName: projectData.repository.name,
            repository: projectData.repository,
            stats: projectData.stats,
            detectedLanguages: projectData.detectedLanguages || [],
            detectedFrameworks: projectData.detectedFrameworks || [],
            detectedDatabases: projectData.detectedDatabases || [],
            detectedInfra: projectData.detectedInfra || [],
            detectedTechnologies: projectData.detectedTechnologies,
            treeDiagram: projectData.treeDiagram,
            relevantFilesList: projectData.relevantFilesList,
            ignoredFilesList: projectData.ignoredFilesList || [],
            prioritizedFiles: projectData.prioritizedFiles.map(f => ({
                path: f.path,
                size: f.size,
                category: f.category,
                hash: f.hash
            })),
            keyFiles: projectData.prioritizedFiles,
            endpoints: projectData.endpoints || [],
            dataModels: projectData.dataModels || [],
            projectMap: projectData.projectMap || {},
            documentation,
            security
        };

        // Cache in memory for targeted token-saving chat and ZIP download
        setCachedAnalysis(projectId, fullAnalysisResult);

        res.json({
            success: true,
            projectId,
            repository: projectData.repository,
            stats: projectData.stats,
            detectedTechnologies: projectData.detectedTechnologies,
            treeDiagram: projectData.treeDiagram,
            relevantFilesList: projectData.relevantFilesList,
            ignoredFilesList: projectData.ignoredFilesList || [],
            endpoints: projectData.endpoints || [],
            dataModels: projectData.dataModels || [],
            projectMap: projectData.projectMap || {},
            documentation,
            security
        });
    } catch (err) {
        next(err);
    }

});

/**
 * Contextual Chat with Targeted Evidence & Token Optimization (POST /api/project/chat)
 */
app.post('/api/project/chat', async (req, res, next) => {
    try {
        const { projectId, repoContext, chatHistory, message } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Por favor escribe una consulta técnica.'
            });
        }

        // Retrieve cached analysis or use payload context
        const cached = projectId ? getCachedAnalysis(projectId) : null;
        const activeContext = cached || repoContext;

        if (!activeContext) {
            return res.status(400).json({
                success: false,
                error: 'No se encontró el análisis del proyecto. Por favor genera la documentación primero.'
            });
        }

        const result = await chatWithRepository(activeContext, chatHistory || [], message.trim());

        res.json({
            success: true,
            reply: result.reply,
            source: result.source,
            model: result.model || null,
            notice: result.notice || null
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Download Documentation ZIP Package Endpoint (GET /api/project/export/zip/:projectId)
 */
app.get('/api/project/export/zip/:projectId', (req, res, next) => {
    try {
        const { projectId } = req.params;
        const analysis = getCachedAnalysis(projectId);

        if (!analysis) {
            return res.status(404).json({
                success: false,
                error: 'El paquete de documentación solicitado ha expirado o no fue encontrado. Por favor genera la documentación nuevamente.'
            });
        }

        const cleanName = (analysis.projectName || 'documentacion').replace(/[^a-zA-Z0-9_\-]/g, '_');
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${cleanName}_documentacion.zip"`);

        const archive = createDocumentationZip(analysis);
        archive.pipe(res);
        archive.finalize();
    } catch (err) {
        next(err);
    }
});

/**
 * Download Security Report JSON Endpoint (GET /api/project/export/security-json/:projectId)
 */
app.get('/api/project/export/security-json/:projectId', (req, res, next) => {
    try {
        const { projectId } = req.params;
        const analysis = getCachedAnalysis(projectId);

        if (!analysis || !analysis.security) {
            return res.status(404).json({
                success: false,
                error: 'El reporte de seguridad solicitado ha expirado o no fue encontrado.'
            });
        }

        const cleanName = (analysis.projectName || 'proyecto').replace(/[^a-zA-Z0-9_\-]/g, '_');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${cleanName}_security_report.json"`);
        const jsonOutput = analysis.security.jsonReport || analysis.security;
        res.send(typeof jsonOutput === 'string' ? jsonOutput : JSON.stringify(jsonOutput, null, 2));
    } catch (err) {
        next(err);
    }
});

/**
 * Download Security Report Markdown Endpoint (GET /api/project/export/security-md/:projectId)
 */
app.get('/api/project/export/security-md/:projectId', (req, res, next) => {
    try {
        const { projectId } = req.params;
        const analysis = getCachedAnalysis(projectId);

        if (!analysis || !analysis.security) {
            return res.status(404).json({
                success: false,
                error: 'El reporte de seguridad solicitado ha expirado o no fue encontrado.'
            });
        }

        const cleanName = (analysis.projectName || 'proyecto').replace(/[^a-zA-Z0-9_\-]/g, '_');
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${cleanName}_SECURITY_REPORT.md"`);
        res.send(analysis.security.markdownReport || '# Informe Técnico de Seguridad\n\nNo disponible.');
    } catch (err) {
        next(err);
    }
});

/**
 * Project Version Diff Comparison (POST /api/project/compare)
 */
app.post('/api/project/compare', (req, res) => {
    const { oldProjectId, newProjectId, oldAnalysis, newAnalysis } = req.body;

    const oldA = oldProjectId ? getCachedAnalysis(oldProjectId) : oldAnalysis;
    const newA = newProjectId ? getCachedAnalysis(newProjectId) : newAnalysis;

    if (!oldA || !newA) {
        return res.status(400).json({
            success: false,
            error: 'Se requieren dos análisis válidos para realizar la comparación de versiones.'
        });
    }

    const comparison = compareAnalyses(oldA, newA);
    res.json({
        success: true,
        comparison
    });
});

// ============================================================
// LEGACY BACKWARDS-COMPATIBLE ROUTES
// ============================================================

/**
 * 1. Document Analysis Endpoint (POST /api/documents/analyze)
 */
app.post('/api/documents/analyze', upload.single('document'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Por favor selecciona un archivo PDF, DOCX o TXT para analizar.'
            });
        }

        const parsedData = await parseDocument(req.file);
        const analysis = await analyzeDocument(parsedData);

        res.json({
            success: true,
            filename: parsedData.filename,
            filesize: parsedData.filesizeFormatted,
            pageCount: parsedData.pageCount,
            wordCount: parsedData.wordCount,
            charCount: parsedData.charCount,
            documentText: parsedData.text,
            analysis
        });
    } catch (err) {
        next(err);
    }
});

/**
 * 2. Document Contextual Chat Endpoint (POST /api/documents/chat)
 */
app.post('/api/documents/chat', async (req, res, next) => {
    try {
        const { documentText, chatHistory, message } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Por favor escribe una pregunta o consulta para el chat.'
            });
        }

        if (!documentText || typeof documentText !== 'string' || documentText.trim().length < 20) {
            return res.status(400).json({
                success: false,
                error: 'No se encontró el texto del documento para fundamentar la respuesta.'
            });
        }

        const result = await chatWithDocument(documentText, chatHistory || [], message.trim());

        res.json({
            success: true,
            reply: result.reply,
            source: result.source,
            model: result.model || null,
            notice: result.notice || null
        });
    } catch (err) {
        next(err);
    }
});

/**
 * 3. GitHub Repository Analysis Endpoint (POST /api/github/analyze)
 */
app.post('/api/github/analyze', async (req, res, next) => {
    try {
        const { repoUrl } = req.body;

        if (!repoUrl || typeof repoUrl !== 'string' || repoUrl.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Por favor ingresa la URL de un repositorio público de GitHub.'
            });
        }

        const repoData = await fetchAndAnalyzeRepo(repoUrl.trim());
        const security = await runSecurityAnalysis(repoData);
        repoData.security = security;
        const analysis = await analyzeRepository(repoData);

        const projectId = `${repoData.repository.name}-${Date.now()}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const fullCached = {
            projectId,
            projectName: repoData.repository.name,
            repository: repoData.repository,
            stats: repoData.stats,
            detectedTechnologies: repoData.detectedTechnologies,
            treeDiagram: repoData.treeDiagram,
            relevantFilesList: repoData.relevantFilesList,
            prioritizedFiles: repoData.prioritizedFiles,
            keyFiles: repoData.prioritizedFiles,
            endpoints: repoData.endpoints,
            dataModels: repoData.dataModels,
            projectMap: repoData.projectMap,
            documentation: analysis,
            security
        };
        setCachedAnalysis(projectId, fullCached);

        res.json({
            success: true,
            projectId,
            repository: repoData.repository,
            stats: repoData.stats,
            detectedTechnologies: repoData.detectedTechnologies,
            treeDiagram: repoData.treeDiagram,
            relevantFilesList: repoData.relevantFilesList,
            ignoredFilesList: repoData.ignoredFilesList,
            keyFiles: repoData.prioritizedFiles.map(f => ({ path: f.path, size: f.size, category: f.category })),
            endpoints: repoData.endpoints,
            dataModels: repoData.dataModels,
            projectMap: repoData.projectMap,
            analysis,
            documentation: analysis,
            security,
            repoContext: {
                repository: repoData.repository,
                detectedTechnologies: repoData.detectedTechnologies,
                treeDiagram: repoData.treeDiagram,
                prioritizedFiles: repoData.prioritizedFiles
            }
        });
    } catch (err) {
        next(err);
    }

});

/**
 * 4. GitHub Repository Contextual Chat Endpoint (POST /api/github/chat)
 */
app.post('/api/github/chat', async (req, res, next) => {
    try {
        const { repoContext, chatHistory, message } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Por favor escribe una pregunta técnica sobre el repositorio.'
            });
        }

        if (!repoContext || !repoContext.repository) {
            return res.status(400).json({
                success: false,
                error: 'No se encontró el contexto del repositorio. Por favor ejecuta el análisis primero.'
            });
        }

        const result = await chatWithRepository(repoContext, chatHistory || [], message.trim());

        res.json({
            success: true,
            reply: result.reply,
            source: result.source,
            model: result.model || null,
            notice: result.notice || null
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// ACTIVIDAD 9: ARCHITECTURE & TECHNICAL DESIGN SIMULATOR API
// ============================================================

/**
 * GET /api/simulator/config
 * Returns project configuration defaults, architectural alternatives, preset scenarios and model documentation
 */
app.get('/api/simulator/config', (req, res) => {
    res.json({
        success: true,
        projectConfig: DEFAULT_PROJECT_CONFIG,
        alternatives: ARCHITECTURE_ALTERNATIVES,
        presetScenarios: PRESET_SCENARIOS,
        modelDocumentation: getModelDocumentation()
    });
});

/**
 * POST /api/simulator/run
 * Validates inputs and executes the mathematical simulation across all 3 architectural alternatives
 */
app.post('/api/simulator/run', (req, res, next) => {
    try {
        const result = runArchitectureSimulation(req.body || {});
        const savedRun = saveSimulationRun(result, {
            projectId: req.body?.projectId,
            scenarioName: req.body?.scenarioName || 'Simulación Ejecutada'
        });
        res.json({
            success: true,
            runId: savedRun.runId,
            simulation: result,
            markdownReport: generateSimulationMarkdownReport(result)
        });
    } catch (err) {
        if (err.statusCode === 400) {
            return res.status(400).json({
                success: false,
                error: err.message,
                validationErrors: err.validationErrors || [err.message]
            });
        }
        next(err);
    }
});

/**
 * GET /api/simulator/history
 * Returns saved immutable simulation runs
 */
app.get('/api/simulator/history', (req, res) => {
    const projectId = req.query.projectId || null;
    res.json({
        success: true,
        history: getSimulationHistory(projectId)
    });
});

/**
 * POST /api/simulator/export/markdown
 * Exports a complete technical Markdown report of a simulation execution
 */
app.post('/api/simulator/export/markdown', (req, res, next) => {
    try {
        const result = runArchitectureSimulation(req.body || {});
        const md = generateSimulationMarkdownReport(result);
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="Informe_Simulacion_Arquitectura_DocuMind.md"');
        res.send(md);
    } catch (err) {
        if (err.statusCode === 400) {
            return res.status(400).json({ success: false, error: err.message });
        }
        next(err);
    }
});

/**
 * POST /api/simulator/scenarios
 * Executes the reference baseline and all preset scenarios simultaneously for multi-scenario comparison
 */
app.post('/api/simulator/scenarios', (req, res, next) => {
    try {
        const projectConfig = req.body?.projectConfig || DEFAULT_PROJECT_CONFIG;
        const comparison = runMultiScenarioComparison(projectConfig);
        res.json({
            success: true,
            scenarios: comparison
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================

app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'El archivo supera el tamaño máximo permitido de 20 MB.'
        });
    }

    const statusCode = err.statusCode || 500;
    const isProd = process.env.NODE_ENV === 'production';
    const clientMessage = (statusCode === 500 && isProd)
        ? 'Ocurrió un inconveniente interno temporal en el servidor. Por favor intenta de nuevo.'
        : err.message;

    // Protect server logs: redact any potential secrets from error message
    console.error(`[Server Error ${statusCode}]`, redactAllSecrets(err.message || 'Error desconocido'));

    res.status(statusCode).json({
        success: false,
        error: clientMessage
    });
});

// Start Server
if (require.main === module) {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 DOCUMENT-MIND AI — Servidor Activo (Secure by Design)`);
        console.log(`🌐 URL Local: http://localhost:${PORT}`);
        console.log(`🤖 Proveedor IA: Google Gemini (${process.env.AI_MODEL || 'gemini-2.5-flash'})`);
        console.log(`🔑 Clave API: ${process.env.GEMINI_API_KEY ? 'Configurada ✔' : 'Modo Heurístico / Sin clave'}`);
        console.log(`🛡️ Seguridad: Helmet CSP ✔ | Rate Limiting ✔ | Secret Scanner ✔`);
        console.log(`⚡ Supabase DB/Auth: ${process.env.SUPABASE_URL ? 'Configurada ✔' : 'Sin configurar'}`);
        console.log(`====================================================`);
    });
}


module.exports = app;
