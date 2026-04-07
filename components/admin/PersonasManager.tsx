'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  Search,
  RefreshCw,
  Drama,
  Loader2,
  ArrowUp,
  ArrowDown,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/utils/cn';

interface PersonaRow {
  id: string;
  name: string;
  name_en: string | null;
  description: string;
  description_en: string | null;
  system_prompt: string;
  icon_url: string | null;
  category_id: string | null;
  category_name?: string;
  type: string;
  is_active: boolean;
  slash_command: string | null;
  usage_count: number;
  sort_order: number;
  created_at: string;
}

interface CategoryOption {
  id: string;
  name: string;
  name_en: string;
}

interface PersonaFormState {
  open: boolean;
  mode: 'create' | 'edit';
  id: string;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  system_prompt: string;
  icon_url: string;
  category_id: string;
  type: 'basic' | 'premium';
  slash_command: string;
  sort_order: number;
}

const DEFAULT_FORM: PersonaFormState = {
  open: false,
  mode: 'create',
  id: '',
  name: '',
  name_en: '',
  description: '',
  description_en: '',
  system_prompt: '',
  icon_url: '',
  category_id: '',
  type: 'basic',
  slash_command: '',
  sort_order: 0,
};

export function PersonasManager() {
  const t = useTranslations('admin');
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { toast } = useToast();

  const [personas, setPersonas] = useState<PersonaRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'premium'>('basic');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [form, setForm] = useState<PersonaFormState>(DEFAULT_FORM);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: '', name: '' });

  /* Debounced search */
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [personasRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/personas'),
        fetch('/api/admin/categories'),
      ]);

      const personasResult = await personasRes.json();
      const categoriesResult = await categoriesRes.json();

      if (personasRes.ok && personasResult.success) {
        setPersonas(personasResult.data || []);
      }
      if (categoriesRes.ok && categoriesResult.success) {
        setCategories(
          (categoriesResult.data || []).map((c: CategoryOption & { persona_count?: number }) => ({
            id: c.id,
            name: c.name,
            name_en: c.name_en,
          }))
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPersonas = personas.filter((p) => {
    if (p.type !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesName =
        p.name.toLowerCase().includes(q) ||
        (p.name_en || '').toLowerCase().includes(q);
      if (!matchesName) return false;
    }
    if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;
    return true;
  });

  const sortedPersonas = [...filteredPersonas].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const openCreateForm = () => {
    const maxSort = personas
      .filter((p) => p.type === activeTab)
      .reduce((max, p) => Math.max(max, p.sort_order), 0);
    setForm({
      ...DEFAULT_FORM,
      open: true,
      mode: 'create',
      type: activeTab,
      sort_order: maxSort + 1,
    });
  };

  const openEditForm = (persona: PersonaRow) => {
    setForm({
      open: true,
      mode: 'edit',
      id: persona.id,
      name: persona.name,
      name_en: persona.name_en || '',
      description: persona.description,
      description_en: persona.description_en || '',
      system_prompt: persona.system_prompt,
      icon_url: persona.icon_url || '',
      category_id: persona.category_id || '',
      type: persona.type as 'basic' | 'premium',
      slash_command: persona.slash_command || '',
      sort_order: persona.sort_order,
    });
  };

  const handleFormSubmit = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.system_prompt.trim()) {
      toast({
        title: t('common.error'),
        description: t('personas.requiredFields'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        id: form.mode === 'edit' ? form.id : undefined,
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        description: form.description.trim(),
        description_en: form.description_en.trim() || null,
        system_prompt: form.system_prompt.trim(),
        icon_url: form.icon_url.trim() || null,
        category_id: form.category_id || null,
        type: form.type,
        slash_command: form.slash_command.trim() || null,
        sort_order: form.sort_order,
      };

      const method = form.mode === 'create' ? 'POST' : 'PATCH';
      const response = await fetch('/api/admin/personas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Action failed');
      }

      toast({
        title: t('common.success'),
        description:
          form.mode === 'create' ? t('personas.created') : t('personas.updated'),
      });
      setForm(DEFAULT_FORM);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch('/api/admin/personas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setPersonas((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !currentActive } : p))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Toggle failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/personas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteDialog.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      toast({ title: t('common.success'), description: t('personas.deleted') });
      setDeleteDialog({ open: false, id: '', name: '' });
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '—';
    const cat = categories.find((c) => c.id === categoryId);
    return locale === 'ar' ? cat?.name || '—' : cat?.name_en || cat?.name || '—';
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      );
    }

    if (sortedPersonas.length === 0) {
      return (
        <div className="flex flex-col items-center py-16">
          <Drama className="mb-3 h-10 w-10 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">{t('personas.noPersonas')}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-[var(--border-primary)]">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-[var(--surface-brand)]">
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('personas.icon')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('personas.name')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('personas.category')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('personas.slashCommand')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                {t('personas.usageCount')}
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
            {sortedPersonas.map((persona, idx) => (
              <tr
                key={persona.id}
                className={cn(
                  'border-b border-[var(--border-primary)] transition-colors hover:bg-[var(--bg-secondary)]',
                  idx % 2 === 1 && 'bg-[var(--bg-tertiary)]/30'
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-lg">
                    {persona.icon_url ? (
                      persona.icon_url.startsWith('http') ? (
                        <img
                          src={persona.icon_url}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <span>{persona.icon_url}</span>
                      )
                    ) : (
                      <Drama className="h-5 w-5 text-[var(--accent-primary)]" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {persona.name}
                  </p>
                  {persona.name_en && (
                    <p className="text-xs text-[var(--text-muted)]">{persona.name_en}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {getCategoryName(persona.category_id)}
                </td>
                <td className="px-4 py-3">
                  {persona.slash_command ? (
                    <code className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-xs font-mono text-[var(--accent-primary)]">
                      /{persona.slash_command}
                    </code>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-sm text-[var(--text-secondary)]">
                  {persona.usage_count.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={persona.is_active}
                    onCheckedChange={() =>
                      handleToggleActive(persona.id, persona.is_active)
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === 0}
                      onClick={async () => {
                        if (idx === 0) return;
                        const prev = sortedPersonas[idx - 1];
                        await Promise.all([
                          fetch('/api/admin/personas', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: persona.id,
                              sort_order: prev.sort_order,
                            }),
                          }),
                          fetch('/api/admin/personas', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: prev.id,
                              sort_order: persona.sort_order,
                            }),
                          }),
                        ]);
                        fetchData();
                      }}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <span className="min-w-[20px] text-center text-xs text-[var(--text-muted)]">
                      {persona.sort_order}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === sortedPersonas.length - 1}
                      onClick={async () => {
                        if (idx === sortedPersonas.length - 1) return;
                        const next = sortedPersonas[idx + 1];
                        await Promise.all([
                          fetch('/api/admin/personas', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: persona.id,
                              sort_order: next.sort_order,
                            }),
                          }),
                          fetch('/api/admin/personas', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: next.id,
                              sort_order: persona.sort_order,
                            }),
                          }),
                        ]);
                        fetchData();
                      }}
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
                      <DropdownMenuItem onClick={() => openEditForm(persona)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          setDeleteDialog({ open: true, id: persona.id, name: persona.name })
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
    );
  };

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'basic' | 'premium')}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="basic">{t('personas.basicTab')}</TabsTrigger>
            <TabsTrigger value="premium">{t('personas.premiumTab')}</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative max-w-[220px]">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                placeholder={t('personas.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="ps-9 text-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('personas.allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('personas.allCategories')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {locale === 'ar' ? cat.name : cat.name_en || cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button onClick={openCreateForm} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('personas.addNew')}
            </Button>
          </div>
        </div>

        <TabsContent value="basic" className="mt-4">
          {renderTable()}
        </TabsContent>
        <TabsContent value="premium" className="mt-4">
          {renderTable()}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={form.open} onOpenChange={(open) => setForm((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.mode === 'create' ? t('personas.addNew') : t('personas.editPersona')}
            </DialogTitle>
            <DialogDescription>
              {form.mode === 'create'
                ? t('personas.addDescription')
                : t('personas.editDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('personas.nameAr')} *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('personas.nameEn')}</Label>
              <Input
                value={form.name_en}
                onChange={(e) => setForm((prev) => ({ ...prev, name_en: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('personas.descriptionAr')} *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
                dir="rtl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('personas.descriptionEn')}</Label>
              <Textarea
                value={form.description_en}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description_en: e.target.value }))
                }
                rows={2}
                dir="ltr"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>{t('personas.systemPrompt')} *</Label>
                <span className="text-xs text-[var(--text-muted)]">
                  {form.system_prompt.length} {t('personas.chars')}
                </span>
              </div>
              <Textarea
                value={form.system_prompt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, system_prompt: e.target.value }))
                }
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('personas.iconUrl')}</Label>
              <Input
                value={form.icon_url}
                onChange={(e) => setForm((prev) => ({ ...prev, icon_url: e.target.value }))}
                placeholder="🎯 or https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t('personas.category')}</Label>
              <Select
                value={form.category_id || 'none'}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, category_id: v === 'none' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('personas.noCategory')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {locale === 'ar' ? cat.name : cat.name_en || cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('personas.type')}</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, type: v as 'basic' | 'premium' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">{t('personas.basicTab')}</SelectItem>
                  <SelectItem value="premium">{t('personas.premiumTab')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('personas.slashCommand')}</Label>
              <div className="relative">
                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                  /
                </span>
                <Input
                  value={form.slash_command}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slash_command: e.target.value.replace('/', '') }))
                  }
                  className="ps-7 font-mono"
                  placeholder="linkedin_expert"
                />
              </div>
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

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('personas.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('personas.deleteDescription', { name: deleteDialog.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, id: '', name: '' })}
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