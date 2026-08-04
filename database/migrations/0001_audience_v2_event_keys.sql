CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  camera_id TEXT,
  session_id TEXT NOT NULL,
  host TEXT
);

CREATE TABLE events_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'camera_view')),
  camera_id TEXT,
  session_id TEXT NOT NULL,
  host TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO events_v2 (
  id,
  created_at,
  event_type,
  camera_id,
  session_id,
  host,
  event_key
)
SELECT id,
       created_at,
       event_type,
       CASE WHEN event_type = 'camera_view' THEN camera_id ELSE NULL END,
       session_id,
       COALESCE(host, 'www.livesantamaria.org'),
       CASE WHEN event_type = 'visit'
            THEN 'visit:' || session_id
            ELSE 'camera_view:' || session_id || ':' || camera_id END
FROM events
WHERE event_type IN ('visit', 'camera_view')
  AND session_id IS NOT NULL
  AND (event_type = 'visit' OR camera_id IS NOT NULL)
ORDER BY id;

DROP TABLE events;
ALTER TABLE events_v2 RENAME TO events;
CREATE INDEX idx_events_created ON events(created_at);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_camera ON events(camera_id);
