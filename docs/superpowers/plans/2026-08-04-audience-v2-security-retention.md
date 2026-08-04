# Audience v2 Security and Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve required audience metrics while bounding anonymous ingestion, deduplicating events, limiting summaries to 30 days, and deleting raw events daily after 30 days.

**Architecture:** The PWA canonical-data generator emits a minimal Site-side allowlist of public camera IDs. The Site validates and deduplicates ingestion against that allowlist and a D1 unique event key. A separate scheduled Worker bound only to the audience D1 performs daily retention; Cloudflare WAF provides the mandatory edge rate limit.

**Tech Stack:** Cloudflare Pages Functions, Cloudflare D1/SQLite migrations, Cloudflare Workers Cron Triggers, Cloudflare WAF rate-limiting rules, JavaScript ES modules, Node.js test runner, PowerShell sync tooling.

## Global Constraints

- Keep the Control API LAB-only; the retention Worker belongs to Site analytics and has no public route.
- Accept only `visit` and `camera_view`; the daily retention job deletes every raw event older than 30 days at execution time.
- Do not intentionally store IP, user agent, email, Access identity, cookies, JWTs, tokens, request bodies, or SQL bound values.
- `session_id` and `event_key` may be stored only in the audience D1 for deduplication until the daily retention job deletes rows older than 30 days; never log, return, summarize, export, or join them to identity data.
- Keep telemetry failure non-blocking for the public Site and camera playback.
- Preserve the 30-minute browser session and one visit/one view-per-camera behavior.
- Replace all-time summary semantics with today, yesterday, last 7 days, and last 30 days.
- Do not publish claims about anonymity, cookies, consent, or lawful basis until the privacy follow-up is reviewed.
- Do not deploy, migrate a remote D1, enable WAF enforcement, merge, or publish during implementation without a separate release approval.

---

### Task 1: Generate the public camera allowlist during PWA-to-Site sync

**Files:**
- Modify in PWA: `tools/build-public-data.ps1`
- Modify in PWA: `tools/sync-public-data.ps1`
- Modify in PWA: `tests/camerasControlData.test.mjs`
- Modify in PWA: `tests/syncPublicWorkflow.test.mjs`
- Modify in PWA: `.github/workflows/sync-site-lab.yml`
- Create in Site: `audience.public.json`

**Interfaces:**
- Consumes: canonical PWA camera records with `id` and `publicVisibility`.
- Produces: Site file `audience.public.json` shaped as `{ "schemaVersion": 1, "cameraIds": string[] }`, sorted by ordinal ID and containing cameras only, never promos or milestones.

- [ ] **Step 1: Extend the generator fixture with a second output and a failing assertion**

In `tests/camerasControlData.test.mjs`, add `audienceOutput` to the temporary paths, pass `-AudienceOutputFile`, read it as JSON, return it from `buildPublicData()`, and add this test:

```js
test("gera uma allowlist mínima e determinística para audiência", async () => {
  const { audience } = await buildPublicData({
    cameras: [
      { id: "zeta", type: "hls", operationalState: "testing", publicVisibility: "public", publicMedia: "preview", preview: "./z.jpg" },
      { id: "alpha", type: "hls", operationalState: "public", publicVisibility: "public", publicMedia: "stream", url: "https://camera.example/a.m3u8" },
      { id: "hidden", type: "hls", operationalState: "testing", publicVisibility: "hidden", publicMedia: "stream", url: "https://camera.example/h.m3u8" }
    ],
    promos: [{ id: "promo", type: "promo", preview: "./promo.jpg" }]
  });

  assert.deepEqual(audience, {
    schemaVersion: 1,
    cameraIds: ["alpha", "zeta"]
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing parameter/output failure**

Run from PWA: `node --test tests/camerasControlData.test.mjs`
Expected: FAIL because `AudienceOutputFile` and the generated JSON do not exist.

- [ ] **Step 3: Generate deterministic audience JSON**

Add this parameter to `tools/build-public-data.ps1`:

```powershell
[string]$AudienceOutputFile = ""
```

After `$publicCameras` is built, derive and write only public camera IDs:

```powershell
if (-not [string]::IsNullOrWhiteSpace($AudienceOutputFile)) {
  $audienceDirectory = Split-Path -Parent $AudienceOutputFile
  if (-not (Test-Path -LiteralPath $audienceDirectory)) {
    [System.IO.Directory]::CreateDirectory($audienceDirectory) | Out-Null
  }

  $audiencePayload = [ordered]@{
    schemaVersion = 1
    cameraIds = @($publicCameras | ForEach-Object { [string]$_.id } | Sort-Object)
  }
  $audienceJson = (ConvertTo-Json -InputObject $audiencePayload -Depth 3) + "`n"
  [System.IO.File]::WriteAllText($AudienceOutputFile, $audienceJson, $utf8NoBom)
}
```

Pass `(Join-Path $SiteRoot "audience.public.json")` from `tools/sync-public-data.ps1`. Include that path in its generated diff and in the workflow's `git add` list.

- [ ] **Step 4: Assert workflow tracking and run PWA tests**

Add an assertion to `tests/syncPublicWorkflow.test.mjs` that the workflow stages `audience.public.json` beside `cameras.public.js`.

Run from PWA:

```powershell
node --test tests/camerasControlData.test.mjs tests/syncPublicWorkflow.test.mjs
node --test tests/*.test.mjs
git diff --check
```

Expected: focused tests and complete PWA suite PASS; no whitespace errors.

- [ ] **Step 5: Generate and validate the Site artifact locally**

Run from PWA:

```powershell
& .\tools\sync-public-data.ps1 -SiteRootPath ..\livesantamaria-site
Get-Content ..\livesantamaria-site\audience.public.json | ConvertFrom-Json | Format-List
```

Expected: schema version 1 and only sorted public camera IDs; no URLs, names, internal state, sponsors, or operational metadata.

- [ ] **Step 6: Commit PWA and Site artifacts separately**

```powershell
# PWA
git add tools/build-public-data.ps1 tools/sync-public-data.ps1 tests/camerasControlData.test.mjs tests/syncPublicWorkflow.test.mjs .github/workflows/sync-site-lab.yml
git commit -m "feat: generate audience camera allowlist"

# Site
git add audience.public.json
git commit -m "chore: add generated audience camera allowlist"
```

### Task 2: Add strict payload validation and safe logging

**Files:**
- Create: `functions/api/audience/validation.js`
- Modify: `functions/api/audience/event.js`
- Create: `tests/audience-validation.test.mjs`
- Create: `tests/audience-event.test.mjs`

**Interfaces:**
- Consumes: `audience.public.json` and a `Request` whose body is JSON.
- Produces: `validateAudiencePayload(value, cameraIds) -> { type, session, camera }`; `readAudienceRequest(request) -> Promise<object>`; constants `MAX_BODY_BYTES = 512`, `SESSION_PATTERN`, `CAMERA_ID_PATTERN`.

- [ ] **Step 1: Write failing validation tests**

Use `vm.SourceTextModule` or import the module through the existing test helper pattern. Cover the exact contract:

```js
assert.deepEqual(
  validateAudiencePayload(
    { event: "camera_view", session: "123e4567-e89b-42d3-a456-426614174000", camera: "cnsm" },
    new Set(["cnsm"])
  ),
  { type: "camera_view", session: "123e4567-e89b-42d3-a456-426614174000", camera: "cnsm" }
);
assert.throws(() => validateAudiencePayload({ event: "other", session: validSession }, cameraIds), /invalid request/i);
assert.throws(() => validateAudiencePayload({ event: "visit", session: validSession, camera: "cnsm" }, cameraIds), /invalid request/i);
assert.throws(() => validateAudiencePayload({ event: "camera_view", session: validSession, camera: "hidden" }, cameraIds), /invalid request/i);
assert.throws(() => validateAudiencePayload({ event: "visit", session: validSession, extra: true }, cameraIds), /invalid request/i);
```

Add request tests for non-JSON content type, malformed JSON, and a declared or streamed body over 512 bytes.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --experimental-vm-modules --test tests/audience-validation.test.mjs tests/audience-event.test.mjs`
Expected: FAIL because validation exports and bounded reader do not exist.

- [ ] **Step 3: Implement minimal validation module**

Use exact allowlists and patterns:

```js
export const MAX_BODY_BYTES = 512;
export const SESSION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CAMERA_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const EVENT_TYPES = new Set(["visit", "camera_view"]);

export function validateAudiencePayload(value, cameraIds) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid request");
  const keys = Object.keys(value).sort();
  const expected = value.event === "camera_view" ? ["camera", "event", "session"] : ["event", "session"];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) throw new Error("invalid request");
  if (!EVENT_TYPES.has(value.event) || typeof value.session !== "string" || !SESSION_PATTERN.test(value.session)) throw new Error("invalid request");
  if (value.event === "visit") return { type: "visit", session: value.session, camera: null };
  if (typeof value.camera !== "string" || !CAMERA_ID_PATTERN.test(value.camera) || !cameraIds.has(value.camera)) throw new Error("invalid request");
  return { type: "camera_view", session: value.session, camera: value.camera };
}
```

Implement `readAudienceRequest()` by checking `Content-Type`, rejecting `Content-Length > 512`, reading the stream with a running byte count, decoding UTF-8, and parsing JSON. Give oversize errors a stable `code = "body_too_large"`; all parse/contract failures use `code = "invalid_request"`.

- [ ] **Step 4: Replace endpoint truthiness checks and sensitive logs**

Import the JSON allowlist with `import audienceCatalog from "../../../audience.public.json" with { type: "json" };` and pass `new Set(audienceCatalog.cameraIds)` to the validator. Return `413` for `body_too_large`, `400` for invalid input, and a safe `503` for D1 failure. Log only `{ eventType, camera, outcome }`; never log the session, event key, request body, or raw D1 result.

- [ ] **Step 5: Run focused and complete Site tests**

```powershell
node --experimental-vm-modules --test tests/audience-validation.test.mjs tests/audience-event.test.mjs
node --test tests/*.test.mjs
git diff --check
```

Expected: all PASS; log spies find no UUID or payload content.

- [ ] **Step 6: Commit strict ingestion**

```powershell
git add functions/api/audience/validation.js functions/api/audience/event.js tests/audience-validation.test.mjs tests/audience-event.test.mjs
git commit -m "fix: validate audience event ingestion"
```

### Task 3: Migrate D1 to deterministic event deduplication

**Files:**
- Create: `database/migrations/0001_audience_v2_event_keys.sql`
- Modify: `database/schema.sql`
- Modify: `wrangler.jsonc`
- Modify: `functions/api/audience/db.js`
- Create: `tests/audience-database.test.mjs`

**Interfaces:**
- Consumes: validated `{ type, session, camera, host }`.
- Produces: `buildEventKey(event) -> string`; `insertEvent(db, event) -> D1Result` using a unique `event_key`.

- [ ] **Step 1: Write failing key and insertion tests**

```js
assert.equal(buildEventKey({ type: "visit", session: "s" }), "visit:s");
assert.equal(buildEventKey({ type: "camera_view", session: "s", camera: "cnsm" }), "camera_view:s:cnsm");
```

Use a recording D1 fake to assert the SQL includes `event_key`, the sixth bound value is deterministic, and a repeated key produces no second logical row.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --experimental-vm-modules --test tests/audience-database.test.mjs`
Expected: FAIL because `buildEventKey` and the event-key column do not exist.

- [ ] **Step 3: Implement key generation and insertion**

```js
export function buildEventKey(event) {
  return event.type === "visit"
    ? `visit:${event.session}`
    : `camera_view:${event.session}:${event.camera}`;
}
```

Insert `(created_at, event_type, camera_id, session_id, host, event_key)` with `INSERT OR IGNORE`; bind the generated key last.

- [ ] **Step 4: Add a migration that works for existing and clean databases**

The migration must:

```sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  camera_id TEXT,
  session_id TEXT NOT NULL,
  host TEXT
);

CREATE TABLE events_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'camera_view')),
  camera_id TEXT,
  session_id TEXT NOT NULL,
  host TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO events_v2 (id, created_at, event_type, camera_id, session_id, host, event_key)
SELECT id, created_at, event_type,
       CASE WHEN event_type = 'camera_view' THEN camera_id ELSE NULL END,
       session_id, COALESCE(host, 'www.livesantamaria.org'),
       CASE WHEN event_type = 'visit'
            THEN 'visit:' || session_id
            ELSE 'camera_view:' || session_id || ':' || camera_id END
FROM events
WHERE event_type IN ('visit', 'camera_view')
  AND session_id IS NOT NULL
  AND (event_type = 'visit' OR camera_id IS NOT NULL)
ORDER BY id;

DROP TABLE events;
ALTER TABLE events_v2 RENAME TO events;
CREATE INDEX idx_events_created ON events(created_at);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_camera ON events(camera_id);
```

Mirror the final table and indexes in `database/schema.sql`.

Set `"migrations_dir": "database/migrations"` on the `LVSM_AUDIENCE` binding in `wrangler.jsonc` so local and remote Wrangler commands use the reviewed migration directory.

- [ ] **Step 5: Rehearse migration twice on a disposable local D1**

Run:

```powershell
npx wrangler d1 migrations apply LVSM_AUDIENCE --local
npx wrangler d1 migrations list LVSM_AUDIENCE --local
node --experimental-vm-modules --test tests/audience-database.test.mjs
```

Expected: first apply succeeds; list shows no pending migration; insertion tests PASS. Never run `--remote` in this task.

- [ ] **Step 6: Commit schema and deduplication**

```powershell
git add database/migrations/0001_audience_v2_event_keys.sql database/schema.sql wrangler.jsonc functions/api/audience/db.js tests/audience-database.test.mjs
git commit -m "fix: deduplicate audience events in D1"
```

### Task 4: Limit audience summaries to the retained 30-day window

**Files:**
- Modify: `functions/api/audience/summary.js`
- Create: `tests/audience-summary.test.mjs`

**Interfaces:**
- Consumes: D1 events and `getPeriodBoundaries(now)`.
- Produces: summary `visits: { today, yesterday, last7, last30 }` and top cameras restricted to the same 30-day boundary.

- [ ] **Step 1: Write failing boundary and query tests**

Export `getPeriodBoundaries` for direct testing. Freeze `now` around an Azores midnight and assert the returned boundaries include `last30Start`. Use a recording D1 fake and assert every 30-day/top query includes `created_at>=?` bound to that value. Assert the response has `last30` and has neither `total` nor `activatedAt`.

- [ ] **Step 2: Run and verify the old all-time shape fails**

Run: `node --experimental-vm-modules --test tests/audience-summary.test.mjs`
Expected: FAIL because the current endpoint returns `total` and `activatedAt` and queries top cameras without a cutoff.

- [ ] **Step 3: Implement the 30-day boundary and response**

Calculate the calendar day 29 days before today in `Atlantic/Azores`; bind its zoned midnight to both the visit count and top-camera queries. Remove the first-event query and all-time count. Return:

```js
visits: {
  today: todayResult.results[0]?.count ?? 0,
  yesterday: yesterdayResult.results[0]?.count ?? 0,
  last7: last7Result.results[0]?.count ?? 0,
  last30: last30Result.results[0]?.count ?? 0
}
```

- [ ] **Step 4: Run focused and complete Site tests**

```powershell
node --experimental-vm-modules --test tests/audience-summary.test.mjs
node --test tests/*.test.mjs
git diff --check
```

Expected: PASS with no all-time semantics.

- [ ] **Step 5: Commit bounded summaries**

```powershell
git add functions/api/audience/summary.js tests/audience-summary.test.mjs
git commit -m "fix: bound audience summaries to 30 days"
```

### Task 5: Add the daily retention Worker

**Files:**
- Create: `workers/audience-retention/src/index.js`
- Create: `workers/audience-retention/wrangler.jsonc`
- Create: `tests/audience-retention.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: scheduled event, environment `{ LVSM_AUDIENCE: D1Database }`, and current time.
- Produces: `deleteExpiredEvents(db, now) -> Promise<number>` and `scheduled(controller, env, ctx)`; no fetch handler and no public route.

- [ ] **Step 1: Write failing retention tests**

Use a recording D1 fake and fixed `2026-08-04T12:00:00.000Z`. Assert the deletion binds exactly `2026-07-05T12:00:00.000Z`, uses `created_at < ?`, returns the affected-row count, is idempotent, and logs only `{ outcome, deletedCount, durationMs }`. Assert captured logs contain no UUID fixture or SQL bindings.

- [ ] **Step 2: Run and verify failure**

Run: `node --experimental-vm-modules --test tests/audience-retention.test.mjs`
Expected: FAIL because the Worker module does not exist.

- [ ] **Step 3: Implement the single-purpose Worker**

```js
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function deleteExpiredEvents(db, now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_MS).toISOString();
  const result = await db.prepare("DELETE FROM events WHERE created_at < ?").bind(cutoff).run();
  return Number(result.meta?.changes ?? 0);
}

export default {
  async scheduled(_controller, env, _ctx) {
    const started = Date.now();
    try {
      const deletedCount = await deleteExpiredEvents(env.LVSM_AUDIENCE, new Date());
      console.log("[AudienceRetention]", { outcome: "ok", deletedCount, durationMs: Date.now() - started });
    } catch (_error) {
      console.error("[AudienceRetention]", { outcome: "error", deletedCount: 0, durationMs: Date.now() - started });
      throw new Error("audience retention failed");
    }
  }
};
```

- [ ] **Step 4: Configure a route-free daily cron**

Create a Worker config with the repository compatibility date, `main = "src/index.js"`, no `routes`, a daily UTC cron such as `17 4 * * *`, and the existing `LVSM_AUDIENCE` D1 binding. Add package scripts:

```json
"test": "node --experimental-vm-modules --test tests/*.test.mjs",
"retention:dry-run": "wrangler deploy --dry-run --config workers/audience-retention/wrangler.jsonc"
```

The unusual minute avoids common top-of-hour load; retention uses absolute UTC timestamps, so daylight-saving changes do not alter the 30-day duration.

- [ ] **Step 5: Validate locally without deployment**

```powershell
node --experimental-vm-modules --test tests/audience-retention.test.mjs
npm run retention:dry-run
npm test
git diff --check
```

Expected: all tests PASS; dry-run builds one scheduled Worker with no HTTP route and performs no upload.

- [ ] **Step 6: Commit retention Worker**

```powershell
git add workers/audience-retention/src/index.js workers/audience-retention/wrangler.jsonc tests/audience-retention.test.mjs package.json package-lock.json
git commit -m "feat: enforce audience event retention"
```

### Task 6: Prepare the WAF and privacy release gates

**Files:**
- Create: `docs/operations/audience-v2-runbook.md`
- Modify: `docs/superpowers/specs/2026-08-04-audience-v2-security-retention-design.md` only if implementation evidence requires a factual correction.

**Interfaces:**
- Consumes: Cloudflare Security Analytics for the exact audience POST path and the deployed retention Worker status.
- Produces: a secret-free runbook with exact WAF expression, measured threshold, effective action, test evidence, retention evidence, rollback, and the saved privacy-policy follow-up.

- [ ] **Step 1: Write the runbook acceptance checklist before changing Cloudflare**

Document this rule scope without account IDs or tokens:

```text
http.request.method eq "POST" and
http.request.uri.path eq "/api/audience/event" and
http.host eq "www.livesantamaria.org"
```

Require the operator to record: normal peak per IP, chosen requests/period, mitigation action/duration, observation start/end, false-positive result, owner, and review date. Do not prescribe a fabricated threshold; derive it from Security Analytics as Cloudflare recommends.

- [ ] **Step 2: Document the retention deployment gate**

Include commands that list migrations, create a private Time Travel bookmark record, apply migrations, dry-run then deploy the route-free Worker, inspect cron status, and verify one successful run. Mark every remote mutation as approval-gated and forbid printing secret values.

- [ ] **Step 3: Preserve the mandatory privacy follow-up**

Add a blocking checklist section for: controller/contact, purpose, lawful basis, Portuguese localStorage/consent assessment, Cloudflare processor/subprocessor review, rights procedure, 30-day disclosure, log retention/masking, policy owner, publication date, and version. State that the policy must describe deployed behavior.

- [ ] **Step 4: Review the runbook for secrets and ambiguous release authority**

Run:

```powershell
rg -n "token|secret|password|cookie|JWT|account_id|database_id" docs/operations/audience-v2-runbook.md
git diff --check
```

Expected: only secret names/prohibitions appear; no values, placeholders, direct deploy authorization, or claims that consent is unnecessary.

- [ ] **Step 5: Commit the operational gates**

```powershell
git add docs/operations/audience-v2-runbook.md
git commit -m "docs: add audience v2 release gates"
```

### Task 7: Final integrated verification and security revalidation

**Files:**
- Modify only files required to correct failures found by the commands below; do not broaden scope.

**Interfaces:**
- Consumes: deliverables from Tasks 1–6.
- Produces: evidence that the validated finding is remediated in code and gated at the edge, with no regression in PWA/Site sync.

- [ ] **Step 1: Run complete local verification**

```powershell
# PWA
node --test tests/*.test.mjs
git diff --check

# Site
npm test
npm run retention:dry-run
npx wrangler pages functions build
git diff --check
```

Expected: all suites and builds PASS; no remote upload occurs.

- [ ] **Step 2: Re-run focused security validation**

Validate source-to-sink behavior for oversized, malformed, duplicate, unknown-camera, and distinct-session requests using fakes/local D1 only. Confirm the first four do not consume new rows, while distinct valid sessions remain dependent on the mandatory WAF gate.

- [ ] **Step 3: Confirm privacy properties**

Search source, fixtures, generated output, and captured test logs for the UUID fixture. Confirm it appears only in test inputs/assertions, never operational logs. Confirm summary JSON contains no `session`, `eventKey`, IP, user agent, email, `total`, or `activatedAt` field.

- [ ] **Step 4: Inspect repository state and commits**

```powershell
git status --short --branch
git log --oneline --decorate -10
```

Expected: only intentional commits/files; no generated cache, local D1 state, credentials, or unrelated Infra changes.

- [ ] **Step 5: Stop for release approval**

Report test counts, dry-run result, migration rehearsal, unresolved external gates, and exact SHAs. Do not push, merge, apply remote migrations, deploy the Worker, enable WAF enforcement, or publish privacy text until the release owner approves those actions separately.
