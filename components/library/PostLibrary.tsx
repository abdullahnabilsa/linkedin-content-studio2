'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePostLibrary } from '@/hooks/usePostLibrary';
import { PostCard } from '@/components/library/PostCard';
import { Search, BookOpen, Loader2 } from 'lucide-react';
import type { PostStatus } from '@/types/post-library';

const STATUS_TABS: Array<{ id: PostStatus | 'all'; labelKey: string }> = [
  { id: 'all', labelKey: 'library.all' },
  { id: 'draft', labelKey: 'library.draft' },
  { id: 'ready', labelKey: 'library.ready' },
  { id: 'published', labelKey: 'library.published' },
  { id: 'archived', labelKey: 'library.archived' },
];

export function PostLibrary() {
  const t = useTranslations('library');
  const {
    posts, isLoading, searchPosts, filterByStatus, deletePost, updateStatus,
    schedulePost, postCount, maxPosts, canSavePost,
  } = usePostLibrary();
  const [activeTab, setActiveTab] = useState<PostStatus | 'all'>('all');
  const [query, setQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);
    searchPosts(value);
  };

  const handleTabChange = (tab: PostStatus | 'all') => {
    setActiveTab(tab);
    filterByStatus(tab);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {t('title', { defaultMessage: 'Post Library' })}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('subtitle', { defaultMessage: 'Save, organise, and schedule your LinkedIn posts' })}
          </p>
        </div>
        {!canSavePost && (
          <span className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
            {postCount}/{maxPosts} — {t('limitReached', { defaultMessage: 'Upgrade for more' })}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          type="text" value={query} onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('searchPlaceholder', { defaultMessage: 'Search posts...' })}
          className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-[var(--border-primary)]
                     bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm
                     placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button key={tab.id} onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
              activeTab === tab.id
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border-primary)]'
            }`}
          >
            {t(tab.labelKey, { defaultMessage: tab.id })}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-[var(--border-primary)]">
          <BookOpen className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-3" />
          <p className="text-[var(--text-secondary)] font-medium">{t('empty', { defaultMessage: 'No posts yet' })}</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{t('emptyHint', { defaultMessage: 'Save posts from chat to build your library' })}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post}
              onDelete={deletePost} onStatusChange={updateStatus} onSchedule={schedulePost} />
          ))}
        </div>
      )}
    </div>
  );
}