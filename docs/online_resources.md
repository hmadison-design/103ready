# 103ready.com — Online Aviation Resources

These are live web resources Claude can access via Chrome during scenario design and development. They replace the need to download and store most FAA publications locally.

## When to Use What

| I need to... | Go to... |
|---|---|
| Look up airport details (runways, frequencies, FBOs, fuel) | AirNav |
| View a sectional or IFR chart for a specific area | SkyVector |
| Get current or historical METARs, TAFs, PIREPs | AviationWeather.gov |
| Find approach plates / SIDs / STARs for an airport | AirNav (linked per airport) or SkyVector |
| Look up a regulation (14 CFR) | eCFR.gov |
| Check NOTAMs for an airport | NOTAM Search (FAA) |
| Research an accident or incident | NTSB Aviation Accident Database |
| Find airport diagrams | FAA DTPP or AirNav |
| Check TFRs | FAA TFR site or SkyVector (overlay) |
| Look up aircraft performance data | POH sources or type-specific forums |

---

## Core Resources

### AirNav.com
**What:** Comprehensive airport directory — runway data, frequencies, fuel prices, FBO info, approach plates, nearby airports, and more.
**URL pattern:** `https://www.airnav.com/airport/{ICAO}` (e.g., KSWO, KCSM, KEND)
**Best for:** Quick airport lookups during scenario development. Has links to approach plates (IAPs), airport diagrams, and nearby navaids. Excellent for building realistic preflight briefing materials.
**Notes:** Free, no login required. Very reliable data.

### SkyVector.com
**What:** Online flight planner with zoomable VFR sectional charts, IFR Low/High enroute charts, and terminal area charts rendered as interactive map layers.
**URL:** `https://skyvector.com`
**Best for:** Visually browsing chart coverage for a route without downloading PDFs. Can overlay weather, TFRs, and airspace. Good for picking scenario routes and verifying terrain/airspace. Also has terminal procedures (approach plates, SIDs, STARs) accessible per airport.
**Notes:** UI is complex — Harvey can assist navigating. Free tier has full chart viewing.

### AviationWeather.gov
**What:** Official NWS/FAA aviation weather service. METARs, TAFs, AIRMETs, SIGMETs, PIREPs, prog charts, winds aloft, icing/turbulence forecasts.
**URL:** `https://aviationweather.gov`
**Key pages:**
- METARs: `https://aviationweather.gov/data/metar/` (can query by station ID)
- TAFs: `https://aviationweather.gov/data/taf/`
- PIREPs: `https://aviationweather.gov/data/pirep/`
- Area Forecast Discussion: `https://aviationweather.gov/data/afd/`
**Best for:** Building realistic weather briefings for scenarios. Can pull actual historical weather to model scenario conditions on real-world patterns.

### FAA Digital Terminal Procedures (DTPP)
**What:** Official FAA source for all instrument approach procedures, departure procedures, arrival procedures, and airport diagrams.
**URL:** `https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/dtpp/`
**Best for:** Getting the actual approach plates when we need them embedded in a scenario's preflight materials.
**Notes:** Organized by region/volume. Individual PDFs per procedure. Updated on 28-day cycle.

### eCFR.gov (Electronic Code of Federal Regulations)
**What:** The live, current text of all federal regulations including Title 14 (Aeronautics and Space).
**URL:** `https://www.ecfr.gov/current/title-14`
**Key parts:**
- Part 61: Pilot certification
- Part 91: General operating rules (most relevant for GA scenarios)
- Part 97: Standard instrument procedures
- Part 830: NTSB accident/incident reporting
**Best for:** Verifying regulatory accuracy in scenario debriefs. When a debrief says "you should have declared an emergency per 14 CFR 91.3," we can confirm the exact wording.

### NTSB Aviation Accident Database
**What:** Searchable database of all aviation accidents and incidents investigated by the NTSB.
**URL:** `https://www.ntsb.gov/Pages/AviationQuery.aspx`
**Best for:** Researching real-world accidents to inspire scenario design. Finding probable cause patterns for specific failure modes (e.g., partial power loss, CFIT, VFR-into-IMC). Grounds our scenarios in reality.

### FAA Safety (FAASafety.gov)
**What:** FAA Safety Team (FAASTeam) portal — safety seminars, WINGS program, airman notices.
**URL:** `https://www.faasafety.gov`
**Best for:** Finding current safety emphasis areas, WINGS course content for cross-referencing our scenarios with official training objectives.

---

## Supplementary Resources

### LiveATC.net
**What:** Live and archived ATC audio streams from airports worldwide.
**URL:** `https://www.liveatc.net`
**Best for:** Reference for realistic radio phraseology and cadence. Could inform how we write ATC dialogue in scenarios. Also useful for ElevenLabs voice training reference.

### FlightAware
**What:** Flight tracking, airport activity, delay statistics.
**URL:** `https://www.flightaware.com`
**Best for:** Understanding traffic patterns at airports we use in scenarios. Checking whether a route makes sense for the kind of traffic environment we're portraying.

### Freesound.org
**What:** Community-curated sound effects library under Creative Commons licenses.
**URL:** `https://freesound.org`
**Best for:** Engine sounds, wind, radio squelch, and ambient audio for scenarios. See docs/Audio_Shopping_List.md for specific sounds needed.
**Notes:** Requires free account for downloads. Prefer CC0 or CC-BY licensed sounds.

---

## Resource Usage in Scenario Workflow

**During scenario DESIGN (brainstorming routes, situations, decision points):**
- SkyVector → browse charts for interesting terrain, airspace, airport combinations
- NTSB database → find real accident patterns that match the scenario concept
- AviationWeather.gov → model realistic weather for the scenario setting

**During scenario CREATION (writing passages, building preflight materials):**
- AirNav → pull exact runway lengths, frequencies, elevation for airports in the scenario
- AviationWeather.gov → craft realistic METARs and TAFs
- eCFR → verify regulatory references in debriefs
- SkyVector / Google Drive sectionals → extract chart clips for preflight map passages

**During scenario REVIEW (accuracy checking):**
- All of the above as needed to fact-check details
