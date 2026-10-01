import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CreditCard,
  FileText,
  Award,
  RotateCcw,
  Clock,
  Printer,
  Download,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Hash,
  User,
  Sliders,
  Sparkles
} from 'lucide-react';
import {
  Invoice,
  PaymentTransaction,
  Receipt,
  FinancialAdjustment,
  PaymentRecord
} from '../../types';
import {
  calculateStudentFinancialProfile,
  getInvoices,
  getTransactions,
  getReceipts,
  getAdjustments
} from '../../lib/financialWorkflow';
import { generateStudentAccountStatementPDF } from '../../lib/pdfReceiptGenerator';
import { generateUUID } from '../../lib/idGenerator';
import { RecordTransactionModal } from './RecordTransactionModal';
import { FinancialAdjustmentModal } from './FinancialAdjustmentModal';
import { PrintableReceiptModal } from './PrintableReceiptModal';

interface StudentFinancialProfileViewProps {
  studentName: string;
  isAdmin?: boolean;
  studentId?: string;
  studentEmail?: string;
  userRole?: string;
  userEmail?: string;
  onBack?: () => void;
  onRefresh?: () => void;
  onUpdated?: () => void;
}

export const StudentFinancialProfileView: React.FC<StudentFinancialProfileViewProps> = ({
  studentName,
  isAdmin: isAdminProp,
  studentId,
  studentEmail,
  userRole,
  userEmail,
  onBack,
  onRefresh,
  onUpdated
}) => {
  const isAdmin = isAdminProp ?? (userRole === 'admin' || userRole === 'teacher');
  const [profile, setProfile] = useState(() => calculateStudentFinancialProfile(studentName));
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    setProfile(calculateStudentFinancialProfile(studentName));
  }, [studentName]);

  const refreshProfile = () => {
    const updated = calculateStudentFinancialProfile(studentName);
    setProfile(updated);
    if (onRefresh) onRefresh();
    if (onUpdated) onUpdated();
  };

  const handleOpenPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsRecordPaymentOpen(true);
  };

  const handleOpenAdjustment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsAdjustmentOpen(true);
  };

  const handleViewReceipt = (receiptNumber: string) => {
    const allReceipts = getReceipts();
    const found = allReceipts.find(r => r.receiptNumber === receiptNumber);
    if (found) {
      setActiveReceipt(found);
      setIsReceiptModalOpen(true);
    } else {
      // Create on the fly if not found
      const tx = profile.transactions.find(t => t.receiptNumber === receiptNumber);
      if (tx) {
        const dummyReceipt: Receipt = {
          id: generateUUID(),
          receiptNumber,
          paymentId: tx.id,
          invoiceId: tx.invoiceId,
          studentName: tx.studentName,
          studentId: tx.studentId,
          amountPaid: tx.amount,
          paymentDate: tx.paymentDate,
          paymentMethod: tx.paymentMethod,
          paymentReference: tx.paymentReference,
          issuedAt: tx.createdAt,
          issuedBy: tx.recordedBy || 'Finance Bursar',
          academicTerm: '2026 Semester 1',
          totalTuitionBilled: profile.totalTuition,
          discountsAndScholarships: profile.discounts + profile.scholarships,
          balanceRemaining: profile.outstandingBalance,
          verificationCode: `HTEIM-VERIFY-${receiptNumber}`
        };
        setActiveReceipt(dummyReceipt);
        setIsReceiptModalOpen(true);
      }
    }
  };

  const handleDownloadStatement = () => {
    // Generate statement from current invoices
    const paymentRecordsForStatement: PaymentRecord[] = profile.invoices.map(inv => ({
      id: inv.id,
      studentName: inv.studentName,
      studentId: inv.studentId,
      email: inv.email,
      phone: inv.phone,
      moduleTrack: inv.moduleTrack,
      totalTuition: inv.totalTuition,
      amountPaid: inv.amountPaid,
      status: inv.status === 'Paid' ? 'Paid In Full' : inv.status === 'Partially Paid' ? 'Partial' : 'Pending Review',
      lastPaymentDate: inv.updatedAt ? inv.updatedAt.split('T')[0] : '2026-04-15',
      paymentMethod: inv.discounts > 0 || inv.scholarships > 0 ? 'Scholarship' : 'Bank Transfer',
      notes: `Institutional tuition statement for ${inv.studentName}. Net tuition: $${inv.netTuition}. Balance: $${inv.outstandingBalance}.`
    }));

    generateStudentAccountStatementPDF(
      studentName,
      studentId || profile.invoices[0]?.studentId || 'HTEIM-STD',
      studentEmail || profile.invoices[0]?.email || 'N/A',
      paymentRecordsForStatement
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              ← Back to Ledgers
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {studentName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                Student Financial Profile
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive institutional tuition ledger, invoices, transactions & aid records.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadStatement}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" /> Download Statement PDF
          </button>
          {isAdmin && profile.invoices.length > 0 && (
            <>
              <button
                onClick={() => handleOpenAdjustment(profile.invoices[0])}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Award className="w-4 h-4" /> Apply Aid / Adjustment
              </button>
              <button
                onClick={() => handleOpenPayment(profile.invoices[0])}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Record Payment
              </button>
            </>
          )}
        </div>
      </div>

      {/* Financial Metrics Cards (Architectural breakdown) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Total Tuition Billed
          </span>
          <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
            ${profile.totalTuition.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400">Institutional curriculum rate</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" /> Aid & Scholarships
          </span>
          <p className="text-xl font-black font-mono text-amber-500">
            ${(profile.scholarships + profile.discounts).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400">
            ${profile.scholarships} grants • ${profile.discounts} discounts
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-indigo-500" /> Net Tuition
          </span>
          <p className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            ${profile.netTuition.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400">After all grants & deductions</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Total Paid
          </span>
          <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            ${profile.amountPaid.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400">
            {profile.transactions.length} verified transaction(s)
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Balance Due
          </span>
          <p className={`text-xl font-black font-mono ${profile.outstandingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-500'}`}>
            ${profile.outstandingBalance.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400">
            {profile.outstandingBalance <= 0 ? 'Paid in full / Zero balance' : 'Pending payment collection'}
          </p>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Tuition Invoices
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official billing invoices issued for academic curriculum terms.
              </p>
            </div>
          </div>
        </div>

        {profile.invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            No invoices generated yet for this student.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Invoice ID</th>
                  <th className="p-3">Curriculum / Term</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Billed</th>
                  <th className="p-3 text-right">Aid/Disc</th>
                  <th className="p-3 text-right">Net Billed</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Balance</th>
                  <th className="p-3 text-center">Status</th>
                  {isAdmin && <th className="p-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {profile.invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors font-medium">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {inv.id}
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900 dark:text-white">{inv.moduleTrack}</p>
                      <p className="text-[10px] text-slate-400">{inv.term || '2026 Semester 1'}</p>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {inv.dueDate}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      ${inv.totalTuition.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-600 dark:text-amber-400">
                      ${((inv.discounts || 0) + (inv.scholarships || 0)).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ${inv.netTuition.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ${inv.amountPaid.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      ${inv.outstandingBalance.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : inv.status === 'Partially Paid'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenPayment(inv)}
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold transition-colors cursor-pointer"
                            title="Post Payment"
                          >
                            + Pay
                          </button>
                          <button
                            onClick={() => handleOpenAdjustment(inv)}
                            className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold transition-colors cursor-pointer"
                            title="Apply Aid/Scholarship"
                          >
                            Aid
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Transactions Ledger Section */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Payment Transactions & Receipts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Itemized transaction records linked to official receipts.
              </p>
            </div>
          </div>
        </div>

        {profile.transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            No payment transactions recorded for this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Txn ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Reference / Check #</th>
                  <th className="p-3 text-right">Amount Paid</th>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3 text-center">Reconciliation</th>
                  <th className="p-3 text-center">Receipt Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {profile.transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors font-medium">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {tx.id}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {tx.paymentDate}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                      {tx.paymentReference || 'N/A'}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ${tx.amount.toLocaleString()}
                    </td>
                    <td className="p-3 font-mono text-amber-600 dark:text-amber-400 font-bold">
                      {tx.receiptNumber}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.reconciliationStatus === 'Reconciled'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : tx.reconciliationStatus === 'Discrepancy'
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {tx.reconciliationStatus || 'Unreconciled'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleViewReceipt(tx.receiptNumber)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" /> View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjustments, Scholarships & Grants Section */}
      {profile.adjustments.length > 0 && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Scholarships, Grants & Financial Adjustments
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Institutional aid grants, awards, discounts, and fee adjustments.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Adj ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Category / Program</th>
                  <th className="p-3">Applied Date</th>
                  <th className="p-3">Authorized By</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {profile.adjustments.map(adj => (
                  <tr key={adj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors font-medium">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {adj.id}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        {adj.type}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {adj.categoryName}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {adj.appliedDate}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {adj.authorizedBy}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                      ${adj.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">
                      {adj.notes || 'Institutional Award'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Modals */}
      <RecordTransactionModal
        invoice={selectedInvoice}
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onTransactionRecorded={(res) => {
          refreshProfile();
          setActiveReceipt(res.receipt);
          setIsReceiptModalOpen(true);
        }}
        userEmail={userEmail}
        userRole={userRole}
      />

      <FinancialAdjustmentModal
        invoice={selectedInvoice}
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        onAdjustmentApplied={() => {
          refreshProfile();
        }}
        userEmail={userEmail}
        userRole={userRole}
      />

      <PrintableReceiptModal
        receipt={activeReceipt}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </div>
  );
};
