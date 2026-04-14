#!/usr/bin/env bash
# Cloudflare Pages build script for 103ready.com.
# Downloads tweego, compiles each scenario's .twee to playable HTML,
# and copies the landing page + logo into the publish directory.
set -euo pipefail

TWEEGO_VER="2.1.1"
TWEEGO_URL="https://github.com/tmedwards/tweego/releases/download/v${TWEEGO_VER}/tweego-${TWEEGO_VER}+storyformats-linux-x64.zip"

rm -rf output
mkdir -p output build-tmp
cd build-tmp

echo "== Fetching tweego ${TWEEGO_VER} =="
curl -sSL -o tweego.zip "${TWEEGO_URL}"
unzip -oq tweego.zip
chmod +x tweego
./tweego --version

cd ..

compile() {
  local slug="$1"
  local src_dir="scenarios/${slug}"
  local out="output/${slug}.html"
  echo "== Compiling ${slug} -> ${out} =="
  build-tmp/tweego -o "${out}" -f sugarcube-2 --head=build-tmp/storyformats "${src_dir}"
}

# tweego needs the storyformats dir adjacent or passed explicitly; bundled zip
# puts them under storyformats/ alongside the binary. Use --head only if needed.
compile_simple() {
  local slug="$1"
  local src_dir="scenarios/${slug}"
  local out="output/${slug}.html"
  echo "== Compiling ${slug} -> ${out} =="
  (cd build-tmp && ./tweego -o "../${out}" -f sugarcube-2 "../${src_dir}")
}

compile_simple "game-day"
compile_simple "the-wall"
compile_simple "cylinder-three"

echo "== Staging landing page =="
cp public/index.html output/index.html
cp public/103ready_logo.svg output/103ready_logo.svg

# Copy per-scenario audio/images if present (used by scenarios at runtime).
for slug in game-day the-wall cylinder-three; do
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
