import { useEffect, useMemo, useState } from 'react';
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
import clsx from 'clsx';
import { useAirportStore } from '../store/airportStore';
import { initializeAirportDatabase } from '../store/airportStore';

type Screen =
  | 'explore'
  | 'book'
  | 'trips'
  | 'tripDetail'
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

const generatePnr = () => Math.random().toString(36).substring(2, 8).toUpperCase();


export const MobilePassengerApp = () => {
  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);
  const checkInPassenger = useAirportStore((state) => state.checkInPassenger);
  const createBooking = useAirportStore((state) => state.createBooking);
  const addLog = useAirportStore((state) => state.addLog);

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

  const [lookupPnr, setLookupPnr] = useState('');
  const [lookupLastName, setLookupLastName] = useState('');
  const [bookingFirstName, setBookingFirstName] = useState('');
  const [bookingLastName, setBookingLastName] = useState('');
  const [bookingFlightId, setBookingFlightId] = useState('');
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
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem(SELECTED_KEY, selectedPnr);
  }, [selectedPnr]);

  useEffect(() => {
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const tripPassengers = useMemo(
    () => trips.map((pnr) => passengers.find((p) => p.pnr === pnr)).filter(Boolean),
    [trips, passengers]
  );

  const selectedPassenger = useMemo(
    () => passengers.find((p) => p.pnr === selectedPnr) || tripPassengers[0],
    [passengers, selectedPnr, tripPassengers]
  );

  const selectedFlight = selectedPassenger
    ? flights.find((f) => f.id === selectedPassenger.flightId)
    : null;

  useEffect(() => {
    if (selectedPassenger && selectedPassenger.pnr !== selectedPnr) {
      setSelectedPnr(selectedPassenger.pnr);
    }
  }, [selectedPassenger, selectedPnr]);

  useEffect(() => {
    if (!selectedPassenger || !selectedFlight) return;
    const statusKey = `${selectedFlight.id}:${selectedFlight.status}`;
    if (['BOARDING', 'DEPARTED', 'ARRIVED'].includes(selectedFlight.status)) {
      setNotifications((prev) => (prev.includes(statusKey) ? prev : [statusKey, ...prev]));
    }
  }, [selectedPassenger, selectedFlight]);

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
    if (!bookingFirstName || !bookingLastName || !bookingFlightId) {
      setError('Please fill in all booking fields.');
      return;
    }
    const newPnr = generatePnr();
    createBooking(newPnr, bookingLastName.toUpperCase(), bookingFirstName.toUpperCase(), bookingFlightId);
    setTrips((prev) => [newPnr, ...prev]);
    setSelectedPnr(newPnr);
    setBookingFirstName('');
    setBookingLastName('');
    setBookingFlightId('');
    setSuccess(`Booking created: ${newPnr}`);
    setScreen('trips');
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

  const seatMap = useMemo(() => {
    if (!selectedFlight) return [];
    return Array.from({ length: 30 }, (_, row) =>
      ['A', 'B', 'C', 'D', 'E', 'F'].map((seat) => `${row + 1}${seat}`)
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

    if (['add', 'seat', 'checkin', 'payment', 'notifications', 'tripDetail'].includes(screen)) {
      const titleMap: Record<string, string> = {
        add: 'Find My Trip',
        seat: 'Seat Selection',
        checkin: 'Check In',
        payment: 'Payment',
        notifications: 'Notifications',
        tripDetail: selectedFlight ? `${selectedFlight.origin} - ${selectedFlight.destination}` : 'Trip'
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
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-24">
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
          <div className="text-lg font-semibold text-slate-800">My Flights ({tripPassengers.length})</div>
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
                  {selectedFlight ? selectedFlight.destination : 'Trip details pending'}
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
              To {selectedFlight ? selectedFlight.destinationCity || selectedFlight.destination : 'Destination'}
            </div>
            <div className="text-sm text-slate-300 mt-2">
              {selectedFlight ? formatDate(selectedFlight.date) : 'Date TBA'}
            </div>
          </div>

          <div className="space-y-3">
            {[
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
              {['Round Trip', 'One-Way', 'Multi-City'].map((label) => (
                <button
                  key={label}
                  className={clsx(
                    'flex-1 py-2 rounded-full',
                    label === 'One-Way' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="border rounded-xl p-3">
                <div className="text-3xl font-semibold">
                  {selectedFlight?.origin || 'DTW'}
                </div>
                <div className="text-xs text-slate-500">Departure</div>
              </div>
              <div className="border rounded-xl p-3">
                <div className="text-3xl font-semibold">
                  {selectedFlight?.destination || 'MKE'}
                </div>
                <div className="text-xs text-slate-500">Arrival</div>
              </div>
            </div>
            <div className="border rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Date</span>
              <input type="date" className="text-sm" />
            </div>
            <div className="border rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Passengers</span>
              <span className="text-sm">1</span>
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

          <button
            className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl"
            onClick={() => setScreen('book')}
          >
            Find Flights
          </button>

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
            <div className="text-lg font-semibold">{selectedPassenger?.firstName || 'Tomass'} {selectedPassenger?.lastName || 'Lakotko'}</div>
            <div className="text-sm text-indigo-200">SkyMiles Member</div>
            <div className="text-3xl font-semibold mt-2">0</div>
            <div className="text-xs text-indigo-200">Miles Available</div>
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

      {screen === 'notifications' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Notifications</h2>
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

