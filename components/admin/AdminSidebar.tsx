'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Bot,
  Drama,
  FolderTree,
  TicketCheck,
  Bell,
  Settings,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

interface AdminSidebarProps {
  locale: string;
  currentPath: string;
  unreadCount: number;
  onItemClick?: () => void;
}

interface SidebarNavItem {
  key: string;
  href: string;
  icon: React.ElementType;
  showBadge?: boolean;
}

export function AdminSidebar({
  locale,
  currentPath,
  unreadCount,
  onItemClick,
}: AdminSidebarProps) {
  const t = useTranslations('admin');
  const router = useRouter();
  const isRtl = locale === 'ar';

  const navItems: SidebarNavItem[] = [
    { key: 'dashboard', href: `/${locale}/admin`, icon: LayoutDashboard },
    { key: 'users', href: `/${locale}/admin/users`, icon: Users },
    { key: 'apiKeys', href: `/${locale}/admin/api-keys`, icon: KeyRound },
    { key: 'models', href: `/${locale}/admin/models`, icon: Bot },
    { key: 'personas', href: `/${locale}/admin/personas`, icon: Drama },
    { key: 'categories', href: `/${locale}/admin/categories`, icon: FolderTree },
    { key: 'inviteCodes', href: `/${locale}/admin/invite-codes`, icon: TicketCheck },
    { key: 'notifications', href: `/${locale}/admin/notifications`, icon: Bell, showBadge: true },
    { key: 'settings', href: `/${locale}/admin/settings`, icon: Settings },
  ];

  const isActive = (href: string): boolean => {
    if (href === `/${locale}/admin`) {
      return currentPath === `/${locale}/admin` || currentPath === `/${locale}/admin/`;
    }
    return currentPath.startsWith(href);
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    onItemClick?.();
  };

  const BackArrowIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <aside className="flex h-full w-[220px] flex-col bg-[var(--surface-brand)]">
      {/* Logo / Title */}
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <Shield className="h-6 w-6 text-[var(--accent-primary)]" />
        <span className="text-sm font-bold text-white">
          {t('sidebar.title')}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <li key={item.key}>
                <button
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-white/15 text-white border-s-[3px] border-[var(--accent-primary)]'
                      : 'text-white/70 hover:bg-white/8 hover:text-white border-s-[3px] border-transparent'
                  )}
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                  <span className="flex-1 truncate text-start">
                    {t(`sidebar.${item.key}`)}
                  </span>
                  {item.showBadge && unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Back to Chat */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => handleNavigate(`/${locale}/chat`)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/8 hover:text-white"
        >
          <BackArrowIcon className="h-4 w-4" />
          <MessageSquare className="h-4 w-4" />
          <span>{t('sidebar.backToChat')}</span>
        </button>
      </div>
    </aside>
  );
}