-- Phase 14 (Stage 4): Portfolio animation style (approved option A1)
-- Additive and idempotent. Stores the presentation-only animation preference
-- per portfolio. Existing portfolios default to 'subtle' (Subtle Professional).
-- The internal gallery-only mode 'none' is never stored.

-- 1. Add the column. With a constant DEFAULT, PostgreSQL fills every existing
--    row with 'subtle', so no portfolio is left without a value.
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS animation_style VARCHAR(20) DEFAULT 'subtle';

-- 2. If the column already existed (re-run, or created by hand), repair any
--    missing or unsupported value before tightening constraints.
UPDATE portfolios
SET animation_style = 'subtle'
WHERE animation_style IS NULL
   OR animation_style NOT IN ('subtle', 'creative', 'minimal');

-- 3. Enforce the default and NOT NULL.
ALTER TABLE portfolios ALTER COLUMN animation_style SET DEFAULT 'subtle';
ALTER TABLE portfolios ALTER COLUMN animation_style SET NOT NULL;

-- 4. Allowed values (defence in depth; the API validates first).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'portfolios_animation_style_check'
    ) THEN
        ALTER TABLE portfolios
            ADD CONSTRAINT portfolios_animation_style_check
            CHECK (animation_style IN ('subtle', 'creative', 'minimal'));
    END IF;
END $$;
