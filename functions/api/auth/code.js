/**
 * POST /api/auth/code  { email, code }
 * The six-digit alternative to the link. Checks the newest unused, unexpired
 * login for that email; five wrong attempts lock that login. On success,
 * same as the link: user row, session cookie, { ok: true }.
 */
import { enabled, notFound, json, isEmail, normEmail, sha256, findOrCreateUser,
         createSession, setCookieHeader, MAX_ATTEMPTS } from "../_auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!enabled(env)) { return notFound(); }
  if (!env.DB) { return json({ error: "sign-in is not available right now" }, 503); }
  let body; try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const email = normEmail(body.email);
  const code = String(body.code || "").replace(/\D/g, "");
  if (!isEmail(email) || code.length !== 6) { return json({ error: "Enter your email and the six-digit code." }, 400); }
  try {
    const row = await env.DB.prepare(
      `SELECT id, code_hash, attempts FROM logins
        WHERE email = ?1 AND used_at IS NULL AND expires_at > datetime('now')
        ORDER BY id DESC LIMIT 1`
    ).bind(email).first();
    if (!row) { return json({ error: "That code has expired. Request a new one." }, 400); }
    if (row.attempts >= MAX_ATTEMPTS) { return json({ error: "Too many wrong codes. Request a new one." }, 429); }
    if (row.code_hash !== await sha256(email + ":" + code)) {
      await env.DB.prepare(`UPDATE logins SET attempts = attempts + 1 WHERE id = ?1`).bind(row.id).run();
      const left = MAX_ATTEMPTS - row.attempts - 1;
      return json({ error: left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Request a new one." }, left > 0 ? 400 : 429);
    }
    await env.DB.prepare(`UPDATE logins SET used_at = datetime('now') WHERE id = ?1`).bind(row.id).run();
    const user = await findOrCreateUser(env, email);
    const sid = await createSession(env, user.id);
    return json({ ok: true }, 200, { "Set-Cookie": setCookieHeader(sid, request) });
  } catch (e) { return json({ error: "sign-in is not available right now" }, 503); }
}
