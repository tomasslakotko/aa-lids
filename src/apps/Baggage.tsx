import { useAirportStore } from '../store/airportStore';
import { Luggage } from 'lucide-react';

export const BaggageApp = () => {
  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);

  // Calculate bag stats per flight
  const getFlightBagStats = (flightId: string) => {
    const pax = passengers.filter(p => p.flightId === flightId);
    const totalBags = pax.reduce((sum, p) => sum + p.bagCount, 0);
    const checkedInBags = pax
      .filter(p => p.status === 'CHECKED_IN' || p.status === 'BOARDED')
      .reduce((sum, p) => sum + p.bagCount, 0);
    
    return { totalBags, checkedInBags };
  };

  return (
    <div className="h-full w-full bg-orange-50 p-4 overflow-auto">
      <h2 className="text-2xl font-bold mb-6 text-orange-800 flex items-center gap-2">
        <Luggage /> Baggage Handling System
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flights.map((flight) => {
          const stats = getFlightBagStats(flight.id);
          const progress = stats.totalBags > 0 ? (stats.checkedInBags / stats.totalBags) * 100 : 0;

          return (
            <div key={flight.id} className="bg-white p-4 rounded shadow border-l-4 border-orange-500">
              <div className="flex justify-between mb-2">
                <h3 className="font-bold text-gray-700">{flight.flightNumber}</h3>
                <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">{flight.status}</span>
              </div>
              
              <div className="text-sm text-gray-500 mb-4">Gate {flight.gate} | {flight.aircraft}</div>
              
              <div className="flex justify-between items-end mb-1">
                <div className="text-3xl font-bold text-gray-800">{stats.checkedInBags}</div>
                <div className="text-sm text-gray-400">/ {stats.totalBags} Bags</div>
              </div>
              
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
        
        <div className="bg-white p-4 rounded shadow border-l-4 border-red-500">
          <h3 className="font-bold text-gray-500">Sorter B</h3>
          <div className="text-3xl font-bold mt-2 text-red-600">JAMMED</div>
          <div className="text-sm text-gray-400 mt-1">Maintenance alerted</div>
        </div>
      </div>
      
      <div className="mt-8 bg-white p-4 rounded shadow h-48 flex flex-col">
        <h3 className="font-bold mb-4">Main Belt Monitor</h3>
        <div className="flex-1 w-full bg-gray-800 rounded-lg relative overflow-hidden flex items-center px-4">
           {/* Animated belt blocks */}
           <div className="flex gap-8 animate-[slide_2s_linear_infinite]">
             {[1,2,3,4,5,6,7,8,9,10].map(i => (
               <div key={i} className="w-12 h-8 bg-yellow-500 rounded-sm shadow-lg border-b-4 border-yellow-700" />
             ))}
           </div>
        </div>
        <div className="mt-2 text-xs font-mono text-gray-500 flex justify-between">
          <span>SYSTEM OK.</span>
          <span>THROUGHPUT: 1200 BAGS/HR.</span>
        </div>
      </div>
      
      <style>{`
        @keyframes slide {
          0% { transform: translateX(0); }
          100% { transform: translateX(100px); }
        }
      `}</style>
    </div>
  );
};
