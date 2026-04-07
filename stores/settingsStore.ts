import create from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  lastUsedPlatform: string;
  lastUsedModel: string;
  lastUsedPersonaId: string;
  updateLastUsed: (platform?: string, model?: string, personaId?: string) => void;
}

export const useSettingsStore = create<SettingsState>(persist((set) => ({
  lastUsedPlatform: '',
  lastUsedModel: '',
  lastUsedPersonaId: '',
  updateLastUsed: (platform, model, personaId) => set({ 
    lastUsedPlatform: platform || '', 
    lastUsedModel: model || '', 
    lastUsedPersonaId: personaId || '' 
  }),
}), {
  name: 'settings-storage',
}));