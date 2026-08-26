import test from "node:test";
import assert from "node:assert/strict";

import { fetchMarineConditions, freshnessFor, OFFSHORE_POINT } from "../functions/lib/marine/marine-source.mjs";
import { buildPresentationContract } from "../functions/lib/marine/presentation-contract.mjs";
import { buildMarineRecommendationsResponse } from "../functions/lib/marine/api-handler.mjs";
import { INITIAL_PROFILES } from "../functions/lib/marine/profiles.mjs";

const NOW = new Date("2026-08-26T12:00:00.000Z");

function upstreamFetch({ omitTemperature = false, omitDirection = false, fail = false } = {}) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (fail) return new Response("upstream", { status: 503 });
    if (String(url).includes("marine-api")) return Response.json({
      hourly: {
        time: ["2026-08-26T11:00"],
        swell_wave_direction: [omitDirection ? null : 315],
        swell_wave_height: [1.2], swell_wave_period: [11], wave_height: [1.5],
        ...(omitTemperature ? {} : { sea_surface_temperature: [22.4] })
      }
    });
    return Response.json({ hourly: {
      time: ["2026-08-26T11:00"], wind_direction_10m: [280], wind_speed_10m: [18], wind_gusts_10m: [31]
    }});
  };
  return { fetchImpl, calls };
}

test("source requests the single normative point and normalizes marine plus wind data", async () => {
  const upstream = upstreamFetch();
  const result = await fetchMarineConditions(upstream.fetchImpl, NOW);
  assert.deepEqual(OFFSHORE_POINT, { latitude: 36.85, longitude: -25.2, offshorePointVersion: "0.1", confidence: "provisional" });
  assert.equal(upstream.calls.length, 2);
  for (const url of upstream.calls) assert.match(url, /latitude=36\.85.*longitude=-25\.2/);
  assert.match(upstream.calls[0], /swell_wave_direction/);
  assert.match(upstream.calls[1], /wind_gusts_10m/);
  assert.deepEqual(result, {
    sourceUpdatedAt: "2026-08-26T11:00:00.000Z", validFor: "2026-08-26T11:00:00.000Z",
    swellDirectionDeg: 315, swellHeightM: 1.2, swellPeriodS: 11, combinedWaveHeightM: 1.5,
    seaTemperatureC: 22.4, windDirectionDeg: 280, windSpeedKmh: 18, windGustKmh: 31
  });
});

test("missing sea temperature remains valid but missing critical marine data fails", async () => {
  assert.equal((await fetchMarineConditions(upstreamFetch({ omitTemperature: true }).fetchImpl, NOW)).seaTemperatureC, null);
  await assert.rejects(fetchMarineConditions(upstreamFetch({ omitDirection: true }).fetchImpl, NOW), /critical_marine_data_missing/);
});

test("freshness boundaries are inclusive and conservative", () => {
  assert.equal(freshnessFor("2026-08-26T11:00:00.000Z", NOW), "fresh");
  assert.equal(freshnessFor("2026-08-26T10:59:59.999Z", NOW), "stale");
  assert.equal(freshnessFor("2026-08-26T09:00:00.000Z", NOW), "stale");
  assert.equal(freshnessFor("2026-08-26T08:59:59.999Z", NOW), "expired");
});

test("presentation contract contains the complete ordered four-location payload", async () => {
  const conditions = await fetchMarineConditions(upstreamFetch().fetchImpl, NOW);
  const payload = buildPresentationContract({ conditions, profiles: INITIAL_PROFILES, now: NOW });
  assert.equal(payload.generatedAt, NOW.toISOString());
  assert.equal(payload.dataStatus, "fresh");
  assert.equal(payload.context.waveDirectionLabel, "NW");
  assert.equal(payload.locations.length, 4);
  assert.deepEqual(Object.keys(payload.locations[0]), [
    "id", "name", "type", "cameraId", "score", "scoreBeforeCap", "rating", "primaryReason",
    "secondaryReason", "message", "hardCap", "profile"
  ]);
  assert.match(payload.disclaimer, /Confirme sempre as condições no local/);
});

test("endpoint returns a cacheable safe contract and contains upstream failure", async () => {
  const ok = await buildMarineRecommendationsResponse({ fetchImpl: upstreamFetch().fetchImpl, now: NOW });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("Cache-Control"), "public, max-age=1800");
  assert.equal((await ok.json()).locations.length, 4);

  const failed = await buildMarineRecommendationsResponse({ fetchImpl: upstreamFetch({ fail: true }).fetchImpl, now: NOW });
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await failed.json(), { dataStatus: "unavailable", message: "Recomendações temporariamente indisponíveis." });
});

test("endpoint consumes edited Control configuration through the LAB Service Binding", async () => {
  const upstream = upstreamFetch();
  const editable = structuredClone({ profiles: INITIAL_PROFILES, season: { start: "2027-06-01", end: "2027-09-30", timezone: "Atlantic/Azores" } });
  editable.profiles[0].confidence = "validated";
  const requests = [];
  const marineControl = { fetch: async request => { requests.push(request); return Response.json({ success: true, data: { revision: 2, config: editable } }); } };
  const response = await buildMarineRecommendationsResponse({ fetchImpl: upstream.fetchImpl, now: NOW, marineControl });
  const body = await response.json();
  assert.deepEqual(body.season, editable.season);
  assert.equal(body.locations.find(item => item.id === "sao-lourenco").profile.confidence, "validated");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://marine-control.internal/api/marine-recommendations/config/public");
  assert.equal(requests[0].method, "GET");
});

test("binding failure or invalid response falls back conservatively to the local baseline", async () => {
  for (const marineControl of [
    { fetch: async () => { throw new Error("binding unavailable"); } },
    { fetch: async () => Response.json({ success: true, data: { config: { profiles: [], season: null } } }) },
    { fetch: async () => new Response("Access redirect", { status: 302, headers: { location: "https://access.test" } }) }
  ]) {
    const response = await buildMarineRecommendationsResponse({ fetchImpl: upstreamFetch().fetchImpl, now: NOW, marineControl });
    const body = await response.json();
    assert.deepEqual(body.season, { start: "2026-06-01", end: "2026-09-30", timezone: "Atlantic/Azores" });
    assert.equal(body.locations[0].profile.confidence, "provisional");
  }
});

test("absence of a local/test binding uses the deterministic baseline without an Access URL", async () => {
  const upstream = upstreamFetch();
  const response = await buildMarineRecommendationsResponse({ fetchImpl: upstream.fetchImpl, now: NOW });
  assert.equal(response.status, 200);
  assert.equal(upstream.calls.some(url => url.includes("api-lab-control")), false);
});
