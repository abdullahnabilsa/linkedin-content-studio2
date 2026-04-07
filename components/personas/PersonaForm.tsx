'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Save, Eye, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PersonaPreview } from '@/components/personas/PersonaPreview';
import { usePersonas } from '@/hooks/usePersonas';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';
import type { Persona, CreatePersonaInput, UpdatePersonaInput } from '@/types/persona';

/** Preset emoji icons for the icon picker grid */
const PRESET_ICONS: string[] = [
  '🧠', '💡', '🎯', '📝', '✍️', '🚀', '💼', '📊',
  '🎨', '🔬', '📚', '🏆', '💎', '🌟', '🔥', '⚡',
  '🎤', '📱', '🌍', '🤖', '🎓', '💬', '📈', '🛠️',
  '🧩', '🏅', '🎭', '🔑', '🧲', '📣',
];

interface PersonaFormProps {
  /** If provided, we are in edit mode */
  existingPersona?: Persona;
  /** Current locale */
  locale?: string;
}

export function PersonaForm({ existingPersona, locale = 'ar' }: PersonaFormProps) {
  const t = useTranslations('personas');
  const router = useRouter();
  const { profile } = useAuthStore();
  const {
    categories,
    personaCount,
    maxPersonas,
    createPersona,
    updatePersona,
  } = usePersonas();

  const isEditing = !!existingPersona;
  const userRole = profile?.role ?? 'free';
  const atLimit = userRole === 'free' && personaCount >= maxPersonas && !isEditing;

  /* ── form state ───────────────────────────────────────── */
  const [name, setName] = useState(existingPersona?.name ?? '');
  const [description, setDescription] = useState(existingPersona?.description ?? '');
  const [categoryId, setCategoryId] = useState<string>(existingPersona?.category_id ?? '');
  const [systemPrompt, setSystemPrompt] = useState(existingPersona?.system_prompt ?? '');
  const [iconUrl, setIconUrl] = useState(existingPersona?.icon_url ?? '');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showCustomUrl, setShowCustomUrl] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const SYSTEM_PROMPT_MAX = 4000;
  const NAME_MAX = 100;

  /* ── validation ───────────────────────────────────────── */
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = t('form.errors.nameRequired');
    if (name.length > NAME_MAX) errors.name = t('form.errors.nameTooLong');
    if (!description.trim()) errors.description = t('form.errors.descriptionRequired');
    if (!systemPrompt.trim()) errors.systemPrompt = t('form.errors.systemPromptRequired');
    if (systemPrompt.length > SYSTEM_PROMPT_MAX) {
      errors.systemPrompt = t('form.errors.systemPromptTooLong');
    }
    if (customUrlInput && !customUrlInput.startsWith('https://')) {
      errors.iconUrl = t('form.errors.iconUrlInvalid');
    }
    return errors;
  }, [name, description, systemPrompt, customUrlInput, t]);

  const isValid = Object.keys(validationErrors).length === 0 && name.trim() && systemPrompt.trim();

  /* ── select preset icon ───────────────────────────────── */
  const handleSelectIcon = useCallback((icon: string) => {
    setIconUrl(icon);
    setShowCustomUrl(false);
    setCustomUrlInput('');
  }, []);

  /* ── apply custom URL ─────────────────────────────────── */
  const handleApplyCustomUrl = useCallback(() => {
    if (customUrlInput.startsWith('https://')) {
      setIconUrl(customUrlInput);
    }
  }, [customUrlInput]);

  /* ── build preview persona ────────────────────────────── */
  const previewPersona: Persona = useMemo(
    () => ({
      id: existingPersona?.id ?? 'preview',
      user_id: profile?.id ?? null,
      name: name || t('form.placeholders.name'),
      name_en: null,
      description: description || t('form.placeholders.description'),
      description_en: null,
      system_prompt: systemPrompt,
      icon_url: iconUrl || null,
      category_id: categoryId || null,
      type: 'custom',
      is_active: true,
      slash_command: null,
      usage_count: 0,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    [existingPersona, profile, name, description, systemPrompt, iconUrl, categoryId, t],
  );

  const previewCategoryName = useMemo(() => {
    if (!categoryId) return undefined;
    const cat = categories.find((c) => c.id === categoryId);
    return locale === 'ar' ? cat?.name : cat?.name_en;
  }, [categoryId, categories, locale]);

  /* ── submit handler ───────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    if (!isValid || atLimit) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (isEditing && existingPersona) {
        const updateData: UpdatePersonaInput = {
          name: name.trim(),
          description: description.trim(),
          system_prompt: systemPrompt.trim(),
          category_id: categoryId || null,
          icon_url: iconUrl || null,
        };
        await updatePersona(existingPersona.id, updateData);
      } else {
        const createData: CreatePersonaInput = {
          name: name.trim(),
          description: description.trim(),
          system_prompt: systemPrompt.trim(),
          category_id: categoryId || null,
          icon_url: iconUrl || null,
        };
        await createPersona(createData);
      }
      router.push(`/${locale}/personas`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save persona';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isValid,
    atLimit,
    isEditing,
    existingPersona,
    name,
    description,
    systemPrompt,
    categoryId,
    iconUrl,
    createPersona,
    updatePersona,
    router,
    locale,
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          {isEditing ? t('form.titleEdit') : t('form.titleCreate')}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {isEditing ? t('form.subtitleEdit') : t('form.subtitleCreate')}
        </p>
      </div>

      {/* Limit indicator for free users */}
      {userRole === 'free' && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm',
            atLimit
              ? 'border-red-500/30 bg-red-500/10 text-red-400'
              : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
          )}
        >
          {atLimit ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <Sparkles className="h-4 w-4 shrink-0" />
          )}
          <span>
            {t('form.personaCount', {
              count: personaCount,
              max: maxPersonas === Infinity ? '∞' : maxPersonas,
            })}
          </span>
          {atLimit && (
            <span className="ms-auto text-xs font-medium">{t('form.upgradeForMore')}</span>
          )}
        </div>
      )}

      {/* At limit – block form */}
      {atLimit && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
          <p className="mt-3 text-sm font-medium text-amber-300">{t('form.limitReached')}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('form.limitDescription')}</p>
        </div>
      )}

      {!atLimit && (
        <div className="space-y-5">
          {/* ── Name field ─────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="persona-name" className="text-sm font-medium text-[var(--text-primary)]">
              {t('form.labels.name')} <span className="text-red-400">*</span>
            </Label>
            <Input
              id="persona-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.placeholders.name')}
              maxLength={NAME_MAX}
              className="bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-emerald-500/50"
            />
            <div className="flex items-center justify-between">
              {validationErrors.name && (
                <p className="text-xs text-red-400">{validationErrors.name}</p>
              )}
              <p className="ms-auto text-xs text-[var(--text-muted)]">
                {name.length} / {NAME_MAX}
              </p>
            </div>
          </div>

          {/* ── Description field ──────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="persona-desc" className="text-sm font-medium text-[var(--text-primary)]">
              {t('form.labels.description')} <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="persona-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('form.placeholders.description')}
              rows={2}
              className="bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-emerald-500/50 resize-none"
            />
            {validationErrors.description && (
              <p className="text-xs text-red-400">{validationErrors.description}</p>
            )}
          </div>

          {/* ── Category dropdown ──────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--text-primary)]">
              {t('form.labels.category')}
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-primary)]">
                <SelectValue placeholder={t('form.placeholders.category')} />
              </SelectTrigger>
              <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border-default)]">
                {categories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    className="text-[var(--text-primary)] focus:bg-emerald-500/10"
                  >
                    {cat.icon ? `${cat.icon} ` : ''}
                    {locale === 'ar' ? cat.name : cat.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── System Prompt field ────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="persona-prompt" className="text-sm font-medium text-[var(--text-primary)]">
              {t('form.labels.systemPrompt')} <span className="text-red-400">*</span>
            </Label>
            <p className="text-xs text-[var(--text-muted)]">{t('form.hints.systemPrompt')}</p>
            <Textarea
              id="persona-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t('form.placeholders.systemPrompt')}
              rows={8}
              className="bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-emerald-500/50 resize-y font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              {validationErrors.systemPrompt && (
                <p className="text-xs text-red-400">{validationErrors.systemPrompt}</p>
              )}
              <p
                className={cn(
                  'ms-auto text-xs',
                  systemPrompt.length > SYSTEM_PROMPT_MAX
                    ? 'text-red-400'
                    : 'text-[var(--text-muted)]',
                )}
              >
                {systemPrompt.length.toLocaleString()} / {SYSTEM_PROMPT_MAX.toLocaleString()}
              </p>
            </div>
          </div>

          {/* ── Icon picker ────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--text-primary)]">
              {t('form.labels.icon')}
            </Label>
            <p className="text-xs text-[var(--text-muted)]">{t('form.hints.icon')}</p>

            {/* Preset grid */}
            <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-15">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleSelectIcon(icon)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all hover:scale-110',
                    iconUrl === icon
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-emerald-500/30',
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Custom URL toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowCustomUrl(!showCustomUrl)}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline"
              >
                {showCustomUrl ? t('form.hideCustomUrl') : t('form.showCustomUrl')}
              </button>
            </div>

            {showCustomUrl && (
              <div className="flex items-center gap-2">
                <Input
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://example.com/icon.png"
                  className="bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApplyCustomUrl}
                  disabled={!customUrlInput.startsWith('https://')}
                  className="shrink-0 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  {t('form.applyUrl')}
                </Button>
              </div>
            )}
            {validationErrors.iconUrl && (
              <p className="text-xs text-red-400">{validationErrors.iconUrl}</p>
            )}

            {/* Current selection indicator */}
            {iconUrl && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>{t('form.selectedIcon')}:</span>
                {iconUrl.startsWith('http') ? (
                  <img src={iconUrl} alt="icon" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="text-lg">{iconUrl}</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIconUrl('');
                    setCustomUrlInput('');
                  }}
                  className="text-red-400 hover:text-red-300 underline"
                >
                  {t('form.clearIcon')}
                </button>
              </div>
            )}
          </div>

          {/* ── Error display ──────────────────────────── */}
          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* ── Action buttons ─────────────────────────── */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditing ? t('form.buttonUpdate') : t('form.buttonCreate')}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={!name.trim()}
              className="border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] gap-2"
            >
              <Eye className="h-4 w-4" />
              {t('form.buttonPreview')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {t('form.buttonCancel')}
            </Button>
          </div>
        </div>
      )}

      {/* ── Preview dialog ───────────────────────────── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-default)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">
              {t('form.previewTitle')}
            </DialogTitle>
          </DialogHeader>
          <PersonaPreview persona={previewPersona} categoryName={previewCategoryName} locale={locale} />
        </DialogContent>
      </Dialog>
    </div>
  );
}