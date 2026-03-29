-- Add password management fields to profiles table (idempotent for existing DBs)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_is_locked ON profiles(is_locked) WHERE is_locked = true;