# WINGS completion: knowledge check, completion codes, submissions

Built September 2026 on branch claude/wings-completion. Read the project
note "103Ready WINGS Scenario Recommendation" for why it is shaped this way.

## What a learner sees

On any tagged ending of a scenario that has a question pool, a panel
appears under the passage: "Scenario complete", one sentence, and a button.
The button loads five questions drawn at random from that scenario's pool
of ten. Four correct is a pass. On a pass the server mints a completion
code and the panel shows it with a link to /wings.html, where the learner
enters the code and the email on their FAASafety.gov account. On a miss the
panel shows the explanations and offers a fresh set.

Scenarios without a pool see nothing. Nothing in any .twee file changed.

## Pieces

| File | Role |
|---|---|
| `functions/api/_questions/<slug>.js` | Question pool, ten per scenario, answers included. Underscore path, so it is not a route and never leaves the server. |
| `functions/api/_questions/index.js` | Registry. Add a line here to enable a scenario. |
| `functions/api/_lib.js` | Code minting and verification, helpers. |
| `functions/api/check.js` | GET serves five questions (answers stripped) with a signed "set" token; POST grades server-side and mints a code on a pass. |
| `functions/api/wings.js` | POST stores a verified code plus email; GET (bearer STATS_TOKEN) lists submissions for the admin page; POST with `validated: true` and the token marks one done. |
| `shared/knowledge_check.js` | Compiled into every scenario after tracking.js. Renders the panel. |
| `public/wings.html` | Submission page. |
| `public/admin.html` | "WINGS submissions" panel with a Mark validated button. |
| `db/migrations/002_wings_completion.sql` | `completions` (issued codes) and `wings_submissions` tables. |

## Completion codes

Format `TAG-RANDOM8-SIG6`, for example `THEFOR-YC7WVHY8-66D852`. TAG is the
first six letters of the slug, RANDOM8 is eight base32 characters (no I, L,
O, U, 0, 1), and SIG6 is the first six hex characters of
HMAC-SHA256(COMPLETION_SECRET, TAG-RANDOM8). A code is self-verifying: the
server can check one without a database lookup. Without the secret nobody
can mint or forge one. Issuance is also logged to `completions` when the
table exists, so the admin page can show which scenario and score a
submitted code belongs to.

The five-question "set" a learner is served is signed the same way, so a
client cannot swap in five questions it likes better.

## Switching it on

1. Apply `db/migrations/002_wings_completion.sql` in the D1 console.
2. Set a `COMPLETION_SECRET` environment variable on the Pages project
   (Settings, Environment variables, Production). Any long random string.
   Until it is set, `/api/check` grades but issues no code and the panel
   says nothing about credit; `/api/wings` returns 503.
3. File the activities on FAASafety.gov. The paste-ready text is in the
   recommendation note.

Turning it off again is deleting the environment variable.

## What it does not do

It cannot prove that the person who typed the code is the person who
played. Neither can any online course. A learner can replay a scenario and
take the check again; each pass mints a new code, and `completions` shows
how many were issued per session. If someone submits several codes under
one email, the admin page will show it.

## Honest limits carried over from completion_tracking.md

Everything in the scenario is still client-side. The check is the one part
that is graded on the server, and the code is the one artifact that can be
verified later. Treat the pair as "good enough for a Training Provider to
validate by hand," which is what the WINGS User's Guide describes.
