import { useAirportStore } from '../store/airportStore';

export const OCCApp = () => {
  const flights = useAirportStore((state) => state.flights);
  const logs = useAirportStore((state) => state.logs);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-2 font-sans flex flex-col">
       <div className="bg-gray-800 p-2 mb-2 flex justify-between items-center border-b border-gray-700">
         <h1 className="font-bold text-lg tracking-widest">OCC COMMAND CENTER</h1>
         <div className="text-xs text-red-500 animate-pulse font-bold">LIVE OPERATIONS</div>
       </div>

      <div className="grid grid-cols-4 gap-2 flex-1 overflow-hidden">
        {/* Main Map Area */}
        <div className="col-span-3 grid grid-rows-3 gap-2 h-full">
          <div className="row-span-2 bg-gray-800 p-4 rounded border border-gray-700 relative overflow-hidden group">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2 absolute top-4 left-4 z-10">Live Airfield Map</h3>
            {/* Placeholder Map */}
            <div className="absolute inset-0 opacity-30 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Heathrow_Airport_map.svg/2560px-Heathrow_Airport_map.svg.png')] bg-cover bg-center invert" />
            
            {/* Simulated Moving Planes */}
            {flights.map((f, i) => (
              <div 
                key={f.id}
                className="absolute w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold transition-all duration-1000 border-2 border-white/50 shadow-[0_0_10px_red]"
                style={{ 
                  top: `${20 + (i * 15)}%`, 
                  left: `${30 + (i * 10)}%` 
                }}
              >
                {f.flightNumber}
              </div>
            ))}
          </div>

          {/* Inbound Table */}
          <div className="bg-gray-800 p-4 rounded border border-gray-700 overflow-auto">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Flight Status Overview</h3>
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 border-b border-gray-700">
                <tr><th>Flight</th><th>Route</th><th>STD</th><th>Gate</th><th>Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-700 font-mono">
                {flights.slice(0, 5).map(f => (
                  <tr key={f.id} className="hover:bg-white/5">
                    <td className="py-2 font-bold text-blue-400">{f.flightNumber}</td>
                    <td>{f.origin}-{f.destination}</td>
                    <td>{f.std}</td>
                    <td>{f.gate}</td>
                    <td className={f.status === 'DELAYED' ? 'text-red-400' : 'text-green-400'}>{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar: Logs & Alerts */}
        <div className="bg-gray-800 p-4 rounded border border-gray-700 flex flex-col h-full">
           <h3 className="text-red-500 font-bold uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">System Logs</h3>
           <div className="flex-1 overflow-y-auto space-y-2 text-xs font-mono">
             {logs.length === 0 && <div className="text-gray-600 italic">System nominal. No events.</div>}
             {logs.map((log) => (
               <div key={log.id} className="border-l-2 border-gray-600 pl-2 py-1">
                 <div className="text-gray-500">{log.timestamp} [{log.source}]</div>
                 <div className={
                   log.type === 'ERROR' ? 'text-red-400' :
                   log.type === 'SUCCESS' ? 'text-green-400' :
                   'text-gray-300'
                 }>
                   {log.message}
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};
