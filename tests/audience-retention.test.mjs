import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const fixedNow = "2026-08-04T12:00:00.000Z";
const expectedCutoff = "2026-07-05T12:00:00.000Z";
const privateSession = "123e4567-e89b-42d3-a456-426614174000";
const privateEventKey = `camera_view:${privateSession}:cnsm`;

async function loadRetentionWorker() {
  const source = await readFile(
    new URL("workers/audience-retention/src/index.js", projectRoot),
    "utf8"
  );
  const sourceUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${crypto.randomUUID()}`;
  return import(sourceUrl);
}

class RecordingD1 {
  statements = [];

  constructor(rows = []) {
    this.rows = [...rows];
  }

  prepare(sql) {
    return {
      bind: (...values) => ({
        run: async () => {
          this.statements.push({ sql, values });
          assert.equal(sql, "DELETE FROM events WHERE created_at < ?");
          assert.equal(values.length, 1);
          const [cutoff] = values;
          const retained = this.rows.filter(row => row.created_at >= cutoff);
          const changes = this.rows.length - retained.length;
          this.rows = retained;
          return { success: true, meta: { changes } };
        }
      })
    };
  }
}

async function withFixedClockAndConsole(run) {
  const RealDate = globalThis.Date;
  const realConsole = globalThis.console;
  const logs = [];
  class FixedDate extends RealDate {
    constructor(value) {
      super(value === undefined ? fixedNow : value);
    }

    static now() {
      return new RealDate(fixedNow).getTime();
    }
  }

  globalThis.Date = FixedDate;
  globalThis.console = {
    ...realConsole,
    log: (...args) => logs.push({ method: "log", args }),
    error: (...args) => logs.push({ method: "error", args })
  };
  try {
    await run(logs);
  } finally {
    globalThis.Date = RealDate;
    globalThis.console = realConsole;
  }
}

test("deletes only events older than 30 days and is idempotent", async () => {
  const { deleteExpiredEvents } = await loadRetentionWorker();
  const db = new RecordingD1([
    { created_at: "2026-07-05T11:59:59.999Z", session_id: privateSession, event_key: privateEventKey },
    { created_at: expectedCutoff, session_id: "retained-session", event_key: "visit:retained-session" },
    { created_at: "2026-08-01T00:00:00.000Z", session_id: "recent-session", event_key: "visit:recent-session" }
  ]);

  const firstDeletedCount = await deleteExpiredEvents(db, new Date(fixedNow));
  const secondDeletedCount = await deleteExpiredEvents(db, new Date(fixedNow));

  assert.equal(firstDeletedCount, 1);
  assert.equal(secondDeletedCount, 0);
  assert.deepEqual(db.statements, [
    { sql: "DELETE FROM events WHERE created_at < ?", values: [expectedCutoff] },
    { sql: "DELETE FROM events WHERE created_at < ?", values: [expectedCutoff] }
  ]);
  assert.deepEqual(db.rows.map(row => row.created_at), [
    expectedCutoff,
    "2026-08-01T00:00:00.000Z"
  ]);
});

test("scheduled retention exposes no fetch handler and logs only safe outcome fields", async () => {
  const worker = await loadRetentionWorker();
  const db = new RecordingD1([
    { created_at: "2026-07-01T00:00:00.000Z", session_id: privateSession, event_key: privateEventKey }
  ]);

  await withFixedClockAndConsole(async logs => {
    await worker.default.scheduled({}, { LVSM_AUDIENCE: db }, {});

    assert.equal(worker.default.fetch, undefined);
    assert.deepEqual(logs, [{
      method: "log",
      args: ["[AudienceRetention]", {
        outcome: "ok",
        deletedCount: 1,
        durationMs: 0
      }]
    }]);
    assert.deepEqual(Object.keys(logs[0].args[1]).sort(), [
      "deletedCount",
      "durationMs",
      "outcome"
    ]);
    const capturedLogs = JSON.stringify(logs);
    assert.doesNotMatch(capturedLogs, new RegExp(privateSession));
    assert.doesNotMatch(capturedLogs, new RegExp(privateEventKey));
    assert.doesNotMatch(capturedLogs, new RegExp(expectedCutoff));
    assert.doesNotMatch(capturedLogs, /DELETE FROM events|created_at/i);
  });
});

test("scheduled retention contains private D1 errors behind safe telemetry", async () => {
  const worker = await loadRetentionWorker();
  const db = {
    prepare() {
      return {
        bind: () => ({
          run: async () => {
            throw new Error(`D1 failed for ${privateSession} using ${privateEventKey}`);
          }
        })
      };
    }
  };

  await withFixedClockAndConsole(async logs => {
    await assert.rejects(
      worker.default.scheduled({}, { LVSM_AUDIENCE: db }, {}),
      { message: "audience retention failed" }
    );

    assert.deepEqual(logs, [{
      method: "error",
      args: ["[AudienceRetention]", {
        outcome: "error",
        deletedCount: 0,
        durationMs: 0
      }]
    }]);
    const capturedLogs = JSON.stringify(logs);
    assert.doesNotMatch(capturedLogs, new RegExp(privateSession));
    assert.doesNotMatch(capturedLogs, new RegExp(privateEventKey));
  });
});
