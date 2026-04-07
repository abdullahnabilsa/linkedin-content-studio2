'use client';

/**
 * Settings Page
 * 
 * Tabbed settings with sections: Profile, Professional Profile,
 * API Keys, Language, Theme, and Invite Code activation.
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/authStore';
import { createBrowserClient } from '@/lib/supabase-client';
import { ApiKeyManager } from '@/components/settings/ApiKeyManager';
import { LanguageSwitch } from '@/components/settings/LanguageSwitch';
import { ThemeSwitch } from '@/components/settings/ThemeSwitch';
import {
  User,
  Briefcase,
  Key,
  Globe,
  Palette,
  Gift,
  Shield,
  Calendar,
  Mail,
  Crown,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

/** Settings tab definition */
interface SettingsTab {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
}

const SETTINGS_TABS: SettingsTab[] = [
  { id: 'profile', labelKey: 'tabs.profile', icon: <User className="w-4 h-4" /> },
  { id: 'professional', labelKey: 'tabs.professional', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'apikeys', labelKey: 'tabs.apiKeys', icon: <Key className="w-4 h-4" /> },
  { id: 'language', labelKey: 'tabs.language', icon: <Globe className="w-4 h-4" /> },
  { id: 'theme', labelKey: 'tabs.theme', icon: <Palette className="w-4 h-4" /> },
  { id: 'invite', labelKey: 'tabs.invite', icon: <Gift className="w-4 h-4" /> },
];

export default function SettingsPage() {
  const t = useTranslations('settings');
  const { user, profile } = useAuthStore();
  const supabase = createBrowserClient();

  const [activeTab, setActiveTab] = useState('profile');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success: boolean; message: string } | null>(null);

  /* Sync display name when profile loads */
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name]);

  /** Save profile (display name) */
  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSavingProfile(true);
    setProfileSaved(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      /* Update the auth store */
      useAuthStore.getState().setProfile({
        ...profile!,
        display_name: displayName.trim() || null,
      });

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      /* Error handled silently; user can retry */
    } finally {
      setIsSavingProfile(false);
    }
  };

  /** Activate invite code */
  const handleActivateInvite = async () => {
    if (!inviteCode.trim() || !user?.id) return;
    setInviteLoading(true);
    setInviteResult(null);

    try {
      /* Validate and activate the invite code */
      const { data: codeRow, error: codeError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', inviteCode.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (codeError || !codeRow) {
        setInviteResult({ success: false, message: t('invite.invalidCode') });
        return;
      }

      /* Check usage limits */
      if (codeRow.current_uses >= codeRow.max_uses) {
        setInviteResult({ success: false, message: t('invite.codeExhausted') });
        return;
      }

      /* Check expiration */
      if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
        setInviteResult({ success: false, message: t('invite.codeExpired') });
        return;
      }

      /* Check if already used by this user */
      const { data: existingUse } = await supabase
        .from('invite_code_uses')
        .select('id')
        .eq('invite_code_id', codeRow.id)
        .eq('user_id', user.id)
        .single();

      if (existingUse) {
        setInviteResult({ success: false, message: t('invite.alreadyUsed') });
        return;
      }

      /* Calculate premium expiry */
      let premiumExpiresAt: string;
      if (codeRow.duration_type === 'fixed' && codeRow.fixed_end_date) {
        premiumExpiresAt = new Date(codeRow.fixed_end_date).toISOString();
      } else if (codeRow.duration_type === 'relative' && codeRow.relative_days) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + codeRow.relative_days);
        premiumExpiresAt = expiryDate.toISOString();
      } else {
        /* Default 30 days */
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        premiumExpiresAt = expiryDate.toISOString();
      }

      /* Record usage */
      const { error: useError } = await supabase
        .from('invite_code_uses')
        .insert({
          invite_code_id: codeRow.id,
          user_id: user.id,
        });

      if (useError) throw useError;

      /* Increment usage count */
      await supabase
        .from('invite_codes')
        .update({ current_uses: codeRow.current_uses + 1 })
        .eq('id', codeRow.id);

      /* Upgrade user to premium */
      await supabase
        .from('profiles')
        .update({
          role: 'premium',
          premium_expires_at: premiumExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      /* Update local state */
      useAuthStore.getState().setProfile({
        ...profile!,
        role: 'premium',
        premium_expires_at: premiumExpiresAt,
      });

      setInviteResult({ success: true, message: t('invite.success') });
      setInviteCode('');
    } catch {
      setInviteResult({ success: false, message: t('invite.error') });
    } finally {
      setInviteLoading(false);
    }
  };

  /** Get the role badge color */
  const getRoleBadge = () => {
    switch (profile?.role) {
      case 'admin':
        return { label: t('profile.roleAdmin'), className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'premium':
        return { label: t('profile.rolePremium'), className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      default:
        return { label: t('profile.roleFree'), className: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]' };
    }
  };

  const roleBadge = getRoleBadge();

  /** Format date for display */
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat(profile?.preferred_language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateStr));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        {/* Page Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-8">
          {t('pageTitle')}
        </h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar navigation — Desktop */}
          <nav className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24 space-y-1">
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl
                             text-sm font-medium transition-colors text-start ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span>{t(tab.labelKey)}</span>
                  {activeTab === tab.id && (
                    <ChevronRight className="w-3 h-3 ms-auto rtl:rotate-180" />
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Tab navigation — Mobile */}
          <div className="lg:hidden overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 min-w-max pb-2">
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full
                             text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)]'
                  }`}
                >
                  {tab.icon}
                  <span>{t(tab.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            <div className="rounded-2xl border border-[var(--border-primary)]
                            bg-[var(--bg-secondary)] p-5 sm:p-8">

              {/* ── Profile Tab ── */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      {t('profile.title')}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {t('profile.description')}
                    </p>
                  </div>

                  {/* Account type badge */}
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full
                                    border text-sm font-medium ${roleBadge.className}`}>
                      {profile?.role === 'admin' && <Shield className="w-3.5 h-3.5" />}
                      {profile?.role === 'premium' && <Crown className="w-3.5 h-3.5" />}
                      {roleBadge.label}
                    </div>

                    {profile?.role === 'premium' && profile?.premium_expires_at && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {t('profile.expiresAt', { date: formatDate(profile.premium_expires_at) })}
                      </span>
                    )}
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      <Mail className="w-4 h-4 inline me-1.5" />
                      {t('profile.email')}
                    </label>
                    <input
                      type="email"
                      value={profile?.email || user?.email || ''}
                      readOnly
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-primary)]
                                 bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]
                                 cursor-not-allowed text-sm"
                      dir="ltr"
                    />
                  </div>

                  {/* Display name */}
                  <div>
                    <label
                      htmlFor="display-name"
                      className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
                    >
                      {t('profile.displayName')}
                    </label>
                    <input
                      id="display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('profile.displayNamePlaceholder')}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-primary)]
                                 bg-[var(--bg-primary)] text-[var(--text-primary)]
                                 placeholder:text-[var(--text-tertiary)]
                                 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30
                                 text-sm transition-colors"
                      maxLength={100}
                    />
                  </div>

                  {/* Join date */}
                  <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                    <Calendar className="w-4 h-4" />
                    {t('profile.joinedAt', { date: formatDate(profile?.created_at) })}
                  </div>

                  {/* Profile completion */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--text-secondary)]">
                        {t('profile.profileCompletion')}
                      </span>
                      <span className="text-sm text-emerald-400 font-medium">
                        {profile?.profile_completion_percent || 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                        style={{ width: `${profile?.profile_completion_percent || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl
                                 bg-emerald-600 hover:bg-emerald-500 text-white
                                 font-medium text-sm transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : profileSaved ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : null}
                      {profileSaved ? t('profile.saved') : t('profile.save')}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Professional Profile Tab (placeholder for Module 5) ── */}
              {activeTab === 'professional' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      {t('professional.title')}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {t('professional.description')}
                    </p>
                  </div>

                  <div className="text-center py-16 rounded-xl border border-dashed
                                  border-[var(--border-primary)] bg-[var(--bg-primary)]">
                    <Briefcase className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-3" />
                    <p className="text-[var(--text-secondary)] font-medium">
                      {t('professional.comingSoon')}
                    </p>
                    <p className="text-sm text-[var(--text-tertiary)] mt-1">
                      {t('professional.comingSoonDescription')}
                    </p>
                  </div>
                </div>
              )}

              {/* ── API Keys Tab ── */}
              {activeTab === 'apikeys' && <ApiKeyManager />}

              {/* ── Language Tab ── */}
              {activeTab === 'language' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      {t('language.title')}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {t('language.description')}
                    </p>
                  </div>

                  <LanguageSwitch />
                </div>
              )}

              {/* ── Theme Tab ── */}
              {activeTab === 'theme' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      {t('theme.title')}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {t('theme.description')}
                    </p>
                  </div>

                  <ThemeSwitch />
                </div>
              )}

              {/* ── Invite Code Tab ── */}
              {activeTab === 'invite' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      {t('invite.title')}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {t('invite.description')}
                    </p>
                  </div>

                  {profile?.role === 'premium' || profile?.role === 'admin' ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl
                                    bg-emerald-500/10 border border-emerald-500/20">
                      <Crown className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-400">
                          {t('invite.alreadyPremium')}
                        </p>
                        {profile?.premium_expires_at && (
                          <p className="text-xs text-emerald-400/70 mt-0.5">
                            {t('invite.validUntil', { date: formatDate(profile.premium_expires_at) })}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={inviteCode}
                          onChange={(e) => {
                            setInviteCode(e.target.value.toUpperCase());
                            setInviteResult(null);
                          }}
                          placeholder={t('invite.placeholder')}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-primary)]
                                     bg-[var(--bg-primary)] text-[var(--text-primary)]
                                     placeholder:text-[var(--text-tertiary)]
                                     focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30
                                     text-sm font-mono tracking-wider transition-colors"
                          dir="ltr"
                          maxLength={20}
                        />
                        <button
                          onClick={handleActivateInvite}
                          disabled={inviteLoading || !inviteCode.trim()}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                                     bg-emerald-600 hover:bg-emerald-500 text-white
                                     font-medium text-sm transition-colors
                                     disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          {inviteLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Gift className="w-4 h-4" />
                          )}
                          {t('invite.activate')}
                        </button>
                      </div>

                      {inviteResult && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${
                          inviteResult.success
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'bg-red-500/10 border border-red-500/20'
                        }`}>
                          {inviteResult.success ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <p className={`text-sm ${
                            inviteResult.success ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {inviteResult.message}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}