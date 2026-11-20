"""Export an already trained action model for the JavaScript player."""

import argparse
import json
from pathlib import Path


def export_model(model, encoder, path):
    classes = list(model.classes_)
    if not classes or not set(classes) <= {"run", "duck", "jump"}:
        raise ValueError("The model must predict run, duck or jump. Retrain the action model.")
    tree = model.tree_
    nodes = []
    for index in range(tree.node_count):
        leaf = int(tree.children_left[index]) == -1
        nodes.append({
            "left": int(tree.children_left[index]),
            "right": int(tree.children_right[index]),
            "feature": int(tree.feature[index]),
            "threshold": float(tree.threshold[index]),
            "action": str(classes[int(tree.value[index][0].argmax())]) if leaf else None,
        })
    data = {
        "format": "trex-decision-tree", "version": 1, "target": "action",
        "input_schema": 1, "interval_ms": 50, "classes": classes,
        "feature_names": list(encoder.get_feature_names_out()), "nodes": nodes,
    }
    Path(path).write_text(json.dumps(data, ensure_ascii=False, allow_nan=False, indent=2), encoding="utf-8")


def main():
    from joblib import load

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path, help="Path to a model.joblib file trained with this project")
    parser.add_argument("--output", type=Path, help="JSON output path (default: next to the model)")
    args = parser.parse_args()
    try:
        bundle = load(args.model)
        destination = args.output or args.model.with_suffix(".json")
        export_model(bundle["model"], bundle["encoder"], destination)
        print(f"Game model: {destination.resolve()}")
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, f"Error: {error}\n")


if __name__ == "__main__":
    main()
