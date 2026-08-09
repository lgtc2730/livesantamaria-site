import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const projectRoot = new URL("../", import.meta.url);
const validSession = "123e4567-e89b-42d3-a456-426614174000";

test("Pages Functions source avoids unsupported JSON import attributes", async () => {
  const source = await readFile(
    new URL("functions/api/audience/event.js", projectRoot),
    "utf8"
  );

  assert.match(source, /import audienceCatalog from "\.\.\/\.\.\/\.\.\/audience\.public\.json";/);
  assert.doesNotMatch(source, /\bwith\s*\{\s*type\s*:\s*["']json["']\s*\}/);
});

async function loadEvent(insertEvent, transformEventSource = source => source) {
  const [eventSource, validationSource, catalogSource] = await Promise.all([
    readFile(new URL("functions/api/audience/event.js", projectRoot), "utf8"),
    readFile(new URL("functions/api/audience/validation.js", projectRoot), "utf8"),
    readFile(new URL("audience.public.json", projectRoot), "utf8")
  ]);
  const logs = [];
  const validationUrl = `data:text/javascript;base64,${Buffer.from(validationSource).toString("base64")}`;
  const validation = await import(validationUrl);
  globalThis.__audienceEventTestDependencies = {
    insertEvent,
    audienceCatalog: JSON.parse(catalogSource),
    readAudienceRequest: validation.readAudienceRequest,
    validateAudiencePayload: validation.validateAudiencePayload,
    console: { log: (...args) => logs.push(args) }
  };

  const moduleSource = [
    "const { insertEvent, audienceCatalog, readAudienceRequest, validateAudiencePayload, console } = globalThis.__audienceEventTestDependencies;",
    transformEventSource(eventSource)
      .replace(/^import \{ insertEvent \} from "\.\/db\.js";\r?\n/, "")
      .replace(/^import audienceCatalog from "\.\.\/\.\.\/\.\.\/audience\.public\.json";\r?\n/, "")
      .replace(/^import \{ readAudienceRequest, validateAudiencePayload \} from "\.\/validation\.js";\r?\n/, "")
  ].join("\n");
  const eventUrl = `data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}#${crypto.randomUUID()}`;

  try {
    const event = await import(eventUrl);
    return { onRequestPost: event.onRequestPost, logs };
  } finally {
    delete globalThis.__audienceEventTestDependencies;
  }
}

async function loadDatabase() {
  const source = await readFile(
    new URL("functions/api/audience/db.js", projectRoot),
    "utf8"
  );
  const sourceUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${crypto.randomUUID()}`;
  return import(sourceUrl);
}

async function loadBrowserAudience(fetchImpl, initialStorage = {}) {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const start = html.indexOf('const AUDIENCE_SESSION_KEY = "lvsm-audience-session";');
  const end = html.indexOf('document.addEventListener("visibilitychange"', start);
  assert.notEqual(start, -1, "audience browser session code must exist");
  assert.notEqual(end, -1, "audience browser code must precede visibility handling");

  const stored = new Map(Object.entries(initialStorage));
  const storageOperations = [];
  const elements = new Map();
  let activeElement = null;
  for (const id of ["audienceConsentPanel", "audienceConsentClose", "audienceConsentMore", "audienceConsentAccept", "audienceConsentRefuse", "audiencePrivacySettings"]) {
    elements.set(id, {
      id,
      hidden: false,
      listeners: new Map(),
      addEventListener(type, listener) {
        this.listeners.set(type, listener);
      },
      click() {
        this.listeners.get("click")?.();
      },
      dispatch(type, event = {}) {
        this.listeners.get(type)?.(event);
      },
      focus() {
        activeElement = this;
      }
    });
  }
  const panel = elements.get("audienceConsentPanel");
  const focusableElements = [
    elements.get("audienceConsentClose"),
    elements.get("audienceConsentMore"),
    elements.get("audienceConsentAccept"),
    elements.get("audienceConsentRefuse")
  ];
  panel.querySelectorAll = () => focusableElements;
  panel.contains = element => focusableElements.includes(element);
  const document = {
    get activeElement() {
      return activeElement;
    },
    getElementById: id => elements.get(id) || null,
    contains: element => [...elements.values()].includes(element)
  };
  const context = {
    console: { warn() {} },
    crypto: { randomUUID: () => validSession },
    Date,
    fetch: fetchImpl,
    JSON,
    document,
    localStorage: {
      getItem: key => {
        storageOperations.push(["get", key]);
        return stored.get(key) ?? null;
      },
      setItem: (key, value) => {
        storageOperations.push(["set", key]);
        stored.set(key, value);
      },
      removeItem: key => {
        storageOperations.push(["remove", key]);
        stored.delete(key);
      }
    },
    location: { hostname: "www.livesantamaria.org" }
  };

  vm.runInNewContext(
    `${html.slice(start, end)}
globalThis.__audience = {
  sendAudienceEvent,
  getAudienceConsent,
  setAudienceConsent,
  clearAudienceSession,
  initializeAudienceConsentControls
};`,
    context
  );
  return { ...context.__audience, stored, storageOperations, elements, document };
}

class DeduplicatingD1 {
  statements = [];
  rows = [];

  prepare(sql) {
    return {
      bind: (...values) => ({
        run: async () => {
          this.statements.push({ sql, values });
          const eventKey = values[5];
          if (this.rows.some(row => row.eventKey === eventKey)) {
            return { success: true, meta: { changes: 0 } };
          }
          this.rows.push({ eventKey, values });
          return { success: true, meta: { changes: 1 } };
        }
      })
    };
  }
}

function eventRequest(payload) {
  return new Request("https://www.livesantamaria.org/api/audience/event", {
    method: "POST",
    headers: {
      host: "www.livesantamaria.org",
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

test("the real browser visit payload passes the handler and inserts once across a retry", async () => {
  const { insertEvent } = await loadDatabase();
  const { onRequestPost } = await loadEvent(insertEvent);
  const db = new DeduplicatingD1();
  const payloads = [];
  const statuses = [];
  const { sendAudienceEvent } = await loadBrowserAudience(async (url, options) => {
    payloads.push(JSON.parse(options.body));
    const response = await onRequestPost({
      request: new Request(new URL(url, "https://www.livesantamaria.org"), {
        ...options,
        headers: {
          ...options.headers,
          host: "www.livesantamaria.org"
        }
      }),
      env: { LVSM_AUDIENCE: db }
    });
    statuses.push(response.status);
    return response;
  }, { "lvsm-audience-consent-v1": "accepted" });

  await sendAudienceEvent("visit");
  await sendAudienceEvent("visit");

  assert.deepEqual(payloads, [
    { event: "visit", session: validSession },
    { event: "visit", session: validSession }
  ]);
  assert.deepEqual(statuses, [200, 200]);
  assert.equal(db.statements.length, 2);
  assert.equal(db.rows.length, 1);
});

test("pending consent neither touches the audience session nor sends an event", async () => {
  let requests = 0;
  const browser = await loadBrowserAudience(async () => {
    requests += 1;
  });

  await browser.sendAudienceEvent("visit");

  assert.equal(requests, 0);
  assert.equal(
    browser.storageOperations.some(([, key]) => key === "lvsm-audience-session"),
    false
  );
});

test("refusing consent removes legacy audience state and keeps events disabled", async () => {
  let requests = 0;
  const browser = await loadBrowserAudience(async () => {
    requests += 1;
  }, {
    "lvsm-audience-session": JSON.stringify({ id: validSession, lastActivity: Date.now(), cameras: [] })
  });

  browser.setAudienceConsent("refused");
  await browser.sendAudienceEvent("camera_view", "cnsm");

  assert.equal(browser.stored.get("lvsm-audience-consent-v1"), "refused");
  assert.equal(browser.stored.has("lvsm-audience-session"), false);
  assert.equal(requests, 0);
});

test("withdrawing accepted consent clears the session and disables later events", async () => {
  let requests = 0;
  const browser = await loadBrowserAudience(async () => {
    requests += 1;
    return new Response(null, { status: 200 });
  }, { "lvsm-audience-consent-v1": "accepted" });

  await browser.sendAudienceEvent("visit");
  browser.setAudienceConsent("refused");
  await browser.sendAudienceEvent("camera_view", "cnsm");

  assert.equal(requests, 1);
  assert.equal(browser.stored.has("lvsm-audience-session"), false);
});

test("consent controls keep choices optional and start metrics only after acceptance", async () => {
  const payloads = [];
  const browser = await loadBrowserAudience(async (_url, options) => {
    payloads.push(JSON.parse(options.body));
    return new Response(null, { status: 200 });
  });

  browser.initializeAudienceConsentControls();
  const panel = browser.elements.get("audienceConsentPanel");

  assert.equal(panel.hidden, false);
  assert.deepEqual(payloads, []);

  browser.elements.get("audienceConsentRefuse").click();
  assert.equal(panel.hidden, true);
  assert.deepEqual(payloads, []);

  browser.elements.get("audiencePrivacySettings").click();
  assert.equal(panel.hidden, false);

  browser.elements.get("audienceConsentAccept").click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(panel.hidden, true);
  assert.deepEqual(payloads, [{ event: "visit", session: validSession }]);
});

test("consent dialog closes without choosing and restores its trigger", async () => {
  const payloads = [];
  const browser = await loadBrowserAudience(async (_url, options) => {
    payloads.push(JSON.parse(options.body));
    return new Response(null, { status: 200 });
  });
  const settings = browser.elements.get("audiencePrivacySettings");
  const close = browser.elements.get("audienceConsentClose");
  const panel = browser.elements.get("audienceConsentPanel");

  settings.focus();
  browser.initializeAudienceConsentControls();
  assert.equal(browser.document.activeElement, close);

  close.click();
  assert.equal(panel.hidden, true);
  assert.equal(browser.document.activeElement, settings);
  assert.equal(browser.stored.has("lvsm-audience-consent-v1"), false);
  assert.deepEqual(payloads, []);

  settings.click();
  let prevented = 0;
  panel.dispatch("keydown", {
    key: "Escape",
    preventDefault() { prevented += 1; }
  });
  assert.equal(prevented, 1);
  assert.equal(panel.hidden, true);
  assert.equal(browser.document.activeElement, settings);
  assert.equal(browser.stored.has("lvsm-audience-consent-v1"), false);
  assert.deepEqual(payloads, []);
});

test("consent dialog traps forward and reverse keyboard focus", async () => {
  const browser = await loadBrowserAudience(async () => new Response(null, { status: 200 }));
  const panel = browser.elements.get("audienceConsentPanel");
  const close = browser.elements.get("audienceConsentClose");
  const refuse = browser.elements.get("audienceConsentRefuse");
  browser.initializeAudienceConsentControls();

  let prevented = 0;
  refuse.focus();
  panel.dispatch("keydown", {
    key: "Tab",
    shiftKey: false,
    preventDefault() { prevented += 1; }
  });
  assert.equal(browser.document.activeElement, close);

  close.focus();
  panel.dispatch("keydown", {
    key: "Tab",
    shiftKey: true,
    preventDefault() { prevented += 1; }
  });
  assert.equal(browser.document.activeElement, refuse);
  assert.equal(prevented, 2);
});

test("loads LF and CRLF handler sources without redeclaring injected dependencies", async () => {
  for (const lineEnding of ["\n", "\r\n"]) {
    let sourceWasConverted = false;
    const { onRequestPost } = await loadEvent(
      async () => ({ success: true, meta: { changed_db: true } }),
      eventSource => {
        sourceWasConverted = true;
        return eventSource.replace(/\r?\n/g, lineEnding);
      }
    );

    assert.equal(sourceWasConverted, true, `source transformer must run for ${JSON.stringify(lineEnding)}`);
    const response = await onRequestPost({
      request: eventRequest({ event: "visit", session: validSession }),
      env: { LVSM_AUDIENCE: {} }
    });

    assert.equal(response.status, 200, `handler must load with ${JSON.stringify(lineEnding)} source`);
  }
});

test("stores a normalized allowed event and records only safe telemetry", async () => {
  const inserted = [];
  const { onRequestPost, logs } = await loadEvent(async (_db, event) => {
    inserted.push(event);
    return { success: true, meta: { changed_db: true } };
  });
  const payload = { event: "camera_view", session: validSession, camera: "cnsm" };

  const response = await onRequestPost({
    request: eventRequest(payload),
    env: { LVSM_AUDIENCE: {} }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(inserted)), [{
    type: "camera_view",
    session: validSession,
    camera: "cnsm",
    host: "www.livesantamaria.org"
  }]);
  assert.deepEqual(JSON.parse(JSON.stringify(logs)), [[{
    eventType: "camera_view",
    camera: "cnsm",
    outcome: "stored"
  }]]);
  assert.doesNotMatch(JSON.stringify(logs), new RegExp(validSession));
  assert.doesNotMatch(JSON.stringify(logs), /camera_view.*session|changed_db/i);
});

test("returns a safe client error without writing invalid events", async () => {
  let writes = 0;
  const { onRequestPost, logs } = await loadEvent(async () => {
    writes += 1;
  });

  const response = await onRequestPost({
    request: eventRequest({ event: "camera_view", session: validSession, camera: "hidden" }),
    env: { LVSM_AUDIENCE: {} }
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid request" });
  assert.equal(writes, 0);
  assert.deepEqual(logs, []);
});

test("returns 413 before reading a declared oversized audience event", async () => {
  let writes = 0;
  const { onRequestPost } = await loadEvent(async () => {
    writes += 1;
  });
  const request = new Request("https://www.livesantamaria.org/api/audience/event", {
    method: "POST",
    headers: {
      host: "www.livesantamaria.org",
      "content-type": "application/json",
      "content-length": "513"
    },
    body: "{}"
  });

  const response = await onRequestPost({ request, env: { LVSM_AUDIENCE: {} } });

  assert.equal(response.status, 413);
  assert.equal(writes, 0);
});

test("contains D1 failures behind a safe response and safe telemetry", async () => {
  const { onRequestPost, logs } = await loadEvent(async () => {
    throw new Error(`D1 failed for ${validSession}`);
  });

  const response = await onRequestPost({
    request: eventRequest({ event: "visit", session: validSession }),
    env: { LVSM_AUDIENCE: {} }
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "service unavailable" });
  assert.deepEqual(JSON.parse(JSON.stringify(logs)), [[{
    eventType: "visit",
    camera: null,
    outcome: "failed"
  }]]);
  assert.doesNotMatch(JSON.stringify(logs), new RegExp(validSession));
});
