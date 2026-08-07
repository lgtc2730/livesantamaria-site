# Accessible Audience Consent Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o painel de métricas num diálogo acessível que pode ser fechado sem decisão, mantém o foco contido e restaura o foco de origem.

**Architecture:** A marcação e os estilos permanecem em `index.html`. A função existente `initializeAudienceConsentControls()` passa a concentrar abertura, fecho, retenção e restauro de foco sem alterar as funções de consentimento ou envio de métricas; o harness VM existente simula foco e teclado sobre o código real.

**Tech Stack:** HTML/CSS/JavaScript sem dependências, Node.js `node:test`, harness `vm` existente.

## Global Constraints

- **Fechar** e `Escape` não escrevem consentimento, não criam sessão e não enviam eventos.
- `Tab`/`Shift+Tab` circulam entre **Fechar**, **Saber mais**, **Aceitar métricas** e **Recusar**.
- Abrir coloca foco no primeiro controlo; fechar ou decidir restaura o foco de origem quando existir.
- Aceitar, recusar e retirar mantêm o comportamento atual.
- Não alterar Política, retenção, payload, D1, Worker, WAF ou configuração remota.
- Não fazer push sem autorização separada.

---

### Task 1: Semântica, foco e fecho do diálogo

**Files:**
- Modify: `index.html:1811-1864`
- Modify: `index.html:3026-3034`
- Modify: `index.html:5560-5595`
- Modify: `tests/audience-event.test.mjs:54-109`
- Modify: `tests/audience-event.test.mjs:235-265`

**Interfaces:**
- Consumes: IDs existentes `audienceConsentPanel`, `audienceConsentAccept`, `audienceConsentRefuse`, `audiencePrivacySettings`.
- Produces: novo ID `audienceConsentClose`; funções internas `openPanel(trigger)`, `closePanel({ restoreFocus })` e listener `keydown` do painel.

- [ ] **Step 1: Estender o harness e escrever testes RED**

Adicionar ao harness elementos focáveis com `focus()`, `contains()`, `querySelectorAll()`, `document.activeElement` e despacho de `keydown`. Incluir `audienceConsentClose` e o link `.audience-consent__more` na ordem focável. Criar testes que provem:

```js
test("consent dialog closes without choosing and restores its trigger", async () => {
  // abrir por settings, confirmar foco em Fechar; fechar por botão e Escape;
  // confirmar storage/payloads inalterados e foco restaurado ao trigger
});

test("consent dialog traps forward and reverse keyboard focus", async () => {
  // Tab no último -> primeiro; Shift+Tab no primeiro -> último;
  // ambos chamam preventDefault
});
```

Acrescentar assertions estáticas para `role="dialog"`, `aria-modal="true"`, `aria-describedby="audienceConsentDescription"` e botão com nome acessível `Fechar`.

- [ ] **Step 2: Confirmar RED**

Run:

```powershell
node --experimental-vm-modules --test tests/audience-event.test.mjs
node --test tests/privacy-page.test.mjs
```

Expected: falhas por inexistência de `audienceConsentClose`, semântica de diálogo e gestão de foco.

- [ ] **Step 3: Implementar marcação e estilos mínimos**

Em `index.html`, alterar a secção para diálogo com título/descrição, acrescentar botão superior `id="audienceConsentClose"`, `type="button"`, `aria-label="Fechar definições de métricas"`, texto visual `×`, área mínima de 44 px e foco visível. Reservar espaço no título para o botão.

- [ ] **Step 4: Implementar abertura, fecho e foco**

Dentro de `initializeAudienceConsentControls()`:

- guardar o elemento que abriu o painel;
- `openPanel(trigger)` mostra o painel e foca **Fechar**;
- `closePanel()` oculta e restaura o foco guardado quando ainda estiver no documento;
- **Fechar** e `Escape` chamam apenas `closePanel()`;
- `keydown` interceta `Tab` nos extremos da lista focável e chama `preventDefault()`;
- aceitar/recusar fecham através de `closePanel()` depois de a decisão ser guardada;
- a abertura automática usa o elemento previamente focado quando existir, sem escrever consentimento.

- [ ] **Step 5: Confirmar GREEN e regressões**

Run:

```powershell
node --experimental-vm-modules --test tests/audience-event.test.mjs
node --test tests/privacy-page.test.mjs
& npm.cmd test
git diff --check
```

Expected: suite completa aprovada e sem warnings de estrutura/diff.

- [ ] **Step 6: Commit local**

```powershell
git add index.html tests/audience-event.test.mjs tests/privacy-page.test.mjs
git commit -m "fix: make audience consent dialog accessible"
```

- [ ] **Step 7: Parar antes do remoto**

Entregar SHA e resultados. Obter autorização separada antes de `git push origin lab`; depois repetir desktop, mobile, botão **Fechar**, `Escape`, `Tab`, `Shift+Tab`, aceitação, recusa e ausência de eventos no domínio de teste.
