export async function insertEvent(db, event) {

  return db.prepare(`
    INSERT OR IGNORE INTO events (
      created_at,
      event_type,
      camera_id,
      session_id,
      host
    )
    VALUES (?, ?, ?, ?, ?)
  `)
  .bind(
    new Date().toISOString(),
    event.type,
    event.camera ?? null,
    event.session,
    event.host
  )
  .run();

}