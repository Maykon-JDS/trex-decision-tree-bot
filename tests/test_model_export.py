import json
from pathlib import Path
import subprocess
import tempfile
import unittest

from sklearn.feature_extraction import DictVectorizer
from sklearn.tree import DecisionTreeClassifier

from export_model import export_model


class ModelExportTest(unittest.TestCase):
    def test_javascript_predictions_match_sklearn(self):
        features = [
            {"obstacle_distance": float(distance), "obstacle_type": kind, "speed": 6.0}
            for kind in ("NONE", "CACTUS_SMALL", "PTERODACTYL")
            for distance in range(-1, 301, 5)
        ]
        labels = ["run" if f["obstacle_distance"] > 100 or f["obstacle_type"] == "NONE"
                  else "duck" if f["obstacle_type"] == "PTERODACTYL" else "jump" for f in features]
        encoder = DictVectorizer(sparse=False)
        model = DecisionTreeClassifier(random_state=42).fit(encoder.fit_transform(features), labels)
        probes = features + [{"obstacle_distance": -1.0, "obstacle_type": "UNKNOWN", "speed": 7.5}]
        # Include values extremely close to each split to verify float32 rounding.
        probes += [{"obstacle_distance": float(threshold) + offset, "obstacle_type": "CACTUS_SMALL", "speed": 6.0}
                   for threshold in model.tree_.threshold if threshold > 0
                   for offset in (-1e-7, 0, 1e-7)]
        expected = model.predict(encoder.transform(probes)).tolist()
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "model.json"
            export_model(model, encoder, path)
            payload = {"model": json.loads(path.read_text(encoding="utf-8")), "states": probes}
            code = "const fs=require('node:fs'); const tree=require('./tree-model.js'); const d=JSON.parse(fs.readFileSync(0,'utf8')); tree.validate(d.model); console.log(JSON.stringify(d.states.map(s=>tree.predict(d.model,s))));"
            result = subprocess.run(["node", "-e", code], input=json.dumps(payload), text=True,
                                    cwd=Path(__file__).resolve().parents[1], capture_output=True, check=True)
        self.assertEqual(json.loads(result.stdout), expected)

    def test_rejects_legacy_binary_outcome_model(self):
        encoder = DictVectorizer(sparse=False)
        model = DecisionTreeClassifier().fit(encoder.fit_transform([{"speed": 6}, {"speed": 7}]), ["won", "lost"])
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaisesRegex(ValueError, "run, duck or jump"):
                export_model(model, encoder, Path(temp) / "model.json")
