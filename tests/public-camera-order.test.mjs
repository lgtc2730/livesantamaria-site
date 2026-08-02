import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} was not found in index.html`);

  const openingBrace = source.indexOf("{", start);
  let depth = 0;

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  assert.fail(`function ${name} does not end in index.html`);
}

async function loadComparator(cameras) {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const declarationsStart = html.indexOf("const PUBLIC_CAMERAS =");
  const declarationsEnd = html.indexOf("const expandedMobileCards", declarationsStart);
  assert.notEqual(declarationsStart, -1);
  assert.notEqual(declarationsEnd, -1);

  const context = {
    window: { LVSM_CAMERAS: cameras }
  };

  vm.runInNewContext([
    extractFunction(html, "getOperationalState"),
    extractFunction(html, "getPublicMedia"),
    extractFunction(html, "getCameraPresentation"),
    extractFunction(html, "comparePublicCameras"),
    extractFunction(html, "getPublicCameraGroup"),
    extractFunction(html, "isValidPublicCameraOrder"),
    html.slice(declarationsStart, declarationsEnd),
    "result = { cameras: PUBLIC_CAMERAS, comparePublicCameras };"
  ].join("\n"), context);

  return context.result;
}

function camera(id, overrides = {}) {
  return {
    id,
    type: "hls",
    url: `https://camera.example/${id}/index.m3u8`,
    publicVisibility: "public",
    ...overrides
  };
}

async function sortedIds(cameras, subset = () => true) {
  const { cameras: publicCameras, comparePublicCameras } = await loadComparator(cameras);
  return publicCameras.filter(subset).sort(comparePublicCameras).map(({ id }) => id);
}

test("orders live cameras before previews and promos", async () => {
  const cameras = [
    camera("promo", { type: "promo" }),
    camera("preview", { publicMedia: "preview", publicOrder: 1 }),
    camera("live", { publicOrder: 1 })
  ];

  assert.deepEqual(
    await sortedIds(cameras),
    ["live", "preview", "promo"]
  );
});

test("uses ascending unique positive safe publicOrder values within each group", async () => {
  const cameras = [
    camera("third", { publicOrder: 3 }),
    camera("first", { publicOrder: 1 }),
    camera("second", { publicOrder: 2 }),
    camera("preview-second", { publicMedia: "preview", publicOrder: 2 }),
    camera("preview-first", { publicMedia: "preview", publicOrder: 1 })
  ];

  assert.deepEqual(
    await sortedIds(cameras),
    ["first", "second", "third", "preview-first", "preview-second"]
  );
});

test("places invalid, absent, and duplicate publicOrder values after valid values in source order", async () => {
  const cameras = [
    camera("invalid-negative", { publicOrder: -1 }),
    camera("valid-third", { publicOrder: 3 }),
    camera("duplicate-first", { publicOrder: 1 }),
    camera("missing"),
    camera("invalid-fraction", { publicOrder: 1.5 }),
    camera("valid-second", { publicOrder: 2 }),
    camera("duplicate-second", { publicOrder: 1 }),
    camera("invalid-unsafe", { publicOrder: Number.MAX_SAFE_INTEGER + 1 })
  ];

  assert.deepEqual(
    await sortedIds(cameras),
    [
      "valid-second",
      "valid-third",
      "invalid-negative",
      "duplicate-first",
      "missing",
      "invalid-fraction",
      "duplicate-second",
      "invalid-unsafe"
    ]
  );
});

test("preserves the same ordering rules when a filtered subset is sorted", async () => {
  const cameras = [
    camera("first-invalid", { publicOrder: 0 }),
    camera("first-valid", { publicOrder: 2 }),
    camera("second-invalid"),
    camera("second-valid", { publicOrder: 1 }),
    camera("third-invalid", { publicOrder: "3" })
  ];

  assert.deepEqual(
    await sortedIds(cameras, cam => cam.id !== "first-invalid"),
    ["second-valid", "first-valid", "second-invalid", "third-invalid"]
  );
});
