import { UserRole } from '../../types/rbac';

export type TabType = 'home' | 'attendance' | 'students' | 'courses' | 'exams' | 'schedule' | 'library' | 'payments' | 'messages' | 'reports' | 'notes';

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName?: string;
  student?: {
    id: string;
    name: string;
    email?: string;
  };
  cohortId?: string;
  email?: string;
  phone?: string;
  moduleTrack: string;
  totalTuition: number;
  amountPaid: number;
  status: 'Paid In Full' | 'Partial' | 'Past Due' | 'Pending Review';
  lastPaymentDate: string;
  paymentMethod: 'Credit Card' | 'Bank Transfer' | 'Zelle' | 'Check' | 'Scholarship' | 'Cash' | 'PayPal' | 'Stripe';
  notes?: string;
  receiptUrl?: string;
  receiptName?: string;
  receiptNumber?: string;
  paymentPlan?: 'Monthly Installments' | 'Pay In Full' | 'Custom Schedule';
  isDemo?: boolean;
}

export type InvoiceLineType = 
  | 'tuition' 
  | 'mandatory_fee' 
  | 'registration' 
  | 'course_material' 
  | 'applicable_charge' 
  | 'technology_fee' 
  | 'other';

export interface InvoiceLine {
  id?: string;
  invoiceId?: string;
  lineType: InvoiceLineType;
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  createdAt?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  email?: string;
  phone?: string;
  moduleTrack: string;
  term: string;
  academicYear: string;
  issueDate: string;
  dueDate: string;
  lines: InvoiceLine[];
  totalTuition: number;
  discounts: number;
  scholarships: number;
  refunds: number;
  adjustments: number;
  applicableCharges?: number;
  netTuition: number;
  amountPaid: number;
  outstandingBalance: number;
  paymentPlan: string;
  status: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Past Due' | 'Void';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAllocation {
  id?: string;
  paymentId: string;
  invoiceId: string;
  allocatedAmount: number;
  notes?: string;
  createdAt?: string;
}

export interface PaymentTransaction {
  id: string;
  paymentNumber: string;
  invoiceId?: string;
  studentId: string;
  studentName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference: string;
  receiptNumber: string;
  status: 'Completed' | 'Pending' | 'Failed' | 'Void';
  allocations: PaymentAllocation[];
  notes?: string;
  recordedBy: string;
  reconciliationStatus?: 'Reconciled' | 'Discrepancy' | 'Unreconciled';
  reconciledAt?: string;
  reconciledBy?: string;
  depositBatchId?: string;
  createdAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  invoiceId: string;
  studentName: string;
  studentId: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference: string;
  issuedAt: string;
  issuedBy: string;
  academicTerm: string;
  courseOrModule: string;
  totalTuitionBilled: number;
  discountsAndScholarships: number;
  balanceRemaining: number;
  verificationCode: string;
  notes?: string;
}

export type FinancialAdjustmentType = 
  | 'discount' 
  | 'scholarship' 
  | 'refund' 
  | 'adjustment' 
  | 'fee_waiver' 
  | 'late_fee'
  | 'applicable_charge';

export interface FinancialAdjustment {
  id: string;
  adjustmentNumber?: string;
  invoiceId: string;
  studentId: string;
  studentName?: string;
  type: FinancialAdjustmentType;
  isCharge?: boolean;
  categoryName: string;
  amount: number;
  status?: 'approved' | 'pending' | 'rejected' | 'void';
  appliedDate: string;
  authorizedBy: string;
  notes?: string;
  receiptOrDocRef?: string;
  createdAt?: string;
}

export interface RefundAllocation {
  id?: string;
  refundId: string;
  invoiceId: string;
  paymentAllocationId?: string;
  allocatedAmount: number;
  createdAt?: string;
}

export interface RefundRecord {
  id: string;
  refundNumber: string;
  paymentId?: string;
  studentId: string;
  studentName?: string;
  amount: number;
  reason: string;
  status: 'approved' | 'pending' | 'processed' | 'void' | 'rejected';
  refundDate: string;
  approvedBy?: string;
  notes?: string;
  allocations?: RefundAllocation[];
  createdAt?: string;
}

export interface FinancialAuditLog {
  id: string;
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: string;
  studentId?: string;
  studentName?: string;
  entityId: string;
  entityType: 'invoice' | 'transaction' | 'adjustment' | 'refund' | 'payment_plan';
  amount?: number;
  details: string;
}
