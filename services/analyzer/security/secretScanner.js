/**
 * DOCUMENT-MIND AI — SECRET SCANNER & REDACTION ENGINE
 * Detects hardcoded secrets, API keys, credentials, tokens, and private keys.
 * Masks secrets with intelligent partial redaction (e.g., AIza...****...8F2, sk-****...92A).
 * Ensures raw secrets are NEVER exposed in UI, reports, logs, or sent to AI models.
 */

// Precise signature patterns for known secret types
const SECRET_SIGNATURES = [
    {
        type: 'Google / Gemini API Key',
        regex: /\b(AIza[0-9A-Za-z-_]{35,40})\b/g,
        severity: 'CRITICAL',
        owasp: 'A07:2021-Identification and Authentication Failures',
        cwe: 'CWE-798',
        mask: val => maskToken(val, 4, 3)
    },
    {
        type: 'OpenAI API Key',
        regex: /\b(sk-[a-zA-Z0-9]{20,48})\b/g,
        severity: 'CRITICAL',
        owasp: 'A07:2021-Identification and Authentication Failures',
        cwe: 'CWE-798',
        mask: val => maskToken(val, 3, 3)
    },
    {
        type: 'AWS Access Key ID',
        regex: /\b(AKIA[0-9A-Z]{16})\b/g,
        severity: 'HIGH',
        owasp: 'A07:2021-Identification and Authentication Failures',
        cwe: 'CWE-798',
        mask: val => maskToken(val, 4, 2)
    },
    {
        type: 'GitHub Personal Access Token',
        regex: /\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{22,60})\b/g,
        severity: 'CRITICAL',
        owasp: 'A07:2021-Identification and Authentication Failures',
        cwe: 'CWE-798',
        mask: val => maskToken(val, 4, 3)
    },
    {
        type: 'Stripe Secret Key',
        regex: /\b((?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,99})\b/g,
        severity: 'CRITICAL',
        owasp: 'A07:2021-Identification and Authentication Failures',
        cwe: 'CWE-798',
        mask: val => maskToken(val, 7, 3)
    },
    {
        type: 'Slack Token',
        regex: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g,
        severity: 'HIGH',
        owasp: 'A07:2021-Identification and Authentication Failures',
        cwe: 'CWE-798',
        mask: val => maskToken(val, 5, 2)
    },
    {
        type: 'JSON Web Token (JWT)',
        regex: /\b(ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
        severity: 'MEDIUM',
        owasp: 'A02:2021-Cryptographic Failures',
        cwe: 'CWE-312',
        mask: val => maskToken(val, 6, 4)
    },
    {
        type: 'Private Key Block',
        regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
        severity: 'CRITICAL',
        owasp: 'A02:2021-Cryptographic Failures',
        cwe: 'CWE-312',
        mask: () => '-----BEGIN PRIVATE KEY-----\n[REDACTED_PRIVATE_KEY_VALUE]\n-----END PRIVATE KEY-----'
    },
    {
        type: 'Database Connection String with Credentials',
        regex: /((?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|mssql):\/\/)([^:\s'"]+):([^@\s'"]+)(@[^\s'"]+)/gi,
        severity: 'CRITICAL',
        owasp: 'A07:2021-Identification and Authentication Failures',
        cwe: 'CWE-256',
        mask: (full, prefix, user, pass, host) => `${prefix}${user}:****${host}`
    },
    {
        type: 'Hardcoded Password / Secret Assignment',
        regex: /(?:password|passwd|pwd|db_pass|api_secret|jwt_secret|client_secret)\s*[:=]\s*['"]([^'"\s]{6,})['"]/gi,
        severity: 'HIGH',
        owasp: 'A07:2021-Identification and Authentication Failures',
        cwe: 'CWE-798',
        mask: (full, secret) => full.replace(secret, maskToken(secret, 2, 2))
    }
];

/**
 * Partially masks a token preserving start and end characters.
 * Example: maskToken('AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz', 4, 3) => 'AIza...****...Yz'
 */
function maskToken(val, startLen = 4, endLen = 3) {
    if (!val || typeof val !== 'string') return '****';
    const str = val.trim();
    if (str.length <= (startLen + endLen + 2)) {
        return '****';
    }
    const prefix = str.substring(0, startLen);
    const suffix = str.substring(str.length - endLen);
    return `${prefix}...****...${suffix}`;
}

/**
 * Scans a single file's content for hardcoded secrets.
 * @param {string} filePath - Path of the file
 * @param {string} content - Raw content of the file
 * @returns {Array<object>} Detected secrets
 */
function scanFileForSecrets(filePath, content) {
    if (!content || typeof content !== 'string') return [];

    const findings = [];
    const lines = content.split(/\r?\n/);

    SECRET_SIGNATURES.forEach(sig => {
        // Reset regex state
        sig.regex.lastIndex = 0;

        let match;
        while ((match = sig.regex.exec(content)) !== null) {
            const rawSecret = match[1] || match[0];

            // Ignore placeholders or common test mocks
            if (/your[-_]?key|tu[-_]?clave|placeholder|xxxx|changeme|fake|test_token|demo_key/i.test(rawSecret)) {
                continue;
            }

            // Determine line number
            const matchIndex = match.index;
            const textUpToMatch = content.substring(0, matchIndex);
            const lineNum = (textUpToMatch.match(/\n/g) || []).length + 1;
            const lineContent = lines[lineNum - 1] || '';

            // Mask the secret for safe display
            const maskedSecret = typeof sig.mask === 'function'
                ? sig.mask(match[0], match[1], match[2], match[3], match[4])
                : maskToken(rawSecret, 4, 3);

            // Create sanitized snippet
            const snippet = lineContent.replace(rawSecret, maskedSecret).trim();

            findings.push({
                id: `SEC-FIND-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                name: `Secreto Detectado: ${sig.type}`,
                type: sig.type,
                severity: sig.severity,
                owaspCategory: sig.owasp,
                cwe: sig.cwe,
                file: filePath,
                line: lineNum,
                maskedSecret,
                snippet: snippet.substring(0, 160),
                explanation: `Se detectó una credencial sensible (${sig.type}) escrita directamente en el código fuente o archivo de configuración.`,
                impact: 'Exposición no autorizada de credenciales que podría comprometer servicios en la nube, APIs o bases de datos.',
                recommendation: 'Extraer esta credencial inmediatamente hacia variables de entorno seguras (.env protegido) o un gestor de secretos (ej. AWS Secrets Manager, Vault, Doppler). Rotar la clave si el repositorio ha sido publicado.',
                status: 'Detectado',
                certainty: 'Confirmado'
            });
        }
    });

    return findings;
}

/**
 * Scans all provided project files for secrets.
 * @param {Array<{ path: string, content: string }>} files
 * @returns {Array<object>} All detected secrets across project
 */
function scanProjectSecrets(files) {
    if (!Array.isArray(files)) return [];

    const allFindings = [];
    const seenSecrets = new Set();

    files.forEach(file => {
        if (!file.content) return;
        const fileFindings = scanFileForSecrets(file.path, file.content);
        fileFindings.forEach(f => {
            const key = `${f.file}:${f.line}:${f.name}`;
            if (!seenSecrets.has(key)) {
                seenSecrets.add(key);
                allFindings.push(f);
            }
        });
    });

    return allFindings;
}

/**
 * Sanitizes an entire text by replacing any discovered secrets with their masked version.
 * @param {string} text
 * @returns {string} Sanitized text
 */
function redactAllSecrets(text) {
    if (!text || typeof text !== 'string') return '';
    let result = text;

    SECRET_SIGNATURES.forEach(sig => {
        sig.regex.lastIndex = 0;
        result = result.replace(sig.regex, (match, p1, p2, p3, p4) => {
            if (typeof sig.mask === 'function') {
                return sig.mask(match, p1, p2, p3, p4);
            }
            return maskToken(match, 4, 3);
        });
    });

    return result;
}

module.exports = {
    scanFileForSecrets,
    scanProjectSecrets,
    redactAllSecrets,
    maskToken
};
