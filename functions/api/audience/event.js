import { insertEvent } from "./db.js";
import audienceCatalog from "../../../audience.public.json" with { type: "json" };
import { readAudienceRequest, validateAudiencePayload } from "./validation.js";

function logAudienceEvent(eventType, camera, outcome) {
  try {
    console.log({ eventType, camera, outcome });
  } catch {
    // Telemetry must not affect audience-event ingestion.
  }
}

export async function onRequestPost(context) {

  const host = context.request.headers.get("host");

  if (host !== "www.livesantamaria.org") {
    return new Response(null, {
      status: 204
    });
  }

  let event;

  try {
    const body = await readAudienceRequest(context.request);
    event = validateAudiencePayload(body, new Set(audienceCatalog.cameraIds));
  } catch (error) {
    return Response.json(
      { error: "invalid request" },
      { status: error?.code === "body_too_large" ? 413 : 400 }
    );
  }

  try {
    await insertEvent(
      context.env.LVSM_AUDIENCE,
      { ...event, host }
    );
  } catch {
    logAudienceEvent(event.type, event.camera, "failed");
    return Response.json(
      { error: "service unavailable" },
      { status: 503 }
    );
  }

  logAudienceEvent(event.type, event.camera, "stored");

  return Response.json({
    ok: true
  });

}
