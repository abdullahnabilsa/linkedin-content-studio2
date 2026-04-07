'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { PostStatusBadge } from '@/components/library/PostStatusBadge';
import { CopyForLinkedIn } from '@/components/chat/CopyForLinkedIn';
import { Trash2, CalendarDays, MoreHorizontal } from 'lucide-react';
import type { LibraryPost, PostStatus } from '@/types/post-library';

interface PostCardProps {
  post: LibraryPost;
  onDelete: (id: string) => Promise<boolean>;
  onStatusChange: (id: string, status: PostStatus) => Promise<boolean>;
  onSchedule: (id: string, date: string | null) => Promise<boolean>;
}

const STATUSES: PostStatus[] = ['draft', 'ready', 'published', 'archived'];

export function PostCard({ post, onDelete, onStatusChange, onSchedule }: PostCardProps) {
  const t = useTranslations('library');
  const [showMenu, setShowMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await onDelete(post.id);
    setConfirmDelete(false);
  }, [confirmDelete, onDelete, post.id]);

  const handleDateChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value || null;
    await onSchedule(post.id, date);
    setShowDatePicker(false);
  }, [onSchedule, post.id]);

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]
                    hover:border-emerald-500/20 transition-colors overflow-hidden group">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{post.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <PostStatusBadge status={post.status} />
              {post.persona_name && (
                <span className="text-[10px] text-[var(--text-tertiary)]">{post.persona_name}</span>
              )}
            </div>
          </div>
          <div className="relative shrink-0">
            <button onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]
                         transition-colors opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute end-0 top-8 z-10 w-40 rounded-xl border border-[var(--border-primary)]
                              bg-[var(--bg-primary)] shadow-lg py-1">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => { onStatusChange(post.id, s); setShowMenu(false); }}
                    className={`w-full text-start px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors
                               ${post.status === s ? 'text-emerald-400 font-medium' : 'text-[var(--text-secondary)]'}`}>
                    {t(`status.${s}`, { defaultMessage: s })}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content preview */}
        <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">{post.content}</p>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
          {post.format_template && <span>{post.format_template}</span>}
          {post.scheduled_date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> {post.scheduled_date}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border-primary)]
                      bg-[var(--bg-primary)]/50">
        <CopyForLinkedIn content={post.content} compact />
        <div className="flex items-center gap-1">
          <button onClick={() => setShowDatePicker(!showDatePicker)}
            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-[var(--text-tertiary)] hover:text-emerald-400 transition-colors"
            title={t('schedule', { defaultMessage: 'Schedule' })}>
            <CalendarDays className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete}
            className={`p-1.5 rounded-lg transition-colors ${
              confirmDelete ? 'bg-red-500/10 text-red-400' : 'hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-400'
            }`}
            title={confirmDelete ? t('confirmDelete', { defaultMessage: 'Click again to confirm' }) : t('delete', { defaultMessage: 'Delete' })}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showDatePicker && (
        <div className="px-4 pb-3">
          <input type="date" value={post.scheduled_date || ''} onChange={handleDateChange}
            className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-primary)]
                       bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs" dir="ltr" />
        </div>
      )}
    </div>
  );
}