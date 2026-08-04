# Audience Metrics Consent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require explicit visitor consent before the Site stores an audience session or sends release-v2 audience events.

**Architecture:** Keep the consent decision and the pseudonymous audience session in separate versioned first-party storage keys. A small consent controller gates every analytics entry point and drives an accessible panel plus footer settings action; existing ingestion, D1 retention, and Control summaries remain unchanged.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js test runner, Cloudflare Pages Functions.

## Global Constraints

- Metrics remain optional and the Site remains fully usable after refusal.
- No `localStorage` audience-session read/write and no audience request before explicit acceptance.
- Raw audience events retain the existing 30-day deletion rule.
- Responsible for processing: Luis Mesquita; technical responsible: Luis Carreiro; contact: `livesantamaria.project@gmail.com`.
- Do not promote, deploy, migrate remote D1, activate WAF, or publish privacy text in this implementation.

---

### Task 1: Consent controller and analytics gate

**Files:**
- Modify: `tests/audience-event.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Produces: `getAudienceConsent(): "accepted" | "refused" | null`, `setAudienceConsent(value)`, `clearAudienceSession()`, and consent-gated existing tracking functions.
- Preserves: `sendAudienceEvent(event, camera)`, `trackVisit()`, and `trackCameraView(cameraId)` as safe non-throwing entry points.

- [ ] **Step 1: Write failing browser-code tests**

Extend the real `index.html` VM harness with instrumented storage and test these observable behaviors independently: initial load/pending choice performs no audience-session storage access and sends no request; refusal removes `lvsm-audience-session` and emits nothing; acceptance permits one visit; withdrawal removes the session and suppresses later camera events; persisted choices survive reload; storage exceptions suppress metrics without escaping.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-vm-modules --test tests/audience-event.test.mjs`

Expected: the new consent cases fail because the current code creates/reads an audience session without a consent gate.

- [ ] **Step 3: Implement the minimal consent controller**

In `index.html`, add a versioned consent key and strict parsing of only `accepted` and `refused`. Guard every audience-session and event path before accessing the session key. On refusal/withdrawal, remove the audience-session key. Catch storage errors and default to disabled metrics. Do not change API payloads, endpoint validation, D1 schema, or retention behavior.

- [ ] **Step 4: Run focused and full tests**

Run:

```powershell
node --experimental-vm-modules --test tests/audience-event.test.mjs
npm test
```

Expected: all tests pass with no uncaught warnings or errors.

- [ ] **Step 5: Commit the consent gate**

```powershell
git add index.html tests/audience-event.test.mjs
git commit -m "feat: require consent for audience metrics"
```

### Task 2: Accessible consent panel and privacy settings

**Files:**
- Modify: `tests/audience-event.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 1 consent controller.
- Produces: first-visit consent panel, `Aceitar métricas`, `Recusar`, and footer `Privacidade` settings control.

- [ ] **Step 1: Write failing DOM/source-contract tests**

Add assertions against the real page for a labelled consent region, two real buttons with the approved labels, no preselected option, a privacy-settings control in the footer, and handlers that call the Task 1 controller. Test that accepting hides the panel and triggers one visit, while refusing hides it without emitting an event.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-vm-modules --test tests/audience-event.test.mjs`

Expected: failure because the panel and controls do not yet exist.

- [ ] **Step 3: Implement panel markup, styles, and behavior**

Add responsive markup near the end of `body` and styles alongside existing footer/responsive styles. Use a labelled region, visible keyboard focus, equally prominent actions, and this factual summary: optional audience metrics count visits and opened public cameras using a random 30-minute browser session; raw events are deleted after 30 days. Add a footer action that reopens the settings. Do not claim that the processing is anonymous and do not add third-party trackers.

- [ ] **Step 4: Run focused and full tests**

Run:

```powershell
node --experimental-vm-modules --test tests/audience-event.test.mjs
npm test
```

Expected: all Site tests pass.

- [ ] **Step 5: Commit the consent interface**

```powershell
git add index.html tests/audience-event.test.mjs
git commit -m "feat: add audience privacy controls"
```

### Task 3: Align release and privacy documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-08-04-audience-v2-security-retention-design.md`
- Modify: `docs/operations/audience-v2-runbook.md`
- Test: `tests/audience-event.test.mjs`

**Interfaces:**
- Consumes: approved consent behavior from Tasks 1 and 2.
- Produces: release gates that require consent verification and record the confirmed roles/contact without publishing a premature privacy policy.

- [ ] **Step 1: Add a failing documentation contract test**

Assert that the runbook requires proof of zero audience requests before acceptance, normal Site operation after refusal, consent withdrawal, the 30-day disclosure, the confirmed names and project email, and a block on production until the privacy information reflects deployed behavior.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-vm-modules --test tests/audience-event.test.mjs`

Expected: failure because the current runbook leaves controller/contact and consent assessment unresolved.

- [ ] **Step 3: Update the approved design and runbook**

Record prior consent as the selected release-v2 behavior, Luis Mesquita as responsible for processing, Luis Carreiro as technical/operational responsible (not DPO), and `livesantamaria.project@gmail.com` as the public contact. Add immediate release checks for pending, accepted, refused, reloaded, and withdrawn states. Preserve the separate approvals for deployment, D1, retention Worker, and WAF.

- [ ] **Step 4: Verify documentation and full suite**

Run:

```powershell
rg -n "Luis Mesquita|Luis Carreiro|livesantamaria\.project@gmail\.com|consent|30 dias" docs
npm test
git diff --check
```

Expected: factual references are present, all tests pass, and the diff has no whitespace errors or secret values.

- [ ] **Step 5: Commit documentation alignment**

```powershell
git add docs/superpowers/specs/2026-08-04-audience-v2-security-retention-design.md docs/operations/audience-v2-runbook.md tests/audience-event.test.mjs
git commit -m "docs: gate audience release on consent"
```

### Task 4: Final verification and review handoff

**Files:**
- Review only: all files changed by Tasks 1-3.

**Interfaces:**
- Produces: a reviewed `lab` commit set ready for a separately authorized push or production-promotion decision.

- [ ] **Step 1: Run final verification**

Run:

```powershell
npm test
git diff --check
git status --short --branch
git log --oneline -5
```

Expected: the complete suite passes, formatting is clean, and only intentional commits are ahead of `origin/lab`.

- [ ] **Step 2: Review privacy and regression boundaries**

Confirm from source and tests that pending/refused consent causes no audience-session access and no event submission; withdrawal deletes local audience state; Site/camera behavior remains available; no raw identifier appears in logs/UI; and no deployment configuration, D1 migration, WAF state, or production branch changed.

- [ ] **Step 3: Request code review before any push**

Present the exact commits, changed files, test count/output, and remaining external release gates. Push only under separate explicit authorization.
