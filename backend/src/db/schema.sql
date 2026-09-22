-- FolioCraft Database Schema: Users Foundation (AUTH-01)

-- Ensure UUID generation support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS TABLE
-- Stores user accounts with UUID primary key, unique email, and securely hashed passwords
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clean up any redundant non-unique index (email uniqueness already establishes a unique B-tree index)
DROP INDEX IF EXISTS idx_users_email;

-- PORTFOLIOS TABLE (PORTFOLIO-01)
-- Stores portfolio basic information owned by authenticated users
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    location VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    about TEXT,
    profile_image_url TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    username VARCHAR(255) NOT NULL UNIQUE,
    template VARCHAR(100) DEFAULT 'modern',
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Safe incremental alterations if portfolios table was already created previously
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE portfolios ALTER COLUMN name DROP DEFAULT;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- Ensure UNIQUE constraint on username if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'portfolios_username_key'
    ) THEN
        ALTER TABLE portfolios ADD CONSTRAINT portfolios_username_key UNIQUE (username);
    END IF;
END $$;

-- Index foreign key user_id for efficient user portfolio queries
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

-- PROJECTS TABLE (PROJECT-01)
-- Stores projects belonging to portfolios
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    technologies JSONB DEFAULT '[]'::jsonb,
    github_url TEXT,
    project_url TEXT,
    image_url TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index foreign key portfolio_id for efficient portfolio project queries
CREATE INDEX IF NOT EXISTS idx_projects_portfolio_id ON projects(portfolio_id);


