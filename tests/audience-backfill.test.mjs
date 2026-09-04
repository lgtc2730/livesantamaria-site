import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const root = new URL("../", import.meta.url);
const tool = await import("../tools/audience-backfill.mjs");

async function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(await readFile(new URL("database/schema.sql", root), "utf8"));
  const add = db.prepare(`INSERT INTO events
    (created_at,event_type,camera_id,session_id,host,event_key,aggregate_date)
    VALUES (?,?,?,?,?,?,?)`);
  return { db, add };
}

test("dry-run reports eligible rows by Azores day without mutation", async () => {
  const { db, add } = await fixture();
  add.run("2026-03-29T00:59:59.999Z","visit",null,"secret-a","host","key-a",null);
  add.run("2026-03-29T01:00:00.000Z","camera_view","cnsm","secret-b","host","key-b",null);
  add.run("2026-03-29T02:00:00.000Z","visit",null,"skip-null","host",null,null);
  add.run("2026-03-29T03:00:00.000Z","visit","bad","skip-shape","host","key-c",null);
  add.run("2026-03-29T04:00:00.000Z","visit",null,"dual","host","key-d","2026-03-29");

  const report = await tool.inspectBackfill(db);
  assert.equal(report.totalEligible, 2);
  assert.equal(report.visitsEligible, 1);
  assert.equal(report.cameraViewsEligible, 1);
  assert.deepEqual(report.days.map(day => [day.date, day.visits, day.cameraViews]), [
    ["2026-03-28",1,0], ["2026-03-29",0,1]
  ]);
  assert.equal(report.estimatedLogicalWrites, 4);
  assert.equal(report.estimatedBillableWrites, 6);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM events WHERE aggregate_date IS NOT NULL").get().count, 1);
});

test("calendar partitioning exposes 23h and 25h UTC intervals", () => {
  assert.deepEqual(tool.dayInterval("2026-03-29"), {
    start:"2026-03-29T01:00:00.000Z", end:"2026-03-30T00:00:00.000Z"
  });
  assert.deepEqual(tool.dayInterval("2026-10-25"), {
    start:"2026-10-25T00:00:00.000Z", end:"2026-10-26T01:00:00.000Z"
  });
});

test("execution requires confirmation and obeys oldest-first max-days", async () => {
  const { db, add } = await fixture();
  add.run("2026-09-01T12:00:00Z","visit",null,"a","h","a",null);
  add.run("2026-09-02T12:00:00Z","visit",null,"b","h","b",null);
  await assert.rejects(tool.runBackfill(db, {}), /confirmation/i);
  const result = await tool.runBackfill(db, { confirm:true, maxDays:1, maxRows:10, rowBudget:30 });
  assert.deepEqual(result.processedDays,["2026-09-01"]);
  assert.equal(result.updatedRows,1);
  assert.equal((await tool.inspectBackfill(db)).totalEligible,1);
});

test("max-rows supports partial run, restart, catch-up, and no-op rerun", async () => {
  const { db, add } = await fixture();
  for(let i=0;i<3;i++) add.run("2026-09-01T12:00:00Z","visit",null,`s${i}`,"h",`k${i}`,null);
  let result=await tool.runBackfill(db,{confirm:true,maxRows:2,rowBudget:6});
  assert.equal(result.updatedRows,2);
  result=await tool.runBackfill(db,{confirm:true,maxRows:2,rowBudget:6});
  assert.equal(result.updatedRows,1);
  add.run("2026-09-01T13:00:00Z","visit",null,"old-code","h","catchup",null);
  assert.equal((await tool.runBackfill(db,{confirm:true,maxRows:2,rowBudget:6})).updatedRows,1);
  assert.equal((await tool.runBackfill(db,{confirm:true,maxRows:2,rowBudget:6})).updatedRows,0);
  assert.equal(db.prepare("SELECT visits FROM audience_daily WHERE date='2026-09-01'").get().visits,4);
});

test("configured write budget stops before mutation", async () => {
  const { db, add } = await fixture();
  add.run("2026-09-01T12:00:00Z","visit",null,"a","h","a",null);
  await assert.rejects(tool.runBackfill(db,{confirm:true,maxRows:1,rowBudget:2}),/budget/i);
  assert.equal((await tool.inspectBackfill(db)).totalEligible,1);
});

test("parity reports only aggregate mismatches and invalid/null counts", async () => {
  const { db, add } = await fixture();
  add.run("2026-09-01T12:00:00Z","visit",null,"secret","private-host","key",null);
  add.run("2026-09-02T12:00:00Z","visit",null,"done","h","done","2026-09-02");
  db.prepare("UPDATE audience_daily SET visits=5 WHERE date='2026-09-02'").run();
  const report=await tool.inspectParity(db);
  assert.equal(report.eligibleNullCount,1);
  assert.equal(report.invalidAggregateDateCount,0);
  assert.deepEqual(report.visitMismatches,[{date:"2026-09-02",rawCount:1,aggregateCount:5}]);
  assert.equal(JSON.stringify(report).includes("secret"),false);
  assert.equal(JSON.stringify(report).includes("private-host"),false);
});

test("parity is empty after exact trigger-driven backfill", async () => {
  const { db, add } = await fixture();
  add.run("2026-09-01T12:00:00Z","camera_view","cnsm","s","h","k",null);
  await tool.runBackfill(db,{confirm:true,maxRows:10,rowBudget:30});
  const report=await tool.inspectParity(db);
  assert.equal(report.eligibleNullCount,0);
  assert.deepEqual(report.visitMismatches,[]);
  assert.deepEqual(report.cameraMismatches,[]);
});

test("parity compares only complete raw-retention calendar days", async () => {
  const { db, add } = await fixture();
  add.run("2026-08-05T18:00:00Z","visit",null,"partial","h","partial","2026-08-05");
  add.run("2026-08-06T12:00:00Z","visit",null,"complete","h","complete","2026-08-06");
  add.run("2026-09-04T12:00:00Z","visit",null,"today","h","today","2026-09-04");
  db.prepare("INSERT INTO audience_daily(date,visits) VALUES('2026-08-04',9)").run();
  db.prepare("UPDATE audience_daily SET visits=7 WHERE date='2026-08-05'").run();
  db.prepare("UPDATE audience_daily SET visits=8 WHERE date='2026-09-04'").run();
  db.prepare("INSERT INTO audience_daily(date,visits) VALUES('2026-09-05',9)").run();

  const report=await tool.inspectParity(db,{now:new Date("2026-09-04T12:00:00Z")});

  assert.equal(report.comparableFromDate,"2026-08-06");
  assert.equal(report.comparableToDateExclusive,"2026-09-04");
  assert.deepEqual(report.visitMismatches,[]);
  assert.deepEqual(report.cameraMismatches,[]);
});

test("CLI defaults to dry-run and validates execution controls", () => {
  assert.deepEqual(tool.parseArguments([]), {dryRun:true,json:false});
  assert.deepEqual(tool.parseArguments(["--from-date","2026-09-01","--to-date","2026-09-03","--max-days","2","--max-rows","10","--confirm","--json"]), {
    dryRun:false,json:true,fromDate:"2026-09-01",toDate:"2026-09-03",maxDays:2,maxRows:10,confirm:true
  });
});
