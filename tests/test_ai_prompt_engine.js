/**
 * DOCUMENT-MIND AI — UNIT & INTEGRATION TESTS FOR SPECIALIZED PROMPT ENGINE
 */

const assert = require('assert');
const { estimateTokens, getFilePriority, packFilesForContext, checkBudget, TOKEN_LIMITS } = require('../services/ai/tokenManager');
const { buildSpecializedPrompt, SYSTEM_ROLES } = require('../services/ai/promptEngine');
const { detectTruncation, repairJson, validateResponse } = require('../services/ai/responseValidator');
const { getAiDiagnostics, computeCacheKey, getModelName } = require('../services/ai/geminiClient');

console.log('🧪 Starting Specialized AI Prompt Engine & Token Manager Test Suite...\n');

let passedTests = 0;

function it(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(err);
        process.exit(1);
    }
}

// ============================================================
// 1. TOKEN MANAGER TESTS
// ============================================================

it('Token estimation correctly computes token ratio (~4 chars per token)', () => {
    const text100Chars = 'a'.repeat(100);
    const tokens = estimateTokens(text100Chars);
    assert.strictEqual(tokens, 25);
    assert.strictEqual(estimateTokens(''), 0);
    assert.strictEqual(estimateTokens(null), 0);
});

it('File priority assigns higher weights to manifests and entrypoints over assets/tests', () => {
    const pkg = getFilePriority('package.json');
    const server = getFilePriority('src/server.js');
    const model = getFilePriority('src/models/User.js');
    const testFile = getFilePriority('tests/unit.test.js');
    const cssFile = getFilePriority('public/styles.css');

    assert.ok(pkg.score > server.score, 'package.json must rank higher than server.js');
    assert.ok(server.score > model.score, 'server.js must rank higher than User.js');
    assert.ok(model.score > testFile.score, 'User.js must rank higher than test.js');
    assert.ok(testFile.score > cssFile.score, 'test.js must rank higher than styles.css');
});

it('packFilesForContext packs high-priority files first and honors budget cap', () => {
    const mockFiles = [
        { path: 'public/app.css', content: 'body { margin: 0; }' },
        { path: 'package.json', content: '{"name": "demo", "dependencies": {"express": "^4.18.2"}}' },
        { path: 'server.js', content: 'const express = require("express"); const app = express();' },
        { path: 'tests/app.test.js', content: 'test("sample", () => {});' }
    ];

    const result = packFilesForContext(mockFiles, 500);
    assert.ok(result.packedFiles.length >= 2, 'Should pack top priority files');
    assert.strictEqual(result.packedFiles[0].path, 'package.json', 'package.json must be first');
    assert.strictEqual(result.packedFiles[1].path, 'server.js', 'server.js must be second');
    assert.ok(result.totalTokens <= 500, 'Total tokens must be within 500 limit');
});

it('checkBudget detects if a prompt is within or exceeds limit', () => {
    const smallText = 'Hello world';
    const budgetCheck = checkBudget(smallText, 100);
    assert.strictEqual(budgetCheck.isWithinLimit, true);
    assert.ok(budgetCheck.availableTokens > 0);

    const largeText = 'x'.repeat(1000);
    const overflowCheck = checkBudget(largeText, 50);
    assert.strictEqual(overflowCheck.isWithinLimit, false);
});

// ============================================================
// 2. PROMPT ENGINE TESTS
// ============================================================

it('Prompt Engine builds distinct system instructions for all 8 specialized tasks', () => {
    const tasks = ['repoAnalysis', 'prd', 'srs', 'architecture', 'eda', 'security', 'qa', 'openapi'];
    const seenPrompts = new Set();

    tasks.forEach(task => {
        const pkg = buildSpecializedPrompt(task, { projectName: 'DemoApp' });
        assert.ok(pkg.systemInstruction.length > 50, `System instruction for ${task} must be substantive`);
        assert.ok(!seenPrompts.has(pkg.systemInstruction), `System instruction for ${task} must be unique`);
        seenPrompts.add(pkg.systemInstruction);
    });
});

it('Prompt Engine enforces anti-prompt injection tags <untrusted_source_code>', () => {
    const context = {
        projectName: 'BankApp',
        keyFiles: [
            { path: 'auth.js', content: 'function login() { return true; }' }
        ]
    };
    const pkg = buildSpecializedPrompt('repoAnalysis', context);
    assert.ok(pkg.promptText.includes('<untrusted_source_code>'), 'Must enclose source code in untrusted tags');
    assert.ok(pkg.promptText.includes('</untrusted_source_code>'), 'Must close untrusted tags');
    assert.ok(pkg.promptText.includes('[EVIDENCIA COMPROBADA: auth.js'), 'Must label verified evidence');
});

it('Prompt Engine redacts hardcoded secrets in source files before generating prompt', () => {
    const rawSecret = 'sk-1234567890abcdef1234567890abcdef';
    const context = {
        projectName: 'SecretApp',
        keyFiles: [
            { path: '.env', content: `OPENAI_API_KEY=${rawSecret}` }
        ]
    };
    const pkg = buildSpecializedPrompt('security', context);
    assert.ok(!pkg.promptText.includes(rawSecret), 'Raw secret must never appear in generated prompt');
    assert.ok(pkg.promptText.includes('****'), 'Secret must be masked');
});

it('Prompt Engine configures 12 mandatory axes for repoAnalysis', () => {
    const pkg = buildSpecializedPrompt('repoAnalysis', { projectName: 'TestProject' });
    assert.ok(pkg.promptText.includes('Propósito real'), 'Must include Axis 1: Propósito');
    assert.ok(pkg.promptText.includes('Arquitectura existente'), 'Must include Axis 2: Arquitectura');
    assert.ok(pkg.promptText.includes('Patrones de diseño detectados'), 'Must include Axis 8: Patrones');
    assert.ok(pkg.promptText.includes('Riesgos técnicos'), 'Must include Axis 10: Riesgos técnicos');
    assert.ok(pkg.promptText.includes('Deuda técnica'), 'Must include Axis 11: Deuda técnica');
});

it('Prompt Engine generates strict IEEE 830 instructions for SRS task', () => {
    const pkg = buildSpecializedPrompt('srs', { projectName: 'SrsDemo' });
    assert.ok(pkg.promptText.includes('IEEE 830'), 'Must reference IEEE 830 standard');
    assert.ok(pkg.promptText.includes('evidenceSource'), 'Must require evidence source in schema');
    assert.ok(pkg.promptText.includes('verificationMethod'), 'Must require verification method in schema');
});

it('Prompt Engine distinguishes implemented vs recommended in EDA task', () => {
    const pkg = buildSpecializedPrompt('eda', { projectName: 'EdaDemo' });
    assert.ok(pkg.promptText.includes('isEdaImplemented'), 'Must ask if EDA is implemented');
    assert.ok(pkg.promptText.includes('eventContracts'), 'Must request event contracts');
    assert.ok(pkg.promptText.includes('resilience'), 'Must evaluate retries/DLQ');
});

// ============================================================
// 3. RESPONSE VALIDATOR & REPAIR TESTS
// ============================================================

it('detectTruncation flags unclosed brackets and trailing ellipses', () => {
    assert.strictEqual(detectTruncation('{"name": "demo", "items": [1, 2').isTruncated, true);
    assert.strictEqual(detectTruncation('{"summary": "incomplete...').isTruncated, true);
    assert.strictEqual(detectTruncation('{"summary": "complete and valid"}').isTruncated, false);
});

it('repairJson cleans markdown code fences and balances unclosed brackets', () => {
    const fencedJson = '```json\n{"status": "ok", "count": 10}\n```';
    const rep1 = repairJson(fencedJson);
    assert.strictEqual(JSON.parse(rep1.repairedText).status, 'ok');

    const unclosedJson = '{"title": "PRD", "items": ["feature 1", "feature 2"';
    const rep2 = repairJson(unclosedJson);
    const parsed = JSON.parse(rep2.repairedText);
    assert.strictEqual(parsed.title, 'PRD');
    assert.strictEqual(parsed.items.length, 2);
    assert.strictEqual(rep2.isRepaired, true);

    const trailingCommaJson = '{"id": "001", "name": "Test",}';
    const rep3 = repairJson(trailingCommaJson);
    assert.strictEqual(JSON.parse(rep3.repairedText).id, '001');
});

it('validateResponse checks required schema keys per task', () => {
    const validRepoData = JSON.stringify({
        systemPurpose: 'Procesador de pagos',
        architecturalStyle: 'Microservicios',
        components: [{ name: 'Auth' }],
        executionFlow: 'HTTP -> Router -> DB',
        technicalRisks: ['Latencia externa']
    });
    const validRes = validateResponse('repoAnalysis', validRepoData);
    assert.strictEqual(validRes.isValid, true);
    assert.strictEqual(validRes.errors.length, 0);

    const invalidRepoData = JSON.stringify({
        systemPurpose: 'Incompleto'
    });
    const invalidRes = validateResponse('repoAnalysis', invalidRepoData);
    assert.strictEqual(invalidRes.isValid, false);
    assert.ok(invalidRes.errors[0].includes('Faltan campos obligatorios'));
});

// ============================================================
// 4. GEMINI CLIENT & TELEMETRY TESTS
// ============================================================

it('computeCacheKey produces deterministic SHA-256 hash', () => {
    const key1 = computeCacheKey('gemini-2.5-flash', 'prd', 'prompt text 1');
    const key2 = computeCacheKey('gemini-2.5-flash', 'prd', 'prompt text 1');
    const key3 = computeCacheKey('gemini-2.5-flash', 'prd', 'prompt text 2');
    assert.strictEqual(key1, key2);
    assert.notStrictEqual(key1, key3);
});

it('getAiDiagnostics reports operational metrics without leaking secrets', () => {
    const diag = getAiDiagnostics();
    assert.ok(typeof diag.modelConfigured === 'string');
    assert.ok(typeof diag.isApiKeyPresent === 'boolean');
    assert.ok(typeof diag.totalTrackedCalls === 'number');
    assert.ok(Array.isArray(diag.recentCalls));
    // Verify no secret leak in telemetry output
    const jsonStr = JSON.stringify(diag);
    assert.ok(!jsonStr.includes('AIza'), 'Telemetry must never leak API keys');
});

it('getModelName honors GEMINI_MODEL and AI_MODEL environment variables', () => {
    const originalGemini = process.env.GEMINI_MODEL;
    const originalAi = process.env.AI_MODEL;

    delete process.env.GEMINI_MODEL;
    process.env.AI_MODEL = 'test-model-custom';
    assert.strictEqual(getModelName(), 'test-model-custom');

    process.env.GEMINI_MODEL = 'gemini-custom-override';
    assert.strictEqual(getModelName(), 'gemini-custom-override');

    // Restore
    if (originalGemini) process.env.GEMINI_MODEL = originalGemini; else delete process.env.GEMINI_MODEL;
    if (originalAi) process.env.AI_MODEL = originalAi; else delete process.env.AI_MODEL;
});

console.log(`\n🎉 All ${passedTests} Specialized Prompt Engine & Token Manager tests passed successfully!`);
