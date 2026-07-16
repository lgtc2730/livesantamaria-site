const TIME_ZONE = "Atlantic/Azores";

function getZonedParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(part => part.type !== "literal")
      .map(part => [part.type, Number(part.value)])
  );
}

function zonedMidnightUtc(year, month, day) {
  const desiredAsUtc = Date.UTC(year, month - 1, day);
  let guess = desiredAsUtc;

  for (let i = 0; i < 2; i++) {
    const actual = getZonedParts(new Date(guess));

    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );

    guess -= actualAsUtc - desiredAsUtc;
  }

  return new Date(guess);
}

function addCalendarDays(year, month, day, amount) {
  const date = new Date(Date.UTC(year, month - 1, day + amount));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function getPeriodBoundaries(now = new Date()) {

  const local = getZonedParts(now);

  const today = {
    year: local.year,
    month: local.month,
    day: local.day
  };

  const yesterday = addCalendarDays(
    today.year,
    today.month,
    today.day,
    -1
  );

  const last7 = addCalendarDays(
    today.year,
    today.month,
    today.day,
    -6
  );

  const tomorrow = addCalendarDays(
    today.year,
    today.month,
    today.day,
    1
  );

  return {

    yesterdayStart:
      zonedMidnightUtc(
        yesterday.year,
        yesterday.month,
        yesterday.day
      ).toISOString(),

    todayStart:
      zonedMidnightUtc(
        today.year,
        today.month,
        today.day
      ).toISOString(),

    tomorrowStart:
      zonedMidnightUtc(
        tomorrow.year,
        tomorrow.month,
        tomorrow.day
      ).toISOString(),

    last7Start:
      zonedMidnightUtc(
        last7.year,
        last7.month,
        last7.day
      ).toISOString()

  };

}

export async function onRequestGet(context) {

  const db = context.env.LVSM_AUDIENCE;

  const periods = getPeriodBoundaries();

  const [
    todayResult,
    yesterdayResult,
    last7Result,
    totalResult,
    topResult,
    firstResult
  ] = await db.batch([

    db.prepare(`
      SELECT COUNT(*) AS count
      FROM events
      WHERE event_type='visit'
        AND created_at>=?
        AND created_at<?
    `).bind(
      periods.todayStart,
      periods.tomorrowStart
    ),

    db.prepare(`
      SELECT COUNT(*) AS count
      FROM events
      WHERE event_type='visit'
        AND created_at>=?
        AND created_at<?
    `).bind(
      periods.yesterdayStart,
      periods.todayStart
    ),

    db.prepare(`
      SELECT COUNT(*) AS count
      FROM events
      WHERE event_type='visit'
        AND created_at>=?
        AND created_at<?
    `).bind(
      periods.last7Start,
      periods.tomorrowStart
    ),

    db.prepare(`
      SELECT COUNT(*) AS count
      FROM events
      WHERE event_type='visit'
    `),

    db.prepare(`
      SELECT camera_id AS camera,
             COUNT(*) AS count
      FROM events
      WHERE event_type='camera_view'
        AND camera_id IS NOT NULL
      GROUP BY camera_id
      ORDER BY count DESC,camera_id ASC
      LIMIT 5
    `),

    db.prepare(`
      SELECT MIN(created_at) AS activatedAt
      FROM events
      WHERE event_type='visit'
    `)

  ]);

  return Response.json({

    apiVersion: 1,

    generatedAt: new Date().toISOString(),

    activatedAt:
      firstResult.results[0]?.activatedAt ?? null,

    visits: {

      today:
        todayResult.results[0]?.count ?? 0,

      yesterday:
        yesterdayResult.results[0]?.count ?? 0,

      last7:
        last7Result.results[0]?.count ?? 0,

      total:
        totalResult.results[0]?.count ?? 0

    },

    top:
      topResult.results.map(row => ({
        camera: row.camera,
        count: row.count
      }))

  }, {

    headers: {
      "Cache-Control": "no-store"
    }

  });

}