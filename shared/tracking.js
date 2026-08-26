/* 103ready.com completion tracking.
 *
 * Injected into every scenario's Story JavaScript at build time: build.sh
 * passes this file to tweego alongside each scenario's .twee, so no
 * per-scenario edits are needed.
 *
 * What it does: sends anonymous events to /api/track (a Cloudflare Pages
 * Function backed by D1). One "start" per browser session per scenario, and
 * one "ending" per distinct ending reached per session. No accounts, no PII,
 * no cookies; the session id is a random value that lives only in
 * sessionStorage and dies with the tab.
 *
 * Ending detection covers all three conventions in the library:
 *   - passages tagged "ending" (The Wall, Cylinder Three, and all
 *     post-QA-pass scenarios)
 *   - untagged "Ending-*" names (Game Day)
 *   - untagged "End*" names (Breakfast at Coulter)
 *
 * Every call is wrapped so a tracking failure can never break gameplay.
 */
(function () {
  "use strict";

  if (typeof window === "undefined" || !window.location) { return; }

  var scenario = window.location.pathname
    .replace(/^\//, "")
    .replace(/\.html$/, "");
  if (!scenario || !/^[a-z0-9-]{1,64}$/.test(scenario)) { return; }

  function isEnding(p) {
    if (!p) { return false; }
    if (p.tags && p.tags.indexOf("ending") !== -1) { return true; }
    var n = p.name || p.title || "";
    return /^End(ing)?[-_A-Z]/.test(n);
  }

  function getSession() {
    try {
      var s = sessionStorage.getItem("r103_session");
      if (!s) {
        s = (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem("r103_session", s);
      }
      return s;
    } catch (e) { return null; }
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

  function send(type, ending) {
    var session = getSession();
    if (!session) { return; }
    var key = type + "|" + scenario + "|" + (ending || "");
    if (alreadySent(key)) { return; }
    var payload = JSON.stringify({
      type: type,
      scenario: scenario,
      ending: ending || undefined,
      session: session
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("/api/track", payload)) {
        return;
      }
    } catch (e) { /* fall through to fetch */ }
    try {
      fetch("/api/track", { method: "POST", body: payload, keepalive: true });
    } catch (e) { /* tracking only; never surface */ }
  }

  try {
    $(document).one(":passagedisplay", function () { send("start"); });
    $(document).on(":passagedisplay", function (ev) {
      var p = ev && ev.passage;
      if (isEnding(p)) { send("ending", p.name || p.title || "unknown"); }
    });
  } catch (e) { /* SugarCube not present; do nothing */ }
}());
