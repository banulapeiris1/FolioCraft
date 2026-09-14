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
    username VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    about TEXT,
    template VARCHAR(100) DEFAULT 'modern',
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index foreign key user_id for efficient user portfolio queries
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

