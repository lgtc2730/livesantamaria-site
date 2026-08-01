# Single Card Partner Logo Design

## Goal

Keep the left side of public camera cards compact by placing partner branding
only in the existing right-hand logo area and rendering at most one partner.

## Selection Rule

Select one display entity from the camera record:

1. When Sponsor has a logo, display Sponsor.
2. Otherwise, when Support has a logo, display Support.
3. Otherwise, display no partner block.

Sponsor therefore wins only when both Sponsor and Support have logos. A Support
logo remains eligible when Sponsor exists but has no logo.

## Presentation

The selected entity uses one shared right-aligned card block containing its
label, name, optional link, and logo. Sponsor and Support are never rendered
together. The left overlay retains only camera identity and operational or
editorial information; it contains no Sponsor or Support attribution.

## Scope

This change affects the standard public camera card only. It does not change
canonical Sponsor or Support data, fullscreen and TV modes, map popups,
editorial forms, synchronization, or asset handling.

## Testing

Automated coverage must verify all four combinations of logo availability:
Sponsor only, Support only, both, and neither. It must also assert that the
card template renders only the selected right-hand block and no left-hand
partner attribution.
