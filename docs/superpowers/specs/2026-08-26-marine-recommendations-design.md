# Marine Recommendations v0.1 — Design

## Purpose

Add a public Live Santa Maria feature that answers, in simple language:

> **Escolha onde ir hoje. 🌊 Onde está melhor o mar?**

The feature compares four bathing locations on Santa Maria using one common offshore marine forecast, local exposure profiles, location type, and wind. It is advisory only and must not claim bathing safety.

## Initial locations

| Location | Type | Camera | Target area |
|---|---|---|---|
| São Lourenço | `bay` | `slourenco-sul` | praia/zona balnear central |
| Maia | `natural_pool` | `maia-norte` | zona balnear/piscina natural |
| Praia Formosa | `beach` | `praia-poente` | praia/zona balnear central |
| Anjos | `natural_pool` | `anjos-porto` | zona balnear/piscina natural |

No additional bathing locations are planned for v0.1 or the current future roadmap.

All profiles start as:

- `profileVersion: 0.1`
- `confidence: provisional`

and may evolve to `validated` and later `calibrated`.

## Public UX

### Homepage

During bathing season only, show a very compact clickable strip immediately below the Hero.

Desktop target: one line where space permits; mobile: at most two lines.

Example:

> **Escolha onde ir hoje. 🌊 Onde está melhor o mar?** Água 22 °C · NW · 1,2 m →

The whole strip links to the marine recommendation module on the Meteorology page.

Outside bathing season, the homepage teaser is hidden.

### Meteorology page

The full module is always available and appears before the classic meteorology section.

Desktop:

- compact full-width header/context row;
- four locations side by side;
- one shared expanded detail row below the grid;
- only one location expanded at a time.

Mobile:

- 2×2 recommendation grid;
- selected detail row below.

Each location shows a compact status and human message. The expanded detail shows marine/wind data and a **Ver câmara** action.

The module always shows this disclaimer:

> **Indicação baseada na previsão do mar e vento. Confirme sempre as condições no local.**

Do not use wording such as “seguro para banho”.

## Public language

Avoid technical jargon such as `swell`, `onshore`, or `hard cap` in public UI.

Preferred terms:

- `swell` → **ondulação**
- `swell height` → **altura das ondas**
- `swell period` → **período das ondas**
- long-period/high-energy conditions → **ondas com bastante energia**
- `onshore wind` → **vento de frente para a costa**
- `hard cap` → never name it; explain the cause

Public ratings:

- `excellent` → 🟢 **Muito bom**
- `good` → 🟢 **Bom**
- `moderate` → 🟡 **Razoável**
- `exposed` → 🟠 **Exposto**
- `very_exposed` → 🔴 **Muito exposto**

The word **recomendado** is only allowed for `excellent`.

## External data

Use one common offshore point for Santa Maria in v0.1.

### Normative offshore point v0.1

The implementation MUST use the following common offshore reference point in v0.1:

```json
{
  "latitude": 36.85,
  "longitude": -25.20,
  "offshorePointVersion": "0.1",
  "confidence": "provisional"
}
```

This is a deliberate operational baseline, not a claim that the point is the final oceanographic optimum. Changing it later is a source/configuration calibration, not an engine-algorithm change.

Marine inputs:

- swell direction
- swell height
- swell period
- combined wave height as context/control
- sea-surface temperature as informational context only

Wind inputs:

- direction
- mean speed
- gust speed

Sea temperature never affects the recommendation score.

The engine must not compute a recommendation when critical marine inputs (direction, height, or period) are unavailable.

## Architecture

Keep the feature outside Control runtime responsibilities.

High-level flow:

1. public-site backend fetches and normalizes external marine/weather data;
2. recommendation engine evaluates all four locations;
3. public presentation contract is produced;
4. homepage teaser and Meteorology module consume the same result.

Logical components:

- `marine-source` — external fetch + normalization;
- `recommendation-engine` — scoring, hard caps, reasons;
- `presentation-contract` — simple public JSON.

The frontend must not recalculate recommendation logic.

## Editable configuration vs versioned rules

### Editable through PWA/Control

A new **Mar / Recomendações balneares** area edits local profiles and operational parameters:

- type;
- associated camera;
- target area label;
- active/inactive state;
- coastline facing/orientation;
- directional exposure sectors;
- profile confidence;
- profile version metadata;
- bathing-season configuration.

The PWA should provide:

- sector table / compass-style visualization;
- profile scenario simulator;
- change history;
- global engine rules visible read-only.

### Kept in versioned code

Do not make the following editable in v0.1:

- core scoring formula;
- base weights by location type;
- hard-cap rules;
- reason priority rules;
- core message mapping logic.

## Local profile model

Each profile defines directional sectors with levels:

- `very_sheltered`
- `sheltered`
- `partial`
- `exposed`
- `very_exposed`

Directional scores:

- `very_sheltered`: 100
- `sheltered`: 80
- `partial`: 55
- `exposed`: 25
- `very_exposed`: 0

### Normative directional smoothing v0.1

Use:

```text
directionTransitionHalfWidthDeg = 10
```

This means each sector boundary has a total 20° transition zone: ±10° around the boundary. Interpolate linearly between the score on one side and the score on the other side. Angular distance MUST be circular, so transitions across 0°/360° behave identically to all other boundaries.

Example: for a boundary at 50° between scores 80 and 25, transition from 80 at 40° through the midpoint at 50° to 25 at 60°.

## Normative initial profile geometry v0.1

These values are the approved baseline for implementation and testing. They remain deliberately `provisional` pending local validation. Later changes to sectors or `coastFacingDeg` are local-profile calibration and MUST NOT require changes to the recommendation algorithm.

### São Lourenço

- `type`: `bay`
- `cameraId`: `slourenco-sul`
- `targetArea`: praia/zona balnear central
- `coastFacingDeg`: `85`

| From | To | Level |
|---:|---:|---|
| 210° | 330° | `very_sheltered` |
| 330° | 20° | `sheltered` |
| 20° | 50° | `partial` |
| 50° | 120° | `exposed` |
| 120° | 160° | `partial` |
| 160° | 210° | `sheltered` |

### Maia

- `type`: `natural_pool`
- `cameraId`: `maia-norte`
- `targetArea`: zona balnear/piscina natural
- `coastFacingDeg`: `100`

| From | To | Level |
|---:|---:|---|
| 210° | 330° | `very_sheltered` |
| 330° | 20° | `sheltered` |
| 20° | 130° | `exposed` |
| 130° | 180° | `partial` |
| 180° | 210° | `sheltered` |

### Praia Formosa

- `type`: `beach`
- `cameraId`: `praia-poente`
- `targetArea`: praia/zona balnear central
- `coastFacingDeg`: `190`

| From | To | Level |
|---:|---:|---|
| 330° | 70° | `very_sheltered` |
| 70° | 120° | `sheltered` |
| 120° | 145° | `partial` |
| 145° | 235° | `exposed` |
| 235° | 280° | `partial` |
| 280° | 330° | `sheltered` |

### Anjos

- `type`: `natural_pool`
- `cameraId`: `anjos-porto`
- `targetArea`: zona balnear/piscina natural
- `coastFacingDeg`: `285`

| From | To | Level |
|---:|---:|---|
| 30° | 150° | `very_sheltered` |
| 150° | 190° | `partial` |
| 190° | 330° | `exposed` |
| 330° | 30° | `partial` |

## Base weights by location type

| Type | Direction | Height | Period | Wind |
|---|---:|---:|---:|---:|
| `bay` | 50% | 20% | 20% | 10% |
| `beach` | 35% | 25% | 25% | 15% |
| `natural_pool` | 35% | 30% | 25% | 10% |

Each component is scored 0–100 before weighting.

## Wave-height curve

| Height | Score |
|---|---:|
| ≤ 0.4 m | 100 |
| 0.5 m | 95 |
| 0.8 m | 85 |
| 1.0 m | 75 |
| 1.3 m | 60 |
| 1.5 m | 50 |
| 1.8 m | 35 |
| 2.0 m | 25 |
| 2.5 m | 10 |
| ≥ 3.0 m | 0 |

Interpolate between defined points.

## Wave-period curve

| Period | Score |
|---|---:|
| ≤ 6 s | 100 |
| 7 s | 95 |
| 8 s | 90 |
| 10 s | 80 |
| 12 s | 65 |
| 14 s | 45 |
| 16 s | 25 |
| ≥ 18 s | 10 |

Interpolate between defined points.

Height and period must also be evaluated together for high-energy hard-cap conditions.

## Wind model

Wind is a comfort modifier and possible limiter, never a replacement for the marine assessment.

Relative wind classes:

- offshore
- cross-offshore
- cross-shore
- cross-onshore
- onshore

Base speed score:

| Mean wind | Score |
|---|---:|
| < 10 km/h | 100 |
| 10–20 | 85 |
| 20–30 | 65 |
| 30–40 | 40 |
| > 40 | 15 |

Orientation adjustment:

- offshore: +10
- cross-offshore: +5
- cross-shore: 0
- cross-onshore: -10
- onshore: -20

Clamp result to 0–100.

Gusts are treated as exceptional penalties and may impose hard caps.

The normative v0.1 coastline-facing values are defined in the initial profile geometry above and MUST be used for relative wind classification until changed through an approved profile calibration.

## Marine hard caps

Principle:

> A favourable direction may improve a recommendation, but cannot erase very strong or high-energy sea conditions.

### `bay`

- height ≥ 2.5 m and period ≥ 15 s → max 69
- height ≥ 3.0 m → max 49
- height ≥ 3.5 m → max 29

### `beach`

- height ≥ 2.0 m and period ≥ 14 s → max 69
- height ≥ 2.5 m and period ≥ 14 s → max 49
- height ≥ 3.0 m → max 29
- height ≥ 3.5 m → max 29

### `natural_pool`

- height ≥ 1.5 m and period ≥ 14 s → max 69
- height ≥ 2.0 m and period ≥ 14 s → max 49
- height ≥ 2.5 m → max 29
- height ≥ 3.5 m → max 29

Whenever a cap changes the result, persist the cap reason.

## Wind hard caps

Provisional v0.1 rules:

### `beach`

- gusts ≥ 50 km/h with onshore/cross-onshore flow → max 69
- gusts ≥ 60 km/h → max 49

### `bay`

- gusts ≥ 55 km/h → max 69
- gusts ≥ 65 km/h → max 49

### `natural_pool`

- gusts ≥ 50 km/h → max 69
- gusts ≥ 60 km/h → max 49

Wind caps must also store a reason.

## Final rating bands

- 85–100 → `excellent`
- 70–84 → `good`
- 50–69 → `moderate`
- 30–49 → `exposed`
- 0–29 → `very_exposed`

Do not expose the numeric score as a claim of precision in the public UI. It remains available internally for ordering, debugging, and calibration.

Near-equal scores should not be presented as meaningful precision differences.

## Reason selection

Persist all detected reasons internally, then select one dominant reason and at most one secondary reason for public presentation.

Priority order:

1. hard cap
2. strong sea + long period/high energy
3. very unfavourable directional exposure
4. high waves
5. long period
6. strong unfavourable wind
7. partial/moderate exposure
8. favourable protection

If a hard cap applies, it always becomes the dominant reason.

Example public messages:

- **Muito abrigado · recomendado**
- **Boa opção · mar pouco mexido**
- **Alguma ondulação**
- **Abrigado da direção, mas com mar forte**
- **Muito exposto à ondulação de oeste**
- **Mar forte junto à zona balnear**
- **Ondas com bastante energia**
- **Vento forte junto à costa**

## Public API contract

Expose one public read-only endpoint, initially:

`/api/marine-recommendations`

The response contains:

- generation time;
- forecast-valid time;
- freshness state;
- common sea-temperature / wave summary;
- normalized marine/wind conditions;
- ordered location results;
- internal score and pre-cap score;
- public rating;
- reason codes;
- human message;
- hard-cap metadata;
- profile version/confidence;
- disclaimer.

Homepage and Meteorology use the same payload.

## Cache and stale-data policy

Initial cache target: 30 minutes.

Data states:

- `fresh`: up to 60 minutes old;
- `stale`: 60–180 minutes old;
- `expired`: more than 180 minutes old.

Behaviour:

- `fresh`: normal display;
- `stale`: display with a discreet stale-data note;
- `expired`: do not present the ranking as current.

When expired/unavailable:

- hide homepage teaser;
- on Meteorology show **Recomendações temporariamente indisponíveis.**

Never silently present old rankings as current.

Persist/return at least:

- source update time;
- computation time;
- freshness status.

Missing sea temperature alone does not disable recommendations.

## Initial profile geometry status

The four normative v0.1 profiles above remain provisional until local validation. The implementation must keep geometry separate from engine logic so sector corrections require profile changes, not algorithm changes.

Praia Formosa is explicitly tied to the central official bathing area and camera `praia-poente`.

Anjos is evaluated as `natural_pool`.

## Future evolution

Out of scope for v0.1 but intentionally compatible with the design:

- secondary swell/ondulation analysis;
- multiple offshore points if later justified;
- morning/afternoon/end-of-day recommendation windows;
- historical calibration;
- separate `surf` mode with different rules from bathing mode;
- confidence evolution `provisional` → `validated` → `calibrated`.

No expansion to additional bathing locations is currently planned.

## Testing expectations

Implementation should be test-driven and cover at minimum:

- interpolation curves;
- angular sector boundaries including wraparound at 0°;
- the normative ±10° directional smoothing transition;
- normative profile sectors for all four locations;
- normative `coastFacingDeg` values and relative wind classification;
- normative offshore point configuration;
- weight selection by type;
- marine hard caps;
- wind hard caps;
- hard-cap reason dominance;
- rating bands;
- language/message selection;
- stale/expired fallback behaviour;
- endpoint contract;
- homepage teaser seasonal visibility;
- Meteorology compact/expanded behaviour;
- PWA profile editing and validation;
- scenario simulator;
- audit/history persistence.

## Success criteria

v0.1 is successful when:

1. the public site can obtain one consistent recommendation payload for all four locations;
2. recommendation outputs are explainable and never silently overridden by hard caps;
3. homepage and Meteorology render compactly from the same data;
4. local profile changes are editable through PWA/Control without changing core engine code;
5. stale and unavailable external data fail conservatively;
6. no public message claims bathing safety;
7. provisional profile geometry can be corrected after local validation without redesigning the engine.
