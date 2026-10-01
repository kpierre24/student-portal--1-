import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  SearchResultItem,
  SearchCategory,
  SearchDataContext,
  buildSearchIndex,
  searchFilter,
} from './searchService';

interface SearchContextValue {
  isOpen: boolean;
  openSearch: (category?: SearchCategory | 'all') => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  query: string;
  setQuery: (q: string) => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  results: SearchResultItem[];
  executeAction: (item: SearchResultItem) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export interface SearchProviderProps {
  children: React.ReactNode;
  searchContextData: SearchDataContext;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({
  children,
  searchContextData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const openSearch = useCallback((category: SearchCategory | 'all' = 'all') => {
    setActiveCategory(category);
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  const toggleSearch = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) setQuery('');
      return !prev;
    });
  }, []);

  // Global Ctrl/Cmd + K and Slash shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleSearch();
        return;
      }

      // Quick slash '/' trigger when not in an input/textarea
      if (
        e.key === '/' &&
        !isOpen &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement)?.isContentEditable
        )
      ) {
        e.preventDefault();
        openSearch('all');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleSearch, openSearch]);

  // Build searchable items
  const allItems = useMemo(() => {
    return buildSearchIndex(searchContextData);
  }, [searchContextData]);

  // Filter search results
  const results = useMemo(() => {
    return searchFilter(allItems, query, activeCategory);
  }, [allItems, query, activeCategory]);

  const executeAction = useCallback(
    (item: SearchResultItem) => {
      closeSearch();
      try {
        item.action();
      } catch (err) {
        console.error('Failed to execute search action:', err);
      }
    },
    [closeSearch]
  );

  const value: SearchContextValue = {
    isOpen,
    openSearch,
    closeSearch,
    toggleSearch,
    query,
    setQuery,
    activeCategory,
    setActiveCategory,
    results,
    executeAction,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return ctx;
}
