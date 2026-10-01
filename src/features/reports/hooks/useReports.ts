import { useState } from 'react';
import { reportService } from '../services/reportService';
import { Report } from '../types';

export const useReports = () => {
  const [reports, setReports] = useState<Report[]>(reportService.getReports());

  const generateAcademic = (studentId: string) => {
    const report = reportService.generateAcademicReport(studentId);
    setReports([...reports, report]);
  };

  const generateFinancial = (studentId: string) => {
    const report = reportService.generateFinancialReport(studentId);
    setReports([...reports, report]);
  };

  return { reports, generateAcademic, generateFinancial };
};
