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

function renderCard(html, camera) {
  const article = {
    classList: { add() {}, contains() { return false; } },
    dataset: {},
    addEventListener() {},
    querySelector() { return null; },
    set innerHTML(value) { this.renderedHtml = value; },
    get innerHTML() { return this.renderedHtml; }
  };
  const context = {
    document: { createElement() { return article; } },
    window: { matchMedia() { return { matches: false }; } },
    expandedMobileCards: new Set(),
    escapeHtml(value) { return String(value ?? ""); },
    needsSponsor() { return false; },
    renderCameraAttribution() { return ""; },
    renderCameraCardPartnerLogo() { return ""; },
    applyDigitalZoom() {},
    openCameraFullscreen() {},
    activatePromoCard() {}
  };

  vm.runInNewContext([
    extractFunction(html, "getOperationalState"),
    extractFunction(html, "getPublicMedia"),
    extractFunction(html, "getCameraPresentation"),
    extractFunction(html, "getPreview"),
    extractFunction(html, "getEditorialPreview"),
    extractFunction(html, "getOfflineImage"),
    extractFunction(html, "isOffline"),
    extractFunction(html, "createCameraCard"),
    "result = createCameraCard;"
  ].join("\n"), context);

  return context.result(camera, 0).innerHTML;
}

test("snapshot em manutenção usa fallback sem carregar a origem", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const card = renderCard(html, {
    id: "snapshot-maintenance",
    name: "Snapshot Maintenance",
    type: "snapshot",
    url: "https://camera.example/current.jpg",
    operationalState: "maintenance",
    publicVisibility: "public",
    fallbackImage: "./assets/fallback/snapshot.jpg",
    preview: "./assets/previews/snapshot.jpg"
  });

  assert.match(card, /EM MANUTEN/);
  assert.match(card, /src="\.\/assets\/fallback\/snapshot\.jpg"/);
  assert.doesNotMatch(card, /camera\.example\/current\.jpg/);
  assert.doesNotMatch(card, /class="fallback-media"/);
});

test("snapshot em manutenção usa preview e depois imagem neutra", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const base = {
    id: "snapshot-maintenance",
    name: "Snapshot Maintenance",
    type: "snapshot",
    operationalState: "maintenance",
    publicVisibility: "public",
    fallbackImage: null
  };

  assert.match(
    renderCard(html, { ...base, preview: "./assets/previews/snapshot.jpg" }),
    /src="\.\/assets\/previews\/snapshot\.jpg"/
  );
  assert.match(
    renderCard(html, { ...base, preview: null }),
    /src="\.\/assets\/previews\/lvsm-love-sma\.jpg"/
  );
});

test("HLS em manutenção usa fallback e não cria video", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const card = renderCard(html, {
    id: "hls-maintenance",
    name: "HLS Maintenance",
    type: "hls",
    url: "https://camera.example/live.m3u8",
    operationalState: "maintenance",
    publicVisibility: "public",
    fallbackImage: "./assets/fallback/hls.jpg",
    preview: "./assets/previews/hls.jpg"
  });

  assert.match(card, /src="\.\/assets\/fallback\/hls\.jpg"/);
  assert.doesNotMatch(card, /<video/);
  assert.doesNotMatch(card, /camera\.example\/live\.m3u8/);
});

test("snapshot pública conserva o fluxo live atual", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const card = renderCard(html, {
    id: "snapshot-public",
    name: "Snapshot Public",
    type: "snapshot",
    url: "https://camera.example/current.jpg",
    operationalState: "public",
    publicVisibility: "public",
    fallbackImage: "./assets/fallback/snapshot.jpg",
    preview: null
  });

  assert.match(card, /class="live-media"/);
  assert.match(card, /class="fallback-media"/);
  assert.match(card, /src="\.\/assets\/fallback\/snapshot\.jpg"/);
});

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
