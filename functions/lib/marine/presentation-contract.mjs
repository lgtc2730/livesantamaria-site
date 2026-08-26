import { freshnessFor, OFFSHORE_POINT } from "./marine-source.mjs";
import { recommendAll } from "./recommendation-engine.mjs";

const DISCLAIMER = "Indicação baseada na previsão do mar e vento. Confirme sempre as condições no local.";
const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function cardinalLabel(degrees) {
  return Number.isFinite(degrees) ? CARDINALS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8] : null;
}

export function buildPresentationContract({ conditions, profiles, season = { start: "2026-06-01", end: "2026-09-30", timezone: "Atlantic/Azores" }, now = new Date() }) {
  const locations = recommendAll(profiles, conditions).map((result) => ({
    id: result.id, name: result.name, type: result.type, cameraId: result.cameraId,
    score: result.score, scoreBeforeCap: result.scoreBeforeCap, rating: result.rating,
    primaryReason: result.primaryReason, secondaryReason: result.secondaryReason,
    message: result.message, hardCap: result.hardCap, profile: result.profile
  }));
  return {
    generatedAt: now.toISOString(), validFor: conditions.validFor,
    sourceUpdatedAt: conditions.sourceUpdatedAt,
    dataStatus: freshnessFor(conditions.sourceUpdatedAt, now),
    season,
    offshorePoint: OFFSHORE_POINT,
    context: {
      seaTemperatureC: conditions.seaTemperatureC,
      waveDirectionDeg: conditions.swellDirectionDeg,
      waveDirectionLabel: cardinalLabel(conditions.swellDirectionDeg),
      waveHeightM: conditions.swellHeightM
    },
    conditions: {
      swellDirectionDeg: conditions.swellDirectionDeg, swellHeightM: conditions.swellHeightM,
      swellPeriodS: conditions.swellPeriodS, combinedWaveHeightM: conditions.combinedWaveHeightM,
      seaTemperatureC: conditions.seaTemperatureC, windDirectionDeg: conditions.windDirectionDeg,
      windSpeedKmh: conditions.windSpeedKmh, windGustKmh: conditions.windGustKmh
    },
    locations,
    disclaimer: DISCLAIMER
  };
}
