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

test("o METAR expõe graus contínuos e velocidade em km/h para o Hero", () => {
  const context = {};
  vm.runInNewContext([
    extractFunction("degreesToCompass"),
    extractFunction("parseMetarWind"),
    extractFunction("parseSignedMetarTemp"),
    extractFunction("parseMetarTemperature"),
    extractFunction("isMetarWeatherToken"),
    extractFunction("metarCondition"),
    extractFunction("parseMetarVisibility"),
    extractFunction("parseCloudHeight"),
    extractFunction("parseMetarClouds"),
    extractFunction("parseMetarTime"),
    extractFunction("parseMetar"),
    "result = parseMetar('METAR LPAZ 242030Z 25013KT 9999 FEW007 BKN023 23/21 Q1018', 'METAR LPAZ');"
  ].join("\n"), context);

  assert.equal(context.result.temp, 23);
  assert.equal(context.result.windDirectionDegrees, 250);
  assert.equal(context.result.windSpeedKmh, 24);
});

test("vento variável mantém a velocidade mas não inventa uma direção", () => {
  const context = {};
  vm.runInNewContext([
    extractFunction("degreesToCompass"),
    extractFunction("parseMetarWind"),
    "result = parseMetarWind('VRB06KT');"
  ].join("\n"), context);

  assert.equal(context.result.directionDegrees, null);
  assert.equal(context.result.speedKmh, 11);
});

test("ícone e temperatura ficam no centro da rosa dos ventos", () => {
  const widgetStart = html.indexOf('<div class="hero-weather">');
  const widgetEnd = html.indexOf('<span class="hero-accessibility" id="weatherHum">', widgetStart);
  assert.notEqual(widgetStart, -1);
  assert.notEqual(widgetEnd, -1);
  const widget = html.slice(widgetStart, widgetEnd);
  const compassStart = widget.indexOf('class="hero-wind-compass"');
  const iconPosition = widget.indexOf('id="weatherIcon"');
  const temperaturePosition = widget.indexOf('id="weatherTemp"');
  const compassClose = widget.indexOf('</div>', compassStart);

  assert.ok(compassStart < iconPosition && iconPosition < compassClose);
  assert.ok(compassStart < temperaturePosition && temperaturePosition < compassClose);
});

test("cardinais e seta ficam fora da circunferência", () => {
  assert.match(
    html,
    /<div class="hero-wind-rose">[\s\S]*?<div class="hero-wind-compass"[^>]*>[\s\S]*?<div class="hero-weather-reading">[\s\S]*?<\/div>\s*<\/div>\s*<span class="hero-wind-cardinal hero-wind-cardinal--n">N<\/span>[\s\S]*?<span class="hero-wind-arrow" id="weatherWindArrow" hidden><\/span>/
  );
});

test("o mobile reserva espaço entre título, cardinais, seta e velocidade", () => {
  const mobileCss = [...html.matchAll(/@media \(max-width: 680px\) \{[\s\S]*?\n    \}/g)]
    .map(match => match[0])
    .find(block => block.includes(".hero-title-block"));
  assert.ok(mobileCss, "breakpoint mobile do Hero não encontrado");

  assert.match(mobileCss, /\.hero-title-block\s*\{[^}]*transform:\s*translateY\(-20px\)/s);
  assert.match(mobileCss, /\.hero-weather\s*\{[^}]*transform:\s*translateY\(-3px\)/s);
  assert.match(mobileCss, /\.hero-wind-cardinal--n\s*\{[^}]*top:\s*-24px/s);
  assert.match(mobileCss, /\.hero-wind-cardinal--e\s*\{[^}]*right:\s*-16px/s);
  assert.match(mobileCss, /\.hero-wind-cardinal--s\s*\{[^}]*bottom:\s*-24px/s);
  assert.match(mobileCss, /\.hero-wind-cardinal--w\s*\{[^}]*left:\s*-20px/s);
  assert.match(mobileCss, /\.hero-wind-arrow\s*\{[^}]*inset:\s*-8px/s);
  assert.match(mobileCss, /\.hero-wind-speed\s*\{[^}]*right:\s*-22px[^}]*bottom:\s*-20px/s);
});

test("o desktop afasta cardinais, seta e velocidade da circunferência", () => {
  const desktopCss = html.slice(0, html.indexOf("@media"));

  assert.match(desktopCss, /\.hero-wind-cardinal--n\s*\{[^}]*top:\s*-24px/s);
  assert.match(desktopCss, /\.hero-wind-cardinal--e\s*\{[^}]*right:\s*-16px/s);
  assert.match(desktopCss, /\.hero-wind-cardinal--s\s*\{[^}]*bottom:\s*-24px/s);
  assert.match(desktopCss, /\.hero-wind-cardinal--w\s*\{[^}]*left:\s*-20px/s);
  assert.match(desktopCss, /\.hero-wind-arrow\s*\{[^}]*inset:\s*-8px/s);
  assert.match(desktopCss, /\.hero-wind-speed\s*\{[^}]*right:\s*-22px[^}]*bottom:\s*-20px/s);
});

test("o widget roda a seta pelos graus exatos e apresenta apenas a velocidade", () => {
  const elements = {
    weatherIcon: { textContent: "" },
    weatherTemp: { textContent: "" },
    weatherWindSpeed: { textContent: "" },
    weatherWindCompass: {
      attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; }
    },
    weatherWindArrow: {
      hidden: true,
      style: { values: {}, setProperty(name, value) { this.values[name] = value; } }
    }
  };
  const context = {
    document: { getElementById(id) { return elements[id] || null; } }
  };

  vm.runInNewContext([
    extractFunction("setText"),
    extractFunction("updateHeroWeather"),
    "updateHeroWeather({ icon: '☁️', temp: 23, windSpeedKmh: 24, windDirectionDegrees: 250 });"
  ].join("\n"), context);

  assert.equal(elements.weatherIcon.textContent, "☁️");
  assert.equal(elements.weatherTemp.textContent, "23°C");
  assert.equal(elements.weatherWindSpeed.textContent, "24 km/h");
  assert.equal(elements.weatherWindArrow.style.values["--wind-direction"], "250deg");
  assert.equal(elements.weatherWindArrow.hidden, false);
  assert.equal(elements.weatherWindCompass.attributes["aria-label"], "Vento 24 km/h, 250 graus");
});

test("o widget não inventa rumo quando o METAR indica vento variável", () => {
  const arrow = {
    hidden: false,
    style: { setProperty() { throw new Error("não deve rodar sem graus"); } }
  };
  const compass = { setAttribute(name, value) { this[name] = value; } };
  const elements = {
    weatherIcon: { textContent: "" },
    weatherTemp: { textContent: "" },
    weatherWindSpeed: { textContent: "" },
    weatherWindCompass: compass,
    weatherWindArrow: arrow
  };
  const context = {
    document: { getElementById(id) { return elements[id] || null; } }
  };

  vm.runInNewContext([
    extractFunction("setText"),
    extractFunction("updateHeroWeather"),
    "updateHeroWeather({ icon: '🌤️', temp: 20, windSpeedKmh: 11, windDirectionDegrees: null });"
  ].join("\n"), context);

  assert.equal(arrow.hidden, true);
  assert.equal(compass["aria-label"], "Vento variável, 11 km/h");
});
