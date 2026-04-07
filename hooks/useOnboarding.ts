'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { createBrowserClient } from '@/lib/supabase-client';

interface UseOnboardingReturn {
  wizardActive: boolean;
  tourActive: boolean;
  startWizard: () => void;
  completeWizard: () => void;
  startTour: () => void;
  completeTour: () => void;
  restart: () => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const { user, profile } = useAuthStore();
  const supabase = createBrowserClient();

  const [wizardActive, setWizardActive] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  /* Determine if wizard should show on mount */
  useEffect(() => {
    if (!user?.id || !profile) return;
    if (!profile.onboarding_completed) {
      /* Check if professional profile exists */
      supabase
        .from('user_professional_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (!data) setWizardActive(true);
        });
    }
  }, [user?.id, profile, supabase]);

  const startWizard = useCallback(() => setWizardActive(true), []);

  const completeWizard = useCallback(() => {
    setWizardActive(false);
    setTourActive(true);
  }, []);

  const startTour = useCallback(() => setTourActive(true), []);

  const completeTour = useCallback(() => setTourActive(false), []);

  const restart = useCallback(async () => {
    if (!user?.id) return;
    await supabase
      .from('profiles')
      .update({ onboarding_completed: false, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    useAuthStore.getState().setProfile({
      ...useAuthStore.getState().profile!,
      onboarding_completed: false,
    });
    setWizardActive(true);
  }, [user?.id, supabase]);

  return { wizardActive, tourActive, startWizard, completeWizard, startTour, completeTour, restart };
}