import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../functions/api/audience/calendar.js", import.meta.url),
  "utf8"
);
const {
  addAzoresCalendarDays,
  azoresCalendarDate,
  azoresCalendarDateBounds,
  azoresCalendarDateStart,
  azoresNextCalendarDateStart,
  getAzoresCalendarPeriods
} = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const dateFixtures = [
  ["normal winter date", "2026-01-15T12:00:00.000Z", "2026-01-15"],
  ["normal summer date", "2026-07-15T12:00:00.000Z", "2026-07-15"],
  ["UTC instant in previous Azores day", "2026-01-01T00:30:00.000Z", "2025-12-31"],
  ["last millisecond before spring date", "2026-03-29T00:59:59.999Z", "2026-03-28"],
  ["first instant of spring date", "2026-03-29T01:00:00.000Z", "2026-03-29"],
  ["leap day", "2028-02-29T12:00:00.000Z", "2028-02-29"],
  ["first occurrence of autumn midnight", "2026-10-25T00:00:00.000Z", "2026-10-25"],
  ["repeated autumn midnight hour", "2026-10-25T01:00:00.000Z", "2026-10-25"]
];

for (const [name, instant, expected] of dateFixtures) {
  test(`derives ${name}`, () => {
    assert.equal(azoresCalendarDate(new Date(instant)), expected);
  });
}

test("uses exact winter midnight and adjacent milliseconds", () => {
  assert.equal(azoresCalendarDate(new Date("2026-01-01T00:59:59.999Z")), "2025-12-31");
  assert.equal(azoresCalendarDate(new Date("2026-01-01T01:00:00.000Z")), "2026-01-01");
  assert.equal(azoresCalendarDate(new Date("2026-01-01T01:00:00.001Z")), "2026-01-01");
});

test("performs calendar arithmetic across month, year, and leap-day boundaries", () => {
  assert.equal(addAzoresCalendarDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addAzoresCalendarDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addAzoresCalendarDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addAzoresCalendarDays("2028-02-29", 1), "2028-03-01");
});

test("derives previous, rolling, and month-to-date calendar dates", () => {
  assert.deepEqual(getAzoresCalendarPeriods(new Date("2026-09-04T12:00:00.000Z")), {
    currentDate: "2026-09-04",
    previousDate: "2026-09-03",
    monthStartDate: "2026-09-01",
    rolling7StartDate: "2026-08-29",
    rolling30StartDate: "2026-08-06"
  });
});

test("derives rolling dates across leap day", () => {
  assert.deepEqual(getAzoresCalendarPeriods(new Date("2028-03-01T12:00:00.000Z")), {
    currentDate: "2028-03-01",
    previousDate: "2028-02-29",
    monthStartDate: "2028-03-01",
    rolling7StartDate: "2028-02-24",
    rolling30StartDate: "2028-02-01"
  });
});

const boundaryFixtures = [
  ["winter", "2026-01-01", "2026-01-01T01:00:00.000Z", "2026-01-02T01:00:00.000Z"],
  ["summer", "2026-07-15", "2026-07-15T00:00:00.000Z", "2026-07-16T00:00:00.000Z"],
  ["spring DST day", "2026-03-29", "2026-03-29T01:00:00.000Z", "2026-03-30T00:00:00.000Z"],
  ["autumn DST day", "2026-10-25", "2026-10-25T00:00:00.000Z", "2026-10-26T01:00:00.000Z"],
  ["leap day", "2028-02-29", "2028-02-29T01:00:00.000Z", "2028-03-01T01:00:00.000Z"]
];

for (const [name, date, expectedStart, expectedEnd] of boundaryFixtures) {
  test(`resolves the half-open UTC interval for ${name}`, () => {
    const { start, end } = azoresCalendarDateBounds(date);

    assert.equal(start.toISOString(), expectedStart);
    assert.equal(end.toISOString(), expectedEnd);
    assert.equal(azoresCalendarDateStart(date).toISOString(), expectedStart);
    assert.equal(azoresNextCalendarDateStart(date).toISOString(), expectedEnd);
    assert.equal(azoresCalendarDate(new Date(start.getTime() - 1)), addAzoresCalendarDays(date, -1));
    assert.equal(azoresCalendarDate(start), date);
    assert.equal(azoresCalendarDate(new Date(end.getTime() - 1)), date);
    assert.equal(azoresCalendarDate(end), addAzoresCalendarDays(date, 1));
  });
}

test("round-trips representative instants through their exact half-open date interval", () => {
  const instants = [
    "2026-01-01T00:30:00.000Z",
    "2026-03-29T00:59:59.999Z",
    "2026-03-29T01:00:00.000Z",
    "2026-07-15T23:59:59.999Z",
    "2026-10-25T00:30:00.000Z",
    "2026-10-25T01:30:00.000Z",
    "2028-02-29T12:00:00.000Z"
  ];

  for (const value of instants) {
    const instant = new Date(value);
    const date = azoresCalendarDate(instant);
    const { start, end } = azoresCalendarDateBounds(date);

    assert.ok(start.getTime() <= instant.getTime(), `${value} starts inside ${date}`);
    assert.ok(instant.getTime() < end.getTime(), `${value} ends inside ${date}`);
  }
});

test("rejects invalid instants, dates, and non-integer calendar offsets", () => {
  assert.throws(() => azoresCalendarDate(new Date("invalid")), /valid instant/i);
  assert.throws(() => azoresCalendarDateStart("2026-02-29"), /calendar date/i);
  assert.throws(() => addAzoresCalendarDays("2026-01-01", 1.5), /integer/i);
});
