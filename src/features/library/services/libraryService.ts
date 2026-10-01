import { Book } from '../types';
import { generateUUID } from '../../../lib/idGenerator';

const LIBRARY_STORAGE_KEY = 'hteim_library_resources';
const BORROW_STORAGE_KEY = 'hteim_library_borrows';

export interface BorrowRecord {
  id: string;
  resourceId: string;
  studentId: string;
  studentName: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: 'active' | 'returned' | 'overdue';
}

export interface LibraryStats {
  totalResources: number;
  totalBorrowed: number;
  totalOverdue: number;
  booksByCategory: Record<string, number>;
}

export const libraryService = {
  getResources(): Book[] {
    const saved = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  },

  saveResources(resources: Book[]): void {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(resources));
  },

  getBorrows(): BorrowRecord[] {
    const saved = localStorage.getItem(BORROW_STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  },

  saveBorrows(borrows: BorrowRecord[]): void {
    localStorage.setItem(BORROW_STORAGE_KEY, JSON.stringify(borrows));
  },

  searchResources(query: string, category: string = 'all'): Book[] {
    let resources = this.getResources();
    if (category !== 'all') {
      resources = resources.filter(r => r.category === category);
    }
    if (query) {
      const q = query.toLowerCase();
      resources = resources.filter(r => 
        r.title.toLowerCase().includes(q) || 
        r.author.toLowerCase().includes(q) || 
        r.summary.toLowerCase().includes(q)
      );
    }
    return resources;
  },

  borrowResource(resourceId: string, studentId: string, studentName: string): BorrowRecord {
    const borrows = this.getBorrows();
    
    // Check if already borrowed
    const existing = borrows.find(b => b.resourceId === resourceId && b.studentId === studentId && b.status === 'active');
    if (existing) {
      throw new Error('You have already borrowed this resource.');
    }

    const newBorrow: BorrowRecord = {
      id: generateUUID(),
      resourceId,
      studentId,
      studentName,
      borrowedAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      status: 'active'
    };

    borrows.push(newBorrow);
    this.saveBorrows(borrows);
    return newBorrow;
  },

  returnResource(borrowId: string): BorrowRecord {
    const borrows = this.getBorrows();
    const index = borrows.findIndex(b => b.id === borrowId);
    if (index === -1) throw new Error('Borrow record not found.');

    borrows[index].status = 'returned';
    borrows[index].returnedAt = new Date().toISOString();
    this.saveBorrows(borrows);
    return borrows[index];
  },

  getStatistics(): LibraryStats {
    const resources = this.getResources();
    const borrows = this.getBorrows();

    const stats: LibraryStats = {
      totalResources: resources.length,
      totalBorrowed: borrows.filter(b => b.status === 'active').length,
      totalOverdue: borrows.filter(b => b.status === 'overdue' || (b.status === 'active' && new Date(b.dueDate) < new Date())).length,
      booksByCategory: {}
    };

    resources.forEach(r => {
      stats.booksByCategory[r.category] = (stats.booksByCategory[r.category] || 0) + 1;
    });

    return stats;
  }
};
