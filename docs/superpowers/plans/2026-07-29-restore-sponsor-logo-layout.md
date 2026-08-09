# Restore Sponsor Logo Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Sponsor logos to their original bottom-right card treatment while keeping Apoio logos inline.

**Architecture:** Separate textual attribution rendering from the Sponsor card logo. A focused renderer creates the safe Sponsor wrapper and image, while existing Apoio attribution continues to render its inline logo.

**Tech Stack:** Static HTML/CSS, JavaScript, Node.js built-in test runner.

## Global Constraints

- Sponsor logo container is positioned at the card’s bottom-right.
- Sponsor container is at most `150 × 55 px`; its image is at most `28 px` high.
- Apoio remains inline and limited to `110 × 24 px`.
- Preserve aspect ratios and existing URL/asset safety validation.
- Do not change camera data, assets, detail view, TV mode, or fullscreen mode.

---

### Task 1: Restore the Sponsor card logo

**Files:**
- Modify: `tests/sponsor-support.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: Sponsor objects with nullable `name`, `logo`, and `url`.
- Produces: `renderCameraSponsorLogo(entity): string`.

- [ ] Add a failing test which evaluates `renderCameraSponsorLogo`, verifies safe empty/valid/hostile outputs, verifies Sponsor text disables its inline logo, and checks the restored container/image CSS.
- [ ] Run `node --test tests/sponsor-support.test.mjs` and confirm failure because the dedicated renderer and restored CSS do not exist.
- [ ] Add an optional `showLogo = true` setting to `renderCameraAttribution`; pass `showLogo: false` for Sponsor and keep the default for Apoio.
- [ ] Add `renderCameraSponsorLogo(entity)` using `safeAttributionLogoUrl` and `escapeHtml`, returning a `.camera-sponsor-logo` wrapper with an inner `<img>`.
- [ ] Insert `${renderCameraSponsorLogo(cam.sponsor)}` once in each camera card, outside `.camera-info`.
- [ ] Restore `.camera-sponsor-logo` as the `150 × 55 px` absolute bottom-right container and `.camera-sponsor-logo img` as the proportional image capped at `28 px`; retain `.camera-support-logo` as `110 × 24 px` inline.
- [ ] Run `node --test tests/sponsor-support.test.mjs`, then `node --test tests/*.test.mjs`; expect zero failures.
- [ ] Run `git diff --check`, review the focused patch, and commit with `fix: restore sponsor card logos`.
