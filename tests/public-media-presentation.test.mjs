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

test("the internal camera lifecycle separates technical testing from public exposure", async () => {
  const { getCameraPresentation } = await loadPresentation();
  const teaser = {
    id: "camera-internal",
    type: "hls",
    operationalState: "future",
    publicVisibility: "public",
    publicMedia: "preview",
    preview: "./assets/previews/camera-internal.jpg",
    url: "https://camera.example/cam1/index.m3u8"
  };
  const registered = { ...teaser, operationalState: "testing" };
  const internalPresentation = getCameraPresentation(registered);
  const exposed = { ...registered, publicMedia: "stream" };
  const testPresentation = getCameraPresentation(exposed);
  const published = { ...exposed, operationalState: "public" };

  assert.equal(teaser.publicMedia, "preview");
  assert.equal(registered.operationalState, "testing");
  assert.equal(registered.publicMedia, "preview");
  assert.equal(internalPresentation.allowStream, false);
  assert.equal(exposed.publicMedia, "stream");
  assert.equal(testPresentation.allowStream, true);
  assert.equal(published.operationalState, "public");
  assert.equal(published.publicMedia, "stream");
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
  const card = extractFunction(html, "createCameraCard");
  const loadSnapshot = extractFunction(html, "loadSnapshot");
  const fullscreen = extractFunction(html, "openCameraFullscreen");
  const tv = extractFunction(html, "renderTvCamera");

  assert.match(html, /const liveCameras = PUBLIC_CAMERAS\.filter\(cam =>[\s\S]*getCameraPresentation\(cam\)\.allowStream/);
  assert.match(card, /else if \(!presentation\.allowStream\) \{?[\s\S]*getPreview\(cam\)[\s\S]*\} else if \(cam\.type === "snapshot"\)[\s\S]*\} else \{[\s\S]*<video/);
  assert.ok(
    loadSnapshot.indexOf("if (!getCameraPresentation(cam).allowStream) return;") <
      loadSnapshot.indexOf("addCacheBuster(cam.url)"),
    "loadSnapshot deve retornar antes de resolver a URL da câmara"
  );
  assert.match(extractFunction(html, "loadHls"), /if \(!getCameraPresentation\(cam\)\.allowStream\) return;/);
  assert.match(extractFunction(html, "attachMediaToElement"), /if \(!presentation\.allowStream\) \{[\s\S]*media\.src = getPreview\(cam\);[\s\S]*return;/);
  assert.match(fullscreen, /!presentation\.allowStream[\s\S]*document\.createElement\("img"\)/);
  assert.match(tv, /!presentation\.allowStream[\s\S]*document\.createElement\("img"\)/);
  assert.match(fullscreen, /media\.addEventListener\("error", \(\) => \{\s*if \(presentation\.allowStream && cam\.fallbackImage\)/);
  assert.match(tv, /const presentation = getCameraPresentation\(cam\);[\s\S]*if \(presentation\.allowStream && cam\.fallbackImage\)/);
  assert.match(extractFunction(html, "showMapPopup"), /openCameraFullscreen\(cam\)/);
});

test("erros de fullscreen e TV mantêm o preview editorial de câmaras sem stream", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const stages = {
    fullscreenStage: { children: [], appendChild(child) { this.children.push(child); } },
    tvStage: { children: [], appendChild(child) { this.children.push(child); } }
  };
  const elements = {
    fullscreenMode: { classList: { add() {} } },
    fullscreenStage: stages.fullscreenStage,
    tvStage: stages.tvStage
  };
  const context = {
    document: {
      getElementById(id) { return elements[id]; },
      createElement(tagName) {
        const listeners = {};
        return {
          tagName,
          children: [],
          classList: { add() {} },
          addEventListener(event, listener) { listeners[event] = listener; },
          dispatchError() { listeners.error?.(); },
          appendChild(child) { this.children.push(child); },
          replaceWith(replacement) { this.replacement = replacement; }
        };
      }
    },
    trackCameraView() {},
    destroyMediaInstance() {},
    attachMediaToElement(media, cam) { media.src = cam.preview; },
    escapeHtml(value) { return value; },
    getRegion() { return ""; }
  };

  vm.runInNewContext([
    extractFunction(html, "getOperationalState"),
    extractFunction(html, "getPublicMedia"),
    extractFunction(html, "getCameraPresentation"),
    extractFunction(html, "openCameraFullscreen"),
    extractFunction(html, "renderTvCamera"),
    "result = { openCameraFullscreen, renderTvCamera };"
  ].join("\n"), context);

  const camera = {
    id: "internal-camera",
    name: "Internal camera",
    type: "hls",
    operationalState: "testing",
    publicMedia: "preview",
    preview: "./assets/previews/editorial.jpeg",
    fallbackImage: "./assets/fallback/runtime.jpeg"
  };

  context.result.openCameraFullscreen(camera);
  const fullscreenMedia = stages.fullscreenStage.children[0];
  assert.equal(fullscreenMedia.src, camera.preview);
  fullscreenMedia.dispatchError();
  assert.equal(fullscreenMedia.replacement, undefined);

  context.result.renderTvCamera(camera);
  const tvMedia = stages.tvStage.children[1];
  assert.equal(tvMedia.src, camera.preview);
  tvMedia.dispatchError();
  assert.equal(tvMedia.replacement, undefined);
});
