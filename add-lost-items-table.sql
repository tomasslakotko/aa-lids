-- Create lost_items table for Lost & Found system
CREATE TABLE IF NOT EXISTS lost_items (
  id TEXT PRIMARY KEY,
  item_number TEXT NOT NULL UNIQUE,
  file_reference_number TEXT, -- FRN for grouping multiple items
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location_found TEXT NOT NULL,
  found_date TIMESTAMPTZ NOT NULL,
  found_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'FOUND', -- FOUND, CLAIMED, ARCHIVED, SUSPENDED, CLOSED
  claimed_by TEXT,
  claimed_date TIMESTAMPTZ,
  contact_info TEXT,
  phone_number TEXT,
  phone_number_validated BOOLEAN DEFAULT FALSE,
  alternative_phone TEXT,
  -- Address fields
  address_line1 TEXT,
  address_line2 TEXT,
  town_city TEXT,
  county_state TEXT,
  postcode TEXT,
  country TEXT,
  notes TEXT,
  flight_number TEXT,
  storage_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_lost_items_status ON lost_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_items_item_number ON lost_items(item_number);
CREATE INDEX IF NOT EXISTS idx_lost_items_file_reference_number ON lost_items(file_reference_number);
CREATE INDEX IF NOT EXISTS idx_lost_items_category ON lost_items(category);
CREATE INDEX IF NOT EXISTS idx_lost_items_found_date ON lost_items(found_date);
CREATE INDEX IF NOT EXISTS idx_lost_items_flight_number ON lost_items(flight_number);

-- Enable Row Level Security (RLS) - allow all operations for now
ALTER TABLE lost_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security requirements)
CREATE POLICY "Allow all operations on lost_items" ON lost_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

