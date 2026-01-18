-- Add user_email column to passengers table to link reservations to users
-- Run this in Supabase SQL Editor

ALTER TABLE passengers ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_passengers_user_email ON passengers(user_email);

