import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, GripHorizontal } from 'lucide-react';
import { useAccessibleModal } from '../lib/useAccessibleModal';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  className?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  isDraggable?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-5xl',
  '4xl': 'max-w-6xl',
  '5xl': 'max-w-7xl',
  full: 'max-w-[96vw] h-[92vh]',
};

/**
 * Reusable, fully accessible Modal component with viewport drag support.
 * Handles focus trapping, Escape key listener, aria-modal="true", role="dialog",
 * background scroll lock, mouse/touch dragging, and responsive viewport sizing.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = 'lg',
  className = '',
  showCloseButton = true,
  closeOnOverlayClick = true,
  ariaLabel,
  ariaLabelledBy,
  headerActions,
  footer,
  isDraggable = true,
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);

  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number }>({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
  });

  // Reset position whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen]);

  // Window pointer listeners while dragging
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.lg;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget && !isDragging) {
      onClose();
    }
  };

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggable) return;
    if (e.button !== 0) return; // Only primary mouse button

    // Do not initiate drag if user clicked interactive elements inside header
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [data-no-drag]')) {
      return;
    }

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);
  };

  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
      if (!isInput) {
        e.preventDefault();
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-xs overflow-hidden animate-fadeIn modal-material-scrim"
      onClick={handleBackdropClick}
      onScroll={(e) => { e.currentTarget.scrollTop = 0; }}
      onKeyDown={handleModalKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || (typeof title === 'string' ? title : 'Dialog')}
        aria-labelledby={ariaLabelledBy || (title ? 'modal-headline' : undefined)}
        style={{
          transform: (position.x !== 0 || position.y !== 0) ? `translate3d(${position.x}px, ${position.y}px, 0)` : undefined,
          transition: isDragging ? 'none' : undefined,
        }}
        className={`bg-white dark:bg-slate-900 rounded-xl md:rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl w-full ${sizeClass} max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn modal-material-dialog my-auto ${className}`}
      >
        {/* Modal Header (if title or close button provided) */}
        {(title || showCloseButton) && (
          <div
            onPointerDown={handleHeaderPointerDown}
            className={`px-5 py-4 sm:px-5 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 select-none ${
              isDraggable ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700/80">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 id="modal-headline" className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate tracking-tight flex items-center gap-2">
                    <span>{title}</span>
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isDraggable && (
                <span
                  title="Click and drag to move modal"
                  className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800/80 px-2 py-1 rounded-lg select-none"
                >
                  <GripHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="hidden md:inline">Drag</span>
                </span>
              )}
              {headerActions}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  type="button"
                  aria-label="Close dialog"
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-5 py-2.5 sm:px-5 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
