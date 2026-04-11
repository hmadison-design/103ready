#!/usr/bin/env python3
"""Convert a .twee file to a Twine 2 HTML archive for import.

Usage:
    python3 tools/convert_twee.py                          # build all scenarios
    python3 tools/convert_twee.py cylinder-three           # build one scenario

Run from the repo root (103ready/).

The converter looks for optional image data URI files in:
    scenarios/<name>/images/*.datauri.txt
These are NOT stored in git (too large). Generate them locally from source PDFs.
"""

import os
import re
import html
import json
import uuid
import glob
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENARIOS_DIR = os.path.join(REPO_ROOT, "scenarios")
OUTPUT_DIR = os.path.join(REPO_ROOT, "output")


def parse_twee(twee_text):
    """Parse a .twee file into passages."""
    passages = []
    story_title = ""
    story_data = {}
    stylesheet = ""
    script = ""

    parts = re.split(r'^:: ', twee_text, flags=re.MULTILINE)

    for part in parts[1:]:
        lines = part.split('\n', 1)
        header = lines[0].strip()
        content = lines[1] if len(lines) > 1 else ""

        tag_match = re.match(r'^(.+?)\s*\[(.+?)\]\s*$', header)
        if tag_match:
            name = tag_match.group(1).strip()
            tags = tag_match.group(2).strip()
        else:
            name = header.strip()
            tags = ""

        if name == "StoryTitle":
            story_title = content.strip()
            continue
        elif name == "StoryData":
            story_data = json.loads(content.strip())
            continue
        elif name == "StoryStylesheet" or "stylesheet" in tags:
            stylesheet = content.strip()
            continue
        elif name == "StoryScript" or "script" in tags:
            script = content.strip()
            continue

        passages.append({
            "name": name,
            "tags": tags.replace("stylesheet", "").strip() if "stylesheet" not in tags else tags,
            "content": content.rstrip()
        })

    return story_title, story_data, stylesheet, script, passages


def generate_archive(story_title, story_data, stylesheet, script, passages):
    """Generate a Twine 2 HTML archive."""
    ifid = story_data.get("ifid", str(uuid.uuid4()).upper())
    fmt = story_data.get("format", "SugarCube")
    fmt_version = story_data.get("format-version", "2.37.3")
    start_passage = story_data.get("start", "FlightPrep")

    start_pid = "1"
    for i, p in enumerate(passages):
        if p["name"] == start_passage:
            start_pid = str(i + 1)
            break

    passage_elements = []
    cols = 5
    x_spacing = 200
    y_spacing = 200

    for i, p in enumerate(passages):
        pid = str(i + 1)
        col = i % cols
        row = i // cols
        x = 100 + col * x_spacing
        y = 100 + row * y_spacing

        escaped_content = html.escape(p["content"], quote=True)
        escaped_name = html.escape(p["name"], quote=True)
        tags = html.escape(p["tags"], quote=True) if p["tags"] else ""

        passage_elements.append(
            f'<tw-passagedata pid="{pid}" name="{escaped_name}" tags="{tags}" '
            f'position="{x},{y}" size="100,100">{escaped_content}</tw-passagedata>'
        )

    archive = f'''<tw-storydata name="{html.escape(story_title, quote=True)}" startnode="{start_pid}" creator="Twine" creator-version="2.9.1" format="{html.escape(fmt, quote=True)}" format-version="{html.escape(fmt_version, quote=True)}" ifid="{html.escape(ifid, quote=True)}" options="" tags="">
<style role="stylesheet" id="twine-user-stylesheet" type="text/twine-css">{stylesheet}</style>
<script role="script" id="twine-user-script" type="text/twine-javascript">{script}</script>
{chr(10).join(passage_elements)}
</tw-storydata>'''

    return archive


def inject_data_uris(twee_text, scenario_dir):
    """Replace %%PLACEHOLDER%% tokens with contents of matching .datauri.txt files."""
    images_dir = os.path.join(scenario_dir, "images")
    if not os.path.isdir(images_dir):
        return twee_text

    for uri_file in glob.glob(os.path.join(images_dir, "*.datauri.txt")):
        # Derive placeholder name from filename:
        # sectional_preview.datauri.txt -> %%SECTIONAL_PREVIEW%%
        basename = os.path.basename(uri_file).replace(".datauri.txt", "")
        placeholder = "%%" + basename.upper() + "%%"

        if placeholder in twee_text:
            with open(uri_file, "r") as f:
                uri = f.read().strip()
            twee_text = twee_text.replace(placeholder, uri)
            print(f"  Injected {placeholder} ({len(uri)/1024:.0f} KB)")

    return twee_text


def build_scenario(scenario_name):
    """Build a single scenario."""
    scenario_dir = os.path.join(SCENARIOS_DIR, scenario_name)
    twee_files = glob.glob(os.path.join(scenario_dir, "*.twee"))

    if not twee_files:
        print(f"  No .twee file found in {scenario_dir}")
        return False

    twee_path = twee_files[0]
    print(f"\n{'='*60}")
    print(f"Building: {scenario_name}")
    print(f"Source:   {os.path.basename(twee_path)}")
    print(f"{'='*60}")

    with open(twee_path, "r") as f:
        twee_text = f.read()

    # Inject any data URIs from the images folder
    twee_text = inject_data_uris(twee_text, scenario_dir)

    # Check for unresolved placeholders
    remaining = re.findall(r'%%[A-Z_]+%%', twee_text)
    if remaining:
        unique = set(remaining)
        print(f"  WARNING: Unresolved placeholders: {', '.join(unique)}")
        print(f"  (Create matching .datauri.txt files in {scenario_name}/images/)")

    story_title, story_data, stylesheet, script, passages = parse_twee(twee_text)

    print(f"  Story:    {story_title}")
    print(f"  IFID:     {story_data.get('ifid', 'N/A')}")
    print(f"  Start:    {story_data.get('start', 'N/A')}")
    print(f"  Format:   {story_data.get('format', 'N/A')} v{story_data.get('format-version', 'N/A')}")
    print(f"  CSS:      {len(stylesheet)} chars")
    print(f"  Passages: {len(passages)}")
    for p in passages:
        print(f"    - {p['name']} [{p['tags']}]")

    archive_html = generate_archive(story_title, story_data, stylesheet, script, passages)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    # Output filename matches the twee filename
    base = os.path.splitext(os.path.basename(twee_path))[0]
    output_path = os.path.join(OUTPUT_DIR, f"{base}_Import.html")
    with open(output_path, "w") as f:
        f.write(archive_html)

    print(f"\n  Archive: {output_path}")
    print(f"  Size:    {len(archive_html)/1024:.0f} KB")
    return True


def main():
    # If a scenario name is given, build just that one
    if len(sys.argv) > 1:
        scenario_name = sys.argv[1]
        build_scenario(scenario_name)
    else:
        # Build all scenarios
        if not os.path.isdir(SCENARIOS_DIR):
            print(f"No scenarios directory found at {SCENARIOS_DIR}")
            return

        scenarios = sorted([
            d for d in os.listdir(SCENARIOS_DIR)
            if os.path.isdir(os.path.join(SCENARIOS_DIR, d))
        ])

        if not scenarios:
            print("No scenarios found.")
            return

        print(f"Found {len(scenarios)} scenario(s): {', '.join(scenarios)}")
        for name in scenarios:
            build_scenario(name)

    print("\nDone.")


if __name__ == "__main__":
    main()
