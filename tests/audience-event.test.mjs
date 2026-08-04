import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const validSession = "123e4567-e89b-42d3-a456-426614174000";

async function loadEvent(insertEvent) {
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
    eventSource
      .replace('import { insertEvent } from "./db.js";\n', "")
      .replace('import audienceCatalog from "../../../audience.public.json" with { type: "json" };\n', "")
      .replace('import { readAudienceRequest, validateAudiencePayload } from "./validation.js";\n', "")
  ].join("\n");
  const eventUrl = `data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}#${crypto.randomUUID()}`;

  try {
    const event = await import(eventUrl);
    return { onRequestPost: event.onRequestPost, logs };
  } finally {
    delete globalThis.__audienceEventTestDependencies;
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
