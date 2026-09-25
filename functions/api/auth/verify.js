/**
 * GET /api/auth/verify?t=<token>
 * The magic link. Marks the login used, creates the user if new, sets the
 * session cookie, and redirects to /account.html. Bad or expired tokens
 * redirect to /signin.html?e=expired.
 */
import { enabled, notFound, sha256, findOrCreateUser, createSession, setCookieHeader } from "../_auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!enabled(env)) { return notFound(); }
  const url = new URL(request.url);
  const token = url.searchParams.get("t") || "";
  const fail = () => Response.redirect(url.origin + "/signin.html?e=expired", 302);
  if (!/^[0-9a-f]{48}$/.test(token) || !env.DB) { return fail(); }
  try {
    const row = await env.DB.prepare(
      `SELECT id, email FROM logins
        WHERE token_hash = ?1 AND used_at IS NULL AND expires_at > datetime('now')`
    ).bind(await sha256(token)).first();
    if (!row) { return fail(); }
    await env.DB.prepare(`UPDATE logins SET used_at = datetime('now') WHERE id = ?1`).bind(row.id).run();
    const user = await findOrCreateUser(env, row.email);
    const sid = await createSession(env, user.id);
    return new Response(null, {
      status: 302,
      headers: { "Location": url.origin + "/account.html", "Set-Cookie": setCookieHeader(sid, request) }
    });
  } catch (e) { return fail(); }
}
