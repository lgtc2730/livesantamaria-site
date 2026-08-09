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

  const resolved = new Date(guess);
  const resolvedParts = getZonedParts(resolved);

  if (
    resolvedParts.year === year &&
    resolvedParts.month === month &&
    resolvedParts.day === day
  ) {
    return resolved;
  }

  let lower = desiredAsUtc - 36 * 60 * 60 * 1000;
  let upper = desiredAsUtc + 36 * 60 * 60 * 1000;

  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    const parts = getZonedParts(new Date(middle));
    const isBeforeTarget =
      parts.year < year ||
      (parts.year === year && parts.month < month) ||
      (parts.year === year && parts.month === month && parts.day < day);

    if (isBeforeTarget) {
      lower = middle + 1;
    } else {
      upper = middle;
    }
  }

  const firstValidInstant = new Date(lower);
  const firstValidParts = getZonedParts(firstValidInstant);

  if (
    firstValidParts.year !== year ||
    firstValidParts.month !== month ||
    firstValidParts.day !== day
  ) {
    throw new RangeError("Unable to resolve Atlantic/Azores calendar day");
  }

  return firstValidInstant;
}

function addCalendarDays(year, month, day, amount) {
  const date = new Date(Date.UTC(year, month - 1, day + amount));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

export function getPeriodBoundaries(now = new Date()) {

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

  const last30 = addCalendarDays(
    today.year,
    today.month,
    today.day,
    -29
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
      ).toISOString(),

    last30Start:
      zonedMidnightUtc(
        last30.year,
        last30.month,
        last30.day
      ).toISOString()

  };
}

export async function onRequestGet(context) {

  const db = context.env.LVSM_AUDIENCE;

  const now = context.now ?? new Date();
  const periods = getPeriodBoundaries(now);

  const [
    todayResult,
    yesterdayResult,
    last7Result,
    last30Result,
    topResult
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
        AND created_at>=?
        AND created_at<?
    `).bind(
      periods.last30Start,
      periods.tomorrowStart
    ),

    db.prepare(`
      SELECT camera_id AS camera,
             COUNT(*) AS count
      FROM events
      WHERE event_type='camera_view'
        AND camera_id IS NOT NULL
        AND created_at>=?
        AND created_at<?
      GROUP BY camera_id
      ORDER BY count DESC,camera_id ASC
      LIMIT 5
    `).bind(
      periods.last30Start,
      periods.tomorrowStart
    )

  ]);

  return Response.json({
    apiVersion: 1,
    generatedAt: now.toISOString(),

    visits: {

      today:
        todayResult.results[0]?.count ?? 0,

      yesterday:
        yesterdayResult.results[0]?.count ?? 0,

      last7:
        last7Result.results[0]?.count ?? 0,

      last30:
        last30Result.results[0]?.count ?? 0,

      total:
        last30Result.results[0]?.count ?? 0
    },

    top:
      topResult.results.map(row => ({
        camera: row.camera,
        count: row.count
      }))

  }, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
