import React from 'react';
import { AcademicReportData } from '../types';

export const AcademicReport: React.FC<{ data: AcademicReportData }> = ({ data }) => {
  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      <h3 className="text-xl font-bold mb-4">Academic Progress</h3>
      <p>Attendance Rate: {data.attendanceRate}%</p>
      {/* Chart components would go here */}
    </div>
  );
};
