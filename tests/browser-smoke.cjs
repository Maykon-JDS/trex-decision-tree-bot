// Optional integration check: node tests/browser-smoke.cjs path/to/model.json [--default|--default-file]
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const http = require('node:http');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const base = path.resolve(__dirname, '..');
    const modelPath = path.resolve(process.argv[2]);
    assert.ok(fs.existsSync(modelPath));
    const useDefault = process.argv.includes('--default') || process.argv.includes('--default-file');
    let server;
    let pageUrl = pathToFileURL(path.join(base, 'index.html')).href;
    if (process.argv.includes('--default')) {
        // A project subdirectory catches absolute-path bugs before GitHub Pages deployment.
        const prefix = '/trex-decision-tree-bot/';
        server = http.createServer((request, response) => {
            const pathname = new URL(request.url, 'http://localhost').pathname;
            const filename = path.resolve(base, decodeURIComponent(pathname.slice(prefix.length)) || 'index.html');
            if (!pathname.startsWith(prefix) || path.relative(base, filename).startsWith('..')) {
                response.writeHead(404).end();
                return;
            }
            fs.readFile(filename, (error, data) => {
                if (error) { response.writeHead(404).end(); return; }
                const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                    '.json': 'application/json', '.png': 'image/png' };
                response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' });
                response.end(data);
            });
        });
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        pageUrl = 'http://127.0.0.1:' + server.address().port + prefix;
    }
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trex-autoplay-'));
    const browser = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'
    ], { stdio: 'ignore', windowsHide: true });
    let ws, send;
    try {
        const portPath = path.join(profile, 'DevToolsActivePort');
        for (let i = 0; i < 100 && !fs.existsSync(portPath); i++) await pause(100);
        const port = fs.readFileSync(portPath, 'utf8').split('\n')[0];
        let tabs;
        for (let i = 0; i < 50; i++) {
            try { tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); break; }
            catch { await pause(100); }
        }
        ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
        let id = 0;
        const pending = new Map();
        const errors = [];
        ws.onmessage = event => {
            const message = JSON.parse(event.data);
            if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
            if (message.id) {
                const task = pending.get(message.id);
                pending.delete(message.id);
                message.error ? task.reject(message.error) : task.resolve(message.result);
            }
        };
        send = (method, params = {}) => new Promise((resolve, reject) => {
            const next = ++id;
            pending.set(next, { resolve, reject });
            ws.send(JSON.stringify({ id: next, method, params }));
        });
        const evaluate = async expression => {
            const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
            if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
            return result.result.value;
        };
        await send('Page.enable');
        await send('Runtime.enable');
        const initiallyMobile = process.argv.includes('--mobile');
        if (initiallyMobile) await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36', platform: 'Android' });
        await send('Emulation.setDeviceMetricsOverride', { width: initiallyMobile ? 390 : 1680, height: initiallyMobile ? 844 : 1100, deviceScaleFactor: 1, mobile: initiallyMobile });
        await send('Page.navigate', { url: pageUrl });
        let ready = false;
        for (let i = 0; i < 100; i++) {
            ready = await evaluate('!!(window.autoPlayer && window.gameRecorder && window.Runner && Runner.instance_.tRex)');
            if (ready) break;
            await pause(100);
        }
        assert.ok(ready, 'Game did not initialize');
        assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Initial page overflows horizontally');
        assert.equal(await evaluate('document.querySelectorAll(".tree-node").length'), await evaluate('TrexDefaultModel.nodes.length'));
        await evaluate(`document.getElementById('record-toggle').click();
            for (let i = 0; i < 125; i++) gameRecorder.sample(Runner.instance_, 50);
            gameRecorder.end(Runner.instance_);`);
        await pause(160);
        assert.deepEqual(await evaluate(`({ count: document.querySelectorAll('#records-table tbody tr').length,
            total: gameRecorder.rows.length,
            newest: document.querySelector('#records-table tbody tr').dataset.sample,
            columns: document.querySelectorAll('#records-table thead th').length })`),
            { count: 100, total: 126, newest: '126', columns: 22 });
        await evaluate("document.getElementById('record-toggle').click()");
        const oldScale = await evaluate('liveDashboard.scale');
        await evaluate("document.getElementById('tree-zoom-in').click()");
        assert.ok(await evaluate('liveDashboard.scale') > oldScale);
        await evaluate("document.getElementById('tree-fit').click()");
        await evaluate(`document.getElementById('record-toggle').click(); gameRecorder.sample(Runner.instance_, 50); document.getElementById('record-toggle').click();`);
        assert.equal(await evaluate('document.querySelector("#records-table tbody tr").dataset.sample'), '127');
        assert.equal(await evaluate('document.querySelectorAll("#records-table tbody tr").length'), 100);
        await evaluate("document.getElementById('tree-viewport').focus()");
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        assert.equal(await evaluate('Runner.instance_.playing'), false, 'Explorer keyboard input started the game');
        await evaluate('document.activeElement.blur()');
        if (useDefault) {
            await evaluate("window.fetch = function () { throw new Error('Default model must work without fetch'); }");
            await evaluate("document.getElementById('model-default').click()");
        } else {
            const document = await send('DOM.getDocument');
            const input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector: '#model-file' });
            await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [modelPath] });
        }
        for (let i = 0; i < 50; i++) {
            if (await evaluate('!!autoPlayer.model')) break;
            await pause(100);
        }
        assert.ok(await evaluate('!!autoPlayer.model'), 'Model file not loaded');
        if (useDefault) {
            assert.match(await evaluate("document.getElementById('autoplay-status').textContent"), /Default model loaded/);
        }
        await evaluate(`(async () => { window.checkedModel = autoPlayer.model;
            const oneLeaf = { ...autoPlayer.model, nodes: [{ left: -1, right: -1, feature: -2, threshold: -2, action: 'run' }] };
            await autoPlayer.loadFile({ name: 'single-leaf.json', size: 200, text: async () => JSON.stringify(oneLeaf) }); })()`);
        assert.equal(await evaluate('document.querySelectorAll(".tree-node").length'), 1);
        assert.equal(await evaluate('document.querySelectorAll(".tree-edge").length'), 0);
        await evaluate(`autoPlayer.loadFile({ name: 'invalid.json', size: 10, text: async () => '{}' })`);
        assert.equal(await evaluate('document.querySelectorAll(".tree-node").length'), 0);
        assert.equal(await evaluate('document.getElementById("decision-tree").hasAttribute("hidden")'), true);
        await evaluate(`autoPlayer.loadFile({ name: 'restored.json', size: 1000, text: async () => JSON.stringify(checkedModel) })`);
        await evaluate(`window.appliedActions = []; const originalApply = autoPlayer.apply;
            autoPlayer.apply = function(r, a) { appliedActions.push(a); return originalApply.call(this, r, a); };
            document.getElementById('record-toggle').click();
            document.getElementById('autoplay-toggle').click();`);
        await pause(2500);
        const result = await evaluate(`({ actions: appliedActions, recording: gameRecorder.enabled,
            recordDisabled: document.getElementById('record-toggle').disabled,
            status: document.getElementById('autoplay-status').textContent,
            active: Runner.instance_.activated, intro: Runner.instance_.playingIntro })`);
        assert.ok(result.actions.length > 0, JSON.stringify(result));
        assert.equal(result.recording, false);
        assert.ok(result.actions.every(action => ['run', 'duck', 'jump'].includes(action)));
        assert.ok(await evaluate('!!liveDashboard.lastDecision'));
        assert.equal(await evaluate('liveDashboard.lastDecision.action'), result.actions.at(-1));
        assert.equal(await evaluate('document.querySelectorAll(".tree-node.on-path").length'), await evaluate('liveDashboard.lastDecision.path.length'));
        assert.equal(await evaluate('document.querySelectorAll(".tree-edge").length'), await evaluate('autoPlayer.model.nodes.length - 1'));
        assert.ok(await evaluate('!document.getElementById("decision-tree").hasAttribute("hidden")'));
        assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".tree-node.on-path"), node => Number(node.dataset.node)).sort((a,b) => a-b)'), await evaluate('liveDashboard.lastDecision.path.slice().sort((a,b) => a-b)'));
        await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
        assert.equal(await evaluate('getComputedStyle(document.querySelector(".tree-node.on-path rect")).animationName'), 'none');
        await send('Emulation.setEmulatedMedia', { features: [] });
        await evaluate('Runner.instance_.stop()');
        assert.equal(await evaluate('liveDashboard.svg.classList.contains("is-evaluating")'), false);
        await evaluate('Runner.instance_.play()');
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        assert.equal(await evaluate('autoPlayer.enabled'), false);
        assert.equal(await evaluate('liveDashboard.svg.classList.contains("is-evaluating")'), false);
        assert.equal(await evaluate("document.getElementById('record-toggle').disabled"), false);
        await evaluate("document.getElementById('autoplay-toggle').click(); Runner.instance_.gameOver();");
        assert.equal(await evaluate('autoPlayer.enabled'), false);
        await evaluate("document.getElementById('autoplay-toggle').click();");
        assert.equal(await evaluate('Runner.instance_.crashed'), false);
        await pause(250);
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        const screenshotPath = path.join(base, '.venv', 'autoplay-smoke.png');
        fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await pause(500);
        assert.ok(await evaluate('document.documentElement.scrollWidth <= 390'), 'Mobile page overflows horizontally: ' + JSON.stringify(await evaluate(`Array.from(document.querySelectorAll('body *')).filter(e => e.getBoundingClientRect().right > 391 && getComputedStyle(e).position !== 'absolute').slice(0, 8).map(e => ({tag:e.tagName, id:e.id, width:e.getBoundingClientRect().width, right:e.getBoundingClientRect().right}))`)));
        const mobileScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        fs.writeFileSync(path.join(base, '.venv', 'dashboard-mobile.png'), Buffer.from(mobileScreenshot.data, 'base64'));
        await evaluate("document.getElementById('records-panel').scrollIntoView()");
        await pause(150);
        const recordsScreenshot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(base, '.venv', 'dashboard-mobile-records.png'), Buffer.from(recordsScreenshot.data, 'base64'));
        assert.deepEqual(errors, [], 'Uncaught browser errors');
        console.log(JSON.stringify({ result: 'Browser integration passed', decisions: result.actions.length, screenshot: screenshotPath }));
    } finally {
        if (send && ws?.readyState === WebSocket.OPEN) {
            try { await send('Browser.close'); } catch {}
        }
        ws?.close();
        browser.kill();
        if (server) await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
