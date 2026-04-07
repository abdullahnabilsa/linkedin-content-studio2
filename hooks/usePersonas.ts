'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { useAuthStore } from '@/stores/authStore';
import { usePersonaStore } from '@/stores/personaStore';
import type { Persona, CreatePersonaInput, UpdatePersonaInput } from '@/types/persona';
import type { PersonaCategory } from '@/types/persona-category';

interface UsePersonasReturn {
  /** All personas available to the current user (basic + premium + own custom) */
  personas: Persona[];
  /** Only basic type personas */
  basicPersonas: Persona[];
  /** Only premium type personas */
  premiumPersonas: Persona[];
  /** Only the current user's custom personas */
  customPersonas: Persona[];
  /** All active persona categories */
  categories: PersonaCategory[];
  /** Currently selected persona from the store */
  activePersona: Persona | null;
  /** Set the active persona in the store */
  setActivePersona: (persona: Persona | null) => void;
  /** Clear the active persona */
  clearPersona: () => void;
  /** Create a new custom persona */
  createPersona: (data: CreatePersonaInput) => Promise<Persona>;
  /** Update an existing custom persona */
  updatePersona: (id: string, data: UpdatePersonaInput) => Promise<Persona>;
  /** Delete a custom persona */
  deletePersona: (id: string) => Promise<void>;
  /** Number of custom personas owned by the current user */
  personaCount: number;
  /** Maximum custom personas allowed (3 for free, Infinity for premium/admin) */
  maxPersonas: number;
  /** Check whether a free user can trial a premium persona today */
  canTryPremium: (personaId: string) => Promise<boolean>;
  /** Number of distinct premium personas trialled today */
  premiumTrialsToday: number;
  /** System-config maximum premium trials per day */
  maxPremiumTrialsPerDay: number;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Last error encountered */
  error: string | null;
  /** Re-fetch all personas and categories from the server */
  refresh: () => Promise<void>;
  /** Filter personas by category id (null = all) */
  filterByCategory: (categoryId: string | null) => Persona[];
  /** Search personas by text query */
  searchPersonas: (query: string) => Persona[];
}

export function usePersonas(): UsePersonasReturn {
  const supabase = createBrowserClient();
  const { user, profile } = useAuthStore();
  const { activePersona, setActivePersona: storeSetActive, clearPersona: storeClear } = usePersonaStore();

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [categories, setCategories] = useState<PersonaCategory[]>([]);
  const [premiumTrialsToday, setPremiumTrialsToday] = useState<number>(0);
  const [maxPremiumTrialsPerDay, setMaxPremiumTrialsPerDay] = useState<number>(5);
  const [maxCustomFree, setMaxCustomFree] = useState<number>(3);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = profile?.role ?? 'free';
  const userId = user?.id ?? null;

  /* ── derived lists ────────────────────────────────────── */
  const basicPersonas = useMemo(
    () => personas.filter((p) => p.type === 'basic'),
    [personas],
  );
  const premiumPersonas = useMemo(
    () => personas.filter((p) => p.type === 'premium'),
    [personas],
  );
  const customPersonas = useMemo(
    () => personas.filter((p) => p.type === 'custom' && p.user_id === userId),
    [personas, userId],
  );

  const personaCount = customPersonas.length;

  const maxPersonas = useMemo(() => {
    if (userRole === 'admin' || userRole === 'premium') return Infinity;
    return maxCustomFree;
  }, [userRole, maxCustomFree]);

  /* ── fetch system config values ───────────────────────── */
  const fetchSystemConfig = useCallback(async () => {
    try {
      const { data: configs, error: cfgErr } = await supabase
        .from('system_config')
        .select('key, value, value_type')
        .in('key', ['max_premium_trials_per_day', 'max_custom_personas_free']);

      if (cfgErr) throw cfgErr;

      if (configs) {
        for (const cfg of configs) {
          if (cfg.key === 'max_premium_trials_per_day') {
            setMaxPremiumTrialsPerDay(
              cfg.value_type === 'integer' ? parseInt(cfg.value, 10) : 5,
            );
          }
          if (cfg.key === 'max_custom_personas_free') {
            setMaxCustomFree(
              cfg.value_type === 'integer' ? parseInt(cfg.value, 10) : 3,
            );
          }
        }
      }
    } catch {
      /* fall back to defaults silently */
    }
  }, [supabase]);

  /* ── fetch personas ───────────────────────────────────── */
  const fetchPersonas = useCallback(async () => {
    if (!userId) return;

    try {
      /* basic + premium personas visible to everyone */
      const { data: publicPersonas, error: pubErr } = await supabase
        .from('personas')
        .select('*')
        .in('type', ['basic', 'premium'])
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (pubErr) throw pubErr;

      /* user's own custom personas */
      const { data: userCustom, error: custErr } = await supabase
        .from('personas')
        .select('*')
        .eq('type', 'custom')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (custErr) throw custErr;

      const combined: Persona[] = [
        ...(publicPersonas ?? []),
        ...(userCustom ?? []),
      ];

      setPersonas(combined);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch personas';
      setError(message);
    }
  }, [supabase, userId]);

  /* ── fetch categories ─────────────────────────────────── */
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: catErr } = await supabase
        .from('persona_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (catErr) throw catErr;
      setCategories(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(message);
    }
  }, [supabase]);

  /* ── fetch premium trial count for today ──────────────── */
  const fetchPremiumTrials = useCallback(async () => {
    if (!userId || userRole !== 'free') {
      setPremiumTrialsToday(0);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const { count, error: trialErr } = await supabase
        .from('premium_persona_daily_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('usage_date', today);

      if (trialErr) throw trialErr;
      setPremiumTrialsToday(count ?? 0);
    } catch {
      /* silently default to 0 */
    }
  }, [supabase, userId, userRole]);

  /* ── initial load ─────────────────────────────────────── */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([
      fetchSystemConfig(),
      fetchPersonas(),
      fetchCategories(),
      fetchPremiumTrials(),
    ]);
    setIsLoading(false);
  }, [fetchSystemConfig, fetchPersonas, fetchCategories, fetchPremiumTrials]);

  useEffect(() => {
    if (userId) {
      refresh();
    }
  }, [userId, refresh]);

  /* ── set / clear active persona ───────────────────────── */
  const setActivePersona = useCallback(
    (persona: Persona | null) => {
      storeSetActive(persona);
    },
    [storeSetActive],
  );

  const clearPersona = useCallback(() => {
    storeClear();
  }, [storeClear]);

  /* ── create custom persona ────────────────────────────── */
  const createPersona = useCallback(
    async (data: CreatePersonaInput): Promise<Persona> => {
      if (!userId) throw new Error('Not authenticated');

      /* enforce limit for free users */
      if (userRole === 'free' && personaCount >= maxCustomFree) {
        throw new Error('Custom persona limit reached. Upgrade to premium for unlimited personas.');
      }

      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message ?? 'Failed to create persona');
      }

      const created: Persona = result.data;
      setPersonas((prev) => [...prev, created]);
      return created;
    },
    [userId, userRole, personaCount, maxCustomFree],
  );

  /* ── update custom persona ────────────────────────────── */
  const updatePersona = useCallback(
    async (id: string, data: UpdatePersonaInput): Promise<Persona> => {
      if (!userId) throw new Error('Not authenticated');

      const response = await fetch('/api/personas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message ?? 'Failed to update persona');
      }

      const updated: Persona = result.data;
      setPersonas((prev) => prev.map((p) => (p.id === id ? updated : p)));
      /* if this was the active persona, refresh it */
      if (activePersona?.id === id) {
        storeSetActive(updated);
      }
      return updated;
    },
    [userId, activePersona, storeSetActive],
  );

  /* ── delete custom persona ────────────────────────────── */
  const deletePersona = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) throw new Error('Not authenticated');

      const response = await fetch('/api/personas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message ?? 'Failed to delete persona');
      }

      setPersonas((prev) => prev.filter((p) => p.id !== id));
      if (activePersona?.id === id) {
        storeClear();
      }
    },
    [userId, activePersona, storeClear],
  );

  /* ── premium persona trial check ─────────────────────── */
  const canTryPremium = useCallback(
    async (personaId: string): Promise<boolean> => {
      /* premium and admin always allowed */
      if (userRole === 'admin' || userRole === 'premium') return true;
      if (!userId) return false;

      try {
        const response = await fetch('/api/persona-trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personaId }),
        });

        const result = await response.json();

        if (!result.success) return false;

        if (result.data.canUse) {
          /* refresh the trial counter after recording */
          setPremiumTrialsToday(maxPremiumTrialsPerDay - (result.data.remainingToday ?? 0));
          return true;
        }

        return false;
      } catch {
        return false;
      }
    },
    [userId, userRole, maxPremiumTrialsPerDay],
  );

  /* ── filter by category ───────────────────────────────── */
  const filterByCategory = useCallback(
    (categoryId: string | null): Persona[] => {
      if (!categoryId) return personas;
      return personas.filter((p) => p.category_id === categoryId);
    },
    [personas],
  );

  /* ── search personas ──────────────────────────────────── */
  const searchPersonas = useCallback(
    (query: string): Persona[] => {
      if (!query.trim()) return personas;
      const lowerQuery = query.toLowerCase();
      return personas.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          (p.name_en?.toLowerCase().includes(lowerQuery) ?? false) ||
          p.description.toLowerCase().includes(lowerQuery) ||
          (p.description_en?.toLowerCase().includes(lowerQuery) ?? false),
      );
    },
    [personas],
  );

  return {
    personas,
    basicPersonas,
    premiumPersonas,
    customPersonas,
    categories,
    activePersona,
    setActivePersona,
    clearPersona,
    createPersona,
    updatePersona,
    deletePersona,
    personaCount,
    maxPersonas,
    canTryPremium,
    premiumTrialsToday,
    maxPremiumTrialsPerDay,
    isLoading,
    error,
    refresh,
    filterByCategory,
    searchPersonas,
  };
}