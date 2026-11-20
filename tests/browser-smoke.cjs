// Optional integration check: node tests/browser-smoke.cjs path/to/model.json [--default]
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
    const useDefault = process.argv.includes('--default');
    let server;
    let pageUrl = pathToFileURL(path.join(base, 'index.html')).href;
    if (useDefault) {
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
        await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 1000, deviceScaleFactor: 1, mobile: false });
        await send('Page.navigate', { url: pageUrl });
        let ready = false;
        for (let i = 0; i < 100; i++) {
            ready = await evaluate('!!(window.autoPlayer && window.gameRecorder && window.Runner && Runner.instance_.tRex)');
            if (ready) break;
            await pause(100);
        }
        assert.ok(ready, 'Game did not initialize');
        if (useDefault) {
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
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        assert.equal(await evaluate('autoPlayer.enabled'), false);
        assert.equal(await evaluate("document.getElementById('record-toggle').disabled"), false);
        await evaluate("document.getElementById('autoplay-toggle').click(); Runner.instance_.gameOver();");
        assert.equal(await evaluate('autoPlayer.enabled'), false);
        await evaluate("document.getElementById('autoplay-toggle').click();");
        assert.equal(await evaluate('Runner.instance_.crashed'), false);
        await pause(250);
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        const screenshotPath = path.join(base, '.venv', 'autoplay-smoke.png');
        fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
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
