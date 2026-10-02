ALTER TABLE events
ADD COLUMN aggregate_date TEXT;

CREATE TABLE audience_daily (
  date TEXT PRIMARY KEY NOT NULL,
  visits INTEGER NOT NULL
    CHECK (typeof(visits) = 'integer' AND visits >= 0),
  CHECK (
    length(date) = 10
    AND date GLOB
      '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  )
) WITHOUT ROWID;

CREATE TABLE audience_camera_daily (
  date TEXT NOT NULL,
  camera_id TEXT NOT NULL,
  views INTEGER NOT NULL
    CHECK (typeof(views) = 'integer' AND views >= 0),

  PRIMARY KEY (date, camera_id),

  CHECK (
    length(date) = 10
    AND date GLOB
      '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),

  CHECK (
    length(camera_id) BETWEEN 1 AND 64
    AND camera_id GLOB '[a-z0-9]*'
    AND camera_id NOT GLOB '*[^a-z0-9-]*'
    AND substr(camera_id, -1, 1) GLOB '[a-z0-9]'
  )
) WITHOUT ROWID;

CREATE TRIGGER events_validate_aggregate_date_insert
BEFORE INSERT ON events
WHEN NEW.aggregate_date IS NOT NULL
  AND (
    length(NEW.aggregate_date) <> 10
    OR NEW.aggregate_date NOT GLOB
      '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  )
BEGIN
  SELECT RAISE(ABORT, 'invalid aggregate_date');
END;

CREATE TRIGGER events_guard_aggregate_date_update
BEFORE UPDATE OF aggregate_date ON events
WHEN (
    NEW.aggregate_date IS NOT NULL
    AND (
      length(NEW.aggregate_date) <> 10
      OR NEW.aggregate_date NOT GLOB
        '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    )
  )
  OR (
    OLD.aggregate_date IS NOT NULL
    AND NEW.aggregate_date IS NOT OLD.aggregate_date
  )
BEGIN
  SELECT RAISE(ABORT, 'aggregate_date is invalid or immutable');
END;

CREATE TRIGGER events_aggregate_after_insert
AFTER INSERT ON events
WHEN NEW.aggregate_date IS NOT NULL
  AND NEW.event_key IS NOT NULL
BEGIN
  INSERT INTO audience_daily (date, visits)
  SELECT NEW.aggregate_date, 1
  WHERE NEW.event_type = 'visit'
    AND NEW.camera_id IS NULL
  ON CONFLICT(date) DO UPDATE
    SET visits = visits + 1;

  INSERT INTO audience_camera_daily (date, camera_id, views)
  SELECT NEW.aggregate_date, NEW.camera_id, 1
  WHERE NEW.event_type = 'camera_view'
    AND NEW.camera_id IS NOT NULL
  ON CONFLICT(date, camera_id) DO UPDATE
    SET views = views + 1;
END;

CREATE TRIGGER events_aggregate_after_date_backfill
AFTER UPDATE OF aggregate_date ON events
WHEN OLD.aggregate_date IS NULL
  AND NEW.aggregate_date IS NOT NULL
  AND NEW.event_key IS NOT NULL
BEGIN
  INSERT INTO audience_daily (date, visits)
  SELECT NEW.aggregate_date, 1
  WHERE NEW.event_type = 'visit'
    AND NEW.camera_id IS NULL
  ON CONFLICT(date) DO UPDATE
    SET visits = visits + 1;

  INSERT INTO audience_camera_daily (date, camera_id, views)
  SELECT NEW.aggregate_date, NEW.camera_id, 1
  WHERE NEW.event_type = 'camera_view'
    AND NEW.camera_id IS NOT NULL
  ON CONFLICT(date, camera_id) DO UPDATE
    SET views = views + 1;
END;
