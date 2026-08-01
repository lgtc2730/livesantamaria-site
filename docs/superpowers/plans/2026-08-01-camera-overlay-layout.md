# Camera Overlay Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render at most one logo-backed partner on the right of camera cards and move fullscreen camera identity with its gradient to the top-left.

**Architecture:** Keep the existing single-file Site architecture. Add one pure selector for card partner precedence, reuse the safe attribution renderer for the selected entity, and separate the currently shared TV/fullscreen positioning rules so fullscreen can move without changing TV mode.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js built-in test runner.

## Global Constraints

- Sponsor wins only when both Sponsor and Support have valid logos.
- Support remains eligible when Sponsor exists but has no valid logo.
- A card renders no partner block when neither entity has a valid logo.
- Partner branding appears only in the right-hand card area.
- Fullscreen identity and its gradient move to the top-left.
- The fullscreen close button stays top-right and its Sponsor logo stays bottom-right.
- TV mode, map popups, canonical data, editorial flows, synchronization, and assets do not change.

---

### Task 1: Single right-hand camera card partner

**Files:**
- Modify: `index.html:824-911`
- Modify: `index.html:3070-3110`
- Modify: `index.html:3610-3645`
- Test: `tests/sponsor-support.test.mjs`

**Interfaces:**
- Consumes: `cam.sponsor`, `cam.support`, `safeAttributionLogoUrl(value)`, and `renderCameraAttribution(entity, options)`.
- Produces: `selectCameraCardPartner(cam): object | null` and `renderCameraCardPartner(cam): string`.

- [ ] **Step 1: Replace the obsolete independent-rendering test with failing selection and template tests**

Add a factory containing `escapeHtml`, `safeHttpsUrl`, `safeAttributionLogoUrl`, `renderCameraAttribution`, `selectCameraCardPartner`, and `renderCameraCardPartner`. Assert:

```js
test("card partner selection prefers the only valid logo and Sponsor when both are valid", () => {
  const { select, render } = createCardPartnerFactory();
  const sponsor = { name: "Sponsor", logo: "./assets/sponsors/sponsor.png" };
  const support = { name: "Apoio", logo: "./assets/sponsors/support.png" };

  assert.equal(select({ sponsor, support: null }), sponsor);
  assert.equal(select({ sponsor: { name: "Sem logo" }, support }), support);
  assert.equal(select({ sponsor, support }), sponsor);
  assert.equal(select({ sponsor: null, support: null }), null);
  assert.equal(render({ sponsor: null, support: null }), "");
});

test("camera card renders one right-hand partner and no left attribution", () => {
  const createCard = extractFunction("createCameraCard");
  assert.match(createCard, /renderCameraCardPartner\(cam\)/);
  assert.doesNotMatch(createCard, /renderCameraAttribution\(\s*cam\.(?:sponsor|support)/);
});
```

Also assert the selected markup uses one `camera-partner` block with its label, name, and image.

- [ ] **Step 2: Run the focused test and verify the new contract fails**

Run: `node --test tests/sponsor-support.test.mjs`

Expected: FAIL because `selectCameraCardPartner` and `renderCameraCardPartner` do not exist and the template still renders Sponsor and Support independently.

- [ ] **Step 3: Implement the minimal safe selector and renderer**

Add beside the attribution helpers:

```js
function selectCameraCardPartner(cam) {
  if (cam?.sponsor?.name && safeAttributionLogoUrl(cam.sponsor.logo)) {
    return cam.sponsor;
  }
  if (cam?.support?.name && safeAttributionLogoUrl(cam.support.logo)) {
    return cam.support;
  }
  return null;
}

function renderCameraCardPartner(cam) {
  const entity = selectCameraCardPartner(cam);
  if (!entity) return "";
  return renderCameraAttribution(entity, {
    defaultLabel: entity === cam.sponsor ? "Sponsor" : "Apoio",
    className: "camera-partner"
  });
}
```

Remove both left-hand `renderCameraAttribution` calls and replace the separate Sponsor logo call with:

```js
${renderCameraCardPartner(cam)}
```

Replace the `camera-sponsor`, `camera-support`, and separate logo layout rules with one absolutely positioned `.camera-partner` rule at `right: 5px; bottom: 5px`, preserving safe text contrast and the existing maximum logo dimensions.

- [ ] **Step 4: Run focused and full Site tests**

Run: `node --test tests/sponsor-support.test.mjs`

Expected: PASS.

Run: `node --test tests/*.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the card change**

```bash
git add -- index.html tests/sponsor-support.test.mjs
git commit -m "fix: show one card partner on the right"
```

---

### Task 2: Top-left fullscreen identity overlay

**Files:**
- Modify: `index.html:1634-1693`
- Modify: `index.html:4218-4244`
- Create: `tests/fullscreen-overlay-layout.test.mjs`

**Interfaces:**
- Consumes: `.tv-info`, `.fullscreen-info`, `.fullscreen-sponsor-logo`, and `openCameraFullscreen(cam)`.
- Produces: independent TV and fullscreen overlay positioning; the fullscreen logo becomes a direct child of `#fullscreenStage`.

- [ ] **Step 1: Write failing CSS and DOM-placement tests**

Create a source-based regression test that extracts CSS rule bodies and `openCameraFullscreen`:

```js
test("fullscreen identity and gradient use the top while TV stays at the bottom", () => {
  assert.match(rule(".fullscreen-info"), /top:\s*24px/);
  assert.doesNotMatch(rule(".fullscreen-info"), /bottom:/);
  assert.match(rule(".tv-info"), /bottom:\s*24px/);
  assert.match(rule(".fullscreen-info::before"), /top:\s*0/);
  assert.match(rule(".fullscreen-info::before"), /linear-gradient\(180deg/);
  assert.match(rule(".tv-info::before"), /bottom:\s*0/);
  assert.match(rule(".tv-info::before"), /linear-gradient\(0deg/);
});

test("fullscreen Sponsor logo remains stage-level at the bottom-right", () => {
  const openFullscreen = extractFunction("openCameraFullscreen");
  assert.match(openFullscreen, /fsStage\.appendChild\(logo\)/);
  assert.doesNotMatch(openFullscreen, /info\.appendChild\(logo\)/);
  assert.match(rule(".fullscreen-sponsor-logo"), /bottom:\s*24px/);
  assert.match(rule(".fullscreen-sponsor-logo"), /right:\s*24px/);
});
```

- [ ] **Step 2: Run the new test and verify positioning fails**

Run: `node --test tests/fullscreen-overlay-layout.test.mjs`

Expected: FAIL because fullscreen and TV still share a bottom-positioned rule and the logo is appended inside `info`.

- [ ] **Step 3: Separate TV and fullscreen positioning and gradients**

Keep shared typography and flex declarations, then add independent rules:

```css
.tv-info {
  left: 28px;
  right: 28px;
  bottom: 24px;
}

.fullscreen-info {
  left: 28px;
  right: 84px;
  top: 24px;
  align-items: flex-start;
}

.tv-info::before {
  bottom: 0;
  background: linear-gradient(0deg, rgba(0,0,0,.72), transparent);
}

.fullscreen-info::before {
  top: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.72), transparent);
}
```

Retain the shared fixed gradient size and pointer-event rules. Set `.fullscreen-sponsor-logo` to `right: 24px; bottom: 24px`, and in `openCameraFullscreen` append `logo` directly to `fsStage` after the media/info nodes exist rather than to `info`.

- [ ] **Step 4: Run focused and full Site tests**

Run: `node --test tests/fullscreen-overlay-layout.test.mjs`

Expected: PASS.

Run: `node --test tests/*.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the fullscreen change**

```bash
git add -- index.html tests/fullscreen-overlay-layout.test.mjs
git commit -m "fix: move fullscreen identity to the top"
```

---

### Task 3: Final verification

**Files:**
- Verify: `index.html`
- Verify: `tests/sponsor-support.test.mjs`
- Verify: `tests/fullscreen-overlay-layout.test.mjs`

**Interfaces:**
- Consumes: the completed card and fullscreen changes.
- Produces: verified implementation ready for integration.

- [ ] **Step 1: Run the complete test suite**

Run: `node --test tests/*.test.mjs`

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Validate patch hygiene and scope**

Run: `git diff --check`

Expected: no output and exit code 0.

Run: `git status --short --branch`

Expected: the branch is ahead only by the approved specification and implementation commits, with a clean working tree.

- [ ] **Step 3: Inspect the final change set**

Run: `git diff origin/lab...HEAD -- index.html tests/sponsor-support.test.mjs tests/fullscreen-overlay-layout.test.mjs docs/superpowers/specs/2026-08-01-camera-overlay-layout-design.md docs/superpowers/plans/2026-08-01-camera-overlay-layout.md`

Expected: only the approved card-partner selection, fullscreen overlay layout, tests, specification, and plan are present.
