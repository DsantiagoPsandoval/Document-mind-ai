/**
 * DOCUMENT-MIND AI — BACKEND SERVER & API GATEWAY
 * Express.js production server with modular AI, document parsing, and GitHub analysis pipelines.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const { parseDocument } = require('./services/documents/parser');
const { fetchAndAnalyzeRepo } = require('./services/github/analyzer');
const {
    analyzeDocument,
    chatWithDocument,
    analyzeRepository,
    chatWithRepository,
    getGenAIClient
} = require('./services/ai/gemini');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Multer in-memory upload configuration (10 MB limit)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (['.pdf', '.docx', '.txt', '.md'].includes(ext)) {
            cb(null, true);
        } else {
            const err = new Error(`Formato de archivo no soportado (${ext}). Se admiten únicamente .pdf, .docx y .txt.`);
            err.statusCode = 400;
            cb(err);
        }
    }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname)));

// ============================================================
// API ROUTES
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

        // 1. Extract and sanitize text
        const parsedData = await parseDocument(req.file);

        // 2. Analyze with Gemini (or heuristic fallback)
        const analysis = await analyzeDocument(parsedData);

        res.json({
            success: true,
            filename: parsedData.filename,
            filesize: parsedData.filesizeFormatted,
            pageCount: parsedData.pageCount,
            wordCount: parsedData.wordCount,
            charCount: parsedData.charCount,
            documentText: parsedData.text, // Returned to client for grounding subsequent chats
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
                error: 'No se encontró el texto del documento para fundamentar la respuesta. Por favor analiza un documento primero.'
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

        // 1. Fetch metadata, tree, filter files, extract key code
        const repoData = await fetchAndAnalyzeRepo(repoUrl.trim());

        // 2. Analyze architecture with Gemini (or heuristic fallback)
        const analysis = await analyzeRepository(repoData);

        res.json({
            success: true,
            repository: repoData.repository,
            stats: repoData.stats,
            detectedTechnologies: repoData.detectedTechnologies,
            treeDiagram: repoData.treeDiagram,
            relevantFilesList: repoData.relevantFilesList,
            keyFiles: repoData.prioritizedFiles.map(f => ({ path: f.path, size: f.size })),
            analysis,
            // Store lightweight context for repository chat
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
                error: 'No se encontró el contexto del repositorio. Por favor ejecuta el análisis del repositorio primero.'
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
// ERROR HANDLING MIDDLEWARE
// ============================================================

app.use((err, req, res, next) => {
    // Multer size error handling
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'El archivo supera el tamaño máximo permitido de 10 MB.'
        });
    }

    const statusCode = err.statusCode || 500;
    const clientMessage = statusCode === 500
        ? 'Ocurrió un inconveniente temporal en el servidor. Por favor intenta de nuevo.'
        : err.message;

    // Log detailed error exclusively on the server (never leaked to client)
    console.error(`[Server Error ${statusCode}]`, err.message);

    res.status(statusCode).json({
        success: false,
        error: clientMessage
    });
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 DOCUMENT-MIND AI — Servidor Activo`);
        console.log(`🌐 URL Local: http://localhost:${PORT}`);
        console.log(`🤖 Proveedor IA: Google Gemini (${process.env.AI_MODEL || 'gemini-2.5-flash'})`);
        console.log(`🔑 Clave API: ${process.env.GEMINI_API_KEY ? 'Configurada ✔' : 'Modo Heurístico / Sin clave (Definir en .env para IA completa)'}`);
        console.log(`====================================================`);
    });
}

module.exports = app;
