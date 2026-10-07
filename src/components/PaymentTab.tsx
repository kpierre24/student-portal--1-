import { toast } from "sonner";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LogoImage } from './LogoImage';
import { logActivity } from '../lib/auditLogger';
import {
  CreditCard,
  DollarSign,
  Search,
  Filter,
  Plus,
  FileText,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Download,
  ExternalLink,
  Settings,
  Sparkles,
  RefreshCw,
  Printer,
  X,
  User,
  BookOpen,
  PieChart,
  ShieldAlert,
  ArrowUpRight,
  Paperclip,
  Trash2,
  Eye,
  UploadCloud,
  MessageSquare,
  Phone,
  Mail,
  Share2,
  Loader2,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ShieldCheck,
  Receipt as ReceiptIcon,
  LayoutGrid,
  List,
  Heart,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { PaymentRecord, Invoice, PaymentTransaction, Receipt, StudentInstallmentPlan, InstallmentMilestone, SponsorshipDonation } from '../types';
import { getInvoices, saveInvoices, getTransactions, saveTransactions, getReceipts, saveReceipts, bootstrapFromPaymentRecords, recordPaymentTransaction } from '../lib/financialWorkflow';
import { generateUUID, getNextSequenceNumber } from '../lib/idGenerator';
import { generateTuitionReceiptPDF, generateStudentAccountStatementPDF } from '../lib/pdfReceiptGenerator';
import { BulkPaymentReminderModal } from './BulkPaymentReminderModal';
import { InstallmentPlanModal } from './InstallmentPlanModal';
import { SponsorScholarshipModal } from './SponsorScholarshipModal';
import { StudentFinancialProfileView } from './finance/StudentFinancialProfileView';
import { FinancialReconciliationModal } from './finance/FinancialReconciliationModal';
import { FinancialAuditTrailModal } from './finance/FinancialAuditTrailModal';
import { FinancialReportsModal } from './finance/FinancialReportsModal';
import { PrintableReceiptModal } from './finance/PrintableReceiptModal';
import { RecordTransactionModal } from './finance/RecordTransactionModal';
import { FinancialAdjustmentModal } from './finance/FinancialAdjustmentModal';
import { GoogleSheetsTuitionModal } from './finance/GoogleSheetsTuitionModal';
import { fetchTuitionSpreadsheet, mergeTuitionRecords, persistTuitionRecords } from '../lib/tuitionSheets';
import { uploadToSupabaseStorage } from '../lib/supabaseClient';
import { EmptyState } from './UXPrimitives';
import { Modal } from './Modal';
import { usePortalRouter } from '../lib/usePortalRouter';
import { isDemoPayment } from '../data/guards';
import { MANUAL_ALIASES } from '../features/students/studentCanonicalization';

interface PaymentTabProps {
  availableStudents: { name: string; email?: string }[];
  isAdmin: boolean;
  currentStudentName?: string;
  userRole?: string;
  payments?: PaymentRecord[];
  setPayments?: React.Dispatch<React.SetStateAction<PaymentRecord[]>>;
  onDeleteStudent?: (studentName: string) => void;
  onRestoreStudent?: (studentName: string) => void;
  tuitionSheetUrl?: string;
  setTuitionSheetUrl?: (url: string) => void;
  lastTuitionSyncedTime?: string | null;
  isTuitionLoading?: boolean;
  tuitionSyncStats?: { totalStudents: number; totalBilled: number; totalPaid: number; totalBalance: number } | null;
  onSyncTuitionSheet?: (customUrl?: string) => Promise<any>;
  mainSheetUrl?: string;
  manualTuitionOnly?: boolean;
  setManualTuitionOnly?: (val: boolean) => void;
}

import { INITIAL_PAYMENTS } from '../data/initialPortalData';
export { INITIAL_PAYMENTS };

export const PaymentTab: React.FC<PaymentTabProps> = ({ 
  availableStudents, 
  isAdmin, 
  currentStudentName, 
  userRole = 'admin',
  payments: propPayments,
  setPayments: propSetPayments,
  onDeleteStudent,
  onRestoreStudent,
  tuitionSheetUrl,
  setTuitionSheetUrl,
  lastTuitionSyncedTime,
  isTuitionLoading = false,
  tuitionSyncStats,
  onSyncTuitionSheet,
  mainSheetUrl,
  manualTuitionOnly = true,
  setManualTuitionOnly,
}) => {
  const isStudent = userRole === 'student';

  const [showSheetSyncModal, setShowSheetSyncModal] = useState(false);
  const [isSyncingDirectly, setIsSyncingDirectly] = useState(false);

  // If not admin and not student, block view
  if (!isAdmin && !isStudent) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-2xl mx-auto my-12 shadow-sm space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Admin Privileges Required</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          The <strong>Student Tuition & Payment Analytics Dashboard</strong> is restricted exclusively to authorized HTEIM Administrators and Financial Officers.
        </p>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900">
          Please log in with an Administrator account to access financial ledgers, tuition status, and embedded analytics.
        </div>
      </div>
    );
  }

  // State Management
  const [localPayments, setLocalPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem('hteim_student_payments');
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        // Self-heal: If it contains old mock template data, reset to real student sheet data
        const hasOldMock = parsed.some((p: any) => p.id === 'pay-101' || p.studentName === 'Sister Maria Santos');
        if (hasOldMock) {
          localStorage.setItem('hteim_student_payments', JSON.stringify(INITIAL_PAYMENTS));
          return INITIAL_PAYMENTS;
        }

        // Self-heal: Merge/rename "Catherine Olivia Vidale-Lewis" to "Catherine Vidale"
        let modified = false;
        // General deduplication pass by canonical name and ID
        const seenNames = new Set<string>();
        const seenIds = new Set<string>();
        const cleaned: PaymentRecord[] = [];

        parsed.forEach((p: any) => {
          if (!p || !p.id) return;
          const rawName = (p?.studentName || '').toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
          const alias = MANUAL_ALIASES[rawName];
          const nameKey = (alias || p?.studentName || '').toLowerCase().trim();
          
          if (seenIds.has(p.id)) {
            modified = true;
            return;
          }
          if (nameKey && seenNames.has(nameKey)) {
            modified = true;
            return;
          }

          if (nameKey) seenNames.add(nameKey);
          seenIds.add(p.id);
          cleaned.push(p);
        });

        parsed = cleaned;

        if (modified) {
          localStorage.setItem('hteim_student_payments', JSON.stringify(parsed));
        }

        return parsed;
      } catch (e) {
        return INITIAL_PAYMENTS;
      }
    }
    return INITIAL_PAYMENTS;
  });

  const payments = propPayments !== undefined ? propPayments : localPayments;
  const setPayments = propSetPayments !== undefined ? propSetPayments : setLocalPayments;

  // New Core Financial States
  const [invoices, setInvoices] = useState<Invoice[]>(() => getInvoices(payments));
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => {
    const txs = getTransactions();
    if (txs.length === 0 && invoices.length > 0) {
      const boot = bootstrapFromPaymentRecords(payments);
      saveTransactions(boot.transactions);
      return boot.transactions;
    }
    return txs;
  });
  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    const recs = getReceipts();
    if (recs.length === 0 && invoices.length > 0) {
      const boot = bootstrapFromPaymentRecords(payments);
      saveReceipts(boot.receipts);
      return boot.receipts;
    }
    return recs;
  });

  // Synchronize changes back to payments so that the rest of the application remains synchronized
  const syncToPayments = (currentInvoices: Invoice[], currentTransactions: PaymentTransaction[]) => {
    const updatedPayments = payments.map((p) => {
      const invoice = currentInvoices.find((inv) => inv.studentName === p.studentName || inv.studentId === p.studentId);
      if (invoice) {
        const studentTxs = currentTransactions.filter((t) => t.studentName === p.studentName);
        const lastTx = studentTxs.length > 0 ? studentTxs[studentTxs.length - 1] : null;

        return {
          ...p,
          totalTuition: invoice.totalTuition,
          amountPaid: invoice.amountPaid,
          status: (invoice.status === 'Paid' ? 'Paid In Full' : 
                  invoice.status === 'Partially Paid' ? 'Partial' : 
                  invoice.status === 'Past Due' ? 'Past Due' : 'Pending Review') as PaymentRecord['status'],
          lastPaymentDate: lastTx ? lastTx.paymentDate : p.lastPaymentDate,
          paymentMethod: (lastTx ? lastTx.paymentMethod : p.paymentMethod) as PaymentRecord['paymentMethod'],
          paymentPlan: invoice.paymentPlan as any,
          notes: invoice.notes
        };
      }
      return p;
    });
    setPayments(updatedPayments);
  };

  // State synchronization when parents update payments
  useEffect(() => {
    if (propPayments && propPayments.length > 0) {
      // Re-initialize or sync
      const currentInvs = getInvoices(propPayments);
      setInvoices(currentInvs);
      const currentTxs = getTransactions();
      setTransactions(currentTxs.length > 0 ? currentTxs : bootstrapFromPaymentRecords(propPayments).transactions);
      const currentRecs = getReceipts();
      setReceipts(currentRecs.length > 0 ? currentRecs : bootstrapFromPaymentRecords(propPayments).receipts);
    }
  }, [propPayments]);

  // Modals for Invoices and Payments
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<Invoice | null>(null);

  const [showRecordCustomPaymentModal, setShowRecordCustomPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  // Installment Plans & Sponsorship states
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [showScholarshipModal, setShowScholarshipModal] = useState(false);
  const [installmentPlans, setInstallmentPlans] = useState<StudentInstallmentPlan[]>(() => {
    try {
      const saved = localStorage.getItem('hteim_installment_plans');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [sponsorshipDonations, setSponsorshipDonations] = useState<SponsorshipDonation[]>(() => {
    try {
      const saved = localStorage.getItem('hteim_sponsorship_donations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleTriggerTuitionSync = async (targetUrl?: string) => {
    const urlToUse = targetUrl || tuitionSheetUrl || mainSheetUrl || localStorage.getItem('sheetUrl') || '';
    if (!urlToUse) {
      toast.error('Please configure a Google Sheets URL first.');
      setShowSheetSyncModal(true);
      return;
    }

    setIsSyncingDirectly(true);
    try {
      if (onSyncTuitionSheet) {
        const res = await onSyncTuitionSheet(urlToUse);
        if (res) {
          toast.success(`Successfully pulled ${res.totalStudents || res.records?.length || 0} student tuition accounts from Google Sheets.`);
          logActivity({
            action: 'RECORD_PAYMENT',
            actionCategory: 'Payment Entry',
            actionTitle: 'Google Sheets Tuition Sync',
            details: `Pulled ${res.totalStudents || 0} student records ($${(res.totalTuitionBilled || 0).toLocaleString()} billed, $${(res.totalAmountCollected || 0).toLocaleString()} collected) from Google Sheet`,
          });
        }
      } else {
        const result = await fetchTuitionSpreadsheet(urlToUse, null, payments);
        const merged = mergeTuitionRecords(payments, result.records, 'manual');
        setPayments(merged);
        persistTuitionRecords(merged);
        const boot = bootstrapFromPaymentRecords(merged);
        setInvoices(boot.invoices);
        if (boot.transactions.length > 0) setTransactions(boot.transactions);
        if (boot.receipts.length > 0) setReceipts(boot.receipts);
        toast.success(`Successfully pulled ${result.totalStudents} student tuition accounts from Google Sheets.`);
        logActivity({
          action: 'RECORD_PAYMENT',
          actionCategory: 'Payment Entry',
          actionTitle: 'Google Sheets Tuition Sync',
          details: `Pulled ${result.totalStudents} student records from Google Sheet (${result.sheetTitle})`,
        });
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to pull tuition data from Google Sheets.';
      toast.error(msg);
    } finally {
      setIsSyncingDirectly(false);
    }
  };

  const handleSaveInstallmentPlan = (plan: StudentInstallmentPlan) => {
    const updated = [...installmentPlans.filter(p => p.id !== plan.id && p.studentName !== plan.studentName), plan];
    setInstallmentPlans(updated);
    localStorage.setItem('hteim_installment_plans', JSON.stringify(updated));
  };

  const handleRecordMilestonePayment = (studentName: string, milestone: InstallmentMilestone) => {
    // 1. Update the milestone as paid in installment plans
    const updatedPlans = installmentPlans.map(plan => {
      if (plan.studentName === studentName) {
        const updatedMilestones = plan.milestones.map(m => {
          if (m.id === milestone.id) {
            return {
              ...m,
              isPaid: true,
              paidDate: new Date().toISOString().slice(0, 10),
              receiptNumber: getNextSequenceNumber('receipt')
            };
          }
          return m;
        });
        const allPaid = updatedMilestones.every(m => m.isPaid);
        return {
          ...plan,
          status: allPaid ? ('completed' as const) : ('active' as const),
          milestones: updatedMilestones,
          remainingBalance: Math.max(0, plan.remainingBalance - milestone.amount)
        };
      }
      return plan;
    });
    setInstallmentPlans(updatedPlans);
    localStorage.setItem('hteim_installment_plans', JSON.stringify(updatedPlans));

    // 2. Update student payment ledger
    setPayments(prev => prev.map(p => {
      if (p.studentName.toLowerCase().trim() === studentName.toLowerCase().trim()) {
        const newPaid = Number(p.amountPaid) + milestone.amount;
        const total = p.totalTuition || 1200;
        const newStatus = newPaid >= total ? 'Paid In Full' : 'Partial';
        return {
          ...p,
          amountPaid: newPaid,
          status: newStatus,
          lastPaymentDate: new Date().toISOString().slice(0, 10),
          notes: `${p.notes ? p.notes + ' ' : ''}[Installment Milestone ${milestone.milestoneNumber} Paid: $${milestone.amount} on ${new Date().toLocaleDateString()}]`
        };
      }
      return p;
    }));
  };

  const handleGrantScholarship = (donation: SponsorshipDonation) => {
    const updatedDonations = [donation, ...sponsorshipDonations];
    setSponsorshipDonations(updatedDonations);
    localStorage.setItem('hteim_sponsorship_donations', JSON.stringify(updatedDonations));

    if (donation.recipientStudentName !== 'General Ministry Scholarship Fund') {
      setPayments(prev => prev.map(p => {
        if (p.studentName.toLowerCase().trim() === donation.recipientStudentName.toLowerCase().trim()) {
          const newPaid = Number(p.amountPaid) + donation.amount;
          const total = p.totalTuition || 1200;
          const newStatus = newPaid >= total ? 'Paid In Full' : 'Partial';
          return {
            ...p,
            amountPaid: newPaid,
            status: newStatus,
            paymentMethod: 'Scholarship',
            lastPaymentDate: donation.date,
            notes: `${p.notes ? p.notes + ' ' : ''}[Scholarship Sponsored by ${donation.sponsorName} (${donation.organization || 'Church Partner'}): $${donation.amount} on ${donation.date}. Receipt #${donation.receiptNumber}]`
          };
        }
        return p;
      }));
    }
  };

  const studentsForInstallment = useMemo(() => {
    return payments.map(p => ({
      name: p.studentName,
      id: p.studentId || p.id,
      balance: Math.max(0, (p.totalTuition || 1200) - Number(p.amountPaid)),
      totalTuition: p.totalTuition || 1200,
      amountPaid: Number(p.amountPaid)
    }));
  }, [payments]);

  // Invoice form fields
  const [editInvoiceTuition, setEditInvoiceTuition] = useState<number>(1200);
  const [editInvoiceAmountPaid, setEditInvoiceAmountPaid] = useState<number>(0);
  const [editInvoiceDiscounts, setEditInvoiceDiscounts] = useState<number>(0);
  const [editInvoiceScholarships, setEditInvoiceScholarships] = useState<number>(0);
  const [editInvoicePlan, setEditInvoicePlan] = useState<string>('Monthly Installments');
  const [editInvoiceStatus, setEditInvoiceStatus] = useState<Invoice['status']>('Unpaid');
  const [editInvoiceNotes, setEditInvoiceNotes] = useState<string>('');

  // Record Custom Payment form fields
  const [recordPaymentAmount, setRecordPaymentAmount] = useState<number | string>('');
  const [recordPaymentMethod, setRecordPaymentMethod] = useState<string>('Bank Transfer');
  const [recordPaymentDate, setRecordPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [recordPaymentNotes, setRecordPaymentNotes] = useState<string>('');

  // 1-Click Quick Mark Student Paid in Full
  const handleQuickMarkPaidInFull = (inv: Invoice) => {
    const net = inv.netTuition !== undefined ? inv.netTuition : (inv.totalTuition || 1200);
    const remaining = Math.max(0, net - (inv.amountPaid || 0));
    const payAmount = remaining > 0 ? remaining : net;

    const { transaction: newTx, receipt: newReceipt, updatedInvoice } = recordPaymentTransaction({
      invoiceId: inv.id,
      amount: payAmount,
      paymentMethod: 'Bank Transfer',
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: 'Tuition paid in full. Cleared by administrator.',
      recordedBy: userRole === 'admin' ? 'Administrator' : currentStudentName || 'Staff User',
    });

    const finalInvoice: Invoice = {
      ...updatedInvoice,
      amountPaid: net,
      outstandingBalance: 0,
      status: 'Paid',
    };

    const updatedTxs = [newTx, ...transactions.filter(t => t.id !== newTx.id)];
    setTransactions(updatedTxs);
    saveTransactions(updatedTxs);

    const updatedReceipts = [newReceipt, ...receipts.filter(r => r.id !== newReceipt.id)];
    setReceipts(updatedReceipts);
    saveReceipts(updatedReceipts);

    const updatedInvoices = invoices.map(i => i.id === inv.id ? finalInvoice : i);
    setInvoices(updatedInvoices);
    saveInvoices(updatedInvoices);

    syncToPayments(updatedInvoices, updatedTxs);

    logActivity({
      actor: userRole === 'admin' ? 'Administrator' : currentStudentName || 'Staff User',
      role: 'admin',
      actionCategory: 'Payment Entry',
      actionTitle: 'Student Marked Paid In Full',
      details: `Marked student "${inv.studentName}" as Paid In Full ($${net} cleared).`,
      targetStudent: inv.studentName
    });
  };

  // Edit Invoice submit handler
  const handleEditInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForEdit) return;

    const netTuition = Math.max(0, editInvoiceTuition - editInvoiceDiscounts - editInvoiceScholarships);
    let finalAmountPaid = Number(editInvoiceAmountPaid);
    if (isNaN(finalAmountPaid) || finalAmountPaid < 0) {
      finalAmountPaid = selectedInvoiceForEdit.amountPaid || 0;
    }

    if (editInvoiceStatus === 'Paid' && finalAmountPaid < netTuition) {
      finalAmountPaid = netTuition;
    }

    const outstandingBalance = Math.max(0, netTuition - finalAmountPaid);
    
    let calculatedStatus: Invoice['status'] = editInvoiceStatus;
    if (outstandingBalance <= 0 || finalAmountPaid >= netTuition) {
      calculatedStatus = 'Paid';
    } else if (finalAmountPaid > 0) {
      calculatedStatus = 'Partially Paid';
    } else {
      calculatedStatus = 'Unpaid';
    }

    // If new amount paid exceeds previous amount paid, record transaction & receipt
    let updatedTxs = [...transactions];
    let updatedReceipts = [...receipts];
    const diff = finalAmountPaid - (selectedInvoiceForEdit.amountPaid || 0);
    if (diff > 0) {
      const { transaction: newTx, receipt: newReceipt } = recordPaymentTransaction({
        invoiceId: selectedInvoiceForEdit.id,
        amount: diff,
        paymentMethod: 'Bank Transfer',
        paymentDate: new Date().toISOString().slice(0, 10),
        notes: `Ledger payment adjustment: Paid amount updated to $${finalAmountPaid}`,
        recordedBy: userRole === 'admin' ? 'Administrator' : currentStudentName || 'Staff User',
      });
      updatedTxs = [newTx, ...transactions.filter(t => t.id !== newTx.id)];
      updatedReceipts = [newReceipt, ...receipts.filter(r => r.id !== newReceipt.id)];
      setTransactions(updatedTxs);
      saveTransactions(updatedTxs);
      setReceipts(updatedReceipts);
      saveReceipts(updatedReceipts);
    }

    const updatedInvoices = invoices.map(inv => {
      if (inv.id === selectedInvoiceForEdit.id) {
        return {
          ...inv,
          totalTuition: editInvoiceTuition,
          discounts: editInvoiceDiscounts,
          scholarships: editInvoiceScholarships,
          netTuition,
          amountPaid: finalAmountPaid,
          outstandingBalance,
          paymentPlan: editInvoicePlan,
          status: calculatedStatus,
          notes: editInvoiceNotes
        };
      }
      return inv;
    });

    setInvoices(updatedInvoices);
    saveInvoices(updatedInvoices);
    syncToPayments(updatedInvoices, updatedTxs);
    setShowEditInvoiceModal(false);

    logActivity({
      actor: userRole === 'admin' ? 'Administrator' : currentStudentName || 'Staff User',
      role: 'admin',
      actionCategory: 'Payment Entry',
      actionTitle: 'Invoice Modified',
      details: `Modified invoice ${selectedInvoiceForEdit.id} for "${selectedInvoiceForEdit.studentName}". Tuition: $${editInvoiceTuition}, Paid: $${finalAmountPaid}, Balance: $${outstandingBalance}, Status: ${calculatedStatus}`,
      targetStudent: selectedInvoiceForEdit.studentName
    });
  };

  // Record Payment submit handler
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;

    const paymentAmount = Number(recordPaymentAmount);
    if (paymentAmount <= 0) return;

    const { transaction: newTx, receipt: newReceipt, updatedInvoice } = recordPaymentTransaction({
      invoiceId: selectedInvoiceForPayment.id,
      amount: paymentAmount,
      paymentMethod: recordPaymentMethod,
      paymentDate: recordPaymentDate,
      notes: recordPaymentNotes || 'Tuition payment/deposit',
      recordedBy: userRole === 'admin' ? 'Administrator' : currentStudentName || 'Staff User',
    });

    const updatedTxs = [newTx, ...transactions.filter(t => t.id !== newTx.id)];
    setTransactions(updatedTxs);
    saveTransactions(updatedTxs);

    const updatedReceipts = [newReceipt, ...receipts.filter(r => r.id !== newReceipt.id)];
    setReceipts(updatedReceipts);
    saveReceipts(updatedReceipts);

    const updatedInvoices = invoices.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv);
    setInvoices(updatedInvoices);
    saveInvoices(updatedInvoices);
    syncToPayments(updatedInvoices, updatedTxs);
    setShowRecordCustomPaymentModal(false);

    logActivity({
      actor: userRole === 'admin' ? 'Administrator' : currentStudentName || 'Staff User',
      role: 'admin',
      actionCategory: 'Payment Entry',
      actionTitle: 'Payment Recorded',
      details: `Recorded payment of $${paymentAmount} via ${recordPaymentMethod} for student "${selectedInvoiceForPayment.studentName}". Outstanding balance: $${updatedInvoice.outstandingBalance}`,
      targetStudent: selectedInvoiceForPayment.studentName
    });
  };

  const { route, navigate } = usePortalRouter('payments');

  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'payments' | 'receipts' | 'analytics' | 'ledger'>('invoices');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<string | null>(null);
  const [showReconciliationModal, setShowReconciliationModal] = useState<boolean>(false);
  const [showAuditTrailModal, setShowAuditTrailModal] = useState<boolean>(false);
  const [showReportsModal, setShowReportsModal] = useState<boolean>(false);
  const [printableReceiptData, setPrintableReceiptData] = useState<{ receipt: Receipt; invoice?: Invoice; studentEmail?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid In Full' | 'Partial' | 'Past Due' | 'Pending Review'>('All');
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');
  
  // Sorting State
  type PaymentSortField = 'studentName' | 'studentId' | 'moduleTrack' | 'totalTuition' | 'amountPaid' | 'balance' | 'status' | 'lastPaymentDate';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<PaymentSortField>('studentName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: PaymentSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Modals / Panels
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [selectedPaymentForModal, setSelectedPaymentForModal] = useState<PaymentRecord | null>(null);

  // Sync URL parameters with workspace panel state
  useEffect(() => {
    if (route.action === 'record-payment' || route.action === 'record') {
      if (route.id) {
        const match = payments.find(p => p.id === route.id || p.studentId === route.id);
        if (match) {
          setSelectedPaymentForModal(match);
          setPaymentAmountInput(Math.min(300, match.totalTuition - match.amountPaid));
          setPaymentMethodInput('Credit Card');
          setPaymentNotesInput('');
          setReceiptFileUrl(match.receiptUrl || '');
          setReceiptFileName(match.receiptName || '');
          setShowRecordPaymentModal(true);
        }
      }
    } else if (route.action === 'receipt' || route.action === 'statement') {
      if (route.id) {
        const match = payments.find(p => p.id === route.id || p.studentId === route.id);
        if (match) {
          setReceiptRecord(match);
        }
      }
    } else if (route.action === 'add-student' || route.action === 'new-agreement') {
      setShowAddStudentModal(true);
    } else if (route.action === 'bulk-reminder') {
      setShowBulkReminderModal(true);
    } else if (route.action === 'archive') {
      setShowRemovedArchiveModal(true);
    } else if (route.action === 'remove-student' || route.action === 'remove') {
      if (route.id) {
        const match = payments.find(p => p.id === route.id || p.studentId === route.id);
        if (match) {
          setStudentToRemove(match);
          setRemoveVerificationInput('');
          setRemoveError('');
          setShowRemoveVerificationModal(true);
        }
      }
    }
  }, [route.action, route.id]);
  
  // Payment Form State
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(300);
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentRecord['paymentMethod']>('Credit Card');
  const [paymentNotesInput, setPaymentNotesInput] = useState('');
  const [receiptFileUrl, setReceiptFileUrl] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Receipt Modal State
  const [receiptRecord, setReceiptRecord] = useState<PaymentRecord | null>(null);
  const [showReconciliationReport, setShowReconciliationReport] = useState(true);

  // New Student Tuition Agreement Modal
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newTrack, setNewTrack] = useState('Pastoral & General Ministry');
  const [newTotalTuition, setNewTotalTuition] = useState(1200);
  const [newInitialPayment, setNewInitialPayment] = useState(0);

  // Bulk Payment Reminder Modal State
  const [showBulkReminderModal, setShowBulkReminderModal] = useState(false);

  // Student Removal Verification Modal State
  const [studentToRemove, setStudentToRemove] = useState<PaymentRecord | null>(null);
  const [showRemoveVerificationModal, setShowRemoveVerificationModal] = useState(false);
  const [removeVerificationInput, setRemoveVerificationInput] = useState('');
  const [removalReason, setRemovalReason] = useState('No longer a student / Withdrawn');
  const [customRemovalReason, setCustomRemovalReason] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [showRemovedArchiveModal, setShowRemovedArchiveModal] = useState(false);

  // Archive of Removed / Excluded Student Records
  const [removedStudentRecords, setRemovedStudentRecords] = useState<{
    record: PaymentRecord;
    removedAt: string;
    reason: string;
    removedBy: string;
  }[]>(() => {
    const saved = localStorage.getItem('hteim_removed_payment_students');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Sync removed students with localStorage
  useEffect(() => {
    localStorage.setItem('hteim_removed_payment_students', JSON.stringify(removedStudentRecords));
  }, [removedStudentRecords]);

  const handleUpdatePaymentPhone = (studentId: string, phone: string) => {
    setPayments(prev => prev.map(p => {
      if (p.id === studentId || p.studentId === studentId) {
        return { ...p, phone };
      }
      return p;
    }));
  };

  const handleInitiateRemoveStudent = (p: PaymentRecord) => {
    setStudentToRemove(p);
    setRemoveVerificationInput('');
    setRemovalReason('No longer a student / Withdrawn');
    setCustomRemovalReason('');
    setRemoveError('');
    setShowRemoveVerificationModal(true);
    navigate({ action: 'remove-student', id: p.id });
  };

  const handleConfirmRemoveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToRemove) return;

    const cleanInput = removeVerificationInput.replace(/\u00A0/g, ' ').trim().toUpperCase().replace(/\s+/g, ' ');
    const cleanName = studentToRemove.studentName.replace(/\u00A0/g, ' ').trim().toUpperCase().replace(/\s+/g, ' ');
    const isVerified = cleanInput === 'REMOVE' || cleanInput === cleanName || cleanInput === 'CONFIRM' || cleanInput.length > 0;

    if (!isVerified) {
      setRemoveError(`Verification text does not match. Please type REMOVE or "${studentToRemove.studentName}".`);
      return;
    }

    const finalReason = removalReason === 'Other' ? (customRemovalReason.trim() || 'Administrative removal') : removalReason;
    const actorName = userRole === 'admin' ? 'Administrator' : currentStudentName || 'Staff User';

    const removedEntry = {
      record: studentToRemove,
      removedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      reason: finalReason,
      removedBy: actorName
    };

    setRemovedStudentRecords(prev => [removedEntry, ...prev]);
    setPayments(prev => prev.filter(p => p.id !== studentToRemove.id));

    // Synchronize removal across the app (attendance records, student directory, etc.)
    if (onDeleteStudent) {
      onDeleteStudent(studentToRemove.studentName);
    }

    logActivity({
      actor: actorName,
      role: 'admin',
      actionCategory: 'Payment Entry',
      actionTitle: 'Student & Fees Removed',
      details: `Removed student "${studentToRemove.studentName}" (${studentToRemove.studentId}) and purged tuition schedule of ${studentToRemove.totalTuition} (${studentToRemove.amountPaid} paid, ${studentToRemove.totalTuition - studentToRemove.amountPaid} balance). Reason: ${finalReason}.`,
      targetStudent: studentToRemove.studentName
    });

    setShowRemoveVerificationModal(false);
    setStudentToRemove(null);
    setRemoveVerificationInput('');
    setRemoveError('');
    navigate({ action: undefined, id: undefined });
  };

  const handleRestoreRemovedStudent = (entryToRestore: { record: PaymentRecord; removedAt: string; reason: string; removedBy: string }) => {
    setPayments(prev => [entryToRestore.record, ...prev]);
    setRemovedStudentRecords(prev => prev.filter(r => r.record.id !== entryToRestore.record.id));

    if (onRestoreStudent) {
      onRestoreStudent(entryToRestore.record.studentName);
    }

    logActivity({
      actor: userRole === 'admin' ? 'Administrator' : currentStudentName || 'Staff User',
      role: 'admin',
      actionCategory: 'Payment Entry',
      actionTitle: 'Student Restored to Payment Schedule',
      details: `Restored student "${entryToRestore.record.studentName}" (${entryToRestore.record.studentId}) back to tuition ledger.`,
      targetStudent: entryToRestore.record.studentName
    });
  };

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('hteim_student_payments', JSON.stringify(payments));
  }, [payments]);

  // Ensure any newly added unique students are included in payments ledger (ignoring removed/archived students)
  useEffect(() => {
    if (availableStudents && availableStudents.length > 0) {
      setPayments(prev => {
        const newRecords: PaymentRecord[] = [];

        availableStudents.forEach((st, idx) => {
          if (!st || !st.name) return;
          const canonical = (s: string) => (s || '').replace(/\u00A0/g, ' ').toLowerCase().trim().replace(/\s+/g, ' ');
          const nameClean = canonical(st.name);

          // Check if student was explicitly removed/archived by admin
          const isArchived = removedStudentRecords.some(r => canonical(r.record?.studentName) === nameClean);
          if (isArchived) return;

          // Check if student already exists in ledger
          const alreadyExists = prev.some(p => canonical(p?.studentName) === nameClean);

          if (st.name && !alreadyExists) {
            newRecords.push({
              id: generateUUID(),
              studentName: st.name,
              studentId: `HTEIM-2026-${Math.abs(st.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)).toString().substring(0, 4)}`,
              email: st.email || `${(st.name || '').toLowerCase().replace(/\s+/g, '.')}@hteim.edu`,
              moduleTrack: 'Active Ministry Module',
              totalTuition: 1200,
              amountPaid: 0,
              status: 'Pending Review',
              lastPaymentDate: 'N/A',
              paymentMethod: 'Bank Transfer',
              notes: 'Enrolled student. Permanent payment ledger record.'
            });
          }
        });

        return newRecords.length > 0 ? [...prev, ...newRecords] : prev;
      });
    }
  }, [availableStudents, removedStudentRecords]);

  // Financial Statistics (Calculated across Authoritative Invoices Ledger, Transactions, and Payments)
  const stats = useMemo(() => {
    let totalTuition = 0;
    let totalCollected = 0;
    let paidInFullCount = 0;
    let pastDueCount = 0;
    let partialCount = 0;
    let totalStudents = 0;

    if (invoices && invoices.length > 0) {
      totalStudents = invoices.length;
      totalTuition = invoices.reduce((acc, inv) => acc + (Number(inv.netTuition !== undefined ? inv.netTuition : inv.totalTuition) || 0), 0);
      totalCollected = invoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
      paidInFullCount = invoices.filter(inv => inv.status === 'Paid' || (Number(inv.amountPaid) >= Number(inv.netTuition !== undefined ? inv.netTuition : inv.totalTuition) && Number(inv.totalTuition) > 0)).length;
      pastDueCount = invoices.filter(inv => inv.status === 'Past Due').length;
      partialCount = invoices.filter(inv => inv.status === 'Partially Paid').length;
    } else {
      const validPayments = payments.filter(p => !p.isDemo && !isDemoPayment(p));
      totalStudents = validPayments.length;
      totalTuition = validPayments.reduce((acc, p) => acc + (Number(p.totalTuition) || 0), 0);
      totalCollected = validPayments.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
      paidInFullCount = validPayments.filter(p => p.status === 'Paid In Full' || (Number(p.amountPaid) >= Number(p.totalTuition) && Number(p.totalTuition) > 0)).length;
      pastDueCount = validPayments.filter(p => p.status === 'Past Due').length;
      partialCount = validPayments.filter(p => p.status === 'Partial').length;
    }

    const txTotal = transactions.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
    if (txTotal > totalCollected) {
      totalCollected = txTotal;
    }

    const totalOutstanding = Math.max(0, totalTuition - totalCollected);
    const collectionRate = totalTuition > 0 ? Math.round((totalCollected / totalTuition) * 100) : 0;

    return {
      totalTuition,
      totalCollected,
      totalOutstanding,
      paidInFullCount,
      pastDueCount,
      partialCount,
      collectionRate,
      totalStudents: totalStudents || 49
    };
  }, [invoices, transactions, payments]);

  // Filtered and Sorted Invoices, Transactions, and Receipts
  const filteredInvoices = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return invoices.filter(inv => {
      const matchesSearch = (inv.studentName || '').toLowerCase().includes(q) ||
                            (inv.studentId || '').toLowerCase().includes(q) ||
                            (inv.moduleTrack || '').toLowerCase().includes(q) ||
                            (inv.id || '').toLowerCase().includes(q);
      
      let matchesStatus = true;
      if (statusFilter === 'Paid In Full') {
        matchesStatus = inv.status === 'Paid';
      } else if (statusFilter === 'Partial') {
        matchesStatus = inv.status === 'Partially Paid';
      } else if (statusFilter === 'Past Due') {
        matchesStatus = inv.status === 'Past Due';
      } else if (statusFilter === 'Pending Review') {
        matchesStatus = inv.status === 'Unpaid';
      }
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const filteredTransactions = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return transactions.filter(tx => {
      return (tx.studentName || '').toLowerCase().includes(q) ||
             (tx.studentId || '').toLowerCase().includes(q) ||
             (tx.paymentMethod || '').toLowerCase().includes(q) ||
             (tx.id || '').toLowerCase().includes(q);
    });
  }, [transactions, searchQuery]);

  const filteredReceipts = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return receipts.filter(rec => {
      return (rec.studentName || '').toLowerCase().includes(q) ||
             (rec.studentId || '').toLowerCase().includes(q) ||
             (rec.receiptNumber || '').toLowerCase().includes(q) ||
             (rec.paymentMethod || '').toLowerCase().includes(q);
    });
  }, [receipts, searchQuery]);

  const viewInvoiceAsReceipt = (invoice: Invoice) => {
    const rec: PaymentRecord = {
      id: invoice.id.replace('INV-', 'pay-'),
      studentName: invoice.studentName,
      studentId: invoice.studentId,
      email: invoice.email,
      phone: invoice.phone,
      moduleTrack: invoice.moduleTrack,
      totalTuition: invoice.totalTuition,
      amountPaid: invoice.amountPaid,
      status: (invoice.status === 'Paid' ? 'Paid In Full' : 'Partial') as any,
      lastPaymentDate: new Date().toLocaleDateString(),
      paymentMethod: 'Bank Transfer',
      notes: invoice.notes,
      paymentPlan: invoice.paymentPlan as any
    };
    setReceiptRecord(rec);
    navigate({ action: 'receipt', id: invoice.id });
  };

  // Filtered and Sorted Payments
  const filteredPayments = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    const filtered = payments.filter(p => {
      const matchesSearch = (p.studentName || '').toLowerCase().includes(q) ||
                            (p.studentId || '').toLowerCase().includes(q) ||
                            (p.moduleTrack || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'studentName') {
        cmp = (a.studentName || '').trim().localeCompare((b.studentName || '').trim(), undefined, { sensitivity: 'base', numeric: true });
      } else if (sortField === 'studentId') {
        cmp = (a.studentId || '').localeCompare(b.studentId || '');
      } else if (sortField === 'moduleTrack') {
        cmp = (a.moduleTrack || '').localeCompare(b.moduleTrack || '');
      } else if (sortField === 'totalTuition') {
        cmp = a.totalTuition - b.totalTuition;
      } else if (sortField === 'amountPaid') {
        cmp = a.amountPaid - b.amountPaid;
      } else if (sortField === 'balance') {
        const balA = a.totalTuition - a.amountPaid;
        const balB = b.totalTuition - b.amountPaid;
        cmp = balA - balB;
      } else if (sortField === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      } else if (sortField === 'lastPaymentDate') {
        cmp = (a.lastPaymentDate || '').localeCompare(b.lastPaymentDate || '');
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [payments, searchQuery, statusFilter, sortField, sortDirection]);

  // Reconciliation Analysis between Attendance form and Tuition Google Sheet
  const reconciliationReport = useMemo(() => {
    const attendanceNames = availableStudents.map(s => s.name);
    const ledgerNames = payments.map(p => p.studentName);

    const normalizeName = (name: string) => {
      if (!name) return '';
      return (name || '').toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '')
        .trim();
    };

    const normalizedAttendance = attendanceNames.map(name => ({
      original: name,
      norm: normalizeName(name)
    }));

    const normalizedLedger = ledgerNames.map(name => ({
      original: name,
      norm: normalizeName(name)
    }));

    // Find students in attendance (Form responses) who are missing in the tuition ledger
    const missingInLedger = normalizedAttendance.filter(att => {
      if (!att.norm) return false;
      return !normalizedLedger.some(led => {
        return led.norm.includes(att.norm) || att.norm.includes(led.norm);
      });
    }).map(x => x.original);

    // Find students in ledger (Tuition sheet) who are missing in the attendance list (Form responses)
    const missingInAttendance = normalizedLedger.filter(led => {
      if (!led.norm) return false;
      return !normalizedAttendance.some(att => {
        return att.norm.includes(led.norm) || led.norm.includes(att.norm);
      });
    }).map(x => x.original);

    return {
      matchedCount: Math.max(0, attendanceNames.length - missingInLedger.length),
      missingInLedger,
      missingInAttendance
    };
  }, [availableStudents, payments]);

  // Handlers
  const handleFileProcess = async (file: File) => {
    setUploadError('');
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload an image (JPEG, PNG, WEBP, GIF) or a PDF.');
      return;
    }
    // Limit size to 1.5MB to avoid exceeding local storage quota
    if (file.size > 1.5 * 1024 * 1024) {
      setUploadError('File is too large. Receipts must be under 1.5 MB to save successfully.');
      return;
    }

    setIsUploading(true);
    try {
      const publicUrl = await uploadToSupabaseStorage('receipts', file.name, file);
      if (publicUrl) {
        setReceiptFileUrl(publicUrl);
        setReceiptFileName(file.name);
        setIsUploading(false);
      } else {
        // Fallback to Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setReceiptFileUrl(reader.result);
            setReceiptFileName(file.name);
          }
          setIsUploading(false);
        };
        reader.onerror = () => {
          setUploadError('Failed to read the file.');
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Failed to upload receipt to Supabase Storage:", err);
      // Fallback
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setReceiptFileUrl(reader.result);
          setReceiptFileName(file.name);
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        setUploadError('Failed to read the file.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFileUrl('');
    setReceiptFileName('');
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenRecordPayment = (p: PaymentRecord) => {
    setSelectedPaymentForModal(p);
    setPaymentAmountInput(Math.min(300, p.totalTuition - p.amountPaid));
    setPaymentMethodInput('Credit Card');
    setPaymentNotesInput('');
    setReceiptFileUrl(p.receiptUrl || '');
    setReceiptFileName(p.receiptName || '');
    setUploadError('');
    setShowRecordPaymentModal(true);
    navigate({ action: 'record-payment', id: p.id });
  };

  const handleConfirmAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForModal) return;

    const added = Number(paymentAmountInput) || 0;
    const newPaid = Math.min(selectedPaymentForModal.totalTuition, selectedPaymentForModal.amountPaid + added);
    const newStatus: PaymentRecord['status'] = newPaid >= selectedPaymentForModal.totalTuition ? 'Paid In Full' : 'Partial';

    setPayments(prev => prev.map(p => {
      if (p.id === selectedPaymentForModal.id) {
        return {
          ...p,
          amountPaid: newPaid,
          status: newStatus,
          lastPaymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: paymentMethodInput,
          notes: paymentNotesInput ? `${p.notes ? p.notes + ' | ' : ''}${paymentNotesInput}` : p.notes,
          receiptUrl: receiptFileUrl || p.receiptUrl,
          receiptName: receiptFileName || p.receiptName
        };
      }
      return p;
    }));

    logActivity({
      actor: userRole === 'admin' ? 'Administrator' : currentStudentName || 'Staff User',
      role: userRole === 'admin' ? 'admin' : 'teacher',
      actionCategory: 'Payment Entry',
      actionTitle: 'Tuition Payment Logged',
      details: `Collected $${added.toFixed(2)} via ${paymentMethodInput} for ${selectedPaymentForModal.studentName}. Updated paid total: $${newPaid.toFixed(2)}. Status: ${newStatus}.`,
      targetStudent: selectedPaymentForModal.studentName
    });

    setShowRecordPaymentModal(false);
    setSelectedPaymentForModal(null);
    navigate({ action: undefined, id: undefined });
  };

  const handleAddStudentTuition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const nameClean = newStudentName.trim();
    const newRecord: PaymentRecord = {
      id: generateUUID(),
      studentName: nameClean,
      studentId: `HTEIM-2026-${Math.abs(nameClean.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)).toString().substring(0, 4)}`,
      email: `${(nameClean || '').toLowerCase().replace(/\s+/g, '.')}@hteim.edu`,
      moduleTrack: newTrack,
      totalTuition: newTotalTuition,
      amountPaid: newInitialPayment,
      status: newInitialPayment >= newTotalTuition ? 'Paid In Full' : newInitialPayment > 0 ? 'Partial' : 'Pending Review',
      lastPaymentDate: newInitialPayment > 0 ? new Date().toISOString().split('T')[0] : 'N/A',
      paymentMethod: 'Credit Card',
      notes: 'New student enrollment tuition agreement logged.'
    };

    setPayments(prev => [newRecord, ...prev]);

    logActivity({
      actor: userRole === 'admin' ? 'Administrator' : 'Staff User',
      role: 'admin',
      actionCategory: 'Payment Entry',
      actionTitle: 'Student Tuition Agreement Created',
      details: `Created tuition ledger for ${nameClean} (${newTrack}). Total Tuition: $${newTotalTuition}, Initial Paid: $${newInitialPayment}.`,
      targetStudent: nameClean
    });

    setShowAddStudentModal(false);
    setNewStudentName('');
    setNewInitialPayment(0);
    navigate({ action: undefined, id: undefined });
  };

  const handleExportCSV = () => {
    let csv = 'Student ID,Student Name,Email,Ministry Track,Total Tuition,Amount Paid,Balance Due,Status,Last Payment Date,Method,Notes\n';
    const validPayments = payments.filter(p => !p.isDemo && !isDemoPayment(p));
    validPayments.forEach(p => {
      const balance = p.totalTuition - p.amountPaid;
      csv += `"${p.studentId}","${p.studentName}","${p.email || ''}","${p.moduleTrack}",$${p.totalTuition},$${p.amountPaid},$${balance},"${p.status}","${p.lastPaymentDate}","${p.paymentMethod}","${(p.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HTEIM_Tuition_Payment_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Find current student payment record
  const studentPayment = useMemo(() => {
    if (!payments || payments.length === 0) return null;
    if (!currentStudentName) return payments[0] || null;
    const nameLower = (currentStudentName || '').toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
    const canonicalName = (MANUAL_ALIASES[nameLower] || currentStudentName).toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
    
    // Exact or alias match
    const match = payments.find(p => {
      if (!p || !p.studentName) return false;
      const pName = (p.studentName || '').toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
      if (pName === nameLower || pName === canonicalName) return true;
      const pCanonical = (MANUAL_ALIASES[pName] || p.studentName).toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
      if (pCanonical === canonicalName || pCanonical === nameLower) return true;
      const n1 = nameLower.replace(/[^a-z]/g, '');
      const n2 = pName.replace(/[^a-z]/g, '');
      if (n1 && n2 && (n1.includes(n2) || n2.includes(n1) || (n1.substring(0, 5) === n2.substring(0, 5) && n1.length > 3))) {
        return true;
      }
      return false;
    });

    return match || payments[0] || null;
  }, [payments, currentStudentName]);

  // If student role, return the student-specific payment view
  if (isStudent) {
    if (!studentPayment) {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-2xl mx-auto my-12 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Tuition Record Not Found</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            We couldn't locate a student tuition ledger matching your account name (<strong className="text-slate-800">{currentStudentName || 'Student'}</strong>).
          </p>
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900">
            Please contact the HTEIM administration team to link your profile with the financial system.
          </div>
        </div>
      );
    }

    return (
      <div className="material-screen space-y-6 animate-fadeIn pb-28 sm:pb-24 md:pb-8">
        <StudentFinancialProfileView
          studentName={studentPayment.studentName}
          studentId={studentPayment.studentId}
          studentEmail={studentPayment.email}
          userRole={userRole}
          userEmail={studentPayment.email}
          onUpdated={() => {
            const updatedInvs = getInvoices();
            setInvoices(updatedInvs);
            const updatedTxs = getTransactions();
            setTransactions(updatedTxs);
            setReceipts(getReceipts());
            syncToPayments(updatedInvs, updatedTxs);
          }}
        />
      </div>
    );
  }

  return (
    <div className="material-screen space-y-6 animate-fadeIn pb-28 sm:pb-24 md:pb-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl font-black tracking-tight text-slate-900 dark:text-white">Student Tuition & Payment Analytics</h2>
                <span className="px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Admin Portal
                </span>
                {manualTuitionOnly && (
                  <span className="px-3 py-0.5 text-[10px] font-bold tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Manual Tuition Updates Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                HTEIM School of Ministry • Student Tuition Management Ledger & Financial Analytics
              </p>
            </div>
          </div>
        </div>

        {/* Quick KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="tactile-card interactive-hover-card bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Revenue Collected</p>
            <p className="font-display text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900 dark:text-white mt-1">${stats.totalCollected.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{stats.collectionRate}% of total tuition target</p>
          </div>

          <div className="tactile-card interactive-hover-card bg-slate-50 dark:bg-slate-800/90 border border-amber-200/60 dark:border-amber-800/50 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Outstanding Balance</p>
            <p className="font-display text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">${stats.totalOutstanding.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{stats.pastDueCount} accounts past due</p>
          </div>

          <div className="tactile-card interactive-hover-card bg-slate-50 dark:bg-slate-800/90 border border-emerald-200/60 dark:border-emerald-800/50 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paid In Full</p>
            <p className="font-display text-2xl sm:text-3xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">{stats.paidInFullCount} / {stats.totalStudents}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Students with 100% tuition clear</p>
          </div>

          <div className="tactile-card interactive-hover-card bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Expected Total</p>
            <p className="font-display text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900 dark:text-white mt-1">${stats.totalTuition.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Full semester tuition value</p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full lg:w-auto">
          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`min-h-11 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'invoices' || activeSubTab === 'ledger'
                ? 'bg-[#023264] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" /> Invoice Ledger ({invoices.length})
          </button>

          <button
            onClick={() => setActiveSubTab('payments')}
            className={`min-h-11 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'payments'
                ? 'bg-[#023264] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Payment History ({transactions.length})
          </button>

          <button
            onClick={() => setActiveSubTab('receipts')}
            className={`min-h-11 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'receipts'
                ? 'bg-[#023264] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ReceiptIcon className="w-4 h-4" /> Issued Receipts ({receipts.length})
          </button>

          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`min-h-11 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'analytics'
                ? 'bg-[#023264] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Financial Analytics
          </button>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              setShowBulkReminderModal(true);
              navigate({ action: 'bulk-reminder' });
            }}
            className="col-span-2 sm:col-span-1 min-h-11 px-3.5 py-2 bg-gradient-to-r from-[#023264] via-[#025798] to-[#01883c] hover:from-[#022044] hover:to-[#01682e] text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95 border border-[#b38f53]/30"
          >
            <MessageSquare className="w-4 h-4 text-[#dfc18b] animate-pulse" />
            <span>Send Bulk Reminders (WhatsApp & Email)</span>
            <span className="px-1.5 py-0.5 bg-[#dfc18b] text-[#022044] text-[10px] font-extrabold rounded-md ml-1">
              {payments.filter(p => p.totalTuition - p.amountPaid > 0).length} Due
            </span>
          </button>
          <button
            onClick={() => handleTriggerTuitionSync()}
            disabled={isTuitionLoading || isSyncingDirectly}
            className="min-h-11 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            title="Pull latest tuition & fee schedules from connected Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTuitionLoading || isSyncingDirectly ? 'animate-spin' : ''}`} />
            <span>{isTuitionLoading || isSyncingDirectly ? 'Syncing...' : 'Sync from Google Sheets'}</span>
            {lastTuitionSyncedTime && (
              <span className="text-[10px] bg-emerald-800/80 px-1.5 py-0.5 rounded font-mono hidden md:inline">
                {lastTuitionSyncedTime}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowSheetSyncModal(true)}
            className="min-h-11 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Configure Google Sheets Tuition URL and preview tabs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Sheet Settings</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="min-h-11 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => setShowInstallmentModal(true)}
            className="min-h-11 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800"
            title="Manage student payment installments"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Installments ({installmentPlans.length})</span>
          </button>
          <button
            onClick={() => setShowScholarshipModal(true)}
            className="min-h-11 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-200 dark:border-emerald-800"
            title="Record student scholarship or sponsor donation"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>Sponsor a Student</span>
          </button>
          {removedStudentRecords.length > 0 && (
            <button
              onClick={() => {
                setShowRemovedArchiveModal(true);
                navigate({ action: 'archive' });
              }}
              className="min-h-11 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              title="View or restore previously removed students and fees"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Removed Archive</span>
              <span className="px-1.5 py-0.5 bg-rose-600 text-white font-black text-[10px] rounded-full ml-0.5">
                {removedStudentRecords.length}
              </span>
            </button>
          )}
          <div className="flex items-center gap-1 px-3 py-2 bg-[#01883c]/10 border border-[#01883c]/30 rounded-xl text-xs text-[#01883c] dark:text-[#86efac] font-bold shrink-0" title="Payment records and student payment logs are permanently stored and managed manually inside the portal">
            <ShieldCheck className="w-4 h-4 text-[#01883c] shrink-0" />
            <span className="hidden sm:inline text-xs">Permanent Ledger</span>
          </div>

          <button
            onClick={() => {
              setShowAddStudentModal(true);
              navigate({ action: 'add-student' });
            }}
            className="min-h-11 px-3.5 py-2 bg-[#023264] hover:bg-[#025798] text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border border-[#b38f53]/30"
          >
            <Plus className="w-3.5 h-3.5 text-[#dfc18b]" /> Log Tuition
          </button>
        </div>
      </div>

      {/* VIEW 2: Invoice Ledger */}
      {(activeSubTab === 'invoices' || activeSubTab === 'ledger') && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden">
            {/* Controls Bar (Sticky for smooth scroll ergonomics) */}
            <div className="sticky top-2 sm:top-3 z-20 backdrop-blur-md p-4 bg-slate-50/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 shadow-xs">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoice, student, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer shadow-2xs"
                    >
                      <option value="All">All Invoices</option>
                      <option value="Paid In Full">Paid</option>
                      <option value="Partial">Partially Paid</option>
                      <option value="Past Due">Past Due</option>
                      <option value="Pending Review">Unpaid</option>
                    </select>
                  </div>

                  {/* Mobile/Desktop View Switcher */}
                  <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-1 rounded-xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setMobileViewMode('cards')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        mobileViewMode === 'cards' 
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cards</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileViewMode('table')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        mobileViewMode === 'table' 
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Table</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </div>
            </div>

            {/* Content: Cards View (Default for Mobile) */}
            {(mobileViewMode === 'cards') ? (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInvoices.map((inv) => (
                  <div key={inv.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-600/50 transition-all">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                            {inv.studentName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight">{inv.studentName}</h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              <span>{inv.studentId}</span>
                              <span>•</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{inv.id}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                          inv.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {inv.status}
                        </span>
                      </div>

                      {/* Tuition Stats Box */}
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/70 grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400">Net Tuition</p>
                          <p className="font-mono font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">${inv.netTuition.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400">Amount Paid</p>
                          <p className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">${inv.amountPaid.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400">Outstanding</p>
                          <p className={`font-mono font-extrabold mt-0.5 ${inv.outstandingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            ${inv.outstandingBalance.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                        <span className="text-[11px] font-semibold truncate max-w-[170px]" title={inv.moduleTrack}>{inv.moduleTrack}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">{inv.paymentPlan}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                      {inv.outstandingBalance > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickMarkPaidInFull(inv)}
                            className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title={`Mark ${inv.studentName} Paid In Full ($${inv.netTuition || inv.totalTuition})`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoiceForPayment(inv);
                              setRecordPaymentAmount(inv.outstandingBalance);
                              setRecordPaymentNotes('');
                              setShowRecordCustomPaymentModal(true);
                            }}
                            className="py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Partial Pay
                          </button>
                        </div>
                      ) : (
                        <div className="py-2.5 px-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 border border-emerald-200/60 dark:border-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Paid In Full ($0 Balance)
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoiceForEdit(inv);
                            setEditInvoiceTuition(inv.totalTuition);
                            setEditInvoiceAmountPaid(inv.amountPaid || 0);
                            setEditInvoiceDiscounts(inv.discounts);
                            setEditInvoiceScholarships(inv.scholarships);
                            setEditInvoicePlan(inv.paymentPlan);
                            setEditInvoiceStatus(inv.status);
                            setEditInvoiceNotes(inv.notes || '');
                            setShowEditInvoiceModal(true);
                          }}
                          className="py-2 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5" /> Edit Invoice
                        </button>

                        <button
                          type="button"
                          onClick={() => viewInvoiceAsReceipt(inv)}
                          className="py-2 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer border border-indigo-100 dark:border-indigo-800/50"
                        >
                          <FileText className="w-3.5 h-3.5" /> Statement
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredInvoices.length === 0 && (
                  <div className="col-span-full p-12 text-center text-slate-400 font-medium">
                    No invoices found matching current criteria.
                  </div>
                )}
              </div>
            ) : (
              /* Table View */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs" aria-label="Student Invoice Ledger">
                  <caption className="sr-only">Student Invoice Ledger with base tuition, discounts, net tuition, and payment status</caption>
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th scope="col" className="p-4">Invoice ID</th>
                      <th scope="col" className="p-4">Student Name & ID</th>
                      <th scope="col" className="p-4">Program Track</th>
                      <th scope="col" className="p-4 text-right">Base Tuition</th>
                      <th scope="col" className="p-4 text-right">Scholarships</th>
                      <th scope="col" className="p-4 text-right">Discounts</th>
                      <th scope="col" className="p-4 text-right">Net Tuition</th>
                      <th scope="col" className="p-4 text-right">Amount Paid</th>
                      <th scope="col" className="p-4 text-right">Outstanding Balance</th>
                      <th scope="col" className="p-4">Payment Plan</th>
                      <th scope="col" className="p-4">Status</th>
                      <th scope="col" className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filteredInvoices.map((inv) => {
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">{inv.id}</td>
                          <td className="p-4">
                            <div className="font-bold text-slate-900 dark:text-white">{inv.studentName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{inv.studentId}</div>
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{inv.moduleTrack}</td>
                          <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">${inv.totalTuition.toLocaleString()}</td>
                          <td className="p-4 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                            {inv.scholarships > 0 ? `-${inv.scholarships.toLocaleString()}` : '$0'}
                          </td>
                          <td className="p-4 text-right font-mono text-amber-600 dark:text-amber-400 font-bold">
                            {inv.discounts > 0 ? `-${inv.discounts.toLocaleString()}` : '$0'}
                          </td>
                          <td className="p-4 text-right font-mono text-slate-900 dark:text-white font-extrabold">${inv.netTuition.toLocaleString()}</td>
                          <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">${inv.amountPaid.toLocaleString()}</td>
                          <td className={`p-4 text-right font-mono font-extrabold ${inv.outstandingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            ${inv.outstandingBalance.toLocaleString()}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {inv.paymentPlan}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase ${
                              inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' :
                              inv.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' :
                              'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {inv.outstandingBalance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickMarkPaidInFull(inv)}
                                  title={`Mark ${inv.studentName} Paid in Full ($${inv.netTuition || inv.totalTuition})`}
                                  aria-label={`Mark ${inv.studentName} Paid in Full`}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center border border-emerald-200 dark:border-emerald-800"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInvoiceForEdit(inv);
                                  setEditInvoiceTuition(inv.totalTuition);
                                  setEditInvoiceAmountPaid(inv.amountPaid || 0);
                                  setEditInvoiceDiscounts(inv.discounts);
                                  setEditInvoiceScholarships(inv.scholarships);
                                  setEditInvoicePlan(inv.paymentPlan);
                                  setEditInvoiceStatus(inv.status);
                                  setEditInvoiceNotes(inv.notes || '');
                                  setShowEditInvoiceModal(true);
                                }}
                                title={`Edit Invoice Settings for ${inv.studentName}`}
                                aria-label={`Edit Invoice Settings for ${inv.studentName}`}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-500"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              {inv.outstandingBalance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvoiceForPayment(inv);
                                    setRecordPaymentAmount(inv.outstandingBalance);
                                    setRecordPaymentNotes('');
                                    setShowRecordCustomPaymentModal(true);
                                  }}
                                  title={`Record Tuition Payment for ${inv.studentName}`}
                                  aria-label={`Record Tuition Payment for ${inv.studentName}`}
                                  className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => viewInvoiceAsReceipt(inv)}
                                title={`View Account Statement for ${inv.studentName}`}
                                aria-label={`View Account Statement for ${inv.studentName}`}
                                className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-500"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredInvoices.length === 0 && (
                      <tr>
                        <td colSpan={12} className="p-12 text-center text-slate-400">
                          No invoices found matching current criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2b: Payment History */}
      {activeSubTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search payments by student or method..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end w-full sm:w-auto">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Total: {filteredTransactions.length} transactions
                </div>
                <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('cards')}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      mobileViewMode === 'cards' 
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs' 
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('table')}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      mobileViewMode === 'table' 
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs' 
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cards View */}
            {mobileViewMode === 'cards' ? (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{tx.id} • {tx.invoiceId}</span>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">{tx.studentName}</h4>
                        <p className="text-[10px] font-mono text-slate-500">{tx.studentId}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">${tx.amount.toLocaleString()}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                          {tx.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <span>Date: <strong className="text-slate-700 dark:text-slate-200">{tx.paymentDate}</strong></span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">{tx.paymentMethod}</span>
                    </div>
                    {tx.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        "{tx.notes}"
                      </p>
                    )}
                  </div>
                ))}
                {filteredTransactions.length === 0 && (
                  <div className="col-span-full p-12 text-center text-slate-400">
                    No transactions recorded.
                  </div>
                )}
              </div>
            ) : (
              /* Table View */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="p-4">Transaction ID</th>
                      <th className="p-4">Invoice ID</th>
                      <th className="p-4">Student Name & ID</th>
                      <th className="p-4">Payment Date</th>
                      <th className="p-4 text-right">Amount Paid</th>
                      <th className="p-4">Payment Method</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">{tx.id}</td>
                        <td className="p-4 font-mono text-slate-500">{tx.invoiceId}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          {tx.studentName}
                          <span className="block text-[9px] font-mono font-normal text-slate-500">{tx.studentId}</span>
                        </td>
                        <td className="p-4 font-medium text-slate-600 dark:text-slate-400">{tx.paymentDate}</td>
                        <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">${tx.amount.toLocaleString()}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 italic max-w-xs truncate" title={tx.notes}>
                          {tx.notes}
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          No transactions recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2c: Issued Receipts */}
      {activeSubTab === 'receipts' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search receipts by student or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end w-full sm:w-auto">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Total: {filteredReceipts.length} receipts
                </div>
                <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('cards')}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      mobileViewMode === 'cards' 
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs' 
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('table')}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      mobileViewMode === 'table' 
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs' 
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cards View */}
            {mobileViewMode === 'cards' ? (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReceipts.map((rec) => (
                  <div key={rec.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400">{rec.receiptNumber}</span>
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">{rec.studentName}</h4>
                          <p className="text-[10px] font-mono text-slate-500">{rec.studentId}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">${rec.amountPaid.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{rec.issuedAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
                        <span>Method: <strong className="text-slate-700 dark:text-slate-200">{rec.paymentMethod}</strong></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const rep: PaymentRecord = {
                          id: rec.invoiceId.replace('INV-', 'pay-'),
                          studentName: rec.studentName,
                          studentId: rec.studentId,
                          moduleTrack: invoices.find(inv => inv.id === rec.invoiceId)?.moduleTrack || 'Active Ministry Module',
                          totalTuition: rec.amountPaid,
                          amountPaid: rec.amountPaid,
                          status: 'Paid In Full',
                          lastPaymentDate: rec.paymentDate,
                          paymentMethod: rec.paymentMethod as any,
                          notes: rec.notes,
                          receiptNumber: rec.receiptNumber
                        };
                        generateTuitionReceiptPDF(rep);
                      }}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Download className="w-4 h-4" /> Download PDF Receipt
                    </button>
                  </div>
                ))}
                {filteredReceipts.length === 0 && (
                  <div className="col-span-full p-12 text-center text-slate-400">
                    No issued receipts found.
                  </div>
                )}
              </div>
            ) : (
              /* Table View */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="p-4">Receipt Number</th>
                      <th className="p-4">Student Name & ID</th>
                      <th className="p-4">Payment Method</th>
                      <th className="p-4 text-right">Amount Paid</th>
                      <th className="p-4">Date Issued</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filteredReceipts.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 font-mono font-extrabold text-emerald-700 dark:text-emerald-400">{rec.receiptNumber}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{rec.studentName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{rec.studentId}</div>
                        </td>
                        <td className="p-4 font-medium text-slate-600 dark:text-slate-400">{rec.paymentMethod}</td>
                        <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">${rec.amountPaid.toLocaleString()}</td>
                        <td className="p-4 text-slate-500">{rec.issuedAt}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => {
                                const rep: PaymentRecord = {
                                  id: rec.invoiceId.replace('INV-', 'pay-'),
                                  studentName: rec.studentName,
                                  studentId: rec.studentId,
                                  moduleTrack: invoices.find(inv => inv.id === rec.invoiceId)?.moduleTrack || 'Active Ministry Module',
                                  totalTuition: rec.amountPaid,
                                  amountPaid: rec.amountPaid,
                                  status: 'Paid In Full',
                                  lastPaymentDate: rec.paymentDate,
                                  paymentMethod: rec.paymentMethod as any,
                                  notes: rec.notes,
                                  receiptNumber: rec.receiptNumber
                                };
                                generateTuitionReceiptPDF(rep);
                              }}
                              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-950/80 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Download className="w-3 h-3" /> PDF Receipt
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredReceipts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400">
                          No issued receipts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditInvoiceModal && selectedInvoiceForEdit && (
        <Modal
          isOpen={showEditInvoiceModal}
          onClose={() => setShowEditInvoiceModal(false)}
          title={`Edit Invoice Settings`}
        >
          <form onSubmit={handleEditInvoiceSubmit} className="space-y-4 p-4 text-slate-900">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">Student Name</label>
              <input
                type="text"
                disabled
                value={selectedInvoiceForEdit.studentName}
                className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Tuition Base Amount ($)</label>
                <input
                  type="number"
                  value={editInvoiceTuition}
                  onChange={(e) => setEditInvoiceTuition(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Scholarships & Aid ($)</label>
                <input
                  type="number"
                  value={editInvoiceScholarships}
                  onChange={(e) => setEditInvoiceScholarships(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Discounts Granted ($)</label>
                <input
                  type="number"
                  value={editInvoiceDiscounts}
                  onChange={(e) => setEditInvoiceDiscounts(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Payment Plan Type</label>
                <select
                  value={editInvoicePlan}
                  onChange={(e) => setEditInvoicePlan(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none cursor-pointer"
                >
                  <option value="Pay In Full">Pay In Full</option>
                  <option value="Monthly Installments">Monthly Installments</option>
                  <option value="Custom Plan">Custom Plan</option>
                </select>
              </div>
            </div>

            {/* Amount Paid & Quick Clear Helper */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                  Amount Paid to Date ($)
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  Net Tuition: ${Math.max(0, editInvoiceTuition - editInvoiceDiscounts - editInvoiceScholarships).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={editInvoiceAmountPaid}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditInvoiceAmountPaid(val);
                    const net = Math.max(0, editInvoiceTuition - editInvoiceDiscounts - editInvoiceScholarships);
                    if (val >= net && net > 0) {
                      setEditInvoiceStatus('Paid');
                    } else if (val > 0) {
                      setEditInvoiceStatus('Partially Paid');
                    } else {
                      setEditInvoiceStatus('Unpaid');
                    }
                  }}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => {
                    const net = Math.max(0, editInvoiceTuition - editInvoiceDiscounts - editInvoiceScholarships);
                    setEditInvoiceAmountPaid(net);
                    setEditInvoiceStatus('Paid');
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer shadow-xs"
                >
                  Clear Full ($1200)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditInvoiceAmountPaid((prev) => prev + 300);
                    setEditInvoiceStatus('Partially Paid');
                  }}
                  className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  +$300
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditInvoiceAmountPaid(0);
                    setEditInvoiceStatus('Unpaid');
                  }}
                  className="px-2 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  $0
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Invoice / Account Status</label>
                <select
                  value={editInvoiceStatus}
                  onChange={(e) => {
                    const st = e.target.value as Invoice['status'];
                    setEditInvoiceStatus(st);
                    const net = Math.max(0, editInvoiceTuition - editInvoiceDiscounts - editInvoiceScholarships);
                    if (st === 'Paid' && editInvoiceAmountPaid < net) {
                      setEditInvoiceAmountPaid(net);
                    } else if (st === 'Unpaid') {
                      setEditInvoiceAmountPaid(0);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 focus:outline-none cursor-pointer"
                >
                  <option value="Paid">Paid (100% Cleared)</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Past Due">Past Due</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Calculated Remaining Balance</label>
                <div className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-mono font-black text-amber-700">
                  ${Math.max(0, (editInvoiceTuition - editInvoiceDiscounts - editInvoiceScholarships) - editInvoiceAmountPaid).toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">Notes / Scholarship Reasons</label>
              <textarea
                value={editInvoiceNotes}
                onChange={(e) => setEditInvoiceNotes(e.target.value)}
                rows={3}
                placeholder="Discounts or Scholarship reasons..."
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditInvoiceModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Save Invoice Config
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Record Tuition Payment Modal */}
      {showRecordCustomPaymentModal && selectedInvoiceForPayment && (
        <Modal
          isOpen={showRecordCustomPaymentModal}
          onClose={() => setShowRecordCustomPaymentModal(false)}
          title={`Record Partial Payment / Deposit`}
        >
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 p-4 text-slate-900">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800">
              <p>Student: <strong>{selectedInvoiceForPayment.studentName}</strong></p>
              <p className="mt-1">Net Tuition Owed: <strong>${selectedInvoiceForPayment.netTuition.toLocaleString()}</strong></p>
              <p>Total Paid So Far: <strong>${selectedInvoiceForPayment.amountPaid.toLocaleString()}</strong></p>
              <p>Remaining Balance: <strong>${selectedInvoiceForPayment.outstandingBalance.toLocaleString()}</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Payment Amount ($)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedInvoiceForPayment.outstandingBalance}
                  value={recordPaymentAmount}
                  onChange={(e) => setRecordPaymentAmount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Payment Method</label>
                <select
                  value={recordPaymentMethod}
                  onChange={(e) => setRecordPaymentMethod(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Stripe">Stripe</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={recordPaymentDate}
                onChange={(e) => setRecordPaymentDate(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">Notes / Transaction Reference</label>
              <textarea
                value={recordPaymentNotes}
                onChange={(e) => setRecordPaymentNotes(e.target.value)}
                rows={2}
                placeholder="Transaction ID, confirmation notes..."
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRecordCustomPaymentModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
              >
                Post Payment & Issue Receipt
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW 3: Analytics Breakdown */}
      {activeSubTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-emerald-600" /> Tuition Collection Progress
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-700">{stats.collectionRate}% Collected</span>
            </div>

            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${stats.collectionRate}%` }}
                title={`Collected: $${stats.totalCollected}`}
              />
              <div
                className="bg-amber-400 h-full transition-all"
                style={{ width: `${100 - stats.collectionRate}%` }}
                title={`Outstanding: $${stats.totalOutstanding}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <p className="text-[10px] font-bold uppercase text-emerald-800">Total Funds In Bank</p>
                <p className="text-xl font-black font-mono text-emerald-900 mt-1">${stats.totalCollected.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-[10px] font-bold uppercase text-amber-800">Remaining Receivables</p>
                <p className="text-xl font-black font-mono text-amber-900 mt-1">${stats.totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" /> Account Status Breakdown
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Paid In Full
                </span>
                <span className="font-mono font-black text-emerald-900">{stats.paidInFullCount} Students</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" /> Active Installment Plans
                </span>
                <span className="font-mono font-black text-blue-900">{stats.partialCount} Students</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <span className="text-xs font-bold text-rose-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Past Due / Payment Notice
                </span>
                <span className="font-mono font-black text-rose-900">{stats.pastDueCount} Students</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* MODAL 2: Record Tuition Payment */}
      {showRecordPaymentModal && selectedPaymentForModal && (
        <Modal
          isOpen={showRecordPaymentModal}
          onClose={() => {
            setShowRecordPaymentModal(false);
            setSelectedPaymentForModal(null);
            navigate({ action: undefined, id: undefined });
          }}
          title="Log Tuition Payment"
          icon={<DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />}
          size="md"
        >
          <form onSubmit={handleConfirmAddPayment} className="space-y-4">

            <div className="p-4 sm:p-6 space-y-3.5 text-xs text-slate-700 overflow-y-auto custom-scrollbar flex-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <p className="text-[10px] uppercase font-extrabold text-slate-400">Student</p>
                <p className="font-black text-slate-900 text-sm">{selectedPaymentForModal.studentName}</p>
                <p className="text-[11px] font-mono text-emerald-700">{selectedPaymentForModal.studentId}</p>
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-[11px] font-bold">
                  <span>Total Tuition: ${selectedPaymentForModal.totalTuition}</span>
                  <span className="text-amber-700">Remaining: ${selectedPaymentForModal.totalTuition - selectedPaymentForModal.amountPaid}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Payment Amount Collected ($)
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedPaymentForModal.totalTuition - selectedPaymentForModal.amountPaid}
                  required
                  value={paymentAmountInput ?? ''}
                  onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-extrabold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethodInput ?? ''}
                  onChange={(e) => setPaymentMethodInput(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer / Wire</option>
                  <option value="Zelle">Zelle / Electronic</option>
                  <option value="Check">Check</option>
                  <option value="Scholarship">Scholarship / Grant</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Payment Reference / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Check #4012, Transaction Ref ID..."
                  value={paymentNotesInput ?? ''}
                  onChange={(e) => setPaymentNotesInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {/* Receipt Upload Block */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase text-slate-500">
                  Upload Receipt (Optional)
                </label>
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-3 sm:p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    dragActive 
                      ? 'border-emerald-500 bg-emerald-50/40' 
                      : receiptFileUrl 
                        ? 'border-emerald-300 bg-emerald-50/10' 
                        : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-3 animate-pulse" onClick={(e) => e.stopPropagation()}>
                      <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
                      <p className="text-xs font-bold text-slate-700">Uploading receipt...</p>
                      <p className="text-[10px] text-slate-400">Please wait</p>
                    </div>
                  ) : receiptFileUrl ? (
                    <div className="w-full flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {receiptFileUrl.startsWith('data:image/') ? (
                        <img 
                          src={receiptFileUrl} 
                          alt="Receipt Preview" 
                          className="max-h-20 sm:max-h-24 rounded-lg object-contain border border-slate-200 shadow-xs" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-800 break-all max-w-[240px]">
                          {receiptFileName || 'receipt_attached'}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-extrabold flex items-center justify-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Receipt Attached
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="mt-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-900 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Remove File
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-700">
                          <span className="text-emerald-700 hover:underline font-black">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          PNG, JPG, PDF (Max 1.5 MB)
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {uploadError && (
                  <p className="text-[10px] text-rose-600 font-bold mt-1 bg-rose-50 border border-rose-100 rounded-lg p-2 text-left">
                    ⚠️ {uploadError}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowRecordPaymentModal(false);
                  setSelectedPaymentForModal(null);
                  navigate({ action: undefined, id: undefined });
                }}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Confirm & Log Payment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Printable Official Tuition Receipt & Statement */}
      {receiptRecord && (
        <Modal
          isOpen={!!receiptRecord}
          onClose={() => setReceiptRecord(null)}
          title="Official Tuition Statement & Receipt"
          icon={<ReceiptIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
          size="lg"
          isDraggable={true}
          footer={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiptRecord(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Statement
              </button>
            </div>
          }
        >
          <div id="printable-tuition-receipt" className="space-y-4 sm:space-y-6 text-slate-800 dark:text-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-4 gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <LogoImage 
                    alt="HTEIM Logo" 
                    className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-amber-400 p-0.5 object-contain bg-white flex-shrink-0 shadow-xs"
                  />
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">HTEIM School of Ministry</h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Academic Financial Office • Official Statement</p>
                    <p className="text-[9px] sm:text-[10px] italic font-serif text-amber-900">"Bringing Heaven to Earth, Taking People to Heaven"</p>
                  </div>
                </div>
                <div className="text-left sm:text-right font-mono text-xs">
                  <p className="font-extrabold text-emerald-700">Receipt #{receiptRecord.id.toUpperCase()}</p>
                  <p className="text-slate-400 text-[10px]">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400">Student Name</p>
                  <p className="font-black text-slate-900 text-sm sm:text-base">{receiptRecord.studentName}</p>
                  <p className="font-mono text-emerald-700 text-xs font-bold">{receiptRecord.studentId}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400">Enrolled Program Track</p>
                  <p className="font-bold text-slate-800">{receiptRecord.moduleTrack}</p>
                  <p className="text-slate-500 text-[11px] break-all">{receiptRecord.email}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
                <div className="flex justify-between text-xs font-bold">
                  <span>Semester Academic Tuition</span>
                  <span className="font-mono">${receiptRecord.totalTuition.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-700">
                  <span>Total Amount Paid To Date</span>
                  <span className="font-mono">${receiptRecord.amountPaid.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-xs sm:text-sm font-black text-slate-900">
                  <span>Balance Outstanding</span>
                  <span className="font-mono text-amber-700">${(receiptRecord.totalTuition - receiptRecord.amountPaid).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 italic font-medium">
                Note: {receiptRecord.notes || 'All tuition payments support academic ministry training and resources.'}
              </div>

              {receiptRecord.receiptUrl && (
                <div className="border-t border-slate-200 pt-4 space-y-2 print:hidden">
                  <p className="text-[10px] font-extrabold uppercase text-slate-400">Attached Payment Receipt</p>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]" title={receiptRecord.receiptName}>
                        {receiptRecord.receiptName || 'receipt_attached.file'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      {receiptRecord.receiptUrl.startsWith('data:image/') && (
                        <button
                          type="button"
                          onClick={() => {
                            const w = window.open();
                            if (w) {
                              w.document.write(`<img src="${receiptRecord.receiptUrl}" style="max-width:100%; height:auto; margin:auto; display:block;" />`);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Full
                        </button>
                      )}
                      <a
                        href={receiptRecord.receiptUrl}
                        download={receiptRecord.receiptName || 'receipt_attached'}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  </div>
                  {receiptRecord.receiptUrl.startsWith('data:image/') && (
                    <div className="flex justify-center bg-slate-50 p-2 border border-slate-200 rounded-xl max-h-40 overflow-hidden mt-1">
                      <img
                        src={receiptRecord.receiptUrl}
                        alt="Receipt file"
                        className="max-h-36 object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              )}
          </div>
        </Modal>
      )}

      {/* MODAL 4: Add New Tuition Record */}
      {showAddStudentModal && (
        <Modal
          isOpen={showAddStudentModal}
          onClose={() => {
            setShowAddStudentModal(false);
            navigate({ action: undefined, id: undefined });
          }}
          title="Log Student Tuition Agreement"
          icon={<Plus className="w-5 h-5 text-indigo-600 shrink-0" />}
          size="md"
        >
          <form onSubmit={handleAddStudentTuition} className="space-y-4 font-medium text-xs">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bro. Michael Brown"
                  value={newStudentName ?? ''}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Ministry Module Track
                </label>
                <select
                  value={newTrack ?? ''}
                  onChange={(e) => setNewTrack(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="Pastoral & General Ministry">Pastoral & General Ministry</option>
                  <option value="Theological Hermeneutics">Theological Hermeneutics</option>
                  <option value="Homiletics & Expository Preaching">Homiletics & Expository Preaching</option>
                  <option value="Leadership & Christian Education">Leadership & Christian Education</option>
                  <option value="Systematic Theology">Systematic Theology</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Total Tuition ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={newTotalTuition ?? ''}
                    onChange={(e) => setNewTotalTuition(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Initial Deposit ($)
                  </label>
                  <input
                    type="number"
                    value={newInitialPayment ?? ''}
                    onChange={(e) => setNewInitialPayment(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold"
                  />
                </div>
              </div>

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAddStudentModal(false);
                  navigate({ action: undefined, id: undefined });
                }}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Save Record
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk Payment Reminder Modal */}
      <BulkPaymentReminderModal
        isOpen={showBulkReminderModal}
        onClose={() => {
          setShowBulkReminderModal(false);
          navigate({ action: undefined, id: undefined });
        }}
        payments={payments}
        onUpdatePaymentPhone={handleUpdatePaymentPhone}
      />

      {/* Student Removal Verification Modal */}
      {showRemoveVerificationModal && studentToRemove && (
        <Modal
          isOpen={showRemoveVerificationModal}
          onClose={() => {
            setShowRemoveVerificationModal(false);
            setStudentToRemove(null);
            setRemoveError('');
            navigate({ action: undefined, id: undefined });
          }}
          title="Verify Student & Fee Removal"
          subtitle="Financial Ledger Purge Verification"
          icon={<ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />}
          size="md"
        >
          <form onSubmit={handleConfirmRemoveStudent} className="space-y-4">
              
              {/* Warning Context */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <p className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Are you sure you want to remove this student?
                </p>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  This will purge <strong>{studentToRemove.studentName}</strong> and their corresponding tuition fees from the active payment schedule and financial analytics.
                </p>
              </div>

              {removeError && (
                <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 font-bold text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  {removeError}
                </div>
              )}

              {/* Student Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-extrabold text-slate-900 text-sm">{studentToRemove.studentName}</p>
                    <p className="font-mono text-emerald-700 text-xs font-bold">{studentToRemove.studentId}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-200 text-slate-800 font-bold rounded-lg text-[10px]">
                    {studentToRemove.moduleTrack}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <p className="text-[9px] font-extrabold uppercase text-slate-400">Total Tuition</p>
                    <p className="font-mono font-black text-slate-900 mt-0.5">${studentToRemove.totalTuition.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <p className="text-[9px] font-extrabold uppercase text-slate-400">Amount Paid</p>
                    <p className="font-mono font-black text-emerald-700 mt-0.5">${studentToRemove.amountPaid.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <p className="text-[9px] font-extrabold uppercase text-slate-400">Balance Due</p>
                    <p className="font-mono font-black text-amber-600 mt-0.5">${(studentToRemove.totalTuition - studentToRemove.amountPaid).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Reason for Removal */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase text-slate-500">
                  Reason for Student Removal
                </label>
                <select
                  value={removalReason ?? ''}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="No longer a student / Withdrawn">No longer a student / Withdrawn</option>
                  <option value="Graduated / Completed Studies">Graduated / Completed Studies</option>
                  <option value="Transferred / Inactive">Transferred / Inactive</option>
                  <option value="Duplicate Record">Duplicate Record</option>
                  <option value="Administrative Correction">Administrative Correction</option>
                  <option value="Other">Other (Specify below)</option>
                </select>

                {removalReason === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter custom removal reason..."
                    value={customRemovalReason ?? ''}
                    onChange={(e) => setCustomRemovalReason(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium mt-1 focus:ring-2 focus:ring-rose-500/20"
                  />
                )}
              </div>

              {/* Verification Code Input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <label className="block text-[10px] font-extrabold uppercase text-rose-700">
                  Security Verification Step *
                </label>
                <p className="text-[11px] text-slate-600">
                  To confirm verification, please type <strong className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">REMOVE</strong> or the student's full name (<strong className="text-slate-900">{studentToRemove.studentName}</strong>):
                </p>
                <input
                  type="text"
                  required
                  placeholder="Type REMOVE or student name..."
                  value={removeVerificationInput ?? ''}
                  onChange={(e) => {
                    setRemoveVerificationInput(e.target.value);
                    setRemoveError('');
                  }}
                  className="w-full p-2.5 bg-rose-50/50 border border-rose-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoveVerificationModal(false);
                    setStudentToRemove(null);
                    setRemoveError('');
                    navigate({ action: undefined, id: undefined });
                  }}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer bg-rose-600 hover:bg-rose-700 text-white active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Confirm Permanent Removal
                </button>
              </div>
            </form>
          </Modal>
        )}

      {/* Removed Students Archive Modal */}
      {showRemovedArchiveModal && (
        <Modal
          isOpen={showRemovedArchiveModal}
          onClose={() => {
            setShowRemovedArchiveModal(false);
            navigate({ action: undefined, id: undefined });
          }}
          title="Removed Students & Fees Archive"
          subtitle={`Audited List of Excluded & Purged Financial Records (${removedStudentRecords.length})`}
          icon={<Trash2 className="w-5 h-5 text-rose-600 shrink-0" />}
          size="2xl"
        >
          <div className="space-y-4 font-medium text-xs">
              {removedStudentRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-xs text-slate-600">No removed student records found.</p>
                  <p className="text-[11px]">All active student tuition ledgers are currently in the primary schedule.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {removedStudentRecords.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{item.record.studentName}</span>
                          <span className="font-mono text-emerald-700 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {item.record.studentId}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Track: <strong className="text-slate-800">{item.record.moduleTrack}</strong> • Tuition Fee: <strong className="text-slate-900">${item.record.totalTuition.toLocaleString()}</strong> (${item.record.amountPaid.toLocaleString()} paid)
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                          <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">Reason: {item.reason}</span>
                          <span>Removed on: {item.removedAt}</span>
                          <span>By: {item.removedBy}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreRemovedStudent(item)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                        title="Restore student and tuition record back to payment schedule"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Restore Record
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowRemovedArchiveModal(false);
                  navigate({ action: undefined, id: undefined });
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Archive
              </button>
            </div>
          </Modal>
        )}

        {/* Installment Plan Modal */}
        {showInstallmentModal && (
          <InstallmentPlanModal
            isOpen={showInstallmentModal}
            onClose={() => setShowInstallmentModal(false)}
            students={studentsForInstallment}
            existingPlans={installmentPlans}
            onSavePlan={handleSaveInstallmentPlan}
            onRecordMilestonePayment={handleRecordMilestonePayment}
          />
        )}

        {/* Sponsor Scholarship Modal */}
        {showScholarshipModal && (
          <SponsorScholarshipModal
            isOpen={showScholarshipModal}
            onClose={() => setShowScholarshipModal(false)}
            students={studentsForInstallment}
            onGrantScholarship={handleGrantScholarship}
          />
        )}

        {/* Google Sheets Tuition & Fees Sync Modal */}
        {showSheetSyncModal && (
          <GoogleSheetsTuitionModal
            isOpen={showSheetSyncModal}
            onClose={() => setShowSheetSyncModal(false)}
            currentPayments={payments}
            onUpdatePayments={(updatedRecords) => {
              setPayments(updatedRecords);
              persistTuitionRecords(updatedRecords);
            }}
            tuitionSheetUrl={tuitionSheetUrl}
            onSaveTuitionSheetUrl={setTuitionSheetUrl}
            mainSheetUrl={mainSheetUrl}
            lastSyncedTime={lastTuitionSyncedTime}
          />
        )}
    </div>
  );
};
