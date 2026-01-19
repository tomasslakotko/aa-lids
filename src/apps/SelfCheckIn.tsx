import { useState, useEffect } from 'react';
import { useAirportStore } from '../store/airportStore';
import { CheckCircle, Plane, Luggage, Download, User, MapPin, Clock, X, Keyboard, Smartphone, QrCode, CreditCard, ChevronDown, RotateCcw, Globe, Sun, Shield, HelpCircle, ArrowLeft } from 'lucide-react';
import QRCode from 'react-qr-code';
import clsx from 'clsx';
import { Html5Qrcode } from 'html5-qrcode';

type Step = 'welcome' | 'lookup' | 'flight-selection' | 'itinerary' | 'passenger-info' | 'baggage' | 'complete';

export const SelfCheckInApp = () => {
  const [step, setStep] = useState<Step>('welcome');
  const [lookupMethod, setLookupMethod] = useState<'TYPE' | 'TAP' | 'SCAN' | 'INSERT' | null>(null);
  const [pnr, setPnr] = useState('');
  const [lastName, setLastName] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [selectedFlights, setSelectedFlights] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'PASSENGER_ID' | 'ADDITIONAL_TRAVEL_INFO'>('PASSENGER_ID');
  const [bagCount, setBagCount] = useState(0);
  const [error, setError] = useState('');
  const [foundPassengersState, setFoundPassengersState] = useState<any[]>([]);
  
  const passengers = useAirportStore((state) => state.passengers);
  const flights = useAirportStore((state) => state.flights);
  const checkInPassenger = useAirportStore((state) => state.checkInPassenger);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);
  
  // Get current time and date
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };
  
  const resetState = () => {
    setPnr('');
    setLastName('');
    setTicketNumber('');
    setSelectedFlights([]);
    setBagCount(0);
    setError('');
    setFoundPassengersState([]);
    setLookupMethod(null);
  };
  
  // Find passenger by PNR and last name (with flexible matching)
  const foundPassengers = pnr && lastName 
    ? passengers.filter(p => {
        const pnrMatch = p.pnr?.toUpperCase().trim() === pnr.toUpperCase().trim();
        const lastNameMatch = p.lastName?.toUpperCase().trim() === lastName.toUpperCase().trim();
        return pnrMatch && lastNameMatch;
      })
    : [];
  
  // Get flights for found passengers (use state if available, otherwise computed)
  const activeFoundPassengers = foundPassengersState.length > 0 ? foundPassengersState : foundPassengers;
  const foundFlights = activeFoundPassengers.length > 0
    ? flights.filter(f => activeFoundPassengers.some(p => p.flightId === f.id))
    : [];
  
  // Handle lookup methods
  const handleLookupMethod = (method: 'TYPE' | 'TAP' | 'SCAN' | 'INSERT') => {
    setLookupMethod(method);
    setStep('lookup');
    setError('');
    
    if (method === 'SCAN') {
      // Initialize QR scanner
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode('qr-reader');
          await scanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              try {
                const data = JSON.parse(decodedText);
                if (data.pnr) {
                  setPnr(data.pnr);
                  setLastName(data.lastName || '');
                  scanner.stop();
                  handleLookup();
                }
              } catch (e) {
                // Try direct PNR
                setPnr(decodedText);
                scanner.stop();
              }
            },
            (errorMessage) => {
              // Ignore errors
            }
          );
        } catch (error) {
          console.error('QR Scanner error:', error);
        }
      }, 100);
    }
  };
  
  const handleLookup = () => {
    setError('');
    
    // Trim inputs
    const trimmedPnr = pnr.trim().toUpperCase();
    const trimmedLastName = lastName.trim().toUpperCase();
    
    if (!trimmedPnr || !trimmedLastName) {
      setError('Please enter both PNR and Last Name');
      return;
    }
    
    // Check if there are any passengers in the system
    if (passengers.length === 0) {
      setError('No bookings found in the system. Please create a booking first in the Reservations app.');
      return;
    }
    
    // Try to find passengers
    const matchingPassengers = passengers.filter(p => {
      const pnrMatch = p.pnr?.toUpperCase().trim() === trimmedPnr;
      const lastNameMatch = p.lastName?.toUpperCase().trim() === trimmedLastName;
      return pnrMatch && lastNameMatch;
    });
    
    if (matchingPassengers.length === 0) {
      // Provide helpful debugging info
      const similarPnr = passengers.find(p => p.pnr?.toUpperCase().trim().includes(trimmedPnr));
      const similarLastName = passengers.find(p => p.lastName?.toUpperCase().trim().includes(trimmedLastName));
      
      let errorMsg = 'Booking not found. Please check your PNR and Last Name.';
      if (similarPnr && !similarLastName) {
        errorMsg += ' (PNR found, but Last Name does not match)';
      } else if (!similarPnr && similarLastName) {
        errorMsg += ' (Last Name found, but PNR does not match)';
      } else if (!similarPnr && !similarLastName) {
        errorMsg += ' (No similar bookings found. Make sure the booking is saved in the Reservations app.)';
      }
      
      setError(errorMsg);
      return;
    }
    
    // Store found passengers in state
    setFoundPassengersState(matchingPassengers);
    
    // Check if already checked in
    const allCheckedIn = matchingPassengers.every(p => p.status === 'CHECKED_IN' || p.status === 'BOARDED');
    if (allCheckedIn) {
      setError('You are already checked in for all flights.');
      return;
    }
    
    setStep('flight-selection');
  };
  
  const handleFlightToggle = (flightId: string) => {
    setSelectedFlights(prev => 
      prev.includes(flightId) 
        ? prev.filter(id => id !== flightId)
        : [...prev, flightId]
    );
  };
  
  const handleContinue = () => {
    if (selectedFlights.length === 0) {
      setError('Please select at least one flight');
      return;
    }
    setStep('itinerary');
  };
  
  const handleConfirmItinerary = () => {
    setStep('passenger-info');
  };
  
  const handleCompleteCheckIn = async () => {
    // Check in all selected flights
    for (const flightId of selectedFlights) {
      const passenger = activeFoundPassengers.find(p => p.flightId === flightId);
      if (passenger && passenger.status !== 'CHECKED_IN' && passenger.status !== 'BOARDED') {
        await checkInPassenger(passenger.pnr);
        if (bagCount > 0) {
          updatePassengerDetails(passenger.pnr, { 
            hasBags: true, 
            bagCount: bagCount 
          });
        }
      }
    }
    setStep('complete');
  };
  
  // Get city image URL (placeholder)
  const getCityImage = (cityCode: string) => {
    const cityImages: Record<string, string> = {
      'YYZ': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800',
      'SFO': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
      'PEK': 'https://images.unsplash.com/photo-1508804185872-d7aad707a8f0?w=800',
      'MEL': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800',
      'YHZ': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
    };
    return cityImages[cityCode] || `https://picsum.photos/800/400?random=${cityCode}`;
  };
  
  // Get flight status
  const getFlightStatus = (flight: any) => {
    // Simple logic - can be enhanced
    const delay = Math.random() > 0.7;
    return delay ? 'DELAYED' : 'ON TIME';
  };
  
  // Header component
  const Header = ({ showClose = false }: { showClose?: boolean }) => (
    <div className="bg-[#1a237e] text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="text-2xl font-bold">EMBRO-SS</div>
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4" />
          <div className="text-sm">
            <div className="font-semibold">LOCAL WEATHER</div>
            <div className="text-xs">{formatTime(currentTime)} {formatDate(currentTime)} 12°C</div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-orange-500 px-3 py-1 rounded">
          <HelpCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">Need Assistance?</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <div className="text-sm">
            <span className="font-semibold">SECURITY WAIT TIME</span>
            <span className="text-red-300 ml-2">25min</span>
          </div>
        </div>
        {showClose && (
          <button onClick={() => {
            resetState();
            setStep('welcome');
          }} className="bg-red-600 hover:bg-red-700 p-2 rounded">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
  
  // Progress bar component
  const ProgressBar = ({ currentStep }: { currentStep: number }) => {
    const steps = [
      { id: 1, label: 'Find My Reservation' },
      { id: 2, label: 'Itinerary Review' },
      { id: 3, label: 'Passenger Information' },
      { id: 4, label: 'Baggage Check' },
      { id: 5, label: 'Complete Check-In' }
    ];
    
    return (
      <div className="flex items-center justify-between px-6 py-4 bg-[#1a237e] text-white">
        <div className="flex items-center gap-1">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                currentStep >= step.id ? "bg-red-600" : "bg-gray-600"
              )}>
                {step.id}
              </div>
              <span className={clsx(
                "ml-2 text-xs",
                currentStep >= step.id ? "text-white" : "text-gray-400"
              )}>
                {step.label}
              </span>
              {idx < steps.length - 1 && <div className="w-8 h-0.5 bg-gray-600 mx-2" />}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => {
            if (step === 'flight-selection') setStep('lookup');
            else if (step === 'itinerary') setStep('flight-selection');
            else if (step === 'passenger-info') setStep('itinerary');
            else if (step === 'baggage') setStep('passenger-info');
          }} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
            <ArrowLeft className="w-4 h-4" />
            BACK
          </button>
          {(step === 'flight-selection' || step === 'itinerary' || step === 'passenger-info' || step === 'baggage') && (
            <button onClick={() => {
              if (step === 'flight-selection') handleContinue();
              else if (step === 'itinerary') handleConfirmItinerary();
              else if (step === 'passenger-info') setStep('baggage');
              else if (step === 'baggage') handleCompleteCheckIn();
            }} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-semibold">
              CONTINUE
            </button>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-full w-full bg-[#1a237e] text-white relative overflow-hidden">
      {/* Background image with blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
        style={{ 
          backgroundImage: step === 'welcome' 
            ? 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920)'
            : 'url(https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920)'
        }}
      />
      
      <div className="relative z-10 h-full flex flex-col">
        <Header showClose={step !== 'welcome'} />
        
        {/* Welcome Screen */}
        {step === 'welcome' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <h1 className="text-6xl font-bold mb-4">Welcome</h1>
            <h2 className="text-3xl mb-2">Let's find your booking</h2>
            <p className="text-xl mb-12">Please select an option.</p>
            
            <div className="grid grid-cols-4 gap-6 max-w-6xl w-full">
              {/* TYPE */}
              <button
                onClick={() => handleLookupMethod('TYPE')}
                className="bg-white/10 backdrop-blur-sm border-t-4 border-red-500 p-6 rounded-lg hover:bg-white/20 transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  <Keyboard className="w-16 h-16 mb-4" />
                  <div className="text-2xl font-bold mb-2">TYPE</div>
                  <div className="text-sm text-gray-300">
                    Type your name, booking Reference or ticket number to retrieve your reservation.
                  </div>
                </div>
              </button>
              
              {/* TAP */}
              <button
                onClick={() => handleLookupMethod('TAP')}
                className="bg-white/10 backdrop-blur-sm border-t-4 border-blue-500 p-6 rounded-lg hover:bg-white/20 transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  <Smartphone className="w-16 h-16 mb-4" />
                  <div className="text-2xl font-bold mb-2">TAP</div>
                  <div className="text-sm text-gray-300">
                    Tap your NFC-enabled phone with your booking reference.
                  </div>
                </div>
              </button>
              
              {/* SCAN */}
              <button
                onClick={() => handleLookupMethod('SCAN')}
                className="bg-white/10 backdrop-blur-sm border-t-4 border-green-500 p-6 rounded-lg hover:bg-white/20 transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  <QrCode className="w-16 h-16 mb-4" />
                  <div className="text-2xl font-bold mb-2">SCAN</div>
                  <div className="text-sm text-gray-300">
                    Scan your e-ticket barcode from your phone or print.
                  </div>
                </div>
              </button>
              
              {/* INSERT */}
              <button
                onClick={() => handleLookupMethod('INSERT')}
                className="bg-white/10 backdrop-blur-sm border-t-4 border-orange-500 p-6 rounded-lg hover:bg-white/20 transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  <CreditCard className="w-16 h-16 mb-4" />
                  <div className="text-2xl font-bold mb-2">INSERT</div>
                  <div className="text-sm text-gray-300">
                    Insert your frequent flyer card or credit card on which the ticket was purchased.
                  </div>
                </div>
              </button>
            </div>
            
            {/* Footer */}
            <div className="mt-auto w-full flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-2">
                <span>CHANGE LANGUAGE</span>
                <span>&gt;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🇬🇧</span>
                <span className="text-2xl">🇫🇷</span>
                <span className="text-2xl">🇮🇹</span>
                <span className="text-2xl">🇨🇳</span>
                <span className="text-2xl">🇪🇸</span>
                <span className="ml-2">&gt;</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Lookup Screen */}
        {step === 'lookup' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <h2 className="text-4xl font-bold mb-8">Find Your Booking</h2>
            
            {lookupMethod === 'SCAN' && (
              <div className="mb-6">
                <div id="qr-reader" className="w-96 h-96 bg-white rounded-lg"></div>
              </div>
            )}
            
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg max-w-md w-full">
              {error && (
                <div className="mb-4 p-4 bg-red-500/50 rounded text-white">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Booking Reference (PNR)</label>
                  <input
                    type="text"
                    value={pnr}
                    onChange={(e) => setPnr(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123"
                    className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500"
                    maxLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value.toUpperCase())}
                    placeholder="Enter your last name"
                    className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <button
                  onClick={handleLookup}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  SEARCH
                </button>
                
                <button
                  onClick={() => {
                    resetState();
                    setStep('welcome');
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  BACK
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Flight Selection Screen */}
        {step === 'flight-selection' && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-8">
              <h2 className="text-4xl font-bold mb-2">Select the flights you will be checking in for</h2>
              <p className="text-xl mb-8">Once selected, press CONTINUE</p>
              
              <div className="space-y-6">
                {foundFlights.map((flight, idx) => {
                  const passenger = activeFoundPassengers.find(p => p.flightId === flight.id);
                  const isSelected = selectedFlights.includes(flight.id);
                  const status = getFlightStatus(flight);
                  
                  // Calculate boarding time (30 mins before departure)
                  const [depHour, depMin] = flight.std.split(':').map(Number);
                  const depDate = new Date();
                  depDate.setHours(depHour, depMin, 0);
                  const boardTime = new Date(depDate.getTime() - 30 * 60000);
                  const boardingTime = `${boardTime.getHours().toString().padStart(2, '0')}:${boardTime.getMinutes().toString().padStart(2, '0')}${boardTime.getHours() >= 12 ? 'pm' : 'am'}`;
                  
                  return (
                    <div
                      key={flight.id}
                      onClick={() => handleFlightToggle(flight.id)}
                      className={clsx(
                        "relative bg-white/10 backdrop-blur-sm rounded-lg p-6 cursor-pointer transition-all",
                        isSelected ? "border-l-4 border-green-500" : "border-l-4 border-gray-500"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={clsx(
                          "w-8 h-8 rounded-full flex items-center justify-center mt-2",
                          isSelected ? "bg-green-500" : "bg-gray-500"
                        )}>
                          {isSelected ? <CheckCircle className="w-6 h-6 text-white" /> : null}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <span className="bg-red-600 px-3 py-1 rounded text-sm font-bold">FLIGHT {idx + 1}</span>
                            <span className="text-2xl font-bold">{flight.flightNumber} {flight.airline || 'EMBROSS AIR'}</span>
                            <div className="text-sm">
                              <div>BOARDING TIME: {boardingTime}</div>
                              <div>GATE: {flight.gate || 'TBA'}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6">
                            <div className="relative h-48 rounded-lg overflow-hidden">
                              <img 
                                src={getCityImage(flight.origin)} 
                                alt={flight.originCity || flight.origin}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            <div className="flex flex-col justify-center">
                              <div className="text-lg font-semibold mb-2">
                                {flight.origin} {flight.originCity || flight.origin}
                              </div>
                              <div className="text-sm mb-4">DEPARTS: {flight.std} {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</div>
                              
                              <Plane className="w-6 h-6 my-2" />
                              
                              <div className="text-lg font-semibold mb-2">
                                {flight.destination} {flight.destinationCity || flight.destination}
                              </div>
                              <div className="text-sm">ARRIVES: {flight.sta} {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</div>
                            </div>
                          </div>
                          
                          <div className={clsx(
                            "mt-4 py-2 px-4 rounded text-center font-semibold",
                            status === 'ON TIME' ? "bg-green-500" : "bg-yellow-500"
                          )}>
                            {status}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="text-center text-gray-400 mt-6 flex items-center justify-center gap-2">
                <span>MORE FLIGHTS</span>
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
            
            <ProgressBar currentStep={1} />
          </>
        )}
        
        {/* Itinerary Confirmation Screen */}
        {step === 'itinerary' && (
          <>
            <div className="flex-1 overflow-y-auto bg-white text-gray-900">
              {/* Tabs */}
              <div className="flex border-b border-gray-300">
                <button
                  onClick={() => setActiveTab('PASSENGER_ID')}
                  className={clsx(
                    "px-6 py-4 font-semibold border-b-2",
                    activeTab === 'PASSENGER_ID' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600"
                  )}
                >
                  PASSENGER ID
                </button>
                <button
                  onClick={() => setActiveTab('ADDITIONAL_TRAVEL_INFO')}
                  className={clsx(
                    "px-6 py-4 font-semibold border-b-2",
                    activeTab === 'ADDITIONAL_TRAVEL_INFO' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600"
                  )}
                >
                  ADDITIONAL TRAVEL INFO
                </button>
              </div>
              
              <div className="p-8">
                <p className="text-gray-700 mb-6">Please confirm that your itinerary is correct.</p>
                
                <div className="relative">
                  <h3 className="text-4xl font-bold text-gray-400 mb-6">Itinerary</h3>
                  
                  {/* Background image */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <img 
                      src="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200" 
                      alt="Background"
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>
                  
                  {/* Flight details table */}
                  <div className="relative bg-white/90 backdrop-blur-sm p-6 rounded-lg">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left py-3 px-4 font-semibold">FROM</th>
                          <th className="text-left py-3 px-4 font-semibold">TO</th>
                          <th className="text-left py-3 px-4 font-semibold">DEPARTS</th>
                          <th className="text-left py-3 px-4 font-semibold">ARRIVES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {foundFlights.filter(f => selectedFlights.includes(f.id)).map((flight, idx) => {
                          const depDate = new Date();
                          const arrDate = new Date();
                          const [depHour, depMin] = flight.std.split(':').map(Number);
                          const [arrHour, arrMin] = flight.sta.split(':').map(Number);
                          depDate.setHours(depHour, depMin, 0);
                          arrDate.setHours(arrHour, arrMin, 0);
                          
                          const isNextDay = arrDate.getDate() !== depDate.getDate();
                          
                          return (
                            <tr key={flight.id} className="border-b border-gray-200">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                                    AC
                                  </div>
                                  <div>
                                    <div className="font-bold">{flight.origin} {flight.originCity || flight.origin}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-bold">{flight.destination} {flight.destinationCity || flight.destination}</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-semibold">{depDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}</div>
                                <div className="text-sm">{flight.std}</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-semibold">
                                  {arrDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                                  {isNextDay && <span className="text-red-600"> +1</span>}
                                </div>
                                <div className="text-sm">{flight.sta}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#1a237e] text-white px-6 py-4 flex items-center justify-between">
              <button className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Language
              </button>
              <button
                onClick={handleConfirmItinerary}
                className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-semibold text-lg"
              >
                Confirm
              </button>
            </div>
            
            <ProgressBar currentStep={2} />
          </>
        )}
        
        {/* Passenger Info Screen */}
        {step === 'passenger-info' && (
          <>
            <div className="flex-1 overflow-y-auto bg-white text-gray-900 p-8">
              <h2 className="text-3xl font-bold mb-6">Passenger Information</h2>
              
              {activeFoundPassengers.filter(p => selectedFlights.includes(p.flightId)).map((passenger, idx) => {
                const flight = flights.find(f => f.id === passenger.flightId);
                return (
                  <div key={passenger.id} className="bg-gray-50 p-6 rounded-lg mb-4">
                    <h3 className="text-xl font-semibold mb-4">Passenger {idx + 1}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">First Name</label>
                        <input
                          type="text"
                          value={passenger.firstName}
                          readOnly
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Last Name</label>
                        <input
                          type="text"
                          value={passenger.lastName}
                          readOnly
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">PNR</label>
                        <input
                          type="text"
                          value={passenger.pnr}
                          readOnly
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Flight</label>
                        <input
                          type="text"
                          value={flight?.flightNumber || ''}
                          readOnly
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <ProgressBar currentStep={3} />
          </>
        )}
        
        {/* Baggage Screen */}
        {step === 'baggage' && (
          <>
            <div className="flex-1 overflow-y-auto bg-white text-gray-900 p-8">
              <h2 className="text-3xl font-bold mb-6">Baggage Check</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <label className="block text-sm font-semibold mb-2">Number of Checked Bags</label>
                <select
                  value={bagCount}
                  onChange={(e) => setBagCount(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg"
                >
                  {[0, 1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'bag' : 'bags'}</option>
                  ))}
                </select>
                
                {bagCount > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-sm text-yellow-800">
                      <strong>Note:</strong> Please ensure your bags comply with size and weight restrictions.
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <ProgressBar currentStep={4} />
          </>
        )}
        
        {/* Complete Screen */}
        {step === 'complete' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <CheckCircle className="w-24 h-24 text-green-500 mb-6" />
            <h1 className="text-5xl font-bold mb-4">Check-In Complete!</h1>
            <p className="text-2xl mb-8">Your boarding passes are ready</p>
            
            <button
              onClick={() => {
                resetState();
                setStep('welcome');
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg"
            >
              START OVER
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
