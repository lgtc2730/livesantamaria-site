import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function loadDatabaseModule() {
  const [databaseSource, calendarSource] = await Promise.all([
    readFile(new URL("functions/api/audience/db.js", projectRoot), "utf8"),
    readFile(new URL("functions/api/audience/calendar.js", projectRoot), "utf8")
  ]);
  const calendarUrl = `data:text/javascript;base64,${Buffer.from(calendarSource).toString("base64")}`;
  const source = databaseSource.replace("./calendar.js", calendarUrl);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${crypto.randomUUID()}`);
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

async function databaseWithAggregates() {
  const database = new DatabaseSync(":memory:");
  database.exec(await readFile(new URL("database/schema.sql", projectRoot), "utf8"));
  return database;
}

const visit = Object.freeze({
  type: "visit",
  camera: null,
  session: "123e4567-e89b-42d3-a456-426614174000",
  host: "www.livesantamaria.org"
});

const cameraView = Object.freeze({
  type: "camera_view",
  camera: "cnsm",
  session: "223e4567-e89b-42d3-a456-426614174000",
  host: "www.livesantamaria.org"
});

async function insertAt(database, event, instant, now = () => new Date(instant)) {
  const { insertEvent } = await loadDatabaseModule();
  return insertEvent(new SqliteD1(database), event, { now });
}

function storedEvent(database, session) {
  return { ...database.prepare(`
    SELECT created_at, aggregate_date, event_type, camera_id, session_id, host, event_key
    FROM events WHERE session_id = ?
  `).get(session) };
}

test("visit stores UTC and Azores dates from one injected instant", async () => {
  const database = await databaseWithAggregates();
  let clockCalls = 0;
  const frozen = new Date("2026-01-01T00:30:00.000Z");

  await insertAt(database, visit, frozen, () => {
    clockCalls += 1;
    return new Date(frozen);
  });

  assert.equal(clockCalls, 1);
  assert.deepEqual(storedEvent(database, visit.session), {
    created_at: "2026-01-01T00:30:00.000Z",
    aggregate_date: "2025-12-31",
    event_type: "visit",
    camera_id: null,
    session_id: visit.session,
    host: visit.host,
    event_key: "v1:visit:31323365343536372D653839622D343264332D613435362D343236363134313734303030"
  });
  assert.equal(database.prepare(
    "SELECT visits FROM audience_daily WHERE date = '2025-12-31'"
  ).get().visits, 1);
});

test("camera view stores both authoritative dates and triggers its camera aggregate", async () => {
  const database = await databaseWithAggregates();
  await insertAt(database, cameraView, "2026-07-15T12:00:00.000Z");

  const row = storedEvent(database, cameraView.session);
  assert.equal(row.created_at, "2026-07-15T12:00:00.000Z");
  assert.equal(row.aggregate_date, "2026-07-15");
  assert.equal(row.event_type, "camera_view");
  assert.equal(row.camera_id, "cnsm");
  assert.equal(database.prepare(`
    SELECT views FROM audience_camera_daily
    WHERE date = '2026-07-15' AND camera_id = 'cnsm'
  `).get().views, 1);
});

const transitionFixtures = [
  ["winter", "2026-01-15T12:00:00.000Z", "2026-01-15"],
  ["spring previous day", "2026-03-29T00:59:59.999Z", "2026-03-28"],
  ["spring first instant", "2026-03-29T01:00:00.000Z", "2026-03-29"],
  ["autumn first midnight", "2026-10-25T00:00:00.000Z", "2026-10-25"],
  ["autumn repeated hour", "2026-10-25T01:00:00.000Z", "2026-10-25"]
];

for (const [name, instant, expectedDate] of transitionFixtures) {
  test(`ingestion derives the ${name} Azores date`, async () => {
    const database = await databaseWithAggregates();
    await insertAt(database, visit, instant);
    assert.equal(storedEvent(database, visit.session).aggregate_date, expectedDate);
  });
}

test("duplicate retry preserves one raw row and one aggregate increment", async () => {
  const database = await databaseWithAggregates();
  const { insertEvent } = await loadDatabaseModule();
  const db = new SqliteD1(database);
  const first = await insertEvent(db, visit, { now: () => new Date("2026-09-04T12:00:00.000Z") });
  const duplicate = await insertEvent(db, visit, { now: () => new Date("2026-09-04T12:05:00.000Z") });

  assert.equal(first.meta.changes, 1);
  assert.equal(duplicate.meta.changes, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM events").get().count, 1);
  assert.equal(database.prepare(
    "SELECT visits FROM audience_daily WHERE date = '2026-09-04'"
  ).get().visits, 1);
  assert.equal(database.prepare(
    "SELECT COUNT(*) AS count FROM audience_daily"
  ).get().count, 1);
});

test("aggregate trigger failure surfaces and leaves no raw row", async () => {
  const database = await databaseWithAggregates();
  database.prepare(`
    INSERT INTO audience_daily (date, visits)
    VALUES ('2026-09-04', 9223372036854775807)
  `).run();

  await assert.rejects(
    insertAt(database, visit, "2026-09-04T12:00:00.000Z"),
    /constraint/i
  );
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM events").get().count, 0);
});
