import React, { useState } from 'react';
import { DollarSign, CreditCard, ShieldCheck, CheckCircle2, Download, Printer, Lock, Sparkles } from 'lucide-react';
import { PaymentRecord, PaymentPlanType } from '../types';
import { Modal } from './Modal';

interface OnlinePaymentModalProps {
  studentName: string;
  studentEmail?: string;
  currentBalance: number;
  onClose: () => void;
  onPaymentSuccess: (payment: Partial<PaymentRecord>) => void;
}

export const OnlinePaymentModal: React.FC<OnlinePaymentModalProps> = ({
  studentName,
  studentEmail,
  currentBalance,
  onClose,
  onPaymentSuccess
}) => {
  const [paymentAmount, setPaymentAmount] = useState<number>(Math.min(300, currentBalance || 300));
  const [method, setMethod] = useState<'Credit Card' | 'PayPal' | 'Zelle' | 'Stripe'>('Credit Card');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvc, setCardCvc] = useState('884');
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlanType>('Monthly Installments');

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedRecord, setCompletedRecord] = useState<PaymentRecord | null>(null);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      const receiptNum = `INV-HTEIM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const sName = studentName || 'Current Student';
      const newPayment: PaymentRecord = {
        id: `pay-${Date.now()}`,
        studentName: sName,
        studentId: `STU-${Math.floor(100 + Math.random() * 900)}`,
        email: studentEmail || `${(sName || '').toLowerCase().replace(/\s+/g, '.')}@hteim.edu`,
        moduleTrack: 'Module 3: Ministerial Ethics & Integrity',
        totalTuition: 1200,
        amountPaid: paymentAmount,
        status: (currentBalance - paymentAmount) <= 0 ? 'Paid In Full' : 'Partial',
        lastPaymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod: method,
        receiptNumber: receiptNum,
        paymentPlan,
        notes: `Processed online via ${method}`
      };

      setCompletedRecord(newPayment);
      setIsProcessing(false);
      onPaymentSuccess(newPayment);
    }, 1500);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Online Tuition Checkout"
      subtitle="Secure SSL 256-Bit Encrypted Portal Payment Processing."
      icon={<CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
      size="md"
      isDraggable={true}
    >
      {completedRecord ? (
        <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-center space-y-4 animate-fadeIn">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-black text-emerald-950 dark:text-emerald-100 font-syne">
              Payment Received & Verified!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
              Receipt #{completedRecord.receiptNumber} Generated
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl text-left text-xs space-y-1.5 border border-slate-200 dark:border-slate-700 font-medium">
            <div className="flex justify-between">
              <span className="text-slate-500">Student Name:</span>
              <span className="font-bold text-slate-900 dark:text-white">{completedRecord.studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Paid:</span>
              <span className="font-black text-emerald-600">${completedRecord.amountPaid}.00 USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-bold text-slate-900 dark:text-white">{completedRecord.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account Balance Remaining:</span>
              <span className="font-black text-amber-600">${Math.max(0, currentBalance - completedRecord.amountPaid)}.00</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handlePay} className="space-y-4">
          {/* Student & Amount Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black">Student Account</p>
              <p className="text-xs font-black text-slate-900 dark:text-white">{studentName}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-black">Current Balance</p>
              <p className="text-base font-black text-amber-600 dark:text-amber-400">${currentBalance}</p>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
              Select Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'Credit Card', label: 'Card' },
                { id: 'Stripe', label: 'Stripe' },
                { id: 'PayPal', label: 'PayPal' },
                { id: 'Zelle', label: 'Zelle' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as any)}
                  className={`py-2 px-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all border ${
                    method === m.id
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Amount Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
              Payment Amount ($ USD)
            </label>
            <input
              type="number"
              min={10}
              max={currentBalance || 2000}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Simulated Card Details */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="block text-[10px] font-black uppercase text-slate-400">Card Details</label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
              />
              <input
                type="text"
                placeholder="CVC"
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" /> 256-Bit SSL Protection
            </span>

            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Processing Payment...</span>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  <span>Confirm & Pay ${paymentAmount}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
