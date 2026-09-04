import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function loadSummary() {
  const calendarSource = await readFile(new URL("functions/api/audience/calendar.js", projectRoot), "utf8");
  const calendarUrl = `data:text/javascript;base64,${Buffer.from(calendarSource).toString("base64")}`;
  const summarySource = await readFile(new URL("functions/api/audience/summary.js", projectRoot), "utf8");
  const source = summarySource.replace("./calendar.js", calendarUrl);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${crypto.randomUUID()}`);
}

class RecordingD1 {
  constructor(results = [
    { results: [{ today: 1, yesterday: 2, last7: 3, last30: 4, month_to_date: 5 }] },
    { results: [{ camera: "cnsm", last30_count: 6, month_count: 7 }] }
  ]) {
    this.results = results;
    this.statements = [];
  }
  prepare(sql) {
    return { bind: (...values) => {
      const statement = { sql, values };
      this.statements.push(statement);
      return statement;
    } };
  }
  async batch(statements) {
    assert.deepEqual(statements, this.statements);
    return this.results;
  }
}

class SqliteD1 {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    this.database.exec(`
      CREATE TABLE audience_daily (date TEXT PRIMARY KEY, visits INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE audience_camera_daily (
        date TEXT NOT NULL, camera_id TEXT NOT NULL, views INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (date, camera_id)
      );
    `);
  }
  addDaily(date, visits) {
    this.database.prepare("INSERT INTO audience_daily (date, visits) VALUES (?, ?)").run(date, visits);
  }
  addCamera(date, camera, views) {
    this.database.prepare("INSERT INTO audience_camera_daily (date, camera_id, views) VALUES (?, ?, ?)")
      .run(date, camera, views);
  }
  prepare(sql) { return { bind: (...values) => ({ sql, values }) }; }
  async batch(statements) {
    return statements.map(({ sql, values }) => ({ results: this.database.prepare(sql).all(...values) }));
  }
}

test("uses exactly two bounded aggregate queries and preserves the compatible response", async () => {
  const { onRequestGet } = await loadSummary();
  const db = new RecordingD1();
  const now = new Date("2026-09-04T12:34:56.789Z");
  const response = await onRequestGet({ env: { LVSM_AUDIENCE: db }, now });
  const body = await response.json();

  assert.equal(db.statements.length, 2);
  assert.match(db.statements[0].sql, /FROM\s+audience_daily\b/i);
  assert.match(db.statements[1].sql, /FROM\s+audience_camera_daily\b/i);
  for (const statement of db.statements) assert.doesNotMatch(statement.sql, /\bevents\b/i);
  assert.deepEqual(db.statements[0].values, [
    "2026-09-04", "2026-09-03", "2026-08-29", "2026-08-06",
    "2026-09-01", "2026-08-06", "2026-09-04"
  ]);
  assert.deepEqual(db.statements[1].values, ["2026-08-06", "2026-09-01", "2026-08-06", "2026-09-04"]);
  assert.deepEqual(body, {
    apiVersion: 1,
    generatedAt: now.toISOString(),
    visits: { today: 1, yesterday: 2, last7: 3, last30: 4, total: 4, monthToDate: 5 },
    top: [{ camera: "cnsm", count: 6 }],
    cameraRankingMonth: [{ camera: "cnsm", count: 7 }]
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
});

test("computes visits from compact aggregates, treating missing calendar rows as zero", async () => {
  const { onRequestGet } = await loadSummary();
  const db = new SqliteD1();
  db.addDaily("2026-08-06", 10);
  db.addDaily("2026-08-28", 20);
  db.addDaily("2026-08-29", 3);
  db.addDaily("2026-09-01", 4);
  db.addDaily("2026-09-04", 5);
  const body = await (await onRequestGet({ env: { LVSM_AUDIENCE: db }, now: new Date("2026-09-04T12:00:00Z") })).json();
  assert.deepEqual(body.visits, {
    today: 5, yesterday: 0, last7: 12, last30: 42, total: 42, monthToDate: 9
  });
});

test("builds distinct rolling and monthly top-five rankings with deterministic ties", async () => {
  const { onRequestGet } = await loadSummary();
  const db = new SqliteD1();
  for (const [date, camera, views] of [
    ["2026-08-06", "legacy", 100], ["2026-08-30", "august", 50],
    ["2026-09-01", "zeta", 9], ["2026-09-01", "alpha", 9],
    ["2026-09-02", "beta", 8], ["2026-09-02", "gamma", 7],
    ["2026-09-03", "delta", 6], ["2026-09-04", "epsilon", 5],
    ["2026-09-04", "zero", 0]
  ]) db.addCamera(date, camera, views);
  const body = await (await onRequestGet({ env: { LVSM_AUDIENCE: db }, now: new Date("2026-09-04T12:00:00Z") })).json();
  assert.deepEqual(body.top, [
    { camera: "legacy", count: 100 }, { camera: "august", count: 50 },
    { camera: "alpha", count: 9 }, { camera: "zeta", count: 9 }, { camera: "beta", count: 8 }
  ]);
  assert.deepEqual(body.cameraRankingMonth, [
    { camera: "alpha", count: 9 }, { camera: "zeta", count: 9 },
    { camera: "beta", count: 8 }, { camera: "gamma", count: 7 }, { camera: "delta", count: 6 }
  ]);
});

test("returns zero visits and empty rankings when aggregates are empty", async () => {
  const { onRequestGet } = await loadSummary();
  const body = await (await onRequestGet({ env: { LVSM_AUDIENCE: new SqliteD1() }, now: new Date("2026-05-10T12:00:00Z") })).json();
  assert.deepEqual(body.visits, {
    today: 0, yesterday: 0, last7: 0, last30: 0, total: 0, monthToDate: 0
  });
  assert.deepEqual(body.top, []);
  assert.deepEqual(body.cameraRankingMonth, []);
});

test("uses shared Azores periods across month, year, spring, and autumn DST boundaries", async () => {
  const { getPeriodBoundaries } = await loadSummary();
  assert.deepEqual(getPeriodBoundaries(new Date("2026-01-01T00:30:00.000Z")), {
    currentDate: "2025-12-31", previousDate: "2025-12-30", monthStartDate: "2025-12-01",
    rolling7StartDate: "2025-12-25", rolling30StartDate: "2025-12-02", queryStartDate: "2025-12-01"
  });
  assert.equal(getPeriodBoundaries(new Date("2026-03-29T00:59:59.999Z")).currentDate, "2026-03-28");
  assert.equal(getPeriodBoundaries(new Date("2026-03-29T01:00:00.000Z")).currentDate, "2026-03-29");
  assert.equal(getPeriodBoundaries(new Date("2026-10-25T00:59:59.999Z")).currentDate, "2026-10-25");
  assert.equal(getPeriodBoundaries(new Date("2026-10-25T01:00:00.000Z")).currentDate, "2026-10-25");
  assert.deepEqual(getPeriodBoundaries(new Date("2026-01-15T12:00:00Z")), {
    currentDate: "2026-01-15", previousDate: "2026-01-14", monthStartDate: "2026-01-01",
    rolling7StartDate: "2026-01-09", rolling30StartDate: "2025-12-17", queryStartDate: "2025-12-17"
  });
});

test("does not fall back to raw events when aggregate execution fails", async () => {
  const { onRequestGet } = await loadSummary();
  const db = new RecordingD1();
  db.batch = async () => { throw new Error("aggregate unavailable"); };
  await assert.rejects(
    onRequestGet({ env: { LVSM_AUDIENCE: db }, now: new Date("2026-09-04T12:00:00Z") }),
    /aggregate unavailable/
  );
  assert.equal(db.statements.length, 2);
  for (const statement of db.statements) assert.doesNotMatch(statement.sql, /\bevents\b/i);
});

test("query plans use primary-key date range searches", async () => {
  const { onRequestGet } = await loadSummary();
  const db = new RecordingD1();
  await onRequestGet({ env: { LVSM_AUDIENCE: db }, now: new Date("2026-09-04T12:00:00Z") });

  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE audience_daily (
      date TEXT PRIMARY KEY, visits INTEGER NOT NULL DEFAULT 0
    ) WITHOUT ROWID;
    CREATE TABLE audience_camera_daily (
      date TEXT NOT NULL, camera_id TEXT NOT NULL, views INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date, camera_id)
    ) WITHOUT ROWID;
  `);
  const plans = db.statements.map(({ sql, values }) =>
    sqlite.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...values).map(row => row.detail)
  );

  assert.match(plans[0].join("\n"), /SEARCH audience_daily USING PRIMARY KEY \(date>\? AND date<\?\)/);
  assert.match(plans[1].join("\n"), /SEARCH audience_camera_daily USING PRIMARY KEY \(date>\? AND date<\?\)/);
});
