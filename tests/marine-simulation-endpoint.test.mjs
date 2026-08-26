import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { INITIAL_PROFILES } from "../functions/lib/marine/profiles.mjs";
import { recommendLocation } from "../functions/lib/marine/recommendation-engine.mjs";
import { handleMarineSimulation } from "../functions/lib/marine/simulation-handler.mjs";

const fixtures = JSON.parse(await readFile(new URL("./fixtures/marine-simulation-fixtures.json", import.meta.url)));
const conditions = s => ({ swellDirectionDeg: s.direction, swellHeightM: s.height, swellPeriodS: s.period, windDirectionDeg: s.windDirection, windSpeedKmh: s.wind, windGustKmh: s.gusts });

test("simulation endpoint is a strict read-only adapter over the normative engine", async () => {
  for (const fixture of fixtures) {
    const profile = INITIAL_PROFILES.find(item => item.id === fixture.profileId);
    const expected = recommendLocation(profile, conditions(fixture.scenario));
    const response = await handleMarineSimulation(new Request("https://site.test/api/marine-recommendations/simulate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile, scenario: fixture.scenario }) }));
    assert.equal(response.status, 200, fixture.name);
    const actual = await response.json();
    assert.deepEqual({ scoreBeforeCap: actual.scoreBeforeCap, score: actual.score, rating: actual.rating, hardCap: actual.hardCap, primaryReason: actual.primaryReason }, { scoreBeforeCap: expected.scoreBeforeCap, score: expected.score, rating: expected.rating, hardCap: expected.hardCap, primaryReason: expected.primaryReason }, fixture.name);
  }
});

test("simulation endpoint rejects ambiguous or extra input and has no persistence dependency", async () => {
  const profile = INITIAL_PROFILES[0];
  for (const body of [
    { profile, scenario: { ...fixtures[0].scenario, direction: 360 } },
    { profile, scenario: { ...fixtures[0].scenario, height: "0.4" } },
    { profile: { ...profile, unexpected: true }, scenario: fixtures[0].scenario },
    { profile, scenario: { ...fixtures[0].scenario, unexpected: true } }
  ]) {
    const response = await handleMarineSimulation(new Request("https://site.test/api/marine-recommendations/simulate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    assert.equal(response.status, 400);
  }
  assert.equal(handleMarineSimulation.length, 1);
});
