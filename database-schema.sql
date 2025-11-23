-- Airport Operating System Database Schema
-- Run this script in Supabase SQL Editor to create all required tables

-- ============================================
-- FLIGHTS TABLE
-- ============================================
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

-- ============================================
-- PASSENGERS TABLE
-- ============================================
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

-- ============================================
-- LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VOUCHERS TABLE
-- ============================================
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

-- ============================================
-- COMPLAINTS TABLE
-- ============================================
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

-- ============================================
-- EMAILS TABLE
-- ============================================
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

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_passengers_pnr ON passengers(pnr);
CREATE INDEX IF NOT EXISTS idx_passengers_flight_id ON passengers(flight_id);
CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status);
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
CREATE INDEX IF NOT EXISTS idx_emails_pnr ON emails(pnr);
CREATE INDEX IF NOT EXISTS idx_vouchers_pnr ON vouchers(pnr);
CREATE INDEX IF NOT EXISTS idx_complaints_pnr ON complaints(pnr);

-- ============================================
-- VERIFICATION QUERIES (Optional - to check tables were created)
-- ============================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT COUNT(*) FROM flights;
-- SELECT COUNT(*) FROM passengers;
-- SELECT COUNT(*) FROM logs;
-- SELECT COUNT(*) FROM vouchers;
-- SELECT COUNT(*) FROM complaints;
-- SELECT COUNT(*) FROM emails;


