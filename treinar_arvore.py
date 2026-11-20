"""Treina uma árvore de ações run/duck/jump com os CSVs exportados pelo jogo."""

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


def carregar_dados(paths):
    """Usa o estado como entrada e o comando humano como rótulo.

    Descarta colisões e o último comando antes delas. Esse filtro remove uma
    falha imediata observada; não garante que os comandos restantes sejam ideais.
    """
    features, labels, original_rows = [], [], []
    for path in paths:
        with Path(path).open(encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
            if missing:
                raise ValueError(f"{path}: faltam colunas: {', '.join(sorted(missing))}")
            rows = list(reader)

        for row in rows:
            if row["terminal"] not in {"0", "1"}:
                raise ValueError(f"{path}: terminal deve ser 0 ou 1.")

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
                raise ValueError(f"{path}: ação inválida: {row['action']!r}.")

            try:
                example = {
                    name: float(row[name]) if row[name] else -1.0
                    for name in NUMERIC_FEATURES
                }
            except ValueError as error:
                raise ValueError(f"{path}: característica numérica inválida.") from error
            example.update({name: row[name] for name in CATEGORICAL_FEATURES})
            features.append(example)
            labels.append(row["action"])
            original_rows.append(row)

    if not features:
        raise ValueError("Nenhum exemplo válido. Grave mais ações antes de exportar o CSV.")
    if len(set(labels)) < 2:
        raise ValueError("Grave pelo menos duas ações diferentes entre run, duck e jump para treinar.")
    return features, labels, original_rows


def selecionar_profundidade(features, labels, max_depth):
    """Compara profundidades em uma única divisão estratificada de validação."""
    from sklearn.feature_extraction import DictVectorizer
    from sklearn.metrics import accuracy_score, classification_report, f1_score
    from sklearn.model_selection import train_test_split
    from sklearn.tree import DecisionTreeClassifier

    counts = Counter(labels)
    if len(labels) < 15 or min(counts.values()) < 2:
        return max_depth, [], (
            "Poucos exemplos por ação para comparar profundidades com validação. "
            f"Será usado o limite de {max_depth}. Grave mais exemplos de cada ação.\n"
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
        results.append({"profundidade": depth, "acuracia_validacao": accuracy, "f1_macro_validacao": f1})
        # Empates preservam a menor profundidade.
        if best is None or f1 > best[0] + 1e-9:
            best = (f1, depth)
            best_predictions = predictions
    report = (
        f"Comparação em validação: {len(train_indices)} exemplos para treinar e "
        f"{len(validation_indices)} para validar.\n"
        "Profundidade | Acurácia | F1 macro\n"
        + "".join(f"{r['profundidade']:12} | {r['acuracia_validacao']:.3f}    | {r['f1_macro_validacao']:.3f}\n" for r in results)
        + f"Profundidade selecionada: {best[1]} (maior F1 macro; menor profundidade no empate).\n\n"
        + classification_report(y_validation, best_predictions, labels=list(ACTIONS), digits=3, zero_division=0)
        + "\nValidação usada para escolher a profundidade; não é um teste independente. "
          "A divisão mistura amostras das partidas: registros vizinhos podem tornar as métricas otimistas.\n"
    )
    return best[1], results, report


def treinar(paths, output_dir, max_depth=16, show=True):
    import matplotlib

    if not show:
        matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from joblib import dump
    from sklearn.feature_extraction import DictVectorizer
    from sklearn.metrics import classification_report
    from sklearn.tree import DecisionTreeClassifier, plot_tree

    if not 1 <= max_depth <= 24:
        raise ValueError("Use profundidade máxima entre 1 e 24.")
    features, labels, original_rows = carregar_dados(paths)
    selected_depth, comparisons, validation_report = selecionar_profundidade(features, labels, max_depth)
    encoder = DictVectorizer(sparse=False)
    x = encoder.fit_transform(features)
    model = DecisionTreeClassifier(
        max_depth=selected_depth, max_leaf_nodes=128, class_weight="balanced", random_state=42
    )
    # Depois da seleção, o modelo final aproveita todos os exemplos válidos.
    model.fit(x, labels)
    predictions = model.predict(x)
    report = classification_report(labels, predictions, labels=list(ACTIONS), digits=3, zero_division=0)
    missing = set(ACTIONS) - set(labels)
    summary = f"Exemplos: {len(labels)} | " + " | ".join(f"{action}: {labels.count(action)}" for action in ACTIONS) + "\n"
    if missing:
        summary += f"Ações ausentes no CSV: {', '.join(sorted(missing))}. Grave essas ações para a árvore aprendê-las.\n"
    summary += validation_report
    summary += f"\nModelo final: profundidade real {model.get_depth()}, {model.get_n_leaves()} folhas.\n"
    summary += "Resultado nos próprios dados usados para ajustar o modelo final:\n" + report
    summary += "\nO modelo imita seus comandos. Acertar a ação gravada não garante sobreviver no jogo.\n"

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    dump({"encoder": encoder, "model": model, "target": "action", "schema_version": 2,
          "selected_depth": selected_depth, "numeric_features": NUMERIC_FEATURES,
          "categorical_features": CATEGORICAL_FEATURES}, output_dir / "modelo.joblib")
    from exportar_modelo import exportar_modelo
    exportar_modelo(model, encoder, output_dir / "modelo.json")
    fields = list(dict.fromkeys([*original_rows[0], "resultado", "previsao"]))
    with (output_dir / "dados_rotulados.csv").open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for row, label, prediction in zip(original_rows, labels, predictions):
            writer.writerow({**row, "resultado": label, "previsao": prediction})
    with (output_dir / "comparacao_profundidades.csv").open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["profundidade", "acuracia_validacao", "f1_macro_validacao"])
        writer.writeheader()
        writer.writerows(comparisons)

    drawing_options = dict(
        feature_names=list(encoder.get_feature_names_out()), class_names=list(model.classes_),
        filled=True, rounded=True, impurity=False, precision=2,
    )
    # A prévia tem até 6 níveis; o SVG mantém a árvore inteira e suas folhas.
    preview_depth = 6 if model.get_depth() > 6 else None
    fig, ax = plt.subplots(figsize=(max(18, min(48, model.get_n_leaves() * 1.8)), 16 if preview_depth else max(8, model.get_depth() * 2.2)))
    plot_tree(model, max_depth=preview_depth, fontsize=8, ax=ax, **drawing_options)
    title = "T-Rex: ação prevista — run / duck / jump"
    if preview_depth:
        title += "\nPrévia até o nível 6. Veja a árvore inteira em arvore.svg."
    ax.set_title(title, pad=18)
    fig.tight_layout()
    fig.savefig(output_dir / "arvore.png", dpi=120, bbox_inches="tight")
    full_fig, full_ax = plt.subplots(figsize=(max(20, min(160, model.get_n_leaves() * 1.8)), max(8, model.get_depth() * 2.0)))
    plot_tree(model, fontsize=8, ax=full_ax, **drawing_options)
    full_ax.set_title("T-Rex: árvore completa — run / duck / jump", pad=18)
    full_fig.tight_layout()
    full_fig.savefig(output_dir / "arvore.svg", bbox_inches="tight")
    plt.close(full_fig)
    (output_dir / "relatorio.txt").write_text(summary, encoding="utf-8")
    print(summary)
    print(f"Árvore e demais resultados salvos em: {output_dir.resolve()}")
    print(f"Para jogar automaticamente, carregue no jogo: {(output_dir / 'modelo.json').resolve()}")
    if show:
        plt.show()
    plt.close(fig)
    return model


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", nargs="+", type=Path, help="Um ou mais CSVs baixados do jogo")
    parser.add_argument("--saida", type=Path, default=Path("resultados"), help="Pasta dos resultados")
    parser.add_argument("--profundidade", type=int, default=16, help="Limite para comparar profundidades (padrão: 16)")
    parser.add_argument("--sem-janela", action="store_true", help="Salva o desenho sem abrir janela")
    args = parser.parse_args()
    if not 1 <= args.profundidade <= 24:
        parser.error("Use profundidade máxima entre 1 e 24.")
    try:
        treinar(args.csv, args.saida, args.profundidade, show=not args.sem_janela)
    except (ValueError, OSError) as error:
        parser.exit(1, f"Erro: {error}\n")
    except ModuleNotFoundError as error:
        parser.exit(1, f"Dependência ausente: {error.name}. Execute: python -m pip install -r requirements.txt\n")


if __name__ == "__main__":
    main()
