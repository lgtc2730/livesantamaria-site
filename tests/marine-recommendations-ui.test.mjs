import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { isBathingSeason, ratingPresentation } from "../assets/marine-recommendations.mjs";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

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
  assert.match(html, /id="marineTeaser"[^>]*hidden/);
  assert.match(html, /id="marineRecommendations"/);
  assert.match(html, /id="marineLocations"/);
  assert.match(html, /id="marineLocationDetail"/);
  assert.match(html, /Indicação baseada na previsão do mar e vento\. Confirme sempre as condições no local\./);
  assert.match(html, /grid-template-columns:\s*repeat\(4,/);
  assert.match(html, /@media[^}]*max-width:\s*680px[\s\S]*?\.marine-locations[^}]*repeat\(2,/);
  assert.match(html, /marine-recommendations\.mjs/);
});

test("normal-user module never renders numeric score or internal jargon", async () => {
  const source = await readFile(new URL("../assets/marine-recommendations.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /location\.score\b/);
  assert.doesNotMatch(source, /\bhard cap\b|\bonshore\b|\bcross-shore\b/i);
  assert.match(source, /Ver câmara/);
  assert.match(source, /Recomendações temporariamente indisponíveis\./);
});

test("Pages configuration binds Marine to the LAB Control Worker without an Access URL", async () => {
  const wrangler = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const route = await readFile(new URL("../functions/api/marine-recommendations.js", import.meta.url), "utf8");
  assert.match(wrangler, /"binding"\s*:\s*"MARINE_CONTROL"/);
  assert.match(wrangler, /"service"\s*:\s*"livesantamaria-control-api"/);
  assert.doesNotMatch(wrangler, /MARINE_CONFIG_URL|api-lab-control\.livesantamaria\.org/);
  assert.match(route, /env\?\.MARINE_CONTROL/);
  assert.doesNotMatch(route, /MARINE_CONFIG_URL/);
});
