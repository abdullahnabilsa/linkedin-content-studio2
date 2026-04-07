'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useContentCalendar } from '@/hooks/useContentCalendar';
import { CalendarDay } from '@/components/calendar/CalendarDay';
import { CalendarPostPreview } from '@/components/calendar/CalendarPostPreview';
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react';
import type { LibraryPost } from '@/types/post-library';

const DAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ContentCalendar() {
  const t = useTranslations('calendar');
  const { scheduledPosts, isLoading, currentMonth, currentYear, nextMonth, prevMonth, getPostsForDate, weekSummary } = useContentCalendar();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<LibraryPost[]>([]);

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });

  /* Build calendar grid */
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0

    const days: Array<{ date: string; day: number; isCurrentMonth: boolean; isToday: boolean }> = [];
    const today = new Date().toISOString().split('T')[0];

    /* Previous month padding */
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, -i);
      days.push({ date: d.toISOString().split('T')[0], day: d.getDate(), isCurrentMonth: false, isToday: false });
    }

    /* Current month */
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateObj = new Date(currentYear, currentMonth - 1, d);
      const dateStr = dateObj.toISOString().split('T')[0];
      days.push({ date: dateStr, day: d, isCurrentMonth: true, isToday: dateStr === today });
    }

    /* Next month padding */
    while (days.length % 7 !== 0) {
      const d = new Date(currentYear, currentMonth, days.length - lastDay.getDate() - startDow + 1);
      days.push({ date: d.toISOString().split('T')[0], day: d.getDate(), isCurrentMonth: false, isToday: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  const handleDayClick = (dateStr: string) => {
    const posts = getPostsForDate(dateStr);
    if (posts.length > 0) { setSelectedDate(dateStr); setSelectedPosts(posts); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {t('title', { defaultMessage: 'Content Calendar' })}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('subtitle', { defaultMessage: 'Plan your LinkedIn posting schedule' })}
          </p>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
          <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
        </button>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{monthName}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
          <ChevronRight className="w-5 h-5 rtl:rotate-180" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
      ) : (
        <>
          {/* Day names header */}
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES_EN.map((name) => (
              <div key={name} className="text-center text-xs font-medium text-[var(--text-tertiary)] py-2">{name}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => (
              <CalendarDay key={day.date} date={day.date} day={day.day}
                isCurrentMonth={day.isCurrentMonth} isToday={day.isToday}
                posts={getPostsForDate(day.date)} onClick={() => handleDayClick(day.date)} />
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
            <div className="flex items-center gap-4 text-xs">
              <span className="text-[var(--text-secondary)]">{weekSummary.total} {t('totalPosts', { defaultMessage: 'posts this month' })}</span>
              {weekSummary.draft > 0 && <span className="text-yellow-400">{weekSummary.draft} {t('drafts', { defaultMessage: 'drafts' })}</span>}
              {weekSummary.ready > 0 && <span className="text-emerald-400">{weekSummary.ready} {t('readyLabel', { defaultMessage: 'ready' })}</span>}
              {weekSummary.published > 0 && <span className="text-blue-400">{weekSummary.published} {t('publishedLabel', { defaultMessage: 'published' })}</span>}
            </div>
          </div>
        </>
      )}

      {/* Post preview modal */}
      {selectedDate && selectedPosts.length > 0 && (
        <CalendarPostPreview posts={selectedPosts} date={selectedDate} onClose={() => { setSelectedDate(null); setSelectedPosts([]); }} />
      )}
    </div>
  );
}