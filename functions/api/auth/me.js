/** GET /api/auth/me  ->  { signedIn: false } or { signedIn: true, email } */
import { enabled, notFound, json, currentUser } from "../_auth.js";
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!enabled(env)) { return notFound(); }
  if (!env.DB) { return json({ signedIn: false }); }
  const u = await currentUser(env, request);
  return json(u ? { signedIn: true, email: u.email } : { signedIn: false });
}
