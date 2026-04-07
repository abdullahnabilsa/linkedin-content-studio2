'use client';

/**
 * CopyForLinkedIn
 *
 * Cleans AI-generated text for direct paste into LinkedIn:
 * strips markdown, fixes spacing, moves hashtags to the bottom.
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface CopyForLinkedInProps {
  /** The raw markdown text to clean and copy */
  content: string;
  /** Compact mode (icon only, no label) */
  compact?: boolean;
}

/**
 * Strips Markdown and formats text for LinkedIn:
 * - Removes bold/italic markers
 * - Removes headings (##)
 * - Removes block-quote markers (>)
 * - Converts single newlines to double (LinkedIn paragraph spacing)
 * - Gathers all #hashtags and moves them to the end
 */
function cleanForLinkedIn(raw: string): string {
  let text = raw;

  /* Remove code blocks */
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
  });

  /* Remove inline code */
  text = text.replace(/`([^`]+)`/g, '$1');

  /* Remove heading markers */
  text = text.replace(/^#{1,6}\s+/gm, '');

  /* Remove bold / italic markers */
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  /* Remove strikethrough */
  text = text.replace(/~~(.+?)~~/g, '$1');

  /* Remove blockquote markers */
  text = text.replace(/^>\s?/gm, '');

  /* Remove link syntax: [text](url) → text */
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  /* Remove image syntax */
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

  /* Remove horizontal rules */
  text = text.replace(/^[-*_]{3,}$/gm, '');

  /* Collect and remove inline hashtags */
  const hashtagSet = new Set<string>();
  text = text.replace(/#([\w\u0600-\u06FF]+)/g, (_match, tag: string) => {
    hashtagSet.add(`#${tag}`);
    return '';
  });

  /* Normalise whitespace */
  text = text.replace(/[ \t]+/g, ' ');

  /* Convert single newlines to double (LinkedIn spacing) */
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');
  text = text.replace(/(?<!\n)\n(?!\n)/g, '\n\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  /* Trim */
  text = text.trim();

  /* Append hashtags at the bottom */
  if (hashtagSet.size > 0) {
    text += '\n\n' + Array.from(hashtagSet).join(' ');
  }

  return text;
}

export function CopyForLinkedIn({ content, compact = false }: CopyForLinkedInProps) {
  const t = useTranslations('chat');
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const cleaned = cleanForLinkedIn(content);
    try {
      await navigator.clipboard.writeText(cleaned);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Fallback for older browsers */
      const textarea = document.createElement('textarea');
      textarea.value = cleaned;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  const handleOpenLinkedIn = useCallback(() => {
    window.open('https://www.linkedin.com/feed/', '_blank', 'noopener,noreferrer');
  }, []);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-[var(--text-tertiary)]
                     hover:text-emerald-400 transition-colors"
          title={t('copyLinkedIn', { defaultMessage: 'Copy for LinkedIn' })}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={handleOpenLinkedIn}
          className="p-1.5 rounded-lg hover:bg-blue-500/10 text-[var(--text-tertiary)]
                     hover:text-blue-400 transition-colors"
          title={t('openLinkedIn', { defaultMessage: 'Open LinkedIn' })}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                   bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400
                   border border-emerald-500/20 transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            {t('copied', { defaultMessage: 'Copied!' })}
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            {t('copyLinkedIn', { defaultMessage: 'Copy for LinkedIn' })}
          </>
        )}
      </button>
      <button
        onClick={handleOpenLinkedIn}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                   bg-blue-600/10 hover:bg-blue-600/20 text-blue-400
                   border border-blue-500/20 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        {t('openLinkedIn', { defaultMessage: 'Open LinkedIn' })}
      </button>
    </div>
  );
}