/**
 * DOCUMENT-MIND AI — SECRET SANITIZER & SAFETY MODULE
 * Ensures NO secrets, API keys, tokens, or private credentials are ever sent to Gemini or client.
 */

// Patterns to detect and redact sensitive secret values
const SECRET_KEY_PATTERNS = [
    /(?:gemini|openai|anthropic|stripe|aws|github|gitlab|slack|sendgrid|twilio)[-_]?(?:api[-_]?key|secret|token|auth)\s*[:=]\s*['"]?([a-zA-Z0-9_\-\.]{12,})['"]?/gi,
    /(?:password|passwd|pwd|secret|private[-_]?key|jwt[-_]?secret|access[-_]?token|refresh[-_]?token)\s*[:=]\s*['"]?([^'"\s]{4,})['"]?/gi,
    /bearer\s+([a-zA-Z0-9_\-\.]{16,})/gi,
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/gi,
    /(?:postgres|mysql|mongodb(?:\+srv)?|redis|sqlite|mssql):\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/gi,
    /AKIA[0-9A-Z]{16}/g // AWS Access Key ID
];

/**
 * Sanitizes generic source code or document text by masking detected secret patterns.
 * @param {string} text - Raw content to sanitize
 * @returns {string} Sanitized content
 */
function sanitizeContent(text) {
    if (!text || typeof text !== 'string') return '';

    let clean = text;

    // 1. Redact full private keys
    clean = clean.replace(/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/gi, '-----BEGIN PRIVATE KEY-----\n[REDACTED_PRIVATE_KEY_VALUE]\n-----END PRIVATE KEY-----');

    // 2. Redact connection strings with credentials
    clean = clean.replace(/((?:postgres|mysql|mongodb(?:\+srv)?|redis|sqlite|mssql):\/\/)([^:\s'"]+):([^@\s'"]+)(@[^\s'"]+)/gi, (match, prefix, user, pass, host) => {
        return `${prefix}${user}:********${host}`;
    });

    // 3. Redact API keys and generic secrets
    SECRET_KEY_PATTERNS.forEach(pattern => {
        clean = clean.replace(pattern, (match, secretVal) => {
            if (secretVal && secretVal.length > 3) {
                return match.replace(secretVal, '********');
            }
            return match;
        });
    });

    return clean;
}

/**
 * Specifically parses and sanitizes .env files:
 * Retains variable keys and environmental context, but replaces values with ********.
 * @param {string} envContent - Raw content of .env file
 * @returns {{ sanitizedContent: string, detectedVariables: Array<{ key: string, hasValue: boolean }> }}
 */
function sanitizeEnvFile(envContent) {
    if (!envContent || typeof envContent !== 'string') {
        return { sanitizedContent: '', detectedVariables: [] };
    }

    const lines = envContent.split(/\r?\n/);
    const detectedVariables = [];
    const sanitizedLines = [];

    for (const line of lines) {
        const trimmed = line.trim();
        // Keep comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) {
            sanitizedLines.push(line);
            continue;
        }

        const match = line.match(/^(\s*(?:export\s+)?)([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.*)$/);
        if (match) {
            const prefix = match[1];
            const key = match[2];
            const val = match[3].trim();
            const hasValue = val.length > 0 && val !== '""' && val !== "''";

            detectedVariables.push({
                key,
                hasValue
            });

            // Mask value strictly
            sanitizedLines.push(`${prefix}${key}=********`);
        } else {
            sanitizedLines.push(line);
        }
    }

    return {
        sanitizedContent: sanitizedLines.join('\n'),
        detectedVariables
    };
}

module.exports = {
    sanitizeContent,
    sanitizeEnvFile
};
