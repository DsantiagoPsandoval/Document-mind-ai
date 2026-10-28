/**
 * DOCUMENT-MIND AI — SAFE ZIP EXTRACTION SERVICE
 * Provides in-memory, secure decompression of uploaded ZIP archives.
 * Implements defenses against:
 * 1. Zip Bombs (uncompressed size limit & compression ratio threshold)
 * 2. Path Traversal (directory traversal attacks using ../ or absolute paths)
 * 3. Excessive entry count (Denial of Service via millions of small files)
 * 4. Dangerous executables and scripts (.exe, .bat, .cmd, .sh, .vbs)
 */

const AdmZip = require('adm-zip');
const path = require('path');
const { classifyFile, shouldIgnoreFile, computeFileHash } = require('./fileClassifier');
const { sanitizeContent } = require('./sanitizer');

// Safety limits
const MAX_ZIP_ENTRIES = 120; // Maximum number of extracted files
const MAX_ENTRY_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per single extracted file
const MAX_TOTAL_UNCOMPRESSED_BYTES = 35 * 1024 * 1024; // 35 MB total uncompressed
const MAX_COMPRESSION_RATIO = 100; // Protection against zip bombs (e.g. 1 KB compressed expanding to > 100 KB)

// Executables and hazardous extensions that must not be ingested
const FORBIDDEN_EXTENSIONS = new Set([
    '.exe', '.dll', '.so', '.dylib', '.bat', '.cmd', '.vbs', '.msi', '.com', '.scr', '.pif', '.bin', '.iso'
]);

/**
 * Normalizes a zip entry path safely, preventing directory traversal.
 * @param {string} rawEntryName
 * @returns {string|null} Safe normalized relative path, or null if malicious
 */
function sanitizeZipEntryPath(rawEntryName) {
    if (!rawEntryName || typeof rawEntryName !== 'string') return null;

    // Replace backslashes with forward slashes
    let normalized = rawEntryName.replace(/\\/g, '/').trim();

    // Remove leading slashes and drive letters (e.g., C:/ or /etc)
    normalized = normalized.replace(/^[a-zA-Z]:[/\\]+/, '').replace(/^[/\\]+/, '');

    // Resolve path segments safely
    const segments = normalized.split('/').filter(Boolean);
    const safeSegments = [];

    for (const segment of segments) {
        if (segment === '.' || segment === '') continue;
        if (segment === '..') {
            // Attempt to navigate backwards -> Directory Traversal vector
            return null;
        }
        // Disallow dangerous characters in segment names
        if (/[\0<>:"|?*]/.test(segment)) {
            return null;
        }
        safeSegments.push(segment);
    }

    if (safeSegments.length === 0) return null;
    return safeSegments.join('/');
}

/**
 * Extracts and safely normalizes files from an uploaded ZIP buffer.
 * @param {Buffer} zipBuffer - Raw buffer of the uploaded ZIP file
 * @returns {Array<{ path: string, size: number, category: string, hash: string, content: string }>}
 */
function extractSafeZipFiles(zipBuffer) {
    if (!zipBuffer || !Buffer.isBuffer(zipBuffer)) {
        const err = new Error('El archivo comprimido provisto no es válido o está vacío.');
        err.statusCode = 400;
        throw err;
    }

    let zip;
    try {
        zip = new AdmZip(zipBuffer);
    } catch (e) {
        const err = new Error('No se pudo leer el archivo ZIP. Verifique que no esté corrupto.');
        err.statusCode = 400;
        throw err;
    }

    const zipEntries = zip.getEntries();
    if (!zipEntries || zipEntries.length === 0) {
        const err = new Error('El archivo ZIP no contiene ningún elemento.');
        err.statusCode = 400;
        throw err;
    }

    const extractedFiles = [];
    let totalUncompressedBytes = 0;

    for (const entry of zipEntries) {
        // Skip directories
        if (entry.isDirectory) continue;

        const rawName = entry.entryName;
        const safePath = sanitizeZipEntryPath(rawName);

        // Security reject on directory traversal attempt
        if (!safePath) {
            console.warn(`[SafeZip Shield] Se descartó entrada con posible Path Traversal: ${rawName}`);
            continue;
        }

        // Check against ignored directories or lockfiles
        if (shouldIgnoreFile(safePath)) {
            continue;
        }

        const ext = path.extname(safePath).toLowerCase();
        if (FORBIDDEN_EXTENSIONS.has(ext)) {
            console.warn(`[SafeZip Shield] Se descartó archivo ejecutable/binario peligroso: ${safePath}`);
            continue;
        }

        const uncompressedSize = entry.header.size;
        const compressedSize = entry.header.compressedSize;

        // Zip Bomb Ratio Guard
        if (compressedSize > 0 && (uncompressedSize / compressedSize) > MAX_COMPRESSION_RATIO) {
            const err = new Error(`Posible Zip Bomb detectada en "${safePath}" (ratio de descompresión sospechoso: > ${MAX_COMPRESSION_RATIO}:1).`);
            err.statusCode = 400;
            throw err;
        }

        // Single entry size guard
        if (uncompressedSize > MAX_ENTRY_SIZE_BYTES) {
            console.warn(`[SafeZip Shield] Archivo "${safePath}" excede el límite unitario de 5 MB. Se omite.`);
            continue;
        }

        totalUncompressedBytes += uncompressedSize;
        if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
            const err = new Error(`El archivo ZIP excede el tamaño total descompreso permitido de ${MAX_TOTAL_UNCOMPRESSED_BYTES / (1024 * 1024)} MB.`);
            err.statusCode = 400;
            throw err;
        }

        if (extractedFiles.length >= MAX_ZIP_ENTRIES) {
            console.warn(`[SafeZip Shield] Se alcanzó el límite máximo de ${MAX_ZIP_ENTRIES} archivos extraídos.`);
            break;
        }

        // Read and sanitize text content
        try {
            const rawContent = zip.readAsText(entry);
            const sanitized = sanitizeContent(rawContent);
            const category = classifyFile(safePath, sanitized);
            const hash = computeFileHash(sanitized);

            extractedFiles.push({
                path: safePath,
                size: sanitized.length,
                category,
                hash,
                content: sanitized.substring(0, 45000)
            });
        } catch (readErr) {
            console.warn(`[SafeZip Shield] No se pudo leer el contenido de ${safePath}:`, readErr.message);
        }
    }

    if (extractedFiles.length === 0) {
        const err = new Error('No se encontraron archivos de código o documentación analizables dentro del archivo ZIP.');
        err.statusCode = 400;
        throw err;
    }

    return extractedFiles;
}

module.exports = {
    extractSafeZipFiles,
    sanitizeZipEntryPath
};
