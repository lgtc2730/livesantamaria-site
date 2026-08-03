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

  assert.fail(`function ${name} does not terminate`);
}

function extractCssRule(source, selector) {
  const start = source.indexOf(selector);
  assert.notEqual(start, -1, `CSS rule ${selector} not found in index.html`);
  const openingBrace = source.indexOf("{", start);
  const closingBrace = source.indexOf("}", openingBrace);
  return source.slice(openingBrace + 1, closingBrace);
}

class ElementDouble {
  constructor(document, tagName = "DIV", id = "") {
    this.document = document;
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.style = {};
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.hidden = true;
    this.dataset = {};
    this.tabIndex = this.tagName === "BUTTON" ? 0 : -1;
    this.classList = {
      values: new Set(),
      add: (...names) => names.forEach(name => this.classList.values.add(name)),
      contains: name => this.classList.values.has(name),
      toggle: name => {
        if (this.classList.values.has(name)) {
          this.classList.values.delete(name);
          return false;
        }
        this.classList.values.add(name);
        return true;
      }
    };
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type, event = {}) {
    this.listeners.get(type)?.({ target: this, ...event });
  }

  replaceChildren(...children) {
    this.children = children;
  }

  focus() {
    if (this.tabIndex >= 0) this.document.activeElement = this;
  }

  closest() {
    return null;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.liveMedia = value.includes('class="live-media"')
      ? { complete: true, naturalWidth: 640 }
      : null;
  }

  get innerHTML() {
    return this._innerHTML ?? "";
  }

  querySelector(selector) {
    if (selector === ".live-media") return this.liveMedia;
    return null;
  }
}

function createLightboxHarness() {
  const elements = new Map();
  const document = {
    activeElement: null,
    body: { style: { overflow: "auto" } },
    getElementById(id) {
      return elements.get(id) ?? null;
    },
    createElement(tagName) {
      return new ElementDouble(document, tagName);
    },
    addEventListener(type, listener) {
      document.listeners.set(type, listener);
    },
    listeners: new Map()
  };
  const lightbox = new ElementDouble(document, "DIV", "promoImageLightbox");
  const stage = new ElementDouble(document, "DIV", "promoImageLightboxStage");
  const close = new ElementDouble(document, "BUTTON", "promoImageLightboxClose");
  elements.set(lightbox.id, lightbox);
  elements.set(stage.id, stage);
  elements.set(close.id, close);
  return { document, lightbox, stage, close };
}

async function loadPromoCards() {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const harness = createLightboxHarness();
  const openCalls = [];
  const fullscreenCalls = [];
  const optionalActivation = html.includes("function activatePromoCard(")
    ? extractFunction(html, "activatePromoCard")
    : "";
  const context = {
    document: harness.document,
    window: {
      matchMedia() { return { matches: false }; },
      open(...args) { openCalls.push(args); }
    },
    expandedMobileCards: new Set(),
    getCameraPresentation() {
      return { allowStream: false, badge: "live", badgeDot: true, useFallback: false };
    },
    getPreview(cam) { return cam.preview; },
    getEditorialPreview(cam) { return cam.preview; },
    escapeHtml(value) { return String(value ?? ""); },
    needsSponsor() { return false; },
    renderCameraAttribution() { return ""; },
    renderCameraCardPartnerLogo() { return ""; },
    applyDigitalZoom() {},
    isOffline() { return false; },
    openCameraFullscreen(cam) { fullscreenCalls.push(cam); }
  };

  vm.runInNewContext([
    "let promoImageLightboxTrigger = null;",
    "let promoImageLightboxPreviousOverflow = \"\";",
    extractFunction(html, "openPromoImageLightbox"),
    extractFunction(html, "closePromoImageLightbox"),
    extractFunction(html, "setupPromoImageLightboxInteractions"),
    optionalActivation,
    extractFunction(html, "createCameraCard"),
    "setupPromoImageLightboxInteractions();",
    "result = { createCameraCard };"
  ].join("\n"), context);

  return {
    html,
    ...harness,
    createCameraCard: context.result.createCameraCard,
    openCalls,
    fullscreenCalls
  };
}

async function loadLightbox() {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const harness = createLightboxHarness();
  const context = { document: harness.document };

  vm.runInNewContext([
    "let promoImageLightboxTrigger = null;",
    "let promoImageLightboxPreviousOverflow = \"\";",
    extractFunction(html, "openPromoImageLightbox"),
    extractFunction(html, "closePromoImageLightbox"),
    extractFunction(html, "setupPromoImageLightboxInteractions"),
    "setupPromoImageLightboxInteractions();",
    "result = { openPromoImageLightbox, closePromoImageLightbox };"
  ].join("\n"), context);

  return { html, ...harness, ...context.result };
}

test("promo image lightbox has an isolated contained-image dialog", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const extractedOpenFunction = extractFunction(html, "openPromoImageLightbox");
  const activatePromoCardSource = extractFunction(html, "activatePromoCard");
  const createCameraCardSource = extractFunction(html, "createCameraCard");

  assert.match(html, /\.promo-image-lightbox[\s\S]*position:\s*fixed/);
  const imageRule = extractCssRule(html, ".promo-image-lightbox__image");
  assert.match(imageRule, /display:\s*block/);
  assert.match(imageRule, /max-width:\s*100%/);
  assert.match(imageRule, /max-height:\s*100%/);
  assert.match(imageRule, /width:\s*auto/);
  assert.match(imageRule, /height:\s*auto/);
  assert.match(imageRule, /object-fit:\s*contain/);
  assert.doesNotMatch(imageRule, /^\s*width:\s*100%;/m);
  assert.doesNotMatch(imageRule, /^\s*height:\s*100%;/m);
  assert.match(html, /id="promoImageLightbox"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.doesNotMatch(extractedOpenFunction, /fullscreen-info|fullscreen-sponsor-logo|Abrir agenda/);
  assert.match(activatePromoCardSource, /cam\.promoAction === "expand-image"/);
  assert.match(activatePromoCardSource, /openPromoImageLightbox\(cam, card\)/);
  assert.match(activatePromoCardSource, /window\.open\(cam\.url, "_blank", "noopener,noreferrer"\)/);
  assert.match(createCameraCardSource, /activatePromoCard\(cam, card\)/);
  assert.match(createCameraCardSource, /e\.pointerType === "touch" && pointerMoved/);
});

test("opens only loaded image promos and restores the originating card on every close path", async () => {
  const { document, lightbox, stage, close, openPromoImageLightbox } = await loadLightbox();
  const trigger = new ElementDouble(document, "ARTICLE");
  trigger.tabIndex = 0;
  const preview = { complete: true, naturalWidth: 640 };
  trigger.querySelector = selector => selector === ".live-media" ? preview : null;
  const cam = { name: "Cultura em Movimento", preview: "/promo.jpg" };

  openPromoImageLightbox(cam, trigger);
  assert.equal(lightbox.hidden, false);
  assert.equal(document.body.style.overflow, "hidden");
  assert.equal(document.activeElement, close);
  assert.equal(stage.children.length, 1);
  assert.equal(stage.children[0].src, "/promo.jpg");

  for (const closeLightbox of [
    () => close.dispatch("click"),
    () => lightbox.dispatch("click", { target: stage }),
    () => document.listeners.get("keydown")({ key: "Escape" }),
    () => stage.children[0].dispatch("error")
  ]) {
    closeLightbox();
    assert.equal(lightbox.hidden, true);
    assert.equal(stage.children.length, 0);
    assert.equal(document.body.style.overflow, "auto");
    assert.equal(document.activeElement, trigger);
    openPromoImageLightbox(cam, trigger);
  }

  const unloaded = new ElementDouble(document, "ARTICLE");
  unloaded.tabIndex = 0;
  unloaded.querySelector = () => ({ complete: false, naturalWidth: 640 });
  close.dispatch("click");
  openPromoImageLightbox(cam, unloaded);
  assert.equal(lightbox.hidden, true);
  assert.equal(stage.children.length, 0);
  assert.equal(document.body.style.overflow, "auto");
});

test("backdrop selection leaves the image and close control to their own handlers", async () => {
  const { document, lightbox, stage, close, openPromoImageLightbox } = await loadLightbox();
  const trigger = new ElementDouble(document, "ARTICLE");
  trigger.tabIndex = 0;
  trigger.querySelector = () => ({ complete: true, naturalWidth: 640 });

  openPromoImageLightbox({ name: "Cultura em Movimento", preview: "/promo.jpg" }, trigger);
  lightbox.dispatch("click", { target: stage.children[0] });
  assert.equal(lightbox.hidden, false);
  lightbox.dispatch("click", { target: close });
  assert.equal(lightbox.hidden, false);
});

test("Promo cards expose button semantics and activate ordinary URLs by pointer, Enter, and Space", async () => {
  const { createCameraCard, openCalls, fullscreenCalls } = await loadPromoCards();
  const promo = {
    id: "ordinary-promo",
    type: "promo",
    name: "Ordinary Promo",
    preview: "/ordinary.jpg",
    url: "https://example.test/promo"
  };
  const card = createCameraCard(promo, 0);
  let prevented = 0;

  assert.equal(card.getAttribute("role"), "button");
  assert.equal(card.tabIndex, 0);
  card.dispatch("pointerup", { pointerType: "mouse" });
  card.dispatch("keydown", { key: "Enter", preventDefault() { prevented += 1; } });
  card.dispatch("keydown", { key: " ", preventDefault() { prevented += 1; } });

  assert.deepEqual(openCalls, [
    ["https://example.test/promo", "_blank", "noopener,noreferrer"],
    ["https://example.test/promo", "_blank", "noopener,noreferrer"],
    ["https://example.test/promo", "_blank", "noopener,noreferrer"]
  ]);
  assert.equal(prevented, 1);

  const cameraCard = createCameraCard({
    id: "camera",
    type: "hls",
    name: "Camera",
    preview: "/camera.jpg"
  }, 1);
  assert.equal(cameraCard.getAttribute("role"), null);
  assert.equal(cameraCard.tabIndex, -1);
  assert.equal(fullscreenCalls.length, 0);
});

test("expand-image Promo keyboard activation opens the lightbox and close restores real card focus", async () => {
  const { document, lightbox, close, createCameraCard, openCalls } = await loadPromoCards();
  const card = createCameraCard({
    id: "image-promo",
    type: "promo",
    name: "Image Promo",
    preview: "/promo.jpg",
    url: "https://example.test/fallback",
    promoAction: "expand-image"
  }, 0);

  card.focus();
  assert.equal(document.activeElement, card);
  card.dispatch("keydown", { key: "Enter", preventDefault() {} });
  assert.equal(lightbox.hidden, false);
  assert.equal(document.activeElement, close);
  assert.deepEqual(openCalls, []);

  close.dispatch("click");
  assert.equal(lightbox.hidden, true);
  assert.equal(document.activeElement, card);
});
