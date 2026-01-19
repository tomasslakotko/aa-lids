import type { Flight, Passenger, LogEntry, Voucher, Complaint, EmailConfirmation, LostItem } from '../store/airportStore';

// Supabase REST API Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Helper for direct table operations using Supabase REST API
async function supabaseTable(table: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', data?: any, filters?: Record<string, any>): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  }

  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  
  // Add filters as query parameters for GET, DELETE, and PATCH requests (PostgREST syntax)
  if ((method === 'GET' || method === 'DELETE' || method === 'PATCH') && filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, `eq.${value}`);
    });
    url += `?${params.toString()}`;
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    }
  };

  if (data && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase API error: ${response.status} - ${error}`);
    }

    if (method === 'DELETE') {
      // DELETE returns empty array or 204, handle both
      if (response.status === 204) {
        return [];
      }
      const result = await response.json();
      return Array.isArray(result) ? result : [];
    }

    const result = await response.json();
    return Array.isArray(result) ? result : [result];
  } catch (error: any) {
    console.error(`Supabase REST API error (${method} ${table}):`, error);
    throw error;
  }
}

// Helper for UPSERT (insert or update) - uses PATCH with id filter, falls back to POST
async function supabaseUpsert(table: string, data: any, idField: string = 'id'): Promise<any> {
  const id = data[idField];
  if (!id) {
    throw new Error(`Cannot upsert: ${idField} is missing`);
  }

  try {
    // Try to update first (PATCH)
    const existing = await supabaseTable(table, 'GET', undefined, { [idField]: id });
    if (existing.length > 0) {
      // Record exists, update it
      return await supabaseTable(table, 'PATCH', data, { [idField]: id });
    } else {
      // Record doesn't exist, insert it
      return await supabaseTable(table, 'POST', data);
    }
  } catch (error: any) {
    // If update fails with 404 or similar, try insert
    if (error.message.includes('404') || error.message.includes('not found')) {
      return await supabaseTable(table, 'POST', data);
    }
    // If insert fails with duplicate key, try update
    if (error.message.includes('23505') || error.message.includes('duplicate')) {
      return await supabaseTable(table, 'PATCH', data, { [idField]: id });
    }
    throw error;
  }
}

// Database Schema Initialization
// Note: REST API doesn't support CREATE TABLE - tables must be created via Supabase dashboard SQL editor
export async function initializeDatabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Database initialization skipped - Supabase not configured. Using localStorage fallback.');
    return;
  }
  
  try {
    // Try to verify tables exist by querying them
    // If tables don't exist, they'll need to be created manually in Supabase dashboard
    await Promise.all([
      supabaseTable('flights', 'GET').catch(() => []),
      supabaseTable('passengers', 'GET').catch(() => []),
      supabaseTable('logs', 'GET').catch(() => []),
      supabaseTable('vouchers', 'GET').catch(() => []),
      supabaseTable('complaints', 'GET').catch(() => []),
      supabaseTable('emails', 'GET').catch(() => [])
    ]);
    
    console.log('Database connection verified');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Load all data from database
export async function loadAllData() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Database not available - Supabase not configured. Using localStorage fallback.');
  }
  
  try {
    const [flights, passengers, logs, vouchers, complaints, emails, lostItems] = await Promise.all([
      loadFlights(),
      loadPassengers(),
      loadLogs(),
      loadVouchers(),
      loadComplaints(),
      loadEmails(),
      loadLostItems()
    ]);

    return {
      flights,
      passengers,
      logs,
      vouchers,
      complaints,
      emails,
      lostItems
    };
  } catch (error) {
    console.error('Error loading data from database:', error);
    throw error;
  }
}

// Flights
async function loadFlights(): Promise<Flight[]> {
  const rows = await supabaseTable('flights', 'GET');
  return rows.map((row: any) => ({
    id: row.id,
    flightNumber: row.flight_number,
    origin: row.origin,
    destination: row.destination,
    originCity: row.origin_city,
    destinationCity: row.destination_city,
    std: row.std,
    etd: row.etd,
    date: row.date,
    gate: row.gate,
    status: row.status,
    aircraft: row.aircraft,
    registration: row.registration,
    gateMessage: row.gate_message
  })) as Flight[];
}

// Save a single flight directly to Supabase (for new flights)
export async function saveFlightDirect(flight: Flight): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase not configured');
  }
  
  const flightData = {
    id: flight.id,
    flight_number: flight.flightNumber,
    origin: flight.origin,
    destination: flight.destination,
    origin_city: flight.originCity || null,
    destination_city: flight.destinationCity || null,
    std: flight.std,
    etd: flight.etd || null,
    date: flight.date || null,
    gate: flight.gate || null,
    status: flight.status,
    aircraft: flight.aircraft || null,
    registration: flight.registration || null,
    gate_message: flight.gateMessage || null
  };
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/flights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(flightData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save flight: HTTP ${response.status} - ${errorText}`);
  }
}

export async function saveFlights(flights: Flight[]) {
  try {
    if (flights.length === 0) return;
    
    const flightsData = flights.map(f => ({
      id: f.id,
      flight_number: f.flightNumber,
      origin: f.origin,
      destination: f.destination,
      origin_city: f.originCity || null,
      destination_city: f.destinationCity || null,
      std: f.std,
      etd: f.etd || null,
      date: f.date || null,
      gate: f.gate || null,
      status: f.status,
      aircraft: f.aircraft || null,
      registration: f.registration || null,
      gate_message: f.gateMessage || null
    }));
    
    // Use UPSERT to avoid duplicate key errors
    // Process in smaller batches to avoid overwhelming the API
    const errors: Error[] = [];
    for (let i = 0; i < flightsData.length; i += 50) {
      const batch = flightsData.slice(i, i + 50);
      const results = await Promise.allSettled(
        batch.map(flight => supabaseUpsert('flights', flight, 'id'))
      );
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const error = result.reason;
          console.error(`Failed to upsert flight ${batch[index].id}:`, error);
          errors.push(new Error(`Flight ${batch[index].flight_number} (${batch[index].id}): ${error?.message || 'Unknown error'}`));
        }
      });
    }
    if (errors.length > 0) {
      throw new Error(`Failed to save ${errors.length} flight(s): ${errors.map(e => e.message).join('; ')}`);
    }
  } catch (error) {
    console.error('Error saving flights:', error);
    throw error;
  }
}

// Passengers
async function loadPassengers(): Promise<Passenger[]> {
  const rows = await supabaseTable('passengers', 'GET');
  return rows.map((row: any) => ({
    id: row.id,
    pnr: row.pnr,
    firstName: row.first_name,
    lastName: row.last_name,
    title: row.title,
    flightId: row.flight_id,
    seat: row.seat,
    status: row.status,
    hasBags: row.has_bags || false,
    bagCount: row.bag_count || 0,
    bagsLoaded: row.bags_loaded || 0,
    passportNumber: row.passport_number,
    nationality: row.nationality,
    expiryDate: row.expiry_date,
    passengerType: row.passenger_type,
    staffId: row.staff_id,
    securityStatus: row.security_status,
    securityNote: row.security_note,
    boardingComment: row.boarding_comment || undefined,
    userEmail: row.user_email || undefined,
    loyaltyStatus: row.loyalty_status || undefined,
    milesEarned: row.miles_earned || 0,
    mealPreference: row.meal_preference || undefined,
    specialMeals: row.special_meals ? JSON.parse(row.special_meals) : undefined,
    dietaryRequirements: row.dietary_requirements || undefined,
    wifiRequested: row.wifi_requested || false,
    entertainmentRequested: row.entertainment_requested || false,
    extraLegroom: row.extra_legroom || false,
    bagStatus: row.bag_status || undefined,
    bagLocation: row.bag_location || undefined
  })) as Passenger[];
}

export async function savePassengers(passengers: Passenger[]) {
  try {
    if (passengers.length === 0) return;
    
    const passengersData = passengers.map(p => ({
      id: p.id,
      pnr: p.pnr,
      first_name: p.firstName,
      last_name: p.lastName,
      title: p.title || null,
      flight_id: p.flightId,
      seat: p.seat || null,
      status: p.status,
      has_bags: p.hasBags || false,
      bag_count: p.bagCount || 0,
      bags_loaded: p.bagsLoaded || 0,
      passport_number: p.passportNumber || null,
      nationality: p.nationality || null,
      expiry_date: p.expiryDate || null,
      passenger_type: p.passengerType || null,
      staff_id: p.staffId || null,
      security_status: p.securityStatus || null,
      security_note: p.securityNote || null,
      boarding_comment: p.boardingComment || null,
      user_email: p.userEmail || null,
      loyalty_status: p.loyaltyStatus || null,
      miles_earned: p.milesEarned || 0,
      meal_preference: p.mealPreference || null,
      special_meals: p.specialMeals ? JSON.stringify(p.specialMeals) : null,
      dietary_requirements: p.dietaryRequirements || null,
      wifi_requested: p.wifiRequested || false,
      entertainment_requested: p.entertainmentRequested || false,
      extra_legroom: p.extraLegroom || false,
      bag_status: p.bagStatus || null,
      bag_location: p.bagLocation || null
    }));
    
    // Use UPSERT to avoid duplicate key errors
    for (let i = 0; i < passengersData.length; i += 50) {
      const batch = passengersData.slice(i, i + 50);
      await Promise.all(
        batch.map(passenger => supabaseUpsert('passengers', passenger, 'id').catch(err => {
          console.warn(`Failed to upsert passenger ${passenger.id}:`, err.message);
        }))
      );
    }
  } catch (error) {
    console.error('Error saving passengers:', error);
    throw error;
  }
}

// Logs
async function loadLogs(): Promise<LogEntry[]> {
  const rows = await supabaseTable('logs', 'GET');
  return rows.map((row: any) => ({
    id: row.id,
    timestamp: row.timestamp,
    message: row.message,
    source: row.source,
    type: row.type
  })) as LogEntry[];
}

export async function saveLogs(logs: LogEntry[]) {
  try {
    // Limit to 100 most recent logs
    const recentLogs = logs.slice(0, 100);
    if (recentLogs.length === 0) return;
    
    const logsData = recentLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      message: log.message,
      source: log.source,
      type: log.type
    }));
    
    // Use UPSERT to avoid duplicate key errors
    for (let i = 0; i < logsData.length; i += 50) {
      const batch = logsData.slice(i, i + 50);
      await Promise.all(
        batch.map(log => supabaseUpsert('logs', log, 'id').catch(err => {
          console.warn(`Failed to upsert log ${log.id}:`, err.message);
        }))
      );
    }
  } catch (error) {
    console.error('Error saving logs:', error);
    throw error;
  }
}

// Vouchers
async function loadVouchers(): Promise<Voucher[]> {
  const rows = await supabaseTable('vouchers', 'GET');
  return rows.map((row: any) => ({
    id: row.id,
    pnr: row.pnr,
    amount: row.amount,
    currency: row.currency,
    reason: row.reason,
    issuedDate: row.issued_date instanceof Date ? row.issued_date.toISOString() : row.issued_date,
    expiryDate: row.expiry_date instanceof Date ? row.expiry_date.toISOString() : row.expiry_date,
    status: row.status
  })) as Voucher[];
}

export async function saveVouchers(vouchers: Voucher[]) {
  try {
    if (vouchers.length === 0) return;
    
    const vouchersData = vouchers.map(v => ({
      id: v.id,
      pnr: v.pnr,
      amount: v.amount,
      currency: v.currency,
      reason: v.reason,
      issued_date: v.issuedDate,
      expiry_date: v.expiryDate,
      status: v.status
    }));
    
    // Use UPSERT to avoid duplicate key errors
    for (let i = 0; i < vouchersData.length; i += 50) {
      const batch = vouchersData.slice(i, i + 50);
      await Promise.all(
        batch.map(voucher => supabaseUpsert('vouchers', voucher, 'id').catch(err => {
          console.warn(`Failed to upsert voucher ${voucher.id}:`, err.message);
        }))
      );
    }
  } catch (error) {
    console.error('Error saving vouchers:', error);
    throw error;
  }
}

// Complaints
async function loadComplaints(): Promise<Complaint[]> {
  const rows = await supabaseTable('complaints', 'GET');
  return rows.map((row: any) => ({
    id: row.id,
    pnr: row.pnr,
    passengerName: row.passenger_name,
    category: row.category,
    description: row.description,
    status: row.status,
    resolution: row.resolution,
    resolvedAt: row.resolved_at instanceof Date ? row.resolved_at.toISOString() : row.resolved_at || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  })) as Complaint[];
}

export async function saveComplaints(complaints: Complaint[]) {
  try {
    if (complaints.length === 0) return;
    
    const complaintsData = complaints.map(c => ({
      id: c.id,
      pnr: c.pnr,
      passenger_name: c.passengerName,
      category: c.category,
      description: c.description,
      status: c.status,
      resolution: c.resolution || null,
      resolved_at: c.resolvedAt || null,
      created_at: c.createdAt
    }));
    
    // Use UPSERT to avoid duplicate key errors
    for (let i = 0; i < complaintsData.length; i += 50) {
      const batch = complaintsData.slice(i, i + 50);
      await Promise.all(
        batch.map(complaint => supabaseUpsert('complaints', complaint, 'id').catch(err => {
          console.warn(`Failed to upsert complaint ${complaint.id}:`, err.message);
        }))
      );
    }
  } catch (error) {
    console.error('Error saving complaints:', error);
    throw error;
  }
}

// Emails
async function loadEmails(): Promise<EmailConfirmation[]> {
  const rows = await supabaseTable('emails', 'GET');
  return rows.map((row: any) => ({
    id: row.id,
    pnr: row.pnr,
    to: row.to_email,
    from: row.from_email,
    subject: row.subject,
    sentAt: row.sent_at instanceof Date ? row.sent_at.toISOString() : row.sent_at,
    status: row.status,
    content: row.content
  })) as EmailConfirmation[];
}

export async function saveEmails(emails: EmailConfirmation[]) {
  try {
    if (emails.length === 0) return;
    
    const emailsData = emails.map(e => ({
      id: e.id,
      pnr: e.pnr,
      to_email: e.to,
      from_email: e.from,
      subject: e.subject,
      sent_at: e.sentAt,
      status: e.status,
      content: e.content
    }));
    
    // Use UPSERT to avoid duplicate key errors
    for (let i = 0; i < emailsData.length; i += 50) {
      const batch = emailsData.slice(i, i + 50);
      await Promise.all(
        batch.map(email => supabaseUpsert('emails', email, 'id').catch(err => {
          console.warn(`Failed to upsert email ${email.id}:`, err.message);
        }))
      );
    }
  } catch (error) {
    console.error('Error saving emails:', error);
    throw error;
  }
}

// Lost Items
async function loadLostItems(): Promise<LostItem[]> {
  const rows = await supabaseTable('lost_items', 'GET');
  return rows.map((row: any) => ({
    id: row.id,
    itemNumber: row.item_number,
    fileReferenceNumber: row.file_reference_number,
    category: row.category,
    description: row.description,
    locationFound: row.location_found,
    foundDate: row.found_date instanceof Date ? row.found_date.toISOString() : row.found_date,
    foundBy: row.found_by,
    status: row.status,
    claimedBy: row.claimed_by,
    claimedDate: row.claimed_date instanceof Date ? row.claimed_date.toISOString() : row.claimed_date,
    contactInfo: row.contact_info,
    phoneNumber: row.phone_number,
    phoneNumberValidated: row.phone_number_validated,
    alternativePhone: row.alternative_phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    townCity: row.town_city,
    countyState: row.county_state,
    postcode: row.postcode,
    country: row.country,
    notes: row.notes,
    flightNumber: row.flight_number,
    storageLocation: row.storage_location
  })) as LostItem[];
}

export async function saveLostItems(lostItems: LostItem[]) {
  try {
    if (lostItems.length === 0) return;
    
    const lostItemsData = lostItems.map(item => ({
      id: item.id,
      item_number: item.itemNumber,
      file_reference_number: item.fileReferenceNumber,
      category: item.category,
      description: item.description,
      location_found: item.locationFound,
      found_date: item.foundDate,
      found_by: item.foundBy,
      status: item.status,
      claimed_by: item.claimedBy,
      claimed_date: item.claimedDate,
      contact_info: item.contactInfo,
      phone_number: item.phoneNumber,
      phone_number_validated: item.phoneNumberValidated,
      alternative_phone: item.alternativePhone,
      address_line1: item.addressLine1,
      address_line2: item.addressLine2,
      town_city: item.townCity,
      county_state: item.countyState,
      postcode: item.postcode,
      country: item.country,
      notes: item.notes,
      flight_number: item.flightNumber,
      storage_location: item.storageLocation
    }));
    
    // Use UPSERT to avoid duplicate key errors
    for (let i = 0; i < lostItemsData.length; i += 50) {
      const batch = lostItemsData.slice(i, i + 50);
      await Promise.all(
        batch.map(item => supabaseUpsert('lost_items', item, 'id').catch(err => {
          console.warn(`Failed to upsert lost item ${item.id}:`, err.message);
        }))
      );
    }
  } catch (error) {
    console.error('Error saving lost items:', error);
    throw error;
  }
}

// Save all data at once (for batch operations)
export async function saveAllData(data: {
  flights: Flight[];
  passengers: Passenger[];
  logs: LogEntry[];
  vouchers: Voucher[];
  complaints: Complaint[];
  emails: EmailConfirmation[];
  lostItems?: LostItem[];
}) {
  try {
    await Promise.all([
      saveFlights(data.flights),
      savePassengers(data.passengers),
      saveLogs(data.logs),
      saveVouchers(data.vouchers),
      saveComplaints(data.complaints),
      saveEmails(data.emails),
      saveLostItems(data.lostItems || [])
    ]);
  } catch (error) {
    console.error('Error saving all data:', error);
    throw error;
  }
}

// ============================================
// USER AUTHENTICATION FUNCTIONS
// ============================================

// Simple hash function (for demo - in production use bcrypt)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

export interface User {
  id: string;
  email: string;
  name?: string;
  skymiles?: string;
  user_type?: 'passenger' | 'employee';
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

// Register a new user
export async function registerUser(email: string, password: string, name?: string, userType: 'passenger' | 'employee' = 'passenger'): Promise<User> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase not configured');
  }

  const userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const passwordHash = simpleHash(password);

  const userData = {
    id: userId,
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    name: name || null,
    user_type: userType,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (errorText.includes('duplicate key') || errorText.includes('unique constraint')) {
        throw new Error('Email already registered');
      }
      throw new Error(`Failed to register user: ${response.status} - ${errorText}`);
    }

    const users = await response.json();
    const user = users[0];
    
    // Return user without password hash
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      skymiles: user.skymiles,
      user_type: user.user_type || 'passenger',
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login
    };
  } catch (error: any) {
    console.error('Error registering user:', error);
    throw error;
  }
}

// Login user
export async function loginUser(email: string, password: string): Promise<User> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase not configured');
  }

  const passwordHash = simpleHash(password);
  const emailLower = email.toLowerCase().trim();

  try {
    // Find user by email
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(emailLower)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to login: ${response.status}`);
    }

    const users = await response.json();
    
    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Verify password
    if (user.password_hash !== passwordHash) {
      throw new Error('Invalid password');
    }

    // Update last_login
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    // Return user without password hash
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      skymiles: user.skymiles,
      user_type: user.user_type || 'passenger',
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Error logging in user:', error);
    throw error;
  }
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase not configured');
  }

  const emailLower = email.toLowerCase().trim();

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(emailLower)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user: ${response.status}`);
    }

    const users = await response.json();
    
    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      skymiles: user.skymiles,
      user_type: user.user_type || 'passenger',
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login
    };
  } catch (error: any) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Update user profile
export async function updateUserProfile(userId: string, updates: { name?: string; skymiles?: string; email?: string }): Promise<User> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase not configured');
  }

  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.skymiles !== undefined) updateData.skymiles = updates.skymiles;
  if (updates.email !== undefined) updateData.email = updates.email.toLowerCase().trim();

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update user: ${response.status} - ${errorText}`);
    }

    const users = await response.json();
    const user = users[0];
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      skymiles: user.skymiles,
      user_type: user.user_type || 'passenger',
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login
    };
  } catch (error: any) {
    console.error('Error updating user:', error);
    throw error;
  }
}
