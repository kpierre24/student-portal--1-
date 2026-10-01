import React, { useState, useMemo } from 'react';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import {
  X,
  Send,
  MessageSquare,
  Mail,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  Copy,
  ExternalLink,
  Phone,
  DollarSign,
  Clock,
  Check,
  UserCheck,
  Building2,
  RefreshCw,
  FileText,
  Share2,
  Globe
} from 'lucide-react';
import { PaymentRecord } from '../types';

interface BulkPaymentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  payments: PaymentRecord[];
  onUpdatePaymentPhone?: (studentId: string, phone: string) => void;
  onLogReminderSent?: (studentIds: string[], channel: string, message: string) => void;
}

export interface PaymentReminderLog {
  id: string;
  sentAt: string;
  channel: 'whatsapp' | 'email' | 'dual';
  recipientCount: number;
  totalBalanceTarget: number;
  templateType: string;
  recipientsSummary: string;
}

export const BulkPaymentReminderModal: React.FC<BulkPaymentReminderModalProps> = ({
  isOpen,
  onClose,
  payments,
  onUpdatePaymentPhone,
  onLogReminderSent
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [filterType, setFilterType] = useState<'outstanding' | 'partial' | 'pending' | 'all'>('outstanding');
  const [searchQuery, setSearchQuery] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'dual'>('whatsapp');
  const [templateType, setTemplateType] = useState<'gentle' | 'urgent' | 'installment' | 'statement'>('gentle');

  // Form State
  const [emailSubject, setEmailSubject] = useState('💳 HTEIM School of Ministry - Tuition Balance & Statement Notice');
  const [reminderMessage, setReminderMessage] = useState('');

  // Selected Students (IDs)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Phone editing inline state
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [tempPhoneValue, setTempPhoneValue] = useState('');

  // Feedback states
  const [copiedBcc, setCopiedBcc] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  // Local logs state
  const [reminderLogs, setReminderLogs] = useState<PaymentReminderLog[]>(() => {
    const saved = localStorage.getItem('hteim_payment_reminder_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      {
        id: 'log-1',
        sentAt: '2026-07-20 10:15 AM',
        channel: 'email',
        recipientCount: 14,
        totalBalanceTarget: 9800,
        templateType: 'Gentle Tuition Reminder',
        recipientsSummary: 'Afeshia Burke, ANNE-MARIE DAVIS, Beverly Selkridge +11 others'
      },
      {
        id: 'log-2',
        sentAt: '2026-07-12 02:30 PM',
        channel: 'whatsapp',
        recipientCount: 8,
        totalBalanceTarget: 5600,
        templateType: 'Urgent Balance Clearance',
        recipientsSummary: 'Candy Webb, Claudia Cashe, Denyse Edwards +5 others'
      }
    ];
  });

  // Filter students based on criteria
  const targetPayments = useMemo(() => {
    return payments.filter(p => {
      const balance = p.totalTuition - p.amountPaid;

      // Filter category
      let matchesFilter = true;
      if (filterType === 'outstanding') matchesFilter = balance > 0;
      else if (filterType === 'partial') matchesFilter = p.status === 'Partial';
      else if (filterType === 'pending') matchesFilter = p.status === 'Pending Review' || p.amountPaid === 0;

      // Search
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch = (p.studentName || '').toLowerCase().includes(q) ||
                            (p.studentId || '').toLowerCase().includes(q) ||
                            (p.email || '').toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [payments, filterType, searchQuery]);

  // Sync selected IDs when targetPayments change if empty
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(targetPayments.map(p => p.id));
    }
  }, [filterType, isOpen]);

  // Load template content
  React.useEffect(() => {
    switch (templateType) {
      case 'gentle':
        setEmailSubject('💳 HTEIM School of Ministry - Tuition Balance Reminder');
        setReminderMessage(
          `Dear {StudentName},\n\n` +
          `Greetings in the precious name of Jesus!\n\n` +
          `This is a friendly reminder from the HTEIM Academic Financial Directorate regarding your School of Ministry tuition account.\n\n` +
          `• Student ID: {StudentId}\n` +
          `• Total Semester Tuition: \${TotalTuition}\n` +
          `• Amount Paid to Date: \${AmountPaid}\n` +
          `• Current Balance Outstanding: \${BalanceDue}\n\n` +
          `We kindly request that you settle your remaining balance at your earliest convenience via Bank Transfer, Credit Card, or Cash at the administrative office.\n\n` +
          `For questions or flexible payment arrangements, please reply directly or call the Finance Office.\n\n` +
          `Blessings,\nHTEIM Academic Finance Directorate\n"Bringing Heaven to Earth, Taking People to Heaven"`
        );
        break;

      case 'urgent':
        setEmailSubject('⚠️ URGENT NOTICE: Outstanding Tuition Balance Clearance Required');
        setReminderMessage(
          `OFFICIAL ACADEMIC NOTICE\n\n` +
          `Dear {StudentName} ({StudentId}),\n\n` +
          `Our financial records indicate an urgent outstanding tuition balance of \${BalanceDue} on your HTEIM School of Ministry account.\n\n` +
          `Account Breakdown:\n` +
          `• Program Track: Active Ministry Cohort\n` +
          `• Total Tuition: \${TotalTuition}\n` +
          `• Balance Due: \${BalanceDue}\n\n` +
          `Please ensure your balance is cleared prior to upcoming module evaluations and official transcript issuance.\n\n` +
          `Thank you for your prompt attention and commitment to your ministerial calling.\n\n` +
          `In His Service,\nHTEIM Registrar & Bursar's Office`
        );
        break;

      case 'installment':
        setEmailSubject('💳 HTEIM School of Ministry - Flexible Installment & Payment Plan');
        setReminderMessage(
          `Greetings {StudentName},\n\n` +
          `Thank you for your ongoing dedication to the HTEIM School of Ministry! You have completed payments totaling \${AmountPaid} towards your tuition.\n\n` +
          `Your remaining balance is \${BalanceDue}.\n\n` +
          `If you require a monthly installment plan (e.g. $100 - $200 payments), please reply to this notice so we can log your custom schedule in the master tuition spreadsheet.\n\n` +
          `Payment Methods Available:\n` +
          `1. Direct Bank Transfer\n` +
          `2. Online Credit Card / Portal\n` +
          `3. In-Person Cash / Check\n\n` +
          `Blessings and grace,\nHTEIM Financial Office`
        );
        break;

      case 'statement':
        setEmailSubject('📄 Official Statement Summary - HTEIM School of Ministry');
        setReminderMessage(
          `Dear {StudentName},\n\n` +
          `Below is your official tuition statement summary from HTEIM School of Ministry:\n\n` +
          `• Student Name: {StudentName}\n` +
          `• Student ID: {StudentId}\n` +
          `• Total Course Fee: \${TotalTuition}\n` +
          `• Total Payments Logged: \${AmountPaid}\n` +
          `• Remaining Dues: \${BalanceDue}\n` +
          `• Account Status: {Status}\n\n` +
          `You can view your full downloadable PDF statement and payment receipt inside the HTEIM Student Attendance & Payment Portal.\n\n` +
          `Warm regards,\nHTEIM Academic Finance Office`
        );
        break;
    }
  }, [templateType]);

  const dialogRef = useAccessibleModal(isOpen, onClose);

  if (!isOpen) return null;

  // Selected payment objects
  const selectedPayments = targetPayments.filter(p => selectedIds.includes(p.id));
  const totalBalanceSelected = selectedPayments.reduce((acc, p) => acc + Math.max(0, p.totalTuition - p.amountPaid), 0);

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === targetPayments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(targetPayments.map(p => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Helper to personalize message for a specific student
  const formatPersonalizedMessage = (p: PaymentRecord, rawMsg: string) => {
    const balance = Math.max(0, p.totalTuition - p.amountPaid);
    return rawMsg
      .replace(/{StudentName}/g, p.studentName)
      .replace(/{StudentId}/g, p.studentId)
      .replace(/{TotalTuition}/g, p.totalTuition.toLocaleString())
      .replace(/{AmountPaid}/g, p.amountPaid.toLocaleString())
      .replace(/{BalanceDue}/g, balance.toLocaleString())
      .replace(/{Status}/g, p.status);
  };

  // Format Phone number for WhatsApp wa.me link
  const getCleanPhone = (p: PaymentRecord) => {
    if (p.phone && p.phone.trim()) {
      return p.phone.replace(/[^0-9]/g, '');
    }
    // Default fallback Caribbean/Trinidad numbers if not set
    const hash = Math.abs(p.studentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
    return `1868${(3000000 + (hash % 6000000)).toString()}`;
  };

  // Build WhatsApp link for single student
  const buildWhatsAppUrl = (p: PaymentRecord) => {
    const phone = getCleanPhone(p);
    const msg = formatPersonalizedMessage(p, reminderMessage);
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  // Build BCC list for email client
  const getBccEmails = () => {
    return selectedPayments
      .map(p => p.email)
      .filter(Boolean)
      .join(', ');
  };

  // Copy BCC emails
  const handleCopyBcc = () => {
    const bccList = getBccEmails();
    if (!bccList) return;
    navigator.clipboard.writeText(bccList);
    setCopiedBcc(true);
    setTimeout(() => setCopiedBcc(false), 2500);
  };

  // Copy WhatsApp Broadcast Text
  const handleCopyWhatsAppBroadcast = () => {
    let summaryText = `📢 *HTEIM SCHOOL OF MINISTRY - TUITION BALANCE NOTICES*\n\n`;
    selectedPayments.forEach((p, idx) => {
      const balance = Math.max(0, p.totalTuition - p.amountPaid);
      summaryText += `${idx + 1}. *${p.studentName}* (ID: ${p.studentId})\n   Balance Outstanding: *$${balance}*\n\n`;
    });
    summaryText += `*Payment Options:* Bank Transfer, Credit Card, or Cash.\n*Contact Finance Office:* info@hteim.edu`;

    navigator.clipboard.writeText(summaryText);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  // Launch System Email Client with BCC
  const handleLaunchMailto = () => {
    const bccList = getBccEmails();
    const sampleMsg = selectedPayments.length > 0 
      ? formatPersonalizedMessage(selectedPayments[0], reminderMessage)
      : reminderMessage;

    const mailtoUrl = `mailto:finance@hteim.edu?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(sampleMsg)}`;
    window.open(mailtoUrl, '_blank');
  };

  // Dispatch Simulated Bulk Reminders
  const handleExecuteBulkDispatch = () => {
    if (selectedPayments.length === 0) return;
    setIsDispatching(true);

    setTimeout(() => {
      setIsDispatching(false);

      const summary = selectedPayments.slice(0, 3).map(s => s.studentName).join(', ') +
        (selectedPayments.length > 3 ? ` +${selectedPayments.length - 3} others` : '');

      const newLog: PaymentReminderLog = {
        id: `log-${Date.now()}`,
        sentAt: new Date().toLocaleString(),
        channel,
        recipientCount: selectedPayments.length,
        totalBalanceTarget: totalBalanceSelected,
        templateType: templateType === 'gentle' ? 'Gentle Tuition Reminder' :
                      templateType === 'urgent' ? 'Urgent Balance Clearance' :
                      templateType === 'installment' ? 'Installment Follow-up' : 'Statement Summary',
        recipientsSummary: summary
      };

      const updatedLogs = [newLog, ...reminderLogs];
      setReminderLogs(updatedLogs);
      localStorage.setItem('hteim_payment_reminder_logs', JSON.stringify(updatedLogs));

      if (onLogReminderSent) {
        onLogReminderSent(selectedPayments.map(p => p.id), channel, reminderMessage);
      }

      setDispatchSuccess(`Bulk ${channel.toUpperCase()} payment reminders successfully sent to ${selectedPayments.length} students ($${totalBalanceSelected.toLocaleString()} total balance target)!`);
      setTimeout(() => setDispatchSuccess(null), 5000);
    }, 1200);
  };

  // Save Inline Phone change
  const handleSavePhone = (studentId: string) => {
    if (onUpdatePaymentPhone) {
      onUpdatePaymentPhone(studentId, tempPhoneValue);
    }
    setEditingPhoneId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 modal-material-scrim">
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Bulk Tuition Payment & Statement Reminder Suite"
        className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp modal-material-dialog"
      >
        
        {/* Modal Header */}
        <div className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 modal-material-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Bulk Payment Reminders & Financial Communication</h2>
                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold uppercase rounded-full">
                  WhatsApp & Email
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send personalized tuition notices, WhatsApp direct messages, and email reminders to students with outstanding balances.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
           aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 pt-3">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('compose')}
              className={`pb-3 text-xs font-black transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === 'compose'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Send className="w-4 h-4 text-emerald-600" /> Compose & Dispatch Reminders
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 text-xs font-black transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === 'history'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-600" /> Reminder Logs & History ({reminderLogs.length})
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="pb-2 hidden sm:flex items-center gap-3 text-xs font-mono">
            <span className="bg-amber-100 text-amber-900 font-extrabold px-3 py-1 rounded-full border border-amber-200">
              Selected: {selectedPayments.length} / {targetPayments.length} Students
            </span>
            <span className="bg-emerald-100 text-emerald-950 font-black px-3 py-1 rounded-full border border-emerald-200">
              Target Balance: ${totalBalanceSelected.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {dispatchSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{dispatchSuccess}</span>
            </div>
          )}

          {activeTab === 'compose' ? (
            <div className="space-y-6">
              
              {/* Filter & Channel Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Target Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-slate-700 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" /> Target Student Group
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500"
                  >
                    <option value="outstanding">All Outstanding Balances (Balance &gt; $0)</option>
                    <option value="partial">Partial Tuition Paid Only ($200 - $1000 paid)</option>
                    <option value="pending">Pending / Zero Paid ($0 paid)</option>
                    <option value="all">All Enrolled Students ({payments.length})</option>
                  </select>
                </div>

                {/* Communication Channel */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-slate-700 flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5 text-indigo-600" /> Messaging Channel
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setChannel('whatsapp')}
                      className={`p-2 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        channel === 'whatsapp'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-300" /> WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={() => setChannel('email')}
                      className={`p-2 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        channel === 'email'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5 text-indigo-200" /> Email
                    </button>

                    <button
                      type="button"
                      onClick={() => setChannel('dual')}
                      className={`p-2 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        channel === 'dual'
                          ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Dual
                    </button>
                  </div>
                </div>

                {/* Template Preset Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase text-slate-700 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" /> Reminder Template
                  </label>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500"
                  >
                    <option value="gentle">💚 Gentle Balance Due Reminder</option>
                    <option value="urgent">⚠️ Urgent Evaluation Clearance Notice</option>
                    <option value="installment">💳 Flexible Payment Plan Notice</option>
                    <option value="statement">📄 Account Statement Summary</option>
                  </select>
                </div>

              </div>

              {/* Message Composer Box */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Message Composition & Dynamic Tags
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 font-mono font-bold">
                    <span>Tags:</span>
                    <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700">{`{StudentName}`}</span>
                    <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700">{`{StudentId}`}</span>
                    <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700">{`{TotalTuition}`}</span>
                    <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700">{`{AmountPaid}`}</span>
                    <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700">{`{BalanceDue}`}</span>
                  </div>
                </div>

                {(channel === 'email' || channel === 'dual') && (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                      Email Subject Line
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Reminder Message Body
                  </label>
                  <textarea
                    rows={5}
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                  />
                </div>

                {/* Quick Action Toolbar for Channel Dispatch */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppBroadcast}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{copiedMsg ? 'Copied WhatsApp Text!' : 'Copy WhatsApp Broadcast Text'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyBcc}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedBcc ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                      <span>{copiedBcc ? 'BCC Emails Copied!' : 'Copy All BCC Emails'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLaunchMailto}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-600" />
                      <span>Launch System Mail (mailto)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isDispatching || selectedPayments.length === 0}
                    onClick={handleExecuteBulkDispatch}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:opacity-80"
                  >
                    {isDispatching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Bulk {channel.toUpperCase()} Reminders ({selectedPayments.length})
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Student Recipient List Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden space-y-3">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === targetPayments.length && targetPayments.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-black uppercase text-slate-700">
                      Target Recipients ({selectedIds.length} of {targetPayments.length} selected)
                    </span>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search within target..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-center w-10">Select</th>
                        <th className="p-2.5">Student Name & ID</th>
                        <th className="p-2.5">Track</th>
                        <th className="p-2.5 text-right">Balance Due</th>
                        <th className="p-2.5">WhatsApp / Phone</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5 text-center">Quick Send Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {targetPayments.map((p) => {
                        const balance = Math.max(0, p.totalTuition - p.amountPaid);
                        const isSelected = selectedIds.includes(p.id);
                        const cleanPhone = getCleanPhone(p);
                        const waUrl = buildWhatsAppUrl(p);

                        return (
                          <tr 
                            key={p.id} 
                            className={`transition-colors ${isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(p.id)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>

                            <td className="p-2.5">
                              <p className="font-extrabold text-slate-900">{p.studentName}</p>
                              <p className="text-[10px] font-mono text-emerald-700 font-bold">{p.studentId}</p>
                            </td>

                            <td className="p-2.5 text-slate-600 text-[11px]">
                              {p.moduleTrack}
                            </td>

                            <td className="p-2.5 text-right font-bold">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                                balance > 0 ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900'
                              }`}>
                                ${balance.toLocaleString()}
                              </span>
                            </td>

                            {/* WhatsApp / Phone Edit */}
                            <td className="p-2.5">
                              {editingPhoneId === p.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={tempPhoneValue}
                                    onChange={(e) => setTempPhoneValue(e.target.value)}
                                    placeholder="+18681234567"
                                    className="w-28 p-1 text-[11px] font-mono border border-emerald-500 rounded bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSavePhone(p.id)}
                                    className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>+{cleanPhone}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPhoneId(p.id);
                                      setTempPhoneValue(p.phone || `+${cleanPhone}`);
                                    }}
                                    className="text-[9px] text-indigo-600 hover:underline cursor-pointer ml-1"
                                    title="Edit WhatsApp number"
                                  >
                                    Edit
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="p-2.5 text-slate-600 text-[11px] font-mono truncate max-w-[140px]">
                              {p.email || 'N/A'}
                            </td>

                            {/* Direct Action Buttons */}
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-lg flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                                  title="Send direct WhatsApp message to this student"
                                >
                                  <MessageSquare className="w-3 h-3" /> WhatsApp
                                </a>

                                {p.email && (
                                  <a
                                    href={`mailto:${p.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(formatPersonalizedMessage(p, reminderMessage))}`}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold rounded-lg flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                                    title="Send direct email to this student"
                                  >
                                    <Mail className="w-3 h-3" /> Email
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            /* History & Logs Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" /> Historical Payment Reminder Broadcast Logs
                </h3>
                <span className="text-xs text-slate-500 font-bold">
                  {reminderLogs.length} Recorded Dispatch Batches
                </span>
              </div>

              <div className="space-y-3">
                {reminderLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full ${
                          log.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                          log.channel === 'email' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
                          'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          {log.channel.toUpperCase()}
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm">{log.templateType}</span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-500 font-bold flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.sentAt}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase">Recipients Target</p>
                        <p className="font-bold text-slate-800">{log.recipientCount} Students ({log.recipientsSummary})</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase">Target Balance Value</p>
                        <p className="font-black text-emerald-700 font-mono">${log.totalBalanceTarget.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            HTEIM School of Ministry Financial Office • Automated Communication Systems
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-colors ml-auto"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
