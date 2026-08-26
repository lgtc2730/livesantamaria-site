# Marine Recommendations v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved four-location bathing recommendation engine, public endpoint and compact public UI, plus editable, validated and auditable local profiles in Control.

**Architecture:** The public Site owns Open-Meteo ingestion, normalization, scoring, caps, reasons and the presentation contract. Control API stores only editable profile/season configuration and audit history in D1; the PWA consumes those configuration routes and uses a shared deterministic simulator that mirrors the versioned v0.1 rules for preview only. The Site always retains the normative provisional profile baseline and rejects malformed remote configuration.

**Tech Stack:** Cloudflare Pages Functions, Cloudflare Workers/D1, browser ES modules, Node test runner, Vitest Workers pool.

**Spec:** `docs/superpowers/specs/2026-08-26-marine-recommendations-design.md`

## Global Constraints

- Work only on `lab`; never alter or merge `main`.
- No push and no deployment.
- Offshore point is exactly `36.85, -25.20`, version `0.1`, confidence `provisional`.
- Direction transitions interpolate linearly over `directionTransitionHalfWidthDeg = 10` with circular angles.
- Only São Lourenço, Maia, Praia Formosa and Anjos are included.
- Sea temperature is informational and missing temperature never invalidates a recommendation.
- Direction, swell height and swell period are mandatory.
- Core formula, weights, caps, reason priority and messages remain versioned code.
- Every production behavior follows RED, minimal GREEN and relevant regression.
- No surf mode, secondary swell, multiple offshore points, day parts or automatic calibration.

---

### Task 1: Pure recommendation engine and normative profiles

**Files:**
- Create: `functions/lib/marine/profiles.js`
- Create: `functions/lib/marine/recommendation-engine.js`
- Test: `tests/marine-recommendation-engine.test.mjs`

**Interfaces:**
- Produces: `INITIAL_PROFILES`, `ENGINE_RULES`, `validateProfiles(profiles)`, `scoreCurve(value, points)`, `directionScore(direction, sectors, halfWidth)`, `classifyRelativeWind(windDirection, coastFacingDeg)`, `recommendLocation(profile, conditions)` and `recommendAll(profiles, conditions)`.

- [ ] Write literal table-driven tests for curves, all normative sectors, 0° wraparound, ±10° smoothing, weights, wind classes, caps, cap dominance, rating boundaries and approved language.
- [ ] Run `node --test tests/marine-recommendation-engine.test.mjs`; expect failure because modules do not exist.
- [ ] Implement only the constants, validation and pure scoring needed by those tests.
- [ ] Re-run the focused test; expect all passing.
- [ ] Run `npm.cmd test`; expect the Site regression suite passing.

### Task 2: Marine source and public presentation contract

**Files:**
- Create: `functions/lib/marine/marine-source.js`
- Create: `functions/lib/marine/presentation-contract.js`
- Create: `functions/api/marine-recommendations.js`
- Test: `tests/marine-recommendations-api.test.mjs`

**Interfaces:**
- Consumes: `recommendAll` and validated profiles from Task 1.
- Produces: `fetchMarineConditions(fetchImpl, now)`, `freshnessFor(sourceUpdatedAt, now)`, `buildPresentationContract(input)` and Pages `onRequestGet(context)`.

- [ ] Write failing tests for exact Open-Meteo marine/weather requests at `36.85,-25.20`, unit normalization, absent optional sea temperature, missing critical fields, 30-minute cache headers, fresh/stale/expired states, external failure and the complete endpoint contract.
- [ ] Run the focused API test and confirm failures are feature-missing failures.
- [ ] Implement bounded upstream reads, normalization, conservative failures and JSON contract; never expose raw upstream errors.
- [ ] Re-run the focused test and Site regression suite.

### Task 3: Homepage teaser and Meteorology module

**Files:**
- Modify: `index.html`
- Test: `tests/marine-recommendations-ui.test.mjs`

**Interfaces:**
- Consumes: `/api/marine-recommendations` only; performs no scoring.
- Produces: seasonal teaser, compact four-location grid, one shared expanded detail and unavailable/stale states.

- [ ] Write failing DOM/source-contract tests for seasonal visibility, expired hiding, compact 4/2-column layout, one selected detail, camera action, disclaimer and forbidden jargon/score visibility.
- [ ] Run the focused UI test and confirm RED.
- [ ] Add compact semantic markup, scoped CSS and rendering/event functions immediately below Hero and before classic forecast content.
- [ ] Re-run focused and full Site tests.

### Task 4: Auditable Control API configuration

**Files:**
- Create: `migrations/0008_marine_recommendations.sql`
- Create: `src/marine/marineSchema.js`
- Create: `src/marine/marineRepository.js`
- Create: `src/marine/marineService.js`
- Create: `src/routes/marineRecommendations.js`
- Modify: `src/router.js`
- Modify: `src/index.js`
- Test: `test/marineSchema.spec.js`
- Test: `test/marineRepository.spec.js`
- Test: `test/marineRoutes.spec.js`
- Test: `test/migrationContract.spec.js`

**Interfaces:**
- Produces authenticated `GET/PUT /api/marine-recommendations/config`, public read-only `GET /api/marine-recommendations/config/public`, `GET /api/marine-recommendations/history?limit=N`, validated revision-based updates and immutable audit events.

- [ ] Write failing schema tests for four exact IDs, sector coverage without gaps/overlap, circular wraparound, type/camera/confidence/season bounds and forbidden global-rule fields.
- [ ] Write failing repository tests for default bootstrap, optimistic revision update and newest-first bounded history.
- [ ] Write failing route tests for Access protection, safe public projection, conflicts and sanitized errors.
- [ ] Add the D1 migration, validators, repository, service and routes following existing response/auth/router patterns.
- [ ] Run focused Vitest files, then `npm.cmd test -- --run` outside sandbox if Wrangler logging requires it.

### Task 5: PWA profile editor, simulator and history

**Files:**
- Create: `src/services/marineRecommendationsService.js`
- Create: `src/services/marineSimulator.js`
- Create: `src/views/marineRecommendations.js`
- Create: `css/marine-recommendations.css`
- Modify: `src/config.js`
- Modify: `src/app.js`
- Modify: `index.html`
- Test: `tests/marineRecommendationsService.test.mjs`
- Test: `tests/marineSimulator.test.mjs`
- Test: `tests/marineRecommendationsView.test.mjs`
- Test: `tests/navigationVersion.test.mjs`

**Interfaces:**
- Consumes the Control API routes from Task 4.
- Produces the `Mar / Recomendações balneares` route, editable local fields, sector validation/table/compass, season editor, scenario preview, history and read-only global rules.

- [ ] Write failing service tests for credentialed reads, revision-safe writes, strict response normalization and safe error messages.
- [ ] Write failing simulator tests using literal scenarios matching Site engine outcomes for direction, height, period, wind and gusts.
- [ ] Write failing view/navigation tests for all editable fields, non-editable rules, sector validation, one save, audit history and simulator preview-before-save.
- [ ] Implement the smallest modular service, simulator and accessible view; add the navigation entry and scoped styles.
- [ ] Run focused tests and the complete 440-test PWA command with `LVSM_SITE_ROOT` set to the Site worktree.

### Task 6: Cross-repository verification

**Files:**
- No new production files.

- [ ] Run all focused tests once more and record RED/GREEN evidence from the command history.
- [ ] Run complete Site, PWA and Control API suites.
- [ ] Run applicable Wrangler dry-runs without deploying.
- [ ] Run `git diff --check` in all three worktrees.
- [ ] Inspect `git status --short --branch` and diffs in all three repositories.
- [ ] Confirm every worktree remains on `lab`, no push/deploy occurred, public copy has no safety claim, and report limitations precisely.
