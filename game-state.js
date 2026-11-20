(function (root) {
    'use strict';
    function read(runner) {
        var trex = runner.tRex;
        var width = trex.ducking ? trex.config.WIDTH_DUCK : trex.config.WIDTH;
        var obstacle = runner.horizon.obstacles.filter(function (item) {
            return item.xPos + item.width > trex.xPos;
        }).sort(function (a, b) { return a.xPos - b.xPos; })[0];
        return {
            speed: runner.currentSpeed,
            trex_x: trex.xPos, trex_y: trex.yPos,
            trex_jump_velocity: trex.jumpVelocity,
            jumping: Number(trex.jumping), ducking: Number(trex.ducking),
            obstacle_type: obstacle ? obstacle.typeConfig.type : 'NONE',
            obstacle_distance: obstacle ? obstacle.xPos - (trex.xPos + width) : null,
            obstacle_y: obstacle ? obstacle.yPos : null,
            obstacle_width: obstacle ? obstacle.width : null,
            obstacle_height: obstacle ? obstacle.typeConfig.height : null,
            obstacle_speed: obstacle ? runner.currentSpeed + obstacle.speedOffset : null
        };
    }
    var api = { read: read };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.TrexState = api;
})(typeof window !== 'undefined' ? window : globalThis);
