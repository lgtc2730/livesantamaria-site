import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function loadDatabase() {
  const source = await readFile(
    new URL("functions/api/audience/db.js", projectRoot),
    "utf8"
  );
  const sourceUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(sourceUrl);
}

class RecordingD1 {
  statements = [];
  rows = [];

  prepare(sql) {
    return {
      bind: (...values) => ({
        run: async () => {
          this.statements.push({ sql, values });
          const eventKey = values[5];
          if (this.rows.some(row => row.eventKey === eventKey)) {
            return { success: true, meta: { changes: 0, changed_db: false } };
          }
          this.rows.push({ eventKey, values });
          return { success: true, meta: { changes: 1, changed_db: true } };
        }
      })
    };
  }
}

class SqliteD1 {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return {
      bind: (...values) => ({
        run: async () => {
          const result = this.database.prepare(sql).run(...values);
          return {
            success: true,
            meta: {
              changes: Number(result.changes),
              changed_db: Number(result.changes) > 0
            }
          };
        }
      })
    };
  }
}

const legacySchema = `
  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    event_type TEXT NOT NULL,
    camera_id TEXT,
    session_id TEXT NOT NULL,
    host TEXT
  );
  CREATE INDEX idx_events_created ON events(created_at);
  CREATE INDEX idx_events_type ON events(event_type);
  CREATE INDEX idx_events_camera ON events(camera_id);
`;

function createLegacyDatabase(rows = []) {
  const database = new DatabaseSync(":memory:");
  database.exec(legacySchema);
  const insert = database.prepare(`
    INSERT INTO events (
      created_at,
      event_type,
      camera_id,
      session_id,
      host
    ) VALUES (?, ?, ?, ?, ?)
  `);
  for (const row of rows) {
    insert.run(
      row.created_at,
      row.event_type,
      row.camera_id ?? null,
      row.session_id,
      row.host ?? null
    );
  }
  return database;
}

function plainRows(rows) {
  return rows.map(row => ({ ...row }));
}

async function migrationSql() {
  return readFile(
    new URL("database/migrations/0001_audience_v2_event_keys.sql", projectRoot),
    "utf8"
  );
}

test("builds deterministic event keys from normalized event identity", async () => {
  const { buildEventKey } = await loadDatabase();

  assert.equal(buildEventKey({ type: "visit", session: "s" }), "v1:visit:73");
  assert.equal(
    buildEventKey({ type: "camera_view", session: "s", camera: "cnsm" }),
    "v1:camera_view:73:636E736D"
  );
  assert.notEqual(
    buildEventKey({ type: "camera_view", session: "a:b", camera: "c" }),
    buildEventKey({ type: "camera_view", session: "a", camera: "b:c" })
  );
});

test("binds the deterministic event key and ignores a repeated logical event", async () => {
  const { insertEvent } = await loadDatabase();
  const db = new RecordingD1();
  const event = {
    type: "camera_view",
    session: "123e4567-e89b-42d3-a456-426614174000",
    camera: "cnsm",
    host: "www.livesantamaria.org"
  };

  await insertEvent(db, event);
  await insertEvent(db, event);

  assert.match(db.statements[0].sql, /event_key/);
  assert.equal(db.statements[0].values.length, 6);
  assert.equal(
    db.statements[0].values[5],
    "v1:camera_view:31323365343536372D653839622D343264332D613435362D343236363134313734303030:636E736D"
  );
  assert.equal(db.statements[1].values[5], db.statements[0].values[5]);
  assert.equal(db.rows.length, 1);
});

test("compatible migration preserves every populated legacy row and supports old, new, and rollback writes", async () => {
  const rows = [
    { created_at: "2026-07-01T00:00:00.000Z", event_type: "visit", session_id: "duplicate", host: "www.livesantamaria.org" },
    { created_at: "2026-07-01T00:00:01.000Z", event_type: "visit", session_id: "duplicate", host: "www.livesantamaria.org" },
    { created_at: "2026-07-02T00:00:00.000Z", event_type: "camera_view", camera_id: "c", session_id: "a:b", host: "www.livesantamaria.org" },
    { created_at: "2026-07-02T00:00:01.000Z", event_type: "camera_view", camera_id: "b:c", session_id: "a", host: "www.livesantamaria.org" },
    { created_at: "2026-07-03T00:00:00.000Z", event_type: "historical", session_id: "legacy", host: null },
    { created_at: "2026-07-03T00:00:01.000Z", event_type: "camera_view", camera_id: null, session_id: "missing-camera", host: null },
    { created_at: "2026-07-03T00:00:02.000Z", event_type: "visit", camera_id: "unexpected", session_id: "visit-with-camera", host: null }
  ];
  const database = createLegacyDatabase(rows);
  const before = plainRows(database.prepare(`
    SELECT id, created_at, event_type, camera_id, session_id, host
    FROM events
    ORDER BY id
  `).all());

  database.exec(await migrationSql());

  const after = plainRows(database.prepare(`
    SELECT id, created_at, event_type, camera_id, session_id, host, event_key
    FROM events
    ORDER BY id
  `).all());
  assert.equal(after.length, before.length);
  assert.deepEqual(
    after.map(({ event_key: _eventKey, ...row }) => row),
    before
  );

  const duplicateKeys = after
    .filter(row => row.session_id === "duplicate")
    .map(row => row.event_key);
  assert.equal(duplicateKeys.filter(Boolean).length, 1);
  assert.equal(duplicateKeys.filter(key => key === null).length, 1);

  const collisionRows = after.filter(row =>
    (row.session_id === "a:b" && row.camera_id === "c") ||
    (row.session_id === "a" && row.camera_id === "b:c")
  );
  assert.equal(collisionRows.every(row => typeof row.event_key === "string"), true);
  assert.notEqual(collisionRows[0].event_key, collisionRows[1].event_key);
  assert.equal(after.find(row => row.event_type === "historical").event_key, null);
  assert.equal(after.find(row => row.session_id === "missing-camera").event_key, null);
  assert.equal(after.find(row => row.session_id === "visit-with-camera").event_key, null);

  const eventKeyColumn = database.prepare("PRAGMA table_info(events)").all()
    .find(column => column.name === "event_key");
  assert.equal(eventKeyColumn.notnull, 0);
  const eventKeyIndex = database.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'index' AND name = 'idx_events_event_key_unique'
  `).get();
  assert.match(eventKeyIndex.sql, /UNIQUE INDEX/i);
  assert.match(eventKeyIndex.sql, /WHERE event_key IS NOT NULL/i);

  const oldInsert = database.prepare(`
    INSERT INTO events (created_at, event_type, camera_id, session_id, host)
    VALUES (?, ?, ?, ?, ?)
  `);
  oldInsert.run(
    "2026-08-04T10:00:00.000Z",
    "visit",
    null,
    "old-code-after-migration",
    "www.livesantamaria.org"
  );
  assert.equal(
    database.prepare("SELECT event_key FROM events WHERE session_id = ?").get("old-code-after-migration").event_key,
    null
  );

  const { insertEvent } = await loadDatabase();
  const newEvent = {
    type: "camera_view",
    session: "223e4567-e89b-42d3-a456-426614174000",
    camera: "cnsm",
    host: "www.livesantamaria.org"
  };
  await insertEvent(new SqliteD1(database), newEvent);
  await insertEvent(new SqliteD1(database), newEvent);
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM events WHERE session_id = ?").get(newEvent.session).count,
    1
  );

  oldInsert.run(
    "2026-08-04T10:02:00.000Z",
    "visit",
    null,
    "rollback-old-code",
    "www.livesantamaria.org"
  );
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM events WHERE session_id = ?").get("rollback-old-code").count,
    1
  );
});

test("compatible migration applies to an empty database without final constraints", async () => {
  const database = new DatabaseSync(":memory:");

  database.exec(await migrationSql());

  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM events").get().count, 0);
  const columns = plainRows(database.prepare("PRAGMA table_info(events)").all());
  assert.equal(columns.find(column => column.name === "event_key").notnull, 0);
  assert.equal(columns.find(column => column.name === "host").notnull, 0);
});

test("schema mirror keeps nullable event keys and old-code insert compatibility", async () => {
  const schema = await readFile(new URL("database/schema.sql", projectRoot), "utf8");
  const database = new DatabaseSync(":memory:");

  database.exec(schema);
  database.prepare(`
    INSERT INTO events (created_at, event_type, camera_id, session_id, host)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    "2026-08-04T10:03:00.000Z",
    "historical",
    "legacy-camera",
    "schema-old-code",
    null
  );

  const inserted = database.prepare(`
    SELECT event_type, camera_id, host, event_key
    FROM events
    WHERE session_id = ?
  `).get("schema-old-code");
  assert.deepEqual({ ...inserted }, {
    event_type: "historical",
    camera_id: "legacy-camera",
    host: null,
    event_key: null
  });
  const index = database.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'index' AND name = 'idx_events_event_key_unique'
  `).get();
  assert.match(index.sql, /WHERE event_key IS NOT NULL/i);
});
