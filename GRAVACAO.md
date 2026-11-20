# Gravação de partidas

Abra `index.html` no navegador. Não é necessário instalar dependências.
Se preferir um servidor local, execute `python -m http.server 8000` nesta pasta e acesse http://localhost:8000.

1. Clique em **Iniciar gravação**.
2. Pressione Espaço para jogar. Use Espaço ou seta para cima para pular e seta para baixo para abaixar (ou acelerar a queda durante um salto). Soltar o botão de pulo também influencia a altura do salto.
3. Jogue quantas partidas quiser. A gravação continua depois de perder e reiniciar.
4. Clique em **Parar gravação** e **Baixar CSV**.

O arquivo inclui todas as amostras coletadas nesta aba, inclusive se você parar e ativar a gravação novamente. Baixar os dados não apaga as amostras. Os dados ficam em memória: baixe antes de atualizar ou fechar a página. É possível baixar durante a gravação; o arquivo contém os dados coletados até aquele momento.

## Formato do CSV

O arquivo usa vírgulas como separador, ponto como separador decimal e codificação UTF-8. A primeira linha contém os nomes das colunas; cada linha seguinte é uma amostra. Não há imagens ou vídeo: a gravação contém os estados e comandos do jogo.

Para carregar no Python:

```python
import pandas as pd

tabela = pd.read_csv("trex-partidas.csv")
```

| Campo de cada amostra | Significado |
| --- | --- |
| `recording_id`, `episode_id`, `sample` | Identificadores da coleta, trecho de partida e amostra. Uma nova partida ou reativação inicia um novo trecho. |
| `time_ms` | Tempo de simulação decorrido no trecho, sem o período em que o jogo está pausado. |
| `source` | `frame`, `input_down`, `input_up` ou `game_over`. |
| `speed`, `distance` | Velocidade do jogo em pixels por frame de referência (60 FPS) e distância percorrida em pixels, antes da conversão para o placar. |
| `trex_x`, `trex_y`, `trex_jump_velocity` | Posição e velocidade vertical do T-Rex. O eixo Y cresce para baixo. |
| `jumping`, `ducking` | Estado atual do T-Rex, em 0/1. |
| `obstacle_type` | Tipo do obstáculo mais próximo ainda não ultrapassado: `CACTUS_SMALL`, `CACTUS_LARGE`, `PTERODACTYL` ou `NONE`. |
| `obstacle_distance` | Distância horizontal em pixels entre a frente do T-Rex e a borda esquerda do obstáculo. Valores negativos indicam sobreposição horizontal. |
| `obstacle_y`, `obstacle_width`, `obstacle_height` | Posição vertical e dimensões do obstáculo em pixels. |
| `obstacle_speed` | Velocidade do obstáculo, incluindo o deslocamento adicional dos pássaros. |
| `jump_pressed`, `duck_pressed` | Comandos pressionados, em 0/1. Ambos podem estar ativos. |
| `action` | Comando: `run`, `jump` ou `duck`. Se ambos estiverem pressionados, `duck` tem prioridade; os dois campos anteriores preservam os comandos completos. |
| `terminal` | 1 na amostra de colisão, cujo `action` fica vazio; 0 nas demais. |

Sem obstáculo disponível, o tipo é `NONE` e suas medidas ficam vazias.

As observações periódicas são coletadas antes da atualização da física, no máximo uma vez a cada 50 ms (aproximadamente 20 Hz, dependendo da taxa de frames). Mudanças de comando geram amostras adicionais imediatamente, antes de aplicar a ação à física. `action` representa o comando pressionado, não a animação: o dinossauro pode continuar no ar com `action` igual a `run` depois de você soltar o pulo.

Para treinar a árvore com saídas **run/duck/jump**, veja [TREINAMENTO.md](TREINAMENTO.md). O modelo aprende a ação a partir do estado do jogo. A interface compara profundidades em validação, mostra o desenho e exporta `modelo.json`. Na página do jogo, carregue esse JSON e ative o **Jogador automático** para a árvore jogar.

## Verificação

Com Node.js instalado: `node --test tests/recorder.test.cjs`.

Origem do jogo: https://github.com/wayou/t-rex-runner. A licença original foi preservada em `LICENSE`.
