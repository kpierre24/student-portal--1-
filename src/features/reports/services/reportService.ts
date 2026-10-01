import { Report } from '../types';

export const reportService = {
  getReports(): Report[] {
    // In a real app, fetch from backend or persistent store
    return [];
  },

  generateAcademicReport(studentId: string): Report {
    return {
      id: Math.random().toString(36).substring(7),
      type: 'academic',
      title: `Academic Report - ${studentId}`,
      createdAt: new Date().toISOString(),
      generatedBy: 'admin'
    };
  },

  generateFinancialReport(studentId: string): Report {
    return {
      id: Math.random().toString(36).substring(7),
      type: 'financial',
      title: `Financial Statement - ${studentId}`,
      createdAt: new Date().toISOString(),
      generatedBy: 'admin'
    };
  }
};
