import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

function extractFunction(source, name) {
  const match = source.match(
    new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`)
  );

  assert.ok(match, `função ${name} não encontrada em index.html`);
  return match[0];
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
  assert.match(setCardOffline, /badgeText\.textContent = "OFFLINE";/);
  assert.match(
    setCardOffline,
    /block\.classList\.add\("has-fallback-active"\);/
  );
});
