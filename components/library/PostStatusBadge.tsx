'use client';

import { useTranslations } from 'next-intl';
import type { PostStatus } from '@/types/post-library';

interface PostStatusBadgeProps {
  status: PostStatus;
}

const STATUS_STYLES: Record<PostStatus, string> = {
  draft: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  ready: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  published: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  archived: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export function PostStatusBadge({ status }: PostStatusBadgeProps) {
  const t = useTranslations('library');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px]
                      font-medium border ${STATUS_STYLES[status]}`}>
      {t(`status.${status}`, { defaultMessage: status })}
    </span>
  );
}