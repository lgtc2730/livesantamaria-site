import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `função ${name} não encontrada em index.html`);

  const openingBrace = source.indexOf("{", start);
  let depth = 0;

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  assert.fail(`função ${name} não termina em index.html`);
}

test("a imagem offline prefere fallback e usa preview quando ainda não existe snapshot", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const context = {};

  vm.runInNewContext(
    [
      extractFunction(html, "getPreview"),
      extractFunction(html, "getOfflineImage"),
      "result = { getPreview, getOfflineImage };"
    ].join("\n"),
    context
  );

  assert.equal(
    context.result.getOfflineImage({
      fallbackImage: null,
      preview: "./assets/previews/maia-sul.jpeg"
    }),
    "./assets/previews/maia-sul.jpeg"
  );

  assert.equal(
    context.result.getOfflineImage({
      fallbackImage: "./assets/fallback/maia-sul.jpeg",
      preview: "./assets/previews/maia-sul.jpeg"
    }),
    "./assets/fallback/maia-sul.jpeg"
  );
});

test("o estado offline ativa a camada com a imagem selecionada", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const setCardOffline = extractFunction(html, "setCardOffline");

  assert.match(setCardOffline, /const offlineImage = getOfflineImage\(cam\);/);
  assert.match(setCardOffline, /fallback\.src = offlineImage;/);
  assert.match(
    setCardOffline,
    /block\.classList\.add\("has-fallback-active"\);/
  );
});

test("câmaras testing mantêm EM TESTE em qualquer estado do player", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  const context = {};

  vm.runInNewContext(
    [
      extractFunction(html, "getOperationalState"),
      extractFunction(html, "getPublicMedia"),
      extractFunction(html, "getCameraPresentation"),
      extractFunction(html, "getRuntimeBadge"),
      "result = { getRuntimeBadge };"
    ].join("\n"),
    context
  );

  for (const runtimeState of ["checking", "live", "offline"]) {
    const badge = context.result.getRuntimeBadge(
      { operationalState: "testing" },
      runtimeState
    );

    assert.equal(badge.text, "EM TESTE");
    assert.equal(badge.className, "status-badge");
    assert.equal(badge.dotOk, runtimeState === "live");
  }

  const publicOffline = context.result.getRuntimeBadge(
    { operationalState: "public" },
    "offline"
  );

  assert.equal(publicOffline.text, "OFFLINE");
  assert.equal(publicOffline.className, "status-badge offline");
  assert.equal(publicOffline.dotOk, false);

  for (const runtimeState of ["checking", "live", "offline"]) {
    const badge = context.result.getRuntimeBadge(
      { operationalState: "testing", publicMedia: "preview" },
      runtimeState
    );

    assert.notEqual(badge.text, "EM TESTE");
    assert.equal(badge.text, "EM PREPARA\u00c7\u00c3O");
    assert.equal(badge.className, "status-badge future");
    assert.equal(badge.dotOk, false);
  }
});
