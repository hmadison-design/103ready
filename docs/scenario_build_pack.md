# Scenario Build Pack — 103ready.com

Working conventions for building a new CYOA scenario. This distills the June
2026 QA-pass conventions, Harvey's two prose style documents, and the repo's
tooling into one construction guide. It supplements, and never overrides,
`docs/CYOA_Scenario_Design_Instructions.md` (v3.1), which you must read in
full before writing a passage.

## 0. Mandatory reading order

1. `docs/CYOA_Scenario_Design_Instructions.md` in full. Sections 4, 6, 7, 9,
   and 14 are load-bearing.
2. This document.
3. One full exemplar: `scenarios/red-x/The_Red_X.twee` for deep branching, or
   `scenarios/third-face/The_Third_Face.twee` for the scrub/mentorship arc
   and debrief voice. Read every line of the exemplar, including StoryInit
   and the stylesheet.
4. The scenario spec you were given.

## 1. Prose rules (Harvey's Writing Guardrails and Text DNA, distilled)

These govern every passage, choice, and debrief. `tools/style_lint.py`
enforces the mechanical subset; the rest is on you.

Never use an em dash. Anywhere. Use a comma with a conjunction, a period, a
colon, parentheses, or a rare semicolon (budget: about one per 1,000 words).
No Unicode ellipsis or arrows in prose (route tables and data blocks are the
exception). Oxford commas always. Contractions are normal speech; use them.

Vary sentence length hard. Short sentences land points. Longer ones carry
explanation. Never three same-length sentences in a row. Paragraphs run one
to five sentences, deliberately mixed. At critical moments, go short.

Plain words. "Use" not "utilize," "help" not "facilitate," "but" not
"however," "so" not "therefore" (mostly). No business-speak, no buzzwords,
no "journey," no "unlock." If a line could appear in any AI's output,
rewrite it until it sounds like one specific person said it.

Dry humor only, and only where it lands naturally. Understatement over
exaggeration. Deadpan, wry, incidental. Professional-tone scenarios keep
humor sparse and quiet. Never forced. Emphasis via italics, sparingly, not
bold. No emojis in prose (existing UI button glyphs are grandfathered).

Openings start in the middle of the thought. No wind-up, no throat-clearing.
Endings stop when they're done; debriefs educate without lecturing. Never
"It's not X, it's Y" constructions. No self-posed-question-then-answer
tricks. No anaphora runs. No trailing participial editorializing
("...highlighting the importance of ADM").

Second person, present tense, always, in narrative passages.

## 2. Narrative neutrality (the absolute rule)

Design Instructions Section 6 in one line: intermediate passages never
signal whether the last choice was good. No "Unfortunately," no "you should
have," no "Are you sure," no steering. Consequences appear as facts. A
passenger may argue, a controller may ask, an engine may run rough. The
narrator never grades. All judgment lives in ending debriefs.

Choices may not telegraph correctness by length, tone, or self-correcting
monologue. Wrong options read as reasonable rationalizations a real pilot
would make. Write them from inside that pilot's head.

## 3. File and folder mechanics

One folder per scenario: `scenarios/<slug>/`, containing exactly one `.twee`
file, named in Title_Snake case (e.g. `The_Forty_Five.twee`). The build
fails on a second .twee file; stale drafts must be renamed `.twee.bak`.

File skeleton, in order:

    :: StoryTitle
    <Title>

    :: StoryData
    { "ifid": "<fresh uuid4, uppercase>", "format": "SugarCube",
      "format-version": "2.37.3", "start": "FlightPrep" }

    :: StoryInit
    /* Scenario metadata block per Design Instructions Section 11 */
    <<set $pathArray to []>>
    <<set $badchoices to 0>>
    ...every state variable, initialized...

    :: StoryStylesheet [stylesheet]
    (copy the baseline from red-x or ice-in-the-cowl: dark theme, .debrief,
     .metar-block/.flight-plan/.aircraft-card, .airport-table,
     .scenario-title/.scenario-subtitle, .preflight-btn, link buttons,
     .main-menu-wrap/.main-menu-btn, .pax-quote if a passenger speaks)

    :: FlightPrep [preflight]
    (preflight hub: title, subtitle, situation, four material buttons with
     $readX gating, Begin Flight link, chart-currency disclaimer div)

    :: Preflight-Weather / Preflight-FlightPlan / Preflight-Aircraft /
       Preflight-Map [preflight]
    (briefing materials; each sets its $readX flag and links back)

    :: Opening [scenario]
    (the story begins; first decision within 150-300 words of scene-set)

    ...branch passages [scenario]...

    ...endings [scenario ending]...

Passage naming: descriptive, phase-prefixed (`Cruise_D3_Descend`,
`Approach_HoldWest`, `End_Diverted_KSTJ`). Endings start with `End`.
Tag every story passage `[scenario]`; endings `[scenario ending]`;
preflight materials `[preflight]`.

Every passage appends to the path log:
`<<set $pathArray to $pathArray.concat(["<short description>"])>>`

Choices use the link macro, one per line, each recording its choice:

    <<link "You continue to KMLE and ask for a lower altitude." "Cruise_D4_Lower">>
      <<set $pathArray to $pathArray.concat(["D3: continued, asked lower"])>>
      <<set $iceAccretion to 2>>
    <</link>>

(Macros may be written on one line; the multi-line form above is fine too.)

Every passage ends with the Main Menu button:
`<p class="main-menu-wrap"><a href="/" class="main-menu-btn">Main Menu</a></p>`

Decision headings, where used, take colons, never dashes:
`<div class="decision-heading">Cruise: Decision 3</div>`

Weather products render inside `.metar-block` divs in real format (METAR,
TAF, PIREP UA/UUA, AIRMET text). Flight plans and performance data use
`.flight-plan` / `.aircraft-card`. Route tables may use arrows; prose may not.

## 4. Structure targets

Deep branching, not a ladder (Blue Line and Third Face already own the
ladder pattern). Aim for 45-85 passages, 10-14 endings, minimum decision
depth 4 on every path (the audit enforces this), typical path depth 5-9.
Mix ending types per Design Instructions Section 4f: most bad paths end in
friction, delay, diversion, regulatory trouble, or a survivable off-airport
landing. Aircraft damage is rarer. Fatal endings: at most one or two, and
only at the end of a chain of the worst available choices. Some scenarios
have zero fatal endings by design; your spec says which.

Required somewhere in the tree: one counterintuitive-but-correct choice,
one or two didn't-help-didn't-hurt nodes, at least one decision made on
genuinely conflicting information, and at least one moment of social
pressure delivered through dialogue.

Cancel/scrub/divert-early paths must still reach 4 decisions. The Red X
ground arc and Third Face mentorship arc are the templates: the decision
chain continues on the ground (transportation, communication, second
attempt, aftermath), and those decisions carry their own ADM weight.

Emergency-declaration options terminate in their own fully debriefed
endings. They never rejoin the mission spine.

State variables gate endings on the actual offense or virtue, named for
what they track ($transmitted, $tailIce, $reserveMinutes), not a generic
counter alone. $badchoices may exist alongside as debrief seasoning.
Initialize everything in StoryInit; reset everything in every ending's
"Return to Start" link.

Passage lengths per Design Instructions Section 9: opening 200-400 words,
intermediates 100-250, choices 20-60 each, debriefs 200-400. Totals land
around 8,000-14,000 words in current practice.

## 5. Endings and debriefs

Every ending: outcome narrative first (no headers, just the story landing),
then `<hr>`, then:

    <div class="debrief">
    <h3>What happened</h3>
    <p>...</p>
    <h3>ADM analysis</h3>
    <p>...name the pivotal decisions and any hazardous attitudes...</p>
    <h3>What good judgment looks like here</h3>
    <p>...the optimal decision process, regs cited by part and section only
    when they matter (14 CFR 91.155, not "the FAA says")...</p>
    <h3>Key takeaway</h3>
    <p>One or two sentences the learner carries out the door.</p>
    </div>
    <div class="restart">
    <<link "Return to Start" "FlightPrep">>...reset every variable...<</link>>
    </div>

Debriefs may reference the learner's actual path via `<<if>>` on state
variables. Conditional text must be correct for every reachable state.

## 6. Technical accuracy protocol

Airports, runways, elevations, frequencies, navaids, and airways are real.
Verify with the aviation MCP tools (get_airport_info, get_navaid_info,
get_fix_info) rather than memory. Weather is fictional but format-perfect
and meteorologically coherent (dewpoint spreads, wind/pressure/ceiling
trends that make sense together, AIRMET boundaries that match the synopsis).

Approach plate specifics (a named approach's DA/MDA and visibility) appear
only if verified against the current real plate (get_tpp, or the
aeronav.faa.gov PDF linked from the airport's AirNav page, is authoritative).
If you can't verify, write around it: name the approach type generically and
keep numbers out. Do not invent minimums for named real procedures.

ATC transmissions verbatim and phraseology-correct, including full call
signs on initial contact and abbreviated thereafter. Altimeter settings,
transition levels, oxygen rules (91.211), fuel reserves (91.151/91.167),
and aircraft V-speeds must be right for the type. If the spec names a real
aircraft model, its systems behavior (fuel system, gear, props, ice
protection or lack of it) must match the type. No real people, no real
businesses beyond airports and official facilities; invent FBO and
restaurant names.

Tail numbers: invent plausible N-numbers not used by other scenarios (grep
first). Character names: fresh cast, zero reuse across scenarios (grep the
names you pick across `scenarios/` before committing to them).

## 7. Verification loop (run before reporting done)

From repo root:

    python3 tools/audit_continuity.py scenarios/<slug>/<File>.twee
    python3 tools/style_lint.py scenarios/<slug>/<File>.twee
    python3 tools/convert_twee.py <slug>

Audit must end "No problems found." Lint must show zero ERRORs (WARNs are
allowed only with a stated reason per instance). convert_twee must complete
without complaint. Then walk Section 12 of the Design Instructions as a
self-checklist, and hand-trace every convergence point per Section 14: read
every incoming link against the convergence text.

Do not edit `build.sh`, `public/index.html`, other scenarios, or the tools.
Integration is handled downstream.

## 8. Report format (what to hand back)

Title, slug, file path. Passage/decision/ending/convergence counts from the
audit. The full tail of the audit and lint outputs. Cast list (names, roles)
and tail number. Airports and navaids used, with the facts you verified and
which tool verified them. Which required elements landed where
(counterintuitive-correct choice, didn't-help node, conflicting-info
decision, social-pressure beat). Ending inventory by type. Any WARNs kept
and why. Anything you were unsure about, flagged plainly.
