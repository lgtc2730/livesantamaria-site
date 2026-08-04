CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  camera_id TEXT,
  session_id TEXT NOT NULL,
  host TEXT,
  event_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_created
ON events(created_at);

CREATE INDEX IF NOT EXISTS idx_events_type
ON events(event_type);

CREATE INDEX IF NOT EXISTS idx_events_camera
ON events(camera_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_event_key_unique
ON events(event_key)
WHERE event_key IS NOT NULL;
