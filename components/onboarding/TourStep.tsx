'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, PartyPopper } from 'lucide-react';

interface TourStepProps {
  title: string;
  message: string;
  step: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev?: () => void;
  onSkip: () => void;
  isLast: boolean;
}

export function TourStep({
  title, message, step, totalSteps,
  targetRect, onNext, onPrev, onSkip, isLast,
}: TourStepProps) {
  const t = useTranslations('onboarding');

  const position = useMemo(() => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const cardWidth = 320;
    const cardHeight = 180;
    const padding = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    /* Prefer below the target */
    let top = targetRect.bottom + padding;
    let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;

    /* If below would overflow, place above */
    if (top + cardHeight > vh - padding) {
      top = targetRect.top - cardHeight - padding;
    }

    /* Clamp horizontally */
    left = Math.max(padding, Math.min(left, vw - cardWidth - padding));
    top = Math.max(padding, top);

    return { top: `${top}px`, left: `${left}px`, transform: 'none' };
  }, [targetRect]);

  return (
    <div
      className="absolute z-10 w-80 rounded-2xl border border-emerald-500/30 bg-[var(--bg-primary)]
                 shadow-2xl shadow-emerald-900/10 p-5"
      style={position}
    >
      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i + 1 === step ? 'w-6 bg-emerald-500' : i + 1 < step ? 'w-3 bg-emerald-500/50' : 'w-3 bg-[var(--bg-tertiary)]'
            }`}
          />
        ))}
        <span className="ms-auto text-xs text-[var(--text-tertiary)]">{step}/{totalSteps}</span>
      </div>

      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">{message}</p>

      <div className="flex items-center justify-between">
        <button onClick={onSkip} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
          {t('tour.skip', { defaultMessage: 'Skip tour' })}
        </button>
        <div className="flex items-center gap-2">
          {onPrev && (
            <button onClick={onPrev} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
          )}
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold
                       bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            {isLast ? (
              <>
                <PartyPopper className="w-3.5 h-3.5" />
                {t('tour.finish', { defaultMessage: 'Start Creating!' })}
              </>
            ) : (
              <>
                {t('tour.next', { defaultMessage: 'Next' })}
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}