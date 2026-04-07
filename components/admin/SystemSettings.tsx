'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Save, Loader2, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/utils/cn';

interface SystemConfigItem {
  key: string;
  value: string;
  value_type: string;
  description: string | null;
}

interface SettingDefinition {
  key: string;
  labelKey: string;
  descriptionKey: string;
  type: 'integer' | 'string' | 'boolean' | 'select';
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  defaultValue: string;
}

const SYSTEM_SETTINGS: SettingDefinition[] = [
  {
    key: 'free_messages_before_delay',
    labelKey: 'settings.freeMessagesBeforeDelay',
    descriptionKey: 'settings.freeMessagesBeforeDelayDesc',
    type: 'integer',
    min: 1,
    max: 50,
    defaultValue: '4',
  },
  {
    key: 'delay_duration_seconds',
    labelKey: 'settings.delayDurationSeconds',
    descriptionKey: 'settings.delayDurationSecondsDesc',
    type: 'integer',
    min: 10,
    max: 600,
    defaultValue: '180',
  },
  {
    key: 'max_conversations_free',
    labelKey: 'settings.maxConversationsFree',
    descriptionKey: 'settings.maxConversationsFreeDesc',
    type: 'integer',
    min: 1,
    max: 100,
    defaultValue: '20',
  },
  {
    key: 'max_api_keys_free',
    labelKey: 'settings.maxApiKeysFree',
    descriptionKey: 'settings.maxApiKeysFreeDesc',
    type: 'integer',
    min: 0,
    max: 10,
    defaultValue: '2',
  },
  {
    key: 'max_custom_personas_free',
    labelKey: 'settings.maxCustomPersonasFree',
    descriptionKey: 'settings.maxCustomPersonasFreeDesc',
    type: 'integer',
    min: 0,
    max: 20,
    defaultValue: '3',
  },
  {
    key: 'max_post_library_free',
    labelKey: 'settings.maxPostLibraryFree',
    descriptionKey: 'settings.maxPostLibraryFreeDesc',
    type: 'integer',
    min: 1,
    max: 100,
    defaultValue: '20',
  },
  {
    key: 'messages_per_conversation_free',
    labelKey: 'settings.messagesPerConversationFree',
    descriptionKey: 'settings.messagesPerConversationFreeDesc',
    type: 'integer',
    min: 5,
    max: 200,
    defaultValue: '15',
  },
  {
    key: 'messages_per_conversation_premium',
    labelKey: 'settings.messagesPerConversationPremium',
    descriptionKey: 'settings.messagesPerConversationPremiumDesc',
    type: 'integer',
    min: 10,
    max: 500,
    defaultValue: '75',
  },
  {
    key: 'premium_daily_persona_trial_limit',
    labelKey: 'settings.premiumDailyPersonaTrialLimit',
    descriptionKey: 'settings.premiumDailyPersonaTrialLimitDesc',
    type: 'integer',
    min: 0,
    max: 20,
    defaultValue: '5',
  },
  {
    key: 'rate_limit_reset_scope',
    labelKey: 'settings.rateLimitResetScope',
    descriptionKey: 'settings.rateLimitResetScopeDesc',
    type: 'select',
    options: [
      { value: 'conversation', label: 'Per Conversation' },
      { value: 'daily', label: 'Daily' },
    ],
    defaultValue: 'conversation',
  },
];

export function SystemSettings() {
  const t = useTranslations('admin');
  const { toast } = useToast();

  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [originalConfigs, setOriginalConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platformName, setPlatformName] = useState('');
  const [platformDescription, setPlatformDescription] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);

      const configMap: Record<string, string> = {};
      (result.data || []).forEach((item: SystemConfigItem) => {
        configMap[item.key] = item.value;
      });

      /* Apply defaults for missing keys */
      SYSTEM_SETTINGS.forEach((setting) => {
        if (!configMap[setting.key]) {
          configMap[setting.key] = setting.defaultValue;
        }
      });

      setPlatformName(configMap['platform_name'] || 'ContentPro');
      setPlatformDescription(configMap['platform_description'] || '');

      setConfigs(configMap);
      setOriginalConfigs({ ...configMap });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fetch failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const hasChanges = () => {
    for (const key of Object.keys(configs)) {
      if (configs[key] !== originalConfigs[key]) return true;
    }
    if (platformName !== (originalConfigs['platform_name'] || 'ContentPro')) return true;
    if (platformDescription !== (originalConfigs['platform_description'] || '')) return true;
    return false;
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const settings: Array<{ key: string; value: string }> = [];

      SYSTEM_SETTINGS.forEach((def) => {
        if (configs[def.key] !== originalConfigs[def.key]) {
          settings.push({ key: def.key, value: configs[def.key] });
        }
      });

      if (platformName !== (originalConfigs['platform_name'] || 'ContentPro')) {
        settings.push({ key: 'platform_name', value: platformName });
      }
      if (platformDescription !== (originalConfigs['platform_description'] || '')) {
        settings.push({ key: 'platform_description', value: platformDescription });
      }

      if (settings.length === 0) {
        toast({ title: t('common.info'), description: t('settings.noChanges') });
        return;
      }

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);

      toast({ title: t('common.success'), description: t('settings.saved') });
      fetchSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-6">
        <Skeleton className="h-6 w-48" />
        {[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-16 w-full" />))}
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-[var(--accent-primary)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t('settings.systemLimits')}
          </h2>
        </div>
        <Button variant="outline" size="icon" onClick={fetchSettings} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {SYSTEM_SETTINGS.map((setting) => (
          <div key={setting.key} className="space-y-2">
            <Label className="text-sm font-medium">{t(setting.labelKey)}</Label>
            <p className="text-xs text-[var(--text-muted)]">{t(setting.descriptionKey)}</p>
            {setting.type === 'integer' ? (
              <Input
                type="number"
                min={setting.min}
                max={setting.max}
                value={configs[setting.key] || setting.defaultValue}
                onChange={(e) =>
                  setConfigs((prev) => ({ ...prev, [setting.key]: e.target.value }))
                }
              />
            ) : setting.type === 'select' ? (
              <Select
                value={configs[setting.key] || setting.defaultValue}
                onValueChange={(v) =>
                  setConfigs((prev) => ({ ...prev, [setting.key]: v }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(setting.options || []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={configs[setting.key] || setting.defaultValue}
                onChange={(e) =>
                  setConfigs((prev) => ({ ...prev, [setting.key]: e.target.value }))
                }
              />
            )}
          </div>
        ))}
      </div>

      {/* Platform Info */}
      <div className="border-t border-[var(--border-primary)] pt-6">
        <h3 className="mb-4 text-base font-semibold text-[var(--text-primary)]">
          {t('settings.platformInfo')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('settings.platformName')}</Label>
            <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t('settings.platformDescription')}</Label>
            <Textarea
              value={platformDescription}
              onChange={(e) => setPlatformDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-[var(--border-primary)] pt-4">
        <Button onClick={handleSave} disabled={saving || !hasChanges()} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('settings.saveSettings')}
        </Button>
      </div>
    </div>
  );
}