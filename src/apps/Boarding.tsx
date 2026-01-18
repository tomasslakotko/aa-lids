import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAirportStore } from '../store/airportStore';
import clsx from 'clsx';
import { 
  Users, User, ArrowLeft, HelpCircle, 
  Printer, Plus, UserPlus, UserMinus,
  CheckCircle, MessageSquare, ArrowDown, Camera, CameraOff, X, AlertCircle, FileText
} from 'lucide-react';
import { Briefsheet } from '../components/Briefsheet';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'react-qr-code';

const BOARDING_STORAGE_KEY = 'boarding-selected-flight';

// Mock helper for gender (random for demo since we don't store it)
const getGender = (name: string) => {
  return name.length % 2 === 0 ? 'F' : 'M';
};

// Mock helper for class based on seat row
const getClass = (seat: string) => {
  if (!seat) return 'Y'; // No seat = Y
  const row = parseInt(seat.replace(/\D/g, ''));
  return row <= 5 ? 'J' : 'Y';
};

export const BoardingApp = () => {
  const [flightInput, setFlightInput] = useState('');
  const [selectedFlightId, setSelectedFlightId] = useState<string>(() => {
    // Load from localStorage on initial render
    const saved = localStorage.getItem(BOARDING_STORAGE_KEY);
    return saved || '';
  });
  const [activeTab, setActiveTab] = useState<'ALL' | 'CHECKED_IN' | 'BOARDED' | 'WAITLIST'>('ALL');
  const [selectedPaxId, setSelectedPaxId] = useState<string | null>(null);
  const [gateMsg, setGateMsg] = useState('');
  const [showBriefsheet, setShowBriefsheet] = useState(false);
  const [showScannerQR, setShowScannerQR] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentPassenger, setCommentPassenger] = useState<{ name: string; pnr: string; comment: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementRef = useRef<HTMLDivElement | null>(null);

  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);
  const boardPassenger = useAirportStore((state) => state.boardPassenger);
  
  // Persist selectedFlightId to localStorage whenever it changes
  useEffect(() => {
    if (selectedFlightId) {
      localStorage.setItem(BOARDING_STORAGE_KEY, selectedFlightId);
    } else {
      localStorage.removeItem(BOARDING_STORAGE_KEY);
    }
  }, [selectedFlightId]);
  
  // Load flight details when flight is selected or flights are loaded
  useEffect(() => {
    if (selectedFlightId && flights.length > 0) {
      const flight = flights.find(f => f.id === selectedFlightId);
      if (flight) {
        setFlightInput(flight.flightNumber);
        setGateMsg(flight.gateMessage || '');
      } else {
        // Flight not found, clear selection
        setSelectedFlightId('');
        localStorage.removeItem(BOARDING_STORAGE_KEY);
      }
    }
  }, [selectedFlightId, flights]);

  // Track flight status changes and notify passengers when boarding starts
  const prevFlightStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedFlight && selectedFlight.status === 'BOARDING' && prevFlightStatusRef.current !== 'BOARDING') {
      // Boarding just started - notify all passengers on this flight
      const flightPassengers = passengers.filter(p => p.flightId === selectedFlight.id);
      flightPassengers.forEach(pax => {
        const message = `Boarding started for ${selectedFlight.flightNumber} to ${selectedFlight.destinationCity || selectedFlight.destination}. Gate: ${selectedFlight.gate}`;
        addPassengerNotification(pax.pnr, message);
      });
    }
    if (selectedFlight) {
      prevFlightStatusRef.current = selectedFlight.status;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFlight?.status, selectedFlight?.id, passengers]);
  const deboardPassenger = useAirportStore((state) => state.deboardPassenger);
  const updateFlightStatus = useAirportStore((state) => state.updateFlightStatus);
  const updateGateMessage = useAirportStore((state) => state.updateGateMessage);
  const offloadPassenger = useAirportStore((state) => state.offloadPassenger);
  const addNoRecPassenger = useAirportStore((state) => state.addNoRecPassenger);

  const selectedFlight = flights.find(f => f.id === selectedFlightId);
  
  // Helper function to add notification for passenger
  const addPassengerNotification = (pnr: string, message: string) => {
    try {
      const NOTIFY_KEY = 'mobile-notifications-v1';
      const saved = localStorage.getItem(NOTIFY_KEY);
      const notifications = saved ? JSON.parse(saved) : [];
      const timestamp = new Date().toLocaleTimeString();
      const fullMessage = `${timestamp} · ${message}`;
      // Add notification if not already present
      if (!notifications.includes(fullMessage)) {
        notifications.unshift(fullMessage);
        localStorage.setItem(NOTIFY_KEY, JSON.stringify(notifications.slice(0, 50)));
      }
      // Try to send browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Flight Update', { body: message });
      }
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };
  
  // Filter Pax for Flight
  const flightPassengers = useMemo(() => 
    passengers.filter(p => p.flightId === selectedFlightId),
  [passengers, selectedFlightId]);

  // Statistics
  const stats = useMemo(() => {
    const s = {
      j: { total: 0, checkedIn: 0, boarded: 0, bags: 0, bagWgt: 0 },
      y: { total: 0, checkedIn: 0, boarded: 0, bags: 0, bagWgt: 0 },
      infants: 0
    };

    flightPassengers.forEach(p => {
      const cls = getClass(p.seat).toLowerCase() as 'j' | 'y';
      s[cls].total++;
      if (p.status === 'CHECKED_IN' || p.status === 'BOARDED') {
        s[cls].checkedIn++;
        s[cls].bags += p.bagCount;
        s[cls].bagWgt += p.bagCount * 23;
      }
      if (p.status === 'BOARDED') {
        s[cls].boarded++;
      }
    });
    return s;
  }, [flightPassengers]);

  const filteredPassengers = useMemo(() => {
    switch (activeTab) {
      case 'CHECKED_IN': return flightPassengers.filter(p => p.status === 'CHECKED_IN' || p.status === 'BOARDED');
      case 'BOARDED': return flightPassengers.filter(p => p.status === 'BOARDED');
      case 'WAITLIST': return []; // No waitlist in store yet
      default: return flightPassengers;
    }
  }, [activeTab, flightPassengers]);

  const handleFlightSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = flightInput.toUpperCase().trim();
    if (!rawInput) return;
    const exact = flights.find(f => f.flightNumber === rawInput);
    const fuzzy = flights.find(f => f.flightNumber.includes(rawInput));
    const found = exact || fuzzy;
    if (found) {
      setSelectedFlightId(found.id);
      setFlightInput(found.flightNumber);
      setGateMsg(found.gateMessage || '');
    } else {
      alert('Flight not found');
    }
  };

  const handleBoardPax = (pnr: string) => {
    // Check if passenger has a boarding comment
    const pax = passengers.find(p => p.pnr === pnr);
    if (pax && pax.boardingComment && pax.boardingComment.trim()) {
      // Show comment modal before boarding
      setCommentPassenger({
        name: `${pax.lastName}, ${pax.firstName}`,
        pnr: pax.pnr,
        comment: pax.boardingComment
      });
      setShowCommentModal(true);
      return;
    }
    
    // No comment, board directly
    const result = boardPassenger(pnr);
    if (!result) {
      const passenger = passengers.find(p => p.pnr === pnr);
      if (passenger) {
        alert(`Cannot board passenger: Status is ${passenger.status}. Passenger must be CHECKED_IN to board.`);
      } else {
        alert(`Passenger with PNR ${pnr} not found.`);
      }
    }
  };

  const handleGateMessageUpdate = () => {
    if (selectedFlightId) {
        updateGateMessage(selectedFlightId, gateMsg);
        alert('Message updated on Gate Screen');
    }
  };

  const handleOffload = () => {
    if (!selectedPaxId) {
      alert('Select a passenger first');
      return;
    }
    const pax = passengers.find(p => p.id === selectedPaxId);
    if (!pax) {
      alert('Passenger not found');
      return;
    }
    
    // Check if passenger can be offloaded
    if (pax.status === 'BOOKED') {
      alert('Passenger is already in BOOKED status. Cannot offload.');
      return;
    }
    
    if (confirm(`Offload ${pax.lastName}, ${pax.firstName} (${pax.pnr})?\n\nThis will:\n- Set status to BOOKED\n- Clear seat assignment\n- Clear baggage information`)) {
      offloadPassenger(pax.pnr);
      setSelectedPaxId(null); // Clear selection after offload
      alert(`Passenger ${pax.lastName} has been offloaded.`);
    }
  };

  const handleDeboard = () => {
    if (!selectedPaxId) {
      alert('Select a passenger first');
      return;
    }
    const pax = passengers.find(p => p.id === selectedPaxId);
    if (!pax) {
      alert('Passenger not found');
      return;
    }
    
    if (pax.status !== 'BOARDED') {
      alert(`Passenger is not boarded (status: ${pax.status}). Only boarded passengers can be debarked.`);
      return;
    }
    
    if (confirm(`Deboard ${pax.lastName}, ${pax.firstName} (${pax.pnr})?\n\nThis will:\n- Change status from BOARDED to CHECKED_IN\n- Passenger will remain checked in but not boarded`)) {
      const result = deboardPassenger(pax.pnr);
      if (result) {
        setSelectedPaxId(null); // Clear selection after deboard
        alert(`Passenger ${pax.lastName} has been debarked.`);
      } else {
        alert(`Failed to deboard passenger ${pax.lastName}.`);
      }
    }
  };

  const handlePromoteWait = () => {
    if (!selectedPaxId) return alert('Select a passenger first');
    const pax = passengers.find(p => p.id === selectedPaxId);
    if (pax) {
        const newSeat = prompt('Enter Seat Assignment:', '10A');
        if (newSeat && newSeat.trim()) {
            const seat = newSeat.trim().toUpperCase();
            updatePassengerDetails(pax.pnr, { seat: seat, status: 'CHECKED_IN' });
            // Send notification to passenger about seat assignment
            const flight = flights.find(f => f.id === pax.flightId);
            const flightInfo = flight ? `${flight.flightNumber} to ${flight.destinationCity || flight.destination}` : 'your flight';
            addPassengerNotification(pax.pnr, `Seat assigned: ${seat} on ${flightInfo}`);
            alert(`Seat ${seat} assigned. Notification sent to passenger.`);
        }
    }
  };

  const handleAddNoRec = () => {
    const name = prompt('Enter LASTNAME/FIRSTNAME (e.g. SMITH/JOHN)');
    if (name && selectedFlightId) {
        const [last, first] = name.split('/');
        if (last && first) {
            addNoRecPassenger(last, first, selectedFlightId);
        }
    }
  };

  // Process scanned QR code from boarding pass
  const processScannedCode = (code: string) => {
    let pnr: string | null = null;
    let passengerId: string | null = null;
    let qrFlightNumber: string | null = null;
    
    // Try to parse as JSON (QR code from boarding pass)
    try {
      const qrData = JSON.parse(code);
      if (qrData.pnr) {
        pnr = qrData.pnr.toUpperCase();
      }
      if (qrData.passengerId) {
        passengerId = qrData.passengerId;
      }
      if (qrData.flight) {
        qrFlightNumber = qrData.flight.toUpperCase();
      }
    } catch (e) {
      // Not JSON, try to extract PNR from text/barcode format
      const codeUpper = code.toUpperCase().trim();
      const pnrMatch = code.match(/\b([A-Z0-9]{6})\b/);
      if (pnrMatch) {
        pnr = pnrMatch[1];
      } else {
        pnr = codeUpper;
      }
    }
    
    if (!pnr && !passengerId) {
      setScanError(`Invalid QR code format: ${code.substring(0, 50)}...`);
      return;
    }
    
    // Find passenger by PNR or passengerId
    const found = passengers.find(p => 
      (pnr && p.pnr === pnr) || 
      (passengerId && p.id === passengerId)
    );
    
    if (!found) {
      setScanError(`Passenger not found: ${pnr || passengerId}`);
      return;
    }
    
    // Verify flight match if QR code contains flight number
    if (qrFlightNumber && selectedFlight) {
      if (selectedFlight.flightNumber !== qrFlightNumber) {
        setScanError(`QR code is for flight ${qrFlightNumber}, but current flight is ${selectedFlight.flightNumber}.`);
        setSelectedPaxId(found.id);
        return;
      }
    }
    
    // Check if passenger is on the selected flight
    if (selectedFlightId && found.flightId !== selectedFlightId) {
      // Auto-select the passenger's flight if it's different
      const passengerFlight = flights.find(f => f.id === found.flightId);
      if (passengerFlight) {
        if (confirm(`Passenger is on flight ${passengerFlight.flightNumber}. Switch to that flight?`)) {
          setSelectedFlightId(found.flightId);
          setFlightInput(passengerFlight.flightNumber);
        } else {
          setScanError(`Passenger is on flight ${passengerFlight.flightNumber}, not ${selectedFlight?.flightNumber || 'selected flight'}.`);
          return;
        }
      } else {
        setScanError(`Passenger is on a different flight. Please select flight ${found.flightId} first.`);
        return;
      }
    }
    
    // If no flight selected, auto-select the passenger's flight
    if (!selectedFlightId && found.flightId) {
      const passengerFlight = flights.find(f => f.id === found.flightId);
      if (passengerFlight) {
        setSelectedFlightId(found.flightId);
        setFlightInput(passengerFlight.flightNumber);
      }
    }
    
    // Check if passenger can be boarded
    if (found.status === 'BOARDED') {
      setScanError(`Passenger ${found.lastName} is already boarded.`);
      setSelectedPaxId(found.id);
      return;
    }
    
    if (found.status !== 'CHECKED_IN') {
      setScanError(`Passenger ${found.lastName} is not checked in (status: ${found.status}). Cannot board.`);
      setSelectedPaxId(found.id);
      return;
    }
    
    // Auto-board the passenger
    const result = boardPassenger(found.pnr);
    if (result) {
      setSelectedPaxId(found.id);
      setScanError(null);
      // Stop scanning after successful board
      if (isScanning) {
        stopScanner();
      }
      // Show success message
      setTimeout(() => {
        alert(`✓ Passenger ${found.lastName}, ${found.firstName} (${found.pnr})\n✓ Flight: ${selectedFlight?.flightNumber || found.flightId}\n✓ Seat: ${found.seat || 'TBA'}\n\nBoarded successfully!`);
      }, 100);
    } else {
      setScanError(`Failed to board passenger ${found.lastName}.`);
    }
  };

  // Start camera scanner
  const startScanner = async () => {
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScanError('Camera access is not supported in this browser. Please use a modern browser.');
      return;
    }

    // Set scanning state first so the element gets rendered
    setIsScanning(true);
    setScanError(null);
    
    // For iOS/iPad, we need to ensure the element exists, but we must start the scanner
    // in the same user gesture context. Use a minimal delay with requestAnimationFrame
    // to allow DOM to update while preserving the gesture chain.
    requestAnimationFrame(() => {
      // Use a very short timeout to ensure element is rendered, but keep it minimal
      // for iOS gesture chain preservation
      setTimeout(async () => {
        if (!scannerElementRef.current) {
          setIsScanning(false);
          setScanError('Scanner element not found. Please try again.');
          return;
        }
        
        try {
          const elementId = scannerElementRef.current.id || 'boarding-qr-reader';
          const html5QrCode = new Html5Qrcode(elementId);
          scannerRef.current = html5QrCode;
          
          // Start the scanner - html5-qrcode will request camera permission
          // On iOS, this must be called from user gesture (which it is via button click)
          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              processScannedCode(decodedText);
            },
            (_errorMessage) => {
              // Ignore scanning errors (they're frequent during scanning)
            }
          );
        } catch (err: any) {
          console.error('Scanner error:', err);
          let errorMsg = 'Failed to start camera';
          if (err.message) {
            errorMsg = err.message;
          } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMsg = 'Camera access denied. Please allow camera access in your browser settings and try again.';
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMsg = 'No camera found. Please connect a camera.';
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMsg = 'Camera is already in use by another application. Please close other apps using the camera.';
          }
          setScanError(errorMsg);
          setIsScanning(false);
          if (scannerRef.current) {
            try {
              scannerRef.current.stop().catch(() => {});
              scannerRef.current.clear();
            } catch (e) {
              // Ignore cleanup errors
            }
            scannerRef.current = null;
          }
        }
      }, 100); // Minimal delay to allow DOM update
    });
  };

  // Stop camera scanner
  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        scannerRef.current = null;
        setIsScanning(false);
      }).catch((err) => {
        console.error('Error stopping scanner:', err);
        setIsScanning(false);
      });
    }
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopScanner();
      }
    };
  }, []);

  // --- RENDER HELPERS ---

  const CounterBox = ({ label, m, f, c, tot, bg = 'bg-blue-100' }: any) => (
    <div className="flex flex-col border-r border-gray-400 last:border-r-0">
      <div className={clsx("text-[10px] text-center border-b border-gray-400 font-bold py-0.5", bg)}>{label}</div>
      <div className="grid grid-cols-4 text-[10px] text-center divide-x divide-gray-300 bg-white">
        <div className="px-1">{m}</div>
        <div className="px-1">{f}</div>
        <div className="px-1">{c}</div>
        <div className="px-1 font-bold bg-gray-50">{tot}</div>
      </div>
    </div>
  );

  const SimpleCounter = ({ label, val, max, bg = 'bg-green-700' }: any) => (
    <div className="flex items-center justify-between text-[10px] bg-white border border-gray-400 mb-px">
       <div className={clsx("text-white px-2 py-0.5 font-bold w-20", bg)}>{label}</div>
       <div className="px-2 font-mono font-bold">{val}</div>
       {max && <div className="px-2 text-gray-500 border-l border-gray-300">{max}</div>}
    </div>
  );

  if (!selectedFlight) {
    return (
      <div className="h-full w-full bg-gray-200 flex items-center justify-center flex-col">
        <div className="bg-white p-8 rounded shadow-md w-96">
          <h2 className="text-lg font-bold mb-4 text-gray-700">Open Flight</h2>
          <form onSubmit={handleFlightSearch} className="flex gap-2">
            <input 
              className="flex-1 border p-2 uppercase font-mono"
              placeholder="Flight No (e.g. BT101)"
              value={flightInput}
              onChange={(e) => setFlightInput(e.target.value)}
              autoFocus
            />
            <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold">OPEN</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#f0f0f0] text-xs font-sans text-gray-800 select-none">
      {/* 1. TOP FLIGHT INFO BAR */}
      <div className="bg-white border-b border-gray-400 p-1 flex items-center justify-between shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
             <div className={clsx(
               "w-3 h-3 rounded-full border",
               selectedFlight.status === 'BOARDING' ? "bg-green-500 border-green-600 animate-pulse" :
               selectedFlight.status === 'DELAYED' ? "bg-red-500 border-red-600" :
               "bg-gray-400 border-gray-500"
             )}></div>
             <span className="font-bold text-lg font-mono border p-1 bg-gray-50 border-gray-300">{selectedFlight.flightNumber} / {new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex gap-2 text-xs border p-1 bg-gray-50 border-gray-300">
             <span className="font-bold">{selectedFlight.aircraft}</span>
             <span>REG: {selectedFlight.registration || 'TBD'}</span>
             <span>145/145Y</span>
          </div>
          
          {/* Status Control */}
          <select 
            className={clsx(
              "px-2 py-1 border outline-none cursor-pointer text-xs font-bold rounded",
              selectedFlight.status === 'BOARDING' ? "bg-green-600 text-white border-green-700" :
              selectedFlight.status === 'DELAYED' ? "bg-red-600 text-white border-red-700" :
              selectedFlight.status === 'DEPARTED' ? "bg-blue-600 text-white border-blue-700" :
              "bg-gray-200 text-gray-800 border-gray-400"
            )}
            value={selectedFlight.status}
            onChange={(e) => updateFlightStatus(selectedFlight.id, e.target.value as any)}
          >
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="BOARDING">OPEN BOARDING</option>
            <option value="DELAYED">DELAY FLIGHT</option>
            <option value="DEPARTED">CLOSE / DEPART</option>
            <option value="ARRIVED">ARRIVED</option>
            <option value="CANCELLED">CANCEL FLIGHT</option>
          </select>
        </div>
        <div className="flex gap-4 text-xs font-bold">
           <div className="bg-yellow-100 px-2 border border-yellow-300">Route: {selectedFlight.origin} - {selectedFlight.destination}</div>
           <div className="bg-gray-100 px-2 border border-gray-300">STD: {selectedFlight.std}</div>
           <div className="bg-gray-100 px-2 border border-gray-300">Gate: {selectedFlight.gate}</div>
        </div>
      </div>

      {/* 2. COUNTERS PANEL */}
      <div className="bg-white border-b border-gray-400 p-1">
        {/* Class J Row */}
        <div className="flex border border-gray-400 mb-px">
           <div className="w-16 bg-gray-200 flex items-center justify-center font-bold border-r border-gray-400">Class J</div>
           <CounterBox label="Booked" m={Math.floor(stats.j.total/2)} f={Math.ceil(stats.j.total/2)} c={0} tot={stats.j.total} bg="bg-blue-100" />
           <CounterBox label="Checked-In" m={Math.floor(stats.j.checkedIn/2)} f={Math.ceil(stats.j.checkedIn/2)} c={0} tot={stats.j.checkedIn} bg="bg-pink-100" />
           <div className="flex flex-col border-r border-gray-400 w-24">
              <div className="text-[10px] text-center border-b border-gray-400 font-bold bg-pink-100 py-0.5">Baggage</div>
              <div className="grid grid-cols-2 text-[10px] text-center h-full items-center bg-white">
                 <div>{stats.j.bags}</div><div>{stats.j.bagWgt}</div>
              </div>
           </div>
           <CounterBox label="Boarded" m={Math.floor(stats.j.boarded/2)} f={Math.ceil(stats.j.boarded/2)} c={0} tot={stats.j.boarded} bg="bg-green-100" />
           
           {/* Capacity Sidebar */}
           <div className="ml-auto flex flex-col w-48 border-l border-gray-400 p-px gap-px bg-gray-100">
              <SimpleCounter label="A/C Config" val="145" />
              <SimpleCounter label="Avail Seats" val={145 - (stats.j.checkedIn + stats.y.checkedIn)} bg="bg-green-700" />
           </div>
        </div>

        {/* Class Y Row */}
        <div className="flex border border-gray-400">
           <div className="w-16 bg-gray-200 flex items-center justify-center font-bold border-r border-gray-400">Class Y</div>
           <CounterBox label="" m={Math.floor(stats.y.total/2)} f={Math.ceil(stats.y.total/2)} c={0} tot={stats.y.total} bg="bg-blue-100" />
           <CounterBox label="" m={Math.floor(stats.y.checkedIn/2)} f={Math.ceil(stats.y.checkedIn/2)} c={0} tot={stats.y.checkedIn} bg="bg-pink-100" />
           <div className="flex flex-col border-r border-gray-400 w-24 bg-white text-center justify-center text-[10px]">
              <div className="grid grid-cols-2">
                 <div>{stats.y.bags}</div><div>{stats.y.bagWgt}</div>
              </div>
           </div>
           <CounterBox label="" m={Math.floor(stats.y.boarded/2)} f={Math.ceil(stats.y.boarded/2)} c={0} tot={stats.y.boarded} bg="bg-green-100" />
           
           {/* Errors Sidebar */}
           <div className="ml-auto flex flex-col w-48 border-l border-gray-400 p-px gap-px bg-gray-100">
              <SimpleCounter label="Pax Seat" val="0" bg="bg-gray-400" />
              <SimpleCounter label="Errors" val="0" bg="bg-gray-400" />
           </div>
        </div>
      </div>

      {/* 3. TOOLBAR */}
      <div className="bg-gray-100 p-1 border-b border-gray-400 flex gap-2">
         <button 
           onClick={() => {
             setSelectedFlightId('');
             localStorage.removeItem(BOARDING_STORAGE_KEY);
           }} 
           className="flex items-center gap-1 px-3 py-1 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300 text-xs"
         >
           <ArrowLeft size={12} /> Back
         </button>
         <button 
           onClick={() => {
             if (selectedFlight) {
               setShowBriefsheet(true);
             } else {
               alert('Please select a flight first');
             }
           }}
           className="flex items-center gap-1 px-3 py-1 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300 text-xs"
         >
           <Printer size={12} /> Briefsheet
         </button>
         <button 
           onClick={() => {
             if (selectedFlight) {
               setShowScannerQR(true);
             } else {
               alert('Please select a flight first');
             }
           }}
           className="flex items-center gap-1 px-3 py-1 bg-green-200 border border-green-400 rounded hover:bg-green-300 text-xs"
         >
           <Camera size={12} /> Connect Scanner
         </button>
         <div className="flex-1 flex justify-center gap-2">
            {/* Gate Message Input */}
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-2">
                <MessageSquare size={12} className="text-gray-500" />
                <input 
                    className="w-64 outline-none text-xs py-1" 
                    placeholder="Enter Gate Screen Message..." 
                    value={gateMsg}
                    onChange={(e) => setGateMsg(e.target.value)}
                />
                <button 
                    onClick={handleGateMessageUpdate}
                    className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded uppercase font-bold"
                >
                    Update Screen
                </button>
            </div>
         </div>
         <button className="flex items-center gap-1 px-3 py-1 bg-gray-200 border border-gray-400 rounded hover:bg-gray-300 text-xs"><HelpCircle size={12} /> Help</button>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
         {/* LEFT SIDEBAR ACTIONS */}
         <div className="w-36 bg-gray-200 border-r border-gray-400 p-2 flex flex-col gap-2">
            <button className="text-left px-2 py-2 bg-gray-100 border border-gray-400 hover:bg-blue-50 rounded flex items-center gap-2"><User size={14}/> Select Pax</button>
            <button className="text-left px-2 py-2 bg-gray-100 border border-gray-400 hover:bg-blue-50 rounded flex items-center gap-2"><Users size={14}/> Select Group</button>
            <div className="h-px bg-gray-300 my-1"></div>
            <button onClick={handlePromoteWait} className="text-left px-2 py-2 bg-gray-100 border border-gray-400 hover:bg-blue-50 rounded flex items-center gap-2"><UserPlus size={14}/> Promote Wait</button>
            <button 
              onClick={handleOffload} 
              disabled={!selectedPaxId ? true : (passengers.find(p => p.id === selectedPaxId)?.status === 'BOOKED')}
              className="text-left px-2 py-2 bg-gray-100 border border-gray-400 hover:bg-blue-50 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserMinus size={14}/> Offload Pax
            </button>
            <button 
              onClick={handleDeboard} 
              disabled={!selectedPaxId ? true : (passengers.find(p => p.id === selectedPaxId)?.status !== 'BOARDED')}
              className="text-left px-2 py-2 bg-gray-100 border border-gray-400 hover:bg-blue-50 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDown size={14}/> DEboard
            </button>
            <button onClick={handleAddNoRec} className="text-left px-2 py-2 bg-gray-100 border border-gray-400 hover:bg-blue-50 rounded flex items-center gap-2"><Plus size={14}/> Add NoRec</button>
            <div className="h-px bg-gray-300 my-1"></div>
            <button 
              onClick={() => {
                if (!selectedPaxId) return alert('Select a passenger first');
                const pax = passengers.find(p => p.id === selectedPaxId);
                if (pax) {
                  const comment = prompt('Enter boarding comment/notes:', pax.boardingComment || '');
                  if (comment !== null) {
                    const trimmedComment = comment.trim();
                    updatePassengerDetails(pax.pnr, { 
                      boardingComment: trimmedComment ? trimmedComment : undefined 
                    });
                    console.log('Comment updated:', {
                      pnr: pax.pnr,
                      comment: trimmedComment || 'undefined',
                      hasComment: !!trimmedComment
                    });
                  }
                }
              }}
              className="text-left px-2 py-2 bg-gray-100 border border-gray-400 hover:bg-blue-50 rounded flex items-center gap-2"
            >
              <MessageSquare size={14}/> Add Comment
            </button>
         </div>

         {/* CENTER LIST */}
         <div className="flex-1 flex flex-col bg-white">
            {/* Search & Filters */}
            <div className="p-2 border-b border-gray-300 flex gap-2 items-center bg-gray-50">
               <span className="text-gray-600">Search:</span>
               <input 
                 className="border border-gray-400 p-1 w-64 text-xs" 
                 placeholder="Name / PNR / Seq" 
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                     processScannedCode(e.currentTarget.value.trim());
                     e.currentTarget.value = '';
                   }
                 }}
               />
               <button className="bg-gray-200 border border-gray-400 px-3 py-1 rounded hover:bg-gray-300">Search</button>
               <button
                 onClick={async (e) => {
                   e.preventDefault();
                   if (isScanning) {
                     stopScanner();
                   } else {
                     // For iOS/iPad, we need to start the scanner directly from the click handler
                     // to preserve the user gesture chain for camera permission
                     await startScanner();
                   }
                 }}
                 className={clsx(
                   "flex items-center gap-1 px-3 py-1 rounded border text-xs",
                   isScanning 
                     ? "bg-red-200 border-red-400 hover:bg-red-300 text-red-800"
                     : "bg-blue-200 border-blue-400 hover:bg-blue-300 text-blue-800"
                 )}
               >
                 {isScanning ? (
                   <>
                     <CameraOff size={14} /> Stop Scan
                   </>
                 ) : (
                   <>
                     <Camera size={14} /> Scan QR
                   </>
                 )}
               </button>
               {scanError && (
                 <div className="flex items-center gap-2 text-red-600 text-xs">
                   <span>{scanError}</span>
                   <button onClick={() => setScanError(null)} className="text-red-800 hover:text-red-900">
                     <X size={14} />
                   </button>
                 </div>
               )}
               <div className="flex-1 text-right font-bold text-gray-600">Total Paxes: {filteredPassengers.length}</div>
            </div>
            
            {/* QR Scanner View */}
            {isScanning && (
              <div className="border-b border-gray-300 bg-black p-4 flex flex-col items-center">
                <div 
                  id="boarding-qr-reader" 
                  ref={scannerElementRef}
                  className="w-full max-w-md"
                ></div>
                <p className="text-white text-xs mt-2">Point camera at boarding pass QR code</p>
                <button
                  onClick={stopScanner}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Stop Scanning
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-400 bg-gray-100 pt-1 px-1 gap-1">
               {[
                 { id: 'ALL', label: `Total Pax (${flightPassengers.length})` },
                 { id: 'CHECKED_IN', label: `Checked-in (${stats.j.checkedIn + stats.y.checkedIn})` },
                 { id: 'BOARDED', label: `Boarded (${stats.j.boarded + stats.y.boarded})` },
                 { id: 'WAITLIST', label: 'WaitList (0)' }
               ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={clsx(
                     "px-3 py-1 rounded-t border border-b-0 text-xs",
                     activeTab === tab.id ? "bg-white border-gray-400 font-bold z-10 -mb-px" : "bg-gray-200 border-transparent text-gray-500 hover:bg-gray-300"
                   )}
                 >
                   {tab.label}
                 </button>
               ))}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[40px_60px_1fr_40px_40px_40px_40px_40px_40px_60px_1fr] bg-gray-100 border-b border-gray-400 text-[10px] font-bold text-gray-600 py-1 px-2">
               <div>Seq</div>
               <div>PNR</div>
               <div>Name</div>
               <div>Dest</div>
               <div>Cls</div>
               <div>Seat</div>
               <div>Gnd</div>
               <div>St</div>
               <div>Bag</div>
               <div>Wgt</div>
               <div>Action</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto">
               {filteredPassengers.map((p, i) => (
                 <div 
                   key={p.id}
                   onClick={() => setSelectedPaxId(p.id)}
                   className={clsx(
                     "grid grid-cols-[40px_60px_1fr_40px_40px_40px_40px_40px_40px_60px_1fr] border-b border-gray-200 text-[11px] py-1 px-2 items-center hover:bg-blue-50 cursor-pointer",
                     selectedPaxId === p.id ? "bg-blue-100" : (i % 2 === 0 ? "bg-white" : "bg-gray-50"),
                     p.status === 'BOARDED' ? "text-gray-400" : "text-black"
                   )}
                 >
                    <div className="font-mono">{i + 1}</div>
                    <div className="font-mono font-bold">{p.pnr}</div>
                    <div className="font-bold truncate pr-2">
                      {p.lastName}, {p.firstName}
                      {p.passengerType === 'STAFF_DUTY' && <span className="ml-1 text-[9px] bg-yellow-200 text-yellow-800 px-1 rounded">DUTY</span>}
                      {p.passengerType === 'STAFF_SBY' && <span className="ml-1 text-[9px] bg-orange-200 text-orange-800 px-1 rounded">SBY</span>}
                    </div>
                    <div>{selectedFlight.destination}</div>
                    <div>{getClass(p.seat)}</div>
                    <div className="font-bold">{p.seat || '-'}</div>
                    <div>
                       {getGender(p.firstName) === 'M' ? <User size={10} className="text-blue-600"/> : <User size={10} className="text-pink-500"/>}
                    </div>
                    <div>
                       {p.status === 'BOARDED' ? <CheckCircle size={12} className="text-green-600" /> : 
                        p.status === 'CHECKED_IN' ? <CheckCircle size={12} className="text-blue-600" /> : 
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />}
                    </div>
                    <div>{p.bagCount}</div>
                    <div>{p.bagCount * 23}</div>
                    <div className="flex items-center gap-1">
                       {p.status === 'CHECKED_IN' && (
                         <>
                           {p.boardingComment && p.boardingComment.trim() ? (
                             <span title={p.boardingComment} className="cursor-help">
                               <AlertCircle 
                                 size={14} 
                                 className="text-red-600 fill-red-600" 
                               />
                             </span>
                           ) : null}
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleBoardPax(p.pnr); }}
                             className="bg-green-600 text-white px-2 py-0.5 rounded text-[9px] hover:bg-green-700"
                           >
                             BOARD
                           </button>
                         </>
                       )}
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* RIGHT SIDEBAR - SEAT MAP */}
         <div className="w-48 bg-white border-l border-gray-400 flex flex-col">
            <div className="bg-gray-100 p-1 border-b border-gray-400 font-bold text-center text-gray-600">Seatmap</div>
            
            {/* Mini Zone Stats */}
            <div className="p-2 border-b border-gray-200">
               <div className="flex justify-between text-[10px] mb-1 font-bold text-gray-500"><span>Zone</span><span>Occ / Avail</span></div>
               <div className="flex justify-between bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] mb-1 rounded">
                  <span>Zone A</span><span>{stats.j.checkedIn} / {10 - stats.j.checkedIn}</span>
               </div>
               <div className="flex justify-between bg-green-100 border border-green-200 px-2 py-0.5 text-[10px] rounded">
                  <span>Zone B</span><span>{stats.y.checkedIn} / {135 - stats.y.checkedIn}</span>
               </div>
            </div>

            {/* Visual Map */}
            <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
               <div className="flex flex-col gap-1 items-center">
                  {/* Header */}
                  <div className="flex gap-4 text-[9px] font-bold text-gray-400 mb-1">
                     <span>ABC</span><span>DEF</span>
                  </div>
                  
                  {Array.from({ length: 25 }).map((_, r) => {
                     const row = r + 1;
                     return (
                        <div key={row} className="flex gap-2 items-center">
                           <div className="flex gap-px">
                              {['A','B','C'].map(col => {
                                 const seatId = `${row}${col}`;
                                 const pax = flightPassengers.find(p => p.seat === seatId);
                                 const isBoarded = pax?.status === 'BOARDED';
                                 const isCheckedIn = pax?.status === 'CHECKED_IN';
                                 
                                 return (
                                    <div key={seatId} className={clsx(
                                       "w-3 h-3 border rounded-[1px] text-[6px] flex items-center justify-center",
                                       isBoarded ? "bg-green-600 border-green-700" :
                                       isCheckedIn ? "bg-blue-600 border-blue-700" :
                                       pax ? "bg-yellow-200 border-yellow-400" :
                                       "bg-white border-gray-300 text-gray-300"
                                    )}>
                                    </div>
                                 );
                              })}
                           </div>
                           <div className="text-[8px] text-gray-400 font-mono w-3 text-center">{row}</div>
                           <div className="flex gap-px">
                              {['D','E','F'].map(col => {
                                 const seatId = `${row}${col}`;
                                 const pax = flightPassengers.find(p => p.seat === seatId);
                                 const isBoarded = pax?.status === 'BOARDED';
                                 const isCheckedIn = pax?.status === 'CHECKED_IN';
                                 
                                 return (
                                    <div key={seatId} className={clsx(
                                       "w-3 h-3 border rounded-[1px] text-[6px] flex items-center justify-center",
                                       isBoarded ? "bg-green-600 border-green-700" :
                                       isCheckedIn ? "bg-blue-600 border-blue-700" :
                                       pax ? "bg-yellow-200 border-yellow-400" :
                                       "bg-white border-gray-300 text-gray-300"
                                    )}>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
            
            {/* Legend */}
            <div className="p-2 border-t border-gray-200 text-[9px] text-gray-500 grid grid-cols-2 gap-1">
               <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-600 rounded-[1px]"/> Boarded</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-600 rounded-[1px]"/> Checked-in</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-200 rounded-[1px]"/> Booked</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 bg-white border border-gray-300 rounded-[1px]"/> Empty</div>
            </div>
         </div>
      </div>

      {/* 5. FOOTER */}
      <div className="bg-white border-t border-gray-400 text-[10px] p-1 flex justify-between items-center">
         <div className="flex gap-4 text-gray-600">
            <div>Time: {new Date().toLocaleTimeString()}</div>
            <div>Type: DEP</div>
            <div>Message: System Ready</div>
         </div>
         <div className="flex gap-2">
            <div className="flex items-center gap-1 text-green-600"><div className="w-2 h-2 rounded-full bg-green-500"/> TSCA LDCS ONLINE</div>
         </div>
      </div>

      {/* Scanner QR Code Modal */}
      {showScannerQR && selectedFlight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Connect Scanner</h2>
              <button
                onClick={() => setShowScannerQR(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code with the Scanner app to connect to flight:
              </p>
              <div className="bg-white p-4 rounded border-2 border-gray-300 inline-block">
                <QRCode
                  value={JSON.stringify({
                    type: 'FLIGHT_CONNECT',
                    flightId: selectedFlight.id,
                    flightNumber: selectedFlight.flightNumber,
                    origin: selectedFlight.origin,
                    destination: selectedFlight.destination,
                    std: selectedFlight.std
                  })}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-4">
                {selectedFlight.flightNumber} - {selectedFlight.origin} → {selectedFlight.destination}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && commentPassenger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText size={24} className="text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">Boarding Comment</h2>
            </div>
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Passenger:</div>
              <div className="font-bold text-lg text-gray-900">{commentPassenger.name}</div>
              <div className="text-xs text-gray-500 mt-1">PNR: {commentPassenger.pnr}</div>
            </div>
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">Comment:</div>
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-gray-800 whitespace-pre-wrap">
                {commentPassenger.comment}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Acknowledge and board the passenger
                  const result = boardPassenger(commentPassenger.pnr);
                  if (result) {
                    setShowCommentModal(false);
                    setCommentPassenger(null);
                  }
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                Acknowledge & Board
              </button>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentPassenger(null);
                }}
                className="px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Briefsheet Modal */}
      {showBriefsheet && selectedFlight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <Briefsheet 
              flight={selectedFlight} 
              passengers={passengers}
              onClose={() => setShowBriefsheet(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
