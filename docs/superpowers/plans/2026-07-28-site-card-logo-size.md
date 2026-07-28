# Compact Site Card Logos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit Sponsor and Apoio logos in camera cards to a proportional `110 × 24 px` signature.

**Architecture:** Keep the existing attribution HTML and replace the stale Sponsor container CSS with one shared image rule for Sponsor and Apoio. Protect the visual contract with a source-level Node test, matching the Site’s current test style.

**Tech Stack:** Static HTML/CSS, JavaScript, Node.js built-in test runner.

## Global Constraints

- Each logo stays beside the corresponding entity name.
- Sponsor and Apoio share the same visual treatment.
- The visible area is at most `110 × 24 px`.
- Preserve aspect ratio with `width: auto`, `height: auto`, and `object-fit: contain`.
- Do not add backgrounds, cropping, or distortion.
- Do not change data, asset paths, detail view, TV mode, or fullscreen mode.

---

### Task 1: Constrain attribution logos in camera cards

**Files:**
- Modify: `tests/sponsor-support.test.mjs`
- Modify: `index.html:873-909`

**Interfaces:**
- Consumes: `.camera-sponsor-logo` and `.camera-support-logo` classes emitted by `renderCameraAttribution(entity, options)`.
- Produces: one shared CSS rule that constrains both classes to `110 × 24 px`.

- [ ] **Step 1: Write the failing regression test**

Append this test to `tests/sponsor-support.test.mjs`:

```js
test("camera card attribution logos use the compact shared image rule", () => {
  const sharedRule = source.match(
    /\.camera-sponsor-logo,\s*\.camera-support-logo\s*\{([^}]*)\}/
  );

  assert.ok(sharedRule, "shared Sponsor/Apoio logo rule missing");
  assert.match(sharedRule[1], /max-width:\s*110px/);
  assert.match(sharedRule[1], /max-height:\s*24px/);
  assert.match(sharedRule[1], /width:\s*auto/);
  assert.match(sharedRule[1], /height:\s*auto/);
  assert.match(sharedRule[1], /object-fit:\s*contain/);
  assert.doesNotMatch(sharedRule[1], /position:\s*absolute/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/sponsor-support.test.mjs
```

Expected: FAIL with `shared Sponsor/Apoio logo rule missing`.

- [ ] **Step 3: Replace the stale Sponsor rules with the shared image rule**

In `index.html`, replace the existing `.camera-support-logo` rule and both
`.camera-sponsor-logo` rules with:

```css
    .camera-sponsor-logo,
    .camera-support-logo {
      display: block;
      width: auto;
      height: auto;
      max-width: 110px;
      max-height: 24px;
      margin-top: 4px;
      object-fit: contain;
      opacity: .72;
      filter: drop-shadow(0 2px 5px rgba(0,0,0,.55));
    }
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/sponsor-support.test.mjs
```

Expected: all tests in the file PASS.

- [ ] **Step 5: Run the complete Site test suite**

Run:

```powershell
node --test tests/*.test.mjs
```

Expected: all Site tests PASS with zero failures.

- [ ] **Step 6: Check the patch and commit**

Run:

```powershell
git diff --check
git diff -- index.html tests/sponsor-support.test.mjs
git add index.html tests/sponsor-support.test.mjs
git commit -m "fix: constrain camera card logos"
```

Expected: no whitespace errors and one focused implementation commit.
