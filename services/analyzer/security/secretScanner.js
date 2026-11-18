/**
 * DOCUMIND AI — SECRET SCANNER & REDACTION ENGINE
 * Detects hardcoded secrets, API keys, credentials, tokens, and private keys.
 * Masks secrets with intelligent partial redaction (e.g., AIza...****...8F2, sk-****...92A).
 * Ensures raw secrets are NEVER exposed in UI, reports, logs, or sent to AI models.
 */

const SECRET_SIGNATURES = [
    {
        type: 'Google / Gemini API Key',
        regex: /\b(AIza[0-9A-Za-z-_]{35,40})\b/g,
        severity: 'CRITICAL',
        severityLabel: 'Crítico',
        owasp: 'A07:2021-Identification and Authentication Failures',
        owaspAsvs: 'ASVS V2.10 / V6.4 (Secret Management)',
        cwe: 'CWE-798',
        iso27001: 'ISO/IEC 27001:2022 Control A.8.12 / A.5.17',
        iso27002: 'ISO/IEC 27002:2022 §8.12 Prevención de fuga de datos y §5.17 Información de autenticación',
        cvss4Ref: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N (Referencia técnica CWE-798)',
        mask: val => maskToken(val, 4, 3)
    },
    {
        type: 'OpenAI API Key',
        regex: /\b(sk-[a-zA-Z0-9]{20,48})\b/g,
        severity: 'CRITICAL',
        severityLabel: 'Crítico',
        owasp: 'A07:2021-Identification and Authentication Failures',
        owaspAsvs: 'ASVS V2.10 / V6.4 (Secret Management)',
        cwe: 'CWE-798',
        iso27001: 'ISO/IEC 27001:2022 Control A.8.12 / A.5.17',
        iso27002: 'ISO/IEC 27002:2022 §8.12 Prevención de fuga de datos',
        cvss4Ref: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N (Referencia técnica CWE-798)',
        mask: val => maskToken(val, 3, 3)
    },
    {
        type: 'AWS Access Key ID',
        regex: /\b(AKIA[0-9A-Z]{16})\b/g,
        severity: 'HIGH',
        severityLabel: 'Alto',
        owasp: 'A07:2021-Identification and Authentication Failures',
        owaspAsvs: 'ASVS V2.10 (Service Authentication)',
        cwe: 'CWE-798',
        iso27001: 'ISO/IEC 27001:2022 Control A.5.17 / A.8.2',
        iso27002: 'ISO/IEC 27002:2022 §5.17 Información de autenticación',
        cvss4Ref: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:L/VA:N/SC:N/SI:N/SA:N (Referencia técnica CWE-798)',
        mask: val => maskToken(val, 4, 2)
    },
    {
        type: 'GitHub Personal Access Token',
        regex: /\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{22,60})\b/g,
        severity: 'CRITICAL',
        severityLabel: 'Crítico',
        owasp: 'A07:2021-Identification and Authentication Failures',
        owaspAsvs: 'ASVS V2.10 / V14.2',
        cwe: 'CWE-798',
        iso27001: 'ISO/IEC 27001:2022 Control A.8.32 / A.5.17',
        iso27002: 'ISO/IEC 27002:2022 §8.4 Acceso al código fuente',
        cvss4Ref: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N (Referencia técnica CWE-798)',
        mask: val => maskToken(val, 4, 3)
    },
    {
        type: 'Secret API Key (Live / Test)',
        regex: /\b((?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,99})\b/g,
        severity: 'CRITICAL',
        severityLabel: 'Crítico',
        owasp: 'A07:2021-Identification and Authentication Failures',
        owaspAsvs: 'ASVS V6.4 (Secret Management)',
        cwe: 'CWE-798',
        iso27001: 'ISO/IEC 27001:2022 Control A.5.17',
        iso27002: 'ISO/IEC 27002:2022 §5.17 Información de autenticación',
        cvss4Ref: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N (Referencia técnica CWE-798)',
        mask: val => maskToken(val, 7, 3)
    },
    {
        type: 'Slack Token',
        regex: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g,
        severity: 'HIGH',
        severityLabel: 'Alto',
        owasp: 'A07:2021-Identification and Authentication Failures',
        owaspAsvs: 'ASVS V2.10',
        cwe: 'CWE-798',
        iso27001: 'ISO/IEC 27001:2022 Control A.5.17',
        iso27002: 'ISO/IEC 27002:2022 §5.17 Información de autenticación',
        cvss4Ref: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:L/VA:N/SC:N/SI:N/SA:N',
        mask: val => maskToken(val, 5, 2)
    },
    {
        type: 'JSON Web Token (JWT) Expuesto',
        regex: /\b(ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
        severity: 'MEDIUM',
        severityLabel: 'Medio',
        owasp: 'A02:2021-Cryptographic Failures',
        owaspAsvs: 'ASVS V3.5 (Token-based Session Management)',
        cwe: 'CWE-312',
        iso27001: 'ISO/IEC 27001:2022 Control A.8.24',
        iso27002: 'ISO/IEC 27002:2022 §8.24 Uso de la criptografía',
        cvss4Ref: 'CVSS:4.0/AV:N/AC:H/AT:N/PR:N/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N (Referencia CWE-312)',
        mask: val => maskToken(val, 6, 4)
    },
    {
        type: 'Private Key Block (RSA / EC / OpenSSH)',
        regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
        severity: 'CRITICAL',
        severityLabel: 'Crítico',
        owasp: 'A02:2021-Cryptographic Failures',
        owaspAsvs: 'ASVS V6.4 (Key Management)',
        cwe: 'CWE-312',
        iso27001: 'ISO/IEC 27001:2022 Control A.8.24',
        iso27002: 'ISO/IEC 27002:2022 §8.24 Gestión de llaves criptográficas',
        cvss4Ref: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N (Referencia CWE-312)',
        mask: () => '-----BEGIN PRIVATE KEY-----\n[REDACTED_PRIVATE_KEY_VALUE]\n-----END PRIVATE KEY-----'
    },
    {
        type: 'Database Connection String con Credenciales',
        regex: /((?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|mssql):\/\/)([^:\s'"]+):([^@\s'"]+)(@[^\s'"]+)/gi,
        severity: 'CRITICAL',
        severityLabel: 'Crítico',
        owasp: 'A07:2021-Identification and Authentication Failures',
        owaspAsvs: 'ASVS V2.10.4 (No hardcoded credentials)',
        cwe: 'CWE-256',
        iso27001: 'ISO/IEC 27001:2022 Control A.5.17 / A.8.12',
        iso27002: 'ISO/IEC 27002:2022 §5.17 Protección de credenciales de conexión',
        cvss4Ref: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N (Referencia CWE-256)',
        mask: (full, prefix, user, pass, host) => `${prefix}${user}:****${host}`
    },
    {
        type: 'Contraseña o Secreto Hardcodeado en Código',
        regex: /(?:password|passwd|pwd|db_pass|api_secret|jwt_secret|client_secret)\s*[:=]\s*['"]([^'"\s]{6,})['"]/gi,
        severity: 'HIGH',
        severityLabel: 'Alto',
        owasp: 'A07:2021-Identification and Authentication Failures',
        owaspAsvs: 'ASVS V2.10.4',
        cwe: 'CWE-798',
        iso27001: 'ISO/IEC 27001:2022 Control A.5.17 / A.8.28',
        iso27002: 'ISO/IEC 27002:2022 §8.28 Codificación segura',
        cvss4Ref: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:L/VA:N/SC:N/SI:N/SA:N (Referencia CWE-798)',
        mask: (full, secret) => full.replace(secret, maskToken(secret, 2, 2))
    }
];

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

function scanFileForSecrets(filePath, content) {
    if (!content || typeof content !== 'string') return [];

    const findings = [];
    const lines = content.split(/\r?\n/);

    SECRET_SIGNATURES.forEach(sig => {
        sig.regex.lastIndex = 0;

        let match;
        while ((match = sig.regex.exec(content)) !== null) {
            const rawSecret = match[1] || match[0];

            if (/your[-_]?key|tu[-_]?clave|placeholder|xxxx|changeme|fake|test_token|demo_key|example/i.test(rawSecret)) {
                continue;
            }

            const matchIndex = match.index;
            const textUpToMatch = content.substring(0, matchIndex);
            const lineNum = (textUpToMatch.match(/\n/g) || []).length + 1;
            const lineContent = lines[lineNum - 1] || '';

            const maskedSecret = typeof sig.mask === 'function'
                ? sig.mask(match[0], match[1], match[2], match[3], match[4])
                : maskToken(rawSecret, 4, 3);

            const snippet = lineContent.replace(rawSecret, maskedSecret).trim();

            findings.push({
                id: `SEC-FIND-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                ruleId: 'SECRETS-DEFAULT',
                name: `Secreto o Credencial Expuesta: ${sig.type}`,
                title: `Secreto o Credencial Expuesta: ${sig.type}`,
                dimensionId: 'secretsManagement',
                category: 'Gestión de secretos y credenciales',
                type: sig.type,
                severity: sig.severity,
                severityLabel: sig.severityLabel || 'Crítico',
                owaspCategory: sig.owasp,
                owasp: sig.owasp,
                owaspAsvs: sig.owaspAsvs,
                cwe: sig.cwe,
                iso27001: sig.iso27001,
                iso27002: sig.iso27002,
                cvss4Reference: sig.cvss4Ref,
                standards: {
                    owaspTop10: sig.owasp,
                    owaspAsvs: sig.owaspAsvs,
                    cwe: sig.cwe,
                    cvss4: sig.cvss4Ref,
                    iso27001: sig.iso27001,
                    iso27002: sig.iso27002
                },
                file: filePath,
                line: lineNum,
                maskedSecret,
                snippet: snippet.substring(0, 160),
                evidence: snippet.substring(0, 160),
                explanation: `Se detectó una credencial sensible (${sig.type}) escrita directamente en el archivo ${filePath} (línea ${lineNum}).`,
                description: `Se detectó una credencial sensible (${sig.type}) escrita directamente en el archivo ${filePath} (línea ${lineNum}).`,
                impact: 'Exposición no autorizada de credenciales que puede comprometer servicios cloud, APIs externas o bases de datos.',
                likelihood: 'Alta',
                recommendation: 'Extraer esta credencial inmediatamente hacia variables de entorno (.env no versionado) o un gestor de secretos (Vault / Cloud Secrets Manager) y rotar la clave comprometida.',
                status: 'confirmado',
                certainty: 'Confirmado',
                veracityType: 'Vulnerabilidad confirmada',
                findingStatus: 'Pendiente',
                verifiedFixed: false
            });
        }
    });

    return findings;
}

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
