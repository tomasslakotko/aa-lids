import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Types ---

export type FlightStatus = 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'ARRIVED' | 'DELAYED' | 'CANCELLED';

export interface Flight {
  id: string;
  flightNumber: string; // e.g. BA117
  origin: string;
  destination: string;
  std: string; // Scheduled Time of Departure (ISO string or HH:mm)
  etd: string; // Estimated Time of Departure
  gate: string;
  status: FlightStatus;
  aircraft: string; // e.g. B744
}

export type PassengerStatus = 'BOOKED' | 'CHECKED_IN' | 'BOARDED';

export interface Passenger {
  id: string;
  pnr: string; // 6-char Booking Reference
  firstName: string;
  lastName: string;
  flightId: string;
  seat: string;
  status: PassengerStatus;
  hasBags: boolean;
  bagCount: number;
  passportNumber?: string;
  nationality?: string;
  expiryDate?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  source: string; // 'SYSTEM' | 'USER' | 'APP_ID'
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
}

interface AirportStore {
  flights: Flight[];
  passengers: Passenger[];
  logs: LogEntry[];
  
  // Actions
  updateFlightStatus: (flightId: string, status: FlightStatus) => void;
  checkInPassenger: (pnr: string) => boolean;
  updatePassengerDetails: (pnr: string, details: Partial<Passenger>) => void;
  boardPassenger: (pnr: string) => boolean;
  createBooking: (pnr: string, lastName: string, firstName: string, flightId: string) => void;
  addLog: (message: string, source: string, type?: LogEntry['type']) => void;
  resetSimulation: () => void;
}

// --- Data Generation ---

const HUB = 'RIX';

const DESTINATIONS = [
  { code: 'OSL', city: 'Oslo', flight: 'BT151' },
  { code: 'HEL', city: 'Helsinki', flight: 'BT301' },
  { code: 'CDG', city: 'Paris', flight: 'BT691' },
  { code: 'FNC', city: 'Funchal', flight: 'BT767' },
  { code: 'MUC', city: 'Munich', flight: 'BT221' },
  { code: 'BER', city: 'Berlin', flight: 'BT211' },
  { code: 'PRG', city: 'Prague', flight: 'BT481' },
  { code: 'ARN', city: 'Stockholm', flight: 'BT101' },
  { code: 'CPH', city: 'Copenhagen', flight: 'BT131' },
  { code: 'BLL', city: 'Billund', flight: 'BT147' },
  { code: 'VIE', city: 'Vienna', flight: 'BT271' },
  { code: 'TLL', city: 'Tallinn', flight: 'BT311' },
  { code: 'VNO', city: 'Vilnius', flight: 'BT341' },
  { code: 'FRA', city: 'Frankfurt', flight: 'BT243' },
  { code: 'AMS', city: 'Amsterdam', flight: 'BT617' },
  { code: 'LGW', city: 'London', flight: 'BT651' },
];

// Helper to generate random time between startHour and endHour
const randomTime = (startHour: number, endHour: number) => {
  const h = Math.floor(Math.random() * (endHour - startHour) + startHour);
  const m = Math.floor(Math.random() * 12) * 5; // 5 min intervals
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Add duration to time string "HH:MM"
// @ts-ignore
const addDuration = (time: string, minutesToAdd: number) => {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
};

const generateFlights = (): Flight[] => {
  const flights: Flight[] = [];
  
  // 1. Outbound from Hub (RIX) - Morning Wave
  DESTINATIONS.forEach(dest => {
     const std = randomTime(7, 10);
     flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: dest.flight,
       origin: HUB,
       destination: dest.code,
       std: std,
       etd: std, // On time initially
       gate: ['B', 'C'][Math.floor(Math.random()*2)] + Math.floor(Math.random() * 20 + 1),
       status: 'SCHEDULED',
       aircraft: 'BCS3' // A220-300
     });
  });

  // 2. Inbound to Hub (RIX) - Afternoon/Evening Wave
  DESTINATIONS.forEach(dest => {
     const flightNumParts = dest.flight.match(/([A-Z]+)(\d+)/);
     const returnFlightNum = flightNumParts ? `${flightNumParts[1]}${parseInt(flightNumParts[2]) + 1}` : dest.flight + 'R';
     const std = randomTime(14, 19);

     flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: returnFlightNum,
       origin: dest.code,
       destination: HUB,
       std: std,
       etd: std,
       gate: ['B', 'C'][Math.floor(Math.random()*2)] + Math.floor(Math.random() * 20 + 1),
       status: 'SCHEDULED',
       aircraft: 'BCS3'
     });
  });
  
  // 3. Connecting legs (Partners / Long Haul) from Spoke to World
  // Designed to create connections: RIX -> HUB -> WORLD
  const CONNECTING_ROUTES = [
    { num: 'DL047', org: 'AMS', dest: 'JFK', dep: '11:00', aircraft: 'A333' },
    { num: 'BA117', org: 'LGW', dest: 'JFK', dep: '12:30', aircraft: 'B777' },
    { num: 'LH404', org: 'FRA', dest: 'JFK', dep: '13:15', aircraft: 'B748' },
    { num: 'AF006', org: 'CDG', dest: 'JFK', dep: '14:00', aircraft: 'B77W' },
    { num: 'UA999', org: 'LHR', dest: 'EWR', dep: '15:00', aircraft: 'B763' },
    { num: 'EK150', org: 'LGW', dest: 'DXB', dep: '13:45', aircraft: 'A388' },
    { num: 'QR010', org: 'LHR', dest: 'DOH', dep: '14:20', aircraft: 'A359' },
  ];
  
  CONNECTING_ROUTES.forEach(route => {
      flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: route.num,
       origin: route.org,
       destination: route.dest,
       std: route.dep,
       etd: route.dep,
       gate: 'X' + Math.floor(Math.random() * 99),
       status: 'SCHEDULED',
       aircraft: route.aircraft
     });
  });

  return flights.sort((a, b) => a.std.localeCompare(b.std));
};

const INITIAL_FLIGHTS = generateFlights();

const INITIAL_PASSENGERS: Passenger[] = [
  // Create some initial pax on the generated flights
  { 
    id: 'p1', pnr: 'AN24NO', firstName: 'JOHN', lastName: 'SMITH', 
    flightId: INITIAL_FLIGHTS[0].id, seat: '12A', status: 'BOOKED', hasBags: true, bagCount: 1 
  },
];

export const useAirportStore = create<AirportStore>()(
  persist(
    (set, get) => ({
      flights: INITIAL_FLIGHTS,
      passengers: INITIAL_PASSENGERS,
      logs: [],

      updateFlightStatus: (flightId, status) => {
        set((state) => ({
          flights: state.flights.map(f => f.id === flightId ? { ...f, status } : f)
        }));
        get().addLog(`Flight ${flightId} status changed to ${status}`, 'OCC', 'INFO');
      },

      checkInPassenger: (pnr) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) return false;
        if (passenger.status !== 'BOOKED') return false; 

        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, status: 'CHECKED_IN' } : p
          )
        }));
        get().addLog(`Passenger ${passenger.lastName} (${pnr}) checked in`, 'CHECK-IN', 'SUCCESS');
        return true;
      },

      updatePassengerDetails: (pnr, details) => {
        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, ...details } : p
          )
        }));
        get().addLog(`Passenger details updated for ${pnr}`, 'CHECK-IN', 'INFO');
      },

      createBooking: (pnr, lastName, firstName, flightId) => {
        set((state) => ({
          passengers: [...state.passengers, {
             id: Math.random().toString(36).substr(2, 9),
             pnr,
             firstName,
             lastName,
             flightId,
             seat: 'REQ',
             status: 'BOOKED',
             hasBags: false,
             bagCount: 0
          }]
        }));
        get().addLog(`New Booking Created: ${lastName}/${firstName} (${pnr})`, 'RESERVATIONS', 'SUCCESS');
      },

      boardPassenger: (pnr) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) return false;
        if (passenger.status !== 'CHECKED_IN') return false; 

        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, status: 'BOARDED' } : p
          )
        }));
        get().addLog(`Passenger ${passenger.lastName} (${pnr}) boarded`, 'BOARDING', 'SUCCESS');
        return true;
      },

      addLog: (message, source, type = 'INFO') => {
        set((state) => ({
          logs: [{
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            message,
            source,
            type
          }, ...state.logs].slice(0, 100)
        }));
      },

      resetSimulation: () => {
        set({ flights: generateFlights(), passengers: [], logs: [] });
      }
    }),
    {
      name: 'airport-storage-v2', // Version bumped to force new data load
    }
  )
);
