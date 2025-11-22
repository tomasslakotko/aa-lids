import { useState, useMemo } from 'react';
import { useOSStore } from '../store/osStore';
import { WindowFrame } from './WindowFrame';
import { Taskbar } from './Taskbar';
import { AppLauncher } from './AppLauncher';
import { Folder, FolderOpen, X } from 'lucide-react';

export const Desktop = () => {
  const windows = useOSStore((state) => state.windows);
  const apps = useOSStore((state) => state.apps);
  const launchApp = useOSStore((state) => state.launchApp);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [openFolder, setOpenFolder] = useState<string | null>(null);

  // Group apps
  const { standaloneApps, folders } = useMemo(() => {
    const standalone = apps.filter(app => !app.folder);
    const groups: Record<string, typeof apps> = {};
    
    apps.filter(app => app.folder).forEach(app => {
        if (!groups[app.folder!]) groups[app.folder!] = [];
        groups[app.folder!].push(app);
    });

    return { standaloneApps: standalone, folders: groups };
  }, [apps]);

  return (
    <div 
      className="h-screen w-screen bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center overflow-hidden relative"
      onClick={() => { setLauncherOpen(false); setOpenFolder(null); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

      {/* Desktop Icons Area */}
      <div className="absolute inset-0 p-6 grid grid-flow-col grid-rows-[repeat(auto-fill,100px)] content-start items-start justify-start gap-4 pointer-events-none">
         
         {/* Standalone Apps */}
         {standaloneApps.map((app) => (
           <button
             key={app.id}
             onClick={(e) => {
               e.stopPropagation();
               launchApp(app.id);
               setOpenFolder(null);
             }}
             className="pointer-events-auto w-24 flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 group transition-colors"
           >
             <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform ring-1 ring-white/20">
                <app.icon className="text-white" size={24} />
             </div>
             <span className="text-xs text-center font-medium text-white drop-shadow-md line-clamp-2">{app.title}</span>
           </button>
         ))}

         {/* Folders */}
         {Object.entries(folders).map(([folderName, folderApps]) => (
           <button
             key={folderName}
             onClick={(e) => {
                e.stopPropagation();
                setOpenFolder(folderName);
             }}
             className="pointer-events-auto w-24 flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 group transition-colors"
           >
             <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform ring-1 ring-white/20 relative">
                {/* Preview mini icons */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-2 gap-0.5 opacity-50">
                    {folderApps.slice(0, 4).map(a => <a.icon key={a.id} size={8} className="text-white" />)}
                </div>
                <Folder className="text-white relative z-10" size={24} fill="currentColor" />
             </div>
             <span className="text-xs text-center font-medium text-white drop-shadow-md line-clamp-2">{folderName}</span>
           </button>
         ))}
      </div>

      {/* Folder Window Overlay */}
      {openFolder && (
          <div 
            className="absolute top-20 left-20 z-50 w-80 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/50 pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex justify-between items-center p-3 border-b border-gray-200/50">
                  <div className="flex items-center gap-2 text-gray-700 font-bold">
                      <FolderOpen size={18} className="text-yellow-500" />
                      {openFolder}
                  </div>
                  <button onClick={() => setOpenFolder(null)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                      <X size={16} />
                  </button>
              </div>
              <div className="p-4 grid grid-cols-3 gap-4">
                  {folders[openFolder].map(app => (
                      <button
                        key={app.id}
                        onClick={() => {
                            launchApp(app.id);
                            setOpenFolder(null);
                        }}
                        className="flex flex-col items-center gap-2 group"
                      >
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                              <app.icon className="text-white" size={24} />
                          </div>
                          <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">{app.title}</span>
                      </button>
                  ))}
              </div>
          </div>
      )}

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
