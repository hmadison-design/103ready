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
