const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function setup() {
    const elements = {};
    let ready, exported;
    const element = () => ({
        events: {}, addEventListener(type, fn) { this.events[type] = fn; },
        setAttribute() {}, blur() {}, click() {}, remove() {}
    });
    const context = {
        window: { addEventListener() {} },
        document: {
            getElementById(id) { return elements[id] ||= element(); },
            addEventListener(type, fn) { ready = fn; },
            createElement: element, body: { appendChild() {} }
        },
        URL: { createObjectURL(blob) { exported = blob.parts[0]; return 'blob:test'; }, revokeObjectURL() {} },
        Blob: class { constructor(parts) { this.parts = parts; } },
        setTimeout(fn) { fn(); }
    };
    vm.runInNewContext(readFileSync(require('node:path').join(__dirname, '../game-state.js'), 'utf8'), context);
    vm.runInNewContext(readFileSync(require('node:path').join(__dirname, '../recorder.js'), 'utf8'), context);
    ready();
    const runner = {
        playing: true, crashed: false, currentSpeed: 6, distanceRan: 120,
        tRex: { xPos: 50, yPos: 93, jumpVelocity: 0, jumping: false, ducking: false,
            config: { WIDTH: 44, WIDTH_DUCK: 59 } },
        horizon: { obstacles: [
            { xPos: 300, width: 17, yPos: 105, speedOffset: 0, typeConfig: { type: 'CACTUS_SMALL', height: 35 } },
            { xPos: 200, width: 46, yPos: 75, speedOffset: .8, typeConfig: { type: 'PTERODACTYL', height: 40 } }
        ] }
    };
    return { recorder: context.window.gameRecorder, runner, elements, exported: () => {
        const [header, ...lines] = exported.trimEnd().split('\r\n');
        const columns = header.split(',');
        return { samples: lines.map(line => Object.fromEntries(
            line.split(',').map((value, index) => [columns[index], value])
        )) };
    } };
}

test('records pre-action features, nearest obstacle, releases and terminal state as CSV', () => {
    const { recorder, runner, elements, exported } = setup();
    recorder.sample(runner, 50);
    assert.equal(recorder.rows.length, 0);
    elements['record-toggle'].events.click();
    recorder.sample(runner, 16);
    recorder.input(runner, { keyCode: 32 }, true);
    recorder.input(runner, { keyCode: 32 }, true); // Browser key repeat must not duplicate input.
    recorder.input(runner, { keyCode: 32 }, false);
    recorder.end(runner);
    recorder.exportCSV();
    const data = exported();
    assert.equal(data.samples.length, 4);
    assert.equal(data.samples[0].obstacle_type, 'PTERODACTYL');
    assert.equal(data.samples[0].obstacle_distance, '106');
    assert.equal(data.samples[1].action, 'jump');
    assert.equal(data.samples[1].jumping, '0'); // State before applying input.
    assert.equal(data.samples[2].action, 'run');
    assert.equal(data.samples[3].terminal, '1');
    assert.equal(data.samples[3].action, '');
    assert.equal(recorder.dirty, false);
});

test('keeps recording across games, handles empty horizons, pause and toggling', () => {
    const { recorder, runner, elements, exported } = setup();
    elements['record-toggle'].events.click();
    runner.horizon.obstacles = [];
    recorder.sample(runner, 16);
    recorder.input(runner, { keyCode: 40 }, true);
    recorder.release();
    recorder.sample(runner, 60);
    recorder.end(runner);
    recorder.sample(runner, 16);
    elements['record-toggle'].events.click();
    const count = recorder.rows.length;
    recorder.sample(runner, 60);
    assert.equal(recorder.rows.length, count);
    recorder.exportCSV();
    const rows = exported().samples;
    assert.equal(rows[0].obstacle_type, 'NONE');
    assert.equal(rows[0].obstacle_distance, '');
    assert.equal(rows[1].action, 'duck');
    assert.equal(rows[2].action, 'run');
    assert.equal(rows.at(-1).episode_id, '2');
});

test('recording and CSV export retain more than the dashboard display limit', () => {
    const { recorder, runner, elements, exported } = setup();
    elements['record-toggle'].events.click();
    for (let i = 0; i < 125; i++) recorder.sample(runner, 50);
    recorder.end(runner);
    recorder.exportCSV();
    assert.equal(recorder.rows.length, 126);
    assert.equal(exported().samples.length, 126);
    assert.equal(exported().samples.at(-1).terminal, '1');
});
