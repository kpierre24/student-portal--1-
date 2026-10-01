import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'full';
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'max-w-xs',
  md: 'max-w-md',
  lg: 'max-w-xl',
  full: 'max-w-full',
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  position = 'right',
  size = 'md',
  title,
  subtitle,
  children,
  footer,
  className = '',
}) => {
  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const isRight = position === 'right';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: isRight ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRight ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative z-10 flex h-full w-full flex-col border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-2xl dark:bg-[#08182c] dark:border-slate-800 ${
              isRight ? 'ml-auto border-l' : 'mr-auto border-r'
            } ${SIZE_CLASSES[size]} ${className}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 dark:border-slate-800">
              <div className="min-w-0 flex-1 pr-3">
                {title && (
                  <h2 className="truncate text-lg font-bold text-[var(--color-text)] dark:text-slate-100">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)] dark:text-slate-400">
                    {subtitle}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-slate-100 hover:text-[var(--color-text)] transition-colors dark:hover:bg-slate-800 dark:text-slate-400"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3.5 dark:bg-slate-900/60 dark:border-slate-800">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
