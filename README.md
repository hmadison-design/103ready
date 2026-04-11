# 103ready.com

Choose Your Own Adventure (CYOA) training scenarios for general aviation pilots.

## About

Interactive, branching decision-making scenarios built with [Twine 2](https://twinery.org/) and [SugarCube v2.37.3](https://www.motoslave.net/sugarcube/2/). Each scenario is designed as a teaching tool targeting GA pilots with 500–1,000 hours total time, focusing on aeronautical decision-making (ADM).

## Repository Structure

```
103ready/
├── scenarios/
│   └── cylinder-three/          # First scenario — partial engine roughness
│       ├── Cylinder_Three.twee  # Twee source (master file)
│       ├── audio/               # Sound effects (mp3)
│       └── images/              # Sectional chart clips, etc.
├── tools/
│   └── convert_twee.py          # Twee → Twine 2 HTML archive converter
├── output/                      # Built HTML archives (gitignored)
└── docs/                        # Shopping lists, design notes, etc.
```

## Scenarios

| Scenario | Status | Description |
|----------|--------|-------------|
| Cylinder Three | In development | Engine roughness over western Oklahoma — divert, troubleshoot, or press on? |

## Building

```bash
python3 tools/convert_twee.py
```

This generates the Twine 2 importable HTML archive in `output/`.

## License

All rights reserved. © 103ready.com
