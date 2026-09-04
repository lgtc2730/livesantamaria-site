import { getAzoresCalendarPeriods } from "./calendar.js";

export function getPeriodBoundaries(now = new Date()) {
  const periods = getAzoresCalendarPeriods(now);
  return Object.freeze({
    ...periods,
    queryStartDate: periods.rolling30StartDate < periods.monthStartDate
      ? periods.rolling30StartDate
      : periods.monthStartDate
  });
}

function count(value) {
  return Number(value ?? 0);
}

function cameraRanking(rows, field) {
  return rows
    .map(row => ({ camera: row.camera, count: count(row[field]) }))
    .filter(row => row.count > 0)
    .sort((left, right) => right.count - left.count || (
      left.camera < right.camera ? -1 : left.camera > right.camera ? 1 : 0
    ))
    .slice(0, 5);
}

export async function onRequestGet(context) {
  const db = context.env.LVSM_AUDIENCE;
  const now = context.now ?? new Date();
  const periods = getPeriodBoundaries(now);

  const [visitsResult, camerasResult] = await db.batch([
    db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN date = ? THEN visits ELSE 0 END), 0) AS today,
        COALESCE(SUM(CASE WHEN date = ? THEN visits ELSE 0 END), 0) AS yesterday,
        COALESCE(SUM(CASE WHEN date >= ? THEN visits ELSE 0 END), 0) AS last7,
        COALESCE(SUM(CASE WHEN date >= ? THEN visits ELSE 0 END), 0) AS last30,
        COALESCE(SUM(CASE WHEN date >= ? THEN visits ELSE 0 END), 0) AS month_to_date
      FROM audience_daily
      WHERE date >= ?
        AND date <= ?
    `).bind(
      periods.currentDate,
      periods.previousDate,
      periods.rolling7StartDate,
      periods.rolling30StartDate,
      periods.monthStartDate,
      periods.queryStartDate,
      periods.currentDate
    ),
    db.prepare(`
      SELECT
        camera_id AS camera,
        SUM(CASE WHEN date >= ? THEN views ELSE 0 END) AS last30_count,
        SUM(CASE WHEN date >= ? THEN views ELSE 0 END) AS month_count
      FROM audience_camera_daily
      WHERE date >= ?
        AND date <= ?
      GROUP BY camera_id
    `).bind(
      periods.rolling30StartDate,
      periods.monthStartDate,
      periods.queryStartDate,
      periods.currentDate
    )
  ]);

  const visitCounts = visitsResult.results[0] ?? {};
  const last30 = count(visitCounts.last30);

  return Response.json({
    apiVersion: 1,
    generatedAt: now.toISOString(),
    visits: {
      today: count(visitCounts.today),
      yesterday: count(visitCounts.yesterday),
      last7: count(visitCounts.last7),
      last30,
      total: last30,
      monthToDate: count(visitCounts.month_to_date)
    },
    top: cameraRanking(camerasResult.results, "last30_count"),
    cameraRankingMonth: cameraRanking(camerasResult.results, "month_count")
  }, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
