/* 103ready.com knowledge check and completion code.
 *
 * Compiled into every scenario's Story JavaScript after tracking.js. Does
 * nothing unless /api/check knows this scenario (only the free WINGS
 * scenarios have question pools). When a tagged ending is displayed it
 * appends a panel: "Scenario complete", a five-question check served and
 * graded by the server, and, on a pass, the completion code the learner
 * submits at /wings.html. Nothing here touches scenario prose or state.
 *
 * If COMPLETION_SECRET is not set on the Pages project, the server reports
 * enabled: false and the panel offers the check as self-study only, with
 * no mention of codes or credit. Every call is wrapped; a failure here can
 * never break gameplay.
 */
(function () {
  "use strict";
  if (typeof window === "undefined" || !window.location) { return; }

  var scenario = window.location.pathname.replace(/^\//, "").replace(/\.html$/, "");
  if (!/^[a-z0-9-]{1,64}$/.test(scenario)) { return; }

  var CSS = [
    ".r103-check{margin:2.2em 0 1em;padding:1.2em 1.3em;border:1px solid rgba(255,255,255,.18);border-radius:8px;background:rgba(0,0,0,.25);font-size:.97em;line-height:1.5}",
    ".r103-check h3{margin:0 0 .4em;font-size:1.15em;letter-spacing:.03em}",
    ".r103-check p{margin:0 0 .8em}",
    ".r103-check .q{margin:1em 0 .6em;font-weight:600}",
    ".r103-check label{display:block;margin:.25em 0 .25em .2em;cursor:pointer}",
    ".r103-check input[type=radio]{margin-right:.5em}",
    ".r103-check button{display:inline-block;margin-top:.8em;padding:.5em 1.1em;border:1px solid rgba(255,255,255,.35);border-radius:4px;background:transparent;color:inherit;font:inherit;cursor:pointer}",
    ".r103-check button:hover{background:rgba(255,255,255,.12)}",
    ".r103-check .ok{color:#7fd39a}.r103-check .no{color:#e0a06c}",
    ".r103-check .code{display:inline-block;margin:.4em 0;padding:.35em .7em;border:1px dashed rgba(255,255,255,.4);border-radius:4px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:1.15em;letter-spacing:.08em;user-select:all}",
    ".r103-check .muted{opacity:.75;font-size:.92em}",
    ".r103-check a{color:inherit;text-decoration:underline}"
  ].join("");

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) { Object.keys(attrs).forEach(function (k) { if (k === "text") { e.textContent = attrs[k]; } else { e.setAttribute(k, attrs[k]); } }); }
    (children || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  function session() {
    try { return sessionStorage.getItem("r103_session"); } catch (e) { return null; }
  }

  function getJSON(url) {
    return fetch(url, { headers: { "Accept": "application/json" } }).then(function (r) {
      if (r.status === 404) { return null; }
      return r.json();
    });
  }

  function isEnding(p) {
    if (!p) { return false; }
    if (p.tags && p.tags.indexOf("ending") !== -1) { return true; }
    return /^End(ing)?[-_A-Z]/.test(p.name || p.title || "");
  }

  function renderIntro(panel, meta) {
    panel.innerHTML = "";
    panel.appendChild(el("h3", { text: "Scenario complete" }));
    if (meta.enabled) {
      panel.appendChild(el("p", { text: "This scenario is offered free with FAA WINGS knowledge credit. Answer five questions drawn from the debriefs (four correct passes). You will get a completion code to submit for credit." }));
    } else {
      panel.appendChild(el("p", { text: "Check your understanding: five questions drawn from the debriefs. Four correct is a pass. Nothing is recorded." }));
    }
    var btn = el("button", { type: "button", text: "Start the five-question check" });
    btn.addEventListener("click", function () { loadQuestions(panel); });
    panel.appendChild(btn);
  }

  function loadQuestions(panel) {
    panel.innerHTML = "";
    panel.appendChild(el("p", { class: "muted", text: "Loading..." }));
    getJSON("/api/check?scenario=" + encodeURIComponent(scenario)).then(function (data) {
      if (!data || !data.questions) { panel.innerHTML = ""; return; }
      renderQuestions(panel, data);
    }).catch(function () { panel.innerHTML = ""; });
  }

  function renderQuestions(panel, data) {
    panel.innerHTML = "";
    panel.appendChild(el("h3", { text: "Knowledge check" }));
    var form = el("form");
    data.questions.forEach(function (q, i) {
      form.appendChild(el("div", { class: "q", text: (i + 1) + ". " + q.question }));
      q.options.forEach(function (opt, j) {
        var input = el("input", { type: "radio", name: q.id, value: String(j) });
        var label = el("label");
        label.appendChild(input);
        label.appendChild(document.createTextNode(opt));
        form.appendChild(label);
      });
    });
    var btn = el("button", { type: "submit", text: "Submit answers" });
    var note = el("p", { class: "muted", text: "" });
    form.appendChild(btn);
    form.appendChild(note);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var answers = {};
      var missing = 0;
      data.questions.forEach(function (q) {
        var picked = form.querySelector("input[name=\"" + q.id + "\"]:checked");
        if (picked) { answers[q.id] = parseInt(picked.value, 10); } else { missing++; }
      });
      if (missing) { note.textContent = "Answer all five before submitting."; return; }
      btn.disabled = true;
      note.textContent = "Grading...";
      fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: scenario,
          session: session(),
          version: (typeof window.R103_VERSION === "string") ? window.R103_VERSION : undefined,
          set: data.set,
          answers: answers
        })
      }).then(function (r) { return r.json(); })
        .then(function (res) { renderResult(panel, data, res); })
        .catch(function () { note.textContent = "Could not reach the server. Try again in a moment."; btn.disabled = false; });
    });
    panel.appendChild(form);
  }

  function renderResult(panel, data, res) {
    panel.innerHTML = "";
    if (!res || typeof res.score !== "number") {
      panel.appendChild(el("p", { text: "Something went wrong grading the check. Reload the page and try again." }));
      return;
    }
    panel.appendChild(el("h3", { text: res.passed ? "Passed" : "Not yet" }));
    panel.appendChild(el("p", { class: res.passed ? "ok" : "no", text: res.score + " of " + res.total + " correct. " + (res.passed ? "" : "Four is a pass. Read the notes below, then try a fresh set.") }));
    (res.review || []).forEach(function (r, i) {
      var q = data.questions.filter(function (x) { return x.id === r.id; })[0];
      var head = el("div", { class: "q", text: (i + 1) + ". " + (q ? q.question : r.id) + (r.correct ? "  (correct)" : "  (missed)") });
      panel.appendChild(head);
      panel.appendChild(el("p", { class: "muted", text: r.explanation }));
    });
    if (res.passed && res.code) {
      panel.appendChild(el("p", { text: "Your completion code:" }));
      panel.appendChild(el("div", { class: "code", text: res.code }));
      var p = el("p");
      p.appendChild(document.createTextNode("To claim WINGS credit, submit this code and the email on your FAASafety.gov account at "));
      p.appendChild(el("a", { href: "/wings.html", text: "103ready.com/wings" }));
      p.appendChild(document.createTextNode(". Keep the code; it is the only record."));
      panel.appendChild(p);
    } else if (res.passed && !res.enabled) {
      panel.appendChild(el("p", { class: "muted", text: "Credit submission is not open yet." }));
    }
    if (!res.passed) {
      var again = el("button", { type: "button", text: "Try a fresh set" });
      again.addEventListener("click", function () { loadQuestions(panel); });
      panel.appendChild(again);
    }
  }

  var shown = false;
  var known = null; /* null = not asked yet, false = no pool, object = meta */
  function attach(passageEl) {
    if (shown || known === false) { return; }
    (known ? Promise.resolve(known) : getJSON("/api/check?scenario=" + encodeURIComponent(scenario))).then(function (meta) {
      if (!meta || !meta.questions) { known = false; return; }
      known = meta;
      if (shown) { return; }
      shown = true;
      var style = el("style", { text: CSS });
      document.head.appendChild(style);
      var panel = el("div", { class: "r103-check" });
      renderIntro(panel, meta);
      (passageEl || document.getElementById("passages")).appendChild(panel);
    }).catch(function () { /* no check for this scenario, or offline */ });
  }

  try {
    $(document).on(":passagedisplay", function (ev) {
      var p = ev && ev.passage;
      if (!isEnding(p)) { shown = false; return; }
      attach(ev.content || null);
    });
  } catch (e) { /* SugarCube not present */ }
}());
