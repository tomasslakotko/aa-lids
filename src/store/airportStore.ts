import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Types ---

export type FlightStatus = 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'ARRIVED' | 'DELAYED' | 'CANCELLED';

export interface Flight {
  id: string;
  flightNumber: string; // e.g. BA117
  origin: string;
  destination: string;
  originCity?: string;
  destinationCity?: string;
  std: string; // Scheduled Time of Departure (ISO string or HH:mm)
  etd: string; // Estimated Time of Departure
  gate: string;
  status: FlightStatus;
  aircraft: string; // e.g. B744
  registration?: string; // e.g. YL-CSL
  gateMessage?: string; // Custom message for Gate Screen
}

export type PassengerStatus = 'BOOKED' | 'CHECKED_IN' | 'BOARDED';
export type PassengerType = 'REVENUE' | 'STAFF_DUTY' | 'STAFF_SBY';

export interface Passenger {
  id: string;
  pnr: string; // 6-char Booking Reference
  firstName: string;
  lastName: string;
  title?: string;
  flightId: string;
  seat: string;
  status: PassengerStatus;
  hasBags: boolean;
  bagCount: number;
  bagsLoaded?: number; // Number of bags loaded onto aircraft
  passportNumber?: string;
  nationality?: string;
  expiryDate?: string;
  passengerType?: PassengerType; // Staff duty or standby
  staffId?: string; // Employee ID for staff
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  source: string; // 'SYSTEM' | 'USER' | 'APP_ID'
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
}

export interface Voucher {
  id: string;
  pnr: string;
  amount: number;
  currency: string;
  reason: string;
  issuedDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
}

export interface Complaint {
  id: string;
  pnr: string;
  passengerName: string;
  category: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

interface AirportStore {
  flights: Flight[];
  passengers: Passenger[];
  logs: LogEntry[];
  vouchers: Voucher[];
  complaints: Complaint[];
  
  // Actions
  updateFlightStatus: (flightId: string, status: FlightStatus) => void;
  updateGateMessage: (flightId: string, message: string) => void;
  updateFlightDetails: (flightId: string, updates: Partial<Flight>) => void;
  checkInPassenger: (pnr: string) => boolean;
  updatePassengerDetails: (pnr: string, details: Partial<Passenger>) => void;
  offloadPassenger: (pnr: string) => void;
  loadBag: (pnr: string) => void;
  unloadBag: (pnr: string) => void;
  addNoRecPassenger: (lastName: string, firstName: string, flightId: string) => void;
  boardPassenger: (pnr: string) => boolean;
  createBooking: (pnr: string, lastName: string, firstName: string, flightId: string, passengerType?: PassengerType, staffId?: string) => void;
  addLog: (message: string, source: string, type?: LogEntry['type']) => void;
  resetSimulation: () => void;
  
  // Customer Service Actions
  rebookPassenger: (pnr: string, newFlightId: string) => boolean;
  processRefund: (pnr: string, amount: number, reason: string) => boolean;
  upgradePassenger: (pnr: string, newClass: 'J' | 'Y') => boolean;
  issueVoucher: (pnr: string, amount: number, reason: string) => string;
  createComplaint: (pnr: string, passengerName: string, category: string, description: string) => string;
  updateComplaint: (complaintId: string, status: Complaint['status'], resolution?: string) => void;
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
       originCity: 'Riga',
       destinationCity: dest.city,
       std: std,
       etd: std, // On time initially
       gate: ['B', 'C'][Math.floor(Math.random()*2)] + Math.floor(Math.random() * 20 + 1),
       status: 'SCHEDULED',
       aircraft: 'BCS3', // A220-300
       registration: 'YL-CS' + ['L', 'A', 'B', 'M', 'N'][Math.floor(Math.random() * 5)]
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
       originCity: dest.city,
       destinationCity: 'Riga',
       std: std,
       etd: std,
       gate: ['B', 'C'][Math.floor(Math.random()*2)] + Math.floor(Math.random() * 20 + 1),
       status: 'SCHEDULED',
       aircraft: 'BCS3',
       registration: 'YL-CS' + ['L', 'A', 'B', 'M', 'N'][Math.floor(Math.random() * 5)]
     });
  });
  
  // 3. Connecting legs (Partners / Long Haul) from Spoke to World
  // Designed to create connections: RIX -> HUB -> WORLD
  const CONNECTING_ROUTES = [
    { num: 'DL047', org: 'AMS', dest: 'JFK', city: 'New York', orgCity: 'Amsterdam', dep: '11:00', aircraft: 'A333' },
    { num: 'BA117', org: 'LGW', dest: 'JFK', city: 'New York', orgCity: 'London', dep: '12:30', aircraft: 'B777' },
    { num: 'LH404', org: 'FRA', dest: 'JFK', city: 'New York', orgCity: 'Frankfurt', dep: '13:15', aircraft: 'B748' },
    { num: 'AF006', org: 'CDG', dest: 'JFK', city: 'New York', orgCity: 'Paris', dep: '14:00', aircraft: 'B77W' },
    { num: 'UA999', org: 'LHR', dest: 'EWR', city: 'Newark', orgCity: 'London', dep: '15:00', aircraft: 'B763' },
    { num: 'EK150', org: 'LGW', dest: 'DXB', city: 'Dubai', orgCity: 'London', dep: '13:45', aircraft: 'A388' },
    { num: 'QR010', org: 'LHR', dest: 'DOH', city: 'Doha', orgCity: 'London', dep: '14:20', aircraft: 'A359' },
  ];
  
  CONNECTING_ROUTES.forEach(route => {
      flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: route.num,
       origin: route.org,
       destination: route.dest,
       originCity: route.orgCity,
       destinationCity: route.city,
       std: route.dep,
       etd: route.dep,
       gate: 'X' + Math.floor(Math.random() * 99),
       status: 'SCHEDULED',
       aircraft: route.aircraft,
       registration: 'XX-' + Math.random().toString(36).substr(2, 3).toUpperCase() + Math.floor(Math.random() * 99)
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

const INITIAL_VOUCHERS: Voucher[] = [];
const INITIAL_COMPLAINTS: Complaint[] = [];

export const useAirportStore = create<AirportStore>()(
  persist(
    (set, get) => ({
      flights: INITIAL_FLIGHTS,
      passengers: INITIAL_PASSENGERS,
      logs: [],
      vouchers: INITIAL_VOUCHERS,
      complaints: INITIAL_COMPLAINTS,

      updateFlightStatus: (flightId, status) => {
        set((state) => ({
          flights: state.flights.map(f => f.id === flightId ? { ...f, status } : f)
        }));
        get().addLog(`Flight ${flightId} status changed to ${status}`, 'OCC', 'INFO');
      },

      updateGateMessage: (flightId, message) => {
        set((state) => ({
          flights: state.flights.map(f => f.id === flightId ? { ...f, gateMessage: message } : f)
        }));
      },

      updateFlightDetails: (flightId, updates) => {
        set((state) => ({
          flights: state.flights.map(f => f.id === flightId ? { ...f, ...updates } : f)
        }));
        get().addLog(`Flight details updated for ${flightId}`, 'OCC', 'INFO');
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

      offloadPassenger: (pnr) => {
        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, status: 'BOOKED', seat: '', bagCount: 0, hasBags: false, bagsLoaded: 0 } : p
          )
        }));
        get().addLog(`Passenger ${pnr} offloaded`, 'BOARDING', 'WARNING');
      },

      loadBag: (pnr) => {
        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr 
              ? { ...p, bagsLoaded: Math.min((p.bagsLoaded || 0) + 1, p.bagCount) } 
              : p
          )
        }));
      },

      unloadBag: (pnr) => {
        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr 
              ? { ...p, bagsLoaded: Math.max((p.bagsLoaded || 0) - 1, 0) } 
              : p
          )
        }));
      },

      addNoRecPassenger: (lastName, firstName, flightId) => {
        const pnr = Math.random().toString(36).substr(2, 6).toUpperCase();
        set((state) => ({
          passengers: [...state.passengers, {
             id: Math.random().toString(36).substr(2, 9),
             pnr,
             firstName,
             lastName,
             flightId,
             seat: 'SBY',
             status: 'CHECKED_IN',
             hasBags: false,
             bagCount: 0,
             passengerType: 'REVENUE'
          }]
        }));
        get().addLog(`NoRec added: ${lastName}/${firstName} (${pnr})`, 'BOARDING', 'WARNING');
      },

      createBooking: (pnr, lastName, firstName, flightId, passengerType = 'REVENUE', staffId) => {
        set((state) => ({
          passengers: [...state.passengers, {
             id: Math.random().toString(36).substr(2, 9),
             pnr,
             firstName,
             lastName,
             flightId,
             seat: passengerType === 'STAFF_SBY' ? 'SBY' : 'REQ',
             status: 'BOOKED',
             hasBags: false,
             bagCount: 0,
             passengerType,
             staffId
          }]
        }));
        const typeLabel = passengerType === 'STAFF_DUTY' ? 'STAFF DUTY' : passengerType === 'STAFF_SBY' ? 'STAFF STANDBY' : 'REVENUE';
        get().addLog(`New Booking Created: ${lastName}/${firstName} (${pnr}) [${typeLabel}]`, 'RESERVATIONS', 'SUCCESS');
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
        set({ flights: generateFlights(), passengers: [], logs: [], vouchers: [], complaints: [] });
      },
      
      // Customer Service Actions
      rebookPassenger: (pnr, newFlightId) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) return false;
        if (passenger.status === 'BOARDED') {
          get().addLog(`Cannot rebook boarded passenger ${pnr}`, 'CUSTOMER_SERVICE', 'ERROR');
          return false;
        }
        
        const newFlight = state.flights.find(f => f.id === newFlightId);
        if (!newFlight) return false;
        
        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, flightId: newFlightId, seat: 'REQ', status: 'BOOKED' } : p
          )
        }));
        
        get().addLog(`Passenger ${passenger.lastName} (${pnr}) rebooked to ${newFlight.flightNumber}`, 'CUSTOMER_SERVICE', 'SUCCESS');
        return true;
      },
      
      processRefund: (pnr, amount, reason) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) return false;
        
        get().addLog(`Refund processed for ${passenger.lastName} (${pnr}): €${amount.toFixed(2)} - ${reason}`, 'CUSTOMER_SERVICE', 'SUCCESS');
        return true;
      },
      
      upgradePassenger: (pnr, newClass) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) return false;
        
        // Simple upgrade: assign seat in J class (rows 1-5) or Y class (rows 6+)
        const availableSeats = newClass === 'J' 
          ? ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '2D', '3A', '3B', '3C', '3D']
          : ['6A', '6B', '6C', '6D', '7A', '7B', '7C', '7D', '8A', '8B', '8C', '8D'];
        
        const flightPassengers = state.passengers.filter(p => p.flightId === passenger.flightId);
        const occupiedSeats = flightPassengers.map(p => p.seat);
        const newSeat = availableSeats.find(s => !occupiedSeats.includes(s)) || availableSeats[0];
        
        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, seat: newSeat } : p
          )
        }));
        
        get().addLog(`Passenger ${passenger.lastName} (${pnr}) upgraded to ${newClass} class, seat ${newSeat}`, 'CUSTOMER_SERVICE', 'SUCCESS');
        return true;
      },
      
      issueVoucher: (pnr, amount, reason) => {
        const voucherId = Math.random().toString(36).substr(2, 9).toUpperCase();
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        
        const voucher: Voucher = {
          id: voucherId,
          pnr,
          amount,
          currency: 'EUR',
          reason,
          issuedDate: new Date().toISOString(),
          expiryDate: expiryDate.toISOString(),
          status: 'ACTIVE'
        };
        
        set((state) => ({
          vouchers: [...state.vouchers, voucher]
        }));
        
        get().addLog(`Voucher ${voucherId} issued for ${pnr}: €${amount.toFixed(2)} - ${reason}`, 'CUSTOMER_SERVICE', 'SUCCESS');
        return voucherId;
      },
      
      createComplaint: (pnr, passengerName, category, description) => {
        const complaintId = Math.random().toString(36).substr(2, 9).toUpperCase();
        
        const complaint: Complaint = {
          id: complaintId,
          pnr,
          passengerName,
          category,
          description,
          status: 'OPEN',
          createdAt: new Date().toISOString()
        };
        
        set((state) => ({
          complaints: [...state.complaints, complaint]
        }));
        
        get().addLog(`Complaint ${complaintId} created for ${passengerName} (${pnr}): ${category}`, 'CUSTOMER_SERVICE', 'WARNING');
        return complaintId;
      },
      
      updateComplaint: (complaintId, status, resolution) => {
        set((state) => ({
          complaints: state.complaints.map(c => 
            c.id === complaintId 
              ? { 
                  ...c, 
                  status, 
                  resolution,
                  resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date().toISOString() : c.resolvedAt
                } 
              : c
          )
        }));
        
        const complaint = get().complaints.find(c => c.id === complaintId);
        if (complaint) {
          get().addLog(`Complaint ${complaintId} updated to ${status}`, 'CUSTOMER_SERVICE', 'INFO');
        }
      }
    }),
    {
      name: 'airport-storage-v3', // Version bumped for new features
    }
  )
);
