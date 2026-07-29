import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../index.html", import.meta.url),
  "utf8"
);
const publicDataSource = await readFile(
  new URL("../cameras.public.js", import.meta.url),
  "utf8"
);

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} missing`);
  const nextFunction = source.indexOf("\nfunction ", start + 1);
  assert.notEqual(nextFunction, -1, `${name} does not terminate`);
  return source.slice(start, nextFunction);
}

test("Site renders Sponsor and Support independently", () => {
  assert.match(source, /renderCameraAttribution\(\s*cam\.sponsor/);
  assert.match(source, /renderCameraAttribution\(\s*cam\.support/);
  assert.match(source, /defaultLabel:\s*"Apoio"/);
  assert.doesNotMatch(source, /cam\.message[^]*Apoio de/);
});

test("camera attribution is optional and safely rendered", () => {
  const factory = new Function(`
    ${extractFunction("escapeHtml")}
    ${extractFunction("safeHttpsUrl")}
    ${extractFunction("safeAttributionLogoUrl")}
    ${extractFunction("renderCameraAttribution")}
    return renderCameraAttribution;
  `);
  const render = factory();

  assert.equal(
    render(null, { defaultLabel: "Apoio", className: "camera-support" }),
    ""
  );

  const nameOnly = render(
    { name: "Carlos Andrade" },
    { defaultLabel: "Apoio", className: "camera-support" }
  );
  assert.match(nameOnly, />Apoio</);
  assert.match(nameOnly, />Carlos Andrade</);

  const linked = render(
    {
      name: "Entidade",
      url: "https://example.test/support",
      logo: "https://example.test/logo.png"
    },
    { defaultLabel: "Apoio", className: "camera-support" }
  );
  assert.match(linked, /href="https:\/\/example\.test\/support"/);
  assert.match(linked, /src="https:\/\/example\.test\/logo\.png"/);

  const hostile = render(
    {
      name: "<img src=x onerror=alert(1)>",
      url: "javascript:alert(1)",
      logo: "data:image/svg+xml,<svg onload=alert(1)>"
    },
    { defaultLabel: "<script>", className: "camera-support bad" }
  );
  assert.doesNotMatch(hostile, /<script>|<img src=x|javascript:|data:image/);
  assert.match(hostile, /&lt;img/);
  assert.doesNotMatch(hostile, /camera-support bad/);

  const traversal = render(
    {
      name: "Traversal",
      logo: "./assets/../../index.html"
    },
    { defaultLabel: "Apoio", className: "camera-support" }
  );
  assert.doesNotMatch(traversal, /<img/);
});

test("public data contains only the approved Support migration", () => {
  const window = {};
  new Function("window", publicDataSource)(window);
  const cameras = window.LVSM_CAMERAS;
  const byId = Object.fromEntries(cameras.map((camera) => [camera.id, camera]));
  const supportIds = cameras
    .filter((camera) => camera.support?.name)
    .map((camera) => camera.id)
    .sort();

  assert.deepEqual(supportIds, [
    "anjos-blues",
    "maia-norte",
    "malbusca-sunset"
  ]);
  assert.equal(byId["anjos-blues"].sponsor.name, "Rui Chaves");
  assert.equal(byId["anjos-blues"].support.name, "Escravos da Cadeinha");
  assert.equal(byId["maia-norte"].message, null);
  assert.equal(byId["maia-norte"].support.name, "Carlos Andrade");
  assert.equal(byId["malbusca-sunset"].message, null);
  assert.equal(byId["malbusca-sunset"].support.name, "Maria Leonardo");
  assert.equal(byId["slourenco-norte"].sponsor.name, "SpotAzores");
  assert.equal(byId["praia-nascente"].sponsor.name, "SpotAzores");
});

test("camera card attribution logos use the compact shared image rule", () => {
  const sharedRule = source.match(
    /\.camera-sponsor-logo,\s*\.camera-support-logo\s*\{([^}]*)\}/
  );

  assert.ok(sharedRule, "shared Sponsor/Apoio logo rule missing");
  assert.match(sharedRule[1], /max-width:\s*110px/);
  assert.match(sharedRule[1], /max-height:\s*24px/);
  assert.match(sharedRule[1], /width:\s*auto/);
  assert.match(sharedRule[1], /height:\s*auto/);
  assert.match(sharedRule[1], /object-fit:\s*contain/);
  assert.doesNotMatch(sharedRule[1], /position:\s*absolute/);
});
