#!/usr/bin/env bash
# Cloudflare Pages build script for 103ready.com.
# Downloads tweego + SugarCube, compiles each scenario's .twee to playable HTML,
# then copies the landing page + logo + per-scenario assets into output/.
set -euo pipefail

TWEEGO_VER="2.1.1"
TWEEGO_URL="https://github.com/tmedwards/tweego/releases/download/v${TWEEGO_VER}/tweego-${TWEEGO_VER}-linux-x64.zip"

SUGARCUBE_VER="2.37.3"
SUGARCUBE_URL="https://github.com/tmedwards/sugarcube-2/releases/download/v${SUGARCUBE_VER}/sugarcube-${SUGARCUBE_VER}-for-twine-2.1-local.zip"

rm -rf output build-tmp
mkdir -p output build-tmp
cd build-tmp

echo "== Fetching tweego ${TWEEGO_VER} =="
curl -fsSL -o tweego.zip "${TWEEGO_URL}"
unzip -oq tweego.zip
chmod +x tweego
./tweego --version || true

echo "== Fetching SugarCube ${SUGARCUBE_VER} =="
curl -fsSL -o sugarcube.zip "${SUGARCUBE_URL}"
mkdir -p sc
unzip -oq sugarcube.zip -d sc
# Locate the format.js inside whatever folder SugarCube unzipped to,
# and place it at storyformats/sugarcube-2/ next to the tweego binary.
mkdir -p storyformats/sugarcube-2
SC_FORMAT=$(find sc -name format.js | head -1)
if [ -z "${SC_FORMAT}" ]; then
  echo "ERROR: could not find SugarCube format.js"
  exit 1
fi
cp "${SC_FORMAT}" storyformats/sugarcube-2/format.js
echo "SugarCube format.js staged at storyformats/sugarcube-2/format.js"

cd ..

compile_scenario() {
  local slug="$1"
  local src_dir="scenarios/${slug}"
  local out="output/${slug}.html"
  echo "== Compiling ${slug} -> ${out} =="
  # Guard: each scenario folder must contain exactly one .twee file.
  # Stray .twee files (old drafts, v1 copies) can silently overwrite passages.
  local twee_count
  twee_count=$(find "${src_dir}" -maxdepth 1 -type f -name '*.twee' | wc -l | tr -d ' ')
  if [ "${twee_count}" -ne 1 ]; then
    echo "ERROR: ${src_dir} has ${twee_count} .twee files; expected exactly 1."
    echo "Rename any stale drafts to .twee.bak so tweego ignores them."
    find "${src_dir}" -maxdepth 1 -type f -name '*.twee'
    exit 1
  fi
  (cd build-tmp && ./tweego -o "../${out}" -f sugarcube-2 "../${src_dir}")
}

compile_scenario "game-day"
compile_scenario "the-wall"
compile_scenario "cylinder-three"
compile_scenario "breakfast-at-coulter"
compile_scenario "blue-line"
compile_scenario "third-face"
compile_scenario "red-x"
compile_scenario "pink-dot"

echo "== Staging landing page =="
cp public/index.html output/index.html
cp public/103ready_logo.svg output/103ready_logo.svg

# Copy per-scenario audio/images if present (referenced at runtime).
for slug in game-day the-wall cylinder-three breakfast-at-coulter blue-line third-face red-x pink-dot; do
  for sub in audio images; do
    if [ -d "scenarios/${slug}/${sub}" ]; then
      mkdir -p "output/scenarios/${slug}/${sub}"
      cp -r "scenarios/${slug}/${sub}/." "output/scenarios/${slug}/${sub}/" 2>/dev/null || true
    fi
  done
done

rm -rf build-tmp
echo "== Done =="
ls -la output/
