import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("a decisão de apresentação acontece antes da seleção e ligação de media", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const resolver = html.indexOf("function getCameraPresentation(cam)");
  const liveCameras = html.indexOf("const liveCameras = PUBLIC_CAMERAS.filter(cam =>");
  const renderCameras = html.indexOf("function renderCameras()");
  const attachMedia = html.indexOf("function attachMediaToElement(media, cam, instanceName)");

  assert.ok(resolver >= 0);
  assert.ok(liveCameras > resolver);
  assert.ok(renderCameras > liveCameras);
  assert.ok(attachMedia > renderCameras);
  assert.match(
    html.slice(renderCameras, attachMedia),
    /if \(!getCameraPresentation\(cam\)\.allowStream\) return;/
  );
});
