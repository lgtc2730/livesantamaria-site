import test from "node:test";
import assert from "node:assert/strict";

import {
  ENGINE_RULES,
  classifyRelativeWind,
  directionScore,
  ratingForScore,
  recommendLocation,
  scoreCurve
} from "../functions/lib/marine/recommendation-engine.mjs";
import { INITIAL_PROFILES, validateProfiles } from "../functions/lib/marine/profiles.mjs";

test("normative profiles preserve the approved provisional geometry", () => {
  assert.deepEqual(INITIAL_PROFILES.map(({ id, type, cameraId, coastFacingDeg }) => ({ id, type, cameraId, coastFacingDeg })), [
    { id: "sao-lourenco", type: "bay", cameraId: "slourenco-sul", coastFacingDeg: 85 },
    { id: "maia", type: "natural_pool", cameraId: "maia-norte", coastFacingDeg: 100 },
    { id: "praia-formosa", type: "beach", cameraId: "praia-poente", coastFacingDeg: 190 },
    { id: "anjos", type: "natural_pool", cameraId: "anjos-porto", coastFacingDeg: 285 }
  ]);
  assert.equal(INITIAL_PROFILES.every((profile) => profile.profileVersion === "0.1" && profile.confidence === "provisional"), true);
  assert.equal(validateProfiles(INITIAL_PROFILES).valid, true);
});

test("height and period curves interpolate between literal normative points", () => {
  assert.equal(scoreCurve(0.4, ENGINE_RULES.heightCurve), 100);
  assert.equal(scoreCurve(0.65, ENGINE_RULES.heightCurve), 90);
  assert.equal(scoreCurve(3.5, ENGINE_RULES.heightCurve), 0);
  assert.equal(scoreCurve(9, ENGINE_RULES.periodCurve), 85);
  assert.equal(scoreCurve(18, ENGINE_RULES.periodCurve), 10);
});

test("direction smoothing is circular and linear across wraparound boundaries", () => {
  const sectors = INITIAL_PROFILES[0].sectors;
  assert.equal(directionScore(10, sectors, 10), 80);
  assert.equal(directionScore(20, sectors, 10), 67.5);
  assert.equal(directionScore(30, sectors, 10), 55);
  assert.equal(directionScore(330, sectors, 10), 90);
  assert.equal(directionScore(0, sectors, 10), 80);
});

test("relative wind uses the normative half-open boundaries", () => {
  const cases = [
    [0, "onshore"], [22.499, "onshore"], [22.5, "cross-onshore"],
    [67.5, "cross-shore"], [112.5, "cross-offshore"],
    [157.5, "offshore"], [180, "offshore"], [202.5, "offshore"]
  ];
  for (const [wind, expected] of cases) assert.equal(classifyRelativeWind(wind, 0), expected);
  assert.equal(classifyRelativeWind(10, 190), "offshore");
});

test("rating bands include their exact lower boundaries", () => {
  assert.deepEqual([0, 30, 50, 70, 85, 100].map(ratingForScore), [
    "very_exposed", "exposed", "moderate", "good", "excellent", "excellent"
  ]);
});

test("type weights produce a literal weighted score", () => {
  const profile = { ...INITIAL_PROFILES[2], sectors: [{ from: 0, to: 360, level: "partial" }] };
  const result = recommendLocation(profile, {
    swellDirectionDeg: 180, swellHeightM: 1, swellPeriodS: 10,
    windDirectionDeg: 190, windSpeedKmh: 15, windGustKmh: 20
  });
  assert.equal(result.components.direction, 55);
  assert.equal(result.components.height, 75);
  assert.equal(result.components.period, 80);
  assert.equal(result.components.wind, 65);
  assert.equal(result.scoreBeforeCap, 68);
});

test("marine hard caps retain pre-cap score and dominate the public reason", () => {
  const shelteredPool = { ...INITIAL_PROFILES[1], sectors: [{ from: 0, to: 360, level: "very_sheltered" }] };
  const result = recommendLocation(shelteredPool, {
    swellDirectionDeg: 270, swellHeightM: 2.5, swellPeriodS: 10,
    windDirectionDeg: 280, windSpeedKmh: 5, windGustKmh: 10
  });
  assert.equal(result.scoreBeforeCap > 29, true);
  assert.equal(result.score, 29);
  assert.equal(result.hardCap.applied, true);
  assert.equal(result.hardCap.reason, "marine_height_very_strong");
  assert.equal(result.primaryReason, "marine_height_very_strong");
  assert.equal(result.message, "Mar forte junto à zona balnear");
});

test("wind gust caps apply by type and never remain silent", () => {
  const result = recommendLocation(INITIAL_PROFILES[2], {
    swellDirectionDeg: 0, swellHeightM: 0.4, swellPeriodS: 6,
    windDirectionDeg: 190, windSpeedKmh: 5, windGustKmh: 60
  });
  assert.equal(result.score, 49);
  assert.deepEqual(result.hardCap, { applied: true, maxScore: 49, reason: "wind_gusts_severe" });
  assert.equal(result.primaryReason, "wind_gusts_severe");
  assert.equal(result.message, "Vento forte junto à costa");
});

test("the word recomendado appears only for excellent", () => {
  for (const height of [0.4, 1, 1.8, 2.5]) {
    const result = recommendLocation(INITIAL_PROFILES[0], {
      swellDirectionDeg: 270, swellHeightM: height, swellPeriodS: 8,
      windDirectionDeg: 270, windSpeedKmh: 5, windGustKmh: 10
    });
    assert.equal(/recomendado/i.test(result.message), result.rating === "excellent");
  }
});
