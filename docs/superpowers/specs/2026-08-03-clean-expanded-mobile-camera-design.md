# Clean Expanded Mobile Camera Design

## Goal

Keep public camera cards compact by default on portrait phones and make their existing expanded state show an unobstructed camera image.

## Interaction

- On a portrait phone, a non-featured camera card starts in its existing compact layout.
- Tapping the card keeps the existing toggle behavior: the card expands on the first tap and returns to compact form on the next tap.
- The expanded portrait card shows only the camera media. The LVSM signature remains visible because it is embedded in the camera image itself.
- Desktop and landscape behavior remain unchanged.

## Expanded Portrait Presentation

While a compact mobile card has the `expanded-mobile` state, the site hides all card overlays and attribution that it adds over the media:

- the LIVE, checking, offline, testing, maintenance, or preparation status badge;
- camera name and message;
- sponsor and support text;
- sponsor or support partner logo;
- viewer information, if present.

The video, snapshot, editorial preview, or fallback image continues to fill the expanded card using the existing media sizing and crop behavior. No separate LVSM overlay is added.

## Scope and Boundaries

The change is presentation-only. It does not alter stream loading, camera state, audience tracking, card ordering, sponsor data, digital zoom, fallback selection, or fullscreen/TV rendering.

Promo cards and featured cards retain their current interaction and presentation. The clean expanded state applies only to the existing compact mobile camera cards.

## Implementation Approach

Use the existing `compact-mobile expanded-mobile` state as the sole trigger and add narrowly scoped mobile CSS rules that hide the site-generated overlays. The existing JavaScript toggle and `expandedMobileCards` state remain unchanged.

This avoids introducing another interaction mode, keeps the change reversible with the existing second tap, and preserves landscape and desktop behavior by containing the rules within the current mobile breakpoint.

## Testing

Add a source-level regression test that verifies:

- expanded compact mobile cards hide the status badge, camera information, partner logo, and viewer information;
- the media element remains visible and fills the expanded card;
- the clean presentation is scoped to the mobile rules and does not hide overlays globally;
- the existing tap toggle still controls `expanded-mobile` without opening a different view.

Run the focused presentation tests and the complete public-site test suite.
