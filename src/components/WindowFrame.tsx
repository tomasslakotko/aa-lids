import React from 'react';
import { useOSStore } from '../store/osStore';
import { X, Minus, Square, Maximize2 } from 'lucide-react';
import { motion, useDragControls } from 'framer-motion';
import clsx from 'clsx';

interface WindowFrameProps {
  windowId: string;
  appId: string;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ windowId }) => {
  const window = useOSStore((state) => state.windows.find((w) => w.id === windowId));
  const activeWindowId = useOSStore((state) => state.activeWindowId);
  const { closeWindow, minimizeWindow, maximizeWindow, focusWindow, updateWindowPosition } = useOSStore();
  const dragControls = useDragControls();

  if (!window || window.isMinimized) return null;

  const isActive = activeWindowId === windowId;

  return (
    <motion.div
      drag={!window.isMaximized}
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (!window.isMaximized) {
          updateWindowPosition(windowId, {
            x: window.position.x + info.offset.x,
            y: window.position.y + info.offset.y,
          });
        }
      }}
      initial={{ 
        x: window.position.x, 
        y: window.position.y, 
        scale: 0.95, 
        opacity: 0 
      }}
      animate={{ 
        x: window.isMaximized ? 0 : window.position.x, 
        y: window.isMaximized ? 0 : window.position.y,
        width: window.isMaximized ? '100%' : window.size.width,
        height: window.isMaximized ? 'calc(100% - 48px)' : window.size.height, // -48px for taskbar space
        scale: 1, 
        opacity: 1 
      }}
      style={{ zIndex: window.zIndex }}
      className={clsx(
        "absolute flex flex-col bg-os-panel border border-os-border rounded-lg shadow-2xl overflow-hidden",
        isActive ? "ring-1 ring-os-border shadow-[0_0_15px_rgba(0,0,0,0.5)]" : "opacity-90"
      )}
      onPointerDown={() => focusWindow(windowId)}
    >
      {/* Title Bar */}
      <div 
        className="h-10 bg-os-panel border-b border-os-border flex items-center justify-between px-3 select-none cursor-default"
        onPointerDown={(e) => {
          focusWindow(windowId);
          if (!window.isMaximized) dragControls.start(e);
        }}
        onDoubleClick={() => maximizeWindow(windowId)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-os-text">
           {/* We could add App Icon here */}
           <span>{window.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); minimizeWindow(windowId); }}
            className="p-1 hover:bg-white/10 rounded text-os-text"
          >
            <Minus size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); maximizeWindow(windowId); }}
            className="p-1 hover:bg-white/10 rounded text-os-text"
          >
             {window.isMaximized ? <Square size={14} /> : <Maximize2 size={14} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); closeWindow(windowId); }}
            className="p-1 hover:bg-red-500/80 rounded text-os-text"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-white overflow-hidden">
        {/* This is where we render the app component. 
            We need a way to map appId to component, or pass it in. 
            The Store has the config. */}
        <AppRenderer appId={window.appId} />
      </div>
    </motion.div>
  );
};

const AppRenderer = ({ appId }: { appId: string }) => {
  const apps = useOSStore(state => state.apps);
  const app = apps.find(a => a.id === appId);
  
  if (!app) return <div className="p-4 text-red-500">App not found</div>;
  
  const Component = app.component;
  return <Component />;
};

