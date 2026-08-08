import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

const azoresDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Atlantic/Azores",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function azoresDate(instant) {
  return azoresDateFormatter.format(new Date(instant));
}

async function loadSummary() {
  const source = await readFile(
    new URL("functions/api/audience/summary.js", projectRoot),
    "utf8"
  );
  const sourceUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${crypto.randomUUID()}`;
  return import(sourceUrl);
}

class RecordingD1 {
  statements = [];

  prepare(sql) {
    return {
      bind: (...values) => {
        this.statements.push({ sql, values });
        return { sql, values };
      }
    };
  }

  async batch() {
    return [
      { results: [{ count: 1 }] },
      { results: [{ count: 2 }] },
      { results: [{ count: 3 }] },
      { results: [{ count: 4 }] },
      {
        results: [{
          camera: "cnsm",
          count: 5,
          session_id: "session-secret",
          event_key: "camera_view:session-secret:cnsm"
        }]
      }
    ];
  }
}

class SqliteD1 {
  constructor(rows) {
    this.database = new DatabaseSync(":memory:");
    this.database.exec(`
      CREATE TABLE events (
        created_at TEXT NOT NULL,
        event_type TEXT NOT NULL,
        camera_id TEXT
      );
    `);
    const insert = this.database.prepare(
      "INSERT INTO events (created_at, event_type, camera_id) VALUES (?, ?, ?)"
    );
    for (const row of rows) {
      insert.run(row.created_at, row.event_type, row.camera_id ?? null);
    }
  }

  prepare(sql) {
    return {
      bind: (...values) => ({ sql, values })
    };
  }

  async batch(statements) {
    return statements.map(({ sql, values }) => ({
      results: this.database.prepare(sql).all(...values)
    }));
  }
}

test("calculates retained boundaries from Atlantic/Azores calendar days", async () => {
  const { getPeriodBoundaries } = await loadSummary();
  const periods = getPeriodBoundaries(new Date("2026-01-01T00:30:00.000Z"));

  assert.equal(periods.todayStart, "2025-12-31T01:00:00.000Z");
  assert.equal(periods.tomorrowStart, "2026-01-01T01:00:00.000Z");
  assert.equal(periods.last30Start, "2025-12-02T01:00:00.000Z");
});

test("uses the first valid Azores instant for spring-forward and fall-back dates", async () => {
  const { getPeriodBoundaries } = await loadSummary();
  const spring = getPeriodBoundaries(new Date("2026-03-29T12:00:00.000Z"));
  const retainedSpring = getPeriodBoundaries(new Date("2026-04-27T12:00:00.000Z"));
  const fall = getPeriodBoundaries(new Date("2026-10-25T12:00:00.000Z"));

  assert.equal(spring.todayStart, "2026-03-29T01:00:00.000Z");
  assert.equal(azoresDate(spring.todayStart), "2026-03-29");
  assert.equal(retainedSpring.last30Start, "2026-03-29T01:00:00.000Z");
  assert.equal(azoresDate(retainedSpring.last30Start), "2026-03-29");
  assert.equal(fall.todayStart, "2026-10-25T00:00:00.000Z");
  assert.equal(azoresDate(fall.todayStart), "2026-10-25");
});

test("limits visits and top cameras to the retained 30-day window", async () => {
  const { onRequestGet } = await loadSummary();
  const db = new RecordingD1();
  const now = new Date("2026-04-27T12:00:00.000Z");
  const last30Start = "2026-03-29T01:00:00.000Z";
  const tomorrowStart = "2026-04-28T00:00:00.000Z";

  const response = await onRequestGet({ env: { LVSM_AUDIENCE: db }, now });
  const body = await response.json();
  const retainedVisitStatements = db.statements.filter(statement =>
    statement.sql.includes("event_type='visit'") &&
    JSON.stringify(statement.values) === JSON.stringify([last30Start, tomorrowStart])
  );
  const topStatement = db.statements.find(statement =>
    statement.sql.includes("event_type='camera_view'")
  );

  assert.equal(retainedVisitStatements.length, 1);
  for (const statement of retainedVisitStatements) {
    assert.match(statement.sql, /created_at>=\?/);
    assert.deepEqual(statement.values, [last30Start, tomorrowStart]);
  }
  assert.ok(topStatement);
  assert.match(topStatement.sql, /created_at>=\?/);
  assert.match(topStatement.sql, /created_at<\?/);
  assert.deepEqual(topStatement.values, [last30Start, tomorrowStart]);
  assert.equal(body.generatedAt, now.toISOString());
  assert.deepEqual(body.visits, {
    today: 1,
    yesterday: 2,
    last7: 3,
    last30: 4,
    total: 4
  });
  assert.equal("activatedAt" in body, false);
  assert.doesNotMatch(JSON.stringify(body), /session_id|event_key/i);
});

test("counts only retained-window visits in total because long-term rollups do not exist", async () => {
  const { onRequestGet } = await loadSummary();
  const db = new SqliteD1([
    { created_at: "2026-07-05T23:59:59.999Z", event_type: "visit" },
    { created_at: "2026-07-06T00:00:00.000Z", event_type: "visit" },
    { created_at: "2026-07-20T10:00:00.000Z", event_type: "visit" },
    { created_at: "2026-08-05T00:00:00.000Z", event_type: "visit" }
  ]);

  const response = await onRequestGet({
    env: { LVSM_AUDIENCE: db },
    now: new Date("2026-08-04T12:00:00.000Z")
  });
  const body = await response.json();

  assert.equal(body.visits.total, 2);
  assert.equal(body.visits.last30, 2);
});

test("excludes a top-camera row at the future tomorrow boundary", async () => {
  const { onRequestGet } = await loadSummary();
  const db = new SqliteD1([
    { created_at: "2026-04-27T10:00:00.000Z", event_type: "camera_view", camera_id: "cnsm" },
    { created_at: "2026-04-27T11:00:00.000Z", event_type: "camera_view", camera_id: "cnsm" },
    { created_at: "2026-04-28T00:00:00.000Z", event_type: "camera_view", camera_id: "future" }
  ]);

  const response = await onRequestGet({
    env: { LVSM_AUDIENCE: db },
    now: new Date("2026-04-27T12:00:00.000Z")
  });
  const body = await response.json();

  assert.deepEqual(body.top, [{ camera: "cnsm", count: 2 }]);
});
