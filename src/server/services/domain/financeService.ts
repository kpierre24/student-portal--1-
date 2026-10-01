import crypto from 'crypto';
import { getServerSupabase, logAuditEvent } from '../supabaseServer';
import { logger } from '../../../lib/logger';
import { AuthenticatedUser } from '../../../types/rbac';
import {
  Invoice,
  InvoiceLine,
  Payment,
  PaymentAllocation,
  Refund,
  RefundAllocation,
  FinancialAdjustment,
  FinancialSummary,
  InvoiceInput,
  PaymentInput,
} from '../../../types/finance';

function isUuid(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Obtains the next sequence number formatted as PRE-YYYY-000001 (6 digits zero-padded)
 * 100% PostgreSQL-atomic. Removed COUNT + 1 and random document-number fallbacks.
 */
export async function getNextDatabaseSequenceNumber(
  type: 'invoice' | 'payment' | 'refund' | 'adjustment' | 'receipt',
  year: string = '2026',
  supabaseInstance?: any
): Promise<string> {
  const supabase = supabaseInstance || getServerSupabase();
  const prefixMap: Record<string, string> = {
    invoice: 'INV',
    payment: 'PAY',
    refund: 'REF',
    adjustment: 'ADJ',
    receipt: 'RCP',
  };
  const prefix = prefixMap[type] || type.toUpperCase().slice(0, 3);

  // Call the atomic PostgreSQL sequence generator RPC
  const { data, error } = await supabase.rpc('get_next_document_number', {
    p_type: type,
    p_year: year,
  });

  if (error || !data || typeof data !== 'string') {
    logger.error(`Database atomic sequence generation failed for type "${type}":`, error?.message || error);
    throw new Error(`Failed to generate atomic sequence number for ${type}: ${error?.message || 'Empty sequence value returned'}`);
  }

  return data;
}


export const financeService = {
  /**
   * Authoritative Core Calculation Engine:
   * Recomputes an invoice's financial ledger strictly on the server:
   *
   *   balance =
   *     invoice total
   *     - payments
   *     - approved adjustments
   *     + applicable charges
   *
   * where:
   *   invoice total = sum of invoice_lines
   *   payments = sum of completed payment_allocations - approved refund_allocations
   *   approved adjustments = sum of approved credits (discounts, scholarships, fee waivers)
   *   applicable charges = sum of approved charges (late fees, course fees)
   */
  async calculateAuthoritativeInvoiceFinancials(
    invoiceId: string,
    existingClient?: any
  ): Promise<FinancialSummary> {
    const supabase = existingClient || getServerSupabase();

    // 1. Query invoice header
    const { data: inv } = await supabase
      .from('invoices')
      .select('id, due_date, status, created_at')
      .eq('id', invoiceId)
      .maybeSingle();

    // 2. Query invoice lines
    const { data: dbLines } = await supabase
      .from('invoice_lines')
      .select('*')
      .eq('invoice_id', invoiceId);
    const lines: InvoiceLine[] = dbLines || [];

    const invoiceTotal = lines.reduce((acc: number, line: InvoiceLine) => {
      const lineTotal = Number(line.total_amount ?? (Number(line.quantity || 1) * Number(line.unit_amount || 0)));
      return acc + (isNaN(lineTotal) ? 0 : lineTotal);
    }, 0);

    // 3. Query payment allocations (completed payments only)
    const { data: dbAllocations } = await supabase
      .from('payment_allocations')
      .select(`
        *,
        payments (
          id,
          status,
          payment_date,
          payment_method,
          transaction_reference,
          deleted_at
        )
      `)
      .eq('invoice_id', invoiceId);

    const validAllocations: PaymentAllocation[] = (dbAllocations || []).filter((a: any) => {
      const p = Array.isArray(a.payments) ? a.payments[0] : a.payments;
      return p && p.status === 'completed' && !p.deleted_at;
    });

    const paymentsTotal = validAllocations.reduce((acc: number, a: PaymentAllocation) => {
      const amt = Number(a.allocated_amount || 0);
      return acc + (isNaN(amt) ? 0 : amt);
    }, 0);

    // 4. Query refund allocations (approved / processed only)
    const { data: dbRefundAllocations } = await supabase
      .from('refund_allocations')
      .select(`
        *,
        refunds (
          id,
          status,
          refund_date,
          amount
        )
      `)
      .eq('invoice_id', invoiceId);

    const validRefunds: RefundAllocation[] = (dbRefundAllocations || []).filter((ra: any) => {
      const r = Array.isArray(ra.refunds) ? ra.refunds[0] : ra.refunds;
      return r && (r.status === 'approved' || r.status === 'processed');
    });

    const refundsTotal = validRefunds.reduce((acc: number, ra: RefundAllocation) => {
      const amt = Number(ra.allocated_amount || 0);
      return acc + (isNaN(amt) ? 0 : amt);
    }, 0);

    // Effective payments applied to the invoice is payments minus refunds
    const netPayments = Math.max(0, paymentsTotal - refundsTotal);

    // 5. Query financial adjustments (only 'approved' status affects balance!)
    const { data: dbAdjustments } = await supabase
      .from('financial_adjustments')
      .select('*')
      .eq('invoice_id', invoiceId);

    const adjustments: FinancialAdjustment[] = dbAdjustments || [];
    const approvedAdjustmentsList = adjustments.filter((a: FinancialAdjustment) => a.status === 'approved');

    let discounts = 0;
    let scholarships = 0;
    let applicableCharges = 0;

    approvedAdjustmentsList.forEach((adj: FinancialAdjustment) => {
      const amt = Number(adj.amount || 0);
      if (isNaN(amt) || amt <= 0) return;

      if (adj.is_charge === true || adj.adjustment_type === 'applicable_charge' || adj.adjustment_type === 'late_fee' || adj.adjustment_type === 'administrative_charge') {
        applicableCharges += amt;
      } else if (adj.adjustment_type === 'scholarship') {
        scholarships += amt;
      } else {
        // discount, fee_waiver, administrative_credit
        discounts += amt;
      }
    });

    const approvedAdjustmentsTotal = discounts + scholarships;

    // Authoritative Formula:
    // balance = invoice total - payments - approved adjustments + applicable charges
    const netTuition = Math.max(0, (invoiceTotal + applicableCharges) - approvedAdjustmentsTotal);
    const balance = Math.max(0, (invoiceTotal + applicableCharges) - netPayments - approvedAdjustmentsTotal);

    // Calculate effective status
    let effectiveStatus: FinancialSummary['status'] = 'Unpaid';
    const dueDate = inv?.due_date ? new Date(inv.due_date) : null;
    const now = new Date();

    if (balance <= 0) {
      effectiveStatus = 'Paid';
    } else if (netPayments > 0 || approvedAdjustmentsTotal > 0) {
      effectiveStatus = 'Partially Paid';
    } else if (dueDate && dueDate < now) {
      effectiveStatus = 'Past Due';
    } else {
      effectiveStatus = 'Unpaid';
    }

    // Synchronize the server-calculated values back into the invoices cache columns
    try {
      await supabase
        .from('invoices')
        .update({
          total_amount: invoiceTotal,
          net_amount: netTuition,
          paid_amount: netPayments,
          balance_due: balance,
          discounts,
          scholarships,
          refunds: refundsTotal,
          adjustments: applicableCharges,
          status: effectiveStatus === 'Paid' ? 'paid' : effectiveStatus === 'Partially Paid' ? 'partially_paid' : effectiveStatus === 'Past Due' ? 'overdue' : 'unpaid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);
    } catch (err: any) {
      logger.warn(`Could not update invoice cache for ${invoiceId}:`, err.message);
    }

    return {
      invoiceTotal,
      applicableCharges,
      paymentsTotal,
      refundsTotal,
      netPayments,
      discounts,
      scholarships,
      approvedAdjustments: approvedAdjustmentsTotal,
      netTuition,
      balance,
      status: effectiveStatus,
      lines,
      allocations: validAllocations,
      refundAllocations: validRefunds,
      adjustments,
    };
  },

  /**
   * Retrieves invoices from relational invoices table.
   * Derives all totals dynamically on the server from lines, allocations, refunds, and adjustments.
   */
  async getInvoices(
    filters?: { studentId?: string; studentName?: string } | string,
    user?: AuthenticatedUser
  ): Promise<{ invoices: any[]; total: number }> {
    const supabase = getServerSupabase();
    const filterObj = typeof filters === 'string' ? { studentName: filters } : filters;

    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          students (
            id,
            student_number,
            cohort_level,
            profiles (
              first_name,
              last_name,
              phone
            ),
            users (
              email
            )
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (user && user.role === 'student') {
        const studentUuid = user.studentRecordId || user.userId;
        if (studentUuid) {
          query = query.eq('student_id', studentUuid);
        }
      } else if (filterObj?.studentId) {
        query = query.eq('student_id', filterObj.studentId);
      }

      const { data: dbInvoices, error } = await query;

      if (dbInvoices && dbInvoices.length > 0) {
        const invoiceIds = dbInvoices.map((inv: any) => inv.id);

        // Batch fetch children for all invoices to eliminate N+1 database queries entirely
        const [
          { data: allLines },
          { data: allAllocations },
          { data: allRefundAllocations },
          { data: allAdjustments }
        ] = await Promise.all([
          supabase.from('invoice_lines').select('*').in('invoice_id', invoiceIds),
          supabase.from('payment_allocations').select(`
            *,
            payments (
              id,
              status,
              payment_date,
              payment_method,
              transaction_reference,
              deleted_at
            )
          `).in('invoice_id', invoiceIds),
          supabase.from('refund_allocations').select(`
            *,
            refunds (
              id,
              status,
              refund_date,
              amount
            )
          `).in('invoice_id', invoiceIds),
          supabase.from('financial_adjustments').select('*').in('invoice_id', invoiceIds)
        ]);

        // Group lines by invoice_id
        const linesMap = new Map<string, any[]>();
        (allLines || []).forEach((line: any) => {
          const list = linesMap.get(line.invoice_id) || [];
          list.push(line);
          linesMap.set(line.invoice_id, list);
        });

        // Group payment allocations by invoice_id
        const allocationsMap = new Map<string, any[]>();
        (allAllocations || []).forEach((alloc: any) => {
          const list = allocationsMap.get(alloc.invoice_id) || [];
          list.push(alloc);
          allocationsMap.set(alloc.invoice_id, list);
        });

        // Group refund allocations by invoice_id
        const refundAllocationsMap = new Map<string, any[]>();
        (allRefundAllocations || []).forEach((ra: any) => {
          const list = refundAllocationsMap.get(ra.invoice_id) || [];
          list.push(ra);
          refundAllocationsMap.set(ra.invoice_id, list);
        });

        // Group adjustments by invoice_id
        const adjustmentsMap = new Map<string, any[]>();
        (allAdjustments || []).forEach((adj: any) => {
          const list = adjustmentsMap.get(adj.invoice_id) || [];
          list.push(adj);
          adjustmentsMap.set(adj.invoice_id, list);
        });

        // Hydrate and calculate totals in memory with O(N) execution time
        const formatted = dbInvoices.map((inv: any) => {
          const std = inv.students;
          const prof = Array.isArray(std?.profiles) ? std?.profiles[0] : std?.profiles;
          const userObj = Array.isArray(std?.users) ? std?.users[0] : std?.users;
          const name = prof
            ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim()
            : (inv.student_name || 'Student');

          const lines = linesMap.get(inv.id) || [];
          const allocations = allocationsMap.get(inv.id) || [];
          const refundAllocations = refundAllocationsMap.get(inv.id) || [];
          const adjustments = adjustmentsMap.get(inv.id) || [];

          // 1. Calculate invoiceTotal
          const invoiceTotal = lines.reduce((acc: number, line: any) => {
            const lineTotal = Number(line.total_amount ?? (Number(line.quantity || 1) * Number(line.unit_amount || 0)));
            return acc + (isNaN(lineTotal) ? 0 : lineTotal);
          }, 0);

          // 2. Calculate validAllocations & paymentsTotal
          const validAllocations = allocations.filter((a: any) => {
            const p = Array.isArray(a.payments) ? a.payments[0] : a.payments;
            return p && p.status === 'completed' && !p.deleted_at;
          });
          const paymentsTotal = validAllocations.reduce((acc: number, a: any) => {
            const amt = Number(a.allocated_amount || 0);
            return acc + (isNaN(amt) ? 0 : amt);
          }, 0);

          // 3. Calculate validRefunds & refundsTotal
          const validRefunds = refundAllocations.filter((ra: any) => {
            const r = Array.isArray(ra.refunds) ? ra.refunds[0] : ra.refunds;
            return r && (r.status === 'approved' || r.status === 'processed');
          });
          const refundsTotal = validRefunds.reduce((acc: number, ra: any) => {
            const amt = Number(ra.allocated_amount || 0);
            return acc + (isNaN(amt) ? 0 : amt);
          }, 0);

          // Effective payments
          const netPayments = Math.max(0, paymentsTotal - refundsTotal);

          // 4. Calculate adjustments
          const approvedAdjustmentsList = adjustments.filter((a: any) => a.status === 'approved');
          let discounts = 0;
          let scholarships = 0;
          let applicableCharges = 0;

          approvedAdjustmentsList.forEach((adj: any) => {
            const amt = Number(adj.amount || 0);
            if (isNaN(amt) || amt <= 0) return;

            if (adj.is_charge === true || adj.adjustment_type === 'applicable_charge' || adj.adjustment_type === 'late_fee' || adj.adjustment_type === 'administrative_charge') {
              applicableCharges += amt;
            } else if (adj.adjustment_type === 'scholarship') {
              scholarships += amt;
            } else {
              discounts += amt;
            }
          });

          const approvedAdjustments = discounts + scholarships;
          const netTuition = Math.max(0, (invoiceTotal + applicableCharges) - approvedAdjustments);
          const balance = Math.max(0, (invoiceTotal + applicableCharges) - netPayments - approvedAdjustments);

          // Status calculation
          let effectiveStatus = 'Unpaid';
          const dueDate = inv.due_date ? new Date(inv.due_date) : null;
          const now = new Date();

          if (balance <= 0) {
            effectiveStatus = 'Paid';
          } else if (netPayments > 0 || approvedAdjustments > 0) {
            effectiveStatus = 'Partially Paid';
          } else if (dueDate && dueDate < now) {
            effectiveStatus = 'Past Due';
          } else {
            effectiveStatus = 'Unpaid';
          }

          return {
            id: inv.id,
            invoiceNumber: inv.invoice_number || inv.id,
            studentId: inv.student_id,
            student: {
              id: inv.student_id,
              name,
              email: userObj?.email || '',
              phone: prof?.phone || '',
            },
            studentName: name,
            email: userObj?.email || '',
            phone: prof?.phone || '',
            moduleTrack: inv.module_track || 'Core Ministry Curriculum',
            term: inv.term || '2026 Semester 1',
            academicYear: inv.academic_year || '2026-2027',
            issueDate: inv.issue_date || inv.created_at?.split('T')[0],
            dueDate: inv.due_date,
            lines,
            allocations: validAllocations,
            refundAllocations: validRefunds,
            adjustmentsList: adjustments,
            totalTuition: invoiceTotal,
            applicableCharges,
            discounts,
            scholarships,
            refunds: refundsTotal,
            adjustments: applicableCharges,
            netTuition,
            amountPaid: netPayments,
            outstandingBalance: balance,
            status: effectiveStatus,
            paymentPlan: inv.payment_plan || 'Monthly Installments',
            notes: inv.notes || '',
            createdAt: inv.created_at,
            updatedAt: inv.updated_at,
          };
        });

        let result = formatted;
        if (user && (user.role === 'teacher' || user.role === 'lecturer')) {
          // Lecturers/Teachers have no authorization to view financial records
          return { invoices: [], total: 0 };
        } else if (user && user.role === 'student') {
          // Use only UUID-typed identifiers; never mix in studentNumber (registration code)
          const studentUuid = user.studentRecordId || user.userId;
          const userUuid = user.userId || user.id;
          result = formatted.filter(
            (i) => (i.studentId && (i.studentId === studentUuid || i.studentId === userUuid)) ||
                   (i.student?.id && (i.student.id === studentUuid || i.student.id === userUuid)) ||
                   ((i as any).student_id && ((i as any).student_id === studentUuid || (i as any).student_id === userUuid))
          );
        } else if (filterObj?.studentId) {
          result = formatted.filter((i) => i.studentId === filterObj.studentId || (i as any).student_id === filterObj.studentId);
        }

        return { invoices: result, total: result.length };
      }

      return { invoices: [], total: 0 };
    } catch (err) {
      logger.error('Error fetching invoices from relational table:', err);
      return { invoices: [], total: 0 };
    }
  },

  /**
   * Creates or updates a tuition invoice in the relational invoices and invoice_lines tables.
   *
   * CRITICAL SECURITY DIRECTIVE:
   * Rejects / strips client-submitted `totalTuition`, `amountPaid`, `discount`, `refund`, and `balance`.
   * The server calculates all totals from `invoice_lines`, allocations, and approved adjustments.
   */
  async saveInvoice(
    invoiceInput: any,
    actorUserId?: string,
    actorRole?: string
  ): Promise<{ status: string; invoice: any }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    try {
      // 1. Strictly strip and ignore client-submitted authoritative values
      const {
        totalTuition: _ignoredTotal,
        amountPaid: _ignoredPaid,
        discount: _ignoredDiscount,
        discounts: _ignoredDiscounts,
        scholarships: _ignoredScholarships,
        refund: _ignoredRefund,
        refunds: _ignoredRefunds,
        balance: _ignoredBalance,
        outstandingBalance: _ignoredOutstanding,
        netTuition: _ignoredNet,
        ...safePayload
      } = invoiceInput;

      // 2. Resolve or fallback student ID
      let studentId = safePayload.studentId;
      let studentName = safePayload.studentName || 'Student';

      if (!studentId && studentName) {
        const parts = studentName.trim().split(' ');
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_id, students(id)')
          .ilike('first_name', parts[0])
          .maybeSingle();
        if (prof?.students && prof.students[0]?.id) {
          studentId = prof.students[0].id;
        }
      }

      if (!studentId) {
        const { data: std } = await supabase.from('students').select('id').limit(1).maybeSingle();
        studentId = std?.id;
      }

      const invoiceId = (safePayload.id && isUuid(safePayload.id)) ? safePayload.id : crypto.randomUUID();
      const invoiceNumber = safePayload.invoiceNumber || await getNextDatabaseSequenceNumber('invoice', '2026', supabase);

      // 3. Prepare Invoice Header payload
      const invoiceHeader = {
        id: invoiceId,
        invoice_number: invoiceNumber,
        student_id: studentId,
        student_name: studentName,
        module_track: safePayload.moduleTrack || 'Core Ministry Curriculum',
        term: safePayload.term || '2026 Semester 1',
        academic_year: safePayload.academicYear || '2026-2027',
        due_date: safePayload.dueDate || '2026-05-15',
        payment_plan: safePayload.paymentPlan || 'Monthly Installments',
        notes: safePayload.notes || '',
      };

      // 4. Prepare Line Items
      let inputLines: any[] = Array.isArray(safePayload.lines) && safePayload.lines.length > 0
        ? safePayload.lines
        : [
            {
              lineType: 'tuition',
              description: safePayload.notes || 'Core Ministry Curriculum Tuition',
              quantity: 1,
              unitAmount: 750.00,
            },
          ];

      const linesToInsert = inputLines.map((l) => {
        const qty = Number(l.quantity || 1);
        const unit = Number(l.unitAmount || 0);
        return {
          id: (l.id && isUuid(l.id)) ? l.id : crypto.randomUUID(),
          line_type: l.lineType || 'tuition',
          description: l.description || 'Curriculum Tuition',
          quantity: qty,
          unit_amount: unit,
          total_amount: Math.round(qty * unit * 100) / 100,
        };
      });

      const totalTuition = linesToInsert.reduce((sum, l) => sum + l.total_amount, 0);
      
      const auditLogPayload = {
        audit_id: crypto.randomUUID(),
        actor_user_id: actorUserId || null,
        actor_role: actorRole || 'finance_officer',
        entity_type: 'invoice',
        entity_id: invoiceId,
        action: 'create',
        new_values: {
          invoiceId,
          studentId,
          invoiceTotal: totalTuition,
          balance: totalTuition,
          linesCount: linesToInsert.length,
        },
        changed_fields: ['invoiceTotal', 'balance', 'lines'],
        reason: `Tuition invoice created for ${studentName}`,
      };

      // Execute atomic transaction via database RPC
      const { error: txnErr } = await supabase.rpc('create_invoice_transaction', {
        p_invoice: invoiceHeader,
        p_lines: linesToInsert,
        p_audit_log: auditLogPayload
      });

      if (txnErr) {
        logger.error('Invoice creation transaction failed:', txnErr.message);
        throw new Error(`Failed to save invoice via atomic transaction: ${txnErr.message}`);
      }

      // 5. Run Server Calculation Engine to compute authoritative balance
      const summary = await financeService.calculateAuthoritativeInvoiceFinancials(invoiceId, supabase);

      return {
        status: 'saved',
        invoice: {
          ...safePayload,
          id: invoiceId,
          invoiceNumber: invoiceHeader.invoice_number,
          studentId,
          studentName,
          lines: summary.lines,
          totalTuition: summary.invoiceTotal,
          applicableCharges: summary.applicableCharges,
          discounts: summary.discounts,
          scholarships: summary.scholarships,
          refunds: summary.refundsTotal,
          adjustments: summary.applicableCharges,
          netTuition: summary.netTuition,
          amountPaid: summary.netPayments,
          outstandingBalance: summary.balance,
          status: summary.status,
          dueDate: invoiceHeader.due_date,
          updatedAt: timestamp,
        },
      };
    } catch (err: any) {
      logger.error('Error saving invoice in financial architecture:', err);
      throw err;
    }
  },

  /**
   * Retrieves payments and transactions from relational payments table with allocations.
   */
  async getTransactions(
    filters?: { invoiceId?: string; studentId?: string; studentName?: string },
    user?: AuthenticatedUser
  ): Promise<{ transactions: any[]; total: number }> {
    const supabase = getServerSupabase();

    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          students (
            id,
            student_number,
            profiles (
              first_name,
              last_name
            )
          ),
          payment_allocations (
            id,
            invoice_id,
            allocated_amount,
            notes
          )
        `)
        .is('deleted_at', null)
        .order('payment_date', { ascending: false });

      if (user && user.role === 'student') {
        const studentUuid = user.studentRecordId || user.userId;
        if (studentUuid) {
          query = query.eq('student_id', studentUuid);
        }
      } else if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }

      const { data: dbPayments } = await query;

      if (dbPayments && dbPayments.length > 0) {
        const formatted = dbPayments.map((p: any) => {
          const std = p.students;
          const prof = Array.isArray(std?.profiles) ? std?.profiles[0] : std?.profiles;
          const studentName = prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : (p.student_name || 'Student');
          const allocations = Array.isArray(p.payment_allocations) ? p.payment_allocations : [];

          // Primary invoiceId from first allocation or legacy field
          const primaryInvoiceId = allocations[0]?.invoice_id || p.invoice_id || '';

          return {
            id: p.id,
            transactionId: p.transaction_reference || p.id,
            invoiceId: primaryInvoiceId,
            allocations,
            studentId: p.student_id,
            student: {
              id: p.student_id,
              name: studentName,
            },
            studentName,
            amount: Number(p.amount || 0),
            date: p.payment_date,
            method: p.payment_method || 'Bank Transfer',
            status: p.status === 'completed' ? 'Completed' : 'Pending',
            reference: p.transaction_reference || '',
            notes: p.notes || '',
            createdAt: p.created_at,
          };
        });

        let result = formatted;
        if (user && (user.role === 'teacher' || user.role === 'lecturer')) {
          // Lecturers/Teachers have no authorization to view transaction ledgers
          return { transactions: [], total: 0 };
        } else if (user && user.role === 'student') {
          // Use only UUID-typed identifiers; never mix in studentNumber (registration code)
          const studentUuid = user.studentRecordId || user.userId;
          const userUuid = user.userId || user.id;
          result = formatted.filter(
            (t) => (t.studentId && (t.studentId === studentUuid || t.studentId === userUuid)) ||
                   (t.student?.id && (t.student.id === studentUuid || t.student.id === userUuid)) ||
                   ((t as any).student_id && ((t as any).student_id === studentUuid || (t as any).student_id === userUuid))
          );
        } else if (filters?.studentId) {
          result = formatted.filter((t) => t.studentId === filters.studentId || (t as any).student_id === filters.studentId);
        }

        return { transactions: result, total: result.length };
      }
    } catch (err) {
      logger.error('Error fetching transactions from relational table:', err);
    }

    return { transactions: [], total: 0 };
  },

  /**
   * Records a payment transaction with explicit payment allocations:
   * payment -> payment_allocation
   * Recomputes the affected invoices' balance server-side.
   */
  async recordPayment(
    paymentInput: any,
    actorUserId?: string,
    actorRole?: string
  ): Promise<{ status: string; payment: any; updatedInvoices?: any[] }> {
    // Validate cheap input constraints before acquiring any privileged resources
    const amount = Number(paymentInput.amount || 0);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    try {

      // Resolve student
      let studentId = paymentInput.studentId;
      let studentName = paymentInput.studentName || 'Student';

      if (!studentId && studentName) {
        const parts = studentName.trim().split(' ');
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_id, students(id)')
          .ilike('first_name', parts[0])
          .maybeSingle();
        if (prof?.students && prof.students[0]?.id) {
          studentId = prof.students[0].id;
        }
      }

      const paymentId = (paymentInput.id && isUuid(paymentInput.id)) ? paymentInput.id : crypto.randomUUID();
      const paymentNumber = paymentInput.paymentNumber || await getNextDatabaseSequenceNumber('payment', '2026', supabase);
      const reference = paymentInput.reference || paymentInput.transactionReference || paymentNumber;

      // 1. Prepare payment payload
      const paymentPayload = {
        id: paymentId,
        payment_number: paymentNumber,
        receipt_number: paymentNumber,
        invoice_id: paymentInput.invoiceId || null,
        student_id: studentId,
        student_name: studentName,
        amount,
        payment_method: (paymentInput.paymentMethod || paymentInput.method || 'Bank Transfer').toLowerCase().replace(/\s+/g, '_'),
        transaction_reference: reference,
        payment_date: paymentInput.paymentDate || paymentInput.date || timestamp.split('T')[0],
        status: 'completed',
        notes: paymentInput.notes || '',
        recorded_by_user_id: actorUserId || null,
      };

      // 2. Prepare Payment Allocations
      const targetInvoiceIds: string[] = [];
      const allocationsToInsert: any[] = [];

      if (Array.isArray(paymentInput.allocations) && paymentInput.allocations.length > 0) {
        paymentInput.allocations.forEach((alloc: any) => {
          if (alloc.invoiceId && Number(alloc.amount || alloc.allocatedAmount) > 0) {
            targetInvoiceIds.push(alloc.invoiceId);
            allocationsToInsert.push({
              id: (alloc.id && isUuid(alloc.id)) ? alloc.id : crypto.randomUUID(),
              invoice_id: alloc.invoiceId,
              allocated_amount: Number(alloc.amount || alloc.allocatedAmount),
              notes: alloc.notes || paymentInput.notes || 'Tuition payment allocation',
            });
          }
        });
      } else if (paymentInput.invoiceId) {
        targetInvoiceIds.push(paymentInput.invoiceId);
        allocationsToInsert.push({
          id: crypto.randomUUID(),
          invoice_id: paymentInput.invoiceId,
          allocated_amount: amount,
          notes: paymentInput.notes || 'Direct invoice payment allocation',
        });
      }

      // 3. Prepare Audit Log payload
      const auditLogPayload = {
        audit_id: crypto.randomUUID(),
        actor_user_id: actorUserId || null,
        actor_role: actorRole || 'finance_officer',
        entity_type: 'payment',
        entity_id: paymentId,
        action: 'create',
        new_values: {
          paymentId,
          amount,
          targetInvoiceIds,
          allocationsCount: allocationsToInsert.length,
          studentName,
        },
        changed_fields: ['amount', 'status', 'allocations'],
        reason: `Payment of $${amount} recorded for ${studentName}`,
      };

      // Execute atomic transaction via database RPC
      const { error: txnErr } = await supabase.rpc('create_payment_transaction', {
        p_payment: paymentPayload,
        p_allocations: allocationsToInsert,
        p_audit_log: auditLogPayload
      });

      if (txnErr) {
        logger.error('Payment creation transaction failed:', txnErr.message);
        throw new Error(`Failed to record payment via atomic transaction: ${txnErr.message}`);
      }

      // 4. Recalculate Authoritative Balances for each affected invoice
      const updatedInvoices: any[] = [];
      for (const invId of targetInvoiceIds) {
        const summary = await financeService.calculateAuthoritativeInvoiceFinancials(invId, supabase);
        updatedInvoices.push({
          invoiceId: invId,
          balance: summary.balance,
          amountPaid: summary.netPayments,
          status: summary.status,
        });
      }

      return {
        status: 'recorded',
        payment: {
          ...paymentInput,
          id: paymentId,
          allocations: allocationsToInsert,
        },
        updatedInvoices,
      };
    } catch (err: any) {
      logger.error('Error recording payment in financial architecture:', err);
      throw err;
    }
  },

  /**
   * Applies a financial adjustment:
   * financial_adjustment
   * Recomputes balance: balance = invoice total - payments - approved adjustments + applicable charges
   */
  async applyFinancialAdjustment(
    adjInput: any,
    actorUserId?: string,
    actorRole?: string
  ): Promise<{ status: string; adjustment: any; updatedInvoice?: any }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    try {
      const amount = Number(adjInput.amount || 0);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Adjustment amount must be greater than zero');
      }

      const invoiceId = adjInput.invoiceId;
      if (!invoiceId) {
        throw new Error('invoiceId is required for financial adjustment');
      }

      const adjType = adjInput.type || adjInput.adjustmentType || 'adjustment';
      const isCharge = adjInput.isCharge === true || adjType === 'applicable_charge' || adjType === 'late_fee' || adjType === 'administrative_charge';
      const status = adjInput.status || 'approved'; // Only 'approved' adjustments alter balance!

      const adjId = (adjInput.id && isUuid(adjInput.id)) ? adjInput.id : crypto.randomUUID();
      const adjustmentNumber = adjInput.adjustmentNumber || await getNextDatabaseSequenceNumber('adjustment', '2026', supabase);

      const adjustmentPayload = {
        id: adjId,
        adjustment_number: adjustmentNumber,
        invoice_id: invoiceId,
        student_id: adjInput.studentId || null,
        student_name: adjInput.studentName || 'Student',
        adjustment_type: adjType,
        is_charge: isCharge,
        amount,
        status,
        category_name: adjInput.categoryName || adjInput.category || 'Institutional Adjustment',
        reason: adjInput.reason || adjInput.notes || '',
        receipt_or_doc_ref: adjInput.receiptOrDocRef || '',
        authorized_by: adjInput.authorizedBy || actorUserId || 'Finance Admin',
        applied_date: adjInput.appliedDate || timestamp.split('T')[0],
        notes: adjInput.notes || '',
        updated_at: timestamp,
      };

      const auditLogPayload = {
        audit_id: crypto.randomUUID(),
        actor_user_id: actorUserId || null,
        actor_role: actorRole || 'finance_officer',
        entity_type: 'adjustment',
        entity_id: adjId,
        action: 'create',
        new_values: {
          adjId,
          invoiceId,
          type: adjType,
          amount,
          isCharge,
          status,
        },
        changed_fields: ['amount', 'status', 'balance'],
        reason: adjInput.reason || `Financial adjustment of $${amount} applied to invoice ${invoiceId}`,
      };

      const { error: txnErr } = await supabase.rpc('create_adjustment_transaction', {
        p_adj: adjustmentPayload,
        p_audit_log: auditLogPayload
      });

      if (txnErr) {
        logger.error('Adjustment transaction failed:', txnErr.message);
        throw new Error(`Failed to apply financial adjustment via atomic transaction: ${txnErr.message}`);
      }

      // Recompute invoice balance authoritatively
      const summary = await financeService.calculateAuthoritativeInvoiceFinancials(invoiceId, supabase);

      return {
        status: 'applied',
        adjustment: adjustmentPayload,
        updatedInvoice: {
          id: invoiceId,
          totalTuition: summary.invoiceTotal,
          applicableCharges: summary.applicableCharges,
          discounts: summary.discounts,
          scholarships: summary.scholarships,
          refunds: summary.refundsTotal,
          amountPaid: summary.netPayments,
          outstandingBalance: summary.balance,
          status: summary.status,
        },
      };
    } catch (err: any) {
      logger.error('Error applying financial adjustment in financial architecture:', err);
      throw err;
    }
  },

  /**
   * Records a refund with explicit refund allocations:
   * refund -> refund_allocation
   * Refunds reduce net payments, increasing outstanding balance accordingly.
   */
  async recordRefund(
    refundInput: any,
    actorUserId?: string,
    actorRole?: string
  ): Promise<{ status: string; refund: any; updatedInvoices?: any[] }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    try {
      const amount = Number(refundInput.amount || 0);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Refund amount must be greater than zero');
      }

      const refundId = (refundInput.id && isUuid(refundInput.id)) ? refundInput.id : crypto.randomUUID();
      const refundNumber = refundInput.refundNumber || await getNextDatabaseSequenceNumber('refund', '2026', supabase);

      // 1. Prepare Refund Payload
      const refundPayload = {
        id: refundId,
        refund_number: refundNumber,
        payment_id: refundInput.paymentId || null,
        student_id: refundInput.studentId || null,
        student_name: refundInput.studentName || 'Student',
        amount,
        reason: refundInput.reason || 'Tuition Overpayment / Course Drop',
        status: refundInput.status || 'approved',
        refund_date: refundInput.refundDate || timestamp.split('T')[0],
        approved_by_user_id: actorUserId || refundInput.approvedBy || 'Finance Bursar',
        notes: refundInput.notes || '',
      };

      // 2. Prepare Refund Allocations
      const targetInvoiceIds: string[] = [];
      const allocationsToInsert: any[] = [];

      if (Array.isArray(refundInput.allocations) && refundInput.allocations.length > 0) {
        refundInput.allocations.forEach((alloc: any) => {
          if (alloc.invoiceId && Number(alloc.amount || alloc.allocatedAmount) > 0) {
            targetInvoiceIds.push(alloc.invoiceId);
            allocationsToInsert.push({
              id: (alloc.id && isUuid(alloc.id)) ? alloc.id : crypto.randomUUID(),
              invoice_id: alloc.invoiceId,
              payment_allocation_id: alloc.paymentAllocationId || null,
              allocated_amount: Number(alloc.amount || alloc.allocatedAmount),
            });
          }
        });
      } else if (refundInput.invoiceId) {
        targetInvoiceIds.push(refundInput.invoiceId);
        allocationsToInsert.push({
          id: crypto.randomUUID(),
          invoice_id: refundInput.invoiceId,
          allocated_amount: amount,
        });
      }

      // 3. Prepare Audit Log payload
      const auditLogPayload = {
        audit_id: crypto.randomUUID(),
        actor_user_id: actorUserId || null,
        actor_role: actorRole || 'finance_officer',
        entity_type: 'refund',
        entity_id: refundId,
        action: 'create',
        new_values: {
          refundId,
          amount,
          targetInvoiceIds,
        },
        changed_fields: ['amount', 'status', 'allocations'],
        reason: refundInput.reason || `Refund of $${amount} recorded`,
      };

      // Execute atomic transaction via database RPC
      const { error: txnErr } = await supabase.rpc('create_refund_transaction', {
        p_refund: refundPayload,
        p_allocations: allocationsToInsert,
        p_audit_log: auditLogPayload
      });

      if (txnErr) {
        logger.error('Refund creation transaction failed:', txnErr.message);
        throw new Error(`Failed to record refund via atomic transaction: ${txnErr.message}`);
      }

      // 4. Recalculate Authoritative Balances for each affected invoice
      const updatedInvoices: any[] = [];
      for (const invId of targetInvoiceIds) {
        const summary = await financeService.calculateAuthoritativeInvoiceFinancials(invId, supabase);
        updatedInvoices.push({
          invoiceId: invId,
          balance: summary.balance,
          amountPaid: summary.netPayments,
          refunds: summary.refundsTotal,
          status: summary.status,
        });
      }

      return {
        status: 'recorded',
        refund: {
          ...refundPayload,
          allocations: allocationsToInsert,
        },
        updatedInvoices,
      };
    } catch (err: any) {
      logger.error('Error recording refund in financial architecture:', err);
      throw err;
    }
  },

  /**
   * Retrieves financial adjustments.
   */
  async getAdjustments(
    filters?: { invoiceId?: string; studentId?: string },
    user?: AuthenticatedUser
  ): Promise<{ adjustments: any[]; total: number }> {
    const supabase = getServerSupabase();
    try {
      let query = supabase.from('financial_adjustments').select('*').order('applied_date', { ascending: false });

      if (filters?.invoiceId) {
        query = query.eq('invoice_id', filters.invoiceId);
      }
      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }

      const { data } = await query;
      const adjustments = data || [];

      if (user && user.role === 'student') {
        // Use only UUID-typed identifiers; never mix in studentNumber (registration code)
        const studentUuid = user.studentRecordId || user.userId;
        const userUuid = user.userId || user.id;
        const filtered = adjustments.filter(
          (a: any) => (a.student_id && (a.student_id === studentUuid || a.student_id === userUuid))
        );
        return { adjustments: filtered, total: filtered.length };
      }

      return { adjustments, total: adjustments.length };
    } catch (err) {
      logger.error('Error getting financial adjustments:', err);
      return { adjustments: [], total: 0 };
    }
  },

  /**
   * Retrieves refunds.
   */
  async getRefunds(
    filters?: { invoiceId?: string; studentId?: string },
    user?: AuthenticatedUser
  ): Promise<{ refunds: any[]; total: number }> {
    const supabase = getServerSupabase();
    try {
      let query = supabase
        .from('refunds')
        .select(`
          *,
          refund_allocations (*)
        `)
        .order('refund_date', { ascending: false });

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }

      const { data } = await query;
      const refunds = data || [];

      if (user && user.role === 'student') {
        // Use only UUID-typed identifiers; never mix in studentNumber (registration code)
        const studentUuid = user.studentRecordId || user.userId;
        const userUuid = user.userId || user.id;
        const filtered = refunds.filter(
          (r: any) => (r.student_id && (r.student_id === studentUuid || r.student_id === userUuid))
        );
        return { refunds: filtered, total: filtered.length };
      }

      return { refunds, total: refunds.length };
    } catch (err) {
      logger.error('Error getting refunds:', err);
      return { refunds: [], total: 0 };
    }
  },

  /**
   * Sequence generator for human-facing document numbers (e.g. INV-2026-000001)
   */
  async getNextSequenceNumber(
    type: 'invoice' | 'payment' | 'refund' | 'adjustment' | 'receipt',
    year: string = '2026'
  ): Promise<string> {
    return getNextDatabaseSequenceNumber(type, year);
  },
};
