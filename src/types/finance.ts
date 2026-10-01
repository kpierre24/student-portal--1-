export interface InvoiceLine {
  id: string;
  invoice_id: string;
  line_type: 'tuition' | 'fee' | 'other';
  description: string;
  quantity: number;
  unit_amount: number;
  total_amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  student_id: string;
  student_name: string;
  module_track: string;
  term: string;
  academic_year: string;
  due_date: string;
  payment_plan: string;
  notes: string;
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Payment {
  id: string;
  payment_number: string;
  receipt_number: string;
  invoice_id: string | null;
  student_id: string;
  student_name: string;
  amount: number;
  payment_method: 'stripe' | 'card' | 'bank_transfer' | 'cash' | 'check' | 'scholarship' | 'other';
  transaction_reference: string;
  payment_date: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes: string;
  recorded_by_user_id: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  allocated_amount: number;
  notes: string;
}

export interface Refund {
  id: string;
  refund_number: string;
  payment_id: string | null;
  student_id: string;
  student_name: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  refund_date: string;
  approved_by_user_id: string;
  notes: string;
  created_at: string;
}

export interface RefundAllocation {
  id: string;
  refund_id: string;
  invoice_id: string;
  payment_allocation_id: string | null;
  allocated_amount: number;
}

export interface FinancialAdjustment {
  id: string;
  adjustment_number: string;
  invoice_id: string;
  student_id: string | null;
  student_name: string;
  adjustment_type: string;
  is_charge: boolean;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  category_name: string;
  reason: string;
  receipt_or_doc_ref: string;
  authorized_by: string;
  applied_date: string;
  notes: string;
  updated_at: string;
}

export interface FinancialSummary {
  invoiceTotal: number;
  applicableCharges: number;
  paymentsTotal: number;
  refundsTotal: number;
  netPayments: number;
  discounts: number;
  scholarships: number;
  approvedAdjustments: number;
  netTuition: number;
  balance: number;
  status: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Past Due' | 'Cancelled';
  lines: InvoiceLine[];
  allocations: PaymentAllocation[];
  refundAllocations: RefundAllocation[];
  adjustments: FinancialAdjustment[];
}

export interface InvoiceInput {
  id?: string;
  invoiceNumber?: string;
  studentId?: string;
  studentName?: string;
  moduleTrack?: string;
  term?: string;
  academicYear?: string;
  dueDate?: string;
  paymentPlan?: string;
  notes?: string;
  lines?: {
    id?: string;
    lineType?: string;
    description?: string;
    quantity?: number;
    unitAmount?: number;
  }[];
}

export interface PaymentInput {
  id?: string;
  invoiceId?: string;
  studentId?: string;
  studentName?: string;
  amount: number;
  paymentMethod: string;
  paymentDate?: string;
  transactionReference?: string;
  notes?: string;
  allocations?: {
    id?: string;
    invoiceId: string;
    amount: number;
    notes?: string;
  }[];
}
