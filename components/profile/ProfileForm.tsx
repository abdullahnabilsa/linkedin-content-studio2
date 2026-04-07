'use client';

/**
 * ProfileForm
 *
 * Full professional-profile editor rendered inside the Settings page.
 * Six collapsible sections with auto-save on blur.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/authStore';
import { createBrowserClient } from '@/lib/supabase-client';
import { ProfileCompletionBar } from '@/components/profile/ProfileCompletionBar';
import { WritingStyleInput } from '@/components/profile/WritingStyleInput';
import { INDUSTRIES, LINKEDIN_GOALS, EXPERIENCE_LEVELS, AUDIENCE_LEVELS, TONE_OPTIONS, EMOJI_OPTIONS, POST_LENGTH_OPTIONS } from '@/utils/constants';
import { ChevronDown, Check, Loader2, Briefcase, Target, Pen, Package, Award, Users } from 'lucide-react';
import type { ProfessionalProfile } from '@/types/professional-profile';

/** Section definition for the collapsible form */
interface SectionDef {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  fields: string[];
}

const SECTIONS: SectionDef[] = [
  {
    id: 'professional',
    titleKey: 'profile.sections.professional',
    icon: <Briefcase className="w-4 h-4" />,
    fields: ['full_name', 'job_title', 'company', 'industry', 'experience_level', 'location'],
  },
  {
    id: 'expertise',
    titleKey: 'profile.sections.expertise',
    icon: <Award className="w-4 h-4" />,
    fields: ['expertise_areas', 'key_skills', 'notable_achievements', 'certifications'],
  },
  {
    id: 'goals',
    titleKey: 'profile.sections.goals',
    icon: <Target className="w-4 h-4" />,
    fields: ['linkedin_goals'],
  },
  {
    id: 'audience',
    titleKey: 'profile.sections.audience',
    icon: <Users className="w-4 h-4" />,
    fields: ['target_audience_description', 'target_audience_region', 'target_audience_level', 'audience_pain_points'],
  },
  {
    id: 'writing',
    titleKey: 'profile.sections.writing',
    icon: <Pen className="w-4 h-4" />,
    fields: ['preferred_tone', 'primary_language', 'emoji_usage', 'preferred_post_length', 'writing_samples'],
  },
  {
    id: 'product',
    titleKey: 'profile.sections.product',
    icon: <Package className="w-4 h-4" />,
    fields: ['has_product', 'product_name', 'product_description', 'product_url', 'product_value_proposition'],
  },
];

export function ProfileForm() {
  const t = useTranslations('settings');
  const { user, profile: authProfile } = useAuthStore();
  const supabase = createBrowserClient();

  const [profile, setProfile] = useState<Partial<ProfessionalProfile>>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['professional']));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* Fetch profile on mount */
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('user_professional_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) setProfile(data as Partial<ProfessionalProfile>);
      setIsLoading(false);
    })();
  }, [user?.id, supabase]);

  /* Debounced auto-save */
  const autoSave = useCallback(
    (updates: Partial<ProfessionalProfile>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!user?.id) return;
        setIsSaving(true);
        try {
          const payload = { ...updates, user_id: user.id, updated_at: new Date().toISOString() };
          await supabase
            .from('user_professional_profiles')
            .upsert(payload, { onConflict: 'user_id' });

          /* Recalculate completion */
          const { data: fresh } = await supabase
            .from('user_professional_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (fresh) {
            const pct = calculateCompletion(fresh as ProfessionalProfile);
            await supabase
              .from('profiles')
              .update({ profile_completion_percent: pct, updated_at: new Date().toISOString() })
              .eq('id', user.id);
            useAuthStore.getState().setProfile({
              ...useAuthStore.getState().profile!,
              profile_completion_percent: pct,
            });
          }

          setLastSaved(new Date());
        } catch {
          /* Silent fail */
        } finally {
          setIsSaving(false);
        }
      }, 500);
    },
    [user?.id, supabase]
  );

  const updateField = useCallback(
    (field: string, value: unknown) => {
      setProfile((prev) => {
        const updated = { ...prev, [field]: value };
        autoSave(updated);
        return updated;
      });
    },
    [autoSave]
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGoal = (goal: string) => {
    const current = (profile.linkedin_goals || []) as string[];
    const updated = current.includes(goal) ? current.filter((g) => g !== goal) : [...current, goal];
    updateField('linkedin_goals', updated);
  };

  const toggleAudienceLevel = (level: string) => {
    const current = (profile.target_audience_level || []) as string[];
    const updated = current.includes(level) ? current.filter((l) => l !== level) : [...current, level];
    updateField('target_audience_level', updated);
  };

  const isSectionComplete = (section: SectionDef): boolean => {
    return section.fields.every((field) => {
      const val = profile[field as keyof ProfessionalProfile];
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'boolean') return true;
      return val !== null && val !== undefined && String(val).trim() !== '';
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {t('professional.title')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t('professional.description')}
        </p>
      </div>

      <ProfileCompletionBar percent={authProfile?.profile_completion_percent || 0} />

      {/* Save indicator */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] min-h-[20px]">
        {isSaving && (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{t('profile.autoSaving', { defaultMessage: 'Saving...' })}</span>
          </>
        )}
        {!isSaving && lastSaved && (
          <>
            <Check className="w-3 h-3 text-emerald-400" />
            <span>{t('profile.autoSaved', { defaultMessage: 'Auto-saved' })}</span>
          </>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <div
            key={section.id}
            className="border border-[var(--border-primary)] rounded-xl overflow-hidden bg-[var(--bg-primary)]"
          >
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="flex items-center justify-between w-full px-5 py-3.5 text-start
                         hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-emerald-400">{section.icon}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {t(section.titleKey, { defaultMessage: section.id })}
                </span>
                {isSectionComplete(section) && (
                  <Check className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-200
                            ${openSections.has(section.id) ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Section body */}
            {openSections.has(section.id) && (
              <div className="px-5 pb-5 pt-2 space-y-4 border-t border-[var(--border-primary)]">

                {/* ── Professional Information ── */}
                {section.id === 'professional' && (
                  <>
                    <InputField label={t('profile.fullName', { defaultMessage: 'Full Name' })} value={profile.full_name || ''} onChange={(v) => updateField('full_name', v)} />
                    <InputField label={t('profile.jobTitle', { defaultMessage: 'Job Title' })} value={profile.job_title || ''} onChange={(v) => updateField('job_title', v)} placeholder="e.g. Marketing Manager" />
                    <InputField label={t('profile.company', { defaultMessage: 'Company' })} value={profile.company || ''} onChange={(v) => updateField('company', v)} />
                    <SelectField label={t('profile.industry', { defaultMessage: 'Industry' })} value={profile.industry || ''} onChange={(v) => updateField('industry', v)} options={INDUSTRIES.map((i) => ({ value: i.id, label: i.label }))} />
                    <SelectField label={t('profile.experience', { defaultMessage: 'Experience Level' })} value={profile.experience_level || ''} onChange={(v) => updateField('experience_level', v)} options={EXPERIENCE_LEVELS} />
                    <InputField label={t('profile.location', { defaultMessage: 'Location' })} value={profile.location || ''} onChange={(v) => updateField('location', v)} placeholder="e.g. Dubai, UAE" />
                  </>
                )}

                {/* ── Expertise ── */}
                {section.id === 'expertise' && (
                  <>
                    <InputField label={t('profile.expertiseAreas', { defaultMessage: 'Areas of Expertise' })} value={(profile.expertise_areas || []).join(', ')} onChange={(v) => updateField('expertise_areas', v.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="Digital Marketing, SEO, Content Strategy" />
                    <TextAreaField label={t('profile.keySkills', { defaultMessage: 'Key Skills' })} value={profile.key_skills || ''} onChange={(v) => updateField('key_skills', v)} rows={2} />
                    <TextAreaField label={t('profile.achievements', { defaultMessage: 'Notable Achievements' })} value={profile.notable_achievements || ''} onChange={(v) => updateField('notable_achievements', v)} rows={3} />
                    <InputField label={t('profile.certifications', { defaultMessage: 'Certifications' })} value={profile.certifications || ''} onChange={(v) => updateField('certifications', v)} />
                  </>
                )}

                {/* ── Goals ── */}
                {section.id === 'goals' && (
                  <div className="grid grid-cols-2 gap-2">
                    {LINKEDIN_GOALS.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => toggleGoal(goal.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-xs text-start font-medium transition-all ${
                          (profile.linkedin_goals || []).includes(goal.id)
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-emerald-500/40'
                        }`}
                      >
                        <span>{goal.icon}</span>
                        <span>{goal.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Target Audience ── */}
                {section.id === 'audience' && (
                  <>
                    <TextAreaField label={t('profile.audienceDesc', { defaultMessage: 'Target Audience Description' })} value={profile.target_audience_description || ''} onChange={(v) => updateField('target_audience_description', v)} rows={2} placeholder="e.g. SaaS founders and startup marketers in the MENA region" />
                    <InputField label={t('profile.audienceRegion', { defaultMessage: 'Target Region' })} value={profile.target_audience_region || ''} onChange={(v) => updateField('target_audience_region', v)} placeholder="e.g. MENA, Global" />
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                        {t('profile.audienceLevel', { defaultMessage: 'Audience Level' })}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {AUDIENCE_LEVELS.map((level) => (
                          <button
                            key={level.value}
                            onClick={() => toggleAudienceLevel(level.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              (profile.target_audience_level || []).includes(level.value)
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                : 'border-[var(--border-primary)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {level.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <TextAreaField label={t('profile.painPoints', { defaultMessage: 'Audience Pain Points' })} value={profile.audience_pain_points || ''} onChange={(v) => updateField('audience_pain_points', v)} rows={2} />
                  </>
                )}

                {/* ── Writing Style ── */}
                {section.id === 'writing' && (
                  <>
                    <SelectField label={t('profile.tone', { defaultMessage: 'Preferred Tone' })} value={profile.preferred_tone || ''} onChange={(v) => updateField('preferred_tone', v)} options={TONE_OPTIONS} />
                    <InputField label={t('profile.language', { defaultMessage: 'Primary Writing Language' })} value={profile.primary_language || ''} onChange={(v) => updateField('primary_language', v)} placeholder="e.g. Arabic, English, Bilingual" />
                    <SelectField label={t('profile.emoji', { defaultMessage: 'Emoji Usage' })} value={profile.emoji_usage || ''} onChange={(v) => updateField('emoji_usage', v)} options={EMOJI_OPTIONS} />
                    <SelectField label={t('profile.postLength', { defaultMessage: 'Preferred Post Length' })} value={profile.preferred_post_length || ''} onChange={(v) => updateField('preferred_post_length', v)} options={POST_LENGTH_OPTIONS} />
                    <WritingStyleInput value={profile.writing_samples || ''} onChange={(v) => updateField('writing_samples', v)} />
                  </>
                )}

                {/* ── Product/Service ── */}
                {section.id === 'product' && (
                  <>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateField('has_product', !profile.has_product)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          profile.has_product ? 'bg-emerald-500' : 'bg-[var(--bg-tertiary)]'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                          profile.has_product ? 'start-[22px]' : 'start-0.5'
                        }`} />
                      </button>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {t('profile.hasProduct', { defaultMessage: 'I have a product or service to promote' })}
                      </span>
                    </div>
                    {profile.has_product && (
                      <>
                        <InputField label={t('profile.productName', { defaultMessage: 'Product Name' })} value={profile.product_name || ''} onChange={(v) => updateField('product_name', v)} />
                        <TextAreaField label={t('profile.productDesc', { defaultMessage: 'Product Description' })} value={profile.product_description || ''} onChange={(v) => updateField('product_description', v)} rows={2} />
                        <InputField label={t('profile.productUrl', { defaultMessage: 'Product URL' })} value={profile.product_url || ''} onChange={(v) => updateField('product_url', v)} dir="ltr" />
                        <TextAreaField label={t('profile.productValue', { defaultMessage: 'Value Proposition' })} value={profile.product_value_proposition || ''} onChange={(v) => updateField('product_value_proposition', v)} rows={2} />
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Reusable Field Components ─── */

function InputField({ label, value, onChange, placeholder, dir }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; dir?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]
                   text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)]
                   focus:outline-none focus:border-emerald-500 transition-colors"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]
                   text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)]
                   focus:outline-none focus:border-emerald-500 transition-colors resize-none"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]
                   text-[var(--text-primary)] text-sm focus:outline-none focus:border-emerald-500 transition-colors"
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ─── Completion calculator ─── */

function calculateCompletion(p: ProfessionalProfile): number {
  const checks: boolean[] = [
    !!p.full_name, !!p.job_title, !!p.company, !!p.industry,
    !!p.experience_level, !!p.location,
    Array.isArray(p.expertise_areas) && p.expertise_areas.length > 0,
    !!p.key_skills,
    Array.isArray(p.linkedin_goals) && p.linkedin_goals.length > 0,
    !!p.target_audience_description,
    !!p.preferred_tone,
    !!p.preferred_post_length,
    !!p.writing_samples,
    !!p.notable_achievements,
    !!p.audience_pain_points,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}