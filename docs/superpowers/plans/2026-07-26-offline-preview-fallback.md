# Offline Preview Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar a preview editorial de uma câmara offline enquanto ainda não existe um snapshot operacional em `fallbackImage`.

**Architecture:** Manter os dados e o estado operacional intactos e centralizar a escolha visual numa função pura `getOfflineImage(cam)`. `setCardOffline` usa essa função para ativar a camada de imagem já existente no cartão.

**Tech Stack:** HTML, JavaScript no browser, Node.js `node:test`.

## Global Constraints

- O badge e o estado visual continuam `OFFLINE`.
- `fallbackImage` tem prioridade sobre `preview`.
- `preview` não é copiada nem escrita em `fallbackImage`.
- Sem ambas as imagens, mantém-se a imagem genérica devolvida por `getPreview`.

---

### Task 1: Seleção da imagem offline

**Files:**
- Create: `tests/offline-preview-fallback.test.mjs`
- Modify: `index.html:2967-2970`
- Modify: `index.html:3238-3255`

**Interfaces:**
- Consumes: `getPreview(cam) -> string`
- Produces: `getOfflineImage(cam) -> string`

- [ ] **Step 1: Escrever o teste de regressão**

O teste lê `index.html`, extrai e avalia as funções puras `getPreview` e
`getOfflineImage`, e valida a prioridade:

```js
assert.equal(getOfflineImage({
  fallbackImage: null,
  preview: "./assets/previews/maia-sul.jpeg"
}), "./assets/previews/maia-sul.jpeg");

assert.equal(getOfflineImage({
  fallbackImage: "./assets/fallback/maia-sul.jpeg",
  preview: "./assets/previews/maia-sul.jpeg"
}), "./assets/fallback/maia-sul.jpeg");
```

O mesmo teste verifica no texto de `setCardOffline` que:

```js
const offlineImage = getOfflineImage(cam);
fallback.src = offlineImage;
block.classList.add("has-fallback-active");
```

- [ ] **Step 2: Executar o teste e confirmar RED**

Run:

```powershell
node --test tests/offline-preview-fallback.test.mjs
```

Expected: FAIL porque `getOfflineImage` ainda não existe.

- [ ] **Step 3: Implementar a seleção mínima**

Adicionar junto de `getPreview`:

```js
function getOfflineImage(cam) {
  return cam?.fallbackImage || getPreview(cam);
}
```

Alterar `setCardOffline`:

```js
const offlineImage = getOfflineImage(cam);

if (fallback && offlineImage) {
  fallback.src = offlineImage;
  block.classList.add("has-fallback-active");
}
```

- [ ] **Step 4: Confirmar GREEN e validar o ficheiro**

Run:

```powershell
node --test tests/offline-preview-fallback.test.mjs
git diff --check
```

Expected: teste PASS e nenhuma falha de formatação.

- [ ] **Step 5: Commit**

```powershell
git add index.html tests/offline-preview-fallback.test.mjs
git commit -m "fix: show preview while camera is offline"
```

### Task 2: Publicação e verificação no ambiente de teste

**Files:**
- Modify: nenhum ficheiro adicional.

**Interfaces:**
- Consumes: branch `lab` com o commit da Task 1
- Produces: deployment Cloudflare Pages de `teste.livesantamaria.org`

- [ ] **Step 1: Executar todas as verificações disponíveis**

```powershell
node --test tests/*.test.mjs
git diff --check
git status --short --branch
```

Expected: todos os testes passam e a árvore está limpa.

- [ ] **Step 2: Publicar o branch**

```powershell
git push origin lab
```

- [ ] **Step 3: Confirmar o deployment**

Consultar `livesantamaria-teste-v2` e confirmar que o deployment de produção
usa o novo commit do branch `lab`.

- [ ] **Step 4: Validar o artefacto publicado**

Abrir o `index.html` do deployment e confirmar que contém
`getOfflineImage(cam)` e que `setCardOffline` ativa a imagem selecionada.

- [ ] **Step 5: Validar o resultado visual**

Com sessão Cloudflare Access, abrir `teste.livesantamaria.org`, localizar
Maia Sul e confirmar simultaneamente:

- fotografia `./assets/previews/maia-sul.jpeg` visível;
- badge `OFFLINE` visível;
- ausência de alteração ao campo `fallbackImage`.
