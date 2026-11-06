/**
 * DOCUMENT-MIND AI — UNIT TESTS FOR SECURITY INTELLIGENCE ENGINE
 */

const assert = require('assert');
const { runSecurityAnalysis, compareSecurityRuns, SECURITY_DIMENSIONS } = require('../services/analyzer/securityAnalyzer');
const { calculateSecurityScore, getClassification, calculateCoverage } = require('../services/analyzer/security/scoreCalculator');
const { analyzeStaticRules } = require('../services/analyzer/security/staticRules');
const { scanProjectSecrets } = require('../services/analyzer/security/secretScanner');
const { auditDependencies } = require('../services/analyzer/security/dependencyAuditor');
const { buildRemediationPlan } = require('../services/analyzer/security/remediationPlanner');

console.log('🧪 Starting Security Intelligence Engine Test Suite...\n');

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

async function itAsync(name, fn) {
    try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(err);
        process.exit(1);
    }
}

// 1. Verify 12 Dimensions & Weights
it('Should have exactly 12 security dimensions with weights summing to 1.00 (100%)', () => {
    assert.strictEqual(SECURITY_DIMENSIONS.length, 12, 'Must have 12 dimensions');
    const totalWeight = SECURITY_DIMENSIONS.reduce((sum, d) => sum + d.weight, 0);
    assert.strictEqual(Math.round(totalWeight * 100) / 100, 1.0, 'Weights must sum to 1.00');
});

// 2. Clean Project Score
it('Clean project without findings should achieve 100 score and "Excelente"', () => {
    const scoreData = calculateSecurityScore([], { filesAnalyzed: 10, totalFiles: 10 });
    assert.strictEqual(scoreData.score, 100);
    assert.strictEqual(scoreData.classification, 'Excelente');
    assert.strictEqual(scoreData.grade, 'A+');
    assert.strictEqual(scoreData.coverage.coveragePct, 100);
    assert.strictEqual(scoreData.coverage.confidenceLevel, 'Alta');
});

// 3. Critical Severity Strict Capping Rule
it('CRITICAL vulnerability must strictly cap final score at maximum 49 ("Riesgo alto")', () => {
    const criticalFinding = {
        id: 'SEC-1',
        name: 'Exposed OpenAI Key',
        dimensionId: 'secretsManagement',
        severity: 'CRITICAL',
        file: 'config.js',
        line: 12
    };
    const scoreData = calculateSecurityScore([criticalFinding], { filesAnalyzed: 5, totalFiles: 5 });
    // 100 - 25 = 75, but because criticalCount > 0, it must be capped at <= 49
    assert.strictEqual(scoreData.isCappedByCritical, true);
    assert.strictEqual(scoreData.score, 49);
    assert.strictEqual(scoreData.classification, 'Riesgo alto');
    assert.ok(scoreData.explanation.includes('acotada estrictamente a 49/100'));
});

// 4. Coverage and Confidence Levels
it('Coverage calculates properly for partial scopes', () => {
    const covHigh = calculateCoverage({ filesAnalyzed: 9, totalFiles: 10 });
    assert.strictEqual(covHigh.coveragePct, 90);
    assert.strictEqual(covHigh.confidenceLevel, 'Alta');

    const covMed = calculateCoverage({ filesAnalyzed: 6, totalFiles: 10 });
    assert.strictEqual(covMed.coveragePct, 60);
    assert.strictEqual(covMed.confidenceLevel, 'Media');

    const covLow = calculateCoverage({ filesAnalyzed: 3, totalFiles: 10 });
    assert.strictEqual(covLow.coveragePct, 30);
    assert.strictEqual(covLow.confidenceLevel, 'Básica');
});

// 5. SAST Rules Detection
it('Detects SQL Injection via string interpolation', () => {
    const file = {
        path: 'src/users.js',
        content: `const q = "SELECT * FROM users WHERE id = " + req.query.id; const r = await db.query(q);`
    };
    const findings = analyzeStaticRules([file]);
    const sqli = findings.find(f => f.ruleId === 'SAST-SQLI-001');
    assert.ok(sqli, 'Should detect SQL injection');
    assert.strictEqual(sqli.severity, 'CRITICAL');
    assert.strictEqual(sqli.dimensionId, 'injectionProtection');
});

it('Detects XSS via innerHTML assignment', () => {
    const file = {
        path: 'src/dom.js',
        content: `document.getElementById('content').innerHTML = dynamicUserContent;`
    };
    const findings = analyzeStaticRules([file]);
    const xss = findings.find(f => f.ruleId === 'SAST-XSS-001');
    assert.ok(xss, 'Should detect DOM XSS');
    assert.strictEqual(xss.severity, 'HIGH');
    assert.strictEqual(xss.dimensionId, 'injectionProtection');
});

it('Detects Stack Trace leak in Express error handler', () => {
    const file = {
        path: 'src/server.js',
        content: `app.use((err, req, res, next) => { res.status(500).send(err.stack); });`
    };
    const findings = analyzeStaticRules([file]);
    const leak = findings.find(f => f.ruleId === 'SAST-LEAK-001');
    assert.ok(leak, 'Should detect error stack trace leak');
    assert.strictEqual(leak.dimensionId, 'errorHandling');
});

it('Detects Insecure CORS wildcard', () => {
    const file = {
        path: 'src/app.js',
        content: `app.use(cors());`
    };
    const findings = analyzeStaticRules([file]);
    const cors = findings.find(f => f.ruleId === 'SAST-CORS-001');
    assert.ok(cors, 'Should detect open CORS');
    assert.strictEqual(cors.dimensionId, 'apiSecurity');
});

it('Detects JWT decode without verify', () => {
    const file = {
        path: 'src/auth.js',
        content: `const payload = jwt.decode(token); req.user = payload;`
    };
    const findings = analyzeStaticRules([file]);
    const jwt = findings.find(f => f.ruleId === 'SAST-JWT-001');
    assert.ok(jwt, 'Should detect unverified JWT decoding');
    assert.strictEqual(jwt.dimensionId, 'authentication');
});

// 6. Secret Scanner Redaction
it('Detects and masks OpenAI secret keys without exposing the raw secret', () => {
    const rawSecret = 'sk-1234567890abcdef1234567890abcdef';
    const file = {
        path: 'config.env',
        content: `OPENAI_KEY=${rawSecret}`
    };
    const secrets = scanProjectSecrets([file]);
    assert.strictEqual(secrets.length, 1);
    assert.strictEqual(secrets[0].severity, 'CRITICAL');
    assert.strictEqual(secrets[0].dimensionId, 'secretsManagement');
    assert.ok(!secrets[0].maskedSecret.includes(rawSecret), 'Raw secret must not be exposed');
    assert.ok(secrets[0].maskedSecret.includes('****'));
});

// 7. Remediation Planner
it('Remediation Planner groups fixes into 4 execution queues', () => {
    const findings = [
        { id: '1', ruleId: 'SAST-SQLI-001', severity: 'CRITICAL', file: 'db.js', dimensionId: 'injectionProtection' },
        { id: '2', ruleId: 'SAST-XSS-001', severity: 'HIGH', file: 'view.js', dimensionId: 'injectionProtection' },
        { id: '3', ruleId: 'SAST-LEAK-001', severity: 'MEDIUM', file: 'server.js', dimensionId: 'errorHandling' },
        { id: '4', ruleId: 'SAST-CORS-001', severity: 'LOW', file: 'server.js', dimensionId: 'apiSecurity' }
    ];
    const plan = buildRemediationPlan(findings);
    assert.strictEqual(plan.summary.inmediata, 1);
    assert.strictEqual(plan.summary.alta, 1);
    assert.strictEqual(plan.summary.media, 1);
    assert.strictEqual(plan.summary.baja, 1);
    assert.ok(plan.queues.inmediata[0].codeExample.remediated.includes('SELECT * FROM users WHERE email = $1'));
});

// 8. Run Comparison
it('Compares historical runs and calculates score delta and status', () => {
    const run1 = {
        score: 60,
        findings: [
            { ruleId: 'SAST-SQLI-001', file: 'db.js', line: 10 },
            { ruleId: 'SAST-XSS-001', file: 'ui.js', line: 20 }
        ]
    };
    const run2 = {
        score: 85,
        findings: [
            { ruleId: 'SAST-XSS-001', file: 'ui.js', line: 20 }
        ]
    };
    const comp = compareSecurityRuns(run1, run2);
    assert.strictEqual(comp.scoreDelta, 25);
    assert.strictEqual(comp.trend, 'Mejora de seguridad');
    assert.strictEqual(comp.resolvedCount, 1);
    assert.strictEqual(comp.newCount, 0);
    assert.strictEqual(comp.persistingCount, 1);
});

// 9. Full End-to-End Orchestrator Integration
(async () => {
    await itAsync('Full runSecurityAnalysis generates all 12 dimensions, reports, and plans', async () => {
        const mockProject = {
            projectName: 'TestApp',
            prioritizedFiles: [
                {
                    path: 'server.js',
                    content: `
                        const express = require('express');
                        const cors = require('cors');
                        const app = express();
                        app.use(cors());
                        app.get('/users', async (req, res) => {
                            const query = "SELECT * FROM users WHERE name = " + req.query.name;
                            res.send(query);
                        });
                    `
                },
                {
                    path: 'package.json',
                    content: JSON.stringify({
                        name: 'test-app',
                        dependencies: {
                            'express': '4.18.2',
                            'lodash': '*'
                        }
                    })
                }
            ],
            stats: { filesAnalyzed: 2, totalFiles: 2 }
        };

        const audit = await runSecurityAnalysis(mockProject);
        assert.ok(audit.score <= 49, 'Should be capped at <= 49 due to SQLI critical finding');
        assert.strictEqual(audit.classification, 'Riesgo alto');
        assert.strictEqual(Object.keys(audit.dimensions).length, 12, 'Must have 12 dimension scores');
        assert.ok(audit.remediationPlan.queues.inmediata.length > 0, 'Must have immediate remediation items');
        assert.ok(audit.markdownReport.includes('DocuMind Security Intelligence'), 'Markdown report must include branding');
        assert.ok(audit.jsonReport.metadata.version, 'JSON report must be structured');
    });

    console.log(`\n🎉 All ${passedTests + 1} Security Engine tests passed successfully!`);
})();
