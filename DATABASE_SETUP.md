# Database Setup Guide - Using Supabase

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **New Project**: Create a new Supabase project
3. **Environment Variables**: Set up in your `.env` file

## Setup Steps

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose a name and database password
4. Select a region close to you
5. Wait for the project to be created (takes ~2 minutes)

### Step 2: Get Your Supabase Credentials

Once your project is created:

1. Go to **Settings** → **API** in your Supabase dashboard
2. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: A long string starting with `eyJ...`

Copy both of these values.

### Step 3: Set Environment Variables

Create or update your `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important**: 
- Replace `xxxxx` with your actual project reference
- Replace the anon key with your actual key from Supabase dashboard
- These are public keys safe to use in the browser (they're designed for client-side use)

### Step 4: Create Database Tables

Supabase provides a SQL Editor where you can run SQL scripts:

**Option A: Via Supabase SQL Editor (Recommended)**
1. Go to Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `database-schema.sql` file
5. Click **Run** (or press Cmd/Ctrl + Enter)

**Option B: Via psql or other SQL client**

Connect using the connection string from Supabase Settings → Database, then run `database-schema.sql`.

**Quick reference** (full script in `database-schema.sql`):

```sql
-- Create flights table
CREATE TABLE IF NOT EXISTS flights (
  id TEXT PRIMARY KEY,
  flight_number TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  origin_city TEXT,
  destination_city TEXT,
  std TEXT NOT NULL,
  etd TEXT,
  gate TEXT,
  status TEXT NOT NULL,
  aircraft TEXT,
  registration TEXT,
  gate_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create passengers table
CREATE TABLE IF NOT EXISTS passengers (
  id TEXT PRIMARY KEY,
  pnr TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  flight_id TEXT NOT NULL,
  seat TEXT,
  status TEXT NOT NULL,
  has_bags BOOLEAN DEFAULT FALSE,
  bag_count INTEGER DEFAULT 0,
  bags_loaded INTEGER DEFAULT 0,
  passport_number TEXT,
  nationality TEXT,
  expiry_date TEXT,
  passenger_type TEXT,
  staff_id TEXT,
  security_status TEXT,
  security_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  pnr TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  reason TEXT NOT NULL,
  issued_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  pnr TEXT NOT NULL,
  passenger_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  pnr TEXT NOT NULL,
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_passengers_pnr ON passengers(pnr);
CREATE INDEX IF NOT EXISTS idx_passengers_flight_id ON passengers(flight_id);
CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status);
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
CREATE INDEX IF NOT EXISTS idx_emails_pnr ON emails(pnr);
CREATE INDEX IF NOT EXISTS idx_vouchers_pnr ON vouchers(pnr);
CREATE INDEX IF NOT EXISTS idx_complaints_pnr ON complaints(pnr);
```

### Step 5: Configure Row Level Security (RLS)

By default, Supabase enables Row Level Security (RLS) on all tables. For this application, we need to disable RLS or create policies that allow public access.

**Option A: Disable RLS (Easiest for development)**

Run this in the SQL Editor:

```sql
ALTER TABLE flights DISABLE ROW LEVEL SECURITY;
ALTER TABLE passengers DISABLE ROW LEVEL SECURITY;
ALTER TABLE logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers DISABLE ROW LEVEL SECURITY;
ALTER TABLE complaints DISABLE ROW LEVEL SECURITY;
ALTER TABLE emails DISABLE ROW LEVEL SECURITY;
```

**Option B: Create Policies (Recommended for production)**

If you want to keep RLS enabled, create policies that allow public read/write:

```sql
-- Allow public access to all tables
CREATE POLICY "Allow public access" ON flights FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON passengers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON vouchers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON complaints FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON emails FOR ALL USING (true) WITH CHECK (true);
```

## First Time Usage

1. **Start the App**: `npm run dev`
2. **Check Console**: Look for "Database connection verified" in the browser console
3. **Test**: Create a booking - it should sync to Supabase database
4. **Verify**: Check your Supabase dashboard → Table Editor to see the data

## Troubleshooting

### "Supabase not configured"
- Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env`
- Restart dev server after adding env vars
- Check that the values don't have quotes around them

### "Supabase API error: 401"
- API key is invalid
- Check that you're using the **anon/public** key, not the service_role key
- Verify the key in Supabase Settings → API

### "Supabase API error: 404"
- Table doesn't exist
- Run the CREATE TABLE SQL scripts in Step 4

### "Supabase API error: 42501" (Permission denied)
- RLS is blocking access
- Disable RLS or create policies (see Step 5)

### Tables Not Found
- Tables must be created manually via SQL Editor
- REST API doesn't support CREATE TABLE directly

## How It Works

- **Browser Compatible**: Uses `fetch()` API, works in any browser
- **REST API**: Direct HTTP calls to Supabase's PostgREST endpoints
- **Automatic Sync**: Data syncs to database after mutations
- **Fallback**: If database fails, uses localStorage automatically

## Security Notes

⚠️ **Important**: The `anon` key is safe to use in the browser - it's designed for client-side use.

For production:
- Consider enabling RLS with proper policies
- Use service_role key only on the server (never expose it)
- Implement proper authentication if needed
- Monitor API usage in Supabase dashboard

## Enable Real-time (Required for Live Updates Across Devices)

To enable live updates across multiple devices, you need to enable Supabase Realtime:

1. **Go to Supabase Dashboard** → Your Project → **Database** → **Replication**
2. **Enable Replication** for the following tables:
   - `flights` ✅
   - `passengers` ✅
3. Click **Save**

Alternatively, you can enable it via SQL in the SQL Editor:

```sql
-- Enable real-time for flights table
ALTER PUBLICATION supabase_realtime ADD TABLE flights;

-- Enable real-time for passengers table
ALTER PUBLICATION supabase_realtime ADD TABLE passengers;
```

**Note**: Real-time is now automatically enabled when the app starts. Changes made on one device will instantly appear on all other devices!

## Benefits of Supabase

✅ **Easy Setup**: Simple API keys, no complex authentication  
✅ **Free Tier**: Generous free tier for development  
✅ **Real-time**: Live updates across devices (now enabled!)  
✅ **Dashboard**: Great UI for viewing and managing data  
✅ **PostgreSQL**: Full PostgreSQL database with all features
