/**
 * DOCUMENT-MIND AI — DOCUMENT PARSER SERVICE
 * Extracts and sanitizes plain text from PDF, DOCX, and TXT files.
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit
const MIN_TEXT_LENGTH = 40; // Minimum characters required to consider valid content

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];
const SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'application/octet-stream' // sometimes sent by browsers for plain/md
];

/**
 * Validates file properties before parsing.
 */
function validateFile(file) {
    if (!file || !file.buffer) {
        return { valid: false, error: 'No se recibió ningún archivo para procesar.' };
    }

    if (file.size === 0) {
        return { valid: false, error: 'El archivo subido está vacío (0 bytes).' };
    }

    if (file.size > MAX_FILE_SIZE) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        return { valid: false, error: `El archivo supera el tamaño máximo permitido de 10 MB (Tamaño: ${mb} MB).` };
    }

    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        return {
            valid: false,
            error: `Formato no soportado (${ext || 'desconocido'}). Se admiten únicamente archivos .pdf, .docx y .txt.`
        };
    }

    return { valid: true, ext };
}

/**
 * Cleans and normalizes extracted text.
 */
function cleanText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    return rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Parses document buffer and extracts text and metadata.
 */
async function parseDocument(file) {
    const validation = validateFile(file);
    if (!validation.valid) {
        const err = new Error(validation.error);
        err.statusCode = 400;
        throw err;
    }

    const ext = validation.ext;
    let extractedText = '';
    let pageCount = 1;

    try {
        if (ext === '.pdf') {
            const pdfData = await pdfParse(file.buffer);
            extractedText = pdfData.text || '';
            pageCount = pdfData.numpages || 1;

            // Check if PDF is a scanned image without OCR text
            if (extractedText.trim().length < MIN_TEXT_LENGTH) {
                const scanErr = new Error(
                    'El documento PDF parece estar escaneado o no contiene texto digital extraíble directamente. Por favor sube un documento con texto seleccionable.'
                );
                scanErr.statusCode = 422;
                throw scanErr;
            }
        } else if (ext === '.docx') {
            const docxResult = await mammoth.extractRawText({ buffer: file.buffer });
            extractedText = docxResult.value || '';
            // Estimate page count for DOCX (~350 words per page)
            const words = extractedText.trim().split(/\s+/).filter(Boolean).length;
            pageCount = Math.max(1, Math.ceil(words / 350));
        } else if (ext === '.txt' || ext === '.md') {
            extractedText = file.buffer.toString('utf8');
            const words = extractedText.trim().split(/\s+/).filter(Boolean).length;
            pageCount = Math.max(1, Math.ceil(words / 400));
        }
    } catch (parseError) {
        if (parseError.statusCode) throw parseError;
        const err = new Error(`Error al procesar el archivo ${file.originalname}: ${parseError.message}`);
        err.statusCode = 422;
        throw err;
    }

    const sanitizedText = cleanText(extractedText);
    if (sanitizedText.length < MIN_TEXT_LENGTH) {
        const err = new Error('El documento no contiene suficiente texto legible para realizar un análisis de IA.');
        err.statusCode = 422;
        throw err;
    }

    const words = sanitizedText.split(/\s+/).filter(Boolean).length;
    const charCount = sanitizedText.length;

    return {
        filename: file.originalname,
        filesize: file.size,
        filesizeFormatted: file.size < 1024 * 1024 
            ? `${(file.size / 1024).toFixed(1)} KB` 
            : `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        extension: ext,
        pageCount,
        wordCount: words,
        charCount,
        text: sanitizedText
    };
}

module.exports = {
    parseDocument,
    validateFile,
    cleanText
};
