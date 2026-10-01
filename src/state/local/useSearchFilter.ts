import { useState, useMemo, useCallback } from 'react';

export interface UseSearchFilterOptions<T> {
  items: T[];
  searchFields?: (item: T) => (string | null | undefined)[];
  initialSearch?: string;
}

export interface UseSearchFilterReturn<T> {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredItems: T[];
  resetSearch: () => void;
  isSearching: boolean;
}

/**
 * Level 3: Local UI State — Search Filter
 * Manages search query and text-matching entirely inside component boundaries.
 */
export function useSearchFilter<T>({
  items,
  searchFields,
  initialSearch = '',
}: UseSearchFilterOptions<T>): UseSearchFilterReturn<T> {
  const [searchTerm, setSearchTermState] = useState<string>(initialSearch);

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
  }, []);

  const resetSearch = useCallback(() => {
    setSearchTermState('');
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return items;

    return items.filter(item => {
      if (!searchFields) {
        // Default: serialize or stringify
        return JSON.stringify(item).toLowerCase().includes(query);
      }
      const values = searchFields(item);
      return values.some(val => val && val.toString().toLowerCase().includes(query));
    });
  }, [items, searchTerm, searchFields]);

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    resetSearch,
    isSearching: searchTerm.trim().length > 0,
  };
}
