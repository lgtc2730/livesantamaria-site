# Label de câmaras em teste

## Objetivo

Evitar que uma câmara ainda em instalação ou validação pública pareça
avariada quando o stream não está disponível.

## Regra visual

Nos cartões do site, `operationalState: "testing"` tem prioridade sobre o
estado de conectividade apresentado ao visitante:

- o badge mostra sempre `EM TESTE`;
- se o stream estiver disponível, o vídeo pode ser reproduzido normalmente;
- se o stream estiver indisponível, o cartão mostra `fallbackImage` ou
  `preview`, segundo a regra de imagem offline existente;
- a falha do stream não substitui o badge por `OFFLINE`.

Para câmaras em `operationalState: "public"`, mantém-se o comportamento atual:
`AO VIVO` quando existe stream e `OFFLINE` quando este falha.

## Limites

Esta regra é apenas de apresentação no site público. Não altera
`healthState`, não mascara alertas no Control PWA e não escreve dados nos
ficheiros de câmaras.

## Testes

Os testes devem confirmar que:

- `setCardOffline` conserva `EM TESTE` numa câmara `testing`;
- a camada de preview/fallback continua a ser ativada;
- uma câmara `public` continua a receber o badge `OFFLINE`;
- o caminho de stream ativo não troca `EM TESTE` por `AO VIVO`.
