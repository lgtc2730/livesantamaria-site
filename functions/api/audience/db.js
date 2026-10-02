import { azoresCalendarDate } from "./calendar.js";

function encodeEventKeyPart(value) {
  return Array.from(
    new TextEncoder().encode(value),
    byte => byte.toString(16).padStart(2, "0").toUpperCase()
  ).join("");
}

export function buildEventKey(event) {
  return event.type === "visit"
    ? `v1:visit:${encodeEventKeyPart(event.session)}`
    : `v1:camera_view:${encodeEventKeyPart(event.session)}:${encodeEventKeyPart(event.camera)}`;
}

export async function insertEvent(db, event, { now = () => new Date() } = {}) {
  const createdAt = now();
  return db.prepare(`
    INSERT OR IGNORE INTO events (
      created_at,
      aggregate_date,
      event_type,
      camera_id,
      session_id,
      host,
      event_key
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  .bind(
    createdAt.toISOString(),
    azoresCalendarDate(createdAt),
    event.type,
    event.camera ?? null,
    event.session,
    event.host,
    buildEventKey(event)
  )
  .run();
}
