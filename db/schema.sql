-- 103ready.com completion tracking schema (Cloudflare D1 / SQLite).
-- Apply once to the database bound as "DB" on the Pages project.

CREATE TABLE IF NOT EXISTS events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       TEXT NOT NULL DEFAULT (datetime('now')),
  type     TEXT NOT NULL CHECK (type IN ('start', 'ending')),
  scenario TEXT NOT NULL,
  ending   TEXT,
  session  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_scenario_type ON events (scenario, type);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
