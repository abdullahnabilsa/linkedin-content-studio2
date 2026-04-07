'use client';

/**
 * ProfileWizard
 *
 * A 3-step on-boarding modal shown to new users who have not yet
 * filled in their professional profile. On completion (or skip)
 * the onboarding_completed flag is set and the onboarding tour starts.
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/authStore';
import { createBrowserClient } from '@/lib/supabase-client';
import { INDUSTRIES, LINKEDIN_GOALS } from '@/utils/constants';
import { X, ChevronRight, ChevronLeft, Rocket, Sparkles } from 'lucide-react';

interface ProfileWizardProps {
  onComplete: () => void;
}

export function ProfileWizard({ onComplete }: ProfileWizardProps) {
  const t = useTranslations('onboarding');
  const { user } = useAuthStore();
  const supabase = createBrowserClient();

  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const totalSteps = 3;

  const toggleGoal = useCallback((goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }, []);

  const saveAndClose = useCallback(async () => {
    if (!user?.id) return;
    setIsSaving(true);

    try {
      const resolvedIndustry = industry === 'other' ? customIndustry : industry;

      /* Upsert professional profile */
      await supabase.from('user_professional_profiles').upsert(
        {
          user_id: user.id,
          industry: resolvedIndustry || null,
          job_title: jobTitle || null,
          linkedin_goals: goals.length > 0 ? goals : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      /* Calculate rough completion */
      let filled = 0;
      if (resolvedIndustry) filled++;
      if (jobTitle) filled++;
      if (goals.length > 0) filled++;
      const pct = Math.round((filled / 15) * 100);

      /* Mark onboarding complete */
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          profile_completion_percent: pct,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      useAuthStore.getState().setProfile({
        ...useAuthStore.getState().profile!,
        onboarding_completed: true,
        profile_completion_percent: pct,
      });
    } catch {
      /* Non-blocking — wizard closes even on error */
    } finally {
      setIsSaving(false);
      onComplete();
    }
  }, [user?.id, industry, customIndustry, jobTitle, goals, supabase, onComplete]);

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      saveAndClose();
    }
  };

  const handleSkip = () => {
    saveAndClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-3xl border border-emerald-500/20
                      bg-[var(--bg-primary)] shadow-2xl overflow-hidden">
        {/* Close / Skip */}
        <button
          onClick={handleSkip}
          className="absolute top-4 end-4 p-2 rounded-lg text-[var(--text-tertiary)]
                     hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]
                     transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center">
          <Sparkles className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {t('wizard.title', { defaultMessage: 'Let\u2019s personalise your experience' })}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('wizard.subtitle', { defaultMessage: 'Quick 3-step setup for better AI results' })}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-8 bg-emerald-500'
                  : i < step
                    ? 'w-2 bg-emerald-500/50'
                    : 'w-2 bg-[var(--bg-tertiary)]'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-8 pb-6 min-h-[240px]">
          {/* Step 1 — Industry */}
          {step === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                {t('wizard.industryLabel', { defaultMessage: 'What\u2019s your industry?' })}
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-primary)]
                           bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm
                           focus:outline-none focus:border-emerald-500"
              >
                <option value="">{t('wizard.selectIndustry', { defaultMessage: 'Select your industry' })}</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind.id} value={ind.id}>{ind.label}</option>
                ))}
                <option value="other">{t('wizard.other', { defaultMessage: 'Other' })}</option>
              </select>
              {industry === 'other' && (
                <input
                  type="text"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  placeholder={t('wizard.customIndustry', { defaultMessage: 'Enter your industry' })}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border-primary)]
                             bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm
                             focus:outline-none focus:border-emerald-500"
                />
              )}
            </div>
          )}

          {/* Step 2 — Job Title */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                {t('wizard.jobTitleLabel', { defaultMessage: 'What\u2019s your job title?' })}
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t('wizard.jobTitlePlaceholder', { defaultMessage: 'e.g. Marketing Manager, CEO, Coach' })}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-primary)]
                           bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm
                           focus:outline-none focus:border-emerald-500"
              />
              <p className="text-xs text-[var(--text-tertiary)]">
                {t('wizard.jobTitleHint', { defaultMessage: 'This helps the AI understand your perspective' })}
              </p>
            </div>
          )}

          {/* Step 3 — LinkedIn Goals */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                {t('wizard.goalsLabel', { defaultMessage: 'What are your LinkedIn goals?' })}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LINKEDIN_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs text-start
                               font-medium transition-all ${
                      goals.includes(goal.id)
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-emerald-500/40'
                    }`}
                  >
                    <span>{goal.icon}</span>
                    <span>{goal.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-[var(--border-primary)]">
          <button
            onClick={handleSkip}
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {t('wizard.skip', { defaultMessage: 'Skip for now' })}
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium
                           text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                {t('wizard.back', { defaultMessage: 'Back' })}
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold
                         bg-emerald-600 hover:bg-emerald-500 text-white transition-colors
                         disabled:opacity-50"
            >
              {step === totalSteps - 1 ? (
                <>
                  <Rocket className="w-4 h-4" />
                  {isSaving
                    ? t('wizard.saving', { defaultMessage: 'Saving...' })
                    : t('wizard.getStarted', { defaultMessage: 'Get Started!' })}
                </>
              ) : (
                <>
                  {t('wizard.next', { defaultMessage: 'Next' })}
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}