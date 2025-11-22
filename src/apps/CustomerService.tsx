import { useState, useMemo } from 'react';
import { useAirportStore } from '../store/airportStore';
import { Search, User, Plane, DollarSign, ArrowUpDown, Gift, AlertCircle, CheckCircle } from 'lucide-react';

export const CustomerServiceApp = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedPnr, setSearchedPnr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'LOOKUP' | 'REBOOK' | 'REFUND' | 'UPGRADE' | 'VOUCHER' | 'COMPLAINT'>('LOOKUP');
  
  // Store
  const passengers = useAirportStore((state) => state.passengers);
  const flights = useAirportStore((state) => state.flights);
  const vouchers = useAirportStore((state) => state.vouchers);
  const complaints = useAirportStore((state) => state.complaints);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);
  const rebookPassenger = useAirportStore((state) => state.rebookPassenger);
  const processRefund = useAirportStore((state) => state.processRefund);
  const upgradePassenger = useAirportStore((state) => state.upgradePassenger);
  const issueVoucher = useAirportStore((state) => state.issueVoucher);
  const createComplaint = useAirportStore((state) => state.createComplaint);
  const updateComplaint = useAirportStore((state) => state.updateComplaint);
  
  // Form states
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [selectedNewFlight, setSelectedNewFlight] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [upgradeClass, setUpgradeClass] = useState<'J' | 'Y'>('J');
  const [voucherAmount, setVoucherAmount] = useState('');
  const [voucherReason, setVoucherReason] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<string | null>(null);
  const [complaintResolution, setComplaintResolution] = useState('');
  
  const foundPassenger = searchedPnr 
    ? passengers.find(p => p.pnr === searchedPnr) 
    : null;
  
  const foundFlight = foundPassenger 
    ? flights.find(f => f.id === foundPassenger.flightId) 
    : null;
  
  const passengerVouchers = useMemo(() => 
    searchedPnr ? vouchers.filter(v => v.pnr === searchedPnr) : [],
    [vouchers, searchedPnr]
  );
  
  const passengerComplaints = useMemo(() => 
    searchedPnr ? complaints.filter(c => c.pnr === searchedPnr) : [],
    [complaints, searchedPnr]
  );
  
  const availableFlights = useMemo(() => 
    flights.filter(f => 
      foundFlight && 
      f.origin === foundFlight.origin && 
      f.destination === foundFlight.destination &&
      f.id !== foundFlight.id &&
      f.status !== 'DEPARTED' &&
      f.status !== 'CANCELLED'
    ),
    [flights, foundFlight]
  );
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.toUpperCase().trim();
    const match = passengers.find(p => p.pnr === term || p.lastName === term);
    if (match) {
      setSearchedPnr(match.pnr);
      setActiveTab('LOOKUP');
      // Reset form states
      setNewFirstName(match.firstName);
      setNewLastName(match.lastName);
      setSelectedNewFlight('');
      setRefundAmount('');
      setRefundReason('');
      setVoucherAmount('');
      setVoucherReason('');
      setComplaintCategory('');
      setComplaintDescription('');
    } else {
      setSearchedPnr(null);
    }
  };
  
  const handleNameChange = () => {
    if (!foundPassenger || !newFirstName || !newLastName) return;
    updatePassengerDetails(foundPassenger.pnr, {
      firstName: newFirstName.toUpperCase(),
      lastName: newLastName.toUpperCase()
    });
    alert(`Name changed to ${newLastName.toUpperCase()}, ${newFirstName.toUpperCase()}`);
  };
  
  const handleRebook = () => {
    if (!foundPassenger || !selectedNewFlight) return;
    const success = rebookPassenger(foundPassenger.pnr, selectedNewFlight);
    if (success) {
      alert('Passenger rebooked successfully!');
      setSelectedNewFlight('');
      setSearchedPnr(null);
      setSearchTerm('');
    } else {
      alert('Rebooking failed. Passenger may already be boarded.');
    }
  };
  
  const handleRefund = () => {
    if (!foundPassenger || !refundAmount || !refundReason) return;
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid refund amount');
      return;
    }
    const success = processRefund(foundPassenger.pnr, amount, refundReason);
    if (success) {
      alert(`Refund of €${amount.toFixed(2)} processed successfully!`);
      setRefundAmount('');
      setRefundReason('');
    }
  };
  
  const handleUpgrade = () => {
    if (!foundPassenger) return;
    const success = upgradePassenger(foundPassenger.pnr, upgradeClass);
    if (success) {
      alert(`Passenger upgraded to ${upgradeClass} class!`);
      setUpgradeClass('J');
    }
  };
  
  const handleIssueVoucher = () => {
    if (!foundPassenger || !voucherAmount || !voucherReason) return;
    const amount = parseFloat(voucherAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid voucher amount');
      return;
    }
    const voucherId = issueVoucher(foundPassenger.pnr, amount, voucherReason);
    alert(`Voucher ${voucherId} issued: €${amount.toFixed(2)}`);
    setVoucherAmount('');
    setVoucherReason('');
  };
  
  const handleCreateComplaint = () => {
    if (!foundPassenger || !complaintCategory || !complaintDescription) return;
    const complaintId = createComplaint(
      foundPassenger.pnr,
      `${foundPassenger.lastName}, ${foundPassenger.firstName}`,
      complaintCategory,
      complaintDescription
    );
    alert(`Complaint ${complaintId} created and logged.`);
    setComplaintCategory('');
    setComplaintDescription('');
  };
  
  const handleResolveComplaint = () => {
    if (!selectedComplaint || !complaintResolution) return;
    updateComplaint(selectedComplaint, 'RESOLVED', complaintResolution);
    alert('Complaint marked as resolved.');
    setSelectedComplaint(null);
    setComplaintResolution('');
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'text-green-600 bg-green-50';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50';
      case 'CLOSED': return 'text-gray-600 bg-gray-50';
      default: return 'text-red-600 bg-red-50';
    }
  };
  
  return (
    <div className="h-full w-full bg-gradient-to-br from-blue-50 to-indigo-100 text-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6" />
            Customer Service Desk
          </h1>
          <span className="text-sm bg-blue-800 px-3 py-1 rounded-full font-mono">CSD v2.1</span>
        </div>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by PNR or Last Name..."
              className="w-full pl-10 pr-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Search
          </button>
        </form>
      </div>
      
      {!foundPassenger ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Enter PNR or Last Name to begin</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Passenger Info Bar */}
          <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{foundPassenger.lastName}, {foundPassenger.firstName}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="font-mono bg-blue-100 px-2 py-1 rounded">{foundPassenger.pnr}</span>
                  <span>Status: <strong className={foundPassenger.status === 'BOARDED' ? 'text-green-600' : foundPassenger.status === 'CHECKED_IN' ? 'text-blue-600' : 'text-gray-600'}>{foundPassenger.status}</strong></span>
                  {foundFlight && (
                    <>
                      <span>Flight: <strong>{foundFlight.flightNumber}</strong></span>
                      <span>Route: <strong>{foundFlight.origin} → {foundFlight.destination}</strong></span>
                      <span>Seat: <strong>{foundPassenger.seat}</strong></span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                {foundFlight && (
                  <div className="text-sm text-gray-600">
                    <div>STD: {foundFlight.std}</div>
                    <div>Gate: {foundFlight.gate}</div>
                    <div className={`font-semibold ${foundFlight.status === 'DELAYED' ? 'text-orange-600' : foundFlight.status === 'CANCELLED' ? 'text-red-600' : 'text-green-600'}`}>
                      {foundFlight.status}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 flex overflow-x-auto">
            {[
              { id: 'LOOKUP', label: 'PNR Details', icon: Search },
              { id: 'REBOOK', label: 'Rebooking', icon: Plane },
              { id: 'REFUND', label: 'Refunds', icon: DollarSign },
              { id: 'UPGRADE', label: 'Upgrade', icon: ArrowUpDown },
              { id: 'VOUCHER', label: 'Vouchers', icon: Gift },
              { id: 'COMPLAINT', label: 'Complaints', icon: AlertCircle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'LOOKUP' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Passenger Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleNameChange}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Name
                  </button>
                </div>
                
                {passengerVouchers.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Gift className="w-5 h-5" />
                      Active Vouchers
                    </h3>
                    <div className="space-y-2">
                      {passengerVouchers.filter(v => v.status === 'ACTIVE').map(v => (
                        <div key={v.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                          <div>
                            <div className="font-mono font-semibold">{v.id}</div>
                            <div className="text-sm text-gray-600">{v.reason}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-700">€{v.amount.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">Expires: {new Date(v.expiryDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'REBOOK' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Plane className="w-5 h-5" />
                  Rebook to Different Flight
                </h3>
                {foundPassenger.status === 'BOARDED' ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    <AlertCircle className="w-5 h-5 inline mr-2" />
                    Cannot rebook a passenger who has already boarded.
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select New Flight</label>
                      <select
                        value={selectedNewFlight}
                        onChange={(e) => setSelectedNewFlight(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select Flight --</option>
                        {availableFlights.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.flightNumber} | {f.origin} → {f.destination} | {f.std} | Gate {f.gate} | {f.status}
                          </option>
                        ))}
                      </select>
                    </div>
                    {availableFlights.length === 0 && (
                      <div className="text-sm text-gray-500 mb-4">No alternative flights available for this route.</div>
                    )}
                    <button
                      onClick={handleRebook}
                      disabled={!selectedNewFlight}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Confirm Rebooking
                    </button>
                  </>
                )}
              </div>
            )}
            
            {activeTab === 'REFUND' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Process Refund
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Refund Amount (EUR)</label>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Enter refund reason..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleRefund}
                    disabled={!refundAmount || !refundReason}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Process Refund
                  </button>
                </div>
              </div>
            )}
            
            {activeTab === 'UPGRADE' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ArrowUpDown className="w-5 h-5" />
                  Class Upgrade
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upgrade To</label>
                    <select
                      value={upgradeClass}
                      onChange={(e) => setUpgradeClass(e.target.value as 'J' | 'Y')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="J">Business Class (J)</option>
                      <option value="Y">Economy Class (Y)</option>
                    </select>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Upgrading will automatically assign a new seat in the selected class.
                      {foundPassenger.seat && ` Current seat: ${foundPassenger.seat}`}
                    </p>
                  </div>
                  <button
                    onClick={handleUpgrade}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Confirm Upgrade
                  </button>
                </div>
              </div>
            )}
            
            {activeTab === 'VOUCHER' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Issue Travel Voucher
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Amount (EUR)</label>
                      <input
                        type="number"
                        value={voucherAmount}
                        onChange={(e) => setVoucherAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                      <textarea
                        value={voucherReason}
                        onChange={(e) => setVoucherReason(e.target.value)}
                        placeholder="Enter voucher reason (e.g., flight delay, service issue)..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleIssueVoucher}
                      disabled={!voucherAmount || !voucherReason}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Issue Voucher
                    </button>
                  </div>
                </div>
                
                {passengerVouchers.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Voucher History</h3>
                    <div className="space-y-2">
                      {passengerVouchers.map(v => (
                        <div key={v.id} className={`p-3 border rounded ${v.status === 'ACTIVE' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-mono font-semibold">{v.id}</div>
                              <div className="text-sm text-gray-600">{v.reason}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Issued: {new Date(v.issuedDate).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${v.status === 'ACTIVE' ? 'text-green-700' : 'text-gray-500'}`}>
                                €{v.amount.toFixed(2)}
                              </div>
                              <div className={`text-xs px-2 py-1 rounded mt-1 ${
                                v.status === 'ACTIVE' ? 'bg-green-200 text-green-800' :
                                v.status === 'USED' ? 'bg-blue-200 text-blue-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {v.status}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'COMPLAINT' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Log New Complaint
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={complaintCategory}
                        onChange={(e) => setComplaintCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select Category --</option>
                        <option value="Flight Delay">Flight Delay</option>
                        <option value="Cancellation">Cancellation</option>
                        <option value="Baggage">Baggage Issue</option>
                        <option value="Service">Service Quality</option>
                        <option value="Seat">Seat Assignment</option>
                        <option value="Check-in">Check-in Issue</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={complaintDescription}
                        onChange={(e) => setComplaintDescription(e.target.value)}
                        placeholder="Describe the issue in detail..."
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleCreateComplaint}
                      disabled={!complaintCategory || !complaintDescription}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Create Complaint
                    </button>
                  </div>
                </div>
                
                {passengerComplaints.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Complaint History</h3>
                    <div className="space-y-3">
                      {passengerComplaints.map(c => (
                        <div key={c.id} className={`p-4 border rounded-lg ${getStatusColor(c.status)}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-mono font-semibold text-sm">{c.id}</div>
                              <div className="text-sm font-medium mt-1">{c.category}</div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(c.status)}`}>
                                {c.status.replace('_', ' ')}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm mb-2">{c.description}</div>
                          {c.resolution && (
                            <div className="mt-2 pt-2 border-t border-gray-300">
                              <div className="text-xs font-semibold mb-1">Resolution:</div>
                              <div className="text-sm">{c.resolution}</div>
                            </div>
                          )}
                          {c.status === 'OPEN' && (
                            <button
                              onClick={() => setSelectedComplaint(c.id)}
                              className="mt-2 text-xs text-blue-600 hover:underline"
                            >
                              Resolve Complaint →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedComplaint && (
                  <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-500">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Resolve Complaint {selectedComplaint}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Details</label>
                        <textarea
                          value={complaintResolution}
                          onChange={(e) => setComplaintResolution(e.target.value)}
                          placeholder="Enter resolution details..."
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleResolveComplaint}
                          disabled={!complaintResolution}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Mark as Resolved
                        </button>
                        <button
                          onClick={() => {
                            setSelectedComplaint(null);
                            setComplaintResolution('');
                          }}
                          className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

