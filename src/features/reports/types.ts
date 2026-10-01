export interface Report {
  id: string;
  type: 'academic' | 'financial' | 'attendance';
  title: string;
  createdAt: string;
  generatedBy: string;
}

export interface AcademicReportData {
  studentId: string;
  grades: Record<string, number>;
  attendanceRate: number;
}

export interface FinancialReportData {
  studentId: string;
  totalPaid: number;
  balanceDue: number;
}
