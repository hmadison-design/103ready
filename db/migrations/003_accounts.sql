-- Migration 003: accounts and sign-in. Additive only. Apply in the D1 console.
-- Nothing on the site reads these tables unless AUTH_ENABLED is set on the
-- Pages project, so applying early is harmless.
--
-- Design rule: no table here ever holds a tracking visitor id or session id.
-- The account domain and the anonymous play domain are never joined.

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  stripe_customer_id TEXT
);

-- One row per sign-in attempt. Only hashes are stored; the link token and
-- the six-digit code are shown to the learner once, in the email.
CREATE TABLE IF NOT EXISTS logins (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  code_hash   TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  used_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_logins_email_created ON logins (email, created_at);

-- Browser sessions. The cookie holds a random id; only its hash is stored.
CREATE TABLE IF NOT EXISTS sessions (
  id_hash    TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_seen  TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
