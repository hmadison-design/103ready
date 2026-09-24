/**
 * Knowledge check for the free WINGS scenarios.
 *
 * GET  /api/check?scenario=<slug>
 *      Returns { scenario, questions: [{ id, question, options }] } with five
 *      questions drawn at random from the pool, answers stripped. 404 when
 *      the scenario has no pool. The response carries a "set" token so the
 *      POST can be graded against the same five.
 *
 * POST /api/check
 *      { scenario, session, version?, set, answers: { q1: 2, q4: 0, ... } }
 *      Grades server-side. On four or more of five correct, mints a
 *      completion code (requires COMPLETION_SECRET) and, when the database
 *      is migrated (002), records the issuance. Returns
 *      { passed, score, total, code?, review: [{ id, correct, explanation }] }.
 *      With COMPLETION_SECRET unset the check still grades but issues no
 *      code and reports enabled: false, so nothing on the site advertises
 *      credit that cannot be issued.
 *
 * The "set" is the five question ids joined with commas and signed with
 * the same HMAC as the codes, so a client cannot answer a different five
 * than it was served. No state is stored between GET and POST.
 */
import { POOLS } from "./_questions/index.js";
import { isSlug, isId, mintCode, json } from "./_lib.js";

const PICK = 5;
const PASS = 4;

async function sign(secret, s) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(s));
  return Array.from(new Uint8Array(sig)).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

function pickIds(pool) {
  const ids = pool.map(q => q.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, PICK).sort();
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const scenario = url.searchParams.get("scenario") || "";
  if (!isSlug(scenario) || !POOLS[scenario]) {
    return json({ error: "no knowledge check for this scenario" }, 404);
  }
  const secret = context.env.COMPLETION_SECRET || "";
  const pool = POOLS[scenario];
  const ids = pickIds(pool);
  const setKey = ids.join(",");
  const set = secret ? setKey + "." + await sign(secret, scenario + "|" + setKey) : setKey;
  const questions = ids.map(id => {
    const q = pool.find(x => x.id === id);
    return { id: q.id, question: q.question, options: q.options };
  });
  return json({ scenario, enabled: !!secret, pass: PASS, total: PICK, set, questions });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }

  const scenario = isSlug(body.scenario) && POOLS[body.scenario] ? body.scenario : null;
  const session = isId(body.session) ? body.session : null;
  const version = typeof body.version === "string" ? body.version.slice(0, 40) : null;
  const answers = body.answers && typeof body.answers === "object" ? body.answers : null;
  const setRaw = typeof body.set === "string" ? body.set : "";
  if (!scenario || !session || !answers || !setRaw) { return json({ error: "bad request" }, 400); }

  const secret = env.COMPLETION_SECRET || "";
  const [setKey, setSig] = setRaw.split(".");
  if (secret) {
    if (!setSig || setSig !== await sign(secret, scenario + "|" + setKey)) {
      return json({ error: "bad set" }, 400);
    }
  }
  const ids = setKey.split(",");
  const pool = POOLS[scenario];
  if (ids.length !== PICK || ids.some(id => !pool.find(q => q.id === id))) {
    return json({ error: "bad set" }, 400);
  }

  let score = 0;
  const review = ids.map(id => {
    const q = pool.find(x => x.id === id);
    const given = Number.isInteger(answers[id]) ? answers[id] : -1;
    const correct = given === q.answer;
    if (correct) { score += 1; }
    return { id, correct, explanation: q.explanation };
  });
  const passed = score >= PASS;

  const out = { scenario, passed, score, total: PICK, pass: PASS, enabled: !!secret, review };

  if (passed && secret) {
    const code = await mintCode(secret, scenario);
    out.code = code;
    if (env.DB) {
      try {
        await env.DB.prepare(
          `INSERT INTO completions (code, scenario, session, version, score)
           VALUES (?1, ?2, ?3, ?4, ?5)`
        ).bind(code, scenario, session, version, score).run();
      } catch (e) {
        // Table not migrated yet (002). The code is still valid; it is
        // self-verifying. Issuance simply is not logged.
      }
    }
  }
  return json(out);
}
