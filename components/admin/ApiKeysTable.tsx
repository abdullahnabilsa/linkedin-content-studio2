'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Plus,
  MoreHorizontal,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  KeyRound,
  Loader2,
  RefreshCw,
  Bot,
  Zap,
  Brain,
  Sparkles,
  Cloud,
  Cpu,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface ApiKeyRow {
  id: string;
  platform: string;
  label: string;
  is_active: boolean;
  is_global: boolean;
  last_used_at: string | null;
  created_at: string;
  model_count: number;
}

interface KeyFormState {
  open: boolean;
  mode: 'create' | 'edit';
  id: string;
  platform: string;
  key: string;
  label: string;
  showKey: boolean;
}

const PLATFORMS = [
  { value: 'openrouter', label: 'OpenRouter', icon: Zap },
  { value: 'groq', label: 'Groq', icon: Flame },
  { value: 'openai', label: 'OpenAI', icon: Brain },
  { value: 'anthropic', label: 'Anthropic', icon: Sparkles },
  { value: 'gemini', label: 'Google Gemini', icon: Bot },
  { value: 'together', label: 'Together AI', icon: Cloud },
  { value: 'mistral', label: 'Mistral', icon: Cpu },
];

export function ApiKeysTable() {
  const t = useTranslations('admin');
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { toast } = useToast();

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [formState, setFormState] = useState<KeyFormState>({
    open: false,
    mode: 'create',
    id: '',
    platform: '',
    key: '',
    label: '',
    showKey: false,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    label: string;
    modelCount: number;
  }>({
    open: false,
    id: '',
    label: '',
    modelCount: 0,
  });

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/api-keys');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch API keys');
      }

      setKeys(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch API keys';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const getPlatformInfo = (platform: string) => {
    return PLATFORMS.find((p) => p.value === platform) || {
      value: platform,
      label: platform,
      icon: KeyRound,
    };
  };

  const openCreateDialog = () => {
    setFormState({
      open: true,
      mode: 'create',
      id: '',
      platform: '',
      key: '',
      label: '',
      showKey: false,
    });
  };

  const openEditDialog = (apiKey: ApiKeyRow) => {
    setFormState({
      open: true,
      mode: 'edit',
      id: apiKey.id,
      platform: apiKey.platform,
      key: '',
      label: apiKey.label,
      showKey: false,
    });
  };

  const handleFormSubmit = async () => {
    if (formState.mode === 'create') {
      if (!formState.platform || !formState.key || !formState.label) {
        toast({
          title: t('common.error'),
          description: t('apiKeys.allFieldsRequired'),
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setActionLoading(true);

      if (formState.mode === 'create') {
        const response = await fetch('/api/admin/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: formState.platform,
            key: formState.key,
            label: formState.label,
          }),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to create API key');
        }

        toast({ title: t('common.success'), description: t('apiKeys.created') });
      } else {
        const body: Record<string, string> = { id: formState.id, label: formState.label };
        if (formState.key) {
          body.key = formState.key;
        }

        const response = await fetch('/api/admin/api-keys', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to update API key');
        }

        toast({ title: t('common.success'), description: t('apiKeys.updated') });
      }

      setFormState((prev) => ({ ...prev, open: false }));
      fetchKeys();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to toggle');
      }

      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, is_active: !currentActive } : k))
      );
      toast({
        title: t('common.success'),
        description: !currentActive ? t('apiKeys.activated') : t('apiKeys.deactivated'),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Toggle failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteDialog.id }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete');
      }

      toast({ title: t('common.success'), description: t('apiKeys.deleted') });
      setDeleteDialog((prev) => ({ ...prev, open: false }));
      fetchKeys();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {t('apiKeys.description')}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchKeys} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('apiKeys.addNew')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-primary)]">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-[var(--surface-brand)]">
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('apiKeys.platform')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('apiKeys.label')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                {t('apiKeys.status')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('apiKeys.lastUsed')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                {t('apiKeys.models')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('apiKeys.created')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                {t('users.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-[var(--border-primary)]">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={`skeleton-${i}-${j}`} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <KeyRound className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">{t('apiKeys.noKeys')}</p>
                  <Button onClick={openCreateDialog} className="mt-3 gap-2" size="sm">
                    <Plus className="h-4 w-4" />
                    {t('apiKeys.addFirst')}
                  </Button>
                </td>
              </tr>
            ) : (
              keys.map((apiKey, index) => {
                const platformInfo = getPlatformInfo(apiKey.platform);
                const PlatformIcon = platformInfo.icon;

                return (
                  <tr
                    key={apiKey.id}
                    className={cn(
                      'border-b border-[var(--border-primary)] transition-colors hover:bg-[var(--bg-secondary)]',
                      index % 2 === 1 && 'bg-[var(--bg-tertiary)]/30'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PlatformIcon className="h-5 w-5 text-[var(--accent-primary)]" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {platformInfo.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {apiKey.label}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={apiKey.is_active}
                        onCheckedChange={() =>
                          handleToggleActive(apiKey.id, apiKey.is_active)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {formatDate(apiKey.last_used_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline">{apiKey.model_count}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {formatDate(apiKey.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(apiKey)}
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                id: apiKey.id,
                                label: apiKey.label,
                                modelCount: apiKey.model_count,
                              })
                            }
                            className="gap-2 text-red-500 focus:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formState.mode === 'create' ? t('apiKeys.addNew') : t('apiKeys.editKey')}
            </DialogTitle>
            <DialogDescription>
              {formState.mode === 'create'
                ? t('apiKeys.addDescription')
                : t('apiKeys.editDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Platform (only for create) */}
            {formState.mode === 'create' && (
              <div className="space-y-2">
                <Label>{t('apiKeys.platform')}</Label>
                <Select
                  value={formState.platform}
                  onValueChange={(v) =>
                    setFormState((prev) => ({ ...prev, platform: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('apiKeys.selectPlatform')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => {
                      const Icon = p.icon;
                      return (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {p.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Label */}
            <div className="space-y-2">
              <Label>{t('apiKeys.label')}</Label>
              <Input
                value={formState.label}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder={t('apiKeys.labelPlaceholder')}
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label>
                {t('apiKeys.apiKey')}
                {formState.mode === 'edit' && (
                  <span className="ms-1 text-xs text-[var(--text-muted)]">
                    ({t('apiKeys.leaveBlankToKeep')})
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  type={formState.showKey ? 'text' : 'password'}
                  value={formState.key}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, key: e.target.value }))
                  }
                  placeholder={
                    formState.mode === 'edit'
                      ? t('apiKeys.enterNewKey')
                      : t('apiKeys.enterKey')
                  }
                  className="pe-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-0 top-0 h-full w-10"
                  onClick={() =>
                    setFormState((prev) => ({ ...prev, showKey: !prev.showKey }))
                  }
                >
                  {formState.showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormState((prev) => ({ ...prev, open: false }))}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleFormSubmit} disabled={actionLoading}>
              {actionLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {formState.mode === 'create' ? t('common.create') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('apiKeys.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('apiKeys.deleteDescription', {
                label: deleteDialog.label,
                count: deleteDialog.modelCount,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog((prev) => ({ ...prev, open: false }))}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}