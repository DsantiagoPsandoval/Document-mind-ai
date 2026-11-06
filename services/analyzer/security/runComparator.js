/**
 * DOCUMENT-MIND AI — SECURITY RUN COMPARATOR & HISTORICAL DIFF
 * Compares two security audit runs to measure trend, score delta, resolved vulnerabilities,
 * and newly introduced risks.
 */

/**
 * Generates a stable signature for a finding to match across runs.
 */
function getFindingSignature(f) {
    if (!f) return '';
    const rule = f.ruleId || f.name || f.type || '';
    const file = f.file || '';
    const line = f.line || 0;
    return `${rule}::${file}::${line}`;
}

/**
 * Compares a previous security analysis result with the current result.
 * @param {object} previousRun - Previous security audit result
 * @param {object} currentRun - Current security audit result
 * @returns {object} Detailed comparison metrics
 */
function compareSecurityRuns(previousRun, currentRun) {
    if (!previousRun || typeof previousRun.score !== 'number') {
        return {
            hasPrevious: false,
            scoreDelta: 0,
            trend: 'Primera evaluación',
            trendClass: 'neutral',
            summary: 'Primera auditoría registrada para este repositorio.',
            newFindings: [],
            resolvedFindings: [],
            persistingFindings: currentRun?.findings || []
        };
    }

    const prevScore = previousRun.score;
    const currScore = currentRun.score || 0;
    const scoreDelta = currScore - prevScore;

    const prevFindings = previousRun.findings || [];
    const currFindings = currentRun.findings || [];

    const prevMap = new Map();
    prevFindings.forEach(f => {
        prevMap.set(getFindingSignature(f), f);
    });

    const currMap = new Map();
    currFindings.forEach(f => {
        currMap.set(getFindingSignature(f), f);
    });

    const newFindings = [];
    const persistingFindings = [];
    const resolvedFindings = [];

    currFindings.forEach(f => {
        const sig = getFindingSignature(f);
        if (prevMap.has(sig)) {
            persistingFindings.push(f);
        } else {
            newFindings.push(f);
        }
    });

    prevFindings.forEach(f => {
        const sig = getFindingSignature(f);
        if (!currMap.has(sig)) {
            resolvedFindings.push(f);
        }
    });

    let trend = 'Sin cambios';
    let trendClass = 'neutral';

    if (scoreDelta > 0) {
        trend = 'Mejora de seguridad';
        trendClass = 'positive';
    } else if (scoreDelta < 0) {
        trend = 'Degradación de seguridad';
        trendClass = 'negative';
    }

    const summary = `${scoreDelta >= 0 ? '+' : ''}${scoreDelta} pts (${prevScore} → ${currScore}). ` +
        `${resolvedFindings.length} vulnerabilidad(es) resuelta(s), ` +
        `${newFindings.length} nueva(s) detectada(s), ` +
        `${persistingFindings.length} persistente(s).`;

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
        resolvedCount: resolvedFindings.length,
        newCount: newFindings.length,
        persistingCount: persistingFindings.length
    };
}

module.exports = {
    compareSecurityRuns,
    getFindingSignature
};
