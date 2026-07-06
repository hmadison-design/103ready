#!/usr/bin/env python3
"""Style linter for 103ready CYOA .twee files.

Mechanically enforces the prose rules from Harvey's Writing Guardrails and
Text DNA Bible, plus the narrative-neutrality rules from
docs/CYOA_Scenario_Design_Instructions.md Section 6.

Usage:
    python3 tools/style_lint.py scenarios/<slug>/<File>.twee [more files...]
    python3 tools/style_lint.py --all

Exit code 1 if any ERROR found. WARNs are advisory: fix or consciously keep.

Scope rules:
  - StoryData / StoryScript / StoryStylesheet blocks are skipped entirely.
  - /* ... */ comment spans (metadata headers) are skipped.
  - Narrative-neutrality checks (NEUTRAL-*) are suspended inside
    <div class="debrief"> ... </div>, where judgment is the whole point.
    All other checks still apply inside debriefs.
  - The left-arrow glyph is allowed only in established nav-link text
    (e.g. "&larr; Back to preflight" pattern written as a literal arrow).
"""

import re
import sys
import glob
import os

HARD_BANNED_WORDS = [
    # Guardrails 1a verbs
    "delve", "delves", "delving", "leverage", "leveraged", "leverages",
    "leveraging", "utilize", "utilizes", "utilized", "utilizing",
    "unleash", "unleashed", "empower", "empowers", "empowered",
    "facilitate", "facilitates", "facilitated", "foster", "fosters",
    "fostered", "bolster", "bolsters", "bolstered", "optimize",
    "optimizes", "optimized", "streamline", "streamlines", "streamlined",
    "spearhead", "spearheaded", "underscore", "underscores", "underscored",
    "illuminate", "illuminates", "elucidate", "elucidates", "embark",
    "embarks", "embarked", "unravel", "unravels", "reimagine",
    "revolutionize", "transcend", "transcends", "resonate", "resonates",
    "reverberate", "showcase", "showcases", "showcased", "grapple",
    "grapples", "intertwine", "intertwined", "entwine", "entwined",
    "garner", "garners", "garnered", "espouse", "espouses", "exacerbate",
    "exacerbates", "exacerbated", "exemplify", "exemplifies", "amplify",
    "amplifies", "amplified", "augment", "augments", "augmented",
    "conceptualize", "crafted", "crafting", "enrich", "enriches",
    "enriched", "glean", "gleans", "gleaned", "maximize", "maximizes",
    "maximized", "strive", "strives", "unveil", "unveils", "unveiled",
    "champion", "championed",
    # Guardrails 1b adjectives
    "multifaceted", "nuanced", "seamless", "seamlessly", "robust",
    "scalable", "cutting-edge", "holistic", "holistically", "meticulous",
    "meticulously", "groundbreaking", "transformative", "innovative",
    "vibrant", "compelling", "invaluable", "paramount", "indelible",
    "indelibly", "poignant", "timeless", "relentless", "relentlessly",
    "tireless", "tirelessly", "noteworthy", "commendable", "exemplary",
    "unprecedented", "captivating", "bustling", "burgeoning",
    "flourishing", "impactful", "mission-critical", "pervasive",
    "thought-provoking", "unparalleled", "unwavering", "whimsical",
    "ever-evolving", "state-of-the-art", "game-changing", "game-changer",
    # Guardrails 1c nouns
    "tapestry", "realm", "testament", "myriad", "liminal",
    "kaleidoscope", "paradigm", "nexus", "catalyst", "symphony",
    "sentinel", "intricacies", "underpinnings", "synergy",
    "synergistically", "roadmap", "linchpin", "plethora", "stakeholders",
    "trajectory", "touchpoint", "touchpoints", "deliverables",
    "milestone", "milestones", "crucible", "epicenter", "pinnacle",
    "cornerstone", "bedrock", "virtuoso", "foray", "hallmark",
    # Guardrails 1d/1e adverbs and connectors
    "furthermore", "moreover", "crucially", "preemptively",
    "notwithstanding", "whilst", "herein", "heretofore", "thereby",
    "therein", "thereof", "akin", "amidst",
]

WARN_WORDS = [
    # Legitimate in some aviation contexts; verify each use is literal,
    # not buzzword. ("wiring harness" fine; "harness the power" not.)
    "beacon", "harness", "harnessed", "navigate", "navigating", "dynamic",
    "dynamics", "comprehensive", "intricate", "profound", "profoundly",
    "daunting", "elevate", "elevated", "embrace", "embraced", "weave",
    "woven", "journey", "ecosystem", "landscape", "quest", "endeavor",
    "groundwork", "arduous", "advent", "evoke", "evokes", "remarkable",
    "remarkably", "essentially", "fundamentally", "undoubtedly",
    "subsequently", "consequently", "additionally", "notably",
]

BANNED_PHRASES = [
    "it's worth noting", "it is worth noting", "worth mentioning",
    "it's important to note", "it is important to note",
    "it's important to remember", "it is important to remember",
    "it's crucial", "it is crucial", "keep in mind", "in conclusion",
    "in summary", "to summarize", "to sum up", "to wrap up",
    "at the end of the day", "the bottom line is", "a key takeaway is",
    "that being said", "simply put", "to put it simply", "in essence",
    "in other words", "needless to say", "it goes without saying",
    "let's dive", "let's delve", "let's explore", "let's unpack",
    "let's break this down", "here's the thing", "the best part?",
    "here's the kicker", "here's where it gets interesting",
    "but here's the truth",
    "in today's", "now more than ever", "fast-paced world",
    "when it comes to", "cannot be overstated", "since the dawn of time",
    "whether you're a beginner", "i hope this helps", "great question",
    "paving the way", "pushing the boundaries", "reaching new heights",
    "as an ai", "as a large language model", "dive deeper",
    "rich cultural heritage", "stark reminder", "serves as a reminder",
]

# Narrative neutrality (Design Instructions Section 6) — narrative passages
# must never signal that the learner erred. Suspended inside debrief divs.
NEUTRAL_PATTERNS = [
    (re.compile(r"\bunfortunately\b", re.I), "narrative may not editorialize ('Unfortunately')"),
    (re.compile(r"\bsadly\b", re.I), "narrative may not editorialize ('Sadly')"),
    (re.compile(r"\bworse still\b", re.I), "narrative may not editorialize ('Worse still')"),
    (re.compile(r"\byou should have\b", re.I), "narrative may not judge ('you should have')"),
    (re.compile(r"\bare you sure\b", re.I), "'Are you sure?' and equivalents are forbidden"),
    (re.compile(r"\byou realize you need to\b", re.I), "narrative may not steer ('you realize you need to')"),
    (re.compile(r"\bright answer\b", re.I), "narrative may not reference 'right answer'"),
    (re.compile(r"\bgot away with it\b", re.I), "narrative may not editorialize ('got away with it')"),
]

NEGATION_PATTERN = re.compile(
    r"\bisn'?t (?:just |about |merely |only )?[^.;:!?]{2,40}[,;] (?:it'?s|it is)\b", re.I)

# Discourse-marker fillers banned only in sentence-start position (so that
# literal uses like "where the truth is sold by the gallon" survive).
SENTENCE_START_PHRASES = [
    re.compile(r"(?:^|[.!?\"']\s+)the truth is[,:]?\s", re.I),
    re.compile(r"(?:^|[.!?\"']\s+)let'?s face it[,:]?\s", re.I),
]
NOT_BECAUSE_PATTERN = re.compile(r"\bnot because\b[^.;:!?]{2,60}\bbut because\b", re.I)

EM_DASH = "—"
EN_DASH = "–"
ELLIPSIS = "…"
ARROWS = ["→", "⇒", "↑", "↓", "➡"]
LEFT_ARROW = "←"

SKIP_PASSAGE_RE = re.compile(r"^:: (StoryData|StoryScript|StoryStylesheet)\b")
PASSAGE_RE = re.compile(r"^:: ")

WORD_RES = {w: re.compile(r"\b" + re.escape(w) + r"\b", re.I) for w in HARD_BANNED_WORDS}
WARN_RES = {w: re.compile(r"\b" + re.escape(w) + r"\b", re.I) for w in WARN_WORDS}
PHRASE_RES = {p: re.compile(re.escape(p), re.I) for p in BANNED_PHRASES}


def lint_file(path):
    with open(path, encoding="utf-8") as fh:
        lines = fh.read().splitlines()

    problems = []       # (level, lineno, message)
    in_skip_passage = False
    in_comment = False
    in_debrief = False
    in_ending_passage = False
    in_data_div = False
    prose_words = 0
    semicolons = 0

    for i, line in enumerate(lines, 1):
        if PASSAGE_RE.match(line):
            in_skip_passage = bool(SKIP_PASSAGE_RE.match(line))
            in_debrief = False
            in_data_div = False
            # Neutrality rules apply to intermediate passages only; endings
            # (tagged [ending]) legitimately carry retrospective judgment.
            in_ending_passage = bool(re.search(r"\[[^\]]*ending[^\]]*\]", line)) \
                or bool(re.match(r"^:: End", line))
        if in_skip_passage:
            continue

        # Track /* ... */ comment spans (metadata blocks)
        scan = line
        if in_comment:
            if "*/" in scan:
                scan = scan.split("*/", 1)[1]
                in_comment = False
            else:
                continue
        while "/*" in scan:
            pre, rest = scan.split("/*", 1)
            if "*/" in rest:
                scan = pre + rest.split("*/", 1)[1]
            else:
                scan = pre
                in_comment = True
                break

        if 'class="debrief"' in scan:
            in_debrief = True
        if in_debrief and "</div>" in scan and 'class="debrief"' not in scan:
            # crude close detection: debrief div closes on a bare </div> line
            if scan.strip() == "</div>":
                in_debrief = False
        if re.search(r'class="(flight-plan|metar-block|aircraft-card|airport-table|wx-block|[a-z-]*-(?:block|card|plan|table))"', scan):
            in_data_div = True
        if in_data_div and "</div>" in scan or "</table>" in scan:
            in_data_div = False

        stripped = scan.strip()
        if not stripped:
            continue

        prose_words += len(re.findall(r"[A-Za-z']+", stripped))
        semicolons += stripped.count(";") - stripped.count("&nbsp;")

        if EM_DASH in scan:
            problems.append(("ERROR", i, "em dash (U+2014) — never permitted in prose"))
        if ELLIPSIS in scan:
            problems.append(("ERROR", i, "Unicode ellipsis (U+2026) — use three dots or restructure"))
        arrows_ok = in_data_div or "<td" in scan or "<th" in scan \
            or 'class="sectional-label"' in scan
        for a in ARROWS:
            if a in scan and not arrows_ok:
                problems.append(("ERROR", i, "Unicode arrow %r in prose" % a))
        if LEFT_ARROW in scan and "Back to" not in scan:
            problems.append(("WARN", i, "left-arrow glyph outside the established 'Back to' nav pattern"))
        if EN_DASH in scan:
            problems.append(("WARN", i, "en dash (U+2013) — prefer hyphen or rewrite"))
        if "--" in stripped and not stripped.startswith("<!--") and "-->" not in stripped:
            problems.append(("WARN", i, "double hyphen reads as an em dash in disguise"))

        low = scan.lower()
        for w, rx in WORD_RES.items():
            if rx.search(scan):
                problems.append(("ERROR", i, "banned word: '%s'" % w))
        for w, rx in WARN_RES.items():
            if rx.search(scan):
                problems.append(("WARN", i, "verify literal (non-buzzword) use: '%s'" % w))
        for p, rx in PHRASE_RES.items():
            if rx.search(low):
                problems.append(("ERROR", i, "banned phrase: '%s'" % p))
        for rx in SENTENCE_START_PHRASES:
            if rx.search(scan):
                problems.append(("ERROR", i, "banned discourse-marker phrase at sentence start"))

        if not in_debrief and not in_ending_passage:
            for rx, msg in NEUTRAL_PATTERNS:
                if rx.search(scan):
                    problems.append(("ERROR", i, "NEUTRAL: " + msg))
        if NEGATION_PATTERN.search(scan) or NOT_BECAUSE_PATTERN.search(scan):
            problems.append(("WARN", i, "possible 'It's not X, it's Y' negation pattern"))

        if re.search(r"Decision \d+", scan) and re.search(r"[-—–] *Decision \d+", scan):
            problems.append(("ERROR", i, "decision heading must use colon, not dash"))

    if prose_words and semicolons > max(1, prose_words / 1000):
        problems.append(("WARN", 0, "semicolon density: %d in ~%d words (budget: 1 per 1,000)"
                         % (semicolons, prose_words)))

    return problems


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    if args == ["--all"]:
        repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        args = sorted(glob.glob(os.path.join(repo, "scenarios", "*", "*.twee")))

    any_error = False
    for path in args:
        problems = lint_file(path)
        errors = [p for p in problems if p[0] == "ERROR"]
        warns = [p for p in problems if p[0] == "WARN"]
        print("=" * 70)
        print(path)
        print("=" * 70)
        if not problems:
            print("Clean.")
            continue
        for level, lineno, msg in problems:
            print("  %-5s line %4s: %s" % (level, lineno or "-", msg))
        print("  (%d errors, %d warnings)" % (len(errors), len(warns)))
        if errors:
            any_error = True
    sys.exit(1 if any_error else 0)


if __name__ == "__main__":
    main()
