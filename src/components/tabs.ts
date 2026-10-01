import React from 'react';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      console.warn('Transient tab chunk load failure, retrying once...', error);
      await new Promise(resolve => setTimeout(resolve, 250));
      return await factory();
    }
  });
}

export const LazyHomeTab = lazyWithRetry(() => import('./HomeTab').then(m => ({ default: m.HomeTab })));
export const LazyStudentsTab = lazyWithRetry(() => import('./StudentsTab').then(m => ({ default: m.StudentsTab })));
export const LazyCoursesTab = lazyWithRetry(() => import('./CoursesTab').then(m => ({ default: m.CoursesTab })));
export const LazyExamsTab = lazyWithRetry(() => import('./ExamsTab').then(m => ({ default: m.ExamsTab })));
export const LazyScheduleTab = lazyWithRetry(() => import('./ScheduleTab').then(m => ({ default: m.ScheduleTab })));
export const LazyLibraryTab = lazyWithRetry(() => import('../features/library/components/LibraryTab').then(m => ({ default: m.LibraryTab })));
export const LazyPaymentTab = lazyWithRetry(() => import('./PaymentTab').then(m => ({ default: m.PaymentTab })));
export const LazyMessagesTab = lazyWithRetry(() => import('./MessagesTab').then(m => ({ default: m.MessagesTab })));
export const LazyReportsTab = lazyWithRetry(() => import('./ReportsTab').then(m => ({ default: m.ReportsTab })));
export const LazyNotesTab = lazyWithRetry(() => import('./StudentNotesBibleTab').then(m => ({ default: m.StudentNotesBibleTab })));
export const LazyAttendanceTab = lazyWithRetry(() => import('../features/attendance/AttendanceWorkspace').then(m => ({ default: m.AttendanceWorkspace })));
