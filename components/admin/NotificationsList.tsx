'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  related_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  normal: 'bg-yellow-500',
  info: 'bg-blue-500',
};

const NOTIFICATION_TYPES = [
  'new_user_registered',
  'premium_upgraded',
  'premium_downgraded',
  'premium_expired',
  'user_banned',
  'user_unbanned',
  'user_deleted',
  'user_role_changed',
  'api_balance_low',
  'api_balance_depleted',
  'system_error',
  'invite_code_used',
];

export function NotificationsList() {
  const t = useTranslations('admin');
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const limit = 20;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        type: typeFilter,
        priority: priorityFilter,
        read: readFilter,
      });
      const response = await fetch(`/api/admin/notifications?${queryParams}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setNotifications(result.data.notifications || []);
      setTotal(result.data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fetch failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, priorityFilter, readFilter, t, toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  /* Poll every 30 seconds */
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      /* Silently handle */
    }
  };

  const markAllRead = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      toast({ title: t('common.success'), description: t('notifications.allMarkedRead') });
      fetchNotifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    }
  };

  const deleteOld = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThan: '30days' }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      toast({ title: t('common.success'), description: t('notifications.oldDeleted') });
      fetchNotifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.justNow');
    if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
    if (diffDays < 30) return t('notifications.daysAgo', { count: diffDays });
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const totalPages = Math.ceil(total / limit);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      {/* Filters + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('notifications.allTypes')}</SelectItem>
              {NOTIFICATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('notifications.allPriorities')}</SelectItem>
              <SelectItem value="urgent">{t('notifications.urgent')}</SelectItem>
              <SelectItem value="normal">{t('notifications.normal')}</SelectItem>
              <SelectItem value="info">{t('notifications.info')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={readFilter} onValueChange={(v) => { setReadFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('notifications.allStatus')}</SelectItem>
              <SelectItem value="unread">{t('notifications.unread')}</SelectItem>
              <SelectItem value="read">{t('notifications.read')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={actionLoading || unreadCount === 0} className="gap-1.5 text-xs">
            <CheckCheck className="h-3.5 w-3.5" />
            {t('notifications.markAllRead')}
          </Button>
          <Button variant="outline" size="sm" onClick={deleteOld} disabled={actionLoading} className="gap-1.5 text-xs text-red-500 hover:text-red-500">
            <Calendar className="h-3.5 w-3.5" />
            {t('notifications.deleteOld')}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-20 w-full rounded-xl" />))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <Bell className="mb-3 h-10 w-10 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">{t('notifications.noNotifications')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => {
                if (!notification.is_read) markAsRead(notification.id);
              }}
              className={cn(
                'group flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                notification.is_read
                  ? 'border-[var(--border-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)]'
                  : 'border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 hover:bg-[var(--accent-primary)]/10'
              )}
            >
              {/* Priority dot */}
              <div className={cn('mt-1.5 h-3 w-3 flex-shrink-0 rounded-full', PRIORITY_COLORS[notification.priority] || PRIORITY_COLORS.info)} />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm text-[var(--text-primary)]', !notification.is_read && 'font-semibold')}>
                    {notification.title}
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                      {getRelativeTime(notification.created_at)}
                    </span>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">
                  {notification.message}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {notification.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            {t('notifications.showing', { count: notifications.length, total })}
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
    </div>
  );
}