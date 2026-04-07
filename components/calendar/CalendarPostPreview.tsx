'use client';

import { useTranslations } from 'next-intl';
import { PostStatusBadge } from '@/components/library/PostStatusBadge';
import { CopyForLinkedIn } from '@/components/chat/CopyForLinkedIn';
import { X } from 'lucide-react';
import type { LibraryPost } from '@/types/post-library';

interface CalendarPostPreviewProps {
  posts: LibraryPost[];
  date: string;
  onClose: () => void;
}

export function CalendarPostPreview({ posts, date, onClose }: CalendarPostPreviewProps) {
  const t = useTranslations('calendar');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-primary)]
                      bg-[var(--bg-primary)] shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-primary)]">
          <h3 className="font-semibold text-[var(--text-primary)]">{date}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">{post.title}</span>
                <PostStatusBadge status={post.status} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-4">{post.content}</p>
              <CopyForLinkedIn content={post.content} compact />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}