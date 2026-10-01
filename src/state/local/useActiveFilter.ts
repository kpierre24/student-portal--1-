import { useState, useCallback } from 'react';

export interface UseActiveFilterReturn<T extends string = string> {
  activeFilter: T;
  setActiveFilter: (filter: T) => void;
  isFilterActive: (filter: T) => boolean;
  resetFilter: () => void;
}

/**
 * Level 3: Local UI State — Active Filter Chips & Segment Controls
 * Keeps selected filter chip, category, or pill purely local.
 */
export function useActiveFilter<T extends string = string>(
  defaultFilter: T
): UseActiveFilterReturn<T> {
  const [activeFilter, setActiveFilterState] = useState<T>(defaultFilter);

  const setActiveFilter = useCallback((filter: T) => {
    setActiveFilterState(filter);
  }, []);

  const isFilterActive = useCallback((filter: T): boolean => {
    return activeFilter === filter;
  }, [activeFilter]);

  const resetFilter = useCallback(() => {
    setActiveFilterState(defaultFilter);
  }, [defaultFilter]);

  return {
    activeFilter,
    setActiveFilter,
    isFilterActive,
    resetFilter,
  };
}
