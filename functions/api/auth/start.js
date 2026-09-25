/**
 * POST /api/auth/start  { email }
 * Creates a login (hashed link token plus hashed six-digit code, fifteen
 * minute expiry) and emails both. Rate limit: three sends per email per
 * hour. Always answers 200 with { ok: true } for a well-formed email so the
 * endpoint does not reveal whether an address has an account.
 * With DEV_MAIL_ECHO set and no mail provider, returns { echo: { link, code } }
 * so previews and tests can complete the flow. Never set that in production.
 */
import { enabled, notFound, json, isEmail, normEmail, sha256, randomHex, sixDigits,
         loginExpiry, MAX_SENDS_PER_HOUR } from "../_auth.js";
import { sendSignInMail } from "../_mail.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!enabled(env)) { return notFound(); }
  if (!env.DB) { return json({ error: "sign-in is not available right now" }, 503); }
  let body; try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const email = normEmail(body.email);
  if (!isEmail(email)) { return json({ error: "Enter a valid email address." }, 400); }

  try {
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM logins WHERE email = ?1 AND created_at > datetime('now', '-1 hour')`
    ).bind(email).first();
    if (recent && recent.n >= MAX_SENDS_PER_HOUR) {
      return json({ error: "Too many sign-in emails in the last hour. Check your inbox, or try again later." }, 429);
    }
    const token = randomHex(24);
    const code = sixDigits();
    await env.DB.prepare(
      `INSERT INTO logins (email, token_hash, code_hash, expires_at) VALUES (?1, ?2, ?3, ?4)`
    ).bind(email, await sha256(token), await sha256(email + ":" + code), loginExpiry()).run();

    const origin = new URL(request.url).origin;
    const link = `${origin}/api/auth/verify?t=${token}`;
    const mail = await sendSignInMail(env, email, link, code);
    if (mail.sent) { return json({ ok: true }); }
    if (env.DEV_MAIL_ECHO) { return json({ ok: true, echo: { link, code } }); }
    return json({ error: "Sign-in email could not be sent. Try again in a few minutes." }, 503);
  } catch (e) {
    return json({ error: "sign-in is not available right now" }, 503);
  }
}
