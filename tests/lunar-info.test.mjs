import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `função ${name} não encontrada`);
  const end = html.indexOf("\nfunction ", start + 1);
  assert.notEqual(end, -1, `função ${name} não termina`);
  return html.slice(start, end);
}

function loadLunarFunctions(extraContext = {}) {
  const context = { Intl, ...extraContext };
  vm.runInNewContext([
    extractFunction("normalizeDegrees"),
    extractFunction("toJulianDate"),
    extractFunction("lunarElongationDegrees"),
    extractFunction("getMoonData"),
    extractFunction("findNextLunarPhase"),
    extractFunction("formatAzoresMoonDate")
  ].join("\n"), context);
  return context;
}

test("identifica Lua nova com iluminação mínima", () => {
  const context = loadLunarFunctions();
  const result = vm.runInNewContext(
    "getMoonData(new Date('2024-04-08T18:21:00Z'))",
    { ...context, Date }
  );

  assert.equal(result.phaseName, "Lua nova");
  assert.ok(result.illuminationPercent <= 2);
});

test("identifica Quarto crescente com cerca de metade iluminada", () => {
  const context = loadLunarFunctions();
  const result = vm.runInNewContext(
    "getMoonData(new Date('2024-04-15T19:13:00Z'))",
    { ...context, Date }
  );

  assert.equal(result.phaseName, "Quarto crescente");
  assert.ok(result.illuminationPercent >= 45 && result.illuminationPercent <= 55);
});

test("identifica Lua cheia com iluminação máxima", () => {
  const context = loadLunarFunctions();
  const result = vm.runInNewContext(
    "getMoonData(new Date('2024-04-23T23:49:00Z'))",
    { ...context, Date }
  );

  assert.equal(result.phaseName, "Lua cheia");
  assert.ok(result.illuminationPercent >= 98 && result.illuminationPercent <= 100);
});

test("identifica Quarto minguante com cerca de metade iluminada", () => {
  const context = loadLunarFunctions();
  const result = vm.runInNewContext(
    "getMoonData(new Date('2024-05-01T11:27:00Z'))",
    { ...context, Date }
  );

  assert.equal(result.phaseName, "Quarto minguante");
  assert.ok(result.illuminationPercent >= 45 && result.illuminationPercent <= 55);
});

test("calcula a próxima Lua cheia a partir da data atual", () => {
  const context = loadLunarFunctions();
  const result = vm.runInNewContext(
    "formatAzoresMoonDate(findNextLunarPhase(new Date('2024-04-09T12:00:00Z'), 180))",
    { ...context, Date }
  );

  assert.equal(result, "23 Abr");
});

test("calcula a próxima Lua nova a partir da data atual", () => {
  const context = loadLunarFunctions();
  const result = vm.runInNewContext(
    "formatAzoresMoonDate(findNextLunarPhase(new Date('2024-04-09T12:00:00Z'), 0))",
    { ...context, Date }
  );

  assert.equal(result, "8 Mai");
});

test("renderiza os quatro cartões lunares com os valores calculados", () => {
  const lunarStart = html.indexOf('<div class="sun-card moon-card">');
  const lunarEnd = html.indexOf("\n\n        </div>\n      </section>", lunarStart);
  assert.notEqual(lunarStart, -1, "bloco lunar não encontrado");
  assert.notEqual(lunarEnd, -1, "fim do bloco lunar não encontrado");
  const lunarMarkup = html.slice(lunarStart, lunarEnd);
  assert.equal((lunarMarkup.match(/class="metar-item"/g) || []).length, 4);

  const elements = Object.fromEntries([
    "moonPhase",
    "moonIllumination",
    "nextFullMoon",
    "nextNewMoon"
  ].map(id => [id, { textContent: "" }]));
  const context = loadLunarFunctions({
    document: { getElementById(id) { return elements[id] || null; } }
  });
  vm.runInNewContext([
    extractFunction("setText"),
    extractFunction("updateMoonCard"),
    "updateMoonCard(new Date('2024-04-24T12:00:00Z'));"
  ].join("\n"), { ...context, Date });

  assert.match(elements.moonPhase.textContent, /🌕 Lua cheia/);
  assert.match(elements.moonIllumination.textContent, /^(98|99|100)%$/);
  assert.equal(elements.nextFullMoon.textContent, "23 Mai");
  assert.equal(elements.nextNewMoon.textContent, "8 Mai");
});
