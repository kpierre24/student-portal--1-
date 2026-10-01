import React from 'react';
import { 
  FileText, 
  ExternalLink, 
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle
} from 'lucide-react';
import { Invoice } from '../types';

interface InvoiceListProps {
  invoices: Invoice[];
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ invoices }) => {
  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Clock className="w-3 h-3" />
            Partial
          </span>
        );
      case 'Past Due':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Past Due
          </span>
        );
      case 'Unpaid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
            Unpaid
          </span>
        );
      case 'Void':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Void
          </span>
        );
      default:
        return null;
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <FileText className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">No invoices found</p>
        <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-gray-50 dark:bg-gray-800/50">
          <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice</th>
          <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
          <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Issue Date</th>
          <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
          <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
          <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-right"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {invoices.map((inv) => (
          <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 dark:text-white uppercase">{inv.invoiceNumber}</span>
                <span className="text-xs text-gray-500">{inv.term}</span>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                  {inv.studentName.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{inv.studentName}</span>
                  <span className="text-xs text-gray-500">{inv.studentId}</span>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
              {inv.issueDate}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">${inv.totalTuition.toLocaleString()}</span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`text-sm font-bold ${inv.outstandingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                ${inv.outstandingBalance.toLocaleString()}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              {getStatusBadge(inv.status)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-gray-400 hover:text-gray-600">
                <ExternalLink className="w-4 h-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
