export const OFFSHORE_POINT = Object.freeze({
  latitude: 36.85, longitude: -25.2, offshorePointVersion: "0.1", confidence: "provisional"
});

const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

function requestUrl(base, hourly) {
  const url = new URL(base);
  url.searchParams.set("latitude", String(OFFSHORE_POINT.latitude));
  url.searchParams.set("longitude", String(OFFSHORE_POINT.longitude));
  url.searchParams.set("hourly", hourly.join(","));
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("forecast_days", "2");
  if (base === WEATHER_URL) url.searchParams.set("wind_speed_unit", "kmh");
  return url;
}

function asIso(value) {
  const parsed = Date.parse(`${value}:00.000Z`);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function nearestIndex(times, now) {
  let chosen = -1;
  let distance = Infinity;
  times.forEach((value, index) => {
    const timestamp = Date.parse(`${value}:00.000Z`);
    const currentDistance = Math.abs(timestamp - now.getTime());
    if (Number.isFinite(timestamp) && currentDistance < distance) {
      chosen = index;
      distance = currentDistance;
    }
  });
  return chosen;
}

function finite(value) { return Number.isFinite(value) ? value : null; }

export async function fetchMarineConditions(fetchImpl = fetch, now = new Date()) {
  const marineUrl = requestUrl(MARINE_URL, [
    "swell_wave_direction", "swell_wave_height", "swell_wave_period", "wave_height", "sea_surface_temperature"
  ]);
  const windUrl = requestUrl(WEATHER_URL, ["wind_direction_10m", "wind_speed_10m", "wind_gusts_10m"]);
  const [marineResponse, windResponse] = await Promise.all([
    fetchImpl(marineUrl, { headers: { Accept: "application/json" } }),
    fetchImpl(windUrl, { headers: { Accept: "application/json" } })
  ]);
  if (!marineResponse.ok || !windResponse.ok) throw new Error("marine_source_unavailable");
  const [marine, wind] = await Promise.all([marineResponse.json(), windResponse.json()]);
  const marineTimes = Array.isArray(marine?.hourly?.time) ? marine.hourly.time : [];
  const windTimes = Array.isArray(wind?.hourly?.time) ? wind.hourly.time : [];
  const marineIndex = nearestIndex(marineTimes, now);
  const windIndex = nearestIndex(windTimes, now);
  if (marineIndex < 0 || windIndex < 0) throw new Error("marine_source_invalid");
  const sourceUpdatedAt = asIso(marineTimes[marineIndex]);
  const conditions = {
    sourceUpdatedAt,
    validFor: sourceUpdatedAt,
    swellDirectionDeg: finite(marine.hourly.swell_wave_direction?.[marineIndex]),
    swellHeightM: finite(marine.hourly.swell_wave_height?.[marineIndex]),
    swellPeriodS: finite(marine.hourly.swell_wave_period?.[marineIndex]),
    combinedWaveHeightM: finite(marine.hourly.wave_height?.[marineIndex]),
    seaTemperatureC: finite(marine.hourly.sea_surface_temperature?.[marineIndex]),
    windDirectionDeg: finite(wind.hourly.wind_direction_10m?.[windIndex]),
    windSpeedKmh: finite(wind.hourly.wind_speed_10m?.[windIndex]),
    windGustKmh: finite(wind.hourly.wind_gusts_10m?.[windIndex])
  };
  if (![conditions.swellDirectionDeg, conditions.swellHeightM, conditions.swellPeriodS].every(Number.isFinite)) {
    throw new Error("critical_marine_data_missing");
  }
  return conditions;
}

export function freshnessFor(sourceUpdatedAt, now = new Date()) {
  const age = now.getTime() - Date.parse(sourceUpdatedAt);
  if (!Number.isFinite(age) || age < 0) return "expired";
  if (age <= 60 * 60 * 1000) return "fresh";
  if (age <= 180 * 60 * 1000) return "stale";
  return "expired";
}
