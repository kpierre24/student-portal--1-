import React from 'react';
import { useReports } from '../hooks/useReports';

export const ReportsPage: React.FC = () => {
  const { reports, generateAcademic, generateFinancial } = useReports();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Reports Center</h2>
      <div className="space-x-4 mb-8">
        <button 
          onClick={() => generateAcademic('student-1')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Generate Academic Report
        </button>
        <button 
          onClick={() => generateFinancial('student-1')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Generate Financial Report
        </button>
      </div>
      
      <div className="space-y-4">
        {reports.map(report => (
          <div key={report.id} className="p-4 border rounded bg-gray-50">
            {report.title} - {report.createdAt}
          </div>
        ))}
      </div>
    </div>
  );
};
