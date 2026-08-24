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

function createCardPartnerFactory() {
  const factory = new Function(`
    ${extractFunction("escapeHtml")}
    ${extractFunction("safeHttpsUrl")}
    ${extractFunction("safeAttributionLogoUrl")}
    ${extractFunction("selectCameraCardPartner")}
    ${extractFunction("renderCameraCardPartnerLogo")}
    return {
      select: selectCameraCardPartner,
      render: renderCameraCardPartnerLogo
    };
  `);
  return factory();
}

test("card partner selection prefers the only valid logo and Sponsor when both are valid", () => {
  const { select, render } = createCardPartnerFactory();
  const sponsor = { name: "Sponsor", logo: "./assets/sponsors/sponsor.png" };
  const support = { name: "Apoio", logo: "./assets/sponsors/support.png" };

  assert.equal(select({ sponsor, support: null }), sponsor);
  assert.equal(select({ sponsor: { name: "Sem logo" }, support }), support);
  assert.equal(select({ sponsor, support }), sponsor);
  assert.equal(select({ sponsor: null, support: null }), null);
  assert.equal(render({ sponsor: null, support: null }), "");

  const sponsorMarkup = render({ sponsor, support });
  assert.match(sponsorMarkup, /^\s*<img /);
  assert.match(sponsorMarkup, /class="camera-partner-logo"/);
  assert.match(sponsorMarkup, /src="\.\/assets\/sponsors\/sponsor\.png"/);
  assert.match(sponsorMarkup, /alt="Sponsor"/);
  assert.doesNotMatch(sponsorMarkup, /<div|<span|<strong|<a|support\.png|>Apoio</);

  const supportMarkup = render({
    sponsor: { name: "Sem logo" },
    support
  });
  assert.match(supportMarkup, /alt="Apoio"/);
  assert.match(supportMarkup, /support\.png/);
});

test("camera card keeps partner text left and renders only the selected logo right", () => {
  const createCard = extractFunction("createCameraCard");
  assert.match(
    createCard,
    /renderCameraAttribution\(\s*cam\.sponsor,[^]*?showLogo:\s*false/
  );
  assert.match(
    createCard,
    /renderCameraAttribution\(\s*cam\.support,[^]*?showLogo:\s*false/
  );
  assert.match(createCard, /renderCameraCardPartnerLogo\(cam\)/);

  const logoRule = source.match(/\.camera-partner-logo\s*\{([^}]*)\}/);
  assert.ok(logoRule, "camera partner logo rule missing");
  for (const expected of [
    /position:\s*absolute/,
    /width:\s*auto/,
    /height:\s*auto/,
    /max-width:/,
    /max-height:/,
    /object-fit:\s*contain/
  ]) {
    assert.match(logoRule[1], expected);
  }
  assert.doesNotMatch(logoRule[1], /padding/);

  assert.doesNotMatch(source, /\.camera-card img\s*\{/);
  assert.match(
    source,
    /\.camera-card img:not\(\.camera-partner-logo\)\s*\{/
  );
  assert.doesNotMatch(source, /compact-mobile[^\{]*\simg\s*\{/g);
  assert.match(
    source,
    /compact-mobile[^\{]*\simg:not\(\.camera-partner-logo\)\s*\{/
  );
  assert.match(logoRule[1], /transform:\s*none/);
  assert.match(logoRule[1], /background:\s*transparent/);
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

test("public data contains only the current approved Support attribution", () => {
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
    "maia-norte"
  ]);
  assert.equal(byId["anjos-blues"].sponsor.name, "Rui Chaves");
  assert.equal(byId["anjos-blues"].support.name, "Escravos da Cadeinha");
  assert.equal(byId["maia-norte"].message, null);
  assert.equal(byId["maia-norte"].support.name, "Carlos Andrade");
  assert.equal(byId["malbusca-sunset"].support, null);
  assert.equal(byId["slourenco-norte"].sponsor.name, "SpotAzores");
  assert.equal(byId["praia-nascente"].sponsor.name, "SpotAzores");
});
