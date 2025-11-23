import { useState, useMemo, useEffect, useRef } from 'react';
import { useAirportStore } from '../store/airportStore';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, Plane, CheckCircle, X, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export const ScannerApp = () => {
  const [selectedFlightId, setSelectedFlightId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<{ name: string; pnr: string; success: boolean } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementRef = useRef<HTMLDivElement | null>(null);

  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);
  const boardPassenger = useAirportStore((state) => state.boardPassenger);

  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  // Filter passengers for selected flight
  const flightPassengers = useMemo(() => 
    passengers.filter(p => p.flightId === selectedFlightId),
    [passengers, selectedFlightId]
  );

  // Statistics for selected flight
  const stats = useMemo(() => {
    const checkedIn = flightPassengers.filter(p => p.status === 'CHECKED_IN' || p.status === 'BOARDED').length;
    const boarded = flightPassengers.filter(p => p.status === 'BOARDED').length;
    const total = flightPassengers.length;
    return { checkedIn, boarded, total };
  }, [flightPassengers]);

  // Process scanned QR code from boarding pass
  const processScannedCode = (code: string) => {
    let pnr: string | null = null;
    let passengerId: string | null = null;
    
    // Try to parse as JSON (QR code from boarding pass)
    try {
      const qrData = JSON.parse(code);
      if (qrData.pnr) {
        pnr = qrData.pnr.toUpperCase();
      }
      if (qrData.passengerId) {
        passengerId = qrData.passengerId;
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
      setScanError(`Invalid QR code format`);
      setLastScanned({ name: 'Unknown', pnr: 'INVALID', success: false });
      return;
    }
    
    // Find passenger by PNR or passengerId
    const found = passengers.find(p => 
      (pnr && p.pnr === pnr) || 
      (passengerId && p.id === passengerId)
    );
    
    if (!found) {
      setScanError(`Passenger not found: ${pnr || passengerId}`);
      setLastScanned({ name: 'Not Found', pnr: pnr || passengerId || 'UNKNOWN', success: false });
      return;
    }
    
    // Check if passenger is on the selected flight
    if (selectedFlightId && found.flightId !== selectedFlightId) {
      const passengerFlight = flights.find(f => f.id === found.flightId);
      setScanError(`Passenger is on flight ${passengerFlight?.flightNumber || found.flightId}, not ${selectedFlight?.flightNumber || selectedFlightId}`);
      setLastScanned({ 
        name: `${found.lastName}, ${found.firstName}`, 
        pnr: found.pnr, 
        success: false 
      });
      return;
    }
    
    // Check if passenger can be boarded
    if (found.status === 'BOARDED') {
      setScanError(`Already boarded`);
      setLastScanned({ 
        name: `${found.lastName}, ${found.firstName}`, 
        pnr: found.pnr, 
        success: false 
      });
      return;
    }
    
    if (found.status !== 'CHECKED_IN') {
      setScanError(`Not checked in (status: ${found.status})`);
      setLastScanned({ 
        name: `${found.lastName}, ${found.firstName}`, 
        pnr: found.pnr, 
        success: false 
      });
      return;
    }
    
    // Auto-board the passenger
    const result = boardPassenger(found.pnr);
    if (result) {
      setScanError(null);
      setLastScanned({ 
        name: `${found.lastName}, ${found.firstName}`, 
        pnr: found.pnr, 
        success: true 
      });
      // Play success sound (optional)
      // Success feedback is visual
    } else {
      setScanError(`Failed to board`);
      setLastScanned({ 
        name: `${found.lastName}, ${found.firstName}`, 
        pnr: found.pnr, 
        success: false 
      });
    }
  };

  // Start camera scanner
  const startScanner = async () => {
    if (!selectedFlightId) {
      setScanError('Please select a flight first');
      return;
    }

    // Set scanning state first so the element gets rendered
    setIsScanning(true);
    setScanError(null);
    
    // Wait for DOM to update
    requestAnimationFrame(() => {
      setTimeout(async () => {
        if (!scannerElementRef.current) {
          setIsScanning(false);
          setScanError('Scanner element not found');
          return;
        }
        
        try {
          const elementId = scannerElementRef.current.id || 'scanner-qr-reader';
          const html5QrCode = new Html5Qrcode(elementId);
          scannerRef.current = html5QrCode;
          
          // Try to start with environment camera first, fallback to any camera
          let cameraConfig = { facingMode: 'environment' };
          try {
            await html5QrCode.start(
              cameraConfig,
              {
                fps: 10,
                qrbox: { width: 300, height: 300 },
                aspectRatio: 1.0,
              },
              (decodedText) => {
                processScannedCode(decodedText);
              },
              (_errorMessage) => {
                // Ignore scanning errors
              }
            );
          } catch (envErr: any) {
            // If environment camera fails, try any available camera
            if (envErr.name === 'NotFoundError' || envErr.message?.includes('environment') || envErr.message?.includes('not found')) {
              console.log('Environment camera not found, trying any available camera');
              cameraConfig = { facingMode: 'user' };
              await html5QrCode.start(
                cameraConfig,
                {
                  fps: 10,
                  qrbox: { width: 300, height: 300 },
                  aspectRatio: 1.0,
                },
                (decodedText) => {
                  processScannedCode(decodedText);
                },
                (_errorMessage) => {
                  // Ignore scanning errors
                }
              );
            } else {
              throw envErr;
            }
          }
        } catch (err: any) {
          console.error('Scanner error:', err);
          let errorMsg = 'Failed to start camera';
          
          // Check for specific error types
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMsg = 'Camera access denied. Please allow camera access in your browser settings.';
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMsg = 'No camera found. Please connect a camera.';
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMsg = 'Camera is already in use by another application.';
          } else if (err.name === 'OverconstrainedError') {
            errorMsg = 'Camera does not support required settings.';
          } else if (err.message) {
            // Check if error message indicates browser support issue
            if (err.message.includes('getUserMedia') || err.message.includes('not supported') || err.message.includes('not available')) {
              errorMsg = 'Camera access is not supported. Please use Chrome, Safari, Firefox, or Edge with HTTPS.';
            } else {
              errorMsg = err.message;
            }
          }
          
          setScanError(errorMsg);
          setIsScanning(false);
          if (scannerRef.current) {
            try {
              scannerRef.current.stop().catch(() => {});
              scannerRef.current.clear();
            } catch (e) {}
            scannerRef.current = null;
          }
        }
      }, 100);
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

  // Clear last scanned after 3 seconds
  useEffect(() => {
    if (lastScanned) {
      const timer = setTimeout(() => {
        setLastScanned(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastScanned]);

  return (
    <div className="h-full w-full bg-gray-900 flex flex-col text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plane size={24} />
            QR Scanner
          </h1>
          {isScanning && (
            <button
              onClick={stopScanner}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
            >
              <CameraOff size={20} />
              Stop Scanning
            </button>
          )}
        </div>

        {/* Flight Selection */}
        <div className="flex gap-4 items-center">
          <label className="text-sm font-semibold">Flight:</label>
          <select
            value={selectedFlightId}
            onChange={(e) => {
              setSelectedFlightId(e.target.value);
              if (isScanning) {
                stopScanner();
              }
            }}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            disabled={isScanning}
          >
            <option value="">-- Select Flight --</option>
            {flights
              .filter(f => f.status !== 'ARRIVED' && f.status !== 'CANCELLED')
              .sort((a, b) => a.std.localeCompare(b.std))
              .map(flight => (
                <option key={flight.id} value={flight.id}>
                  {flight.flightNumber} - {flight.origin} → {flight.destination} ({flight.std})
                </option>
              ))}
          </select>
        </div>

        {/* Flight Stats */}
        {selectedFlight && (
          <div className="mt-4 flex gap-6 text-sm">
            <div>
              <span className="text-gray-400">Total:</span>
              <span className="ml-2 font-bold">{stats.total}</span>
            </div>
            <div>
              <span className="text-gray-400">Checked In:</span>
              <span className="ml-2 font-bold text-blue-400">{stats.checkedIn}</span>
            </div>
            <div>
              <span className="text-gray-400">Boarded:</span>
              <span className="ml-2 font-bold text-green-400">{stats.boarded}</span>
            </div>
            <div>
              <span className="text-gray-400">Gate:</span>
              <span className="ml-2 font-bold">{selectedFlight.gate || 'TBA'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {!selectedFlightId ? (
          <div className="text-center text-gray-400">
            <Plane size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl">Please select a flight to start scanning</p>
          </div>
        ) : !isScanning ? (
          <div className="text-center">
            <Camera size={64} className="mx-auto mb-4 text-gray-400" />
            <p className="text-xl mb-4 text-gray-300">Ready to scan boarding passes</p>
            <button
              onClick={startScanner}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-bold flex items-center gap-3 mx-auto"
            >
              <Camera size={24} />
              Start Scanning
            </button>
          </div>
        ) : (
          <>
            <div 
              id="scanner-qr-reader" 
              ref={scannerElementRef}
              className="w-full max-w-2xl"
            ></div>
            <p className="mt-4 text-gray-300 text-center">
              Point camera at boarding pass QR code
            </p>
          </>
        )}

        {/* Error Message */}
        {scanError && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-600 border border-red-700 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle size={24} />
            <span className="flex-1">{scanError}</span>
            <button onClick={() => setScanError(null)} className="text-red-200 hover:text-white">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Success/Last Scanned Feedback */}
        {lastScanned && (
          <div className={clsx(
            "absolute top-4 left-4 right-4 rounded-lg p-4 border-2 shadow-lg",
            lastScanned.success 
              ? "bg-green-600 border-green-500" 
              : "bg-red-600 border-red-500"
          )}>
            <div className="flex items-center gap-3">
              {lastScanned.success ? (
                <CheckCircle size={32} className="text-green-200" />
              ) : (
                <X size={32} className="text-red-200" />
              )}
              <div className="flex-1">
                <div className="font-bold text-lg">
                  {lastScanned.success ? 'BOARDED' : 'FAILED'}
                </div>
                <div className="text-sm opacity-90">
                  {lastScanned.name} ({lastScanned.pnr})
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

