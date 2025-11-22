import { useState, useEffect } from 'react';
import { useAirportStore } from '../store/airportStore';
import clsx from 'clsx';

export const FIDSApp = () => {
  const flights = useAirportStore((state) => state.flights);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sort flights by time
  const sortedFlights = [...flights].sort((a, b) => a.std.localeCompare(b.std));

  const CITY_NAMES: Record<string, string> = {
    'RIX': 'RIGA', 'OSL': 'OSLO', 'HEL': 'HELSINKI', 'CDG': 'PARIS', 
    'FNC': 'FUNCHAL', 'MUC': 'MUNICH', 'BER': 'BERLIN', 'PRG': 'PRAGUE', 
    'ARN': 'STOCKHOLM', 'CPH': 'COPENHAGEN', 'BLL': 'BILLUND', 'VIE': 'VIENNA', 
    'TLL': 'TALLINN', 'VNO': 'VILNIUS', 'FRA': 'FRANKFURT', 'AMS': 'AMSTERDAM', 
    'LGW': 'LONDON', 'JFK': 'NEW YORK', 'DXB': 'DUBAI', 'DOH': 'DOHA', 
    'LHR': 'LONDON', 'EWR': 'NEWARK'
  };

  // Get Airline Logo URL
  const getAirlineLogo = (flightNum: string) => {
    const code = flightNum.substring(0, 2);
    return `https://content.r9cdn.net/rimg/provider-logos/airlines/v/${code}.png`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BOARDING': return 'text-red-500 animate-pulse font-bold';
      case 'DEPARTED': return 'text-gray-500';
      case 'DELAYED': return 'text-orange-400';
      case 'CANCELLED': return 'text-red-600';
      default: return 'text-yellow-400';
    }
  };

  // Format status text
  const getStatusText = (f: any) => {
    if (f.status === 'DELAYED') return `EST ${f.etd}`;
    if (f.status === 'BOARDING') return 'BOARDING';
    if (f.status === 'DEPARTED') return 'DEPARTED';
    if (f.status === 'CANCELLED') return 'CANCELLED';
    return `GATE ${f.gate}`; // Default show gate or 'ON TIME'
  };

  return (
    <div className="h-full w-full bg-black text-white font-mono flex flex-col overflow-hidden border-8 border-gray-800 rounded-lg shadow-2xl relative">
        
        {/* Screen Glare Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-50" />

        {/* Header */}
        <div className="bg-[#003366] p-4 flex justify-between items-end border-b-4 border-yellow-500 shadow-lg shrink-0 z-10">
            <div>
                <h1 className="text-4xl font-black tracking-tighter text-yellow-400 uppercase" style={{ textShadow: '0 0 10px rgba(250, 204, 21, 0.5)' }}>Departures</h1>
                <div className="text-sm text-blue-200 uppercase tracking-widest mt-1">Riga International Airport</div>
            </div>
            <div className="text-right">
                <div className="text-5xl font-bold tracking-widest text-white font-mono">
                    {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-lg text-blue-300 uppercase font-bold">
                    {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })}
                </div>
            </div>
        </div>

        {/* Header Row */}
        <div className="grid grid-cols-[90px_100px_110px_1fr_90px_200px] gap-4 px-6 py-3 bg-[#002244] text-blue-200 uppercase font-bold text-xl tracking-wider shrink-0 border-b border-blue-900">
            <div>Time</div>
            <div>Airline</div>
            <div>Flight</div>
            <div>Destination</div>
            <div className="text-center">Gate</div>
            <div className="text-right">Remarks</div>
        </div>

        {/* Flight List */}
        <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 overflow-y-auto scrollbar-hide p-4 space-y-1">
                {sortedFlights.map((f, i) => {
                    const city = f.destinationCity || CITY_NAMES[f.destination] || '';
                    return (
                    <div 
                        key={f.id} 
                        className={clsx(
                            "grid grid-cols-[90px_100px_110px_1fr_90px_200px] gap-4 px-4 py-2 text-2xl items-center rounded border-l-4 transition-all",
                            i % 2 === 0 ? "bg-[#001830]" : "bg-[#001225]",
                            f.status === 'BOARDING' ? "border-red-500 bg-red-900/20" : 
                            f.status === 'DELAYED' ? "border-orange-500" : 
                            f.status === 'CANCELLED' ? "border-red-900 opacity-50" : "border-transparent"
                        )}
                    >
                        <div className={f.status === 'DELAYED' ? "text-red-400 line-through decoration-2 decoration-red-500" : "text-white"}>
                            {f.std}
                        </div>
                        <div className="flex items-center justify-start h-12 w-full">
                            <img 
                                src={getAirlineLogo(f.flightNumber)} 
                                alt={f.flightNumber.substring(0, 2)} 
                                className="max-h-full max-w-full object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                        <div className="text-yellow-400 font-bold tracking-wider">{f.flightNumber}</div>
                        <div className="truncate font-bold tracking-wide uppercase flex items-baseline gap-4">
                            <span className="text-yellow-500 text-3xl w-24 shrink-0 font-black">{f.destination}</span>
                            <span className="text-white text-3xl truncate font-bold">{city}</span>
                        </div>
                        <div className="text-center text-yellow-400 font-bold bg-blue-900/50 rounded">
                            {f.gate}
                        </div>
                        <div className={clsx("text-right font-bold tracking-wider", getStatusColor(f.status))}>
                            {getStatusText(f)}
                        </div>
                    </div>
                )})}
                
                {/* Empty Rows Filler */}
                {Array.from({ length: Math.max(0, 12 - sortedFlights.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className={clsx(
                        "h-[64px] w-full rounded opacity-20",
                        (i + sortedFlights.length) % 2 === 0 ? "bg-[#001830]" : "bg-[#001225]"
                    )} />
                ))}
            </div>
        </div>

        {/* Footer Scrolling Ticker */}
        <div className="bg-yellow-500 text-black p-2 overflow-hidden whitespace-nowrap border-t-4 border-black shrink-0 font-bold text-lg uppercase tracking-widest">
            <div className="animate-marquee inline-block">
                +++ Please keep your baggage with you at all times +++ Unattended baggage will be removed +++ Smoking is only permitted in designated areas +++ Please proceed to gate immediately after security check +++
            </div>
        </div>
    </div>
  );
};

