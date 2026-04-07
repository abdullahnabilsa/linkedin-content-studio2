import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PersonaState {
  activePersonaId: string | null;
  activeFormatTemplate: string;
  setActivePersona: (id: string | null) => void;
  setActiveFormatTemplate: (template: string) => void;
  reset: () => void;
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      activePersonaId: null,
      activeFormatTemplate: 'default',

      setActivePersona: (id) => set({ activePersonaId: id }),
      setActiveFormatTemplate: (template) => set({ activeFormatTemplate: template }),
      reset: () => set({ activePersonaId: null, activeFormatTemplate: 'default' }),
    }),
    {
      name: 'contentpro-persona-store',
      partialize: (state) => ({
        activePersonaId: state.activePersonaId,
        activeFormatTemplate: state.activeFormatTemplate,
      }),
    }
  )
);