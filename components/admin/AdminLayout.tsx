'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, Menu, X, LogOut, ArrowLeft, ArrowRight } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/authStore';
import { createBrowserClient } from '@/lib/supabase-client';

interface AdminLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export function AdminLayout({ children, locale }: AdminLayoutProps) {
  const t = useTranslations('admin');
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isRtl = locale === 'ar';

  const fetchUnreadCount = useCallback(async () => {
    try {
      const supabase = createBrowserClient();
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    } catch {
      /* Silently ignore notification count errors */
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleBackToChat = () => {
    router.push(`/${locale}/chat`);
  };

  const handleNotificationsClick = () => {
    router.push(`/${locale}/admin/notifications`);
  };

  const BackArrowIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div
      className="flex h-screen overflow-hidden bg-[var(--bg-primary)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar
          locale={locale}
          currentPath={pathname}
          unreadCount={unreadCount}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Admin Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Toggle menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side={isRtl ? 'right' : 'left'}
                className="w-[260px] p-0 bg-[var(--surface-brand)]"
              >
                <SheetTitle className="sr-only">
                  {t('sidebar.title')}
                </SheetTitle>
                <div className="flex items-center justify-end p-2">
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>
                <AdminSidebar
                  locale={locale}
                  currentPath={pathname}
                  unreadCount={unreadCount}
                  onItemClick={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <h1 className="text-sm font-semibold text-[var(--text-primary)] lg:text-base">
              {t('topbar.title')}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={handleNotificationsClick}
              aria-label={t('topbar.notifications')}
            >
              <Bell className="h-5 w-5 text-[var(--text-secondary)]" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -end-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>

            {/* Back to Chat */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:flex"
              onClick={handleBackToChat}
            >
              <BackArrowIcon className="h-4 w-4" />
              <span className="text-xs">{t('topbar.backToChat')}</span>
            </Button>

            {/* User info */}
            <div className="hidden items-center gap-2 border-s border-[var(--border-primary)] ps-3 md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-primary)] text-xs font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="max-w-[120px] truncate text-xs text-[var(--text-secondary)]">
                {user?.email || ''}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}