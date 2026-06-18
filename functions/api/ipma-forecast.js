const IPMA_FORECAST_URL =
  "https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/3430100.json";

export async function onRequestGet() {
  try {
    const response = await fetch(IPMA_FORECAST_URL, {
      headers: {
        "User-Agent": "LiveSantaMaria/1.0"
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    return Response.json(
      {
        source: "IPMA",
        location: "Santa Maria",
        updatedAt: data.dataUpdate || null,
        data: Array.isArray(data.data) ? data.data : []
      },
      {
        headers: {
          "Cache-Control": "public, max-age=1800"
        }
      }
    );
  } catch (err) {
    return Response.json(
      {
        source: "Indisponível",
        location: "Santa Maria",
        error: String(err.message || err),
        data: []
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}