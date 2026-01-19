import { useState, useMemo, useEffect } from 'react';
import { useAirportStore, type LostItem } from '../store/airportStore';
import { Search, Plus, Package, CheckCircle, Clock, MapPin, QrCode, X, Phone, Check, FileText, Archive, Pause, Menu, AlertCircle, Luggage, Mail } from 'lucide-react';
import QRCode from 'react-qr-code';
import clsx from 'clsx';
import { generateBaggageStatusUpdateHtml } from '../services/mailgun';
import { sendEmail } from '../services/mailgun';

// --- Legacy Amadeus Components ---

const Tab = ({ label, active, onClick, first }: { label: string, active: boolean, onClick: () => void, first?: boolean }) => (
  <button
    onClick={onClick}
    className={clsx(
      "relative h-8 px-4 flex items-center justify-center text-xs font-bold select-none",
      first ? "ml-0" : "-ml-2",
      active 
        ? "bg-blue-700 text-white z-10" 
        : "bg-[#D4D0C8] text-gray-600 hover:bg-[#E0DCD4] z-0"
    )}
    style={{
      clipPath: "polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%, 10% 50%)",
      paddingLeft: first ? "1rem" : "1.5rem",
      paddingRight: "1rem",
      width: "140px"
    }}
  >
    {label}
  </button>
);

const LegacyInput = ({ label, value, onChange, width = "w-full", placeholder = "", readOnly = false, type = "text" }: any) => (
  <div className="flex flex-col">
    <label className="text-[10px] text-blue-800 font-bold mb-0.5">{label}</label>
    <div className="relative">
      <input 
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly || !onChange}
        placeholder={placeholder}
        className={`h-6 border border-[#7F9DB9] bg-white px-1 text-xs text-black outline-none focus:border-blue-500 ${width}`}
      />
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-[#D4D0C8] border-l border-[#7F9DB9] flex items-center justify-center">
        <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-black/50" />
      </div>
    </div>
  </div>
);

const LegacyTextarea = ({ label, value, onChange, rows = 3, placeholder = "" }: any) => (
  <div className="flex flex-col">
    <label className="text-[10px] text-blue-800 font-bold mb-0.5">{label}</label>
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="h-auto border border-[#7F9DB9] bg-white px-1 py-1 text-xs text-black outline-none focus:border-blue-500 resize-none"
    />
  </div>
);

const LegacySelect = ({ label, value, onChange, options, width = "w-full" }: any) => (
  <div className="flex flex-col">
    <label className="text-[10px] text-blue-800 font-bold mb-0.5">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`h-6 border border-[#7F9DB9] bg-white px-1 text-xs text-black outline-none focus:border-blue-500 ${width}`}
      >
        {options.map((opt: any) => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
    </div>
  </div>
);

const LegacyButton = ({ children, onClick, primary, disabled, small = false }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      "px-4 py-1 text-xs font-bold border border-[#003C74] shadow-[1px_1px_0px_#fff_inset] active:shadow-[1px_1px_2px_#000_inset] active:translate-y-[1px]",
      small && "px-2 py-0.5 text-[10px]",
      primary 
        ? "bg-gradient-to-b from-[#B0CFF5] to-[#89B5EA] text-[#003C74]" 
        : "bg-gradient-to-b from-[#F0F0F0] to-[#D4D0C8] text-black",
      disabled && "opacity-50 grayscale cursor-not-allowed"
    )}
  >
    {children}
  </button>
);

const MenuButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full h-32 bg-gradient-to-b from-[#F0F0F0] to-[#D4D0C8] border-2 border-[#A0A0A0] shadow-[2px_2px_4px_#000_inset] active:shadow-[1px_1px_2px_#000_inset] active:translate-y-[1px] flex flex-col items-center justify-center gap-2 hover:from-[#E0DCD4] hover:to-[#C4C0B8] transition-all"
  >
    <Icon className="w-8 h-8 text-[#003C74]" />
    <span className="text-xs font-bold text-[#003C74] text-center px-2">{label}</span>
  </button>
);

const SelectionSquare = ({ code, label, selected, onClick, colorClass }: { code: string, label: string, selected: boolean, onClick: () => void, colorClass?: string }) => (
  <button
    onClick={onClick}
    className={clsx(
      "w-20 h-20 border-2 flex flex-col items-center justify-center text-xs font-bold transition-all relative",
      selected 
        ? "border-blue-600 bg-blue-100 shadow-inner" 
        : "border-[#A0A0A0] hover:bg-gray-50",
      !selected && colorClass && colorClass !== 'bg-stripes' && colorClass,
      !selected && !colorClass && "bg-white"
    )}
    style={colorClass === 'bg-stripes' && !selected ? {
      backgroundImage: 'repeating-linear-gradient(45deg, #ff0000, #ff0000 10px, #ffff00 10px, #ffff00 20px, #0000ff 20px, #0000ff 30px)'
    } : undefined}
  >
    <div className={clsx(
      "text-[10px] font-mono font-bold",
      (colorClass === 'bg-black' || colorClass === 'bg-amber-800') && !selected ? "text-white" : "text-black"
    )}>{code}</div>
    <div className={clsx(
      "text-[9px] text-center mt-1 px-1",
      (colorClass === 'bg-black' || colorClass === 'bg-amber-800') && !selected ? "text-white" : "text-black"
    )}>{label}</div>
  </button>
);

const HeaderInfo = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <div className="bg-[#FDFBF7] border-b border-[#A0A0A0] px-2 py-1 text-xs font-mono flex justify-between items-center select-none">
    <div className="flex items-center gap-4">
      <span className="font-bold text-blue-800">📦 {title}</span>
      {subtitle && <span>{subtitle}</span>}
    </div>
    <div className="flex gap-4">
      <span className="text-green-600 font-bold">LOST & FOUND SYSTEM</span>
    </div>
  </div>
);

export const LostAndFoundApp = () => {
  const [activeTab, setActiveTab] = useState<'HOME' | 'SEARCH' | 'ADD' | 'FILES' | 'REPORT_LOST' | 'BAGGAGE_TRACER' | 'REPORT_FIND'>('HOME');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'FOUND' | 'LOST' | 'CLAIMED' | 'ARCHIVED' | 'SUSPENDED' | 'CLOSED'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  const [showDeliveryDateModal, setShowDeliveryDateModal] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [newStatus, setNewStatus] = useState<LostItem['status']>('FOUND');
  const [addressSearchTerm, setAddressSearchTerm] = useState('');
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  
  // Form states
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocationFound, setNewLocationFound] = useState('');
  const [newFoundBy, setNewFoundBy] = useState('');
  const [newFlightNumber, setNewFlightNumber] = useState('');
  const [newStorageLocation, setNewStorageLocation] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newFileReferenceNumber, setNewFileReferenceNumber] = useState('');
  
  // Claim/Address form states
  const [claimName, setClaimName] = useState('');
  const [claimPhone, setClaimPhone] = useState('');
  const [claimAltPhone, setClaimAltPhone] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [addressTown, setAddressTown] = useState('');
  const [addressCounty, setAddressCounty] = useState('');
  const [addressPostcode, setAddressPostcode] = useState('');
  const [addressCountry, setAddressCountry] = useState('UNITED KINGDOM');
  
  // Report Lost states
  const [searchPnr, setSearchPnr] = useState('');
  const [foundPassenger, setFoundPassenger] = useState<any>(null);
  const [selectedBags, setSelectedBags] = useState<number[]>([]);
  const [bagStatus, setBagStatus] = useState<'LOST' | 'DAMAGED'>('LOST');
  const [selectedBagType, setSelectedBagType] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [selectedExternal, setSelectedExternal] = useState<string>('');
  
  // Get lost items from store
  const lostItems = useAirportStore((state) => state.lostItems || []);
  const passengers = useAirportStore((state) => state.passengers || []);
  const flights = useAirportStore((state) => state.flights || []);
  const emails = useAirportStore((state) => state.emails || []);
  const logs = useAirportStore((state) => state.logs || []);
  const addLostItem = useAirportStore((state) => state.addLostItem);
  const claimLostItem = useAirportStore((state) => state.claimLostItem);
  const archiveLostItem = useAirportStore((state) => state.archiveLostItem);
  const suspendLostItem = useAirportStore((state) => state.suspendLostItem);
  const closeLostItemFile = useAirportStore((state) => state.closeLostItemFile);
  const updateLostItem = useAirportStore((state) => state.updateLostItem);
  const validatePhoneNumber = useAirportStore((state) => state.validatePhoneNumber);
  const sendEmailConfirmation = useAirportStore((state) => state.sendEmailConfirmation);
  const addLog = useAirportStore((state) => state.addLog);
  
  const categories = ['Electronics', 'Clothing', 'Documents', 'Bags/Luggage', 'Jewelry', 'Toys', 'Other'];
  
  // Baggage identification data
  const bagTypesNoZipper = [
    { code: '01', label: 'Horizontal Hard' },
    { code: '02', label: 'Upright' },
    { code: '03', label: 'Horizontal Soft' },
    { code: '05', label: 'Document Bag' },
    { code: '06', label: 'Briefcase' },
    { code: '07', label: 'Document Bag 2' },
    { code: '08', label: 'Money Bag' },
    { code: '09', label: 'Utility/Carry' },
    { code: '10', label: 'Storage Container' },
    { code: '12', label: 'Storage Container 2' }
  ];
  
  const bagTypesZipper = [
    { code: '20', label: 'Garment Bag' },
    { code: '22', label: 'Upright Soft' },
    { code: '22D', label: 'Upright Combined' },
    { code: '22R', label: 'Upright Hard' },
    { code: '23', label: 'Horizontal Soft' },
    { code: '25', label: 'Golf/Sporting' },
    { code: '26', label: 'Top/Overnight' },
    { code: '27', label: 'Ensemble' },
    { code: '28', label: 'Market/Beach' },
    { code: '29', label: 'Backpack' }
  ];
  
  const miscellaneousTypes = [
    { code: '50', label: 'Hat Box' },
    { code: '51', label: 'Quiver Bag' },
    { code: '52', label: 'Tool Case' },
    { code: '53', label: 'Art Portfolio' },
    { code: '54', label: 'Tube' },
    { code: '55', label: 'Duty Free' },
    { code: '56', label: 'Cosmetic Case' },
    { code: '57', label: 'Kennel/Pet' },
    { code: '58', label: 'Ice Chest' },
    { code: '59', label: 'Golf/Tackle' },
    { code: '60', label: 'Fishing Rods' },
    { code: '61', label: 'Firearm(s)' },
    { code: '62', label: 'Golf Clubs' },
    { code: '63', label: 'Bicycle' },
    { code: '64', label: 'Sleeping Bag' },
    { code: '65', label: 'Surf Equipment' },
    { code: '66', label: 'Ski Poles' },
    { code: '67', label: 'Snow Board' },
    { code: '68', label: 'Ski Boots' },
    { code: '69', label: 'Sporting Equip' },
    { code: '71', label: 'Car Seat' },
    { code: '72', label: 'Infant Equip' },
    { code: '73', label: 'Baby Carriage' },
    { code: '74', label: 'Umbrella Stroller' },
    { code: '75', label: 'Wheeled Sport' },
    { code: '81', label: 'Audio/Video' },
    { code: '82', label: 'Computer' },
    { code: '83', label: 'Appliances' },
    { code: '85', label: 'Music Instruments' },
    { code: '89', label: 'Folding Chair' },
    { code: '90', label: 'Baggage Trolley' },
    { code: '92', label: 'Security Items' },
    { code: '93', label: 'Shopping Bag' },
    { code: '94', label: 'Wheel Chair' },
    { code: '95', label: 'Orthopedic' },
    { code: '96', label: 'Bedding Bag' },
    { code: '97', label: 'Dive Bag' },
    { code: '98', label: 'Umbrella' },
    { code: '99', label: 'Not Shown' }
  ];
  
  const colors = [
    { code: 'WT', label: 'White', class: 'bg-white' },
    { code: 'BK', label: 'Black', class: 'bg-black' },
    { code: 'GY', label: 'Grey', class: 'bg-gray-400' },
    { code: 'BU', label: 'Blue', class: 'bg-blue-500' },
    { code: 'PU', label: 'Purple', class: 'bg-purple-500' },
    { code: 'RD', label: 'Red', class: 'bg-red-500' },
    { code: 'YW', label: 'Yellow', class: 'bg-yellow-400' },
    { code: 'BE', label: 'Beige', class: 'bg-amber-200' },
    { code: 'BN', label: 'Brown', class: 'bg-amber-800' },
    { code: 'GN', label: 'Green', class: 'bg-green-500' },
    { code: 'MC', label: 'Multi-Color', class: 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500' },
    { code: 'PR', label: 'Pattern', class: 'bg-stripes' }
  ];
  
  const materials = [
    { code: 'D', label: 'Dual Soft/Hard' },
    { code: 'L', label: 'Leather' },
    { code: 'M', label: 'Metal' },
    { code: 'R', label: 'Rigid/Hard' },
    { code: 'T', label: 'Tweed' }
  ];
  
  const externalElements = [
    { code: 'C', label: 'Combination Lock' },
    { code: 'L', label: 'Retractable Handle' },
    { code: 'S', label: 'Strap/Secure' },
    { code: 'W', label: 'Wheel/Ribbon' },
    { code: 'X', label: 'None' }
  ];
  
  // Sync selectedItem with lostItems when it changes
  useEffect(() => {
    if (selectedItem) {
      const updatedItem = lostItems.find(item => item.id === selectedItem.id);
      if (updatedItem && JSON.stringify(updatedItem) !== JSON.stringify(selectedItem)) {
        setSelectedItem(updatedItem);
        setNewStatus(updatedItem.status);
      }
    }
  }, [lostItems, selectedItem]);
  
  // Group items by file reference number
  const itemsByFile = useMemo(() => {
    const grouped: Record<string, LostItem[]> = {};
    lostItems.forEach(item => {
      const frn = item.fileReferenceNumber || 'UNFILED';
      if (!grouped[frn]) grouped[frn] = [];
      grouped[frn].push(item);
    });
    return grouped;
  }, [lostItems]);
  
  // Get unique file reference numbers
  const fileReferenceNumbers = useMemo(() => {
    return Array.from(new Set(lostItems.map(item => item.fileReferenceNumber).filter(Boolean)));
  }, [lostItems]);
  
  // Get items for selected file or all items
  const displayItems = useMemo(() => {
    const items = selectedFile 
      ? lostItems.filter(item => item.fileReferenceNumber === selectedFile)
      : lostItems;
    
    return items.filter((item: LostItem) => {
      const matchesSearch = !searchTerm || 
        item.itemNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.locationFound.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.flightNumber && item.flightNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.fileReferenceNumber && item.fileReferenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
      const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [lostItems, searchTerm, filterStatus, filterCategory, selectedFile]);
  
  const generateItemNumber = (format: 'LF' | 'BK' = 'LF'): string => {
    if (format === 'BK') {
      const count = lostItems.filter(item => item.itemNumber.startsWith('BK')).length + 1;
      return `BK${String(count).padStart(2, '0')}XXX`;
    }
    const year = new Date().getFullYear();
    const count = lostItems.filter(item => item.itemNumber.startsWith(`LF-${year}`)).length + 1;
    return `LF-${year}-${String(count).padStart(3, '0')}`;
  };
  
  const generateFileReferenceNumber = (): string => {
    const prefix = 'AHL';
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const count = lostItems.length + 1;
    return `${prefix} XQLXS${String(count).padStart(5, '0')}`;
  };
  
  // Mock address suggestions
  const addressSuggestions = useMemo(() => {
    if (!addressSearchTerm || addressSearchTerm.length < 3) return [];
    const term = addressSearchTerm.toLowerCase();
    const suggestions = [
      'Radisson Blu Edwardian Bloomsbury Street Hotel, Bloomsbury Street, London',
      'Radisson Blu Edwardian Manchester, Peter Street, Manchester',
      'Radisson Blu Edwardian Grafton, Tottenham Court Road, London',
      'Radisson Blu Edwardian, Vanderbilt, Cromwell Road, London',
      'Radisson Blu Edwardian New Providence Wharf, Fairmont Avenue, London'
    ];
    return suggestions.filter(addr => addr.toLowerCase().includes(term)).slice(0, 5);
  }, [addressSearchTerm]);
  
  const handleAddItem = () => {
    if (!newCategory || !newDescription || !newLocationFound || !newFoundBy) {
      alert('Please fill in all required fields');
      return;
    }
    
    const frn = newFileReferenceNumber || generateFileReferenceNumber();
    const itemNumber = newCategory === 'Bags/Luggage' ? generateItemNumber('BK') : generateItemNumber('LF');
    
    const newItem: LostItem = {
      id: `item-${Date.now()}`,
      itemNumber,
      fileReferenceNumber: frn,
      category: newCategory,
      description: newDescription,
      locationFound: newLocationFound,
      foundDate: new Date().toISOString(),
      foundBy: newFoundBy,
      status: 'FOUND',
      flightNumber: newFlightNumber || undefined,
      storageLocation: newStorageLocation || undefined,
      notes: newNotes || undefined
    };
    
    if (addLostItem) {
      addLostItem(newItem);
      // Reset form
      setNewCategory('');
      setNewDescription('');
      setNewLocationFound('');
      setNewFoundBy('');
      setNewFlightNumber('');
      setNewStorageLocation('');
      setNewNotes('');
      setNewFileReferenceNumber('');
      setActiveTab('SEARCH');
    }
  };
  
  const handleClaimItem = () => {
    if (!selectedItem || !claimName) {
      alert('Please enter claimant name');
      return;
    }
    
    if (claimLostItem) {
      claimLostItem(
        selectedItem.id,
        claimName,
        claimPhone || claimAltPhone,
        claimPhone,
        {
          line1: addressLine1,
          line2: addressLine2,
          townCity: addressTown,
          countyState: addressCounty,
          postcode: addressPostcode,
          country: addressCountry
        }
      );
      setSelectedItem(null);
      setClaimName('');
      setClaimPhone('');
      setClaimAltPhone('');
      setAddressLine1('');
      setAddressLine2('');
      setAddressTown('');
      setAddressCounty('');
      setAddressPostcode('');
      setAddressCountry('UNITED KINGDOM');
      setShowAddressModal(false);
    }
  };
  
  const handleValidatePhone = () => {
    if (!selectedItem || !claimPhone) return;
    const isValid = validatePhoneNumber(selectedItem.id, claimPhone);
    if (!isValid) {
      alert('Invalid phone number format');
    } else {
      const updatedItem = lostItems.find(item => item.id === selectedItem.id);
      if (updatedItem) {
        setSelectedItem(updatedItem);
      }
    }
  };
  
  const handleSearchPnr = () => {
    if (!searchPnr) return;
    const pnr = searchPnr.toUpperCase().trim();
    const passenger = passengers.find(p => p.pnr === pnr);
    
    if (passenger) {
      setFoundPassenger(passenger);
      setClaimName(`${passenger.firstName} ${passenger.lastName}`);
      setSelectedBags([]);
      
      // Try to find email from previous emails or userEmail
      const passengerEmail = passenger.userEmail || 
        emails.find(e => e.pnr === pnr && e.status === 'SENT')?.to ||
        emails.find(e => e.pnr === pnr)?.to;
      if (passengerEmail) {
        setClaimEmail(passengerEmail);
      }
      
      // Set flight info if available
      const flight = flights.find(f => f.id === passenger.flightId);
      if (flight) {
        setNewFlightNumber(flight.flightNumber);
      }
    } else {
      alert(`No passenger found with PNR: ${pnr}`);
      setFoundPassenger(null);
      setSelectedBags([]);
    }
  };
  
  const handleToggleBag = (bagIndex: number) => {
    setSelectedBags(prev => 
      prev.includes(bagIndex)
        ? prev.filter(b => b !== bagIndex)
        : [...prev, bagIndex]
    );
  };
  
  const handleSubmitLostBaggage = async () => {
    if (!foundPassenger) {
      alert('Please search for a passenger first');
      return;
    }
    
    if (selectedBags.length === 0) {
      alert('Please select at least one bag');
      return;
    }
    
    if (!claimPhone) {
      alert('Please enter contact phone number');
      return;
    }
    
    if (!claimEmail) {
      alert('Please enter email address');
      return;
    }
    
    const frn = generateFileReferenceNumber();
    const flight = flights.find(f => f.id === foundPassenger.flightId);
    
    // Build identification string
    const identificationParts = [];
    if (selectedBagType) identificationParts.push(`Type:${selectedBagType}`);
    if (selectedColor) identificationParts.push(`Color:${selectedColor}`);
    if (selectedMaterial) identificationParts.push(`Material:${selectedMaterial}`);
    if (selectedExternal) identificationParts.push(`External:${selectedExternal}`);
    const identification = identificationParts.length > 0 ? ` [${identificationParts.join(' ')}]` : '';
    
    // Collect bag data for email
    const bagData: Array<{
      bagNumber: string;
      status: string;
      type?: string;
      color?: string;
      material?: string;
      external?: string;
    }> = [];
    
    // Create a lost item record for each selected bag
    selectedBags.forEach((bagIndex) => {
      const itemNumber = `BK${String(bagIndex + 1).padStart(2, '0')}XXX`;
      const description = `${bagStatus} Bag ${bagIndex + 1}${identification} - PNR: ${foundPassenger.pnr} - ${foundPassenger.lastName}, ${foundPassenger.firstName}`;
      
      const lostItem: LostItem = {
        id: `item-${Date.now()}-${bagIndex}`,
        itemNumber,
        fileReferenceNumber: frn,
        category: 'Bags/Luggage',
        description,
        locationFound: flight ? `${flight.origin} → ${flight.destination}` : 'Unknown',
        foundDate: new Date().toISOString(),
        foundBy: 'PASSENGER REPORT',
        status: 'LOST', // When passenger reports lost, item status is LOST
        flightNumber: flight?.flightNumber,
        notes: `Bag ${bagIndex + 1} reported as ${bagStatus} by passenger. PNR: ${foundPassenger.pnr}.${identification ? ` Identification: ${identificationParts.join(', ')}` : ''}`,
        phoneNumber: claimPhone,
        claimedBy: `${foundPassenger.firstName} ${foundPassenger.lastName}`,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        townCity: addressTown || undefined,
        countyState: addressCounty || undefined,
        postcode: addressPostcode || undefined,
        country: addressCountry || undefined
      };
      
      addLostItem(lostItem);
      
      // Collect bag data for email
      bagData.push({
        bagNumber: itemNumber,
        status: bagStatus,
        type: selectedBagType || undefined,
        color: selectedColor || undefined,
        material: selectedMaterial || undefined,
        external: selectedExternal || undefined
      });
    });
    
    // Send email to passenger
    const passengerEmail = claimEmail || 
      foundPassenger.userEmail || 
      emails.find(e => e.pnr === foundPassenger.pnr && e.status === 'SENT')?.to ||
      emails.find(e => e.pnr === foundPassenger.pnr)?.to;
    
    if (passengerEmail && sendEmailConfirmation) {
      try {
        const { generateLostBaggageReportHtml } = await import('../services/mailgun');
        
        const addressString = [
          addressLine1,
          addressLine2,
          addressTown,
          addressCounty,
          addressPostcode,
          addressCountry
        ].filter(Boolean).join(', ');
        
        const htmlContent = generateLostBaggageReportHtml({
          passengerName: `${foundPassenger.firstName} ${foundPassenger.lastName}`,
          pnr: foundPassenger.pnr,
          fileReferenceNumber: frn,
          bags: bagData,
          flightNumber: flight?.flightNumber,
          route: flight ? `${flight.origin} → ${flight.destination}` : undefined,
          phoneNumber: claimPhone,
          address: addressString || undefined
        });
        
        const textContent = `Lost Baggage Report\n\nFile Reference Number: ${frn}\nPNR: ${foundPassenger.pnr}\n\nReported Bags: ${selectedBags.length}\n${bagData.map(bag => `- ${bag.bagNumber}: ${bag.status}`).join('\n')}\n\nPlease keep this reference number for tracking.`;
        
        await sendEmailConfirmation(
          foundPassenger.pnr,
          passengerEmail,
          `Lost Baggage Report - File Reference: ${frn}`,
          textContent,
          htmlContent
        );
      } catch (error: any) {
        console.error('Failed to send email:', error);
        // Don't block the submission if email fails
      }
    }
    
    alert(`Report submitted for ${selectedBags.length} bag(s). File Reference: ${frn}${passengerEmail ? '. Confirmation email sent.' : ''}`);
    
    // Reset form
    setSearchPnr('');
    setFoundPassenger(null);
    setSelectedBags([]);
    setSelectedBagType('');
    setSelectedColor('');
    setSelectedMaterial('');
    setSelectedExternal('');
    setClaimName('');
    setClaimPhone('');
    setClaimEmail('');
    setClaimAltPhone('');
    setAddressLine1('');
    setAddressLine2('');
    setAddressTown('');
    setAddressCounty('');
    setAddressPostcode('');
    setAddressCountry('UNITED KINGDOM');
    setNewFlightNumber('');
    setActiveTab('HOME');
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleUpdateStatus = () => {
    if (!selectedItem || !newStatus) return;
    
    const oldStatus = selectedItem.status;
    if (oldStatus === newStatus) {
      alert('Status is already set to ' + newStatus);
      return;
    }
    
    updateLostItem(selectedItem.id, { status: newStatus });
    addLog(`Lost item ${selectedItem.itemNumber} status changed from ${oldStatus} to ${newStatus}`, 'LOST_FOUND', 'INFO');
    
    // Update selectedItem to reflect the change immediately
    setSelectedItem({ ...selectedItem, status: newStatus });
    
    alert(`Status updated to ${newStatus}`);
  };
  
  // Get tracking history for an item
  const getItemTrackingHistory = (item: LostItem) => {
    const history = [];
    
    // Add initial creation
    history.push({
      date: item.foundDate,
      action: 'Item Created',
      status: item.status,
      by: item.foundBy,
      details: `Item ${item.itemNumber} was ${item.status === 'LOST' ? 'reported as lost' : 'found'}`
    });
    
    // Add status changes from logs
    const itemLogs = logs.filter(log => 
      log.message.includes(item.itemNumber) || 
      log.message.includes(item.itemNumber.replace('XXX', ''))
    );
    
    itemLogs.forEach(log => {
      if (log.message.includes('status changed')) {
        history.push({
          date: log.timestamp,
          action: 'Status Changed',
          status: log.message.match(/to (\w+)/)?.[1] || '',
          by: log.source,
          details: log.message
        });
      } else if (log.message.includes('claimed')) {
        history.push({
          date: item.claimedDate || log.timestamp,
          action: 'Claimed',
          status: 'CLAIMED',
          by: item.claimedBy || log.source,
          details: log.message
        });
      } else {
        history.push({
          date: log.timestamp,
          action: log.type,
          status: item.status,
          by: log.source,
          details: log.message
        });
      }
    });
    
    // Add claim date if exists
    if (item.claimedDate && !history.some(h => h.action === 'Claimed')) {
      history.push({
        date: item.claimedDate,
        action: 'Claimed',
        status: 'CLAIMED',
        by: item.claimedBy || 'Unknown',
        details: `Item claimed by ${item.claimedBy}`
      });
    }
    
    // Sort by date (newest first)
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };
  
  // Send email with baggage status update
  const handleSendStatusEmail = async (statusType: 'FOUND' | 'DELIVERY_PLANNED' | 'DELIVERING' | 'DELIVERED' | 'NOT_FOUND' | 'READY_PICKUP') => {
    if (!selectedItem) return;
    
    // Find passenger by PNR or flight number
    let passenger = null;
    let passengerEmail = '';
    let passengerName = '';
    let pnr = '';
    
    if (selectedItem.flightNumber) {
      const flight = flights.find(f => f.number === selectedItem.flightNumber);
      if (flight) {
        passenger = passengers.find(p => p.flightId === flight.id);
        if (passenger) {
          passengerEmail = passenger.userEmail || '';
          passengerName = `${passenger.firstName} ${passenger.lastName}`;
          pnr = passenger.pnr;
        }
      }
    }
    
    // If no passenger found, try to get from contact info
    if (!passengerEmail && selectedItem.contactInfo) {
      const emailMatch = selectedItem.contactInfo.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        passengerEmail = emailMatch[0];
      }
    }
    
    if (!passengerEmail) {
      alert('No email address found for this item. Please ensure the item has contact information.');
      return;
    }
    
    // For DELIVERY_PLANNED, show date picker modal
    if (statusType === 'DELIVERY_PLANNED') {
      setShowDeliveryDateModal(true);
      return;
    }
    
    // Send email
    await sendStatusEmail(statusType, passengerEmail, passengerName, pnr, selectedItem);
  };
  
  const sendStatusEmail = async (
    statusType: 'FOUND' | 'DELIVERY_PLANNED' | 'DELIVERING' | 'DELIVERED' | 'NOT_FOUND' | 'READY_PICKUP',
    email: string,
    name: string,
    pnr: string,
    item: LostItem,
    deliveryDateValue?: string
  ) => {
    if (!selectedItem) return;
    
    const html = generateBaggageStatusUpdateHtml({
      passengerName: name || 'Valued Passenger',
      pnr: pnr || 'N/A',
      fileReferenceNumber: item.fileReferenceNumber || 'N/A',
      bagNumber: item.itemNumber,
      statusType,
      deliveryDate: deliveryDateValue,
      contactInfo: item.contactInfo
    });
    
    try {
      const statusText = {
        'FOUND': 'We found your bag. Please contact us.',
        'DELIVERY_PLANNED': `Delivery is planned${deliveryDateValue ? ` for ${deliveryDateValue}` : ''}.`,
        'DELIVERING': 'Your bag is currently being delivered.',
        'DELIVERED': 'Your bag has been successfully delivered.',
        'NOT_FOUND': "We can't find your bag yet. We are continuing our search.",
        'READY_PICKUP': 'Your bag is ready for pickup.'
      }[statusType];
      
      await sendEmail({
        to: email,
        subject: `Baggage Status Update - ${item.itemNumber}`,
        text: `Dear ${name || 'Valued Passenger'},\n\n${statusText}\n\nFile Reference Number: ${item.fileReferenceNumber || 'N/A'}\nBag Number: ${item.itemNumber}\nPNR: ${pnr || 'N/A'}\n\nFor assistance, please contact our Lost & Found department.\nPhone: +371 67280422 | Email: lostandfound@airport.com`,
        html
      });
      
      addLog(`Status email sent to ${email} for item ${item.itemNumber} (${statusType})`, 'LOST_FOUND', 'INFO');
      alert(`Email sent successfully to ${email}`);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    }
  };
  
  const handleConfirmDeliveryDate = async () => {
    if (!selectedItem || !deliveryDate) {
      alert('Please select a delivery date');
      return;
    }
    
    setShowDeliveryDateModal(false);
    
    // Find passenger info
    let passenger = null;
    let passengerEmail = '';
    let passengerName = '';
    let pnr = '';
    
    if (selectedItem.flightNumber) {
      const flight = flights.find(f => f.number === selectedItem.flightNumber);
      if (flight) {
        passenger = passengers.find(p => p.flightId === flight.id);
        if (passenger) {
          passengerEmail = passenger.userEmail || '';
          passengerName = `${passenger.firstName} ${passenger.lastName}`;
          pnr = passenger.pnr;
        }
      }
    }
    
    if (!passengerEmail && selectedItem.contactInfo) {
      const emailMatch = selectedItem.contactInfo.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        passengerEmail = emailMatch[0];
      }
    }
    
    if (!passengerEmail) {
      alert('No email address found for this item.');
      return;
    }
    
    await sendStatusEmail('DELIVERY_PLANNED', passengerEmail, passengerName, pnr, selectedItem, deliveryDate);
    setDeliveryDate('');
  };
  
  const getStatusColor = (status: LostItem['status']) => {
    switch (status) {
      case 'FOUND':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'LOST':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'CLAIMED':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'CLOSED':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'ARCHIVED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };
  
  return (
    <div className="h-full w-full bg-[#C0C0C0] flex flex-col">
      <HeaderInfo title="LOST & FOUND SYSTEM" subtitle={`Items: ${lostItems.length} | Files: ${fileReferenceNumbers.length}`} />
      
      {/* Tabs */}
      {activeTab !== 'HOME' && (
        <div className="flex items-end bg-[#C0C0C0] px-2 pt-2">
          <Tab label="HOME" active={false} onClick={() => setActiveTab('HOME')} first />
          <Tab label="SEARCH" active={activeTab === 'SEARCH' || activeTab === 'LOOKUP'} onClick={() => setActiveTab('SEARCH')} />
          <Tab label="ADD ITEM" active={activeTab === 'ADD' || activeTab === 'REPORT_FIND'} onClick={() => setActiveTab('ADD')} />
          <Tab label="FILES" active={activeTab === 'FILES'} onClick={() => setActiveTab('FILES')} />
        </div>
      )}
      
      {/* Content Area */}
      <div className="flex-1 bg-[#C0C0C0] p-4 overflow-y-auto">
        {activeTab === 'HOME' && (
          <div className="bg-[#FDFBF7] border-2 border-[#A0A0A0] p-8">
            <div className="text-center mb-8">
              <div className="text-lg font-bold text-blue-800 mb-2">LOST & FOUND SYSTEM</div>
              <div className="text-xs text-gray-600">Select an option to continue</div>
            </div>
            <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
              <MenuButton
                icon={AlertCircle}
                label="REPORT LOST ITEM"
                onClick={() => setActiveTab('REPORT_LOST')}
              />
              <MenuButton
                icon={Luggage}
                label="BAGGAGE TRACER"
                onClick={() => setActiveTab('BAGGAGE_TRACER')}
              />
              <MenuButton
                icon={Plus}
                label="REPORT FIND ITEM"
                onClick={() => setActiveTab('REPORT_FIND')}
              />
              <MenuButton
                icon={Search}
                label="LOOKUP"
                onClick={() => setActiveTab('SEARCH')}
              />
            </div>
          </div>
        )}
        
        {(activeTab === 'SEARCH' || activeTab === 'LOOKUP') && (
          <div className="bg-[#FDFBF7] border-2 border-[#A0A0A0] p-4 space-y-4">
            {/* Search Section */}
            <div className="grid grid-cols-4 gap-4">
              <LegacyInput 
                label="SEARCH" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Item #, Description, Location..."
              />
              <LegacySelect
                label="STATUS"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                options={['ALL', 'FOUND', 'LOST', 'CLAIMED', 'SUSPENDED', 'CLOSED', 'ARCHIVED']}
              />
              <LegacySelect
                label="CATEGORY"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                options={['ALL', ...categories]}
              />
              <div className="flex items-end">
                <LegacyButton primary onClick={() => {}}>
                  <Search className="w-3 h-3 inline mr-1" />
                  SEARCH
                </LegacyButton>
              </div>
            </div>
            
            {/* File Reference Number */}
            {fileReferenceNumbers.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                <LegacySelect
                  label="FILE REFERENCE NUMBER (FRN)"
                  value={selectedFile || ''}
                  onChange={(e) => setSelectedFile(e.target.value || null)}
                  options={[{ value: '', label: 'ALL ITEMS' }, ...fileReferenceNumbers.map(frn => ({ value: frn, label: frn }))]}
                />
                {selectedFile && (
                  <div className="flex items-end gap-2">
                    <LegacyButton onClick={() => {
                      if (confirm(`Close file ${selectedFile}?`)) {
                        closeLostItemFile(selectedFile);
                        setSelectedFile(null);
                      }
                    }}>
                      CLOSE FILE
                    </LegacyButton>
                    <LegacyButton onClick={() => setSelectedFile(null)}>
                      CLEAR
                    </LegacyButton>
                  </div>
                )}
              </div>
            )}
            
            {/* Results Table */}
            <div className="border-2 border-[#A0A0A0] bg-white">
              <div className="bg-[#D4D0C8] border-b border-[#A0A0A0] px-2 py-1 text-xs font-bold grid grid-cols-12 gap-2 text-black">
                <div className="col-span-1 text-black">ITEM #</div>
                <div className="col-span-1 text-black">FRN</div>
                <div className="col-span-2 text-black">DESCRIPTION</div>
                <div className="col-span-1 text-black">CATEGORY</div>
                <div className="col-span-1 text-black">LOCATION</div>
                <div className="col-span-1 text-black">STATUS</div>
                <div className="col-span-1 text-black">FOUND BY</div>
                <div className="col-span-1 text-black">DATE</div>
                <div className="col-span-3 text-black">ACTIONS</div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {displayItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-xs">No items found</div>
                ) : (
                  displayItems.map((item: LostItem) => (
                    <div 
                      key={item.id}
                      className="border-b border-[#A0A0A0] px-2 py-1 text-xs hover:bg-blue-50 cursor-pointer grid grid-cols-12 gap-2 items-center text-black"
                      onClick={() => {
                        setSelectedItem(item);
                        setNewStatus(item.status);
                        setShowItemDetailsModal(true);
                      }}
                    >
                      <div className="col-span-1 font-mono font-bold text-blue-800">{item.itemNumber}</div>
                      <div className="col-span-1 text-[10px] text-black">{item.fileReferenceNumber || '-'}</div>
                      <div className="col-span-2 text-black">{item.description}</div>
                      <div className="col-span-1 text-black">{item.category}</div>
                      <div className="col-span-1 text-black">{item.locationFound}</div>
                      <div className="col-span-1">
                        <span className={clsx("px-1 py-0.5 rounded text-[10px] font-bold", getStatusColor(item.status))}>
                          {item.status}
                        </span>
                      </div>
                      <div className="col-span-1 text-black">{item.foundBy}</div>
                      <div className="col-span-1 text-[10px] text-black">{formatDate(item.foundDate)}</div>
                      <div className="col-span-3 flex gap-1">
                        <LegacyButton small onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                          setShowQRModal(true);
                        }}>
                          QR
                        </LegacyButton>
                        {(item.status === 'FOUND' || item.status === 'LOST') && (
                          <>
                            <LegacyButton small primary onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                              setShowAddressModal(true);
                            }}>
                              CLAIM
                            </LegacyButton>
                            <LegacyButton small onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Suspend this item?')) {
                                suspendLostItem(item.id);
                              }
                            }}>
                              SUSPEND
                            </LegacyButton>
                          </>
                        )}
                        <LegacyButton small onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Archive this item?')) {
                            archiveLostItem(item.id);
                          }
                        }}>
                          ARCHIVE
                        </LegacyButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'ADD' && (
          <div className="bg-[#FDFBF7] border-2 border-[#A0A0A0] p-4 space-y-4">
            <div className="text-xs font-bold text-blue-800 mb-2">ADD FOUND ITEM</div>
            
            <div className="grid grid-cols-4 gap-4">
              <LegacyInput 
                label="FILE REFERENCE NUMBER (FRN)"
                value={newFileReferenceNumber}
                onChange={(e) => setNewFileReferenceNumber(e.target.value.toUpperCase())}
                placeholder="Auto-generated if empty"
              />
              <LegacySelect
                label="CATEGORY *"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                options={['', ...categories]}
              />
              <LegacyInput
                label="FOUND BY *"
                value={newFoundBy}
                onChange={(e) => setNewFoundBy(e.target.value)}
                placeholder="Staff name/ID"
              />
              <LegacyInput
                label="FLIGHT NUMBER"
                value={newFlightNumber}
                onChange={(e) => setNewFlightNumber(e.target.value.toUpperCase())}
                placeholder="BA117"
              />
            </div>
            
            <LegacyTextarea
              label="DESCRIPTION *"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Detailed description..."
              rows={3}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <LegacyInput
                label="LOCATION FOUND *"
                value={newLocationFound}
                onChange={(e) => setNewLocationFound(e.target.value)}
                placeholder="Gate A12, Terminal 1, etc."
              />
              <LegacyInput
                label="STORAGE LOCATION"
                value={newStorageLocation}
                onChange={(e) => setNewStorageLocation(e.target.value)}
                placeholder="Room 101, Shelf A, etc."
              />
            </div>
            
            <LegacyTextarea
              label="NOTES"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
            
            <div className="flex gap-2">
              <LegacyButton primary onClick={handleAddItem}>
                ADD ITEM
              </LegacyButton>
              <LegacyButton onClick={() => {
                setNewCategory('');
                setNewDescription('');
                setNewLocationFound('');
                setNewFoundBy('');
                setNewFlightNumber('');
                setNewStorageLocation('');
                setNewNotes('');
                setNewFileReferenceNumber('');
              }}>
                CLEAR
              </LegacyButton>
            </div>
          </div>
        )}
        
        {activeTab === 'FILES' && (
          <div className="bg-[#FDFBF7] border-2 border-[#A0A0A0] p-4 space-y-4">
            <div className="text-xs font-bold text-blue-800 mb-2">FILE REFERENCE NUMBERS</div>
            
            <div className="border-2 border-[#A0A0A0] bg-white">
              <div className="bg-[#D4D0C8] border-b border-[#A0A0A0] px-2 py-1 text-xs font-bold grid grid-cols-4 gap-2">
                <div>FRN</div>
                <div>ITEMS</div>
                <div>STATUS</div>
                <div>ACTIONS</div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {Object.entries(itemsByFile).map(([frn, items]) => (
                  <div key={frn} className="border-b border-[#A0A0A0] px-2 py-1 text-xs grid grid-cols-4 gap-2 items-center">
                    <div className="font-mono font-bold">{frn}</div>
                    <div>{items.length}</div>
                    <div>
                      {items.every(i => i.status === 'CLOSED') ? (
                        <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">CLOSED</span>
                      ) : items.some(i => i.status === 'CLAIMED') ? (
                        <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">CLAIMED</span>
                      ) : (
                        <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">OPEN</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <LegacyButton small onClick={() => setSelectedFile(frn)}>
                        VIEW
                      </LegacyButton>
                      {!items.every(i => i.status === 'CLOSED') && (
                        <LegacyButton small primary onClick={() => {
                          if (confirm(`Close file ${frn}?`)) {
                            closeLostItemFile(frn);
                          }
                        }}>
                          CLOSE
                        </LegacyButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'REPORT_FIND' && (
          <div className="bg-[#FDFBF7] border-2 border-[#A0A0A0] p-4 space-y-4">
            <div className="text-xs font-bold text-blue-800 mb-2">REPORT FOUND ITEM</div>
            
            <div className="grid grid-cols-4 gap-4">
              <LegacyInput 
                label="FILE REFERENCE NUMBER (FRN)"
                value={newFileReferenceNumber}
                onChange={(e) => setNewFileReferenceNumber(e.target.value.toUpperCase())}
                placeholder="Auto-generated if empty"
              />
              <LegacySelect
                label="CATEGORY *"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                options={['', ...categories]}
              />
              <LegacyInput
                label="FOUND BY *"
                value={newFoundBy}
                onChange={(e) => setNewFoundBy(e.target.value)}
                placeholder="Staff name/ID"
              />
              <LegacyInput
                label="FLIGHT NUMBER"
                value={newFlightNumber}
                onChange={(e) => setNewFlightNumber(e.target.value.toUpperCase())}
                placeholder="BA117"
              />
            </div>
            
            <LegacyTextarea
              label="DESCRIPTION *"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Detailed description..."
              rows={3}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <LegacyInput
                label="LOCATION FOUND *"
                value={newLocationFound}
                onChange={(e) => setNewLocationFound(e.target.value)}
                placeholder="Gate A12, Terminal 1, etc."
              />
              <LegacyInput
                label="STORAGE LOCATION"
                value={newStorageLocation}
                onChange={(e) => setNewStorageLocation(e.target.value)}
                placeholder="Room 101, Shelf A, etc."
              />
            </div>
            
            <LegacyTextarea
              label="NOTES"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
            
            <div className="flex gap-2">
              <LegacyButton primary onClick={handleAddItem}>
                REPORT FOUND ITEM
              </LegacyButton>
              <LegacyButton onClick={() => {
                setNewCategory('');
                setNewDescription('');
                setNewLocationFound('');
                setNewFoundBy('');
                setNewFlightNumber('');
                setNewStorageLocation('');
                setNewNotes('');
                setNewFileReferenceNumber('');
              }}>
                CLEAR
              </LegacyButton>
            </div>
          </div>
        )}
        
        {activeTab === 'REPORT_LOST' && (
          <div className="bg-[#FDFBF7] border-2 border-[#A0A0A0] p-4 space-y-4">
            <div className="text-xs font-bold text-blue-800 mb-2">REPORT LOST ITEM</div>
            
            {/* PNR Search Section */}
            <div className="bg-blue-50 border-2 border-blue-300 p-4">
              <div className="text-xs font-bold text-blue-800 mb-2">SEARCH BY RESERVATION NUMBER (PNR)</div>
              <div className="grid grid-cols-4 gap-4">
                <LegacyInput
                  label="RESERVATION NUMBER (PNR) *"
                  value={searchPnr}
                  onChange={(e) => setSearchPnr(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                />
                <div className="flex items-end">
                  <LegacyButton primary onClick={handleSearchPnr}>
                    <Search className="w-3 h-3 inline mr-1" />
                    SEARCH
                  </LegacyButton>
                </div>
                <div className="col-span-2"></div>
              </div>
            </div>
            
            {/* Passenger Info */}
            {foundPassenger && (
              <div className="bg-green-50 border-2 border-green-300 p-4">
                <div className="text-xs font-bold text-green-800 mb-2">✓ PASSENGER FOUND</div>
                <div className="grid grid-cols-4 gap-4 text-xs text-black">
                  <div className="text-black">
                    <span className="font-bold text-black">Name:</span> <span className="text-black">{foundPassenger.lastName}, {foundPassenger.firstName}</span>
                  </div>
                  <div className="text-black">
                    <span className="font-bold text-black">PNR:</span> <span className="text-black">{foundPassenger.pnr}</span>
                  </div>
                  <div className="text-black">
                    <span className="font-bold text-black">Status:</span> <span className="text-black">{foundPassenger.status}</span>
                  </div>
                  <div className="text-black">
                    <span className="font-bold text-black">Seat:</span> <span className="text-black">{foundPassenger.seat || 'N/A'}</span>
                  </div>
                </div>
                {flights.find(f => f.id === foundPassenger.flightId) && (
                  <div className="mt-2 text-xs text-black">
                    <span className="font-bold text-black">Flight:</span> <span className="text-black">{flights.find(f => f.id === foundPassenger.flightId)?.flightNumber} 
                    {' '}{flights.find(f => f.id === foundPassenger.flightId)?.origin} → {flights.find(f => f.id === foundPassenger.flightId)?.destination}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Baggage Selection */}
            {foundPassenger && foundPassenger.bagCount > 0 && (
              <div className="bg-white border-2 border-[#A0A0A0] p-4">
                <div className="text-xs font-bold text-blue-800 mb-2">SELECT BAGGAGE</div>
                <div className="mb-3">
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 text-xs text-black">
                      <input
                        type="radio"
                        name="bagStatus"
                        value="LOST"
                        checked={bagStatus === 'LOST'}
                        onChange={(e) => setBagStatus(e.target.value as 'LOST' | 'DAMAGED')}
                        className="w-3 h-3"
                      />
                      <span className="text-black">Lost</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-black">
                      <input
                        type="radio"
                        name="bagStatus"
                        value="DAMAGED"
                        checked={bagStatus === 'DAMAGED'}
                        onChange={(e) => setBagStatus(e.target.value as 'LOST' | 'DAMAGED')}
                        className="w-3 h-3"
                      />
                      <span className="text-black">Damaged</span>
                    </label>
                  </div>
                </div>
                <div className="border-2 border-[#A0A0A0] bg-white">
                  <div className="bg-[#D4D0C8] border-b border-[#A0A0A0] px-2 py-1 text-xs font-bold grid grid-cols-4 gap-2 text-black">
                    <div className="text-black">SELECT</div>
                    <div className="text-black">BAG #</div>
                    <div className="text-black">STATUS</div>
                    <div className="text-black">WEIGHT</div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {Array.from({ length: foundPassenger.bagCount }, (_, index) => {
                      const bagNumber = `BK${String(index + 1).padStart(2, '0')}XXX`;
                      const isSelected = selectedBags.includes(index);
                      return (
                        <div 
                          key={index}
                          className={clsx(
                            "border-b border-[#A0A0A0] px-2 py-2 text-xs grid grid-cols-4 gap-2 items-center cursor-pointer hover:bg-blue-50 text-black",
                            isSelected && "bg-blue-100"
                          )}
                          onClick={() => handleToggleBag(index)}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleBag(index)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4"
                            />
                          </div>
                          <div className="font-mono font-bold text-black">{bagNumber}</div>
                          <div>
                            <span className={clsx(
                              "px-1 py-0.5 rounded text-[10px] font-bold",
                              foundPassenger.bagStatus === 'LOADED' ? 'bg-green-100 text-green-700' :
                              foundPassenger.bagStatus === 'UNLOADED' ? 'bg-blue-100 text-blue-700' :
                              foundPassenger.bagStatus === 'LOST' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            )}>
                              {foundPassenger.bagStatus || 'CHECKED'}
                            </span>
                          </div>
                          <div className="text-black">N/A kg</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-2 text-xs text-black font-semibold">
                  Selected: {selectedBags.length} bag(s)
                </div>
              </div>
            )}
            
            {/* Baggage Identification */}
            {foundPassenger && selectedBags.length > 0 && (
              <div className="bg-white border-2 border-[#A0A0A0] p-4">
                <div className="text-xs font-bold text-blue-800 mb-3">BAGGAGE IDENTIFICATION</div>
                
                {/* Bag Type Selection */}
                <div className="mb-4">
                  <div className="text-xs font-bold text-black mb-2">BAG TYPE (Closes without zippers)</div>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {bagTypesNoZipper.map(type => (
                      <SelectionSquare
                        key={type.code}
                        code={type.code}
                        label={type.label}
                        selected={selectedBagType === type.code}
                        onClick={() => setSelectedBagType(type.code)}
                      />
                    ))}
                  </div>
                  
                  <div className="text-xs font-bold text-black mb-2">BAG TYPE (Closes with zippers)</div>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {bagTypesZipper.map(type => (
                      <SelectionSquare
                        key={type.code}
                        code={type.code}
                        label={type.label}
                        selected={selectedBagType === type.code}
                        onClick={() => setSelectedBagType(type.code)}
                      />
                    ))}
                  </div>
                  
                  <div className="text-xs font-bold text-black mb-2">MISCELLANEOUS ARTICLES</div>
                  <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                    {miscellaneousTypes.map(type => (
                      <SelectionSquare
                        key={type.code}
                        code={type.code}
                        label={type.label}
                        selected={selectedBagType === type.code}
                        onClick={() => setSelectedBagType(type.code)}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Color Selection */}
                <div className="mb-4">
                  <div className="text-xs font-bold text-black mb-2">COLOR</div>
                  <div className="grid grid-cols-6 gap-2">
                    {colors.map(color => (
                      <SelectionSquare
                        key={color.code}
                        code={color.code}
                        label={color.label}
                        selected={selectedColor === color.code}
                        onClick={() => setSelectedColor(color.code)}
                        colorClass={color.class}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Material Selection */}
                <div className="mb-4">
                  <div className="text-xs font-bold text-black mb-2">MATERIAL</div>
                  <div className="grid grid-cols-5 gap-2">
                    {materials.map(material => (
                      <SelectionSquare
                        key={material.code}
                        code={material.code}
                        label={material.label}
                        selected={selectedMaterial === material.code}
                        onClick={() => setSelectedMaterial(material.code)}
                      />
                    ))}
                  </div>
                </div>
                
                {/* External Elements Selection */}
                <div className="mb-4">
                  <div className="text-xs font-bold text-black mb-2">EXTERNAL ELEMENTS</div>
                  <div className="grid grid-cols-5 gap-2">
                    {externalElements.map(element => (
                      <SelectionSquare
                        key={element.code}
                        code={element.code}
                        label={element.label}
                        selected={selectedExternal === element.code}
                        onClick={() => setSelectedExternal(element.code)}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Selected Summary */}
                {(selectedBagType || selectedColor || selectedMaterial || selectedExternal) && (
                  <div className="bg-blue-50 border border-blue-300 p-2 text-xs">
                    <div className="font-bold text-blue-800 mb-1">SELECTED:</div>
                    <div className="text-black">
                      {selectedBagType && <span>Type: {selectedBagType} </span>}
                      {selectedColor && <span>Color: {selectedColor} </span>}
                      {selectedMaterial && <span>Material: {selectedMaterial} </span>}
                      {selectedExternal && <span>External: {selectedExternal}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Contact Information */}
            {foundPassenger && (
              <div className="bg-white border-2 border-[#A0A0A0] p-4">
                <div className="text-xs font-bold text-blue-800 mb-2">CONTACT INFORMATION</div>
                <div className="grid grid-cols-2 gap-4">
                  <LegacyInput
                    label="PHONE NUMBER *"
                    value={claimPhone}
                    onChange={(e) => setClaimPhone(e.target.value)}
                    placeholder="7854091014"
                  />
                  <LegacyInput
                    label="EMAIL ADDRESS *"
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    placeholder="email@example.com"
                    type="email"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <LegacyInput
                    label="ALTERNATIVE PHONE"
                    value={claimAltPhone}
                    onChange={(e) => setClaimAltPhone(e.target.value)}
                    placeholder="Alternative contact"
                  />
                </div>
                
                <div className="mt-4">
                  <div className="text-xs font-bold text-blue-800 mb-2">ADDRESS (OPTIONAL)</div>
                  <div className="grid grid-cols-2 gap-4">
                    <LegacyInput
                      label="LINE 1"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                    />
                    <LegacyInput
                      label="LINE 2"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                    />
                    <LegacyInput
                      label="TOWN OR CITY"
                      value={addressTown}
                      onChange={(e) => setAddressTown(e.target.value)}
                    />
                    <LegacyInput
                      label="COUNTY OR STATE"
                      value={addressCounty}
                      onChange={(e) => setAddressCounty(e.target.value)}
                    />
                    <LegacyInput
                      label="POSTCODE"
                      value={addressPostcode}
                      onChange={(e) => setAddressPostcode(e.target.value.toUpperCase())}
                    />
                    <LegacyInput
                      label="COUNTRY"
                      value={addressCountry}
                      onChange={(e) => setAddressCountry(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Submit Button */}
            {foundPassenger && (
              <div className="flex gap-2">
                <LegacyButton primary onClick={handleSubmitLostBaggage} disabled={selectedBags.length === 0}>
                  SUBMIT REPORT
                </LegacyButton>
                <LegacyButton onClick={() => {
                  setSearchPnr('');
                  setFoundPassenger(null);
                  setSelectedBags([]);
                  setSelectedBagType('');
                  setSelectedColor('');
                  setSelectedMaterial('');
                  setSelectedExternal('');
                  setClaimName('');
                  setClaimPhone('');
                  setClaimEmail('');
                  setClaimAltPhone('');
                  setAddressLine1('');
                  setAddressLine2('');
                  setAddressTown('');
                  setAddressCounty('');
                  setAddressPostcode('');
                  setAddressCountry('UNITED KINGDOM');
                  setNewFlightNumber('');
                }}>
                  CLEAR
                </LegacyButton>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'BAGGAGE_TRACER' && (
          <div className="bg-[#FDFBF7] border-2 border-[#A0A0A0] p-4 space-y-4">
            <div className="text-xs font-bold text-blue-800 mb-2">BAGGAGE TRACER</div>
            
            <div className="grid grid-cols-3 gap-4">
              <LegacyInput
                label="BAGGAGE TAG NUMBER"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="BK01XXX, BK02XXX..."
              />
              <LegacyInput
                label="PNR / BOOKING REFERENCE"
                value={newFileReferenceNumber}
                onChange={(e) => setNewFileReferenceNumber(e.target.value.toUpperCase())}
                placeholder="ABC123"
              />
              <div className="flex items-end">
                <LegacyButton primary onClick={() => {
                  const baggageItems = lostItems.filter(item => 
                    item.category === 'Bags/Luggage' &&
                    (item.itemNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     item.fileReferenceNumber?.toLowerCase().includes(newFileReferenceNumber.toLowerCase()))
                  );
                  if (baggageItems.length === 0) {
                    alert('No baggage found with the provided information.');
                  } else {
                    setSelectedFile(baggageItems[0].fileReferenceNumber || null);
                    setActiveTab('SEARCH');
                  }
                }}>
                  <Search className="w-3 h-3 inline mr-1" />
                  TRACE
                </LegacyButton>
              </div>
            </div>
            
            <div className="bg-blue-50 border-2 border-blue-300 p-4">
              <div className="text-xs font-bold text-blue-800 mb-2">📦 BAGGAGE STATUS</div>
              <div className="text-xs text-gray-700 space-y-1">
                <p>• Enter baggage tag number (e.g., BK01XXX) or PNR to trace</p>
                <p>• System will search for matching baggage records</p>
                <p>• Results will show current status and location</p>
              </div>
            </div>
            
            {lostItems.filter(item => item.category === 'Bags/Luggage').length > 0 && (
              <div className="border-2 border-[#A0A0A0] bg-white">
                <div className="bg-[#D4D0C8] border-b border-[#A0A0A0] px-2 py-1 text-xs font-bold grid grid-cols-5 gap-2">
                  <div>TAG #</div>
                  <div>STATUS</div>
                  <div>LOCATION</div>
                  <div>FRN</div>
                  <div>ACTIONS</div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {lostItems
                    .filter(item => item.category === 'Bags/Luggage')
                    .slice(0, 10)
                    .map((item: LostItem) => (
                      <div key={item.id} className="border-b border-[#A0A0A0] px-2 py-1 text-xs grid grid-cols-5 gap-2 items-center">
                        <div className="font-mono font-bold">{item.itemNumber}</div>
                        <div>
                          <span className={clsx("px-1 py-0.5 rounded text-[10px] font-bold", getStatusColor(item.status))}>
                            {item.status}
                          </span>
                        </div>
                        <div>{item.storageLocation || item.locationFound || '-'}</div>
                        <div className="text-[10px]">{item.fileReferenceNumber || '-'}</div>
                        <div>
                          <LegacyButton small onClick={() => {
                            setSelectedItem(item);
                            setActiveTab('SEARCH');
                          }}>
                            VIEW
                          </LegacyButton>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* QR Code Modal */}
      {showQRModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#FDFBF7] border-4 border-[#A0A0A0] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-blue-800">ITEM QR CODE</div>
              <LegacyButton small onClick={() => {
                setShowQRModal(false);
                setSelectedItem(null);
              }}>
                <X className="w-3 h-3" />
              </LegacyButton>
            </div>
            <div className="mb-4 p-3 bg-white border border-[#A0A0A0]">
              <div className="font-mono text-xs text-blue-600 mb-1">{selectedItem.itemNumber}</div>
              <div className="font-bold text-xs">{selectedItem.description}</div>
            </div>
            <div className="flex justify-center bg-white p-4 border border-[#A0A0A0] mb-4">
              <QRCode
                value={JSON.stringify({
                  itemNumber: selectedItem.itemNumber,
                  id: selectedItem.id,
                  category: selectedItem.category,
                  description: selectedItem.description,
                  status: selectedItem.status,
                  fileReferenceNumber: selectedItem.fileReferenceNumber
                })}
                size={200}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                viewBox="0 0 200 200"
              />
            </div>
            <div className="text-center">
              <LegacyButton primary onClick={() => {
                setShowQRModal(false);
                setSelectedItem(null);
              }}>
                CLOSE
              </LegacyButton>
            </div>
          </div>
        </div>
      )}
      
      {/* Claim Item / Edit Address Modal */}
      {showAddressModal && selectedItem && (selectedItem.status === 'FOUND' || selectedItem.status === 'LOST') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#FDFBF7] border-4 border-[#A0A0A0] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-blue-800">EDIT ADDRESS</div>
              <LegacyButton small onClick={() => {
                setShowAddressModal(false);
                setSelectedItem(null);
              }}>
                <X className="w-3 h-3" />
              </LegacyButton>
            </div>
            <div className="mb-4 p-3 bg-white border border-[#A0A0A0]">
              <div className="font-mono text-xs text-blue-600 mb-1">{selectedItem.itemNumber}</div>
              <div className="font-bold text-xs">{selectedItem.description}</div>
              <div className="text-[10px] text-gray-600">{selectedItem.category}</div>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <LegacyInput
                  label="CLAIMANT NAME *"
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  placeholder="Full name"
                />
                <LegacyInput
                  label="COUNTRY *"
                  value={addressCountry}
                  onChange={(e) => setAddressCountry(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <LegacyInput
                  label="PHONE NUMBER *"
                  value={claimPhone}
                  onChange={(e) => setClaimPhone(e.target.value)}
                  placeholder="7854091014"
                />
                <div className="flex items-end">
                  <LegacyButton onClick={handleValidatePhone}>
                    <Check className="w-3 h-3 inline mr-1" />
                    VALIDATE
                  </LegacyButton>
                </div>
                {selectedItem.phoneNumberValidated && (
                  <div className="flex items-end text-xs text-green-600">
                    <Check className="w-4 h-4 mr-1" />
                    Validated
                  </div>
                )}
              </div>
              
              <LegacyInput
                label="ALTERNATIVE PHONE NUMBER"
                value={claimAltPhone}
                onChange={(e) => setClaimAltPhone(e.target.value)}
                placeholder="Alternative contact"
              />
              
              <div className="relative">
                <LegacyInput
                  label="SEARCH"
                  value={addressSearchTerm}
                  onChange={(e) => {
                    setAddressSearchTerm(e.target.value);
                    setShowAddressSuggestions(e.target.value.length >= 3);
                  }}
                  onFocus={() => setShowAddressSuggestions(addressSearchTerm.length >= 3)}
                  placeholder="Search for address..."
                />
                {showAddressSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-[#A0A0A0] max-h-60 overflow-y-auto">
                    {addressSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setAddressSearchTerm(suggestion);
                          setShowAddressSuggestions(false);
                          const parts = suggestion.split(',');
                          if (parts.length >= 2) {
                            setAddressLine1(parts[0].trim());
                            setAddressTown(parts[parts.length - 1].trim());
                          }
                        }}
                        className="w-full text-left px-2 py-1 text-xs hover:bg-blue-50 border-b border-[#A0A0A0] last:border-b-0"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <LegacyInput
                label="LINE 1 *"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
              />
              <LegacyInput
                label="LINE 2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <LegacyInput
                  label="TOWN OR CITY"
                  value={addressTown}
                  onChange={(e) => setAddressTown(e.target.value)}
                />
                <LegacyInput
                  label="COUNTY OR STATE"
                  value={addressCounty}
                  onChange={(e) => setAddressCounty(e.target.value)}
                />
              </div>
              
              <LegacyInput
                label="POSTCODE"
                value={addressPostcode}
                onChange={(e) => setAddressPostcode(e.target.value.toUpperCase())}
              />
              
              <div className="flex gap-2 pt-4">
                <LegacyButton primary onClick={handleClaimItem}>
                  ACCEPT
                </LegacyButton>
                <LegacyButton onClick={() => {
                  setShowAddressModal(false);
                  setSelectedItem(null);
                }}>
                  CANCEL
                </LegacyButton>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Item Details Modal */}
      {showItemDetailsModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#FDFBF7] border-4 border-[#A0A0A0] p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-blue-800">ITEM DETAILS & TRACKING</div>
              <LegacyButton small onClick={() => {
                setShowItemDetailsModal(false);
                setSelectedItem(null);
              }}>
                <X className="w-3 h-3" />
              </LegacyButton>
            </div>
            
            {/* Item Information */}
            <div className="bg-white border-2 border-[#A0A0A0] p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[10px] text-blue-800 font-bold mb-1">ITEM NUMBER</div>
                  <div className="font-mono font-bold text-black">{selectedItem.itemNumber}</div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-800 font-bold mb-1">FILE REFERENCE NUMBER (FRN)</div>
                  <div className="font-mono font-bold text-black">{selectedItem.fileReferenceNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-800 font-bold mb-1">CATEGORY</div>
                  <div className="text-black">{selectedItem.category}</div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-800 font-bold mb-1">STATUS</div>
                  <span className={clsx("px-2 py-1 rounded text-xs font-bold", getStatusColor(selectedItem.status))}>
                    {selectedItem.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-blue-800 font-bold mb-1">DESCRIPTION</div>
                  <div className="text-black">{selectedItem.description}</div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-800 font-bold mb-1">LOCATION FOUND</div>
                  <div className="text-black">{selectedItem.locationFound}</div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-800 font-bold mb-1">STORAGE LOCATION</div>
                  <div className="text-black">{selectedItem.storageLocation || 'N/A'}</div>
                </div>
                {selectedItem.flightNumber && (
                  <div>
                    <div className="text-[10px] text-blue-800 font-bold mb-1">FLIGHT NUMBER</div>
                    <div className="text-black">{selectedItem.flightNumber}</div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-blue-800 font-bold mb-1">FOUND DATE</div>
                  <div className="text-black">{formatDate(selectedItem.foundDate)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-blue-800 font-bold mb-1">FOUND BY</div>
                  <div className="text-black">{selectedItem.foundBy}</div>
                </div>
                {selectedItem.phoneNumber && (
                  <div>
                    <div className="text-[10px] text-blue-800 font-bold mb-1">PHONE NUMBER</div>
                    <div className="text-black flex items-center gap-2">
                      {selectedItem.phoneNumber}
                      {selectedItem.phoneNumberValidated && <Check className="w-3 h-3 text-green-600" />}
                    </div>
                  </div>
                )}
                {selectedItem.claimedBy && (
                  <div>
                    <div className="text-[10px] text-blue-800 font-bold mb-1">CLAIMED BY</div>
                    <div className="text-black">{selectedItem.claimedBy}</div>
                    {selectedItem.claimedDate && (
                      <div className="text-[10px] text-gray-600">on {formatDate(selectedItem.claimedDate)}</div>
                    )}
                  </div>
                )}
                {(selectedItem.addressLine1 || selectedItem.townCity) && (
                  <div className="col-span-2">
                    <div className="text-[10px] text-blue-800 font-bold mb-1">ADDRESS</div>
                    <div className="text-black">
                      {[selectedItem.addressLine1, selectedItem.addressLine2, selectedItem.townCity, selectedItem.countyState, selectedItem.postcode, selectedItem.country].filter(Boolean).join(', ')}
                    </div>
                  </div>
                )}
                {selectedItem.notes && (
                  <div className="col-span-2">
                    <div className="text-[10px] text-blue-800 font-bold mb-1">NOTES</div>
                    <div className="text-black text-xs">{selectedItem.notes}</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Status Update Section */}
            <div className="bg-white border-2 border-[#A0A0A0] p-4 mb-4">
              <div className="text-xs font-bold text-blue-800 mb-3">UPDATE STATUS</div>
              <div className="grid grid-cols-4 gap-4">
                <LegacySelect
                  label="NEW STATUS"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as LostItem['status'])}
                  options={['FOUND', 'LOST', 'CLAIMED', 'SUSPENDED', 'CLOSED', 'ARCHIVED']}
                />
                <div className="flex items-end">
                  <LegacyButton primary onClick={handleUpdateStatus}>
                    UPDATE STATUS
                  </LegacyButton>
                </div>
              </div>
            </div>
            
            {/* Email Management Section */}
            <div className="bg-white border-2 border-[#A0A0A0] p-4 mb-4">
              <div className="text-xs font-bold text-blue-800 mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                EMAIL MANAGEMENT
              </div>
              <div className="grid grid-cols-2 gap-2">
                <LegacyButton onClick={() => handleSendStatusEmail('FOUND')}>
                  <Mail className="w-3 h-3 inline mr-1" />
                  We Found the Bag (Contact Us)
                </LegacyButton>
                <LegacyButton onClick={() => handleSendStatusEmail('DELIVERY_PLANNED')}>
                  <Mail className="w-3 h-3 inline mr-1" />
                  Delivery is Planned
                </LegacyButton>
                <LegacyButton onClick={() => handleSendStatusEmail('DELIVERING')}>
                  <Mail className="w-3 h-3 inline mr-1" />
                  Bag is Delivering
                </LegacyButton>
                <LegacyButton onClick={() => handleSendStatusEmail('DELIVERED')}>
                  <Mail className="w-3 h-3 inline mr-1" />
                  Bag Delivered
                </LegacyButton>
                <LegacyButton onClick={() => handleSendStatusEmail('NOT_FOUND')}>
                  <Mail className="w-3 h-3 inline mr-1" />
                  Can't Find Yet
                </LegacyButton>
                <LegacyButton onClick={() => handleSendStatusEmail('READY_PICKUP')}>
                  <Mail className="w-3 h-3 inline mr-1" />
                  Bag is Ready for Pickup
                </LegacyButton>
              </div>
            </div>
            
            {/* Tracking History */}
            <div className="bg-white border-2 border-[#A0A0A0] p-4">
              <div className="text-xs font-bold text-blue-800 mb-3">TRACKING HISTORY</div>
              <div className="border-2 border-[#A0A0A0] bg-white max-h-64 overflow-y-auto">
                <div className="bg-[#D4D0C8] border-b border-[#A0A0A0] px-2 py-1 text-xs font-bold grid grid-cols-4 gap-2 text-black">
                  <div>DATE/TIME</div>
                  <div>ACTION</div>
                  <div>STATUS</div>
                  <div>BY</div>
                </div>
                {getItemTrackingHistory(selectedItem).length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-xs">No tracking history available</div>
                ) : (
                  getItemTrackingHistory(selectedItem).map((entry, index) => (
                    <div key={index} className="border-b border-[#A0A0A0] px-2 py-2 text-xs grid grid-cols-4 gap-2 items-center text-black">
                      <div className="text-[10px]">{formatDate(entry.date)}</div>
                      <div className="font-semibold">{entry.action}</div>
                      <div>
                        {entry.status && (
                          <span className={clsx("px-1 py-0.5 rounded text-[10px] font-bold", getStatusColor(entry.status as LostItem['status']))}>
                            {entry.status}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px]">{entry.by}</div>
                      {entry.details && (
                        <div className="col-span-4 text-[10px] text-gray-600 mt-1 italic">{entry.details}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <LegacyButton primary onClick={() => {
                setShowItemDetailsModal(false);
                setSelectedItem(null);
              }}>
                CLOSE
              </LegacyButton>
            </div>
          </div>
        </div>
      )}
      
      {/* Delivery Date Modal */}
      {showDeliveryDateModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#FDFBF7] border-4 border-[#A0A0A0] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-blue-800">SELECT DELIVERY DATE</div>
              <LegacyButton small onClick={() => {
                setShowDeliveryDateModal(false);
                setDeliveryDate('');
              }}>
                <X className="w-3 h-3" />
              </LegacyButton>
            </div>
            
            <div className="mb-4 p-3 bg-white border border-[#A0A0A0]">
              <div className="font-mono text-xs text-blue-600 mb-1">{selectedItem.itemNumber}</div>
              <div className="font-bold text-xs">{selectedItem.description}</div>
            </div>
            
            <div className="space-y-4">
              <LegacyInput
                label="DELIVERY DATE *"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              
              <div className="flex gap-2 pt-4">
                <LegacyButton primary onClick={handleConfirmDeliveryDate}>
                  SEND EMAIL
                </LegacyButton>
                <LegacyButton onClick={() => {
                  setShowDeliveryDateModal(false);
                  setDeliveryDate('');
                }}>
                  CANCEL
                </LegacyButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
