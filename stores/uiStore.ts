import create from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: string;
  locale: string;
  wizardActive: boolean;
  tourActive: boolean;
  toggleSidebar: () => void;
  setTheme: (theme: string) => void;
  setLocale: (locale: string) => void;
}

export const useUIStore = create<UIState>(persist((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  theme: 'dark',
  locale: 'ar',
  wizardActive: false,
  tourActive: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  setLocale: (locale) => set({ locale }),
}), {
  name: 'ui-storage', // name of the item in the storage (must be unique)
}));