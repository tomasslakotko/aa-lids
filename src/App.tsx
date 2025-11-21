import { useEffect } from 'react';
import { Desktop } from './components/Desktop';
import { useOSStore } from './store/osStore';
import { 
  Globe, 
  UserCheck, 
  Plane, 
  ShieldAlert, 
  CalendarDays, 
  Luggage, 
  Activity 
} from 'lucide-react';

// Import Apps
import { ReservationsApp } from './apps/Reservations';
import { CheckInApp } from './apps/CheckIn';
import { BoardingApp } from './apps/Boarding';
import { SecurityApp } from './apps/Security';
import { FlightCoordinatorApp } from './apps/FlightCoordinator';
import { BaggageApp } from './apps/Baggage';
import { OCCApp } from './apps/OCC';

function App() {
  const registerApp = useOSStore((state) => state.registerApp);
  const activeWindowId = useOSStore((state) => state.activeWindowId);
  const closeWindow = useOSStore((state) => state.closeWindow);

  useEffect(() => {
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
      defaultHeight: 600
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
      title: 'Baggage Handling',
      icon: Luggage,
      component: BaggageApp,
      defaultWidth: 900,
      defaultHeight: 500
    });

    registerApp({
      id: 'occ',
      title: 'OCC Dashboard',
      icon: Activity,
      component: OCCApp,
      defaultWidth: 1200,
      defaultHeight: 800
    });

  }, [registerApp]);

  return (
    <Desktop />
  );
}

export default App;
