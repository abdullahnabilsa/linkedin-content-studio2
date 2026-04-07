'use client';

/**
 * OnboardingTour
 *
 * A 3-step guided tour that highlights key UI areas after the
 * ProfileWizard completes. Uses query selectors to locate targets.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { TourStep } from '@/components/onboarding/TourStep';
import { useAuthStore } from '@/stores/authStore';
import { createBrowserClient } from '@/lib/supabase-client';

interface TourStepDef {
  targetSelector: string;
  titleKey: string;
  messageKey: string;
  fallbackTitle: string;
  fallbackMessage: string;
}

const TOUR_STEPS: TourStepDef[] = [
  {
    targetSelector: '[data-tour="personas"]',
    titleKey: 'tour.step1Title',
    messageKey: 'tour.step1Message',
    fallbackTitle: 'Your AI Personas',
    fallbackMessage: 'Choose from expert personas that shape how the AI writes for you. Each persona has a unique style and expertise.',
  },
  {
    targetSelector: '[data-tour="selectors"]',
    titleKey: 'tour.step2Title',
    messageKey: 'tour.step2Message',
    fallbackTitle: 'Choose Platform & Model',
    fallbackMessage: 'Select from 7 AI platforms and dozens of models. Use your own API keys for unlimited access.',
  },
  {
    targetSelector: '[data-tour="input"]',
    titleKey: 'tour.step3Title',
    messageKey: 'tour.step3Message',
    fallbackTitle: 'Start Creating!',
    fallbackMessage: 'Type your request, pick a format template, and let the AI craft your perfect LinkedIn post.',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const t = useTranslations('onboarding');
  const { user } = useAuthStore();
  const supabase = createBrowserClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  /* Find target element for current step */
  useEffect(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    const findTarget = () => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    findTarget();
    const timer = setTimeout(findTarget, 300);
    window.addEventListener('resize', findTarget);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', findTarget);
    };
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleComplete = useCallback(async () => {
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      useAuthStore.getState().setProfile({
        ...useAuthStore.getState().profile!,
        onboarding_completed: true,
      });
    }
    onComplete();
  }, [user?.id, supabase, onComplete]);

  const step = TOUR_STEPS[currentStep];
  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Overlay with hole cut-out */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%" height="100%"
          fill="rgba(0,0,0,0.7)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: 'all' }}
          onClick={handleComplete}
        />
      </svg>

      {/* Highlight border */}
      {targetRect && (
        <div
          className="absolute border-2 border-emerald-400 rounded-xl pointer-events-none
                     shadow-[0_0_0_4000px_rgba(0,0,0,0.65)] animate-pulse"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Step card */}
      <TourStep
        title={t(step.titleKey, { defaultMessage: step.fallbackTitle })}
        message={t(step.messageKey, { defaultMessage: step.fallbackMessage })}
        step={currentStep + 1}
        totalSteps={TOUR_STEPS.length}
        targetRect={targetRect}
        onNext={handleNext}
        onPrev={currentStep > 0 ? handlePrev : undefined}
        onSkip={handleComplete}
        isLast={currentStep === TOUR_STEPS.length - 1}
      />
    </div>
  );
}