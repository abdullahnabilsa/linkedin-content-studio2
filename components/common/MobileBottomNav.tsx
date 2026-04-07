'use client';

import { useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  MessageSquare,
  Layers,
  BookOpen,
  CalendarDays,
  Settings,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface NavItem {
  /** i18n translation key suffix under "nav" namespace */
  labelKey: string;
  /** Href path segment appended after /[locale]/ */
  href: string;
  /** Lucide icon component */
  icon: React.FC<React.SVGProps<SVGSVGElement> & { className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'chat', href: 'chat', icon: MessageSquare },
  { labelKey: 'personas', href: 'personas', icon: Layers },
  { labelKey: 'library', href: 'library', icon: BookOpen },
  { labelKey: 'calendar', href: 'calendar', icon: CalendarDays },
  { labelKey: 'settings', href: 'settings', icon: Settings },
];

export function MobileBottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ar';

  /** Determine which nav item is active based on the current path */
  const activeHref = useMemo(() => {
    for (const item of NAV_ITEMS) {
      if (pathname?.includes(`/${item.href}`)) return item.href;
    }
    return 'chat'; /* default */
  }, [pathname]);

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex h-14 items-center border-t md:hidden',
        'bg-[#0D4026] border-emerald-900/50',
        /* iPhone safe area */
        'pb-[env(safe-area-inset-bottom)]',
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeHref === item.href;
        const Icon = item.icon;
        const href = `/${locale}/${item.href}`;

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors',
              isActive
                ? 'text-emerald-400'
                : 'text-emerald-200/50 active:text-emerald-300',
            )}
          >
            {/* Active indicator line */}
            {isActive && (
              <span className="absolute inset-x-3 top-0 h-[3px] rounded-full bg-emerald-400" />
            )}
            <Icon className="h-5 w-5" />
            <span className="text-[10px] leading-none font-medium">
              {t(item.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}