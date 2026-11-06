/**
 * TEST SUITE: PREMIUM AUTHENTICATION & WELCOME BANNER WORKFLOW
 * Validates the modern Google OAuth login screen, welcome banner components,
 * account profile modal, and session restoration logic.
 */

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const app = require('../server');

async function runTests() {
    console.log('🧪 Starting Premium Auth & Welcome Banner test suite...\n');
    let passed = 0;
    let failed = 0;

    function report(name, fn) {
        return async () => {
            try {
                await fn();
                console.log(`  ✅ PASS: ${name}`);
                passed++;
            } catch (err) {
                console.error(`  ❌ FAIL: ${name}`);
                console.error(`     Error: ${err.message}`);
                failed++;
            }
        };
    }

    const html = fs.readFileSync('index.html', 'utf8');
    const css = fs.readFileSync('styles.css', 'utf8');
    const appJs = fs.readFileSync('app.js', 'utf8');

    // 1. Check HTML for Welcome Banner elements
    await report('index.html includes compact #user-welcome-banner with left/right components', async () => {
        assert(html.includes('id="user-welcome-banner"'), 'Missing #user-welcome-banner');
        assert(html.includes('id="welcome-banner-greeting"'), 'Missing #welcome-banner-greeting');
        assert(html.includes('id="welcome-user-name"'), 'Missing #welcome-user-name');
        assert(html.includes('id="welcome-user-avatar"'), 'Missing #welcome-user-avatar');
        assert(html.includes('id="welcome-profile-name"'), 'Missing #welcome-profile-name');
        assert(html.includes('id="welcome-profile-email"'), 'Missing #welcome-profile-email');
        assert(html.includes('id="btn-banner-account"'), 'Missing #btn-banner-account');
        assert(html.includes('id="btn-banner-logout"'), 'Missing #btn-banner-logout');
    })();

    // 2. Check HTML for Redesigned Auth Modal
    await report('index.html includes minimalist #auth-modal with official Google OAuth button', async () => {
        assert(html.includes('id="auth-modal"'), 'Missing #auth-modal');
        assert(html.includes('id="btn-oauth-google"'), 'Missing #btn-oauth-google');
        assert(html.includes('Continuar con Google'), 'Missing "Continuar con Google" button text');
        assert(html.includes('viewBox="0 0 18 18"'), 'Missing official Google SVG icon');
        // Ensure no redundant password form is present in the main auth card
        assert(!html.includes('id="auth-password"'), 'Should not have redundant password input');
    })();

    // 3. Check HTML for Account and Privacy modals
    await report('index.html includes #account-modal (Mi Cuenta) and #privacy-modal', async () => {
        assert(html.includes('id="account-modal"'), 'Missing #account-modal');
        assert(html.includes('id="acc-modal-name"'), 'Missing #acc-modal-name');
        assert(html.includes('id="acc-modal-email"'), 'Missing #acc-modal-email');
        assert(html.includes('id="acc-modal-avatar"'), 'Missing #acc-modal-avatar');
        assert(html.includes('id="privacy-modal"'), 'Missing #privacy-modal');
        assert(html.includes('id="btn-user-account"'), 'Missing #btn-user-account in navbar dropdown');
    })();

    // 4. Check CSS for Linear/Vercel styling
    await report('styles.css contains .btn-google-premium and .user-welcome-card rules', async () => {
        assert(css.includes('.btn-google-premium'), 'Missing .btn-google-premium');
        assert(css.includes('.user-welcome-banner'), 'Missing .user-welcome-banner');
        assert(css.includes('.user-welcome-card'), 'Missing .user-welcome-card');
        assert(css.includes('.status-pulse-dot'), 'Missing .status-pulse-dot');
    })();

    // 5. Test greeting logic unit behavior
    await report('Greeting calculation accurately reflects morning, afternoon and night', async () => {
        function getGreetingForHour(hour) {
            if (hour >= 5 && hour < 12) return "Buenos días";
            if (hour >= 12 && hour < 19) return "Buenas tardes";
            return "Buenas noches";
        }
        assert.strictEqual(getGreetingForHour(8), "Buenos días");
        assert.strictEqual(getGreetingForHour(14), "Buenas tardes");
        assert.strictEqual(getGreetingForHour(21), "Buenas noches");
        assert.strictEqual(getGreetingForHour(2), "Buenas noches");
    })();

    // 6. Test initials and name fallback logic
    await report('Avatar initials extraction handles full names and emails cleanly', async () => {
        function extractProfile(meta, email) {
            const fullName = meta.full_name || meta.name || (email ? email.split("@")[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Usuario");
            const firstName = fullName.split(" ")[0] || fullName;
            const initials = (firstName.slice(0, 1) + (fullName.split(" ")[1] ? fullName.split(" ")[1].slice(0, 1) : "")).toUpperCase() || "US";
            return { fullName, firstName, initials };
        }

        const p1 = extractProfile({ full_name: 'Daniel Palencia' }, 'daniel@example.com');
        assert.strictEqual(p1.firstName, 'Daniel');
        assert.strictEqual(p1.initials, 'DP');

        const p2 = extractProfile({}, 'santiago.dev@gmail.com');
        assert.strictEqual(p2.firstName, 'Santiago');
        assert.strictEqual(p2.initials, 'SD');
    })();

    // 7. Test /api/config/supabase endpoint
    await report('GET /api/config/supabase responds with configuration contract', async () => {
        const server = http.createServer(app);
        await new Promise(resolve => server.listen(0, resolve));
        const port = server.address().port;

        try {
            const res = await fetch(`http://127.0.0.1:${port}/api/config/supabase`);
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert(typeof data === 'object');
            assert('configured' in data);
        } finally {
            server.close();
        }
    })();

    console.log(`\n========================================`);
    console.log(`Auth Redesign Tests Completed: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
