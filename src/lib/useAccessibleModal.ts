import { useEffect, useRef } from 'react';

export function useAccessibleModal(isOpen: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  // Keep latest onClose callback in a ref to prevent effect from re-running on every render
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Capture currently focused element before modal opened
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Prevent background scrolling while modal is active
    document.body.classList.add('modal-open');
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    
    const focusInitialElement = () => {
      if (!dialog) return;
      // If user is already focused on an element inside the dialog (e.g. typing in an input), never hijack focus
      if (dialog.contains(document.activeElement)) {
        return;
      }
      const autofocusEl = dialog.querySelector<HTMLElement>('[data-autofocus]');
      if (autofocusEl) {
        autofocusEl.focus({ preventScroll: true });
        return;
      }
      const firstFocusable = dialog.querySelector<HTMLElement>(focusableSelector);
      if (firstFocusable) {
        firstFocusable.focus({ preventScroll: true });
      } else {
        dialog.setAttribute('tabindex', '-1');
        dialog.focus({ preventScroll: true });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable: HTMLElement[] = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(focusInitialElement, 50);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('modal-open');
      document.body.style.overflow = originalStyle;
      document.removeEventListener('keydown', handleKeyDown);
      // Safely restore focus without causing viewport scroll jumps
      if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === 'function') {
        try {
          previouslyFocusedRef.current.focus({ preventScroll: true });
        } catch {
          // Ignore if element is no longer in DOM
        }
      }
    };
  }, [isOpen]); // ONLY re-run when isOpen changes, NOT on every keystroke/render

  return dialogRef;
}


