import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  X,
  Search,
  Building,
  DollarSign,
  Calendar,
  Hash,
  Filter,
  Check,
  Download
} from 'lucide-react';
import { PaymentTransaction } from '../../types';
import { getTransactions, reconcilePayment, exportTransactionsToCSV } from '../../lib/financialWorkflow';
import { useAccessibleModal } from '../../lib/useAccessibleModal';

interface FinancialReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onUpdated?: () => void;
}

export const FinancialReconciliationModal: React.FC<FinancialReconciliationModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  onUpdated
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => getTransactions());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<PaymentTransaction | null>(null);
  const [depositBatchId, setDepositBatchId] = useState('');
  const [reconStatus, setReconStatus] = useState<'Reconciled' | 'Discrepancy' | 'Unreconciled'>('Reconciled');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const refreshList = () => {
    setTransactions(getTransactions());
    if (onUpdated) onUpdated();
  };

  const handleOpenReconcile = (tx: PaymentTransaction) => {
    setSelectedTx(tx);
    setDepositBatchId(tx.depositBatchId || `BATCH-${new Date().toISOString().split('T')[0]}-01`);
    setReconStatus(tx.reconciliationStatus === 'Reconciled' ? 'Reconciled' : 'Reconciled');
    setNotes('');
  };

  const handleSaveReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    reconcilePayment({
      transactionId: selectedTx.id,
      status: reconStatus,
      depositBatchId: depositBatchId.trim(),
      reconciledBy: userEmail || 'Bursar Auditor',
      notes: notes.trim()
    });

    setSelectedTx(null);
    refreshList();
  };

  const filtered = transactions.filter(t => {
    const matchesSearch =
      (t.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.receiptNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.paymentReference || '').toLowerCase().includes(search.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && (t.reconciliationStatus || 'Unreconciled') === filterStatus;
  });

  const reconciledCount = transactions.filter(t => t.reconciliationStatus === 'Reconciled').length;
  const unreconciledCount = transactions.filter(t => !t.reconciliationStatus || t.reconciliationStatus === 'Unreconciled').length;
  const discrepancyCount = transactions.filter(t => t.reconciliationStatus === 'Discrepancy').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogRef}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Financial Payment Reconciliation
              </h3>
              <p className="text-xs text-slate-400">
                Match payment transactions against bank deposits and gateway settlements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTransactionsToCSV()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Ledger CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Reconciled</span>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {reconciledCount}
            </p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Pending Review</span>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {unreconciledCount}
            </p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Discrepancies</span>
            <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {discrepancyCount}
            </p>
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
              placeholder="Search by student, reference, receipt #..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('Unreconciled')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterStatus === 'Unreconciled'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Unreconciled ({unreconciledCount})
            </button>
            <button
              onClick={() => setFilterStatus('Reconciled')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterStatus === 'Reconciled'
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Reconciled ({reconciledCount})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider sticky top-0">
              <tr>
                <th className="p-3">Txn ID & Date</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Method & Reference</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Batch / Reconciled By</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-3">
                    <p className="font-mono font-bold text-slate-900 dark:text-white">{tx.id}</p>
                    <p className="text-[10px] text-slate-400">{tx.paymentDate}</p>
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    {tx.studentName}
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{tx.paymentMethod}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{tx.paymentReference || 'N/A'}</p>
                  </td>
                  <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ${tx.amount.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                      {tx.depositBatchId || '—'}
                    </p>
                    <p className="text-[10px] text-slate-400">{tx.reconciledBy || 'Unassigned'}</p>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.reconciliationStatus === 'Reconciled'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : tx.reconciliationStatus === 'Discrepancy'
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {tx.reconciliationStatus || 'Unreconciled'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleOpenReconcile(tx)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sub-form Modal inside for editing reconciliation */}
        {selectedTx && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-10 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                  Reconcile Transaction #{selectedTx.id}
                </h4>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
                <p>
                  <span className="text-slate-400">Student: </span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedTx.studentName}</span>
                </p>
                <p>
                  <span className="text-slate-400">Amount: </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">${selectedTx.amount}</span>
                  <span className="text-slate-400 ml-2">via {selectedTx.paymentMethod}</span>
                </p>
              </div>

              <form onSubmit={handleSaveReconciliation} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reconciliation Status
                  </label>
                  <select
                    value={reconStatus}
                    onChange={e => setReconStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Reconciled">Reconciled (Matched to Bank)</option>
                    <option value="Unreconciled">Unreconciled (Pending Confirmation)</option>
                    <option value="Discrepancy">Discrepancy (Amount/Reference mismatch)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Deposit Batch / Settlement ID
                  </label>
                  <input
                    type="text"
                    value={depositBatchId}
                    onChange={e => setDepositBatchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                    placeholder="e.g. BATCH-2026-04-12-REP"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Auditor Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    placeholder="e.g. Verified on April bank statement."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTx(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                  >
                    Save Reconciliation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
