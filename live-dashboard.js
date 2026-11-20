(function () {
    'use strict';
    var SVG = 'http://www.w3.org/2000/svg';
    function svgElement(tag, attributes, label) {
        var element = document.createElementNS(SVG, tag);
        Object.keys(attributes || {}).forEach(function (key) { if (attributes[key] != null) element.setAttribute(key, attributes[key]); });
        if (label != null) element.textContent = label;
        return element;
    }
    function Dashboard() {
        this.viewport = document.getElementById('tree-viewport');
        this.svg = document.getElementById('decision-tree');
        this.nodes = [];
        this.edges = [];
        this.highlighted = [];
        this.rowElements = new Map();
        this.timer = null;
        this.scale = 1;
        this.model = null;
        this.dimensions = { width: 1, height: 1 };
        var self = this;
        document.getElementById('tree-zoom-in').addEventListener('click', function () { self.zoom(1.5); });
        document.getElementById('tree-zoom-out').addEventListener('click', function () { self.zoom(1 / 1.5); });
        document.getElementById('tree-fit').addEventListener('click', function () { self.fit(); });
        this.viewport.addEventListener('keydown', function (event) {
            if (event.key === '+' || event.key === '=') { event.preventDefault(); self.zoom(1.5); }
            if (event.key === '-') { event.preventDefault(); self.zoom(1 / 1.5); }
            if (event.key === '0') { event.preventDefault(); self.fit(); }
        });
        this.viewport.addEventListener('pointerdown', function (event) {
            if (event.button !== 0 || event.pointerType === 'touch') return;
            self.drag = { x: event.clientX, y: event.clientY, left: self.viewport.scrollLeft, top: self.viewport.scrollTop };
            self.viewport.setPointerCapture(event.pointerId);
            self.viewport.classList.add('dragging');
        });
        this.viewport.addEventListener('pointermove', function (event) {
            if (!self.drag) return;
            self.viewport.scrollLeft = self.drag.left - (event.clientX - self.drag.x);
            self.viewport.scrollTop = self.drag.top - (event.clientY - self.drag.y);
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
            self.viewport.addEventListener(type, function () { self.drag = null; self.viewport.classList.remove('dragging'); });
        });
        // Side-panel gestures belong to the explorer, not the game's document-level controller.
        document.querySelectorAll('.live-panel').forEach(function (panel) {
            ['touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(function (type) {
                panel.addEventListener(type, function (event) { event.stopPropagation(); });
            });
        });
        document.addEventListener('visibilitychange', function () { if (document.hidden) self.pause(); });
        window.addEventListener('blur', function () { self.pause(); });
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(function () { if (self.fitted) self.fit(); });
            this.resizeObserver.observe(this.viewport);
        }
        if (window.TrexDefaultModel) this.setModel(window.TrexTree.validate(window.TrexDefaultModel), 'Default model preview');
    }

    Dashboard.prototype.recording = function (recorder, columns) {
        document.getElementById('stream-state').textContent = recorder.enabled ? 'Recording' : 'Stopped';
        document.getElementById('stream-state').classList.toggle('is-live', recorder.enabled);
        document.getElementById('records-empty').hidden = true;
        document.getElementById('records-scroll').hidden = false;
        this.recorder = recorder;
        this.columns = columns;
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.flushSamples();
    };
    Dashboard.prototype.samples = function (recorder, columns) {
        this.recorder = recorder;
        this.columns = columns;
        if (this.timer) return;
        this.timer = setTimeout(function () { this.timer = null; this.flushSamples(); }.bind(this), 100);
    };
    Dashboard.prototype.flushSamples = function () {
        var table = document.getElementById('records-table');
        if (!table.tHead.rows.length) {
            var heading = document.createElement('tr');
            this.columns.forEach(function (column) {
                var cell = document.createElement('th');
                cell.scope = 'col';
                cell.textContent = column;
                heading.appendChild(cell);
            });
            table.tHead.appendChild(heading);
        }
        var fragment = document.createDocumentFragment();
        var kept = new Map();
        var recent = this.recorder.rows.slice(-100).reverse();
        var actionIndex = this.columns.indexOf('action');
        var sampleIndex = this.columns.indexOf('sample');
        var terminalIndex = this.columns.indexOf('terminal');
        recent.forEach(function (row) {
            var key = row[sampleIndex];
            var element = this.rowElements.get(key);
            if (!element) {
                element = document.createElement('tr');
                element.dataset.sample = key;
                element.className = 'new-sample';
                if (row[terminalIndex]) element.classList.add('terminal-sample');
                row.forEach(function (value, index) {
                    var cell = document.createElement('td');
                    cell.textContent = value == null ? '—' : String(value);
                    if (index === actionIndex) cell.className = 'action-' + row[actionIndex];
                    element.appendChild(cell);
                });
                fragment.appendChild(element);
            }
            kept.set(key, element);
        }, this);
        this.rowElements.forEach(function (element, key) { if (!kept.has(key)) element.remove(); });
        table.tBodies[0].prepend(fragment);
        this.rowElements = kept;
        document.getElementById('stream-summary').textContent = 'Showing ' + recent.length + ' of ' + this.recorder.rows.length + ' samples · Newest first';
    };

    Dashboard.prototype.setModel = function (model, name) {
        this.pause();
        this.model = model;
        this.highlighted = [];
        this.nodes = [];
        this.edges = [];
        this.svg.replaceChildren();
        this.svg.toggleAttribute('hidden', !model);
        document.getElementById('tree-empty').hidden = !!model;
        document.getElementById('tree-summary').textContent = model ? name + ' · ' + model.nodes.length + ' nodes' : 'No model loaded';
        document.getElementById('tree-state').textContent = model ? 'Ready' : 'Empty';
        document.getElementById('decision-summary').textContent = 'Enable the autoplayer to see live decisions.';
        document.getElementById('decision-path').textContent = '';
        this.lastDecision = null;
        ['tree-zoom-in', 'tree-zoom-out', 'tree-fit'].forEach(function (id) { document.getElementById(id).disabled = !model; });
        if (!model) return;
        // Iterative postorder layout also handles deep imported trees without call-stack recursion.
        var positions = new Array(model.nodes.length);
        var pending = [{ index: 0, depth: 0, visited: false }];
        var leaf = 0;
        var maxDepth = 0;
        while (pending.length) {
            var item = pending.pop();
            var node = model.nodes[item.index];
            maxDepth = Math.max(maxDepth, item.depth);
            if (node.left === -1) {
                positions[item.index] = { x: item.depth * 250 + 24, y: leaf++ * 90 + 24 };
            } else if (!item.visited) {
                pending.push({ index: item.index, depth: item.depth, visited: true });
                pending.push({ index: node.right, depth: item.depth + 1, visited: false });
                pending.push({ index: node.left, depth: item.depth + 1, visited: false });
            } else {
                positions[item.index] = { x: item.depth * 250 + 24, y: (positions[node.left].y + positions[node.right].y) / 2 };
            }
        }
        this.dimensions = { width: maxDepth * 250 + 260, height: Math.max(1, leaf) * 90 + 24 };
        this.svg.setAttribute('viewBox', '0 0 ' + this.dimensions.width + ' ' + this.dimensions.height);
        var connections = svgElement('g', { 'class': 'tree-connections' });
        var nodes = svgElement('g');
        model.nodes.forEach(function (node, index) {
            var point = positions[index];
            if (node.left !== -1) {
                [node.left, node.right].forEach(function (child, branch) {
                    var target = positions[child];
                    var group = svgElement('g', { 'class': 'tree-edge', 'data-child': child });
                    group.appendChild(svgElement('path', { d: 'M ' + (point.x + 200) + ' ' + (point.y + 30) + ' C ' + (point.x + 225) + ' ' + (point.y + 30) + ', ' + (target.x - 25) + ' ' + (target.y + 30) + ', ' + target.x + ' ' + (target.y + 30) }));
                    group.appendChild(svgElement('text', { x: point.x + 206, y: point.y + (branch ? 53 : 18) }, branch ? 'F' : 'T'));
                    connections.appendChild(group);
                    this.edges[child] = group;
                }, this);
            }
            var label = node.left === -1 ? node.action : model.feature_names[node.feature];
            var condition = node.left === -1 ? 'Predicted action' : '≤ ' + Number(node.threshold.toPrecision(6));
            var group = svgElement('g', { 'class': 'tree-node' + (node.left === -1 ? ' leaf action-' + node.action : ''), 'data-node': index, transform: 'translate(' + point.x + ' ' + point.y + ')' });
            group.appendChild(svgElement('title', {}, 'Node ' + index + ': ' + label + (node.left === -1 ? '' : ' <= ' + node.threshold)));
            group.appendChild(svgElement('rect', { width: 200, height: 60, rx: 10 }));
            group.appendChild(svgElement('text', { x: 12, y: 23, 'class': 'node-label', textLength: label.length > 24 ? 176 : undefined, lengthAdjust: 'spacingAndGlyphs' }, label));
            group.appendChild(svgElement('text', { x: 12, y: 44, 'class': 'node-condition' }, condition + ' · #' + index));
            nodes.appendChild(group);
            this.nodes[index] = group;
        }, this);
        this.svg.append(connections, nodes);
        this.fit();
        document.getElementById('tree-state').textContent = name === 'Default model preview' ? 'Preview' : 'Ready';
    };
    Dashboard.prototype.setScale = function (scale) {
        var min = Math.min(0.02, this.fitScale || 0.02);
        this.scale = Math.max(min, Math.min(3, scale));
        this.svg.setAttribute('width', this.dimensions.width * this.scale);
        this.svg.setAttribute('height', this.dimensions.height * this.scale);
        document.getElementById('tree-zoom-level').textContent = (this.scale * 100).toFixed(1) + '%';
    };
    Dashboard.prototype.fit = function () {
        if (!this.model) return;
        this.fitScale = Math.min((this.viewport.clientWidth - 16) / this.dimensions.width, (this.viewport.clientHeight - 16) / this.dimensions.height, 1);
        this.fitted = true;
        this.setScale(Math.max(0.0001, this.fitScale));
        this.viewport.scrollLeft = 0;
        this.viewport.scrollTop = 0;
    };
    Dashboard.prototype.zoom = function (factor) {
        if (!this.model) return;
        var x = (this.viewport.scrollLeft + this.viewport.clientWidth / 2) / this.scale;
        var y = (this.viewport.scrollTop + this.viewport.clientHeight / 2) / this.scale;
        this.fitted = false;
        this.setScale(this.scale * factor);
        this.viewport.scrollLeft = x * this.scale - this.viewport.clientWidth / 2;
        this.viewport.scrollTop = y * this.scale - this.viewport.clientHeight / 2;
    };
    Dashboard.prototype.decision = function (decision) {
        if (!this.model) return;
        this.highlighted.forEach(function (index) {
            this.nodes[index].classList.remove('on-path');
            if (this.edges[index]) this.edges[index].classList.remove('on-path');
        }, this);
        decision.path.forEach(function (index) {
            this.nodes[index].classList.add('on-path');
            if (this.edges[index]) this.edges[index].classList.add('on-path');
        }, this);
        this.highlighted = decision.path.slice();
        this.lastDecision = { action: decision.action, path: decision.path.slice() };
        this.svg.classList.add('is-evaluating');
        document.getElementById('tree-state').textContent = 'Live';
        document.getElementById('tree-state').classList.add('is-live');
        var summary = document.getElementById('decision-summary');
        summary.className = 'action-' + decision.action;
        summary.textContent = decision.action.toUpperCase() + ' · ' + decision.path.length + ' nodes visited';
        document.getElementById('decision-path').textContent = decision.path.map(function (index) { return '#' + index; }).join(' → ');
    };
    Dashboard.prototype.pause = function () {
        this.svg.classList.remove('is-evaluating');
        document.getElementById('tree-state').classList.remove('is-live');
        if (this.lastDecision) document.getElementById('tree-state').textContent = 'Paused';
    };
    document.addEventListener('DOMContentLoaded', function () { window.liveDashboard = new Dashboard(); });
})();
