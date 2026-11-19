-- PUB-02: Rollback Script for Database Indexing & Publishing Schema Migration

-- 1. Drop composite public lookup index
DROP INDEX IF EXISTS idx_portfolios_public_lookup;

-- 2. Drop case-insensitive unique username index
DROP INDEX IF EXISTS idx_portfolios_username_lower;

-- 3. Drop published_at column
ALTER TABLE portfolios DROP COLUMN IF EXISTS published_at;

