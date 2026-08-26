import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { INITIAL_PROFILES } from "../functions/lib/marine/profiles.mjs";
import { recommendLocation } from "../functions/lib/marine/recommendation-engine.mjs";
import { handleMarineSimulation } from "../functions/lib/marine/simulation-handler.mjs";

globalThis.__marineSimulationHandler = handleMarineSimulation;
const routeSource = (await readFile(new URL("../functions/api/marine-recommendations/simulate.js", import.meta.url), "utf8"))
  .replace("import { handleMarineSimulation } from '../../lib/marine/simulation-handler.mjs';", "const handleMarineSimulation = globalThis.__marineSimulationHandler;");
const { onRequestOptions, onRequestPost } = await import(`data:text/javascript;base64,${Buffer.from(routeSource).toString("base64")}`);

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

test("simulation route allows credentialed preflight only from the LAB PWA origin", () => {
  const origin = "https://lab-control.livesantamaria.org";
  const response = onRequestOptions({ request: new Request("https://site.test/api/marine-recommendations/simulate", {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type"
    }
  }) });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
  assert.equal(response.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
  assert.equal(response.headers.get("Access-Control-Allow-Headers"), "Content-Type");
  assert.notEqual(response.headers.get("Access-Control-Allow-Origin"), "*");

  const rejected = onRequestOptions({ request: new Request("https://site.test/api/marine-recommendations/simulate", {
    method: "OPTIONS",
    headers: { Origin: "https://untrusted.example" }
  }) });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(rejected.headers.get("Access-Control-Allow-Credentials"), null);
});

test("authorized simulation POST returns the credentialed CORS contract", async () => {
  const origin = "https://lab-control.livesantamaria.org";
  const profile = INITIAL_PROFILES[0];
  const response = await onRequestPost({ request: new Request("https://site.test/api/marine-recommendations/simulate", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ profile, scenario: fixtures[0].scenario })
  }) });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
  assert.notEqual(response.headers.get("Access-Control-Allow-Origin"), "*");
  const result = await response.json();
  assert.equal(typeof result.scoreBeforeCap, "number");
  assert.equal(typeof result.score, "number");
  assert.equal(typeof result.rating, "string");
  assert.equal(typeof result.hardCap.applied, "boolean");
  assert.equal(typeof result.primaryReason, "string");
});
