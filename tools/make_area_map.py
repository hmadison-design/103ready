#!/usr/bin/env python3
"""Route-overview area map generator for 103ready CYOA scenarios.

Implements Harvey's route-overview style rules (mandatory for all
route-overview maps; sectional chart snippets are exempt and keep FAA
styling):
  - White background
  - Scale bar: black, twice default thickness, raised ~20 px from default
  - Direction indicator: single black arrow toward true north, thicker
    lines, with the word "true" in italics directly beneath, black
  - No compass rose

Usage:
    python3 tools/make_area_map.py <scenario-slug>

Route definitions live in ROUTES below; add an entry per scenario.
Output: scenarios/<slug>/images/area_map.jpg (and .png)
"""

import os
import sys
import math

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrow

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Each route: list of (label, lat, lon, kind) where kind is
# "airport" | "fix" | "alternate", plus optional extra airports to plot.
ROUTES = {
    "ice-in-the-cowl": {
        "title": "KJEF to KMLE (about 255 nm via STJ and OVR)",
        "path": [
            ("KJEF", 38.5912, -92.1561, "airport"),
            ("KSTJ", 39.7719, -94.9097, "airport"),
            ("OVR", 41.17, -95.74, "fix", 8, -16),
            ("KMLE", 41.1960, -96.1123, "airport", -64, 6),
        ],
        "extras": [
            ("KIRK", 40.0935, -92.5449, "alternate"),
            ("KFNB", 40.0788, -95.5920, "alternate"),
            ("KCBF", 41.2601, -95.7586, "alternate"),
            ("KLNK", 40.8509, -96.7591, "alternate"),
            ("KMCI", 39.2976, -94.7139, "alternate"),
        ],
        "airway_labels": [],
    },
    "crossfeed": {
        "title": "KSAT to KELP, 430 nm direct along the I-10 corridor",
        "path": [
            ("KSAT", 29.5340, -98.4691, "airport"),
            ("KELP", 31.8073, -106.3764, "airport", -60, 8),
        ],
        "extras": [
            ("KJCT", 30.5111, -99.7629, "alternate"),
            ("Sonora", 30.57, -100.65, "fix", -14, -16),
            ("Ozona", 30.71, -101.20, "fix", -12, -16),
            ("KFST", 30.9152, -102.9128, "alternate"),
            ("KPEQ", 31.3824, -103.5107, "alternate"),
            ("KINK", 31.7798, -103.2017, "alternate"),
        ],
        "airway_labels": [],
    },
    "within-limits": {
        "title": "E38 to KHYI, 273 nm, the high empty country first",
        "path": [
            ("E38", 30.3842, -103.6836, "airport"),
            ("KHYI", 29.8927, -97.8630, "airport", -20, 12),
        ],
        "extras": [
            ("KMRF", 30.3710, -104.0177, "alternate", -46, -16),
            ("KFST", 30.9152, -102.9128, "alternate"),
            ("KOZA", 30.7352, -101.2022, "alternate"),
            ("KJCT", 30.5111, -99.7629, "alternate"),
        ],
        "airway_labels": [],
    },
    "the-good-engine": {
        "title": "KLEX to KLWB, engine secured over southern West Virginia",
        "path": [
            ("KLEX", 38.0367, -84.6086, "airport"),
            ("present position", 37.90, -81.45, "fix", -50, -18),
            ("KLWB", 37.8583, -80.3995, "airport", -18, 12),
        ],
        "extras": [
            ("KCRW", 38.3760, -81.5929, "alternate"),
            ("KBKW", 37.7873, -81.1242, "alternate", 8, -14),
        ],
        "airway_labels": [],
    },
}


def nm_per_deg_lon(lat_deg):
    return 60.0 * math.cos(math.radians(lat_deg))


def build(slug):
    spec = ROUTES[slug]
    pts = spec["path"]
    extras = spec.get("extras", [])
    all_pts = pts + extras

    lats = [p[1] for p in all_pts]
    lons = [p[2] for p in all_pts]
    lat_c = (min(lats) + max(lats)) / 2.0

    fig, ax = plt.subplots(figsize=(9.6, 7.2), dpi=150)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    # Route line
    ax.plot([p[2] for p in pts], [p[1] for p in pts],
            color="#1A3C57", linewidth=3.0, zorder=3,
            solid_capstyle="round")

    # Points. Each entry: (label, lat, lon, kind[, dx, dy]) where dx/dy are
    # optional label offsets in points to dodge collisions.
    for entry in all_pts:
        label, lat, lon, kind = entry[0], entry[1], entry[2], entry[3]
        dx = entry[4] if len(entry) > 4 else None
        dy = entry[5] if len(entry) > 5 else None
        if kind == "airport":
            ax.plot(lon, lat, "o", color="#1A3C57", markersize=11, zorder=4)
            ax.annotate(label, (lon, lat), textcoords="offset points",
                        xytext=(dx if dx is not None else 10,
                                dy if dy is not None else 8),
                        fontsize=13, fontweight="bold", color="black")
        elif kind == "fix":
            ax.plot(lon, lat, "^", color="#444444", markersize=8, zorder=4)
            ax.annotate(label, (lon, lat), textcoords="offset points",
                        xytext=(dx if dx is not None else 8,
                                dy if dy is not None else -14),
                        fontsize=10, color="#333333")
        else:  # alternate
            ax.plot(lon, lat, "o", markerfacecolor="white",
                    markeredgecolor="#666666", markersize=8,
                    markeredgewidth=1.6, zorder=4)
            ax.annotate(label, (lon, lat), textcoords="offset points",
                        xytext=(dx if dx is not None else 8,
                                dy if dy is not None else 6),
                        fontsize=10, color="#555555")

    for text, lat, lon in spec.get("airway_labels", []):
        ax.annotate(text, (lon, lat), fontsize=11, color="#1A3C57",
                    fontstyle="italic", fontweight="bold")

    # Frame the view with margin
    lat_pad = (max(lats) - min(lats)) * 0.18 + 0.15
    lon_pad = (max(lons) - min(lons)) * 0.14 + 0.15
    ax.set_xlim(min(lons) - lon_pad, max(lons) + lon_pad)
    ax.set_ylim(min(lats) - lat_pad, max(lats) + lat_pad)
    ax.set_aspect(1.0 / math.cos(math.radians(lat_c)))
    ax.axis("off")

    # ---- Scale bar (style rules: black, 2x thickness, raised ~20 px) ----
    span_nm = 50.0
    span_deg = span_nm / nm_per_deg_lon(lat_c)
    x0 = ax.get_xlim()[0] + (ax.get_xlim()[1] - ax.get_xlim()[0]) * 0.06
    # default placement would be ~3% up; raised ~20 px (~5% at this dpi)
    y0 = ax.get_ylim()[0] + (ax.get_ylim()[1] - ax.get_ylim()[0]) * 0.085
    tick = (ax.get_ylim()[1] - ax.get_ylim()[0]) * 0.012
    ax.plot([x0, x0 + span_deg], [y0, y0], color="black", linewidth=4.0,
            zorder=5, solid_capstyle="butt")
    for xx in (x0, x0 + span_deg / 2.0, x0 + span_deg):
        ax.plot([xx, xx], [y0 - tick, y0 + tick], color="black",
                linewidth=4.0, zorder=5)
    ax.annotate("0", (x0, y0), textcoords="offset points", xytext=(-3, 8),
                fontsize=10, color="black")
    ax.annotate("25", (x0 + span_deg / 2.0, y0), textcoords="offset points",
                xytext=(-6, 8), fontsize=10, color="black")
    ax.annotate("50 nm", (x0 + span_deg, y0), textcoords="offset points",
                xytext=(-10, 8), fontsize=10, color="black")

    # ---- True-north arrow (single arrow, thicker, italic 'true' below) ----
    xr = ax.get_xlim()[1] - (ax.get_xlim()[1] - ax.get_xlim()[0]) * 0.07
    yb = ax.get_ylim()[1] - (ax.get_ylim()[1] - ax.get_ylim()[0]) * 0.24
    alen = (ax.get_ylim()[1] - ax.get_ylim()[0]) * 0.12
    ax.add_patch(FancyArrow(xr, yb, 0, alen, width=0.0,
                            head_width=alen * 0.28, head_length=alen * 0.30,
                            length_includes_head=True, linewidth=3.2,
                            edgecolor="black", facecolor="black", zorder=5))
    ax.plot([xr, xr], [yb, yb + alen * 0.72], color="black", linewidth=3.2,
            zorder=5)
    ax.annotate("true", (xr, yb), textcoords="offset points", xytext=(-11, -16),
                fontsize=11, fontstyle="italic", color="black")

    ax.set_title(spec["title"], fontsize=13, color="black", pad=12)

    out_dir = os.path.join(REPO_ROOT, "scenarios", slug, "images")
    os.makedirs(out_dir, exist_ok=True)
    for ext in ("png", "jpg"):
        out = os.path.join(out_dir, "area_map." + ext)
        fig.savefig(out, bbox_inches="tight", facecolor="white")
        print("wrote", out)
    plt.close(fig)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ROUTES:
        print("usage: make_area_map.py <slug>; known:", ", ".join(ROUTES))
        sys.exit(2)
    build(sys.argv[1])
