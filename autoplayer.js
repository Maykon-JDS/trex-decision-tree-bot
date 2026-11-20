(function () {
    'use strict';

    function AutoPlayer() {
        this.model = null;
        this.enabled = false;
        this.action = null;
        this.elapsed = 50;
        this.starting = false;
        this.loading = false;
        this.toggle = document.getElementById('autoplay-toggle');
        this.defaultModel = document.getElementById('model-default');
        this.load = document.getElementById('model-load');
        this.file = document.getElementById('model-file');
        this.status = document.getElementById('autoplay-status');
        this.record = document.getElementById('record-toggle');
        this.defaultModel.addEventListener('click', function () {
            this.defaultModel.blur();
            return this.loadDefault();
        }.bind(this));
        this.load.addEventListener('click', function () { this.file.click(); this.load.blur(); }.bind(this));
        this.file.addEventListener('change', function () {
            if (this.file.files[0]) this.loadFile(this.file.files[0]);
        }.bind(this));
        this.toggle.addEventListener('click', function () {
            if (this.enabled) this.disable('Autoplayer disabled. You can play manually.');
            else this.enable();
            this.toggle.blur();
        }.bind(this));
        ['touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(function (type) {
            document.getElementById('autoplay-controls').addEventListener(type, function (event) {
                event.stopPropagation();
            });
        });
    }

    AutoPlayer.prototype.runner = function () { return window.Runner && window.Runner.instance_; };

    AutoPlayer.prototype.loadDefault = function () {
        return this.loadModel('Default model', async function () {
            var response = await fetch('examples/trained-model/model.json');
            if (!response.ok) throw new Error('Default model request failed (HTTP ' + response.status + ').');
            return response.text();
        });
    };

    AutoPlayer.prototype.loadFile = function (file) {
        return this.loadModel(file.name, async function () {
            if (file.size > 1024 * 1024) throw new Error('The model must be no larger than 1 MB.');
            return file.text();
        });
    };

    AutoPlayer.prototype.loadModel = async function (name, readText) {
        if (this.loading) return;
        this.loading = true;
        this.disable('Loading model…');
        this.model = null;
        this.toggle.disabled = true;
        this.load.disabled = true;
        this.defaultModel.disabled = true;
        try {
            this.model = window.TrexTree.validate(JSON.parse(await readText()));
            this.toggle.disabled = false;
            this.status.textContent = name + ' loaded. Actions: ' + this.model.classes.join(', ') + '. Ready to play.';
        } catch (error) {
            this.status.textContent = 'Unable to load: ' + error.message;
        } finally {
            this.load.disabled = false;
            this.defaultModel.disabled = false;
            this.loading = false;
            this.file.value = '';
        }
    };

    AutoPlayer.prototype.enable = function () {
        var runner = this.runner();
        if (!this.model || !runner || !runner.tRex) {
            this.status.textContent = 'Wait for the game to load and select a model.';
            return;
        }
        var recorder = window.gameRecorder;
        if (recorder) {
            if (recorder.enabled) recorder.toggle.click();
            recorder.release();
        }
        this.record.disabled = true;
        this.release(runner);
        this.enabled = true;
        this.elapsed = 50;
        this.toggle.setAttribute('aria-pressed', 'true');
        this.toggle.textContent = 'Disable autoplayer';
        this.status.textContent = 'Autoplayer enabled. Press Esc to return to manual control.';
        this.starting = true;
        try {
            if (runner.crashed) runner.restart();
            else if (!runner.playing && runner.activated) {
                runner.tRex.reset();
                runner.play();
            } else if (!runner.playing) {
                // Use the game's first jump to start its original intro and sounds.
                var event = { keyCode: 32, type: 'keydown', target: runner.canvas,
                    automated: true, preventDefault: function () {} };
                runner.onKeyDown(event);
                event.type = 'keyup';
                runner.onKeyUp(event);
            }
            document.getElementById('messageBox').style.visibility = 'hidden';
        } finally { this.starting = false; }
    };

    AutoPlayer.prototype.release = function (runner) {
        if (runner && runner.tRex) {
            if (this.action === 'jump') runner.tRex.endJump();
            runner.tRex.speedDrop = false;
            if (runner.tRex.ducking) runner.tRex.setDuck(false);
        }
        this.action = null;
        this.elapsed = 50;
    };

    AutoPlayer.prototype.disable = function (message) {
        this.release(this.runner());
        this.enabled = false;
        this.record.disabled = false;
        this.toggle.setAttribute('aria-pressed', 'false');
        this.toggle.textContent = 'Enable autoplayer';
        if (message) this.status.textContent = message;
    };

    AutoPlayer.prototype.tick = function (runner, deltaTime) {
        if (!this.enabled || this.starting || !runner.playing || runner.crashed ||
            !runner.activated || runner.playingIntro) return;
        this.elapsed += Math.max(0, deltaTime);
        if (this.elapsed < 50) return;
        this.elapsed = 0;
        try {
            var state = window.TrexState.read(runner);
            var action = window.TrexTree.predict(this.model, state);
            var changed = this.action !== action;
            this.apply(runner, action);
            if (changed) this.status.textContent = 'Autoplayer enabled. Action: ' + action + '. Esc: manual control.';
        } catch (error) {
            this.disable('Autoplayer stopped: ' + error.message);
        }
    };

    AutoPlayer.prototype.apply = function (runner, action) {
        var trex = runner.tRex;
        if (this.action === 'jump' && action !== 'jump') trex.endJump();
        if (action !== 'duck') {
            trex.speedDrop = false;
            if (trex.ducking) trex.setDuck(false);
        }
        if (action === 'jump' && !trex.jumping) {
            trex.startJump(runner.currentSpeed);
        } else if (action === 'duck') {
            if (trex.jumping && !trex.speedDrop) trex.setSpeedDrop();
            else if (!trex.jumping && !trex.ducking) trex.setDuck(true);
        }
        this.action = action;
    };

    document.addEventListener('DOMContentLoaded', function () { window.autoPlayer = new AutoPlayer(); });
})();
