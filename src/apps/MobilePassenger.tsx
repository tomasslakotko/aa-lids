import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Home,
  Menu,
  Plane,
  UserCircle,
  Armchair
} from 'lucide-react';
import QRCode from 'react-qr-code';
import clsx from 'clsx';
import { useAirportStore } from '../store/airportStore';
import { initializeAirportDatabase } from '../store/airportStore';

type Screen =
  | 'explore'
  | 'book'
  | 'trips'
  | 'tripDetail'
  | 'boardingPass'
  | 'account'
  | 'more'
  | 'add'
  | 'seat'
  | 'checkin'
  | 'payment'
  | 'notifications';

const TRIPS_KEY = 'mobile-trips-v1';
const SELECTED_KEY = 'mobile-selected-pnr-v1';
const NOTIFY_KEY = 'mobile-notifications-v1';
const NOTIFY_ENABLED_KEY = 'mobile-notifications-enabled-v1';
const PROFILE_KEY = 'mobile-profile-v1';
const RECENT_SEARCH_KEY = 'mobile-recent-search-v1';

const generatePnr = () => Math.random().toString(36).substring(2, 8).toUpperCase();


export const MobilePassengerApp = () => {
  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);
  const checkInPassenger = useAirportStore((state) => state.checkInPassenger);
  const createBooking = useAirportStore((state) => state.createBooking);
  const addLog = useAirportStore((state) => state.addLog);
  const addEmailContact = useAirportStore((state) => state.addEmailContact);
  const loadFromDatabase = useAirportStore((state) => state.loadFromDatabase);
  const isDatabaseReady = useAirportStore((state) => state.isDatabaseReady);

  const [screen, setScreen] = useState<Screen>('explore');
  const [trips, setTrips] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(TRIPS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedPnr, setSelectedPnr] = useState<string>(() => {
    try {
      return localStorage.getItem(SELECTED_KEY) || '';
    } catch {
      return '';
    }
  });
  const [notifications, setNotifications] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(NOTIFY_ENABLED_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [profile, setProfile] = useState<{ name: string; email: string; skymiles: string }>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      return saved ? JSON.parse(saved) : { name: '', email: '', skymiles: '' };
    } catch {
      return { name: '', email: '', skymiles: '' };
    }
  });
  const [recentSearches, setRecentSearches] = useState<
    Array<{ origin: string; destination: string; depart: string; returnDate?: string; type: string }>
  >(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCH_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const lastFlightRef = useRef<{ status?: string; gate?: string } | null>(null);

  const [lookupPnr, setLookupPnr] = useState('');
  const [lookupLastName, setLookupLastName] = useState('');
  const [bookingFirstName, setBookingFirstName] = useState('');
  const [bookingLastName, setBookingLastName] = useState('');
  const [bookingFlightId, setBookingFlightId] = useState('');
  const [bookingConnectionFlightId, setBookingConnectionFlightId] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [tripType, setTripType] = useState<'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_CITY'>('ONE_WAY');
  const [showResults, setShowResults] = useState(false);
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [fareClass, setFareClass] = useState<'BASIC' | 'MAIN' | 'COMFORT' | 'BUSINESS'>('MAIN');
  const [airportPicker, setAirportPicker] = useState<{
    open: boolean;
    type: 'origin' | 'destination' | null;
  }>({ open: false, type: null });
  const [syncState, setSyncState] = useState<'IDLE' | 'SYNCING' | 'ERROR'>('IDLE');
  const [lastSync, setLastSync] = useState<string>('');
  const [seatSelection, setSeatSelection] = useState('');
  const [bagCount, setBagCount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CARD');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    initializeAirportDatabase();
  }, []);

  useEffect(() => {
    if (isDatabaseReady) {
      setLastSync(new Date().toLocaleString());
    }
  }, [isDatabaseReady]);

  useEffect(() => {
    // Enable scrolling inside the mobile shell even though body is overflow-hidden
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem(SELECTED_KEY, selectedPnr);
  }, [selectedPnr]);

  useEffect(() => {
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(NOTIFY_ENABLED_KEY, JSON.stringify(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  const tripPassengers = useMemo(
    () => trips.map((pnr) => passengers.find((p) => p.pnr === pnr)).filter(Boolean),
    [trips, passengers]
  );

  const selectedPassenger = useMemo(
    () => passengers.find((p) => p.pnr === selectedPnr) || tripPassengers[0],
    [passengers, selectedPnr, tripPassengers]
  );

  const tripSegments = useMemo(() => {
    if (!selectedPassenger) return [];
    const segments = passengers
      .filter((p) => p.pnr === selectedPassenger.pnr)
      .map((p) => ({
        passenger: p,
        flight: flights.find((f) => f.id === p.flightId)
      }))
      .filter((seg) => seg.flight);

    return segments.sort((a, b) => {
      const dateA = a.flight?.date || '';
      const dateB = b.flight?.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.flight?.std || '').localeCompare(b.flight?.std || '');
    });
  }, [selectedPassenger, passengers, flights]);

  const selectedSegment =
    tripSegments.find((seg) => seg.flight?.id === selectedPassenger?.flightId) || tripSegments[0];
  const selectedFlight = selectedSegment?.flight || null;
  const finalSegment = tripSegments[tripSegments.length - 1];

  const availableDates = useMemo(() => {
    const dates = flights.map((f) => f.date).filter(Boolean) as string[];
    return Array.from(new Set(dates)).sort();
  }, [flights]);

  const flightsForDate = useMemo(() => {
    return flights.filter((f) => {
      if (searchDate && f.date && f.date !== searchDate) return false;
      if (searchOrigin && f.origin !== searchOrigin) return false;
      if (searchDestination && f.destination !== searchDestination) return false;
      return true;
    });
  }, [flights, searchDate, searchOrigin, searchDestination]);

  const bookingSelectedFlight = useMemo(() => {
    return bookingFlightId ? flights.find((f) => f.id === bookingFlightId) || null : null;
  }, [bookingFlightId, flights]);

  const bookingSelectedConnection = useMemo(() => {
    return bookingConnectionFlightId ? flights.find((f) => f.id === bookingConnectionFlightId) || null : null;
  }, [bookingConnectionFlightId, flights]);

  const airportOptions = useMemo(() => {
    try {
      const all = new Set<string>();
      if (flights && Array.isArray(flights)) {
        flights.forEach((f) => {
          if (f?.origin) all.add(f.origin);
          if (f?.destination) all.add(f.destination);
        });
      }
      const sorted = Array.from(all).sort();
      return sorted.length > 0 ? sorted : ['RIX', 'FRA', 'AMS', 'CDG', 'LHR', 'MUC', 'ARN', 'CPH', 'OSL', 'HEL'];
    } catch (error) {
      console.error('Error computing airport options:', error);
      return ['RIX', 'FRA', 'AMS', 'CDG', 'LHR', 'MUC', 'ARN', 'CPH', 'OSL', 'HEL'];
    }
  }, [flights]);

  useEffect(() => {
    if (!searchDate && availableDates.length > 0) {
      setSearchDate(availableDates[0]);
    }
  }, [availableDates, searchDate]);

  useEffect(() => {
    if (!searchOrigin && airportOptions.length > 0) {
      setSearchOrigin('RIX');
    }
  }, [airportOptions, searchOrigin]);

  useEffect(() => {
    if (!profile.name) return;
    const parts = profile.name.trim().split(/\s+/);
    if (parts.length === 0) return;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || parts[0];
    setBookingFirstName(firstName.toUpperCase());
    setBookingLastName(lastName.toUpperCase());
  }, [profile.name]);

  useEffect(() => {
    if (selectedPassenger && selectedPassenger.pnr !== selectedPnr) {
      setSelectedPnr(selectedPassenger.pnr);
    }
  }, [selectedPassenger, selectedPnr]);

  const addNotification = async (message: string) => {
    setNotifications((prev) => {
      if (prev[0] === message) return prev;
      return [message, ...prev].slice(0, 50);
    });
    if (notificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // Permission not yet requested, ask for it
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('Flight Update', { body: message });
        }
      } else if (Notification.permission === 'granted') {
        new Notification('Flight Update', { body: message });
      }
    }
  };

  useEffect(() => {
    if (!selectedPassenger || !selectedFlight) return;
    const prev = lastFlightRef.current;
    if (prev) {
      if (prev.status && prev.status !== selectedFlight.status) {
        addNotification(
          `${new Date().toLocaleTimeString()} · Status ${prev.status} → ${selectedFlight.status}`
        );
      }
      if (prev.gate && prev.gate !== selectedFlight.gate) {
        addNotification(
          `${new Date().toLocaleTimeString()} · Gate changed ${prev.gate} → ${selectedFlight.gate || 'TBA'}`
        );
      }
    }
    if (['BOARDING', 'DEPARTED', 'ARRIVED'].includes(selectedFlight.status)) {
      addNotification(`${new Date().toLocaleTimeString()} · ${selectedFlight.status} for ${selectedFlight.flightNumber}`);
    }
    lastFlightRef.current = { status: selectedFlight.status, gate: selectedFlight.gate };
  }, [selectedPassenger, selectedFlight]);

  // Request notification permission when notifications screen is opened
  useEffect(() => {
    if (screen === 'notifications' && 'Notification' in window && Notification.permission === 'default') {
      // Request permission when user opens notifications screen
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          setNotificationsEnabled(true);
        }
      });
    }
  }, [screen]);

  const handleAddReservation = () => {
    setError('');
    setSuccess('');
    const passenger = passengers.find(
      (p) =>
        p.pnr.toUpperCase() === lookupPnr.toUpperCase() &&
        p.lastName.toUpperCase() === lookupLastName.toUpperCase()
    );
    if (!passenger) {
      setError('Reservation not found. Check PNR and last name.');
      return;
    }
    if (!trips.includes(passenger.pnr)) {
      setTrips((prev) => [passenger.pnr, ...prev]);
    }
    setSelectedPnr(passenger.pnr);
    setLookupPnr('');
    setLookupLastName('');
    setSuccess('Reservation added.');
    setScreen('trips');
  };

  const handleBookTrip = () => {
    setError('');
    setSuccess('');
    const firstName = bookingFirstName || profile.name.split(' ')[0] || '';
    const lastName = bookingLastName || profile.name.split(' ').slice(1).join(' ') || '';
    if (!firstName || !lastName || !bookingFlightId) {
      setError('Please fill in all booking fields.');
      return;
    }
    const newPnr = generatePnr();
    createBooking(newPnr, lastName.toUpperCase(), firstName.toUpperCase(), bookingFlightId);
    if (bookingConnectionFlightId) {
      createBooking(newPnr, lastName.toUpperCase(), firstName.toUpperCase(), bookingConnectionFlightId);
    }
    if (profile.email) {
      addEmailContact(newPnr, profile.email);
    }
    if (bookingSelectedFlight) {
      addLog(
        `Mobile booking ${newPnr}: ${bookingSelectedFlight.flightNumber} ${fareClass} EUR ${farePricing.total.toFixed(2)}`,
        'SELF_CHECK_IN'
      );
    }
    setTrips((prev) => [newPnr, ...prev]);
    setSelectedPnr(newPnr);
    setBookingFirstName('');
    setBookingLastName('');
    setBookingFlightId('');
    setSuccess(`Booking created: ${newPnr}`);
    setShowResults(false);
    setScreen('trips');
  };

  const handleSync = async () => {
    try {
      setSyncState('SYNCING');
      await loadFromDatabase();
      setLastSync(new Date().toLocaleString());
      setSyncState('IDLE');
    } catch {
      setSyncState('ERROR');
    }
  };

  const handleSeatSave = () => {
    if (!selectedPassenger || !seatSelection) return;
    updatePassengerDetails(selectedPassenger.pnr, { seat: seatSelection });
    addLog(`Mobile seat selection ${seatSelection} for ${selectedPassenger.pnr}`, 'SELF_CHECK_IN');
    setSuccess('Seat updated.');
    setScreen('trips');
  };

  const handleCheckIn = async () => {
    if (!selectedPassenger) return;
    setError('');
    setSuccess('');
    if (bagCount > 0) {
      updatePassengerDetails(selectedPassenger.pnr, {
        hasBags: true,
        bagCount
      });
    }
    const ok = await checkInPassenger(selectedPassenger.pnr);
    if (ok) {
      setSuccess('Check-in completed.');
      setScreen('trips');
    } else {
      setError('Check-in failed. Please contact the airline.');
    }
  };

  const handlePayment = () => {
    if (!selectedPassenger || !paymentAmount) return;
    addLog(
      `Mobile payment ${paymentAmount.toFixed(2)} EUR via ${paymentMethod} for ${selectedPassenger.pnr}`,
      'SELF_CHECK_IN'
    );
    setPaymentAmount(0);
    setSuccess('Payment successful.');
    setScreen('trips');
  };

  const getSeatLayout = (aircraft?: string) => {
    if (!aircraft) return { rows: 30, seats: ['A', 'B', 'C', 'D', 'E', 'F'] };
    const upper = aircraft.toUpperCase();
    if (upper.includes('A220') || upper.includes('BCS3')) {
      return { rows: 25, seats: ['A', 'B', 'C', 'D', 'F'] };
    }
    if (upper.includes('A319') || upper.includes('A320') || upper.includes('A321')) {
      return { rows: 30, seats: ['A', 'B', 'C', 'D', 'E', 'F'] };
    }
    if (upper.includes('A330') || upper.includes('A350') || upper.includes('B777') || upper.includes('B787')) {
      return { rows: 40, seats: ['A', 'B', 'C', 'D', 'E', 'F'] };
    }
    return { rows: 30, seats: ['A', 'B', 'C', 'D', 'E', 'F'] };
  };

  const seatMap = useMemo(() => {
    if (!selectedFlight) return [];
    const layout = getSeatLayout(selectedFlight.aircraft);
    return Array.from({ length: layout.rows }, (_, row) =>
      layout.seats.map((seat) => `${row + 1}${seat}`)
    ).flat();
  }, [selectedFlight]);

  const formatDate = (date?: string) => {
    if (!date) {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time?: string) => {
    if (!time) return 'TBA';
    return time;
  };

  const toMinutes = (flight?: typeof selectedFlight) => {
    const dt = toDateTime(flight);
    if (!dt) return null;
    return dt.getHours() * 60 + dt.getMinutes();
  };

  const connectionOptions = useMemo(() => {
    try {
      if (!searchOrigin || !searchDestination) return [];
      if (!flightsForDate || !Array.isArray(flightsForDate)) return [];
      const leg1 = flightsForDate.filter((f) => f && f.origin === searchOrigin);
      const options: Array<{ leg1: typeof flights[0]; leg2: typeof flights[0] }> = [];
      leg1.forEach((l1) => {
        try {
          if (!l1 || !l1.destination) return;
          const l1Dep = toMinutes(l1);
          if (l1Dep === null) return;
          const l1Arr = l1Dep + estimateDurationMinutes(l1);
          const leg2 = flightsForDate.filter((f) => f && f.origin === l1.destination && f.destination === searchDestination);
          leg2.forEach((l2) => {
            try {
              const l2Dep = toMinutes(l2);
              if (l2Dep === null) return;
              const connectionTime = l2Dep - l1Arr;
              if (connectionTime >= 90 && connectionTime <= 480) {
                options.push({ leg1: l1, leg2: l2 });
              }
            } catch (err) {
              console.error('Error processing leg2:', err);
            }
          });
        } catch (err) {
          console.error('Error processing leg1:', err);
        }
      });
      return options;
    } catch (error) {
      console.error('Error computing connection options:', error);
      return [];
    }
  }, [flightsForDate, searchOrigin, searchDestination]);

  const estimateDurationMinutes = (flight?: typeof selectedFlight) => {
    if (!flight) return 120;
    const longHaul = new Set(['JFK', 'LAX', 'BKK', 'DOH', 'DXB', 'SIN', 'NRT', 'ICN', 'SFO', 'SEA', 'ORD']);
    return longHaul.has(flight.destination) ? 480 : 120;
  };

  const toDateTime = (flight?: typeof selectedFlight) => {
    try {
      if (!flight?.date || !flight?.std) return null;
      const dateParts = flight.date.split('-');
      const timeParts = flight.std.split(':');
      if (dateParts.length !== 3 || timeParts.length < 2) return null;
      const [y, m, d] = dateParts.map(Number);
      const [hh, mm] = timeParts.map(Number);
      if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(hh) || isNaN(mm)) return null;
      const dt = new Date(y, m - 1, d, hh, mm, 0);
      if (isNaN(dt.getTime())) return null;
      return dt;
    } catch (error) {
      console.error('Error parsing date/time:', error);
      return null;
    }
  };

  const farePricing = useMemo(() => {
    const flightsToPrice = [bookingSelectedFlight, bookingSelectedConnection].filter(Boolean) as Array<NonNullable<typeof bookingSelectedFlight>>;
    if (flightsToPrice.length === 0) return { base: 0, taxes: 0, total: 0 };
    const multiplier = fareClass === 'BASIC' ? 0.85 : fareClass === 'MAIN' ? 1 : fareClass === 'COMFORT' ? 1.35 : 2.1;
    const baseFare = flightsToPrice.reduce((sum, flight) => {
      const seed = flight.flightNumber.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const base = 90 + (seed % 160);
      return sum + Math.round(base * multiplier);
    }, 0);
    const taxes = Math.round(baseFare * 0.23);
    return { base: baseFare, taxes, total: baseFare + taxes };
  }, [bookingSelectedFlight, bookingSelectedConnection, fareClass]);

  const navItems = [
    { id: 'explore', label: 'Explore', icon: Home },
    { id: 'book', label: 'Book', icon: BookOpen },
    { id: 'trips', label: 'Trips', icon: Plane },
    { id: 'account', label: 'Account', icon: UserCircle },
    { id: 'more', label: 'More', icon: Menu }
  ] as const;

  const renderHeader = () => {
    if (screen === 'account') {
      return (
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-300">SKYMILES</div>
            <button onClick={() => setScreen('notifications')}>
              <Bell className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 flex gap-6 text-xs text-slate-400">
            <span className="text-white border-b-2 border-white pb-1">SKYMILES</span>
            <span>MY WALLET</span>
            <span>PROFILE</span>
          </div>
        </div>
      );
    }

    if (screen === 'more') {
      return (
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div />
            <div className="text-sm text-slate-300">LOG OUT</div>
          </div>
        </div>
      );
    }

    if (['add', 'seat', 'checkin', 'payment', 'notifications', 'tripDetail', 'boardingPass'].includes(screen)) {
      const titleMap: Record<string, string> = {
        add: 'Find My Trip',
        seat: 'Seat Selection',
        checkin: 'Check In',
        payment: 'Payment',
        notifications: 'Notifications',
        tripDetail: selectedFlight ? `${selectedFlight.origin} - ${selectedFlight.destination}` : 'Trip',
        boardingPass: 'Boarding Pass'
      };
      return (
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <button className="text-sm text-slate-300" onClick={() => setScreen('trips')}>
              Back
            </button>
            <div className="font-semibold">{titleMap[screen]}</div>
            <div className="w-10" />
          </div>
        </div>
      );
    }

    const title =
      screen === 'explore'
        ? `Welcome, ${selectedPassenger?.firstName || 'Traveler'}`
        : screen === 'book'
        ? 'Book'
        : screen === 'trips'
        ? 'My Trips'
        : 'Mobile App';

    return (
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-4 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button onClick={() => setScreen('notifications')}>
            <Bell className="w-5 h-5" />
          </button>
        </div>
        {screen === 'explore' && (
          <div className="mt-2 text-xs text-slate-300">0 Miles</div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-100 text-slate-900 pb-24">
      {renderHeader()}

      {error && <div className="mx-4 mt-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
      {success && <div className="mx-4 mt-4 p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>}

      {screen === 'explore' && (
        <div className="p-4 space-y-6">
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900 to-blue-600 text-white shadow-lg">
            <div className="p-5">
              <div className="text-sm text-slate-200">Finish Booking Your Trip</div>
              <div className="text-4xl font-semibold mt-2">
                {selectedFlight ? `${selectedFlight.origin} → ${selectedFlight.destination}` : 'Plan Your Journey'}
              </div>
              <button
                className="mt-6 w-full bg-white/90 text-blue-900 font-semibold py-3 rounded-lg"
                onClick={() => setScreen('book')}
              >
                View Flights
              </button>
            </div>
          </div>

          <div>
            <div className="text-xl font-semibold text-slate-800 mb-3">Elevate Your Travel Experience</div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="text-sm text-slate-600">
                From road to runway. Earn miles with linked accounts and partner offers.
              </div>
              <button className="mt-4 text-blue-700 font-semibold">Learn More</button>
            </div>
          </div>
        </div>
      )}

      {screen === 'trips' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-slate-800">My Flights ({tripPassengers.length})</div>
            <button
              className="text-xs text-blue-600"
              onClick={handleSync}
              disabled={syncState === 'SYNCING'}
            >
              {syncState === 'SYNCING' ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>
          <div className="text-xs text-slate-500">
            Status: {isDatabaseReady ? 'Synced' : 'Offline'}{lastSync ? ` · Last sync ${lastSync}` : ''}
          </div>
          {selectedPassenger ? (
            <button
              className="bg-white rounded-2xl shadow-sm overflow-hidden text-left"
              onClick={() => setScreen('tripDetail')}
            >
              <div className="h-40 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-500 relative">
                <div className="absolute left-4 bottom-4">
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {selectedPassenger.seat === 'SBY' ? 'STANDBY' : 'CONFIRMED'}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{selectedPassenger.seat === 'SBY' ? 'Standby' : 'One Way'}</span>
                  <span>Confirmation # {selectedPassenger.pnr}</span>
                </div>
            <div className="text-2xl font-semibold">
              {finalSegment?.flight?.destination || selectedFlight?.destination || 'Trip details pending'}
            </div>
                <div className="text-sm text-slate-600">
              {selectedFlight ? `${selectedFlight.origin} - ${selectedFlight.destination}` : 'Flight information loading'}
                </div>
                <div className="text-sm text-slate-500">
                  {selectedFlight ? formatDate(selectedFlight.date) : ''}
                </div>
              </div>
            </button>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-6 text-slate-600">
              No Trip. Add a reservation to view.
            </div>
          )}

          {selectedPassenger && selectedPassenger.status === 'CHECKED_IN' && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="text-sm font-semibold text-slate-800 mb-3">Boarding Pass QR Code</div>
              <div className="flex justify-center bg-white p-3 rounded-lg border-2 border-slate-200">
                <QRCode
                  value={JSON.stringify({
                    pnr: selectedPassenger.pnr,
                    name: `${selectedPassenger.lastName}/${selectedPassenger.firstName}`,
                    flight: selectedFlight?.flightNumber || '',
                    seat: selectedPassenger.seat || '',
                    gate: selectedFlight?.gate || '',
                    date: selectedFlight?.date || '',
                    status: selectedPassenger.status
                  })}
                  size={180}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  viewBox="0 0 180 180"
                />
              </div>
              <div className="text-xs text-slate-500 text-center mt-2">
                Show this QR code at the gate for boarding
              </div>
            </div>
          )}

          <div className="grid gap-3">
            <button
              className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
              onClick={() => setScreen('seat')}
              disabled={!selectedPassenger}
            >
              <Armchair className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Seat Selection</span>
              <span className="text-xs text-slate-500">{selectedPassenger?.seat || '--'}</span>
            </button>
            <button
              className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
              onClick={() => setScreen('checkin')}
              disabled={!selectedPassenger}
            >
              <ClipboardCheck className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Check In</span>
              <span className="text-xs text-slate-500">{selectedPassenger?.status || ''}</span>
            </button>
            <button
              className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
              onClick={() => setScreen('payment')}
              disabled={!selectedPassenger}
            >
              <CreditCard className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Payment</span>
            </button>
          </div>

          <div>
            <div className="text-lg font-semibold text-slate-800 mb-2">Don't See A Trip?</div>
            <button
              className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
              onClick={() => setScreen('add')}
            >
              <span className="font-semibold text-slate-700">Find My Trip</span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {screen === 'tripDetail' && selectedPassenger && (
        <div className="p-4 space-y-6">
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
            <div className="text-xs text-slate-300">
              Confirmation # {selectedPassenger.pnr}
            </div>
            <div className="text-3xl font-semibold mt-2">
              To {finalSegment?.flight?.destinationCity || finalSegment?.flight?.destination || selectedFlight?.destination || 'Destination'}
            </div>
            <div className="text-sm text-slate-300 mt-2">
              {selectedFlight ? `${formatDate(selectedFlight.date)} | ${formatTime(selectedFlight.std)}` : 'Date TBA'}
            </div>
          </div>

          {tripSegments.length > 1 && (
            <div>
              <div className="text-lg font-semibold text-slate-800 mb-2">Trip Segments</div>
              <div className="space-y-3">
                {tripSegments.map((seg, index) => (
                  <div key={seg.flight?.id || index} className="bg-white rounded-2xl shadow-sm p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>
                        Segment {index + 1} of {tripSegments.length}
                      </span>
                      <span>{seg.flight?.flightNumber}</span>
                    </div>
                    <div className="text-lg font-semibold">
                      {seg.flight?.origin} → {seg.flight?.destination}
                    </div>
                    <div className="text-sm text-slate-600">
                      {formatDate(seg.flight?.date)} · {formatTime(seg.flight?.std)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Aircraft: {seg.flight?.aircraft || 'TBA'} · Duration {Math.round(estimateDurationMinutes(seg.flight) / 60)}h
                    </div>
                    {index < tripSegments.length - 1 && (
                      <div className="mt-2 text-xs text-slate-500">
                        {(() => {
                          const currentDep = toDateTime(seg.flight);
                          const nextDep = toDateTime(tripSegments[index + 1].flight);
                          if (!currentDep || !nextDep) return 'Connection';
                          const arrival = new Date(currentDep.getTime() + estimateDurationMinutes(seg.flight) * 60000);
                          const diff = Math.max(0, Math.round((nextDep.getTime() - arrival.getTime()) / 60000));
                          const hours = Math.floor(diff / 60);
                          const mins = diff % 60;
                          return `Layover ${hours}h ${mins}m`;
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {[
              { label: 'Boarding Pass', action: () => setScreen('boardingPass') },
              { label: 'Seat Selection', action: () => setScreen('seat') },
              { label: 'Change or Add Flights', action: () => setScreen('book') },
              { label: 'Need to Cancel?', action: () => setScreen('more') }
            ].map((item) => (
              <button
                key={item.label}
                className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
                onClick={item.action}
              >
                <span className="text-slate-700">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            ))}
          </div>

          <div>
            <div className="text-lg font-semibold text-slate-800 mb-2">Completed Flights</div>
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    To {selectedFlight ? selectedFlight.destinationCity || selectedFlight.destination : 'Destination'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedFlight ? formatDate(selectedFlight.date) : 'Date TBA'}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 rotate-90" />
              </div>
              <div className="border-t pt-4 grid grid-cols-3 gap-2 text-center text-sm text-slate-600">
                <div>
                  <div className="text-xs text-slate-400">Seat</div>
                  <div className="font-semibold">{selectedPassenger.seat || '--'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Status</div>
                  <div className="font-semibold">
                    {selectedPassenger.status === 'CHECKED_IN' ? 'CHECKED IN' : selectedPassenger.status}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Flight</div>
                  <div className="font-semibold">{selectedFlight?.flightNumber || '--'}</div>
                </div>
              </div>
              {selectedPassenger.status === 'CHECKED_IN' && (
                <div className="border-t pt-4">
                  <div className="text-xs text-slate-400 mb-2 text-center">Boarding Pass QR Code</div>
                  <div className="flex justify-center bg-white p-4 rounded-lg">
                    <QRCode
                      value={JSON.stringify({
                        pnr: selectedPassenger.pnr,
                        name: `${selectedPassenger.lastName}/${selectedPassenger.firstName}`,
                        flight: selectedFlight?.flightNumber || '',
                        seat: selectedPassenger.seat || '',
                        gate: selectedFlight?.gate || '',
                        date: selectedFlight?.date || '',
                        status: selectedPassenger.status
                      })}
                      size={200}
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      viewBox="0 0 200 200"
                    />
                  </div>
                  <div className="text-xs text-slate-500 text-center mt-2">
                    Show this QR code at the gate
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  {selectedPassenger.seat === 'SBY' ? 'STANDBY' : 'CONFIRMED'}
                </span>
                <span className="text-sm text-slate-600">Check Gate Screens</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {screen === 'book' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
            <div className="flex gap-2 bg-slate-100 rounded-full p-1 text-xs font-semibold">
              {[
                { key: 'ROUND_TRIP', label: 'Round Trip' },
                { key: 'ONE_WAY', label: 'One-Way' },
                { key: 'MULTI_CITY', label: 'Multi-City' }
              ].map((option) => (
                <button
                  key={option.key}
                  className={clsx(
                    'flex-1 py-2 rounded-full',
                    tripType === option.key ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                  )}
                  onClick={() => setTripType(option.key as typeof tripType)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <button
                type="button"
                className="w-full border rounded-xl p-3 flex items-center justify-between"
                onClick={() => setAirportPicker({ open: true, type: 'origin' })}
              >
                <div className="text-left">
                  <div className="text-xs text-slate-500">From</div>
                  <div className="text-lg font-semibold">{searchOrigin || 'Select origin'}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                className="w-full border rounded-xl p-3 flex items-center justify-between"
                onClick={() => setAirportPicker({ open: true, type: 'destination' })}
              >
                <div className="text-left">
                  <div className="text-xs text-slate-500">To</div>
                  <div className="text-lg font-semibold">{searchDestination || 'Select destination'}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">Departure</div>
                  <input
                    type="date"
                    className="w-full text-sm"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                  />
                </div>
                <div className="border rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">Return</div>
                  <input
                    type="date"
                    className="w-full text-sm"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    disabled={tripType !== 'ROUND_TRIP'}
                  />
                </div>
              </div>
              <div className="border rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-slate-600">Passengers</span>
                <span className="text-sm">1</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Shop With Miles</span>
              <div className="h-5 w-10 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>My Dates Are Flexible</span>
              <div className="h-5 w-10 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Refundable Fares Only</span>
              <div className="h-5 w-10 bg-slate-200 rounded-full" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="text-sm font-semibold">Advanced Search</div>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={bookingFlightId}
              onChange={(e) => setBookingFlightId(e.target.value)}
            >
              <option value="">Best Fares For</option>
              {flights.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.flightNumber} · {f.origin}-{f.destination} · {f.std}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="text-sm font-semibold">Fare Class</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {['BASIC', 'MAIN', 'COMFORT', 'BUSINESS'].map((label) => (
                <button
                  key={label}
                  className={clsx(
                    'py-2 rounded-lg border',
                    fareClass === label ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
                  )}
                  onClick={() => setFareClass(label as typeof fareClass)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl"
            onClick={() => {
              if (!searchOrigin || !searchDestination || !searchDate) {
                setError('Select origin, destination, and date.');
                return;
              }
              setShowResults(true);
              setSuccess('');
              setError('');
              setRecentSearches((prev) => {
                const next = [
                  {
                    origin: searchOrigin,
                    destination: searchDestination,
                    depart: searchDate,
                    returnDate: returnDate || undefined,
                    type: tripType
                  },
                  ...prev
                ];
                return next.slice(0, 5);
              });
            }}
          >
            Find Flights
          </button>

          {showResults && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div className="text-sm font-semibold">Available Flights</div>
              {flightsForDate.length === 0 && (
                <div className="text-sm text-slate-500">No flights for selected date.</div>
              )}
              {flightsForDate.map((f) => (
                <button
                  key={f.id}
                  className={clsx(
                    'w-full border rounded-lg p-3 text-left',
                    bookingFlightId === f.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                  )}
                  onClick={() => {
                    setBookingFlightId(f.id);
                    setBookingConnectionFlightId('');
                  }}
                >
                  <div className="font-semibold">
                    {f.flightNumber} · {f.origin}-{f.destination}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(f.date)} · {formatTime(f.std)} · {f.aircraft}
                  </div>
                </button>
              ))}
              {connectionOptions.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-slate-500 mb-2">Connections</div>
                  <div className="space-y-2">
                    {connectionOptions.map((conn, idx) => (
                      <button
                        key={`${conn.leg1.id}-${conn.leg2.id}-${idx}`}
                        className={clsx(
                          'w-full border rounded-lg p-3 text-left',
                          bookingFlightId === conn.leg1.id && bookingConnectionFlightId === conn.leg2.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200'
                        )}
                        onClick={() => {
                          setBookingFlightId(conn.leg1.id);
                          setBookingConnectionFlightId(conn.leg2.id);
                        }}
                      >
                        <div className="font-semibold">
                          {conn.leg1.origin} → {conn.leg2.destination} · {conn.leg1.flightNumber}/{conn.leg2.flightNumber}
                        </div>
                        <div className="text-xs text-slate-500">
                          {conn.leg1.origin}-{conn.leg1.destination} {formatTime(conn.leg1.std)} · Layover
                          {' '}
                          {Math.max(0, (toMinutes(conn.leg2) || 0) - (toMinutes(conn.leg1) || 0) - estimateDurationMinutes(conn.leg1))}m
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {bookingSelectedFlight && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <div className="text-sm font-semibold">Price Breakdown</div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Base Fare ({fareClass})</span>
                <span>€{farePricing.base.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Taxes & Fees</span>
                <span>€{farePricing.taxes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-slate-800 border-t pt-2">
                <span>Total</span>
                <span>€{farePricing.total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {recentSearches.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Recent Search</div>
                <button
                  className="text-xs text-slate-500"
                  onClick={() => setRecentSearches([])}
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {recentSearches.map((item, idx) => (
                  <button
                    key={`${item.origin}-${item.destination}-${idx}`}
                    className="w-full border rounded-lg p-3 text-left"
                    onClick={() => {
                      setSearchOrigin(item.origin);
                      setSearchDestination(item.destination);
                      setSearchDate(item.depart);
                      setReturnDate(item.returnDate || '');
                      setTripType(item.type as typeof tripType);
                      setShowResults(false);
                    }}
                  >
                    <div className="font-semibold text-sm">
                      {item.origin} → {item.destination}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(item.depart)}{item.returnDate ? ` - ${formatDate(item.returnDate)}` : ''} · {item.type.replace('_', ' ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="text-sm font-semibold">Passenger Details</div>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="First name"
              value={bookingFirstName}
              onChange={(e) => setBookingFirstName(e.target.value.toUpperCase())}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Last name"
              value={bookingLastName}
              onChange={(e) => setBookingLastName(e.target.value.toUpperCase())}
            />
            <div className="text-xs text-slate-500">
              Selected flight: {bookingFlightId ? bookingFlightId : 'none'}
            </div>
            <button
              className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg"
              onClick={handleBookTrip}
            >
              Confirm Booking
            </button>
          </div>
        </div>
      )}

      {screen === 'account' && (
        <div className="p-4 space-y-4">
          <div className="bg-indigo-700 text-white rounded-2xl p-4">
            <div className="text-lg font-semibold">
              {profile.name || `${selectedPassenger?.firstName || 'Tomass'} ${selectedPassenger?.lastName || 'Lakotko'}`}
            </div>
            <div className="text-sm text-indigo-200">
              SkyMiles Member {profile.skymiles ? `· #${profile.skymiles}` : ''}
            </div>
            <div className="text-3xl font-semibold mt-2">0</div>
            <div className="text-xs text-indigo-200">Miles Available</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-600">Profile</div>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Full name"
              value={profile.name}
              onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Email"
              value={profile.email}
              onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="SkyMiles #"
              value={profile.skymiles}
              onChange={(e) => setProfile((prev) => ({ ...prev, skymiles: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg"
                onClick={() => setSuccess('Profile saved.')}
              >
                Save
              </button>
              <button
                className="flex-1 bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg"
                onClick={() => setProfile({ name: '', email: '', skymiles: '' })}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-sm font-semibold text-slate-600">STATUS PROGRESS</div>
            <div className="flex items-center justify-center h-48">
              <div className="h-40 w-40 rounded-full border-[12px] border-slate-300 flex items-center justify-center text-3xl font-semibold text-slate-500">
                $0
              </div>
            </div>
            <div className="text-xs text-slate-500 text-center">$0 MQDs to Medallion</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-sm font-semibold text-slate-600 mb-2">Saved Passengers</div>
            {tripPassengers.length === 0 && (
              <div className="text-sm text-slate-500">No saved passengers yet.</div>
            )}
            <div className="space-y-2">
              {tripPassengers.map((p) => (
                <div key={p!.pnr} className="flex items-center justify-between text-sm text-slate-700">
                  <div>
                    {p!.firstName} {p!.lastName}
                  </div>
                  <div className="text-xs text-slate-500">{p!.pnr}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {screen === 'more' && (
        <div className="p-4 space-y-2">
          {[
            'Flight Status',
            'Track My Bags',
            'Delta Sky Club®',
            'Airport Maps',
            'Aircraft',
            'Delta Amex Cards - Personal',
            'Delta Amex Cards - Business',
            'In-Flight Wi-Fi',
            'Delta Studio®',
            'Flight Schedules',
            'Baggage & Travel Fees'
          ].map((item) => (
            <div key={item} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <span className="text-slate-700">{item}</span>
              <ChevronRight className="w-5 h-5 text-red-500" />
            </div>
          ))}
        </div>
      )}

      {screen === 'add' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Find My Trip</h2>
            <div className="space-y-3">
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="PNR"
                value={lookupPnr}
                onChange={(e) => setLookupPnr(e.target.value.toUpperCase())}
              />
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Last name"
                value={lookupLastName}
                onChange={(e) => setLookupLastName(e.target.value.toUpperCase())}
              />
              <button className="w-full bg-blue-600 text-white rounded-lg py-2" onClick={handleAddReservation}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}


      {screen === 'seat' && selectedPassenger && selectedFlight && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Seat Selection</h2>
            <div className="text-xs text-slate-500 mb-3">
              Aircraft: {selectedFlight.aircraft || 'N/A'} · Layout {getSeatLayout(selectedFlight.aircraft).rows} rows
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-[55vh] overflow-y-auto">
              {seatMap.map((seat) => {
                const occupied = passengers.some(
                  (p) => p.flightId === selectedFlight.id && p.seat === seat && p.pnr !== selectedPassenger.pnr
                );
                const selected = seatSelection === seat || selectedPassenger.seat === seat;
                return (
                  <button
                    key={seat}
                    disabled={occupied}
                    onClick={() => setSeatSelection(seat)}
                    className={clsx(
                      'text-xs py-2 rounded border',
                      selected ? 'bg-blue-500 text-white border-blue-600' : '',
                      occupied ? 'bg-slate-200 text-slate-400 border-slate-300' : 'bg-white text-slate-700'
                    )}
                  >
                    {seat}
                  </button>
                );
              })}
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white rounded-lg py-2" onClick={handleSeatSave}>
              Save Seat
            </button>
          </div>
        </div>
      )}

      {screen === 'checkin' && selectedPassenger && selectedFlight && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Check In</h2>
            <div className="text-sm text-slate-600 mb-2">
              Flight {selectedFlight.flightNumber} · {selectedFlight.origin}-{selectedFlight.destination}
            </div>
            <div className="text-sm text-slate-600 mb-2">Status: {selectedPassenger.status}</div>
            <label className="text-sm text-slate-600">Bags</label>
            <select
              className="w-full border rounded-lg px-3 py-2 mt-1"
              value={bagCount}
              onChange={(e) => setBagCount(parseInt(e.target.value))}
            >
              {[0, 1, 2, 3, 4].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'bag' : 'bags'}
                </option>
              ))}
            </select>
            <button
              className="w-full mt-4 bg-blue-600 text-white rounded-lg py-2"
              onClick={handleCheckIn}
            >
              Complete Check-In
            </button>
          </div>
        </div>
      )}

      {screen === 'payment' && selectedPassenger && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Payment</h2>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Amount"
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
            />
            <select
              className="w-full border rounded-lg px-3 py-2 mt-3"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'CARD' | 'CASH')}
            >
              <option value="CARD">Card</option>
              <option value="CASH">Cash</option>
            </select>
            <button
              className="w-full mt-4 bg-blue-600 text-white rounded-lg py-2"
              onClick={handlePayment}
            >
              Pay
            </button>
          </div>
        </div>
      )}

      {screen === 'boardingPass' && selectedPassenger && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-xs text-slate-500">Confirmation # {selectedPassenger.pnr}</div>
            <div className="text-xl font-semibold mt-2">
              {selectedPassenger.firstName} {selectedPassenger.lastName}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              {selectedFlight ? `${selectedFlight.origin} → ${selectedFlight.destination}` : 'Flight TBD'}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mt-4">
              <div>
                <div className="text-slate-400">Flight</div>
                <div className="font-semibold">{selectedFlight?.flightNumber || '--'}</div>
              </div>
              <div>
                <div className="text-slate-400">Seat</div>
                <div className="font-semibold">{selectedPassenger.seat || '--'}</div>
              </div>
              <div>
                <div className="text-slate-400">Gate</div>
                <div className="font-semibold">{selectedFlight?.gate || 'TBA'}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-3">
              {selectedFlight ? `${formatDate(selectedFlight.date)} · ${formatTime(selectedFlight.std)}` : 'Date TBA'}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-4">
            <QRCode
              value={JSON.stringify({
                pnr: selectedPassenger.pnr,
                name: `${selectedPassenger.lastName}/${selectedPassenger.firstName}`,
                flight: selectedFlight?.flightNumber || '',
                seat: selectedPassenger.seat || '',
                gate: selectedFlight?.gate || '',
                date: selectedFlight?.date || ''
              })}
              size={160}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              viewBox="0 0 160 160"
            />
            <button className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg">
              Add to Wallet
            </button>
          </div>
        </div>
      )}

      {screen === 'notifications' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Notifications</h2>
            <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
              <span>Enable push alerts</span>
              <div className="flex items-center gap-2">
                {'Notification' in window && Notification.permission === 'default' && (
                  <span className="text-xs text-orange-600">Click to enable</span>
                )}
                {'Notification' in window && Notification.permission === 'denied' && (
                  <span className="text-xs text-red-600">Blocked in browser</span>
                )}
                <button
                  className={clsx(
                    'h-6 w-12 rounded-full relative transition',
                    notificationsEnabled ? 'bg-green-500' : 'bg-slate-200'
                  )}
                  onClick={async () => {
                    if (!notificationsEnabled && 'Notification' in window) {
                      const permission = await Notification.requestPermission();
                      if (permission !== 'granted') {
                        setNotificationsEnabled(false);
                        alert('Notification permission denied. Please enable it in your browser settings.');
                        return;
                      }
                    }
                    setNotificationsEnabled((prev) => !prev);
                  }}
                >
                <span
                  className={clsx(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
                    notificationsEnabled ? 'left-6' : 'left-1'
                  )}
                />
              </button>
            </div>
            </div>
            {notifications.length === 0 && <div className="text-sm text-slate-500">No updates yet.</div>}
            <div className="space-y-2">
              {notifications.map((note) => (
                <div key={note} className="text-sm border rounded-lg p-3 bg-slate-50">
                  Flight update: {note}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {airportPicker.open && airportPicker.type && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setAirportPicker({ open: false, type: null });
          }
        }}>
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">
                Select {airportPicker.type === 'origin' ? 'Departure' : 'Arrival'}
              </div>
              <button
                className="text-sm text-slate-500"
                onClick={() => setAirportPicker({ open: false, type: null })}
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {airportOptions.length > 0 ? airportOptions.map((code) => (
                <button
                  key={`${airportPicker.type}-${code}`}
                  className={clsx(
                    'border rounded-lg py-2 text-center text-sm',
                    airportPicker.type === 'origin' && searchOrigin === code
                      ? 'border-blue-500 bg-blue-50'
                      : '',
                    airportPicker.type === 'destination' && searchDestination === code
                      ? 'border-blue-500 bg-blue-50'
                      : ''
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      if (airportPicker.type === 'origin') {
                        setSearchOrigin(code);
                      } else if (airportPicker.type === 'destination') {
                        setSearchDestination(code);
                      }
                      setAirportPicker({ open: false, type: null });
                    } catch (error) {
                      console.error('Error selecting airport:', error);
                      setAirportPicker({ open: false, type: null });
                    }
                  }}
                >
                  {code}
                </button>
              )) : (
                <div className="col-span-3 text-center text-slate-500 py-4">
                  No airports available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white px-2 py-2">
        <div className="grid grid-cols-5 text-[10px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className={clsx('flex flex-col items-center gap-1', isActive ? 'text-white' : 'text-slate-400')}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

