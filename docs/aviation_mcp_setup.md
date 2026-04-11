# Aviation MCP Setup Instructions

The [aviation-mcp](https://github.com/blevinstein/aviation-mcp) npm package provides direct API access to FAA aviation data — weather (METAR, TAF, PIREP, SIGMET, G-AIRMET), sectional/TAC/IFR charts, NOTAMs, and aircraft info.

## What It Gives Us

- **Charts** (no API key needed): Sectional, TAC, IFR enroute, and TPP charts — programmatic access to chart imagery for scenario development
- **Weather** (no API key needed): Real-time METAR, TAF, PIREP, SIGMET, G-AIRMET data for building realistic weather briefings
- **NOTAMs** (requires free FAA API credentials): Notice to Air Missions data

## Installation Steps

### 1. Verify Node.js is installed

Open Terminal and run:
```bash
node --version
```
If not installed: `brew install node`

### 2. Add to Claude Desktop MCP config

Open Claude Desktop → Settings → Developer → Edit Config (or edit `~/Library/Application Support/Claude/claude_desktop_config.json`)

Add this to the `mcpServers` section:

```json
{
  "mcpServers": {
    "aviation": {
      "command": "npx",
      "args": ["-y", "aviation-mcp"]
    }
  }
}
```

That's the minimal config — weather and charts work with no keys.

### 3. (Optional) Add FAA API credentials for NOTAMs

Visit https://api.faa.gov/s/ to register for free FAA API credentials, then update the config:

```json
{
  "mcpServers": {
    "aviation": {
      "command": "npx",
      "args": ["-y", "aviation-mcp"],
      "env": {
        "FAA_CLIENT_ID": "<your-id>",
        "FAA_CLIENT_SECRET": "<your-secret>"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

After saving the config, restart the app. The aviation tools should appear in your available MCP tools.

## How This Helps 103ready

- Pull sectional chart tiles programmatically instead of screenshotting SkyVector
- Generate realistic weather briefings with real METAR/TAF data for any airport
- Look up PIREPs and SIGMETs for scenario research
- Access approach plates and terminal procedures for IFR-related scenarios
