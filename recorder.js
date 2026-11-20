(function () {
    'use strict';

    var COLUMNS = [
        'recording_id', 'episode_id', 'sample', 'time_ms', 'source',
        'speed', 'distance', 'trex_x', 'trex_y', 'trex_jump_velocity',
        'jumping', 'ducking', 'obstacle_type', 'obstacle_distance',
        'obstacle_y', 'obstacle_width', 'obstacle_height', 'obstacle_speed',
        'jump_pressed', 'duck_pressed', 'action', 'terminal'
    ];

    function Recorder() {
        this.rows = [];
        this.enabled = false;
        this.keys = {};
        this.episode = 0;
        this.activeEpisode = false;
        this.elapsed = 0;
        this.sinceSample = 0;
        this.recordingId = new Date().toISOString();
        this.toggle = document.getElementById('record-toggle');
        this.download = document.getElementById('record-download');
        this.status = document.getElementById('record-status');

        this.toggle.addEventListener('click', function () {
            this.enabled = !this.enabled;
            this.activeEpisode = false;
            this.toggle.setAttribute('aria-pressed', String(this.enabled));
            this.toggle.textContent = this.enabled ? 'Parar gravação' : 'Iniciar gravação';
            this.render();
            this.toggle.blur();
        }.bind(this));
        this.download.addEventListener('click', this.exportCSV.bind(this));
        // The game's mobile touch controller covers the viewport. Keep controls accessible.
        ['touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(function (type) {
            document.getElementById('recording-controls').addEventListener(type, function (e) {
                e.stopPropagation();
            });
        });
        window.addEventListener('blur', this.release.bind(this));
        window.addEventListener('beforeunload', function (e) {
            if (this.rows.length && this.dirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        }.bind(this));
    }

    Recorder.prototype.release = function () { this.keys = {}; };

    Recorder.prototype.input = function (runner, event, pressed) {
        var key = event.keyCode;
        if (event.type === 'touchstart' || event.type === 'touchend') key = 'touch';
        if (key !== 32 && key !== 38 && key !== 40 && key !== 'touch') return;
        if (!!this.keys[key] === pressed) return;
        this.keys[key] = pressed;
        if (this.enabled && runner.playing && !runner.crashed) {
            this.capture(runner, pressed ? 'input_down' : 'input_up', false);
        }
    };

    Recorder.prototype.sample = function (runner, deltaTime) {
        if (!this.enabled || runner.crashed) return;
        if (!this.activeEpisode) {
            this.episode++;
            this.activeEpisode = true;
            this.elapsed = 0;
            this.sinceSample = 50;
        }
        this.elapsed += Math.max(0, deltaTime);
        this.sinceSample += Math.max(0, deltaTime);
        // At most one observation per frame; never fabricate samples after a pause.
        if (this.sinceSample >= 50) {
            this.sinceSample = 0;
            this.capture(runner, 'frame', false);
        }
    };

    Recorder.prototype.capture = function (runner, source, terminal) {
        if (!this.activeEpisode) return;
        var state = window.TrexState.read(runner);
        var jump = !!(this.keys[32] || this.keys[38] || this.keys.touch);
        var duck = !!this.keys[40];
        this.rows.push([
            this.recordingId, this.episode, this.rows.length + 1,
            Math.round(this.elapsed), source, runner.currentSpeed, runner.distanceRan,
            state.trex_x, state.trex_y, state.trex_jump_velocity, state.jumping, state.ducking,
            state.obstacle_type, state.obstacle_distance,
            state.obstacle_y, state.obstacle_width, state.obstacle_height, state.obstacle_speed,
            Number(jump), Number(duck), terminal ? '' : duck ? 'duck' : jump ? 'jump' : 'run',
            Number(terminal)
        ]);
        this.dirty = true;
        // Avoid announcing status on every frame to assistive technology.
        if (source !== 'frame' || this.rows.length % 20 === 1) this.render();
    };

    Recorder.prototype.end = function (runner) {
        if (this.enabled) this.capture(runner, 'game_over', true);
        this.activeEpisode = false;
        this.release();
        this.render();
    };

    Recorder.prototype.render = function () {
        this.download.disabled = this.rows.length === 0;
        this.status.textContent = (this.enabled ? 'Gravação ativada' : 'Gravação desativada') +
            '. ' + this.rows.length + ' amostras em ' + this.episode + ' trecho(s) de partida.';
    };

    Recorder.prototype.exportCSV = function () {
        function escapeCell(value) {
            var text = value == null ? '' : String(value);
            return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
        }
        var csv = [COLUMNS].concat(this.rows).map(function (row) {
            return row.map(escapeCell).join(',');
        }).join('\r\n') + '\r\n';
        var url = URL.createObjectURL(new Blob([csv], {
            type: 'text/csv;charset=utf-8'
        }));
        var link = document.createElement('a');
        link.href = url;
        link.download = 'trex-partidas-' + this.recordingId.replace(/[:.]/g, '-') + '.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        this.dirty = false;
    };

    document.addEventListener('DOMContentLoaded', function () {
        window.gameRecorder = new Recorder();
    });
})();
