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
