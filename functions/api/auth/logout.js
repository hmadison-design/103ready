/** POST /api/auth/logout  ->  clears the session and the cookie. */
import { enabled, notFound, json, destroySession, clearCookieHeader } from "../_auth.js";
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!enabled(env)) { return notFound(); }
  if (env.DB) { await destroySession(env, request); }
  return json({ ok: true }, 200, { "Set-Cookie": clearCookieHeader() });
}
