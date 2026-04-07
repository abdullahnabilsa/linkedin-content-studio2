'use client';

import type { LibraryPost } from '@/types/post-library';

interface CalendarDayProps {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: LibraryPost[];
  onClick: () => void;
}

const DOT_COLORS: Record<string, string> = {
  draft: 'bg-yellow-400',
  ready: 'bg-emerald-400',
  published: 'bg-blue-400',
  archived: 'bg-gray-400',
};

export function CalendarDay({ day, isCurrentMonth, isToday, posts, onClick }: CalendarDayProps) {
  const hasPosts = posts.length > 0;

  return (
    <button
      onClick={onClick}
      disabled={!hasPosts}
      className={`
        relative flex flex-col items-center justify-start min-h-[64px] p-1.5
        rounded-lg transition-colors text-center
        ${isCurrentMonth ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}
        ${isToday ? 'ring-2 ring-emerald-500/50 bg-emerald-500/5' : ''}
        ${hasPosts ? 'hover:bg-[var(--bg-tertiary)] cursor-pointer' : 'cursor-default'}
      `}
    >
      <span className={`text-xs font-medium ${isToday ? 'text-emerald-400 font-bold' : ''}`}>
        {day}
      </span>
      {hasPosts && (
        <div className="flex items-center gap-0.5 mt-1">
          {posts.slice(0, 3).map((post, idx) => (
            <div key={idx} className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[post.status] || 'bg-gray-400'}`} />
          ))}
          {posts.length > 3 && <span className="text-[8px] text-[var(--text-tertiary)]">+{posts.length - 3}</span>}
        </div>
      )}
    </button>
  );
}