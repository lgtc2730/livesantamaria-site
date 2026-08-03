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

class ElementDouble {
  constructor(document, id = "") {
    this.document = document;
    this.id = id;
    this.style = {};
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.hidden = true;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name);
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
    this.document.activeElement = this;
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
    createElement() {
      return new ElementDouble(document);
    },
    addEventListener(type, listener) {
      document.listeners.set(type, listener);
    },
    listeners: new Map()
  };
  const lightbox = new ElementDouble(document, "promoImageLightbox");
  const stage = new ElementDouble(document, "promoImageLightboxStage");
  const close = new ElementDouble(document, "promoImageLightboxClose");
  elements.set(lightbox.id, lightbox);
  elements.set(stage.id, stage);
  elements.set(close.id, close);
  return { document, lightbox, stage, close };
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
  const createCameraCardSource = extractFunction(html, "createCameraCard");

  assert.match(html, /\.promo-image-lightbox[\s\S]*position:\s*fixed/);
  assert.match(html, /\.promo-image-lightbox__image[\s\S]*object-fit:\s*contain/);
  assert.match(html, /id="promoImageLightbox"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.doesNotMatch(extractedOpenFunction, /fullscreen-info|fullscreen-sponsor-logo|Abrir agenda/);
  assert.match(createCameraCardSource, /cam\.promoAction === "expand-image"/);
  assert.match(createCameraCardSource, /openPromoImageLightbox\(cam, card\)/);
  assert.match(createCameraCardSource, /window\.open\(cam\.url, "_blank", "noopener,noreferrer"\)/);
  assert.match(createCameraCardSource, /e\.pointerType === "touch" && pointerMoved/);
});

test("opens only loaded image promos and restores the originating card on every close path", async () => {
  const { document, lightbox, stage, close, openPromoImageLightbox } = await loadLightbox();
  const trigger = new ElementDouble(document);
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

  const unloaded = new ElementDouble(document);
  unloaded.querySelector = () => ({ complete: false, naturalWidth: 640 });
  close.dispatch("click");
  openPromoImageLightbox(cam, unloaded);
  assert.equal(lightbox.hidden, true);
  assert.equal(stage.children.length, 0);
  assert.equal(document.body.style.overflow, "auto");
});

test("backdrop selection leaves the image and close control to their own handlers", async () => {
  const { document, lightbox, stage, close, openPromoImageLightbox } = await loadLightbox();
  const trigger = new ElementDouble(document);
  trigger.querySelector = () => ({ complete: true, naturalWidth: 640 });

  openPromoImageLightbox({ name: "Cultura em Movimento", preview: "/promo.jpg" }, trigger);
  lightbox.dispatch("click", { target: stage.children[0] });
  assert.equal(lightbox.hidden, false);
  lightbox.dispatch("click", { target: close });
  assert.equal(lightbox.hidden, false);
});
