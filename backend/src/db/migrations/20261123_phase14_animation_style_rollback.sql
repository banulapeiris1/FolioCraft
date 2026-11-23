-- Phase 14 (Stage 4): Rollback for the portfolio animation style migration.
-- Removes only the animation setting; no portfolio content is touched.
-- Portfolios render with the default 'subtle' style afterwards.

-- 1. Drop the allowed-values constraint
ALTER TABLE portfolios DROP CONSTRAINT IF EXISTS portfolios_animation_style_check;

-- 2. Drop the column
ALTER TABLE portfolios DROP COLUMN IF EXISTS animation_style;
