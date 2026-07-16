export async function onRequestGet(context) {

  const total = await context.env.LVSM_AUDIENCE
    .prepare(`
      SELECT COUNT(*) AS total
      FROM events
      WHERE event_type='visit'
    `)
    .first();

  return Response.json(total);

}