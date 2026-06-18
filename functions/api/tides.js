const TIDES_URL =
  "https://www.tide-forecast.com/locations/Vila-do-Porto-Santa-Maria-Azores/tides/latest";

function cleanText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function parseTodayFromHtml(html) {
  const text = cleanText(html);

  const match = text.match(
    /today.*?are:\s*(.*?)\.\s*Sunrise/i
  );

  if (!match) return [];

  const sentence = match[1];

  const regex =
    /(first|second|third|fourth)?\s*(high|low) tide at ([0-9]{1,2}:[0-9]{2})\s*(am|pm)/gi;

  const tides = [];
  let m;

  while ((m = regex.exec(sentence)) !== null) {
    const kind = m[2].toLowerCase();
    const time12 = `${m[3]} ${m[4]}`;
    const time = to24h(time12);

    tides.push({
      type: kind === "high" ? "Preia-mar" : "Baixa-mar",
      time,
      height: "—"
    });
  }

  return tides;
}

function to24h(value) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return value;

  let h = Number(match[1]);
  const m = match[2];
  const ampm = match[3].toLowerCase();

  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;

  return `${String(h).padStart(2, "0")}:${m}`;
}

export async function onRequestGet() {
  try {
    const response = await fetch(TIDES_URL, {
      headers: {
        "User-Agent": "LiveSantaMaria/1.0"
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const tides = parseTodayFromHtml(html);

    if (!tides.length) {
      throw new Error("No tides parsed");
    }

    return Response.json(
      {
        source: "Tide-Forecast",
        location: "Vila do Porto",
        date: new Date().toISOString().slice(0, 10),
        tides
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
        location: "Vila do Porto",
        date: new Date().toISOString().slice(0, 10),
        error: String(err.message || err),
        tides: []
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