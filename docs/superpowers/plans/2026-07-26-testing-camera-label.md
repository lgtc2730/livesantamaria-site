# Testing Camera Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manter o badge `EM TESTE` nas câmaras `testing`, independentemente do resultado do player.

**Architecture:** Introduzir uma função pura que converte ciclo operacional e estado do player num modelo de badge. Os caminhos `checking`, `live` e `offline` aplicam esse modelo, enquanto a lógica de vídeo, preview, contadores e mapa permanece inalterada.

**Tech Stack:** HTML, CSS existente, JavaScript no browser, Node.js `node:test`.

## Global Constraints

- Uma câmara `testing` mostra sempre `EM TESTE`.
- Uma câmara `testing` nunca recebe o estilo visual vermelho `offline`.
- A indisponibilidade do stream continua a ativar `fallbackImage` ou `preview`.
- Uma câmara `public` mantém `A VERIFICAR`, `LIVE` e `OFFLINE`.
- A alteração não escreve nem modifica dados das câmaras.

---

### Task 1: Modelo e aplicação do badge

**Files:**
- Modify: `tests/offline-preview-fallback.test.mjs`
- Modify: `index.html:2967-2975`
- Modify: `index.html:3224-3280`
- Modify: `index.html:3335-3355`

**Interfaces:**
- Consumes: `getOperationalState(cam) -> string`
- Produces: `getRuntimeBadge(cam, runtimeState) -> { className: string, text: string, dotOk: boolean }`

- [ ] **Step 1: Escrever os testes em RED**

Extrair e avaliar `getOperationalState` e `getRuntimeBadge` a partir de
`index.html`. Validar:

```js
assert.deepEqual(
  getRuntimeBadge({ operationalState: "testing" }, "offline"),
  { className: "status-badge", text: "EM TESTE", dotOk: false }
);

assert.deepEqual(
  getRuntimeBadge({ operationalState: "testing" }, "live"),
  { className: "status-badge", text: "EM TESTE", dotOk: true }
);

assert.deepEqual(
  getRuntimeBadge({ operationalState: "public" }, "offline"),
  { className: "status-badge offline", text: "OFFLINE", dotOk: false }
);
```

Verificar ainda que `setCardOffline` continua a atribuir
`fallback.src = offlineImage`.

- [ ] **Step 2: Confirmar RED**

```powershell
node --test tests/offline-preview-fallback.test.mjs
```

Expected: FAIL porque `getRuntimeBadge` ainda não existe.

- [ ] **Step 3: Implementar a função pura**

Adicionar:

```js
function getRuntimeBadge(cam, runtimeState) {
  const testing = getOperationalState(cam) === "testing";

  if (testing) {
    return {
      className: "status-badge",
      text: "EM TESTE",
      dotOk: runtimeState === "live"
    };
  }

  if (runtimeState === "offline") {
    return {
      className: "status-badge offline",
      text: "OFFLINE",
      dotOk: false
    };
  }

  if (runtimeState === "live") {
    return {
      className: "status-badge",
      text: "LIVE",
      dotOk: true
    };
  }

  return {
    className: "status-badge",
    text: "A VERIFICAR",
    dotOk: false
  };
}
```

- [ ] **Step 4: Aplicar o modelo nos três caminhos**

Em `setCardLive`, `setCardOffline` e `setCardChecking`, obter o modelo com
`getRuntimeBadge(block._cam, "<estado>")` e aplicar:

```js
badge.className = model.className;
badgeDot?.classList.toggle("ok", model.dotOk);
badgeText.textContent = model.text;
```

Na renderização inicial, mudar o texto legado `EM TESTES` para `EM TESTE`.

- [ ] **Step 5: Confirmar GREEN**

```powershell
node --test tests/*.test.mjs
git diff --check
```

Expected: todos os testes passam e nenhuma falha de formatação.

- [ ] **Step 6: Commit local**

```powershell
git add index.html tests/offline-preview-fallback.test.mjs docs/superpowers/plans/2026-07-26-testing-camera-label.md
git commit -m "fix: label testing cameras clearly"
```

Não executar `git push` nem deployment sem autorização posterior.
