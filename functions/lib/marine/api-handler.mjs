import { fetchMarineConditions } from "./marine-source.mjs";
import { buildPresentationContract } from "./presentation-contract.mjs";
import { INITIAL_PROFILES, validateProfiles } from "./profiles.mjs";

const DEFAULT_SEASON = Object.freeze({ start: "2026-06-01", end: "2026-09-30", timezone: "Atlantic/Azores" });

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

export async function buildMarineRecommendationsResponse({ fetchImpl = fetch, now = new Date(), profiles, marineControl } = {}) {
  try {
    const [conditions, editable] = await Promise.all([
      fetchMarineConditions(fetchImpl, now),
      profiles ? Promise.resolve({ profiles, season: DEFAULT_SEASON }) : loadEditableConfig(marineControl)
    ]);
    const payload = buildPresentationContract({ conditions, profiles: editable.profiles, season: editable.season, now });
    if (payload.dataStatus === "expired") {
      return Response.json({ dataStatus: "expired", message: "Recomendações temporariamente indisponíveis." }, {
        status: 503, headers: { "Cache-Control": "no-store" }
      });
    }
    return Response.json(payload, { headers: { "Cache-Control": "public, max-age=1800" } });
  } catch {
    return Response.json({ dataStatus: "unavailable", message: "Recomendações temporariamente indisponíveis." }, {
      status: 503, headers: { "Cache-Control": "no-store" }
    });
  }
}
