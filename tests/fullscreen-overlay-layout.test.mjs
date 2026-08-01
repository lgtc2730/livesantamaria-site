import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../index.html", import.meta.url),
  "utf8"
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rule(selector) {
  const matches = [...source.matchAll(
    new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`, "g")
  )];
  assert.notEqual(matches.length, 0, `${selector} rule missing`);
  return matches.at(-1)[1];
}

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} missing`);
  const nextFunction = source.indexOf("\nfunction ", start + 1);
  assert.notEqual(nextFunction, -1, `${name} does not terminate`);
  return source.slice(start, nextFunction);
}

test("fullscreen identity and gradient use the top while TV stays at the bottom", () => {
  assert.match(rule(".fullscreen-info"), /top:\s*24px/);
  assert.doesNotMatch(rule(".fullscreen-info"), /bottom:/);
  assert.match(rule(".tv-info"), /bottom:\s*24px/);
  assert.match(rule(".fullscreen-info::before"), /top:\s*0/);
  assert.match(rule(".fullscreen-info::before"), /linear-gradient\(180deg/);
  assert.match(rule(".tv-info::before"), /bottom:\s*0/);
  assert.match(rule(".tv-info::before"), /linear-gradient\(0deg/);
});

test("fullscreen Sponsor logo remains stage-level at the bottom-right", () => {
  const openFullscreen = extractFunction("openCameraFullscreen");
  assert.match(openFullscreen, /fsStage\.appendChild\(logo\)/);
  assert.doesNotMatch(openFullscreen, /info\.appendChild\(logo\)/);
  assert.match(rule(".fullscreen-sponsor-logo"), /bottom:\s*24px/);
  assert.match(rule(".fullscreen-sponsor-logo"), /right:\s*24px/);
});
