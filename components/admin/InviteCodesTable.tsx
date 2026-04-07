'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
  Link,
  RefreshCw,
  TicketCheck,
  Loader2,
  Eye,
  XCircle,
  Shuffle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

interface InviteCodeRow {
  id: string;
  code: string;
  created_by: string;
  creator_email?: string;
  max_uses: number;
  current_uses: number;
  duration_type: string;
  fixed_start_date: string | null;
  fixed_end_date: string | null;
  relative_days: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  uses: Array<{ user_email: string; used_at: string }>;
}

type CodeStatus = 'active' | 'expired' | 'exhausted' | 'deactivated';

interface CreateFormState {
  open: boolean;
  code: string;
  max_uses: number;
  duration_type: 'fixed' | 'relative';
  fixed_start_date: string;
  fixed_end_date: string;
  relative_days: number;
  expires_at: string;
}

export function InviteCodesTable() {
  const t = useTranslations('admin');
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { toast } = useToast();

  const [codes, setCodes] = useState<InviteCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [createForm, setCreateForm] = useState<CreateFormState>({
    open: false,
    code: '',
    max_uses: 1,
    duration_type: 'relative',
    fixed_start_date: new Date().toISOString().split('T')[0],
    fixed_end_date: '',
    relative_days: 30,
    expires_at: '',
  });

  const [usesDialog, setUsesDialog] = useState<{
    open: boolean;
    code: string;
    uses: Array<{ user_email: string; used_at: string }>;
  }>({ open: false, code: '', uses: [] });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    code: string;
  }>({ open: false, id: '', code: '' });

  const fetchCodes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/invite-codes?page=${page}&limit=${limit}`
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setCodes(result.data.codes || []);
      setTotal(result.data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fetch failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, t, toast]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const generateCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const getCodeStatus = (code: InviteCodeRow): CodeStatus => {
    if (!code.is_active) return 'deactivated';
    if (code.current_uses >= code.max_uses) return 'exhausted';
    if (code.expires_at && new Date(code.expires_at) <= new Date()) return 'expired';
    return 'active';
  };

  const getStatusBadge = (status: CodeStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/80 text-white">{t('inviteCodes.active')}</Badge>;
      case 'expired':
        return <Badge variant="secondary">{t('inviteCodes.expired')}</Badge>;
      case 'exhausted':
        return <Badge className="bg-amber-500/80 text-white">{t('inviteCodes.exhausted')}</Badge>;
      case 'deactivated':
        return <Badge variant="destructive">{t('inviteCodes.deactivated')}</Badge>;
    }
  };

  const getDurationDisplay = (code: InviteCodeRow) => {
    if (code.duration_type === 'fixed') {
      const start = code.fixed_start_date
        ? formatDate(code.fixed_start_date)
        : '—';
      const end = code.fixed_end_date ? formatDate(code.fixed_end_date) : '—';
      return `${start} → ${end}`;
    }
    return t('inviteCodes.relativeDaysDisplay', { days: code.relative_days || 0 });
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({ title: t('common.success'), description: t('inviteCodes.codeCopied') });
    });
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/${locale}/invite/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: t('common.success'), description: t('inviteCodes.linkCopied') });
    });
  };

  const handleCreate = async () => {
    const code = createForm.code.trim().toUpperCase();
    if (!code) {
      toast({
        title: t('common.error'),
        description: t('inviteCodes.codeRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          max_uses: createForm.max_uses,
          duration_type: createForm.duration_type,
          fixed_start_date:
            createForm.duration_type === 'fixed' ? createForm.fixed_start_date : null,
          fixed_end_date:
            createForm.duration_type === 'fixed' ? createForm.fixed_end_date : null,
          relative_days:
            createForm.duration_type === 'relative' ? createForm.relative_days : null,
          expires_at: createForm.expires_at || null,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);

      toast({ title: t('common.success'), description: t('inviteCodes.created') });
      setCreateForm((prev) => ({ ...prev, open: false }));
      fetchCodes();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const response = await fetch('/api/admin/invite-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: false }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      toast({ title: t('common.success'), description: t('inviteCodes.deactivatedSuccess') });
      fetchCodes();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/invite-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteDialog.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      toast({ title: t('common.success'), description: t('inviteCodes.deleted') });
      setDeleteDialog({ open: false, id: '', code: '' });
      fetchCodes();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {t('inviteCodes.description')}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchCodes} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button
            onClick={() =>
              setCreateForm({
                open: true,
                code: generateCode(),
                max_uses: 1,
                duration_type: 'relative',
                fixed_start_date: new Date().toISOString().split('T')[0],
                fixed_end_date: '',
                relative_days: 30,
                expires_at: '',
              })
            }
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('inviteCodes.createNew')}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border-primary)]">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-[var(--surface-brand)]">
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">{t('inviteCodes.code')}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white">{t('inviteCodes.uses')}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">{t('inviteCodes.durationType')}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">{t('inviteCodes.duration')}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">{t('inviteCodes.codeExpiry')}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white">{t('inviteCodes.statusLabel')}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">{t('inviteCodes.createdDate')}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white">{t('common.edit')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border-primary)]">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : codes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <TicketCheck className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">{t('inviteCodes.noCodes')}</p>
                </td>
              </tr>
            ) : (
              codes.map((code, idx) => {
                const status = getCodeStatus(code);
                return (
                  <tr
                    key={code.id}
                    className={cn(
                      'border-b border-[var(--border-primary)] transition-colors hover:bg-[var(--bg-secondary)]',
                      idx % 2 === 1 && 'bg-[var(--bg-tertiary)]/30'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-sm font-bold font-mono text-[var(--accent-primary)]">
                          {code.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyCode(code.code)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <span className="font-medium text-[var(--text-primary)]">
                        {code.current_uses}
                      </span>
                      <span className="text-[var(--text-muted)]">/{code.max_uses}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {code.duration_type === 'fixed'
                        ? t('inviteCodes.fixedDates')
                        : t('inviteCodes.relativeDays')}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {getDurationDisplay(code)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {code.expires_at ? formatDate(code.expires_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(status)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {formatDate(code.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyLink(code.code)} className="gap-2">
                            <Link className="h-4 w-4" />
                            {t('inviteCodes.copyLink')}
                          </DropdownMenuItem>
                          {code.current_uses > 0 && (
                            <DropdownMenuItem
                              onClick={() =>
                                setUsesDialog({ open: true, code: code.code, uses: code.uses })
                              }
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              {t('inviteCodes.viewUses')}
                            </DropdownMenuItem>
                          )}
                          {status === 'active' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeactivate(code.id)}
                                className="gap-2 text-amber-500 focus:text-amber-500"
                              >
                                <XCircle className="h-4 w-4" />
                                {t('inviteCodes.deactivate')}
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setDeleteDialog({ open: true, id: code.id, code: code.code })
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

      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            {t('inviteCodes.showing', { count: codes.length, total })}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm text-[var(--text-secondary)]">{page}/{totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createForm.open} onOpenChange={(open) => setCreateForm((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inviteCodes.createNew')}</DialogTitle>
            <DialogDescription>{t('inviteCodes.createDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('inviteCodes.code')}</Label>
              <div className="flex gap-2">
                <Input
                  value={createForm.code}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="font-mono font-bold uppercase"
                  maxLength={12}
                />
                <Button variant="outline" size="icon" onClick={() => setCreateForm((prev) => ({ ...prev, code: generateCode() }))}>
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('inviteCodes.maxUses')}</Label>
              <Input
                type="number"
                min={1}
                value={createForm.max_uses}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, max_uses: parseInt(e.target.value, 10) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('inviteCodes.durationType')}</Label>
              <RadioGroup
                value={createForm.duration_type}
                onValueChange={(v) => setCreateForm((prev) => ({ ...prev, duration_type: v as 'fixed' | 'relative' }))}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="relative" id="dur-relative" />
                  <Label htmlFor="dur-relative">{t('inviteCodes.relativeDays')}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="fixed" id="dur-fixed" />
                  <Label htmlFor="dur-fixed">{t('inviteCodes.fixedDates')}</Label>
                </div>
              </RadioGroup>
            </div>
            {createForm.duration_type === 'relative' ? (
              <div className="space-y-2">
                <Label>{t('inviteCodes.numberOfDays')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={createForm.relative_days}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, relative_days: parseInt(e.target.value, 10) || 30 }))}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t('inviteCodes.startDate')}</Label>
                  <Input type="date" value={createForm.fixed_start_date} onChange={(e) => setCreateForm((prev) => ({ ...prev, fixed_start_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('inviteCodes.endDate')}</Label>
                  <Input type="date" value={createForm.fixed_end_date} min={createForm.fixed_start_date} onChange={(e) => setCreateForm((prev) => ({ ...prev, fixed_end_date: e.target.value }))} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>{t('inviteCodes.codeExpiry')}</Label>
              <Input type="date" value={createForm.expires_at} onChange={(e) => setCreateForm((prev) => ({ ...prev, expires_at: e.target.value }))} />
              <p className="text-xs text-[var(--text-muted)]">{t('inviteCodes.codeExpiryHint')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateForm((prev) => ({ ...prev, open: false }))}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} disabled={actionLoading}>
              {actionLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Uses Dialog */}
      <Dialog open={usesDialog.open} onOpenChange={(open) => setUsesDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inviteCodes.usesTitle', { code: usesDialog.code })}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto">
            {usesDialog.uses.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--text-muted)]">{t('inviteCodes.noUses')}</p>
            ) : (
              <div className="space-y-2">
                {usesDialog.uses.map((use, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] p-3">
                    <span className="text-sm text-[var(--text-primary)]">{use.user_email}</span>
                    <span className="text-xs text-[var(--text-muted)]">{formatDate(use.used_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inviteCodes.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('inviteCodes.deleteDescription', { code: deleteDialog.code })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: '', code: '' })}>{t('common.cancel')}</Button>
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