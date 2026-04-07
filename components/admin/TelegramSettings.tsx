'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Save,
  Loader2,
  Send,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface TelegramToggle {
  type: string;
  labelKey: string;
  emoji: string;
}

const TELEGRAM_TOGGLES: TelegramToggle[] = [
  { type: 'new_user_registered', labelKey: 'telegram.newUserRegistered', emoji: 'ℹ️' },
  { type: 'premium_expired', labelKey: 'telegram.premiumExpired', emoji: '🟡' },
  { type: 'premium_upgraded', labelKey: 'telegram.premiumUpgraded', emoji: 'ℹ️' },
  { type: 'api_balance_low', labelKey: 'telegram.apiBalanceLow', emoji: '🔴' },
  { type: 'api_balance_depleted', labelKey: 'telegram.apiBalanceDepleted', emoji: '🔴' },
  { type: 'system_error', labelKey: 'telegram.systemError', emoji: '🔴' },
  { type: 'invite_code_used', labelKey: 'telegram.inviteCodeUsed', emoji: 'ℹ️' },
];

export function TelegramSettings() {
  const t = useTranslations('admin');
  const { toast } = useToast();

  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);

      const configs: Record<string, string> = {};
      (result.data || []).forEach((item: { key: string; value: string }) => {
        configs[item.key] = item.value;
      });

      setBotToken(configs['telegram_bot_token'] || '');
      setChatId(configs['telegram_chat_id'] || '');

      const newToggles: Record<string, boolean> = {};
      TELEGRAM_TOGGLES.forEach((toggle) => {
        const key = `telegram_notify_${toggle.type}`;
        newToggles[toggle.type] = configs[key] === 'true';
      });
      setToggles(newToggles);
    } catch {
      /* Silently handle */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const response = await fetch('/api/webhook/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test_connection',
          title: 'Test Connection',
          message: 'Telegram notifications are configured correctly!',
          priority: 'info',
          testBotToken: botToken,
          testChatId: chatId,
        }),
      });
      const result = await response.json();
      setTestResult({
        success: result.success && result.data?.telegram,
        message: result.success && result.data?.telegram
          ? t('telegram.testSuccess')
          : t('telegram.testFailed'),
      });
    } catch {
      setTestResult({ success: false, message: t('telegram.testFailed') });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const settings: Array<{ key: string; value: string }> = [
        { key: 'telegram_bot_token', value: botToken },
        { key: 'telegram_chat_id', value: chatId },
      ];

      TELEGRAM_TOGGLES.forEach((toggle) => {
        settings.push({
          key: `telegram_notify_${toggle.type}`,
          value: toggles[toggle.type] ? 'true' : 'false',
        });
      });

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);

      toast({ title: t('common.success'), description: t('telegram.saved') });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)]" />;
  }

  return (
    <div className="space-y-6 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-6">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-[var(--accent-primary)]" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {t('telegram.title')}
        </h2>
      </div>

      {/* Bot Token */}
      <div className="space-y-2">
        <Label>{t('telegram.botToken')}</Label>
        <div className="relative">
          <Input
            type={showToken ? 'text' : 'password'}
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            className="pe-10 font-mono text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute end-0 top-0 h-full w-10"
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Chat ID */}
      <div className="space-y-2">
        <Label>{t('telegram.chatId')}</Label>
        <Input
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="-1001234567890"
          className="font-mono text-sm"
        />
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={testing || !botToken || !chatId}
          className="gap-2"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t('telegram.testConnection')}
        </Button>
        {testResult && (
          <div className="flex items-center gap-1.5 text-sm">
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span className={testResult.success ? 'text-emerald-500' : 'text-red-500'}>
              {testResult.message}
            </span>
          </div>
        )}
      </div>

      {/* Notification Type Toggles */}
      <div className="border-t border-[var(--border-primary)] pt-6">
        <h3 className="mb-4 text-base font-semibold text-[var(--text-primary)]">
          {t('telegram.notificationToggles')}
        </h3>
        <div className="space-y-3">
          {TELEGRAM_TOGGLES.map((toggle) => (
            <div
              key={toggle.type}
              className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{toggle.emoji}</span>
                <span className="text-sm text-[var(--text-primary)]">
                  {t(toggle.labelKey)}
                </span>
              </div>
              <Switch
                checked={toggles[toggle.type] || false}
                onCheckedChange={(checked) =>
                  setToggles((prev) => ({ ...prev, [toggle.type]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end border-t border-[var(--border-primary)] pt-4">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('telegram.saveSettings')}
        </Button>
      </div>
    </div>
  );
}