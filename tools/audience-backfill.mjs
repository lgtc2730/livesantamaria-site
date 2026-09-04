import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const calendarSource = await readFile(new URL("../functions/api/audience/calendar.js", import.meta.url), "utf8");
const calendar = await import(`data:text/javascript;base64,${Buffer.from(calendarSource).toString("base64")}`);

export const BILLABLE_WRITE_MULTIPLIER = 3;
export const DEFAULT_ROW_BUDGET = 80_000;
export const FREE_TIER_DAILY_WRITES = 100_000;
export const RAW_EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function all(db, sql, ...params) { return db.prepare(sql).all(...params).map(row => ({...row})); }
function eligibleSql(extra = "") { return `aggregate_date IS NULL AND event_key IS NOT NULL AND ((event_type='visit' AND camera_id IS NULL) OR (event_type='camera_view' AND camera_id IS NOT NULL)) ${extra}`; }

export function dayInterval(date) {
  const { start, end } = calendar.azoresCalendarDateBounds(date);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function inspectBackfill(db, { fromDate, toDate } = {}) {
  const rows = all(db, `SELECT created_at,event_type FROM events WHERE ${eligibleSql()} ORDER BY created_at`)
    .map(row => ({...row, date: calendar.azoresCalendarDate(row.created_at)}))
    .filter(row => (!fromDate || row.date >= fromDate) && (!toDate || row.date <= toDate));
  const grouped = new Map();
  for (const row of rows) {
    const day = grouped.get(row.date) ?? { date:row.date, visits:0, cameraViews:0, total:0 };
    row.event_type === "visit" ? day.visits++ : day.cameraViews++;
    day.total++;
    grouped.set(row.date, day);
  }
  const days = [...grouped.values()].sort((a,b) => a.date.localeCompare(b.date));
  const logical = rows.length * 2;
  const billable = rows.length * BILLABLE_WRITE_MULTIPLIER;
  return {
    totalEligible: rows.length,
    visitsEligible: rows.filter(row => row.event_type === "visit").length,
    cameraViewsEligible: rows.filter(row => row.event_type === "camera_view").length,
    earliestCreatedAt: rows[0]?.created_at ?? null,
    latestCreatedAt: rows.at(-1)?.created_at ?? null,
    affectedDays: days.length,
    days,
    estimatedLogicalWrites: logical,
    estimatedBillableWrites: billable,
    projectedFreeTierDays: Math.ceil(billable / FREE_TIER_DAILY_WRITES),
    recommendedMaxRowsPerRun: Math.floor(DEFAULT_ROW_BUDGET / BILLABLE_WRITE_MULTIPLIER),
    recommendedMaxCalendarDaysPerRun: 1,
    costModel: { billableWriteMultiplier:BILLABLE_WRITE_MULTIPLIER, dailyWriteBudget:DEFAULT_ROW_BUDGET }
  };
}

export async function runBackfill(db, options = {}) {
  if (!options.confirm) throw new Error("Explicit confirmation is required");
  const rowBudget = options.rowBudget ?? DEFAULT_ROW_BUDGET;
  const maxRows = options.maxRows ?? Math.floor(rowBudget / BILLABLE_WRITE_MULTIPLIER);
  if (maxRows * BILLABLE_WRITE_MULTIPLIER > rowBudget) throw new Error("Configured row budget would be exceeded");
  const report = await inspectBackfill(db, options);
  const days = report.days.slice(0, options.maxDays ?? report.days.length);
  let remaining = maxRows;
  let updatedRows = 0;
  const processedDays = [];
  for (const day of days) {
    if (remaining <= 0) break;
    const { start, end } = dayInterval(day.date);
    const result = db.prepare(`UPDATE events SET aggregate_date=? WHERE id IN (
      SELECT id FROM events WHERE ${eligibleSql("AND created_at>=? AND created_at<?")} ORDER BY created_at,id LIMIT ?
    )`).run(day.date, start, end, remaining);
    const changed = Number(result.changes);
    if (changed > 0) processedDays.push(day.date);
    updatedRows += changed;
    remaining -= changed;
  }
  return { updatedRows, processedDays, estimatedBillableWrites:updatedRows * BILLABLE_WRITE_MULTIPLIER };
}

export async function inspectParity(db, { now = new Date() } = {}) {
  const cutoffDate = calendar.azoresCalendarDate(new Date(now.getTime() - RAW_EVENT_RETENTION_MS));
  const comparableFromDate = calendar.addAzoresCalendarDays(cutoffDate, 1);
  const comparableToDateExclusive = calendar.azoresCalendarDate(now);
  const eligibleNullCount = all(db, `SELECT COUNT(*) count FROM events WHERE ${eligibleSql()}`)[0].count;
  const invalidAggregateDateCount = all(db, `SELECT COUNT(*) count FROM events WHERE aggregate_date IS NOT NULL AND (length(aggregate_date)<>10 OR aggregate_date NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')`)[0].count;
  const rawVisits = new Map(all(db, "SELECT aggregate_date date,COUNT(*) count FROM events WHERE aggregate_date>=? AND aggregate_date<? AND event_key IS NOT NULL AND event_type='visit' AND camera_id IS NULL GROUP BY aggregate_date", comparableFromDate, comparableToDateExclusive).map(r=>[r.date,r.count]));
  const aggVisits = new Map(all(db, "SELECT date,visits count FROM audience_daily WHERE date>=? AND date<?", comparableFromDate, comparableToDateExclusive).map(r=>[r.date,r.count]));
  const visitDates = new Set([...rawVisits.keys(),...aggVisits.keys()]);
  const visitMismatches = [...visitDates].sort().filter(d=>(rawVisits.get(d)??0)!==(aggVisits.get(d)??0)).map(date=>({date,rawCount:rawVisits.get(date)??0,aggregateCount:aggVisits.get(date)??0}));
  const key=(d,c)=>`${d}\u0000${c}`;
  const rawCameras=new Map(all(db,"SELECT aggregate_date date,camera_id,COUNT(*) count FROM events WHERE aggregate_date>=? AND aggregate_date<? AND event_key IS NOT NULL AND event_type='camera_view' AND camera_id IS NOT NULL GROUP BY aggregate_date,camera_id", comparableFromDate, comparableToDateExclusive).map(r=>[key(r.date,r.camera_id),r]));
  const aggCameras=new Map(all(db,"SELECT date,camera_id,views count FROM audience_camera_daily WHERE date>=? AND date<?", comparableFromDate, comparableToDateExclusive).map(r=>[key(r.date,r.camera_id),r]));
  const cameraMismatches=[...new Set([...rawCameras.keys(),...aggCameras.keys()])].sort().filter(k=>(rawCameras.get(k)?.count??0)!==(aggCameras.get(k)?.count??0)).map(k=>{const r=rawCameras.get(k)??aggCameras.get(k);return {date:r.date,cameraId:r.camera_id,rawCount:rawCameras.get(k)?.count??0,aggregateCount:aggCameras.get(k)?.count??0};});
  return { eligibleNullCount, invalidAggregateDateCount, comparableFromDate, comparableToDateExclusive, visitMismatches, cameraMismatches };
}

export function parseArguments(args) {
  const out={dryRun:true,json:false};
  for(let i=0;i<args.length;i++) {
    const arg=args[i];
    if(arg==="--dry-run") out.dryRun=true;
    else if(arg==="--confirm") { out.confirm=true; out.dryRun=false; }
    else if(arg==="--json") out.json=true;
    else if(arg==="--parity") out.parity=true;
    else if(["--from-date","--to-date","--max-days","--max-rows","--row-budget","--database-file"].includes(arg)) {
      const names={"--from-date":"fromDate","--to-date":"toDate","--max-days":"maxDays","--max-rows":"maxRows","--row-budget":"rowBudget","--database-file":"databaseFile"};
      const value=args[++i]; if(value===undefined) throw new Error(`Missing value for ${arg}`);
      out[names[arg]]=["--max-days","--max-rows","--row-budget"].includes(arg)?Number(value):value;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options=parseArguments(process.argv.slice(2));
    if(!options.databaseFile) throw new Error("--database-file is required; remote D1 execution is intentionally unsupported");
    const db=new DatabaseSync(options.databaseFile);
    const output=options.parity
      ? await inspectParity(db)
      : options.dryRun ? await inspectBackfill(db,options) : await runBackfill(db,options);
    console.log(options.json ? JSON.stringify(output) : JSON.stringify(output,null,2));
    db.close();
  } catch(error) {
    console.error(JSON.stringify({error:error.message}));
    process.exitCode=2;
  }
}
