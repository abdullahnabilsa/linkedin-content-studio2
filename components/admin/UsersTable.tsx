'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Crown,
  ShieldAlert,
  Ban,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCog,
  CheckCircle,
  XCircle,
  Loader2,
  UserPlus,
  UserMinus,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_super_admin: boolean;
  is_banned: boolean;
  premium_expires_at: string | null;
  created_at: string;
  updated_at: string;
  conversation_count: number;
  message_count: number;
}

type SortField = 'created_at' | 'updated_at' | 'message_count';
type SortDirection = 'asc' | 'desc';
type RoleFilter = 'all' | 'admin' | 'premium' | 'free';
type StatusFilter = 'all' | 'active' | 'banned';
type DurationType = 'fixed' | 'relative';

interface UpgradeDialogState {
  open: boolean;
  userId: string;
  userEmail: string;
  durationType: DurationType;
  fixedStartDate: string;
  fixedEndDate: string;
  relativeDays: number;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  action: string;
  userId: string;
  requireTyping: boolean;
  typedValue: string;
}

export function UsersTable() {
  const t = useTranslations('admin');
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { toast } = useToast();
  const { profile: currentProfile } = useAuthStore();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const limit = 20;

  const [upgradeDialog, setUpgradeDialog] = useState<UpgradeDialogState>({
    open: false,
    userId: '',
    userEmail: '',
    durationType: 'relative',
    fixedStartDate: new Date().toISOString().split('T')[0],
    fixedEndDate: '',
    relativeDays: 30,
  });

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    description: '',
    action: '',
    userId: '',
    requireTyping: false,
    typedValue: '',
  });

  const isSuperAdmin = currentProfile?.is_super_admin === true;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        role: roleFilter,
        status: statusFilter,
        search,
        sortField,
        sortDirection,
      });

      const response = await fetch(`/api/admin/users?${queryParams}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch users');
      }

      setUsers(result.data.users);
      setTotal(result.data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, statusFilter, search, sortField, sortDirection, t, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* Debounced search */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const handleRoleFilterChange = (value: RoleFilter) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

  /* ========== USER ACTIONS ========== */

  const executeAction = async (
    userId: string,
    body: Record<string, unknown>,
    method: 'PATCH' | 'DELETE' = 'PATCH'
  ) => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...body }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Action failed');
      }

      toast({ title: t('common.success'), description: result.message });
      fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const openUpgradeDialog = (userId: string, userEmail: string) => {
    setUpgradeDialog({
      open: true,
      userId,
      userEmail,
      durationType: 'relative',
      fixedStartDate: new Date().toISOString().split('T')[0],
      fixedEndDate: '',
      relativeDays: 30,
    });
  };

  const handleUpgradeConfirm = async () => {
    let premiumExpiresAt: string;

    if (upgradeDialog.durationType === 'fixed') {
      if (!upgradeDialog.fixedEndDate) {
        toast({
          title: t('common.error'),
          description: t('users.endDateRequired'),
          variant: 'destructive',
        });
        return;
      }
      premiumExpiresAt = new Date(upgradeDialog.fixedEndDate + 'T23:59:59Z').toISOString();
    } else {
      const days = upgradeDialog.relativeDays;
      if (days <= 0) {
        toast({
          title: t('common.error'),
          description: t('users.invalidDays'),
          variant: 'destructive',
        });
        return;
      }
      const expires = new Date();
      expires.setDate(expires.getDate() + days);
      premiumExpiresAt = expires.toISOString();
    }

    await executeAction(upgradeDialog.userId, {
      role: 'premium',
      premium_expires_at: premiumExpiresAt,
    });
    setUpgradeDialog((prev) => ({ ...prev, open: false }));
  };

  const openConfirmDialog = (
    title: string,
    description: string,
    action: string,
    userId: string,
    requireTyping: boolean = false
  ) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      action,
      userId,
      requireTyping,
      typedValue: '',
    });
  };

  const handleConfirmAction = async () => {
    if (confirmDialog.requireTyping && confirmDialog.typedValue !== 'delete') {
      toast({
        title: t('common.error'),
        description: t('users.typeDeleteToConfirm'),
        variant: 'destructive',
      });
      return;
    }

    const { action, userId } = confirmDialog;

    switch (action) {
      case 'downgrade_free':
        await executeAction(userId, { role: 'free', premium_expires_at: null });
        break;
      case 'upgrade_admin':
        await executeAction(userId, { role: 'admin' });
        break;
      case 'downgrade_admin':
        await executeAction(userId, { role: 'free' });
        break;
      case 'ban':
        await executeAction(userId, { is_banned: true });
        break;
      case 'unban':
        await executeAction(userId, { is_banned: false });
        break;
      case 'delete':
        await executeAction(userId, {}, 'DELETE');
        break;
    }

    setConfirmDialog((prev) => ({ ...prev, open: false }));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const getRoleBadge = (user: UserRow) => {
    if (user.is_super_admin) {
      return (
        <Badge variant="destructive" className="gap-1">
          <ShieldAlert className="h-3 w-3" />
          {t('roles.superAdmin')}
        </Badge>
      );
    }
    switch (user.role) {
      case 'admin':
        return (
          <Badge variant="destructive" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            {t('roles.admin')}
          </Badge>
        );
      case 'premium':
        return (
          <Badge className="gap-1 bg-amber-500/80 text-white hover:bg-amber-500">
            <Crown className="h-3 w-3" />
            {t('roles.premium')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{t('roles.free')}</Badge>;
    }
  };

  const getStatusBadge = (user: UserRow) => {
    if (user.is_banned) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {t('users.banned')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-500">
        <CheckCircle className="h-3 w-3" />
        {t('users.active')}
      </Badge>
    );
  };

  const canModifyUser = (user: UserRow): boolean => {
    if (user.is_super_admin) return false;
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder={t('users.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Role filter tabs */}
          <div className="flex rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-0.5">
            {(['all', 'admin', 'premium', 'free'] as RoleFilter[]).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleFilterChange(role)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  roleFilter === role
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                {t(`roles.${role === 'all' ? 'all' : role}`)}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('users.statusAll')}</SelectItem>
              <SelectItem value="active">{t('users.active')}</SelectItem>
              <SelectItem value="banned">{t('users.banned')}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-primary)]">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-[var(--surface-brand)]">
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('users.user')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('users.accountType')}
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-start text-xs font-semibold text-white"
                onClick={() => handleSort('created_at')}
              >
                <span className="flex items-center gap-1">
                  {t('users.joinDate')}
                  {getSortIcon('created_at')}
                </span>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-start text-xs font-semibold text-white"
                onClick={() => handleSort('updated_at')}
              >
                <span className="flex items-center gap-1">
                  {t('users.lastActivity')}
                  {getSortIcon('updated_at')}
                </span>
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('users.status')}
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-start text-xs font-semibold text-white"
                onClick={() => handleSort('message_count')}
              >
                <span className="flex items-center gap-1">
                  {t('users.messages')}
                  {getSortIcon('message_count')}
                </span>
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-white">
                {t('users.conversations')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                {t('users.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-[var(--border-primary)]">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={`skeleton-${i}-${j}`} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <UserCog className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">{t('users.noUsers')}</p>
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr
                  key={user.id}
                  className={cn(
                    'border-b border-[var(--border-primary)] transition-colors hover:bg-[var(--bg-secondary)]',
                    index % 2 === 1 && 'bg-[var(--bg-tertiary)]/30',
                    user.is_super_admin && 'bg-amber-500/5'
                  )}
                >
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white',
                        user.is_super_admin ? 'bg-amber-500' : 'bg-[var(--accent-primary)]'
                      )}>
                        {(user.display_name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        {user.display_name && (
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {user.display_name}
                          </p>
                        )}
                        <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Account Type */}
                  <td className="px-4 py-3">{getRoleBadge(user)}</td>
                  {/* Join Date */}
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {formatDate(user.created_at)}
                  </td>
                  {/* Last Activity */}
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {formatDate(user.updated_at)}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">{getStatusBadge(user)}</td>
                  {/* Messages */}
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {user.message_count.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                  </td>
                  {/* Conversations */}
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {user.conversation_count.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3 text-center">
                    {canModifyUser(user) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {/* Upgrade to Premium */}
                          {user.role !== 'premium' && user.role !== 'admin' && (
                            <DropdownMenuItem
                              onClick={() => openUpgradeDialog(user.id, user.email)}
                              className="gap-2"
                            >
                              <Crown className="h-4 w-4 text-amber-500" />
                              {t('users.upgradePremium')}
                            </DropdownMenuItem>
                          )}
                          {/* Downgrade to Free */}
                          {user.role === 'premium' && (
                            <DropdownMenuItem
                              onClick={() =>
                                openConfirmDialog(
                                  t('users.downgradeTitle'),
                                  t('users.downgradeDescription', { email: user.email }),
                                  'downgrade_free',
                                  user.id
                                )
                              }
                              className="gap-2"
                            >
                              <UserMinus className="h-4 w-4 text-orange-500" />
                              {t('users.downgradeFree')}
                            </DropdownMenuItem>
                          )}
                          {/* Upgrade to Admin (Super Admin only) */}
                          {isSuperAdmin && user.role !== 'admin' && (
                            <DropdownMenuItem
                              onClick={() =>
                                openConfirmDialog(
                                  t('users.upgradeAdminTitle'),
                                  t('users.upgradeAdminDescription', { email: user.email }),
                                  'upgrade_admin',
                                  user.id
                                )
                              }
                              className="gap-2"
                            >
                              <ShieldCheck className="h-4 w-4 text-red-500" />
                              {t('users.upgradeAdmin')}
                            </DropdownMenuItem>
                          )}
                          {/* Downgrade from Admin (Super Admin only) */}
                          {isSuperAdmin && user.role === 'admin' && !user.is_super_admin && (
                            <DropdownMenuItem
                              onClick={() =>
                                openConfirmDialog(
                                  t('users.downgradeAdminTitle'),
                                  t('users.downgradeAdminDescription', { email: user.email }),
                                  'downgrade_admin',
                                  user.id
                                )
                              }
                              className="gap-2"
                            >
                              <ShieldOff className="h-4 w-4 text-orange-500" />
                              {t('users.downgradeAdmin')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {/* Ban / Unban */}
                          {!user.is_banned ? (
                            <DropdownMenuItem
                              onClick={() =>
                                openConfirmDialog(
                                  t('users.banTitle'),
                                  t('users.banDescription', { email: user.email }),
                                  'ban',
                                  user.id
                                )
                              }
                              className="gap-2 text-red-500 focus:text-red-500"
                            >
                              <Ban className="h-4 w-4" />
                              {t('users.ban')}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                openConfirmDialog(
                                  t('users.unbanTitle'),
                                  t('users.unbanDescription', { email: user.email }),
                                  'unban',
                                  user.id
                                )
                              }
                              className="gap-2 text-emerald-500 focus:text-emerald-500"
                            >
                              <CheckCircle className="h-4 w-4" />
                              {t('users.unban')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {/* Delete */}
                          <DropdownMenuItem
                            onClick={() =>
                              openConfirmDialog(
                                t('users.deleteTitle'),
                                t('users.deleteDescription', { email: user.email }),
                                'delete',
                                user.id,
                                true
                              )
                            }
                            className="gap-2 text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('users.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">
                        {t('users.protected')}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            {t('users.showing', { start: startItem, end: endItem, total })}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Upgrade to Premium Dialog */}
      <Dialog
        open={upgradeDialog.open}
        onOpenChange={(open) => setUpgradeDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('users.upgradePremiumTitle')}</DialogTitle>
            <DialogDescription>
              {t('users.upgradePremiumDescription', { email: upgradeDialog.userEmail })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Duration Type */}
            <div className="space-y-2">
              <Label>{t('users.durationType')}</Label>
              <Select
                value={upgradeDialog.durationType}
                onValueChange={(v) =>
                  setUpgradeDialog((prev) => ({
                    ...prev,
                    durationType: v as DurationType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relative">{t('users.relativeDays')}</SelectItem>
                  <SelectItem value="fixed">{t('users.fixedDates')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {upgradeDialog.durationType === 'relative' ? (
              <div className="space-y-2">
                <Label>{t('users.numberOfDays')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={upgradeDialog.relativeDays}
                  onChange={(e) =>
                    setUpgradeDialog((prev) => ({
                      ...prev,
                      relativeDays: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
                <p className="text-xs text-[var(--text-muted)]">
                  {t('users.expiresOn', {
                    date: new Date(
                      Date.now() + upgradeDialog.relativeDays * 86400000
                    ).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US'),
                  })}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t('users.startDate')}</Label>
                  <Input
                    type="date"
                    value={upgradeDialog.fixedStartDate}
                    onChange={(e) =>
                      setUpgradeDialog((prev) => ({
                        ...prev,
                        fixedStartDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('users.endDate')}</Label>
                  <Input
                    type="date"
                    value={upgradeDialog.fixedEndDate}
                    min={upgradeDialog.fixedStartDate}
                    onChange={(e) =>
                      setUpgradeDialog((prev) => ({
                        ...prev,
                        fixedEndDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpgradeDialog((prev) => ({ ...prev, open: false }))}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpgradeConfirm} disabled={actionLoading}>
              {actionLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('users.confirmUpgrade')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generic Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>

          {confirmDialog.requireTyping && (
            <div className="space-y-2 py-2">
              <Label>{t('users.typeDeleteLabel')}</Label>
              <Input
                value={confirmDialog.typedValue}
                onChange={(e) =>
                  setConfirmDialog((prev) => ({ ...prev, typedValue: e.target.value }))
                }
                placeholder="delete"
                className="font-mono"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmAction}
              disabled={
                actionLoading ||
                (confirmDialog.requireTyping && confirmDialog.typedValue !== 'delete')
              }
            >
              {actionLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}