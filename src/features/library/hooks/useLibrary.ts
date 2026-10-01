import { useState, useEffect, useCallback } from 'react';
import { libraryService, BorrowRecord, LibraryStats } from '../services/libraryService';
import { LibraryResource } from '../../../types';

export function useLibrary(studentId?: string, studentName?: string) {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(() => {
    setLoading(true);
    setResources(libraryService.getResources());
    setBorrows(libraryService.getBorrows());
    setStats(libraryService.getStatistics());
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const search = (query: string, category: string = 'all') => {
    return libraryService.searchResources(query, category);
  };

  const borrowResource = async (resourceId: string) => {
    if (!studentId || !studentName) throw new Error('Student context required to borrow.');
    const result = libraryService.borrowResource(resourceId, studentId, studentName);
    refreshAll();
    return result;
  };

  const returnResource = async (borrowId: string) => {
    const result = libraryService.returnResource(borrowId);
    refreshAll();
    return result;
  };

  const saveResources = (newResources: LibraryResource[]) => {
    libraryService.saveResources(newResources);
    refreshAll();
  };

  return {
    resources,
    borrows,
    stats,
    loading,
    refreshAll,
    search,
    borrowResource,
    returnResource,
    saveResources
  };
}
