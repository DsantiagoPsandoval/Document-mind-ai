/**
 * DOCUMIND AI — SECURITY RUN COMPARATOR & HISTORICAL DIFF
 * Compares two security audit runs to measure trend, score delta,
 * new vulnerabilities, resolved & verified vulnerabilities, persisting findings,
 * increased risks, and implemented improvements.
 */

const SEVERITY_RANK = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    INFO: 1
};

function getFindingSignature(f) {
    if (!f) return '';
    const rule = f.ruleId || f.name || f.type || '';
    const file = f.file || '';
    const line = f.line || 0;
    return `${rule}::${file}::${line}`;
}

function getBroadFindingSignature(f) {
    if (!f) return '';
    const rule = f.ruleId || f.name || f.type || '';
    const file = f.file || '';
    return `${rule}::${file}`;
}

function compareSecurityRuns(previousRun, currentRun) {
    if (!previousRun || typeof previousRun.score !== 'number') {
        return {
            hasPrevious: false,
            previousScore: null,
            currentScore: currentRun?.score || 0,
            scoreDelta: 0,
            trend: 'Línea base inicial',
            trendClass: 'neutral',
            summary: 'Primera auditoría registrada en el historial de este repositorio.',
            newFindings: [],
            resolvedFindings: [],
            persistingFindings: currentRun?.findings || [],
            increasedRisks: [],
            implementedImprovements: [
                'Establecimiento de línea base de auditoría SAST, Secret Scanner y modelo STRIDE.'
            ],
            resolvedCount: 0,
            newCount: 0,
            persistingCount: (currentRun?.findings || []).length,
            increasedRisksCount: 0
        };
    }

    const prevScore = previousRun.score;
    const currScore = typeof currentRun?.score === 'number' ? currentRun.score : 0;
    const scoreDelta = currScore - prevScore;

    const prevFindings = previousRun.findings || [];
    const currFindings = currentRun?.findings || [];

    const prevMap = new Map();
    const prevBroadMap = new Map();
    prevFindings.forEach(f => {
        prevMap.set(getFindingSignature(f), f);
        prevBroadMap.set(getBroadFindingSignature(f), f);
    });

    const currMap = new Map();
    const currBroadMap = new Map();
    currFindings.forEach(f => {
        currMap.set(getFindingSignature(f), f);
        currBroadMap.set(getBroadFindingSignature(f), f);
    });

    const newFindings = [];
    const persistingFindings = [];
    const resolvedFindings = [];
    const increasedRisks = [];
    const implementedImprovements = [];

    currFindings.forEach(f => {
        const sig = getFindingSignature(f);
        const broadSig = getBroadFindingSignature(f);
        if (prevMap.has(sig) || prevBroadMap.has(broadSig)) {
            const prevF = prevMap.get(sig) || prevBroadMap.get(broadSig);
            persistingFindings.push(f);
            const prevRank = SEVERITY_RANK[(prevF.severity || 'INFO').toUpperCase()] || 1;
            const currRank = SEVERITY_RANK[(f.severity || 'INFO').toUpperCase()] || 1;
            if (currRank > prevRank) {
                increasedRisks.push({
                    ...f,
                    previousSeverity: prevF.severity,
                    currentSeverity: f.severity,
                    reason: `Severidad incrementada de ${prevF.severity} a ${f.severity} en ${f.file}`
                });
            }
        } else {
            newFindings.push(f);
            if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
                increasedRisks.push({
                    ...f,
                    reason: `Nueva vulnerabilidad de severidad ${f.severityLabel || f.severity} introducida en ${f.file}:${f.line}`
                });
            }
        }
    });

    prevFindings.forEach(f => {
        const sig = getFindingSignature(f);
        const broadSig = getBroadFindingSignature(f);
        if (!currMap.has(sig) && !currBroadMap.has(broadSig)) {
            resolvedFindings.push({
                ...f,
                findingStatus: 'Solucionado',
                verifiedFixed: true,
                resolutionNote: 'Corregida y verificada mediante re-análisis del código fuente.'
            });
            implementedImprovements.push(
                `Mitigación verificada de "${f.name || f.title}" en \`${f.file}:${f.line}\` (${f.severity}).`
            );
        }
    });

    if (scoreDelta > 0) {
        implementedImprovements.unshift(`Incremento del índice de seguridad general en +${scoreDelta} puntos (${prevScore} → ${currScore}/100).`);
    }
    if (implementedImprovements.length === 0 && resolvedFindings.length === 0) {
        implementedImprovements.push('Sin nuevas mitigaciones verificadas respecto a la ejecución inmediatamente anterior.');
    }

    let trend = 'Estable (Sin variación de puntaje)';
    let trendClass = 'neutral';

    if (scoreDelta > 0) {
        trend = 'Evolución Positiva (Mejora de Seguridad)';
        trendClass = 'positive';
    } else if (scoreDelta < 0) {
        trend = 'Regresión (Aumento de Riesgo)';
        trendClass = 'negative';
    }

    const summary = `Variación de puntaje: ${scoreDelta >= 0 ? '+' : ''}${scoreDelta} pts (${prevScore}/100 → ${currScore}/100). ` +
        `Corregidas y verificadas: ${resolvedFindings.length} | ` +
        `Nuevas: ${newFindings.length} | ` +
        `Persistentes: ${persistingFindings.length} | ` +
        `Riesgos en aumento: ${increasedRisks.length}.`;

    return {
        hasPrevious: true,
        previousScore: prevScore,
        currentScore: currScore,
        scoreDelta,
        trend,
        trendClass,
        summary,
        newFindings,
        resolvedFindings,
        persistingFindings,
        increasedRisks,
        implementedImprovements,
        resolvedCount: resolvedFindings.length,
        newCount: newFindings.length,
        persistingCount: persistingFindings.length,
        increasedRisksCount: increasedRisks.length
    };
}

module.exports = {
    compareSecurityRuns,
    getFindingSignature
};
