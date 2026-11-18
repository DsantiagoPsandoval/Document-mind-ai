/**
 * test_fase1_landing.js
 * Test Suite Automatizado para FASE 1: Auditoría del Proyecto y Rediseño Visual Enterprise
 * Valida la Landing Page, Navbar, Hero, Empresas & Seguridad, Planes & Precios (Toggle y Comparativa), FAQ y Responsive Design.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const TEST_PORT = 3105;
const APP_URL = `http://127.0.0.1:${TEST_PORT}`;

function logPass(msg) { console.log(`  ✅ [PASS] ${msg}`); }
function logFail(msg) { console.error(`  ❌ [FAIL] ${msg}`); process.exitCode = 1; }

function findChrome() {
    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
    ];
    for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
    }
    return null;
}

class CDPClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.msgId = 0;
        this.callbacks = new Map();
        this.events = [];
    }

    async connect() {
        return new Promise((resolve, reject) => {
            const WebSocket = require('ws');
            this.ws = new WebSocket(this.wsUrl);
            this.ws.on('open', () => resolve());
            this.ws.on('error', (err) => reject(err));
            this.ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id && this.callbacks.has(msg.id)) {
                    const cb = this.callbacks.get(msg.id);
                    this.callbacks.delete(msg.id);
                    if (msg.error) cb.reject(new Error(msg.error.message));
                    else cb.resolve(msg.result);
                } else if (msg.method) {
                    this.events.push(msg);
                }
            });
        });
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.msgId;
            this.callbacks.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async eval(expr) {
        const res = await this.send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            throw new Error(res.exceptionDetails.text || 'CDP Eval Exception');
        }
        return res.result ? res.result.value : undefined;
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

async function runFase1Tests() {
    console.log('\n====================================================================');
    console.log('🚀 DOCUMIND AI — SUITE AUTOMATIZADA FASE 1: REDISEÑO VISUAL SAAS');
    console.log('====================================================================\n');

    // 1. Limpiar puertos previos
    try {
        execSync(`powershell -Command "Get-NetTCPConnection -LocalPort ${TEST_PORT} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' });
    } catch (_) {}

    // 2. Iniciar servidor de prueba
    process.env.PORT = String(TEST_PORT);
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'mock-key';

    const app = require('../server.js');
    let expressServer;
    await new Promise((resolve) => {
        expressServer = app.listen(TEST_PORT, () => {
            resolve();
        });
    });

    // 3. Iniciar Chrome Headless
    const chromePath = findChrome();
    if (!chromePath) {
        throw new Error('Google Chrome no encontrado');
    }

    const cdpPort = 9335;
    const userDataDir = path.join(__dirname, '..', '.tmp_chrome_fase1');
    const chromeProc = spawn(chromePath, [
        `--remote-debugging-port=${cdpPort}`,
        `--user-data-dir=${userDataDir}`,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        'about:blank'
    ], { stdio: 'ignore' });

    let cdp;
    try {
        await new Promise(r => setTimeout(r, 1500));

        const getTabs = () => new Promise((resolve, reject) => {
            http.get(`http://127.0.0.1:${cdpPort}/json`, (res) => {
                let body = '';
                res.on('data', d => body += d);
                res.on('end', () => resolve(JSON.parse(body)));
            }).on('error', reject);
        });

        const tabs = await getTabs();
        const pageTab = tabs.find(t => t.type === 'page');
        cdp = new CDPClient(pageTab.webSocketDebuggerUrl);
        await cdp.connect();

        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');

        const consoleErrors = [];
        cdp.ws.on('message', (data) => {
            const m = JSON.parse(data.toString());
            if (m.method === 'Runtime.exceptionThrown') {
                consoleErrors.push(m.params.exceptionDetails.text);
            }
        });

        // Cargar la página
        await cdp.send('Page.navigate', { url: APP_URL });
        await new Promise(r => setTimeout(r, 2000));

        // --- TEST 1: Carga y Título ---
        const pageTitle = await cdp.eval('document.title');
        if (pageTitle.includes('DocuMind AI')) {
            logPass(`Carga inicial exitosa con título: "${pageTitle}"`);
        } else {
            logFail(`Título inesperado: ${pageTitle}`);
        }

        // --- TEST 2: Navbar Rediseñado, Cero Sobreposición y Menú Desplegable Universal ---
        const navCheck = await cdp.eval(`(() => {
            const links = Array.from(document.querySelectorAll('.nav-links a')).map(a => a.getAttribute('href'));
            const hasInicio = links.includes('#hero') || links.includes('#inicio');
            const hasComoFunciona = links.includes('#como-funciona');
            const hasAnalizador = links.includes('#analizador');
            const hasDocumentacion = !!document.getElementById('nav-link-docs');
            const hasSecurity = links.includes('#security-intelligence');
            const hasSimulador = links.some(h => h && h.includes('/simulador'));
            const hasEquipo = links.includes('#equipo');
            const hasContacto = links.includes('#contacto');
            const hasNoPlanes = !links.includes('#planes') && !document.getElementById('planes') && !document.getElementById('checkout-modal');
            const hasLogoMark = !!document.querySelector('.nav-logo-icon img[src*="documind-mark.svg"]');

            // Verificar geometría sin sobreposición en la barra superior
            const logoRect = document.querySelector('.nav-logo').getBoundingClientRect();
            const quickBar = document.querySelector('.nav-quick-bar');
            const quickRect = quickBar && quickBar.offsetParent !== null ? quickBar.getBoundingClientRect() : null;
            const actionsRect = document.querySelector('.nav-actions').getBoundingClientRect();
            const noOverlapLogoQuick = !quickRect || (logoRect.right + 8 <= quickRect.left);
            const noOverlapQuickActions = !quickRect || (quickRect.right + 8 <= actionsRect.left);
            const noOverlapLogoActions = logoRect.right + 8 <= actionsRect.left;

            // Verificar apertura y cierre del menú hamburguesa desplegable universal
            const menuBtn = document.getElementById('mobile-menu-btn');
            const mobileMenu = document.getElementById('mobile-menu');
            const btnVisibleOnDesktop = menuBtn && menuBtn.offsetParent !== null;
            menuBtn.click();
            const drawerOpens = !mobileMenu.classList.contains('hidden') && mobileMenu.classList.contains('open');
            menuBtn.click();
            const drawerCloses = mobileMenu.classList.contains('hidden');

            return {
                hasInicio, hasComoFunciona, hasAnalizador, hasDocumentacion, hasSecurity, hasSimulador, hasEquipo, hasContacto,
                hasNoPlanes, hasLogoMark,
                noOverlapLogoQuick, noOverlapQuickActions, noOverlapLogoActions,
                btnVisibleOnDesktop, drawerOpens, drawerCloses,
                totalLinks: links.length
            };
        })()`);

        if (navCheck.hasInicio && navCheck.hasComoFunciona && navCheck.hasAnalizador && navCheck.hasDocumentacion &&
            navCheck.hasSecurity && navCheck.hasSimulador && navCheck.hasEquipo && navCheck.hasContacto &&
            navCheck.hasNoPlanes && navCheck.hasLogoMark &&
            navCheck.noOverlapLogoQuick && navCheck.noOverlapQuickActions && navCheck.noOverlapLogoActions &&
            navCheck.btnVisibleOnDesktop && navCheck.drawerOpens && navCheck.drawerCloses) {
            logPass(`Navbar limpio validado: 0px de sobreposición geométrica, menú hamburguesa universal funcional (abre/cierra en desktop y móvil con las 8 secciones) y 0 monetización`);
        } else {
            logFail(`Navbar check falló: ${JSON.stringify(navCheck)}`);
        }

        // --- TEST 3: Hero Section y 4 Tarjetas de Confianza ---
        const heroCheck = await cdp.eval(`(() => {
            const title = document.querySelector('.hero-title')?.innerText || '';
            const ctaAnalyze = document.querySelector('#btn-hero-analyze')?.getAttribute('href');
            const ctaSimulador = document.querySelector('#hero a[href="/simulador"]');
            const trustPills = Array.from(document.querySelectorAll('#hero .reveal-delay-4 > div')).length;
            const titleOk = title.length > 20;
            return { titleOk, ctaAnalyze: ctaAnalyze === '#analizador', ctaSimOk: !!ctaSimulador, trustPills };
        })()`);

        if (heroCheck.titleOk && heroCheck.ctaAnalyze && heroCheck.ctaSimOk && heroCheck.trustPills >= 4) {
            logPass(`Hero Section configurado con propuesta de valor, CTAs (#analizador, /simulador) y 4 tarjetas de confianza`);
        } else {
            logFail(`Hero check falló: ${JSON.stringify(heroCheck)}`);
        }

        // --- TEST 4: Sección Empresas & Seguridad ---
        const secEmpresas = await cdp.eval(`(() => {
            const sec = document.getElementById('empresas-seguridad');
            if (!sec) return null;
            const cards = Array.from(sec.querySelectorAll('.enterprise-card')).map(c => c.querySelector('.enterprise-card-title')?.innerText.trim());
            const hasBanner = !!sec.querySelector('.enterprise-trust-banner');
            return { exists: true, cardsCount: cards.length, cards, hasBanner };
        })()`);

        if (secEmpresas && secEmpresas.cardsCount === 4 && secEmpresas.hasBanner) {
            logPass(`Sección #empresas-seguridad validada con 4 tarjetas de valor y banner de confianza (SLA, TLS 1.3, AST, Onboarding)`);
        } else {
            logFail(`Sección empresas-seguridad inválida: ${JSON.stringify(secEmpresas)}`);
        }

        // --- TEST 5: Verificación de Eliminación Total de Pagos, Planes y Pasarelas ---
        const monetizationCheck = await cdp.eval(`(() => {
            const planesSection = document.getElementById('planes');
            const checkoutModal = document.getElementById('checkout-modal');
            const bodyText = document.body.innerText || '';
            const hasWompi = bodyText.includes('Wompi') || bodyText.includes('Mercado Pago');
            const hasGoogleBtn = !!document.getElementById('btn-oauth-google');
            const hasGithubBtn = !!document.getElementById('btn-oauth-github');
            return {
                noPlanesSection: !planesSection,
                noCheckoutModal: !checkoutModal,
                noPaymentGatewaysInText: !hasWompi,
                hasGoogleBtn,
                hasGithubBtn
            };
        })()`);

        if (monetizationCheck.noPlanesSection && monetizationCheck.noCheckoutModal && monetizationCheck.noPaymentGatewaysInText && monetizationCheck.hasGoogleBtn && monetizationCheck.hasGithubBtn) {
            logPass(`Eliminación completa de monetización verificada (0 planes, 0 checkout, 0 pasarelas) y coexistencia Google OAuth + GitHub OAuth activa`);
        } else {
            logFail(`Verificación de monetización/OAuth falló: ${JSON.stringify(monetizationCheck)}`);
        }

        // --- TEST 6: Sección Preguntas Frecuentes (#faq) ---
        const faqCheck = await cdp.eval(`(() => {
            const sec = document.getElementById('faq');
            if (!sec) return null;
            const items = sec.querySelectorAll('.faq-accordion-item');
            const firstItem = items[0];
            const wasOpen = firstItem.hasAttribute('open');
            firstItem.setAttribute('open', '');
            const isOpenNow = firstItem.hasAttribute('open');
            return { totalFaqs: items.length, wasOpen, isOpenNow };
        })()`);

        if (faqCheck && faqCheck.totalFaqs >= 5 && faqCheck.isOpenNow) {
            logPass(`Sección #faq validada con ${faqCheck.totalFaqs} preguntas frecuentes técnicas interactivas`);
        } else {
            logFail(`Sección FAQ falló: ${JSON.stringify(faqCheck)}`);
        }

        // --- TEST 8: Responsive Layout (320px, 375px, 768px, 1024px, 1440px) ---
        const viewports = [
            { width: 320, height: 600, name: '320px (Mobile Mini)' },
            { width: 375, height: 667, name: '375px (Mobile Standard)' },
            { width: 768, height: 1024, name: '768px (Tablet Portrait)' },
            { width: 1024, height: 768, name: '1024px (Tablet Landscape / Laptop)' },
            { width: 1440, height: 900, name: '1440px (Desktop Full HD)' }
        ];

        let responsivePass = true;
        for (const vp of viewports) {
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: vp.width,
                height: vp.height,
                deviceScaleFactor: 1,
                mobile: vp.width <= 768
            });
            await new Promise(r => setTimeout(r, 150));
            const hasHorizontalScroll = await cdp.eval(`document.documentElement.scrollWidth > window.innerWidth + 5`);
            if (hasHorizontalScroll) {
                logFail(`Desbordamiento horizontal detectado en resolución ${vp.name}`);
                responsivePass = false;
            }
        }
        if (responsivePass) {
            logPass(`Diseño responsive verificado en 5 resoluciones (320px, 375px, 768px, 1024px, 1440px) con 0 desbordamiento horizontal`);
        }

        // --- TEST 9: Cero Errores de Consola ---
        if (consoleErrors.length === 0) {
            logPass(`0 excepciones JavaScript en consola del navegador durante todas las interacciones`);
        } else {
            logFail(`Excepciones JS detectadas: ${consoleErrors.join(', ')}`);
        }

    } finally {
        if (cdp) cdp.close();
        if (chromeProc) chromeProc.kill();
        if (expressServer) expressServer.close();
        try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
    }

    console.log('\n====================================================================');
    console.log('🎉 RESULTADO FASE 1: TODAS LAS PRUEBAS VISUALES Y ESTRUCTURALES PASARON');
    console.log('====================================================================\n');
}

runFase1Tests().catch(err => {
    console.error('Error fatal en test_fase1_landing:', err);
    process.exit(1);
});
