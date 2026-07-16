import { insertEvent } from "./db.js";

export async function onRequestPost(context) {

  const host = context.request.headers.get("host");

  if (host !== "www.livesantamaria.org") {
    return new Response(null, {
      status: 204
    });
  }

  const body = await context.request.json();

  if (!body.event || !body.session) {
    return Response.json(
      { error: "invalid request" },
      { status: 400 }
    );
  }

  console.log("[Audience]", {
    event: body.event,
    camera: body.camera,
    session: body.session,
    host
  });

  const result = await insertEvent(
    context.env.LVSM_AUDIENCE,
    {
      type: body.event,
      camera: body.camera,
      session: body.session,
      host
    }
  );

  console.log("[Audience] DB", result);

  return Response.json({
    ok: true
  });

}