import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function readMigration() {
  return readFile(
    new URL("database/migrations/0002_audience_daily_aggregates.sql", projectRoot),
    "utf8"
  );
}

async function currentDatabase(rows = []) {
  const database = new DatabaseSync(":memory:");
  const migration1 = await readFile(
    new URL("database/migrations/0001_audience_v2_event_keys.sql", projectRoot),
    "utf8"
  );
  database.exec(migration1);
  const insert = database.prepare(`
    INSERT INTO events (
      created_at, event_type, camera_id, session_id, host, event_key
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const row of rows) {
    insert.run(
      row.created_at,
      row.event_type,
      row.camera_id ?? null,
      row.session_id,
      row.host ?? null,
      row.event_key ?? null
    );
  }
  return database;
}

async function migratedDatabase(rows = []) {
  const database = await currentDatabase(rows);
  database.exec(await readMigration());
  return database;
}

function insertEvent(database, {
  createdAt = "2026-09-04T12:00:00.000Z",
  aggregateDate = "2026-09-04",
  eventType = "visit",
  cameraId = null,
  sessionId,
  eventKey
}) {
  return database.prepare(`
    INSERT OR IGNORE INTO events (
      created_at, aggregate_date, event_type, camera_id,
      session_id, host, event_key
    ) VALUES (?, ?, ?, ?, ?, 'www.livesantamaria.org', ?)
  `).run(createdAt, aggregateDate, eventType, cameraId, sessionId, eventKey);
}

function dailyVisits(database, date = "2026-09-04") {
  return database.prepare(
    "SELECT visits FROM audience_daily WHERE date = ?"
  ).get(date)?.visits ?? 0;
}

function cameraViews(database, cameraId, date = "2026-09-04") {
  return database.prepare(`
    SELECT views FROM audience_camera_daily
    WHERE date = ? AND camera_id = ?
  `).get(date, cameraId)?.views ?? 0;
}

test("migration applies to an empty current schema and preserves old inserts", async () => {
  const database = await migratedDatabase();

  database.prepare(`
    INSERT INTO events (created_at, event_type, camera_id, session_id, host, event_key)
    VALUES ('2026-09-04T10:00:00.000Z', 'visit', NULL, 'old-code', 'www.livesantamaria.org', NULL)
  `).run();

  const row = database.prepare(
    "SELECT aggregate_date FROM events WHERE session_id = 'old-code'"
  ).get();
  assert.equal(row.aggregate_date, null);
});

test("migration preserves populated rows with a null derived date", async () => {
  const database = await migratedDatabase([{
    created_at: "2026-09-03T12:00:00.000Z",
    event_type: "visit",
    session_id: "existing",
    event_key: "v1:visit:existing"
  }]);

  assert.deepEqual({ ...database.prepare(`
    SELECT created_at, event_type, session_id, event_key, aggregate_date
    FROM events WHERE session_id = 'existing'
  `).get() }, {
    created_at: "2026-09-03T12:00:00.000Z",
    event_type: "visit",
    session_id: "existing",
    event_key: "v1:visit:existing",
    aggregate_date: null
  });
});

test("aggregate tables use WITHOUT ROWID primary keys and no secondary indexes", async () => {
  const database = await migratedDatabase();
  for (const table of ["audience_daily", "audience_camera_daily"]) {
    const definition = database.prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?"
    ).get(table)?.sql;
    assert.match(definition, /WITHOUT ROWID/i);
    const indexes = database.prepare(`PRAGMA index_list(${table})`).all();
    assert.equal(indexes.some(index => index.origin === "c"), false);
  }

  const eventColumns = database.prepare("PRAGMA table_info(events)").all();
  assert.equal(eventColumns.find(column => column.name === "aggregate_date").notnull, 0);
  const eventIndexes = database.prepare("PRAGMA index_list(events)").all();
  assert.equal(eventIndexes.some(index => index.name.includes("aggregate_date")), false);
});

test("aggregate counter constraints reject negative and non-integer values", async () => {
  const database = await migratedDatabase();

  assert.throws(() => database.prepare(
    "INSERT INTO audience_daily (date, visits) VALUES ('2026-09-04', -1)"
  ).run(), /constraint/i);
  assert.throws(() => database.prepare(
    "INSERT INTO audience_daily (date, visits) VALUES ('2026-09-04', 1.5)"
  ).run(), /constraint/i);
  assert.throws(() => database.prepare(`
    INSERT INTO audience_camera_daily (date, camera_id, views)
    VALUES ('2026-09-04', 'cnsm', -1)
  `).run(), /constraint/i);
  assert.throws(() => database.prepare(`
    INSERT INTO audience_camera_daily (date, camera_id, views)
    VALUES ('2026-09-04', 'cnsm', 1.5)
  `).run(), /constraint/i);
});

test("malformed non-null aggregate dates are rejected on raw insert", async () => {
  const database = await migratedDatabase();
  assert.throws(() => insertEvent(database, {
    aggregateDate: "2026-9-4",
    sessionId: "malformed",
    eventKey: "v1:visit:malformed"
  }), /invalid aggregate_date/i);
  assert.equal(database.prepare(
    "SELECT COUNT(*) AS count FROM events WHERE session_id = 'malformed'"
  ).get().count, 0);
});

test("accepted visits aggregate once per distinct event and duplicates do not recount", async () => {
  const database = await migratedDatabase();
  insertEvent(database, { sessionId: "visit-1", eventKey: "v1:visit:1" });
  insertEvent(database, { sessionId: "visit-2", eventKey: "v1:visit:2" });
  insertEvent(database, { sessionId: "visit-1", eventKey: "v1:visit:1" });

  assert.equal(database.prepare(
    "SELECT COUNT(*) AS count FROM events WHERE event_type = 'visit'"
  ).get().count, 2);
  assert.equal(dailyVisits(database), 2);
});

test("camera views aggregate independently by camera", async () => {
  const database = await migratedDatabase();
  insertEvent(database, {
    eventType: "camera_view", cameraId: "cnsm",
    sessionId: "camera-1", eventKey: "v1:camera_view:1:cnsm"
  });
  insertEvent(database, {
    eventType: "camera_view", cameraId: "cnsm",
    sessionId: "camera-2", eventKey: "v1:camera_view:2:cnsm"
  });
  insertEvent(database, {
    eventType: "camera_view", cameraId: "anjos",
    sessionId: "camera-3", eventKey: "v1:camera_view:3:anjos"
  });

  assert.equal(cameraViews(database, "cnsm"), 2);
  assert.equal(cameraViews(database, "anjos"), 1);
});

test("legacy event types and null event keys have no aggregate effect", async () => {
  const database = await migratedDatabase();
  insertEvent(database, {
    eventType: "historical", sessionId: "legacy",
    eventKey: "v1:historical:legacy"
  });
  insertEvent(database, { sessionId: "null-key", eventKey: null });

  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM events").get().count, 2);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM audience_daily").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM audience_camera_daily").get().count, 0);
});

test("backfill assigns a date once and cannot recount or mutate it", async () => {
  const database = await migratedDatabase([{
    created_at: "2026-09-04T12:00:00.000Z",
    event_type: "visit",
    session_id: "backfill",
    event_key: "v1:visit:backfill"
  }]);
  const backfill = database.prepare(`
    UPDATE events SET aggregate_date = '2026-09-04'
    WHERE session_id = 'backfill' AND aggregate_date IS NULL
  `);

  assert.equal(backfill.run().changes, 1);
  assert.equal(backfill.run().changes, 0);
  assert.equal(dailyVisits(database), 1);
  assert.throws(() => database.prepare(`
    UPDATE events SET aggregate_date = '2026-09-05'
    WHERE session_id = 'backfill'
  `).run(), /immutable/i);
  assert.throws(() => database.prepare(`
    UPDATE events SET aggregate_date = NULL
    WHERE session_id = 'backfill'
  `).run(), /immutable/i);
  assert.equal(dailyVisits(database), 1);
});

test("backfill ignores legacy rows without an event key", async () => {
  const database = await migratedDatabase([{
    created_at: "2026-09-04T12:00:00.000Z",
    event_type: "visit",
    session_id: "legacy-null-key"
  }]);
  database.prepare(`
    UPDATE events SET aggregate_date = '2026-09-04'
    WHERE session_id = 'legacy-null-key'
  `).run();
  assert.equal(dailyVisits(database), 0);
});

test("aggregate failure rolls back the raw insert", async () => {
  const database = await migratedDatabase();
  database.prepare(`
    INSERT INTO audience_daily (date, visits)
    VALUES ('2026-09-04', 9223372036854775807)
  `).run();

  assert.throws(() => insertEvent(database, {
    sessionId: "overflow", eventKey: "v1:visit:overflow"
  }), /constraint/i);
  assert.equal(database.prepare(
    "SELECT COUNT(*) AS count FROM events WHERE session_id = 'overflow'"
  ).get().count, 0);
  assert.equal(database.prepare(`
    SELECT CAST(visits AS TEXT) AS visits
    FROM audience_daily WHERE date = '2026-09-04'
  `).get().visits, "9223372036854775807");
});

test("concurrent distinct visits and camera views do not lose increments", async () => {
  const database = await migratedDatabase();
  await Promise.all([
    ...Array.from({ length: 50 }, (_, index) => Promise.resolve().then(() => insertEvent(database, {
      sessionId: `visit-${index}`,
      eventKey: `v1:visit:${index}`
    }))),
    ...Array.from({ length: 50 }, (_, index) => Promise.resolve().then(() => insertEvent(database, {
      eventType: "camera_view",
      cameraId: "cnsm",
      sessionId: `view-${index}`,
      eventKey: `v1:camera_view:${index}:cnsm`
    })))
  ]);

  assert.equal(dailyVisits(database), 50);
  assert.equal(cameraViews(database, "cnsm"), 50);
});

test("concurrent duplicate event keys produce one row and one increment", async () => {
  const database = await migratedDatabase();
  await Promise.all(Array.from({ length: 50 }, () => Promise.resolve().then(() => insertEvent(database, {
    sessionId: "same-visit",
    eventKey: "v1:visit:same"
  }))));

  assert.equal(database.prepare(
    "SELECT COUNT(*) AS count FROM events WHERE event_key = 'v1:visit:same'"
  ).get().count, 1);
  assert.equal(dailyVisits(database), 1);
});

test("deleting raw events does not decrement durable aggregates", async () => {
  const database = await migratedDatabase();
  insertEvent(database, { sessionId: "retained", eventKey: "v1:visit:retained" });
  database.prepare("DELETE FROM events WHERE session_id = 'retained'").run();

  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM events").get().count, 0);
  assert.equal(dailyVisits(database), 1);
});

test("schema mirror creates the same aggregate behavior on a fresh database", async () => {
  const database = new DatabaseSync(":memory:");
  const schema = await readFile(new URL("database/schema.sql", projectRoot), "utf8");
  database.exec(schema);
  insertEvent(database, { sessionId: "schema", eventKey: "v1:visit:schema" });

  assert.equal(dailyVisits(database), 1);
});

test("schema mirror is safely rerunnable", async () => {
  const database = new DatabaseSync(":memory:");
  const schema = await readFile(new URL("database/schema.sql", projectRoot), "utf8");
  database.exec(schema);
  assert.doesNotThrow(() => database.exec(schema));
});

test("aggregate camera IDs reject characters outside the ingestion contract", async () => {
  const database = await migratedDatabase();
  assert.throws(() => database.prepare(`
    INSERT INTO audience_camera_daily (date, camera_id, views)
    VALUES ('2026-09-04', 'valid/unsafe', 1)
  `).run(), /constraint/i);
});
