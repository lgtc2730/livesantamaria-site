# Card Logo Aspect Ratio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent generic camera-media CSS from stretching the right-hand partner logo.

**Architecture:** Exclude `.camera-partner-logo` from every broad desktop/mobile card image selector and explicitly reset media-only transform/background on the logo. Keep rendering, selection, text layout, and fullscreen unchanged.

**Tech Stack:** Static HTML/CSS, Node.js built-in test runner.

## Global Constraints

- Partner logo intrinsic aspect ratio is preserved.
- Stream, preview, and fallback media keep their current sizing behavior.
- Desktop, compact-mobile, and expanded-mobile rules exclude the partner logo.
- Sponsor/Apoio text, selection precedence, and fullscreen do not change.

---

### Task 1: Isolate the partner logo from media sizing

**Files:**
- Modify: `index.html`
- Modify: `tests/sponsor-support.test.mjs`

**Interfaces:**
- Consumes: `.camera-partner-logo` and existing camera-card media selectors.
- Produces: card image selectors scoped with `:not(.camera-partner-logo)` and a logo rule that resets transform/background.

- [ ] **Step 1: Write a failing CSS regression test**

In `tests/sponsor-support.test.mjs`, assert that broad selectors exclude the logo:

```js
assert.doesNotMatch(source, /\.camera-card img\s*\{/);
assert.match(source, /\.camera-card img:not\(\.camera-partner-logo\)\s*\{/);
assert.doesNotMatch(source, /compact-mobile[^\{]*\simg\s*\{/);
assert.match(source, /compact-mobile[^\{]*\simg:not\(\.camera-partner-logo\)\s*\{/);
```

Extend the logo-rule assertions with:

```js
assert.match(logoRule[1], /transform:\s*none/);
assert.match(logoRule[1], /background:\s*transparent/);
```

- [ ] **Step 2: Verify the test fails against the current CSS**

Run: `node --test tests/sponsor-support.test.mjs`

Expected: FAIL because `.camera-card img` and compact-mobile selectors still target the logo, and the logo does not reset transform/background.

- [ ] **Step 3: Apply the minimal selector correction**

Change every card-media `img` selector that can match the partner logo to `img:not(.camera-partner-logo)`, including desktop, compact-mobile collapsed, compact-mobile expanded, and the narrower mobile breakpoint. Add to `.camera-partner-logo`:

```css
background: transparent;
transform: none;
```

Do not add fixed width, fixed height, `aspect-ratio`, or a wrapper.

- [ ] **Step 4: Run focused and complete verification**

Run: `node --test tests/sponsor-support.test.mjs`

Expected: PASS.

Run: `node --test tests/*.test.mjs`

Expected: all tests PASS.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 5: Commit**

```bash
git add -- index.html tests/sponsor-support.test.mjs
git commit -m "fix: preserve card logo aspect ratio"
```

---

### Task 2: Final verification

**Files:**
- Verify: `index.html`
- Verify: `tests/sponsor-support.test.mjs`

**Interfaces:**
- Consumes: completed CSS correction.
- Produces: clean corrective branch ready for PR.

- [ ] **Step 1: Run complete checks and scope review**

Run: `node --test tests/*.test.mjs`

Expected: all tests PASS with zero failures.

Run: `git diff --check origin/lab...HEAD`

Expected: no output and exit code 0.

Run: `git diff --stat origin/lab...HEAD`

Expected: only the specification/plan, `index.html`, and `tests/sponsor-support.test.mjs` change.

Run: `git status --short --branch`

Expected: clean `fix/card-logo-aspect-ratio` branch.
