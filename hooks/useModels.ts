'use client';

/**
 * useModels Hook
 * 
 * Fetches and manages available AI models for the currently
 * selected platform. Automatically determines whether to use
 * public or private API type based on key availability.
 * Caches private model lists in localStorage for 1 hour.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePlatformStore } from '@/stores/platformStore';
import { useApiKeys } from '@/hooks/useApiKeys';
import type { AIModel } from '@/types/platform';

/** Cache expiry: 1 hour in milliseconds */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** LocalStorage cache key prefix */
const CACHE_PREFIX = 'contentpro_models_';

interface CachedModels {
  models: AIModel[];
  timestamp: number;
}

interface UseModelsReturn {
  /** Available models for current platform + apiType */
  models: AIModel[];
  /** Whether models are currently loading */
  isLoading: boolean;
  /** Error message if fetching failed */
  error: string | null;
  /** Currently selected model */
  selectedModel: AIModel | null;
  /** Set the selected model */
  setSelectedModel: (model: AIModel) => void;
  /** Force refresh models (bypasses cache) */
  refreshModels: () => Promise<void>;
  /** Current API type being used */
  apiType: 'public' | 'private';
}

/**
 * Reads cached models from localStorage.
 * Returns null if cache is missing or expired.
 */
function readCache(platform: string, apiType: string): AIModel[] | null {
  try {
    const key = `${CACHE_PREFIX}${platform}_${apiType}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached: CachedModels = JSON.parse(raw);
    const age = Date.now() - cached.timestamp;

    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return cached.models;
  } catch {
    return null;
  }
}

/**
 * Writes models to localStorage cache.
 */
function writeCache(platform: string, apiType: string, models: AIModel[]): void {
  try {
    const key = `${CACHE_PREFIX}${platform}_${apiType}`;
    const entry: CachedModels = {
      models,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* Silently fail if storage is full */
  }
}

export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState<AIModel | null>(null);

  const {
    currentPlatform,
    apiType: storeApiType,
    setApiType,
    setCurrentModel,
  } = usePlatformStore();

  const { hasPrivateKey } = useApiKeys();

  /* Prevent double-fetching on mount */
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<string>('');

  /**
   * Determines the API type to use based on key availability.
   * Private key takes priority.
   */
  const resolveApiType = useCallback((): 'public' | 'private' => {
    if (currentPlatform && hasPrivateKey(currentPlatform)) {
      return 'private';
    }
    return 'public';
  }, [currentPlatform, hasPrivateKey]);

  /** Fetch models from the API */
  const fetchModels = useCallback(async (forceRefresh = false) => {
    if (!currentPlatform) {
      setModels([]);
      return;
    }

    const resolvedApiType = resolveApiType();
    const fetchKey = `${currentPlatform}_${resolvedApiType}`;

    /* Prevent duplicate requests */
    if (fetchingRef.current && lastFetchRef.current === fetchKey) {
      return;
    }

    /* Update store with resolved API type */
    setApiType(resolvedApiType);

    /* Check cache first (for private models) */
    if (!forceRefresh && resolvedApiType === 'private') {
      const cached = readCache(currentPlatform, resolvedApiType);
      if (cached && cached.length > 0) {
        setModels(cached);
        /* Auto-select first model if none selected */
        if (!selectedModel || !cached.find((m) => m.id === selectedModel.id)) {
          setSelectedModelState(cached[0]);
          setCurrentModel(cached[0].id);
        }
        return;
      }
    }

    fetchingRef.current = true;
    lastFetchRef.current = fetchKey;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        platform: currentPlatform,
        apiType: resolvedApiType,
      });

      const response = await fetch(`/api/models?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch models');
      }

      const fetchedModels: AIModel[] = (result.data || []).map(
        (m: { id: string; name: string; dbId?: string; sortOrder?: number }) => ({
          id: m.id,
          name: m.name,
          dbId: m.dbId,
          sortOrder: m.sortOrder ?? 0,
        })
      );

      setModels(fetchedModels);

      /* Cache private model results */
      if (resolvedApiType === 'private' && fetchedModels.length > 0) {
        writeCache(currentPlatform, resolvedApiType, fetchedModels);
      }

      /* Auto-select first model if none selected or current not in list */
      if (fetchedModels.length > 0) {
        const currentStillAvailable = selectedModel
          ? fetchedModels.find((m) => m.id === selectedModel.id)
          : null;

        if (!currentStillAvailable) {
          setSelectedModelState(fetchedModels[0]);
          setCurrentModel(fetchedModels[0].id);
        }
      } else {
        setSelectedModelState(null);
        setCurrentModel('');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch models';
      setError(message);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [currentPlatform, resolveApiType, selectedModel, setApiType, setCurrentModel]);

  /** Set selected model and update store */
  const setSelectedModel = useCallback((model: AIModel) => {
    setSelectedModelState(model);
    setCurrentModel(model.id);
  }, [setCurrentModel]);

  /** Force refresh (clears cache) */
  const refreshModels = useCallback(async () => {
    await fetchModels(true);
  }, [fetchModels]);

  /* Fetch models when platform changes */
  useEffect(() => {
    fetchModels();
  }, [currentPlatform, fetchModels]);

  return {
    models,
    isLoading,
    error,
    selectedModel,
    setSelectedModel,
    refreshModels,
    apiType: storeApiType || resolveApiType(),
  };
}