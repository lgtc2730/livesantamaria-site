import { insertEvent } from "./db.js";

export async function onRequestPost(context) {

  const host = context.request.headers.get("host");

  // Apenas contamos o site público
  if (host !== "www.livesantamaria.org") {
    return new Response(null, { status: 204 });
  }

  const body = await context.request.json();

  if (!body.event || !body.session) {
    return Response.json(
      { error: "invalid request" },
      { status: 400 }
    );
  }

  await insertEvent(context.env.LVSM_AUDIENCE, {
    type: body.event,
    camera: body.camera,
    session: body.session,
    host
  });

  return Response.json({ ok: true });

}