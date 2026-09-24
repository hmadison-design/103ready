// Shared helpers for the WINGS completion Functions. Underscore path: not a route.

const SLUG = /^[a-z0-9-]{1,64}$/;
const ID = /^[A-Za-z0-9-]{8,64}$/;
const B32 = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no I, L, O, U, 0, 1

export const isSlug = (s) => typeof s === "string" && SLUG.test(s);
export const isId = (s) => typeof s === "string" && ID.test(s);

export function randomToken(n) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < n; i++) { out += B32[bytes[i] % B32.length]; }
  return out;
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* A completion code is  <TAG>-<RANDOM8>-<SIG6>  where TAG is a short scenario
 * tag, RANDOM8 is 8 base32 chars, and SIG6 is the first 6 chars (uppercased)
 * of HMAC-SHA256(secret, tag + "-" + random). Anyone can read a code; only the
 * holder of COMPLETION_SECRET can mint or verify one. */
export function scenarioTag(slug) {
  return slug.replace(/[^a-z0-9]/g, "").slice(0, 6).toUpperCase();
}

export async function mintCode(secret, slug) {
  const tag = scenarioTag(slug);
  const rnd = randomToken(8);
  const sig = (await hmacHex(secret, tag + "-" + rnd)).slice(0, 6).toUpperCase();
  return `${tag}-${rnd}-${sig}`;
}

export async function verifyCode(secret, code) {
  const m = /^([A-Z0-9]{1,6})-([A-Z2-9]{8})-([0-9A-F]{6})$/.exec(String(code || "").trim().toUpperCase());
  if (!m) { return false; }
  const expect = (await hmacHex(secret, m[1] + "-" + m[2])).slice(0, 6).toUpperCase();
  return expect === m[3];
}

export function json(data, status) {
  return Response.json(data, { status: status || 200 });
}
