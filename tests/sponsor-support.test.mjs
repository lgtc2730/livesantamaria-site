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

test("public attribution has valid structure without restricting supported camera IDs", () => {
  const window = {};
  new Function("window", publicDataSource)(window);
  const cameras = window.LVSM_CAMERAS;
  assert.ok(Array.isArray(cameras) && cameras.length > 0);
  assert.equal(new Set(cameras.map(({ id }) => id)).size, cameras.length);
  const { select } = createCardPartnerFactory();
  for (const camera of cameras) {
    assert.equal(typeof camera.id, "string");
    assert.ok(camera.id.trim());
    for (const attribution of [camera.sponsor, camera.support]) {
      if (attribution == null) continue;
      assert.equal(typeof attribution, "object", camera.id);
      assert.equal(typeof attribution.name, "string", camera.id);
      assert.ok(attribution.name.trim(), camera.id);
      if (attribution.url != null) assert.match(attribution.url, /^https:\/\//, camera.id);
      if (attribution.logo != null) {
        assert.equal(select({ support: attribution }), attribution, camera.id);
      }
      if (attribution.label != null) {
        assert.equal(typeof attribution.label, "string", camera.id);
        assert.ok(attribution.label.trim(), camera.id);
      }
    }
  }
});

test("Support rendering preserves association with each synthetic camera", () => {
  const render = new Function(
    extractFunction("escapeHtml") + extractFunction("safeHttpsUrl") +
    extractFunction("safeAttributionLogoUrl") + extractFunction("renderCameraAttribution") +
    "return renderCameraAttribution;"
  )();
  const cameras = [
    { id: "fixture-a", support: { name: "Support A", url: "https://a.example.test/" } },
    { id: "fixture-b", support: { name: "Support B", url: "https://b.example.test/" } },
    { id: "fixture-c", support: null }
  ];
  const rendered = cameras.map((camera) => render(camera.support, { defaultLabel: "Apoio", className: "camera-support" }));
  assert.match(rendered[0], /Support A/);
  assert.match(rendered[0], /https:\/\/a\.example\.test\//);
  assert.doesNotMatch(rendered[0], /Support B/);
  assert.match(rendered[1], /Support B/);
  assert.doesNotMatch(rendered[1], /Support A/);
  assert.equal(rendered[2], "");
});
