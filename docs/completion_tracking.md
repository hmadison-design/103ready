# Completion Tracking — 103ready.com

Anonymous start/completion analytics for every scenario, built on Cloudflare
Pages Functions and D1. This is the foundation for WINGS completion
validation, sponsor reporting, and the free/paid tier decision. No accounts,
no cookies, no PII: a random per-tab session id, scenario slug, ending name,
and a timestamp. That's the whole record.

## The pieces

| File | What it does |
|---|---|
| `shared/tracking.js` | Compiled into every scenario's Story JavaScript by `build.sh`. Fires one `start` event per browser session per scenario and one `ending` event per distinct ending reached. Handles all three ending conventions in the library (tagged `ending`, `Ending-*` names, `End*` names). Fails silent; can never break gameplay. |
| `functions/api/track.js` | Pages Function. `POST /api/track` validates and inserts events into D1. |
| `functions/api/stats.js` | Pages Function. `GET /api/stats` returns per-scenario starts, ending events, unique completing sessions, and a per-ending breakdown. Optionally protected by a `STATS_TOKEN` env var (`?token=...`). |
| `db/schema.sql` | The one-table D1 schema. Apply once. |
| `build.sh` | Changed in one place: each tweego call now includes `shared/tracking.js`. |

## Deploy checklist (one time)

1. **Create the D1 database.** Either from the dashboard (Workers & Pages →
   D1 → Create database, name it `r103-tracking`) or via wrangler:
   `wrangler d1 create r103-tracking`.
2. **Apply the schema.** Dashboard: open the database → Console → paste
   `db/schema.sql` and run. Wrangler:
   `wrangler d1 execute r103-tracking --remote --file=db/schema.sql`.
3. **Bind it to the Pages project.** Pages project `103ready` → Settings →
   Functions (Bindings) → D1 database bindings → Add: variable name `DB`,
   database `r103-tracking`. The variable name must be exactly `DB`.
4. **(Optional) protect stats.** Same settings page → Environment variables →
   add `STATS_TOKEN` with a long random value. Then stats requires
   `?token=<value>`. Skip this and `/api/stats` is public aggregate counts.
5. **Commit and push.** The normal Pages build picks up `functions/` at the
   repo root automatically and recompiles every scenario with tracking baked
   in. Nothing else changes.

## Verify after deploy

1. Open any scenario, play to any ending.
2. Hit `https://103ready.com/api/stats` (with `?token=...` if set). You
   should see one `start` and one ending event for that scenario.
3. Browser dev tools → Network: the `/api/track` POSTs should return 204.

## Reading the numbers

- `starts` = sessions that opened the scenario.
- `ending_events` = ending passages reached (a replayer reaching two
  different endings in one session counts twice, by design; same ending
  twice counts once).
- `unique_completers` = distinct sessions that reached at least one ending.
- Completion rate ≈ `unique_completers / starts`. This is the sponsor
  number, and the WINGS-relevant one.

## Honest limits (don't oversell these numbers)

- A "session" is a browser tab, not a person. One pilot across two devices
  is two sessions; sessionStorage clears when the tab closes.
- Everything is client-side and spoofable by anyone who opens dev tools.
  Fine for analytics and sponsor reporting at honest granularity; NOT
  sufficient alone as proof-of-completion for WINGS credit. The WINGS layer
  will need a claim step on top (pilot identifies themselves at an ending,
  server records it against the session's event trail). That's phase 2,
  deliberately not built yet.
- Ad blockers that kill `sendBeacon`/`fetch` will undercount slightly.
  Every analytics system on earth shares this caveat.

## What phase 2 adds (when WINGS listing is real)

A `claim` endpoint and a small form at the ending passages of the free
WINGS scenarios: name + FAA Tracking Number (FTN), tied to the session's
completion events, giving Harvey a validation queue to approve credits
from. The schema above was designed so this bolts on without migration.
