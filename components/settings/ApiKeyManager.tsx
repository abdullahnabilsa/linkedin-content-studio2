'use client';

/**
 * ApiKeyManager Component
 * 
 * Displays and manages the user's private API keys.
 * Shows a table/card list of existing keys, add button,
 * count indicator for free users, and help instructions.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useAuthStore } from '@/stores/authStore';
import { ApiKeyForm } from '@/components/settings/ApiKeyForm';
import {
  Key,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  Check,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import type { ApiKeyPlatform } from '@/types/api-key';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_ICONS } from '@/utils/constants';

/** Platform help links for obtaining API keys */
const PLATFORM_HELP_LINKS: Record<string, string> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  gemini: 'https://aistudio.google.com/apikey',
  groq: 'https://console.groq.com/keys',
  openrouter: 'https://openrouter.ai/keys',
  together: 'https://api.together.ai/settings/api-keys',
  mistral: 'https://console.mistral.ai/api-keys/',
};

export function ApiKeyManager() {
  const t = useTranslations('settings');
  const { profile } = useAuthStore();
  const {
    apiKeys,
    isLoading,
    error,
    removeKey,
    keyCount,
    maxKeys,
    canAddKey,
    refresh,
  } = useApiKeys();

  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isPremium = profile?.role === 'premium' || profile?.role === 'admin';

  /** Handle key deletion with confirmation */
  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    setDeletingId(id);
    await removeKey(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  /** Get platform icon component or emoji */
  const getPlatformIcon = (platform: string): string => {
    return PLATFORM_ICONS[platform] || '🔑';
  };

  /** Format the last used date */
  const formatLastUsed = (lastUsedAt: string | null): string => {
    if (!lastUsedAt) return t('apiKeys.neverUsed');
    const date = new Date(lastUsedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('apiKeys.justNow');
    if (diffMins < 60) return t('apiKeys.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('apiKeys.hoursAgo', { count: diffHours });
    return t('apiKeys.daysAgo', { count: diffDays });
  };

  return (
    <div className="space-y-6">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {t('apiKeys.title')}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('apiKeys.description')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Count indicator */}
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            canAddKey
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-red-500/10 text-red-400'
          }`}>
            {keyCount}/{maxKeys}
          </span>

          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]
                       hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            title={t('apiKeys.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* API Keys List */}
      {isLoading && apiKeys.length === 0 ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-[var(--bg-tertiary)] animate-pulse"
            />
          ))}
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed
                        border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <Key className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-3" />
          <p className="text-[var(--text-secondary)] font-medium">
            {t('apiKeys.noKeys')}
          </p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {t('apiKeys.noKeysDescription')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="flex items-center justify-between p-4 rounded-xl
                         border border-[var(--border-primary)] bg-[var(--bg-secondary)]
                         hover:border-emerald-500/30 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Platform icon */}
                <span className="text-2xl shrink-0" role="img" aria-label={apiKey.platform}>
                  {getPlatformIcon(apiKey.platform)}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)] truncate">
                      {PLATFORM_DISPLAY_NAMES[apiKey.platform] || apiKey.platform}
                    </span>
                    {apiKey.is_active ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="w-3 h-3" />
                        {t('apiKeys.active')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <XCircle className="w-3 h-3" />
                        {t('apiKeys.inactive')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-0.5">
                    <span>{apiKey.label}</span>
                    <span>•</span>
                    <span>{formatLastUsed(apiKey.last_used_at)}</span>
                  </div>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(apiKey.id)}
                disabled={deletingId === apiKey.id}
                className={`p-2 rounded-lg transition-colors shrink-0 ${
                  confirmDeleteId === apiKey.id
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-[var(--text-tertiary)] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100'
                } disabled:opacity-50`}
                title={
                  confirmDeleteId === apiKey.id
                    ? t('apiKeys.confirmDelete')
                    : t('apiKeys.delete')
                }
              >
                <Trash2 className={`w-4 h-4 ${deletingId === apiKey.id ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Key Button */}
      <div>
        {canAddKey ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20
                       border border-emerald-500/20 hover:border-emerald-500/30
                       transition-all font-medium text-sm w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            {t('apiKeys.addKey')}
          </button>
        ) : (
          <div className="text-center p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
            <p className="text-sm text-[var(--text-secondary)]">
              {t('apiKeys.limitReached')}
            </p>
            {!isPremium && (
              <p className="text-xs text-emerald-400 mt-1">
                {t('apiKeys.upgradeForMore')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Help Section — Collapsible */}
      <div className="border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center justify-between w-full p-4
                     text-start hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {t('apiKeys.helpTitle')}
          </span>
          {showHelp ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
          )}
        </button>

        {showHelp && (
          <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-primary)]">
            <p className="text-xs text-[var(--text-tertiary)] pt-3">
              {t('apiKeys.helpDescription')}
            </p>

            <div className="space-y-2">
              {Object.entries(PLATFORM_HELP_LINKS).map(([platform, link]) => (
                <a
                  key={platform}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg
                             hover:bg-[var(--bg-tertiary)] transition-colors group/link"
                >
                  <span className="text-lg" role="img" aria-label={platform}>
                    {getPlatformIcon(platform)}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)] group-hover/link:text-[var(--text-primary)]">
                    {PLATFORM_DISPLAY_NAMES[platform] || platform}
                  </span>
                  <ExternalLink className="w-3 h-3 ms-auto text-[var(--text-tertiary)]
                                           group-hover/link:text-emerald-400" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Key Modal */}
      {showForm && (
        <ApiKeyForm
          onClose={() => setShowForm(false)}
          existingPlatforms={apiKeys.map((k) => k.platform as ApiKeyPlatform)}
        />
      )}
    </div>
  );
}