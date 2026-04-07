'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  RefreshCw,
  FolderTree,
  Loader2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/utils/cn';

interface CategoryRow {
  id: string;
  name: string;
  name_en: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  persona_count: number;
  created_at: string;
}

interface CategoryFormState {
  open: boolean;
  mode: 'create' | 'edit';
  id: string;
  name: string;
  name_en: string;
  icon: string;
  description: string;
  sort_order: number;
}

interface DeleteDialogState {
  open: boolean;
  id: string;
  name: string;
  personaCount: number;
  action: 'move' | 'delete';
  targetCategoryId: string;
}

const DEFAULT_FORM: CategoryFormState = {
  open: false,
  mode: 'create',
  id: '',
  name: '',
  name_en: '',
  icon: '',
  description: '',
  sort_order: 0,
};

export function CategoriesManager() {
  const t = useTranslations('admin');
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { toast } = useToast();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(DEFAULT_FORM);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    id: '',
    name: '',
    personaCount: 0,
    action: 'move',
    targetCategoryId: '',
  });

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/categories');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setCategories(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fetch failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  const openCreateForm = () => {
    const maxSort = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
    setForm({ ...DEFAULT_FORM, open: true, sort_order: maxSort + 1 });
  };

  const openEditForm = (cat: CategoryRow) => {
    setForm({
      open: true,
      mode: 'edit',
      id: cat.id,
      name: cat.name,
      name_en: cat.name_en,
      icon: cat.icon || '',
      description: cat.description || '',
      sort_order: cat.sort_order,
    });
  };

  const handleFormSubmit = async () => {
    if (!form.name.trim() || !form.name_en.trim()) {
      toast({
        title: t('common.error'),
        description: t('categories.requiredFields'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        id: form.mode === 'edit' ? form.id : undefined,
        name: form.name.trim(),
        name_en: form.name_en.trim(),
        icon: form.icon.trim() || null,
        description: form.description.trim() || null,
        sort_order: form.sort_order,
      };

      const method = form.mode === 'create' ? 'POST' : 'PATCH';
      const response = await fetch('/api/admin/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);

      toast({
        title: t('common.success'),
        description:
          form.mode === 'create' ? t('categories.created') : t('categories.updated'),
      });
      setForm(DEFAULT_FORM);
      fetchCategories();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !currentActive } : c))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Toggle failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    }
  };

  const openDeleteDialog = (cat: CategoryRow) => {
    const otherActive = categories.filter((c) => c.id !== cat.id && c.is_active);
    if (cat.persona_count > 0 && otherActive.length === 0) {
      toast({
        title: t('common.error'),
        description: t('categories.cannotDeleteLast'),
        variant: 'destructive',
      });
      return;
    }
    setDeleteDialog({
      open: true,
      id: cat.id,
      name: cat.name,
      personaCount: cat.persona_count,
      action: cat.persona_count > 0 ? 'move' : 'delete',
      targetCategoryId: '',
    });
  };

  const handleDelete = async () => {
    if (
      deleteDialog.personaCount > 0 &&
      deleteDialog.action === 'move' &&
      !deleteDialog.targetCategoryId
    ) {
      toast({
        title: t('common.error'),
        description: t('categories.selectTarget'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deleteDialog.id,
          action: deleteDialog.personaCount > 0 ? deleteDialog.action : 'delete',
          targetCategoryId: deleteDialog.targetCategoryId || null,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      toast({ title: t('common.success'), description: t('categories.deleted') });
      setDeleteDialog((prev) => ({ ...prev, open: false }));
      fetchCategories();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const swapOrder = async (idx: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await Promise.all([
      fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, sort_order: b.sort_order }),
      }),
      fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: b.id, sort_order: a.sort_order }),
      }),
    ]);
    fetchCategories();
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">{t('categories.description')}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchCategories}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openCreateForm} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('categories.addNew')}
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <FolderTree className="mb-3 h-10 w-10 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">{t('categories.noCategories')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-primary)]">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-[var(--surface-brand)]">
                <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                  {t('categories.icon')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                  {t('categories.nameAr')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                  {t('categories.nameEn')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                  {t('categories.personas')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                  {t('personas.statusLabel')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                  {t('personas.orderLabel')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                  {t('common.edit')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((cat, idx) => (
                <tr
                  key={cat.id}
                  className={cn(
                    'border-b border-[var(--border-primary)] transition-colors hover:bg-[var(--bg-secondary)]',
                    idx % 2 === 1 && 'bg-[var(--bg-tertiary)]/30'
                  )}
                >
                  <td className="px-4 py-3 text-lg">{cat.icon || '📁'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                    {cat.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {cat.name_en}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline">{cat.persona_count}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={cat.is_active}
                      onCheckedChange={() => handleToggleActive(cat.id, cat.is_active)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === 0}
                        onClick={() => swapOrder(idx, 'up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <span className="min-w-[20px] text-center text-xs text-[var(--text-muted)]">
                        {cat.sort_order}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === sorted.length - 1}
                        onClick={() => swapOrder(idx, 'down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditForm(cat)} className="gap-2">
                          <Pencil className="h-4 w-4" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(cat)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={form.open} onOpenChange={(open) => setForm((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form.mode === 'create' ? t('categories.addNew') : t('categories.editCategory')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('categories.nameAr')} *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('categories.nameEn')} *</Label>
              <Input
                value={form.name_en}
                onChange={(e) => setForm((prev) => ({ ...prev, name_en: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('categories.icon')}</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                placeholder="📁"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('categories.descriptionLabel')}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('personas.sortOrder')}</Label>
              <Input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sort_order: parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(DEFAULT_FORM)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleFormSubmit} disabled={actionLoading}>
              {actionLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {form.mode === 'create' ? t('common.create') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog with persona handling */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('categories.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {deleteDialog.personaCount > 0
                ? t('categories.deleteWithPersonas', {
                    name: deleteDialog.name,
                    count: deleteDialog.personaCount,
                  })
                : t('categories.deleteConfirm', { name: deleteDialog.name })}
            </DialogDescription>
          </DialogHeader>

          {deleteDialog.personaCount > 0 && (
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {t('categories.personaWarning', { count: deleteDialog.personaCount })}
                </span>
              </div>

              <RadioGroup
                value={deleteDialog.action}
                onValueChange={(v) =>
                  setDeleteDialog((prev) => ({
                    ...prev,
                    action: v as 'move' | 'delete',
                  }))
                }
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="move" id="action-move" />
                  <Label htmlFor="action-move">{t('categories.movePersonas')}</Label>
                </div>
                {deleteDialog.action === 'move' && (
                  <Select
                    value={deleteDialog.targetCategoryId}
                    onValueChange={(v) =>
                      setDeleteDialog((prev) => ({ ...prev, targetCategoryId: v }))
                    }
                  >
                    <SelectTrigger className="ms-6">
                      <SelectValue placeholder={t('categories.selectTarget')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c.id !== deleteDialog.id && c.is_active)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {locale === 'ar' ? c.name : c.name_en}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="delete" id="action-delete" />
                  <Label htmlFor="action-delete" className="text-red-500">
                    {t('categories.deleteAllPersonas')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

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