import { useState, useCallback, useMemo } from 'react';

export interface UseSelectionStateReturn<T = string> {
  selectedItems: Set<T>;
  select: (item: T) => void;
  deselect: (item: T) => void;
  toggle: (item: T) => void;
  selectAll: (items: T[]) => void;
  clearSelection: () => void;
  isSelected: (item: T) => boolean;
  selectedCount: number;
  selectedArray: T[];
}

/**
 * Level 3: Local UI State — Item/Row Selection
 * Keeps table batch selection and row checks local to list/table components.
 */
export function useSelectionState<T = string>(initialSelected: T[] = []): UseSelectionStateReturn<T> {
  const [selectedItems, setSelectedItems] = useState<Set<T>>(() => new Set(initialSelected));

  const select = useCallback((item: T) => {
    setSelectedItems(prev => new Set(prev).add(item));
  }, []);

  const deselect = useCallback((item: T) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(item);
      return next;
    });
  }, []);

  const toggle = useCallback((item: T) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedItems(new Set(items));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const isSelected = useCallback((item: T) => {
    return selectedItems.has(item);
  }, [selectedItems]);

  const selectedArray = useMemo(() => Array.from(selectedItems), [selectedItems]);

  return {
    selectedItems,
    select,
    deselect,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount: selectedItems.size,
    selectedArray,
  };
}
