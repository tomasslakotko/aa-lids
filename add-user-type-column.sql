-- Add user_type column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'passenger';

-- Update existing users to be passengers
UPDATE users SET user_type = 'passenger' WHERE user_type IS NULL;

