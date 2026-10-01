import { PaymentRecord } from '../types';
import { INITIAL_PAYMENTS } from '../data/initialPortalData';

export type StudentPaymentSummary = {
  hasOutstanding: boolean;
  totalTuition: number;
  amountPaid: number;
  balanceDue: number;
  studentId: string;
  studentName: string;
  moduleTrack: string;
  status: string;
  lastPaymentDate: string;
  records: PaymentRecord[];
};

export function getStudentPaymentDetails(studentName?: string): StudentPaymentSummary {
  if (!studentName) {
    return {
      hasOutstanding: false,
      totalTuition: 0,
      amountPaid: 0,
      balanceDue: 0,
      studentId: 'N/A',
      studentName: '',
      moduleTrack: 'General Ministry Studies',
      status: 'Paid In Full',
      lastPaymentDate: 'N/A',
      records: []
    };
  }

  const cleanName = studentName.toLowerCase().trim();

  // First check authoritative invoices ledger
  try {
    const savedInvoices = localStorage.getItem('hteim_student_invoices');
    if (savedInvoices) {
      const invoices = JSON.parse(savedInvoices);
      if (Array.isArray(invoices) && invoices.length > 0) {
        const invMatch = invoices.find((inv: any) => {
          if (!inv || !inv.studentName) return false;
          const iName = inv.studentName.toLowerCase().trim();
          return iName === cleanName || iName.includes(cleanName) || cleanName.includes(iName);
        });

        if (invMatch) {
          const totalTuition = Number(invMatch.netTuition !== undefined ? invMatch.netTuition : invMatch.totalTuition) || 1200;
          const amountPaid = Number(invMatch.amountPaid) || 0;
          const balanceDue = Math.max(0, totalTuition - amountPaid);
          const isPaid = invMatch.status === 'Paid' || balanceDue <= 0;

          return {
            hasOutstanding: balanceDue > 0 && !isPaid,
            totalTuition,
            amountPaid,
            balanceDue,
            studentId: invMatch.studentId || 'N/A',
            studentName: invMatch.studentName || studentName,
            moduleTrack: invMatch.moduleTrack || 'Active Ministry Module',
            status: isPaid ? 'Paid In Full' : amountPaid > 0 ? 'Partial' : 'Pending Review',
            lastPaymentDate: invMatch.issueDate || 'N/A',
            records: []
          };
        }
      }
    }
  } catch (e) {
    console.error('Error reading invoices in getStudentPaymentDetails:', e);
  }

  let payments: PaymentRecord[] = [];
  try {
    const saved = localStorage.getItem('hteim_student_payments');
    if (saved) {
      payments = JSON.parse(saved);
    } else {
      payments = INITIAL_PAYMENTS;
    }
  } catch (e) {
    payments = INITIAL_PAYMENTS;
  }
  
  // Find matching records for the student
  const matches = payments.filter(p => {
    if (!p.studentName) return false;
    const pName = p.studentName.toLowerCase().trim();
    return pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName);
  });

  if (matches.length === 0) {
    return {
      hasOutstanding: false,
      totalTuition: 0,
      amountPaid: 0,
      balanceDue: 0,
      studentId: 'N/A',
      studentName,
      moduleTrack: 'General Ministry Studies',
      status: 'Paid In Full',
      lastPaymentDate: 'N/A',
      records: []
    };
  }

  const primary = matches[0];
  const totalTuition = matches.reduce((sum, r) => sum + (Number(r.totalTuition) || 0), 0);
  const amountPaid = matches.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);
  const balanceDue = Math.max(0, totalTuition - amountPaid);
  
  const isPaidInFull = matches.every(r => r.status === 'Paid In Full') || balanceDue <= 0;

  return {
    hasOutstanding: balanceDue > 0 && !isPaidInFull,
    totalTuition,
    amountPaid,
    balanceDue,
    studentId: primary.studentId || 'N/A',
    studentName: primary.studentName || studentName,
    moduleTrack: primary.moduleTrack || 'Active Ministry Module',
    status: primary.status || (balanceDue > 0 ? 'Partial' : 'Paid In Full'),
    lastPaymentDate: primary.lastPaymentDate || 'N/A',
    records: matches
  };
}
