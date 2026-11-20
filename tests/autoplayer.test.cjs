const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const tree = require('../tree-model.js');
const state = require('../game-state.js');

function leaf(action = 'run') {
    return { format: 'trex-decision-tree', version: 1, input_schema: 1, target: 'action', interval_ms: 50,
        classes: ['run', 'duck', 'jump'], feature_names: ['obstacle_distance'],
        nodes: [{ left: -1, right: -1, feature: -2, threshold: -2, action }] };
}

function setup() {
    const elements = {};
    function element() { return { events: {}, style: {}, disabled: false, addEventListener(t, fn) { this.events[t] = fn; },
        setAttribute() {}, blur() {}, click() { this.events.click?.(); } }; }
    const runner = { playing: true, activated: true, crashed: false, currentSpeed: 6,
        tRex: { xPos: 50, yPos: 93, jumpVelocity: 0, jumping: false, ducking: false, speedDrop: false,
            config: { WIDTH: 44, WIDTH_DUCK: 59 },
            startJump() { this.jumping = true; this.started = (this.started || 0) + 1; },
            endJump() { this.released = (this.released || 0) + 1; },
            setDuck(v) { this.ducking = v; }, setSpeedDrop() { this.speedDrop = true; } },
        horizon: { obstacles: [] } };
    let ready;
    const recorder = { enabled: true, release() { this.released = true; }, toggle: { click() { recorder.enabled = false; } } };
    const window = { TrexTree: tree, TrexState: state, Runner: { instance_: runner }, gameRecorder: recorder };
    const context = { window, document: { getElementById(id) { return elements[id] ||= element(); },
        addEventListener(t, fn) { ready = fn; } } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../autoplayer.js'), 'utf8'), context);
    ready();
    return { bot: window.autoPlayer, runner, elements, recorder };
}

test('rejects incompatible models and cycles instead of hanging', () => {
    assert.throws(() => tree.validate({ target: 'won' }));
    const model = leaf();
    model.nodes[0] = { left: 0, right: 0, feature: 0, threshold: 20, action: null };
    assert.throws(() => tree.validate(model));
    const leaked = leaf();
    leaked.feature_names = ['jump_pressed'];
    assert.throws(() => tree.validate(leaked));
});

test('keeps nearest obstacle geometry and empty values consistent with recordings', () => {
    const { runner } = setup();
    assert.equal(state.read(runner).obstacle_distance, null);
    runner.horizon.obstacles = [
        { xPos: 30, width: 10, yPos: 100, speedOffset: 0, typeConfig: { type: 'CACTUS_SMALL', height: 35 } },
        { xPos: 200, width: 46, yPos: 75, speedOffset: 0.8, typeConfig: { type: 'PTERODACTYL', height: 40 } }
    ];
    assert.equal(state.read(runner).obstacle_distance, 106);
    runner.tRex.ducking = true;
    assert.equal(state.read(runner).obstacle_distance, 91);
    assert.equal(state.read(runner).obstacle_type, 'PTERODACTYL');
});

test('releases jumps, supports duck and speed drop, and preserves a held jump', () => {
    const { bot, runner } = setup();
    bot.apply(runner, 'jump');
    bot.apply(runner, 'jump');
    assert.equal(runner.tRex.started, 1);
    bot.apply(runner, 'duck');
    assert.equal(runner.tRex.released, 1);
    assert.equal(runner.tRex.speedDrop, true);
    bot.apply(runner, 'run');
    assert.equal(runner.tRex.speedDrop, false);
    runner.tRex.jumping = false;
    bot.apply(runner, 'duck');
    assert.equal(runner.tRex.ducking, true);
    bot.apply(runner, 'run');
    assert.equal(runner.tRex.ducking, false);
});

test('stops recording, throttles inference and restores manual control', () => {
    const { bot, runner, elements, recorder } = setup();
    bot.model = tree.validate(leaf('jump'));
    bot.enable();
    assert.equal(recorder.enabled, false);
    assert.equal(elements['record-toggle'].disabled, true);
    bot.tick(runner, 16);
    assert.equal(bot.action, 'jump');
    bot.model = leaf('run');
    bot.tick(runner, 16);
    assert.equal(bot.action, 'jump');
    bot.tick(runner, 40);
    assert.equal(bot.action, 'run');
    bot.disable('Manual');
    assert.equal(bot.enabled, false);
    assert.equal(elements['record-toggle'].disabled, false);
});

test('loading invalid JSON leaves autoplay disabled and reports the error', async () => {
    const { bot } = setup();
    await bot.loadFile({ name: 'bad.json', size: 5, text: async () => 'oops' });
    assert.equal(bot.model, null);
    assert.equal(bot.toggle.disabled, true);
    assert.match(bot.status.textContent, /Unable to/);
    await bot.loadFile({ name: 'model.json', size: 500, text: async () => JSON.stringify(leaf()) });
    assert.equal(bot.toggle.disabled, false);
    assert.match(bot.status.textContent, /Ready to play/);
});
