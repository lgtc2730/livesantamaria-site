// Live Santa Maria — METAR LPAZ proxy
// Cloudflare Pages Function
// Endpoint público: /api/metar

const MAX_METAR_AGE_HOURS = 2; // Limite de idade do METAR para ser considerado válido (em horas)

const METAR_SOURCES = [
  {
    name: "AviationWeather",
    url: "https://aviationweather.gov/api/data/metar?ids=LPAZ&format=raw&taf=false"
  },
  {
    name: "NOAA",
    url: "https://tgftp.nws.noaa.gov/data/observations/metar/stations/LPAZ.TXT"
  }
];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",

    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "CDN-Cache-Control": "no-store",
    "Cloudflare-CDN-Cache-Control": "no-store"
  };
}

function extractMetarLine(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .find(line => /^(METAR\s+|SPECI\s+)?LPAZ\b/.test(line)) || "";
}

function parseMetarObservedAt(raw) {
  const match = String(raw || "").match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
  if (!match) return null;

  const day = Number(match[1]);
  const hour = Number(match[2]);
  const minute = Number(match[3]);

  const now = new Date();

  let observedAt = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    day,
    hour,
    minute,
    0
  ));

  // Ajuste para viragem de mês.
  if (observedAt.getTime() - now.getTime() > 14 * 24 * 60 * 60 * 1000) {
    observedAt = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - 1,
      day,
      hour,
      minute,
      0
    ));
  }

  if (now.getTime() - observedAt.getTime() > 20 * 24 * 60 * 60 * 1000) {
    observedAt = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      day,
      hour,
      minute,
      0
    ));
  }

  return observedAt;
}

function getMetarAgeHours(raw) {
  const observedAt = parseMetarObservedAt(raw);
  if (!observedAt) {
    return {
      observedAt: null,
      ageHours: null
    };
  }

  return {
    observedAt,
    ageHours: (Date.now() - observedAt.getTime()) / 3600000
  };
}

async function fetchWithTimeout(url, timeout = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LiveSantaMaria/2.4 (+https://livesantamaria.org)"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (request.method !== "GET") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405, headers: corsHeaders() }
    );
  }

  const errors = [];

  for (const source of METAR_SOURCES) {
    try {
      const text = await fetchWithTimeout(source.url);
      const raw = extractMetarLine(text);

      if (!raw) {
        throw new Error("METAR LPAZ não encontrado");
      }

      const { observedAt, ageHours } = getMetarAgeHours(raw);

      if (!observedAt || !Number.isFinite(ageHours)) {
        throw new Error("Hora do METAR inválida");
      }

      if (ageHours < 0) {
        throw new Error(`METAR com hora futura (${ageHours.toFixed(1)} h)`);
      }

      if (ageHours > MAX_METAR_AGE_HOURS) {
        throw new Error(`METAR antigo (${ageHours.toFixed(1)} h)`);
      }

      return Response.json(
        {
          ok: true,
          station: "LPAZ",
          source: "METAR LPAZ",
          provider: source.name,
          raw,
          observed_at: observedAt.toISOString(),
          age_hours: Number(ageHours.toFixed(2)),
          max_age_hours: MAX_METAR_AGE_HOURS,
          fetched_at: new Date().toISOString()
        },
        { headers: corsHeaders() }
      );
    } catch (err) {
      errors.push(`${source.name}: ${err.message}`);
    }
  }

  return Response.json(
    {
      ok: false,
      station: "LPAZ",
      error: errors.join(" | ") || "METAR indisponível",
      max_age_hours: MAX_METAR_AGE_HOURS,
      fetched_at: new Date().toISOString()
    },
    { status: 502, headers: corsHeaders() }
  );
}