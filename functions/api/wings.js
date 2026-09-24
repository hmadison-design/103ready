/**
 * WINGS credit submission.
 *
 * POST /api/wings   { code, email }
 *      Verifies the completion code against COMPLETION_SECRET, then stores
 *      the code and email in wings_submissions (migration 002) for Harvey
 *      to validate by hand on FAASafety.gov as a Training Provider.
 *      Returns { ok: true } or an error the page can show. Rejects
 *      malformed or forged codes with 400 so nobody can spam the queue.
 *      This is the one place on the site that stores an email address;
 *      /privacy.html says so.
 *
 * GET  /api/wings   Authorization: Bearer <STATS_TOKEN>
 *      Lists pending submissions (newest first, 200 max) for the admin
 *      page, joined to issuance details when present.
 *
 * DELETE is deliberately not implemented. Marking a submission validated
 * is done from the admin page via POST /api/wings with { code, validated: true }
 * and the bearer token.
 */
import { verifyCode, json } from "./_lib.js";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

function authorized(request, env) {
  if (!env.STATS_TOKEN) { return false; }
  const auth = request.headers.get("Authorization") || "";
  return auth.startsWith("Bearer ") && auth.slice(7).trim() === env.STATS_TOKEN;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }

  if (!env.COMPLETION_SECRET) {
    return json({ error: "WINGS submission is not enabled yet" }, 503);
  }
  if (!env.DB) { return json({ error: "no database" }, 503); }

  const code = String(body.code || "").trim().toUpperCase();
  if (!(await verifyCode(env.COMPLETION_SECRET, code))) {
    return json({ error: "That code is not valid. Check it against the completion screen." }, 400);
  }

  // Admin marking a submission validated.
  if (body.validated === true) {
    if (!authorized(request, env)) { return json({ error: "unauthorized" }, 401); }
    try {
      await env.DB.prepare(
        `UPDATE wings_submissions SET validated_at = datetime('now') WHERE code = ?1`
      ).bind(code).run();
    } catch (e) { return json({ error: "not migrated" }, 503); }
    return json({ ok: true });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return json({ error: "Enter the email address on your FAASafety.gov account." }, 400);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO wings_submissions (code, email) VALUES (?1, ?2)
       ON CONFLICT(code) DO UPDATE SET email = excluded.email, submitted_at = datetime('now')`
    ).bind(code, email).run();
  } catch (e) {
    return json({ error: "Submission is not open yet. Try again later." }, 503);
  }
  return json({ ok: true });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!authorized(request, env)) { return new Response("unauthorized", { status: 401 }); }
  if (!env.DB) { return json({ error: "no database" }, 503); }
  try {
    const r = await env.DB.prepare(
      `SELECT s.code, s.email, s.submitted_at, s.validated_at,
              c.scenario, c.version, c.score, c.issued_at
         FROM wings_submissions s
         LEFT JOIN completions c ON c.code = s.code
        ORDER BY s.validated_at IS NOT NULL, s.submitted_at DESC
        LIMIT 200`
    ).all();
    return json({ submissions: r.results });
  } catch (e) {
    return json({ submissions: [], migrated: false });
  }
}
