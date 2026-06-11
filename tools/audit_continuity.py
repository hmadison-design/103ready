#!/usr/bin/env python3
"""Continuity and structure audit for 103ready .twee scenario files.

Implements the Section 14 pre-edit checklist from
docs/CYOA_Scenario_Design_Instructions.md:

  - broken links (link points to a passage that does not exist)
  - orphan passages (no incoming links, excluding Start and specials)
  - convergence points (passages with 2+ incoming links)
  - decision depth (minimum decision points from Start to every ending;
    flags endings reachable in fewer than 4 decisions)
  - repeated choice text (identical or near-identical choices offered
    on more than one passage)
  - endings without a debrief marker
  - passages with exactly one outgoing link that is not an ending
    (informational; these are narrative bridges)

Usage:
    python3 tools/audit_continuity.py scenarios/red-x/The_Red_X.twee
    python3 tools/audit_continuity.py --all
"""

import argparse
import difflib
import re
import sys
from collections import defaultdict
from pathlib import Path

SPECIAL = {"StoryTitle", "StoryData", "StoryInit", "StoryScript",
           "StoryStylesheet", "StoryCaption", "StoryMenu", "StoryBanner"}

PASSAGE_RE = re.compile(r"^:: *([^\[\{]+?) *(\[[^\]]*\])? *(\{.*\})? *$")
LINK2_RE = re.compile(r'<<link\s+"((?:[^"\\]|\\.)*)"\s+"((?:[^"\\]|\\.)*)"\s*>>')
LINK1_RE = re.compile(
    r'<<link\s+"((?:[^"\\]|\\.)*)"\s*>>(.*?)<</link>>', re.DOTALL)
GOTO_RE = re.compile(r'<<goto\s+"((?:[^"\\]|\\.)*)"\s*>>')
WIKI_RE = re.compile(r"\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]")
RESET_HINT = re.compile(r"return to start|try again|play again|start over",
                        re.IGNORECASE)


def parse(path):
    passages = {}  # name -> {"tags": [...], "text": str}
    name, tags, buf = None, [], []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        m = PASSAGE_RE.match(line)
        if m:
            if name is not None:
                passages[name] = {"tags": tags, "text": "\n".join(buf)}
            name = m.group(1).strip()
            tags = (m.group(2) or "").strip("[]").split() if m.group(2) else []
            buf = []
        elif name is not None:
            buf.append(line)
    if name is not None:
        passages[name] = {"tags": tags, "text": "\n".join(buf)}
    return passages


def links_of(text):
    """Return list of (choice_text, target) pairs."""
    out = []
    # <<link "text" "Target">>
    for m in LINK2_RE.finditer(text):
        out.append((m.group(1), m.group(2)))
    # <<link "text">> ... <<goto "Target">> ... <</link>>
    for m in LINK1_RE.finditer(text):
        body = m.group(2)
        g = GOTO_RE.search(body)
        if g:
            out.append((m.group(1), g.group(1)))
    # plain <<goto>> outside <<link>> (e.g., timed advance) — count target only
    stripped = LINK1_RE.sub("", text)
    stripped = LINK2_RE.sub("", stripped)
    for m in GOTO_RE.finditer(stripped):
        out.append(("(auto-advance)", m.group(1)))
    # wiki links
    for m in WIKI_RE.finditer(text):
        label = m.group(1)
        target = m.group(2) if m.group(2) else m.group(1)
        out.append((label, target))
    return out


def norm_choice(t):
    t = re.sub(r"^[A-H]\.\s*", "", t.strip())  # strip "A. " prefixes
    t = re.sub(r"\s+", " ", t.lower())
    return t


def audit(path, verbose=False):
    passages = parse(path)
    story = {k: v for k, v in passages.items()
             if k not in SPECIAL
             and "stylesheet" not in v["tags"] and "script" not in v["tags"]}

    # start passage comes from StoryData JSON ("start": "Name")
    start_name = "Start"
    if "StoryData" in passages:
        m = re.search(r'"start"\s*:\s*"([^"]+)"', passages["StoryData"]["text"])
        if m:
            start_name = m.group(1)

    graph = {}        # passage -> [(choice, target), ...]
    incoming = defaultdict(list)
    for nm, p in story.items():
        ls = links_of(p["text"])
        graph[nm] = ls
        for ch, tgt in ls:
            incoming[tgt].append((nm, ch))

    problems = []
    notes = []

    # ---- broken links
    for nm, ls in graph.items():
        for ch, tgt in ls:
            if tgt not in story:
                problems.append(f"BROKEN LINK: '{nm}' -> '{tgt}' "
                                f"(choice: {ch[:60]!r})")

    # ---- endings & orphans
    def is_reset(ch, tgt):
        return tgt == start_name and RESET_HINT.search(ch)

    endings = set()
    for nm, ls in graph.items():
        fwd = [(c, t) for c, t in ls if not is_reset(c, t)]
        if not fwd:
            endings.add(nm)

    start = start_name if start_name in story else None
    if start is None:
        print(f"  !! start passage '{start_name}' not found — "
              f"reachability checks skipped")
    for nm in story:
        if nm == start:
            continue
        if not incoming[nm]:
            problems.append(f"ORPHAN: '{nm}' has no incoming links")

    # ---- reachability + decision depth (min # of decision nodes on path)
    decision_nodes = {nm for nm, ls in graph.items()
                      if len([1 for c, t in ls if not is_reset(c, t)]) >= 2}
    depth = {}
    if start:
        from collections import deque
        depth[start] = 1 if start in decision_nodes else 0
        q = deque([start])
        while q:
            cur = q.popleft()
            for c, t in graph.get(cur, []):
                if is_reset(c, t) or t not in story:
                    continue
                d = depth[cur] + (1 if t in decision_nodes else 0)
                if t not in depth or d < depth[t]:
                    depth[t] = d
                    q.append(t)
        unreachable = set(story) - set(depth)
        for nm in sorted(unreachable):
            problems.append(f"UNREACHABLE from Start: '{nm}'")
        for e in sorted(endings):
            if e in depth and depth[e] < 4:
                problems.append(f"SHALLOW ENDING: '{e}' reachable with only "
                                f"{depth[e]} decision points (minimum is 4)")

    # ---- endings without debrief
    for e in sorted(endings):
        txt = story[e]["text"]
        if not re.search(r"debrief|what happened|adm analysis", txt,
                         re.IGNORECASE):
            problems.append(f"ENDING WITHOUT DEBRIEF MARKER: '{e}'")

    # ---- repeated choice text across passages
    by_choice = defaultdict(set)
    for nm, ls in graph.items():
        for c, t in ls:
            if c == "(auto-advance)" or is_reset(c, t):
                continue
            by_choice[norm_choice(c)].add(nm)
    for c, where in sorted(by_choice.items()):
        if len(where) > 1 and len(c) > 12:
            problems.append(f"REPEATED CHOICE on {len(where)} passages "
                            f"({', '.join(sorted(where))}): {c[:80]!r}")

    # near-duplicates (fuzzy) — different passages offering nearly the
    # same wording
    keys = [k for k in by_choice if len(k) > 25]
    seen = set()
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            if (a, b) in seen:
                continue
            seen.add((a, b))
            if difflib.SequenceMatcher(None, a, b).ratio() > 0.92:
                pa, pb = by_choice[a], by_choice[b]
                if pa != pb:
                    notes.append(f"NEAR-DUPLICATE CHOICES: {a[:60]!r} "
                                 f"({', '.join(sorted(pa))}) vs {b[:60]!r} "
                                 f"({', '.join(sorted(pb))})")

    # ---- convergence points
    conv = {nm: incoming[nm] for nm in story
            if len({src for src, _ in incoming[nm]}) >= 2}

    # ---- report
    print(f"\n{'=' * 70}\n{path}\n{'=' * 70}")
    print(f"passages: {len(story)}  decision nodes: {len(decision_nodes)}  "
          f"endings: {len(endings)}  convergence points: {len(conv)}")
    if start:
        ends_d = sorted((depth.get(e, -1), e) for e in endings)
        if ends_d:
            print(f"decision depth to endings: min "
                  f"{ends_d[0][0]} ('{ends_d[0][1]}'), max {ends_d[-1][0]}")
    if problems:
        print(f"\n--- PROBLEMS ({len(problems)}) ---")
        for p in problems:
            print(" !", p)
    else:
        print("\nNo problems found.")
    if notes:
        print(f"\n--- NOTES ({len(notes)}) ---")
        for n in notes:
            print(" -", n)
    if verbose:
        print("\n--- CONVERGENCE POINTS ---")
        for nm, inc in sorted(conv.items()):
            srcs = sorted({s for s, _ in inc})
            print(f"  {nm}  <-  {', '.join(srcs)}")
        print("\n--- DECISION NODES (choice counts) ---")
        for nm in sorted(decision_nodes):
            n = len([1 for c, t in graph[nm] if not is_reset(c, t)])
            print(f"  {nm}: {n} choices (min depth "
                  f"{depth.get(nm, '?')})")
    return len(problems)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()
    root = Path(__file__).resolve().parent.parent
    files = ([str(p) for p in sorted(root.glob("scenarios/*/*.twee"))]
             if args.all else args.files)
    if not files:
        ap.error("give .twee files or --all")
    total = sum(audit(f, args.verbose) for f in files)
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
