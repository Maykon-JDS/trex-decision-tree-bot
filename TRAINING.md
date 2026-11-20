# Train an action decision tree

The tree takes the game state as input and predicts an action: **run**, **duck** or **jump**. CSV files are read with Python's standard library; pandas is not required.

## Graphical interface

Double-click `open_training.bat`.

1. Click **Import CSV…** and select one or more files downloaded from the game.
2. Check the preview. **Maximum depth** defaults to 16 and accepts values from 1 to 24.
3. Click **Train and draw tree**.
4. Inspect the diagram in the **Decision tree** tab using zoom and scrollbars.
5. Open the **Report** tab to compare depths and view metrics for each action.

Trees deeper than 6 levels have a summarized PNG preview to keep the interface readable. Click **Full tree (SVG)** to open the complete diagram with every leaf. Each training run is saved in its own subdirectory under `results/`.

## Inputs and labels

Inputs include the T-Rex's speed, position and state, along with the nearest obstacle's distance, type, position and dimensions. Labels are the human commands recorded in `action`:

- **run:** no command held; keep running. In midair, continue the jump after the jump command is released.
- **duck:** crouch on the ground or fall faster in midair.
- **jump:** jump command held.

`action`, `jump_pressed` and `duck_pressed` are excluded from the inputs because they reveal the answer the tree should learn. Identifiers, `source`, `terminal`, elapsed time and total distance traveled are also excluded from model features.

Collision records and the last record immediately before each collision are discarded. This filter removes an observed immediate failure, but does not prove that every remaining action is safe: the tree imitates your gameplay and can also learn your mistakes. Record good gameplay with all three actions. If an action is missing from the data, the report warns that the tree cannot learn it. Training requires at least two different actions.

CSV files are combined into one dataset without splitting training by game. Identifiers only prevent a collision in a different game segment from causing an action to be discarded. Missing obstacle measurements are filled with -1; `NONE` represents the absence of an obstacle. Categories are encoded automatically.

## Depth and accuracy

With at least 15 valid samples and two samples of every action present, the program reserves approximately 20% of samples for stratified validation. It compares depths of 2, 4, 6, 8, 12, 16, 20 and 24 up to the selected limit. The limit itself is also compared.

Selection uses the highest **macro F1**, which gives each action equal importance instead of favoring the usually more frequent running action. Ties favor the shallower tree. The report also shows **accuracy**, the overall proportion of correctly predicted commands. Training balances class weights and limits the tree to 128 leaves.

A deeper tree is selected only if it improves validation macro F1. Increasing the limit does not guarantee improvement. With too few samples, the program uses the specified limit and reports that depth comparison was not possible.

After comparison, the final model is trained again on all valid samples. The report presents validation results separately from the final fit on the training data. Validation is used to select depth, so it is not an independent test. Because the split mixes samples from the same games, neighboring records can produce optimistic metrics. Command prediction accuracy does not measure survival time in the game.

## Generated files

- `tree.png`: diagram preview, up to 6 levels.
- `tree.svg`: complete tree diagram that can be enlarged.
- `labeled_data.csv`: samples used, their human action in `label`, and the model's `prediction`.
- `depth_comparison.csv`: validation accuracy and macro F1 for each compared depth. Contains only the header when there is insufficient data.
- `report.txt`: comparison, sample counts and metrics.
- `model.joblib`: final tree, encoder, input information and action target.
- `model.json`: exported tree for loading and running directly in the browser.

Each diagram box contains a condition: follow the left branch when it is true and the right branch when it is false. `class` indicates the predicted action. `value` shows the weighted class distribution in `model.classes_` order.

## Example model

The `examples/trained-model/` directory includes a ready-to-use trained model: `model.json` for the browser, `model.joblib` for Python and `report.txt` with its metrics. On the hosted game or a local HTTP server, click **Default model**, then **Enable autoplayer**. When opening `index.html` directly from disk, click **Load model…** and select the example JSON instead. The example was trained on 1,756 samples and predicts `run`, `duck` and `jump`. Only five samples represent `duck`, so this action has limited coverage.

## Let the tree play

1. Click **Open game** in the training interface, or open `index.html` in a browser.
2. In the **Autoplayer** section, click **Load model…**.
3. Select `model.json` from a training output directory and click **Enable autoplayer**.

The game starts and queries the tree approximately every 50 ms. A Python server is not required during gameplay. The tree receives the same features used during recording; categories and missing values are handled just as they are during training.

The panel displays the current action. Click **Disable autoplayer** or press **Esc** to return to manual control. The game pauses when you switch tabs. After a collision, the autoplayer is disabled; enable it again to start another attempt.

Enabling the tree stops manual recording and disables the recording button until the autoplayer is turned off. Previously recorded manual samples are preserved and can still be downloaded. This prevents model commands from being mixed with your demonstrations.

### Export an existing training run

New training runs export `model.json` automatically. To export an action model already trained with this project without retraining:

```powershell
.\.venv\Scripts\python.exe export_model.py "results\training-run\model.joblib"
```

The JSON is created next to the original file. Legacy models that predict win/loss outcomes must be retrained with action labels.

## Command line

Install the environment and dependencies in a fresh copy:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

On macOS or Linux, use `.venv/bin/python` instead of `.\.venv\Scripts\python.exe`. Launch the graphical interface with `python training_app.py` using the environment's Python interpreter.

To train, replace the example path with your CSV path:

```powershell
.\.venv\Scripts\python.exe train_tree.py "C:\path\trex-games.csv" --depth 16
```

Provide multiple paths to combine CSV files. Avoid overlapping exports from the same recording to prevent duplicate samples. Use `--no-window` to save output to `results/` without opening the diagram. Use `--output` to choose another output directory.

References: [decision trees](https://scikit-learn.org/stable/modules/tree.html) and [stratified splitting](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html).
