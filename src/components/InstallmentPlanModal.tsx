import React, { useState } from 'react';
import { 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  Check, 
  Trash2, 
  Plus,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { StudentInstallmentPlan, InstallmentMilestone, PaymentRecord } from '../types';
import { Modal } from './Modal';

interface InstallmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: { name: string; id: string; balance: number; totalTuition: number; amountPaid: number }[];
  existingPlans: StudentInstallmentPlan[];
  onSavePlan: (plan: StudentInstallmentPlan) => void;
  onRecordMilestonePayment: (studentName: string, milestone: InstallmentMilestone) => void;
}

export const InstallmentPlanModal: React.FC<InstallmentPlanModalProps> = ({
  isOpen,
  onClose,
  students,
  existingPlans,
  onSavePlan,
  onRecordMilestonePayment
}) => {
  const eligibleStudents = students.filter(s => s.balance > 0);
  const [selectedStudentName, setSelectedStudentName] = useState(eligibleStudents[0]?.name || '');
  const [frequency, setFrequency] = useState<'monthly' | 'biweekly'>('monthly');
  const [totalMilestones, setTotalMilestones] = useState<number>(3);
  const [initialDeposit, setInitialDeposit] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const currentStudent = students.find(s => s.name === selectedStudentName) || eligibleStudents[0];
  const totalBalance = currentStudent ? currentStudent.balance : 1200;
  const netInstallmentAmount = Math.max(0, totalBalance - initialDeposit);
  const perMilestoneAmount = totalMilestones > 0 ? Math.round(netInstallmentAmount / totalMilestones) : 0;

  // Active plans view or create new plan
  const activePlanForSelected = existingPlans.find(p => p.studentName === selectedStudentName && p.status === 'active');
  const [viewMode, setViewMode] = useState<'manage' | 'create'>(activePlanForSelected ? 'manage' : 'create');

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;

    const milestones: InstallmentMilestone[] = [];
    const baseDate = new Date();

    for (let i = 1; i <= totalMilestones; i++) {
      const dueDate = new Date(baseDate);
      if (frequency === 'monthly') {
        dueDate.setMonth(dueDate.getMonth() + i);
      } else {
        dueDate.setDate(dueDate.getDate() + (i * 14));
      }

      milestones.push({
        id: `ms_${Date.now()}_${i}`,
        milestoneNumber: i,
        dueDate: dueDate.toISOString().slice(0, 10),
        amount: i === totalMilestones 
          ? netInstallmentAmount - (perMilestoneAmount * (totalMilestones - 1))
          : perMilestoneAmount,
        isPaid: false
      });
    }

    const newPlan: StudentInstallmentPlan = {
      id: `plan_${Date.now()}`,
      studentName: currentStudent.name,
      studentId: currentStudent.id,
      totalTuition: currentStudent.totalTuition || 1200,
      initialDeposit,
      remainingBalance: netInstallmentAmount,
      frequency,
      totalMilestones,
      milestones,
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'active',
      notes: notes || `Standard ${frequency} installment plan`
    };

    onSavePlan(newPlan);
    setViewMode('manage');
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tuition Installment Plan Scheduler"
      subtitle="Structure flexible monthly or bi-weekly tuition payments for ministerial candidates."
      icon={<Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
      size="lg"
      isDraggable={true}
    >
      <div className="space-y-5">
        {/* Student Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="space-y-0.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Student Candidate:
            </label>
            <p className="text-[11px] text-slate-500">
              Only students with outstanding balances are listed
            </p>
          </div>

          <select
            value={selectedStudentName}
            onChange={(e) => {
              setSelectedStudentName(e.target.value);
              const hasPlan = existingPlans.some(p => p.studentName === e.target.value && p.status === 'active');
              setViewMode(hasPlan ? 'manage' : 'create');
            }}
            className="w-full sm:w-64 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
          >
            {eligibleStudents.length === 0 ? (
              <option value="">No students with outstanding balance</option>
            ) : (
              eligibleStudents.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name} (Due: ${s.balance})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Plan Status or Creator */}
        {activePlanForSelected && viewMode === 'manage' ? (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 text-[10px] font-black uppercase rounded-full tracking-wider">
                  Active Installment Agreement
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-syne pt-1">
                  {activePlanForSelected.studentName} — {activePlanForSelected.totalMilestones} Milestones ({activePlanForSelected.frequency})
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Total Schedule: ${activePlanForSelected.remainingBalance} USD remaining
                </p>
              </div>

              <button
                onClick={() => setViewMode('create')}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                + Restructure Plan
              </button>
            </div>

            {/* Milestones Schedule Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Amount Due</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {activePlanForSelected.milestones.map((m) => (
                    <tr key={m.id} className={m.isPaid ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}>
                      <td className="py-2.5 px-3 font-mono font-bold">Milestone {m.milestoneNumber}</td>
                      <td className="py-2.5 px-3">{m.dueDate}</td>
                      <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white">${m.amount}.00</td>
                      <td className="py-2.5 px-3">
                        {m.isPaid ? (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-full flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Paid ({m.paidDate || 'Verified'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded-full flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!m.isPaid ? (
                          <button
                            onClick={() => onRecordMilestonePayment(activePlanForSelected.studentName, m)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-bold">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Create New Plan Form */
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Frequency:
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="monthly">Monthly Milestones</option>
                  <option value="biweekly">Bi-Weekly Milestones</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Number of Installments:
                </label>
                <select
                  value={totalMilestones}
                  onChange={(e) => setTotalMilestones(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value={2}>2 Installments</option>
                  <option value={3}>3 Installments</option>
                  <option value={4}>4 Installments</option>
                  <option value={6}>6 Installments</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Down Deposit ($):
                </label>
                <input
                  type="number"
                  min={0}
                  max={totalBalance}
                  value={initialDeposit}
                  onChange={(e) => setInitialDeposit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Plan Calculation Breakdown */}
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-indigo-950/30 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                <span>Total Outstanding Balance:</span>
                <span>${totalBalance}.00 USD</span>
              </div>
              <div className="flex justify-between font-bold text-indigo-700 dark:text-indigo-300">
                <span>Calculated Payment per Installment:</span>
                <span className="font-black text-sm">${perMilestoneAmount}.00 / milestone</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                Milestones will be automatically scheduled every {frequency === 'monthly' ? 'month' : '2 weeks'} starting 30 days from today.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Plan Agreement Notes (Optional):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Approved by Academic Dean for ministerial candidate hardship."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {activePlanForSelected && (
                <button
                  type="button"
                  onClick={() => setViewMode('manage')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!currentStudent || totalBalance <= 0}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Activate Installment Plan</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
