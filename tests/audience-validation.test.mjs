import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const validSession = "123e4567-e89b-42d3-a456-426614174000";

async function loadValidation() {
  const source = await readFile(
    new URL("functions/api/audience/validation.js", projectRoot),
    "utf8"
  );
  const sourceUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(sourceUrl);
}

async function invalidRequest(read) {
  await assert.rejects(read, error => error?.code === "invalid_request");
}

test("accepts only the allowed camera-view payload shape", async () => {
  const { validateAudiencePayload } = await loadValidation();
  const cameraIds = new Set(["cnsm"]);

  assert.deepEqual(
    JSON.parse(JSON.stringify(validateAudiencePayload(
      { event: "camera_view", session: validSession, camera: "cnsm" },
      cameraIds
    ))),
    { type: "camera_view", session: validSession, camera: "cnsm" }
  );
  assert.throws(
    () => validateAudiencePayload({ event: "other", session: validSession }, cameraIds),
    /invalid request/i
  );
  assert.throws(
    () => validateAudiencePayload({ event: "visit", session: validSession, camera: "cnsm" }, cameraIds),
    /invalid request/i
  );
  assert.throws(
    () => validateAudiencePayload({ event: "camera_view", session: validSession, camera: "hidden" }, cameraIds),
    /invalid request/i
  );
  assert.throws(
    () => validateAudiencePayload({ event: "visit", session: validSession, extra: true }, cameraIds),
    /invalid request/i
  );
});

test("rejects non-JSON, malformed, and oversized request bodies", async () => {
  const { MAX_BODY_BYTES, readAudienceRequest } = await loadValidation();

  await invalidRequest(() => readAudienceRequest(new Request("https://example.test", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "not json"
  })));
  await invalidRequest(() => readAudienceRequest(new Request("https://example.test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  })));

  await assert.rejects(
    () => readAudienceRequest(new Request("https://example.test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(MAX_BODY_BYTES + 1)
      },
      body: "{}"
    })),
    error => error?.code === "body_too_large"
  );

  const streamedBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(MAX_BODY_BYTES + 1)));
      controller.close();
    }
  });
  await assert.rejects(
    () => readAudienceRequest(new Request("https://example.test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: streamedBody,
      duplex: "half"
    })),
    error => error?.code === "body_too_large"
  );
});
