import { useState, useEffect } from 'react';
import { useAirportStore } from '../store/airportStore';
import type { Passenger } from '../store/airportStore';
import clsx from 'clsx';
import { Sun, Wifi } from 'lucide-react';

const CITY_NAMES: Record<string, string> = {
  'RIX': 'RIGA', 'OSL': 'OSLO', 'HEL': 'HELSINKI', 'CDG': 'PARIS', 
  'FNC': 'FUNCHAL', 'MUC': 'MUNICH', 'BER': 'BERLIN', 'PRG': 'PRAGUE', 
  'ARN': 'STOCKHOLM', 'CPH': 'COPENHAGEN', 'BLL': 'BILLUND', 'VIE': 'VIENNA', 
  'TLL': 'TALLINN', 'VNO': 'VILNIUS', 'FRA': 'FRANKFURT', 'AMS': 'AMSTERDAM', 
  'LGW': 'LONDON', 'JFK': 'NEW YORK', 'DXB': 'DUBAI', 'DOH': 'DOHA', 
  'LHR': 'LONDON', 'EWR': 'NEWARK'
};

export const GateScreenApp = () => {
  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Direct reactive access - Zustand will automatically re-render when flights change
  // This will update automatically when real-time updates come in from other devices
  const selectedFlight = flights.find(f => f.id === selectedFlightId);
  
  // Log when flight updates (for debugging real-time sync)
  useEffect(() => {
    if (selectedFlight) {
      console.log('Gate Screen: Flight updated', {
        flightNumber: selectedFlight.flightNumber,
        status: selectedFlight.status,
        gateMessage: selectedFlight.gateMessage,
        gate: selectedFlight.gate
      });
    }
  }, [selectedFlight?.status, selectedFlight?.gateMessage, selectedFlight?.gate, selectedFlight?.etd, selectedFlight?.id]);

  // Filter passengers for the standby/upgrade list
  // Realistically, we'd filter by 'Standby' or 'Upgrade Requested'. 
  // For simulation, we'll show random passengers or those marked as SBY.
  const standbyList = selectedFlight 
    ? passengers
        .filter(p => p.flightId === selectedFlight.id && (p.passengerType === 'STAFF_SBY' || p.seat === 'SBY' || p.seat === 'REQ'))
        .slice(0, 10) 
    : [];

  // Fake Upgrade list (taking some economy pax)
  const upgradeList = selectedFlight
    ? passengers
        .filter(p => p.flightId === selectedFlight.id && p.status === 'CHECKED_IN' && !p.seat.startsWith('1'))
        .slice(0, 5)
    : [];

  if (!selectedFlight) {
    return (
      <div className="h-full w-full bg-slate-900 flex flex-col items-center text-white p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-8 shrink-0">Gate Screen Configuration</h1>
        <div className="grid grid-cols-3 gap-4 w-full max-w-4xl pb-8">
          {flights.map(f => (
            <button 
              key={f.id}
              onClick={() => setSelectedFlightId(f.id)}
              className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:bg-blue-900 hover:border-blue-500 transition-all text-left group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-2xl font-bold text-white group-hover:text-blue-400">{f.flightNumber}</span>
                <span className="text-xl font-mono font-bold text-yellow-400">{f.gate}</span>
              </div>
              <div className="text-lg text-gray-300 truncate">{f.destinationCity || f.destination}</div>
              <div className="text-sm text-gray-500 mt-2">{f.std}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Calculate times
  const [depHour, depMin] = selectedFlight.std.split(':').map(Number);
  const depTime = new Date();
  depTime.setHours(depHour, depMin, 0);
  
  // Boarding time = Departure - 30 mins
  const boardTime = new Date(depTime.getTime() - 30 * 60000);
  
  // Time until boarding
  const diffMs = boardTime.getTime() - currentTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  const isBoarding = selectedFlight.status === 'BOARDING';
  const isDeparted = selectedFlight.status === 'DEPARTED';
  const isDelayed = selectedFlight.status === 'DELAYED';
  const isCancelled = selectedFlight.status === 'CANCELLED';

  // Format passenger name: SMITH, J
  const formatName = (p: Passenger) => `${p.lastName}, ${p.firstName.charAt(0)}`;

  const cityName = selectedFlight ? (selectedFlight.destinationCity?.toUpperCase() || CITY_NAMES[selectedFlight.destination] || selectedFlight.destination) : '';

  // Helper to get logo
  const getAirlineLogo = (flightNum: string) => {
    const code = flightNum.substring(0, 2);
    return `https://content.r9cdn.net/rimg/provider-logos/airlines/v/${code}.png`;
  };

  return (
    <div className="h-full w-full bg-white text-slate-900 flex flex-col font-sans overflow-hidden relative select-none">
        
        {/* Blue Header Background Shape */}
        <div className="absolute top-0 left-0 w-full h-[65%] bg-[#0078D2] z-0 clip-path-header" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)' }} />

        {/* Content Container */}
        <div className="relative z-10 flex-1 flex flex-col p-8">
            
            {/* Top Row: Airline/Flight & Gate */}
            <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-6">
                    <div className="w-32 h-32 flex items-center justify-center">
                        <img 
                            src={getAirlineLogo(selectedFlight.flightNumber)}
                            alt="Logo"
                            className="w-full h-full object-contain drop-shadow-lg"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div>
                        <div className="text-blue-100 text-2xl font-bold">Flight {selectedFlight.flightNumber}</div>
                        <h1 className="text-white text-7xl font-bold tracking-tight">{cityName}</h1>
                    </div>
                </div>
                
                <div className="flex flex-col items-end">
                    <div className="bg-[#005AA3] text-white px-6 py-2 rounded-t-lg text-xl font-bold uppercase tracking-wider">Gate</div>
                    <div className="bg-white text-[#0078D2] px-8 py-4 rounded-b-lg text-8xl font-bold shadow-2xl leading-none">
                        {selectedFlight.gate}
                    </div>
                </div>
            </div>

            {/* Main Info Area */}
            <div className="flex-1 flex gap-12 relative">

                {/* Custom Gate Message Overlay */}
                {selectedFlight.gateMessage && (
                    <div className="absolute -top-4 left-0 w-full bg-red-600 text-white p-4 text-center font-bold text-3xl shadow-lg z-30 rounded-xl animate-pulse">
                        {selectedFlight.gateMessage}
                    </div>
                )}
                
                {/* Left: Times & Status */}
                <div className={clsx("flex-1 text-white space-y-12 transition-all", selectedFlight.gateMessage ? "mt-20 opacity-50 blur-[1px]" : "")}>
                    <div>
                        <div className="text-3xl font-light opacity-90 mb-2">
                            {isDeparted ? 'Departed' : 
                             isCancelled ? 'Cancelled' :
                             isDelayed ? 'Delayed' :
                             isBoarding ? 'Now Boarding' : 
                             diffMins > 0 ? `Boards in ${diffMins} minutes` : 'Boarding soon'}
                        </div>
                        {isBoarding && !isDeparted && !isCancelled && !isDelayed && (
                            <div className="inline-block bg-[#78BE20] text-white text-2xl font-bold px-6 py-2 rounded-full shadow-lg uppercase tracking-wider animate-pulse">
                                Boarding Now
                            </div>
                        )}
                        {isDelayed && (
                            <div className="inline-block bg-orange-500 text-white text-2xl font-bold px-6 py-2 rounded-full shadow-lg uppercase tracking-wider animate-pulse">
                                Flight Delayed
                            </div>
                        )}
                        {isCancelled && (
                            <div className="inline-block bg-red-600 text-white text-2xl font-bold px-6 py-2 rounded-full shadow-lg uppercase tracking-wider">
                                Flight Cancelled
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-12">
                        <div>
                            <div className="text-blue-200 text-xl uppercase font-bold mb-1">Departs</div>
                            <div className="text-6xl font-bold">{selectedFlight.std}</div>
                        </div>
                        <div>
                            <div className="text-blue-200 text-xl uppercase font-bold mb-1">Arrives</div>
                            <div className="text-6xl font-bold opacity-60">--:--</div>
                        </div>
                    </div>

                    <div>
                         <div className="text-blue-200 text-xl uppercase font-bold mb-2">Weather in {cityName}</div>
                         <div className="flex items-center gap-4">
                             <Sun size={48} className="text-yellow-400" />
                             <span className="text-5xl font-bold">24°C</span>
                         </div>
                    </div>
                </div>

                {/* Right: Standby/Upgrade List Card */}
                <div className="w-[450px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Standby List</span>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold">{standbyList.length}</span>
                    </div>
                    <div className="flex-1 p-4 space-y-1 overflow-hidden">
                        {standbyList.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 italic">
                                List is empty
                            </div>
                        ) : (
                            standbyList.map((p, i) => (
                                <div key={p.id} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0">
                                    <div className="flex gap-4 items-center">
                                        <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">{i + 1}</span>
                                        <span className="font-bold text-xl text-slate-700">{formatName(p)}</span>
                                    </div>
                                    <div className="text-slate-400 font-mono text-sm">
                                        {p.passengerType === 'STAFF_SBY' ? 'SBY' : 'REQ'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Upgrade Section Divider */}
                    <div className="bg-slate-100 p-2 border-y border-slate-200 text-center">
                        <span className="text-xs font-bold uppercase text-slate-400">Upgrade List</span>
                    </div>
                    
                    <div className="h-1/3 p-4 space-y-1 overflow-hidden bg-slate-50">
                        {upgradeList.map((p, i) => (
                             <div key={p.id} className="flex justify-between items-center p-2">
                                <div className="flex gap-4 items-center">
                                    <span className="font-bold text-lg text-slate-600">{formatName(p)}</span>
                                </div>
                                <CheckCircleIcon status={i === 0} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Bottom Footer Bar */}
        <div className="h-24 bg-[#001E35] text-white flex items-center justify-between px-8 relative z-20">
             <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center">
                    <Wifi size={24} />
                 </div>
                 <div>
                     <div className="text-xs text-gray-400 uppercase">Wi-Fi Available</div>
                     <div className="font-bold">AirBaltic Guest</div>
                 </div>
             </div>

             <div className="flex items-center gap-12">
                 <div className="text-right">
                     <div className="text-xs text-gray-400 uppercase mb-1">Flight Time</div>
                     <div className="text-2xl font-bold">2h 45m</div>
                 </div>
                 <div className="h-12 w-px bg-white/20" />
                 <div className="text-right">
                     <div className="text-4xl font-mono font-bold">
                        {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                     </div>
                     <div className="text-xs text-gray-400 uppercase text-right">
                        {currentTime.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
                     </div>
                 </div>
             </div>
        </div>
    </div>
  );
};

const CheckCircleIcon = ({ status }: { status: boolean }) => (
    status ? (
        <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
        </div>
    ) : (
        <div className="w-6 h-6 rounded border-2 border-slate-300" />
    )
);

