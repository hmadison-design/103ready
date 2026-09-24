-- Migration 002: completion codes and WINGS submissions. Additive only.
-- Apply after 001 (order does not actually matter; nothing here depends on it).
--
-- Dashboard: D1, r103-tracking, Console, paste, Execute.
--
-- The site works without this: /api/check still grades and issues codes
-- (codes are self-verifying), it just cannot log issuance, and /api/wings
-- returns 503 to submitters until the table exists.

-- Codes issued by /api/check after a passed knowledge check.
CREATE TABLE IF NOT EXISTS completions (
  code      TEXT PRIMARY KEY,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  scenario  TEXT NOT NULL,
  session   TEXT NOT NULL,
  version   TEXT,
  score     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_completions_scenario ON completions (scenario, issued_at);

-- Learner submissions for WINGS credit. The only table on the site that
-- holds an email address. Harvey validates on FAASafety.gov by hand and
-- marks the row from /admin.html.
CREATE TABLE IF NOT EXISTS wings_submissions (
  code         TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  validated_at TEXT
);
