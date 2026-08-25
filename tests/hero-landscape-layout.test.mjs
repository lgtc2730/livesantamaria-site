import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

function compactLandscapeCss() {
  const start = html.indexOf("@media (min-width: 681px) and (max-width: 900px) and (max-height: 520px) and (orientation: landscape)");
  assert.notEqual(start, -1, "breakpoint landscape compacto não encontrado");
  const end = html.indexOf("\n    @media", start + 1);
  return html.slice(start, end === -1 ? undefined : end);
}

test("landscape intermédio contém header e grelha na largura útil da app", () => {
  const css = compactLandscapeCss();

  assert.match(css, /\.nav\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.camera-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(css, /\.camera-card\s*\{[^}]*min-height:\s*unset[^}]*aspect-ratio:\s*16\s*\/\s*11/s);
});

test("landscape intermédio mantém Hero e header nos gutters compactos", () => {
  const css = compactLandscapeCss();

  assert.match(css, /\.app\s*\{[^}]*padding:\s*10px 12px/s);
  assert.match(css, /\.topbar\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(css, /\.hero\s*\{[^}]*min-height:\s*150px/s);
  assert.match(css, /\.hero-live-overlay\s*\{[^}]*display:\s*grid[^}]*padding:\s*14px 14px 14px 58%/s);
});

test("breakpoint landscape é cirúrgico e não substitui desktop ou portrait", () => {
  assert.match(html, /@media \(max-width: 680px\) \{/);
  assert.match(html, /@media \(min-width: 681px\) and \(max-width: 900px\) and \(max-height: 520px\) and \(orientation: landscape\)/);
  assert.match(html.slice(0, html.indexOf("@media")), /\.hero\s*\{[^}]*min-height:\s*clamp\(132px, 11\.8vw, 188px\)/s);
});

test("Hero não apresenta informação de câmaras futuras", () => {
  const heroStart = html.indexOf('<section class="hero"');
  const heroEnd = html.indexOf("</section>", heroStart);
  const hero = html.slice(heroStart, heroEnd);

  assert.doesNotMatch(hero, /futureCount|futuras|em preparação/);
  assert.match(hero, /id="onlineCount"/);
  assert.match(hero, /class="hero-weather"/);
});

test("remoção no Hero não altera filtro nem apresentação das câmaras futuras", () => {
  assert.match(html, /data-filter="future"/);
  assert.match(html, /if \(activeFilter === "future"\) return presentation\.badge === "future"/);
  assert.match(html, /badge:\s*"future"/);
});
