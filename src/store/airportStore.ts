import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initializeDatabase, loadAllData, saveAllData } from '../services/database';
import { setupRealtimeSubscriptions, setLocalUpdateFlag } from '../services/realtime';

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
export type SecurityStatus = 'PENDING' | 'CLEARED' | 'FLAGGED' | 'ESCORT_REQUIRED';

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
  securityStatus?: SecurityStatus; // Security screening status
  securityNote?: string; // Security officer notes
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

export interface EmailConfirmation {
  id: string;
  pnr: string;
  to: string;
  from: string;
  subject: string;
  sentAt: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  content: string;
}

interface AirportStore {
  flights: Flight[];
  passengers: Passenger[];
  logs: LogEntry[];
  vouchers: Voucher[];
  complaints: Complaint[];
  emails: EmailConfirmation[];
  isDatabaseReady: boolean;
  
  // Actions
  updateFlightStatus: (flightId: string, status: FlightStatus) => void;
  updateGateMessage: (flightId: string, message: string) => void;
  updateFlightDetails: (flightId: string, updates: Partial<Flight>) => void;
  checkInPassenger: (pnr: string) => Promise<boolean>;
  cancelCheckIn: (pnr: string) => boolean;
  updatePassengerDetails: (pnr: string, details: Partial<Passenger>) => void;
  offloadPassenger: (pnr: string) => void;
  deboardPassenger: (pnr: string) => boolean;
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
  
  // Security Actions
  clearPassenger: (pnr: string) => void;
  flagPassenger: (pnr: string, note?: string) => void;
  requireEscort: (pnr: string, note?: string) => void;
  
  // Email Actions
  sendEmailConfirmation: (pnr: string, to: string, subject: string, content: string, htmlContent?: string) => Promise<string>;
  
  // Database Actions
  syncToDatabase: () => Promise<void>;
  loadFromDatabase: () => Promise<void>;
  pollDatabaseUpdates: () => Promise<void>;
  
  // Real-time update handlers
  updateFlightFromRealtime: (flight: Flight) => void;
  insertFlightFromRealtime: (flight: Flight) => void;
  deleteFlightFromRealtime: (flightId: string) => void;
  updatePassengerFromRealtime: (passenger: Passenger) => void;
  insertPassengerFromRealtime: (passenger: Passenger) => void;
  deletePassengerFromRealtime: (passengerId: string) => void;
}

// --- Data Generation ---

const HUB = 'RIX';

// Airline codes and their flight number ranges (used in DESTINATIONS)
// Note: AIRLINES constant removed as it's not directly used - airline info is in DESTINATIONS

// Extended destinations from RIX
const DESTINATIONS = [
  // Air Baltic routes
  { code: 'OSL', city: 'Oslo', airline: 'BT', flightNum: 151 },
  { code: 'HEL', city: 'Helsinki', airline: 'BT', flightNum: 301 },
  { code: 'CDG', city: 'Paris', airline: 'BT', flightNum: 691 },
  { code: 'FNC', city: 'Funchal', airline: 'BT', flightNum: 767 },
  { code: 'MUC', city: 'Munich', airline: 'BT', flightNum: 221 },
  { code: 'BER', city: 'Berlin', airline: 'BT', flightNum: 211 },
  { code: 'PRG', city: 'Prague', airline: 'BT', flightNum: 481 },
  { code: 'ARN', city: 'Stockholm', airline: 'BT', flightNum: 101 },
  { code: 'CPH', city: 'Copenhagen', airline: 'BT', flightNum: 131 },
  { code: 'BLL', city: 'Billund', airline: 'BT', flightNum: 147 },
  { code: 'VIE', city: 'Vienna', airline: 'BT', flightNum: 271 },
  { code: 'TLL', city: 'Tallinn', airline: 'BT', flightNum: 311 },
  { code: 'VNO', city: 'Vilnius', airline: 'BT', flightNum: 341 },
  { code: 'FRA', city: 'Frankfurt', airline: 'BT', flightNum: 243 },
  { code: 'AMS', city: 'Amsterdam', airline: 'BT', flightNum: 617 },
  { code: 'LGW', city: 'London', airline: 'BT', flightNum: 651 },
  { code: 'LHR', city: 'London', airline: 'BT', flightNum: 661 }, // Added for long-haul connections
  // Lufthansa routes
  { code: 'FRA', city: 'Frankfurt', airline: 'LH', flightNum: 440 },
  { code: 'MUC', city: 'Munich', airline: 'LH', flightNum: 450 },
  { code: 'VIE', city: 'Vienna', airline: 'LH', flightNum: 460 },
  // SAS routes
  { code: 'ARN', city: 'Stockholm', airline: 'SK', flightNum: 601 },
  { code: 'CPH', city: 'Copenhagen', airline: 'SK', flightNum: 602 },
  { code: 'OSL', city: 'Oslo', airline: 'SK', flightNum: 603 },
  // Finnair routes
  { code: 'HEL', city: 'Helsinki', airline: 'AY', flightNum: 801 },
  // LOT routes
  { code: 'WAW', city: 'Warsaw', airline: 'LO', flightNum: 201 },
  { code: 'PRG', city: 'Prague', airline: 'LO', flightNum: 202 },
  // Austrian routes
  { code: 'VIE', city: 'Vienna', airline: 'OS', flightNum: 501 },
  // Swiss routes
  { code: 'ZRH', city: 'Zurich', airline: 'LX', flightNum: 701 },
  // Ryanair routes
  { code: 'STN', city: 'London', airline: 'FR', flightNum: 1001 },
  { code: 'DUB', city: 'Dublin', airline: 'FR', flightNum: 1002 },
  { code: 'BGY', city: 'Milan', airline: 'FR', flightNum: 1003 },
  // Wizz Air routes
  { code: 'LTN', city: 'London', airline: 'W6', flightNum: 3001 },
  { code: 'BUD', city: 'Budapest', airline: 'W6', flightNum: 3002 },
  { code: 'WAW', city: 'Warsaw', airline: 'W6', flightNum: 3003 },
  // Additional Air Baltic routes
  { code: 'DUB', city: 'Dublin', airline: 'BT', flightNum: 451 },
  { code: 'MAD', city: 'Madrid', airline: 'BT', flightNum: 521 },
  { code: 'BCN', city: 'Barcelona', airline: 'BT', flightNum: 531 },
  { code: 'LIS', city: 'Lisbon', airline: 'BT', flightNum: 541 },
  { code: 'ATH', city: 'Athens', airline: 'BT', flightNum: 551 },
  { code: 'IST', city: 'Istanbul', airline: 'BT', flightNum: 561 },
  { code: 'DUS', city: 'Düsseldorf', airline: 'BT', flightNum: 571 },
  { code: 'HAM', city: 'Hamburg', airline: 'BT', flightNum: 581 },
  { code: 'BRU', city: 'Brussels', airline: 'BT', flightNum: 591 },
  { code: 'ZAG', city: 'Zagreb', airline: 'BT', flightNum: 601 },
  { code: 'SOF', city: 'Sofia', airline: 'BT', flightNum: 611 },
  { code: 'BUH', city: 'Bucharest', airline: 'BT', flightNum: 621 },
  // Additional Lufthansa routes
  { code: 'DUS', city: 'Düsseldorf', airline: 'LH', flightNum: 470 },
  { code: 'HAM', city: 'Hamburg', airline: 'LH', flightNum: 480 },
  // Additional SAS routes
  { code: 'GOT', city: 'Gothenburg', airline: 'SK', flightNum: 604 },
  // Additional LOT routes
  { code: 'KRK', city: 'Krakow', airline: 'LO', flightNum: 203 },
  // Additional Ryanair routes
  { code: 'CRL', city: 'Brussels', airline: 'FR', flightNum: 1004 },
  { code: 'BVA', city: 'Paris', airline: 'FR', flightNum: 1005 },
  { code: 'STN', city: 'London', airline: 'FR', flightNum: 1006 }, // Second daily
  // Additional Wizz Air routes
  { code: 'SOF', city: 'Sofia', airline: 'W6', flightNum: 3004 },
  { code: 'OTP', city: 'Bucharest', airline: 'W6', flightNum: 3005 },
  { code: 'BUD', city: 'Budapest', airline: 'W6', flightNum: 3006 }, // Second daily
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
  
  // Aircraft types by airline
  const getAircraft = (airline: string) => {
    const aircraftMap: Record<string, string[]> = {
      'BT': ['BCS3', 'A220'],
      'LH': ['A320', 'A321', 'A319'],
      'SK': ['A320', 'A321', 'A319'],
      'AY': ['A320', 'A321'],
      'LO': ['E175', 'E190', 'B737'],
      'FR': ['B737', 'A320'],
      'W6': ['A320', 'A321'],
      'OS': ['A320', 'A321'],
      'LX': ['A320', 'A321'],
    };
    const options = aircraftMap[airline] || ['A320'];
    return options[Math.floor(Math.random() * options.length)];
  };
  
  const getRegistration = (airline: string) => {
    const regPrefix: Record<string, string> = {
      'BT': 'YL-',
      'LH': 'D-A',
      'SK': 'SE-',
      'AY': 'OH-',
      'LO': 'SP-',
      'FR': 'EI-',
      'W6': 'HA-',
      'OS': 'OE-',
      'LX': 'HB-',
    };
    const prefix = regPrefix[airline] || 'XX-';
    return prefix + Math.random().toString(36).substr(2, 3).toUpperCase() + Math.floor(Math.random() * 99);
  };
  
  // 1. Outbound from Hub (RIX) - Early Morning Wave (6-8)
  DESTINATIONS.slice(0, Math.floor(DESTINATIONS.length * 0.4)).forEach(dest => {
     const std = randomTime(6, 8);
     flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: `${dest.airline}${dest.flightNum}`,
       origin: HUB,
       destination: dest.code,
       originCity: 'Riga',
       destinationCity: dest.city,
       std: std,
       etd: std,
       gate: ['A', 'B', 'C'][Math.floor(Math.random()*3)] + Math.floor(Math.random() * 25 + 1),
       status: 'SCHEDULED',
       aircraft: getAircraft(dest.airline),
       registration: getRegistration(dest.airline)
     });
  });

  // 2. Outbound from Hub (RIX) - Morning Wave (8-10)
  DESTINATIONS.forEach(dest => {
     const std = randomTime(8, 10);
     flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: `${dest.airline}${dest.flightNum + 20}`,
       origin: HUB,
       destination: dest.code,
       originCity: 'Riga',
       destinationCity: dest.city,
       std: std,
       etd: std,
       gate: ['A', 'B', 'C'][Math.floor(Math.random()*3)] + Math.floor(Math.random() * 25 + 1),
       status: 'SCHEDULED',
       aircraft: getAircraft(dest.airline),
       registration: getRegistration(dest.airline)
     });
  });

  // 3. Outbound from Hub (RIX) - Late Morning Wave (10-12)
  DESTINATIONS.slice(0, Math.floor(DESTINATIONS.length * 0.7)).forEach(dest => {
     const std = randomTime(10, 12);
     flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: `${dest.airline}${dest.flightNum + 30}`,
       origin: HUB,
       destination: dest.code,
       originCity: 'Riga',
       destinationCity: dest.city,
       std: std,
       etd: std,
       gate: ['A', 'B', 'C'][Math.floor(Math.random()*3)] + Math.floor(Math.random() * 25 + 1),
       status: 'SCHEDULED',
       aircraft: getAircraft(dest.airline),
       registration: getRegistration(dest.airline)
     });
  });

  // 4. Outbound from Hub (RIX) - Midday Wave (12-14)
  DESTINATIONS.slice(0, Math.floor(DESTINATIONS.length * 0.6)).forEach(dest => {
     const std = randomTime(12, 14);
     flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: `${dest.airline}${dest.flightNum + 40}`,
       origin: HUB,
       destination: dest.code,
       originCity: 'Riga',
       destinationCity: dest.city,
       std: std,
       etd: std,
       gate: ['A', 'B', 'C'][Math.floor(Math.random()*3)] + Math.floor(Math.random() * 25 + 1),
       status: 'SCHEDULED',
       aircraft: getAircraft(dest.airline),
       registration: getRegistration(dest.airline)
     });
  });

  // 5. Outbound from Hub (RIX) - Afternoon Wave (14-16)
  DESTINATIONS.slice(0, Math.floor(DESTINATIONS.length * 0.5)).forEach(dest => {
     const std = randomTime(14, 16);
     flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: `${dest.airline}${dest.flightNum + 50}`,
       origin: HUB,
       destination: dest.code,
       originCity: 'Riga',
       destinationCity: dest.city,
       std: std,
       etd: std,
       gate: ['A', 'B', 'C'][Math.floor(Math.random()*3)] + Math.floor(Math.random() * 25 + 1),
       status: 'SCHEDULED',
       aircraft: getAircraft(dest.airline),
       registration: getRegistration(dest.airline)
     });
  });

  // 6. Outbound from Hub (RIX) - Evening Wave (16-19)
  DESTINATIONS.slice(0, Math.floor(DESTINATIONS.length * 0.4)).forEach(dest => {
     const std = randomTime(16, 19);
     flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: `${dest.airline}${dest.flightNum + 60}`,
       origin: HUB,
       destination: dest.code,
       originCity: 'Riga',
       destinationCity: dest.city,
       std: std,
       etd: std,
       gate: ['A', 'B', 'C'][Math.floor(Math.random()*3)] + Math.floor(Math.random() * 25 + 1),
       status: 'SCHEDULED',
       aircraft: getAircraft(dest.airline),
       registration: getRegistration(dest.airline)
     });
  });

  // 7. Outbound from Hub (RIX) - Late Evening Wave (19-21)
  DESTINATIONS.slice(0, Math.floor(DESTINATIONS.length * 0.3)).forEach(dest => {
     const std = randomTime(19, 21);
     flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: `${dest.airline}${dest.flightNum + 70}`,
       origin: HUB,
       destination: dest.code,
       originCity: 'Riga',
       destinationCity: dest.city,
       std: std,
       etd: std,
       gate: ['A', 'B', 'C'][Math.floor(Math.random()*3)] + Math.floor(Math.random() * 25 + 1),
       status: 'SCHEDULED',
       aircraft: getAircraft(dest.airline),
       registration: getRegistration(dest.airline)
     });
  });

  // 3. Inbound to Hub (RIX) - Afternoon/Evening Wave (14-19)
  DESTINATIONS.forEach(dest => {
     const std = randomTime(14, 19);
     flights.push({
       id: Math.random().toString(36).substr(2, 9),
       flightNumber: `${dest.airline}${dest.flightNum + 1}`,
       origin: dest.code,
       destination: HUB,
       originCity: dest.city,
       destinationCity: 'Riga',
       std: std,
       etd: std,
       gate: ['A', 'B', 'C'][Math.floor(Math.random()*3)] + Math.floor(Math.random() * 25 + 1),
       status: 'SCHEDULED',
       aircraft: getAircraft(dest.airline),
       registration: getRegistration(dest.airline)
     });
  });
  
  // 4. Transit/Connecting flights from major hubs to long-haul destinations
  // These create connection opportunities: RIX -> Hub -> Long Haul
  const TRANSIT_HUBS = [
    { code: 'AMS', city: 'Amsterdam', airlines: ['KL', 'DL', 'UA'] }, // Added UA for US routes
    { code: 'FRA', city: 'Frankfurt', airlines: ['LH', 'UA', 'TG', 'DL'] }, // Added DL for US routes
    { code: 'CDG', city: 'Paris', airlines: ['AF', 'DL', 'TG', 'UA'] }, // Added UA for US routes
    { code: 'LHR', city: 'London', airlines: ['BA', 'AA', 'QR', 'TG', 'DL', 'UA'] }, // Added DL, UA for US routes
    { code: 'LGW', city: 'London', airlines: ['BA', 'EK'] },
    { code: 'MUC', city: 'Munich', airlines: ['LH', 'DL'] }, // Added DL for US routes
    { code: 'VIE', city: 'Vienna', airlines: ['OS'] },
    { code: 'ZRH', city: 'Zurich', airlines: ['LX'] },
    { code: 'ARN', city: 'Stockholm', airlines: ['SK'] },
    { code: 'CPH', city: 'Copenhagen', airlines: ['SK'] },
    { code: 'WAW', city: 'Warsaw', airlines: ['LO'] },
  ];
  
  const LONG_HAUL_DESTINATIONS = [
    // US East Coast
    { code: 'JFK', city: 'New York', airlines: ['DL', 'BA', 'LH', 'AF', 'UA', 'AA'] },
    { code: 'EWR', city: 'Newark', airlines: ['UA'] },
    { code: 'BOS', city: 'Boston', airlines: ['DL', 'BA', 'LH', 'AF', 'UA', 'AA'] },
    { code: 'IAD', city: 'Washington', airlines: ['UA', 'DL', 'LH', 'AF', 'BA'] },
    { code: 'MIA', city: 'Miami', airlines: ['AA', 'DL', 'BA', 'LH'] },
    // US West Coast
    { code: 'LAX', city: 'Los Angeles', airlines: ['DL', 'BA', 'LH', 'AF', 'UA', 'AA'] },
    { code: 'SFO', city: 'San Francisco', airlines: ['UA', 'DL', 'BA', 'LH', 'AF'] },
    { code: 'SEA', city: 'Seattle', airlines: ['DL', 'BA', 'LH', 'AF', 'UA'] },
    // US Central/Midwest
    { code: 'ORD', city: 'Chicago', airlines: ['UA', 'AA', 'DL', 'BA', 'LH', 'AF'] },
    { code: 'DFW', city: 'Dallas', airlines: ['AA', 'DL', 'BA', 'LH'] },
    { code: 'ATL', city: 'Atlanta', airlines: ['DL', 'BA', 'LH', 'AF'] },
    { code: 'IAH', city: 'Houston', airlines: ['UA', 'DL', 'BA', 'LH'] },
    // Other Long-Haul
    { code: 'DXB', city: 'Dubai', airlines: ['EK'] },
    { code: 'DOH', city: 'Doha', airlines: ['QR'] },
    { code: 'BKK', city: 'Bangkok', airlines: ['TG'] },
    { code: 'SIN', city: 'Singapore', airlines: ['SQ'] },
    { code: 'NRT', city: 'Tokyo', airlines: ['NH', 'JL'] },
    { code: 'ICN', city: 'Seoul', airlines: ['KE'] },
    { code: 'YYZ', city: 'Toronto', airlines: ['AC'] },
    { code: 'YUL', city: 'Montreal', airlines: ['AC'] },
  ];
  
  // Create connecting flights from hubs to long-haul
  TRANSIT_HUBS.forEach(hub => {
    LONG_HAUL_DESTINATIONS.forEach(dest => {
      // Only create if airline matches
      const matchingAirline = hub.airlines.find(a => dest.airlines.includes(a));
      if (matchingAirline) {
        // Always create at least one flight per valid route
        // This ensures connections are always available
        const flightNum = Math.floor(Math.random() * 999) + 1;
        // Departures between 12:00-17:00 for better connection timing
        // This ensures connections work with morning RIX->Hub flights
        const depTime = randomTime(12, 17);
        
        flights.push({
          id: Math.random().toString(36).substr(2, 9),
          flightNumber: `${matchingAirline}${flightNum.toString().padStart(3, '0')}`,
          origin: hub.code,
          destination: dest.code,
          originCity: hub.city,
          destinationCity: dest.city,
          std: depTime,
          etd: depTime,
          gate: 'X' + Math.floor(Math.random() * 99),
          status: 'SCHEDULED',
          aircraft: ['A333', 'B777', 'B787', 'A350', 'B77W', 'A380'][Math.floor(Math.random() * 6)],
          registration: 'XX-' + Math.random().toString(36).substr(2, 3).toUpperCase() + Math.floor(Math.random() * 99)
        });
        
        // Create additional flights for popular routes (50% chance)
        if (Math.random() > 0.5) {
          const flightNum2 = Math.floor(Math.random() * 999) + 1;
          const depTime2 = randomTime(13, 18); // Slightly later for second flight
          
          flights.push({
            id: Math.random().toString(36).substr(2, 9),
            flightNumber: `${matchingAirline}${flightNum2.toString().padStart(3, '0')}`,
            origin: hub.code,
            destination: dest.code,
            originCity: hub.city,
            destinationCity: dest.city,
            std: depTime2,
            etd: depTime2,
            gate: 'X' + Math.floor(Math.random() * 99),
            status: 'SCHEDULED',
            aircraft: ['A333', 'B777', 'B787', 'A350', 'B77W', 'A380'][Math.floor(Math.random() * 6)],
            registration: 'XX-' + Math.random().toString(36).substr(2, 3).toUpperCase() + Math.floor(Math.random() * 99)
          });
        }
      }
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
      emails: [],
      isDatabaseReady: false,

      updateFlightStatus: (flightId, status) => {
        set((state) => ({
          flights: state.flights.map(f => f.id === flightId ? { ...f, status } : f)
        }));
        get().addLog(`Flight ${flightId} status changed to ${status}`, 'OCC', 'INFO');
        // Sync to database (fire and forget)
        if (get().isDatabaseReady) {
          get().syncToDatabase().catch(() => {});
        }
      },

      updateGateMessage: (flightId, message) => {
        set((state) => ({
          flights: state.flights.map(f => f.id === flightId ? { ...f, gateMessage: message } : f)
        }));
        get().addLog(`Gate message updated for flight ${flightId}`, 'GATE', 'INFO');
        // Sync to database
        if (get().isDatabaseReady) {
          get().syncToDatabase().catch(() => {});
        }
      },

      updateFlightDetails: (flightId, updates) => {
        set((state) => ({
          flights: state.flights.map(f => f.id === flightId ? { ...f, ...updates } : f)
        }));
        get().addLog(`Flight details updated for ${flightId}`, 'OCC', 'INFO');
        // Sync to database
        if (get().isDatabaseReady) {
          get().syncToDatabase().catch(() => {});
        }
      },

      checkInPassenger: async (pnr) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) return false;
        if (passenger.status !== 'BOOKED') return false; 

        // Auto-assign seat if passenger doesn't have one
        let assignedSeat = passenger.seat;
        if (!assignedSeat || assignedSeat === 'REQ' || assignedSeat === 'TBA') {
          // Get all passengers on the same flight
          const flightPassengers = state.passengers.filter(p => p.flightId === passenger.flightId);
          const occupiedSeats = new Set(flightPassengers
            .filter(p => p.seat && p.seat !== 'REQ' && p.seat !== 'TBA' && p.seat !== 'SBY')
            .map(p => p.seat));
          
          // Find first available seat (rows 1-30, seats A-F)
          // Start from row 6 (economy) unless passenger type suggests business
          const startRow = passenger.passengerType === 'STAFF_DUTY' ? 1 : 6;
          let foundSeat = null;
          
          for (let row = startRow; row <= 30 && !foundSeat; row++) {
            for (const seatLetter of ['A', 'B', 'C', 'D', 'E', 'F']) {
              const seatId = `${row}${seatLetter}`;
              if (!occupiedSeats.has(seatId)) {
                foundSeat = seatId;
                break;
              }
            }
          }
          
          // If no seat found in economy, try business (rows 1-5)
          if (!foundSeat && startRow > 5) {
            for (let row = 1; row <= 5 && !foundSeat; row++) {
              for (const seatLetter of ['A', 'B', 'C', 'D', 'E', 'F']) {
                const seatId = `${row}${seatLetter}`;
                if (!occupiedSeats.has(seatId)) {
                  foundSeat = seatId;
                  break;
                }
              }
            }
          }
          
          if (foundSeat) {
            assignedSeat = foundSeat;
            get().addLog(`Auto-assigned seat ${foundSeat} to ${passenger.lastName} (${pnr})`, 'CHECK-IN', 'INFO');
          } else {
            // No available seats, assign standby
            assignedSeat = 'SBY';
            get().addLog(`No available seats - assigned SBY to ${passenger.lastName} (${pnr})`, 'CHECK-IN', 'WARNING');
          }
        }

        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, status: 'CHECKED_IN', securityStatus: 'PENDING', seat: assignedSeat } : p
          )
        }));
        get().addLog(`Passenger ${passenger.lastName} (${pnr}) checked in${assignedSeat && assignedSeat !== passenger.seat ? ` - seat ${assignedSeat}` : ''}`, 'CHECK-IN', 'SUCCESS');
        
        // Send check-in confirmation email automatically
        try {
          // Get fresh state to ensure we have latest emails
          const currentState = get();
          
          // Find email address from previous email confirmations for this PNR
          // Try to find any email with this PNR (prefer SENT, but accept any status)
          const previousEmail = currentState.emails.find(e => e.pnr === pnr && e.status === 'SENT') ||
                                currentState.emails.find(e => e.pnr === pnr);
          const emailAddress = previousEmail?.to;
          
          // Debug logging
          if (!emailAddress) {
            console.log(`[Check-in Email] No email found for PNR ${pnr}`);
            console.log(`[Check-in Email] Total emails in store: ${currentState.emails.length}`);
            console.log(`[Check-in Email] Emails for this PNR:`, currentState.emails.filter(e => e.pnr === pnr));
          }
          
          if (emailAddress) {
            // Get flight details
            const flight = state.flights.find(f => f.id === passenger.flightId);
            if (flight) {
              // Parse departure time and calculate boarding time (40 minutes before departure)
              const parseTime = (timeStr: string): Date => {
                if (timeStr.match(/^\d{2}:\d{2}$/)) {
                  // Format: HH:mm
                  const [hours, minutes] = timeStr.split(':').map(Number);
                  const date = new Date();
                  date.setHours(hours, minutes, 0, 0);
                  return date;
                }
                return new Date(timeStr);
              };
              
              const departureTime = parseTime(flight.std);
              const boardingTime = new Date(departureTime.getTime() - 40 * 60 * 1000); // 40 minutes before
              
              // Calculate arrival time (estimate 2 hours for most flights)
              const arrivalTime = new Date(departureTime.getTime() + 2 * 60 * 60 * 1000);
              
              // Format dates
              const formatDate = (date: Date) => {
                return date.toISOString().split('T')[0];
              };
              
              const formatTime = (date: Date) => {
                return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
              };
              
              // Generate check-in email HTML
              const { generateCheckInConfirmationHtml } = await import('../services/mailgun');
              const passengerName = `${passenger.title || ''} ${passenger.firstName} ${passenger.lastName}`.trim();
              
              const htmlContent = generateCheckInConfirmationHtml({
                passengerName,
                pnr,
                flightNumber: flight.flightNumber,
                origin: flight.origin,
                originCity: flight.originCity || flight.origin,
                destination: flight.destination,
                destinationCity: flight.destinationCity || flight.destination,
                departureDate: formatDate(departureTime),
                departureTime: formatTime(departureTime),
                arrivalDate: formatDate(arrivalTime),
                arrivalTime: formatTime(arrivalTime),
                gate: flight.gate || 'TBA',
                seat: passenger.seat || 'TBA',
                boardingTime: formatTime(boardingTime),
                bagCount: passenger.bagCount || 0
              });
              
              // Generate text version
              const textContent = `Dear ${passengerName},\n\nWe confirm that you have been checked-in successfully for flight ${flight.flightNumber}.\n\nBooking Reference: ${pnr}\nFlight: ${flight.flightNumber}\nFrom: ${flight.originCity || flight.origin}\nTo: ${flight.destinationCity || flight.destination}\nDeparture: ${formatDate(departureTime)} ${formatTime(departureTime)}\nArrival: ${formatDate(arrivalTime)} ${formatTime(arrivalTime)}\nGate: ${flight.gate || 'TBA'}\nSeat: ${passenger.seat || 'TBA'}\nBoarding Time: ${formatTime(boardingTime)}\n\nPlease report at the boarding gate at the latest by: ${formatTime(boardingTime)}\n\nThank you for choosing our airline, we wish you a pleasant journey.`;
              
              // Send email
              await get().sendEmailConfirmation(
                pnr,
                emailAddress,
                `Check-in Confirmation - Flight ${flight.flightNumber}`,
                textContent,
                htmlContent
              );
              
              get().addLog(`Check-in confirmation email sent to ${emailAddress} for ${pnr}`, 'CHECK-IN', 'SUCCESS');
            }
          } else {
            get().addLog(`No email address found for PNR ${pnr} - check-in email not sent`, 'CHECK-IN', 'WARNING');
          }
        } catch (error: any) {
          get().addLog(`Failed to send check-in email for ${pnr}: ${error.message}`, 'CHECK-IN', 'ERROR');
        }
        
        // Sync to database
        if (get().isDatabaseReady) {
          get().syncToDatabase().catch(() => {});
        }
        return true;
      },

      cancelCheckIn: (pnr) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) return false;
        if (passenger.status !== 'CHECKED_IN') {
          get().addLog(`Cannot cancel check-in for ${pnr} - passenger is not checked in`, 'CHECK-IN', 'WARNING');
          return false;
        }

        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, status: 'BOOKED', securityStatus: undefined } : p
          )
        }));
        get().addLog(`Check-in cancelled for ${passenger.lastName} (${pnr})`, 'CHECK-IN', 'WARNING');
        // Sync to database
        if (get().isDatabaseReady) {
          get().syncToDatabase().catch(() => {});
        }
        return true;
      },

      updatePassengerDetails: (pnr, details) => {
        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, ...details } : p
          )
        }));
        get().addLog(`Passenger details updated for ${pnr}`, 'CHECK-IN', 'INFO');
        // Sync to database
        if (get().isDatabaseReady) {
          get().syncToDatabase().catch(() => {});
        }
      },

      offloadPassenger: (pnr) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) {
          get().addLog(`Passenger ${pnr} not found for offload`, 'BOARDING', 'ERROR');
          return;
        }
        
        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, status: 'BOOKED', seat: '', bagCount: 0, hasBags: false, bagsLoaded: 0 } : p
          )
        }));
        get().addLog(`Passenger ${pnr} offloaded`, 'BOARDING', 'WARNING');
        
        // Sync to database
        if (get().isDatabaseReady) {
          get().syncToDatabase().catch(() => {});
        }
      },

      deboardPassenger: (pnr) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) {
          get().addLog(`Cannot deboard passenger - PNR ${pnr} not found`, 'BOARDING', 'WARNING');
          return false;
        }
        if (passenger.status !== 'BOARDED') {
          get().addLog(`Cannot deboard passenger ${passenger.lastName} (${pnr}) - passenger is not boarded (status: ${passenger.status})`, 'BOARDING', 'WARNING');
          return false;
        }

        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, status: 'CHECKED_IN' } : p
          )
        }));
        get().addLog(`Passenger ${passenger.lastName} (${pnr}) debarked`, 'BOARDING', 'INFO');
        
        // Sync to database
        if (get().isDatabaseReady) {
          get().syncToDatabase().catch(() => {});
        }
        return true;
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
             passengerType: 'REVENUE',
             securityStatus: 'PENDING'
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
        // Sync to database
        if (get().isDatabaseReady) {
          get().syncToDatabase().catch(() => {});
        }
      },

      boardPassenger: (pnr) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) {
          console.error(`[boardPassenger] Passenger not found: ${pnr}`);
          get().addLog(`Cannot board passenger - PNR ${pnr} not found`, 'BOARDING', 'WARNING');
          return false;
        }
        
        console.log(`[boardPassenger] Attempting to board:`, {
          pnr,
          name: `${passenger.lastName}, ${passenger.firstName}`,
          status: passenger.status,
          flightId: passenger.flightId
        });
        
        if (passenger.status !== 'CHECKED_IN') {
          console.error(`[boardPassenger] Passenger not checked in:`, {
            pnr,
            status: passenger.status,
            expected: 'CHECKED_IN'
          });
          get().addLog(`Cannot board passenger ${passenger.lastName} (${pnr}) - passenger is not checked in (status: ${passenger.status})`, 'BOARDING', 'WARNING');
          return false; 
        }

        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, status: 'BOARDED' } : p
          )
        }));
        get().addLog(`Passenger ${passenger.lastName} (${pnr}) boarded`, 'BOARDING', 'SUCCESS');
        console.log(`[boardPassenger] Successfully boarded: ${pnr}`);
        
        // Sync to database
        if (get().isDatabaseReady) {
          get().syncToDatabase().catch((err) => {
            console.error(`[boardPassenger] Database sync failed:`, err);
          });
        }
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
      },
      
      // Security Actions
      clearPassenger: (pnr) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) return;
        
        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, securityStatus: 'CLEARED', securityNote: undefined } : p
          )
        }));
        
        get().addLog(`Passenger ${passenger.lastName} (${pnr}) cleared security`, 'SECURITY', 'SUCCESS');
      },
      
      flagPassenger: (pnr, note) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) return;
        
        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, securityStatus: 'FLAGGED', securityNote: note } : p
          )
        }));
        
        get().addLog(`Passenger ${passenger.lastName} (${pnr}) flagged for security review${note ? `: ${note}` : ''}`, 'SECURITY', 'WARNING');
      },
      
      requireEscort: (pnr, note) => {
        const state = get();
        const passenger = state.passengers.find(p => p.pnr === pnr);
        if (!passenger) return;
        
        set((state) => ({
          passengers: state.passengers.map(p => 
            p.pnr === pnr ? { ...p, securityStatus: 'ESCORT_REQUIRED', securityNote: note } : p
          )
        }));
        
        get().addLog(`Escort required for passenger ${passenger.lastName} (${pnr})${note ? `: ${note}` : ''}`, 'SECURITY', 'ERROR');
      },
      
      // Email Actions
      sendEmailConfirmation: async (pnr, to, subject, content, htmlContent) => {
        const emailId = Math.random().toString(36).substr(2, 9).toUpperCase();
        
        // Get Mailgun "from" address (uses Mailgun domain automatically)
        const { getMailgunFromAddress } = await import('../services/mailgun');
        const fromEmail = getMailgunFromAddress();
        
        // Create email record with PENDING status
        const email: EmailConfirmation = {
          id: emailId,
          pnr,
          to,
          from: fromEmail,
          subject,
          sentAt: new Date().toISOString(),
          status: 'PENDING',
          content
        };
        
        // Add to store immediately
        set((state) => ({
          emails: [...state.emails, email]
        }));
        
        // Try to send via Mailgun
        try {
          const { sendEmailViaMailgun, textToHtml } = await import('../services/mailgun');
          
          const result = await sendEmailViaMailgun({
            to,
            subject,
            text: content,
            html: htmlContent || textToHtml(content)
          });
          
          if (result.success) {
            // Update email status to SENT
            set((state) => ({
              emails: state.emails.map(e => 
                e.id === emailId ? { ...e, status: 'SENT' as const } : e
              )
            }));
            get().addLog(`Email confirmation sent to ${to} for PNR ${pnr} via Mailgun`, 'RESERVATIONS', 'SUCCESS');
            return emailId;
          } else {
            // Update email status to FAILED
            set((state) => ({
              emails: state.emails.map(e => 
                e.id === emailId ? { ...e, status: 'FAILED' as const } : e
              )
            }));
            get().addLog(`Failed to send email to ${to} for PNR ${pnr}: ${result.error}`, 'RESERVATIONS', 'ERROR');
            return emailId;
          }
        } catch (error: any) {
          // If Mailgun service fails, mark as failed but keep the email record
          set((state) => ({
            emails: state.emails.map(e => 
              e.id === emailId ? { ...e, status: 'FAILED' as const } : e
            )
          }));
          get().addLog(`Email service error for PNR ${pnr}: ${error.message}`, 'RESERVATIONS', 'ERROR');
          return emailId;
        }
      },
      
      // Database Actions
      syncToDatabase: async () => {
        try {
          // Set flag to prevent real-time updates from triggering during our own sync
          setLocalUpdateFlag(true);
          const state = get();
          await saveAllData({
            flights: state.flights,
            passengers: state.passengers,
            logs: state.logs,
            vouchers: state.vouchers,
            complaints: state.complaints,
            emails: state.emails
          });
          // Reset flag after a short delay to allow DB to process
          setTimeout(() => setLocalUpdateFlag(false), 1000);
        } catch (error: any) {
          console.error('Error syncing to database:', error);
          setLocalUpdateFlag(false);
          get().addLog(`Database sync failed: ${error.message}`, 'SYSTEM', 'ERROR');
        }
      },
      
      // Real-time update handlers (called from real-time subscriptions)
      updateFlightFromRealtime: (flight: Flight) => {
        set((state) => {
          const existingIndex = state.flights.findIndex(f => f.id === flight.id);
          if (existingIndex >= 0) {
            // Update existing flight
            const newFlights = [...state.flights];
            newFlights[existingIndex] = flight;
            return { flights: newFlights };
          } else {
            // Add new flight
            return { flights: [...state.flights, flight] };
          }
        });
        get().addLog(`Flight ${flight.flightNumber} updated from another device`, 'SYSTEM', 'INFO');
      },
      
      insertFlightFromRealtime: (flight: Flight) => {
        set((state) => {
          // Check if flight already exists
          if (state.flights.find(f => f.id === flight.id)) {
            return state; // Already exists, skip
          }
          return { flights: [...state.flights, flight] };
        });
        get().addLog(`Flight ${flight.flightNumber} added from another device`, 'SYSTEM', 'INFO');
      },
      
      deleteFlightFromRealtime: (flightId: string) => {
        set((state) => ({
          flights: state.flights.filter(f => f.id !== flightId)
        }));
        get().addLog(`Flight ${flightId} deleted from another device`, 'SYSTEM', 'INFO');
      },
      
      updatePassengerFromRealtime: (passenger: Passenger) => {
        set((state) => {
          const existingIndex = state.passengers.findIndex(p => p.id === passenger.id);
          if (existingIndex >= 0) {
            // Update existing passenger
            const newPassengers = [...state.passengers];
            newPassengers[existingIndex] = passenger;
            return { passengers: newPassengers };
          } else {
            // Add new passenger
            return { passengers: [...state.passengers, passenger] };
          }
        });
      },
      
      insertPassengerFromRealtime: (passenger: Passenger) => {
        set((state) => {
          // Check if passenger already exists
          if (state.passengers.find(p => p.id === passenger.id)) {
            return state; // Already exists, skip
          }
          return { passengers: [...state.passengers, passenger] };
        });
      },
      
      deletePassengerFromRealtime: (passengerId: string) => {
        set((state) => ({
          passengers: state.passengers.filter(p => p.id !== passengerId)
        }));
      },
      
      loadFromDatabase: async () => {
        try {
          const data = await loadAllData();
          set({
            flights: data.flights.length > 0 ? data.flights : INITIAL_FLIGHTS,
            passengers: data.passengers,
            logs: data.logs,
            vouchers: data.vouchers,
            complaints: data.complaints,
            emails: data.emails,
            isDatabaseReady: true
          });
          get().addLog('Data loaded from database', 'SYSTEM', 'SUCCESS');
        } catch (error: any) {
          console.error('Error loading from database:', error);
          set({ isDatabaseReady: false });
          get().addLog(`Database load failed: ${error.message}. Using local storage.`, 'SYSTEM', 'WARNING');
        }
      },
      
      // Poll database for updates (fallback if real-time doesn't work)
      pollDatabaseUpdates: async () => {
        if (!get().isDatabaseReady) return;
        try {
          const data = await loadAllData();
          const currentState = get();
          
          // Check if flights have changed
          const flightsChanged = JSON.stringify(data.flights) !== JSON.stringify(currentState.flights);
          if (flightsChanged) {
            // Update flights that have changed
            data.flights.forEach((dbFlight: Flight) => {
              const localFlight = currentState.flights.find(f => f.id === dbFlight.id);
              if (!localFlight || JSON.stringify(localFlight) !== JSON.stringify(dbFlight)) {
                // Flight has changed, update it
                get().updateFlightFromRealtime(dbFlight);
              }
            });
          }
          
          // Check if passengers have changed
          const passengersChanged = JSON.stringify(data.passengers) !== JSON.stringify(currentState.passengers);
          if (passengersChanged) {
            // Update passengers that have changed
            data.passengers.forEach((dbPassenger: Passenger) => {
              const localPassenger = currentState.passengers.find(p => p.id === dbPassenger.id);
              if (!localPassenger || JSON.stringify(localPassenger) !== JSON.stringify(dbPassenger)) {
                // Passenger has changed, update it
                get().updatePassengerFromRealtime(dbPassenger);
              }
            });
          }
        } catch (error: any) {
          console.error('Error polling database:', error);
        }
      }
    }),
    {
      name: 'airport-storage-v9', // Version bumped for expanded US routes
      // Keep localStorage as fallback
    }
  )
);

// Initialize database on module load
let dbInitialized = false;
let realtimeCleanup: (() => void) | null = null;

export async function initializeAirportDatabase() {
  if (dbInitialized) return;
  
  try {
    await initializeDatabase();
    dbInitialized = true;
    
    // Load data from database
    const store = useAirportStore.getState();
    await store.loadFromDatabase();
    
    // Set up real-time subscriptions for live updates across devices
    realtimeCleanup = setupRealtimeSubscriptions(
      // Flight update handler
      (flight) => {
        store.updateFlightFromRealtime(flight);
      },
      // Flight insert handler
      (flight) => {
        store.insertFlightFromRealtime(flight);
      },
      // Flight delete handler
      (flightId) => {
        store.deleteFlightFromRealtime(flightId);
      },
      // Passenger update handler
      (passenger) => {
        store.updatePassengerFromRealtime(passenger);
      },
      // Passenger insert handler
      (passenger) => {
        store.insertPassengerFromRealtime(passenger);
      },
      // Passenger delete handler
      (passengerId) => {
        store.deletePassengerFromRealtime(passengerId);
      }
    );
    
    store.addLog('Real-time subscriptions enabled - changes will sync across devices', 'SYSTEM', 'SUCCESS');
    
    // Set up polling as fallback (every 3 seconds) in case real-time doesn't work
    const pollInterval = setInterval(() => {
      store.pollDatabaseUpdates();
    }, 3000);
    
    // Store cleanup function that also clears polling
    const originalCleanup = realtimeCleanup;
    realtimeCleanup = () => {
      if (originalCleanup) originalCleanup();
      clearInterval(pollInterval);
    };
  } catch (error: any) {
    console.error('Database initialization failed:', error);
    // Continue with localStorage fallback
    useAirportStore.getState().addLog(`Database unavailable: ${error.message}. Using localStorage.`, 'SYSTEM', 'WARNING');
  }
}

// Cleanup function for real-time subscriptions
export function cleanupRealtimeSubscriptions() {
  if (realtimeCleanup) {
    realtimeCleanup();
    realtimeCleanup = null;
  }
}
