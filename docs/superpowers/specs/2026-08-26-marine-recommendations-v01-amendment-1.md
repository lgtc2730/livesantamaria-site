# Marine Recommendations v0.1 — Normative Amendment 1

This amendment is part of the approved v0.1 design and resolves two previously unspecified normative baselines: relative-wind angular classes and initial bathing-season dates.

## Relative wind classification

`coastFacingDeg` is the azimuth from the bathing area toward the sea.

Meteorological `windDirectionDeg` is the direction **from which** the wind comes.

Compute the absolute circular angular difference:

`delta = circularAbs(windDirectionDeg - coastFacingDeg)`

where `delta` is normalized to the inclusive range `0°..180°`.

Classify using these exact half-open intervals, except for the final inclusive endpoint:

- `onshore`: `0° <= delta < 22.5°`
- `cross-onshore`: `22.5° <= delta < 67.5°`
- `cross-shore`: `67.5° <= delta < 112.5°`
- `cross-offshore`: `112.5° <= delta < 157.5°`
- `offshore`: `157.5° <= delta <= 180°`

These intervals are symmetric around the onshore/offshore axes and are normative for v0.1 tests and implementation.

Examples:

- Praia Formosa `coastFacingDeg = 190°`, wind from `190°` -> `delta = 0°` -> `onshore`.
- Praia Formosa `coastFacingDeg = 190°`, wind from `10°` -> `delta = 180°` -> `offshore`.
- Any exact boundary value belongs to the interval that starts at that boundary, e.g. `22.5°` is `cross-onshore`, `67.5°` is `cross-shore`, `112.5°` is `cross-offshore`, and `157.5°` is `offshore`.

## Initial bathing-season baseline

For the homepage teaser, v0.1 uses one configurable global bathing-season window.

Initial 2026 baseline:

- `start`: `2026-06-12`
- `end`: `2026-09-14`
- timezone: `Atlantic/Azores`
- both dates are inclusive.

This global window is derived from the four official 2026 Santa Maria bathing zones covered by the feature:

- Anjos: 12 June to 13 September 2026
- Formosa: 12 June to 13 September 2026
- Maia: 15 June to 14 September 2026
- São Lourenço: 15 June to 14 September 2026

For the global teaser, the baseline therefore starts when the first covered zone opens and ends when the last covered zone closes.

The value must remain editable through PWA/Control. It must not be hardcoded in a way that requires a deploy to change future seasons.

Normative visibility rule:

- homepage teaser visible when local `Atlantic/Azores` calendar date is `>= start` and `<= end`, provided marine data is not expired/unavailable;
- hidden before `start` and after `end`;
- Meteorology full module remains available year-round subject to normal freshness/unavailability rules.

## Status

These values are approved v0.1 baselines. Future changes to season dates are operational configuration changes, not changes to the core recommendation algorithm.
