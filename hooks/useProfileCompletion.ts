'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';

const DISMISS_KEY = 'contentpro_profile_reminder_dismissed';
const DISMISS_DAYS = 7;

interface UseProfileCompletionReturn {
  completionPercent: number;
  completionLabel: string;
  shouldShowReminder: boolean;
  dismissReminder: () => void;
}

export function useProfileCompletion(): UseProfileCompletionReturn {
  const { profile } = useAuthStore();
  const [dismissed, setDismissed] = useState(true);

  const completionPercent = profile?.profile_completion_percent || 0;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) { setDismissed(false); return; }
      const ts = parseInt(raw, 10);
      const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
      setDismissed(daysSince < DISMISS_DAYS);
    } catch { setDismissed(false); }
  }, []);

  const dismissReminder = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  const shouldShowReminder = !dismissed && completionPercent < 50;

  const completionLabel = useMemo(() => {
    if (completionPercent === 100) return 'Profile complete!';
    if (completionPercent >= 80) return 'Almost there!';
    if (completionPercent >= 50) return 'Good progress';
    if (completionPercent >= 25) return 'Getting started';
    return 'Incomplete profile';
  }, [completionPercent]);

  return { completionPercent, completionLabel, shouldShowReminder, dismissReminder };
}