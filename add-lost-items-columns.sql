-- Add missing columns to existing lost_items table
-- Run this if the table already exists but is missing new columns

-- Add file_reference_number column
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS file_reference_number TEXT;

-- Add phone number columns
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS phone_number_validated BOOLEAN DEFAULT FALSE;
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS alternative_phone TEXT;

-- Add address columns
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS town_city TEXT;
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS county_state TEXT;
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS country TEXT;

-- Update status to allow new values (SUSPENDED, CLOSED)
-- Note: This doesn't change existing data, just allows new values

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_lost_items_file_reference_number ON lost_items(file_reference_number);

-- Update RLS policy if needed (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lost_items' 
    AND policyname = 'Allow all operations on lost_items'
  ) THEN
    CREATE POLICY "Allow all operations on lost_items" ON lost_items
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;



