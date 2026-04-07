'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { LibraryPost, PostStatus } from '@/types/post-library';

interface UsePostLibraryReturn {
  posts: LibraryPost[];
  isLoading: boolean;
  error: string | null;
  savePost: (post: Omit<LibraryPost, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updatePost: (id: string, updates: Partial<LibraryPost>) => Promise<boolean>;
  deletePost: (id: string) => Promise<boolean>;
  updateStatus: (id: string, status: PostStatus) => Promise<boolean>;
  schedulePost: (id: string, date: string | null) => Promise<boolean>;
  searchPosts: (query: string) => void;
  filterByStatus: (status: PostStatus | 'all') => void;
  postCount: number;
  maxPosts: number;
  canSavePost: boolean;
  refresh: () => Promise<void>;
}

export function usePostLibrary(): UsePostLibraryReturn {
  const { profile } = useAuthStore();
  const [posts, setPosts] = useState<LibraryPost[]>([]);
  const [allPosts, setAllPosts] = useState<LibraryPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxPosts, setMaxPosts] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');

  const isPremium = profile?.role === 'premium' || profile?.role === 'admin';

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      const response = await fetch(`/api/library?${params.toString()}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      const data = result.data || [];
      setAllPosts(data);
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    if (isPremium) { setMaxPosts(Infinity); return; }
    fetch('/api/library').then((r) => r.json()).then((r) => {
      if (r.data) setMaxPosts(20);
    }).catch(() => {});
  }, [isPremium]);

  const savePost = useCallback(async (post: Omit<LibraryPost, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      const response = await fetch('/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(post) });
      const result = await response.json();
      if (!result.success) { setError(result.message); return false; }
      await fetchPosts();
      return true;
    } catch { return false; }
  }, [fetchPosts]);

  const updatePost = useCallback(async (id: string, updates: Partial<LibraryPost>): Promise<boolean> => {
    try {
      const response = await fetch('/api/library', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
      const result = await response.json();
      if (!result.success) return false;
      await fetchPosts();
      return true;
    } catch { return false; }
  }, [fetchPosts]);

  const deletePost = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/library', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const result = await response.json();
      if (!result.success) return false;
      await fetchPosts();
      return true;
    } catch { return false; }
  }, [fetchPosts]);

  const updateStatus = useCallback(async (id: string, status: PostStatus) => updatePost(id, { status }), [updatePost]);
  const schedulePost = useCallback(async (id: string, date: string | null) => updatePost(id, { scheduled_date: date } as Partial<LibraryPost>), [updatePost]);

  const searchPosts = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setPosts(allPosts); return; }
    const lc = query.toLowerCase();
    setPosts(allPosts.filter((p) => p.title.toLowerCase().includes(lc) || p.content.toLowerCase().includes(lc)));
  }, [allPosts]);

  const filterByStatus = useCallback((status: PostStatus | 'all') => { setStatusFilter(status); }, []);

  return {
    posts, isLoading, error, savePost, updatePost, deletePost, updateStatus,
    schedulePost, searchPosts, filterByStatus,
    postCount: allPosts.length, maxPosts, canSavePost: isPremium || allPosts.length < maxPosts,
    refresh: fetchPosts,
  };
}