# Audience metrics consent design

Date: 2026-08-04
Status: approved
Repository: `livesantamaria-site`
Branch: `lab`

## Purpose

Audience metrics for release v2 require prior, explicit visitor consent. Until consent is granted, the browser must not create or read the audience session in `localStorage` and must not send `visit` or `camera_view` events. Refusal must not limit the public Site, cameras, map, or other essential features.

## Public choice

On the first visit, show a compact privacy panel in Portuguese with equally prominent actions:

- `Aceitar métricas`;
- `Recusar`.

The panel explains that optional audience metrics use a random 30-minute browser session, record visits and opened public cameras, retain raw events for 30 days, and are not associated with a named account. It links to the privacy information once that page exists.

No option is preselected. Closing the panel is not consent and leaves metrics disabled. The Site must remain usable while the choice is pending.

## Stored state

The consent decision uses a dedicated first-party `localStorage` key with a versioned value. The audience-session key remains separate. An accepted decision enables the existing 30-minute audience session. A refused decision removes any pre-existing audience-session value and suppresses all audience events.

The visitor can reopen privacy settings from the footer. Withdrawing consent immediately removes the local audience session and stops later events. It cannot retroactively identify and delete earlier pseudonymous events because the project keeps no durable mapping between the visitor and a past random session; this limitation must be described accurately in the privacy information.

## Roles and contact

- Responsible for the processing: Luis Mesquita, acting in an individual capacity.
- Technical and operational responsible: Luis Carreiro, acting in an individual capacity. This title does not designate a Data Protection Officer.
- Public project and privacy contact: `livesantamaria.project@gmail.com`.

No telephone number or postal address is to be invented or published. The privacy text must be reviewed if further contact particulars are legally or operationally required.

## Technical behavior

Consent gates `getAudienceSession`, `sendAudienceEvent`, `trackVisit`, and `trackCameraView`. Calls made before acceptance are safe no-ops. Granting consent creates the session and records one visit. Refusal or withdrawal removes the audience-session key. A later acceptance starts a new session rather than recovering an earlier identifier.

Unavailable or blocked `localStorage` leaves metrics disabled and never blocks Site operation. The consent UI must be keyboard accessible, responsive, and compatible with the existing visual language.

## Verification and release boundary

Automated browser-code tests must prove:

- no session storage access or audience request occurs before a positive choice;
- refusal emits nothing and removes legacy audience state;
- acceptance emits one visit and enables camera-view deduplication;
- withdrawal removes audience state and stops later events;
- a stored accepted/refused decision is respected on reload;
- storage and network failures do not affect the Site.

This change is prepared and tested on `lab`. It does not authorize promotion to `main`, deployment, remote D1 changes, WAF activation, or publication of a privacy policy. The public privacy information must describe the final deployed behavior and be approved before production release.
