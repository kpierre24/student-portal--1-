import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  History,
  X,
  Search,
  Download,
  Calendar,
  User,
  Activity,
  FileSpreadsheet
} from 'lucide-react';
import { FinancialAuditLog } from '../../types';
import { getAuditLogs, exportAuditLogsToCSV } from '../../lib/financialWorkflow';
import { useAccessibleModal } from '../../lib/useAccessibleModal';

interface FinancialAuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FinancialAuditTrailModal: React.FC<FinancialAuditTrailModalProps> = ({
  isOpen,
  onClose
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);
  const [logs, setLogs] = useState<FinancialAuditLog[]>(() => getAuditLogs());
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      (log.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.actorName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.id || '').toLowerCase().includes(search.toLowerCase());

    if (actionFilter === 'all') return matchesSearch;
    return matchesSearch && log.action === actionFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogRef}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Financial Audit Trail & Governance Log
              </h3>
              <p className="text-xs text-slate-400">
                Immutable chronological log of all invoices, payments, adjustments, and reconciliations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportAuditLogsToCSV()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Audit CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search audit trail by actor, student, action details..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActionFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                actionFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              All Events ({logs.length})
            </button>
            <button
              onClick={() => setActionFilter('PAYMENT_RECORDED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                actionFilter === 'PAYMENT_RECORDED'
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActionFilter('SCHOLARSHIP_AWARDED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                actionFilter === 'SCHOLARSHIP_AWARDED'
                  ? 'bg-purple-600 text-white font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Scholarships
            </button>
            <button
              onClick={() => setActionFilter('PAYMENT_RECONCILED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                actionFilter === 'PAYMENT_RECONCILED'
                  ? 'bg-blue-600 text-white font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Reconciliations
            </button>
          </div>
        </div>

        {/* Logs Timeline List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              No financial audit records found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all text-xs space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          log.action.includes('PAYMENT_RECORDED')
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : log.action.includes('SCHOLARSHIP')
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : log.action.includes('RECONCILED')
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-slate-400 text-[10px]">{log.id}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    {log.details}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Actor: <strong className="text-slate-700 dark:text-slate-300">{log.actorName}</strong> ({log.actorRole})
                      </span>
                    </div>
                    {log.studentName && (
                      <div>
                        Student: <strong className="text-slate-700 dark:text-slate-300">{log.studentName}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
