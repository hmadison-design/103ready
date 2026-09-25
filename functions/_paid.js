// Which scenarios are behind the subscription. Free ones are the WINGS
// scenarios from the recommendation. Everything not listed as free and
// present in SCENARIOS is paid. Keep SCENARIOS in step with build.sh.
export const SCENARIOS = [
  "game-day", "the-wall", "cylinder-three", "breakfast-at-coulter",
  "blue-line", "third-face", "red-x", "pink-dot", "the-gauntlet",
  "ice-in-the-cowl", "crossfeed", "the-good-engine", "within-limits",
  "cabin-heat", "the-forty-five", "one-eighty"
];
export const FREE = new Set(["the-forty-five", "one-eighty"]);
export const PAID = new Set(SCENARIOS.filter(s => !FREE.has(s)));

/* Returns the paid slug a path refers to, or null. Matches /slug, /slug.html, /slug/. */
export function paidSlugFor(pathname) {
  const m = /^\/([a-z0-9-]+)(?:\.html|\/)?$/.exec(pathname);
  if (!m) { return null; }
  return PAID.has(m[1]) ? m[1] : null;
}
