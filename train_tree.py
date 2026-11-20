"""Train a run/duck/jump decision tree using CSV files exported by the game."""

import argparse
import csv
from collections import Counter
import math
from pathlib import Path


NUMERIC_FEATURES = (
    "speed", "trex_x", "trex_y", "trex_jump_velocity", "jumping", "ducking",
    "obstacle_distance", "obstacle_y", "obstacle_width", "obstacle_height",
    "obstacle_speed",
)
CATEGORICAL_FEATURES = ("obstacle_type",)
ACTIONS = ("run", "duck", "jump")
REQUIRED_COLUMNS = {
    "recording_id", "episode_id", "terminal", "action", *NUMERIC_FEATURES, *CATEGORICAL_FEATURES
}


def load_data(paths):
    """Use the game state as input and the human command as the label.

    Discard collisions and the last command before each collision. This filter removes an
    observed immediate failure; it does not guarantee that the remaining commands are optimal.
    """
    features, labels, original_rows = [], [], []
    for path in paths:
        with Path(path).open(encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
            if missing:
                raise ValueError(f"{path}: missing columns: {', '.join(sorted(missing))}")
            rows = list(reader)

        for row in rows:
            if row["terminal"] not in {"0", "1"}:
                raise ValueError(f"{path}: terminal must be 0 or 1.")

        for index, row in enumerate(rows):
            if row["terminal"] == "1":
                continue
            next_row = rows[index + 1] if index + 1 < len(rows) else None
            immediate_collision = next_row is not None and next_row["terminal"] == "1" and all(
                row[key] == next_row[key] for key in ("recording_id", "episode_id")
            )
            if immediate_collision:
                continue
            if row["action"] not in {"run", "jump", "duck"}:
                raise ValueError(f"{path}: invalid action: {row['action']!r}.")

            try:
                example = {
                    name: float(row[name]) if row[name] else -1.0
                    for name in NUMERIC_FEATURES
                }
            except ValueError as error:
                raise ValueError(f"{path}: invalid numeric feature.") from error
            example.update({name: row[name] for name in CATEGORICAL_FEATURES})
            features.append(example)
            labels.append(row["action"])
            original_rows.append(row)

    if not features:
        raise ValueError("No valid samples. Record more actions before exporting the CSV.")
    if len(set(labels)) < 2:
        raise ValueError("Record at least two different actions among run, duck and jump to train.")
    return features, labels, original_rows


def select_depth(features, labels, max_depth):
    """Compare tree depths using a single stratified validation split."""
    from sklearn.feature_extraction import DictVectorizer
    from sklearn.metrics import accuracy_score, classification_report, f1_score
    from sklearn.model_selection import train_test_split
    from sklearn.tree import DecisionTreeClassifier

    counts = Counter(labels)
    if len(labels) < 15 or min(counts.values()) < 2:
        return max_depth, [], (
            "Too few samples per action to compare depths using validation. "
            f"The limit of {max_depth} will be used. Record more samples of each action.\n"
        )
    indices = list(range(len(labels)))
    train_indices, validation_indices = train_test_split(
        indices, test_size=max(len(counts), math.ceil(len(labels) * 0.2)),
        stratify=labels, random_state=42,
    )
    encoder = DictVectorizer(sparse=False)
    x_train = encoder.fit_transform([features[i] for i in train_indices])
    x_validation = encoder.transform([features[i] for i in validation_indices])
    y_train = [labels[i] for i in train_indices]
    y_validation = [labels[i] for i in validation_indices]
    candidates = sorted({depth for depth in (2, 4, 6, 8, 12, 16, 20, 24, max_depth) if depth <= max_depth})
    results = []
    best = None
    best_predictions = None
    for depth in candidates:
        candidate = DecisionTreeClassifier(
            max_depth=depth, max_leaf_nodes=128, class_weight="balanced", random_state=42
        ).fit(x_train, y_train)
        predictions = candidate.predict(x_validation)
        f1 = f1_score(y_validation, predictions, average="macro", zero_division=0)
        accuracy = accuracy_score(y_validation, predictions)
        results.append({"depth": depth, "validation_accuracy": accuracy, "validation_macro_f1": f1})
        # Break ties in favor of the shallower tree.
        if best is None or f1 > best[0] + 1e-9:
            best = (f1, depth)
            best_predictions = predictions
    report = (
        f"Validation comparison: {len(train_indices)} samples for training and "
        f"{len(validation_indices)} for validation.\n"
        "Depth        | Accuracy | Macro F1\n"
        + "".join(f"{r['depth']:12} | {r['validation_accuracy']:.3f}    | {r['validation_macro_f1']:.3f}\n" for r in results)
        + f"Selected depth: {best[1]} (highest macro F1; shallower tree on ties).\n\n"
        + classification_report(y_validation, best_predictions, labels=list(ACTIONS), digits=3, zero_division=0)
        + "\nValidation is used to select depth; this is not an independent test. "
          "The split mixes samples from the same games: neighboring records may make metrics optimistic.\n"
    )
    return best[1], results, report


def train(paths, output_dir, max_depth=16, show=True):
    import matplotlib

    if not show:
        matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from joblib import dump
    from sklearn.feature_extraction import DictVectorizer
    from sklearn.metrics import classification_report
    from sklearn.tree import DecisionTreeClassifier, plot_tree

    if not 1 <= max_depth <= 24:
        raise ValueError("Use a maximum depth between 1 and 24.")
    features, labels, original_rows = load_data(paths)
    selected_depth, comparisons, validation_report = select_depth(features, labels, max_depth)
    encoder = DictVectorizer(sparse=False)
    x = encoder.fit_transform(features)
    model = DecisionTreeClassifier(
        max_depth=selected_depth, max_leaf_nodes=128, class_weight="balanced", random_state=42
    )
    # After depth selection, fit the final model on all valid samples.
    model.fit(x, labels)
    predictions = model.predict(x)
    report = classification_report(labels, predictions, labels=list(ACTIONS), digits=3, zero_division=0)
    missing = set(ACTIONS) - set(labels)
    summary = f"Samples: {len(labels)} | " + " | ".join(f"{action}: {labels.count(action)}" for action in ACTIONS) + "\n"
    if missing:
        summary += f"Actions missing from the CSV: {', '.join(sorted(missing))}. Record these actions so the tree can learn them.\n"
    summary += validation_report
    summary += f"\nFinal model: actual depth {model.get_depth()}, {model.get_n_leaves()} leaves.\n"
    summary += "Results on the same data used to fit the final model:\n" + report
    summary += "\nThe model imitates your commands. Predicting the recorded action correctly does not guarantee survival in the game.\n"

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    dump({"encoder": encoder, "model": model, "target": "action", "schema_version": 2,
          "selected_depth": selected_depth, "numeric_features": NUMERIC_FEATURES,
          "categorical_features": CATEGORICAL_FEATURES}, output_dir / "model.joblib")
    from export_model import export_model
    export_model(model, encoder, output_dir / "model.json")
    fields = list(dict.fromkeys([*original_rows[0], "label", "prediction"]))
    with (output_dir / "labeled_data.csv").open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for row, label, prediction in zip(original_rows, labels, predictions):
            writer.writerow({**row, "label": label, "prediction": prediction})
    with (output_dir / "depth_comparison.csv").open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["depth", "validation_accuracy", "validation_macro_f1"])
        writer.writeheader()
        writer.writerows(comparisons)

    drawing_options = dict(
        feature_names=list(encoder.get_feature_names_out()), class_names=list(model.classes_),
        filled=True, rounded=True, impurity=False, precision=2,
    )
    # The preview shows up to 6 levels; the SVG preserves the full tree and its leaves.
    preview_depth = 6 if model.get_depth() > 6 else None
    fig, ax = plt.subplots(figsize=(max(18, min(48, model.get_n_leaves() * 1.8)), 16 if preview_depth else max(8, model.get_depth() * 2.2)))
    plot_tree(model, max_depth=preview_depth, fontsize=8, ax=ax, **drawing_options)
    title = "T-Rex: predicted action — run / duck / jump"
    if preview_depth:
        title += "\nPreview through level 6. See the full tree in tree.svg."
    ax.set_title(title, pad=18)
    fig.tight_layout()
    fig.savefig(output_dir / "tree.png", dpi=120, bbox_inches="tight")
    full_fig, full_ax = plt.subplots(figsize=(max(20, min(160, model.get_n_leaves() * 1.8)), max(8, model.get_depth() * 2.0)))
    plot_tree(model, fontsize=8, ax=full_ax, **drawing_options)
    full_ax.set_title("T-Rex: full decision tree — run / duck / jump", pad=18)
    full_fig.tight_layout()
    full_fig.savefig(output_dir / "tree.svg", bbox_inches="tight")
    plt.close(full_fig)
    (output_dir / "report.txt").write_text(summary, encoding="utf-8")
    print(summary)
    print(f"Tree and other results saved to: {output_dir.resolve()}")
    print(f"To play automatically, load this file in the game: {(output_dir / 'model.json').resolve()}")
    if show:
        plt.show()
    plt.close(fig)
    return model


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", nargs="+", type=Path, help="One or more CSV files downloaded from the game")
    parser.add_argument("--output", type=Path, default=Path("results"), help="Output directory")
    parser.add_argument("--depth", type=int, default=16, help="Maximum depth to compare (default: 16)")
    parser.add_argument("--no-window", action="store_true", help="Save the tree diagram without opening a window")
    args = parser.parse_args()
    if not 1 <= args.depth <= 24:
        parser.error("Use a maximum depth between 1 and 24.")
    try:
        train(args.csv, args.output, args.depth, show=not args.no_window)
    except (ValueError, OSError) as error:
        parser.exit(1, f"Error: {error}\n")
    except ModuleNotFoundError as error:
        parser.exit(1, f"Missing dependency: {error.name}. Run: python -m pip install -r requirements.txt\n")


if __name__ == "__main__":
    main()
