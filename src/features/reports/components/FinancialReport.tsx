import React from 'react';
import { FinancialReportData } from '../types';

export const FinancialReport: React.FC<{ data: FinancialReportData }> = ({ data }) => {
  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      <h3 className="text-xl font-bold mb-4">Financial Statement</h3>
      <p>Total Paid: ${data.totalPaid}</p>
      <p>Balance Due: ${data.balanceDue}</p>
    </div>
  );
};
