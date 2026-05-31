// Live Santa Maria — METAR LPAZ proxy
// Cloudflare Pages Function
// Endpoint público: /api/metar

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
    "Cache-Control": "public, max-age=300, s-maxage=300"
  };
}

function extractMetarLine(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .find(line => /^(METAR\s+|SPECI\s+)?LPAZ\b/.test(line)) || "";
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

  let lastError = null;

  for (const source of METAR_SOURCES) {
    try {
      const text = await fetchWithTimeout(source.url);
      const raw = extractMetarLine(text);

      if (!raw) {
        throw new Error("METAR LPAZ não encontrado");
      }

      return Response.json(
        {
          ok: true,
          station: "LPAZ",
          source: "METAR LPAZ",
          provider: source.name,
          raw,
          fetched_at: new Date().toISOString()
        },
        { headers: corsHeaders() }
      );
    } catch (err) {
      lastError = `${source.name}: ${err.message}`;
    }
  }

  return Response.json(
    {
      ok: false,
      station: "LPAZ",
      error: lastError || "METAR indisponível"
    },
    { status: 502, headers: corsHeaders() }
  );
}
