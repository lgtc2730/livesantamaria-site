import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

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

test("calculates retained boundaries from Atlantic/Azores calendar days", async () => {
  const { getPeriodBoundaries } = await loadSummary();
  const periods = getPeriodBoundaries(new Date("2026-01-01T00:30:00.000Z"));

  assert.equal(periods.todayStart, "2025-12-31T01:00:00.000Z");
  assert.equal(periods.tomorrowStart, "2026-01-01T01:00:00.000Z");
  assert.equal(periods.last30Start, "2025-12-02T01:00:00.000Z");
});

test("limits visits and top cameras to the retained 30-day window", async () => {
  const { onRequestGet, getPeriodBoundaries } = await loadSummary();
  const db = new RecordingD1();
  const periods = getPeriodBoundaries();

  const response = await onRequestGet({ env: { LVSM_AUDIENCE: db } });
  const body = await response.json();
  const retainedStatements = db.statements.filter(statement =>
    statement.values.includes(periods.last30Start)
  );
  const topStatement = retainedStatements.find(statement =>
    statement.sql.includes("event_type='camera_view'")
  );

  assert.equal(retainedStatements.length, 2);
  for (const statement of retainedStatements) {
    assert.match(statement.sql, /created_at>=\?/);
  }
  assert.ok(topStatement);
  assert.deepEqual(topStatement.values, [periods.last30Start]);
  assert.deepEqual(body.visits, {
    today: 1,
    yesterday: 2,
    last7: 3,
    last30: 4
  });
  assert.equal("total" in body.visits, false);
  assert.equal("activatedAt" in body, false);
  assert.doesNotMatch(JSON.stringify(body), /session_id|event_key/i);
});
