'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/utils/cn';

const VARIANT_CONFIG = {
  danger: {
    icon: Trash2,
    iconClass: 'text-red-400 bg-red-500/10 border-red-500/30',
    confirmClass: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    confirmClass: 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500',
  },
  default: {
    icon: HelpCircle,
    iconClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    confirmClass: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
  },
} as const;

interface ConfirmDialogProps {
  /** Whether the dialog is visible */
  open: boolean;
  /** Close callback (cancel or backdrop click) */
  onClose: () => void;
  /** Confirm callback – only called when user explicitly confirms */
  onConfirm: () => void;
  /** Dialog heading */
  title: string;
  /** Supporting text */
  description: string;
  /** Label for the confirm button – defaults to i18n "Confirm" */
  confirmText?: string;
  /** Label for the cancel button – defaults to i18n "Cancel" */
  cancelText?: string;
  /** Visual variant controlling colours and icon */
  variant?: 'danger' | 'warning' | 'default';
  /**
   * When provided the user must type this exact string into an
   * input before the confirm button becomes active. Used for
   * destructive actions such as deleting a user account.
   */
  requireConfirmText?: string;
  /** Whether the confirm action is currently in progress */
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'default',
  requireConfirmText,
  isLoading = false,
}: ConfirmDialogProps) {
  const t = useTranslations('common');
  const [confirmInput, setConfirmInput] = useState('');
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  /* Reset input whenever dialog opens / closes */
  useEffect(() => {
    if (!open) setConfirmInput('');
  }, [open]);

  const inputMatches =
    !requireConfirmText || confirmInput === requireConfirmText;

  const handleConfirm = useCallback(() => {
    if (!inputMatches || isLoading) return;
    onConfirm();
  }, [inputMatches, isLoading, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-default)] sm:max-w-[425px]">
        <DialogHeader className="items-center text-center sm:text-center">
          {/* Icon circle */}
          <div
            className={cn(
              'mx-auto flex h-14 w-14 items-center justify-center rounded-full border',
              config.iconClass,
            )}
          >
            <Icon className="h-6 w-6" />
          </div>

          <DialogTitle className="mt-3 text-lg font-bold text-[var(--text-primary)]">
            {title}
          </DialogTitle>

          <DialogDescription className="text-sm text-[var(--text-secondary)]">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Strict-confirm text input */}
        {requireConfirmText && (
          <div className="my-2 space-y-2">
            <p className="text-xs text-[var(--text-muted)]">
              {t('confirmDialog.typeToConfirm', { text: requireConfirmText })}
            </p>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={requireConfirmText}
              autoComplete="off"
              className={cn(
                'bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-primary)]',
                'placeholder:text-[var(--text-muted)] text-sm',
                confirmInput && !inputMatches && 'border-red-500/50 focus:border-red-500',
                inputMatches && confirmInput && 'border-emerald-500/50 focus:border-emerald-500',
              )}
            />
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:justify-center">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
          >
            {cancelText ?? t('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!inputMatches || isLoading}
            className={cn('flex-1 gap-2', config.confirmClass)}
          >
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {confirmText ?? t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}