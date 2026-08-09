# Restaurar o layout dos logos de Sponsor

## Objetivo

Recuperar nos cards a presença visual que os logos de Sponsor tinham antes da
generalização Sponsor/Apoio, sem reintroduzir a expansão que ocupava quase toda
a largura do card.

## Apresentação

- O Sponsor mantém o rótulo, nome e link na área textual.
- Quando existe logo, este é apresentado num contentor próprio no canto
  inferior direito do card.
- O contentor do Sponsor tem no máximo `150 × 55 px`.
- A imagem interior tem no máximo `100%` da largura e `28 px` de altura.
- A imagem preserva a proporção com `width: auto`, `height: auto` e
  `object-fit: contain`.
- O Apoio permanece junto do respetivo nome, limitado a `110 × 24 px`.
- Quando coexistem Sponsor e Apoio, os dois continuam claramente separados.

## Implementação

`renderCameraAttribution` volta a permitir que o logo seja omitido na
atribuição textual. O card renderiza o Sponsor com texto inline e cria
separadamente o contentor visual `.camera-sponsor-logo` com uma imagem
interior. O Apoio continua a usar a imagem direta `.camera-support-logo`.

As regras CSS do Sponsor voltam ao padrão contentor + imagem. Não serão
alterados os dados, assets, ecrã de detalhe, modo TV ou fullscreen.

## Validação

Os testes verificam que o HTML do Sponsor contém o contentor e a imagem
interior, que o texto do Sponsor não duplica o logo e que os limites originais
do contentor e da imagem são mantidos. A suite completa do Site é executada
antes da integração.
