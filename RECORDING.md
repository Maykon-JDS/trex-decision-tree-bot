# Record gameplay

Open `index.html` in a browser. No dependencies need to be installed.
For a local server, run `python -m http.server 8000` in this directory and open [localhost:8000](http://localhost:8000).

1. Click **Start recording**.
2. Press Space to play. Use Space or the up arrow to jump and the down arrow to duck or fall faster during a jump. Releasing the jump button also affects jump height.
3. Play as many games as you like. Recording continues after a collision and restart.
4. Click **Stop recording**, then **Download CSV**.

The **Recording stream** panel displays the latest 100 samples in real time, newest first, with all CSV columns. Scroll horizontally to inspect every field. Stopping recording freezes the display; resuming continues the existing history. The 100-row limit affects only the display: CSV downloads still include every recorded sample. The panel appears beside the game on wide screens and below it on smaller screens.

The file includes all samples collected in the current tab, even if you stop and restart recording. Downloading does not clear samples. Data is held in memory: download it before refreshing or closing the page. You can download while recording; the file contains all data collected up to that point.

## CSV format

The file uses commas as delimiters, periods as decimal separators and UTF-8 encoding. The first row contains column names; each subsequent row is a sample. No images or video are recorded: recordings contain game states and commands.

To load the file in Python with the optional pandas library:

```python
import pandas as pd

data = pd.read_csv("trex-games.csv")
```

| Sample field | Meaning |
| --- | --- |
| `recording_id`, `episode_id`, `sample` | Recording, game segment and sample identifiers. A new game or restarting recording begins a new segment. |
| `time_ms` | Elapsed simulation time within the segment, excluding pauses. |
| `source` | `frame`, `input_down`, `input_up` or `game_over`. |
| `speed`, `distance` | Game speed in pixels per reference frame (60 FPS), and distance traveled in pixels before conversion to the displayed score. |
| `trex_x`, `trex_y`, `trex_jump_velocity` | T-Rex position and vertical velocity. The Y axis increases downward. |
| `jumping`, `ducking` | Current T-Rex state, as 0/1. |
| `obstacle_type` | Nearest obstacle not yet passed: `CACTUS_SMALL`, `CACTUS_LARGE`, `PTERODACTYL` or `NONE`. |
| `obstacle_distance` | Horizontal distance in pixels between the front of the T-Rex and the obstacle's left edge. Negative values indicate horizontal overlap. |
| `obstacle_y`, `obstacle_width`, `obstacle_height` | Obstacle vertical position and dimensions in pixels. |
| `obstacle_speed` | Obstacle speed, including the additional speed offset for birds. |
| `jump_pressed`, `duck_pressed` | Held commands, as 0/1. Both can be active. |
| `action` | Command: `run`, `jump` or `duck`. If both commands are held, `duck` takes priority; the previous two fields preserve the complete input state. |
| `terminal` | 1 for the collision sample, where `action` is empty; 0 otherwise. |

When no obstacle is available, its type is `NONE` and its measurements are empty.

Periodic observations are collected before the physics update, at most once every 50 ms (approximately 20 Hz, depending on the frame rate). Input changes generate additional samples immediately, before the action is applied to physics. `action` represents the held command rather than the animation: the dinosaur can remain in midair with `action` set to `run` after you release jump.

To train the tree with **run/duck/jump** outputs, see [TRAINING.md](TRAINING.md). The model learns actions from the game state. The interface compares depths using validation, displays the diagram and exports `model.json`. Load this JSON on the game page and enable the **Autoplayer** to let the tree play.

## Verification

With Node.js installed, run `node --test tests/recorder.test.cjs`.

Original game: [wayou/t-rex-runner](https://github.com/wayou/t-rex-runner). The original license is preserved in `LICENSE`.
