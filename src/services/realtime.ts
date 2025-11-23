import { createClient } from '@supabase/supabase-js';
import type { Flight, Passenger } from '../store/airportStore';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Flag to prevent infinite loops - when we update locally, we skip the real-time update
let isLocalUpdate = false;

// Create Supabase client for real-time
let supabaseClient: ReturnType<typeof createClient> | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Helper to convert database row to Flight
function dbRowToFlight(row: any): Flight {
  return {
    id: row.id,
    flightNumber: row.flight_number,
    origin: row.origin,
    destination: row.destination,
    originCity: row.origin_city || undefined,
    destinationCity: row.destination_city || undefined,
    std: row.std,
    etd: row.etd || row.std,
    gate: row.gate || '',
    status: row.status as Flight['status'],
    aircraft: row.aircraft || '',
    registration: row.registration || undefined,
    gateMessage: row.gate_message || undefined
  };
}

// Helper to convert database row to Passenger
function dbRowToPassenger(row: any): Passenger {
  return {
    id: row.id,
    pnr: row.pnr,
    firstName: row.first_name,
    lastName: row.last_name,
    title: row.title || undefined,
    flightId: row.flight_id,
    seat: row.seat || '',
    status: row.status as Passenger['status'],
    hasBags: row.has_bags || false,
    bagCount: row.bag_count || 0,
    bagsLoaded: row.bags_loaded || 0,
    passportNumber: row.passport_number || undefined,
    nationality: row.nationality || undefined,
    expiryDate: row.expiry_date || undefined,
    passengerType: row.passenger_type as Passenger['passengerType'] || undefined,
    staffId: row.staff_id || undefined,
    securityStatus: row.security_status as Passenger['securityStatus'] || undefined,
    securityNote: row.security_note || undefined
  };
}

export function setLocalUpdateFlag(value: boolean) {
  isLocalUpdate = value;
}

export function getLocalUpdateFlag() {
  return isLocalUpdate;
}

// Set up real-time subscriptions
export function setupRealtimeSubscriptions(
  onFlightUpdate: (flight: Flight) => void,
  onFlightInsert: (flight: Flight) => void,
  onFlightDelete: (flightId: string) => void,
  onPassengerUpdate: (passenger: Passenger) => void,
  onPassengerInsert: (passenger: Passenger) => void,
  onPassengerDelete: (passengerId: string) => void
) {
  if (!supabaseClient) {
    console.warn('Supabase client not initialized - real-time subscriptions disabled');
    return () => {}; // Return cleanup function
  }

  console.log('Setting up real-time subscriptions...');

  // Subscribe to flights table changes
  const flightsChannel = supabaseClient
    .channel('flights-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'flights'
      },
      (payload) => {
        if (isLocalUpdate) {
          // This update came from our own device, skip it
          return;
        }
        console.log('Real-time flight update received:', payload.new);
        const flight = dbRowToFlight(payload.new);
        onFlightUpdate(flight);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'flights'
      },
      (payload) => {
        if (isLocalUpdate) {
          return;
        }
        console.log('Real-time flight insert received:', payload.new);
        const flight = dbRowToFlight(payload.new);
        onFlightInsert(flight);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'flights'
      },
      (payload) => {
        if (isLocalUpdate) {
          return;
        }
        console.log('Real-time flight delete received:', payload.old);
        onFlightDelete(payload.old.id);
      }
    )
    .subscribe();

  // Subscribe to passengers table changes
  const passengersChannel = supabaseClient
    .channel('passengers-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'passengers'
      },
      (payload) => {
        if (isLocalUpdate) {
          return;
        }
        console.log('Real-time passenger update received:', payload.new);
        const passenger = dbRowToPassenger(payload.new);
        onPassengerUpdate(passenger);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'passengers'
      },
      (payload) => {
        if (isLocalUpdate) {
          return;
        }
        console.log('Real-time passenger insert received:', payload.new);
        const passenger = dbRowToPassenger(payload.new);
        onPassengerInsert(passenger);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'passengers'
      },
      (payload) => {
        if (isLocalUpdate) {
          return;
        }
        console.log('Real-time passenger delete received:', payload.old);
        onPassengerDelete(payload.old.id);
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    console.log('Cleaning up real-time subscriptions...');
    supabaseClient?.removeChannel(flightsChannel);
    supabaseClient?.removeChannel(passengersChannel);
  };
}

