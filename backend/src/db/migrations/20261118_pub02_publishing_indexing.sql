-- PUB-02: Database Indexing & Publishing Schema Migration
-- Enables case-insensitive username uniqueness, public lookup indexing, and publishing timestamp

-- 1. Add published_at column to portfolios if not present
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- 2. Create case-insensitive functional unique index on LOWER(TRIM(username))
-- Ensures case-variant usernames (e.g., 'Alex' and 'alex') cannot collide
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolios_username_lower ON portfolios (LOWER(TRIM(username)));

-- 3. Create composite index for fast public portfolio retrieval
-- Optimizes SELECT queries filtering on LOWER(TRIM(username)) AND published
CREATE INDEX IF NOT EXISTS idx_portfolios_public_lookup ON portfolios (LOWER(TRIM(username)), published);

