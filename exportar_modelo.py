"""Exporta um modelo de ações já treinado para o jogador JavaScript."""

import argparse
import json
from pathlib import Path


def exportar_modelo(model, encoder, path):
    classes = list(model.classes_)
    if not classes or not set(classes) <= {"run", "duck", "jump"}:
        raise ValueError("O modelo precisa prever run, duck ou jump. Treine novamente o modelo de ações.")
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
    parser.add_argument("modelo", type=Path, help="Caminho do modelo.joblib treinado neste projeto")
    parser.add_argument("--saida", type=Path, help="Caminho do JSON (padrão: ao lado do modelo)")
    args = parser.parse_args()
    try:
        bundle = load(args.modelo)
        destination = args.saida or args.modelo.with_suffix(".json")
        exportar_modelo(bundle["model"], bundle["encoder"], destination)
        print(f"Modelo para o jogo: {destination.resolve()}")
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, f"Erro: {error}\n")


if __name__ == "__main__":
    main()
