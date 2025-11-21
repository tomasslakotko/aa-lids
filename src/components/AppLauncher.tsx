import React from 'react';
import { useOSStore } from '../store/osStore';

interface AppLauncherProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppLauncher: React.FC<AppLauncherProps> = ({ isOpen, onClose }) => {
  const apps = useOSStore((state) => state.apps);
  const launchApp = useOSStore((state) => state.launchApp);

  if (!isOpen) return null;

  return (
    <div 
      className="absolute bottom-14 left-2 w-[400px] max-h-[600px] bg-os-panel/95 backdrop-blur-lg border border-os-border rounded-lg shadow-2xl p-4 z-50 flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4">
        <input 
          type="text" 
          placeholder="Search apps..." 
          className="w-full bg-slate-900/50 border border-os-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-os-accent"
        />
      </div>
      
      <div className="grid grid-cols-3 gap-4 overflow-y-auto p-1">
        {apps.map((app) => (
          <button
            key={app.id}
            onClick={() => {
              launchApp(app.id);
              onClose();
            }}
            className="flex flex-col items-center gap-2 p-3 hover:bg-white/10 rounded-lg transition-colors group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
               <app.icon className="text-white" size={24} />
            </div>
            <span className="text-xs text-center font-medium text-slate-200">{app.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

