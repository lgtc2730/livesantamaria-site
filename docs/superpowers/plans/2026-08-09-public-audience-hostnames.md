# Public Audience Hostnames Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar métricas consentidas nos dois hostnames públicos e continuar a bloqueá-las em qualquer outro hostname.

**Architecture:** O código de audiência do `index.html` passa a consultar uma allowlist imutável com os dois hostnames públicos antes de criar sessão ou fazer `fetch`. O teste existente executa esse código real em `vm` com um hostname parametrizável, cobrindo domínio raiz, `www` e hostname desconhecido.

**Tech Stack:** HTML/JavaScript do Site, Node.js test runner, `node:vm`.

## Global Constraints

- Permitir apenas `livesantamaria.org` e `www.livesantamaria.org`.
- Manter previews Pages, LAB, localhost e hostnames desconhecidos sem eventos.
- Não alterar consentimento, sessão de 30 minutos, deduplicação, API, D1 ou retenção de 30 dias.
- Publicar primeiro em `lab`; produção exige autorização própria posterior.

---

### Task 1: Allowlist dos hostnames públicos

**Files:**
- Modify: `tests/audience-event.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: `loadBrowserAudience(fetchImpl, initialStorage, hostname)` no teste.
- Produces: `PUBLIC_AUDIENCE_HOSTNAMES: ReadonlySet<string>` usado por `sendAudienceEvent(event, camera)`.

- [ ] **Step 1: Escrever o teste de regressão**

Parametrizar `loadBrowserAudience` com terceiro argumento, por omissão
`"www.livesantamaria.org"`, e adicionar:

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

Esperado: falha apenas para `livesantamaria.org`, com zero pedidos em vez de um.

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
