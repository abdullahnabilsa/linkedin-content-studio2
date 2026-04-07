'use client';

import { PostLibrary } from '@/components/library/PostLibrary';

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        <PostLibrary />
      </div>
    </div>
  );
}