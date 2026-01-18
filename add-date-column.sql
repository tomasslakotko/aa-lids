-- Add 'date' column to flights table if it doesn't exist
-- Run this in Supabase SQL Editor

ALTER TABLE flights 
ADD COLUMN IF NOT EXISTS date TEXT;

