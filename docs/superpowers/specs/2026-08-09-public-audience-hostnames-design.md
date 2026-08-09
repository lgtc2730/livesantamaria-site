# Métricas de audiência nos dois hostnames públicos

## Problema

O Site público responde diretamente em `livesantamaria.org` e
`www.livesantamaria.org`, mas o cliente só envia eventos de audiência quando o
hostname é exatamente `www.livesantamaria.org`. Aceitar métricas no domínio
raiz guarda a preferência local sem produzir o evento consentido esperado.

## Decisão

O envio de métricas é permitido exclusivamente nos dois hostnames públicos:

- `livesantamaria.org`;
- `www.livesantamaria.org`.

Previews Pages, LAB, localhost e qualquer hostname desconhecido continuam sem
enviar eventos. Não se altera o modelo de consentimento, a sessão aleatória de
30 minutos, a deduplicação nem a retenção de 30 dias.

## Implementação e testes

A condição única de hostname será substituída por uma allowlist explícita e
imutável. Um teste de regressão deve primeiro falhar demonstrando que o domínio
raiz não envia o evento; depois deve passar para ambos os domínios públicos e
confirmar que um hostname desconhecido permanece bloqueado.

Após a alteração serão executados o teste dirigido, a suite completa do Site e
`git diff --check`. A correção será publicada primeiro em `lab`, validada no
preview e só depois poderá receber uma autorização própria para produção.

## Fora de âmbito

- redirecionamentos entre os dois domínios;
- métricas em previews ou LAB;
- alterações à API, à base D1, ao consentimento ou aos prazos de retenção;
- qualquer publicação em produção sem nova autorização.
