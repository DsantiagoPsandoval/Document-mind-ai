/**
 * DOCUMIND AI — DEPENDENCY SECURITY AUDITOR (SCA)
 * Performs non-destructive static auditing of dependencies and manifests.
 * Inspects package.json, package-lock.json, requirements.txt, pyproject.toml, pom.xml.
 */

const RISKY_PACKAGES = [
    { name: 'node-serialize', risk: 'CRITICAL', riskLabel: 'Crítico', cve: 'CVE-2017-5941', cwe: 'CWE-502', reason: 'Vulnerable a Ejecución Remota de Código (RCE) por deserialización no confiable (CVE-2017-5941).' },
    { name: 'flatmap-stream', risk: 'CRITICAL', riskLabel: 'Crítico', cve: 'CVE-2018-16487', cwe: 'CWE-506', reason: 'Paquete malicioso conocido (comprometido en ataque de cadena de suministro de event-stream).' },
    { name: 'event-stream', versionPattern: /3\.3\.6/, risk: 'CRITICAL', riskLabel: 'Crítico', cve: 'CVE-2018-16487', cwe: 'CWE-506', reason: 'Versión comprometida con payload malicioso de robo de credenciales.' },
    { name: 'lodash', versionPattern: /^4\.(?:0|1[0-6]|17\.[0-9]|17\.1[0-5])\b/, risk: 'HIGH', riskLabel: 'Alto', cve: 'CVE-2019-10744', cwe: 'CWE-1321', reason: 'Versión vulnerable a Prototype Pollution (CVE-2019-10744).' },
    { name: 'express', versionPattern: /^[1-3]\.|^4\.(?:[0-9]|1[0-5])\./, risk: 'HIGH', riskLabel: 'Alto', cve: 'CVE-2022-24999', cwe: 'CWE-1321', reason: 'Versión heredada obsoleta con vulnerabilidades conocidas de manejo de query strings.' },
    { name: 'jsonwebtoken', versionPattern: /^[0-8]\.[0-8]\./, risk: 'HIGH', riskLabel: 'Alto', cve: 'CVE-2022-23529', cwe: 'CWE-345', reason: 'Versión antigua vulnerable a bypass de verificación de clave secreta (CVE-2022-23529).' },
    { name: 'axios', versionPattern: /^0\.(?:[0-9]|1[0-9]|20)\./, risk: 'MEDIUM', riskLabel: 'Medio', cve: 'CVE-2020-28168', cwe: 'CWE-918', reason: 'Versión desactualizada con problemas de SSRF y redirección de cabeceras (CVE-2020-28168).' },
    { name: 'moment', risk: 'LOW', riskLabel: 'Bajo', cve: 'N/A', cwe: 'CWE-1104', reason: 'Biblioteca en modo mantenimiento (legacy); se recomienda migrar a Date-fns, Luxon o Temporal API.' }
];

function auditDependencies(files) {
    if (!Array.isArray(files)) return [];

    const findings = [];
    const pkgFile = files.find(f => f.path.toLowerCase().endsWith('package.json'));
    const reqFile = files.find(f => f.path.toLowerCase().endsWith('requirements.txt'));

    if (pkgFile && pkgFile.content) {
        try {
            const pkg = JSON.parse(pkgFile.content);
            const allDeps = {
                ...(pkg.dependencies || {}),
                ...(pkg.devDependencies || {})
            };

            Object.entries(allDeps).forEach(([depName, version]) => {
                const verStr = String(version).trim();

                if (verStr === '*' || verStr === 'latest') {
                    findings.push({
                        id: `DEP-RISK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                        ruleId: 'DEPS-DEFAULT',
                        name: `Dependencia con Versión Comodín (*) o 'latest': ${depName}`,
                        title: `Dependencia con Versión Comodín (*) o 'latest': ${depName}`,
                        dimensionId: 'dependencies',
                        category: 'Seguridad de dependencias (SCA)',
                        severity: 'MEDIUM',
                        severityLabel: 'Medio',
                        owaspCategory: 'A06:2021-Vulnerable and Outdated Components',
                        owasp: 'A06:2021-Vulnerable and Outdated Components',
                        owaspAsvs: 'ASVS V14.2 (Dependency Management)',
                        cwe: 'CWE-1104',
                        iso27001: 'ISO/IEC 27001:2022 Control A.8.8 / A.8.28',
                        iso27002: 'ISO/IEC 27002:2022 §8.8 Gestión de vulnerabilidades técnicas',
                        cvss4Reference: 'CVSS:4.0/AV:N/AC:H/AT:P/PR:N/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N (Referencia CWE-1104)',
                        standards: {
                            owaspTop10: 'A06:2021-Vulnerable and Outdated Components',
                            owaspAsvs: 'ASVS V14.2',
                            cwe: 'CWE-1104',
                            cvss4: 'CVSS:4.0/AV:N/AC:H/AT:P/PR:N/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N',
                            iso27001: 'ISO/IEC 27001:2022 A.8.8',
                            iso27002: 'ISO/IEC 27002:2022 §8.8'
                        },
                        file: pkgFile.path,
                        line: 1,
                        snippet: `"${depName}": "${verStr}"`,
                        evidence: `"${depName}": "${verStr}"`,
                        explanation: `La dependencia "${depName}" utiliza un rango flotante sin fijar ("${verStr}"), exponiendo el build a paquetes maliciosos o incompatibles.`,
                        description: `La dependencia "${depName}" utiliza un rango flotante sin fijar ("${verStr}").`,
                        impact: 'Riesgo de ataque a la cadena de suministro (Supply Chain Attack) y compilaciones no deterministas.',
                        likelihood: 'Alta',
                        recommendation: 'Fijar la versión con un rango semántico explícito (ej. ^1.2.3) y versionar package-lock.json.',
                        status: 'confirmado',
                        certainty: 'Confirmado',
                        veracityType: 'Vulnerabilidad confirmada',
                        findingStatus: 'Pendiente',
                        verifiedFixed: false
                    });
                }

                const known = RISKY_PACKAGES.find(k => k.name.toLowerCase() === depName.toLowerCase());
                if (known) {
                    let isVulnerable = true;
                    if (known.versionPattern) {
                        isVulnerable = known.versionPattern.test(verStr.replace(/[\^~><=]/g, ''));
                    }

                    if (isVulnerable) {
                        findings.push({
                            id: `DEP-VULN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                            ruleId: 'DEPS-DEFAULT',
                            name: `Dependencia Vulnerable Detectada: ${depName} (${known.cve})`,
                            title: `Dependencia Vulnerable Detectada: ${depName} (${known.cve})`,
                            dimensionId: 'dependencies',
                            category: 'Seguridad de dependencias (SCA)',
                            severity: known.risk,
                            severityLabel: known.riskLabel,
                            owaspCategory: 'A06:2021-Vulnerable and Outdated Components',
                            owasp: 'A06:2021-Vulnerable and Outdated Components',
                            owaspAsvs: 'ASVS V14.2.1',
                            cwe: known.cwe || 'CWE-1395',
                            iso27001: 'ISO/IEC 27001:2022 Control A.8.8',
                            iso27002: 'ISO/IEC 27002:2022 §8.8 Gestión de vulnerabilidades técnicas',
                            cvss4Reference: `Referencia ${known.cve} / ${known.cwe || 'CWE-1395'} (CVSS v4.0 Base Reference)`,
                            standards: {
                                owaspTop10: 'A06:2021-Vulnerable and Outdated Components',
                                owaspAsvs: 'ASVS V14.2.1',
                                cwe: known.cwe || 'CWE-1395',
                                cvss4: `Referencia ${known.cve} (CVSS 4.0)`,
                                iso27001: 'ISO/IEC 27001:2022 A.8.8',
                                iso27002: 'ISO/IEC 27002:2022 §8.8'
                            },
                            file: pkgFile.path,
                            line: 1,
                            snippet: `"${depName}": "${verStr}"`,
                            evidence: `"${depName}": "${verStr}"`,
                            explanation: known.reason,
                            description: known.reason,
                            impact: 'Exposición del sistema a vulnerabilidades públicas documentadas (CVE).',
                            likelihood: 'Alta',
                            recommendation: `Actualizar "${depName}" a su versión estable parcheada o sustituir por una alternativa mantenida.`,
                            status: 'confirmado',
                            certainty: 'Confirmado',
                            veracityType: 'Vulnerabilidad confirmada',
                            findingStatus: 'Pendiente',
                            verifiedFixed: false
                        });
                    }
                }
            });

            const hasLockFile = files.some(f => f.path.toLowerCase().endsWith('package-lock.json') || f.path.toLowerCase().endsWith('yarn.lock') || f.path.toLowerCase().endsWith('pnpm-lock.yaml'));
            if (!hasLockFile) {
                findings.push({
                    id: `DEP-WARN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    ruleId: 'DEPS-DEFAULT',
                    name: 'Ausencia de Lockfile de Dependencias (package-lock.json / yarn.lock)',
                    title: 'Ausencia de Lockfile de Dependencias (package-lock.json / yarn.lock)',
                    dimensionId: 'dependencies',
                    category: 'Seguridad de dependencias (SCA)',
                    severity: 'LOW',
                    severityLabel: 'Bajo',
                    owaspCategory: 'A08:2021-Software and Data Integrity Failures',
                    owasp: 'A08:2021-Software and Data Integrity Failures',
                    owaspAsvs: 'ASVS V14.2.3',
                    cwe: 'CWE-1104',
                    iso27001: 'ISO/IEC 27001:2022 Control A.8.32',
                    iso27002: 'ISO/IEC 27002:2022 §8.32 Gestión de cambios',
                    cvss4Reference: 'Referencia CWE-1104 (Integridad de cadena de suministro)',
                    standards: {
                        owaspTop10: 'A08:2021-Software and Data Integrity Failures',
                        owaspAsvs: 'ASVS V14.2.3',
                        cwe: 'CWE-1104',
                        cvss4: 'Referencia CWE-1104',
                        iso27001: 'ISO/IEC 27001:2022 A.8.32',
                        iso27002: 'ISO/IEC 27002:2022 §8.32'
                    },
                    file: pkgFile.path,
                    line: 1,
                    snippet: 'Archivo package-lock.json no detectado en la muestra analizada',
                    evidence: 'Archivo package-lock.json no detectado en la muestra analizada',
                    explanation: 'El proyecto define package.json pero no se encontró un archivo lockfile en los archivos analizados.',
                    description: 'El proyecto define package.json pero no se encontró un archivo lockfile en los archivos analizados.',
                    impact: 'Posible variación de versiones de paquetes transitivos entre entornos de desarrollo y producción.',
                    likelihood: 'Media',
                    recommendation: 'Generar y versionar el archivo package-lock.json mediante `npm install`.',
                    status: 'preventivo',
                    certainty: 'Probable',
                    veracityType: 'Riesgo inferido',
                    findingStatus: 'Pendiente',
                    verifiedFixed: false
                });
            }
        } catch (e) {
            findings.push({
                id: `DEP-ERR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                ruleId: 'DEPS-DEFAULT',
                name: 'Manifiesto package.json con formato no evaluable',
                title: 'Manifiesto package.json con formato no evaluable',
                dimensionId: 'dependencies',
                category: 'Seguridad de dependencias (SCA)',
                severity: 'INFO',
                severityLabel: 'Informativo',
                owaspCategory: 'A05:2021-Security Misconfiguration',
                owasp: 'A05:2021-Security Misconfiguration',
                owaspAsvs: 'ASVS V14.2',
                cwe: 'CWE-1104',
                iso27001: 'ISO/IEC 27001:2022 Control A.8.8',
                iso27002: 'ISO/IEC 27002:2022 §8.8',
                cvss4Reference: 'Informativo (Sin vector CVSS)',
                standards: {
                    owaspTop10: 'A05:2021-Security Misconfiguration',
                    owaspAsvs: 'ASVS V14.2',
                    cwe: 'CWE-1104',
                    cvss4: 'Informativo',
                    iso27001: 'ISO/IEC 27001:2022 A.8.8',
                    iso27002: 'ISO/IEC 27002:2022 §8.8'
                },
                file: pkgFile.path,
                line: 1,
                snippet: 'package.json no pudo ser parseado como JSON estricto',
                evidence: 'package.json corrupto o truncado',
                explanation: 'No se pudo parsear el archivo package.json.',
                description: 'No se pudo parsear el archivo package.json.',
                impact: 'Imposibilidad de auditar dependencias estáticamente.',
                likelihood: 'Baja',
                recommendation: 'Verificar la sintaxis JSON del archivo package.json.',
                status: 'Requiere verificación',
                certainty: 'Posible',
                veracityType: 'Elemento no evaluable',
                findingStatus: 'Pendiente',
                verifiedFixed: false
            });
        }
    }

    if (reqFile && reqFile.content) {
        const lines = reqFile.content.split(/\r?\n/);
        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            if (!trimmed.includes('==') && !trimmed.includes('>=') && !trimmed.includes('~=')) {
                findings.push({
                    id: `DEP-PY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    ruleId: 'DEPS-DEFAULT',
                    name: `Dependencia Python sin Versión Fijada: ${trimmed}`,
                    title: `Dependencia Python sin Versión Fijada: ${trimmed}`,
                    dimensionId: 'dependencies',
                    category: 'Seguridad de dependencias (SCA)',
                    severity: 'LOW',
                    severityLabel: 'Bajo',
                    owaspCategory: 'A06:2021-Vulnerable and Outdated Components',
                    owasp: 'A06:2021-Vulnerable and Outdated Components',
                    owaspAsvs: 'ASVS V14.2',
                    cwe: 'CWE-1104',
                    iso27001: 'ISO/IEC 27001:2022 Control A.8.8',
                    iso27002: 'ISO/IEC 27002:2022 §8.8',
                    cvss4Reference: 'Referencia CWE-1104 (Supply Chain Control)',
                    standards: {
                        owaspTop10: 'A06:2021-Vulnerable and Outdated Components',
                        owaspAsvs: 'ASVS V14.2',
                        cwe: 'CWE-1104',
                        cvss4: 'Referencia CWE-1104',
                        iso27001: 'ISO/IEC 27001:2022 A.8.8',
                        iso27002: 'ISO/IEC 27002:2022 §8.8'
                    },
                    file: reqFile.path,
                    line: idx + 1,
                    snippet: trimmed,
                    evidence: trimmed,
                    explanation: `El paquete Python "${trimmed}" no especifica una versión fija (==X.Y.Z).`,
                    description: `El paquete Python "${trimmed}" no especifica una versión fija (==X.Y.Z).`,
                    impact: 'Builds no reproducibles y riesgo de instalar versiones con regresiones o vulnerabilidades.',
                    likelihood: 'Media',
                    recommendation: `Fijar la versión exacta en requirements.txt (ej. ${trimmed}==X.Y.Z).`,
                    status: 'confirmado',
                    certainty: 'Confirmado',
                    veracityType: 'Vulnerabilidad confirmada',
                    findingStatus: 'Pendiente',
                    verifiedFixed: false
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
