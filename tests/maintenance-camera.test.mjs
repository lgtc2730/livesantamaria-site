import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `função ${name} não encontrada`);
  const openingBrace = source.indexOf("{", start);
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`função ${name} incompleta`);
}

test("manutenção prevalece sobre o runtime e usa imagem estática", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const context = {};
  vm.runInNewContext([
    extractFunction(html, "getOperationalState"),
    extractFunction(html, "getPublicMedia"),
    extractFunction(html, "getCameraPresentation"),
    extractFunction(html, "getPreview"),
    extractFunction(html, "getEditorialPreview"),
    extractFunction(html, "getOfflineImage"),
    extractFunction(html, "getRuntimeBadge"),
    extractFunction(html, "isOffline"),
    extractFunction(html, "getMapPopupStatus"),
    extractFunction(html, "getMapStatus"),
    extractFunction(html, "attachMediaToElement"),
    "result = { getCameraPresentation, getRuntimeBadge, getMapPopupStatus, getMapStatus, attachMediaToElement };"
  ].join("\n"), context);

  const camera = {
    operationalState: "maintenance",
    fallbackImage: "./assets/fallback/maia-norte.jpeg",
    preview: "./assets/previews/maia-norte.jpeg",
    type: "hls"
  };

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.result.getCameraPresentation(camera))),
    {
      visible: true,
      useFallback: true,
      allowStream: false,
      badge: "maintenance",
      badgeDot: false,
      label: "Em manutenção"
    }
  );

  for (const runtimeState of ["checking", "live", "offline"]) {
    const badge = context.result.getRuntimeBadge(camera, runtimeState);
    assert.equal(badge.text, "EM MANUTENÇÃO");
    assert.equal(badge.className, "status-badge maintenance");
    assert.equal(badge.dotOk, false);
  }

  const media = {};
  context.result.attachMediaToElement(media, camera, "fullscreen");
  assert.equal(media.src, "./assets/fallback/maia-norte.jpeg");
  assert.equal(media.autoplay, undefined);
  assert.equal(context.result.getMapPopupStatus({
    ...camera,
    status: "OFFLINE"
  }), "Em manutenção");
  assert.equal(context.result.getMapStatus({
    ...camera,
    status: "OFFLINE"
  }, "offline"), "maintenance");
});

test("o marcador de manutenção conserva um único estilo âmbar", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const rules = [...html.matchAll(/\.map-camera\.maintenance \.map-dot\s*\{([^}]*)\}/g)];

  assert.equal(rules.length, 1);
  assert.match(rules[0][1], /background:\s*#fbbf24/);
  assert.match(rules[0][1], /box-shadow:\s*0 0 14px rgba\(251,191,36,\.7\)/);
});
