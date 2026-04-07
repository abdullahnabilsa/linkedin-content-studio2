'use client';

/**
 * ApiKeyForm Component
 * 
 * Modal dialog for adding a new private API key.
 * Validates key format per platform, encrypts server-side.
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useApiKeys } from '@/hooks/useApiKeys';
import {
  X,
  Eye,
  EyeOff,
  Key,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import type { ApiKeyPlatform } from '@/types/api-key';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_ICONS } from '@/utils/constants';
import { validateApiKey } from '@/utils/validators';

interface ApiKeyFormProps {
  onClose: () => void;
  existingPlatforms: ApiKeyPlatform[];
}

/** Platform-specific key format hints */
const KEY_FORMAT_HINTS: Record<string, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  gemini: 'AI...',
  groq: 'gsk_...',
  openrouter: 'sk-or-...',
  together: '...',
  mistral: '...',
};

/** Auto-generated labels per platform */
const AUTO_LABELS: Record<string, string> = {
  openai: 'My OpenAI Key',
  anthropic: 'My Anthropic Key',
  gemini: 'My Google AI Key',
  groq: 'My Groq Key',
  openrouter: 'My OpenRouter Key',
  together: 'My Together Key',
  mistral: 'My Mistral Key',
};

/** All available platforms */
const ALL_PLATFORMS: ApiKeyPlatform[] = [
  'openai',
  'anthropic',
  'gemini',
  'groq',
  'openrouter',
  'together',
  'mistral',
];

export function ApiKeyForm({ onClose, existingPlatforms }: ApiKeyFormProps) {
  const t = useTranslations('settings');
  const { addKey } = useApiKeys();

  const [selectedPlatform, setSelectedPlatform] = useState<ApiKeyPlatform | ''>('');
  const [apiKey, setApiKey] = useState('');
  const [label, setLabel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /** Available platforms (excluding ones user already has) */
  const availablePlatforms = ALL_PLATFORMS.filter(
    (p) => !existingPlatforms.includes(p)
  );

  /** Handle platform selection — auto-fill label */
  const handlePlatformChange = useCallback((platform: ApiKeyPlatform) => {
    setSelectedPlatform(platform);
    setLabel(AUTO_LABELS[platform] || `My ${platform} Key`);
    setFormError(null);
  }, []);

  /** Validate the current form state */
  const validateForm = useCallback((): string | null => {
    if (!selectedPlatform) {
      return t('apiKeys.errors.selectPlatform');
    }
    if (!apiKey.trim()) {
      return t('apiKeys.errors.enterKey');
    }
    if (!label.trim()) {
      return t('apiKeys.errors.enterLabel');
    }

    /* Validate key format */
    const validation = validateApiKey(apiKey.trim(), selectedPlatform);
    if (!validation.isValid) {
      return validation.message;
    }

    return null;
  }, [selectedPlatform, apiKey, label, t]);

  /** Handle form submission */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await addKey(
        selectedPlatform as ApiKeyPlatform,
        apiKey.trim(),
        label.trim()
      );

      if (result) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setFormError(t('apiKeys.errors.addFailed'));
      }
    } catch {
      setFormError(t('apiKeys.errors.addFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    /* Overlay backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border-primary)]
                      bg-[var(--bg-primary)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t('apiKeys.addKeyTitle')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]
                       text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
                       transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-emerald-400 mb-4" />
            <p className="text-lg font-medium text-[var(--text-primary)]">
              {t('apiKeys.addSuccess', {
                platform: PLATFORM_DISPLAY_NAMES[selectedPlatform as string] || selectedPlatform,
              })}
            </p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Platform Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                {t('apiKeys.selectPlatform')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availablePlatforms.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handlePlatformChange(platform)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl
                               border transition-all text-center ${
                      selectedPlatform === platform
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="text-xl" role="img" aria-label={platform}>
                      {PLATFORM_ICONS[platform] || '🔑'}
                    </span>
                    <span className="text-xs font-medium truncate w-full">
                      {PLATFORM_DISPLAY_NAMES[platform] || platform}
                    </span>
                  </button>
                ))}
              </div>

              {availablePlatforms.length === 0 && (
                <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                  {t('apiKeys.allPlatformsAdded')}
                </p>
              )}
            </div>

            {/* API Key Input */}
            <div>
              <label
                htmlFor="api-key-input"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
              >
                {t('apiKeys.keyLabel')}
              </label>
              <div className="relative">
                <input
                  id="api-key-input"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setFormError(null);
                  }}
                  placeholder={
                    selectedPlatform
                      ? KEY_FORMAT_HINTS[selectedPlatform] || t('apiKeys.keyPlaceholder')
                      : t('apiKeys.keyPlaceholder')
                  }
                  className="w-full px-4 py-2.5 pe-12 rounded-xl border border-[var(--border-primary)]
                             bg-[var(--bg-secondary)] text-[var(--text-primary)]
                             placeholder:text-[var(--text-tertiary)]
                             focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30
                             font-mono text-sm transition-colors"
                  dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 p-1
                             text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]
                             transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {selectedPlatform && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
                  {t('apiKeys.formatHint', {
                    format: KEY_FORMAT_HINTS[selectedPlatform] || '...',
                  })}
                </p>
              )}
            </div>

            {/* Label Input */}
            <div>
              <label
                htmlFor="key-label-input"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
              >
                {t('apiKeys.labelField')}
              </label>
              <input
                id="key-label-input"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('apiKeys.labelPlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-primary)]
                           bg-[var(--bg-secondary)] text-[var(--text-primary)]
                           placeholder:text-[var(--text-tertiary)]
                           focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30
                           text-sm transition-colors"
                maxLength={50}
              />
            </div>

            {/* Error display */}
            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{formError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-primary)]
                           text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]
                           transition-colors text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedPlatform || !apiKey.trim() || availablePlatforms.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                           rounded-xl bg-emerald-600 hover:bg-emerald-500
                           text-white font-medium text-sm transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('apiKeys.saving')}
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    {t('apiKeys.save')}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}