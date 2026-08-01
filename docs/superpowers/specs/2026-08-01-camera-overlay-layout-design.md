# Camera Overlay Layout Design

## Goal

Keep the left side of public camera cards compact by placing partner logos
only in the existing right-hand logo area and rendering at most one logo.
Move fullscreen camera identity away from image detail at the bottom edge.

## Selection Rule

Select one display entity from the camera record:

1. When Sponsor has a logo, display Sponsor.
2. Otherwise, when Support has a logo, display Support.
3. Otherwise, display no right-hand logo.

Sponsor therefore wins only when both Sponsor and Support have logos. A Support
logo remains eligible when Sponsor exists but has no logo.

## Presentation

Sponsor and Support text attribution remains in the left overlay, preserving
its existing label, name, and optional link. Logos are suppressed in those
text blocks.

The selected entity contributes only its logo to the right-hand card area.
The logo has no accompanying text, background, padding, or visible container.
Its intrinsic aspect ratio is preserved with automatic width and height plus
maximum dimensions, so square logos remain square. Sponsor and Support logos
are never rendered together.

## Scope

This change affects the standard public camera card only. It does not change
canonical Sponsor or Support data, TV mode, map popups, editorial forms,
synchronization, or asset handling.

## Fullscreen Layout

Move the camera name and region identity from the bottom-left to the top-left
of fullscreen mode. Move its readability gradient with it, changing the
fullscreen gradient from a bottom-up fade to a top-down fade. Keep the close
button at the top-right and the Sponsor logo at the bottom-right. TV mode keeps
its current bottom overlay and gradient.

## Testing

Automated coverage must verify all four combinations of logo availability:
Sponsor only, Support only, both, and neither. It must also assert that the
card template keeps both text attributions on the left while rendering only
the selected logo on the right, without partner text or a visual wrapper.
Fullscreen coverage must assert top positioning and a top-down gradient
independently from the unchanged TV overlay.
