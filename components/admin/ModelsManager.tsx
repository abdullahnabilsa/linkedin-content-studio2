'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Bot,
  KeyRound,
  Loader2,
  RefreshCw,
  Download,
  CheckSquare,
  Square,
  Zap,
  Flame,
  Brain,
  Sparkles,
  Cloud,
  Cpu,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/utils/cn';

interface ModelRow {
  id: string;
  api_key_id: string;
  model_id: string;
  model_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface ApiKeyGroup {
  id: string;
  platform: string;
  label: string;
  is_active: boolean;
  models: ModelRow[];
}

interface ModelFormState {
  open: boolean;
  mode: 'create' | 'edit';
  id: string;
  apiKeyId: string;
  modelId: string;
  modelName: string;
  sortOrder: number;
}

interface FetchModelsDialogState {
  open: boolean;
  apiKeyId: string;
  platform: string;
  loading: boolean;
  availableModels: Array<{ id: string; name: string }>;
  selectedModels: Set<string>;
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  openrouter: Zap,
  groq: Flame,
  openai: Brain,
  anthropic: Sparkles,
  gemini: Bot,
  together: Cloud,
  mistral: Cpu,
};

export function ModelsManager() {
  const t = useTranslations('admin');
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { toast } = useToast();

  const [groups, setGroups] = useState<ApiKeyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const [modelForm, setModelForm] = useState<ModelFormState>({
    open: false,
    mode: 'create',
    id: '',
    apiKeyId: '',
    modelId: '',
    modelName: '',
    sortOrder: 0,
  });

  const [fetchDialog, setFetchDialog] = useState<FetchModelsDialogState>({
    open: false,
    apiKeyId: '',
    platform: '',
    loading: false,
    availableModels: [],
    selectedModels: new Set(),
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({
    open: false,
    id: '',
    name: '',
  });

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/models');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch models');
      }

      setGroups(result.data);
      /* Auto-expand all groups on first load */
      if (result.data.length > 0 && expandedKeys.size === 0) {
        setExpandedKeys(new Set(result.data.map((g: ApiKeyGroup) => g.id)));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch models';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const toggleExpanded = (keyId: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const getPlatformIcon = (platform: string) => {
    return PLATFORM_ICONS[platform] || KeyRound;
  };

  /* ===== Model CRUD ===== */

  const openAddModelForm = (apiKeyId: string) => {
    const group = groups.find((g) => g.id === apiKeyId);
    const maxSort = group
      ? Math.max(0, ...group.models.map((m) => m.sort_order))
      : 0;

    setModelForm({
      open: true,
      mode: 'create',
      id: '',
      apiKeyId,
      modelId: '',
      modelName: '',
      sortOrder: maxSort + 1,
    });
  };

  const openEditModelForm = (model: ModelRow) => {
    setModelForm({
      open: true,
      mode: 'edit',
      id: model.id,
      apiKeyId: model.api_key_id,
      modelId: model.model_id,
      modelName: model.model_name,
      sortOrder: model.sort_order,
    });
  };

  const handleModelFormSubmit = async () => {
    if (!modelForm.modelId.trim() || !modelForm.modelName.trim()) {
      toast({
        title: t('common.error'),
        description: t('models.allFieldsRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);

      if (modelForm.mode === 'create') {
        const response = await fetch('/api/admin/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key_id: modelForm.apiKeyId,
            model_id: modelForm.modelId,
            model_name: modelForm.modelName,
            sort_order: modelForm.sortOrder,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to create model');
        }
        toast({ title: t('common.success'), description: t('models.created') });
      } else {
        const response = await fetch('/api/admin/models', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: modelForm.id,
            model_id: modelForm.modelId,
            model_name: modelForm.modelName,
            sort_order: modelForm.sortOrder,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to update model');
        }
        toast({ title: t('common.success'), description: t('models.updated') });
      }

      setModelForm((prev) => ({ ...prev, open: false }));
      fetchGroups();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleModel = async (modelId: string, currentActive: boolean) => {
    try {
      const response = await fetch('/api/admin/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: modelId, is_active: !currentActive }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to toggle');
      }

      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          models: g.models.map((m) =>
            m.id === modelId ? { ...m, is_active: !currentActive } : m
          ),
        }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Toggle failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    }
  };

  const handleMoveSortOrder = async (
    model: ModelRow,
    direction: 'up' | 'down',
    groupModels: ModelRow[]
  ) => {
    const sorted = [...groupModels].sort((a, b) => a.sort_order - b.sort_order);
    const currentIndex = sorted.findIndex((m) => m.id === model.id);
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const swapModel = sorted[swapIndex];

    try {
      await Promise.all([
        fetch('/api/admin/models', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: model.id, sort_order: swapModel.sort_order }),
        }),
        fetch('/api/admin/models', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: swapModel.id, sort_order: model.sort_order }),
        }),
      ]);
      fetchGroups();
    } catch {
      toast({ title: t('common.error'), description: t('models.reorderFailed'), variant: 'destructive' });
    }
  };

  const handleDeleteModel = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/models', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteDialog.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete');
      }
      toast({ title: t('common.success'), description: t('models.deleted') });
      setDeleteDialog((prev) => ({ ...prev, open: false }));
      fetchGroups();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  /* ===== Auto-fetch models ===== */

  const openFetchDialog = (apiKeyId: string, platform: string) => {
    setFetchDialog({
      open: true,
      apiKeyId,
      platform,
      loading: true,
      availableModels: [],
      selectedModels: new Set(),
    });
    fetchAvailableModels(apiKeyId, platform);
  };

  const fetchAvailableModels = async (apiKeyId: string, platform: string) => {
    try {
      const response = await fetch(
        `/api/models?platform=${platform}&apiType=public&apiKeyId=${apiKeyId}&fetchAll=true`
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch available models');
      }

      const models = (result.data || []).map((m: { id: string; name?: string }) => ({
        id: m.id,
        name: m.name || m.id,
      }));

      setFetchDialog((prev) => ({
        ...prev,
        loading: false,
        availableModels: models,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fetch failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
      setFetchDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const toggleFetchSelection = (modelId: string) => {
    setFetchDialog((prev) => {
      const next = new Set(prev.selectedModels);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return { ...prev, selectedModels: next };
    });
  };

  const handleAddSelectedModels = async () => {
    if (fetchDialog.selectedModels.size === 0) {
      toast({
        title: t('common.error'),
        description: t('models.selectAtLeastOne'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      const existingGroup = groups.find((g) => g.id === fetchDialog.apiKeyId);
      const existingModelIds = new Set(existingGroup?.models.map((m) => m.model_id) || []);

      const newModels = Array.from(fetchDialog.selectedModels).filter(
        (id) => !existingModelIds.has(id)
      );

      if (newModels.length === 0) {
        toast({
          title: t('common.info'),
          description: t('models.allAlreadyAdded'),
        });
        setFetchDialog((prev) => ({ ...prev, open: false }));
        return;
      }

      let maxSort = existingGroup
        ? Math.max(0, ...existingGroup.models.map((m) => m.sort_order))
        : 0;

      for (const modelId of newModels) {
        maxSort += 1;
        const modelInfo = fetchDialog.availableModels.find((m) => m.id === modelId);
        await fetch('/api/admin/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key_id: fetchDialog.apiKeyId,
            model_id: modelId,
            model_name: modelInfo?.name || modelId,
            sort_order: maxSort,
          }),
        });
      }

      toast({
        title: t('common.success'),
        description: t('models.addedCount', { count: newModels.length }),
      });
      setFetchDialog((prev) => ({ ...prev, open: false }));
      fetchGroups();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add models';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Bot className="mb-4 h-12 w-12 text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">{t('models.noApiKeys')}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{t('models.addApiKeyFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {t('models.description')}
        </p>
        <Button variant="outline" size="icon" onClick={fetchGroups} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {groups.map((group) => {
        const PlatformIcon = getPlatformIcon(group.platform);
        const isExpanded = expandedKeys.has(group.id);
        const sortedModels = [...group.models].sort(
          (a, b) => a.sort_order - b.sort_order
        );

        return (
          <Collapsible
            key={group.id}
            open={isExpanded}
            onOpenChange={() => toggleExpanded(group.id)}
          >
            <div className="overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)]">
              {/* Group Header */}
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between px-5 py-4 text-start transition-colors hover:bg-[var(--bg-secondary)]">
                  <div className="flex items-center gap-3">
                    <PlatformIcon className="h-5 w-5 text-[var(--accent-primary)]" />
                    <div>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {group.label}
                      </span>
                      <span className="ms-2 text-xs text-[var(--text-muted)]">
                        ({group.platform})
                      </span>
                    </div>
                    <Badge variant={group.is_active ? 'default' : 'secondary'}>
                      {group.is_active ? t('apiKeys.active') : t('apiKeys.inactive')}
                    </Badge>
                    <Badge variant="outline">
                      {group.models.length} {t('models.modelsCount')}
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                  )}
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-[var(--border-primary)]">
                  {/* Action bar */}
                  <div className="flex items-center gap-2 border-b border-[var(--border-primary)] px-5 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => openAddModelForm(group.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('models.addManual')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => openFetchDialog(group.id, group.platform)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t('models.autoFetch')}
                    </Button>
                  </div>

                  {/* Models list */}
                  {sortedModels.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <p className="text-sm text-[var(--text-muted)]">
                        {t('models.noModels')}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                            <th className="px-5 py-2 text-start text-xs font-semibold text-[var(--text-secondary)]">
                              {t('models.displayName')}
                            </th>
                            <th className="px-5 py-2 text-start text-xs font-semibold text-[var(--text-secondary)]">
                              {t('models.modelId')}
                            </th>
                            <th className="px-5 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]">
                              {t('apiKeys.status')}
                            </th>
                            <th className="px-5 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]">
                              {t('models.order')}
                            </th>
                            <th className="px-5 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]">
                              {t('users.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedModels.map((model, idx) => (
                            <tr
                              key={model.id}
                              className={cn(
                                'border-b border-[var(--border-primary)] last:border-0 transition-colors hover:bg-[var(--bg-secondary)]',
                                idx % 2 === 1 && 'bg-[var(--bg-tertiary)]/30'
                              )}
                            >
                              <td className="px-5 py-2.5 text-sm font-medium text-[var(--text-primary)]">
                                {model.model_name}
                              </td>
                              <td className="px-5 py-2.5">
                                <code className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-xs font-mono text-[var(--text-secondary)]">
                                  {model.model_id}
                                </code>
                              </td>
                              <td className="px-5 py-2.5 text-center">
                                <Switch
                                  checked={model.is_active}
                                  onCheckedChange={() =>
                                    handleToggleModel(model.id, model.is_active)
                                  }
                                />
                              </td>
                              <td className="px-5 py-2.5">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    disabled={idx === 0}
                                    onClick={() =>
                                      handleMoveSortOrder(model, 'up', sortedModels)
                                    }
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </Button>
                                  <span className="min-w-[20px] text-center text-xs text-[var(--text-muted)]">
                                    {model.sort_order}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    disabled={idx === sortedModels.length - 1}
                                    onClick={() =>
                                      handleMoveSortOrder(model, 'down', sortedModels)
                                    }
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                              <td className="px-5 py-2.5 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => openEditModelForm(model)}
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
                                          id: model.id,
                                          name: model.model_name,
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {/* Add/Edit Model Dialog */}
      <Dialog
        open={modelForm.open}
        onOpenChange={(open) => setModelForm((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modelForm.mode === 'create' ? t('models.addModel') : t('models.editModel')}
            </DialogTitle>
            <DialogDescription>
              {modelForm.mode === 'create'
                ? t('models.addModelDescription')
                : t('models.editModelDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('models.modelId')}</Label>
              <Input
                value={modelForm.modelId}
                onChange={(e) =>
                  setModelForm((prev) => ({ ...prev, modelId: e.target.value }))
                }
                placeholder="e.g. gpt-4o-mini"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('models.displayName')}</Label>
              <Input
                value={modelForm.modelName}
                onChange={(e) =>
                  setModelForm((prev) => ({ ...prev, modelName: e.target.value }))
                }
                placeholder="e.g. GPT-4o Mini"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('models.sortOrder')}</Label>
              <Input
                type="number"
                min={0}
                value={modelForm.sortOrder}
                onChange={(e) =>
                  setModelForm((prev) => ({
                    ...prev,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModelForm((prev) => ({ ...prev, open: false }))}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleModelFormSubmit} disabled={actionLoading}>
              {actionLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {modelForm.mode === 'create' ? t('common.create') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Model Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('models.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('models.deleteDescription', { name: deleteDialog.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog((prev) => ({ ...prev, open: false }))}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteModel} disabled={actionLoading}>
              {actionLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Fetch Models Dialog */}
      <Dialog
        open={fetchDialog.open}
        onOpenChange={(open) => setFetchDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('models.fetchTitle')}</DialogTitle>
            <DialogDescription>
              {t('models.fetchDescription', { platform: fetchDialog.platform })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            {fetchDialog.loading ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-[var(--accent-primary)]" />
                <p className="text-sm text-[var(--text-muted)]">{t('models.fetching')}</p>
              </div>
            ) : fetchDialog.availableModels.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                {t('models.noModelsFound')}
              </p>
            ) : (
              <div className="space-y-1">
                {/* Select All */}
                <button
                  onClick={() => {
                    const allIds = fetchDialog.availableModels.map((m) => m.id);
                    const allSelected =
                      fetchDialog.selectedModels.size === allIds.length;
                    setFetchDialog((prev) => ({
                      ...prev,
                      selectedModels: allSelected
                        ? new Set()
                        : new Set(allIds),
                    }));
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)]"
                >
                  {fetchDialog.selectedModels.size ===
                  fetchDialog.availableModels.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {t('models.selectAll')} ({fetchDialog.availableModels.length})
                </button>

                {fetchDialog.availableModels.map((model) => {
                  const isSelected = fetchDialog.selectedModels.has(model.id);
                  return (
                    <button
                      key={model.id}
                      onClick={() => toggleFetchSelection(model.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors',
                        isSelected
                          ? 'bg-[var(--accent-primary)]/10 text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                      )}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                      ) : (
                        <Square className="h-4 w-4 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{model.name}</p>
                        <p className="truncate font-mono text-xs text-[var(--text-muted)]">
                          {model.id}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3">
            <Button
              variant="outline"
              onClick={() => setFetchDialog((prev) => ({ ...prev, open: false }))}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddSelectedModels}
              disabled={actionLoading || fetchDialog.selectedModels.size === 0}
            >
              {actionLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('models.addSelected', { count: fetchDialog.selectedModels.size })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}