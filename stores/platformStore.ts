/**
 * Platform Store
 * 
 * Manages the currently selected AI platform, model, and API type.
 * Persisted to localStorage so selections survive page reloads.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiKeyPlatform } from '@/types/api-key';

interface PlatformState {
  /** Currently selected AI platform */
  currentPlatform: ApiKeyPlatform | null;
  /** Currently selected model ID */
  currentModel: string;
  /** Whether using public or private API key */
  apiType: 'public' | 'private';
  /** Set the current platform */
  setCurrentPlatform: (platform: ApiKeyPlatform) => void;
  /** Set the current model */
  setCurrentModel: (modelId: string) => void;
  /** Set the API type */
  setApiType: (type: 'public' | 'private') => void;
  /** Reset to defaults */
  reset: () => void;
}

const DEFAULT_STATE = {
  currentPlatform: 'openrouter' as ApiKeyPlatform,
  currentModel: '',
  apiType: 'public' as const,
};

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setCurrentPlatform: (platform) =>
        set({
          currentPlatform: platform,
          /* Reset model when platform changes */
          currentModel: '',
        }),

      setCurrentModel: (modelId) =>
        set({ currentModel: modelId }),

      setApiType: (type) =>
        set({ apiType: type }),

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'contentpro-platform-store',
      partialize: (state) => ({
        currentPlatform: state.currentPlatform,
        currentModel: state.currentModel,
        apiType: state.apiType,
      }),
    }
  )
);