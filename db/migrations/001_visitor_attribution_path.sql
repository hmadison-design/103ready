-- Migration 001: durable visitor id, first-touch attribution, scenario
-- version, and per-passage path logging. Additive only. Safe to run once
-- on the existing r103-tracking database (Cloudflare D1 / SQLite).
--
-- How to apply: Cloudflare dashboard, D1, r103-tracking, Console tab,
-- paste this whole file, Execute. Each statement is idempotent except the
-- two ALTER TABLE lines; if you run this twice, SQLite reports
-- "duplicate column name" on those and everything else still applies.
--
-- The site works before and after this migration. functions/api/track.js
-- falls back to the legacy insert if the new columns are missing, and
-- functions/api/stats.js reports migrated: false until the new tables exist.

-- 1. Visitor id and scenario version on every start/ending event.
ALTER TABLE events ADD COLUMN visitor TEXT;
ALTER TABLE events ADD COLUMN version TEXT;
CREATE INDEX IF NOT EXISTS idx_events_visitor ON events (visitor);

-- 2. First-touch attribution, one row per visitor, never overwritten.
CREATE TABLE IF NOT EXISTS visitors (
  visitor      TEXT PRIMARY KEY,
  first_seen   TEXT NOT NULL DEFAULT (datetime('now')),
  referrer     TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  landing      TEXT
);

-- 3. Path through each scenario, one row per passage displayed.
CREATE TABLE IF NOT EXISTS passages (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       TEXT NOT NULL DEFAULT (datetime('now')),
  scenario TEXT NOT NULL,
  session  TEXT NOT NULL,
  visitor  TEXT,
  version  TEXT,
  passage  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_passages_session ON passages (scenario, session, ts);
