import csv
import tempfile
import unittest
from pathlib import Path

from train_tree import ACTIONS, REQUIRED_COLUMNS, load_data, select_depth, train


def sample_row(episode=1, terminal=0, **changes):
    row = dict.fromkeys(REQUIRED_COLUMNS, "0")
    row.update(recording_id="test", episode_id=str(episode), terminal=str(terminal),
               obstacle_type="CACTUS_SMALL", action="run", speed="6",
               trex_x="50", trex_y="93", obstacle_distance="100")
    row.update(changes)
    return row


def write_csv(path, rows):
    fields = list(dict.fromkeys(key for row in rows for key in row))
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


class TrainingTest(unittest.TestCase):
    def test_learns_actions_without_using_commands_as_features(self):
        rows = [sample_row(jump_pressed="0", duck_pressed="0"),
                sample_row(action="jump", jump_pressed="1", duck_pressed="0"),
                sample_row(action="duck", jump_pressed="0", duck_pressed="1"),
                sample_row(obstacle_distance="5"), sample_row(terminal=1, action="")]
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "game.csv"
            write_csv(path, rows)
            features, labels, originals = load_data([path])
        self.assertEqual(labels, ["run", "jump", "duck"])
        self.assertEqual(len(originals), 3)
        for feature in features:
            for leaked in ("action", "jump_pressed", "duck_pressed", "terminal", "episode_id", "source"):
                self.assertNotIn(leaked, feature)

    def test_collision_in_another_episode_does_not_discard_action(self):
        rows = [sample_row(), sample_row(episode=2, terminal=1, action=""),
                sample_row(episode=3, action="jump", obstacle_distance="")]
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "games.csv"
            write_csv(path, rows)
            features, labels, _ = load_data([path])
        self.assertEqual(labels, ["run", "jump"])
        self.assertEqual(features[1]["obstacle_distance"], -1.0)

    def test_requests_more_actions_when_only_running_is_recorded(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "game.csv"
            write_csv(path, [sample_row(), sample_row()])
            with self.assertRaisesRegex(ValueError, "two different actions"):
                load_data([path])

    def test_compares_depths_and_can_select_a_deeper_tree(self):
        features = [{"obstacle_distance": i // 3} for i in range(240)]
        labels = [ACTIONS[(i // 15) % 3] for i in range(240)]
        selected, results, report = select_depth(features, labels, 16)
        self.assertGreater(selected, 2)
        best = next(result for result in results if result["depth"] == selected)
        self.assertGreater(best["validation_macro_f1"], results[0]["validation_macro_f1"])
        self.assertIn("not an independent test", report)

    def test_insufficient_data_does_not_fabricate_validation_metrics(self):
        selected, results, report = select_depth(
            [{"speed": 6}, {"speed": 7}], ["run", "jump"], 12
        )
        self.assertEqual(selected, 12)
        self.assertEqual(results, [])
        self.assertIn("Too few samples", report)

    def test_training_generates_three_actions_and_diagrams(self):
        from joblib import load

        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            path = directory / "game.csv"
            write_csv(path, [sample_row(), sample_row(action="jump", obstacle_distance="80"),
                                sample_row(action="duck", obstacle_type="PTERODACTYL"),
                                sample_row(obstacle_distance="5"), sample_row(terminal=1, action="")])
            output = directory / "output"
            model = train([path], output, show=False)
            self.assertEqual(set(model.classes_), {"run", "duck", "jump"})
            for name in ("tree.png", "tree.svg", "model.joblib", "model.json", "labeled_data.csv", "report.txt", "depth_comparison.csv"):
                self.assertGreater((output / name).stat().st_size, 0)
            self.assertEqual((output / "tree.png").read_bytes()[:8], b"\x89PNG\r\n\x1a\n")
            saved = load(output / "model.joblib")
            self.assertEqual(saved["target"], "action")
            self.assertNotIn("jump_pressed", saved["encoder"].get_feature_names_out())


if __name__ == "__main__":
    unittest.main()
