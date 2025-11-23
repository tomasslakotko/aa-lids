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
  console.log('Supabase URL:', SUPABASE_URL ? 'Set' : 'Missing');
  console.log('Supabase Key:', SUPABASE_ANON_KEY ? 'Set' : 'Missing');

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
        console.log('Real-time flight UPDATE event received:', {
          isLocalUpdate,
          payload: payload.new,
          old: payload.old
        });
        if (isLocalUpdate) {
          // This update came from our own device, skip it
          console.log('Skipping real-time update - it came from this device');
          return;
        }
        console.log('Processing real-time flight update from another device');
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
    .subscribe((status, err) => {
      if (err) {
        console.error('❌ Error subscribing to flights table:', err);
        console.error('Make sure real-time is enabled in Supabase Dashboard → Database → Replication');
        return;
      }
      console.log('Flights channel subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to flights table changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to flights table - check if real-time is enabled in Supabase');
      } else if (status === 'TIMED_OUT') {
        console.error('❌ Subscription timed out - check network connection');
      } else if (status === 'CLOSED') {
        console.warn('⚠️ Subscription closed');
      }
    });

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
    .subscribe((status, err) => {
      if (err) {
        console.error('❌ Error subscribing to passengers table:', err);
        console.error('Make sure real-time is enabled in Supabase Dashboard → Database → Replication');
        return;
      }
      console.log('Passengers channel subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to passengers table changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to passengers table - check if real-time is enabled in Supabase');
      } else if (status === 'TIMED_OUT') {
        console.error('❌ Subscription timed out - check network connection');
      } else if (status === 'CLOSED') {
        console.warn('⚠️ Subscription closed');
      }
    });

  // Return cleanup function
  return () => {
    console.log('Cleaning up real-time subscriptions...');
    supabaseClient?.removeChannel(flightsChannel);
    supabaseClient?.removeChannel(passengersChannel);
  };
}

