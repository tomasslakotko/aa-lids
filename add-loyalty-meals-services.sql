-- Add loyalty, meals, services, and baggage tracking fields to passengers table
-- Run this in Supabase SQL Editor

ALTER TABLE passengers ADD COLUMN IF NOT EXISTS loyalty_status TEXT DEFAULT 'NONE'; -- NONE, SILVER, GOLD, PLATINUM
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS miles_earned INTEGER DEFAULT 0;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS meal_preference TEXT; -- STANDARD, VEGETARIAN, VEGAN, KOSHER, HALAL, etc.
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS special_meals TEXT; -- JSON array of special meal requests
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS dietary_requirements TEXT;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS wifi_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS entertainment_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS extra_legroom BOOLEAN DEFAULT FALSE;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS bag_status TEXT DEFAULT 'CHECKED'; -- CHECKED, LOADED, UNLOADED, LOST
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS bag_location TEXT; -- Location where bag is stored/loaded

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_passengers_loyalty_status ON passengers(loyalty_status);
CREATE INDEX IF NOT EXISTS idx_passengers_bag_status ON passengers(bag_status);

