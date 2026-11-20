import csv
import tempfile
import unittest
from pathlib import Path

from treinar_arvore import ACTIONS, REQUIRED_COLUMNS, carregar_dados, selecionar_profundidade, treinar


def exemplo(episode=1, terminal=0, **changes):
    row = dict.fromkeys(REQUIRED_COLUMNS, "0")
    row.update(recording_id="teste", episode_id=str(episode), terminal=str(terminal),
               obstacle_type="CACTUS_SMALL", action="run", speed="6",
               trex_x="50", trex_y="93", obstacle_distance="100")
    row.update(changes)
    return row


def escrever_csv(path, rows):
    fields = list(dict.fromkeys(key for row in rows for key in row))
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


class TreinamentoTest(unittest.TestCase):
    def test_aprende_acoes_sem_usar_comandos_como_entrada(self):
        rows = [exemplo(jump_pressed="0", duck_pressed="0"),
                exemplo(action="jump", jump_pressed="1", duck_pressed="0"),
                exemplo(action="duck", jump_pressed="0", duck_pressed="1"),
                exemplo(obstacle_distance="5"), exemplo(terminal=1, action="")]
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "partida.csv"
            escrever_csv(path, rows)
            features, labels, originals = carregar_dados([path])
        self.assertEqual(labels, ["run", "jump", "duck"])
        self.assertEqual(len(originals), 3)
        for feature in features:
            for leaked in ("action", "jump_pressed", "duck_pressed", "terminal", "episode_id", "source"):
                self.assertNotIn(leaked, feature)

    def test_colisao_de_outra_partida_nao_descarta_acao(self):
        rows = [exemplo(), exemplo(episode=2, terminal=1, action=""),
                exemplo(episode=3, action="jump", obstacle_distance="")]
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "partidas.csv"
            escrever_csv(path, rows)
            features, labels, _ = carregar_dados([path])
        self.assertEqual(labels, ["run", "jump"])
        self.assertEqual(features[1]["obstacle_distance"], -1.0)

    def test_pede_mais_acoes_quando_so_ha_corrida(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "partida.csv"
            escrever_csv(path, [exemplo(), exemplo()])
            with self.assertRaisesRegex(ValueError, "duas ações"):
                carregar_dados([path])

    def test_compara_profundidades_e_pode_escolher_arvore_mais_profunda(self):
        features = [{"obstacle_distance": i // 3} for i in range(240)]
        labels = [ACTIONS[(i // 15) % 3] for i in range(240)]
        selected, results, report = selecionar_profundidade(features, labels, 16)
        self.assertGreater(selected, 2)
        best = next(result for result in results if result["profundidade"] == selected)
        self.assertGreater(best["f1_macro_validacao"], results[0]["f1_macro_validacao"])
        self.assertIn("não é um teste independente", report)

    def test_dados_insuficientes_nao_inventam_metrica_de_validacao(self):
        selected, results, report = selecionar_profundidade(
            [{"speed": 6}, {"speed": 7}], ["run", "jump"], 12
        )
        self.assertEqual(selected, 12)
        self.assertEqual(results, [])
        self.assertIn("Poucos exemplos", report)

    def test_treinamento_gera_tres_acoes_e_desenho(self):
        from joblib import load

        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            path = directory / "partida.csv"
            escrever_csv(path, [exemplo(), exemplo(action="jump", obstacle_distance="80"),
                                exemplo(action="duck", obstacle_type="PTERODACTYL"),
                                exemplo(obstacle_distance="5"), exemplo(terminal=1, action="")])
            output = directory / "saida"
            model = treinar([path], output, show=False)
            self.assertEqual(set(model.classes_), {"run", "duck", "jump"})
            for name in ("arvore.png", "arvore.svg", "modelo.joblib", "modelo.json", "dados_rotulados.csv", "relatorio.txt", "comparacao_profundidades.csv"):
                self.assertGreater((output / name).stat().st_size, 0)
            self.assertEqual((output / "arvore.png").read_bytes()[:8], b"\x89PNG\r\n\x1a\n")
            saved = load(output / "modelo.joblib")
            self.assertEqual(saved["target"], "action")
            self.assertNotIn("jump_pressed", saved["encoder"].get_feature_names_out())


if __name__ == "__main__":
    unittest.main()
