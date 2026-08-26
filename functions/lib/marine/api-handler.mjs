import { fetchMarineConditions, freshnessFor } from "./marine-source.mjs";
import { buildPresentationContract } from "./presentation-contract.mjs";
import { INITIAL_PROFILES, validateProfiles } from "./profiles.mjs";

const DEFAULT_SEASON = Object.freeze({ start: "2026-06-01", end: "2026-09-30", timezone: "Atlantic/Azores" });
const MARINE_CACHE_KEY = "current";
const MARINE_CACHE_TTL_SECONDS = 180 * 60;
const CONDITION_FIELDS = Object.freeze([
  "combinedWaveHeightM", "seaTemperatureC", "sourceUpdatedAt", "swellDirectionDeg", "swellHeightM",
  "swellPeriodS", "validFor", "windDirectionDeg", "windGustKmh", "windSpeedKmh"
]);

function validIso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join("|") !== CONDITION_FIELDS.join("|")
    || !validIso(value.sourceUpdatedAt) || !validIso(value.validFor)) return false;
  const required = ["swellDirectionDeg", "swellHeightM", "swellPeriodS", "windDirectionDeg", "windSpeedKmh", "windGustKmh"];
  if (!required.every(field => Number.isFinite(value[field]))) return false;
  return ["combinedWaveHeightM", "seaTemperatureC"].every(field => value[field] === null || Number.isFinite(value[field]));
}

async function storeSnapshot(marineCache, conditions) {
  if (!marineCache?.put) return;
  try {
    await marineCache.put(MARINE_CACHE_KEY, JSON.stringify(conditions), { expirationTtl: MARINE_CACHE_TTL_SECONDS });
  } catch {
    // Fresh external data remains usable when cache persistence is temporarily unavailable.
  }
}

async function loadSnapshot(marineCache, now) {
  if (!marineCache?.get) return null;
  try {
    const snapshot = await marineCache.get(MARINE_CACHE_KEY, "json");
    if (!validSnapshot(snapshot) || freshnessFor(snapshot.sourceUpdatedAt, now) === "expired") return null;
    return snapshot;
  } catch {
    return null;
  }
}

async function loadEditableConfig(marineControl) {
  if (!marineControl?.fetch) return { profiles: INITIAL_PROFILES, season: DEFAULT_SEASON };
  try {
    const request = new Request("https://marine-control.internal/api/marine-recommendations/config/public", {
      method: "GET", headers: { Accept: "application/json" }
    });
    const response = await marineControl.fetch(request);
    const body = response.ok ? await response.json() : null;
    const config = body?.success === true ? body.data?.config : null;
    const season = config?.season;
    if (!validateProfiles(config?.profiles).valid || !season || season.timezone !== "Atlantic/Azores"
      || !/^\d{4}-\d{2}-\d{2}$/.test(season.start) || !/^\d{4}-\d{2}-\d{2}$/.test(season.end) || season.start > season.end) {
      throw new Error("invalid_config");
    }
    return { profiles: config.profiles, season };
  } catch {
    return { profiles: INITIAL_PROFILES, season: DEFAULT_SEASON };
  }
}

export async function buildMarineRecommendationsResponse({ fetchImpl = fetch, now, clock, profiles, marineControl, marineCache } = {}) {
  const readClock = clock || (() => now || new Date());
  const selectionTime = now || readClock();
  try {
    const [resolved, editable] = await Promise.all([
      (async () => {
        try {
          const conditions = await fetchMarineConditions(fetchImpl, selectionTime, readClock);
          await storeSnapshot(marineCache, conditions);
          return { conditions, fromCache: false };
        } catch {
          const conditions = await loadSnapshot(marineCache, now || readClock());
          if (!conditions) throw new Error("marine_source_unavailable");
          return { conditions, fromCache: true };
        }
      })(),
      profiles ? Promise.resolve({ profiles, season: DEFAULT_SEASON }) : loadEditableConfig(marineControl)
    ]);
    const evaluatedAt = now || readClock();
    const built = buildPresentationContract({ conditions: resolved.conditions, profiles: editable.profiles, season: editable.season, now: evaluatedAt });
    const payload = resolved.fromCache ? { ...built, dataStatus: "stale" } : built;
    if (payload.dataStatus === "expired") {
      return Response.json({ dataStatus: "expired", message: "Recomendações temporariamente indisponíveis." }, {
        status: 503, headers: { "Cache-Control": "no-store" }
      });
    }
    return Response.json(payload, { headers: { "Cache-Control": resolved.fromCache ? "no-store" : "public, max-age=1800" } });
  } catch {
    return Response.json({ dataStatus: "unavailable", message: "Recomendações temporariamente indisponíveis." }, {
      status: 503, headers: { "Cache-Control": "no-store" }
    });
  }
}
