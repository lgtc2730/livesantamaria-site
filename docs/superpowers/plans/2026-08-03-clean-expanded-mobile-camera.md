# Clean Expanded Mobile Camera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an expanded compact camera card on a portrait phone show only its camera media while preserving the existing compact/expanded tap toggle and all desktop and landscape behavior.

**Architecture:** Keep the existing `compact-mobile expanded-mobile` state and JavaScript interaction unchanged. Add one source-level regression test and one narrowly scoped CSS rule inside the existing portrait-phone breakpoint to suppress the site-generated gradient, badge, information, partner logo, and viewer overlay only in the expanded mobile state.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner (`node:test`), strict assertions.

## Global Constraints

- Compact portrait cards retain their current default layout.
- A first tap expands the card and a second tap returns it to compact form.
- Expanded portrait cards show only camera media; the LVSM signature remains because it is embedded in that media.
- Desktop, landscape, featured-card, promo-card, stream-loading, fallback, audience, digital-zoom, fullscreen, and TV behavior remain unchanged.
- Do not add a separate LVSM overlay or a new interaction state.

---

## File Structure

- `tests/mobile-expanded-card.test.mjs`: owns source-level regression coverage for the expanded compact mobile presentation and existing tap toggle.
- `index.html`: owns the current responsive camera-card CSS and `expanded-mobile` interaction.

### Task 1: Hide Site Overlays in the Expanded Mobile Card

**Files:**
- Create: `tests/mobile-expanded-card.test.mjs`
- Modify: `index.html:2259-2260`

**Interfaces:**
- Consumes: existing `.camera-card.compact-mobile.expanded-mobile` CSS state and `expandedMobileCards` JavaScript state.
- Produces: a clean expanded mobile presentation in which only the existing media element remains visible.

- [ ] **Step 1: Write the failing presentation regression test**

Create `tests/mobile-expanded-card.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("expanded compact mobile cards show only camera media", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const portraitStart = html.indexOf('@media (max-width: 680px) and (orientation: portrait)');
  const portraitEnd = html.indexOf("@media", portraitStart + 1);

  assert.notEqual(portraitStart, -1, "portrait phone breakpoint is missing");
  assert.notEqual(portraitEnd, -1, "portrait phone breakpoint boundary is missing");

  const portraitCss = html.slice(portraitStart, portraitEnd);
  const hiddenOverlayRule = portraitCss.match(
    /\.camera-card\.compact-mobile\.expanded-mobile::after,\s*\.camera-card\.compact-mobile\.expanded-mobile \.status-badge,\s*\.camera-card\.compact-mobile\.expanded-mobile \.camera-info,\s*\.camera-card\.compact-mobile\.expanded-mobile \.camera-partner-logo,\s*\.camera-card\.compact-mobile\.expanded-mobile \.viewer-count\s*\{([^}]*)\}/
  );

  assert.ok(hiddenOverlayRule, "expanded portrait overlay rule is missing");
  assert.match(hiddenOverlayRule[1], /display:\s*none/);

  assert.match(
    html,
    /\.camera-card\.compact-mobile\.expanded-mobile video,[\s\S]*?img:not\(\.camera-partner-logo\)[\s\S]*?height:\s*100%/,
    "camera media must continue to fill the expanded card"
  );
});

test("mobile taps keep toggling the existing expanded state", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const functionStart = html.indexOf("function createCameraCard(");
  const functionEnd = html.indexOf("\nfunction loadSnapshot(", functionStart);

  assert.notEqual(functionStart, -1);
  assert.notEqual(functionEnd, -1);

  const createCameraCard = html.slice(functionStart, functionEnd);
  assert.match(createCameraCard, /card\.classList\.toggle\("expanded-mobile"\)/);
  assert.match(createCameraCard, /expandedMobileCards\.add\(cam\.id\)/);
  assert.match(createCameraCard, /expandedMobileCards\.delete\(cam\.id\)/);
  assert.doesNotMatch(
    createCameraCard.slice(createCameraCard.indexOf('if (window.matchMedia("(max-width: 680px)").matches')),
    /openCameraFullscreen\(cam\)[\s\S]*?return;/
  );
});
```

- [ ] **Step 2: Run the focused test and verify the missing CSS fails**

Run:

```powershell
node --test tests/mobile-expanded-card.test.mjs
```

Expected: the first test fails because the portrait-only expanded-state overlay rule does not exist; the interaction test passes because the existing toggle is already correct.

- [ ] **Step 3: Add the minimal expanded-state CSS**

At the start of the existing `@media (max-width: 680px) and (orientation: portrait)` section of `index.html`, add:

```css
      .camera-card.compact-mobile.expanded-mobile::after,
      .camera-card.compact-mobile.expanded-mobile .status-badge,
      .camera-card.compact-mobile.expanded-mobile .camera-info,
      .camera-card.compact-mobile.expanded-mobile .camera-partner-logo,
      .camera-card.compact-mobile.expanded-mobile .viewer-count {
        display: none;
      }
```

Do not change `createCameraCard`, the compact-state selectors, global overlay rules, or fullscreen/TV styles.

- [ ] **Step 4: Run focused and complete verification**

Run:

```powershell
node --test tests/mobile-expanded-card.test.mjs
node --test tests/*.test.mjs
git diff --check
```

Expected: both test commands report zero failures and `git diff --check` produces no output.

- [ ] **Step 5: Commit the implementation**

```powershell
git add -- index.html tests/mobile-expanded-card.test.mjs
git commit -m "fix: clean expanded portrait camera cards"
```
