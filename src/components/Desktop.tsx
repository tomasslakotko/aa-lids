import { useState } from 'react';
import { useOSStore } from '../store/osStore';
import { WindowFrame } from './WindowFrame';
import { Taskbar } from './Taskbar';
import { AppLauncher } from './AppLauncher';

export const Desktop = () => {
  const windows = useOSStore((state) => state.windows);
  const apps = useOSStore((state) => state.apps);
  const launchApp = useOSStore((state) => state.launchApp);
  const [launcherOpen, setLauncherOpen] = useState(false);

  return (
    <div 
      className="h-screen w-screen bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center overflow-hidden relative"
      onClick={() => setLauncherOpen(false)}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

      {/* Desktop Icons Area */}
      <div className="absolute inset-0 p-6 grid grid-flow-col grid-rows-[repeat(auto-fill,100px)] content-start items-start justify-start gap-4 pointer-events-none">
         {apps.map((app) => (
           <button
             key={app.id}
             onClick={(e) => {
               e.stopPropagation();
               launchApp(app.id);
             }}
             className="pointer-events-auto w-24 flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 group transition-colors"
           >
             <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform ring-1 ring-white/20">
                <app.icon className="text-white" size={24} />
             </div>
             <span className="text-xs text-center font-medium text-white drop-shadow-md line-clamp-2">{app.title}</span>
           </button>
         ))}
      </div>

      {/* Windows Layer */}
      <div className="absolute inset-0 pb-12 pointer-events-none">
        {windows.map((window) => (
          <div key={window.id} className="pointer-events-auto contents">
            <WindowFrame windowId={window.id} appId={window.appId} />
          </div>
        ))}
      </div>

      {/* System UI Layer */}
      <AppLauncher isOpen={launcherOpen} onClose={() => setLauncherOpen(false)} />
      <Taskbar onToggleLauncher={() => setLauncherOpen(!launcherOpen)} />
    </div>
  );
};
