# Audience v2 security and retention design

Date: 2026-08-04
Status: approved
Repository: `livesantamaria-site`
Branch: `lab`

## Purpose

Preserve the audience metrics required for release v2 while bounding anonymous writes, minimizing pseudonymous data, and enforcing a 30-day retention period. This work remediates the validated finding that `POST /api/audience/event` permits unbounded D1 writes.

The design does not create users, attach audience sessions to Control identities, or move the Control API into production.

## Product contract

The public site records only these events:

- `visit`: once per 30-minute browser session;
- `camera_view`: once per public camera during that session.

The Control audience panel shows:

- visits today;
- visits yesterday;
- visits during the last 7 days;
- visits during the last 30 days;
- the most-viewed cameras within the retained 30-day window.

The existing all-time total and activation date are removed because their source events will not be retained indefinitely.

## Data minimization

The event store contains only:

- creation timestamp;
- allowed event type;
- public camera identifier when required;
- random, ephemeral session identifier;
- canonical public host;
- deterministic event key used for deduplication.

It does not intentionally store IP address, user agent, email, Cloudflare Access identity, account identifier, free-form text, or arbitrary request fields. The session identifier is treated as pseudonymous data and never joined to another identity source.

The browser session lasts 30 minutes after the most recent activity. Its local state contains only the random session identifier, last-activity timestamp, visit-sent flag, and public camera IDs already counted.

## Ingestion validation

`POST /api/audience/event` accepts JSON only from the canonical production host and enforces a small explicit request-size limit before parsing.

The accepted object contains exactly:

- `event`;
- `session`;
- optional `camera`.

Rules:

- `event` is exactly `visit` or `camera_view`;
- `session` is a UUID produced by the browser and has a fixed maximum length;
- `camera` is absent/null for `visit`;
- `camera` is required for `camera_view`, follows the repository's safe public-ID pattern, has a fixed maximum length, and refers to a public camera known to the published catalog;
- unknown fields, malformed JSON, invalid types, invalid identifiers, and inconsistent event/camera pairs are rejected;
- a body beyond the limit returns `413`;
- invalid content returns `400` without reflecting the payload;
- D1 failures return a safe service error without SQL or internal details.

The exact byte and identifier limits will be constants shared by validation and tests. They must comfortably accept the existing browser payload while rejecting arbitrary growth.

## Deduplication and database shape

Each accepted event receives a deterministic key:

- `visit:<session>`;
- `camera_view:<session>:<camera>`.

The D1 schema adds a non-null `event_key` with a unique index. Ingestion uses uniqueness as the authoritative server-side deduplication boundary. A duplicate valid request returns success without adding another row.

The migration must preserve existing rows. Existing data receives deterministic keys derived from its current fields; duplicate legacy rows are reconciled deterministically before the unique index is created. Applied migrations are immutable, so this is a new additive migration.

Deduplication limits accidental retries and repeated browser submissions. It does not replace edge rate limiting because a malicious client can generate distinct UUIDs.

## Edge abuse control

A Cloudflare WAF rate-limiting rule targets only the canonical production `POST /api/audience/event` path and uses the Cloudflare Rate Limiting Rule IP counting characteristic (`ip.src`), rather than writing client-network identifiers to D1.

Rollout:

1. inspect normal and peak request-rate analytics for this exact path;
2. record the measured requests per period and create the rule with the threshold supported by the account plan;
3. under a first explicit approval, use observation/log behavior when the plan exposes it, or a deliberately permissive measured threshold otherwise;
4. record plan-supported mitigation behavior and timeout; for a managed challenge without a duration control, record `N/A — challenge/throttling while the rule qualifies` rather than inventing a timeout;
5. collect observation evidence and run a controlled authorized test that exceeds the threshold without using visitor traffic;
6. under a second explicit approval, change to block or managed challenge only after the threshold is validated, and prove the effective action triggers;
7. document the final expression, IP characteristic, threshold, period, action/timeout, owner, review date, and false-positive result without exporting visitor identifiers. Later edits require separate approval.

The release gate is not satisfied until an effective limiting action is enabled and tested. Application validation alone does not close the resource-consumption finding.

## Retention Worker

A dedicated scheduled Worker belongs to the Site analytics boundary, not to the Control API. It has no public HTTP route and runs once daily.

Its only data operation is a parameterized deletion of audience events whose `created_at` is older than 30 days relative to the execution time. It reports only execution status, timestamp, duration, and deleted-row count. It never logs event rows, session identifiers, camera-level payloads, IP addresses, or credentials.

The Worker uses a dedicated D1 binding and least-privilege deployment credentials. Its name, schedule, binding, and deployment ownership are documented without secret values. Failure is visible to technical administration and does not silently extend the declared retention period: an alert or release-runbook check must identify a missed successful run.

Retention tests verify the cutoff boundary, idempotent repeated runs, empty tables, database errors, and logs that contain counts but no row data.

## Summaries and access

All summary queries explicitly include the 30-day retained window. No endpoint returns event rows or session identifiers. For v2, the summary endpoint remains public and aggregate-only, while presentation through the Control UI remains subject to the Control's Cloudflare Access policy. The response contains no session-level data and this decision does not authorize exposing raw events. Restricting the aggregate endpoint can be reviewed later without changing the event-store contract.

## Logging and failure handling

Application logs must not contain:

- session identifiers or event keys;
- full request bodies;
- cookies, IP addresses, JWTs, tokens, or Access identity;
- SQL statements with bound values.

Allowed operational fields are event type, sanitized public camera ID when needed for diagnosis, response category, duration, D1 result category, and aggregate affected-row count.

Malformed and abusive requests produce bounded responses. A telemetry failure never prevents the public Site or camera playback from operating.

## RGPD and privacy requirements

The implementation follows data-minimization and storage-limitation principles. Technical implementation is not a legal determination and does not, by itself, establish the applicable lawful basis or whether local storage requires consent under Portuguese electronic-communications rules.

Before production release, technical administration and the responsible project owner must record:

- the controller and privacy contact;
- the precise analytics purpose;
- the lawful basis selected for the processing;
- the assessment of consent requirements for the browser's `localStorage` identifier;
- recipients/processors and relevant Cloudflare terms;
- the 30-day raw-event retention period;
- how data-subject rights and objections are handled;
- whether a DPIA or other documented balancing/necessity assessment is required;
- the operational owner for deletion and retention evidence.

No claim such as “anonymous analytics”, “no cookies”, or “consent not required” may be published unless it has been legally and technically verified.

## Testing and acceptance

Automated tests cover:

- accepted `visit` and `camera_view` payloads;
- invalid event types, UUIDs, camera IDs, types, field combinations, extra fields, malformed JSON, and oversized bodies;
- catalog validation for public cameras;
- duplicate visits and camera views creating no additional row;
- safe behavior under D1 failure;
- summaries bounded to 30 days and removal of all-time semantics;
- cleanup immediately before, at, and after the cutoff;
- cleanup idempotency and error reporting;
- absence of session identifiers and payloads from logs;
- browser behavior remaining non-blocking when telemetry fails.

Release validation also requires:

- the full Site suite passing;
- a clean D1 migration rehearsal on a disposable database;
- a read-only review of WAF rule scope and effective action;
- evidence of one successful scheduled cleanup;
- confirmation through a parsed-timestamp (`julianday`) aggregate query that events older than 30 days are absent, backed by an exact cutoff-boundary test;
- confirmation that normal visitor and camera-view flows are not rate-limited.

## Rollback

Before release, privately record tested, schema-compatible Pages commit and Worker deployment/version rollback targets; never roll back to an unspecified preceding commit. If no compatible prior Worker exists, its disablement requires a separately approved temporary-retention procedure with an owner. The unique schema addition remains forward-compatible and is not destructively removed. The WAF rule can return to observation or a higher threshold only with separate approval and measured evidence; disabling effective abuse control reopens the security finding and blocks release acceptance.

Time Travel restore is destructive: it can resurrect events deleted since the bookmark, lose later writes, and restore a schema incompatible with the current code. Capture a private bookmark immediately before the migration. Before an approved restore, validate the Pages commit and Worker version against the target schema. After restoring, separately approve and run the reviewed retention cleanup, prove with the parsed-timestamp aggregate that zero expired rows remain, and only then reopen service.

## Explicit follow-up: privacy policy and related records

Immediately after the audience security/retention implementation, create and review the privacy documentation before production promotion. This is saved as required follow-up work, not an optional note.

Deliverables:

- public Privacy Policy in Portuguese, with an appropriate additional language only if required;
- cookies/localStorage notice accurately describing the 30-minute audience session;
- documented lawful-basis and consent assessment;
- record of processing purpose, fields, recipients, access, and 30-day retention;
- data-subject rights/contact procedure;
- processor/subprocessor review for Cloudflare and hosting services;
- internal retention/cleanup operating record and evidence checklist;
- review of console/log retention and masking;
- publication/versioning date and named policy owner.

These documents must describe the final deployed behavior, not merely this design.
