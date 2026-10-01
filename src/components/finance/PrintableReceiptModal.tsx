import React from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  CheckCircle2,
  ShieldCheck,
  Building,
  Calendar,
  CreditCard,
  Hash,
  User,
  DollarSign
} from 'lucide-react';
import { Receipt } from '../../types';
import { generateOfficialReceiptPDF } from '../../lib/pdfReceiptGenerator';
import { useAccessibleModal } from '../../lib/useAccessibleModal';
import { LogoImage } from '../LogoImage';

interface PrintableReceiptModalProps {
  receipt: Receipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintableReceiptModal: React.FC<PrintableReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);

  if (!isOpen || !receipt) return null;

  const handleDownloadPDF = async () => {
    try {
      await generateOfficialReceiptPDF(receipt);
    } catch (e) {
      console.error('PDF generation error', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:rounded-none"
      >
        {/* Action Header (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Official Tuition Receipt
              </h3>
              <p className="text-xs text-slate-400">
                Receipt #{receipt.receiptNumber} • Verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100 print:p-0 print:overflow-visible custom-scrollbar">
          {/* Institutional Banner */}
          <div className="p-5 bg-slate-950 text-white rounded-2xl border-b-4 border-amber-500 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 shrink-0">
                <LogoImage className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                  HEAVEN TOUCHING EARTH INTERNATIONAL MINISTRIES
                </h1>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mt-0.5">
                  School of Ministry — Official Tuition Receipt
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Bursar & Treasury Office • Academic Financial Management System
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 hidden sm:block">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Validated
              </span>
            </div>
          </div>

          {/* Receipt Numbers & Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400">Receipt No</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {receipt.receiptNumber}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400">Payment Date</span>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                {receipt.paymentDate}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400">Payment Method</span>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                {receipt.paymentMethod}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400">Payment Ref</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                {receipt.paymentReference || 'N/A'}
              </p>
            </div>
          </div>

          {/* Student & Invoice Meta */}
          <div className="p-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Student & Academic Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Student Name: </span>
                <span className="font-bold text-slate-900 dark:text-white">{receipt.studentName}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Student ID: </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{receipt.studentId}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Academic Term: </span>
                <span className="font-bold text-slate-900 dark:text-white">{receipt.academicTerm || '2026 Semester 1'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Curriculum / Track: </span>
                <span className="font-bold text-slate-900 dark:text-white">{receipt.courseOrModule || 'School of Ministry 6 Core Modules'}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                <tr>
                  <th className="p-3">Description & Invoice Reference</th>
                  <th className="p-3 text-right">Billed</th>
                  <th className="p-3 text-right">Aid / Discount</th>
                  <th className="p-3 text-right">Paid Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                <tr className="bg-white dark:bg-slate-900">
                  <td className="p-3">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Tuition Installment • {receipt.academicTerm || '2026 Semester 1'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Invoice #{receipt.invoiceId} • Txn #{receipt.paymentId}
                    </p>
                  </td>
                  <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    ${(receipt.totalTuitionBilled || 1200).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-500">
                    ${(receipt.discountsAndScholarships || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ${receipt.amountPaid.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-sm font-black">
              <span className="text-slate-900 dark:text-white">Total Amount Received:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                ${receipt.amountPaid.toFixed(2)} USD
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">Remaining Balance on Invoice:</span>
              <span className={`font-mono ${receipt.balanceRemaining && receipt.balanceRemaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                ${(receipt.balanceRemaining || 0).toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Verification Stamp & Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Digital Verification Code
              </span>
              <p className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold">
                {receipt.verificationCode || 'HTEIM-VERIFY-VALID-2026'}
              </p>
              <p className="text-[10px] text-slate-400">
                Issued By: {receipt.issuedBy || 'Finance Bursar & Treasury Office'}
              </p>
            </div>

            <div className="text-right sm:text-right space-y-1">
              <div className="inline-block border-b border-slate-400 w-48 pb-1 mb-1">
                <span className="font-serif italic text-slate-800 dark:text-slate-200 text-sm">
                  Pastor Samuel Selkridge
                </span>
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400">
                Authorized Bursar Signature
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
