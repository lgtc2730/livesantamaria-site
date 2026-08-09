# Offline preview fallback

## Objetivo

Mostrar uma imagem útil no cartão de uma câmara em `testing` quando o stream
está offline e ainda não existe um snapshot operacional em `fallbackImage`.

## Regra de apresentação

O estado editorial e operacional não é alterado. Quando o player declara uma
câmara offline, o frontend escolhe a imagem pela seguinte prioridade:

1. `fallbackImage`, quando já existe um snapshot operacional;
2. `preview`, enquanto a câmara ainda não dispõe desse snapshot;
3. a imagem genérica já devolvida por `getPreview`.

O cartão mantém o badge `OFFLINE`. A utilização de `preview` é apenas visual:
não escreve nem sintetiza um valor para `fallbackImage`.

## Implementação

`setCardOffline` deve ativar `.fallback-media` sempre que a função de seleção
de imagem produzir uma origem válida, usando `fallbackImage || getPreview(cam)`.
Isto alinha o tratamento do erro HLS com a imagem que já é colocada no cartão
durante a sua renderização.

## Testes

Um teste de regressão deve demonstrar que:

- uma câmara offline sem `fallbackImage` mostra `preview`;
- uma câmara com ambos os campos continua a preferir `fallbackImage`;
- o estado visual permanece `OFFLINE`.

Não faz parte deste ajuste implementar a futura captura do snapshot
operacional.
