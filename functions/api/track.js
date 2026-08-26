/**
 * POST /api/track — anonymous completion tracking for 103ready.com.
 *
 * Cloudflare Pages Function. Requires a D1 database bound as "DB" in the
 * Pages project settings (see docs/completion_tracking.md).
 *
 * Accepts JSON: { type: "start"|"ending", scenario, ending?, session }
 * Stores nothing but those fields plus a server-side timestamp. No IPs,
 * no user agents, no PII.
 */
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

  const type =
    body.type === "start" ? "start" :
    body.type === "ending" ? "ending" : null;

  const scenario =
    typeof body.scenario === "string" && /^[a-z0-9-]{1,64}$/.test(body.scenario)
      ? body.scenario
      : null;

  const ending =
    type === "ending" && typeof body.ending === "string"
      ? body.ending.slice(0, 80)
      : null;

  const session =
    typeof body.session === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.session)
      ? body.session
      : null;

  if (!type || !scenario || !session || (type === "ending" && !ending)) {
    return new Response("bad request", { status: 400 });
  }

  try {
    await env.DB.prepare(
      "INSERT INTO events (type, scenario, ending, session) VALUES (?1, ?2, ?3, ?4)"
    ).bind(type, scenario, ending, session).run();
  } catch (e) {
    return new Response("error", { status: 500 });
  }

  return new Response(null, { status: 204 });
}
