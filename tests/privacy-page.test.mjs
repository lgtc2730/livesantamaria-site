import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("privacy page publishes the approved v2 transparency contract", async () => {
  const html = await readFile(new URL("privacidade.html", projectRoot), "utf8");

  assert.match(html, /<html lang="pt-PT">/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  for (const expected of [
    "Corresponsáveis pelo Tratamento",
    "Câmaras e Timelapse",
    "Métricas e armazenamento local",
    "Contactos por email",
    "Fornecedores",
    "Conservação",
    "Os seus direitos",
    "Luís Mesquita",
    "Luís Carreiro",
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
  assert.match(html, /Versão 2\.0 — 2026-08-09/);
  assert.match(html, /determinam conjuntamente as finalidades e os meios essenciais/);
  assert.match(html, /acompanhamento institucional e de conformidade/);
  assert.match(html, /implementação técnica, segurança, controlo de acessos e manutenção operacional/);
  assert.match(html, /As decisões estruturais são tomadas conjuntamente/);
  assert.match(html, /perante qualquer dos corresponsáveis/);
  assert.match(html, /href="https:\/\/www\.cnpd\.pt\//);
  assert.doesNotMatch(html, /Versão para revisão|Documento para revisão/);
  assert.doesNotMatch(html, /é responsável pelo tratamento e decide as finalidades/);
  assert.doesNotMatch(html, /audience\/event|hls\.min\.js|timelapse\.js/);
  assert.doesNotMatch(html, /dados anónimos|nenhum IP|conformidade garantida/i);
});

test("public site links to privacy information without treating navigation as consent", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");

  assert.match(html, /<a[^>]+href="\.\/privacidade\.html"[^>]*>Privacidade<\/a>/);
  assert.match(html, /<a[^>]+href="\.\/privacidade\.html#metricas"[^>]*>Saber mais na Política de Privacidade<\/a>/);
  assert.match(html, /id="audiencePrivacySettings"[^>]*>Definições de métricas<\/button>/);
});

test("mobile layout keeps the footer privacy controls available", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");

  assert.doesNotMatch(
    html,
    /\.footer\s*\{\s*display:\s*none;\s*\}/,
    "the mobile breakpoint must not hide the footer containing privacy controls"
  );
});

test("audience consent markup exposes an accessible modal dialog", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");

  assert.match(html, /id="audienceConsentPanel"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(html, /aria-describedby="audienceConsentDescription"/);
  assert.match(html, /id="audienceConsentClose"[^>]+aria-label="Fechar definições de métricas"/);
});
