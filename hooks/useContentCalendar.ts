'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { LibraryPost } from '@/types/post-library';

interface UseContentCalendarReturn {
  scheduledPosts: LibraryPost[];
  isLoading: boolean;
  error: string | null;
  currentMonth: number;
  currentYear: number;
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  getPostsForDate: (dateStr: string) => LibraryPost[];
  weekSummary: { total: number; draft: number; ready: number; published: number };
  refresh: () => Promise<void>;
}

export function useContentCalendar(): UseContentCalendarReturn {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [scheduledPosts, setScheduledPosts] = useState<LibraryPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(currentYear), month: String(currentMonth) });
      const response = await fetch(`/api/calendar?${params.toString()}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setScheduledPosts(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar');
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const nextMonth = useCallback(() => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  }, [currentMonth]);

  const prevMonth = useCallback(() => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  }, [currentMonth]);

  const getPostsForDate = useCallback(
    (dateStr: string) => scheduledPosts.filter((p) => p.scheduled_date === dateStr),
    [scheduledPosts]
  );

  const weekSummary = useMemo(() => {
    const total = scheduledPosts.length;
    const draft = scheduledPosts.filter((p) => p.status === 'draft').length;
    const ready = scheduledPosts.filter((p) => p.status === 'ready').length;
    const published = scheduledPosts.filter((p) => p.status === 'published').length;
    return { total, draft, ready, published };
  }, [scheduledPosts]);

  return {
    scheduledPosts, isLoading, error, currentMonth, currentYear,
    setMonth: setCurrentMonth, setYear: setCurrentYear,
    nextMonth, prevMonth, getPostsForDate, weekSummary, refresh: fetchPosts,
  };
}