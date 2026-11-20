# Treinar uma árvore de ações

A árvore recebe o estado do jogo e prevê uma ação: **run**, **duck** ou **jump**. O CSV é lido com a biblioteca padrão do Python; não precisa de pandas.

## Interface gráfica

Dê dois cliques em `abrir_treinamento.bat`.

1. Clique em **Importar CSV…** e selecione um ou mais arquivos baixados do jogo.
2. Confira a prévia. O campo **Profundidade máxima** começa em 16 e aceita de 1 a 24.
3. Clique em **Treinar e desenhar árvore**.
4. Veja o desenho na aba **Árvore de decisão**, com zoom e barras de rolagem.
5. Consulte a aba **Relatório** para ver a comparação de profundidades e as métricas de cada ação.

Árvores com mais de 6 níveis têm uma prévia resumida em PNG para manter a interface legível. Clique em **Árvore completa (SVG)** para abrir o desenho inteiro, com todas as folhas. A pasta dos resultados preserva cada treinamento em uma subpasta própria.

## Entradas e respostas

As entradas incluem velocidade, posição e estado do T-Rex, distância, tipo, altura e dimensões do obstáculo. As respostas são os comandos humanos gravados em `action`:

- **run:** nenhum comando pressionado; mantém a corrida. Se estiver no ar, continua o salto após soltar o comando.
- **duck:** abaixar no chão ou acelerar a queda no ar.
- **jump:** comando de pular pressionado.

`action`, `jump_pressed` e `duck_pressed` não são usados como entrada: eles já revelam a resposta que a árvore deve aprender. Identificadores, `source`, `terminal`, tempo e distância total percorrida também ficam fora das características do modelo.

Registros de colisão e o último registro imediatamente antes de cada colisão são descartados. O filtro remove uma falha imediata observada, mas não prova que todas as outras ações sejam seguras: a árvore imita suas jogadas e também pode aprender seus erros. Grave boas jogadas com as três ações. Se uma ação não aparecer nos dados, o relatório avisa que a árvore não poderá aprendê-la. São necessárias pelo menos duas ações diferentes para iniciar o treinamento.

Os CSVs continuam sendo reunidos em um conjunto único, sem separar o treinamento por partida. Os identificadores servem apenas para não descartar uma ação em função de uma colisão de outro trecho. Medidas de obstáculo vazias são preenchidas com -1; o tipo `NONE` representa ausência de obstáculo. Categorias são codificadas automaticamente.

## Profundidade e precisão

Quando há pelo menos 15 exemplos válidos e dois exemplos de cada ação presente, o programa reserva aproximadamente 20% das amostras para validação estratificada e compara profundidades de 2, 4, 6, 8, 12, 16, 20 e 24, respeitando o limite escolhido. O próprio limite também é comparado.

A escolha usa o maior **F1 macro**, que considera cada ação igualmente e evita valorizar somente a corrida, geralmente mais frequente. Em caso de empate, vence a menor profundidade. O relatório também mostra a **acurácia**, a proporção total de comandos previstos corretamente. O treinamento equilibra o peso das classes e limita a árvore a 128 folhas.

Uma profundidade maior só é escolhida se melhorar o F1 macro na validação. Aumentar o limite não garante uma melhora. Com poucos exemplos, o programa usa o limite informado e avisa que não foi possível comparar profundidades.

Depois da comparação, o modelo final é treinado novamente com todos os exemplos válidos. O relatório identifica separadamente a validação e o ajuste final aos próprios dados. A validação é usada para escolher a profundidade, portanto não é um teste independente. Como a divisão mistura amostras das mesmas partidas, registros vizinhos podem produzir métricas otimistas. A precisão de imitar os comandos não mede o tempo de sobrevivência no jogo.

## Arquivos gerados

- `arvore.png`: prévia do desenho (até 6 níveis).
- `arvore.svg`: árvore completa, que permite ampliar.
- `dados_rotulados.csv`: exemplos usados, `resultado` (ação humana) e `previsao`.
- `comparacao_profundidades.csv`: acurácia e F1 macro de cada profundidade comparada. Com dados insuficientes, contém apenas o cabeçalho.
- `relatorio.txt`: comparação, contagens e métricas.
- `modelo.joblib`: árvore final, codificador e informações das entradas e da ação alvo.
- `modelo.json`: versão da árvore para carregar no jogo e executar diretamente no navegador.

Cada caixa do desenho contém uma condição: siga à esquerda quando for verdadeira e à direita quando for falsa. `class` indica a ação prevista. `value` mostra a distribuição ponderada das classes, na ordem de `model.classes_`.

## Modelo de exemplo

A pasta `exemplos/modelo-treinado/` inclui um treinamento pronto: `modelo.json` para usar no navegador, `modelo.joblib` para carregar em Python e `relatorio.txt` com as métricas. No jogo, clique em **Carregar modelo…**, selecione esse JSON e ative o jogador automático. O exemplo foi treinado com 1.756 amostras e prevê `run`, `duck` e `jump`. Há apenas cinco exemplos de `duck`, portanto essa ação tem pouca representação.

## Fazer a árvore jogar

1. Na interface de treinamento, use **Abrir jogo**, ou abra `index.html` no navegador.
2. Na seção **Jogador automático**, clique em **Carregar modelo…**.
3. Selecione `modelo.json` na pasta do treinamento e clique em **Ativar jogador automático**.

O jogo inicia a partida e consulta a árvore aproximadamente a cada 50 ms. Não é necessário executar um servidor Python durante a partida. A árvore recebe as mesmas características usadas na gravação; categorias e valores ausentes são tratados da mesma forma que no treinamento.

O painel mostra a ação atual. Clique em **Desativar jogador automático** ou pressione **Esc** para voltar ao controle manual. O jogo mantém a pausa ao trocar de aba. Após uma colisão, o jogador automático é desativado; ative-o novamente para começar outra tentativa.

A gravação manual é encerrada ao ativar a árvore, e o botão de iniciar gravação fica bloqueado até desativá-la. As amostras manuais já gravadas são preservadas e ainda podem ser baixadas. Isso evita misturar comandos do modelo com suas demonstrações.

### Usar um treinamento anterior

Treinamentos novos exportam `modelo.json` automaticamente. Para exportar um `modelo.joblib` de ações já treinado neste projeto, sem treinar novamente:

```powershell
.\.venv\Scripts\python.exe exportar_modelo.py "resultados\pasta-do-treinamento\modelo.joblib"
```

O JSON é criado ao lado do arquivo original. Modelos antigos que preveem `venceu/perdeu` precisam ser treinados novamente com saídas de ações.

## Pelo terminal

O ambiente e as dependências já estão instalados neste projeto. Para instalar em uma nova cópia:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Para treinar, troque pelo caminho do seu CSV:

```powershell
.\.venv\Scripts\python.exe treinar_arvore.py "C:\caminho\trex-partidas.csv" --profundidade 16
```

Informe mais de um caminho para juntar CSVs. Evite exportações sobrepostas da mesma gravação para não duplicar exemplos. Use `--sem-janela` para apenas salvar os arquivos na pasta `resultados`.

Referências: [árvores de decisão](https://scikit-learn.org/stable/modules/tree.html) e [divisão estratificada](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html).
