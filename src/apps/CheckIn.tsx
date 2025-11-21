import React, { useState } from 'react';
import { useAirportStore } from '../store/airportStore';
import { Search, Check, User, Plane, AlertCircle, CreditCard, Luggage, Link as LinkIcon, MapPin } from 'lucide-react';
import clsx from 'clsx';

// Seat Map Component
const SeatMap = ({ 
  occupiedSeats, 
  currentSeat, 
  onSelectSeat, 
  aircraftType 
}: { 
  occupiedSeats: string[], 
  currentSeat: string, 
  onSelectSeat: (seat: string) => void,
  aircraftType: string
}) => {
  // Simplified layout generation based on aircraft type (defaulting to 3-3 layout for now)
  const rows = 20;
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
       <h3 className="text-gray-500 text-xs uppercase font-bold mb-4">Seat Map ({aircraftType})</h3>
       
       <div className="flex flex-col items-center gap-2 max-h-[400px] overflow-y-auto p-4 bg-gray-100 rounded-lg">
         {/* Front of Plane Indicator */}
         <div className="w-full h-8 bg-gray-300 rounded-t-full mb-4 opacity-20" />
         
         {Array.from({ length: rows }).map((_, r) => {
           const rowNum = r + 1;
           return (
             <div key={rowNum} className="flex gap-8 items-center">
               {/* Left Side */}
               <div className="flex gap-1">
                 {cols.slice(0, 3).map(col => {
                   const seatId = `${rowNum}${col}`;
                   const isOccupied = occupiedSeats.includes(seatId) && seatId !== currentSeat;
                   const isSelected = seatId === currentSeat;
                   
                   return (
                     <button
                       key={seatId}
                       disabled={isOccupied}
                       onClick={() => onSelectSeat(seatId)}
                       className={clsx(
                         "w-8 h-8 rounded text-xs font-bold flex items-center justify-center transition-colors",
                         isOccupied ? "bg-red-100 text-red-300 cursor-not-allowed" :
                         isSelected ? "bg-blue-600 text-white shadow-md scale-110" :
                         "bg-white border border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-600"
                       )}
                     >
                       {col}
                     </button>
                   );
                 })}
               </div>

               {/* Aisle */}
               <div className="text-xs font-mono text-gray-400 w-4 text-center">{rowNum}</div>

               {/* Right Side */}
               <div className="flex gap-1">
                 {cols.slice(3).map(col => {
                   const seatId = `${rowNum}${col}`;
                   const isOccupied = occupiedSeats.includes(seatId) && seatId !== currentSeat;
                   const isSelected = seatId === currentSeat;
                   
                   return (
                     <button
                       key={seatId}
                       disabled={isOccupied}
                       onClick={() => onSelectSeat(seatId)}
                       className={clsx(
                         "w-8 h-8 rounded text-xs font-bold flex items-center justify-center transition-colors",
                         isOccupied ? "bg-red-100 text-red-300 cursor-not-allowed" :
                         isSelected ? "bg-blue-600 text-white shadow-md scale-110" :
                         "bg-white border border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-600"
                       )}
                     >
                       {col}
                     </button>
                   );
                 })}
               </div>
             </div>
           );
         })}
       </div>
       
       <div className="flex gap-4 justify-center mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-gray-300 rounded" /> Available</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600 rounded" /> Selected</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 rounded" /> Occupied</div>
       </div>
    </div>
  );
};

export const CheckInApp = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedPnr, setSearchedPnr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'DOCS' | 'BAGS' | 'LINK' | 'SEAT'>('DETAILS');
  
  const passengers = useAirportStore((state) => state.passengers);
  const flights = useAirportStore((state) => state.flights);
  const checkInPassenger = useAirportStore((state) => state.checkInPassenger);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);

  const foundPassenger = searchedPnr 
    ? passengers.find(p => p.pnr === searchedPnr) 
    : null;
  
  const foundFlight = foundPassenger 
    ? flights.find(f => f.id === foundPassenger.flightId) 
    : null;

  // Get all occupied seats for this flight
  const occupiedSeats = foundFlight 
    ? passengers.filter(p => p.flightId === foundFlight.id).map(p => p.seat)
    : [];

  const potentialLinks = foundPassenger 
     ? passengers.filter(p => p.lastName === foundPassenger.lastName && p.id !== foundPassenger.id)
     : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.toUpperCase().trim();
    const match = passengers.find(p => p.pnr === term || p.lastName === term);
    if (match) {
      setSearchedPnr(match.pnr);
      setActiveTab('DETAILS');
    } else {
      setSearchedPnr(null);
    }
  };

  const simulatePassportScan = () => {
     if (!foundPassenger) return;
     const countries = ['GBR', 'USA', 'DEU', 'FRA', 'ITA', 'ESP'];
     const randomCountry = countries[Math.floor(Math.random() * countries.length)];
     const randomNum = Math.floor(Math.random() * 1000000000).toString();
     
     updatePassengerDetails(foundPassenger.pnr, {
        passportNumber: randomNum,
        nationality: randomCountry,
        expiryDate: '2030-01-01'
     });
  };

  return (
    <div className="h-full w-full bg-blue-50 text-slate-900 p-6 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4 border-blue-200">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">Check-in Agent</h1>
          <div className="text-sm text-blue-600 mt-1">Terminal 1 | Desk 14 | {new Date().toLocaleDateString()}</div>
        </div>
        <div className="bg-blue-100 px-4 py-2 rounded-full text-blue-800 font-bold border border-blue-200 shadow-sm">
           Active Agent: T. SLAKOTKO
        </div>
      </div>
      
      <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
        
        {/* Left Panel (Search & Info) */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Passenger Lookup</h3>
            <form onSubmit={handleSearch} className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="PNR or LAST NAME" 
                  className="w-full pl-12 p-3 border-2 border-gray-200 rounded-lg text-lg outline-none focus:border-blue-500 transition-colors uppercase font-mono placeholder:normal-case placeholder:font-sans"
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-bold shadow-md transition-colors"
              >
                SEARCH
              </button>
            </form>
          </div>

          {foundFlight && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 flex-1">
                <div className="text-xs text-gray-500 uppercase font-bold mb-2">Flight Information</div>
                <div className="text-4xl font-bold text-blue-900">{foundFlight.flightNumber}</div>
                <div className="text-lg text-gray-600 mb-4">{foundFlight.origin} ➔ {foundFlight.destination}</div>
                
                <div className="space-y-3 text-sm">
                   <div className="flex justify-between border-b pb-2">
                     <span className="text-gray-500">STD</span>
                     <span className="font-mono font-bold">{foundFlight.std}</span>
                   </div>
                   <div className="flex justify-between border-b pb-2">
                     <span className="text-gray-500">Gate</span>
                     <span className="font-mono font-bold bg-yellow-100 px-2 rounded">{foundFlight.gate}</span>
                   </div>
                   <div className="flex justify-between border-b pb-2">
                     <span className="text-gray-500">Aircraft</span>
                     <span className="font-mono font-bold">{foundFlight.aircraft}</span>
                   </div>
                </div>
             </div>
          )}
        </div>
        
        {/* Right Panel (Passenger Tabs) */}
        <div className="col-span-8 flex flex-col h-full">
          {foundPassenger ? (
            <div className="bg-white rounded-xl shadow-md border border-blue-100 flex-1 flex flex-col overflow-hidden">
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-2xl font-bold tracking-wider">{foundPassenger.lastName}, {foundPassenger.firstName}</h2>
                  <div className="opacity-80 text-sm mt-1">Seat: {foundPassenger.seat} | Status: {foundPassenger.status}</div>
                </div>
                <span className="font-mono bg-blue-800 px-4 py-2 rounded text-xl font-bold tracking-widest">{foundPassenger.pnr}</span>
              </div>
              
              <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
                {[
                  { id: 'DETAILS', icon: User, label: 'DETAILS' },
                  { id: 'SEAT', icon: MapPin, label: 'SEAT MAP' },
                  { id: 'DOCS', icon: CreditCard, label: 'DOCS' },
                  { id: 'BAGS', icon: Luggage, label: 'BAGGAGE' },
                  { id: 'LINK', icon: LinkIcon, label: 'LINK' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={clsx(
                      "px-6 py-3 font-bold text-sm flex items-center gap-2 whitespace-nowrap", 
                      activeTab === tab.id ? "bg-white text-blue-600 border-t-2 border-blue-600" : "text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    <tab.icon size={16} /> {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-8 flex-1 overflow-y-auto bg-gray-50/50">
                {activeTab === 'DETAILS' && (
                   <div className="space-y-6">
                      {/* Details Content (Same as before) */}
                      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                         <h3 className="text-gray-500 text-xs uppercase font-bold mb-4">Itinerary Summary</h3>
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                  <Plane size={24} />
                               </div>
                               <div>
                                  <div className="font-bold text-lg">{foundFlight?.origin} ➔ {foundFlight?.destination}</div>
                                  <div className="text-gray-500 text-sm">{foundFlight?.flightNumber} • {foundFlight?.std}</div>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-2xl font-bold font-mono">{foundPassenger.seat}</div>
                               <div className="text-xs text-gray-400 uppercase">Seat Assignment</div>
                            </div>
                         </div>
                      </div>
                   </div>
                )}

                {activeTab === 'SEAT' && (
                   <div className="flex justify-center">
                      <SeatMap 
                         occupiedSeats={occupiedSeats}
                         currentSeat={foundPassenger.seat}
                         aircraftType={foundFlight?.aircraft || 'STD'}
                         onSelectSeat={(seat) => updatePassengerDetails(foundPassenger.pnr, { seat })}
                      />
                   </div>
                )}

                {/* Docs, Bags, Link tabs content reused from previous step... */}
                {activeTab === 'DOCS' && (
                   <div className="space-y-6">
                      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                         <div className="flex justify-between mb-4">
                            <h3 className="text-gray-500 text-xs uppercase font-bold">Travel Documents</h3>
                            <button 
                               onClick={simulatePassportScan}
                               className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            >
                               SIMULATE SCAN
                            </button>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-xs text-gray-400 mb-1">Passport Number</label>
                               <input 
                                  type="text" 
                                  value={foundPassenger.passportNumber || ''} 
                                  onChange={(e) => updatePassengerDetails(foundPassenger.pnr, { passportNumber: e.target.value })}
                                  className="w-full p-2 border rounded font-mono bg-gray-50" 
                               />
                            </div>
                            <div>
                               <label className="block text-xs text-gray-400 mb-1">Nationality</label>
                               <input 
                                  type="text" 
                                  value={foundPassenger.nationality || ''} 
                                  onChange={(e) => updatePassengerDetails(foundPassenger.pnr, { nationality: e.target.value })}
                                  className="w-full p-2 border rounded font-mono bg-gray-50" 
                               />
                            </div>
                         </div>
                      </div>
                   </div>
                )}

                {activeTab === 'BAGS' && (
                   <div className="space-y-6">
                      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                         <div className="flex items-center gap-8 mb-8">
                            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100">
                               <Luggage size={40} className="text-orange-500" />
                            </div>
                            <div>
                               <div className="text-4xl font-bold text-gray-800">{foundPassenger.bagCount} <span className="text-lg text-gray-400 font-normal">PCS</span></div>
                               <div className="text-sm text-gray-500">Total Weight: {foundPassenger.bagCount * 23} KG (Est)</div>
                            </div>
                            <div className="flex gap-2 ml-auto">
                               <button onClick={() => updatePassengerDetails(foundPassenger.pnr, { bagCount: Math.max(0, foundPassenger.bagCount - 1) })} className="w-10 h-10 rounded border hover:bg-gray-50 flex items-center justify-center font-bold text-xl">-</button>
                               <button onClick={() => updatePassengerDetails(foundPassenger.pnr, { bagCount: foundPassenger.bagCount + 1, hasBags: true })} className="w-10 h-10 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center font-bold text-xl">+</button>
                            </div>
                         </div>
                      </div>
                   </div>
                )}

                {activeTab === 'LINK' && (
                   <div className="space-y-6">
                      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                         <h3 className="text-gray-500 text-xs uppercase font-bold mb-4">Linked Flights / Passengers</h3>
                         {potentialLinks.length > 0 ? (
                            <div className="space-y-2">
                               {potentialLinks.map(p => (
                                 <div key={p.id} className="p-3 border rounded flex justify-between items-center hover:bg-gray-50">
                                    <div className="font-bold">{p.firstName} {p.lastName}</div>
                                    <div className="font-mono text-sm">{p.pnr}</div>
                                 </div>
                               ))}
                            </div>
                         ) : (
                            <div className="text-gray-400 text-center py-8 text-sm italic">No links found.</div>
                         )}
                      </div>
                   </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-gray-200">
                 {foundPassenger.status === 'BOOKED' ? (
                   <button onClick={() => checkInPassenger(foundPassenger.pnr)} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-lg font-bold shadow-md transition-transform active:scale-[0.99] flex items-center justify-center gap-3 text-lg"><Check size={24} /> CONFIRM CHECK-IN</button>
                 ) : (
                   <div className="w-full bg-gray-100 text-gray-400 py-4 rounded-lg font-bold flex items-center justify-center gap-3 text-lg cursor-not-allowed"><Check size={24} /> ALREADY CHECKED-IN</div>
                 )}
              </div>
            </div>
          ) : searchedPnr ? (
             <div className="flex-1 flex items-center justify-center flex-col gap-4 opacity-50">
                <AlertCircle size={64} className="text-red-400" />
                <div className="text-2xl text-red-400 font-bold">PASSENGER NOT FOUND</div>
             </div>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-4 opacity-30">
              <User size={64} />
              <div className="text-xl font-bold">WAITING FOR AGENT INPUT</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
