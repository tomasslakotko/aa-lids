import { useState } from 'react';
import { useAirportStore } from '../store/airportStore';
import { CheckCircle, Plane, Luggage, Download, User, MapPin, Clock } from 'lucide-react';
import QRCode from 'react-qr-code';
import clsx from 'clsx';

// Boarding Pass Component (reused from CheckIn)
const BoardingPass = ({ passenger, flight, passengers, flights }: { passenger: any, flight: any, passengers?: any[], flights?: any[] }) => {
  if (!passenger || !flight) return null;
  
  // Check for connecting flight (transit)
  const connectingFlight = passengers && flights
    ? (() => {
        const samePnrPassengers = passengers.filter(p => p.pnr === passenger.pnr && p.flightId !== flight.id);
        for (const p of samePnrPassengers) {
          const connFlight = flights.find(f => f.id === p.flightId);
          if (connFlight && connFlight.origin === flight.destination) {
            return connFlight;
          }
        }
        return null;
      })()
    : null;
  
  // Calculate boarding time (30 mins before departure)
  const [depHour, depMin] = flight.std.split(':').map(Number);
  const depTime = new Date();
  depTime.setHours(depHour, depMin, 0);
  const boardTime = new Date(depTime.getTime() - 30 * 60000);
  const boardingTime = `${boardTime.getHours().toString().padStart(2, '0')}:${boardTime.getMinutes().toString().padStart(2, '0')}`;
  
  // Format date as "23NOV" (no space)
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = now.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const dateStr = `${day}${month}`;
  
  // Get class from seat (J for rows 1-5, Y for others)
  const seatRow = parseInt(passenger.seat?.match(/\d+/)?.[0] || '0');
  const passengerClass = seatRow <= 5 ? 'J' : 'Y';
  const classLabel = passengerClass === 'J' ? 'BUSINESS CLASS' : 'ECONOMY CLASS';
  
  // Get city names with codes
  const originCity = (flight.originCity || flight.origin).toUpperCase();
  const destCity = (flight.destinationCity || flight.destination).toUpperCase();
  const originCode = flight.origin;
  const destCode = flight.destination;
  
  // Passenger name
  const passengerName = `${passenger.lastName}/${passenger.firstName}`.toUpperCase();
  
  // Generate deterministic sequence number and ETKT based on passenger/flight data
  // This ensures the same boarding pass always has the same QR code
  const generateDeterministicHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };
  
  const boardingPassKey = `${passenger.pnr}-${flight.id}-${passenger.seat}-${passenger.id}`;
  const hash = generateDeterministicHash(boardingPassKey);
  
  // Generate sequence number (001-999) based on hash
  const sequenceNo = String((hash % 999) + 1).padStart(3, '0');
  
  // Generate ETKT (14 digits) based on hash - format: 257XXXXXXXXXXXX
  const etktBase = hash % 1000000000000; // 12 digits
  const etkt = `257${String(etktBase).padStart(12, '0')}`;
  
  // Generate QR code data (JSON with passenger and flight info)
  // This should match exactly what's displayed on the boarding pass
  const qrData = JSON.stringify({
    pnr: passenger.pnr,
    flight: flight.flightNumber,
    seat: passenger.seat || 'TBA',
    name: passengerName,
    date: dateStr,
    origin: `${originCity}/${originCode}`,
    destination: `${destCity}/${destCode}`,
    gate: flight.gate || 'TBA',
    boarding: boardingTime,
    departure: flight.std,
    class: passengerClass,
    etkt: etkt,
    sequence: sequenceNo,
    passengerId: passenger.id
  });
  
  return (
    <div className="bg-[#EEE8DD] w-[700px] h-[280px] overflow-hidden flex shadow-lg font-mono text-slate-900 relative border border-gray-400">
      {/* Main Section (Left) */}
      <div className="w-[520px] p-6 flex flex-col relative border-r border-dashed border-gray-500">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="text-xl font-bold tracking-widest text-slate-900">BOARDING PASS:</div>
          <div className="text-2xl font-bold italic text-slate-900 lowercase" style={{ fontFamily: 'serif' }}>airBaltic</div>
        </div>
        
        {/* Flight Details Row */}
        <div className="flex gap-5 mb-4">
          <div>
            <div className="text-[8px] font-bold uppercase mb-0.5 text-slate-700">FLIGHT NO:</div>
            <div className="text-2xl font-bold text-slate-900">{flight.flightNumber}</div>
          </div>
          <div>
            <div className="text-[8px] font-bold uppercase mb-0.5 text-slate-700">BOARDING TIME:</div>
            <div className="text-2xl font-bold text-slate-900">{boardingTime}</div>
          </div>
          <div>
            <div className="text-[8px] font-bold uppercase mb-0.5 text-slate-700">GATE:</div>
            <div className="text-lg font-bold text-slate-900">{flight.gate || 'TBA'}</div>
          </div>
          <div>
            <div className="text-[8px] font-bold uppercase mb-0.5 text-slate-700">SEAT:</div>
            <div className="text-2xl font-bold text-slate-900">{passenger.seat || 'TBA'}</div>
          </div>
        </div>

        {/* Bottom Section with QR Code and Info */}
        <div className="flex gap-4 mt-auto items-start">
          {/* QR Code */}
          <div className="w-32 h-32 bg-white p-2 flex items-center justify-center shrink-0 border border-slate-300">
            <QRCode
              value={qrData}
              size={120}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 120 120`}
            />
          </div>
          
          {/* Passenger and Route Info */}
          <div className="flex-1 flex flex-col gap-1.5">
            <div>
              <div className="text-[9px] font-bold uppercase text-slate-700 mb-0.5">NAME:</div>
              <div className="text-lg font-bold uppercase text-slate-900">{passengerName}</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex gap-4">
                <div>
                  <div className="text-[9px] font-bold uppercase text-slate-700 mb-0.5">FROM:</div>
                  <div className="text-base font-bold uppercase text-slate-900">{originCity}/{originCode}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase text-slate-700 mb-0.5">TO:</div>
                  <div className="text-base font-bold uppercase text-slate-900">{destCity}/{destCode}</div>
                </div>
              </div>
              {connectingFlight && (
                <div className="text-[8px] font-bold uppercase text-slate-600 mt-1">
                  TRANSIT: {connectingFlight.flightNumber} TO {connectingFlight.destinationCity?.toUpperCase() || connectingFlight.destination}/{connectingFlight.destination}
                </div>
              )}
            </div>
          </div>
          
          {/* Class, Date, Sequence - positioned to the right */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <div>
              <div className="text-[9px] font-bold uppercase text-slate-700 mb-0.5">CLASS:</div>
              <div className="text-base font-bold text-slate-900">{passengerClass}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase text-slate-700 mb-0.5">DATE:</div>
              <div className="text-base font-bold uppercase text-slate-900">{dateStr}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase text-slate-700 mb-0.5">SEQUENCE NO:</div>
              <div className="text-base font-bold text-slate-900">{sequenceNo}</div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-4 pt-2 border-t border-gray-400/30 flex justify-between text-[10px] font-bold text-slate-700">
          <div>HELPLINE 24-7 CALL 37167280422</div>
          <div>ETKT {etkt}</div>
        </div>
      </div>

      {/* Right Stub */}
      <div className="flex-1 p-4 flex flex-col bg-[#EEE8DD]">
        <div className="text-right mb-3">
          <div className="text-lg font-bold italic text-slate-900 lowercase" style={{ fontFamily: 'serif' }}>airBaltic</div>
        </div>
        
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="text-[9px] font-bold uppercase text-slate-700">CLASS:</div>
            <div className="text-lg font-bold text-slate-900">{passengerClass}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold uppercase text-slate-700">SEAT:</div>
            <div className="text-2xl font-bold text-slate-900">{passenger.seat || 'TBA'}</div>
          </div>
        </div>
        
        <div className="text-[10px] font-bold uppercase mb-3 text-slate-700">{classLabel}</div>
        
        <div className="space-y-1 text-[9px] font-bold uppercase text-slate-900 mb-3">
          <div className="truncate">{passengerName}</div>
          <div>{flight.flightNumber} {dateStr}</div>
          <div>FROM: {originCity}/{originCode}</div>
          <div>TO: {destCity}/{destCode}</div>
          {connectingFlight && (
            <div className="text-[8px] text-slate-600">TRANSIT: {connectingFlight.flightNumber} TO {connectingFlight.destinationCity?.toUpperCase() || connectingFlight.destination}/{connectingFlight.destination}</div>
          )}
        </div>
        
        <div className="mb-2">
          <div className="text-[8px] font-bold uppercase text-slate-700 mb-0.5">DEPARTURE TIME:</div>
          <div className="text-base font-bold text-slate-900">{flight.std}</div>
        </div>
        
        <div className="mt-auto space-y-1 text-[9px] font-bold text-slate-700">
          <div>SEQUENCE NO: {sequenceNo}</div>
          <div>ETKT {etkt}</div>
        </div>
      </div>
    </div>
  );
};

export const SelfCheckInApp = () => {
  const [step, setStep] = useState<'lookup' | 'details' | 'checkin' | 'complete'>('lookup');
  const [pnr, setPnr] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [bagCount, setBagCount] = useState(0);
  
  const passengers = useAirportStore((state) => state.passengers);
  const flights = useAirportStore((state) => state.flights);
  const checkInPassenger = useAirportStore((state) => state.checkInPassenger);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);
  
  // Find passenger by PNR and last name
  const foundPassenger = pnr && lastName 
    ? passengers.find(p => 
        p.pnr.toUpperCase() === pnr.toUpperCase() && 
        p.lastName.toUpperCase() === lastName.toUpperCase()
      )
    : null;
  
  const foundFlight = foundPassenger ? flights.find(f => f.id === foundPassenger.flightId) : null;
  
  // Available seats (simplified - rows 1-30, seats A-F)
  const availableSeats = foundFlight 
    ? Array.from({ length: 30 }, (_, row) => 
        ['A', 'B', 'C', 'D', 'E', 'F'].map(seat => `${row + 1}${seat}`)
      ).flat()
    : [];
  
  const handleLookup = () => {
    setError('');
    if (!pnr || !lastName) {
      setError('Please enter both PNR and Last Name');
      return;
    }
    
    if (!foundPassenger) {
      setError('Booking not found. Please check your PNR and Last Name. If you just created a booking, make sure you saved it with the ER command in the Reservations app.');
      return;
    }
    
    if (foundPassenger.status === 'CHECKED_IN') {
      setError('You are already checked in.');
      setStep('complete');
      return;
    }
    
    if (foundPassenger.status === 'BOARDED') {
      setError('You have already boarded this flight.');
      setStep('complete');
      return;
    }
    
    setStep('details');
    setSelectedSeat(foundPassenger.seat || '');
  };
  
  const handleCheckIn = async () => {
    if (!foundPassenger) return;
    
    // Update seat if changed
    if (selectedSeat && selectedSeat !== foundPassenger.seat) {
      updatePassengerDetails(foundPassenger.pnr, { seat: selectedSeat });
    }
    
    // Update baggage count
    if (bagCount > 0) {
      updatePassengerDetails(foundPassenger.pnr, { 
        hasBags: true, 
        bagCount: bagCount 
      });
    }
    
    // Check in passenger (now async)
    const success = await checkInPassenger(foundPassenger.pnr);
    
    if (success) {
      setStep('complete');
    } else {
      setError('Check-in failed. Please try again or contact airport staff.');
    }
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  return (
    <div className="h-full w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col overflow-auto">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
              <Plane className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Online Check-In</h1>
              <p className="text-gray-600">Check in for your flight and get your boarding pass</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Step 1: Lookup */}
          {step === 'lookup' && (
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Your Booking</h2>
                <p className="text-gray-600">Enter your booking reference and last name to check in</p>
              </div>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Booking Reference (PNR)
                  </label>
                  <input
                    type="text"
                    value={pnr}
                    onChange={(e) => setPnr(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg uppercase"
                    maxLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value.toUpperCase())}
                    placeholder="Enter your last name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg uppercase"
                  />
                </div>
                
                <button
                  onClick={handleLookup}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  Find My Booking
                </button>
              </div>
            </div>
          )}
          
          {/* Step 2: Flight Details & Check-in */}
          {step === 'details' && foundPassenger && foundFlight && (
            <div className="space-y-6">
              {/* Flight Information Card */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Flight Details</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Plane className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">Flight</div>
                      <div className="font-bold text-lg">{foundFlight.flightNumber}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">Route</div>
                      <div className="font-bold text-lg">{foundFlight.origin} → {foundFlight.destination}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">Departure</div>
                      <div className="font-bold text-lg">{foundFlight.std}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">Gate</div>
                      <div className="font-bold text-lg">{foundFlight.gate || 'TBA'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600">
                    <strong>Passenger:</strong> {foundPassenger.firstName} {foundPassenger.lastName}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <strong>Current Seat:</strong> {foundPassenger.seat || 'Not assigned'}
                  </div>
                </div>
              </div>
              
              {/* Seat Selection */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Select Your Seat</h3>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-green-200 border border-green-400"></div>
                    <span className="text-sm text-gray-600">Available</span>
                    <div className="w-4 h-4 bg-gray-300 border border-gray-400 ml-4"></div>
                    <span className="text-sm text-gray-600">Occupied</span>
                    <div className="w-4 h-4 bg-blue-200 border-2 border-blue-600 ml-4"></div>
                    <span className="text-sm text-gray-600">Selected</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                  {availableSeats.map((seat) => {
                    const isOccupied = passengers.some(p => 
                      p.flightId === foundFlight.id && 
                      p.seat === seat && 
                      p.pnr !== foundPassenger.pnr
                    );
                    const isSelected = selectedSeat === seat;
                    
                    return (
                      <button
                        key={seat}
                        onClick={() => !isOccupied && setSelectedSeat(seat)}
                        disabled={isOccupied}
                        className={clsx(
                          "px-3 py-2 text-xs font-semibold rounded border transition-colors",
                          isSelected 
                            ? "bg-blue-200 border-2 border-blue-600 text-blue-900" 
                            : isOccupied
                            ? "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed"
                            : "bg-green-200 border-green-400 text-gray-700 hover:bg-green-300"
                        )}
                      >
                        {seat}
                      </button>
                    );
                  })}
                </div>
                
                {selectedSeat && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-semibold text-blue-900">
                      Selected Seat: <span className="text-lg">{selectedSeat}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Baggage Declaration */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Luggage className="w-5 h-5" />
                  Baggage Declaration
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Number of Checked Bags
                    </label>
                    <select
                      value={bagCount}
                      onChange={(e) => setBagCount(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[0, 1, 2, 3, 4, 5].map(num => (
                        <option key={num} value={num}>{num} {num === 1 ? 'bag' : 'bags'}</option>
                      ))}
                    </select>
                  </div>
                  
                  {bagCount > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-sm text-yellow-800">
                        <strong>Note:</strong> Please ensure your bags comply with size and weight restrictions. 
                        Excess baggage fees may apply at the airport.
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Check-in Button */}
              <div className="flex gap-4">
                <button
                  onClick={() => setStep('lookup')}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCheckIn}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Complete Check-In
                </button>
              </div>
            </div>
          )}
          
          {/* Step 3: Check-in Complete */}
          {step === 'complete' && foundPassenger && foundFlight && (
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-green-900 mb-2">Check-In Complete!</h2>
                <p className="text-green-700 text-lg">
                  You have successfully checked in for flight {foundFlight.flightNumber}
                </p>
              </div>
              
              {/* Boarding Pass */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">Your Boarding Pass</h3>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Print / Save
                  </button>
                </div>
                
                <div className="flex justify-center">
                  <BoardingPass 
                    passenger={foundPassenger} 
                    flight={foundFlight} 
                    passengers={passengers}
                    flights={flights}
                  />
                </div>
              </div>
              
              {/* Important Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-bold text-blue-900 mb-3">Important Information</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Please arrive at the gate at least 30 minutes before departure</li>
                  <li>• Have your boarding pass and ID ready for boarding</li>
                  <li>• Check-in closes 45 minutes before departure</li>
                  <li>• Gate information may change - please check the flight information displays</li>
                </ul>
              </div>
              
              <button
                onClick={() => {
                  setStep('lookup');
                  setPnr('');
                  setLastName('');
                  setSelectedSeat('');
                  setBagCount(0);
                  setError('');
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Check In Another Passenger
              </button>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

