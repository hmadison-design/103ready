# Sign-in: magic link plus email code

Built September 2026 on branch claude/signin as phase 1 of the paid tier
(see the project note "103Ready Paid Tier Architecture"). Dark by default.

## Switches

| Variable | Effect |
|---|---|
| `AUTH_ENABLED` | Unset: every /api/auth/* route answers 404 and /signin.html and /account.html say sign-in is not open. Set to anything: sign-in works. |
| `RESEND_API_KEY` | Sends the sign-in email through Resend. `MAIL_FROM` overrides the sender (default `103 Ready <signin@103ready.com>`; the domain must be verified at Resend). |
| `DEV_MAIL_ECHO` | With no mail provider, /api/auth/start returns the link and code in its JSON so previews and tests can complete the flow. Never set this in production. |

Apply `db/migrations/003_accounts.sql` in the D1 console before enabling.

## Flow

1. `POST /api/auth/start {email}`: rate limited to three per email per hour;
   stores SHA-256 hashes of a 48-hex link token and a six-digit code with a
   fifteen-minute expiry; emails both. Always `{ok:true}` for a valid email
   so the endpoint does not reveal which addresses have accounts.
2. `GET /api/auth/verify?t=<token>`: marks the login used, creates the user
   if new, sets the `r103_sid` cookie (HttpOnly, Secure, SameSite=Lax,
   thirty days), redirects to /account.html. Bad or reused tokens redirect
   to /signin.html?e=expired.
3. `POST /api/auth/code {email, code}`: same outcome via the code. Five wrong
   attempts lock that login (429); request a new one.
4. `GET /api/auth/me`: `{signedIn:false}` or `{signedIn:true,email}`.
5. `POST /api/auth/logout`: deletes the session row and clears the cookie.

The cookie value is a random 64-hex session id; only its hash is stored.
Nothing in `users`, `logins`, or `sessions` references a tracking visitor or
session id, and nothing in the tracking tables references a user.

## Tests

`node /home/claude/qa/auth_test.mjs` (Functions against SQLite: thirteen
checks including lockout, rate limit, expiry, reuse, and the no-mailer
production case) and `node /home/claude/qa/signin_pages.mjs` (headless
browser through the real Functions: dark notice, code path, link path,
logout redirect, reused link).

## Paid gate (phase 2)

`functions/_middleware.js` runs before every request. With `PAID_GATE` unset
it calls `next()` and nothing changes. With it set, a request for a paid
scenario (`functions/_paid.js`: every scenario slug except the free WINGS
pair, matched as `/slug`, `/slug.html`, or `/slug/`) is served only when
the session cookie resolves to a user whose row in `subscriptions`
(migration 004, kept current by the Stripe webhook in phase 3) has status
`active` or `trialing` and a `current_period_end` in the future. Everyone
else receives a short page, HTTP 200 so it renders everywhere, naming the
two free scenarios and pointing to sign-in or the account page. Everything
that is not a paid scenario passes through untouched, including assets,
APIs, and the free scenarios. If the database binding is missing the gate
fails open rather than locking every visitor out.

Switch-on order at launch: apply 003 and 004, set `AUTH_ENABLED`, complete
phase 3 (Stripe), then set `PAID_GATE`. Rollback is deleting `PAID_GATE`.

Test: `node /home/claude/qa/gate_test.mjs` (34 checks: unset passes
everything; set passes free, index, APIs, pages, assets; blocks paid with
no cookie, expired session, no subscription, canceled, period ended;
serves active and trialing; fails open without a database).
