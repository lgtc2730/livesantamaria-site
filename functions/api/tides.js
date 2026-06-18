export async function onRequestGet() {
  const data = {
    source: "Teste local",
    location: "Vila do Porto",
    date: new Date().toISOString().slice(0, 10),
    tides: [
      { type: "Preia-mar", time: "03:39", height: "1.09 m" },
      { type: "Baixa-mar", time: "09:42", height: "-0.14 m" },
      { type: "Preia-mar", time: "16:00", height: "1.24 m" },
      { type: "Baixa-mar", time: "22:22", height: "-0.15 m" }
    ]
  };

  return Response.json(data, {
    headers: {
      "Cache-Control": "public, max-age=1800"
    }
  });
}