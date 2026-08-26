import { DIRECTION_TRANSITION_HALF_WIDTH_DEG, containsAngle } from "./profiles.mjs";

const LEVEL_SCORES = Object.freeze({ very_sheltered: 100, sheltered: 80, partial: 55, exposed: 25, very_exposed: 0 });
const WEIGHTS = Object.freeze({
  bay: { direction: .5, height: .2, period: .2, wind: .1 },
  beach: { direction: .35, height: .25, period: .25, wind: .15 },
  natural_pool: { direction: .35, height: .3, period: .25, wind: .1 }
});

export const ENGINE_RULES = Object.freeze({
  directionTransitionHalfWidthDeg: DIRECTION_TRANSITION_HALF_WIDTH_DEG,
  heightCurve: Object.freeze([[.4, 100], [.5, 95], [.8, 85], [1, 75], [1.3, 60], [1.5, 50], [1.8, 35], [2, 25], [2.5, 10], [3, 0]]),
  periodCurve: Object.freeze([[6, 100], [7, 95], [8, 90], [10, 80], [12, 65], [14, 45], [16, 25], [18, 10]]),
  weights: WEIGHTS
});

const WIND_ADJUSTMENT = Object.freeze({ offshore: 10, "cross-offshore": 5, "cross-shore": 0, "cross-onshore": -10, onshore: -20 });

export function scoreCurve(value, points) {
  if (!Number.isFinite(value)) return null;
  if (value <= points[0][0]) return points[0][1];
  if (value >= points.at(-1)[0]) return points.at(-1)[1];
  for (let index = 1; index < points.length; index += 1) {
    const [rightValue, rightScore] = points[index];
    const [leftValue, leftScore] = points[index - 1];
    if (value <= rightValue) {
      const ratio = (value - leftValue) / (rightValue - leftValue);
      return leftScore + ratio * (rightScore - leftScore);
    }
  }
  return null;
}

function circularSigned(angle, boundary) {
  return ((angle - boundary + 540) % 360) - 180;
}

export function directionScore(direction, sectors, halfWidth = DIRECTION_TRANSITION_HALF_WIDTH_DEG) {
  if (!Number.isFinite(direction) || !Array.isArray(sectors) || !sectors.length) return null;
  const angle = ((direction % 360) + 360) % 360;
  const current = sectors.find((sector) => containsAngle(angle, sector.from, sector.to));
  if (!current) return null;
  for (const sector of sectors) {
    const boundary = ((sector.to % 360) + 360) % 360;
    const next = sectors.find((candidate) => containsAngle((boundary + .0001) % 360, candidate.from, candidate.to));
    if (!next || next === sector) continue;
    const distance = circularSigned(angle, boundary);
    if (Math.abs(distance) <= halfWidth) {
      const ratio = (distance + halfWidth) / (2 * halfWidth);
      return LEVEL_SCORES[sector.level] + ratio * (LEVEL_SCORES[next.level] - LEVEL_SCORES[sector.level]);
    }
  }
  return LEVEL_SCORES[current.level];
}

export function classifyRelativeWind(windDirectionDeg, coastFacingDeg) {
  if (!Number.isFinite(windDirectionDeg) || !Number.isFinite(coastFacingDeg)) return null;
  const raw = Math.abs((((windDirectionDeg - coastFacingDeg) % 360) + 360) % 360);
  const delta = Math.min(raw, 360 - raw);
  if (delta < 22.5) return "onshore";
  if (delta < 67.5) return "cross-onshore";
  if (delta < 112.5) return "cross-shore";
  if (delta < 157.5) return "cross-offshore";
  return "offshore";
}

function windBase(speed) {
  if (speed < 10) return 100;
  if (speed <= 20) return 85;
  if (speed <= 30) return 65;
  if (speed <= 40) return 40;
  return 15;
}

function clamp(value, min = 0, max = 100) { return Math.min(max, Math.max(min, value)); }

export function ratingForScore(score) {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "moderate";
  if (score >= 30) return "exposed";
  return "very_exposed";
}

function marineCaps(type, height, period) {
  const caps = [];
  if (type === "bay") {
    if (height >= 2.5 && period >= 15) caps.push([69, "marine_high_energy"]);
    if (height >= 3) caps.push([49, "marine_height_strong"]);
    if (height >= 3.5) caps.push([29, "marine_height_very_strong"]);
  } else if (type === "beach") {
    if (height >= 2 && period >= 14) caps.push([69, "marine_high_energy"]);
    if (height >= 2.5 && period >= 14) caps.push([49, "marine_high_energy_severe"]);
    if (height >= 3) caps.push([29, "marine_height_very_strong"]);
  } else {
    if (height >= 1.5 && period >= 14) caps.push([69, "marine_high_energy"]);
    if (height >= 2 && period >= 14) caps.push([49, "marine_high_energy_severe"]);
    if (height >= 2.5) caps.push([29, "marine_height_very_strong"]);
  }
  return caps;
}

function windCaps(type, gust, windClass) {
  const caps = [];
  if (type === "beach") {
    if (gust >= 50 && ["onshore", "cross-onshore"].includes(windClass)) caps.push([69, "wind_gusts_unfavourable"]);
    if (gust >= 60) caps.push([49, "wind_gusts_severe"]);
  } else if (type === "bay") {
    if (gust >= 55) caps.push([69, "wind_gusts_strong"]);
    if (gust >= 65) caps.push([49, "wind_gusts_severe"]);
  } else {
    if (gust >= 50) caps.push([69, "wind_gusts_strong"]);
    if (gust >= 60) caps.push([49, "wind_gusts_severe"]);
  }
  return caps;
}

function publicMessage(rating, reason) {
  if (reason?.startsWith("wind_")) return "Vento forte junto à costa";
  if (reason?.startsWith("marine_height")) return "Mar forte junto à zona balnear";
  if (reason?.startsWith("marine_high_energy")) return "Ondas com bastante energia";
  if (rating === "excellent") return "Muito abrigado · recomendado";
  if (rating === "good") return "Boa opção · mar pouco mexido";
  if (rating === "moderate") return "Alguma ondulação";
  if (rating === "exposed") return "Exposto à ondulação";
  return "Muito exposto à ondulação";
}

export function recommendLocation(profile, conditions) {
  const { swellDirectionDeg, swellHeightM, swellPeriodS, windDirectionDeg, windSpeedKmh, windGustKmh } = conditions;
  if (![swellDirectionDeg, swellHeightM, swellPeriodS].every(Number.isFinite)) return null;
  const windClass = classifyRelativeWind(windDirectionDeg, profile.coastFacingDeg);
  const components = {
    direction: directionScore(swellDirectionDeg, profile.sectors),
    height: scoreCurve(swellHeightM, ENGINE_RULES.heightCurve),
    period: scoreCurve(swellPeriodS, ENGINE_RULES.periodCurve),
    wind: Number.isFinite(windSpeedKmh) && windClass ? clamp(windBase(windSpeedKmh) + WIND_ADJUSTMENT[windClass]) : 50
  };
  const weights = WEIGHTS[profile.type];
  const scoreBeforeCap = Math.round(Object.keys(weights).reduce((sum, key) => sum + components[key] * weights[key], 0));
  const caps = [
    ...marineCaps(profile.type, swellHeightM, swellPeriodS),
    ...(Number.isFinite(windGustKmh) ? windCaps(profile.type, windGustKmh, windClass) : [])
  ].sort((a, b) => a[0] - b[0]);
  const effective = caps.find(([max]) => scoreBeforeCap > max);
  const score = effective ? effective[0] : scoreBeforeCap;
  const hardCap = effective
    ? { applied: true, maxScore: effective[0], reason: effective[1] }
    : { applied: false, maxScore: null, reason: null };
  const rating = ratingForScore(score);
  const primaryReason = hardCap.reason ?? (components.direction <= 25 ? "direction_exposed" : components.height <= 35 ? "waves_high" : "protection_favourable");
  return {
    id: profile.id, name: profile.name, type: profile.type, cameraId: profile.cameraId,
    score, scoreBeforeCap, rating, components, windClass, hardCap, primaryReason,
    secondaryReason: hardCap.applied ? null : (components.period <= 45 ? "period_long" : null),
    message: publicMessage(rating, primaryReason),
    profile: { version: profile.profileVersion, confidence: profile.confidence }
  };
}

export function recommendAll(profiles, conditions) {
  return profiles.filter((profile) => profile.active !== false)
    .map((profile) => recommendLocation(profile, conditions)).filter(Boolean)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "pt"));
}
