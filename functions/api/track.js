/**
 * POST /api/track. Anonymous tracking for 103ready.com.
 *
 * Cloudflare Pages Function. Requires a D1 database bound as "DB" in the
 * Pages project settings (see docs/completion_tracking.md).
 *
 * Accepts JSON with a "type" of:
 *   visit    { visitor, referrer?, utm_source?, utm_medium?, utm_campaign?, landing? }
 *   start    { scenario, session, visitor?, version? }
 *   passage  { scenario, session, passage, visitor?, version? }
 *   ending   { scenario, session, ending, visitor?, version? }
 *
 * Stores those fields plus a server-side timestamp. No IPs, no user agents,
 * no PII. Works before and after db/migrations/001: if the new columns or
 * tables are missing, start/ending fall back to the legacy insert and
 * visit/passage are dropped silently.
 */

const SLUG = /^[a-z0-9-]{1,64}$/;
const ID = /^[A-Za-z0-9-]{8,64}$/;

function str(v, max) {
  return typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    // Binding missing: fail quietly so the client never notices.
    return new Response(null, { status: 204 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response("bad request", { status: 400 });
  }

  const type = ["visit", "start", "passage", "ending"].includes(body.type) ? body.type : null;
  if (!type) { return new Response("bad request", { status: 400 }); }

  const visitor = typeof body.visitor === "string" && ID.test(body.visitor) ? body.visitor : null;
  const version = str(body.version, 40);

  // ---- visit: first-touch attribution, one row per visitor, never updated.
  if (type === "visit") {
    if (!visitor) { return new Response("bad request", { status: 400 }); }
    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO visitors
           (visitor, referrer, utm_source, utm_medium, utm_campaign, landing)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      ).bind(
        visitor,
        str(body.referrer, 200),
        str(body.utm_source, 80),
        str(body.utm_medium, 80),
        str(body.utm_campaign, 80),
        str(body.landing, 120)
      ).run();
    } catch (e) {
      // Table not migrated yet. Drop it; the migration note explains.
    }
    return new Response(null, { status: 204 });
  }

  const scenario = typeof body.scenario === "string" && SLUG.test(body.scenario) ? body.scenario : null;
  const session = typeof body.session === "string" && ID.test(body.session) ? body.session : null;
  if (!scenario || !session) { return new Response("bad request", { status: 400 }); }

  // ---- passage: one row per passage displayed.
  if (type === "passage") {
    const passage = str(body.passage, 80);
    if (!passage) { return new Response("bad request", { status: 400 }); }
    try {
      await env.DB.prepare(
        `INSERT INTO passages (scenario, session, visitor, version, passage)
         VALUES (?1, ?2, ?3, ?4, ?5)`
      ).bind(scenario, session, visitor, version, passage).run();
    } catch (e) {
      // Table not migrated yet. Drop it.
    }
    return new Response(null, { status: 204 });
  }

  // ---- start / ending.
  const ending = type === "ending" ? str(body.ending, 80) : null;
  if (type === "ending" && !ending) { return new Response("bad request", { status: 400 }); }

  try {
    await env.DB.prepare(
      `INSERT INTO events (type, scenario, ending, session, visitor, version)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    ).bind(type, scenario, ending, session, visitor, version).run();
  } catch (e) {
    // Columns not migrated yet: legacy shape.
    try {
      await env.DB.prepare(
        "INSERT INTO events (type, scenario, ending, session) VALUES (?1, ?2, ?3, ?4)"
      ).bind(type, scenario, ending, session).run();
    } catch (e2) {
      return new Response("error", { status: 500 });
    }
  }

  return new Response(null, { status: 204 });
}
