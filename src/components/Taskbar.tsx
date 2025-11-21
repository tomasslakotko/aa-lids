import { useState, useEffect } from 'react';
import { useOSStore } from '../store/osStore';
import { format } from 'date-fns';
import { LayoutGrid, Wifi } from 'lucide-react';
import clsx from 'clsx';

export const Taskbar = ({ onToggleLauncher }: { onToggleLauncher: () => void }) => {
  const windows = useOSStore((state) => state.windows);
  const activeWindowId = useOSStore((state) => state.activeWindowId);
  const { focusWindow, minimizeWindow } = useOSStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleWindowClick = (windowId: string) => {
    const window = windows.find(w => w.id === windowId);
    if (window?.isMinimized) {
      focusWindow(windowId); // Unminimize and focus
    } else if (activeWindowId === windowId) {
      minimizeWindow(windowId); // Minimize if active
    } else {
      focusWindow(windowId); // Focus if background
    }
  };

  return (
    <div className="h-12 bg-os-panel border-t border-os-border flex items-center px-2 absolute bottom-0 w-full z-50 select-none text-os-text">
      <button 
        onClick={onToggleLauncher}
        className="p-2 hover:bg-white/10 rounded flex items-center gap-2 mr-4 transition-colors"
      >
        <LayoutGrid size={20} className="text-os-accent" />
        <span className="font-bold tracking-wide hidden sm:block">AIR-OS</span>
      </button>

      <div className="flex-1 flex items-center gap-1 overflow-x-auto hide-scrollbar">
        {windows.map((window) => (
          <button
            key={window.id}
            onClick={() => handleWindowClick(window.id)}
            className={clsx(
              "px-3 py-1.5 rounded text-sm truncate max-w-[200px] border transition-all flex items-center gap-2",
              activeWindowId === window.id && !window.isMinimized
                ? "bg-white/10 border-os-border/50 text-white shadow-inner"
                : "bg-transparent border-transparent text-slate-400 hover:bg-white/5"
            )}
          >
            {/* Could show App Icon here */}
            <span className="truncate">{window.title}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 px-2 ml-2 border-l border-os-border pl-4">
        <Wifi size={16} className="text-green-500" />
        <div className="text-xs text-right">
          <div className="font-medium">{format(time, 'HH:mm')}</div>
          <div className="text-slate-400">{format(time, 'dd MMM yyyy')}</div>
        </div>
      </div>
    </div>
  );
};

