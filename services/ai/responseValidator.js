/**
 * DOCUMENT-MIND AI — RESPONSE VALIDATOR & QUALITY CONTROL ENGINE
 * Detects truncated LLM responses, automatically repairs partial or broken JSON,
 * validates mandatory schema fields per task, and verifies absence of empty sections.
 */

// Required root keys for each task type to be considered complete
const TASK_SCHEMA_REQUIREMENTS = {
    repoAnalysis: ['systemPurpose', 'architecturalStyle', 'components', 'executionFlow', 'technicalRisks'],
    prd: ['executiveSummary', 'problemStatement', 'objectives', 'functionalRequirements', 'scope'],
    srs: ['introduction', 'generalDescription', 'specificRequirements'],
    architecture: ['architectureOverview', 'layers', 'c4ContainerMermaid'],
    eda: ['isEdaImplemented', 'eventProducers', 'eventConsumers', 'resilience'],
    security: ['executiveSecuritySummary', 'findings'],
    qa: ['testStrategy', 'testCases'],
    openapi: ['openapi', 'info', 'paths']
};

/**
 * Detects if a text string appears to be truncated prematurely.
 * @param {string} text
 * @returns {{ isTruncated: boolean, reason: string|null }}
 */
function detectTruncation(text) {
    if (!text || typeof text !== 'string') {
        return { isTruncated: true, reason: 'Texto vacío o nulo' };
    }

    const trimmed = text.trim();

    // Trailing ellipsis
    if (trimmed.endsWith('...') || trimmed.endsWith('…')) {
        return { isTruncated: true, reason: 'Finaliza con puntos suspensivos' };
    }

    // Trailing unclosed string literal or dangling comma
    if (trimmed.endsWith(',') || trimmed.endsWith(':') || trimmed.endsWith('"')) {
        return { isTruncated: true, reason: 'Finaliza en delimitador incompleto' };
    }

    // Unbalanced brackets
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;

    if (openBraces > closeBraces || openBrackets > closeBrackets) {
        return {
            isTruncated: true,
            reason: `Llaves/corchetes desbalanceados: { ${openBraces} vs ${closeBraces} }, [ ${openBrackets} vs ${closeBrackets} ]`
        };
    }

    return { isTruncated: false, reason: null };
}

/**
 * Attempts to intelligently balance and repair malformed or truncated JSON strings.
 * @param {string} rawText
 * @returns {{ repairedText: string, isRepaired: boolean }}
 */
function repairJson(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return { repairedText: '{}', isRepaired: false };
    }

    let cleaned = rawText.trim();

    // 1. Remove markdown code fences if present (e.g. ```json ... ```)
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // 2. Extract first JSON object if surrounded by preamble/postamble
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    // Quick test if already valid
    try {
        JSON.parse(cleaned);
        return { repairedText: cleaned, isRepaired: false };
    } catch (e) {
        // Continue to repairing strategies
    }

    let isRepaired = false;
    let work = cleaned;

    // 3. Remove trailing commas before closing braces/brackets (common syntax error)
    const withoutTrailingCommas = work.replace(/,\s*([\}\]])/g, '$1');
    if (withoutTrailingCommas !== work) {
        work = withoutTrailingCommas;
        isRepaired = true;
    }

    // 4. Try parsing again
    try {
        JSON.parse(work);
        return { repairedText: work, isRepaired: true };
    } catch (e) {
        // Proceed to bracket balancer
    }

    // 5. Balance unclosed quotes and brackets
    // Close dangling open quote if any
    const quoteCount = (work.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
        work += '"';
        isRepaired = true;
    }

    // Remove any trailing comma or colon right before appending brackets
    work = work.replace(/[:,\s]+$/, '');

    // Count open vs close
    const openBraces = (work.match(/\{/g) || []).length;
    const closeBraces = (work.match(/\}/g) || []).length;
    const openBrackets = (work.match(/\[/g) || []).length;
    const closeBrackets = (work.match(/\]/g) || []).length;

    // Append closing characters in reverse stack order
    for (let i = 0; i < (openBrackets - closeBrackets); i++) {
        work += ']';
        isRepaired = true;
    }
    for (let i = 0; i < (openBraces - closeBraces); i++) {
        work += '}';
        isRepaired = true;
    }

    try {
        JSON.parse(work);
        return { repairedText: work, isRepaired: true };
    } catch (finalErr) {
        return { repairedText: rawText, isRepaired: false };
    }
}

/**
 * Validates the parsed response against task-specific schema requirements.
 * @param {string} taskType
 * @param {string} rawResponseText
 * @returns {{ isValid: boolean, data: object|null, isRepaired: boolean, isTruncated: boolean, errors: string[], warnings: string[] }}
 */
function validateResponse(taskType, rawResponseText) {
    const errors = [];
    const warnings = [];

    const truncationInfo = detectTruncation(rawResponseText);
    if (truncationInfo.isTruncated) {
        warnings.push(`Posible respuesta truncada detectada: ${truncationInfo.reason}`);
    }

    // Try repairing JSON
    const { repairedText, isRepaired } = repairJson(rawResponseText);
    if (isRepaired) {
        warnings.push('La respuesta requirió reparación automática de formato JSON.');
    }

    let parsedData = null;
    try {
        parsedData = JSON.parse(repairedText);
    } catch (parseErr) {
        errors.push(`Error irrecuperable de sintaxis JSON: ${parseErr.message}`);
        return {
            isValid: false,
            data: null,
            isRepaired,
            isTruncated: truncationInfo.isTruncated,
            errors,
            warnings
        };
    }

    // Verify root object
    if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
        errors.push('La respuesta validada debe ser un objeto JSON estructurado.');
        return {
            isValid: false,
            data: null,
            isRepaired,
            isTruncated: truncationInfo.isTruncated,
            errors,
            warnings
        };
    }

    // Check mandatory schema fields
    const requiredKeys = TASK_SCHEMA_REQUIREMENTS[taskType] || [];
    const missingKeys = [];

    requiredKeys.forEach(key => {
        if (parsedData[key] === undefined || parsedData[key] === null) {
            missingKeys.push(key);
        } else if (typeof parsedData[key] === 'string' && parsedData[key].trim() === '') {
            missingKeys.push(`${key} (campo de texto vacío)`);
        } else if (Array.isArray(parsedData[key]) && parsedData[key].length === 0) {
            warnings.push(`El array '${key}' está presente pero sin elementos.`);
        }
    });

    if (missingKeys.length > 0) {
        errors.push(`Faltan campos obligatorios para la tarea '${taskType}': ${missingKeys.join(', ')}`);
    }

    const isValid = errors.length === 0;

    return {
        isValid,
        data: parsedData,
        isRepaired,
        isTruncated: truncationInfo.isTruncated,
        errors,
        warnings
    };
}

module.exports = {
    TASK_SCHEMA_REQUIREMENTS,
    detectTruncation,
    repairJson,
    validateResponse
};
