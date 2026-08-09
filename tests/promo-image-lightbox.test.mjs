import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} not found in index.html`);
  const openingParenthesis = source.indexOf("(", start);
  let parenthesisDepth = 0;
  let openingBrace = -1;

  for (let index = openingParenthesis; index < source.length; index += 1) {
    if (source[index] === "(") parenthesisDepth += 1;
    if (source[index] === ")") parenthesisDepth -= 1;
    if (parenthesisDepth === 0) {
      openingBrace = source.indexOf("{", index);
      break;
    }
  }

  assert.notEqual(openingBrace, -1, `function ${name} body not found in index.html`);
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
    this.parentElement = null;
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
    if (name === "class") {
      String(value).split(/\s+/).filter(Boolean)
        .forEach(className => this.classList.values.add(className));
    }
    if (name === "href" && this.tagName === "A") this.tabIndex = 0;
    if (name === "tabindex") this.tabIndex = Number(value);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type, event = {}) {
    let defaultPrevented = false;
    const suppliedPreventDefault = event.preventDefault;
    const dispatchedEvent = {
      target: this,
      ...event,
      preventDefault() {
        defaultPrevented = true;
        suppliedPreventDefault?.();
      }
    };
    this.listeners.get(type)?.(dispatchedEvent);

    const isNativeButtonActivation = this.tagName === "BUTTON" && (
      (type === "keydown" && event.key === "Enter") ||
      (type === "keyup" && event.key === " ")
    );
    if (isNativeButtonActivation && !defaultPrevented) {
      this.dispatch("click");
    }
  }

  replaceChildren(...children) {
    this.children = children;
  }

  focus() {
    if (this.tabIndex >= 0) this.document.activeElement = this;
  }

  closest(selector) {
    const selectors = selector.split(",").map(value => value.trim());
    for (let element = this; element; element = element.parentElement) {
      if (selectors.some(value => (
        value.startsWith(".")
          ? element.classList.values.has(value.slice(1))
          : element.tagName === value.toUpperCase()
      ))) return element;
    }
    return null;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.liveMedia = value.includes('class="live-media"')
      ? { complete: true, naturalWidth: 640 }
      : null;
    this.children = [];

    for (const match of value.matchAll(/<(button|a)\b([^>]*)>/gi)) {
      const element = new ElementDouble(this.document, match[1]);
      for (const attribute of match[2].matchAll(/([:\w-]+)(?:="([^"]*)")?/g)) {
        element.setAttribute(attribute[1], attribute[2] ?? "");
      }
      element.parentElement = this;
      this.children.push(element);
    }
  }

  get innerHTML() {
    return this._innerHTML ?? "";
  }

  querySelector(selector) {
    if (selector === ".live-media") return this.liveMedia;
    return this.children.find(element => (
      selector.startsWith(".")
        ? element.classList.values.has(selector.slice(1))
        : element.tagName === selector.toUpperCase()
    )) ?? null;
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
    URL,
    expandedMobileCards: new Set(),
    getCameraPresentation() {
      return { allowStream: false, badge: "live", badgeDot: true, useFallback: false };
    },
    getPreview(cam) { return cam.preview; },
    getEditorialPreview(cam) { return cam.preview; },
    escapeHtml(value) { return String(value ?? ""); },
    needsSponsor() { return false; },
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
    extractFunction(html, "safeHttpsUrl"),
    extractFunction(html, "safeAttributionLogoUrl"),
    extractFunction(html, "renderCameraAttribution"),
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
  assert.match(imageRule, /max-width:\s*min\(100%,\s*760px\)/);
  assert.match(imageRule, /max-height:\s*min\(100%,\s*760px\)/);
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

test("promo card keeps the complete QR image visible without cover zoom", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const promoImageRule = extractCssRule(
    html,
    '.camera-card[data-type="promo"] .live-media'
  );

  assert.match(promoImageRule, /object-fit:\s*contain/);
  assert.match(promoImageRule, /transform:\s*none/);
});

test("opens only loaded image promos and restores the originating activation on every close path", async () => {
  const { document, lightbox, stage, close, openPromoImageLightbox } = await loadLightbox();
  const card = new ElementDouble(document, "ARTICLE");
  const activation = new ElementDouble(document, "BUTTON");
  const preview = { complete: true, naturalWidth: 640 };
  card.querySelector = selector => (
    selector === ".live-media" ? preview :
      selector === ".promo-card-activation" ? activation : null
  );
  const cam = { name: "Cultura em Movimento", preview: "/promo.jpg" };

  openPromoImageLightbox(cam, card);
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
    assert.equal(document.activeElement, activation);
    openPromoImageLightbox(cam, card);
  }

  const unloaded = new ElementDouble(document, "ARTICLE");
  unloaded.querySelector = selector => (
    selector === ".live-media" ? { complete: false, naturalWidth: 640 } : activation
  );
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

test("compact Promo attribution stays pointer-operable above the activation control", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");

  assert.match(extractCssRule(html, ".camera-info"), /z-index:\s*3/);
  assert.match(extractCssRule(html, ".promo-card-activation"), /z-index:\s*2/);
  assert.match(
    extractCssRule(html, '.camera-card.compact-mobile[data-type="promo"] .camera-info'),
    /pointer-events:\s*auto/
  );
});

test("Promo cards keep attribution links separate from a native activation button", async () => {
  const { html, document, createCameraCard, openCalls, fullscreenCalls } = await loadPromoCards();
  const promo = {
    id: "ordinary-promo",
    type: "promo",
    name: "Ordinary Promo",
    preview: "/ordinary.jpg",
    url: "https://example.test/promo",
    sponsor: {
      name: "Promo Sponsor",
      url: "https://sponsor.example.test/"
    }
  };
  const card = createCameraCard(promo, 0);
  const activation = card.querySelector(".promo-card-activation");
  const attributionLink = card.querySelector("a");
  let prevented = 0;

  assert.equal(card.getAttribute("role"), null);
  assert.equal(card.tabIndex, -1);
  assert.equal(activation?.tagName, "BUTTON");
  assert.equal(activation?.getAttribute("type"), "button");
  assert.equal(activation?.getAttribute("aria-label"), "Abrir promoção: Ordinary Promo");
  assert.equal(activation?.tabIndex, 0);
  assert.equal(attributionLink?.tagName, "A");
  assert.equal(attributionLink?.tabIndex, 0);
  assert.ok(
    card.innerHTML.indexOf("</button>") < card.innerHTML.indexOf("<a "),
    "the activation button must close before attribution links are rendered"
  );

  card.focus();
  assert.equal(document.activeElement, null);
  activation.focus();
  assert.equal(document.activeElement, activation);
  attributionLink.focus();
  assert.equal(document.activeElement, attributionLink);

  card.dispatch("pointerup", { pointerType: "mouse" });
  card.dispatch("pointerup", { target: activation, pointerType: "mouse" });
  activation.dispatch("click");
  card.dispatch("pointerup", { target: attributionLink, pointerType: "mouse" });
  activation.dispatch("keydown", { key: "Enter", preventDefault() { prevented += 1; } });
  activation.dispatch("keyup", { key: " ", preventDefault() { prevented += 1; } });
  card.dispatch("keydown", { key: "Enter", preventDefault() { prevented += 1; } });
  card.dispatch("keydown", { key: " ", preventDefault() { prevented += 1; } });

  assert.deepEqual(openCalls, [
    ["https://example.test/promo", "_blank", "noopener,noreferrer"],
    ["https://example.test/promo", "_blank", "noopener,noreferrer"],
    ["https://example.test/promo", "_blank", "noopener,noreferrer"],
    ["https://example.test/promo", "_blank", "noopener,noreferrer"]
  ]);
  assert.equal(prevented, 0);

  const activationRule = extractCssRule(html, ".promo-card-activation");
  assert.match(activationRule, /position:\s*absolute/);
  assert.match(activationRule, /inset:\s*0/);
  assert.match(activationRule, /z-index:\s*2/);
  assert.match(
    extractCssRule(html, ".promo-card-activation:focus-visible"),
    /(?:outline|box-shadow):/
  );

  const cameraCard = createCameraCard({
    id: "camera",
    type: "hls",
    name: "Camera",
    preview: "/camera.jpg"
  }, 1);
  assert.equal(cameraCard.getAttribute("role"), null);
  assert.equal(cameraCard.tabIndex, -1);
  assert.equal(cameraCard.querySelector(".promo-card-activation"), null);
  assert.equal(fullscreenCalls.length, 0);
});

test("expand-image Promo native activation opens the lightbox and restores button focus", async () => {
  const { document, lightbox, close, createCameraCard, openCalls } = await loadPromoCards();
  const card = createCameraCard({
    id: "image-promo",
    type: "promo",
    name: "Image Promo",
    preview: "/promo.jpg",
    url: "https://example.test/fallback",
    promoAction: "expand-image"
  }, 0);
  const activation = card.querySelector(".promo-card-activation");

  assert.equal(activation?.getAttribute("aria-label"), "Ampliar imagem promocional: Image Promo");
  activation.focus();
  assert.equal(document.activeElement, activation);
  activation.dispatch("keydown", { key: "Enter" });
  assert.equal(lightbox.hidden, false);
  assert.equal(document.activeElement, close);
  assert.deepEqual(openCalls, []);

  close.dispatch("click");
  assert.equal(lightbox.hidden, true);
  assert.equal(document.activeElement, activation);
});
