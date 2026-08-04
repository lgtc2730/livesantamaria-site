import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("builds deterministic event keys from normalized event identity", async () => {
  const { buildEventKey } = await loadDatabase();

  assert.equal(buildEventKey({ type: "visit", session: "s" }), "visit:s");
  assert.equal(
    buildEventKey({ type: "camera_view", session: "s", camera: "cnsm" }),
    "camera_view:s:cnsm"
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
    "camera_view:123e4567-e89b-42d3-a456-426614174000:cnsm"
  );
  assert.equal(db.statements[1].values[5], db.statements[0].values[5]);
  assert.equal(db.rows.length, 1);
});
