/**
 * GET /api/stats — aggregate completion stats for 103ready.com.
 *
 * Returns per-scenario starts, ending events, and unique completing
 * sessions, plus a per-ending breakdown. Aggregates only; no individual
 * events are exposed.
 *
 * Protection: set a STATS_TOKEN environment variable on the Pages project
 * and the endpoint requires the token, supplied either as an
 * "Authorization: Bearer <token>" header (preferred; used by /admin.html)
 * or as ?token=<value> (handy for quick manual checks). Leave STATS_TOKEN
 * unset and the endpoint is public (the data is anonymous counts either way).
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.DB) {
    return Response.json({ error: "no database binding" }, { status: 500 });
  }

  if (env.STATS_TOKEN) {
    const url = new URL(request.url);
    const auth = request.headers.get("Authorization") || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
    const supplied = bearer || url.searchParams.get("token");
    if (supplied !== env.STATS_TOKEN) {
      return new Response("unauthorized", { status: 401 });
    }
  }

  try {
    const scenarios = await env.DB.prepare(
      `SELECT scenario,
              SUM(type = 'start')  AS starts,
              SUM(type = 'ending') AS ending_events,
              COUNT(DISTINCT CASE WHEN type = 'ending' THEN session END)
                                   AS unique_completers
         FROM events
        GROUP BY scenario
        ORDER BY scenario`
    ).all();

    const endings = await env.DB.prepare(
      `SELECT scenario, ending, COUNT(*) AS n
         FROM events
        WHERE type = 'ending'
        GROUP BY scenario, ending
        ORDER BY scenario, n DESC`
    ).all();

    return Response.json({
      generated: new Date().toISOString(),
      scenarios: scenarios.results,
      endings: endings.results
    });
  } catch (e) {
    return Response.json({ error: "query failed" }, { status: 500 });
  }
}
