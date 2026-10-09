import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../index.html", import.meta.url), "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} missing`);
  const openingBrace = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  assert.fail(`${name} does not terminate`);
}

test("TV selection intersects the allowlist with live cameras and keeps editorial order", () => {
  const context = {
    liveCameras: [
      { id: "praia-poente", publicOrder: 9 },
      { id: "not-authorized", publicOrder: 1 },
      { id: "anjos-porto", publicOrder: 2 },
      { id: "slourenco-sul", publicOrder: 5 },
      { id: "maia-norte", publicOrder: 6 }
    ],
    comparePublicCameras: (left, right) => left.publicOrder - right.publicOrder
  };

  vm.runInNewContext([
    'const TV_CAMERA_IDS = new Set(["praia-poente", "praia-castelo", "slourenco-sul", "maia-norte", "anjos-porto"]);',
    extractFunction("getTvCameras"),
    "result = getTvCameras();"
  ].join("\n"), context);

  assert.deepEqual(
    Array.from(context.result, camera => camera.id),
    ["anjos-porto", "slourenco-sul", "maia-norte", "praia-poente"]
  );
  assert.equal(context.result.some(camera => camera.id === "praia-castelo"), false);
});

function runInitialParams(search) {
  const starts = [];
  const sections = [];
  const context = {
    URLSearchParams,
    window: { location: { search } },
    startTvMode(options) { starts.push(options); },
    setSection(section) { sections.push(section); }
  };

  vm.runInNewContext(`${extractFunction("applyInitialUrlParams")}; applyInitialUrlParams();`, context);
  return { starts, sections };
}

test("tv=1 auto-starts signage directly without changing sections", () => {
  const result = runInitialParams("?tv=1&section=forecast");

  assert.deepEqual(JSON.parse(JSON.stringify(result.starts)), [{ signage: true }]);
  assert.deepEqual(result.sections, []);
});

test("a normal URL does not auto-start TV and preserves existing section routing", () => {
  const result = runInitialParams("?section=forecast");

  assert.deepEqual(result.starts, []);
  assert.deepEqual(result.sections, ["forecast"]);
});

function createClassList() {
  const values = new Set();
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); }
  };
}

function loadTvController({ tvCameras = [{ id: "tv-a" }, { id: "tv-b" }] } = {}) {
  const elements = {
    tvMode: { classList: createClassList() },
    tvStage: { innerHTML: "" },
    tvCloseButton: { hidden: false }
  };
  const intervals = [];
  const timeouts = [];
  const cleared = [];
  const rendered = [];
  const destroyed = [];
  let nextTimerId = 1;
  const context = {
    document: {
      fullscreenElement: null,
      getElementById(id) { return elements[id]; },
      exitFullscreen() { throw new Error("must not exit fullscreen in these tests"); }
    },
    liveCameras: [{ id: "normal-a" }, { id: "normal-b" }],
    getTvCameras() { return tvCameras; },
    renderTvCamera(camera, options) { rendered.push({ camera, options }); },
    destroyMediaInstance(name) { destroyed.push(name); },
    setInterval(callback, delay) {
      const timer = { id: nextTimerId++, callback, delay, kind: "interval" };
      intervals.push(timer);
      return timer.id;
    },
    setTimeout(callback, delay) {
      const timer = { id: nextTimerId++, callback, delay, kind: "timeout" };
      timeouts.push(timer);
      return timer.id;
    },
    clearInterval(id) { cleared.push(id); },
    clearTimeout(id) { cleared.push(id); }
  };

  vm.runInNewContext([
    "const NORMAL_SLIDESHOW_DURATION_MS = 22000;",
    "const SIGNAGE_SLIDESHOW_DURATION_MS = 20000;",
    "const SIGNAGE_STARTUP_TIMEOUT_MS = 8000;",
    "const SIGNAGE_FAILURE_DELAY_MS = 1000;",
    "let tvIndex = 0; let tvTimer = null; let tvStartupTimer = null; let tvFailureTimer = null; let tvSignageMode = false; let tvRenderGeneration = 0;",
    extractFunction("clearTvTimers"),
    extractFunction("renderCurrentSignageCamera"),
    extractFunction("scheduleSignageFailure"),
    extractFunction("startTvMode"),
    extractFunction("stopTvMode"),
    "result = { startTvMode, stopTvMode, getSignage: () => tvSignageMode };"
  ].join("\n"), context);

  return { context, elements, intervals, timeouts, cleared, rendered, destroyed };
}

test("normal slideshow keeps its 22 second interval and visible close button", () => {
  const runtime = loadTvController();

  runtime.context.result.startTvMode();

  assert.equal(runtime.rendered[0].camera.id, "normal-a");
  assert.equal(runtime.intervals[0].delay, 22000);
  assert.equal(runtime.elements.tvCloseButton.hidden, false);
  assert.equal(runtime.context.result.getSignage(), false);
});

test("signage uses its allowlisted cameras, 20 second duration, and startup timeout", () => {
  const runtime = loadTvController();

  runtime.context.result.startTvMode({ signage: true });

  assert.equal(runtime.rendered[0].camera.id, "tv-a");
  assert.equal(runtime.rendered[0].options.signage, true);
  assert.equal(runtime.elements.tvCloseButton.hidden, true);
  assert.equal(runtime.context.result.getSignage(), true);
  assert.deepEqual(runtime.timeouts.map(timer => timer.delay), [8000, 20000]);
  assert.equal(runtime.intervals.length, 0);
});

test("a signage failure destroys media and advances after the anti-loop delay", () => {
  const runtime = loadTvController();
  runtime.context.result.startTvMode({ signage: true });

  runtime.rendered[0].options.onFatalError();

  assert.deepEqual(runtime.destroyed, ["tv"]);
  const failureTimer = runtime.timeouts.find(timer => timer.delay === 1000);
  assert.ok(failureTimer);
  failureTimer.callback();
  assert.equal(runtime.rendered[1].camera.id, "tv-b");
});

test("callbacks from the previous signage camera cannot affect the current camera", () => {
  const runtime = loadTvController();
  runtime.context.result.startTvMode({ signage: true });
  const staleCallbacks = runtime.rendered[0].options;
  const rotationTimer = runtime.timeouts.find(timer => timer.delay === 20000);

  rotationTimer.callback();
  const currentStartupTimer = runtime.timeouts.at(-2);
  const destroyedBeforeStaleCallbacks = runtime.destroyed.length;

  staleCallbacks.onPlaybackStarted();
  staleCallbacks.onFatalError();

  assert.equal(runtime.cleared.includes(currentStartupTimer.id), false);
  assert.equal(runtime.destroyed.length, destroyedBeforeStaleCallbacks);
  assert.equal(runtime.rendered.length, 2);
  assert.equal(runtime.timeouts.filter(timer => timer.delay === 1000).length, 0);
  assert.equal(runtime.rendered[1].camera.id, "tv-b");
});

test("callbacks from before stop and restart cannot affect the restarted signage", () => {
  const runtime = loadTvController();
  runtime.context.result.startTvMode({ signage: true });
  const staleCallbacks = runtime.rendered[0].options;

  runtime.context.result.stopTvMode();
  runtime.context.result.startTvMode({ signage: true });
  const currentStartupTimer = runtime.timeouts.at(-2);
  const destroyedBeforeStaleCallbacks = runtime.destroyed.length;

  staleCallbacks.onPlaybackStarted();
  staleCallbacks.onFatalError();

  assert.equal(runtime.cleared.includes(currentStartupTimer.id), false);
  assert.equal(runtime.destroyed.length, destroyedBeforeStaleCallbacks);
  assert.equal(runtime.rendered.length, 2);
  assert.equal(runtime.timeouts.filter(timer => timer.delay === 1000).length, 0);
  assert.equal(runtime.context.result.getSignage(), true);
});

test("an empty TV list is safe and starts no timer", () => {
  const runtime = loadTvController({ tvCameras: [] });

  runtime.context.result.startTvMode({ signage: true });

  assert.equal(runtime.elements.tvMode.classList.contains("show"), false);
  assert.equal(runtime.rendered.length, 0);
  assert.equal(runtime.intervals.length, 0);
  assert.equal(runtime.timeouts.length, 0);
});

function loadMediaAttachment() {
  const hlsInstances = [];
  class FakeHls {
    static Events = { MANIFEST_PARSED: "manifest", ERROR: "error" };
    static isSupported() { return true; }
    constructor() {
      this.handlers = new Map();
      hlsInstances.push(this);
    }
    loadSource(url) { this.url = url; }
    attachMedia(media) { this.media = media; }
    on(event, handler) { this.handlers.set(event, handler); }
  }
  const context = {
    window: { Hls: FakeHls },
    Hls: FakeHls,
    tvHls: null,
    fullscreenHls: null,
    getOperationalState() { return "public"; },
    getCameraPresentation() { return { allowStream: true }; },
    applyDigitalZoom() {},
    getOfflineImage() { return "fallback.jpg"; },
    getEditorialPreview() { return "preview.jpg"; },
    addCacheBuster(url) { return `${url}?cache`; }
  };

  vm.runInNewContext(`${extractFunction("attachMediaToElement")}; result = attachMediaToElement;`, context);
  return { attach: context.result, hlsInstances };
}

function fakeVideo({ nativeHls = false } = {}) {
  const listeners = new Map();
  return {
    tagName: "VIDEO",
    controls: true,
    canPlayType() { return nativeHls ? "probably" : ""; },
    play() { return Promise.resolve(); },
    addEventListener(event, listener) { listeners.set(event, listener); },
    dispatch(event) { listeners.get(event)?.(); }
  };
}

test("signage video is unattended and reports playback plus fatal HLS errors", () => {
  const { attach, hlsInstances } = loadMediaAttachment();
  const media = fakeVideo();
  let started = 0;
  let failed = 0;

  attach(media, { type: "hls", url: "https://camera.test/live.m3u8" }, "tv", {
    signage: true,
    onPlaybackStarted() { started += 1; },
    onFatalError() { failed += 1; }
  });

  assert.equal(media.autoplay, true);
  assert.equal(media.muted, true);
  assert.equal(media.playsInline, true);
  assert.equal(media.controls, false);
  media.dispatch("playing");
  assert.equal(started, 1);
  hlsInstances[0].handlers.get("error")(null, { fatal: false });
  assert.equal(failed, 0);
  hlsInstances[0].handlers.get("error")(null, { fatal: true });
  assert.equal(failed, 1);
});

test("normal slideshow retains native video controls", () => {
  const { attach } = loadMediaAttachment();
  const media = fakeVideo({ nativeHls: true });

  attach(media, { type: "hls", url: "https://camera.test/live.m3u8" }, "tv");

  assert.equal(media.controls, true);
});

function runTvExitHandlers({ signage, action }) {
  const calls = [];
  const context = {
    tvSignageMode: signage,
    stopTvMode() { calls.push("stop-tv"); },
    closeFullscreenCamera() { calls.push("close-camera"); }
  };

  vm.runInNewContext([
    extractFunction("handleTvClose"),
    extractFunction("handleGlobalEscape"),
    action === "close"
      ? "handleTvClose();"
      : 'handleGlobalEscape({ key: "Escape" });'
  ].join("\n"), context);
  return calls;
}

test("close and Escape cannot stop signage", () => {
  assert.deepEqual(runTvExitHandlers({ signage: true, action: "close" }), []);
  assert.deepEqual(
    runTvExitHandlers({ signage: true, action: "escape" }),
    ["close-camera"]
  );
});

test("close and Escape retain normal slideshow behavior", () => {
  assert.deepEqual(
    runTvExitHandlers({ signage: false, action: "close" }),
    ["stop-tv"]
  );
  assert.deepEqual(
    runTvExitHandlers({ signage: false, action: "escape" }),
    ["stop-tv", "close-camera"]
  );
});
