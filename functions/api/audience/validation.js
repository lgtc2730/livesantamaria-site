export const MAX_BODY_BYTES = 512;
export const SESSION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CAMERA_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const EVENT_TYPES = new Set(["visit", "camera_view"]);

function invalidRequest() {
  const error = new Error("invalid request");
  error.code = "invalid_request";
  return error;
}

function bodyTooLarge() {
  const error = new Error("request body too large");
  error.code = "body_too_large";
  return error;
}

export function validateAudiencePayload(value, cameraIds) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidRequest();
  const keys = Object.keys(value).sort();
  const expected = value.event === "camera_view" ? ["camera", "event", "session"] : ["event", "session"];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) throw invalidRequest();
  if (!EVENT_TYPES.has(value.event) || typeof value.session !== "string" || !SESSION_PATTERN.test(value.session)) throw invalidRequest();
  if (value.event === "visit") return { type: "visit", session: value.session, camera: null };
  if (typeof value.camera !== "string" || !CAMERA_ID_PATTERN.test(value.camera) || !cameraIds.has(value.camera)) throw invalidRequest();
  return { type: "camera_view", session: value.session, camera: value.camera };
}

export async function readAudienceRequest(request) {
  const contentType = request.headers.get("content-type");
  if (!contentType || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw invalidRequest();
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const length = Number(contentLength);
    if (!Number.isSafeInteger(length) || length < 0) throw invalidRequest();
    if (length > MAX_BODY_BYTES) throw bodyTooLarge();
  }

  if (!request.body) throw invalidRequest();

  try {
    const reader = request.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let bytesRead = 0;
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_BODY_BYTES) throw bodyTooLarge();
      text += decoder.decode(value, { stream: true });
    }

    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error?.code === "body_too_large") throw error;
    throw invalidRequest();
  }
}
