export function buildEventKey(event) {
  return event.type === "visit"
    ? `visit:${event.session}`
    : `camera_view:${event.session}:${event.camera}`;
}

export async function insertEvent(db, event) {
  return db.prepare(`
    INSERT OR IGNORE INTO events (
      created_at,
      event_type,
      camera_id,
      session_id,
      host,
      event_key
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  .bind(
    new Date().toISOString(),
    event.type,
    event.camera ?? null,
    event.session,
    event.host,
    buildEventKey(event)
  )
  .run();
}
