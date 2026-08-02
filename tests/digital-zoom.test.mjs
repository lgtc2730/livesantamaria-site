import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} not found in index.html`);

  const openingBrace = source.indexOf("{", start);
  let depth = 0;

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  assert.fail(`function ${name} does not terminate in index.html`);
}

async function loadZoomHelpers() {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const context = {};

  vm.runInNewContext([
    extractFunction(html, "normalizeDigitalZoom"),
    extractFunction(html, "applyDigitalZoom"),
    "result = { normalizeDigitalZoom, applyDigitalZoom };"
  ].join("\n"), context);

  return context.result;
}

function extractCssRule(source, selector) {
  const start = source.indexOf(selector);
  assert.notEqual(start, -1, `CSS rule ${selector} not found in index.html`);

  const openingBrace = source.indexOf("{", start);
  const closingBrace = source.indexOf("}", openingBrace);
  return source.slice(start, closingBrace + 1);
}

test("normalizes valid asymmetric zoom and clamps safe bounds", async () => {
  const { normalizeDigitalZoom } = await loadZoomHelpers();
  assert.deepEqual(
    JSON.parse(JSON.stringify(normalizeDigitalZoom({ factor: 1.35, x: 70, y: 35 }))),
    { factor: 1.35, x: 70, y: 35 }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(normalizeDigitalZoom({ factor: 0.5, x: -20, y: 140 }))),
    { factor: 1, x: 0, y: 100 }
  );
});

test("rejects absent, incomplete, coerced, and non-finite zoom", async () => {
  const { normalizeDigitalZoom } = await loadZoomHelpers();
  for (const value of [
    undefined, null, [], "zoom", {},
    { factor: 1.2, x: 50 },
    { factor: "1.2", x: 50, y: 50 },
    { factor: NaN, x: 50, y: 50 },
    { factor: Infinity, x: 50, y: 50 }
  ]) assert.equal(normalizeDigitalZoom(value), null);
});

test("applies zoom only to HLS video", async () => {
  const { applyDigitalZoom } = await loadZoomHelpers();
  const zoom = { factor: 1.35, x: 70, y: 35 };
  const video = { tagName: "VIDEO", style: {} };
  assert.equal(applyDigitalZoom(video, { type: "hls", digitalZoom: zoom }), true);
  assert.equal(video.style.transform, "scale(1.35)");
  assert.equal(video.style.transformOrigin, "70% 35%");

  for (const [media, camera] of [
    [{ tagName: "IMG", style: {} }, { type: "hls", digitalZoom: zoom }],
    [{ tagName: "VIDEO", style: {} }, { type: "snapshot", digitalZoom: zoom }],
    [{ tagName: "VIDEO", style: {} }, { type: "hls" }]
  ]) {
    assert.equal(applyDigitalZoom(media, camera), false);
    assert.deepEqual(media.style, {});
  }
});

test("wires zoom to live video paths and clips scaled stages", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const card = extractFunction(html, "createCameraCard");
  const attach = extractFunction(html, "attachMediaToElement");
  const fullscreen = extractFunction(html, "openCameraFullscreen");
  const tv = extractFunction(html, "renderTvCamera");
  const cardRule = extractCssRule(html, ".camera-card {");
  const stageRule = extractCssRule(html, ".tv-stage,");

  assert.match(card, /querySelector\("video"\)[\s\S]*applyDigitalZoom\([^,]+,\s*cam\)/);
  assert.match(attach, /applyDigitalZoom\(media,\s*cam\)/);
  assert.match(fullscreen, /attachMediaToElement\(media,\s*cam,\s*"fullscreen"\)/);
  assert.match(tv, /attachMediaToElement\(media,\s*cam,\s*"tv"\)/);
  assert.match(cardRule, /overflow:\s*hidden/);
  assert.match(stageRule, /overflow:\s*hidden/);
  assert.doesNotMatch(html, /applyDigitalZoom\(fallback/);
});
