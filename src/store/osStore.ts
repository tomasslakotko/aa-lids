import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppConfig, WindowState } from '../types';

interface OSStore {
  apps: AppConfig[];
  windows: WindowState[];
  activeWindowId: string | null;
  zIndexCounter: number;
  
  registerApp: (app: AppConfig) => void;
  launchApp: (appId: string) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  updateWindowPosition: (windowId: string, position: { x: number; y: number }) => void;
  updateWindowSize: (windowId: string, size: { width: number; height: number }) => void;
}

export const useOSStore = create<OSStore>()(
  persist(
    (set) => ({
  apps: [],
  windows: [],
  activeWindowId: null,
  zIndexCounter: 100,

  registerApp: (app) => set((state) => {
    if (state.apps.find(a => a.id === app.id)) return state;
    return { apps: [...state.apps, app] };
  }),

  launchApp: (appId) => set((state) => {
    const app = state.apps.find((a) => a.id === appId);
    if (!app) return state;

    // If app allows only single instance and it's already open, focus it
    // For now, allow multiple instances or just check if one exists? 
    // Let's allow multiple for generic OS feel, but maybe single for these specific apps if needed.
    // For simplicity, let's spawn a new window every time for now.
    
    const newWindowId = `${appId}-${Date.now()}`;
    const newZIndex = state.zIndexCounter + 1;

    const newWindow: WindowState = {
      id: newWindowId,
      appId: app.id,
      title: app.title,
      isMinimized: false,
      isMaximized: false,
      zIndex: newZIndex,
      position: { x: 50 + (state.windows.length * 20), y: 50 + (state.windows.length * 20) },
      size: { width: app.defaultWidth || 800, height: app.defaultHeight || 600 },
    };

    return {
      windows: [...state.windows, newWindow],
      activeWindowId: newWindowId,
      zIndexCounter: newZIndex,
    };
  }),

  closeWindow: (windowId) => set((state) => ({
    windows: state.windows.filter((w) => w.id !== windowId),
    activeWindowId: state.activeWindowId === windowId ? null : state.activeWindowId,
  })),

  minimizeWindow: (windowId) => set((state) => ({
    windows: state.windows.map((w) => 
      w.id === windowId ? { ...w, isMinimized: !w.isMinimized } : w
    ),
  })),

  maximizeWindow: (windowId) => set((state) => ({
    windows: state.windows.map((w) => 
      w.id === windowId ? { ...w, isMaximized: !w.isMaximized } : w
    ),
    activeWindowId: windowId,
    zIndexCounter: state.zIndexCounter + 1, // Bring to front on maximize
  })),

  focusWindow: (windowId) => set((state) => {
    if (state.activeWindowId === windowId) return state;
    const newZIndex = state.zIndexCounter + 1;
    return {
      activeWindowId: windowId,
      zIndexCounter: newZIndex,
      windows: state.windows.map((w) => 
        w.id === windowId ? { ...w, zIndex: newZIndex, isMinimized: false } : w
      ),
    };
  }),

  updateWindowPosition: (windowId, position) => set((state) => ({
    windows: state.windows.map((w) => 
      w.id === windowId ? { ...w, position } : w
    ),
  })),

  updateWindowSize: (windowId, size) => set((state) => ({
    windows: state.windows.map((w) => 
      w.id === windowId ? { ...w, size } : w
    ),
  })),
    }),
    {
      name: 'os-storage', // localStorage key
      // Only persist windows, activeWindowId, and zIndexCounter
      // Don't persist apps as they're registered on app start
      partialize: (state) => ({
        windows: state.windows,
        activeWindowId: state.activeWindowId,
        zIndexCounter: state.zIndexCounter,
      }),
    }
  )
);

