import React, { useState } from 'react';
import { 
  Award, 
  Heart, 
  DollarSign, 
  CheckCircle2, 
  Building2, 
  Mail, 
  User, 
  Printer, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  Church, 
  FileText 
} from 'lucide-react';
import { SponsorshipDonation } from '../types';
import { Modal } from './Modal';
import { generateUUID, getNextSequenceNumber } from '../lib/idGenerator';

interface SponsorScholarshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: { name: string; id: string; balance: number }[];
  onGrantScholarship: (donation: SponsorshipDonation) => void;
}

export const SponsorScholarshipModal: React.FC<SponsorScholarshipModalProps> = ({
  isOpen,
  onClose,
  students,
  onGrantScholarship
}) => {
  const [sponsorName, setSponsorName] = useState('');
  const [organization, setOrganization] = useState('');
  const [sponsorEmail, setSponsorEmail] = useState('');
  const [recipientStudentName, setRecipientStudentName] = useState(students[0]?.name || 'General Ministry Scholarship Fund');
  const [sponsorshipType, setSponsorshipType] = useState<'Full Tuition' | 'Partial Grant (50%)' | 'Custom Ministry Grant' | 'Emergency Aid'>('Partial Grant (50%)');
  const [amount, setAmount] = useState<number>(600);
  const [notes, setNotes] = useState('Dedicated toward ministerial leadership tuition.');

  const [completedDonation, setCompletedDonation] = useState<SponsorshipDonation | null>(null);

  const handleTypeChange = (type: typeof sponsorshipType) => {
    setSponsorshipType(type);
    if (type === 'Full Tuition') setAmount(1200);
    else if (type === 'Partial Grant (50%)') setAmount(600);
    else if (type === 'Emergency Aid') setAmount(300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorName.trim() || amount <= 0) return;

    const receiptNum = getNextSequenceNumber('receipt');
    const newDonation: SponsorshipDonation = {
      id: generateUUID(),
      sponsorName: sponsorName.trim(),
      organization: organization.trim() || 'Faith Partner Ministry',
      sponsorEmail: sponsorEmail.trim(),
      recipientStudentName,
      amount,
      date: new Date().toISOString().slice(0, 10),
      sponsorshipType,
      notes,
      receiptNumber: receiptNum,
      status: 'verified'
    };

    onGrantScholarship(newDonation);
    setCompletedDonation(newDonation);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sponsor a Student & Scholarship Endowment"
      subtitle="Connect kingdom sponsors, churches, and donors to ministerial candidates."
      icon={<Heart className="w-5 h-5 text-rose-500 shrink-0" />}
      size="md"
      isDraggable={true}
    >
      {completedDonation ? (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-5 bg-gradient-to-br from-emerald-50 via-white to-indigo-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-indigo-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-black uppercase rounded-full">
                Sponsorship Granted & Recorded
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white font-syne pt-1">
                Official Scholarship Receipt #{completedDonation.receiptNumber}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                A credit of <b>${completedDonation.amount}.00 USD</b> has been applied to {completedDonation.recipientStudentName}.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-xl text-left text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Sponsor / Partner:</span>
                <span className="font-bold text-slate-900 dark:text-white">{completedDonation.sponsorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Church / Organization:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{completedDonation.organization}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient Candidate:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{completedDonation.recipientStudentName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-1">
                <span className="text-slate-500">Scholarship Amount:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">${completedDonation.amount}.00 USD</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Receipt</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sponsor Name / Donor: *
              </label>
              <input
                type="text"
                required
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                placeholder="e.g. Deacon Robert Miller"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Church / Sponsoring Ministry:
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Grace Fellowship Church"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sponsor Email:
              </label>
              <input
                type="email"
                value={sponsorEmail}
                onChange={(e) => setSponsorEmail(e.target.value)}
                placeholder="sponsor@ministry.org"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Recipient Student: *
              </label>
              <select
                value={recipientStudentName}
                onChange={(e) => setRecipientStudentName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="General Ministry Scholarship Fund">★ General Ministry Scholarship Endowment</option>
                {students.map((s, sIdx) => (
                  <option key={`${s.name}-${sIdx}`} value={s.name}>
                    {s.name} (Current Balance: ${s.balance})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grant Type Selector */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Sponsorship Tier / Grant Level:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'Partial Grant (50%)', label: '50% Grant ($600)' },
                { type: 'Full Tuition', label: 'Full Tuition ($1,200)' },
                { type: 'Emergency Aid', label: 'Hardship Aid ($300)' },
                { type: 'Custom Ministry Grant', label: 'Custom Amount' }
              ].map(opt => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleTypeChange(opt.type as any)}
                  className={`py-2 px-2.5 rounded-xl font-extrabold text-[11px] border text-center transition-all cursor-pointer ${
                    sponsorshipType === opt.type
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Contribution Amount ($ USD): *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Dedication & Pastoral Notes:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sowed in prayer for candidate's future church plant."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Heart className="w-4 h-4 text-rose-300" />
              <span>Record Scholarship Contribution</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
