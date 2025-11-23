import type { Flight, Passenger } from '../store/airportStore';
import { Printer } from 'lucide-react';

interface BriefsheetProps {
  flight: Flight;
  passengers: Passenger[];
  onClose?: () => void;
}

export const Briefsheet = ({ flight, passengers, onClose }: BriefsheetProps) => {
  const flightPassengers = passengers.filter(p => p.flightId === flight.id);
  
  // Calculate statistics
  const stats = {
    total: flightPassengers.length,
    checkedIn: flightPassengers.filter(p => p.status === 'CHECKED_IN' || p.status === 'BOARDED').length,
    boarded: flightPassengers.filter(p => p.status === 'BOARDED').length,
    booked: flightPassengers.filter(p => p.status === 'BOOKED').length,
    business: flightPassengers.filter(p => {
      const row = parseInt(p.seat?.match(/\d+/)?.[0] || '0');
      return row > 0 && row <= 5;
    }).length,
    economy: flightPassengers.filter(p => {
      const row = parseInt(p.seat?.match(/\d+/)?.[0] || '0');
      return row > 5 || row === 0;
    }).length,
    totalBags: flightPassengers.reduce((sum, p) => sum + p.bagCount, 0),
    totalBagWeight: flightPassengers.reduce((sum, p) => sum + (p.bagCount * 23), 0), // Assume 23kg per bag
    staff: flightPassengers.filter(p => p.passengerType === 'STAFF_DUTY' || p.passengerType === 'STAFF_SBY').length,
    specialAssistance: flightPassengers.filter(p => p.seat === 'REQ' || !p.seat).length,
  };

  // Format date
  const formatDate = () => {
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
    return `${day}${month} ${date.getFullYear()}`;
  };

  // Calculate arrival time (estimate)
  const calculateArrival = () => {
    const [depHour, depMin] = flight.std.split(':').map(Number);
    const duration = flight.destination === 'JFK' || flight.destination === 'LAX' || flight.destination === 'BKK' || flight.destination === 'DOH' ? 8 : 2;
    const arrHour = (depHour + duration) % 24;
    const arrMin = depMin;
    return `${arrHour.toString().padStart(2, '0')}:${arrMin.toString().padStart(2, '0')}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full w-full bg-white p-8 overflow-y-auto print:p-0">
      {/* Print Button - Hidden when printing */}
      <div className="mb-4 print:hidden flex justify-between items-center">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <Printer size={16} />
          Print Briefsheet
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Close
          </button>
        )}
      </div>

      {/* Briefsheet Content */}
      <div className="bg-white max-w-4xl mx-auto print:max-w-none">
        {/* Header */}
        <div className="border-b-4 border-black mb-6 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">FLIGHT BRIEFSHEET</h1>
              <div className="text-sm text-gray-600">Generated: {new Date().toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{flight.flightNumber}</div>
              <div className="text-sm text-gray-600">Flight Number</div>
            </div>
          </div>
        </div>

        {/* Flight Information */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-300 p-4">
            <h2 className="font-bold text-lg mb-3 border-b border-gray-300 pb-1">FLIGHT DETAILS</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">Route:</span>
                <span>{flight.origin} → {flight.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Date:</span>
                <span>{formatDate()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">STD:</span>
                <span>{flight.std}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">ETD:</span>
                <span>{flight.etd || flight.std}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">ETA:</span>
                <span>{calculateArrival()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Gate:</span>
                <span>{flight.gate || 'TBA'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Aircraft:</span>
                <span>{flight.aircraft || 'TBA'}</span>
              </div>
              {flight.registration && (
                <div className="flex justify-between">
                  <span className="font-semibold">Registration:</span>
                  <span>{flight.registration}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-semibold">Status:</span>
                <span className="font-bold">{flight.status}</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-300 p-4">
            <h2 className="font-bold text-lg mb-3 border-b border-gray-300 pb-1">PASSENGER SUMMARY</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">Total Passengers:</span>
                <span>{stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Booked:</span>
                <span>{stats.booked}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Checked In:</span>
                <span>{stats.checkedIn}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Boarded:</span>
                <span className="font-bold text-green-600">{stats.boarded}</span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                <span className="font-semibold">Business Class:</span>
                <span>{stats.business}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Economy Class:</span>
                <span>{stats.economy}</span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                <span className="font-semibold">Staff:</span>
                <span>{stats.staff}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Special Assistance:</span>
                <span>{stats.specialAssistance}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Baggage Information */}
        <div className="border border-gray-300 p-4 mb-6">
          <h2 className="font-bold text-lg mb-3 border-b border-gray-300 pb-1">BAGGAGE SUMMARY</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold">Total Pieces:</span>
              <span className="ml-2">{stats.totalBags}</span>
            </div>
            <div>
              <span className="font-semibold">Total Weight:</span>
              <span className="ml-2">{stats.totalBagWeight} kg</span>
            </div>
            <div>
              <span className="font-semibold">Average per Pax:</span>
              <span className="ml-2">{stats.checkedIn > 0 ? (stats.totalBags / stats.checkedIn).toFixed(1) : '0'} pcs</span>
            </div>
          </div>
        </div>

        {/* Passenger Manifest */}
        <div className="border border-gray-300 p-4 mb-6">
          <h2 className="font-bold text-lg mb-3 border-b border-gray-300 pb-1">PASSENGER MANIFEST</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-400">
                  <th className="text-left p-2 border border-gray-300">Seq</th>
                  <th className="text-left p-2 border border-gray-300">PNR</th>
                  <th className="text-left p-2 border border-gray-300">Name</th>
                  <th className="text-left p-2 border border-gray-300">Seat</th>
                  <th className="text-left p-2 border border-gray-300">Status</th>
                  <th className="text-left p-2 border border-gray-300">Bags</th>
                  <th className="text-left p-2 border border-gray-300">Type</th>
                </tr>
              </thead>
              <tbody>
                {flightPassengers
                  .sort((a, b) => {
                    // Sort by seat number
                    const aRow = parseInt(a.seat?.match(/\d+/)?.[0] || '999');
                    const bRow = parseInt(b.seat?.match(/\d+/)?.[0] || '999');
                    if (aRow !== bRow) return aRow - bRow;
                    return (a.seat || '').localeCompare(b.seat || '');
                  })
                  .map((p, idx) => {
                    const row = parseInt(p.seat?.match(/\d+/)?.[0] || '0');
                    const classType = row > 0 && row <= 5 ? 'J' : 'Y';
                    return (
                      <tr key={p.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-2 border border-gray-300">{idx + 1}</td>
                        <td className="p-2 border border-gray-300 font-mono">{p.pnr}</td>
                        <td className="p-2 border border-gray-300">
                          {p.lastName}, {p.firstName} {p.title || 'MR'}
                          {p.passengerType === 'STAFF_DUTY' && <span className="ml-1 text-[10px] bg-yellow-200 text-yellow-800 px-1 rounded">DUTY</span>}
                          {p.passengerType === 'STAFF_SBY' && <span className="ml-1 text-[10px] bg-orange-200 text-orange-800 px-1 rounded">SBY</span>}
                        </td>
                        <td className="p-2 border border-gray-300 font-mono font-bold">{p.seat || 'TBA'}</td>
                        <td className="p-2 border border-gray-300">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'BOARDED' ? 'bg-green-100 text-green-800' :
                            p.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-2 border border-gray-300 text-center">{p.bagCount}</td>
                        <td className="p-2 border border-gray-300 text-center">{classType}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Special Notes */}
        {flight.gateMessage && (
          <div className="border border-red-500 bg-red-50 p-4 mb-6">
            <h2 className="font-bold text-lg mb-2 text-red-800">GATE MESSAGE</h2>
            <div className="text-red-900 font-semibold">{flight.gateMessage}</div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-400 pt-4 mt-6 text-xs text-gray-600 text-center">
          <div>This briefsheet is generated automatically and contains operational information for flight {flight.flightNumber}</div>
          <div className="mt-2">For operational use only - Confidential</div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:max-w-none,
          .print\\:max-w-none * {
            visibility: visible;
          }
          .print\\:max-w-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
};

