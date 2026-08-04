CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  camera_id TEXT,
  session_id TEXT NOT NULL,
  host TEXT
);

ALTER TABLE events ADD COLUMN event_key TEXT;

UPDATE events
SET event_key =
  CASE event_type
    WHEN 'visit' THEN
      'v1:visit:' || hex(CAST(session_id AS BLOB))
    WHEN 'camera_view' THEN
      'v1:camera_view:' || hex(CAST(session_id AS BLOB)) ||
      ':' || hex(CAST(camera_id AS BLOB))
  END
WHERE session_id IS NOT NULL
  AND (
    (event_type = 'visit' AND camera_id IS NULL) OR
    (event_type = 'camera_view' AND camera_id IS NOT NULL)
  )
  AND id IN (
    SELECT MIN(id)
    FROM events
    WHERE session_id IS NOT NULL
      AND (
        (event_type = 'visit' AND camera_id IS NULL) OR
        (event_type = 'camera_view' AND camera_id IS NOT NULL)
      )
    GROUP BY event_type, session_id, camera_id
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
