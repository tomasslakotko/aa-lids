import { useState, useMemo, useEffect, useRef } from 'react';
import { useAirportStore } from '../store/airportStore';
import type { Passenger, SecurityStatus } from '../store/airportStore';
import { Search, CheckCircle, AlertTriangle, Shield, User, Plane, Clock, X, ScanLine, Users, Camera, CameraOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import clsx from 'clsx';

export const SecurityApp = () => {
  const passengers = useAirportStore((state) => state.passengers);
  const flights = useAirportStore((state) => state.flights);
  const clearPassenger = useAirportStore((state) => state.clearPassenger);
  const flagPassenger = useAirportStore((state) => state.flagPassenger);
  const requireEscort = useAirportStore((state) => state.requireEscort);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);
  
  const [scanInput, setScanInput] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [securityNote, setSecurityNote] = useState('');
  const [activeView, setActiveView] = useState<'SCANNER' | 'QUEUE'>('SCANNER');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementRef = useRef<HTMLDivElement | null>(null);
  
  // Filter passengers who have checked in (eligible for security)
  const eligiblePassengers = useMemo(() => 
    passengers.filter(p => p.status === 'CHECKED_IN' || p.status === 'BOARDED'),
    [passengers]
  );
  
  // Queue: passengers pending security clearance
  const queuePassengers = useMemo(() => 
    eligiblePassengers
      .filter(p => !p.securityStatus || p.securityStatus === 'PENDING')
      .sort((a, b) => {
        const flightA = flights.find(f => f.id === a.flightId);
        const flightB = flights.find(f => f.id === b.flightId);
        if (!flightA || !flightB) return 0;
        return flightA.std.localeCompare(flightB.std);
      }),
    [eligiblePassengers, flights]
  );
  
  // Cleared passengers
  const clearedPassengers = useMemo(() => 
    eligiblePassengers.filter(p => p.securityStatus === 'CLEARED'),
    [eligiblePassengers]
  );
  
  // Flagged passengers
  const flaggedPassengers = useMemo(() => 
    eligiblePassengers.filter(p => p.securityStatus === 'FLAGGED' || p.securityStatus === 'ESCORT_REQUIRED'),
    [eligiblePassengers]
  );
  
  // Handle scan/search
  const handleScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const searchTerm = scanInput.toUpperCase().trim();
    
    if (!searchTerm) return;
    
    processScannedCode(searchTerm);
  };
  
  // Process scanned code (from QR code or manual input)
  const processScannedCode = (code: string) => {
    let pnr: string | null = null;
    
    // Try to parse as JSON (QR code from boarding pass)
    try {
      const qrData = JSON.parse(code);
      if (qrData.pnr) {
        pnr = qrData.pnr.toUpperCase();
      }
    } catch (e) {
      // Not JSON, try to extract PNR from text/barcode format
      const codeUpper = code.toUpperCase().trim();
      
      // Try to extract PNR from common barcode formats
      // Format 1: "M1SMITH/JOHN    EABC123 Y 15F 001" - PNR is after the name
      const pnrMatch = code.match(/\b([A-Z0-9]{6})\b/);
      if (pnrMatch) {
        pnr = pnrMatch[1];
      } else {
        // If no match, use the whole code as potential PNR
        pnr = codeUpper;
      }
    }
    
    if (!pnr) {
      setScanError(`Invalid code format: ${code}`);
      setScanInput('');
      return;
    }
    
    // Search by PNR or last name
    const found = passengers.find(p => 
      p.pnr === pnr || 
      p.lastName.toUpperCase() === pnr ||
      `${p.lastName}, ${p.firstName}`.toUpperCase().includes(pnr || '')
    );
    
    if (found) {
      setSelectedPassenger(found);
      setSecurityNote(found.securityNote || '');
      
      // If passenger doesn't have security status, set to PENDING
      if (!found.securityStatus) {
        updatePassengerDetails(found.pnr, { securityStatus: 'PENDING' });
      }
      
      setScanInput('');
      setScanError(null);
      
      // Stop scanning if active
      if (isScanning) {
        stopScanner();
      }
    } else {
      setScanError(`Passenger not found: ${pnr}`);
      setScanInput('');
    }
  };
  
  // Start camera scanner
  const startScanner = async () => {
    if (!scannerElementRef.current) return;
    
    try {
      const elementId = scannerElementRef.current.id || 'security-qr-reader';
      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Successfully scanned
          processScannedCode(decodedText);
        },
        (errorMessage) => {
          // Scanning error (usually just means no code detected yet)
          // Don't show error for normal scanning
        }
      );
      
      setIsScanning(true);
      setScanError(null);
    } catch (err: any) {
      console.error('Scanner error:', err);
      setScanError(err.message || 'Failed to start camera');
      setIsScanning(false);
    }
  };
  
  // Stop camera scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
    setScanError(null);
  };
  
  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopScanner();
      }
    };
  }, []);
  
  // Auto-focus scan input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setScanInput(prev => prev + e.key);
        }
      }
    };
    
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);
  
  const selectedFlight = selectedPassenger 
    ? flights.find(f => f.id === selectedPassenger.flightId)
    : null;
  
  const handleClear = () => {
    if (!selectedPassenger) return;
    clearPassenger(selectedPassenger.pnr);
    setSelectedPassenger(null);
    setSecurityNote('');
  };
  
  const handleFlag = () => {
    if (!selectedPassenger) return;
    flagPassenger(selectedPassenger.pnr, securityNote || undefined);
    setSelectedPassenger(null);
    setSecurityNote('');
  };
  
  const handleEscort = () => {
    if (!selectedPassenger) return;
    requireEscort(selectedPassenger.pnr, securityNote || undefined);
    setSelectedPassenger(null);
    setSecurityNote('');
  };
  
  const getStatusColor = (status?: SecurityStatus) => {
    switch (status) {
      case 'CLEARED': return 'bg-green-500';
      case 'FLAGGED': return 'bg-yellow-500';
      case 'ESCORT_REQUIRED': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };
  
  const getStatusIcon = (status?: SecurityStatus) => {
    switch (status) {
      case 'CLEARED': return CheckCircle;
      case 'FLAGGED': return AlertTriangle;
      case 'ESCORT_REQUIRED': return Shield;
      default: return Clock;
    }
  };
  
  return (
    <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border-b border-red-700/50 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Security Checkpoint</h1>
            <div className="text-sm text-red-200">Screening & Access Control</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-red-200 uppercase mb-1">Queue</div>
            <div className="text-2xl font-bold text-red-400">{queuePassengers.length}</div>
          </div>
          <div className="h-12 w-px bg-red-700/50" />
          <div className="text-right">
            <div className="text-xs text-green-200 uppercase mb-1">Cleared</div>
            <div className="text-2xl font-bold text-green-400">{clearedPassengers.length}</div>
          </div>
          <div className="h-12 w-px bg-red-700/50" />
          <div className="text-right">
            <div className="text-xs text-yellow-200 uppercase mb-1">Flagged</div>
            <div className="text-2xl font-bold text-yellow-400">{flaggedPassengers.length}</div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Scanner / Queue */}
        <div className="w-2/3 flex flex-col border-r border-slate-700">
          {/* View Toggle */}
          <div className="flex border-b border-slate-700 bg-slate-800/50">
            <button
              onClick={() => setActiveView('SCANNER')}
              className={clsx(
                "flex-1 px-6 py-3 font-semibold transition-colors flex items-center justify-center gap-2",
                activeView === 'SCANNER' 
                  ? "bg-red-600 text-white" 
                  : "bg-slate-800/50 text-slate-300 hover:bg-slate-700"
              )}
            >
              <ScanLine size={18} />
              Scanner
            </button>
            <button
              onClick={() => setActiveView('QUEUE')}
              className={clsx(
                "flex-1 px-6 py-3 font-semibold transition-colors flex items-center justify-center gap-2",
                activeView === 'QUEUE' 
                  ? "bg-red-600 text-white" 
                  : "bg-slate-800/50 text-slate-300 hover:bg-slate-700"
              )}
            >
              <Users size={18} />
              Queue ({queuePassengers.length})
            </button>
          </div>
          
          {/* Scanner View */}
          {activeView === 'SCANNER' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-black">
              <div className="w-full max-w-2xl">
                {/* Scanner Mode Toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => {
                      if (isScanning) stopScanner();
                    }}
                    className={clsx(
                      "flex-1 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2",
                      !isScanning
                        ? "bg-slate-700 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    )}
                  >
                    <Search size={18} />
                    Manual Input
                  </button>
                  <button
                    onClick={() => {
                      if (isScanning) {
                        stopScanner();
                      } else {
                        startScanner();
                      }
                    }}
                    className={clsx(
                      "flex-1 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2",
                      isScanning
                        ? "bg-red-600 text-white"
                        : "bg-slate-700 text-white hover:bg-slate-600"
                    )}
                  >
                    {isScanning ? (
                      <>
                        <CameraOff size={18} />
                        Stop Camera
                      </>
                    ) : (
                      <>
                        <Camera size={18} />
                        Start Camera
                      </>
                    )}
                  </button>
                </div>
                
                {/* Camera Scanner */}
                {isScanning && (
                  <div className="mb-4 relative">
                    <div
                      id="security-qr-reader"
                      ref={scannerElementRef}
                      className="w-full rounded-lg overflow-hidden bg-black"
                      style={{ minHeight: '300px' }}
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm font-bold">
                      Point camera at boarding pass QR code
                    </div>
                  </div>
                )}
                
                {/* Manual Input Form */}
                {!isScanning && (
                  <form onSubmit={handleScan} className="mb-8">
                    <div className="relative">
                      <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                      <input
                        type="text"
                        value={scanInput}
                        onChange={(e) => {
                          setScanInput(e.target.value.toUpperCase());
                          setScanError(null);
                        }}
                        placeholder="Enter PNR / Last Name or scan QR code..."
                        className="w-full pl-14 pr-4 py-4 bg-slate-800 border-2 border-slate-600 rounded-lg text-white text-lg font-mono placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        <Search size={20} />
                      </button>
                    </div>
                  </form>
                )}
                
                {/* Error Message */}
                {scanError && (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                    {scanError}
                  </div>
                )}
                
                {selectedPassenger && (
                  <div className="bg-slate-800 border-2 border-slate-600 rounded-lg p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-2xl font-bold">{selectedPassenger.lastName}, {selectedPassenger.firstName}</div>
                        <div className="text-slate-400 font-mono mt-1">{selectedPassenger.pnr}</div>
                      </div>
                      <div className={clsx(
                        "px-4 py-2 rounded-lg flex items-center gap-2 font-bold",
                        getStatusColor(selectedPassenger.securityStatus)
                      )}>
                        {(() => {
                          const Icon = getStatusIcon(selectedPassenger.securityStatus);
                          return <Icon size={20} />;
                        })()}
                        {selectedPassenger.securityStatus || 'PENDING'}
                      </div>
                    </div>
                    
                    {selectedFlight && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                        <div>
                          <div className="text-xs text-slate-400 uppercase mb-1">Flight</div>
                          <div className="text-lg font-bold">{selectedFlight.flightNumber}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 uppercase mb-1">Gate</div>
                          <div className="text-lg font-bold">{selectedFlight.gate}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 uppercase mb-1">STD</div>
                          <div className="text-lg font-mono">{selectedFlight.std}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 uppercase mb-1">Seat</div>
                          <div className="text-lg font-bold">{selectedPassenger.seat || 'N/A'}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t border-slate-700">
                      <label className="block text-sm font-semibold mb-2">Security Note</label>
                      <textarea
                        value={securityNote}
                        onChange={(e) => setSecurityNote(e.target.value)}
                        placeholder="Add security notes or observations..."
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleClear}
                        className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle size={20} />
                        Clear
                      </button>
                      <button
                        onClick={handleFlag}
                        className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <AlertTriangle size={20} />
                        Flag
                      </button>
                      <button
                        onClick={handleEscort}
                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Shield size={20} />
                        Escort
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPassenger(null);
                          setSecurityNote('');
                        }}
                        className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Queue View */}
          {activeView === 'QUEUE' && (
            <div className="flex-1 overflow-y-auto p-4 bg-slate-900">
              <div className="space-y-2">
                {queuePassengers.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No passengers in queue</p>
                    <p className="text-sm">All checked-in passengers have been processed</p>
                  </div>
                ) : (
                  queuePassengers.map((p) => {
                    const flight = flights.find(f => f.id === p.flightId);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPassenger(p);
                          setSecurityNote(p.securityNote || '');
                          setActiveView('SCANNER');
                        }}
                        className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="text-xl font-bold">{p.lastName}, {p.firstName}</div>
                              <div className="text-slate-400 font-mono text-sm">{p.pnr}</div>
                            </div>
                            {flight && (
                              <div className="flex items-center gap-4 mt-2 text-sm text-slate-300">
                                <span className="font-mono font-bold">{flight.flightNumber}</span>
                                <span>Gate {flight.gate}</span>
                                <span className="font-mono">{flight.std}</span>
                                {p.seat && <span>Seat {p.seat}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="text-yellow-400" size={20} />
                            <span className="text-xs text-slate-400">Pending</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Right Panel: Status Overview */}
        <div className="w-1/3 bg-slate-800/50 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-bold">Security Status</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Flagged Passengers */}
            {flaggedPassengers.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-yellow-400 uppercase mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Flagged ({flaggedPassengers.length})
                </h3>
                <div className="space-y-2">
                  {flaggedPassengers.slice(0, 5).map((p) => {
                    const flight = flights.find(f => f.id === p.flightId);
                    return (
                      <div key={p.id} className="bg-red-900/20 border border-red-700/50 rounded p-3">
                        <div className="font-bold text-sm">{p.lastName}, {p.firstName}</div>
                        <div className="text-xs text-slate-400 font-mono">{p.pnr}</div>
                        {flight && (
                          <div className="text-xs text-slate-300 mt-1">
                            {flight.flightNumber} • Gate {flight.gate}
                          </div>
                        )}
                        {p.securityNote && (
                          <div className="text-xs text-yellow-300 mt-1 italic">"{p.securityNote}"</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Recently Cleared */}
            {clearedPassengers.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-green-400 uppercase mb-2 flex items-center gap-2">
                  <CheckCircle size={16} />
                  Cleared ({clearedPassengers.length})
                </h3>
                <div className="space-y-2">
                  {clearedPassengers.slice(-5).reverse().map((p) => {
                    const flight = flights.find(f => f.id === p.flightId);
                    return (
                      <div key={p.id} className="bg-green-900/20 border border-green-700/50 rounded p-3">
                        <div className="font-bold text-sm">{p.lastName}, {p.firstName}</div>
                        <div className="text-xs text-slate-400 font-mono">{p.pnr}</div>
                        {flight && (
                          <div className="text-xs text-slate-300 mt-1">
                            {flight.flightNumber} • Gate {flight.gate}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
