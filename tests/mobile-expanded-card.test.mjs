import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("expanded compact mobile cards show only camera media", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const portraitStart = html.indexOf('@media (max-width: 680px) and (orientation: portrait)');
  const portraitEnd = html.indexOf("@media", portraitStart + 1);

  assert.notEqual(portraitStart, -1, "portrait phone breakpoint is missing");
  assert.notEqual(portraitEnd, -1, "portrait phone breakpoint boundary is missing");

  const portraitCss = html.slice(portraitStart, portraitEnd);
  const hiddenOverlayRule = portraitCss.match(
    /\.camera-card\.compact-mobile\.expanded-mobile::after,\s*\.camera-card\.compact-mobile\.expanded-mobile \.status-badge,\s*\.camera-card\.compact-mobile\.expanded-mobile \.camera-info,\s*\.camera-card\.compact-mobile\.expanded-mobile \.camera-partner-logo,\s*\.camera-card\.compact-mobile\.expanded-mobile \.viewer-count\s*\{([^}]*)\}/
  );

  assert.ok(hiddenOverlayRule, "expanded portrait overlay rule is missing");
  assert.match(hiddenOverlayRule[1], /display:\s*none/);

  assert.match(
    html,
    /\.camera-card\.compact-mobile\.expanded-mobile video,[\s\S]*?img:not\(\.camera-partner-logo\)[\s\S]*?height:\s*100%/,
    "camera media must continue to fill the expanded card"
  );
});

test("mobile taps keep toggling the existing expanded state", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const functionStart = html.indexOf("function createCameraCard(");
  const functionEnd = html.indexOf("\nfunction loadSnapshot(", functionStart);

  assert.notEqual(functionStart, -1);
  assert.notEqual(functionEnd, -1);

  const createCameraCard = html.slice(functionStart, functionEnd);
  assert.match(createCameraCard, /card\.classList\.toggle\("expanded-mobile"\)/);
  assert.match(createCameraCard, /expandedMobileCards\.add\(cam\.id\)/);
  assert.match(createCameraCard, /expandedMobileCards\.delete\(cam\.id\)/);
  assert.doesNotMatch(
    createCameraCard.slice(createCameraCard.indexOf('if (window.matchMedia("(max-width: 680px)").matches')),
    /openCameraFullscreen\(cam\)[\s\S]*?return;/
  );
});
