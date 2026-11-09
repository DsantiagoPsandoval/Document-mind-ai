const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');

class CDPClient {
    constructor(wsUrl) { this.wsUrl = wsUrl; this.msgId = 0; this.callbacks = new Map(); }
    connect() {
        return new Promise((res, rej) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.on('open', res);
            this.ws.on('error', rej);
            this.ws.on('message', d => {
                const m = JSON.parse(d.toString());
                if (m.id && this.callbacks.has(m.id)) {
                    const cb = this.callbacks.get(m.id);
                    this.callbacks.delete(m.id);
                    if (m.error) cb.reject(new Error(m.error.message));
                    else cb.resolve(m.result);
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
        const res = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (res.exceptionDetails) {
            console.error('Exception in eval:', JSON.stringify(res.exceptionDetails, null, 2));
            throw new Error(res.exceptionDetails.text);
        }
        return res.result ? res.result.value : undefined;
    }
    close() { if (this.ws) this.ws.close(); }
}

async function run() {
    const TEST_PORT = 3155;
    process.env.PORT = String(TEST_PORT);
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'mock-key';

    const app = require('../server.js');
    let srv;
    await new Promise(r => { srv = app.listen(TEST_PORT, r); });

    const chromeTmp = path.join(__dirname, '..', '.tmp_chrome_diag_full');
    const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--remote-debugging-port=9346',
        `--user-data-dir=${chromeTmp}`,
        '--headless=new',
        'about:blank'
    ], { stdio: 'ignore' });

    await new Promise(r => setTimeout(r, 1200));

    const getTabs = () => new Promise(res => {
        http.get('http://127.0.0.1:9346/json', r => {
            let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b)));
        });
    });
    const tabs = await getTabs();
    const cdp = new CDPClient(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const resolutions = [
        // Computadores y monitores
        { category: 'Monitores', w: 1280, h: 720, label: '1280x720 (Desktop HD)' },
        { category: 'Monitores', w: 1366, h: 768, label: '1366x768 (Desktop Standard)' },
        { category: 'Monitores', w: 1440, h: 900, label: '1440x900 (Desktop Widescreen)' },
        { category: 'Monitores', w: 1600, h: 900, label: '1600x900 (Desktop HD+)' },
        { category: 'Monitores', w: 1920, h: 1080, label: '1920x1080 (FHD 1080p)' },
        { category: 'Monitores', w: 2560, h: 1440, label: '2560x1440 (QHD 2K)' },
        // Portátiles
        { category: 'Portatiles', w: 1280, h: 800, label: '1280x800 (Laptop WXGA)' },
        { category: 'Portatiles', w: 1536, h: 864, label: '1536x864 (Laptop Surface/Modern)' },
        // Tablets
        { category: 'Tablets', w: 768, h: 1024, label: '768x1024 (iPad Vertical)' },
        { category: 'Tablets', w: 820, h: 1180, label: '820x1180 (iPad Air Vertical)' },
        { category: 'Tablets', w: 1024, h: 768, label: '1024x768 (iPad Horizontal)' },
        // Celulares
        { category: 'Celulares', w: 320, h: 568, label: '320x568 (iPhone SE gen1)' },
        { category: 'Celulares', w: 360, h: 800, label: '360x800 (Android Common)' },
        { category: 'Celulares', w: 375, h: 812, label: '375x812 (iPhone X/11 Pro)' },
        { category: 'Celulares', w: 390, h: 844, label: '390x844 (iPhone 12/13/14)' },
        { category: 'Celulares', w: 412, h: 915, label: '412x915 (Samsung Galaxy S20+)' },
        { category: 'Celulares', w: 430, h: 932, label: '430x932 (iPhone 14/15 Pro Max)' }
    ];

    const pages = ['/', '/simulador'];
    const results = [];

    for (const page of pages) {
        console.log(`\n\n======================================================`);
        console.log(`TESTING PAGE: ${page}`);
        console.log(`======================================================`);

        for (const res of resolutions) {
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: res.w,
                height: res.h,
                deviceScaleFactor: 1,
                mobile: res.w < 768
            });

            await cdp.send('Page.navigate', { url: `http://localhost:${TEST_PORT}${page}` });
            await new Promise(r => setTimeout(r, 600));

            const check = await cdp.eval(`(() => {
                const winW = window.innerWidth;
                const docScrollW = document.documentElement.scrollWidth;
                const bodyScrollW = document.body.scrollWidth;
                const hasOverflow = docScrollW > winW + 2 || bodyScrollW > winW + 2;

                const badEls = [];
                document.querySelectorAll('*').forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.width > winW + 2 || r.right > winW + 2) {
                        let sel = el.tagName.toLowerCase();
                        if (el.id) sel += '#' + el.id;
                        else if (el.className && typeof el.className === 'string') sel += '.' + el.className.split(' ')[0];
                        badEls.push({ sel, w: Math.round(r.width), right: Math.round(r.right) });
                    }
                });

                return {
                    winW,
                    docScrollW,
                    bodyScrollW,
                    hasOverflow,
                    badCount: badEls.length,
                    badSample: badEls.slice(0, 3)
                };
            })()`);

            const status = check.hasOverflow ? 'FAIL ❌' : 'PASS ✅';
            const item = {
                page,
                label: res.label,
                category: res.category,
                w: res.w,
                h: res.h,
                winW: check.winW,
                docScrollW: check.docScrollW,
                hasOverflow: check.hasOverflow,
                badCount: check.badCount,
                badSample: check.badSample
            };
            results.push(item);

            console.log(`[${status}] ${res.category.padEnd(10)} | ${res.label.padEnd(35)} | Win: ${check.winW}px | Scroll: ${check.docScrollW}px | BadEls: ${check.badCount}`);
            if (check.hasOverflow) {
                console.log(`   --> Overflows: ${JSON.stringify(check.badSample)}`);
            }
        }
    }

    cdp.close();
    chromeProc.kill();
    srv.close();

    const fails = results.filter(r => r.hasOverflow);
    console.log(`\n======================================================`);
    console.log(`FINAL REPORT: Total Tested: ${results.length} | Passed: ${results.length - fails.length} | Failed: ${fails.length}`);
    console.log(`======================================================`);

    if (fails.length === 0) {
        console.log('PERFECT! 100% of tested resolutions on all pages have ZERO horizontal overflow!');
    } else {
        console.error('Some resolutions failed!');
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Error running audit:', err);
    process.exit(1);
});
