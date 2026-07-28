# Logos de Sponsor e Apoio nos cards

## Objetivo

Apresentar os logos de Sponsor e Apoio como assinaturas discretas nos cards
das câmaras, sem ocuparem uma faixa larga nem alterarem a altura útil do card.

## Apresentação

- Cada logo fica junto do nome da entidade a que pertence.
- Sponsor e Apoio usam o mesmo tratamento visual.
- A área máxima visível é `110 × 24 px`.
- A proporção original é preservada com `width: auto`, `height: auto` e
  `object-fit: contain`.
- Não é acrescentado fundo, corte ou deformação.
- Nomes e links continuam visíveis e funcionais.

## Implementação

O HTML já atribui classes próprias às imagens:
`.camera-sponsor-logo` e `.camera-support-logo`. As regras antigas de
`.camera-sponsor-logo`, herdadas do contentor que existia antes da
generalização Sponsor/Apoio, serão substituídas por uma regra comum aplicada
diretamente às duas imagens.

Não serão alterados dados, caminhos dos assets, ecrã de detalhe, modo TV ou
fullscreen.

## Validação

Um teste de regressão verificará no `index.html` que:

- as duas classes partilham a regra de dimensão;
- `max-width` é `110px` e `max-height` é `24px`;
- as propriedades antigas de posicionamento absoluto não se aplicam às
  imagens dos cards.

Depois serão executados todos os testes do Site.
