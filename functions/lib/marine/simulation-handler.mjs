import { recommendLocation } from './recommendation-engine.mjs';
import { containsAngle } from './profiles.mjs';

const PROFILE_FIELDS = ['active', 'cameraId', 'coastFacingDeg', 'confidence', 'id', 'name', 'profileVersion', 'sectors', 'targetArea', 'type'];
const SECTOR_FIELDS = ['from', 'level', 'to'];
const SCENARIO_FIELDS = ['direction', 'gusts', 'height', 'period', 'wind', 'windDirection'];
const TYPES = new Set(['bay', 'beach', 'natural_pool']);
const CONFIDENCE = new Set(['provisional', 'validated', 'calibrated']);
const LEVELS = new Set(['very_sheltered', 'sheltered', 'partial', 'exposed', 'very_exposed']);
const sameFields = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === fields.join('|');
const text = (value, max) => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max;
const number = (value, min, max, maxInclusive = true) => Number.isFinite(value) && value >= min && (maxInclusive ? value <= max : value < max);

function validProfile(profile) {
  if (!sameFields(profile, PROFILE_FIELDS) || typeof profile.active !== 'boolean' || !text(profile.id, 64) || !text(profile.name, 100)
    || !text(profile.cameraId, 64) || !text(profile.targetArea, 160) || !text(profile.profileVersion, 32)
    || !TYPES.has(profile.type) || !CONFIDENCE.has(profile.confidence) || !number(profile.coastFacingDeg, 0, 360, false)
    || !Array.isArray(profile.sectors) || profile.sectors.length < 1 || profile.sectors.length > 24) return false;
  const coverage = new Uint8Array(720);
  for (const sector of profile.sectors) {
    if (!sameFields(sector, SECTOR_FIELDS) || !LEVELS.has(sector.level) || !number(sector.from, 0, 360, false)
      || !number(sector.to, 0, 360) || sector.to === 0 || sector.from === sector.to) return false;
    for (let index = 0; index < coverage.length; index += 1) if (containsAngle(index / 2 + .25, sector.from, sector.to)) coverage[index] += 1;
  }
  return !coverage.some(count => count !== 1);
}

function validScenario(scenario) {
  return sameFields(scenario, SCENARIO_FIELDS)
    && number(scenario.direction, 0, 360, false) && number(scenario.windDirection, 0, 360, false)
    && number(scenario.height, 0, 30) && number(scenario.period, .1, 60)
    && number(scenario.wind, 0, 300) && number(scenario.gusts, 0, 400);
}

const response = (body, status) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function handleMarineSimulation(request) {
  if (request.method !== 'POST' || !request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return response({ error: 'invalid_request' }, 400);
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > 16_384) return response({ error: 'invalid_request' }, 400);
  let payload;
  try { payload = JSON.parse(await request.text()); } catch { return response({ error: 'invalid_request' }, 400); }
  if (!sameFields(payload, ['profile', 'scenario']) || !validProfile(payload.profile) || !validScenario(payload.scenario)) return response({ error: 'invalid_simulation_input' }, 400);
  const scenario = payload.scenario;
  return response(recommendLocation(payload.profile, {
    swellDirectionDeg: scenario.direction, swellHeightM: scenario.height, swellPeriodS: scenario.period,
    windDirectionDeg: scenario.windDirection, windSpeedKmh: scenario.wind, windGustKmh: scenario.gusts
  }), 200);
}
