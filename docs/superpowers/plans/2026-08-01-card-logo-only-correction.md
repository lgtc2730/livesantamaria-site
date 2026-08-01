# Card Logo-Only Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Sponsor/Apoio text attribution on the left and render only one aspect-ratio-preserving partner logo on the right.

**Architecture:** Keep the existing safe partner selector, replace the right-hand attribution renderer with a logo-only renderer, and restore the two left attribution calls with logo rendering disabled. Style the selected image directly as the positioned element so no rectangular text/container block changes its visual shape.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js built-in test runner.

## Global Constraints

- Sponsor and Apoio label/name/link remain on the left.
- Logos do not render inside left attribution blocks.
- Exactly one valid logo may render on the right.
- Sponsor wins only when both valid logos exist.
- The right logo has no accompanying text, background, padding, or visible wrapper.
- Logo width and height remain automatic; maximum dimensions must not distort intrinsic aspect ratio.
- Fullscreen behavior remains unchanged.

---

### Task 1: Correct card partner presentation

**Files:**
- Modify: `index.html`
- Modify: `tests/sponsor-support.test.mjs`

**Interfaces:**
- Consumes: `selectCameraCardPartner(cam): object | null` and `safeAttributionLogoUrl(value): string`.
- Produces: `renderCameraCardPartnerLogo(cam): string` containing one safe `<img class="camera-partner-logo">` or an empty string.

- [ ] **Step 1: Write the failing presentation tests**

Update the card partner factory to return `renderCameraCardPartnerLogo`. Assert literal output behavior:

```js
const sponsorMarkup = render({ sponsor, support });
assert.match(sponsorMarkup, /^\s*<img /);
assert.match(sponsorMarkup, /class="camera-partner-logo"/);
assert.match(sponsorMarkup, /src="\.\/assets\/sponsors\/sponsor\.png"/);
assert.match(sponsorMarkup, /alt="Sponsor"/);
assert.doesNotMatch(sponsorMarkup, /<div|<span|<strong|<a|>Apoio</);
```

For a Sponsor without a logo and Support with a logo, assert the Support image is returned. Assert neither entity returns `""`.

Extract `createCameraCard` and assert it contains both left calls:

```js
assert.match(createCard, /renderCameraAttribution\(\s*cam\.sponsor,[^]*showLogo:\s*false/);
assert.match(createCard, /renderCameraAttribution\(\s*cam\.support,[^]*showLogo:\s*false/);
assert.match(createCard, /renderCameraCardPartnerLogo\(cam\)/);
```

Assert the `.camera-partner-logo` CSS rule contains `position: absolute`, `width: auto`, `height: auto`, `object-fit: contain`, and maximum width/height, and does not contain `background` or `padding`.

- [ ] **Step 2: Verify the tests fail against the merged implementation**

Run: `node --test tests/sponsor-support.test.mjs`

Expected: FAIL because the right-hand renderer returns label/name/logo markup and both left attribution calls are absent.

- [ ] **Step 3: Implement the minimal logo-only renderer and restore left text**

Replace `renderCameraCardPartner` with:

```js
function renderCameraCardPartnerLogo(cam) {
  const entity = selectCameraCardPartner(cam);
  if (!entity) return "";
  const logo = safeAttributionLogoUrl(entity.logo);
  return `<img class="camera-partner-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(entity.name)}">`;
}
```

Restore left Sponsor and Support attribution calls with `showLogo: false` for both. Replace the final right-hand call with `renderCameraCardPartnerLogo(cam)`.

Replace text/container `.camera-partner` CSS with direct image positioning:

```css
.camera-partner-logo {
  position: absolute;
  right: 5px;
  bottom: 5px;
  z-index: 4;
  display: block;
  width: auto;
  height: auto;
  max-width: 110px;
  max-height: 40px;
  object-fit: contain;
  opacity: .75;
  filter: drop-shadow(0 2px 5px rgba(0,0,0,.55));
  pointer-events: none;
}
```

Restore the prior `.camera-sponsor` and `.camera-support` text rules without their logo layout rules.

- [ ] **Step 4: Run focused and complete verification**

Run: `node --test tests/sponsor-support.test.mjs`

Expected: PASS.

Run: `node --test tests/*.test.mjs`

Expected: all tests PASS.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 5: Commit the correction**

```bash
git add -- index.html tests/sponsor-support.test.mjs
git commit -m "fix: keep partner text separate from card logo"
```

---

### Task 2: Final scope verification

**Files:**
- Verify: `index.html`
- Verify: `tests/sponsor-support.test.mjs`
- Verify: `docs/superpowers/specs/2026-08-01-camera-overlay-layout-design.md`

**Interfaces:**
- Consumes: completed correction.
- Produces: a clean corrective branch ready for PR integration.

- [ ] **Step 1: Run the full suite and inspect the branch**

Run: `node --test tests/*.test.mjs`

Expected: all tests PASS with zero failures.

Run: `git diff --check origin/lab...HEAD`

Expected: no output and exit code 0.

Run: `git status --short --branch`

Expected: clean `fix/card-partner-logo-only` branch.

- [ ] **Step 2: Inspect the complete correction delta**

Run: `git diff --stat origin/lab...HEAD`

Expected: only the approved specification/plan, card rendering/CSS, and Sponsor/Apoio tests change; fullscreen code has no diff.
