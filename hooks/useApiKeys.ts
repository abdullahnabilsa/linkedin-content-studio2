'use client';

/**
 * useApiKeys Hook
 * 
 * Manages the user's private API keys: CRUD operations,
 * limit enforcement, and platform availability checks.
 */

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { useAuthStore } from '@/stores/authStore';
import type { ApiKey, ApiKeyPlatform } from '@/types/api-key';

/** Shape returned by this hook */
interface UseApiKeysReturn {
  /** List of user's private API keys (masked) */
  apiKeys: ApiKey[];
  /** Whether the initial fetch is loading */
  isLoading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Add a new API key */
  addKey: (platform: ApiKeyPlatform, key: string, label: string) => Promise<boolean>;
  /** Update an existing key */
  updateKey: (id: string, updates: { label?: string; key?: string; is_active?: boolean }) => Promise<boolean>;
  /** Delete an API key */
  removeKey: (id: string) => Promise<boolean>;
  /** Current number of keys */
  keyCount: number;
  /** Maximum allowed keys for this user's plan */
  maxKeys: number;
  /** Whether the user can add more keys */
  canAddKey: boolean;
  /** Get the key row for a specific platform (if exists) */
  getKeyForPlatform: (platform: ApiKeyPlatform) => ApiKey | undefined;
  /** Check if user has a private key for a platform */
  hasPrivateKey: (platform: ApiKeyPlatform) => boolean;
  /** Refresh keys from the database */
  refresh: () => Promise<void>;
}

/** Default max keys for free users */
const DEFAULT_MAX_KEYS_FREE = 2;
const DEFAULT_MAX_KEYS_PREMIUM = 20;

export function useApiKeys(): UseApiKeysReturn {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxKeys, setMaxKeys] = useState(DEFAULT_MAX_KEYS_FREE);

  const { user, profile } = useAuthStore();
  const supabase = createBrowserClient();

  /** Fetch the max keys limit from system_config */
  const fetchMaxKeys = useCallback(async () => {
    const role = profile?.role || 'free';
    if (role === 'admin') {
      setMaxKeys(100);
      return;
    }

    const configKey = role === 'premium' ? 'max_api_keys_premium' : 'max_api_keys_free';

    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', configKey)
      .single();

    if (data?.value) {
      setMaxKeys(parseInt(data.value, 10));
    } else {
      setMaxKeys(role === 'premium' ? DEFAULT_MAX_KEYS_PREMIUM : DEFAULT_MAX_KEYS_FREE);
    }
  }, [profile?.role, supabase]);

  /** Fetch all private keys for this user */
  const fetchKeys = useCallback(async () => {
    if (!user?.id) {
      setApiKeys([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('api_keys')
        .select('id, platform, label, is_active, is_global, last_used_at, created_at')
        .eq('user_id', user.id)
        .eq('is_global', false)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setApiKeys((data || []) as ApiKey[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch API keys';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, supabase]);

  /** Initialize on mount and when user changes */
  useEffect(() => {
    fetchKeys();
    fetchMaxKeys();
  }, [fetchKeys, fetchMaxKeys]);

  /** Add a new API key */
  const addKey = useCallback(async (
    platform: ApiKeyPlatform,
    key: string,
    label: string
  ): Promise<boolean> => {
    if (!user?.id) {
      setError('Not authenticated');
      return false;
    }

    /* Check limits */
    if (apiKeys.length >= maxKeys) {
      setError('Maximum number of API keys reached. Upgrade to add more.');
      return false;
    }

    /* Check if platform already has a key */
    const existing = apiKeys.find((k) => k.platform === platform);
    if (existing) {
      setError(`You already have an API key for ${platform}. Delete it first to add a new one.`);
      return false;
    }

    setError(null);

    try {
      /* Send to API route for server-side encryption */
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          key,
          label,
          isGlobal: false,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.message || 'Failed to add API key');
        return false;
      }

      /* Refresh the list */
      await fetchKeys();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add API key';
      setError(message);
      return false;
    }
  }, [user?.id, apiKeys, maxKeys, fetchKeys]);

  /** Update an existing key */
  const updateKey = useCallback(async (
    id: string,
    updates: { label?: string; key?: string; is_active?: boolean }
  ): Promise<boolean> => {
    if (!user?.id) {
      setError('Not authenticated');
      return false;
    }

    setError(null);

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.message || 'Failed to update API key');
        return false;
      }

      await fetchKeys();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update API key';
      setError(message);
      return false;
    }
  }, [user?.id, fetchKeys]);

  /** Delete an API key */
  const removeKey = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.id) {
      setError('Not authenticated');
      return false;
    }

    setError(null);

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.message || 'Failed to delete API key');
        return false;
      }

      await fetchKeys();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete API key';
      setError(message);
      return false;
    }
  }, [user?.id, fetchKeys]);

  /** Get key for a specific platform */
  const getKeyForPlatform = useCallback(
    (platform: ApiKeyPlatform): ApiKey | undefined => {
      return apiKeys.find((k) => k.platform === platform && k.is_active);
    },
    [apiKeys]
  );

  /** Check if user has a private key for a platform */
  const hasPrivateKey = useCallback(
    (platform: ApiKeyPlatform): boolean => {
      return apiKeys.some((k) => k.platform === platform && k.is_active);
    },
    [apiKeys]
  );

  return {
    apiKeys,
    isLoading,
    error,
    addKey,
    updateKey,
    removeKey,
    keyCount: apiKeys.length,
    maxKeys,
    canAddKey: apiKeys.length < maxKeys,
    getKeyForPlatform,
    hasPrivateKey,
    refresh: fetchKeys,
  };
}