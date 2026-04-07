'use client';

import { ContentCalendar } from '@/components/calendar/ContentCalendar';

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        <ContentCalendar />
      </div>
    </div>
  );
}