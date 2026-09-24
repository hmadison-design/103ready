/* 103ready.com completion tracking.
 *
 * Compiled into every scenario's Story JavaScript at build time (build.sh
 * passes this file to tweego alongside each scenario's .twee), and served
 * as /tracking.js for the landing page. No per-scenario edits are needed.
 *
 * What it sends to /api/track (a Cloudflare Pages Function backed by D1):
 *
 *   visit    once per visitor, ever: referrer, UTM parameters, landing path.
 *            First-touch attribution. Never overwritten server-side.
 *   start    once per browser session per scenario.
 *   passage  once per passage displayed (the path through the scenario).
 *   ending   once per distinct ending reached per session.
 *
 * Identity: two ids, both random, neither tied to a person.
 *   session  sessionStorage, dies with the tab. One playthrough.
 *   visitor  localStorage, persists on this browser. Lets us tell a
 *            returning pilot from a new one. That is all it is used for,
 *            and /privacy.html says so.
 *
 * Version: window.R103_VERSION is stamped per scenario at build time
 * (content hash of the .twee), so a revised scenario does not silently
 * average into the old one's numbers.
 *
 * Ending detection: passages tagged "ending" first, then the legacy name
 * prefixes (Ending-*, End*). Every call is wrapped so a tracking failure
 * can never break gameplay.
 */
(function () {
  "use strict";

  if (typeof window === "undefined" || !window.location) { return; }

  var version = (typeof window.R103_VERSION === "string") ? window.R103_VERSION : null;

  var scenario = window.location.pathname
    .replace(/^\//, "")
    .replace(/\.html$/, "");
  if (!/^[a-z0-9-]{1,64}$/.test(scenario)) { scenario = null; }

  function uuid() {
    return (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function getSession() {
    try {
      var s = sessionStorage.getItem("r103_session");
      if (!s) { s = uuid(); sessionStorage.setItem("r103_session", s); }
      return s;
    } catch (e) { return null; }
  }

  /* Returns { id, isNew }. isNew is true only on the very first page load
   * on this browser, which is the one moment first-touch data exists. */
  function getVisitor() {
    try {
      var v = localStorage.getItem("r103_visitor");
      if (v) { return { id: v, isNew: false }; }
      v = uuid();
      localStorage.setItem("r103_visitor", v);
      return { id: v, isNew: true };
    } catch (e) { return { id: null, isNew: false }; }
  }

  function alreadySent(key) {
    try {
      var sent = JSON.parse(sessionStorage.getItem("r103_sent") || "[]");
      if (sent.indexOf(key) !== -1) { return true; }
      sent.push(key);
      sessionStorage.setItem("r103_sent", JSON.stringify(sent));
      return false;
    } catch (e) { return false; }
  }

  function post(payload) {
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("/api/track", body)) { return; }
    } catch (e) { /* fall through to fetch */ }
    try {
      fetch("/api/track", { method: "POST", body: body, keepalive: true });
    } catch (e) { /* tracking only; never surface */ }
  }

  var visitor = getVisitor();
  var session = getSession();

  /* First touch: fires once per browser, on whatever page they land on. */
  if (visitor.isNew && visitor.id) {
    var q = {};
    try {
      var sp = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) {
        var val = sp.get(k);
        if (val) { q[k] = String(val).slice(0, 80); }
      });
    } catch (e) { /* no URLSearchParams; skip UTMs */ }
    post({
      type: "visit",
      visitor: visitor.id,
      referrer: (document.referrer || "").slice(0, 200) || undefined,
      utm_source: q.utm_source,
      utm_medium: q.utm_medium,
      utm_campaign: q.utm_campaign,
      landing: window.location.pathname.slice(0, 120)
    });
  }

  /* Everything below is scenario gameplay; the landing page stops here. */
  if (!scenario || !session) { return; }

  function isEnding(p) {
    if (!p) { return false; }
    if (p.tags && p.tags.indexOf("ending") !== -1) { return true; }
    var n = p.name || p.title || "";
    return /^End(ing)?[-_A-Z]/.test(n);
  }

  function send(type, extra) {
    var key = type + "|" + scenario + "|" + (extra.ending || extra.passage || "");
    if (type !== "passage" && alreadySent(key)) { return; }
    var payload = {
      type: type,
      scenario: scenario,
      session: session,
      visitor: visitor.id || undefined,
      version: version || undefined
    };
    if (extra.ending) { payload.ending = extra.ending; }
    if (extra.passage) { payload.passage = extra.passage; }
    post(payload);
  }

  try {
    $(document).one(":passagedisplay", function () { send("start", {}); });
    $(document).on(":passagedisplay", function (ev) {
      var p = ev && ev.passage;
      if (!p) { return; }
      var name = p.name || p.title || "unknown";
      send("passage", { passage: name });
      if (isEnding(p)) { send("ending", { ending: name }); }
    });
  } catch (e) { /* SugarCube not present; do nothing */ }
}());
