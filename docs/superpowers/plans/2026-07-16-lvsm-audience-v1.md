# LVSM Audience v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registar visitas e visualizações únicas de câmaras por sessão de 30 minutos no site público e apresentar um resumo simples no Control.

**Architecture:** O site público usa Cloudflare Pages Functions para gravar eventos numa base D1 já criada e ligada com o binding `LVSM_AUDIENCE`. O browser mantém uma sessão efémera de 30 minutos e uma lista de câmaras já vistas nessa sessão; apenas `www.livesantamaria.org` envia eventos. O Control consulta um endpoint de resumo protegido pelo próprio acesso do Control.

**Tech Stack:** JavaScript ES modules, Cloudflare Pages Functions, Cloudflare D1, Web Storage API, Node.js built-in test runner.

## Global Constraints

- Contar uma visita por sessão de 30 minutos.
- Contar cada câmara no máximo uma vez por sessão.
- Registar apenas tráfego de `www.livesantamaria.org`.
- Não guardar IP, User-Agent completo, cookies persistentes ou dados pessoais.
- Usar o fuso `Atlantic/Azores` nos totais diários.
- Eventos suportados: `visit` e `camera_view`.
- Binding D1: `LVSM_AUDIENCE`.
- Manter compatibilidade com o site atual e não bloquear a experiência se a API falhar.

---

## File Map

- `functions/api/audience/repository.js` — valida dados e encapsula todo o SQL D1.
- `functions/api/audience/event.js` — endpoint `POST /api/audience/event`.
- `functions/api/audience/summary.js` — endpoint `GET /api/audience/summary`.
- `assets/js/audience.js` — gestão de sessão e envio não bloqueante de eventos no browser.
- `index.html` — carrega o módulo e chama tracking no carregamento e no fullscreen.
- `tests/audience-repository.test.mjs` — testes unitários do repositório com D1 falso.
- `tests/audience-client.test.mjs` — testes unitários da sessão e deduplicação no browser.
- `tests/audience-summary.test.mjs` — testes do cálculo de intervalos e formato do resumo.
- `package.json` — comando `npm test` com `node --test`.
- `database/schema.sql` — schema D1 versionado, incluindo restrição de unicidade.

---

### Task 1: Endurecer o schema e criar o repositório D1

**Files:**
- Modify: `database/schema.sql`
- Create: `functions/api/audience/repository.js`
- Create: `tests/audience-repository.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `validateEventPayload(payload)`, `insertAudienceEvent(db, event)`, `getAudienceSummary(db, now)`.
- Event shape: `{ eventType: "visit" | "camera_view", cameraId: string | null, sessionId: string, host: string }`.

- [ ] **Step 1: Add the test script to `package.json`**

```json
{
  "scripts": {
    "test": "node --test tests/*.test.mjs"
  }
}
```

- [ ] **Step 2: Write failing repository tests**

Create `tests/audience-repository.test.mjs` with tests that verify:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import {
  validateEventPayload,
  insertAudienceEvent
} from "../functions/api/audience/repository.js";

test("accepts a valid visit", () => {
  assert.deepEqual(
    validateEventPayload({
      event: "visit",
      session: "123e4567-e89b-12d3-a456-426614174000",
      host: "www.livesantamaria.org"
    }),
    {
      eventType: "visit",
      cameraId: null,
      sessionId: "123e4567-e89b-12d3-a456-426614174000",
      host: "www.livesantamaria.org"
    }
  );
});

test("rejects camera_view without camera id", () => {
  assert.throws(
    () => validateEventPayload({ event: "camera_view", session: "abc", host: "www.livesantamaria.org" }),
    /camera/i
  );
});

test("insert ignores duplicate unique events", async () => {
  const calls = [];
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          calls.push({ sql, args });
          return { run: async () => ({ success: true, meta: { changes: 0 } }) };
        }
      };
    }
  };

  const result = await insertAudienceEvent(db, {
    eventType: "visit",
    cameraId: null,
    sessionId: "session-1",
    host: "www.livesantamaria.org"
  });

  assert.equal(result.inserted, false);
  assert.equal(calls.length, 1);
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```powershell
npm test
```

Expected: failure because `repository.js` does not exist.

- [ ] **Step 4: Update the schema**

Use this complete table definition in `database/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'camera_view')),
  camera_id TEXT,
  session_id TEXT NOT NULL,
  host TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_type_created_at ON events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_camera_created_at ON events(camera_id, created_at);
```

`event_key` must be generated as:

- `visit:<sessionId>` for visits.
- `camera_view:<sessionId>:<cameraId>` for camera views.

- [ ] **Step 5: Implement the repository**

Create `functions/api/audience/repository.js` with:

```javascript
const EVENT_TYPES = new Set(["visit", "camera_view"]);
const HOST = "www.livesantamaria.org";
const ID_PATTERN = /^[a-zA-Z0-9._:-]{1,128}$/;

export function validateEventPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid payload");

  const eventType = String(payload.event || "");
  const sessionId = String(payload.session || "");
  const host = String(payload.host || "");
  const cameraId = payload.camera == null ? null : String(payload.camera);

  if (!EVENT_TYPES.has(eventType)) throw new Error("Invalid event type");
  if (!ID_PATTERN.test(sessionId)) throw new Error("Invalid session id");
  if (host !== HOST) throw new Error("Invalid host");
  if (eventType === "camera_view" && !ID_PATTERN.test(cameraId || "")) {
    throw new Error("Invalid camera id");
  }

  return { eventType, cameraId, sessionId, host };
}

export async function insertAudienceEvent(db, event) {
  const eventKey = event.eventType === "visit"
    ? `visit:${event.sessionId}`
    : `camera_view:${event.sessionId}:${event.cameraId}`;

  const result = await db
    .prepare(`
      INSERT OR IGNORE INTO events
        (event_type, camera_id, session_id, host, event_key)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(event.eventType, event.cameraId, event.sessionId, event.host, eventKey)
    .run();

  return { inserted: Number(result?.meta?.changes || 0) > 0 };
}
```

- [ ] **Step 6: Run tests and verify pass**

Run `npm test`.

Expected: all repository tests pass.

- [ ] **Step 7: Apply the revised schema remotely**

Because the current table is empty, recreate it cleanly:

```powershell
npx wrangler d1 execute LVSM_AUDIENCE --remote --command "DROP TABLE IF EXISTS events;"
npx wrangler d1 execute LVSM_AUDIENCE --remote --file=database/schema.sql
```

Verify:

```powershell
npx wrangler d1 execute LVSM_AUDIENCE --remote --command "PRAGMA table_info(events);"
```

Expected: columns include `host` and `event_key`.

- [ ] **Step 8: Commit**

```powershell
git add database/schema.sql functions/api/audience/repository.js tests/audience-repository.test.mjs package.json package-lock.json
git commit -m "feat: add audience event repository"
```

---

### Task 2: Criar o endpoint de registo de eventos

**Files:**
- Create: `functions/api/audience/event.js`
- Create: `tests/audience-event.test.mjs`

**Interfaces:**
- Consumes: `validateEventPayload(payload)` and `insertAudienceEvent(db, event)`.
- Produces: `POST /api/audience/event` returning `201`, `200`, `204`, `400`, or `503`.

- [ ] **Step 1: Write failing endpoint tests**

Test these cases with a mocked Pages context:

- Production visit inserts and returns `201`.
- Duplicate returns `200`.
- Non-public host returns `204` without DB access.
- Invalid payload returns `400`.
- Missing D1 binding returns `503`.

- [ ] **Step 2: Run the endpoint test and verify failure**

Run:

```powershell
node --test tests/audience-event.test.mjs
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement `event.js`**

```javascript
import {
  insertAudienceEvent,
  validateEventPayload
} from "./repository.js";

const PUBLIC_HOST = "www.livesantamaria.org";

function json(body, status) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": `https://${PUBLIC_HOST}`,
      "Vary": "Origin"
    }
  });
}

export async function onRequestPost(context) {
  const requestHost = new URL(context.request.url).hostname;
  const origin = context.request.headers.get("Origin");

  if (requestHost !== PUBLIC_HOST || origin !== `https://${PUBLIC_HOST}`) {
    return new Response(null, { status: 204 });
  }

  if (!context.env?.LVSM_AUDIENCE) {
    return json({ ok: false, error: "Audience database unavailable" }, 503);
  }

  try {
    const payload = await context.request.json();
    const event = validateEventPayload({ ...payload, host: requestHost });
    const result = await insertAudienceEvent(context.env.LVSM_AUDIENCE, event);
    return json({ ok: true, inserted: result.inserted }, result.inserted ? 201 : 200);
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, 400);
  }
}
```

- [ ] **Step 4: Run tests and verify pass**

Run `npm test`.

- [ ] **Step 5: Commit**

```powershell
git add functions/api/audience/event.js tests/audience-event.test.mjs
git commit -m "feat: add audience event endpoint"
```

---

### Task 3: Criar o endpoint de resumo

**Files:**
- Modify: `functions/api/audience/repository.js`
- Create: `functions/api/audience/summary.js`
- Create: `tests/audience-summary.test.mjs`

**Interfaces:**
- Produces response shape:

```json
{
  "since": "2026-07-16",
  "today": 0,
  "yesterday": 0,
  "last7": 0,
  "total": 0,
  "cameraViewsToday": 0,
  "top": [{ "camera": "anjos-porto", "count": 1 }]
}
```

- [ ] **Step 1: Write failing summary tests**

Verify:

- Date boundaries are generated for `Atlantic/Azores`.
- Visit totals use only `event_type = 'visit'`.
- Camera ranking uses only `camera_view`.
- Top list is limited to five rows and ordered by count descending.

- [ ] **Step 2: Run tests and verify failure**

Run `node --test tests/audience-summary.test.mjs`.

- [ ] **Step 3: Implement summary queries in the repository**

Use D1 `batch()` with separate prepared statements for today, yesterday, last seven days, total, today's camera views, and top five cameras. Build UTC ISO boundaries in JavaScript from `Atlantic/Azores`, then bind them to SQL; do not use SQLite's local timezone.

- [ ] **Step 4: Implement `summary.js`**

```javascript
import { getAudienceSummary } from "./repository.js";

export async function onRequestGet(context) {
  if (!context.env?.LVSM_AUDIENCE) {
    return Response.json(
      { ok: false, error: "Audience database unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const summary = await getAudienceSummary(
    context.env.LVSM_AUDIENCE,
    new Date()
  );

  return Response.json(summary, {
    headers: { "Cache-Control": "private, max-age=60" }
  });
}
```

- [ ] **Step 5: Run tests and verify pass**

Run `npm test`.

- [ ] **Step 6: Commit**

```powershell
git add functions/api/audience/repository.js functions/api/audience/summary.js tests/audience-summary.test.mjs
git commit -m "feat: add audience summary endpoint"
```

---

### Task 4: Implementar sessões e tracking no Site

**Files:**
- Create: `assets/js/audience.js`
- Create: `tests/audience-client.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Produces globals: `window.LVSMAudience.trackVisit()` and `window.LVSMAudience.trackCameraView(cameraId)`.

- [ ] **Step 1: Write failing client tests**

Test pure exported helpers:

- `getOrCreateSession(storage, now)` reuses a session while `now - lastActivity < 30 minutes`.
- It creates a new UUID after 30 minutes.
- `markCameraViewed(session, cameraId)` returns false on a repeated camera.
- Tracking is disabled unless hostname is exactly `www.livesantamaria.org`.

- [ ] **Step 2: Run tests and verify failure**

Run `node --test tests/audience-client.test.mjs`.

- [ ] **Step 3: Implement `assets/js/audience.js`**

Use `localStorage`, not `sessionStorage`, because refreshes and reopened tabs within 30 minutes must remain the same visit. Store one JSON object under `lvsm-audience-session-v1`:

```json
{
  "id": "uuid",
  "lastActivity": 0,
  "visitedCameras": []
}
```

Rules:

- Expire after 1,800,000 ms of inactivity.
- Update `lastActivity` on each tracked action.
- Send events with `fetch('/api/audience/event', { method: 'POST', keepalive: true, ... })`.
- Swallow network errors with `.catch(() => {})`.
- Never send outside the public hostname.

- [ ] **Step 4: Integrate with `index.html`**

Add before the main inline application script:

```html
<script type="module" src="./assets/js/audience.js?v=1"></script>
```

After initial page setup, call:

```javascript
window.LVSMAudience?.trackVisit();
```

At the start of `openCameraFullscreen(cam)`, after confirming it is a real HLS or snapshot camera, call:

```javascript
window.LVSMAudience?.trackCameraView(cam.id);
```

Do not track promo cards or future cards.

- [ ] **Step 5: Run tests and verify pass**

Run `npm test`.

- [ ] **Step 6: Manual local verification**

In local development, verify that no requests are sent because hostname is `127.0.0.1`.

- [ ] **Step 7: Commit**

```powershell
git add assets/js/audience.js tests/audience-client.test.mjs index.html
git commit -m "feat: track public audience sessions"
```

---

### Task 5: Publicar e validar a recolha em produção

**Files:**
- No source changes unless a deployment issue is found.

- [ ] **Step 1: Push `lab` and verify the Cloudflare preview build**

```powershell
git push origin lab
```

Expected: Pages build succeeds and includes the D1 binding.

- [ ] **Step 2: Test the endpoint in the public deployment**

From browser console on `www.livesantamaria.org`, run:

```javascript
fetch('/api/audience/event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'visit',
    session: crypto.randomUUID()
  })
}).then(r => r.json()).then(console.log);
```

Expected: `{ ok: true, inserted: true }`.

- [ ] **Step 3: Verify D1 has one row**

```powershell
npx wrangler d1 execute LVSM_AUDIENCE --remote --command "SELECT event_type, camera_id, session_id, host, created_at FROM events ORDER BY id DESC LIMIT 5;"
```

- [ ] **Step 4: Verify deduplication**

Repeat the same event with the same session ID. Expected response: `inserted: false`; D1 row count unchanged.

- [ ] **Step 5: Verify test environment exclusion**

Open `teste.livesantamaria.org`; confirm Network shows no audience POSTs.

- [ ] **Step 6: Verify summary endpoint**

Open `/api/audience/summary` in an authenticated Control/browser context. Confirm totals and `top` match D1.

---

### Task 6: Adicionar o cartão Audiência ao Control

**Files:**
- Modify in repository `lgtc2730/livesantamaria-pwa`: the existing dashboard markup, styles, and application script that render summary cards.
- Add tests in the PWA's existing test structure, or create `tests/audience-panel.test.mjs` if none exists.

**Interfaces:**
- Consumes: `GET https://www.livesantamaria.org/api/audience/summary`.
- Displays: today, yesterday, last7, total, cameraViewsToday, top five.

- [ ] **Step 1: Locate the existing dashboard card pattern**

Search for the cards used for node counts or operational totals. Reuse the same component and visual language.

- [ ] **Step 2: Write a failing formatter/render test**

Given the summary JSON, verify the generated view model contains Portuguese labels:

```text
Hoje
Ontem
Últimos 7 dias
Total
Aberturas hoje
Top câmaras
```

- [ ] **Step 3: Add the Audience card**

Requirements:

- Show `—` while loading.
- Show `Indisponível` on network failure without breaking the dashboard.
- Refresh on initial load and every five minutes.
- Map camera IDs to names using the Control's existing camera registry.
- Show the activation date from `since`.

- [ ] **Step 4: Run PWA tests**

Use the repository's existing test command; if none exists, use `node --test tests/*.test.mjs`.

- [ ] **Step 5: Commit in the PWA repository**

```powershell
git add <modified-files>
git commit -m "feat: show audience summary in Control"
```

---

## Final Verification

- [ ] `npm test` passes in the Site repository.
- [ ] Cloudflare Pages build passes.
- [ ] A refresh within 30 minutes does not add a second visit.
- [ ] Reopening the same camera in one session does not add a second `camera_view`.
- [ ] Opening a different camera adds one `camera_view`.
- [ ] `teste.livesantamaria.org` records nothing.
- [ ] D1 contains no IP, User-Agent, persistent cookie, or personal data.
- [ ] Control shows Today, Yesterday, Last 7 days, Total, Openings today, and Top 5.
- [ ] Site remains functional if the Audience API returns an error.
