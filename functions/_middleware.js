/**
 * Paid gate. Runs before every request on the site.
 *
 * With PAID_GATE unset (the state on main until launch), this does nothing
 * but call next(). With it set, a request for a paid scenario is served
 * only to a signed-in user with an active subscription; anyone else gets a
 * short page explaining that this scenario is part of the subscription,
 * with sign-in and account links. Free scenarios, the landing page, the
 * privacy, WINGS, sign-in, and account pages, assets, and every API route
 * pass through untouched.
 *
 * "Active" is read from our subscriptions table (kept current by the
 * Stripe webhook), never by calling Stripe on a page view.
 */
import { paidSlugFor } from "./_paid.js";
import { currentUser } from "./api/_auth.js";

async function isActive(env, userId) {
  try {
    const row = await env.DB.prepare(
      `SELECT status, current_period_end FROM subscriptions WHERE user_id = ?1`
    ).bind(userId).first();
    if (!row) { return false; }
    if (row.status !== "active" && row.status !== "trialing") { return false; }
    if (!row.current_period_end) { return false; }
    return row.current_period_end.replace("T", " ").slice(0, 19) > new Date().toISOString().replace("T", " ").slice(0, 19);
  } catch (e) { return false; }
}

function gatePage(slug, signedIn) {
  const title = slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
  const action = signedIn
    ? `<p>You are signed in but not subscribed. <a href="/account.html">Subscribe from your account page</a>, and this scenario opens the moment the payment clears.</p>`
    : `<p><a href="/signin.html">Sign in</a> if you already subscribe. If not, sign in first and subscribe from your account page. It takes about a minute.</p>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>103 Ready: ${title}</title><meta name="robots" content="noindex">
<style>
  html,body{margin:0;padding:0}body{background:#000;color:#ddd;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;line-height:1.55;padding:6vh 4vw;box-sizing:border-box}
  .wrap{max-width:560px;margin:0 auto}h1{font-size:clamp(1.4rem,3vw,1.9rem);letter-spacing:.03em;margin:0 0 .8em;color:#fff}p{margin:0 0 1.1em}
  a{color:#2E5C82;text-decoration:none}a:hover,a:focus{color:#fff}.muted{color:#8a9bb0;font-size:.92rem}.back{display:inline-block;margin-top:2em}
</style></head><body><main class="wrap">
<h1>${title} is part of the subscription</h1>
<p>Two scenarios on this site are free, with FAA WINGS credit: <a href="/the-forty-five">The Forty-Five</a> and <a href="/one-eighty">One Eighty</a>. The other fourteen, including this one, are for subscribers. That is what pays for new scenarios.</p>
${action}
<p class="muted">No password, no card details stored here, cancel any time from your account page.</p>
<a class="back" href="/">Back to the scenarios</a>
</main></body></html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  if (!env.PAID_GATE) { return next(); }
  const url = new URL(request.url);
  const slug = paidSlugFor(url.pathname);
  if (!slug) { return next(); }
  if (!env.DB) { return next(); } // misconfigured: fail open rather than lock everyone out
  const user = await currentUser(env, request);
  if (user && await isActive(env, user.id)) { return next(); }
  return new Response(gatePage(slug, !!user), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}
