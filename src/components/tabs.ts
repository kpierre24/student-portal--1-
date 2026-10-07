import React from 'react';
import { lazyWithRetry } from '../lib/lazyWithRetry';

export const LazyHomeTab = lazyWithRetry(() => import('./HomeTab').then(m => ({ default: m.HomeTab })), 'HomeTab');
export const LazyStudentsTab = lazyWithRetry(() => import('./StudentsTab').then(m => ({ default: m.StudentsTab })), 'StudentsTab');
export const LazyCoursesTab = lazyWithRetry(() => import('./CoursesTab').then(m => ({ default: m.CoursesTab })), 'CoursesTab');
export const LazyExamsTab = lazyWithRetry(() => import('./ExamsTab').then(m => ({ default: m.ExamsTab })), 'ExamsTab');
export const LazyScheduleTab = lazyWithRetry(() => import('./ScheduleTab').then(m => ({ default: m.ScheduleTab })), 'ScheduleTab');
export const LazyLibraryTab = lazyWithRetry(() => import('../features/library/components/LibraryTab').then(m => ({ default: m.LibraryTab })), 'LibraryTab');
export const LazyPaymentTab = lazyWithRetry(() => import('./PaymentTab').then(m => ({ default: m.PaymentTab })), 'PaymentTab');
export const LazyMessagesTab = lazyWithRetry(() => import('./MessagesTab').then(m => ({ default: m.MessagesTab })), 'MessagesTab');
export const LazyReportsTab = lazyWithRetry(() => import('./ReportsTab').then(m => ({ default: m.ReportsTab })), 'ReportsTab');
export const LazyNotesTab = lazyWithRetry(() => import('./StudentNotesBibleTab').then(m => ({ default: m.StudentNotesBibleTab })), 'StudentNotesBibleTab');
export const LazyAttendanceTab = lazyWithRetry(() => import('../features/attendance/AttendanceWorkspace').then(m => ({ default: m.AttendanceWorkspace })), 'AttendanceWorkspace');
