/**
 * DOCUMENT-MIND AI — DEPENDENCY SECURITY AUDITOR
 * Performs non-destructive static auditing of dependencies and manifests.
 * Inspects package.json, package-lock.json, requirements.txt.
 * Detects known risky dependencies, wildcards (*), deprecated packages, and missing security controls.
 */

// Known risky packages or insecure patterns
const RISKY_PACKAGES = [
    { name: 'node-serialize', risk: 'CRITICAL', reason: 'Vulnerable a Ejecución Remota de Código (RCE) por deserialización no confiable (CVE-2017-5941).' },
    { name: 'flatmap-stream', risk: 'CRITICAL', reason: 'Paquete malicioso conocido (comprometido en ataque de cadena de suministro de event-stream).' },
    { name: 'event-stream', versionPattern: /3\.3\.6/, risk: 'CRITICAL', reason: 'Versión comprometida con payload malicioso de robo de criptomonedas.' },
    { name: 'lodash', versionPattern: /^4\.(?:0|1[0-6]|17\.[0-9]|17\.1[0-5])\b/, risk: 'HIGH', reason: 'Versión vulnerable a Prototype Pollution (CVE-2019-10744).' },
    { name: 'express', versionPattern: /^[1-3]\.|^4\.(?:[0-9]|1[0-5])\./, risk: 'HIGH', reason: 'Versión heredada obsoleta con múltiples vulnerabilidades conocidas de bypass.' },
    { name: 'jsonwebtoken', versionPattern: /^[0-8]\.[0-8]\./, risk: 'HIGH', reason: 'Versión antigua vulnerable a bypass de verificación de algoritmo y RCE.' },
    { name: 'axios', versionPattern: /^0\.(?:[0-9]|1[0-9]|20)\./, risk: 'MEDIUM', reason: 'Versión desactualizada con problemas de SSRF y escape de cabeceras.' },
    { name: 'moment', risk: 'LOW', reason: 'Biblioteca en estado de mantenimiento y obsoleta; se recomienda migrar a Date-fns o Temporal API.' }
];

/**
 * Audits dependency manifests.
 * @param {Array<{ path: string, content: string }>} files
 * @returns {Array<object>} Findings and audit summary
 */
function auditDependencies(files) {
    if (!Array.isArray(files)) return [];

    const findings = [];
    const pkgFile = files.find(f => f.path.toLowerCase().endsWith('package.json'));
    const reqFile = files.find(f => f.path.toLowerCase().endsWith('requirements.txt'));

    // 1. Audit Node.js package.json
    if (pkgFile && pkgFile.content) {
        try {
            const pkg = JSON.parse(pkgFile.content);
            const allDeps = {
                ...(pkg.dependencies || {}),
                ...(pkg.devDependencies || {})
            };

            // Check for dangerous wildcard dependencies
            Object.entries(allDeps).forEach(([depName, version]) => {
                const verStr = String(version).trim();

                if (verStr === '*' || verStr === 'latest') {
                    findings.push({
                        id: `DEP-RISK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                        name: `Dependencia con Versión Comodín (*) o 'latest': ${depName}`,
                        severity: 'MEDIUM',
                        owaspCategory: 'A06:2021-Vulnerable and Outdated Components',
                        cwe: 'CWE-1104',
                        file: pkgFile.path,
                        line: 1,
                        snippet: `"${depName}": "${verStr}"`,
                        explanation: `La dependencia "${depName}" utiliza un rango flotante sin fijar ("${verStr}"). Esto puede introducir breaking changes o versiones infectadas de forma automática.`,
                        impact: 'Riesgo de ataque a la cadena de suministro (Supply Chain Attack) y compilaciones no deterministas.',
                        recommendation: 'Fijar la versión con un prefijo controlado (ej. ^1.2.3 o ~1.2.3) y versionar un archivo de bloqueo (package-lock.json).',
                        status: 'Detectado',
                        certainty: 'Confirmado'
                    });
                }

                // Check against known risky packages list
                const known = RISKY_PACKAGES.find(k => k.name.toLowerCase() === depName.toLowerCase());
                if (known) {
                    let isVulnerable = true;
                    if (known.versionPattern) {
                        isVulnerable = known.versionPattern.test(verStr.replace(/[\^~><=]/g, ''));
                    }

                    if (isVulnerable) {
                        findings.push({
                            id: `DEP-VULN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                            name: `Componente Vulnerable / Obsoleto Detectado: ${depName}`,
                            severity: known.risk,
                            owaspCategory: 'A06:2021-Vulnerable and Outdated Components',
                            cwe: 'CWE-1395',
                            file: pkgFile.path,
                            line: 1,
                            snippet: `"${depName}": "${verStr}"`,
                            explanation: known.reason,
                            impact: 'Exposición del sistema a vulnerabilidades públicas documentadas (CVE).',
                            recommendation: `Actualizar "${depName}" a su última versión estable parcheada o sustituir por una alternativa mantenida.`,
                            status: 'Detectado',
                            certainty: 'Confirmado'
                        });
                    }
                }
            });

            // Check if package-lock.json is present in repository
            const hasLockFile = files.some(f => f.path.toLowerCase().endsWith('package-lock.json') || f.path.toLowerCase().endsWith('yarn.lock') || f.path.toLowerCase().endsWith('pnpm-lock.yaml'));
            if (!hasLockFile) {
                findings.push({
                    id: `DEP-WARN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    name: 'Ausencia de Lockfile (package-lock.json / yarn.lock)',
                    severity: 'LOW',
                    owaspCategory: 'A06:2021-Vulnerable and Outdated Components',
                    cwe: 'CWE-1104',
                    file: pkgFile.path,
                    line: 1,
                    snippet: 'Archivo package-lock.json no detectado en el repositorio',
                    explanation: 'El repositorio contiene package.json pero carece de un lockfile versionado que garantice el árbol de dependencias exacto.',
                    impact: 'Diferencias entre entornos de desarrollo, CI/CD y producción.',
                    recommendation: 'Generar y versionar el archivo package-lock.json ejecutando `npm install`.',
                    status: 'Detectado',
                    certainty: 'Confirmado'
                });
            }
        } catch (e) {
            // Invalid JSON in package.json
            findings.push({
                id: `DEP-ERR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                name: 'Error de Sintaxis en package.json',
                severity: 'INFO',
                owaspCategory: 'A05:2021-Security Misconfiguration',
                cwe: 'CWE-1104',
                file: pkgFile.path,
                line: 1,
                snippet: 'package.json corrupto o inválido',
                explanation: 'No se pudo parsear el archivo package.json debido a errores de formato.',
                impact: 'Inconsistencias en la resolución de paquetes.',
                recommendation: 'Validar la sintaxis JSON del manifiesto.',
                status: 'Requiere verificación',
                certainty: 'Probable'
            });
        }
    }

    // 2. Audit Python requirements.txt
    if (reqFile && reqFile.content) {
        const lines = reqFile.content.split(/\r?\n/);
        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            // Missing pinned version (e.g. "requests" without "==2.31.0")
            if (!trimmed.includes('==') && !trimmed.includes('>=') && !trimmed.includes('~=')) {
                findings.push({
                    id: `DEP-PY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    name: `Dependencia Python sin Versión Fijada: ${trimmed}`,
                    severity: 'LOW',
                    owaspCategory: 'A06:2021-Vulnerable and Outdated Components',
                    cwe: 'CWE-1104',
                    file: reqFile.path,
                    line: idx + 1,
                    snippet: trimmed,
                    explanation: `El paquete "${trimmed}" no especifica una versión fija (==X.Y.Z).`,
                    impact: 'Despliegues no reproducibles y riesgo de roturas por actualizaciones automáticas.',
                    recommendation: `Fijar la versión con "pip freeze > requirements.txt" o utilizar pip-tools / poetry.`,
                    status: 'Detectado',
                    certainty: 'Confirmado'
                });
            }
        });
    }

    return findings;
}

module.exports = {
    auditDependencies,
    RISKY_PACKAGES
};
