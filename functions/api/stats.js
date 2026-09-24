/**
 * GET /api/stats. Aggregate stats for 103ready.com.
 *
 * Returns per-scenario starts, ending events, unique completing sessions,
 * and a per-ending breakdown. After db/migrations/001 it also returns
 * unique and returning visitors, first-touch attribution, per-version
 * counts, and the passage where abandoned sessions stopped. Aggregates
 * only; no individual events are exposed.
 *
 * Protection: set a STATS_TOKEN environment variable on the Pages project
 * and the endpoint requires the token, supplied either as an
 * "Authorization: Bearer <token>" header (preferred; used by /admin.html)
 * or as ?token=<value>. Leave STATS_TOKEN unset and the endpoint is public.
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

  async function rows(sql) {
    const r = await env.DB.prepare(sql).all();
    return r.results;
  }

  // Legacy queries: these must always work.
  let scenarios, endings;
  try {
    scenarios = await rows(
      `SELECT scenario,
              SUM(type = 'start')  AS starts,
              SUM(type = 'ending') AS ending_events,
              COUNT(DISTINCT CASE WHEN type = 'ending' THEN session END) AS unique_completers
         FROM events
        GROUP BY scenario
        ORDER BY scenario`
    );
    endings = await rows(
      `SELECT scenario, ending, COUNT(*) AS n
         FROM events
        WHERE type = 'ending'
        GROUP BY scenario, ending
        ORDER BY scenario, n DESC`
    );
  } catch (e) {
    return Response.json({ error: "query failed" }, { status: 500 });
  }

  const out = {
    generated: new Date().toISOString(),
    migrated: false,
    scenarios,
    endings
  };

  // Post-migration queries: each one is optional. If any fails the schema
  // is not migrated yet and the legacy payload above is returned as is.
  try {
    out.visitors = await rows(
      `SELECT scenario,
              COUNT(DISTINCT visitor) AS unique_visitors,
              COUNT(DISTINCT CASE WHEN type = 'ending' THEN visitor END) AS unique_visitor_completers
         FROM events
        WHERE visitor IS NOT NULL
        GROUP BY scenario
        ORDER BY scenario`
    );

    const totals = await rows(
      `SELECT COUNT(*) AS visitors_total,
              SUM(n_scenarios >= 2) AS visitors_two_plus_scenarios,
              SUM(n_days >= 2) AS visitors_returned_another_day
         FROM (SELECT visitor,
                      COUNT(DISTINCT scenario) AS n_scenarios,
                      COUNT(DISTINCT substr(ts, 1, 10)) AS n_days
                 FROM events
                WHERE visitor IS NOT NULL AND type = 'start'
                GROUP BY visitor)`
    );
    out.visitor_totals = totals[0] || {};

    out.attribution = await rows(
      `SELECT COALESCE(utm_source, '') AS utm_source,
              COALESCE(utm_medium, '') AS utm_medium,
              COALESCE(utm_campaign, '') AS utm_campaign,
              CASE
                WHEN referrer IS NULL OR referrer = '' THEN '(direct)'
                ELSE substr(referrer, instr(referrer, '://') + 3,
                     CASE WHEN instr(substr(referrer, instr(referrer, '://') + 3), '/') = 0
                          THEN length(referrer)
                          ELSE instr(substr(referrer, instr(referrer, '://') + 3), '/') - 1 END)
              END AS referrer_host,
              COUNT(*) AS n
         FROM visitors
        GROUP BY 1, 2, 3, 4
        ORDER BY n DESC
        LIMIT 50`
    );

    out.versions = await rows(
      `SELECT scenario, COALESCE(version, '(pre-stamp)') AS version,
              SUM(type = 'start') AS starts,
              COUNT(DISTINCT CASE WHEN type = 'ending' THEN session END) AS unique_completers
         FROM events
        GROUP BY scenario, version
        ORDER BY scenario, starts DESC`
    );

    // Where did sessions that started but never reached an ending stop?
    out.abandonment = await rows(
      `SELECT p.scenario, p.passage, COUNT(*) AS n
         FROM passages p
         JOIN (SELECT scenario, session, MAX(id) AS last_id
                 FROM passages GROUP BY scenario, session) l
           ON l.last_id = p.id
        WHERE NOT EXISTS (SELECT 1 FROM events e
                           WHERE e.type = 'ending'
                             AND e.scenario = p.scenario
                             AND e.session = p.session)
        GROUP BY p.scenario, p.passage
        ORDER BY p.scenario, n DESC`
    );

    out.migrated = true;
  } catch (e) {
    out.migrated = false;
  }

  return Response.json(out);
}
