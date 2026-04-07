'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface UseExportReturn {
  /** Export conversation as a plain-text file (available to all roles) */
  exportTXT: (conversationId: string) => Promise<void>;
  /** Export conversation as a PDF (premium / admin only) */
  exportPDF: (conversationId: string) => Promise<void>;
  /** Export conversation as Markdown (premium / admin only) */
  exportMarkdown: (conversationId: string) => Promise<void>;
  /** Whether any export is currently in progress */
  isExporting: boolean;
  /** Latest error message, if any */
  error: string | null;
}

/**
 * Trigger a browser download for an arbitrary Blob.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function useExport(): UseExportReturn {
  const { profile } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPremiumOrAdmin =
    profile?.role === 'premium' || profile?.role === 'admin';

  /**
   * Shared fetch helper that calls the export API route and
   * returns the resulting Blob.
   */
  const fetchExport = useCallback(
    async (
      conversationId: string,
      format: 'txt' | 'pdf' | 'md',
    ): Promise<Blob> => {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, format }),
      });

      if (!res.ok) {
        /* Try to parse an error body */
        let msg = 'Export failed';
        try {
          const body = await res.json();
          msg = body.message ?? msg;
        } catch {
          /* fallback to generic message */
        }
        throw new Error(msg);
      }

      return res.blob();
    },
    [],
  );

  /* ── TXT export ─────────────────────────────────────── */
  const exportTXT = useCallback(
    async (conversationId: string) => {
      setIsExporting(true);
      setError(null);
      try {
        const blob = await fetchExport(conversationId, 'txt');
        downloadBlob(blob, `conversation-${conversationId.slice(0, 8)}.txt`);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Export failed';
        setError(message);
      } finally {
        setIsExporting(false);
      }
    },
    [fetchExport],
  );

  /* ── PDF export (premium / admin) ───────────────────── */
  const exportPDF = useCallback(
    async (conversationId: string) => {
      if (!isPremiumOrAdmin) {
        setError('PDF export is available for Premium and Admin users only.');
        return;
      }
      setIsExporting(true);
      setError(null);
      try {
        const blob = await fetchExport(conversationId, 'pdf');
        downloadBlob(blob, `conversation-${conversationId.slice(0, 8)}.pdf`);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Export failed';
        setError(message);
      } finally {
        setIsExporting(false);
      }
    },
    [fetchExport, isPremiumOrAdmin],
  );

  /* ── Markdown export (premium / admin) ──────────────── */
  const exportMarkdown = useCallback(
    async (conversationId: string) => {
      if (!isPremiumOrAdmin) {
        setError(
          'Markdown export is available for Premium and Admin users only.',
        );
        return;
      }
      setIsExporting(true);
      setError(null);
      try {
        const blob = await fetchExport(conversationId, 'md');
        downloadBlob(
          blob,
          `conversation-${conversationId.slice(0, 8)}.md`,
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Export failed';
        setError(message);
      } finally {
        setIsExporting(false);
      }
    },
    [fetchExport, isPremiumOrAdmin],
  );

  return { exportTXT, exportPDF, exportMarkdown, isExporting, error };
}