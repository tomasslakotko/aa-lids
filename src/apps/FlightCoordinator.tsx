import { useAirportStore } from '../store/airportStore';
import clsx from 'clsx';

export const FlightCoordinatorApp = () => {
  const flights = useAirportStore((state) => state.flights);
  const updateFlightStatus = useAirportStore((state) => state.updateFlightStatus);

  return (
    <div className="h-full w-full bg-gray-50 text-gray-900 p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
         <h2 className="text-xl font-bold text-purple-800">Flight Coordinator Dashboard</h2>
         <div className="text-sm text-gray-500">
           Total Flights: {flights.length}
         </div>
      </div>
      
      <div className="flex-1 overflow-auto border rounded-lg shadow-sm bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-purple-100 text-purple-900 shadow-sm">
            <tr>
              <th className="p-3 border-b font-semibold">Flight</th>
              <th className="p-3 border-b font-semibold">Route</th>
              <th className="p-3 border-b font-semibold">STD / ETD</th>
              <th className="p-3 border-b font-semibold">Gate</th>
              <th className="p-3 border-b font-semibold">Aircraft</th>
              <th className="p-3 border-b font-semibold">Status</th>
              <th className="p-3 border-b font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((flight) => (
              <tr key={flight.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="p-3 font-mono font-bold text-lg text-purple-700">{flight.flightNumber}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{flight.origin}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-bold">{flight.destination}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="text-sm">{flight.std}</div>
                  {flight.etd !== flight.std && (
                    <div className="text-xs text-red-500 font-bold">{flight.etd}</div>
                  )}
                </td>
                <td className="p-3 font-mono">{flight.gate}</td>
                <td className="p-3 text-sm text-gray-600">{flight.aircraft}</td>
                <td className="p-3">
                  <span className={clsx(
                    "px-2 py-1 rounded-full text-xs font-bold border",
                    {
                      'bg-gray-100 text-gray-600 border-gray-200': flight.status === 'SCHEDULED',
                      'bg-green-100 text-green-700 border-green-200': flight.status === 'BOARDING',
                      'bg-blue-100 text-blue-700 border-blue-200': flight.status === 'DEPARTED',
                      'bg-yellow-100 text-yellow-700 border-yellow-200': flight.status === 'DELAYED',
                      'bg-red-100 text-red-700 border-red-200': flight.status === 'CANCELLED',
                    }
                  )}>
                    {flight.status}
                  </span>
                </td>
                <td className="p-3">
                  <select 
                    className="text-xs border rounded p-1 bg-white hover:border-purple-300 focus:border-purple-500 outline-none cursor-pointer"
                    value={flight.status}
                    onChange={(e) => updateFlightStatus(flight.id, e.target.value as any)}
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="BOARDING">BOARDING</option>
                    <option value="DELAYED">DELAYED</option>
                    <option value="DEPARTED">DEPARTED</option>
                    <option value="ARRIVED">ARRIVED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
