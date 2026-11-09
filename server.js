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
    getGenAIClient,
    getAiDiagnostics
} = require('./services/ai/gemini');
const { setCachedAnalysis, getCachedAnalysis, getTargetedChatContext, compareAnalyses } = require('./services/analyzer/cacheService');
const { createDocumentationZip } = require('./services/analyzer/exportService');
const { generateWordDocumentBuffer } = require('./services/export/docxGenerator');
const { exportDocumentByFormat } = require('./services/export/multiFormatExporter');
const { buildUnifiedDocumentModel } = require('./services/export/unifiedDocModel');
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

const { getBranchList, checkRepoUpdate, calculateRepoDrift } = require('./services/github/syncService');
const { generateCodeModification, createModificationZip } = require('./services/code/codeModificationService');
const { getIntegrationsStatus } = require('./services/integrations/statusService');

// Enterprise SaaS 2.0 Services
const { PlanService, PLAN_TIERS, PLAN_DEFINITIONS } = require('./services/plans/planService');
const {
    requireWordPdfExport,
    requirePrivateRepoAnalysis,
    requirePublicRepoQuota,
    requireBlastRadius,
    requirePRWebhooks,
    requireByokAndSecurity,
    requireOrganizations,
    extractUserId
} = require('./middleware/planLimiter');
const { PaymentGateway } = require('./services/billing/paymentGateway');
const { PrivateRepoService } = require('./services/github/privateRepoService');
const { ASTDeepAnalyzer } = require('./services/analyzer/astDeepAnalyzer');
const { PRAutomationService } = require('./services/github/prAutomationService');
const { OrganizationService, ROLES } = require('./services/orgs/organizationService');
const { SecurityConfigService } = require('./services/enterprise/securityConfigService');

const modificationCache = new Map();

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
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*"],
            connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://generativelanguage.googleapis.com", "https://api.github.com", "data:", "blob:"],
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

// Explicit UTF-8 & Security Headers for static assets
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});

// Explicit root route with UTF-8 Content-Type
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Dedicated Standalone Architecture Simulator Route
app.get(['/simulador', '/simulador.html'], (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.sendFile(path.join(__dirname, 'simulador.html'));
});

// Serve frontend static files with explicit charset headers
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        }
    }
}));


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
        if (req.body.doc_language || req.body.language) {
            categories.language = (req.body.doc_language || req.body.language) === 'en' ? 'en' : 'es';
        }

        let projectData;

        // Mode A: GitHub Repository
        if (repoUrl && typeof repoUrl === 'string' && repoUrl.trim().length > 5) {
            const targetBranch = req.body.branch ? String(req.body.branch).trim() : null;
            projectData = await fetchAndAnalyzeRepo(repoUrl.trim(), targetBranch);
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
            unifiedDocument: typeof responseUnifiedDoc !== 'undefined' ? responseUnifiedDoc : undefined,
            qualityReview: typeof responseQualityReview !== 'undefined' ? responseQualityReview : undefined,
            documentation,
            security
        };

        // Cache in memory for targeted token-saving chat and ZIP download
        let unifiedDocument = buildUnifiedDocumentModel(fullAnalysisResult, 'all');
        fullAnalysisResult.unifiedDocument = unifiedDocument;
        fullAnalysisResult.qualityReview = unifiedDocument.qualityReview;
        setCachedAnalysis(projectId, fullAnalysisResult);
        var responseUnifiedDoc = unifiedDocument;
        var responseQualityReview = unifiedDocument ? unifiedDocument.qualityReview : undefined;

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
            unifiedDocument: typeof responseUnifiedDoc !== 'undefined' ? responseUnifiedDoc : undefined,
            qualityReview: typeof responseQualityReview !== 'undefined' ? responseQualityReview : undefined,
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
app.get('/api/project/export/zip/:projectId', async (req, res, next) => {
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

        let docxBuf = null;
        try {
            docxBuf = await generateWordDocumentBuffer(analysis, 'all');
        } catch (docxErr) {
            console.warn('[DocuMind Export] Word DOCX generation failed for ZIP package:', docxErr.message);
        }

        const archive = createDocumentationZip(analysis, docxBuf);
        archive.pipe(res);
        archive.finalize();
    } catch (err) {
        next(err);
    }
});

/**
 * Download Professional Microsoft Word Document Endpoint (GET /api/project/export/docx/:projectId)
 */
app.get('/api/project/export/docx/:projectId', async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const scope = req.query.scope || 'all';
        const analysis = getCachedAnalysis(projectId);

        if (!analysis) {
            return res.status(404).json({
                success: false,
                error: 'El proyecto solicitado ha expirado o no fue encontrado en memoria. Por favor realiza el análisis nuevamente o exporta desde la vista previa.'
            });
        }

        const docxBuffer = await generateWordDocumentBuffer(analysis, scope);
        const cleanName = (analysis.projectName || 'DocuMind').replace(/[^a-zA-Z0-9_\-]/g, '_');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${cleanName}_Documento_Word_${scope}.docx"`);
        res.send(docxBuffer);
    } catch (err) {
        console.error('[DocuMind Export] Error generating DOCX for project:', err);
        next(err);
    }
});

/**
 * Export Customized or In-Session Microsoft Word Document Endpoint (POST /api/project/export/docx)
 */
app.post('/api/project/export/docx', requireWordPdfExport, async (req, res, next) => {
    try {
        const { analysisData, scope = 'all', customDoc, projectName } = req.body || {};
        const payload = analysisData || { projectName: projectName || 'DocuMind_Project', customDoc };
        if (customDoc) payload.customDoc = customDoc;

        const docxBuffer = await generateWordDocumentBuffer(payload, scope);
        const cleanName = (projectName || payload.projectName || 'DocuMind').replace(/[^a-zA-Z0-9_\-]/g, '_');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${cleanName}_Documento_Word_${scope}.docx"`);
        res.send(docxBuffer);
    } catch (err) {
        console.error('[DocuMind Export] Error generating DOCX from POST payload:', err);
        next(err);
    }
});

/**
 * Download Security Report JSON Endpoint (GET /api/project/export/security-json/:projectId)
 */
/**
 * Download Direct Binary PDF Document Endpoint (GET /api/project/export/pdf/:projectId)
 */
app.get('/api/project/export/pdf/:projectId', async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const scope = req.query.scope || 'all';
        const analysis = getCachedAnalysis(projectId);

        if (!analysis) {
            return res.status(404).json({
                success: false,
                error: 'El proyecto solicitado ha expirado o no fue encontrado en memoria.'
            });
        }

        const exported = await exportDocumentByFormat(analysis, 'pdf', scope);
        res.setHeader('Content-Type', exported.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
        res.send(exported.buffer);
    } catch (err) {
        console.error('[DocuMind Export] Error generating PDF for project:', err);
        next(err);
    }
});

/**
 * Direct Binary PDF Export from Session Payload (POST /api/project/export/pdf)
 */
app.post('/api/project/export/pdf', requireWordPdfExport, async (req, res, next) => {
    try {
        const { analysisData, scope = 'all', customDoc, projectName } = req.body || {};
        const payload = analysisData || { projectName: projectName || 'DocuMind_Project', customDoc };
        if (customDoc) payload.customDoc = customDoc;

        const exported = await exportDocumentByFormat(payload, 'pdf', scope);
        res.setHeader('Content-Type', exported.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
        res.send(exported.buffer);
    } catch (err) {
        console.error('[DocuMind Export] Error generating PDF from POST payload:', err);
        next(err);
    }
});

/**
 * Unified Multi-Format Export Endpoint (GET /api/project/export/format/:format/:projectId)
 * Supports: docx, pdf, html, md, json, txt
 */
app.get('/api/project/export/format/:format/:projectId', async (req, res, next) => {
    try {
        const { format, projectId } = req.params;
        const scope = req.query.scope || 'all';
        const analysis = getCachedAnalysis(projectId);

        if (!analysis) {
            return res.status(404).json({
                success: false,
                error: 'El proyecto solicitado ha expirado o no fue encontrado en memoria.'
            });
        }

        const exported = await exportDocumentByFormat(analysis, format, scope);
        res.setHeader('Content-Type', exported.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
        res.send(exported.buffer);
    } catch (err) {
        next(err);
    }
});

/**
 * Unified Multi-Format Export Endpoint (POST /api/project/export/format/:format)
 * Supports: docx, pdf, html, md, json, txt
 */
app.post('/api/project/export/format/:format', async (req, res, next) => {
    try {
        const { format } = req.params;
        const { analysisData, scope = 'all', customDoc, projectName } = req.body || {};
        const payload = analysisData || { projectName: projectName || 'DocuMind_Project', customDoc };
        if (customDoc) payload.customDoc = customDoc;

        const exported = await exportDocumentByFormat(payload, format, scope);
        res.setHeader('Content-Type', exported.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
        res.send(exported.buffer);
    } catch (err) {
        next(err);
    }
});

/**
 * Unified Document Model Endpoint (POST /api/project/export/unified-model)
 */
app.post('/api/project/export/unified-model', (req, res, next) => {
    try {
        const { analysisData, scope = 'all', projectId } = req.body || {};
        const source = (projectId ? getCachedAnalysis(projectId) : null) || analysisData || {};
        const model = buildUnifiedDocumentModel(source, scope);
        res.json({ success: true, model });
    } catch (err) {
        next(err);
    }
});

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
        const { repoUrl, branch } = req.body;

        if (!repoUrl || typeof repoUrl !== 'string' || repoUrl.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Por favor ingresa la URL de un repositorio público de GitHub.'
            });
        }

        const repoData = await fetchAndAnalyzeRepo(repoUrl.trim(), branch ? String(branch).trim() : null);
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
// GITHUB BRANCHES, SYNC & DRIFT DETECTION ENDPOINTS
// ============================================================

/**
 * GET /api/github/branches
 * Lists available branches of a public repository.
 */
app.get('/api/github/branches', async (req, res, next) => {
    try {
        const repoUrl = req.query.repoUrl;
        if (!repoUrl) {
            return res.status(400).json({ success: false, error: 'Parámetro repoUrl requerido.' });
        }
        const data = await getBranchList(repoUrl);
        res.json({ success: true, ...data });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/github/sync/check
 * Checks if a public repo has newer commits compared to lastKnownSha.
 */
app.post('/api/github/sync/check', async (req, res, next) => {
    try {
        const { repoUrl, lastKnownSha, branch } = req.body;
        if (!repoUrl) {
            return res.status(400).json({ success: false, error: 'Parámetro repoUrl requerido.' });
        }
        const data = await checkRepoUpdate(repoUrl, lastKnownSha, branch);
        res.json(data);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/github/sync/drift
 * Computes architectural and document drift between two analysis snapshots.
 */
app.post('/api/github/sync/drift', (req, res, next) => {
    try {
        const { oldAnalysis, newAnalysis } = req.body;
        const drift = calculateRepoDrift(oldAnalysis, newAnalysis);
        res.json({ success: true, ...drift });
    } catch (err) {
        next(err);
    }
});

// ============================================================
// AI CODE MODIFICATION & PATCH GENERATION ENDPOINTS
// ============================================================

/**
 * POST /api/project/modify
 * Takes a natural language instruction and generates code modifications + git patch.
 */
app.post('/api/project/modify', async (req, res, next) => {
    try {
        const { instruction, projectId, projectContext } = req.body;
        if (!instruction || typeof instruction !== 'string' || instruction.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Por favor ingresa una instrucción clara de modificación en lenguaje natural.'
            });
        }

        const ctx = (projectId ? getCachedAnalysis(projectId) : null) || projectContext || {};
        const modification = await generateCodeModification({
            instruction: instruction.trim(),
            projectContext: ctx
        });

        const modId = 'mod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        modificationCache.set(modId, {
            ...modification,
            instruction: instruction.trim(),
            projectName: ctx.projectName || 'proyecto',
            createdAt: new Date().toISOString()
        });

        res.json({
            success: true,
            modificationId: modId,
            plan: modification.plan,
            explanation: modification.explanation,
            modifiedFiles: modification.modifiedFiles.map(f => ({
                path: f.path,
                syntaxOk: f.syntaxOk,
                syntaxError: f.syntaxError,
                modifiedPreview: (f.modifiedContent || '').substring(0, 500)
            })),
            unifiedPatch: modification.unifiedPatch,
            engine: modification.engine
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/project/export/patch-zip/:modificationId
 * Downloads complete modification package (patch, modified files, instructions).
 */
app.get('/api/project/export/patch-zip/:modificationId', async (req, res, next) => {
    try {
        const mod = modificationCache.get(req.params.modificationId);
        if (!mod) {
            return res.status(404).json({ success: false, error: 'La modificación solicitada no fue encontrada o ha expirado.' });
        }
        const buffer = await createModificationZip(mod, mod.projectName);
        const cleanName = (mod.projectName || 'proyecto').replace(/[^a-zA-Z0-9_\-]/g, '_');
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${cleanName}_modificaciones.zip"`);
        res.send(buffer);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/project/export/patch-file/:modificationId
 * Downloads standalone unified .patch file for `git apply`.
 */
app.get('/api/project/export/patch-file/:modificationId', (req, res, next) => {
    try {
        const mod = modificationCache.get(req.params.modificationId);
        if (!mod) {
            return res.status(404).json({ success: false, error: 'El parche solicitado no fue encontrado o ha expirado.' });
        }
        const cleanName = (mod.projectName || 'proyecto').replace(/[^a-zA-Z0-9_\-]/g, '_');
        res.setHeader('Content-Type', 'text/x-diff; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${cleanName}_cambios.patch"`);
        res.send(mod.unifiedPatch);
    } catch (err) {
        next(err);
    }
});

// ============================================================
// INTEGRATIONS HEALTH STATUS ENDPOINT
// ============================================================

/**
 * GET /api/integrations/status
 * Returns verified operational status of Supabase, Gemini, Render, and GitHub Public API.
 */
app.get('/api/integrations/status', async (req, res, next) => {
    try {
        const status = await getIntegrationsStatus();
        res.json({ success: true, ...status });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/ai/diagnostics
 * Returns verified operational metrics of Gemini AI engine, token usage, latency,
 * cache rate, and telemetry without exposing secrets.
 */
app.get('/api/ai/diagnostics', (req, res) => {
    try {
        const diagnostics = getAiDiagnostics();
        res.json({ success: true, ...diagnostics });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// REAL SITE ANALYTICS & VISITOR METRICS API
// ============================================================
const analyticsService = require('./services/analytics/analyticsService');

/**
 * POST /api/analytics/visit
 * Registers or updates an anonymous visitor and records visit session
 */
app.post('/api/analytics/visit', async (req, res, next) => {
    try {
        const { visitorId, referrer, path } = req.body || {};
        const userAgent = req.headers['user-agent'] || '';
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        
        const result = await analyticsService.recordVisit({
            visitorId,
            userAgent,
            ip,
            referrer,
            path
        });
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/analytics/heartbeat
 * Heartbeat to maintain active visitor status (within last 5 minutes)
 */
app.post('/api/analytics/heartbeat', async (req, res, next) => {
    try {
        const { visitorId } = req.body || {};
        const userAgent = req.headers['user-agent'] || '';
        
        const result = await analyticsService.recordHeartbeat({
            visitorId,
            userAgent
        });
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/analytics/stats
 * Returns real verified metrics: unique total, active now (5 min), today, and last 7 days
 */
app.get('/api/analytics/stats', async (req, res, next) => {
    try {
        const stats = await analyticsService.getStats();
        res.json({ success: true, stats });
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
// ENTERPRISE SAAS 2.0 — RUTAS DE PLANES, PAGOS, REPOS, AST, PRs & ORGS
// ============================================================

/**
 * 1. Consulta de Plan y Cuotas del Usuario (GET /api/user/plan-status)
 */
app.get('/api/user/plan-status', async (req, res, next) => {
    try {
        const userId = extractUserId(req);
        const sub = await PlanService.getUserSubscription(userId);
        const usage = await PlanService.getUserUsage(userId);

        res.json({
            success: true,
            plan: sub.plan,
            status: sub.status,
            billingCycle: sub.billingCycle,
            periodEnd: sub.periodEnd,
            definition: sub.definition,
            usage: {
                period: usage.periodYM,
                publicReposAnalyzed: usage.publicReposAnalyzed,
                privateReposAnalyzed: usage.privateReposAnalyzed,
                exportDocsCount: usage.exportDocsCount
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * 2. Cambio / Actualización de Plan (POST /api/user/change-plan)
 */
app.post('/api/user/change-plan', async (req, res, next) => {
    try {
        const userId = extractUserId(req);
        const { planId, billingCycle = 'monthly' } = req.body || {};
        if (!planId) {
            return res.status(400).json({ success: false, error: 'planId es requerido' });
        }

        const updated = await PlanService.setUserSubscription(userId, planId, billingCycle);
        res.json({
            success: true,
            message: `Plan actualizado exitosamente a ${updated.definition.name}`,
            subscription: updated
        });
    } catch (err) {
        next(err);
    }
});

/**
 * 3. Crear Orden de Pago / Checkout (POST /api/billing/create-checkout)
 */
app.post('/api/billing/create-checkout', async (req, res, next) => {
    try {
        const userId = extractUserId(req) || 'guest_buyer';
        const { planId, billingCycle = 'monthly', provider = 'wompi', termsAccepted = true, userEmail } = req.body || {};

        const checkout = await PaymentGateway.createCheckoutSession({
            userId,
            userEmail: userEmail || req.user?.email || 'cliente@empresa.com',
            planId,
            billingCycle,
            provider,
            termsAccepted
        });

        res.json(checkout);
    } catch (err) {
        next(err);
    }
});

/**
 * 4. Webhook Wompi (POST /api/billing/webhook/wompi)
 */
app.post('/api/billing/webhook/wompi', async (req, res, next) => {
    try {
        const signatureHeader = req.headers['x-event-checksum'];
        const result = await PaymentGateway.handleWompiWebhook(req.body, signatureHeader);
        res.json(result);
    } catch (err) {
        console.error('[Wompi Webhook Error]:', err);
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * 5. Webhook Mercado Pago (POST /api/billing/webhook/mercadopago)
 */
app.post('/api/billing/webhook/mercadopago', async (req, res, next) => {
    try {
        const result = await PaymentGateway.handleMercadoPagoWebhook(req.body, req.query);
        res.json(result);
    } catch (err) {
        console.error('[MercadoPago Webhook Error]:', err);
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * 6. Confirmación de Pago Sandbox / Mock (POST /api/billing/mock-confirm)
 */
app.post('/api/billing/mock-confirm', async (req, res, next) => {
    try {
        const { reference } = req.body || {};
        if (!reference) return res.status(400).json({ success: false, error: 'Referencia requerida' });
        const confirmed = await PaymentGateway.confirmMockPayment(reference);
        res.json(confirmed);
    } catch (err) {
        next(err);
    }
});

/**
 * 7. Historial de Transacciones (GET /api/billing/transactions)
 */
app.get('/api/billing/transactions', async (req, res, next) => {
    try {
        const userId = extractUserId(req);
        const txs = await PaymentGateway.getUserTransactions(userId);
        res.json({ success: true, count: txs.length, transactions: txs });
    } catch (err) {
        next(err);
    }
});

/**
 * 8. Conectar GitHub OAuth (GET /api/github/connect)
 */
app.get('/api/github/connect', (req, res) => {
    const userId = extractUserId(req) || 'guest';
    const authData = PrivateRepoService.getAuthorizationUrl(userId);
    res.json(authData);
});

/**
 * 9. Callback GitHub OAuth (GET /api/github/callback)
 */
app.get('/api/github/callback', async (req, res, next) => {
    try {
        const { code, state } = req.query;
        if (!code) return res.status(400).send('Código de GitHub no proporcionado');
        const tokenResult = await PrivateRepoService.exchangeCodeForToken(code, state);
        // Redirigir de vuelta a la aplicación
        res.redirect('/#analizador?github_connected=true');
    } catch (err) {
        next(err);
    }
});

/**
 * 10. Listar Repositorios del Usuario (GET /api/github/repos)
 */
app.get('/api/github/repos', async (req, res, next) => {
    try {
        const userId = extractUserId(req) || 'guest';
        const data = await PrivateRepoService.listUserRepositories(userId);
        res.json(data);
    } catch (err) {
        next(err);
    }
});

/**
 * 11. Desconectar GitHub (POST /api/github/disconnect)
 */
app.post('/api/github/disconnect', async (req, res, next) => {
    try {
        const userId = extractUserId(req) || 'guest';
        const result = await PrivateRepoService.disconnectGitHub(userId);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * 12. Blast Radius Analysis (POST /api/project/blast-radius)
 */
app.post('/api/project/blast-radius', requireBlastRadius, async (req, res, next) => {
    try {
        const { targetComponent, projectId } = req.body || {};
        const analysis = projectId ? getCachedAnalysis(projectId) : null;
        const graph = ASTDeepAnalyzer.buildDependencyGraph(analysis);
        const result = ASTDeepAnalyzer.calculateBlastRadius(targetComponent || 'auth_service', graph);
        res.json({ success: true, blastRadius: result });
    } catch (err) {
        next(err);
    }
});

/**
 * 13. Webhook de Pull Requests de GitHub (POST /api/webhooks/github)
 */
app.post('/api/webhooks/github', async (req, res, next) => {
    try {
        const signatureHeader = req.headers['x-hub-signature-256'];
        const eventType = req.headers['x-github-event'];

        if (eventType === 'ping') {
            return res.json({ success: true, message: 'Pong! Webhook de DocuMind AI activo' });
        }

        // Si es un PR o Push
        if (eventType === 'pull_request' || req.body?.pull_request) {
            const report = await PRAutomationService.handlePullRequestEvent(req.body);
            return res.json(report);
        }

        res.json({ success: true, message: 'Evento recibido pero no requirió procesamiento' });
    } catch (err) {
        console.error('[PR Webhook Error]:', err);
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * 14. Organizaciones: Crear (POST /api/orgs/create)
 */
/**
 * 13.5 Listar Organizaciones del Usuario (GET /api/orgs/my-orgs)
 */
app.get('/api/orgs/my-orgs', async (req, res, next) => {
    try {
        const userId = extractUserId(req) || 'danisan2326@gmail.com';
        const orgs = await OrganizationService.getUserOrganizations(userId);
        res.json({ success: true, organizations: orgs });
    } catch (err) {
        next(err);
    }
});

/**
 * 16.5 Listar Aprobaciones de una Organización (GET /api/orgs/:orgId/approvals)
 */
app.get('/api/orgs/:orgId/approvals', async (req, res, next) => {
    try {
        const { orgId } = req.params;
        const approvals = await OrganizationService.getApprovals(orgId);
        res.json({ success: true, approvals });
    } catch (err) {
        next(err);
    }
});

app.post('/api/orgs/create', requireOrganizations, async (req, res, next) => {
    try {
        const userId = extractUserId(req);
        const { name, slug } = req.body || {};
        const org = await OrganizationService.createOrganization({ name, slug, ownerId: userId });
        res.json({ success: true, organization: org });
    } catch (err) {
        next(err);
    }
});

/**
 * 15. Organizaciones: Miembros (GET & POST /api/orgs/:orgId/members)
 */
app.get('/api/orgs/:orgId/members', async (req, res, next) => {
    try {
        const { orgId } = req.params;
        const members = await OrganizationService.getMembers(orgId);
        res.json({ success: true, members });
    } catch (err) {
        next(err);
    }
});

app.post('/api/orgs/:orgId/members', async (req, res, next) => {
    try {
        const { orgId } = req.params;
        const { userId, role } = req.body || {};
        const member = await OrganizationService.addMember({ orgId, userId, role });
        res.json({ success: true, member });
    } catch (err) {
        next(err);
    }
});

/**
 * 16. Aprobaciones Documentales (POST /api/orgs/:orgId/approvals/submit y /review)
 */
app.post('/api/orgs/:orgId/approvals/submit', async (req, res, next) => {
    try {
        const { orgId } = req.params;
        const userId = extractUserId(req);
        const { projectId, docType, version } = req.body || {};
        const approval = await OrganizationService.submitDocumentForReview({
            orgId,
            projectId,
            docType,
            requestedBy: userId,
            version
        });
        res.json({ success: true, approval });
    } catch (err) {
        next(err);
    }
});

app.post('/api/orgs/:orgId/approvals/:approvalId/review', async (req, res, next) => {
    try {
        const { orgId, approvalId } = req.params;
        const userId = extractUserId(req);
        const { decision, comments } = req.body || {};
        const result = await OrganizationService.processDocumentApproval({
            orgId,
            approvalId,
            reviewerId: userId,
            decision,
            comments
        });
        res.json({ success: true, approval: result });
    } catch (err) {
        next(err);
    }
});

/**
 * 17. Auditoría de Organización (GET /api/orgs/:orgId/audit)
 */
app.get('/api/orgs/:orgId/audit', async (req, res, next) => {
    try {
        const { orgId } = req.params;
        const logs = await OrganizationService.getAuditLogs(orgId);
        res.json({ success: true, logs });
    } catch (err) {
        next(err);
    }
});

/**
 * 18. Configuración Enterprise (BYOK, Cero Retención, Marca Blanca)
 */
app.post('/api/enterprise/config', requireByokAndSecurity, async (req, res, next) => {
    try {
        const userId = extractUserId(req);
        const orgId = req.body?.orgId || `org_${userId || 'default'}`;
        const config = await SecurityConfigService.saveConfig(orgId, req.body || {});
        res.json({ success: true, config });
    } catch (err) {
        next(err);
    }
});

app.get('/api/enterprise/config', async (req, res, next) => {
    try {
        const userId = extractUserId(req);
        const orgId = req.query?.orgId || `org_${userId || 'default'}`;
        const config = await SecurityConfigService.getConfig(orgId);
        res.json({ success: true, config });
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
