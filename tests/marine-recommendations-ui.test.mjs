import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

import * as marine from "../assets/marine-recommendations.mjs";
import { INITIAL_PROFILES } from "../functions/lib/marine/profiles.mjs";

const { activateMarineRecommendationsAnchor, isBathingSeason, ratingPresentation } = marine;

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

function seaDocument() {
  const nodes = Object.fromEntries([
    "seaWaveHeight", "seaCombinedWaveHeight", "seaWavePeriod", "seaWaveDirection", "seaTemperature"
  ].map(id => [id, { textContent: "" }]));
  return { nodes, documentRef: { getElementById: id => nodes[id] || null } };
}

function ctaDocument() {
  const label = { textContent: "" };
  const cta = {
    hidden: true,
    querySelector: selector => selector === ".marine-cta__label" ? label : null
  };
  return {
    cta,
    label,
    documentRef: { querySelector: selector => selector === "#marineTeaser" ? cta : null }
  };
}

const SEA_PAYLOAD = Object.freeze({
  dataStatus: "fresh",
  context: { waveHeightM: 0.64, waveDirectionLabel: "E", seaTemperatureC: 23.4 },
  conditions: { swellHeightM: 0.64, swellPeriodS: 6.8, combinedWaveHeightM: 1.44 },
  locations: [],
  season: { start: "2026-06-01", end: "2026-09-30", timezone: "Atlantic/Azores" }
});

test("season is inclusive from 1 June through 30 September in Atlantic/Azores", () => {
  const season = { start: "2026-06-01", end: "2026-09-30", timezone: "Atlantic/Azores" };
  assert.equal(isBathingSeason(new Date("2026-06-01T00:30:00Z"), season), true);
  assert.equal(isBathingSeason(new Date("2026-09-30T23:30:00Z"), season), true);
  assert.equal(isBathingSeason(new Date("2026-10-01T00:30:00Z"), season), false);
});

test("public rating labels and colors are presentation-only", () => {
  assert.deepEqual(ratingPresentation("excellent"), { icon: "🟢", label: "Muito bom", tone: "excellent" });
  assert.deepEqual(ratingPresentation("very_exposed"), { icon: "🔴", label: "Muito exposto", tone: "very_exposed" });
});

test("homepage and forecast contain compact marine hosts and one shared detail", () => {
  assert.match(html, /class="marine-cta" id="marineTeaser" href="\?section=forecast#marine-recommendations" hidden/);
  assert.doesNotMatch(html, /class="marine-teaser"/);
  assert.match(html, /id="filters"[\s\S]*?id="marineTeaser"[\s\S]*?class="section-head-right"/);
  assert.match(html, /\.section-head\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+minmax\(0,\s*1fr\)/);
  assert.match(html, /<svg class="marine-cta__flag"[^>]*aria-hidden="true"[^>]*viewBox="0 0 24 24"/);
  assert.match(html, /\.marine-cta__flag\s*\{[\s\S]*?width:\s*18px;[\s\S]*?color:\s*currentColor;/);
  assert.match(html, /\.marine-cta\s*\{[\s\S]*?background:\s*linear-gradient\([\s\S]*?border:\s*1px solid rgba\(246,196,83,\.72\)/);
  assert.match(html, /\.marine-cta:hover\s*\{[\s\S]*?box-shadow:/);
  assert.doesNotMatch(html, /<span aria-hidden="true">📍<\/span>/);
  assert.match(html, /@media \(min-width:\s*681px\) and \(max-width:\s*900px\)\s*\{[\s\S]*?\.section-head\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+minmax\(0,\s*1fr\)/);
  assert.match(html, /id="marine-recommendations"/);
  assert.match(html, /id="marineLocations"/);
  assert.match(html, /id="marineLocationDetail"/);
  assert.match(html, /Indicação baseada na previsão do mar e vento\. Confirme sempre as condições no local\./);
  assert.match(html, /grid-template-columns:\s*repeat\(4,/);
  assert.match(html, /@media[^}]*max-width:\s*680px[\s\S]*?\.marine-locations[^}]*repeat\(2,/);
  assert.match(html, /marine-recommendations\.mjs/);
});

test("marine CTA reuses payload water temperature and rounds it for the compact label", () => {
  const { cta, label, documentRef } = ctaDocument();

  marine.renderMarineCta({ ...SEA_PAYLOAD, context: { ...SEA_PAYLOAD.context, seaTemperatureC: 23.6 } }, {
    documentRef,
    now: new Date("2026-08-26T12:00:00.000Z")
  });

  assert.equal(cta.hidden, false);
  assert.equal(label.textContent, "ESCOLHA ONDE IR HOJE - ÁGUA 24º");
});

test("marine CTA remains clickable without a valid water temperature", () => {
  const { cta, label, documentRef } = ctaDocument();

  marine.renderMarineCta({ ...SEA_PAYLOAD, context: { ...SEA_PAYLOAD.context, seaTemperatureC: null } }, {
    documentRef,
    now: new Date("2026-08-26T12:00:00.000Z")
  });

  assert.equal(cta.hidden, false);
  assert.equal(label.textContent, "ESCOLHA ONDE IR HOJE");
});

test("marine CTA preserves bathing-season visibility for available and unavailable data", () => {
  for (const [now, hidden] of [
    [new Date("2026-06-01T12:00:00.000Z"), false],
    [new Date("2026-10-01T12:00:00.000Z"), true]
  ]) {
    const { cta, label, documentRef } = ctaDocument();
    marine.renderMarineCta({ dataStatus: "unavailable" }, { documentRef, now });
    assert.equal(cta.hidden, hidden);
    assert.equal(label.textContent, "ESCOLHA ONDE IR HOJE");
  }
});

test("classic sea conditions render the canonical Marine payload without combined-wave divergence", () => {
  const { nodes, documentRef } = seaDocument();

  marine.renderMarineSeaConditions(SEA_PAYLOAD, { documentRef });

  assert.deepEqual(Object.fromEntries(Object.entries(nodes).map(([id, node]) => [id, node.textContent])), {
    seaWaveHeight: "0,6 m",
    seaCombinedWaveHeight: "1,4 m",
    seaWavePeriod: "7 s",
    seaWaveDirection: "E",
    seaTemperature: "23,4 °C"
  });
});

test("classic sea conditions use dashes for unavailable or expired Marine data", () => {
  for (const dataStatus of ["unavailable", "expired"]) {
    const { nodes, documentRef } = seaDocument();
    marine.renderMarineSeaConditions({ ...SEA_PAYLOAD, dataStatus }, { documentRef });
    assert.deepEqual(new Set(Object.values(nodes).map(node => node.textContent)), new Set(["—"]));
  }
});

test("classic sea conditions keep canonical values when Marine data is stale", () => {
  const { nodes, documentRef } = seaDocument();

  marine.renderMarineSeaConditions({ ...SEA_PAYLOAD, dataStatus: "stale" }, { documentRef });

  assert.equal(nodes.seaWaveHeight.textContent, "0,6 m");
  assert.equal(nodes.seaCombinedWaveHeight.textContent, "1,4 m");
  assert.equal(nodes.seaWavePeriod.textContent, "7 s");
  assert.equal(nodes.seaWaveDirection.textContent, "E");
  assert.equal(nodes.seaTemperature.textContent, "23,4 °C");
});

test("one Marine refresh updates recommendations and classic sea conditions from one response", async () => {
  const { nodes, documentRef: seaRef } = seaDocument();
  const status = { textContent: "" };
  const context = { textContent: "" };
  const locations = { replaceChildren() {}, append() {} };
  const detail = { replaceChildren() {} };
  const root = {
    hidden: true,
    classList: { add() {}, remove() {} },
    querySelector(selector) {
      return ({ ".marine-module__status": status, ".marine-module__context": context,
        "#marineLocations": locations, "#marineLocationDetail": detail })[selector] || null;
    }
  };
  const teaserContext = { textContent: "" };
  const teaser = {
    hidden: true,
    querySelector: selector => selector === ".marine-cta__label" ? teaserContext : null
  };
  const documentRef = {
    ...seaRef,
    querySelector: selector => ({ "#marineTeaser": teaser, "#marine-recommendations": root })[selector] || null
  };
  let fetches = 0;

  await marine.refreshMarineRecommendations({
    documentRef,
    fetchImpl: async () => { fetches += 1; return Response.json(SEA_PAYLOAD); },
    now: new Date("2026-08-26T12:00:00.000Z")
  });

  assert.equal(fetches, 1);
  assert.equal(status.textContent, "Onde está melhor o mar?");
  assert.equal(nodes.seaWaveHeight.textContent, "0,6 m");
  assert.equal(nodes.seaCombinedWaveHeight.textContent, "1,4 m");
  assert.equal(nodes.seaWaveDirection.textContent, "E");
});

test("browser no longer fetches Open-Meteo separately for classic sea conditions", () => {
  assert.match(html, /Condições do Mar/);
  assert.match(html, /id="seaCombinedWaveHeight"/);
  assert.doesNotMatch(html, /marine-api\.open-meteo\.com/);
  assert.doesNotMatch(html, /updateSeaState/);
});

test("marine teaser activates forecast before scrolling to the stable anchor", async () => {
  const events = [];
  const target = { scrollIntoView: options => events.push(["scroll", options]) };
  const windowRef = {
    location: { search: "", hash: "" },
    history: { pushState: (_state, _title, url) => events.push(["history", url]) },
    setSection: section => events.push(["section", section]),
    requestAnimationFrame: callback => { events.push(["frame"]); callback(); }
  };
  const documentRef = { getElementById: id => id === "marine-recommendations" ? target : null };

  const activated = await activateMarineRecommendationsAnchor({ windowRef, documentRef, updateHistory: true });

  assert.equal(activated, true);
  assert.deepEqual(events, [
    ["history", "?section=forecast#marine-recommendations"],
    ["section", "forecast"],
    ["frame"],
    ["scroll", { behavior: "smooth", block: "start" }]
  ]);
});

test("marine camera links activate Cameras before scrolling to the rendered target", () => {
  assert.equal(typeof marine.marineCameraHref, "function");
  assert.equal(typeof marine.activateCameraDeepLink, "function");
  assert.equal(
    marine.marineCameraHref("slourenco-sul"),
    "?section=cameras&camera=slourenco-sul#camera-slourenco-sul"
  );
  const events = [];
  let frameCallback;
  const camera = { id: "slourenco-sul" };
  const target = {
    _cam: camera,
    scrollIntoView: options => events.push(["scroll", options])
  };
  const windowRef = {
    location: { pathname: "/", search: "?section=cameras&camera=slourenco-sul", hash: "#camera-slourenco-sul" },
    history: { replaceState: (_state, _title, url) => events.push(["replace", url]) },
    setSection: section => events.push(["section", section]),
    requestAnimationFrame: callback => { frameCallback = callback; events.push(["frame"]); },
    openCameraFullscreen: value => events.push(["fullscreen", value])
  };
  const documentRef = { getElementById: id => id === "camera-slourenco-sul" ? target : null };

  assert.equal(marine.activateCameraDeepLink({ windowRef, documentRef }), true);
  assert.deepEqual(events, [["section", "cameras"], ["frame"]]);
  frameCallback();
  assert.deepEqual(events, [
    ["section", "cameras"],
    ["frame"],
    ["scroll", { behavior: "smooth", block: "start" }],
    ["fullscreen", camera]
  ]);
});

test("Marine camera IDs are canonical catalog IDs for all four locations", async () => {
  const context = { window: {} };
  vm.runInNewContext(await readFile(new URL("../cameras.public.js", import.meta.url), "utf8"), context);
  const catalogIds = new Set(context.window.LVSM_CAMERAS.map(item => item.id));
  assert.deepEqual(
    INITIAL_PROFILES.map(({ id, cameraId }) => ({ id, cameraId })),
    [
      { id: "sao-lourenco", cameraId: "slourenco-sul" },
      { id: "maia", cameraId: "maia-norte" },
      { id: "praia-formosa", cameraId: "praia-poente" },
      { id: "anjos", cameraId: "anjos-porto" }
    ]
  );
  for (const { cameraId } of INITIAL_PROFILES) assert.equal(catalogIds.has(cameraId), true, cameraId);
});

test("Ver câmara opens fullscreen on mobile instead of using the card tap behavior", () => {
  const camera = { id: "maia-norte" };
  const opened = [];
  const windowRef = {
    location: { pathname: "/", search: "?section=cameras&camera=maia-norte", hash: "#camera-maia-norte" },
    history: { replaceState() {} },
    matchMedia: () => ({ matches: true }),
    setSection() {},
    requestAnimationFrame: callback => callback(),
    openCameraFullscreen: value => opened.push(value)
  };
  const documentRef = {
    getElementById: () => ({ _cam: camera, scrollIntoView() {} })
  };

  marine.activateCameraDeepLink({ windowRef, documentRef });

  assert.deepEqual(opened, [camera]);
});

test("an unknown marine camera stays in Cameras and removes only the broken hash", () => {
  assert.equal(typeof marine.activateCameraDeepLink, "function");
  const events = [];
  const windowRef = {
    location: { pathname: "/", search: "?section=cameras&camera=missing", hash: "#camera-missing" },
    history: { replaceState: (_state, _title, url) => events.push(["replace", url]) },
    setSection: section => events.push(["section", section]),
    requestAnimationFrame: callback => callback(),
    openCameraFullscreen: value => events.push(["fullscreen", value])
  };
  const documentRef = { getElementById: () => null };

  assert.doesNotThrow(() => marine.activateCameraDeepLink({ windowRef, documentRef }));
  assert.deepEqual(events, [
    ["section", "cameras"],
    ["replace", "/?section=cameras&camera=missing"]
  ]);
});

test("Marine deep links reuse the fullscreen maintenance guard", () => {
  const start = html.indexOf("function openCameraFullscreen(cam)");
  const end = html.indexOf("\nfunction closeFullscreenCamera", start);
  const openCameraFullscreen = html.slice(start, end);
  assert.match(openCameraFullscreen, /if \(getOperationalState\(cam\) === "maintenance"\) return;\s*trackCameraView\(cam\.id\)/);
  assert.doesNotMatch(openCameraFullscreen, /cameraId|URLSearchParams|location\.hash/);
});

test("camera query routing and card offset remain on the Cameras section", () => {
  assert.match(html, /if \(cameraId\) \{\s*setSection\("cameras"\);/);
  assert.match(html, /\.camera-card\s*\{[\s\S]*?scroll-margin-top:/);
});

test("normal-user module never renders numeric score or internal jargon", async () => {
  const source = await readFile(new URL("../assets/marine-recommendations.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /location\.score\b/);
  assert.doesNotMatch(source, /\bhard cap\b|\bonshore\b|\bcross-shore\b/i);
  assert.match(source, /Ver câmara/);
  assert.match(source, /Recomendações temporariamente indisponíveis\./);
  assert.doesNotMatch(source, /Ã|Â|â†|â€|â™/);
});

test("Pages configuration binds Marine to the LAB Control Worker without an Access URL", async () => {
  const wrangler = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const route = await readFile(new URL("../functions/api/marine-recommendations.js", import.meta.url), "utf8");
  assert.match(wrangler, /"binding"\s*:\s*"MARINE_CONTROL"/);
  assert.match(wrangler, /"service"\s*:\s*"livesantamaria-control-api"/);
  assert.doesNotMatch(wrangler, /MARINE_CONFIG_URL|api-lab-control\.livesantamaria\.org/);
  assert.match(route, /env\?\.MARINE_CONTROL/);
  assert.match(route, /env\?\.MARINE_CACHE/);
  assert.match(wrangler, /"binding"\s*:\s*"MARINE_CACHE"/);
  assert.doesNotMatch(route, /MARINE_CONFIG_URL/);
});
