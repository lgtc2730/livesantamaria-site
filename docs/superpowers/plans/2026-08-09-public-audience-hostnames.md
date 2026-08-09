# Public Audience Hostnames Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar métricas consentidas nos dois hostnames públicos e continuar a bloqueá-las em qualquer outro hostname.

**Architecture:** O código de audiência do `index.html` e a função Pages consultam allowlists com os mesmos dois hostnames públicos. O teste existente executa o cliente real em `vm` e encaminha o pedido para o handler real, cobrindo domínio raiz, `www` e hostname desconhecido até à escrita D1.

**Tech Stack:** HTML/JavaScript do Site, Node.js test runner, `node:vm`.

## Global Constraints

- Permitir apenas `livesantamaria.org` e `www.livesantamaria.org`.
- Manter previews Pages, LAB, localhost e hostnames desconhecidos sem eventos.
- Não alterar consentimento, sessão de 30 minutos, deduplicação, payload da API,
  schema D1 ou retenção de 30 dias.
- Publicar primeiro em `lab`; produção exige autorização própria posterior.

---

### Task 1: Allowlist dos hostnames públicos

**Files:**
- Modify: `tests/audience-event.test.mjs`
- Modify: `index.html`
- Modify: `functions/api/audience/event.js`

**Interfaces:**
- Consumes: `loadBrowserAudience(fetchImpl, initialStorage, hostname)` no teste.
- Produces: allowlists explícitas com os mesmos dois hostnames no cliente e no
  handler, usadas antes do `fetch` e antes da escrita D1.

- [ ] **Step 1: Escrever o teste de regressão**

Parametrizar `loadBrowserAudience` com terceiro argumento, por omissão
`"www.livesantamaria.org"`. Adicionar primeiro um teste integrado que encaminha
o pedido do domínio raiz para `onRequestPost` e exige resposta 200 e uma linha
D1; o comportamento atual deve devolver 204 e zero linhas. Manter também o
teste de cliente para ambos os hostnames e para um preview bloqueado.

```js
test("audience events are limited to both public hostnames", async () => {
  for (const hostname of ["livesantamaria.org", "www.livesantamaria.org"]) {
    let requests = 0;
    const browser = await loadBrowserAudience(async () => {
      requests += 1;
      return new Response(null, { status: 200 });
    }, { "lvsm-audience-consent-v1": "accepted" }, hostname);

    await browser.sendAudienceEvent("visit");
    assert.equal(requests, 1, hostname);
  }

  let previewRequests = 0;
  const preview = await loadBrowserAudience(async () => {
    previewRequests += 1;
  }, { "lvsm-audience-consent-v1": "accepted" }, "preview.pages.dev");

  await preview.sendAudienceEvent("visit");
  assert.equal(previewRequests, 0);
});
```

- [ ] **Step 2: Verificar RED**

Executar:

```powershell
node --test tests/audience-event.test.mjs
```

Esperado: o teste integrado do domínio raiz falha com status 204 e zero linhas
na D1.

- [ ] **Step 3: Implementar a alteração mínima**

Junto às constantes de audiência em `index.html`, adicionar:

```js
const PUBLIC_AUDIENCE_HOSTNAMES = new Set([
  "livesantamaria.org",
  "www.livesantamaria.org"
]);
```

Em `sendAudienceEvent`, substituir a comparação única por:

```js
if (
  !PUBLIC_AUDIENCE_HOSTNAMES.has(location.hostname) ||
  getAudienceConsent() !== "accepted"
) {
  return;
}
```

Em `functions/api/audience/event.js`, substituir a igualdade única por uma
allowlist dos mesmos dois valores e devolver 204 para qualquer outro host antes
de ler ou escrever dados.

- [ ] **Step 4: Verificar GREEN e regressões**

Executar:

```powershell
node --test tests/audience-event.test.mjs
npm.cmd test
git diff --check
```

Esperado: teste dirigido e suite completa passam sem falhas; diff check limpo.

- [ ] **Step 5: Commit local**

```powershell
git add -- index.html tests/audience-event.test.mjs
git commit -m "fix: count audience on both public hostnames"
```

### Task 2: Publicação e validação em LAB

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: commit verde da Task 1.
- Produces: preview Pages identificável para validação manual.

- [ ] **Step 1: Confirmar âmbito e enviar `lab`**

Verificar árvore limpa e commits locais; fazer push normal de `lab`, sem tocar em
`main`.

- [ ] **Step 2: Validar preview**

No deployment Pages correspondente ao commit, confirmar que o Site abre e que
previews continuam sem enviar métricas. A validação funcional dos dois domínios
públicos ocorrerá apenas depois de uma autorização própria para produção.

- [ ] **Step 3: Parar antes de produção**

Registar o SHA e o deployment preview. Não alterar `main`, deployment de
produção ou D1 sem nova autorização explícita.
