import { useEffect, useState } from 'react';
import { useAirportStore } from '../store/airportStore';
import { Check, Plane, Luggage, Printer, FileText, DollarSign, Plus, Minus, AlertCircle, History, MessageSquare, Star, X, Loader } from 'lucide-react';
import QRCode from 'react-qr-code';
import clsx from 'clsx';

// --- Legacy Components ---

const Tab = ({ label, active, onClick, first }: { label: string, active: boolean, onClick: () => void, first?: boolean }) => (
  <button
    onClick={onClick}
    className={clsx(
      "relative h-8 px-4 flex items-center justify-center text-xs font-bold select-none",
      first ? "ml-0" : "-ml-2",
      active 
        ? "bg-blue-700 text-white z-10" 
        : "bg-[#D4D0C8] text-gray-600 hover:bg-[#E0DCD4] z-0"
    )}
    style={{
      clipPath: "polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%, 10% 50%)",
      paddingLeft: first ? "1rem" : "1.5rem",
      paddingRight: "1rem",
      width: "140px"
    }}
  >
    {label}
  </button>
);

const LegacyInput = ({ label, value, onChange, width = "w-full", placeholder = "", readOnly = false }: any) => (
  <div className="flex flex-col">
    <label className="text-[10px] text-blue-800 font-bold mb-0.5">{label}</label>
    <div className="relative">
      <input 
        type="text" 
        value={value}
        onChange={onChange}
        readOnly={readOnly || !onChange}
        placeholder={placeholder}
        className={`h-6 border border-[#7F9DB9] bg-white px-1 text-xs outline-none focus:border-blue-500 ${width}`}
      />
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-[#D4D0C8] border-l border-[#7F9DB9] flex items-center justify-center">
        <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-black/50" />
      </div>
    </div>
  </div>
);

const LegacyButton = ({ children, onClick, primary, disabled }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      "px-4 py-1 text-xs font-bold border border-[#003C74] shadow-[1px_1px_0px_#fff_inset] active:shadow-[1px_1px_2px_#000_inset] active:translate-y-[1px]",
      primary 
        ? "bg-gradient-to-b from-[#B0CFF5] to-[#89B5EA] text-[#003C74]" 
        : "bg-gradient-to-b from-[#F0F0F0] to-[#D4D0C8] text-black",
      disabled && "opacity-50 grayscale cursor-not-allowed"
    )}
  >
    {children}
  </button>
);

const HeaderInfo = ({ flight, gate }: any) => (
  <div className="bg-[#FDFBF7] border-b border-[#A0A0A0] px-2 py-1 text-xs font-mono flex justify-between items-center select-none">
    <div className="flex items-center gap-4">
      <span className="font-bold text-blue-800">✈ {flight?.flightNumber || 'NO FLIGHT'}</span>
      <span>{flight?.std} {flight?.origin} ➔ {flight?.destination}</span>
      {flight && <span className="text-gray-500">({flight.aircraft})</span>}
    </div>
    <div className="flex gap-4">
      <span>Gate: {gate || '---'}</span>
      <span>Boarding: {flight?.etd}</span>
      <span className="text-green-600 font-bold">Acceptance Open</span>
    </div>
  </div>
);

// --- Print Components ---

const Barcode = () => (
  <div className="flex h-12 w-full overflow-hidden">
    {Array.from({ length: 40 }).map((_, i) => (
      <div 
        key={i} 
        className="bg-black h-full" 
        style={{ 
          width: Math.random() > 0.5 ? '2px' : '4px',
          marginRight: Math.random() > 0.5 ? '1px' : '3px' 
        }} 
      />
    ))}
  </div>
);

const BoardingPass = ({ passenger, flight, passengers, flights }: { passenger: any, flight: any, passengers?: any[], flights?: any[] }) => {
  if (!passenger || !flight) return null;
  
  // Check for connecting flight (transit)
  const connectingFlight = passengers && flights
    ? (() => {
        // Find other passengers with same PNR
        const samePnrPassengers = passengers.filter(p => p.pnr === passenger.pnr && p.flightId !== flight.id);
        // Find a connecting flight where current flight's destination is the connecting flight's origin
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
                    <div className="text-lg font-bold text-slate-900">{flight.gate}</div>
                </div>
                <div>
                    <div className="text-[8px] font-bold uppercase mb-0.5 text-slate-700">SEAT:</div>
                    <div className="text-2xl font-bold text-slate-900">{passenger.seat}</div>
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
                    <div className="text-2xl font-bold text-slate-900">{passenger.seat}</div>
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

const BagTag = ({ passenger, flight, bagIndex, weight }: { passenger: any, flight: any, bagIndex: number, weight: number }) => {
    if (!passenger || !flight) return null;
    
    return (
        <div className="bg-white w-[180px] h-[500px] border border-gray-300 shadow-lg flex flex-col font-sans text-slate-900 overflow-hidden relative">
            
            {/* Top Barcode Section */}
            <div className="p-2 text-center border-b-2 border-black">
                <div className="h-16 w-full overflow-hidden mb-1"><Barcode /></div>
                <div className="h-8 w-full overflow-hidden px-2 mb-1"><Barcode /></div>
                <div className="flex justify-between text-[10px] font-mono font-bold px-2">
                    <span>{flight.origin}</span>
                    <span>/</span>
                    <span>{flight.destination}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold px-2 mt-1">
                    <span>0074KL</span>
                    <span>774268</span>
                </div>
            </div>

            {/* Destination Section */}
            <div className="border-b-2 border-black relative h-48 flex flex-col justify-center items-center bg-white overflow-hidden">
                {/* Green Strips */}
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-[#90C978]" />
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-[#90C978]" />
                
                <div className="text-xs uppercase font-bold mb-1 w-full text-center">{flight.origin} / {flight.destination}</div>
                <div className="text-7xl font-black tracking-tighter z-10 bg-white px-2">{flight.destination}</div>
                
                <div className="mt-2 flex items-center gap-2 z-10 bg-white px-2">
                    <span className="text-xl font-bold">TO</span>
                    <span className="text-3xl font-bold">{flight.flightNumber}</span>
                </div>
            </div>

            {/* Passenger Info */}
            <div className="p-2 text-xs font-bold border-b border-dashed border-gray-400">
                <div className="uppercase truncate">{passenger.lastName}/{passenger.firstName}</div>
                <div className="flex justify-between mt-1">
                    <span>WGT: {weight}KG</span>
                    <span>SEQ: 00{bagIndex + 1}</span>
                </div>
            </div>

            {/* Bottom Stubs */}
            <div className="mt-auto">
                {[1, 2, 3].map((stub) => (
                    <div key={stub} className="border-t border-dashed border-gray-400 p-1 flex flex-col items-center justify-center h-12">
                        <div className="flex justify-between w-full px-2 text-[9px] font-mono mb-0.5">
                            <span>0074KL</span>
                            <span>774268</span>
                            <span>0{bagIndex}0</span>
                        </div>
                        <div className="h-6 w-full px-4 overflow-hidden opacity-80"><Barcode /></div>
                    </div>
                ))}
                {/* Bottom Black Strip */}
                <div className="bg-black h-4 w-full" />
            </div>
        </div>
    );
};

// --- Main Application ---

export const CheckInApp = () => {
  // States mimicking the screens
  const [currentScreen, setCurrentScreen] = useState<'IDENTIFICATION' | 'SELECTION' | 'ACCEPTANCE' | 'SEAT_MAP' | 'BAGGAGE'>('IDENTIFICATION');
  
  // Identification Form State
  const [identName, setIdentName] = useState('');
  const [identPnr, setIdentPnr] = useState('');
  const [identFlight, setIdentFlight] = useState('');
  const [identFlightPrefix, setIdentFlightPrefix] = useState('BT');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Selection/Acceptance State
  const [selectedPnr, setSelectedPnr] = useState<string | null>(null);
  const [selectedPassengerForSeat, setSelectedPassengerForSeat] = useState<string | null>(null); // Passenger ID for seat assignment
  const [selectedPassengerForBoardingPass, setSelectedPassengerForBoardingPass] = useState<string | null>(null); // Passenger ID for boarding pass
  const [bagPcs, setBagPcs] = useState('0');
  const [bagKg, setBagKg] = useState('0');
  const [showFqtvModal, setShowFqtvModal] = useState(false);
  
  // Baggage Editing State
  const [editingBagIndex, setEditingBagIndex] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [customBagWeights, setCustomBagWeights] = useState<Record<string, number>>({});
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // New feature modals
  const [showSbyModal, setShowSbyModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showCardProcessing, setShowCardProcessing] = useState(false);
  const [showDocVerifyModal, setShowDocVerifyModal] = useState(false);
  const [showBagWaiverModal, setShowBagWaiverModal] = useState(false);
  const [docVerifyStatus, setDocVerifyStatus] = useState<'PENDING' | 'VERIFIED' | 'FLAGGED'>('PENDING');
  const [docVerifyNote, setDocVerifyNote] = useState('');
  const [bagWaiverPcs, setBagWaiverPcs] = useState<number>(0);
  const [bagWaiverKg, setBagWaiverKg] = useState<number>(0);
  const [bagWaiverReason, setBagWaiverReason] = useState('');
  
  // Payment state
  const [ticketPrice, setTicketPrice] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [paymentItems, setPaymentItems] = useState<Array<{description: string; quantity: number; unitPrice: number; total: number}>>([]);
  
  // Services state
  const [extraBags, setExtraBags] = useState<number>(0);
  const [loungeAccess, setLoungeAccess] = useState<boolean>(false);
  const [upgradeClass, setUpgradeClass] = useState<string>('');

  // Store Data
  const passengers = useAirportStore((state) => state.passengers);
  const flights = useAirportStore((state) => state.flights);
  const logs = useAirportStore((state) => state.logs);
  const emails = useAirportStore((state) => state.emails);
  const checkInPassenger = useAirportStore((state) => state.checkInPassenger);
  const cancelCheckIn = useAirportStore((state) => state.cancelCheckIn);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);
  const addLog = useAirportStore((state) => state.addLog);
  const upgradePassenger = useAirportStore((state) => state.upgradePassenger);
  const sendEmailConfirmation = useAirportStore((state) => state.sendEmailConfirmation);

  // Derived Data
  const flightsForDate = selectedDate
    ? flights.filter(f => !f.date || f.date === selectedDate)
    : flights;
  const flightIdSet = new Set(flightsForDate.map(f => f.id));
  const passengersForDate = selectedDate
    ? passengers.filter(p => flightIdSet.has(p.flightId))
    : passengers;
  const foundPassenger = selectedPnr ? passengersForDate.find(p => p.pnr === selectedPnr) : null;
  
  // Find all flight segments for this passenger (same PNR)
  const passengerSegments = selectedPnr 
    ? passengersForDate.filter(p => p.pnr === selectedPnr)
    : [];
    
  // Sort segments by flight number for now (ideal would be by time, but need full flight objects)
  // Filter out segments where the flight doesn't exist (data inconsistency)
  const sortedSegments = passengerSegments
    .map(p => {
       const f = flightsForDate.find(flight => flight.id === p.flightId);
       if (!f) {
         console.warn(`CheckIn: Passenger ${p.id} has invalid flightId: ${p.flightId}`);
       }
       return { passenger: p, flight: f };
    })
    .filter(seg => seg.flight !== undefined) // Only show segments with valid flights
    .sort((a, b) => (a.flight?.std || '').localeCompare(b.flight?.std || ''));
  
  // Debug: Log segment count
  if (selectedPnr && passengerSegments.length !== sortedSegments.length) {
    console.warn(`CheckIn: PNR ${selectedPnr} has ${passengerSegments.length} passenger records but only ${sortedSegments.length} valid flight segments`);
  }

  const foundFlight = foundPassenger ? flightsForDate.find(f => f.id === foundPassenger.flightId) : null;
  const isFlightClosed = foundFlight ? ['DEPARTED', 'ARRIVED'].includes(foundFlight.status) : false;
  const isPassengerEditable = !!foundPassenger && !isFlightClosed;
  
  // Set default selected passenger for seat assignment when PNR changes
  useEffect(() => {
    if (foundPassenger && !selectedPassengerForSeat) {
      setSelectedPassengerForSeat(foundPassenger.id);
    } else if (!foundPassenger) {
      setSelectedPassengerForSeat(null);
    }
  }, [selectedPnr, foundPassenger?.id]);
  
  // Set default selected passenger for boarding pass when PNR changes
  useEffect(() => {
    if (foundPassenger && !selectedPassengerForBoardingPass) {
      setSelectedPassengerForBoardingPass(foundPassenger.id);
    } else if (!foundPassenger) {
      setSelectedPassengerForBoardingPass(null);
    }
  }, [selectedPnr, foundPassenger?.id]);
  
  // Helper to format seat map
  const occupiedSeats = foundFlight 
    ? passengersForDate.filter(p => p.flightId === foundFlight.id).map(p => p.seat)
    : [];

  useEffect(() => {
    if (selectedPnr && !passengersForDate.find(p => p.pnr === selectedPnr)) {
      setSelectedPnr(null);
      setCurrentScreen('IDENTIFICATION');
    }
  }, [selectedPnr, passengersForDate]);
    
  const handleUpgrade = () => {
     if (isFlightClosed) {
        alert('FLIGHT CLOSED - EDITING DISABLED');
        return;
     }
     if (!foundPassenger) return;
     updatePassengerDetails(foundPassenger.pnr, { seat: '1A' }); // Simplistic upgrade logic
     alert(`Passenger upgraded to 1A`);
  };

  const handleDowngrade = () => {
     if (isFlightClosed) {
        alert('FLIGHT CLOSED - EDITING DISABLED');
        return;
     }
     if (!foundPassenger) return;
     updatePassengerDetails(foundPassenger.pnr, { seat: '15A' }); // Simplistic downgrade logic
     alert(`Passenger downgraded to 15A`);
  };
  
  const handlePrint = () => {
      if (foundPassenger) {
          setShowPrintModal(true);
      }
  };

  const handleBaggage = () => {
      if (isFlightClosed) {
          alert('FLIGHT CLOSED - EDITING DISABLED');
          return;
      }
      if (foundPassenger) {
          setCurrentScreen('BAGGAGE');
      }
  };
  
  const handleRestart = () => {
      setCurrentScreen('IDENTIFICATION');
      setSelectedPnr(null);
      setIdentName('');
      setIdentPnr('');
      setIdentFlight('');
      setBagPcs('0');
      setBagKg('0');
  };
  
  const handleBack = () => {
      if (currentScreen === 'SEAT_MAP' || currentScreen === 'BAGGAGE') {
          setCurrentScreen('ACCEPTANCE');
      } else if (currentScreen === 'ACCEPTANCE') {
          handleRestart();
      }
  };

  const handleFqtv = () => {
      setShowFqtvModal(true);
  };

  const openDocVerifyModal = () => {
      if (!foundPassenger) return;
      if (isFlightClosed) {
          alert('FLIGHT CLOSED - EDITING DISABLED');
          return;
      }
      setDocVerifyStatus(foundPassenger.documentVerifyStatus || 'PENDING');
      setDocVerifyNote(foundPassenger.documentVerifyNote || '');
      setShowDocVerifyModal(true);
  };

  const openBagWaiverModal = () => {
      if (!foundPassenger) return;
      if (isFlightClosed) {
          alert('FLIGHT CLOSED - EDITING DISABLED');
          return;
      }
      setBagWaiverPcs(foundPassenger.bagWaiverPcs || 0);
      setBagWaiverKg(foundPassenger.bagWaiverKg || 0);
      setBagWaiverReason(foundPassenger.bagWaiverReason || '');
      setShowBagWaiverModal(true);
  };

  const handleCancelCheckIn = () => {
      if (isFlightClosed) {
          alert('FLIGHT CLOSED - EDITING DISABLED');
          return;
      }
      if (foundPassenger && foundPassenger.status === 'CHECKED_IN') {
          if (confirm(`Cancel check-in for ${foundPassenger.lastName} ${foundPassenger.firstName} (${foundPassenger.pnr})?`)) {
              const success = cancelCheckIn(foundPassenger.pnr);
              if (success) {
                  alert('CHECK-IN CANCELLED');
                  setCurrentScreen('ACCEPTANCE');
              }
          }
      } else {
          alert('Passenger is not checked in');
      }
  };

  const handleIdentify = () => {
    const term = (identPnr || identName).toUpperCase();
    const match = passengersForDate.find(p => p.pnr === term || p.lastName === term);
    
    if (match) {
      setSelectedPnr(match.pnr);
      setBagPcs(match.bagCount.toString());
      setBagKg((match.bagCount * 23).toString());
      setCurrentScreen('ACCEPTANCE');
    } else {
      alert('PASSENGER NOT FOUND');
    }
  };

  const handleAccept = async () => {
    if (isFlightClosed) {
      alert('FLIGHT CLOSED - EDITING DISABLED');
      return;
    }
    if (foundPassenger && foundPassenger.status === 'BOOKED') {
      updatePassengerDetails(foundPassenger.pnr, { 
        bagCount: parseInt(bagPcs), 
        hasBags: parseInt(bagPcs) > 0 
      });
      await checkInPassenger(foundPassenger.pnr);
      alert('PASSENGER ACCEPTED');
      setCurrentScreen('IDENTIFICATION');
      setIdentName('');
      setIdentPnr('');
      setSelectedPnr(null);
    }
  };
  
  const handleSeatChange = async (newSeat: string, passengerId?: string) => {
      if (isFlightClosed) {
          alert('FLIGHT CLOSED - EDITING DISABLED');
          return;
      }
      
      // Use selected passenger for seat assignment, or fall back to foundPassenger
      const targetPassengerId = passengerId || selectedPassengerForSeat || foundPassenger?.id;
      const targetPassenger = targetPassengerId 
          ? passengers.find(p => p.id === targetPassengerId)
          : foundPassenger;
      
      if (targetPassenger) {
          const oldSeat = targetPassenger.seat;
          updatePassengerDetails(targetPassenger.pnr, { seat: newSeat }, targetPassengerId);
          setCurrentScreen('ACCEPTANCE');
          
          // Send email notification about seat change
          const passengerEmail = emails.find((e: any) => e.pnr === targetPassenger.pnr)?.to || '';
          const targetFlight = flights.find(f => f.id === targetPassenger.flightId);
          if (passengerEmail && targetFlight) {
              try {
                  const seatChangeHtml = `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                          <h2 style="color: #2B4E71;">Seat Assignment Update</h2>
                          <p>Dear ${targetPassenger.firstName} ${targetPassenger.lastName},</p>
                          <p>Your seat assignment has been updated for flight ${targetFlight.flightNumber}.</p>
                          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                              <p><strong>Previous Seat:</strong> ${oldSeat || 'Not assigned'}</p>
                              <p><strong>New Seat:</strong> ${newSeat}</p>
                              <p><strong>Flight:</strong> ${targetFlight.flightNumber}</p>
                              <p><strong>Route:</strong> ${targetFlight.origin} → ${targetFlight.destination}</p>
                              <p><strong>Date:</strong> ${targetFlight.date ? new Date(targetFlight.date).toLocaleDateString() : 'TBA'}</p>
                              <p><strong>Departure Time:</strong> ${targetFlight.std}</p>
                              <p><strong>Gate:</strong> ${targetFlight.gate || 'TBA'}</p>
                          </div>
                          <p>Please check in at the airport with your updated seat assignment.</p>
                          <p>Thank you for choosing airBaltic.</p>
                      </div>
                  `;
                  
                  await sendEmailConfirmation(
                      targetPassenger.pnr,
                      passengerEmail,
                      `Seat Assignment Update - ${targetFlight.flightNumber}`,
                      `Your seat has been changed to ${newSeat} for flight ${targetFlight.flightNumber}`,
                      seatChangeHtml
                  );
                  addLog(`Seat change email sent to ${passengerEmail} for ${targetPassenger.pnr}`, 'CHECK_IN', 'SUCCESS');
              } catch (error) {
                  console.error('Error sending seat change email:', error);
                  addLog(`Failed to send seat change email for ${targetPassenger.pnr}`, 'CHECK_IN', 'ERROR');
              }
          }
      }
  };

  // Simulate document swipe
  const swipeDocument = () => {
    if (foundPassenger) {
       const countries = ['GBR', 'USA', 'DEU', 'FRA', 'ITA', 'ESP'];
       const randomCountry = countries[Math.floor(Math.random() * countries.length)];
       const randomNum = Math.floor(Math.random() * 1000000000).toString();
       updatePassengerDetails(foundPassenger.pnr, {
          passportNumber: randomNum,
          nationality: randomCountry,
          expiryDate: '2030-01-01'
       });
    }
  };
  
  // New handlers
  const handleSetSby = () => {
    if (foundPassenger) {
      updatePassengerDetails(foundPassenger.pnr, { passengerType: 'STAFF_SBY' });
      addLog(`Set SBY status for ${foundPassenger.lastName} ${foundPassenger.firstName} (${foundPassenger.pnr})`, 'CHECK_IN');
      setShowSbyModal(false);
      alert('SBY STATUS SET');
    }
  };
  
  const handleSaveComment = () => {
    if (foundPassenger) {
      const comment = (document.getElementById('comment-text') as HTMLTextAreaElement)?.value || '';
      updatePassengerDetails(foundPassenger.pnr, { boardingComment: comment || undefined });
      addLog(`Added comment for ${foundPassenger.lastName} ${foundPassenger.firstName} (${foundPassenger.pnr})`, 'CHECK_IN');
      setShowCommentModal(false);
      alert('COMMENT SAVED');
    }
  };

  const handleSaveDocVerify = () => {
    if (!foundPassenger) return;
    if (isFlightClosed) {
      alert('FLIGHT CLOSED - EDITING DISABLED');
      return;
    }
    updatePassengerDetails(foundPassenger.pnr, {
      documentVerifyStatus: docVerifyStatus,
      documentVerifyNote: docVerifyNote || undefined,
      documentVerifyDate: new Date().toISOString()
    });
    addLog(
      `Document verification ${docVerifyStatus.toLowerCase()} for ${foundPassenger.lastName} ${foundPassenger.firstName} (${foundPassenger.pnr})${docVerifyNote ? ` - ${docVerifyNote}` : ''}`,
      'CHECK_IN'
    );
    setShowDocVerifyModal(false);
    alert('DOCUMENT STATUS SAVED');
  };

  const handleSaveBagWaiver = () => {
    if (!foundPassenger) return;
    if (isFlightClosed) {
      alert('FLIGHT CLOSED - EDITING DISABLED');
      return;
    }
    const pcs = Math.max(0, Number(bagWaiverPcs) || 0);
    const kg = Math.max(0, Number(bagWaiverKg) || 0);
    const reason = bagWaiverReason.trim();
    const hasWaiver = pcs > 0 || kg > 0 || reason.length > 0;

    updatePassengerDetails(foundPassenger.pnr, {
      bagWaiverPcs: pcs > 0 ? pcs : undefined,
      bagWaiverKg: kg > 0 ? kg : undefined,
      bagWaiverReason: reason || undefined
    });

    addLog(
      hasWaiver
        ? `Bag waiver set for ${foundPassenger.lastName} ${foundPassenger.firstName} (${foundPassenger.pnr}) - ${pcs} pcs / ${kg} kg${reason ? ` - ${reason}` : ''}`
        : `Bag waiver cleared for ${foundPassenger.lastName} ${foundPassenger.firstName} (${foundPassenger.pnr})`,
      'CHECK_IN'
    );

    setShowBagWaiverModal(false);
    alert(hasWaiver ? 'BAG WAIVER SAVED' : 'BAG WAIVER CLEARED');
  };
  
  const handleProcessPayment = async () => {
    if (isFlightClosed) {
      alert('FLIGHT CLOSED - EDITING DISABLED');
      return;
    }
    if (foundPassenger && paymentAmount > 0) {
      // If card payment, show processing emulator
      if (paymentMethod === 'CARD') {
        if (!cardNumber || !cardExpiry || !cardCvv) {
          alert('Please enter card details');
          return;
        }
        setShowCardProcessing(true);
        // Simulate card processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        setShowCardProcessing(false);
      }
      
      // Generate receipt
      const receiptNumber = `RCP-${Date.now()}`;
      const transactionId = paymentMethod === 'CARD' ? `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : undefined;
      const receiptDate = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      
      // Find passenger email from previous emails
      const passengerEmail = emails.find((e: any) => e.pnr === foundPassenger.pnr)?.to || '';
      
      // Prepare receipt items - combine ticket and services
      const receiptItems: Array<{description: string; quantity: number; unitPrice: number; total: number}> = [];
      if (ticketPrice > 0) {
        receiptItems.push({
          description: 'Ticket',
          quantity: 1,
          unitPrice: ticketPrice,
          total: ticketPrice
        });
      }
      if (paymentItems.length > 0) {
        receiptItems.push(...paymentItems);
      }
      if (receiptItems.length === 0) {
        receiptItems.push({
          description: 'Service Payment',
          quantity: 1,
          unitPrice: paymentAmount,
          total: paymentAmount
        });
      }
      
      const subtotal = receiptItems.reduce((sum, item) => sum + item.total, 0);
      
      // Generate receipt HTML
      const { generateReceiptHtml } = await import('../services/mailgun-receipt');
      const receiptHtml = generateReceiptHtml({
        passengerName: `${foundPassenger.lastName} ${foundPassenger.firstName}`,
        pnr: foundPassenger.pnr,
        receiptNumber,
        date: receiptDate,
        items: receiptItems,
        subtotal: subtotal,
        tax: 0,
        total: paymentAmount,
        currency: 'EUR',
        paymentMethod,
        transactionId
      });
      
      // Send receipt email
      if (passengerEmail) {
        await sendEmailConfirmation(
          foundPassenger.pnr,
          passengerEmail,
          `Payment Receipt - ${receiptNumber}`,
          `Payment receipt for ${foundPassenger.lastName} ${foundPassenger.firstName}`,
          receiptHtml
        );
      }
      
      const totalPaid = paymentAmount;
      const servicesTotal = paymentItems.reduce((sum, item) => sum + item.total, 0);
      const ticketTotal = ticketPrice;
      
      addLog(`Payment processed: ${paymentMethod} - ${totalPaid.toFixed(2)} EUR (Ticket: ${ticketTotal.toFixed(2)} EUR, Services: ${servicesTotal.toFixed(2)} EUR) for ${foundPassenger.lastName} ${foundPassenger.firstName} (${foundPassenger.pnr})`, 'CHECK_IN');
      setShowPaymentModal(false);
      setPaymentAmount(0);
      setTicketPrice(0);
      setPaymentItems([]);
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      alert(`PAYMENT PROCESSED: ${totalPaid.toFixed(2)} EUR via ${paymentMethod}${passengerEmail ? ' - Receipt sent to email' : ''}`);
    }
  };
  
  const handleSaveServices = () => {
    if (isFlightClosed) {
      alert('FLIGHT CLOSED - EDITING DISABLED');
      return;
    }
    if (foundPassenger) {
      const updates: any = {};
      const newPaymentItems: Array<{description: string; quantity: number; unitPrice: number; total: number}> = [];
      let totalDue = 0;
      
      // Calculate costs and prepare payment items
      if (extraBags > 0) {
        const bagPrice = 25; // EUR per bag
        const bagTotal = extraBags * bagPrice;
        newPaymentItems.push({
          description: `Extra Baggage (${extraBags} PC)`,
          quantity: extraBags,
          unitPrice: bagPrice,
          total: bagTotal
        });
        totalDue += bagTotal;
        
        updates.bagCount = foundPassenger.bagCount + extraBags;
        updates.hasBags = true;
        (updates as any).paidBags = ((foundPassenger as any).paidBags || 0) + extraBags; // Track paid bags
        addLog(`Added ${extraBags} extra bag(s) for ${foundPassenger.lastName} ${foundPassenger.firstName} (${foundPassenger.pnr})`, 'CHECK_IN');
      }
      if (loungeAccess) {
        const loungePrice = 30; // EUR
        newPaymentItems.push({
          description: 'Lounge Access',
          quantity: 1,
          unitPrice: loungePrice,
          total: loungePrice
        });
        totalDue += loungePrice;
        
        updates.loungeAccess = true;
        addLog(`Lounge access granted for ${foundPassenger.lastName} ${foundPassenger.firstName} (${foundPassenger.pnr})`, 'CHECK_IN');
      }
      if (upgradeClass) {
        let upgradePrice = 0;
        let upgradeDescription = '';
        if (upgradeClass === 'BUSINESS') {
          upgradePrice = 100;
          upgradeDescription = 'Upgrade to Business Class';
        } else if (upgradeClass === 'FIRST') {
          upgradePrice = 200;
          upgradeDescription = 'Upgrade to First Class';
        } else if (upgradeClass === 'PREMIUM_ECONOMY') {
          upgradePrice = 50;
          upgradeDescription = 'Upgrade to Premium Economy';
        }
        
        if (upgradePrice > 0) {
          newPaymentItems.push({
            description: upgradeDescription,
            quantity: 1,
            unitPrice: upgradePrice,
            total: upgradePrice
          });
          totalDue += upgradePrice;
        }
        
        // Convert upgrade class to J or Y format
        const classCode = upgradeClass === 'BUSINESS' || upgradeClass === 'FIRST' ? 'J' : 'Y';
        upgradePassenger(foundPassenger.pnr, classCode);
        updates.upgraded = true; // Track upgrade
        addLog(`Upgraded ${foundPassenger.lastName} ${foundPassenger.firstName} (${foundPassenger.pnr}) to ${upgradeClass}`, 'CHECK_IN');
      }
      
      // Apply updates
      if (Object.keys(updates).length > 0) {
        updatePassengerDetails(foundPassenger.pnr, updates);
      }
      
      // Add payment items and update payment amount
      if (newPaymentItems.length > 0) {
        setPaymentItems(prev => [...prev, ...newPaymentItems]);
        setPaymentAmount(prev => prev + totalDue);
      }
      
      setShowServicesModal(false);
      setExtraBags(0);
      setLoungeAccess(false);
      setUpgradeClass('');
      
      if (totalDue > 0) {
        alert(`SERVICES APPLIED - PAYMENT DUE: ${totalDue.toFixed(2)} EUR`);
        // Automatically open payment modal
        setShowPaymentModal(true);
      } else {
        alert('SERVICES APPLIED');
      }
    }
  };
  
  // Get passenger logs
  const passengerLogs = foundPassenger 
    ? logs.filter((log) => log.message?.includes(foundPassenger.pnr))
    : [];

  return (
    <div className="h-full w-full bg-[#FDFBF7] text-xs font-sans flex flex-col select-none text-gray-800">
      
      {/* Top Tab Bar */}
      <div className="bg-[#EBE9E3] border-b border-[#A0A0A0] h-8 flex items-end px-2 pt-1 shadow-sm">
        <Tab 
          label="Customer Identification" 
          active={currentScreen === 'IDENTIFICATION'} 
          onClick={() => setCurrentScreen('IDENTIFICATION')} 
          first
        />
        <Tab 
          label="Customer Selection" 
          active={currentScreen === 'SELECTION'} 
          onClick={() => setCurrentScreen('SELECTION')} 
        />
        <Tab 
          label="Customer Acceptance" 
          active={currentScreen === 'ACCEPTANCE'} 
          onClick={() => setCurrentScreen('ACCEPTANCE')} 
        />
        <Tab 
          label="Acceptance Information" 
          active={false} 
          onClick={() => {}} 
        />
        <Tab 
          label="Baggage" 
          active={currentScreen === 'BAGGAGE'} 
          onClick={() => setCurrentScreen('BAGGAGE')} 
        />
        <Tab 
          label="Seat Change" 
          active={currentScreen === 'SEAT_MAP'} 
          onClick={() => setCurrentScreen('SEAT_MAP')} 
        />
      </div>

      {/* Flight Info Bar */}
      <HeaderInfo flight={foundFlight} gate={foundFlight?.gate} />

      {/* Main Content Area */}
      <div className="flex-1 p-2 overflow-hidden flex relative">
      
        {/* Left Sidebar Menu */}
        <div className="w-48 bg-[#F0F0F0] border-r border-[#A0A0A0] flex flex-col text-[11px] select-none mr-2">
            <div className="bg-gradient-to-b from-[#EBE9E3] to-[#D4D0C8] px-2 py-1 font-bold border-b border-white text-gray-700">Shortcuts</div>
            <div className="p-2 space-y-1">
                <div className="flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer"><span>Create Record</span><span className="text-gray-400">F8</span></div>
            </div>
            
            <div className="bg-gradient-to-b from-[#EBE9E3] to-[#D4D0C8] px-2 py-1 font-bold border-b border-white border-t border-[#A0A0A0] text-gray-700">Menus</div>
            <div className="p-2 space-y-1">
                <button disabled={!isPassengerEditable} onClick={() => setShowSbyModal(true)} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>Set SBY Status</span></button>
                <button 
                    disabled={!isPassengerEditable} 
                    onClick={() => {
                        if (isFlightClosed) {
                            alert('FLIGHT CLOSED - EDITING DISABLED');
                            return;
                        }
                        if (foundPassenger) {
                            if (confirm(`Set seat to SBY (Standby) for ${foundPassenger.lastName} ${foundPassenger.firstName}?`)) {
                                handleSeatChange('SBY');
                                alert('Seat set to SBY');
                            }
                        }
                    }} 
                    className="w-full text-left flex justify-between hover:bg-orange-500 hover:text-white px-1 cursor-pointer disabled:text-gray-400"
                >
                    <span className="font-bold text-orange-600">Set SBY Seat</span>
                </button>
                <button disabled={!isPassengerEditable} onClick={() => setShowCommentModal(true)} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>Add Comment</span></button>
                <button disabled={!foundPassenger} onClick={() => setShowLogsModal(true)} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>View Logs</span></button>
                <button disabled={!isPassengerEditable} onClick={openDocVerifyModal} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>Document Verify</span></button>
                <button disabled={!isPassengerEditable} onClick={openBagWaiverModal} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>Bag Waiver</span></button>
                <button disabled={!isPassengerEditable} onClick={() => setShowPaymentModal(true)} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>Price & Payment</span></button>
                <button disabled={!isPassengerEditable} onClick={() => setShowServicesModal(true)} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>Services</span></button>
                <div className="h-px bg-gray-300 my-1"></div>
                <button disabled={!isPassengerEditable} onClick={handleUpgrade} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>Upgrade Class</span><span className="text-gray-400">SF4</span></button>
                <button disabled={!isPassengerEditable} onClick={handleDowngrade} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>Downgrade Class</span></button>
                <button disabled={!isPassengerEditable} onClick={handleFqtv} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>Add FQTV</span></button>
                <button disabled={!isPassengerEditable} onClick={handleBaggage} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>Baggage</span></button>
                <button disabled={!foundPassenger} onClick={handlePrint} className="w-full text-left flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span>Print BP/Tags</span><span className="text-gray-400">P</span></button>
                <button disabled={!isPassengerEditable || foundPassenger?.status !== 'CHECKED_IN'} onClick={handleCancelCheckIn} className="w-full text-left flex justify-between hover:bg-[#DC3545] hover:text-white px-1 cursor-pointer disabled:text-gray-400"><span className="text-red-600">Cancel Check-In</span></button>
            </div>
            
            <div className="bg-gradient-to-b from-[#EBE9E3] to-[#D4D0C8] px-2 py-1 font-bold border-b border-white border-t border-[#A0A0A0] text-gray-700">System</div>
            <div className="p-2 space-y-1">
                <button onClick={handleRestart} className="w-full flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer"><span className="text-blue-800">Restart</span><span className="text-orange-400">SF12</span></button>
                <button onClick={handleBack} className="w-full flex justify-between hover:bg-[#316AC5] hover:text-white px-1 cursor-pointer"><span className="text-gray-700">Back</span><span className="text-gray-400">ESC</span></button>
            </div>
        </div>
        
        {/* Right Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Screen: IDENTIFICATION */}
        {currentScreen === 'IDENTIFICATION' && (
          <div className="flex flex-col gap-4 h-full">
            
            {/* Identify Customer By Panel */}
            <div className="border border-[#7F9DB9] rounded-t-md bg-[#FFFBE6]">
              <div className="bg-gradient-to-r from-[#4A6984] to-[#2B4E71] px-2 py-1 text-white font-bold flex justify-between items-center">
                <span>Customer Identification</span>
                <div className="w-4 h-4 bg-[#FF9900] rounded-full border border-white shadow-inner" />
              </div>
              
              <div className="p-4 space-y-4">
                 <div className="flex items-center gap-2 text-blue-800 bg-blue-50 p-2 border border-blue-200 rounded">
                    <div className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">i</div>
                    Swipe a document or enter details. All fields are optional.
                 </div>

                 <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-2 text-right pt-1 font-bold text-gray-600">Identify Customer by</div>
                    <div className="col-span-10 space-y-2">
                        <div className="flex gap-2 items-center">
                            <label className="w-32 text-right font-bold text-gray-800">Customer Name(s):</label>
                            <LegacyInput value={identName} onChange={(e: any) => setIdentName(e.target.value)} width="w-64" />
                            <div className="text-gray-600 text-[10px] ml-2 font-bold">Or</div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="w-32 text-right font-bold text-gray-800">Seat/Security Nbr:</label>
                            <LegacyInput width="w-32" />
                            <label className="ml-4 font-bold text-gray-800">FQTV Number:</label>
                            <LegacyInput width="w-32" />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="w-32 text-right font-bold text-gray-800">PNR Record:</label>
                            <LegacyInput value={identPnr} onChange={(e: any) => setIdentPnr(e.target.value.toUpperCase())} width="w-32" />
                        </div>
                    </div>
                 </div>

                 <div className="h-px bg-[#D4D0C8] my-2" />

                 <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-2 text-right pt-1 font-bold text-gray-600">Flight</div>
                    <div className="col-span-10 flex gap-4 items-center">
                        <label className="font-bold text-gray-800">Flight Number:</label>
                        <div className="flex gap-1">
                            <LegacyInput value={identFlightPrefix} onChange={(e: any) => setIdentFlightPrefix(e.target.value.toUpperCase())} width="w-12" />
                            <LegacyInput value={identFlight} onChange={(e: any) => setIdentFlight(e.target.value)} width="w-20" />
                        </div>
                        <label className="font-bold text-gray-800">Date:</label>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="h-6 border border-[#7F9DB9] bg-white px-1 text-xs outline-none focus:border-blue-500 w-28"
                        />
                        <label className="font-bold text-gray-800">From:</label>
                        <LegacyInput value="RIX" width="w-16" readOnly />
                        <label className="font-bold text-gray-800">To:</label>
                        <LegacyInput width="w-16" />
                    </div>
                 </div>
              </div>
              
              <div className="bg-[#F0F0F0] p-2 border-t border-[#7F9DB9] flex justify-end gap-2">
                 <LegacyButton>Basic Options [F2]</LegacyButton>
                 <LegacyButton primary onClick={handleIdentify}>Identify</LegacyButton>
              </div>
            </div>

            <div className="flex-1 bg-white border border-[#7F9DB9] p-4 flex items-center justify-center text-gray-300">
                NO ACTIVE SESSION
            </div>
          </div>
        )}

        {/* Screen: ACCEPTANCE (Combined Selection & Acceptance for simplicity) */}
        {currentScreen === 'ACCEPTANCE' && foundPassenger && (
          <div className="flex flex-col h-full gap-2">
             
             {/* Passenger List Table */}
             <div className="flex-1 border border-[#7F9DB9] bg-white overflow-auto relative">
                <table className="w-full border-collapse text-[11px]">
                   <thead className="bg-[#EBE9E3] sticky top-0 z-10">
                      <tr className="border-b border-[#A0A0A0]">
                         <th className="text-left px-2 py-1 border-r border-gray-300">Customer</th>
                         <th className="text-left px-2 py-1 border-r border-gray-300">Flight</th>
                         <th className="text-left px-2 py-1 border-r border-gray-300">Route</th>
                         <th className="text-left px-2 py-1 border-r border-gray-300">Tkt</th>
                         <th className="text-left px-2 py-1 border-r border-gray-300">Cls</th>
                         <th className="text-left px-2 py-1 border-r border-gray-300">Seat</th>
                         <th className="text-center px-2 py-1 border-r border-gray-300 w-8">Ck</th>
                         <th className="text-center px-2 py-1 w-8">Bag</th>
                      </tr>
                   </thead>
                   <tbody>
                      {sortedSegments.map((seg, index) => {
                        // Check if this is a new passenger (different firstName/lastName from previous)
                        const isNewPassenger = index === 0 || 
                          sortedSegments[index - 1].passenger.firstName !== seg.passenger.firstName ||
                          sortedSegments[index - 1].passenger.lastName !== seg.passenger.lastName;
                        
                        return (
                        <tr key={seg.passenger.id} className="bg-[#FFF2CC] border-b border-[#D4D0C8]">
                           <td className="px-2 py-1 font-bold whitespace-nowrap">
                              {isNewPassenger ? (
                                <div className="flex items-center gap-2">
                                  <span>{seg.passenger.lastName} {seg.passenger.firstName} {seg.passenger.title || 'MR'}</span>
                                  {seg.passenger.passengerType === 'STAFF_DUTY' && (
                                    <span className="bg-yellow-500 text-yellow-900 px-1.5 py-0.5 rounded text-[9px] font-bold border border-yellow-600">DUTY</span>
                                  )}
                                  {seg.passenger.passengerType === 'STAFF_SBY' && (
                                    <span className="bg-orange-500 text-orange-900 px-1.5 py-0.5 rounded text-[9px] font-bold border border-orange-600">SBY</span>
                                  )}
                                  {(seg.passenger as any).upgraded && (
                                    <span className="bg-purple-500 text-purple-900 px-1.5 py-0.5 rounded text-[9px] font-bold border border-purple-600">UPG</span>
                                  )}
                                  {seg.passenger.documentVerifyStatus === 'VERIFIED' && (
                                    <span className="bg-green-500 text-green-900 px-1.5 py-0.5 rounded text-[9px] font-bold border border-green-600">DOC</span>
                                  )}
                                  {(seg.passenger.bagWaiverPcs || seg.passenger.bagWaiverKg) && (
                                    <span className="bg-blue-500 text-blue-900 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-600">WVR</span>
                                  )}
                                  {seg.flight && ['DEPARTED', 'ARRIVED'].includes(seg.flight.status) && (
                                    <span className="bg-gray-700 text-gray-100 px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-800">FLOWN</span>
                                  )}
                                </div>
                              ) : ''}
                           </td>
                           <td className="px-2 py-1 flex items-center gap-1">
                              <Plane size={10} className="text-gray-500 transform rotate-45" />
                              {seg.flight?.flightNumber}
                           </td>
                           <td className="px-2 py-1">
                              {seg.flight ? `${seg.flight.origin}-${seg.flight.destination}` : '---'}
                           </td>
                           <td className="px-2 py-1">
                              <div className="w-4 h-4 rounded-full border border-blue-400 text-blue-600 flex items-center justify-center text-[8px] font-bold bg-white">e</div>
                           </td>
                           <td className="px-2 py-1">Y</td>
                           <td className="px-2 py-1 font-bold text-blue-800">{seg.passenger.seat}</td>
                           <td className="px-2 py-1 text-center">
                              {seg.passenger.status === 'CHECKED_IN' || seg.passenger.status === 'BOARDED' ? (
                                <Check size={14} className="text-green-600 mx-auto font-bold" strokeWidth={4} />
                              ) : (
                                <div className="w-3 h-3 border border-gray-400 mx-auto" />
                              )}
                           </td>
                           <td className="px-2 py-1 text-center">
                              {seg.passenger.bagCount > 0 && (
                                <div className="relative inline-block">
                                   <Luggage size={14} className="text-gray-600" />
                                   <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] px-0.5 rounded-full leading-none">
                                     {seg.passenger.bagCount}
                                   </span>
                                </div>
                              )}
                           </td>
                        </tr>
                        );
                      })}
                   </tbody>
                </table>
             </div>

             {/* Action Panel */}
             <div className="h-48 bg-[#FFFBE6] border border-[#7F9DB9] p-2 flex flex-col justify-between">
                
                <div className="flex items-center gap-2 bg-blue-50 p-1 border border-blue-200 mb-2">
                    <div className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">i</div>
                    <span className="text-blue-800">Enter bag details and seat preference (if required).</span>
                    {isFlightClosed && (
                      <span className="ml-auto text-red-600 font-bold text-[10px]">FLIGHT CLOSED - READ ONLY</span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-8 px-4">
                    <div className="border-t border-[#D4D0C8] pt-2 relative">
                        <span className="absolute -top-2.5 left-0 bg-[#FFFBE6] px-1 font-bold text-gray-600">Baggage</span>
                        <div className="flex items-center gap-2 mt-2">
                            <label>Hold Baggage:</label>
                            <input 
                              type="number" 
                              value={bagPcs} 
                              onChange={(e) => setBagPcs(e.target.value)}
                              className="w-8 border border-[#7F9DB9] px-1 text-right disabled:bg-gray-100 disabled:text-gray-500" 
                              disabled={isFlightClosed}
                            />
                            <span>/</span>
                            <input 
                              type="number" 
                              value={bagKg} 
                              onChange={(e) => setBagKg(e.target.value)}
                              className="w-10 border border-[#7F9DB9] px-1 text-right disabled:bg-gray-100 disabled:text-gray-500" 
                              disabled={isFlightClosed}
                            />
                            <span>KG</span>
                        </div>
                    </div>

                    <div className="border-t border-[#D4D0C8] pt-2 relative">
                        <span className="absolute -top-2.5 left-0 bg-[#FFFBE6] px-1 font-bold text-gray-600">Seating</span>
                        <div className="mt-2 space-y-2">
                            {/* Passenger selector if multiple passengers */}
                            {passengerSegments.length > 1 && (
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold">Select Passenger:</label>
                                    <select
                                        value={selectedPassengerForSeat || foundPassenger?.id || ''}
                                        onChange={(e) => setSelectedPassengerForSeat(e.target.value || null)}
                                        className="border border-[#7F9DB9] px-2 py-1 text-[10px] bg-white disabled:bg-gray-100 disabled:text-gray-500"
                                        disabled={isFlightClosed}
                                    >
                                        {passengerSegments.map((p) => {
                                            const pFlight = flightsForDate.find(f => f.id === p.flightId);
                                            return (
                                                <option key={p.id} value={p.id}>
                                                    {p.lastName} {p.firstName} - {pFlight?.flightNumber || 'N/A'} ({p.seat || 'No seat'})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <label>Seat Preference:</label>
                                <LegacyInput 
                                    width="w-24" 
                                    value={selectedPassengerForSeat 
                                        ? (passengers.find(p => p.id === selectedPassengerForSeat)?.seat || '')
                                        : (foundPassenger?.seat || '')
                                    }
                                    readOnly={isFlightClosed} 
                                />
                                <button 
                                    onClick={() => {
                                        const targetPassengerId = selectedPassengerForSeat || foundPassenger?.id;
                                        if (targetPassengerId) {
                                            setSelectedPassengerForSeat(targetPassengerId);
                                            setCurrentScreen('SEAT_MAP');
                                        }
                                    }}
                                    className="bg-[#E0E0E0] border border-gray-400 px-2 rounded text-[10px] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isFlightClosed}
                                >
                                    Map
                                </button>
                                <button 
                                    onClick={() => {
                                        if (isFlightClosed) {
                                            alert('FLIGHT CLOSED - EDITING DISABLED');
                                            return;
                                        }
                                        const targetPassenger = selectedPassengerForSeat 
                                            ? passengers.find(p => p.id === selectedPassengerForSeat)
                                            : foundPassenger;
                                        if (targetPassenger) {
                                            if (confirm(`Set seat to SBY (Standby) for ${targetPassenger.lastName} ${targetPassenger.firstName}?`)) {
                                                handleSeatChange('SBY', selectedPassengerForSeat || undefined);
                                                alert('Seat set to SBY');
                                            }
                                        }
                                    }}
                                    className="bg-orange-200 border border-orange-400 px-2 rounded text-[10px] hover:bg-orange-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-orange-800"
                                    disabled={isFlightClosed}
                                >
                                    Set SBY
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Document Info (Simulated) */}
                <div className="mt-2 border p-2 bg-white text-[10px] font-mono h-16 overflow-y-auto">
                    {foundPassenger.passportNumber ? (
                        <div className="text-green-700">
                            DOCS OK: {foundPassenger.passportNumber} ({foundPassenger.nationality}) EXP:{foundPassenger.expiryDate}
                        </div>
                    ) : (
                        <div className="text-red-500 flex justify-between items-center">
                            <span>MISSING TRAVEL DOCUMENTS</span>
                            <button onClick={swipeDocument} disabled={isFlightClosed} className="underline text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:no-underline">
                                [Simulate Swipe]
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-2">
                    <LegacyButton>Advanced Options [F2]</LegacyButton>
                    <LegacyButton onClick={() => setCurrentScreen('IDENTIFICATION')}>Back</LegacyButton>
                    <LegacyButton primary onClick={handleAccept} disabled={isFlightClosed}>
                        {foundPassenger.status === 'CHECKED_IN' ? 'Modify' : 'Accept'}
                    </LegacyButton>
                </div>
             </div>
          </div>
        )}

        {/* Screen: BAGGAGE */}
        {currentScreen === 'BAGGAGE' && foundPassenger && (
          <div className="flex flex-col h-full gap-2">
             {/* Bag List Table */}
             <div className="flex-1 border border-[#7F9DB9] bg-white overflow-auto relative">
                <table className="w-full border-collapse text-[11px]">
                   <thead className="bg-[#EBE9E3] sticky top-0 z-10">
                      <tr className="border-b border-[#A0A0A0]">
                         <th className="text-left px-2 py-1 border-r border-gray-300">Tag Number</th>
                         <th className="text-left px-2 py-1 border-r border-gray-300">Type</th>
                         <th className="text-left px-2 py-1 border-r border-gray-300">Weight</th>
                         <th className="text-left px-2 py-1 border-r border-gray-300">Status</th>
                         <th className="text-left px-2 py-1 border-r border-gray-300">Destination</th>
                         <th className="text-right px-2 py-1 w-16">Action</th>
                      </tr>
                   </thead>
                   <tbody>
                      {Array.from({ length: foundPassenger.bagCount }).map((_, i) => {
                        const weightKey = `${foundPassenger.pnr}-${i}`;
                        const currentWeight = customBagWeights[weightKey] || 23;
                        
                        return (
                        <tr key={i} className="bg-white border-b border-[#D4D0C8]">
                           <td className="px-2 py-1 font-mono">00BT{foundPassenger.pnr}{i + 1}</td>
                           <td className="px-2 py-1">Check-in</td>
                           <td className="px-2 py-1 font-bold text-blue-800">
                              {editingBagIndex === i ? (
                                <div className="flex items-center gap-1">
                                   <input 
                                     type="number" 
                                     value={editWeight} 
                                     onChange={(e) => setEditWeight(e.target.value)}
                                     className="w-12 border border-blue-500 px-1 text-right disabled:bg-gray-100 disabled:text-gray-500"
                                     disabled={isFlightClosed}
                                     autoFocus
                                   />
                                   <span className="text-xs">KG</span>
                                </div>
                              ) : (
                                <span>{currentWeight} KG</span>
                              )}
                           </td>
                           <td className="px-2 py-1 text-green-600">ACCEPTED</td>
                           <td className="px-2 py-1 font-bold">{foundFlight?.destination}</td>
                           <td className="px-2 py-1 text-right">
                              {editingBagIndex === i ? (
                                <LegacyButton primary disabled={isFlightClosed} onClick={() => {
                                   setCustomBagWeights(prev => ({ ...prev, [weightKey]: parseFloat(editWeight) || 0 }));
                                   setEditingBagIndex(null);
                                }}>Save</LegacyButton>
                              ) : (
                                <LegacyButton disabled={isFlightClosed} onClick={() => {
                                   setEditingBagIndex(i);
                                   setEditWeight(currentWeight.toString());
                                }}>Edit</LegacyButton>
                              )}
                           </td>
                        </tr>
                      )})}
                      {foundPassenger.bagCount === 0 && (
                         <tr>
                            <td colSpan={6} className="text-center py-8 text-gray-400 italic">No bags checked in</td>
                         </tr>
                      )}
                   </tbody>
                </table>
             </div>

             {/* Action Panel */}
             <div className="bg-[#FFFBE6] border border-[#7F9DB9] p-2">
                <div className="flex items-center gap-2 mb-4">
                    <span className="font-bold text-gray-700">Total Bags: {foundPassenger.bagCount}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span className="font-bold text-gray-700">
                       Total Weight: {Array.from({ length: foundPassenger.bagCount }).reduce((acc: number, _, i) => acc + (customBagWeights[`${foundPassenger.pnr}-${i}`] || 23), 0)} KG
                    </span>
                </div>
                
                <div className="flex gap-2">
                    <LegacyButton primary disabled={isFlightClosed} onClick={() => {
                      const paidBags = (foundPassenger as any).paidBags || 0;
                      const currentBags = foundPassenger.bagCount;
                      const newBagCount = currentBags + 1;
                      updatePassengerDetails(foundPassenger.pnr, { 
                        bagCount: newBagCount,
                        hasBags: newBagCount > 0
                      });
                      if (paidBags > 0 && newBagCount <= paidBags) {
                        alert(`Adding paid bag ${newBagCount} of ${paidBags}`);
                      }
                    }}>
                       + Add Bag (23KG){(foundPassenger as any).paidBags ? ` [${foundPassenger.bagCount + 1}/${(foundPassenger as any).paidBags} paid]` : ''}
                    </LegacyButton>
                    <LegacyButton onClick={() => updatePassengerDetails(foundPassenger.pnr, { bagCount: Math.max(0, foundPassenger.bagCount - 1) })} disabled={isFlightClosed || foundPassenger.bagCount === 0}>
                       - Remove Bag
                    </LegacyButton>
                    <div className="w-px bg-gray-300 mx-2" />
                    <LegacyButton onClick={() => setShowPrintModal(true)}>Print Tags</LegacyButton>
                </div>
             </div>
          </div>
        )}

        {/* Screen: SEAT MAP */}
        {currentScreen === 'SEAT_MAP' && foundPassenger && (() => {
          const targetPassenger = selectedPassengerForSeat 
            ? passengers.find(p => p.id === selectedPassengerForSeat)
            : foundPassenger;
          const targetFlight = targetPassenger 
            ? flightsForDate.find(f => f.id === targetPassenger.flightId)
            : foundFlight;
          const targetOccupiedSeats = targetFlight
            ? passengersForDate.filter(p => p.flightId === targetFlight.id).map(p => p.seat)
            : occupiedSeats;
          
          return (
          <div className="flex flex-col h-full">
             <div className="bg-[#FFFBE6] border border-[#7F9DB9] mb-2 p-1">
                 <span className="font-bold text-blue-800 mr-4">Select Seats:</span>
                 <input value={targetPassenger?.seat || ''} readOnly className="bg-[#FFF2CC] border border-[#7F9DB9] w-12 text-center font-bold" />
                 <span className="ml-4 text-gray-600">
                   {targetPassenger ? `${targetPassenger.lastName} ${targetPassenger.firstName}` : ''} 
                   {targetFlight ? ` ( ${targetFlight.origin} ➔ ${targetFlight.destination} )` : ''}
                 </span>
                 {isFlightClosed && <span className="ml-4 text-red-600 font-bold text-[10px]">FLIGHT CLOSED - READ ONLY</span>}
             </div>

             <div className="flex-1 bg-[#FEFEFE] border border-[#7F9DB9] relative overflow-auto p-8 flex justify-center">
                 {/* Visual Plane Body */}
                 <div className="relative bg-[#FFFBF7] border-l-4 border-r-4 border-gray-300 min-h-[500px] w-[400px] p-4">
                    
                    {/* Header / Cockpit area */}
                    <div className="absolute top-0 left-0 right-0 h-16 border-b border-gray-300 flex items-center justify-center text-gray-300 text-4xl font-bold opacity-20">
                        COCKPIT
                    </div>

                    <div className="mt-20 space-y-1">
                       {Array.from({ length: 20 }).map((_, r) => {
                          const row = r + 1;
                          return (
                            <div key={row} className="flex justify-between items-center gap-4">
                                {/* Left Side A-C */}
                                <div className="flex gap-1">
                                   {['A','B','C'].map(col => {
                                      const seatId = `${row}${col}`;
                                      const isOccupied = targetOccupiedSeats.includes(seatId) && seatId !== targetPassenger?.seat;
                                      const isSelected = seatId === targetPassenger?.seat;
                                      
                                      return (
                                        <button 
                                          key={seatId}
                                          disabled={isOccupied || isFlightClosed}
                                          onClick={() => handleSeatChange(seatId, selectedPassengerForSeat || undefined)}
                                          className={clsx(
                                            "w-8 h-10 rounded-t-lg border border-gray-400 text-[10px] flex items-center justify-center font-bold shadow-sm transition-all",
                                            isFlightClosed ? "bg-gray-200 text-gray-500 cursor-not-allowed" :
                                            isOccupied ? "bg-gray-300 text-gray-500 cursor-not-allowed" :
                                            isSelected ? "bg-cyan-300 border-cyan-600 text-cyan-900 scale-110 z-10" :
                                            "bg-white hover:bg-cyan-50 text-gray-600"
                                          )}
                                        >
                                            {/* Seat Visual */}
                                            <div className="w-6 h-8 border border-gray-300 rounded-t flex items-end justify-center pb-1">
                                                {col}
                                            </div>
                                        </button>
                                      );
                                   })}
                                </div>

                                <div className="text-gray-300 font-mono font-bold w-6 text-center">{row}</div>

                                {/* Right Side D-F */}
                                <div className="flex gap-1">
                                   {['D','E','F'].map(col => {
                                      const seatId = `${row}${col}`;
                                      const isOccupied = targetOccupiedSeats.includes(seatId) && seatId !== targetPassenger?.seat;
                                      const isSelected = seatId === targetPassenger?.seat;
                                      
                                      return (
                                        <button 
                                          key={seatId}
                                          disabled={isOccupied || isFlightClosed}
                                          onClick={() => handleSeatChange(seatId, selectedPassengerForSeat || undefined)}
                                          className={clsx(
                                            "w-8 h-10 rounded-t-lg border border-gray-400 text-[10px] flex items-center justify-center font-bold shadow-sm transition-all",
                                            isFlightClosed ? "bg-gray-200 text-gray-500 cursor-not-allowed" :
                                            isOccupied ? "bg-gray-300 text-gray-500 cursor-not-allowed" :
                                            isSelected ? "bg-cyan-300 border-cyan-600 text-cyan-900 scale-110 z-10" :
                                            "bg-white hover:bg-cyan-50 text-gray-600"
                                          )}
                                        >
                                            <div className="w-6 h-8 border border-gray-300 rounded-t flex items-end justify-center pb-1">
                                                {col}
                                            </div>
                                        </button>
                                      );
                                   })}
                                </div>
                            </div>
                          );
                       })}
                    </div>

                 </div>
             </div>

             <div className="bg-[#F0F0F0] p-2 border border-[#7F9DB9] mt-2 flex justify-between items-center">
                 <div className="text-[10px] text-blue-800 font-bold">
                     Select seats to change from the seatmap and select a new vacant seat.
                 </div>
                 <div className="flex gap-2">
                     <LegacyButton onClick={() => setCurrentScreen('ACCEPTANCE')}>Cancel</LegacyButton>
                     <LegacyButton primary onClick={() => setCurrentScreen('ACCEPTANCE')} disabled={isFlightClosed}>Confirm Seat</LegacyButton>
                 </div>
             </div>
          </div>
          );
        })()}
        </div>

        {/* FQTV Modal */}
        {showFqtvModal && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
             <div className="bg-[#F0F0F0] border-2 border-white outline outline-1 outline-[#7F9DB9] w-80 shadow-xl">
                <div className="bg-gradient-to-r from-[#4A6984] to-[#2B4E71] px-2 py-1 text-white font-bold flex justify-between items-center text-xs">
                    <span>Frequent Traveler Card</span>
                    <button onClick={() => setShowFqtvModal(false)} className="text-white hover:bg-red-500 w-4 h-4 flex items-center justify-center rounded">×</button>
                </div>
                <div className="p-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <label className="w-20 text-right">Airline:</label>
                        <LegacyInput width="w-12" value="BT" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-20 text-right">Number:</label>
                        <LegacyInput width="w-32" placeholder="123456789" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-20 text-right">Tier:</label>
                        <LegacyInput width="w-20" placeholder="GOLD" />
                    </div>
                </div>
                <div className="p-2 flex justify-end gap-2 border-t border-[#D4D0C8]">
                    <LegacyButton onClick={() => setShowFqtvModal(false)}>Cancel</LegacyButton>
                    <LegacyButton primary onClick={() => { alert('FQTV Added'); setShowFqtvModal(false); }}>Add</LegacyButton>
                </div>
             </div>
          </div>
        )}

        {/* Print Modal */}
        {showPrintModal && foundPassenger && foundFlight && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
             <div className="bg-[#F0F0F0] w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl border-4 border-[#003C74] rounded">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-[#003C74] to-[#4A6984] text-white px-4 py-2 font-bold flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Printer size={16} />
                        <span>Print Manager - {foundPassenger.lastName}/{foundPassenger.firstName}</span>
                    </div>
                    <button onClick={() => setShowPrintModal(false)} className="text-white hover:bg-red-500 w-6 h-6 flex items-center justify-center rounded text-lg">×</button>
                </div>
                
                {/* Toolbar */}
                <div className="bg-[#EBE9E3] border-b border-[#A0A0A0] p-2 flex gap-2">
                    <LegacyButton primary onClick={() => { alert('Sent to printer'); setShowPrintModal(false); }}>
                        <Printer size={12} className="inline mr-1" /> Print All
                    </LegacyButton>
                    <div className="w-px bg-gray-400 mx-2" />
                    <LegacyButton onClick={() => setShowPrintModal(false)}>Close</LegacyButton>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8 bg-gray-600 flex flex-col items-center gap-8">
                    
                    {/* Boarding Pass Section */}
                    {passengerSegments.length > 1 ? (
                        // Multiple passengers - show all boarding passes or allow selection
                        <div className="w-full max-w-3xl space-y-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                    <FileText size={14} /> Boarding Passes ({passengerSegments.length})
                                </h3>
                                <select
                                    value={selectedPassengerForBoardingPass || ''}
                                    onChange={(e) => setSelectedPassengerForBoardingPass(e.target.value || null)}
                                    className="border border-gray-400 px-3 py-1 text-sm bg-white text-gray-800 rounded"
                                >
                                    <option value="">All Passengers</option>
                                    {passengerSegments.map((p) => {
                                        const pFlight = flightsForDate.find(f => f.id === p.flightId);
                                        return (
                                            <option key={p.id} value={p.id}>
                                                {p.lastName} {p.firstName} - {pFlight?.flightNumber || 'N/A'}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            
                            {/* Show selected passenger or all passengers */}
                            {selectedPassengerForBoardingPass ? (
                                // Show selected passenger's boarding pass
                                (() => {
                                    const selectedPax = passengerSegments.find(p => p.id === selectedPassengerForBoardingPass);
                                    const selectedPaxFlight = selectedPax ? flightsForDate.find(f => f.id === selectedPax.flightId) : null;
                                    return selectedPax && selectedPaxFlight ? (
                                        <BoardingPass 
                                            passenger={selectedPax} 
                                            flight={selectedPaxFlight} 
                                            passengers={passengers} 
                                            flights={flights} 
                                        />
                                    ) : null;
                                })()
                            ) : (
                                // Show all passengers' boarding passes
                                passengerSegments.map((p) => {
                                    const pFlight = flightsForDate.find(f => f.id === p.flightId);
                                    if (!pFlight) return null;
                                    return (
                                        <div key={p.id} className="mb-6">
                                            <div className="text-white text-xs font-semibold mb-2 uppercase">
                                                {p.lastName} {p.firstName} - {pFlight.flightNumber}
                                            </div>
                                            <BoardingPass 
                                                passenger={p} 
                                                flight={pFlight} 
                                                passengers={passengers} 
                                                flights={flights} 
                                            />
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        // Single passenger - show one boarding pass
                        <div className="w-full max-w-3xl">
                            <h3 className="text-white text-sm font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                                <FileText size={14} /> Boarding Pass
                            </h3>
                            <BoardingPass passenger={foundPassenger} flight={foundFlight} passengers={passengers} flights={flights} />
                        </div>
                    )}

                    {/* Bags Section */}
                    {passengerSegments.length > 1 ? (
                        // Multiple passengers - show bags for selected or all passengers
                        (() => {
                            const passengersWithBags = selectedPassengerForBoardingPass
                                ? passengerSegments.filter(p => p.id === selectedPassengerForBoardingPass && p.bagCount > 0)
                                : passengerSegments.filter(p => p.bagCount > 0);
                            
                            if (passengersWithBags.length === 0) return null;
                            
                            return (
                                <div className="w-full max-w-3xl space-y-6">
                                    {passengersWithBags.map((p) => {
                                        const pFlight = flightsForDate.find(f => f.id === p.flightId);
                                        if (!pFlight) return null;
                                        
                                        return (
                                            <div key={p.id}>
                                                <h3 className="text-white text-sm font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                                                    <Luggage size={14} /> {p.lastName} {p.firstName} - Baggage Tags ({p.bagCount})
                                                </h3>
                                                <div className="flex flex-wrap gap-4">
                                                    {Array.from({ length: p.bagCount }).map((_, i) => (
                                                        <BagTag 
                                                            key={`${p.id}-${i}`} 
                                                            passenger={p} 
                                                            flight={pFlight} 
                                                            bagIndex={i}
                                                            weight={customBagWeights[`${p.pnr}-${i}`] || 23}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()
                    ) : (
                        // Single passenger - show bags for one passenger
                        foundPassenger.bagCount > 0 && (
                            <div className="w-full max-w-3xl">
                                <h3 className="text-white text-sm font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <Luggage size={14} /> Baggage Tags ({foundPassenger.bagCount})
                                </h3>
                                <div className="flex flex-wrap gap-4">
                                    {Array.from({ length: foundPassenger.bagCount }).map((_, i) => (
                                        <BagTag 
                                            key={i} 
                                            passenger={foundPassenger} 
                                            flight={foundFlight} 
                                            bagIndex={i}
                                            weight={customBagWeights[`${foundPassenger.pnr}-${i}`] || 23}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    )}
                </div>
             </div>
          </div>
        )}

      </div>
      
      {/* Status Bar */}
      <div className="bg-[#EBE9E3] border-t border-[#A0A0A0] h-6 flex items-center px-2 text-[10px] text-gray-600 gap-4 shadow-inner">
         <span>Ready</span>
         <div className="h-3 w-px bg-gray-400" />
         <span>CAPS</span>
         <div className="h-3 w-px bg-gray-400" />
         <span>NUM</span>
         <div className="ml-auto">Terminal 1 / Desk 14</div>
      </div>
      
      {/* SBY Status Modal */}
      {showSbyModal && foundPassenger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="text-orange-600" size={24} />
                Set SBY Status
              </h2>
              <button onClick={() => setShowSbyModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Passenger: <strong>{foundPassenger.lastName} {foundPassenger.firstName}</strong></p>
              <p className="text-xs text-gray-500">PNR: {foundPassenger.pnr}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mb-4">
              <p className="text-sm text-yellow-800">Setting SBY (Standby) status will mark this passenger as standby. They will be boarded only if space is available.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <LegacyButton onClick={() => setShowSbyModal(false)}>Cancel</LegacyButton>
              <LegacyButton primary onClick={handleSetSby}>Set SBY Status</LegacyButton>
            </div>
          </div>
        </div>
      )}
      
      {/* Comment Modal */}
      {showCommentModal && foundPassenger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="text-blue-600" size={24} />
                Add Comment
              </h2>
              <button onClick={() => setShowCommentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Passenger: <strong>{foundPassenger.lastName} {foundPassenger.firstName}</strong></p>
              <p className="text-xs text-gray-500">PNR: {foundPassenger.pnr}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Comment:</label>
              <textarea
                id="comment-text"
                defaultValue={foundPassenger.boardingComment || ''}
                className="w-full border border-gray-300 rounded p-2 text-sm h-32 resize-none"
                placeholder="Enter comment about this passenger..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <LegacyButton onClick={() => setShowCommentModal(false)}>Cancel</LegacyButton>
              <LegacyButton primary onClick={handleSaveComment}>Save Comment</LegacyButton>
            </div>
          </div>
        </div>
      )}
      
      {/* Logs Modal */}
      {showLogsModal && foundPassenger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="text-gray-600" size={24} />
                Passenger Logs
              </h2>
              <button onClick={() => setShowLogsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Passenger: <strong>{foundPassenger.lastName} {foundPassenger.firstName}</strong></p>
              <p className="text-xs text-gray-500">PNR: {foundPassenger.pnr}</p>
            </div>
            <div className="flex-1 overflow-auto border border-gray-300 rounded p-4 bg-gray-50">
              {passengerLogs.length > 0 ? (
                <div className="space-y-2">
                  {passengerLogs.map((log, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded p-2 text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-700">{new Date(log.timestamp).toLocaleString()}</span>
                        <span className="text-gray-500">{log.type}</span>
                      </div>
                      <div className="text-gray-800">{log.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">No logs found for this passenger</div>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <LegacyButton onClick={() => setShowLogsModal(false)}>Close</LegacyButton>
            </div>
          </div>
        </div>
      )}

      {/* Document Verify Modal */}
      {showDocVerifyModal && foundPassenger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="text-green-600" size={24} />
                Document Verify
              </h2>
              <button onClick={() => setShowDocVerifyModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Passenger: <strong>{foundPassenger.lastName} {foundPassenger.firstName}</strong></p>
              <p className="text-xs text-gray-500">PNR: {foundPassenger.pnr}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Status:</label>
                <select
                  value={docVerifyStatus}
                  onChange={(e) => setDocVerifyStatus(e.target.value as 'PENDING' | 'VERIFIED' | 'FLAGGED')}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                >
                  <option value="PENDING">Pending</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="FLAGGED">Flagged</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Note:</label>
                <textarea
                  value={docVerifyNote}
                  onChange={(e) => setDocVerifyNote(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-sm h-24 resize-none"
                  placeholder="Optional note..."
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <LegacyButton onClick={() => setShowDocVerifyModal(false)}>Cancel</LegacyButton>
              <LegacyButton primary onClick={handleSaveDocVerify}>Save</LegacyButton>
            </div>
          </div>
        </div>
      )}

      {/* Bag Waiver Modal */}
      {showBagWaiverModal && foundPassenger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Luggage className="text-blue-600" size={24} />
                Excess Baggage Waiver
              </h2>
              <button onClick={() => setShowBagWaiverModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Passenger: <strong>{foundPassenger.lastName} {foundPassenger.firstName}</strong></p>
              <p className="text-xs text-gray-500">PNR: {foundPassenger.pnr}</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">Waived Bags (pcs):</label>
                  <input
                    type="number"
                    value={bagWaiverPcs}
                    onChange={(e) => setBagWaiverPcs(parseInt(e.target.value, 10) || 0)}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Waived Weight (kg):</label>
                  <input
                    type="number"
                    value={bagWaiverKg}
                    onChange={(e) => setBagWaiverKg(parseInt(e.target.value, 10) || 0)}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                    min={0}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Reason:</label>
                <textarea
                  value={bagWaiverReason}
                  onChange={(e) => setBagWaiverReason(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-sm h-24 resize-none"
                  placeholder="Optional reason..."
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <LegacyButton onClick={() => setShowBagWaiverModal(false)}>Cancel</LegacyButton>
              <LegacyButton primary onClick={handleSaveBagWaiver}>Save</LegacyButton>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment Modal */}
      {showPaymentModal && foundPassenger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="text-green-600" size={24} />
                Price & Payment
              </h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Passenger: <strong>{foundPassenger.lastName} {foundPassenger.firstName}</strong></p>
              <p className="text-xs text-gray-500">PNR: {foundPassenger.pnr}</p>
            </div>
            <div className="space-y-4">
              {/* Payment Items List */}
              {paymentItems.length > 0 && (
                <div className="border border-gray-300 rounded p-3 bg-gray-50">
                  <label className="block text-sm font-bold mb-2">Services/Items:</label>
                  <div className="space-y-2">
                    {paymentItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2">
                        <div>
                          <div className="font-semibold">{item.description}</div>
                          <div className="text-xs text-gray-500">Qty: {item.quantity} × {item.unitPrice.toFixed(2)} EUR</div>
                        </div>
                        <div className="font-bold">{item.total.toFixed(2)} EUR</div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t-2 border-gray-400 font-bold">
                      <span>Total Due:</span>
                      <span className="text-green-600">{paymentItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)} EUR</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold mb-1">Ticket Price (EUR):</label>
                <input
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Payment Amount (EUR):</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                  placeholder="0.00"
                />
                {paymentItems.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Includes: {paymentItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)} EUR from services
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Payment Method:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value !== 'CARD') {
                      setCardNumber('');
                      setCardExpiry('');
                      setCardCvv('');
                    }
                  }}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="VOUCHER">Voucher</option>
                  <option value="REFUND">Refund</option>
                </select>
              </div>
              {paymentMethod === 'CARD' && (
                <div className="space-y-3 border border-gray-300 rounded p-3 bg-gray-50">
                  <div>
                    <label className="block text-sm font-bold mb-1">Card Number:</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim())}
                      className="w-full border border-gray-300 rounded p-2 text-sm"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold mb-1">Expiry:</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substring(0, 5))}
                        className="w-full border border-gray-300 rounded p-2 text-sm"
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">CVV:</label>
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                        className="w-full border border-gray-300 rounded p-2 text-sm"
                        placeholder="123"
                        maxLength={3}
                      />
                    </div>
                  </div>
                </div>
              )}
              {(paymentAmount > 0 || ticketPrice > 0 || paymentItems.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  {ticketPrice > 0 && (
                    <div className="flex justify-between text-sm mb-1">
                      <span>Ticket Price:</span>
                      <span className="font-bold">{ticketPrice.toFixed(2)} EUR</span>
                    </div>
                  )}
                  {paymentItems.length > 0 && (
                    <div className="flex justify-between text-sm mb-1">
                      <span>Services Total:</span>
                      <span className="font-bold">{paymentItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)} EUR</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm mb-1 font-bold border-t border-blue-300 pt-1 mt-1">
                    <span>Total Due:</span>
                    <span className="text-blue-700">{(ticketPrice + paymentItems.reduce((sum, item) => sum + item.total, 0)).toFixed(2)} EUR</span>
                  </div>
                  {paymentAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm mb-1 mt-2">
                        <span>Payment Received:</span>
                        <span className="font-bold">{paymentAmount.toFixed(2)} EUR</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-blue-300 pt-1 mt-1">
                        <span>Change:</span>
                        <span className={paymentAmount >= (ticketPrice + paymentItems.reduce((sum, item) => sum + item.total, 0)) ? 'text-green-600' : 'text-red-600'}>
                          {(paymentAmount - (ticketPrice + paymentItems.reduce((sum, item) => sum + item.total, 0))).toFixed(2)} EUR
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <LegacyButton onClick={() => setShowPaymentModal(false)}>Cancel</LegacyButton>
              <LegacyButton primary onClick={handleProcessPayment} disabled={paymentAmount <= 0}>
                Process Payment
              </LegacyButton>
            </div>
          </div>
        </div>
      )}
      
      {/* Services Modal */}
      {showServicesModal && foundPassenger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Star className="text-purple-600" size={24} />
                Additional Services
              </h2>
              <button onClick={() => setShowServicesModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Passenger: <strong>{foundPassenger.lastName} {foundPassenger.firstName}</strong></p>
              <p className="text-xs text-gray-500">PNR: {foundPassenger.pnr}</p>
            </div>
            <div className="space-y-4">
              <div className="border border-gray-300 rounded p-3">
                <label className="block text-sm font-bold mb-2">Extra Bags:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExtraBags(Math.max(0, extraBags - 1))}
                    className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-bold">{extraBags}</span>
                  <button
                    onClick={() => setExtraBags(extraBags + 1)}
                    className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                  >
                    <Plus size={16} />
                  </button>
                  <span className="text-sm text-gray-600 ml-2">bags (23 KG each)</span>
                </div>
              </div>
              
              <div className="border border-gray-300 rounded p-3">
                <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={loungeAccess}
                    onChange={(e) => setLoungeAccess(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Lounge Access
                </label>
                <p className="text-xs text-gray-500 mt-1">Grant access to airport lounge</p>
              </div>
              
              <div className="border border-gray-300 rounded p-3">
                <label className="block text-sm font-bold mb-2">Upgrade Class:</label>
                <select
                  value={upgradeClass}
                  onChange={(e) => setUpgradeClass(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                >
                  <option value="">No upgrade</option>
                  <option value="BUSINESS">Business Class</option>
                  <option value="FIRST">First Class</option>
                  <option value="PREMIUM_ECONOMY">Premium Economy</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <LegacyButton onClick={() => setShowServicesModal(false)}>Cancel</LegacyButton>
              <LegacyButton primary onClick={handleSaveServices}>
                Apply Services
              </LegacyButton>
            </div>
          </div>
        </div>
      )}
      
      {/* Card Processing Emulator */}
      {showCardProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-8 text-center">
            <Loader className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
            <h3 className="text-xl font-bold mb-2">Processing Payment</h3>
            <p className="text-gray-600 mb-4">Please wait while we process your card payment...</p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
