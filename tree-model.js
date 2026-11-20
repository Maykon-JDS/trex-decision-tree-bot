(function (root) {
    'use strict';
    var numeric = ['speed', 'trex_x', 'trex_y', 'trex_jump_velocity', 'jumping', 'ducking',
        'obstacle_distance', 'obstacle_y', 'obstacle_width', 'obstacle_height', 'obstacle_speed'];
    var actions = ['run', 'duck', 'jump'];

    function validate(model) {
        function invalid() { throw new Error('Modelo incompatível. Selecione o modelo.json exportado pelo treinamento de ações.'); }
        if (!model || model.format !== 'trex-decision-tree' || model.version !== 1 ||
            model.target !== 'action' || model.input_schema !== 1 || model.interval_ms !== 50) invalid();
        if (!Array.isArray(model.classes) || !model.classes.length ||
            new Set(model.classes).size !== model.classes.length ||
            model.classes.some(function (value) { return actions.indexOf(value) < 0; })) invalid();
        if (!Array.isArray(model.feature_names) || !model.feature_names.length || model.feature_names.length > 100 ||
            new Set(model.feature_names).size !== model.feature_names.length) invalid();
        model.feature_names.forEach(function (name) {
            if (typeof name !== 'string' || (numeric.indexOf(name) < 0 && !/^obstacle_type=.+$/.test(name))) invalid();
        });
        if (!Array.isArray(model.nodes) || !model.nodes.length || model.nodes.length > 10000) invalid();
        var visited = new Set();
        var pending = [0];
        while (pending.length) {
            var index = pending.pop();
            if (!Number.isInteger(index) || index < 0 || index >= model.nodes.length || visited.has(index)) invalid();
            visited.add(index);
            var node = model.nodes[index];
            if (!node) invalid();
            if (node.left === -1 && node.right === -1) {
                if (model.classes.indexOf(node.action) < 0) invalid();
            } else {
                if (!Number.isInteger(node.feature) || node.feature < 0 || node.feature >= model.feature_names.length ||
                    !Number.isFinite(node.threshold) || node.action !== null) invalid();
                pending.push(node.left, node.right);
            }
        }
        if (visited.size !== model.nodes.length) invalid();
        return model;
    }

    function predict(model, state) {
        var index = 0;
        for (var steps = 0; steps < model.nodes.length; steps++) {
            var node = model.nodes[index];
            if (node.left === -1) return node.action;
            var name = model.feature_names[node.feature];
            var value;
            if (name.indexOf('obstacle_type=') === 0) {
                value = Number(state.obstacle_type === name.slice('obstacle_type='.length));
            } else {
                value = state[name] == null ? -1 : state[name];
                if (!Number.isFinite(value)) throw new Error('Estado do jogo inválido: ' + name);
            }
            // sklearn converts input values to float32 before traversing the tree.
            index = Math.fround(value) <= node.threshold ? node.left : node.right;
        }
        throw new Error('Não foi possível percorrer a árvore.');
    }
    var api = { validate: validate, predict: predict };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.TrexTree = api;
})(typeof window !== 'undefined' ? window : globalThis);
