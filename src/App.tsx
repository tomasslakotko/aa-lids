import { useEffect } from 'react';
import { Desktop } from './components/Desktop';
import { useOSStore } from './store/osStore';
import { initializeAirportDatabase } from './store/airportStore';
import { 
  Globe, 
  UserCheck, 
  Plane, 
  ShieldAlert, 
  CalendarDays, 
  Luggage, 
  Activity,
  Headphones,
  Megaphone,
  MonitorPlay,
  Tv,
  Smartphone,
  ScanLine
} from 'lucide-react';

// Import Apps
import { ReservationsApp } from './apps/Reservations';
import { CheckInApp } from './apps/CheckIn';
import { BoardingApp } from './apps/Boarding';
import { SecurityApp } from './apps/Security';
import { FlightCoordinatorApp } from './apps/FlightCoordinator';
import { BaggageApp } from './apps/Baggage';
import { OCCApp } from './apps/OCC';
import { CustomerServiceApp } from './apps/CustomerService';
import { AnnouncementsApp } from './apps/Announcements';
import { FIDSApp } from './apps/FIDS';
import { GateScreenApp } from './apps/GateScreen';
import { SelfCheckInApp } from './apps/SelfCheckIn';
import { ScannerApp } from './apps/Scanner';

function App() {
  const registerApp = useOSStore((state) => state.registerApp);
  const activeWindowId = useOSStore((state) => state.activeWindowId);
  const closeWindow = useOSStore((state) => state.closeWindow);

  useEffect(() => {
    // Initialize database on app start
    initializeAirportDatabase();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeWindowId) {
        closeWindow(activeWindowId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWindowId, closeWindow]);

  useEffect(() => {
    registerApp({
      id: 'reservations',
      title: 'Reservations System',
      icon: Globe,
      component: ReservationsApp,
      defaultWidth: 900,
      defaultHeight: 600
    });

    registerApp({
      id: 'checkin',
      title: 'Check-in Agent',
      icon: UserCheck,
      component: CheckInApp,
      defaultWidth: 1000,
      defaultHeight: 700
    });

    registerApp({
      id: 'boarding',
      title: 'Boarding Gate',
      icon: Plane,
      component: BoardingApp,
      defaultWidth: 800,
      defaultHeight: 600,
      folder: 'GATE'
    });

    registerApp({
      id: 'security',
      title: 'Security Ops',
      icon: ShieldAlert,
      component: SecurityApp,
      defaultWidth: 800,
      defaultHeight: 600
    });

    registerApp({
      id: 'coordinator',
      title: 'Flight Coordinator',
      icon: CalendarDays,
      component: FlightCoordinatorApp,
      defaultWidth: 1100,
      defaultHeight: 700
    });

    registerApp({
      id: 'baggage',
      title: 'BRS Ramp System',
      icon: Luggage,
      component: BaggageApp,
      defaultWidth: 500,
      defaultHeight: 800
    });

    registerApp({
      id: 'occ',
      title: 'OCC Dashboard',
      icon: Activity,
      component: OCCApp,
      defaultWidth: 1200,
      defaultHeight: 800
    });

    registerApp({
      id: 'customerservice',
      title: 'Customer Service',
      icon: Headphones,
      component: CustomerServiceApp,
      defaultWidth: 1100,
      defaultHeight: 800
    });

    registerApp({
      id: 'announcements',
      title: 'PA System',
      icon: Megaphone,
      component: AnnouncementsApp,
      defaultWidth: 1000,
      defaultHeight: 700,
      folder: 'GATE'
    });

    registerApp({
      id: 'fids',
      title: 'Flight Info',
      icon: MonitorPlay,
      component: FIDSApp,
      defaultWidth: 1200,
      defaultHeight: 800,
      folder: 'GATE'
    });

    registerApp({
      id: 'gatescreen',
      title: 'Gate Screen',
      icon: Tv,
      component: GateScreenApp,
      defaultWidth: 1200,
      defaultHeight: 800,
      folder: 'GATE'
    });

    registerApp({
      id: 'selfcheckin',
      title: 'Self Check-In',
      icon: Smartphone,
      component: SelfCheckInApp,
      defaultWidth: 1200,
      defaultHeight: 900
    });

    registerApp({
      id: 'scanner',
      title: 'QR Scanner',
      icon: ScanLine,
      component: ScannerApp,
      defaultWidth: 800,
      defaultHeight: 1000,
      folder: 'GATE'
    });

  }, [registerApp]);

  return (
    <Desktop />
  );
}

export default App;
