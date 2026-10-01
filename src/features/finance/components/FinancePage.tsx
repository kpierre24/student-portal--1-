import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CreditCard, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Clock, 
  Download,
  Filter,
  Plus,
  Search,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { InvoiceList } from './InvoiceList';
import { FinancialSummary } from './FinancialSummary';

export const FinancePage: React.FC = () => {
  const { invoices, stats, loading, refreshAll } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = invoices.filter(inv => 
    inv.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            Financial Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Institutional ledger, tuition tracking, and financial oversight
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={refreshAll}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm">
            <Plus className="w-4 h-4" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <FinancialSummary stats={stats} />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search student or invoice #"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
              
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <InvoiceList invoices={filteredInvoices} />
          </div>
        </div>
      </div>
    </div>
  );
};
