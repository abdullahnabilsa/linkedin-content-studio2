'use client';

/**
 * LinkedInScoreDisplay
 *
 * Renders a rich score card when the AI response contains a
 * structured LinkedIn Score Report. Detects the report format,
 * parses scores, and renders animated progress bars.
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { parseScoreResponse, scoreColor, scoreBarColor } from '@/lib/linkedin-score';
import type { ParsedScore } from '@/lib/linkedin-score';
import { BarChart3, RefreshCw, Copy, Lightbulb } from 'lucide-react';

interface LinkedInScoreDisplayProps {
  /** Raw AI response text that may contain a score report */
  content: string;
  /** Called when user clicks "Improve Automatically" */
  onImprove?: () => void;
  /** Called when user clicks "Copy Post" */
  onCopyPost?: () => void;
}

interface ScoreRowProps {
  label: string;
  score: number;
  delay: number;
}

function ScoreRow({ label, score, delay }: ScoreRowProps) {
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(score), delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-secondary)] w-36 shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${scoreBarColor(score)}`}
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-10 text-end ${scoreColor(score)}`}>
        {score}
      </span>
    </div>
  );
}

export function LinkedInScoreDisplay({
  content,
  onImprove,
  onCopyPost,
}: LinkedInScoreDisplayProps) {
  const t = useTranslations('chat');
  const [animatedOverall, setAnimatedOverall] = useState(0);

  const parsed: ParsedScore | null = useMemo(
    () => parseScoreResponse(content),
    [content]
  );

  /* Animate overall score counter */
  useEffect(() => {
    if (!parsed) return;
    let current = 0;
    const target = parsed.overall;
    const step = Math.max(1, Math.floor(target / 40));
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setAnimatedOverall(current);
      if (current >= target) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [parsed]);

  if (!parsed) return null;

  const scoreRows: { label: string; score: number }[] = [
    { label: t('score.hookPower', { defaultMessage: 'Hook Power' }), score: parsed.hookPower },
    { label: t('score.readability', { defaultMessage: 'Readability' }), score: parsed.readability },
    { label: t('score.callToAction', { defaultMessage: 'Call to Action' }), score: parsed.callToAction },
    { label: t('score.formatting', { defaultMessage: 'Formatting' }), score: parsed.formatting },
    { label: t('score.hashtagUsage', { defaultMessage: 'Hashtag Usage' }), score: parsed.hashtagUsage },
    { label: t('score.engagement', { defaultMessage: 'Engagement Potential' }), score: parsed.engagementPotential },
    { label: t('score.length', { defaultMessage: 'Length' }), score: parsed.length },
  ];

  return (
    <div
      className="rounded-2xl border border-emerald-500/30 bg-[var(--bg-secondary)]
                 overflow-hidden shadow-lg shadow-emerald-900/5 my-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-500/20
                      bg-gradient-to-r from-emerald-500/5 to-transparent">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-[var(--text-primary)]">
            {t('score.title', { defaultMessage: 'LinkedIn Score' })}
          </h3>
        </div>
        <div className={`text-3xl font-black tabular-nums ${scoreColor(parsed.overall)}`}>
          {animatedOverall}
          <span className="text-base font-normal text-[var(--text-tertiary)]">/100</span>
        </div>
      </div>

      {/* Overall bar */}
      <div className="px-5 pt-4 pb-2">
        <div className="h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${scoreBarColor(parsed.overall)}`}
            style={{ width: `${animatedOverall}%` }}
          />
        </div>
      </div>

      {/* Individual scores */}
      <div className="px-5 py-3 space-y-2.5">
        {scoreRows.map((row, idx) => (
          <ScoreRow key={row.label} label={row.label} score={row.score} delay={200 + idx * 100} />
        ))}
      </div>

      {/* Tips */}
      {parsed.tips.length > 0 && (
        <div className="mx-5 mb-4 p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {t('score.tips', { defaultMessage: 'Improvement Tips' })}
            </span>
          </div>
          <ol className="space-y-1.5">
            {parsed.tips.map((tip, idx) => (
              <li key={idx} className="text-xs text-[var(--text-secondary)] flex gap-2">
                <span className="text-emerald-400 font-bold shrink-0">{idx + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-[var(--border-primary)]">
        {onImprove && (
          <button
            onClick={onImprove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                       bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('score.improve', { defaultMessage: 'Improve Automatically' })}
          </button>
        )}
        {onCopyPost && (
          <button
            onClick={onCopyPost}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                       bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]
                       hover:text-[var(--text-primary)] border border-[var(--border-primary)] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {t('score.copyPost', { defaultMessage: 'Copy Post' })}
          </button>
        )}
      </div>
    </div>
  );
}