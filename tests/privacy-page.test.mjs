import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("privacy page publishes the approved v2 transparency contract", async () => {
  const html = await readFile(new URL("privacidade.html", projectRoot), "utf8");

  assert.match(html, /<html lang="pt-PT">/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  for (const expected of [
    "Responsável pelo tratamento",
    "Câmaras e Timelapse",
    "Métricas e armazenamento local",
    "Contactos por email",
    "Fornecedores",
    "Conservação",
    "Os seus direitos",
    "Luis Mesquita",
    "Luis Carreiro",
    "livesantamaria.project@gmail.com",
    "3 dias",
    "10 vídeos diários",
    "4 vídeos semanais",
    "30 dias",
    "14 dias",
    "12 meses"
  ]) {
    assert.match(html, new RegExp(expected));
  }

  assert.match(html, /id="metricas"/);
  assert.match(html, /href="https:\/\/www\.cnpd\.pt\//);
  assert.doesNotMatch(html, /audience\/event|hls\.min\.js|timelapse\.js/);
  assert.doesNotMatch(html, /dados anónimos|nenhum IP|conformidade garantida/i);
});

test("public site links to privacy information without treating navigation as consent", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");

  assert.match(html, /<a[^>]+href="\.\/privacidade\.html"[^>]*>Privacidade<\/a>/);
  assert.match(html, /<a[^>]+href="\.\/privacidade\.html#metricas"[^>]*>Saber mais na Política de Privacidade<\/a>/);
  assert.match(html, /id="audiencePrivacySettings"[^>]*>Definições de métricas<\/button>/);
});
