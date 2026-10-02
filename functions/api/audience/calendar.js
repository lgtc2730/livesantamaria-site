export const AZORES_TIME_ZONE = "Atlantic/Azores";

const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: AZORES_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

function zonedParts(date) {
  return Object.fromEntries(
    zonedFormatter
      .formatToParts(date)
      .filter(part => part.type !== "literal")
      .map(part => [part.type, Number(part.value)])
  );
}

function validInstant(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("Expected a valid instant");
  return date;
}

function calendarParts(value) {
  if (typeof value !== "string") throw new TypeError("Expected an Azores calendar date");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError("Invalid Azores calendar date");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const normalized = new Date(Date.UTC(year, month - 1, day));

  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() + 1 !== month ||
    normalized.getUTCDate() !== day
  ) {
    throw new RangeError("Invalid Azores calendar date");
  }

  return { year, month, day };
}

function formatCalendarParts({ year, month, day }) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function azoresCalendarDate(instant) {
  const { year, month, day } = zonedParts(validInstant(instant));
  return formatCalendarParts({ year, month, day });
}

export function addAzoresCalendarDays(date, amount) {
  if (!Number.isInteger(amount)) throw new TypeError("Calendar-day offset must be an integer");
  const { year, month, day } = calendarParts(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount));
  return formatCalendarParts({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  });
}

export function azoresCalendarDateStart(date) {
  const { year, month, day } = calendarParts(date);
  const desiredAsUtc = Date.UTC(year, month - 1, day);
  let guess = desiredAsUtc;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = zonedParts(new Date(guess));
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
  if (azoresCalendarDate(resolved) === date) return resolved;

  let lower = desiredAsUtc - 36 * 60 * 60 * 1000;
  let upper = desiredAsUtc + 36 * 60 * 60 * 1000;

  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (azoresCalendarDate(new Date(middle)) < date) {
      lower = middle + 1;
    } else {
      upper = middle;
    }
  }

  const firstInstant = new Date(lower);
  if (azoresCalendarDate(firstInstant) !== date) {
    throw new RangeError(`Unable to resolve Azores calendar date ${date}`);
  }
  return firstInstant;
}

export function azoresCalendarDateBounds(date) {
  calendarParts(date);
  return Object.freeze({
    start: azoresCalendarDateStart(date),
    end: azoresNextCalendarDateStart(date)
  });
}

export function azoresNextCalendarDateStart(date) {
  return azoresCalendarDateStart(addAzoresCalendarDays(date, 1));
}

export function getAzoresCalendarPeriods(instant = new Date()) {
  const currentDate = azoresCalendarDate(instant);
  return Object.freeze({
    currentDate,
    previousDate: addAzoresCalendarDays(currentDate, -1),
    monthStartDate: `${currentDate.slice(0, 8)}01`,
    rolling7StartDate: addAzoresCalendarDays(currentDate, -6),
    rolling30StartDate: addAzoresCalendarDays(currentDate, -29)
  });
}
