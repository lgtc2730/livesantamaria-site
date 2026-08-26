export const DIRECTION_TRANSITION_HALF_WIDTH_DEG = 10;

export const INITIAL_PROFILES = Object.freeze([
  profile("sao-lourenco", "São Lourenço", "bay", "slourenco-sul", "praia/zona balnear central", 85, [
    [210, 330, "very_sheltered"], [330, 20, "sheltered"], [20, 50, "partial"],
    [50, 120, "exposed"], [120, 160, "partial"], [160, 210, "sheltered"]
  ]),
  profile("maia", "Maia", "natural_pool", "maia-norte", "zona balnear/piscina natural", 100, [
    [210, 330, "very_sheltered"], [330, 20, "sheltered"], [20, 130, "exposed"],
    [130, 180, "partial"], [180, 210, "sheltered"]
  ]),
  profile("praia-formosa", "Praia Formosa", "beach", "praia-poente", "praia/zona balnear central", 190, [
    [330, 70, "very_sheltered"], [70, 120, "sheltered"], [120, 145, "partial"],
    [145, 235, "exposed"], [235, 280, "partial"], [280, 330, "sheltered"]
  ]),
  profile("anjos", "Anjos", "natural_pool", "anjos-porto", "zona balnear/piscina natural", 285, [
    [30, 150, "very_sheltered"], [150, 190, "partial"], [190, 330, "exposed"], [330, 30, "partial"]
  ])
]);

function profile(id, name, type, cameraId, targetArea, coastFacingDeg, sectors) {
  return Object.freeze({
    id, name, type, cameraId, targetArea, active: true, coastFacingDeg,
    sectors: Object.freeze(sectors.map(([from, to, level]) => Object.freeze({ from, to, level }))),
    profileVersion: "0.1", confidence: "provisional"
  });
}

export function validateProfiles(profiles) {
  const errors = [];
  if (!Array.isArray(profiles) || profiles.length !== 4) errors.push("profiles_count");
  const levels = new Set(["very_sheltered", "sheltered", "partial", "exposed", "very_exposed"]);
  const types = new Set(["bay", "beach", "natural_pool"]);
  for (const item of Array.isArray(profiles) ? profiles : []) {
    if (!item || !types.has(item.type) || !Number.isFinite(item.coastFacingDeg)
      || item.coastFacingDeg < 0 || item.coastFacingDeg >= 360 || !Array.isArray(item.sectors)) {
      errors.push(`${item?.id ?? "unknown"}:profile`);
      continue;
    }
    const coverage = new Uint8Array(360);
    for (const sector of item.sectors) {
      if (!levels.has(sector.level) || !Number.isFinite(sector.from) || !Number.isFinite(sector.to)
        || sector.from < 0 || sector.from > 360 || sector.to < 0 || sector.to > 360) {
        errors.push(`${item.id}:sector`);
        continue;
      }
      for (let degree = 0; degree < 360; degree += 1) {
        if (containsAngle(degree + 0.5, sector.from, sector.to)) coverage[degree] += 1;
      }
    }
    if (coverage.some((count) => count !== 1)) errors.push(`${item.id}:coverage`);
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function containsAngle(angle, from, to) {
  const normalized = ((angle % 360) + 360) % 360;
  if (from === 0 && to === 360) return true;
  if (from < to) return normalized >= from && normalized < to;
  return normalized >= from || normalized < to;
}
