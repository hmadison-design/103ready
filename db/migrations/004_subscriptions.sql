-- Migration 004: subscriptions, kept current by the Stripe webhook (phase 3).
-- Additive only. The paid gate (functions/_middleware.js) reads this table
-- only when PAID_GATE is set on the Pages project.

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id                INTEGER PRIMARY KEY,
  stripe_subscription_id TEXT UNIQUE,
  status                 TEXT NOT NULL,
  current_period_end     TEXT,
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
