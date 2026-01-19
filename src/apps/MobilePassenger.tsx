import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Home,
  Menu,
  Plane,
  UserCircle,
  Armchair,
  Plus,
  X,
  Luggage
} from 'lucide-react';
import QRCode from 'react-qr-code';
import clsx from 'clsx';
import { useAirportStore } from '../store/airportStore';
import { initializeAirportDatabase } from '../store/airportStore';
import { loginUser, registerUser, getUserByEmail, updateUserProfile, type User } from '../services/database';

type Screen =
  | 'login'
  | 'explore'
  | 'book'
  | 'trips'
  | 'tripDetail'
  | 'boardingPass'
  | 'account'
  | 'more'
  | 'add'
  | 'seat'
  | 'checkin'
  | 'payment'
  | 'notifications';

const TRIPS_KEY = 'mobile-trips-v1';
const SELECTED_KEY = 'mobile-selected-pnr-v1';
const NOTIFY_KEY = 'mobile-notifications-v2'; // Updated to v2 for PNR-based structure
const NOTIFY_ENABLED_KEY = 'mobile-notifications-enabled-v1';
const PROFILE_KEY = 'mobile-profile-v1';
const RECENT_SEARCH_KEY = 'mobile-recent-search-v1';
const AUTH_KEY = 'mobile-auth-v1';

const generatePnr = () => Math.random().toString(36).substring(2, 8).toUpperCase();


export const MobilePassengerApp = () => {
  const flights = useAirportStore((state) => state.flights);
  const passengers = useAirportStore((state) => state.passengers);
  const updatePassengerDetails = useAirportStore((state) => state.updatePassengerDetails);
  const checkInPassenger = useAirportStore((state) => state.checkInPassenger);
  const createBooking = useAirportStore((state) => state.createBooking);
  const addLog = useAirportStore((state) => state.addLog);
  const addEmailContact = useAirportStore((state) => state.addEmailContact);
  const loadFromDatabase = useAirportStore((state) => state.loadFromDatabase);
  const isDatabaseReady = useAirportStore((state) => state.isDatabaseReady);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginUserType, setLoginUserType] = useState<'passenger' | 'employee'>('passenger');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [screen, setScreen] = useState<Screen>('login');
  const [trips, setTrips] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(TRIPS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedPnr, setSelectedPnr] = useState<string>(() => {
    try {
      return localStorage.getItem(SELECTED_KEY) || '';
    } catch {
      return '';
    }
  });
  const [selectedPassengerForBoardingPass, setSelectedPassengerForBoardingPass] = useState<string | null>(null); // Passenger ID for boarding pass
  const [notifications, setNotifications] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFY_KEY);
      const notificationsByPnr: Record<string, string[]> = saved ? JSON.parse(saved) : {};
      // Load notifications for selected PNR, or empty array if no PNR selected
      const selectedPnrFromStorage = localStorage.getItem(SELECTED_KEY) || '';
      const normalizedPnr = selectedPnrFromStorage.toUpperCase().trim();
      const loadedNotifications = notificationsByPnr[normalizedPnr];
      // Ensure it's an array
      return Array.isArray(loadedNotifications) ? loadedNotifications : [];
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return [];
    }
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(NOTIFY_ENABLED_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [profile, setProfile] = useState<{ name: string; email: string; skymiles: string }>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      return saved ? JSON.parse(saved) : { name: '', email: '', skymiles: '' };
    } catch {
      return { name: '', email: '', skymiles: '' };
    }
  });
  const [recentSearches, setRecentSearches] = useState<
    Array<{ origin: string; destination: string; depart: string; returnDate?: string; type: string }>
  >(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCH_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const lastFlightRef = useRef<{ status?: string; gate?: string } | null>(null);

  const [lookupPnr, setLookupPnr] = useState('');
  const [lookupLastName, setLookupLastName] = useState('');
  const [bookingPassengers, setBookingPassengers] = useState<Array<{ firstName: string; lastName: string }>>([
    { firstName: '', lastName: '' }
  ]);
  const [bookingFlightId, setBookingFlightId] = useState('');
  const [bookingConnectionFlightId, setBookingConnectionFlightId] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [tripType, setTripType] = useState<'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_CITY'>('ONE_WAY');
  const [showResults, setShowResults] = useState(false);
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [fareClass, setFareClass] = useState<'BASIC' | 'MAIN' | 'COMFORT' | 'BUSINESS'>('MAIN');
  const [airportPicker, setAirportPicker] = useState<{
    open: boolean;
    type: 'origin' | 'destination' | null;
  }>({ open: false, type: null });
  const [syncState, setSyncState] = useState<'IDLE' | 'SYNCING' | 'ERROR'>('IDLE');
  const [lastSync, setLastSync] = useState<string>('');
  const [seatSelection, setSeatSelection] = useState('');
  const [bagCount, setBagCount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CARD');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [cityImages, setCityImages] = useState<Record<string, string>>({});
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Map of airport codes to city names
  const cityNameMap: Record<string, string> = {
    'RIX': 'Riga',
    'BCN': 'Barcelona',
    'JFK': 'New York',
    'LHR': 'London',
    'CDG': 'Paris',
    'FRA': 'Frankfurt',
    'AMS': 'Amsterdam',
    'MAD': 'Madrid',
    'FCO': 'Rome',
    'ATH': 'Athens',
    'IST': 'Istanbul',
    'DXB': 'Dubai',
    'BKK': 'Bangkok',
    'SIN': 'Singapore',
    'NRT': 'Tokyo',
    'LAX': 'Los Angeles',
    'SFO': 'San Francisco',
    'MIA': 'Miami',
    'ORD': 'Chicago',
    'DFW': 'Dallas',
    'SEA': 'Seattle',
    'BOS': 'Boston',
    'DOH': 'Doha',
    'DUB': 'Dublin',
    'CPH': 'Copenhagen',
    'OSL': 'Oslo',
    'STO': 'Stockholm',
    'HEL': 'Helsinki',
    'ARN': 'Stockholm',
    'VIE': 'Vienna',
    'PRG': 'Prague',
    'BUD': 'Budapest',
    'WAW': 'Warsaw',
    'KRK': 'Krakow',
    'SOF': 'Sofia',
    'OTP': 'Bucharest',
    'BUH': 'Bucharest',
    'BGY': 'Bergamo',
    'LTN': 'London',
    'CRL': 'Brussels',
    'BVA': 'Paris',
    'FNC': 'Madeira',
    'LGW': 'London',
    'LIS': 'Lisbon',
    'BER': 'Berlin',
    'MUC': 'Munich',
    'GOT': 'Gothenburg',
    'HAM': 'Hamburg',
    'DUS': 'Dusseldorf',
    'EWR': 'New York',
    'IAH': 'Houston',
    'IAD': 'Washington',
    'ATL': 'Atlanta',
    'DTW': 'Detroit'
  };

  // Function to get city display name with airport code
  const getCityDisplayName = (cityCode: string, cityName?: string): string => {
    if (!cityCode) return '';
    const mappedName = cityName || cityNameMap[cityCode];
    if (mappedName) {
      return `${mappedName} (${cityCode})`;
    }
    return cityCode;
  };

  // Pre-defined gradient colors for popular cities (beautiful, free, always works)
  const cityGradients: Record<string, string> = {
    'RIX': 'from-blue-600 via-blue-500 to-cyan-500', // Riga - blue
    'BCN': 'from-orange-500 via-red-500 to-pink-500', // Barcelona - warm
    'JFK': 'from-purple-600 via-blue-600 to-indigo-600', // New York - vibrant
    'LHR': 'from-gray-700 via-gray-600 to-gray-500', // London - classic
    'CDG': 'from-blue-500 via-indigo-500 to-purple-500', // Paris - elegant
    'FRA': 'from-green-600 via-emerald-500 to-teal-500', // Frankfurt - green
    'AMS': 'from-orange-400 via-amber-500 to-yellow-500', // Amsterdam - golden
    'MAD': 'from-red-600 via-rose-500 to-pink-500', // Madrid - red
    'FCO': 'from-amber-600 via-orange-500 to-red-500', // Rome - warm
    'ATH': 'from-blue-500 via-cyan-400 to-teal-400', // Athens - blue
    'IST': 'from-red-700 via-orange-600 to-amber-600', // Istanbul - warm
    'DXB': 'from-yellow-500 via-orange-500 to-red-500', // Dubai - desert
    'BKK': 'from-pink-500 via-purple-500 to-indigo-500', // Bangkok - vibrant
    'SIN': 'from-green-500 via-emerald-400 to-cyan-400', // Singapore - green
    'NRT': 'from-rose-500 via-pink-500 to-purple-500', // Tokyo - pink
    'LAX': 'from-blue-400 via-cyan-400 to-teal-400', // Los Angeles - ocean
    'SFO': 'from-indigo-500 via-purple-500 to-pink-500', // San Francisco - tech
    'MIA': 'from-cyan-500 via-blue-400 to-teal-400', // Miami - beach
    'ORD': 'from-blue-600 via-indigo-600 to-purple-600', // Chicago - lake
    'DFW': 'from-orange-500 via-red-500 to-pink-500', // Dallas - warm
    'SEA': 'from-green-500 via-emerald-400 to-teal-400', // Seattle - nature
    'BOS': 'from-blue-700 via-indigo-600 to-purple-600', // Boston - classic
    'DOH': 'from-amber-600 via-orange-500 to-yellow-500', // Doha - desert
    'DUB': 'from-green-600 via-emerald-500 to-teal-500', // Dublin - green
    'CPH': 'from-blue-500 via-cyan-400 to-teal-400', // Copenhagen - nordic
    'OSL': 'from-blue-600 via-indigo-500 to-purple-500', // Oslo - nordic
    'HEL': 'from-cyan-500 via-blue-400 to-indigo-400', // Helsinki - nordic
    'VIE': 'from-purple-600 via-indigo-500 to-blue-500', // Vienna - elegant
    'PRG': 'from-amber-600 via-orange-500 to-red-500', // Prague - warm
    'BUD': 'from-red-600 via-rose-500 to-pink-500', // Budapest - warm
  };

  // Function to get city gradient class
  const getCityGradient = (cityCode: string): string => {
    return cityGradients[cityCode] || 'from-slate-700 via-slate-600 to-slate-500';
  };

  // Function to get city image URL using multiple free services
  const getCityImageUrl = (cityCode: string, cityName?: string): string => {
    if (!cityCode || cityCode === 'travel') return '';
    
    // Cache the image URL
    if (cityImages[cityCode]) {
      return cityImages[cityCode];
    }

    // Use city name if available, otherwise use mapped name
    const searchTerm = cityName || cityNameMap[cityCode] || cityCode;
    
    // Try multiple free image services (fallback chain)
    // Option 1: Unsplash Source API (may be rate-limited)
    // Option 2: Use Picsum with city-specific seed (always works, but random images)
    // Option 3: Use placeholder with city name (always works, shows text)
    
    // For now, try Unsplash first, if it fails, gradient will show
    // Using simpler format that might work better
    const imageUrl = `https://source.unsplash.com/800x400/?${encodeURIComponent(searchTerm)}`;
    
    // Cache it
    setCityImages(prev => ({ ...prev, [cityCode]: imageUrl }));
    
    return imageUrl;
  };

  useEffect(() => {
    initializeAirportDatabase();
    
    // Check for saved user session
    const checkSavedUser = async () => {
      try {
        const saved = localStorage.getItem(AUTH_KEY);
        if (saved) {
          const auth = JSON.parse(saved);
          if (auth.userId && auth.email) {
            // Try to get user from database
            const user = await getUserByEmail(auth.email);
            if (user) {
              setCurrentUser(user);
              setIsLoggedIn(true);
              setScreen('explore');
              // Update profile from user data
              if (user.name || user.email || user.skymiles) {
                setProfile({
                  name: user.name || '',
                  email: user.email || '',
                  skymiles: user.skymiles || ''
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking saved user:', error);
      }
    };
    
    checkSavedUser();
    
    // Migrate old notifications format (v1) to new format (v2) if needed
    try {
      const oldKey = 'mobile-notifications-v1';
      const newKey = 'mobile-notifications-v2';
      const oldSaved = localStorage.getItem(oldKey);
      const newSaved = localStorage.getItem(newKey);
      
      if (oldSaved && !newSaved) {
        // Old format exists but new format doesn't - migrate
        const oldNotifications: string[] = JSON.parse(oldSaved);
        if (oldNotifications.length > 0) {
          const currentPnr = localStorage.getItem(SELECTED_KEY) || '';
          if (currentPnr) {
            // Migrate to new format with PNR structure
            const notificationsByPnr: Record<string, string[]> = {};
            notificationsByPnr[currentPnr] = oldNotifications;
            localStorage.setItem(newKey, JSON.stringify(notificationsByPnr));
          }
          // Remove old format after migration
          localStorage.removeItem(oldKey);
        }
      }
    } catch (error) {
      console.error('Error migrating notifications:', error);
    }
  }, []);

  useEffect(() => {
    if (isDatabaseReady) {
      setLastSync(new Date().toLocaleString());
    }
  }, [isDatabaseReady]);

  // Check notification permission status on load and sync with state
  useEffect(() => {
    if ('Notification' in window) {
      const permission = Notification.permission;
      if (permission === 'granted') {
        setNotificationsEnabled(true);
      } else {
        setNotificationsEnabled(false);
      }
    }
  }, []);

  // Request notification permission on first app load (optional - can be removed if too aggressive)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't auto-request, let user enable it manually
      // This is less intrusive
    }
  }, []);

  useEffect(() => {
    // Enable scrolling inside the mobile shell even though body is overflow-hidden
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem(SELECTED_KEY, selectedPnr);
    // Load notifications for the selected PNR
    if (selectedPnr) {
      try {
        const normalizedPnr = selectedPnr.toUpperCase().trim();
        const saved = localStorage.getItem(NOTIFY_KEY);
        const notificationsByPnr: Record<string, string[]> = saved ? JSON.parse(saved) : {};
        const loadedNotifications = notificationsByPnr[normalizedPnr];
        // Ensure it's an array
        setNotifications(Array.isArray(loadedNotifications) ? loadedNotifications : []);
      } catch (error) {
        console.error('Error loading notifications:', error);
        setNotifications([]);
      }
    } else {
      setNotifications([]);
    }
  }, [selectedPnr]);

  useEffect(() => {
    // Save notifications for the current selected PNR
    if (selectedPnr) {
      try {
        const normalizedPnr = selectedPnr.toUpperCase().trim();
        const saved = localStorage.getItem(NOTIFY_KEY);
        const notificationsByPnr: Record<string, string[]> = saved ? JSON.parse(saved) : {};
        // Ensure notifications is an array before saving
        notificationsByPnr[normalizedPnr] = Array.isArray(notifications) ? notifications : [];
        localStorage.setItem(NOTIFY_KEY, JSON.stringify(notificationsByPnr));
      } catch (error) {
        console.error('Error saving notifications:', error);
      }
    }
  }, [notifications, selectedPnr]);

  useEffect(() => {
    localStorage.setItem(NOTIFY_ENABLED_KEY, JSON.stringify(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Sync trips with user's passengers
  useEffect(() => {
    const userEmail = currentUser?.email || profile.email || '';
    if (!userEmail) {
      setTrips([]);
      return;
    }
    
    // Get unique PNRs from user's passengers
    const userPassengers = passengers.filter(p => p.userEmail === userEmail);
    const userPnrs = [...new Set(userPassengers.map(p => p.pnr))];
    
    // Update trips if they differ
    setTrips(prev => {
      const prevSet = new Set(prev);
      const newSet = new Set(userPnrs);
      
      // Check if they're different
      if (prev.length !== userPnrs.length || 
          !userPnrs.every(pnr => prevSet.has(pnr)) ||
          !prev.every(pnr => newSet.has(pnr))) {
        localStorage.setItem(TRIPS_KEY, JSON.stringify(userPnrs));
        return userPnrs;
      }
      return prev;
    });
  }, [passengers, currentUser?.email, profile.email]);

  const tripPassengers = useMemo(() => {
    const userEmail = currentUser?.email || profile.email || '';
    if (!userEmail) return [];
    
    // Filter passengers by user email
    const userPassengers = passengers.filter(p => p.userEmail === userEmail);
    
    // Get unique PNRs from user's passengers
    const userPnrs = [...new Set(userPassengers.map(p => p.pnr))];
    
    // Map to passenger objects
    return userPnrs.map((pnr) => userPassengers.find((p) => p.pnr === pnr)).filter(Boolean);
  }, [trips, passengers, currentUser?.email, profile.email]);

  const selectedPassenger = useMemo(
    () => passengers.find((p) => p.pnr === selectedPnr) || tripPassengers[0],
    [passengers, selectedPnr, tripPassengers]
  );

  // Calculate total miles earned by user
  const totalMiles = useMemo(() => {
    const userEmail = currentUser?.email || profile.email || '';
    if (!userEmail) return 0;
    
    const userPassengers = passengers.filter(p => p.userEmail === userEmail);
    return userPassengers.reduce((total, p) => total + (p.milesEarned || 0), 0);
  }, [passengers, currentUser?.email, profile.email]);

  const tripSegments = useMemo(() => {
    if (!selectedPassenger) return [];
    const segments = passengers
      .filter((p) => p.pnr === selectedPassenger.pnr)
      .map((p) => ({
        passenger: p,
        flight: flights.find((f) => f.id === p.flightId)
      }))
      .filter((seg) => seg.flight);

    return segments.sort((a, b) => {
      const dateA = a.flight?.date || '';
      const dateB = b.flight?.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.flight?.std || '').localeCompare(b.flight?.std || '');
    });
  }, [selectedPassenger, passengers, flights]);

  const selectedSegment =
    tripSegments.find((seg) => seg.flight?.id === selectedPassenger?.flightId) || tripSegments[0];
  const selectedFlight = selectedSegment?.flight || null;
  const finalSegment = tripSegments[tripSegments.length - 1];

  // Set default selected passenger for boarding pass when PNR changes
  useEffect(() => {
    if (selectedPassenger && !selectedPassengerForBoardingPass) {
      setSelectedPassengerForBoardingPass(selectedPassenger.id);
    } else if (!selectedPassenger) {
      setSelectedPassengerForBoardingPass(null);
    }
  }, [selectedPnr, selectedPassenger?.id]);

  const availableDates = useMemo(() => {
    const dates = flights.map((f) => f.date).filter(Boolean) as string[];
    return Array.from(new Set(dates)).sort();
  }, [flights]);

  const flightsForDate = useMemo(() => {
    return flights.filter((f) => {
      if (searchDate && f.date && f.date !== searchDate) return false;
      if (searchOrigin && f.origin !== searchOrigin) return false;
      if (searchDestination && f.destination !== searchDestination) return false;
      return true;
    });
  }, [flights, searchDate, searchOrigin, searchDestination]);

  const bookingSelectedFlight = useMemo(() => {
    return bookingFlightId ? flights.find((f) => f.id === bookingFlightId) || null : null;
  }, [bookingFlightId, flights]);

  const bookingSelectedConnection = useMemo(() => {
    return bookingConnectionFlightId ? flights.find((f) => f.id === bookingConnectionFlightId) || null : null;
  }, [bookingConnectionFlightId, flights]);

  const airportOptions = useMemo(() => {
    try {
      const all = new Set<string>();
      if (flights && Array.isArray(flights)) {
        flights.forEach((f) => {
          if (f?.origin) all.add(f.origin);
          if (f?.destination) all.add(f.destination);
        });
      }
      const sorted = Array.from(all).sort();
      return sorted.length > 0 ? sorted : ['RIX', 'FRA', 'AMS', 'CDG', 'LHR', 'MUC', 'ARN', 'CPH', 'OSL', 'HEL'];
    } catch (error) {
      console.error('Error computing airport options:', error);
      return ['RIX', 'FRA', 'AMS', 'CDG', 'LHR', 'MUC', 'ARN', 'CPH', 'OSL', 'HEL'];
    }
  }, [flights]);

  useEffect(() => {
    if (!searchDate && availableDates.length > 0) {
      setSearchDate(availableDates[0]);
    }
  }, [availableDates, searchDate]);

  useEffect(() => {
    if (!searchOrigin && airportOptions.length > 0) {
      setSearchOrigin('RIX');
    }
  }, [airportOptions, searchOrigin]);

  useEffect(() => {
    if (!profile.name) return;
    const parts = profile.name.trim().split(/\s+/);
    if (parts.length === 0) return;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || parts[0];
    // Auto-fill first passenger from profile
    setBookingPassengers([{ firstName: firstName.toUpperCase(), lastName: lastName.toUpperCase() }]);
  }, [profile.name]);

  useEffect(() => {
    if (selectedPassenger && selectedPassenger.pnr !== selectedPnr) {
      setSelectedPnr(selectedPassenger.pnr);
    }
  }, [selectedPassenger, selectedPnr]);

  const addNotification = async (message: string) => {
    setNotifications((prev) => {
      // Ensure prev is an array
      const prevArray = Array.isArray(prev) ? prev : [];
      if (prevArray[0] === message) return prevArray;
      return [message, ...prevArray].slice(0, 50);
    });
    
    // Send browser notification if enabled
    if ('Notification' in window) {
      try {
        const permission = Notification.permission;
        console.log('Notification permission status:', permission);
        console.log('Notifications enabled:', notificationsEnabled);
        
        if (permission === 'default') {
          // Permission not yet requested, ask for it
          console.log('Requesting notification permission...');
          const newPermission = await Notification.requestPermission();
          console.log('Permission result:', newPermission);
          if (newPermission === 'granted') {
            setNotificationsEnabled(true);
            const notification = new Notification('Flight Update', { 
              body: message,
              icon: '/vite.svg',
              badge: '/vite.svg',
              tag: 'flight-update'
            });
            console.log('Notification sent:', notification);
          } else {
            console.log('Permission denied by user');
          }
        } else if (permission === 'granted') {
          // Permission already granted, send notification
          if (notificationsEnabled) {
            const notification = new Notification('Flight Update', { 
              body: message,
              icon: '/vite.svg',
              badge: '/vite.svg',
              tag: 'flight-update'
            });
            console.log('Notification sent:', notification);
          } else {
            console.log('Notifications disabled by user toggle');
          }
        } else {
          // Permission denied
          console.log('Notification permission denied');
        }
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    } else {
      console.log('Notifications not supported in this browser');
    }
  };

  useEffect(() => {
    if (!selectedPassenger || !selectedFlight) return;
    const prev = lastFlightRef.current;
    if (prev) {
      if (prev.status && prev.status !== selectedFlight.status) {
        addNotification(
          `${new Date().toLocaleTimeString()} · Status ${prev.status} → ${selectedFlight.status}`
        );
      }
      if (prev.gate && prev.gate !== selectedFlight.gate) {
        addNotification(
          `${new Date().toLocaleTimeString()} · Gate changed ${prev.gate} → ${selectedFlight.gate || 'TBA'}`
        );
      }
    }
    if (['BOARDING', 'DEPARTED', 'ARRIVED'].includes(selectedFlight.status)) {
      addNotification(`${new Date().toLocaleTimeString()} · ${selectedFlight.status} for ${selectedFlight.flightNumber}`);
    }
    lastFlightRef.current = { status: selectedFlight.status, gate: selectedFlight.gate };
  }, [selectedPassenger, selectedFlight]);

  // Request notification permission when notifications screen is opened
  useEffect(() => {
    if (screen === 'notifications' && 'Notification' in window && Notification.permission === 'default') {
      // Request permission when user opens notifications screen
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          setNotificationsEnabled(true);
        }
      });
    }
  }, [screen]);

  // Protect routes - redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn && screen !== 'login') {
      setScreen('login');
    }
  }, [isLoggedIn, screen]);

  const handleLogin = async () => {
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter email and password');
      return;
    }
    
    try {
      const user = await loginUser(loginEmail, loginPassword);
      setCurrentUser(user);
      setIsLoggedIn(true);
      
      // Save session
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        userId: user.id,
        email: user.email
      }));
      
      // Update profile from user data
      setProfile({
        name: user.name || '',
        email: user.email || '',
        skymiles: user.skymiles || ''
      });
      
      setScreen('explore');
      setLoginEmail('');
      setLoginPassword('');
      setLoginError('');
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Failed to login. Please check your credentials.');
    }
  };

  const handleRegister = async () => {
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter email and password');
      return;
    }
    
    try {
      const user = await registerUser(loginEmail, loginPassword, loginName || undefined, loginUserType);
      setCurrentUser(user);
      setIsLoggedIn(true);
      
      // Save session
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        userId: user.id,
        email: user.email
      }));
      
      // Update profile from user data
      setProfile({
        name: user.name || loginName || '',
        email: user.email || '',
        skymiles: user.skymiles || ''
      });
      
      setScreen('explore');
      setLoginEmail('');
      setLoginPassword('');
      setLoginName('');
      setLoginUserType('passenger');
      setIsRegistering(false);
      setLoginError('');
    } catch (error: any) {
      console.error('Register error:', error);
      setLoginError(error.message || 'Failed to register. Email may already be in use.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setCurrentUser(null);
    setIsLoggedIn(false);
    setScreen('login');
    setProfile({ name: '', email: '', skymiles: '' });
  };

  const handleAddReservation = () => {
    setError('');
    setSuccess('');
    const userEmail = currentUser?.email || profile.email || '';
    
    const passenger = passengers.find(
      (p) =>
        p.pnr.toUpperCase() === lookupPnr.toUpperCase() &&
        p.lastName.toUpperCase() === lookupLastName.toUpperCase()
    );
    if (!passenger) {
      setError('Reservation not found. Check PNR and last name.');
      return;
    }
    
    // Check if reservation belongs to current user
    if (userEmail && passenger.userEmail && passenger.userEmail !== userEmail) {
      setError('This reservation belongs to another user.');
      return;
    }
    
    if (!trips.includes(passenger.pnr)) {
      setTrips((prev) => [passenger.pnr, ...prev]);
    }
    setSelectedPnr(passenger.pnr);
    setLookupPnr('');
    setLookupLastName('');
    setSuccess('Reservation added.');
    setScreen('trips');
  };

  const handleBookTrip = () => {
    setError('');
    setSuccess('');
    
    // Validate all passengers have names
    const validPassengers = bookingPassengers.filter(p => p.firstName.trim() && p.lastName.trim());
    if (validPassengers.length === 0) {
      setError('Please add at least one passenger with first and last name.');
      return;
    }
    if (!bookingFlightId) {
      setError('Please select a flight.');
      return;
    }
    
    const newPnr = generatePnr();
    
    // For employees, use STAFF_SBY passenger type (free standby tickets)
    const passengerType = currentUser?.user_type === 'employee' ? 'STAFF_SBY' : 'REVENUE';
    
    // Get user email for linking reservations
    const userEmail = currentUser?.email || profile.email || '';
    
    // Create booking for each passenger with the same PNR
    validPassengers.forEach(passenger => {
      createBooking(newPnr, passenger.lastName.toUpperCase(), passenger.firstName.toUpperCase(), bookingFlightId, passengerType, undefined, userEmail);
      if (bookingConnectionFlightId) {
        createBooking(newPnr, passenger.lastName.toUpperCase(), passenger.firstName.toUpperCase(), bookingConnectionFlightId, passengerType, undefined, userEmail);
      }
    });
    if (profile.email) {
      addEmailContact(newPnr, profile.email);
    }
    if (bookingSelectedFlight) {
      const passengerCount = validPassengers.length;
      if (currentUser?.user_type === 'employee') {
        addLog(
          `Employee standby booking ${newPnr}: ${bookingSelectedFlight.flightNumber} - FREE (SBY) - ${passengerCount} passenger(s)`,
          'SELF_CHECK_IN'
        );
      } else {
        const totalPrice = farePricing.total * passengerCount;
        addLog(
          `Mobile booking ${newPnr}: ${bookingSelectedFlight.flightNumber} ${fareClass} EUR ${totalPrice.toFixed(2)} - ${passengerCount} passenger(s)`,
          'SELF_CHECK_IN'
        );
      }
    }
    setTrips((prev) => [newPnr, ...prev]);
    setSelectedPnr(newPnr);
    setBookingPassengers([{ firstName: '', lastName: '' }]);
    setBookingFlightId('');
    
    const passengerCount = validPassengers.length;
    if (currentUser?.user_type === 'employee') {
      // Employees get free standby tickets
      const successMessage = `Employee standby booking created: ${newPnr} (FREE - SBY) - ${passengerCount} passenger(s)`;
      setSuccess(successMessage);
      setShowResults(false);
      setScreen('trips');
    } else {
      // Regular passengers need to pay - multiply price by number of passengers
      const totalPrice = farePricing.total * passengerCount;
      setPaymentAmount(totalPrice);
      const successMessage = `Booking created: ${newPnr} for ${passengerCount} passenger(s). Please complete payment.`;
      setSuccess(successMessage);
      setShowResults(false);
      // selectedPassenger will update automatically via useMemo when selectedPnr changes
      setTimeout(() => {
        setScreen('payment');
      }, 500);
    }
  };

  const handleSync = async () => {
    try {
      setSyncState('SYNCING');
      await loadFromDatabase();
      setLastSync(new Date().toLocaleString());
      setSyncState('IDLE');
    } catch {
      setSyncState('ERROR');
    }
  };

  const handleSeatSave = () => {
    if (!selectedPassenger || !seatSelection) return;
    updatePassengerDetails(selectedPassenger.pnr, { seat: seatSelection });
    addLog(`Mobile seat selection ${seatSelection} for ${selectedPassenger.pnr}`, 'SELF_CHECK_IN');
    setSuccess('Seat updated.');
    setScreen('trips');
  };

  const handleCheckIn = async () => {
    if (!selectedPassenger) return;
    setError('');
    setSuccess('');
    if (bagCount > 0) {
      updatePassengerDetails(selectedPassenger.pnr, {
        hasBags: true,
        bagCount
      });
    }
    const ok = await checkInPassenger(selectedPassenger.pnr);
    if (ok) {
      setSuccess('Check-in completed.');
      setScreen('trips');
    } else {
      setError('Check-in failed. Please contact the airline.');
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Format expiry date (MM/YY)
  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handlePayment = async () => {
    if (!selectedPassenger) {
      setError('Please select a passenger');
      return;
    }

    if (paymentMethod === 'CARD') {
      // Validate card details
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
        setError('Please enter a valid card number');
        return;
      }
      if (!cardName || cardName.length < 2) {
        setError('Please enter cardholder name');
        return;
      }
      if (!cardExpiry || cardExpiry.length !== 5) {
        setError('Please enter a valid expiry date (MM/YY)');
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        setError('Please enter a valid CVV');
        return;
      }

      // Validate expiry date
      const [month, year] = cardExpiry.split('/');
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
      const now = new Date();
      if (expiryDate < now) {
        setError('Card has expired');
        return;
      }

      setIsProcessingPayment(true);
      setError('');

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate random success/failure (90% success rate for demo)
      const isSuccess = Math.random() > 0.1;

      setIsProcessingPayment(false);

      if (isSuccess) {
        const maskedCard = '**** **** **** ' + cardNumber.slice(-4).replace(/\s/g, '');
        addLog(
          `Mobile payment ${paymentAmount.toFixed(2)} EUR via CARD (${maskedCard}) for ${selectedPassenger.pnr}`,
          'SELF_CHECK_IN'
        );
        setSuccess('Payment successful!');
        setCardNumber('');
        setCardName('');
        setCardExpiry('');
        setCardCvv('');
        setPaymentAmount(0);
        setTimeout(() => {
          setScreen('trips');
        }, 1500);
      } else {
        setError('Payment failed. Please try again or use a different card.');
      }
    } else {
      // Cash payment (simpler)
      if (!paymentAmount || paymentAmount <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      addLog(
        `Mobile payment ${paymentAmount.toFixed(2)} EUR via CASH for ${selectedPassenger.pnr}`,
        'SELF_CHECK_IN'
      );
      setPaymentAmount(0);
      setSuccess('Payment successful.');
      setTimeout(() => {
        setScreen('trips');
      }, 1500);
    }
  };

  const getSeatLayout = (aircraft?: string) => {
    if (!aircraft) return { rows: 30, seats: ['A', 'B', 'C', 'D', 'E', 'F'] };
    const upper = aircraft.toUpperCase();
    if (upper.includes('A220') || upper.includes('BCS3')) {
      return { rows: 25, seats: ['A', 'B', 'C', 'D', 'F'] };
    }
    if (upper.includes('A319') || upper.includes('A320') || upper.includes('A321')) {
      return { rows: 30, seats: ['A', 'B', 'C', 'D', 'E', 'F'] };
    }
    if (upper.includes('A330') || upper.includes('A350') || upper.includes('B777') || upper.includes('B787')) {
      return { rows: 40, seats: ['A', 'B', 'C', 'D', 'E', 'F'] };
    }
    return { rows: 30, seats: ['A', 'B', 'C', 'D', 'E', 'F'] };
  };

  const seatMap = useMemo(() => {
    if (!selectedFlight) return [];
    const layout = getSeatLayout(selectedFlight.aircraft);
    return Array.from({ length: layout.rows }, (_, row) =>
      layout.seats.map((seat) => `${row + 1}${seat}`)
    ).flat();
  }, [selectedFlight]);

  const formatDate = (date?: string) => {
    if (!date) {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time?: string) => {
    if (!time) return 'TBA';
    return time;
  };

  const toMinutes = (flight?: typeof selectedFlight) => {
    const dt = toDateTime(flight);
    if (!dt) return null;
    return dt.getHours() * 60 + dt.getMinutes();
  };

  const connectionOptions = useMemo(() => {
    try {
      if (!searchOrigin || !searchDestination) return [];
      if (!flightsForDate || !Array.isArray(flightsForDate)) return [];
      const leg1 = flightsForDate.filter((f) => f && f.origin === searchOrigin);
      const options: Array<{ leg1: typeof flights[0]; leg2: typeof flights[0] }> = [];
      leg1.forEach((l1) => {
        try {
          if (!l1 || !l1.destination) return;
          const l1Dep = toMinutes(l1);
          if (l1Dep === null) return;
          const l1Arr = l1Dep + estimateDurationMinutes(l1);
          const leg2 = flightsForDate.filter((f) => f && f.origin === l1.destination && f.destination === searchDestination);
          leg2.forEach((l2) => {
            try {
              const l2Dep = toMinutes(l2);
              if (l2Dep === null) return;
              const connectionTime = l2Dep - l1Arr;
              if (connectionTime >= 90 && connectionTime <= 480) {
                options.push({ leg1: l1, leg2: l2 });
              }
            } catch (err) {
              console.error('Error processing leg2:', err);
            }
          });
        } catch (err) {
          console.error('Error processing leg1:', err);
        }
      });
      return options;
    } catch (error) {
      console.error('Error computing connection options:', error);
      return [];
    }
  }, [flightsForDate, searchOrigin, searchDestination]);

  const estimateDurationMinutes = (flight?: typeof selectedFlight) => {
    if (!flight) return 120;
    const longHaul = new Set(['JFK', 'LAX', 'BKK', 'DOH', 'DXB', 'SIN', 'NRT', 'ICN', 'SFO', 'SEA', 'ORD']);
    return longHaul.has(flight.destination) ? 480 : 120;
  };

  const toDateTime = (flight?: typeof selectedFlight) => {
    try {
      if (!flight?.date || !flight?.std) return null;
      const dateParts = flight.date.split('-');
      const timeParts = flight.std.split(':');
      if (dateParts.length !== 3 || timeParts.length < 2) return null;
      const [y, m, d] = dateParts.map(Number);
      const [hh, mm] = timeParts.map(Number);
      if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(hh) || isNaN(mm)) return null;
      const dt = new Date(y, m - 1, d, hh, mm, 0);
      if (isNaN(dt.getTime())) return null;
      return dt;
    } catch (error) {
      console.error('Error parsing date/time:', error);
      return null;
    }
  };

  const farePricing = useMemo(() => {
    const flightsToPrice = [bookingSelectedFlight, bookingSelectedConnection].filter(Boolean) as Array<NonNullable<typeof bookingSelectedFlight>>;
    if (flightsToPrice.length === 0) return { base: 0, taxes: 0, total: 0 };
    const multiplier = fareClass === 'BASIC' ? 0.85 : fareClass === 'MAIN' ? 1 : fareClass === 'COMFORT' ? 1.35 : 2.1;
    const baseFare = flightsToPrice.reduce((sum, flight) => {
      const seed = flight.flightNumber.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const base = 90 + (seed % 160);
      return sum + Math.round(base * multiplier);
    }, 0);
    const taxes = Math.round(baseFare * 0.23);
    return { base: baseFare, taxes, total: baseFare + taxes };
  }, [bookingSelectedFlight, bookingSelectedConnection, fareClass]);

  const navItems = [
    { id: 'explore', label: 'Explore', icon: Home },
    { id: 'book', label: 'Book', icon: BookOpen },
    { id: 'trips', label: 'Trips', icon: Plane },
    { id: 'account', label: 'Account', icon: UserCircle },
    { id: 'more', label: 'More', icon: Menu }
  ] as const;

  const renderHeader = () => {
    // Don't show header on login screen
    if (screen === 'login') {
      return null;
    }
    
    if (screen === 'account') {
      return (
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-300">SKYMILES</div>
            <button onClick={() => setScreen('notifications')}>
              <Bell className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 flex gap-6 text-xs text-slate-400">
            <span className="text-white border-b-2 border-white pb-1">SKYMILES</span>
            <span>MY WALLET</span>
            <span>PROFILE</span>
          </div>
        </div>
      );
    }

    if (screen === 'more') {
      return (
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div />
            <div className="text-sm text-slate-300">LOG OUT</div>
          </div>
        </div>
      );
    }

    if (['add', 'seat', 'checkin', 'payment', 'notifications', 'tripDetail', 'boardingPass'].includes(screen)) {
      const titleMap: Record<string, string> = {
        add: 'Find My Trip',
        seat: 'Seat Selection',
        checkin: 'Check In',
        payment: 'Payment',
        notifications: 'Notifications',
        tripDetail: selectedFlight ? `${selectedFlight.origin} - ${selectedFlight.destination}` : 'Trip',
        boardingPass: 'Boarding Pass'
      };
      return (
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <button className="text-sm text-slate-300" onClick={() => setScreen('trips')}>
              Back
            </button>
            <div className="font-semibold">{titleMap[screen]}</div>
            <div className="w-10" />
          </div>
        </div>
      );
    }

    const title =
      screen === 'explore'
        ? `Welcome, ${currentUser?.name?.split(' ')[0] || selectedPassenger?.firstName || 'Traveler'}`
        : screen === 'book'
        ? 'Book'
        : screen === 'trips'
        ? 'My Trips'
        : 'Mobile App';

    return (
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-4 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button onClick={() => setScreen('notifications')}>
            <Bell className="w-5 h-5" />
          </button>
        </div>
        {screen === 'explore' && (
          <div className="mt-2 text-xs text-slate-300">{totalMiles.toLocaleString()} Miles</div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-100 text-slate-900 pb-24">
      {renderHeader()}

      {error && <div className="mx-4 mt-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
      {success && <div className="mx-4 mt-4 p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>}

      {screen === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 to-blue-600">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                  <Plane className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  {isRegistering ? 'Create Account' : 'Welcome'}
                </h1>
                <p className="text-slate-600">
                  {isRegistering ? 'Sign up for a new account' : 'Sign in to your account'}
                </p>
              </div>
              
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}
              
              <div className="space-y-4">
                {isRegistering && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Account Type</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setLoginUserType('passenger')}
                          className={clsx(
                            'px-4 py-3 border-2 rounded-lg font-semibold transition-colors',
                            loginUserType === 'passenger'
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                          )}
                        >
                          Passenger
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoginUserType('employee')}
                          className={clsx(
                            'px-4 py-3 border-2 rounded-lg font-semibold transition-colors',
                            loginUserType === 'employee'
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                          )}
                        >
                          Airline Employee
                        </button>
                      </div>
                      {loginUserType === 'employee' && (
                        <p className="text-xs text-slate-500 mt-2">
                          Employees get free standby (SBY) tickets
                        </p>
                      )}
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        isRegistering ? handleRegister() : handleLogin();
                      }
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        isRegistering ? handleRegister() : handleLogin();
                      }
                    }}
                  />
                </div>
                
                <button
                  onClick={isRegistering ? handleRegister : handleLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {isRegistering ? 'Create Account' : 'Sign In'}
                </button>
                
                <div className="text-center text-sm text-slate-600">
                  {isRegistering ? (
                    <>
                      <p>Already have an account?</p>
                      <button
                        onClick={() => {
                          setIsRegistering(false);
                          setLoginError('');
                        }}
                        className="text-blue-600 font-semibold mt-1"
                      >
                        Sign in instead
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Don't have an account?</p>
                      <button
                        onClick={() => {
                          setIsRegistering(true);
                          setLoginError('');
                        }}
                        className="text-blue-600 font-semibold mt-1"
                      >
                        Create one now
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {screen === 'explore' && (
        <div className="p-4 space-y-6">
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900 to-blue-600 text-white shadow-lg">
            <div className="p-5">
              <div className="text-sm text-slate-200">Finish Booking Your Trip</div>
              <div className="text-4xl font-semibold mt-2">
                {selectedFlight ? `${selectedFlight.origin} → ${selectedFlight.destination}` : 'Plan Your Journey'}
              </div>
              <button
                className="mt-6 w-full bg-white/90 text-blue-900 font-semibold py-3 rounded-lg"
                onClick={() => setScreen('book')}
              >
                View Flights
              </button>
            </div>
          </div>

          <div>
            <div className="text-xl font-semibold text-slate-800 mb-3">Elevate Your Travel Experience</div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="text-sm text-slate-600">
                From road to runway. Earn miles with linked accounts and partner offers.
              </div>
              <button className="mt-4 text-blue-700 font-semibold">Learn More</button>
            </div>
          </div>
        </div>
      )}

      {screen === 'trips' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-slate-800">My Flights ({tripPassengers.length})</div>
            <button
              className="text-xs text-blue-600"
              onClick={handleSync}
              disabled={syncState === 'SYNCING'}
            >
              {syncState === 'SYNCING' ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>
          <div className="text-xs text-slate-500">
            Status: {isDatabaseReady ? 'Synced' : 'Offline'}{lastSync ? ` · Last sync ${lastSync}` : ''}
          </div>
          {tripPassengers.length > 0 ? (
            <div className="space-y-3">
              {tripPassengers.map((passenger) => {
                if (!passenger) return null;
                const passengerSegments = passengers
                  .filter((p) => p.pnr === passenger.pnr)
                  .map((p) => ({
                    passenger: p,
                    flight: flights.find((f) => f.id === p.flightId)
                  }))
                  .filter((seg) => seg.flight)
                  .sort((a, b) => {
                    const dateA = a.flight?.date || '';
                    const dateB = b.flight?.date || '';
                    if (dateA !== dateB) return dateA.localeCompare(dateB);
                    return (a.flight?.std || '').localeCompare(b.flight?.std || '');
                  });
                const passengerFlight = passengerSegments[0]?.flight || null;
                const passengerFinalSegment = passengerSegments[passengerSegments.length - 1];
                const isSelected = selectedPnr === passenger.pnr;
                
                return (
                  <button
                    key={passenger.pnr}
                    className={clsx(
                      "bg-white rounded-2xl shadow-sm overflow-hidden text-left w-full",
                      isSelected ? "ring-2 ring-blue-500" : ""
                    )}
                    onClick={() => {
                      setSelectedPnr(passenger.pnr);
                      setScreen('tripDetail');
                    }}
                  >
                    <div className={clsx(
                      "h-40 relative overflow-hidden bg-gradient-to-r",
                      getCityGradient(passengerFinalSegment?.flight?.destination || passengerFlight?.destination || '')
                    )}>
                      {(() => {
                        const destCode = passengerFinalSegment?.flight?.destination || passengerFlight?.destination;
                        const destCity = passengerFinalSegment?.flight?.destinationCity || passengerFlight?.destinationCity;
                        const imageSrc = destCode ? getCityImageUrl(destCode, destCity) : '';
                        const hasError = destCode ? imageErrors.has(destCode) : false;
                        
                        if (!imageSrc || hasError) {
                          return null; // Show gradient background
                        }
                        
                        return (
                          <img
                            src={imageSrc}
                            alt={destCity || destCode || 'Destination'}
                            className="w-full h-full object-cover absolute inset-0"
                            onError={() => {
                              if (destCode && !imageErrors.has(destCode)) {
                                setImageErrors(prev => new Set([...prev, destCode]));
                              }
                            }}
                            loading="lazy"
                          />
                        );
                      })()}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <div className="absolute left-4 bottom-4">
                        <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          {passenger.seat === 'SBY' ? 'STANDBY' : 'CONFIRMED'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{passenger.seat === 'SBY' ? 'Standby' : passengerSegments.length > 1 ? 'Multi-City' : 'One Way'}</span>
                        <span>Confirmation # {passenger.pnr}</span>
                      </div>
                      <div className="text-2xl font-semibold">
                        {getCityDisplayName(
                          passengerFinalSegment?.flight?.destination || passengerFlight?.destination || '',
                          passengerFinalSegment?.flight?.destinationCity || passengerFlight?.destinationCity
                        ) || 'Trip details pending'}
                      </div>
                      <div className="text-sm text-slate-600">
                        {passengerFlight ? `${getCityDisplayName(passengerFlight.origin, passengerFlight.originCity)} - ${getCityDisplayName(passengerFlight.destination, passengerFlight.destinationCity)}` : 'Flight information loading'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {passengerFlight ? formatDate(passengerFlight.date) : ''}
                      </div>
                      {passenger.bagCount > 0 && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                          <Luggage className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-600">
                            {passenger.bagCount} {passenger.bagCount === 1 ? 'bag' : 'bags'} registered
                            {passenger.bagStatus && passenger.bagStatus !== 'CHECKED' && (
                              <span className={clsx(
                                "ml-2 px-2 py-0.5 rounded text-xs font-semibold",
                                passenger.bagStatus === 'LOADED' ? 'bg-green-100 text-green-700' :
                                passenger.bagStatus === 'UNLOADED' ? 'bg-blue-100 text-blue-700' :
                                passenger.bagStatus === 'LOST' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-700'
                              )}>
                                {passenger.bagStatus}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-6 text-slate-600">
              No Trip. Add a reservation to view.
            </div>
          )}

          <div className="grid gap-3">
            <button
              className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
              onClick={() => setScreen('seat')}
              disabled={!selectedPassenger}
            >
              <Armchair className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Seat Selection</span>
              <span className="text-xs text-slate-500">{selectedPassenger?.seat || '--'}</span>
            </button>
            <button
              className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
              onClick={() => setScreen('checkin')}
              disabled={!selectedPassenger}
            >
              <ClipboardCheck className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Check In</span>
              <span className="text-xs text-slate-500">{selectedPassenger?.status || ''}</span>
            </button>
            <button
              className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
              onClick={() => setScreen('payment')}
              disabled={!selectedPassenger}
            >
              <CreditCard className="w-5 h-5 text-slate-700" />
              <span className="flex-1 text-left">Payment</span>
            </button>
          </div>

          <div>
            <div className="text-lg font-semibold text-slate-800 mb-2">Don't See A Trip?</div>
            <button
              className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
              onClick={() => setScreen('add')}
            >
              <span className="font-semibold text-slate-700">Find My Trip</span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {screen === 'tripDetail' && selectedPassenger && (
        <div className="p-4 space-y-6">
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
            <div className="text-xs text-slate-300">
              Confirmation # {selectedPassenger.pnr}
            </div>
            <div className="text-3xl font-semibold mt-2">
              To {finalSegment?.flight?.destinationCity || finalSegment?.flight?.destination || selectedFlight?.destination || 'Destination'}
            </div>
            <div className="text-sm text-slate-300 mt-2">
              {selectedFlight ? `${formatDate(selectedFlight.date)} | ${formatTime(selectedFlight.std)}` : 'Date TBA'}
            </div>
          </div>

          {tripSegments.length > 1 && (
            <div>
              <div className="text-lg font-semibold text-slate-800 mb-2">Trip Segments</div>
              <div className="space-y-3">
                {tripSegments.map((seg, index) => (
                  <div key={seg.flight?.id || index} className="bg-white rounded-2xl shadow-sm p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>
                        Segment {index + 1} of {tripSegments.length}
                      </span>
                      <span>{seg.flight?.flightNumber}</span>
                    </div>
                    <div className="text-lg font-semibold">
                      {seg.flight?.origin} → {seg.flight?.destination}
                    </div>
                    <div className="text-sm text-slate-600">
                      {formatDate(seg.flight?.date)} · {formatTime(seg.flight?.std)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Aircraft: {seg.flight?.aircraft || 'TBA'} · Duration {Math.round(estimateDurationMinutes(seg.flight) / 60)}h
                    </div>
                    {index < tripSegments.length - 1 && (
                      <div className="mt-2 text-xs text-slate-500">
                        {(() => {
                          const currentDep = toDateTime(seg.flight);
                          const nextDep = toDateTime(tripSegments[index + 1].flight);
                          if (!currentDep || !nextDep) return 'Connection';
                          const arrival = new Date(currentDep.getTime() + estimateDurationMinutes(seg.flight) * 60000);
                          const diff = Math.max(0, Math.round((nextDep.getTime() - arrival.getTime()) / 60000));
                          const hours = Math.floor(diff / 60);
                          const mins = diff % 60;
                          return `Layover ${hours}h ${mins}m`;
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {[
              { label: 'Boarding Pass', action: () => setScreen('boardingPass') },
              { label: 'Seat Selection', action: () => setScreen('seat') },
              { label: 'Change or Add Flights', action: () => setScreen('book') },
              { label: 'Need to Cancel?', action: () => setScreen('more') }
            ].map((item) => (
              <button
                key={item.label}
                className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
                onClick={item.action}
              >
                <span className="text-slate-700">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            ))}
          </div>

          {selectedPassenger.bagCount > 0 && (
            <div>
              <div className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <Luggage className="w-5 h-5" />
                Baggage Tracking
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                {Array.from({ length: selectedPassenger.bagCount }, (_, index) => {
                  const tagNumber = `00BT${selectedPassenger.pnr}${index + 1}`;
                  const bagStatus = selectedPassenger.bagStatus || 'CHECKED';
                  const bagLocation = selectedPassenger.bagLocation || 'Not assigned';
                  
                  return (
                    <div key={index} className="border border-slate-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Luggage className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-slate-800">Bag {index + 1}</span>
                        </div>
                        <span className={clsx(
                          "px-2 py-1 rounded text-xs font-semibold",
                          bagStatus === 'LOADED' ? 'bg-green-100 text-green-700' :
                          bagStatus === 'UNLOADED' ? 'bg-blue-100 text-blue-700' :
                          bagStatus === 'LOST' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        )}>
                          {bagStatus}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tag Number:</span>
                          <span className="font-mono font-semibold text-slate-800">{tagNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Location:</span>
                          <span className="text-slate-700">{bagLocation}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-lg font-semibold text-slate-800 mb-2">Completed Flights</div>
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    To {selectedFlight ? selectedFlight.destinationCity || selectedFlight.destination : 'Destination'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedFlight ? formatDate(selectedFlight.date) : 'Date TBA'}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 rotate-90" />
              </div>
              <div className="border-t pt-4 grid grid-cols-3 gap-2 text-center text-sm text-slate-600">
                <div>
                  <div className="text-xs text-slate-400">Seat</div>
                  <div className="font-semibold">{selectedPassenger.seat || '--'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Status</div>
                  <div className="font-semibold">
                    {selectedPassenger.status === 'CHECKED_IN' ? 'CHECKED IN' : selectedPassenger.status}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Flight</div>
                  <div className="font-semibold">{selectedFlight?.flightNumber || '--'}</div>
                </div>
              </div>
              {selectedPassenger.status === 'CHECKED_IN' && (
                <div className="border-t pt-4">
                  <div className="text-xs text-slate-400 mb-2 text-center">Boarding Pass QR Code</div>
                  <div className="flex justify-center bg-white p-4 rounded-lg">
                    <QRCode
                      value={JSON.stringify({
                        pnr: selectedPassenger.pnr,
                        name: `${selectedPassenger.lastName}/${selectedPassenger.firstName}`,
                        flight: selectedFlight?.flightNumber || '',
                        seat: selectedPassenger.seat || '',
                        gate: selectedFlight?.gate || '',
                        date: selectedFlight?.date || '',
                        status: selectedPassenger.status
                      })}
                      size={200}
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      viewBox="0 0 200 200"
                    />
                  </div>
                  <div className="text-xs text-slate-500 text-center mt-2">
                    Show this QR code at the gate
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  {selectedPassenger.seat === 'SBY' ? 'STANDBY' : 'CONFIRMED'}
                </span>
                <span className="text-sm text-slate-600">Check Gate Screens</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {screen === 'book' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
            <div className="flex gap-2 bg-slate-100 rounded-full p-1 text-xs font-semibold">
              {[
                { key: 'ROUND_TRIP', label: 'Round Trip' },
                { key: 'ONE_WAY', label: 'One-Way' },
                { key: 'MULTI_CITY', label: 'Multi-City' }
              ].map((option) => (
                <button
                  key={option.key}
                  className={clsx(
                    'flex-1 py-2 rounded-full',
                    tripType === option.key ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                  )}
                  onClick={() => setTripType(option.key as typeof tripType)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <button
                type="button"
                className="w-full border rounded-xl p-3 flex items-center justify-between bg-white hover:bg-slate-50"
                onClick={() => setAirportPicker({ open: true, type: 'origin' })}
              >
                <div className="text-left">
                  <div className="text-xs text-slate-500">From</div>
                  <div className="text-lg font-semibold text-slate-900">{searchOrigin || 'Select origin'}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                className="w-full border rounded-xl p-3 flex items-center justify-between bg-white hover:bg-slate-50"
                onClick={() => setAirportPicker({ open: true, type: 'destination' })}
              >
                <div className="text-left">
                  <div className="text-xs text-slate-500">To</div>
                  <div className="text-lg font-semibold text-slate-900">{searchDestination || 'Select destination'}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-xl p-3 bg-white">
                  <div className="text-xs text-slate-500 mb-1">Departure</div>
                  <input
                    type="date"
                    className="w-full text-sm bg-white text-slate-900 border-none outline-none"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                  />
                </div>
                <div className="border rounded-xl p-3 bg-white">
                  <div className="text-xs text-slate-500 mb-1">Return</div>
                  <input
                    type="date"
                    className="w-full text-sm bg-white text-slate-900 border-none outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    disabled={tripType !== 'ROUND_TRIP'}
                  />
                </div>
              </div>
              <div className="border rounded-xl p-3 flex items-center justify-between bg-white">
                <span className="text-sm text-slate-600">Passengers</span>
                <span className="text-sm font-semibold text-slate-900">1</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Shop With Miles</span>
              <div className="h-5 w-10 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>My Dates Are Flexible</span>
              <div className="h-5 w-10 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Refundable Fares Only</span>
              <div className="h-5 w-10 bg-slate-200 rounded-full" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900">Advanced Search</div>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white text-slate-900"
              value={bookingFlightId}
              onChange={(e) => setBookingFlightId(e.target.value)}
            >
              <option value="">Best Fares For</option>
              {flights.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.flightNumber} · {f.origin}-{f.destination} · {f.std}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="text-sm font-semibold">Fare Class</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {['BASIC', 'MAIN', 'COMFORT', 'BUSINESS'].map((label) => (
                <button
                  key={label}
                  className={clsx(
                    'py-2 rounded-lg border',
                    fareClass === label ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
                  )}
                  onClick={() => setFareClass(label as typeof fareClass)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl"
            onClick={() => {
              if (!searchOrigin || !searchDestination || !searchDate) {
                setError('Select origin, destination, and date.');
                return;
              }
              setShowResults(true);
              setSuccess('');
              setError('');
              setRecentSearches((prev) => {
                const next = [
                  {
                    origin: searchOrigin,
                    destination: searchDestination,
                    depart: searchDate,
                    returnDate: returnDate || undefined,
                    type: tripType
                  },
                  ...prev
                ];
                return next.slice(0, 5);
              });
            }}
          >
            Find Flights
          </button>

          {showResults && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div className="text-sm font-semibold">Available Flights</div>
              {flightsForDate.length === 0 && (
                <div className="text-sm text-slate-500">No flights for selected date.</div>
              )}
              {flightsForDate.map((f) => (
                <button
                  key={f.id}
                  className={clsx(
                    'w-full border rounded-lg p-3 text-left',
                    bookingFlightId === f.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                  )}
                  onClick={() => {
                    setBookingFlightId(f.id);
                    setBookingConnectionFlightId('');
                  }}
                >
                  <div className="font-semibold">
                    {f.flightNumber} · {f.origin}-{f.destination}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(f.date)} · {formatTime(f.std)} · {f.aircraft}
                  </div>
                </button>
              ))}
              {connectionOptions.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-semibold text-slate-500 mb-2">Connections</div>
                  <div className="space-y-2">
                    {connectionOptions.map((conn, idx) => (
                      <button
                        key={`${conn.leg1.id}-${conn.leg2.id}-${idx}`}
                        className={clsx(
                          'w-full border rounded-lg p-3 text-left',
                          bookingFlightId === conn.leg1.id && bookingConnectionFlightId === conn.leg2.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200'
                        )}
                        onClick={() => {
                          setBookingFlightId(conn.leg1.id);
                          setBookingConnectionFlightId(conn.leg2.id);
                        }}
                      >
                        <div className="font-semibold">
                          {conn.leg1.origin} → {conn.leg2.destination} · {conn.leg1.flightNumber}/{conn.leg2.flightNumber}
                        </div>
                        <div className="text-xs text-slate-500">
                          {conn.leg1.origin}-{conn.leg1.destination} {formatTime(conn.leg1.std)} · Layover
                          {' '}
                          {Math.max(0, (toMinutes(conn.leg2) || 0) - (toMinutes(conn.leg1) || 0) - estimateDurationMinutes(conn.leg1))}m
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {bookingSelectedFlight && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              {currentUser?.user_type === 'employee' ? (
                <>
                  <div className="text-sm font-semibold">Employee Standby Booking</div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Status</span>
                    <span className="font-semibold text-orange-600">STANDBY (SBY)</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-slate-800 border-t pt-2">
                    <span>Total</span>
                    <span className="text-green-600 font-bold">FREE</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    As an airline employee, you receive free standby tickets. Seat assignment will be confirmed at the gate.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold">Price Breakdown</div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Base Fare ({fareClass}) per passenger</span>
                    <span>€{farePricing.base.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Taxes & Fees per passenger</span>
                    <span>€{farePricing.taxes.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Price per passenger</span>
                    <span>€{farePricing.total.toFixed(2)}</span>
                  </div>
                  {bookingPassengers.filter(p => p.firstName && p.lastName).length > 0 && (
                    <>
                      <div className="flex justify-between text-xs text-slate-500 pt-1">
                        <span>× {bookingPassengers.filter(p => p.firstName && p.lastName).length} passenger(s)</span>
                        <span></span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-slate-800 border-t pt-2">
                        <span>Total</span>
                        <span>€{(farePricing.total * bookingPassengers.filter(p => p.firstName && p.lastName).length).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {recentSearches.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Recent Search</div>
                <button
                  className="text-xs text-slate-500"
                  onClick={() => setRecentSearches([])}
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {recentSearches.map((item, idx) => (
                  <button
                    key={`${item.origin}-${item.destination}-${idx}`}
                    className="w-full border rounded-lg p-3 text-left"
                    onClick={() => {
                      setSearchOrigin(item.origin);
                      setSearchDestination(item.destination);
                      setSearchDate(item.depart);
                      setReturnDate(item.returnDate || '');
                      setTripType(item.type as typeof tripType);
                      setShowResults(false);
                    }}
                  >
                    <div className="font-semibold text-sm">
                      {item.origin} → {item.destination}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(item.depart)}{item.returnDate ? ` - ${formatDate(item.returnDate)}` : ''} · {item.type.replace('_', ' ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Passenger Details</div>
              <button
                type="button"
                onClick={() => {
                  setBookingPassengers([...bookingPassengers, { firstName: '', lastName: '' }]);
                }}
                className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-semibold hover:bg-blue-200"
              >
                <Plus className="w-3 h-3" />
                Add Passenger
              </button>
            </div>
            
            {bookingPassengers.map((passenger, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">Passenger {index + 1}</span>
                  {bookingPassengers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setBookingPassengers(bookingPassengers.filter((_, i) => i !== index));
                      }}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="First name"
                  value={passenger.firstName}
                  onChange={(e) => {
                    const updated = [...bookingPassengers];
                    updated[index].firstName = e.target.value.toUpperCase();
                    setBookingPassengers(updated);
                  }}
                />
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Last name"
                  value={passenger.lastName}
                  onChange={(e) => {
                    const updated = [...bookingPassengers];
                    updated[index].lastName = e.target.value.toUpperCase();
                    setBookingPassengers(updated);
                  }}
                />
              </div>
            ))}
            
            <div className="text-xs text-slate-500">
              Selected flight: {bookingFlightId ? bookingFlightId : 'none'}
            </div>
            <button
              className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg"
              onClick={handleBookTrip}
            >
              Confirm Booking ({bookingPassengers.filter(p => p.firstName && p.lastName).length} passenger{bookingPassengers.filter(p => p.firstName && p.lastName).length !== 1 ? 's' : ''})
            </button>
          </div>
        </div>
      )}

      {screen === 'account' && (
        <div className="p-4 space-y-4">
          <div className="bg-indigo-700 text-white rounded-2xl p-4">
            <div className="text-lg font-semibold">
              {currentUser?.name || profile.name || `${selectedPassenger?.firstName || 'User'} ${selectedPassenger?.lastName || ''}`}
            </div>
            <div className="text-sm text-indigo-200">
              {currentUser?.user_type === 'employee' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">AIRLINE EMPLOYEE</span>
                  {currentUser?.skymiles || profile.skymiles ? `· SkyMiles #${currentUser?.skymiles || profile.skymiles}` : ''}
                </span>
              ) : (
                `SkyMiles Member ${currentUser?.skymiles || profile.skymiles ? `· #${currentUser?.skymiles || profile.skymiles}` : ''}`
              )}
            </div>
            <div className="text-3xl font-semibold mt-2">{totalMiles.toLocaleString()}</div>
            <div className="text-xs text-indigo-200">Miles Available</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-600">Profile</div>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Full name"
              value={profile.name}
              onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Email"
              value={profile.email}
              onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="SkyMiles #"
              value={profile.skymiles}
              onChange={(e) => setProfile((prev) => ({ ...prev, skymiles: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg"
                onClick={async () => {
                  if (!currentUser) {
                    setError('Please log in to save profile');
                    return;
                  }
                  try {
                    const updatedUser = await updateUserProfile(currentUser.id, {
                      name: profile.name,
                      email: profile.email,
                      skymiles: profile.skymiles
                    });
                    setCurrentUser(updatedUser);
                    setSuccess('Profile saved.');
                    setError('');
                  } catch (error: any) {
                    console.error('Error saving profile:', error);
                    setError(error.message || 'Failed to save profile');
                  }
                }}
              >
                Save
              </button>
              <button
                className="flex-1 bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg"
                onClick={() => {
                  if (currentUser) {
                    setProfile({
                      name: currentUser.name || '',
                      email: currentUser.email || '',
                      skymiles: currentUser.skymiles || ''
                    });
                  } else {
                    setProfile({ name: '', email: '', skymiles: '' });
                  }
                }}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-sm font-semibold text-slate-600">STATUS PROGRESS</div>
            <div className="flex items-center justify-center h-48">
              <div className="h-40 w-40 rounded-full border-[12px] border-slate-300 flex items-center justify-center text-3xl font-semibold text-slate-500">
                $0
              </div>
            </div>
            <div className="text-xs text-slate-500 text-center">$0 MQDs to Medallion</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-sm font-semibold text-slate-600 mb-2">Saved Passengers</div>
            {tripPassengers.length === 0 && (
              <div className="text-sm text-slate-500">No saved passengers yet.</div>
            )}
            <div className="space-y-2">
              {tripPassengers.map((p) => (
                <div key={p!.pnr} className="flex items-center justify-between text-sm text-slate-700">
                  <div>
                    {p!.firstName} {p!.lastName}
                  </div>
                  <div className="text-xs text-slate-500">{p!.pnr}</div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg mt-4"
          >
            Sign Out
          </button>
        </div>
      )}

      {screen === 'more' && (
        <div className="p-4 space-y-2">
          {[
            'Flight Status',
            'Track My Bags',
            'Delta Sky Club®',
            'Airport Maps',
            'Aircraft',
            'Delta Amex Cards - Personal',
            'Delta Amex Cards - Business',
            'In-Flight Wi-Fi',
            'Delta Studio®',
            'Flight Schedules',
            'Baggage & Travel Fees'
          ].map((item) => (
            <div key={item} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <span className="text-slate-700">{item}</span>
              <ChevronRight className="w-5 h-5 text-red-500" />
            </div>
          ))}
        </div>
      )}

      {screen === 'add' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Find My Trip</h2>
            <div className="space-y-3">
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="PNR"
                value={lookupPnr}
                onChange={(e) => setLookupPnr(e.target.value.toUpperCase())}
              />
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Last name"
                value={lookupLastName}
                onChange={(e) => setLookupLastName(e.target.value.toUpperCase())}
              />
              <button className="w-full bg-blue-600 text-white rounded-lg py-2" onClick={handleAddReservation}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}


      {screen === 'seat' && selectedPassenger && selectedFlight && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Seat Selection</h2>
            <div className="text-xs text-slate-500 mb-3">
              Aircraft: {selectedFlight.aircraft || 'N/A'} · Layout {getSeatLayout(selectedFlight.aircraft).rows} rows
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-[55vh] overflow-y-auto">
              {seatMap.map((seat) => {
                const occupied = passengers.some(
                  (p) => p.flightId === selectedFlight.id && p.seat === seat && p.pnr !== selectedPassenger.pnr
                );
                const selected = seatSelection === seat || selectedPassenger.seat === seat;
                return (
                  <button
                    key={seat}
                    disabled={occupied}
                    onClick={() => setSeatSelection(seat)}
                    className={clsx(
                      'text-xs py-2 rounded border',
                      selected ? 'bg-blue-500 text-white border-blue-600' : '',
                      occupied ? 'bg-slate-200 text-slate-400 border-slate-300' : 'bg-white text-slate-700'
                    )}
                  >
                    {seat}
                  </button>
                );
              })}
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white rounded-lg py-2" onClick={handleSeatSave}>
              Save Seat
            </button>
          </div>
        </div>
      )}

      {screen === 'checkin' && selectedPassenger && selectedFlight && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Check In</h2>
            <div className="text-sm text-slate-600 mb-2">
              Flight {selectedFlight.flightNumber} · {selectedFlight.origin}-{selectedFlight.destination}
            </div>
            <div className="text-sm text-slate-600 mb-2">Status: {selectedPassenger.status}</div>
            <label className="text-sm text-slate-600">Bags</label>
            <select
              className="w-full border rounded-lg px-3 py-2 mt-1"
              value={bagCount}
              onChange={(e) => setBagCount(parseInt(e.target.value))}
            >
              {[0, 1, 2, 3, 4].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'bag' : 'bags'}
                </option>
              ))}
            </select>
            <button
              className="w-full mt-4 bg-blue-600 text-white rounded-lg py-2"
              onClick={handleCheckIn}
            >
              Complete Check-In
            </button>
          </div>
        </div>
      )}

      {screen === 'payment' && selectedPassenger && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Payment</h2>
            
            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Amount (EUR)</label>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="0.00"
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                disabled={isProcessingPayment}
              />
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as 'CARD' | 'CASH');
                  setError('');
                }}
                disabled={isProcessingPayment}
              >
                <option value="CARD">Credit/Debit Card</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            {/* Card Details (only for CARD payment) */}
            {paymentMethod === 'CARD' && (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Card Number</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    disabled={isProcessingPayment}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cardholder Name</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="JOHN DOE"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    disabled={isProcessingPayment}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Expiry Date</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => {
                        const formatted = formatExpiry(e.target.value);
                        if (formatted.length <= 5) {
                          setCardExpiry(formatted);
                        }
                      }}
                      maxLength={5}
                      disabled={isProcessingPayment}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">CVV</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '');
                        if (v.length <= 4) {
                          setCardCvv(v);
                        }
                      }}
                      maxLength={4}
                      disabled={isProcessingPayment}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Payment Button */}
            <button
              className="w-full mt-4 bg-blue-600 text-white rounded-lg py-3 font-semibold disabled:bg-slate-400 disabled:cursor-not-allowed"
              onClick={handlePayment}
              disabled={isProcessingPayment || !paymentAmount || paymentAmount <= 0}
            >
              {isProcessingPayment ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Processing...
                </span>
              ) : (
                `Pay €${paymentAmount.toFixed(2)}`
              )}
            </button>

            {/* Security Note */}
            {paymentMethod === 'CARD' && (
              <p className="text-xs text-slate-500 mt-3 text-center">
                🔒 Your payment is secure. This is a demo simulation.
              </p>
            )}
          </div>
        </div>
      )}

      {screen === 'boardingPass' && selectedPassenger && (() => {
        // Get all passengers with the same PNR
        const allPassengersForPnr = passengers.filter(p => p.pnr === selectedPassenger.pnr);
        const hasMultiplePassengers = allPassengersForPnr.length > 1;
        
        // Get passengers to display (selected or all)
        const passengersToShow = selectedPassengerForBoardingPass
          ? allPassengersForPnr.filter(p => p.id === selectedPassengerForBoardingPass)
          : allPassengersForPnr;
        
        return (
          <div className="p-4 space-y-4">
            {/* Passenger selector if multiple passengers */}
            {hasMultiplePassengers && (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Passenger:</label>
                <select
                  value={selectedPassengerForBoardingPass || ''}
                  onChange={(e) => setSelectedPassengerForBoardingPass(e.target.value || null)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">All Passengers ({allPassengersForPnr.length})</option>
                  {allPassengersForPnr.map((p) => {
                    const pFlight = flights.find(f => f.id === p.flightId);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} - {pFlight?.flightNumber || 'N/A'} ({p.seat || 'No seat'})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            
            {/* Boarding passes for selected passengers */}
            {passengersToShow.map((passenger) => {
              const passengerFlight = flights.find(f => f.id === passenger.flightId);
              
              return (
                <div key={passenger.id} className="space-y-4">
                  {hasMultiplePassengers && !selectedPassengerForBoardingPass && (
                    <div className="text-sm font-semibold text-slate-700 px-2">
                      {passenger.firstName} {passenger.lastName}
                    </div>
                  )}
                  
                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <div className="text-xs text-slate-500">Confirmation # {passenger.pnr}</div>
                    <div className="text-xl font-semibold mt-2">
                      {passenger.firstName} {passenger.lastName}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {passengerFlight ? `${passengerFlight.origin} → ${passengerFlight.destination}` : 'Flight TBD'}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mt-4">
                      <div>
                        <div className="text-slate-400">Flight</div>
                        <div className="font-semibold">{passengerFlight?.flightNumber || '--'}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Seat</div>
                        <div className="font-semibold">{passenger.seat || '--'}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Gate</div>
                        <div className="font-semibold">{passengerFlight?.gate || 'TBA'}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-3">
                      {passengerFlight ? `${formatDate(passengerFlight.date)} · ${formatTime(passengerFlight.std)}` : 'Date TBA'}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-4">
                    <QRCode
                      value={JSON.stringify({
                        pnr: passenger.pnr,
                        name: `${passenger.lastName}/${passenger.firstName}`,
                        flight: passengerFlight?.flightNumber || '',
                        seat: passenger.seat || '',
                        gate: passengerFlight?.gate || '',
                        date: passengerFlight?.date || '',
                        passengerId: passenger.id
                      })}
                      size={160}
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      viewBox="0 0 160 160"
                    />
                    <button className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg">
                      Add to Wallet
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {screen === 'notifications' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Notifications</h2>
            {'Notification' in window && Notification.permission === 'default' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-orange-800 mb-2">
                  Enable browser notifications to receive flight updates
                </p>
                <button
                  className="w-full bg-orange-600 text-white font-semibold py-2 rounded-lg text-sm"
                  onClick={async () => {
                    try {
                      const permission = await Notification.requestPermission();
                      if (permission === 'granted') {
                        setNotificationsEnabled(true);
                        alert('Notifications enabled! You will receive flight updates.');
                      } else {
                        alert('Notification permission denied. Please enable it in your browser settings.');
                      }
                    } catch (error) {
                      console.error('Error requesting notification permission:', error);
                      alert('Failed to request notification permission.');
                    }
                  }}
                >
                  Enable Notifications
                </button>
              </div>
            )}
            {'Notification' in window && Notification.permission === 'denied' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-red-800">
                  Notifications are blocked in your browser. Please enable them in browser settings.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
              <span>Enable push alerts</span>
              <div className="flex items-center gap-2">
                <button
                  className={clsx(
                    'h-6 w-12 rounded-full relative transition',
                    notificationsEnabled && 'Notification' in window && Notification.permission === 'granted' ? 'bg-green-500' : 'bg-slate-200'
                  )}
                  onClick={async () => {
                    if ('Notification' in window) {
                      try {
                        if (Notification.permission === 'default') {
                          const permission = await Notification.requestPermission();
                          if (permission === 'granted') {
                            setNotificationsEnabled(true);
                          } else {
                            setNotificationsEnabled(false);
                            alert('Notification permission denied. Please enable it in your browser settings.');
                            return;
                          }
                        } else if (Notification.permission === 'granted') {
                          setNotificationsEnabled((prev) => !prev);
                        } else {
                          alert('Notifications are blocked. Please enable them in your browser settings.');
                        }
                      } catch (error) {
                        console.error('Error handling notification permission:', error);
                        alert('Failed to handle notification permission.');
                      }
                    } else {
                      alert('Notifications are not supported in this browser.');
                    }
                  }}
                >
                  <span
                    className={clsx(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
                      notificationsEnabled && 'Notification' in window && Notification.permission === 'granted' ? 'left-6' : 'left-1'
                    )}
                  />
                </button>
              </div>
            </div>
            {Array.isArray(notifications) && notifications.length === 0 && <div className="text-sm text-slate-500">No updates yet.</div>}
            <div className="space-y-2">
              {Array.isArray(notifications) && notifications.map((note, index) => (
                <div key={`${note}-${index}`} className="text-sm border rounded-lg p-3 bg-slate-50">
                  Flight update: {note}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {airportPicker.open && airportPicker.type && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setAirportPicker({ open: false, type: null });
          }
        }}>
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">
                Select {airportPicker.type === 'origin' ? 'Departure' : 'Arrival'}
              </div>
              <button
                className="text-sm text-slate-500"
                onClick={() => setAirportPicker({ open: false, type: null })}
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {airportOptions.length > 0 ? airportOptions.map((code) => (
                <button
                  key={`${airportPicker.type}-${code}`}
                  className={clsx(
                    'border rounded-lg py-2 text-center text-sm',
                    airportPicker.type === 'origin' && searchOrigin === code
                      ? 'border-blue-500 bg-blue-50'
                      : '',
                    airportPicker.type === 'destination' && searchDestination === code
                      ? 'border-blue-500 bg-blue-50'
                      : ''
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      if (airportPicker.type === 'origin') {
                        setSearchOrigin(code);
                      } else if (airportPicker.type === 'destination') {
                        setSearchDestination(code);
                      }
                      setAirportPicker({ open: false, type: null });
                    } catch (error) {
                      console.error('Error selecting airport:', error);
                      setAirportPicker({ open: false, type: null });
                    }
                  }}
                >
                  {code}
                </button>
              )) : (
                <div className="col-span-3 text-center text-slate-500 py-4">
                  No airports available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {screen !== 'login' && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white px-2 py-2">
          <div className="grid grid-cols-5 text-[10px]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = screen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={clsx('flex flex-col items-center gap-1', isActive ? 'text-white' : 'text-slate-400')}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

