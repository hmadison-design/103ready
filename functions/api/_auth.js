// Sign-in helpers. Underscore path: not a route.
//
// Feature flag: AUTH_ENABLED must be set on the Pages project or every auth
// endpoint answers 404 and the pages say sign-in is not open yet.

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const COOKIE = "r103_sid";
const SESSION_DAYS = 30;
const LOGIN_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 3;

export const enabled = (env) => !!env.AUTH_ENABLED;
export const isEmail = (s) => typeof s === "string" && EMAIL.test(s);
export const normEmail = (s) => String(s || "").trim().toLowerCase();

export function json(data, status, headers) {
  return Response.json(data, { status: status || 200, headers: headers || {} });
}
export const notFound = () => new Response("not found", { status: 404 });

export async function sha256(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function randomHex(bytes) {
  const a = new Uint8Array(bytes); crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function sixDigits() {
  const a = new Uint32Array(1); crypto.getRandomValues(a);
  return String(a[0] % 1000000).padStart(6, "0");
}

export function iso(offsetMs) {
  // D1's datetime('now') is "YYYY-MM-DD HH:MM:SS"; match that format so
  // string comparisons in SQL work.
  return new Date(Date.now() + (offsetMs || 0)).toISOString().slice(0, 19).replace("T", " ");
}

export const loginExpiry = () => iso(LOGIN_MINUTES * 60 * 1000);
export const sessionExpiry = () => iso(SESSION_DAYS * 24 * 3600 * 1000);
export { MAX_ATTEMPTS, MAX_SENDS_PER_HOUR, COOKIE };

export function readCookie(request) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([A-Za-z0-9]+)"));
  return m ? m[1] : null;
}

export function setCookieHeader(sid, request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}
export function clearCookieHeader() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/* Create a session for a user id and return the raw session id for the cookie. */
export async function createSession(env, userId) {
  const sid = randomHex(32);
  await env.DB.prepare(
    `INSERT INTO sessions (id_hash, user_id, expires_at) VALUES (?1, ?2, ?3)`
  ).bind(await sha256(sid), userId, sessionExpiry()).run();
  return sid;
}

/* Resolve the request's cookie to { id, email } or null. */
export async function currentUser(env, request) {
  const sid = readCookie(request);
  if (!sid) { return null; }
  try {
    const row = await env.DB.prepare(
      `SELECT u.id, u.email, s.id_hash
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id_hash = ?1 AND s.expires_at > datetime('now')`
    ).bind(await sha256(sid)).first();
    if (!row) { return null; }
    return { id: row.id, email: row.email };
  } catch (e) { return null; }
}

export async function destroySession(env, request) {
  const sid = readCookie(request);
  if (!sid) { return; }
  try { await env.DB.prepare(`DELETE FROM sessions WHERE id_hash = ?1`).bind(await sha256(sid)).run(); } catch (e) {}
}

export async function findOrCreateUser(env, email) {
  await env.DB.prepare(`INSERT OR IGNORE INTO users (email) VALUES (?1)`).bind(email).run();
  return env.DB.prepare(`SELECT id, email FROM users WHERE email = ?1`).bind(email).first();
}
