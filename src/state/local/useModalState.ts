import { useState, useCallback } from 'react';

export interface UseModalStateReturn<T = any> {
  isOpen: boolean;
  open: (payload?: T) => void;
  close: () => void;
  toggle: (payload?: T) => void;
  payload: T | null;
  setPayload: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Level 3: Local UI State — Modal state encapsulation
 * Keeps modal open/close flags inside the invoking component.
 */
export function useModalState<T = any>(initialOpen: boolean = false, initialPayload: T | null = null): UseModalStateReturn<T> {
  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);
  const [payload, setPayload] = useState<T | null>(initialPayload);

  const open = useCallback((newPayload?: T) => {
    if (newPayload !== undefined) {
      setPayload(newPayload);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPayload(null);
  }, []);

  const toggle = useCallback((newPayload?: T) => {
    setIsOpen(prev => {
      if (prev) {
        setPayload(null);
        return false;
      }
      if (newPayload !== undefined) {
        setPayload(newPayload);
      }
      return true;
    });
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    payload,
    setPayload,
  };
}
