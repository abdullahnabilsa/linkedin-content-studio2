'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  Crown,
  Activity,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
} from 'lucide-react';
import { StatsCards } from '@/components/admin/StatsCards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

interface DashboardStats {
  totalUsers: number;
  premiumUsers: number;
  activeToday: number;
  totalPosts: number;
  totalConversations: number;
  messagesToday: number;
  tokensToday: number;
  topPersonas: Array<{ name: string; usage_count: number }>;
  recentUsers: Array<{ email: string; role: string; created_at: string; display_name: string | null }>;
  recentNotifications: Array<{ id: string; type: string; title: string; message: string; priority: string; created_at: string; is_read: boolean }>;
  userGrowthPercent: number;
  premiumPercent: number;
}

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/stats');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch stats');
      }

      setStats(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stats';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'premium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'normal':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {t('dashboard.title')}
        </h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[var(--text-secondary)]">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchStats}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      key: 'totalUsers',
      label: t('dashboard.totalUsers'),
      value: stats.totalUsers,
      icon: Users,
      trend: stats.userGrowthPercent,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      key: 'premiumUsers',
      label: t('dashboard.premiumUsers'),
      value: stats.premiumUsers,
      icon: Crown,
      trend: stats.premiumPercent,
      trendLabel: t('dashboard.ofTotal'),
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      key: 'activeToday',
      label: t('dashboard.activeToday'),
      value: stats.activeToday,
      icon: Activity,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      key: 'totalPosts',
      label: t('dashboard.totalPosts'),
      value: stats.totalPosts,
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  const maxPersonaCount = stats.topPersonas.length > 0
    ? Math.max(...stats.topPersonas.map((p) => p.usage_count))
    : 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {t('dashboard.title')}
      </h1>

      {/* Stats Cards */}
      <StatsCards cards={statCards} />

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Personas */}
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">
            {t('dashboard.topPersonas')}
          </h2>
          {stats.topPersonas.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              {t('dashboard.noPersonas')}
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topPersonas.slice(0, 10).map((persona, index) => (
                <div key={`${persona.name}-${index}`} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-medium text-[var(--text-muted)]">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                        {persona.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {persona.usage_count.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-700 ease-out"
                        style={{
                          width: `${(persona.usage_count / maxPersonaCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {t('dashboard.recentNotifications')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-[var(--accent-primary)]"
              onClick={() => router.push(`/${locale}/admin/notifications`)}
            >
              {t('dashboard.viewAll')}
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          {stats.recentNotifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              {t('dashboard.noNotifications')}
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recentNotifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                    notification.is_read
                      ? 'border-[var(--border-primary)] bg-transparent'
                      : 'border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5'
                  )}
                >
                  <div
                    className={cn(
                      'mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full',
                      getPriorityColor(notification.priority)
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Users */}
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {t('dashboard.recentUsers')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-[var(--accent-primary)]"
              onClick={() => router.push(`/${locale}/admin/users`)}
            >
              {t('dashboard.viewAll')}
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          {stats.recentUsers.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              {t('dashboard.noUsers')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-[var(--border-primary)]">
                    <th className="pb-2 text-start text-xs font-semibold text-[var(--text-secondary)]">
                      {t('users.email')}
                    </th>
                    <th className="pb-2 text-start text-xs font-semibold text-[var(--text-secondary)]">
                      {t('users.role')}
                    </th>
                    <th className="pb-2 text-start text-xs font-semibold text-[var(--text-secondary)]">
                      {t('users.joinDate')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map((user, index) => (
                    <tr
                      key={`${user.email}-${index}`}
                      className="border-b border-[var(--border-primary)] last:border-0"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-xs font-bold text-[var(--accent-primary)]">
                            {(user.display_name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            {user.display_name && (
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {user.display_name}
                              </p>
                            )}
                            <p className="text-xs text-[var(--text-muted)]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {t(`roles.${user.role}`)}
                        </Badge>
                      </td>
                      <td className="py-3 text-sm text-[var(--text-secondary)]">
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}