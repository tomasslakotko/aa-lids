import { useState, useMemo, useEffect, useRef } from 'react';
import { useAirportStore } from '../store/airportStore';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, Plane, CheckCircle, X, AlertCircle, FileText } from 'lucide-react';
import clsx from 'clsx';

export const ScannerApp = () => {
  const [selectedFlightId, setSelectedFlightId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<{ name: string; pnr: string; success: boolean } | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentPassenger, setCommentPassenger] = useState<{ name: string; pnr: string; comment: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);
  const boardPassenger = useAirportStore((state) => state.boardPassenger);
  const checkInPassenger = useAirportStore((state) => state.checkInPassenger);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);

  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  // Filter passengers for selected flight
  const flightPassengers = useMemo(() => 
    passengers.filter(p => p.flightId === selectedFlightId),
    [passengers, selectedFlightId]
  );

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  // Play success sound (pleasant ding-dong)
  const playSuccessSound = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    
    // iOS/iPad requires AudioContext to be resumed after user interaction
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('Could not resume AudioContext:', e);
        return;
      }
    }
    
    const t = ctx.currentTime;

    // Success sound: Pleasant high-low chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.frequency.setValueAtTime(523.25, t); // C5 - high note
    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc1.start(t);
    osc1.stop(t + 0.3);

    // Second note: lower, pleasant
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.frequency.setValueAtTime(659.25, t + 0.15); // E5 - higher note for success
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.setValueAtTime(0.15, t + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc2.start(t);
    osc2.stop(t + 0.5);
  };

  // Play warning sound (already boarded - lower, warning tone)
  const playWarningSound = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    
    // iOS/iPad requires AudioContext to be resumed after user interaction
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('Could not resume AudioContext:', e);
        return;
      }
    }
    
    const t = ctx.currentTime;

    // Warning sound: Lower, more urgent tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.frequency.setValueAtTime(392.00, t); // G4 - lower note
    gain1.gain.setValueAtTime(0.2, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc1.start(t);
    osc1.stop(t + 0.2);

    // Second note: even lower, warning
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.frequency.setValueAtTime(311.13, t + 0.1); // D#4 - lower warning note
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.setValueAtTime(0.2, t + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc2.start(t);
    osc2.stop(t + 0.4);
  };

  // Statistics for selected flight
  const stats = useMemo(() => {
    const checkedIn = flightPassengers.filter(p => p.status === 'CHECKED_IN' || p.status === 'BOARDED').length;
    const boarded = flightPassengers.filter(p => p.status === 'BOARDED').length;
    const total = flightPassengers.length;
    return { checkedIn, boarded, total };
  }, [flightPassengers]);

  // Process scanned QR code from boarding pass or flight connection
  const processScannedCode = async (code: string) => {
    // First, check if this is a flight connection QR code
    try {
      const qrData = JSON.parse(code);
      if (qrData.type === 'FLIGHT_CONNECT' && qrData.flightId) {
        // This is a flight connection QR code
        console.log('Flight connection QR scanned:', qrData);
        setSelectedFlightId(qrData.flightId);
        setScanError(null);
        setLastScanned({ 
          name: `Flight ${qrData.flightNumber}`, 
          pnr: qrData.flightId, 
          success: true 
        });
        // Stop scanning after connecting to flight
        if (scannerRef.current) {
          await stopScanner();
        }
        return;
      }
    } catch (e) {
      // Not a flight connection QR, continue with passenger boarding pass logic
    }
    
    // If no flight is selected, show error
    if (!selectedFlightId) {
      setScanError('Please scan flight connection QR code first');
      setLastScanned({ name: 'No Flight', pnr: 'NONE', success: false });
      return;
    }
    
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
      // Play warning sound for already boarded
      playWarningSound().catch(console.error);
      return;
    }
    
    // Auto-check-in if passenger is not checked in yet
    if (found.status === 'BOOKED') {
      console.log('Passenger not checked in, auto-checking in...');
      const checkInResult = await checkInPassenger(found.pnr);
      if (!checkInResult) {
        setScanError(`Failed to check in passenger`);
        setLastScanned({ 
          name: `${found.lastName}, ${found.firstName}`, 
          pnr: found.pnr, 
          success: false 
        });
        return;
      }
      // Refresh passenger data after check-in
      const updatedState = useAirportStore.getState();
      const updatedPassenger = updatedState.passengers.find(p => p.pnr === pnr);
      if (!updatedPassenger || updatedPassenger.status !== 'CHECKED_IN') {
        setScanError(`Check-in completed but status is ${updatedPassenger?.status || 'unknown'}`);
        setLastScanned({ 
          name: `${found.lastName}, ${found.firstName}`, 
          pnr: found.pnr, 
          success: false 
        });
        return;
      }
      // Update found passenger reference with all updated data
      found.status = 'CHECKED_IN';
      found.seat = updatedPassenger.seat;
      found.boardingComment = updatedPassenger.boardingComment; // Update comment from database
      console.log('Auto-check-in successful, seat assigned:', updatedPassenger.seat);
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
    
    // Check if passenger has a boarding comment - refresh from store to get latest data
    const currentPassenger = passengers.find(p => p.pnr === found.pnr);
    const commentToCheck = currentPassenger?.boardingComment || found.boardingComment;
    
    console.log('Checking for boarding comment:', {
      pnr: found.pnr,
      foundComment: found.boardingComment,
      currentComment: currentPassenger?.boardingComment,
      commentToCheck: commentToCheck,
      hasComment: !!(commentToCheck && commentToCheck.trim())
    });
    
    if (commentToCheck && commentToCheck.trim()) {
      console.log('Passenger has comment, showing modal');
      // Show comment modal before boarding
      setCommentPassenger({
        name: `${found.lastName}, ${found.firstName}`,
        pnr: found.pnr,
        comment: commentToCheck
      });
      setShowCommentModal(true);
      // Don't board yet - wait for acknowledge
      return;
    }
    
    // Auto-board the passenger
    console.log('Attempting to board passenger:', {
      pnr: found.pnr,
      name: `${found.lastName}, ${found.firstName}`,
      status: found.status,
      seat: found.seat,
      flightId: found.flightId,
      selectedFlightId: selectedFlightId
    });
    
    const result = boardPassenger(found.pnr);
    console.log('Board result:', result);
    
    if (result) {
      setScanError(null);
      setLastScanned({ 
        name: `${found.lastName}, ${found.firstName}`, 
        pnr: found.pnr, 
        success: true 
      });
      // Play success sound for successful boarding
      playSuccessSound().catch(console.error);
    } else {
      // Get fresh passenger data to see current status
      const currentPassenger = passengers.find(p => p.pnr === found.pnr);
      console.error('Failed to board passenger:', {
        pnr: found.pnr,
        currentStatus: currentPassenger?.status,
        originalStatus: found.status
      });
      setScanError(`Failed to board - Status: ${currentPassenger?.status || found.status}`);
      setLastScanned({ 
        name: `${found.lastName}, ${found.firstName}`, 
        pnr: found.pnr, 
        success: false 
      });
    }
  };

  // Start camera scanner
  const startScanner = async () => {
    // Allow starting scanner even without flight - user can scan flight QR first
    // Set scanning state FIRST - makes element visible
    setIsScanning(true);
    setScanError(null);

    // For iOS, try requesting permission directly first
    // This must happen in the same user gesture
    console.log('Starting camera permission request...');
    console.log('Is secure context:', window.isSecureContext);
    console.log('Protocol:', window.location.protocol);
    console.log('Hostname:', window.location.hostname);
    
    let stream: MediaStream | null = null;
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext && window.location.protocol !== 'https:' && 
          window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setIsScanning(false);
        setScanError('Camera requires HTTPS. Please use HTTPS or access via localhost. For iPad/iPhone, you may need to deploy to a server with HTTPS.');
        console.error('Not a secure context - camera will not work');
        return;
      }
      
      // Request camera permission directly - this triggers the iOS permission prompt
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('Calling getUserMedia...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        console.log('getUserMedia succeeded, got stream');
        // Stop the stream immediately - we just wanted permission
        stream.getTracks().forEach(track => track.stop());
      } else {
        setIsScanning(false);
        setScanError('Camera API not available. Please use a modern browser.');
        return;
      }
    } catch (permErr: any) {
      console.error('Permission error:', permErr);
      console.error('Error name:', permErr.name);
      console.error('Error message:', permErr.message);
      // Permission was denied or error occurred
      setIsScanning(false);
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        setScanError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (permErr.name === 'NotFoundError') {
        setScanError('No camera found. Please connect a camera.');
      } else {
        setScanError(`Camera error: ${permErr.message || 'Please allow camera access'}`);
      }
      return;
    }

    // Now start the scanner with the element
    const element = scannerElementRef.current;
    if (!element) {
      setIsScanning(false);
      setScanError('Scanner element not ready. Please try again.');
      return;
    }

    try {
      const elementId = element.id || 'scanner-qr-reader';
      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;
      
      // Start the scanner - permission is already granted
      try {
        // Calculate QR box size based on screen width (mobile optimized)
        const qrBoxSize = Math.min(window.innerWidth * 0.8, 400);
        
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: qrBoxSize, height: qrBoxSize },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            await processScannedCode(decodedText);
          },
          (_errorMessage) => {
            // Ignore scanning errors
          }
        );
      } catch (envErr: any) {
        // If environment camera fails, try user-facing camera (front camera)
        if (envErr.name === 'NotFoundError' || envErr.message?.includes('environment') || envErr.message?.includes('not found')) {
          console.log('Environment camera not found, trying user-facing camera');
          // Calculate QR box size based on screen width (mobile optimized)
          const qrBoxSize = Math.min(window.innerWidth * 0.8, 400);
          
          await html5QrCode.start(
            { facingMode: 'user' },
            {
              fps: 10,
              qrbox: { width: qrBoxSize, height: qrBoxSize },
              aspectRatio: 1.0,
            },
            async (decodedText) => {
              await processScannedCode(decodedText);
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
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
        
        let errorMsg = 'Failed to start camera';
        
        // Check for specific error types
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = 'Camera access denied. Please allow camera access in your browser settings and try again.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = 'No camera found. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = 'Camera is already in use by another application. Please close other apps using the camera.';
        } else if (err.message) {
          const msg = err.message.toLowerCase();
          if (msg.includes('permission') || msg.includes('denied') || msg.includes('not allowed')) {
            errorMsg = 'Camera access denied. Please allow camera access in your browser settings.';
          } else if (msg.includes('not found') || msg.includes('no device')) {
            errorMsg = 'No camera found. Please connect a camera.';
          } else if (msg.includes('in use') || msg.includes('busy')) {
            errorMsg = 'Camera is already in use. Please close other apps using the camera.';
          } else if (msg.includes('https') || msg.includes('secure')) {
            errorMsg = 'Camera access requires HTTPS. Please access this app via HTTPS or localhost.';
          } else {
            errorMsg = `Camera error: ${err.message}`;
          }
        }
        
        setScanError(errorMsg);
        setIsScanning(false);
        if (scannerRef.current) {
          try {
            scannerRef.current.stop().catch(() => {});
            scannerRef.current.clear();
          } catch (e) {
            console.error('Error cleaning up scanner:', e);
          }
          scannerRef.current = null;
        }
      }
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
      {/* Header - Compact on mobile */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Plane size={20} className="sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">QR Scanner</span>
            <span className="sm:hidden">Scanner</span>
          </h1>
          {isScanning && (
            <button
              onClick={stopScanner}
              className="flex items-center gap-2 px-4 py-3 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg text-base sm:text-sm font-semibold touch-manipulation"
            >
              <CameraOff size={20} />
              <span className="hidden sm:inline">Stop Scanning</span>
              <span className="sm:hidden">Stop</span>
            </button>
          )}
        </div>

        {/* Flight Info - Mobile optimized */}
        {selectedFlight ? (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
            <label className="text-xs sm:text-sm font-semibold hidden sm:inline">Connected Flight:</label>
            <div className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2.5 sm:py-2 text-white text-sm sm:text-base">
              <div className="font-bold">{selectedFlight.flightNumber}</div>
              <div className="text-xs text-gray-300 sm:hidden">{selectedFlight.origin} → {selectedFlight.destination} ({selectedFlight.std})</div>
              <div className="hidden sm:inline">{selectedFlight.origin} → {selectedFlight.destination} ({selectedFlight.std})</div>
            </div>
            <button
              onClick={() => {
                setSelectedFlightId('');
                if (isScanning) {
                  stopScanner();
                }
              }}
              className="px-4 py-3 sm:px-3 sm:py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 rounded text-sm font-semibold touch-manipulation"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="bg-yellow-900 border border-yellow-700 rounded px-3 py-2.5 sm:px-4 sm:py-2 text-yellow-200 text-xs sm:text-sm">
            <strong>No flight connected.</strong> <span className="hidden sm:inline">Scan the flight connection QR code from Boarding Gate app to start scanning boarding passes.</span>
            <span className="sm:hidden">Scan flight QR code first.</span>
          </div>
        )}

        {/* Flight Stats - Mobile optimized */}
        {selectedFlight && (
          <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:flex sm:gap-6 gap-3 text-xs sm:text-sm">
            <div className="bg-gray-700 rounded px-2 py-1.5 sm:bg-transparent sm:p-0">
              <span className="text-gray-400 block sm:inline">Total:</span>
              <span className="ml-0 sm:ml-2 font-bold text-lg sm:text-base block sm:inline">{stats.total}</span>
            </div>
            <div className="bg-gray-700 rounded px-2 py-1.5 sm:bg-transparent sm:p-0">
              <span className="text-gray-400 block sm:inline">Checked In:</span>
              <span className="ml-0 sm:ml-2 font-bold text-blue-400 text-lg sm:text-base block sm:inline">{stats.checkedIn}</span>
            </div>
            <div className="bg-gray-700 rounded px-2 py-1.5 sm:bg-transparent sm:p-0">
              <span className="text-gray-400 block sm:inline">Boarded:</span>
              <span className="ml-0 sm:ml-2 font-bold text-green-400 text-lg sm:text-base block sm:inline">{stats.boarded}</span>
            </div>
            <div className="bg-gray-700 rounded px-2 py-1.5 sm:bg-transparent sm:p-0">
              <span className="text-gray-400 block sm:inline">Gate:</span>
              <span className="ml-0 sm:ml-2 font-bold text-lg sm:text-base block sm:inline">{selectedFlight.gate || 'TBA'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Scanner Area - Mobile optimized */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden">
        {!selectedFlightId ? (
          <>
            {/* Always render the scanner element (hidden when not scanning) for iOS compatibility */}
            <div 
              id="scanner-qr-reader" 
              ref={scannerElementRef}
              className={clsx(
                "w-full max-w-2xl",
                !isScanning && "hidden"
              )}
            ></div>
            
            {!isScanning ? (
              <div className="text-center text-gray-400 px-4">
                <Plane size={48} className="sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                <p className="text-base sm:text-lg mb-2 font-semibold">Scan flight connection QR code first</p>
                <p className="text-xs sm:text-sm text-gray-500 mb-6">Get the QR code from Boarding Gate app</p>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    await startScanner();
                  }}
                  className="px-8 py-4 sm:px-8 sm:py-4 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-xl text-base sm:text-lg font-bold flex items-center justify-center gap-3 mx-auto w-full max-w-xs touch-manipulation shadow-lg"
                >
                  <Camera size={28} className="sm:w-6 sm:h-6" />
                  <span>Scan Flight QR Code</span>
                </button>
              </div>
            ) : (
              <p className="mt-4 text-gray-300 text-center text-sm sm:text-base px-4">
                Point camera at flight connection QR code
              </p>
            )}
          </>
        ) : (
          <>
            {/* Always render the scanner element (hidden when not scanning) for iOS compatibility */}
            <div 
              id="scanner-qr-reader" 
              ref={scannerElementRef}
              className={clsx(
                "w-full max-w-2xl",
                !isScanning && "hidden"
              )}
            ></div>
            
            {!isScanning && (
              <div className="text-center px-4 w-full">
                <Camera size={48} className="sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg sm:text-xl mb-6 text-gray-300 font-semibold">Ready to scan boarding passes</p>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    await startScanner();
                  }}
                  className="px-8 py-5 sm:px-8 sm:py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl text-base sm:text-lg font-bold flex items-center justify-center gap-3 mx-auto w-full max-w-xs touch-manipulation shadow-lg"
                >
                  <Camera size={28} className="sm:w-6 sm:h-6" />
                  <span>Start Scanning Boarding Passes</span>
                </button>
              </div>
            )}
            {isScanning && (
              <div className="absolute bottom-4 left-0 right-0 px-4">
                <p className="text-gray-300 text-center text-sm sm:text-base bg-black bg-opacity-50 rounded-lg py-2 px-4">
                  Point camera at boarding pass QR code
                </p>
              </div>
            )}
          </>
        )}

        {/* Error Message - Mobile optimized */}
        {scanError && (
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 bg-red-600 border border-red-700 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3 z-50 shadow-lg">
            <AlertCircle size={20} className="sm:w-6 sm:h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-bold mb-1 text-sm sm:text-base">Camera Error</div>
              <div className="text-xs sm:text-sm">{scanError}</div>
              {scanError.includes('denied') && (
                <div className="text-xs mt-2 opacity-90">
                  Tip: Check your browser's address bar for a camera icon and click it to allow access.
                </div>
              )}
            </div>
            <button 
              onClick={() => setScanError(null)} 
              className="text-red-200 hover:text-white active:text-red-100 touch-manipulation flex-shrink-0 p-1"
            >
              <X size={20} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        )}

        {/* Success/Last Scanned Feedback - Mobile optimized */}
        {lastScanned && (
          <div className={clsx(
            "absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 rounded-lg p-3 sm:p-4 border-2 shadow-lg z-50",
            lastScanned.success 
              ? "bg-green-600 border-green-500" 
              : "bg-red-600 border-red-500"
          )}>
            <div className="flex items-center gap-2 sm:gap-3">
              {lastScanned.success ? (
                <CheckCircle size={28} className="sm:w-8 sm:h-8 text-green-200 flex-shrink-0" />
              ) : (
                <X size={28} className="sm:w-8 sm:h-8 text-red-200 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base sm:text-lg">
                  {lastScanned.success ? 'BOARDED' : 'FAILED'}
                </div>
                <div className="text-xs sm:text-sm opacity-90 truncate">
                  {lastScanned.name} ({lastScanned.pnr})
                </div>
              </div>
              <button
                onClick={() => {
                  const found = passengers.find(p => p.pnr === lastScanned.pnr);
                  if (found) {
                    const comment = prompt('Add or edit boarding comment:', found.boardingComment || '');
                    if (comment !== null) {
                      updatePassengerDetails(found.pnr, { boardingComment: comment || undefined });
                    }
                  }
                }}
                className="px-3 py-2 sm:px-3 sm:py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 active:bg-opacity-40 text-white rounded text-xs sm:text-sm font-semibold flex items-center gap-1 touch-manipulation flex-shrink-0"
                title="Add/Edit Comment"
              >
                <FileText size={16} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Comment</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comment Modal - Mobile optimized */}
      {showCommentModal && commentPassenger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <FileText size={20} className="sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Boarding Comment</h2>
            </div>
            <div className="mb-3 sm:mb-4">
              <div className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Passenger:</div>
              <div className="font-bold text-base sm:text-lg text-gray-900">{commentPassenger.name}</div>
              <div className="text-xs text-gray-500 mt-1">PNR: {commentPassenger.pnr}</div>
            </div>
            <div className="mb-4 sm:mb-6">
              <div className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Comment:</div>
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 sm:p-4 text-sm sm:text-base text-gray-800 whitespace-pre-wrap">
                {commentPassenger.comment}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  // Acknowledge and board the passenger
                  const found = passengers.find(p => p.pnr === commentPassenger.pnr);
                  if (found) {
                    const result = boardPassenger(found.pnr);
                    if (result) {
                      setScanError(null);
                      setLastScanned({ 
                        name: commentPassenger.name, 
                        pnr: commentPassenger.pnr, 
                        success: true 
                      });
                      playSuccessSound().catch(console.error);
                    }
                  }
                  setShowCommentModal(false);
                  setCommentPassenger(null);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-4 sm:py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-base sm:text-sm touch-manipulation"
              >
                <CheckCircle size={20} />
                Acknowledge & Board
              </button>
              <button
                onClick={() => {
                  // Edit comment
                  const found = passengers.find(p => p.pnr === commentPassenger.pnr);
                  if (found) {
                    const newComment = prompt('Edit boarding comment:', found.boardingComment || '');
                    if (newComment !== null) {
                      updatePassengerDetails(found.pnr, { boardingComment: newComment || undefined });
                      // Update the modal with new comment
                      setCommentPassenger({
                        ...commentPassenger,
                        comment: newComment || ''
                      });
                    }
                  }
                }}
                className="px-4 py-4 sm:py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg text-base sm:text-sm touch-manipulation"
              >
                Edit Comment
              </button>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentPassenger(null);
                }}
                className="px-4 py-4 sm:py-3 bg-gray-300 hover:bg-gray-400 active:bg-gray-500 text-gray-800 font-bold rounded-lg text-base sm:text-sm touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

