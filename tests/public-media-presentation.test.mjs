import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `função ${name} não encontrada em index.html`);

  const openingBrace = source.indexOf("{", start);
  let depth = 0;

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  assert.fail(`função ${name} não termina em index.html`);
}

async function loadPresentation() {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const context = {};

  vm.runInNewContext([
    extractFunction(html, "getOperationalState"),
    extractFunction(html, "getPublicMedia"),
    extractFunction(html, "getCameraPresentation"),
    "result = { getPublicMedia, getCameraPresentation };"
  ].join("\n"), context);

  return context.result;
}

test("a compatibilidade de publicMedia falha fechada e preserva streams legados", async () => {
  const { getPublicMedia, getCameraPresentation } = await loadPresentation();

  assert.equal(getPublicMedia({ operationalState: "future" }), "preview");
  assert.equal(getPublicMedia({ operationalState: "testing" }), "stream");
  assert.equal(getPublicMedia({ operationalState: "testing", publicMedia: "preview" }), "preview");
  assert.equal(getPublicMedia({ operationalState: "testing", publicMedia: "invalid" }), "preview");

  assert.deepEqual(
    JSON.parse(JSON.stringify(getCameraPresentation({ operationalState: "testing", publicMedia: "preview" }))),
    {
      visible: true,
      useFallback: true,
      allowStream: false,
      badge: "future",
      badgeDot: false,
      label: "Em prepara\u00e7\u00e3o"
    }
  );

  for (const camera of [
    { operationalState: "testing", publicMedia: "stream" },
    { operationalState: "testing" }
  ]) {
    const presentation = getCameraPresentation(camera);
    assert.equal(presentation.allowStream, true);
    assert.equal(presentation.badge, "testing");
    assert.equal(presentation.label, "Em testes");
  }
});

test("câmaras publicamente em preview não chegam a construir HLS nem carregar playlists", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const loadHls = extractFunction(html, "loadHls");
  let hlsConstructions = 0;
  let playlistRequests = 0;
  const video = {
    addEventListener() {},
    canPlayType() { return ""; },
    currentTime: 0
  };
  const card = {
    querySelector(selector) {
      return selector === "video" ? video : null;
    }
  };
  const context = {
    window: {
      Hls: class {
        constructor() { hlsConstructions += 1; }
        static isSupported() { return true; }
        loadSource() { playlistRequests += 1; }
      }
    },
    Hls: null,
    setTimeout() {},
    setInterval() { return 1; },
    clearTimeout() {},
    clearInterval() {},
    Date,
    getCameraPresentation() { return { allowStream: false }; },
    setCardChecking() {},
    setCardOffline() {},
    setCardLive() {},
    mediaLooksAlive() { return false; }
  };
  context.Hls = context.window.Hls;

  vm.runInNewContext(`${loadHls}; result = loadHls;`, context);
  context.result(card, {
    operationalState: "testing",
    publicMedia: "preview",
    url: "https://example.test/private.m3u8"
  });

  assert.equal(hlsConstructions, 0);
  assert.equal(playlistRequests, 0);
});

test("todos os pontos de entrada de stream respeitam allowStream", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");

  assert.match(html, /const liveCameras = PUBLIC_CAMERAS\.filter\(cam =>[\s\S]*getCameraPresentation\(cam\)\.allowStream/);
  assert.match(extractFunction(html, "createCameraCard"), /presentation\.allowStream[\s\S]*<video/);
  assert.match(extractFunction(html, "loadHls"), /if \(!getCameraPresentation\(cam\)\.allowStream\) return;/);
  assert.match(extractFunction(html, "attachMediaToElement"), /if \(!presentation\.allowStream\) \{[\s\S]*media\.src = getPreview\(cam\);[\s\S]*return;/);
  assert.match(extractFunction(html, "openCameraFullscreen"), /!presentation\.allowStream[\s\S]*document\.createElement\("img"\)/);
  assert.match(extractFunction(html, "renderTvCamera"), /!getCameraPresentation\(cam\)\.allowStream[\s\S]*document\.createElement\("img"\)/);
  assert.match(extractFunction(html, "showMapPopup"), /openCameraFullscreen\(cam\)/);
});
