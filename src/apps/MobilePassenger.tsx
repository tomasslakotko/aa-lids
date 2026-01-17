import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CreditCard,
  Luggage,
  MapPin,
  Plane,
  Share2,
  Ticket,
  Wifi,
  Armchair,
  ClipboardCheck
} from 'lucide-react';
import clsx from 'clsx';
import { useAirportStore } from '../store/airportStore';
import { initializeAirportDatabase } from '../store/airportStore';

type Screen =
  | 'home'
  | 'reservations'
  | 'add'
  | 'book'
  | 'seat'
  | 'checkin'
  | 'payment'
  | 'notifications';

const TRIPS_KEY = 'mobile-trips-v1';
const SELECTED_KEY = 'mobile-selected-pnr-v1';
const NOTIFY_KEY = 'mobile-notifications-v1';

const generatePnr = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const getBoardingTime = (std: string) => {
  if (!std || !std.includes(':')) return 'TBA';
  const [h, m] = std.split(':').map(Number);
  const depTime = new Date();
  depTime.setHours(h, m, 0, 0);
  const boardTime = new Date(depTime.getTime() - 30 * 60000);
  return `${boardTime.getHours().toString().padStart(2, '0')}:${boardTime
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

export const MobilePassengerApp = () => {
  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);
  const checkInPassenger = useAirportStore((state) => state.checkInPassenger);
  const createBooking = useAirportStore((state) => state.createBooking);
  const addLog = useAirportStore((state) => state.addLog);

  const [screen, setScreen] = useState<Screen>('home');
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
    setScreen('home');
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
    setScreen('home');
  };

  const handleSeatSave = () => {
    if (!selectedPassenger || !seatSelection) return;
    updatePassengerDetails(selectedPassenger.pnr, { seat: seatSelection });
    addLog(`Mobile seat selection ${seatSelection} for ${selectedPassenger.pnr}`, 'SELF_CHECK_IN');
    setSuccess('Seat updated.');
    setScreen('home');
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
      setScreen('home');
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
    setScreen('home');
  };

  const seatMap = useMemo(() => {
    if (!selectedFlight) return [];
    return Array.from({ length: 30 }, (_, row) =>
      ['A', 'B', 'C', 'D', 'E', 'F'].map((seat) => `${row + 1}${seat}`)
    ).flat();
  }, [selectedFlight]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="bg-slate-900 text-white px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <button
            className="text-sm text-slate-300"
            onClick={() => setScreen('home')}
          >
            {screen === 'home' ? 'Mobile App' : 'Back'}
          </button>
          <div className="text-center">
            <div className="text-xs text-slate-300">Select a Flight</div>
            <div className="font-semibold">
              {selectedFlight ? `${selectedFlight.origin} - ${selectedFlight.destination}` : 'No Trip'}
            </div>
          </div>
          <button className="text-sm text-slate-300" onClick={() => setScreen('notifications')}>
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <div className="mx-4 mt-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
      {success && <div className="mx-4 mt-4 p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>}

      {screen === 'home' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Passenger</div>
                <div className="font-semibold">
                  {selectedPassenger ? `${selectedPassenger.firstName} ${selectedPassenger.lastName}` : 'Add reservation'}
                </div>
              </div>
              <button
                className="text-sm text-blue-600"
                onClick={() => setScreen('reservations')}
              >
                Manage
              </button>
            </div>
            {selectedFlight && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>Flight: {selectedFlight.flightNumber}</div>
                <div>Gate: {selectedFlight.gate || 'TBA'}</div>
                <div>Departure: {selectedFlight.std}</div>
                <div>Boarding: {getBoardingTime(selectedFlight.std)}</div>
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <button
              className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
              onClick={() => setScreen('seat')}
              disabled={!selectedPassenger}
            >
              <Armchair className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Seat Selection</span>
              {selectedPassenger?.seat && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  {selectedPassenger.seat === 'SBY' ? 'STANDBY' : selectedPassenger.seat}
                </span>
              )}
            </button>

            <button
              className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
              onClick={() => setScreen('checkin')}
              disabled={!selectedPassenger}
            >
              <ClipboardCheck className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Check In</span>
            </button>

            <button
              className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
              onClick={() => setScreen('payment')}
              disabled={!selectedPassenger}
            >
              <CreditCard className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Payments</span>
            </button>

            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
              <Luggage className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Track Bags</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
              <Plane className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Where is My Plane?</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
              <Ticket className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Upgrade / Standby List</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Connecting Gate</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
              <Wifi className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">In-Flight Wi-Fi</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
              <Share2 className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Share Trip Information</span>
            </div>
          </div>
        </div>
      )}

      {screen === 'reservations' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-2">My Reservations</h2>
            <div className="space-y-2">
              {tripPassengers.length === 0 && (
                <div className="text-sm text-slate-500">No reservations saved.</div>
              )}
              {tripPassengers.map((p) => {
                const flight = flights.find((f) => f.id === p!.flightId);
                return (
                  <button
                    key={p!.pnr}
                    className={clsx(
                      'w-full text-left border rounded-lg p-3',
                      selectedPnr === p!.pnr ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                    )}
                    onClick={() => {
                      setSelectedPnr(p!.pnr);
                      setScreen('home');
                    }}
                  >
                    <div className="font-semibold">{p!.firstName} {p!.lastName}</div>
                    <div className="text-xs text-slate-500">
                      {p!.pnr} · {flight?.origin}-{flight?.destination} · {flight?.flightNumber}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-white rounded-xl shadow-sm p-4" onClick={() => setScreen('add')}>
              Add Reservation
            </button>
            <button className="bg-white rounded-xl shadow-sm p-4" onClick={() => setScreen('book')}>
              Book Flight
            </button>
          </div>
        </div>
      )}

      {screen === 'add' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Add Reservation</h2>
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

      {screen === 'book' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Book a Flight</h2>
            <div className="space-y-3">
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="First name"
                value={bookingFirstName}
                onChange={(e) => setBookingFirstName(e.target.value.toUpperCase())}
              />
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Last name"
                value={bookingLastName}
                onChange={(e) => setBookingLastName(e.target.value.toUpperCase())}
              />
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={bookingFlightId}
                onChange={(e) => setBookingFlightId(e.target.value)}
              >
                <option value="">Select flight</option>
                {flights.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.flightNumber} · {f.origin}-{f.destination} · {f.std}
                  </option>
                ))}
              </select>
              <button className="w-full bg-blue-600 text-white rounded-lg py-2" onClick={handleBookTrip}>
                Book
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
    </div>
  );
};

