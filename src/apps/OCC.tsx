import { useAirportStore } from '../store/airportStore';
import type { Flight, FlightStatus } from '../store/airportStore';
import { useState } from 'react';
import clsx from 'clsx';
import { Plane, Clock, MapPin, MessageSquare, Ban, CheckCircle, Search } from 'lucide-react';

export const OCCApp = () => {
  const flights = useAirportStore((state) => state.flights);
  const logs = useAirportStore((state) => state.logs);
  const updateFlightStatus = useAirportStore((state) => state.updateFlightStatus);
  const updateFlightDetails = useAirportStore((state) => state.updateFlightDetails);
  const addFlight = useAirportStore((state) => state.addFlight);
  const addLog = useAirportStore((state) => state.addLog);
  
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(() => ({
    flightNumber: '',
    origin: '',
    originCity: '',
    destination: '',
    destinationCity: '',
    date: new Date().toISOString().slice(0, 10),
    std: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    etd: '',
    gate: '',
    aircraft: '',
    registration: '',
    status: 'SCHEDULED' as FlightStatus
  }));
  
  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  const filteredFlights = flights.filter(f => 
    f.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.origin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusChange = (status: any) => {
    if (selectedFlight) {
        updateFlightStatus(selectedFlight.id, status);
        addLog(`Flight ${selectedFlight.flightNumber} status changed to ${status} by OCC`, 'OCC', 'WARNING');
    }
  };

  const handleDetailUpdate = (field: keyof Flight, value: string) => {
    if (selectedFlightId) {
      updateFlightDetails(selectedFlightId, { [field]: value });
    }
  };

  const handleOpenCreate = () => {
    const now = new Date();
    setCreateForm({
      flightNumber: '',
      origin: '',
      originCity: '',
      destination: '',
      destinationCity: '',
      date: now.toISOString().slice(0, 10),
      std: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      etd: '',
      gate: '',
      aircraft: '',
      registration: '',
      status: 'SCHEDULED'
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const flightNumber = createForm.flightNumber.trim().toUpperCase();
    const origin = createForm.origin.trim().toUpperCase();
    const destination = createForm.destination.trim().toUpperCase();
    const std = createForm.std.trim();
    const etd = createForm.etd.trim() || std;
    const date = createForm.date.trim() || new Date().toISOString().slice(0, 10);
    const gate = createForm.gate.trim();
    const aircraft = createForm.aircraft.trim();

    if (!flightNumber || !origin || !destination || !std || !gate || !aircraft) {
      return;
    }

    const newFlight: Flight = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `FLT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      flightNumber,
      origin,
      destination,
      originCity: createForm.originCity.trim() || undefined,
      destinationCity: createForm.destinationCity.trim() || undefined,
      std,
      etd,
      date,
      gate,
      status: createForm.status,
      aircraft,
      registration: createForm.registration.trim() || undefined
    };

    addFlight(newFlight);
    addLog(`Flight ${newFlight.flightNumber} created in OCC`, 'OCC', 'SUCCESS');
    setSelectedFlightId(newFlight.id);
    setShowCreateModal(false);
  };

  return (
    <div className="h-full w-full bg-gray-900 text-gray-100 flex flex-col font-sans overflow-hidden">
       {/* Top Header */}
       <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <Plane className="text-white" size={18} />
             </div>
             <div>
                <h1 className="font-bold text-lg tracking-wide leading-none">OCC DASHBOARD</h1>
                <div className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Operations Control Center</div>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-xs bg-gray-900 px-3 py-1.5 rounded border border-gray-700">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-400 font-mono">SYSTEM NOMINAL</span>
             </div>
             <div className="text-xl font-mono font-bold text-gray-200">
                {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
             </div>
          </div>
       </div>

       {/* Main Content Area */}
       <div className="flex-1 flex overflow-hidden">
          
          {/* Left Panel: Flight List */}
          <div className="w-2/3 flex flex-col border-r border-gray-700 min-w-0 bg-gray-900">
             {/* Search Bar */}
             <div className="p-3 border-b border-gray-700 flex gap-2">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Search flight, destination, or gate..." 
                        className="w-full bg-gray-800 border border-gray-600 rounded px-9 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded border border-blue-500 transition-colors"
                >
                    Create Flight
                </button>
             </div>

             {/* Scrollable List */}
             <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10 shadow-md text-xs uppercase font-bold">
                      <tr>
                         <th className="p-3 border-b border-gray-700">Flight</th>
                         <th className="p-3 border-b border-gray-700">Route</th>
                         <th className="p-3 border-b border-gray-700">STD/ETD</th>
                         <th className="p-3 border-b border-gray-700 text-center">Gate</th>
                         <th className="p-3 border-b border-gray-700 text-center">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800">
                      {filteredFlights.map(f => (
                         <tr key={f.id} 
                             className={clsx(
                                 "hover:bg-gray-800 transition-colors cursor-pointer group",
                                 selectedFlightId === f.id ? "bg-blue-900/20" : ""
                             )}
                             onClick={() => setSelectedFlightId(f.id)}
                         >
                            <td className="p-3 font-mono font-bold text-white group-hover:text-blue-300 transition-colors">
                                {f.flightNumber}
                                <div className="text-[10px] font-normal text-gray-500 font-sans">{f.aircraft}</div>
                            </td>
                            <td className="p-3 text-gray-300">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{f.origin}</span>
                                    <span className="text-gray-600">→</span>
                                    <span className="font-bold">{f.destination}</span>
                                </div>
                                <div className="text-[10px] text-gray-500">{f.destinationCity}</div>
                            </td>
                            <td className="p-3 font-mono">
                                <div className="text-gray-300">{f.std}</div>
                                {f.status === 'DELAYED' && <div className="text-orange-400 text-xs font-bold">{f.etd}</div>}
                            </td>
                            <td className="p-3 font-mono text-center">
                                <span className="bg-gray-800 border border-gray-600 px-2 py-1 rounded text-yellow-500 font-bold text-xs">
                                    {f.gate}
                                </span>
                            </td>
                            <td className="p-3 text-center">
                               <span className={clsx(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                                  f.status === 'SCHEDULED' ? "bg-blue-900/30 text-blue-400 border-blue-800" :
                                  f.status === 'BOARDING' ? "bg-green-900/30 text-green-400 border-green-800 animate-pulse" :
                                  f.status === 'DEPARTED' ? "bg-gray-800 text-gray-500 border-gray-700" :
                                  f.status === 'DELAYED' ? "bg-orange-900/30 text-orange-400 border-orange-800" :
                                  f.status === 'CANCELLED' ? "bg-red-900/30 text-red-400 border-red-800" :
                                  "bg-gray-800 text-gray-300 border-gray-600"
                               )}>
                                  {f.status}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          {/* Right Panel: Action & Details (Contextual) */}
          <div className="w-1/3 bg-gray-850 border-l border-gray-700 flex flex-col">
             {selectedFlight ? (
                 <>
                    <div className="p-6 border-b border-gray-700 bg-gray-800">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tighter">{selectedFlight.flightNumber}</h2>
                                <div className="text-blue-400 text-sm font-bold uppercase mt-1">{selectedFlight.originCity} → {selectedFlight.destinationCity}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-mono font-bold text-gray-200">{selectedFlight.std}</div>
                                <div className="text-xs text-gray-500 uppercase">Scheduled</div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-900 p-3 rounded border border-gray-700">
                                <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Aircraft</div>
                                <input 
                                    className="font-mono text-white bg-transparent border-b border-gray-600 focus:border-blue-500 outline-none w-full"
                                    value={selectedFlight.aircraft}
                                    onChange={(e) => handleDetailUpdate('aircraft', e.target.value)}
                                />
                            </div>
                            <div className="bg-gray-900 p-3 rounded border border-gray-700">
                                <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Registration</div>
                                <input 
                                    className="font-mono text-white bg-transparent border-b border-gray-600 focus:border-blue-500 outline-none w-full"
                                    value={selectedFlight.registration || ''}
                                    placeholder="e.g. YL-ABC"
                                    onChange={(e) => handleDetailUpdate('registration', e.target.value)}
                                />
                            </div>
                            <div className="col-span-2 bg-gray-900 p-3 rounded border border-gray-700">
                                <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Gate</div>
                                <input 
                                    className="font-mono text-yellow-400 font-bold bg-transparent border-b border-gray-600 focus:border-blue-500 outline-none w-full"
                                    value={selectedFlight.gate}
                                    onChange={(e) => handleDetailUpdate('gate', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Operational Controls</h3>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => handleStatusChange('BOARDING')}
                                className="w-full p-4 bg-green-900/20 border border-green-800 hover:bg-green-900/40 text-green-400 rounded flex items-center gap-3 transition-all group"
                            >
                                <div className="p-2 bg-green-900 rounded group-hover:bg-green-800 transition-colors"><CheckCircle size={18} /></div>
                                <div className="text-left">
                                    <div className="font-bold">Start Boarding</div>
                                    <div className="text-xs opacity-70">Open gate for passengers</div>
                                </div>
                            </button>

                            <button 
                                onClick={() => handleStatusChange('DELAYED')}
                                className="w-full p-4 bg-orange-900/20 border border-orange-800 hover:bg-orange-900/40 text-orange-400 rounded flex items-center gap-3 transition-all group"
                            >
                                <div className="p-2 bg-orange-900 rounded group-hover:bg-orange-800 transition-colors"><Clock size={18} /></div>
                                <div className="text-left">
                                    <div className="font-bold">Delay Flight</div>
                                    <div className="text-xs opacity-70">Set status to delayed</div>
                                </div>
                            </button>

                            <button 
                                onClick={() => handleStatusChange('CANCELLED')}
                                className="w-full p-4 bg-red-900/20 border border-red-800 hover:bg-red-900/40 text-red-400 rounded flex items-center gap-3 transition-all group"
                            >
                                <div className="p-2 bg-red-900 rounded group-hover:bg-red-800 transition-colors"><Ban size={18} /></div>
                                <div className="text-left">
                                    <div className="font-bold">Cancel Flight</div>
                                    <div className="text-xs opacity-70">Immediate cancellation</div>
                                </div>
                            </button>

                            <div className="h-px bg-gray-700 my-4" />

                            <button className="w-full p-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 rounded flex items-center justify-center gap-2 text-sm font-bold transition-all">
                                <MapPin size={16} /> Change Gate Assignment
                            </button>
                            
                            <button className="w-full p-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 rounded flex items-center justify-center gap-2 text-sm font-bold transition-all">
                                <MessageSquare size={16} /> Message Gate Staff
                            </button>
                        </div>
                    </div>
                 </>
             ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-8 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Search size={32} className="opacity-50" />
                    </div>
                    <p className="font-bold text-lg mb-2">No Flight Selected</p>
                    <p className="text-sm">Select a flight from the list to view details and access operational controls.</p>
                 </div>
             )}
          </div>
       </div>
       
       {/* Bottom Logs Panel */}
       <div className="h-40 bg-black border-t border-gray-700 flex flex-col shrink-0">
          <div className="bg-gray-900 px-4 py-1 text-[10px] font-bold uppercase text-gray-500 border-b border-gray-800 flex justify-between">
             <span>System Event Log</span>
             <span>Live Feed</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
             {logs.map((log) => (
                <div key={log.id} className="hover:bg-white/5 px-2 py-0.5 rounded flex gap-2">
                    <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
                    <span className={clsx(
                        "font-bold w-20 shrink-0",
                        log.type === 'ERROR' ? "text-red-500" : 
                        log.type === 'WARNING' ? "text-orange-500" : 
                        log.type === 'SUCCESS' ? "text-green-500" : "text-blue-400"
                    )}>{log.source}</span>
                    <span className="text-gray-300">{log.message}</span>
                </div>
             ))}
             <div className="h-4" /> {/* Spacer */}
          </div>
       </div>
       {showCreateModal && (
         <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
            <form
              onSubmit={handleCreateSubmit}
              className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Create Flight</h3>
                  <p className="text-xs text-gray-500">Add a new flight to the OCC system.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Flight Number</label>
                  <input
                    value={createForm.flightNumber}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, flightNumber: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    placeholder="BT101"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, status: e.target.value as FlightStatus }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="BOARDING">BOARDING</option>
                    <option value="DELAYED">DELAYED</option>
                    <option value="DEPARTED">DEPARTED</option>
                    <option value="ARRIVED">ARRIVED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Origin</label>
                  <input
                    value={createForm.origin}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, origin: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    placeholder="RIX"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Origin City</label>
                  <input
                    value={createForm.originCity}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, originCity: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    placeholder="Riga"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Destination</label>
                  <input
                    value={createForm.destination}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, destination: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    placeholder="FRA"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Destination City</label>
                  <input
                    value={createForm.destinationCity}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, destinationCity: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    placeholder="Frankfurt"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Date</label>
                  <input
                    type="date"
                    value={createForm.date}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Gate</label>
                  <input
                    value={createForm.gate}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, gate: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    placeholder="A12"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">STD</label>
                  <input
                    type="time"
                    value={createForm.std}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, std: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">ETD</label>
                  <input
                    type="time"
                    value={createForm.etd}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, etd: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Aircraft</label>
                  <input
                    value={createForm.aircraft}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, aircraft: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    placeholder="A220"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Registration</label>
                  <input
                    value={createForm.registration}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, registration: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    placeholder="YL-ABC"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 border border-blue-500 text-white font-bold rounded hover:bg-blue-500"
                >
                  Create Flight
                </button>
              </div>
            </form>
         </div>
       )}
    </div>
  );
};
