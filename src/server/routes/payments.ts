import { Router, Request, Response } from "express";
import { financeService } from "../services/domain";
import { requireAuth, requirePermission, requireResourceOwnership } from "../middleware/rbac";
import { logger } from "../../lib/logger";
import { validateBody } from "../middleware/validation";
import { RecordPaymentSchema, InvoiceSchema, AdjustmentSchema, RefundSchema } from "../schemas/finance.schema";

export const paymentsRouter = Router();

// Default-deny at the router level: All routes require authentication
paymentsRouter.use(requireAuth);

/**
 * GET /api/payments
 * Retrieves payments / transactions from relational database.
 * RBAC: Requires finance:read
 */
paymentsRouter.get(
  "/",
  requirePermission(["finance:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const invoiceId = (req.query.invoiceId as string) || undefined;
      const studentId = (req.query.studentId as string) || undefined;
      const studentName = (req.query.studentName as string) || undefined;

      const result = await financeService.getTransactions({ invoiceId, studentId, studentName }, user);

      return res.status(200).json({
        payments: result.transactions,
        transactions: result.transactions,
        total: result.total,
      });
    } catch (err: any) {
      logger.error("GET /api/payments error:", err);
      return res.status(500).json({ error: "Failed to fetch payments" });
    }
  }
);

/**
 * POST /api/payments
 * Records a payment transaction and allocates to invoices directly in relational tables.
 * RBAC: Requires finance:write
 */
paymentsRouter.post(
  "/",
  requirePermission(["finance:write", "all:access"]),
  requireResourceOwnership({
    getTarget: (req) => ({
      targetStudentId: (req.body.payment?.studentId || req.body.transaction?.studentId || req.body.studentId) as string,
    }),
    allowedRoles: ["super_admin", "admin", "finance_officer", "registrar"],
  }),
  async (req: Request, res: Response) => {
    try {
      const pmtPayload = req.body.transaction || req.body.payment || req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      if (!pmtPayload || (!pmtPayload.studentName && !pmtPayload.studentId) || !pmtPayload.amount) {
        return res.status(400).json({ error: "studentId or studentName, and amount are required" });
      }

      const result = await financeService.recordPayment(pmtPayload, actorUserId, actorRole);
      return res.status(201).json(result);
    } catch (err: any) {
      logger.error("POST /api/payments error:", err);
      return res.status(500).json({ error: err?.message || "Failed to record payment" });
    }
  }
);

/**
 * GET /api/payments/invoices

 * Retrieves invoices from relational invoices table.
 * Derived server-side from lines, allocations, refunds, and adjustments.
 * RBAC: Requires finance:read. Students can only view their own invoices.
 */
paymentsRouter.get(
  "/invoices",
  requirePermission(["finance:read", "all:access"]),
  requireResourceOwnership({
    getTarget: (req) => ({
      targetStudentId: (req.query.studentId as string) || undefined,
    }),
    allowedRoles: ["super_admin", "admin", "finance_officer", "registrar"],
  }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const studentId = (req.query.studentId as string) || undefined;
      const studentName = (req.query.studentName as string) || undefined;
      const result = await financeService.getInvoices({ studentId, studentName }, user);

      return res.status(200).json({
        invoices: result.invoices,
        total: result.total,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error("GET /api/payments/invoices error:", err);
      return res.status(500).json({ error: "Failed to fetch invoices" });
    }
  }
);

/**
 * POST /api/payments/invoices
 * Creates or updates an institutional tuition invoice.
 *
 * CRITICAL ARCHITECTURAL DIRECTIVE:
 * Does not allow client to submit totalTuition, amountPaid, discount, refund, or balance as authoritative.
 * Server calculates all values from lines, allocations, and approved adjustments.
 * RBAC: Requires finance:write
 */
paymentsRouter.post(
  "/invoices",
  requirePermission(["finance:write", "all:access"]),
  validateBody(InvoiceSchema),
  async (req: Request, res: Response) => {
    try {
      const { invoice } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      const result = await financeService.saveInvoice(invoice, actorUserId, actorRole);
      return res.status(201).json(result);
    } catch (err: any) {
      logger.error("POST /api/payments/invoices error:", err);
      return res.status(500).json({ error: "Failed to create invoice" });
    }
  }
);

/**
 * GET /api/payments/transactions
 * Retrieves payment transactions from relational payments table with allocations.
 * RBAC: Requires finance:read. Students only retrieve their own transactions.
 */
paymentsRouter.get(
  "/transactions",
  requirePermission(["finance:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const invoiceId = (req.query.invoiceId as string) || undefined;
      const studentId = (req.query.studentId as string) || undefined;
      const studentName = (req.query.studentName as string) || undefined;

      const result = await financeService.getTransactions({ invoiceId, studentId, studentName }, user);

      return res.status(200).json({
        transactions: result.transactions,
        total: result.total,
      });
    } catch (err: any) {
      logger.error("GET /api/payments/transactions error:", err);
      return res.status(500).json({ error: "Failed to fetch transactions" });
    }
  }
);

/**
 * POST /api/payments/transactions
 * Records an incoming institutional payment into relational tables and allocates to invoice(s).
 *
 * CRITICAL DIRECTIVE:
 * Client provides payment amount and optional allocations (payment -> payment_allocation).
 * Server recalculates authoritative invoice balance:
 *   balance = invoice total - payments - approved adjustments + applicable charges
 * RBAC: Requires finance:write
 */
paymentsRouter.post(
  "/transactions",
  requirePermission(["finance:write", "all:access"]),
  requireResourceOwnership({
    getTarget: (req) => ({
      targetStudentId: (req.body.payment?.studentId || req.body.transaction?.studentId) as string,
    }),
    allowedRoles: ["super_admin", "admin", "finance_officer", "registrar"],
  }),
  validateBody(RecordPaymentSchema),
  async (req: Request, res: Response) => {
    try {
      const { transaction, payment } = req.body;
      const pmtPayload = transaction || payment;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      if (!pmtPayload || (!pmtPayload.studentName && !pmtPayload.studentId) || !pmtPayload.amount) {
        return res.status(400).json({ error: "studentId or studentName, and amount are required" });
      }

      const result = await financeService.recordPayment(pmtPayload, actorUserId, actorRole);
      return res.status(201).json(result);
    } catch (err: any) {
      logger.error("POST /api/payments/transactions error:", err);
      return res.status(500).json({ error: "Failed to record payment" });
    }
  }
);

/**
 * GET /api/payments/adjustments
 * Retrieves financial adjustments.
 * RBAC: Requires finance:read
 */
paymentsRouter.get(
  "/adjustments",
  requirePermission(["finance:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const invoiceId = (req.query.invoiceId as string) || undefined;
      const studentId = (req.query.studentId as string) || undefined;

      const result = await financeService.getAdjustments({ invoiceId, studentId }, user);
      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("GET /api/payments/adjustments error:", err);
      return res.status(500).json({ error: "Failed to fetch adjustments" });
    }
  }
);

/**
 * POST /api/payments/adjustments
 * Applies a financial adjustment (scholarship, discount, fee waiver, applicable charge, late fee).
 * Recomputes invoice balance server-side.
 * RBAC: Requires finance:write
 */
paymentsRouter.post(
  "/adjustments",
  requirePermission(["finance:write", "all:access"]),
  validateBody(AdjustmentSchema),
  async (req: Request, res: Response) => {
    try {
      const { adjustment } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      const result = await financeService.applyFinancialAdjustment(adjustment, actorUserId, actorRole);
      return res.status(201).json(result);
    } catch (err: any) {
      logger.error("POST /api/payments/adjustments error:", err);
      return res.status(500).json({ error: "Failed to apply adjustment" });
    }
  }
);

/**
 * GET /api/payments/refunds
 * Retrieves refund records and their allocations.
 * RBAC: Requires finance:read
 */
paymentsRouter.get(
  "/refunds",
  requirePermission(["finance:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const invoiceId = (req.query.invoiceId as string) || undefined;
      const studentId = (req.query.studentId as string) || undefined;

      const result = await financeService.getRefunds({ invoiceId, studentId }, user);
      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("GET /api/payments/refunds error:", err);
      return res.status(500).json({ error: "Failed to fetch refunds" });
    }
  }
);

/**
 * POST /api/payments/refunds
 * Records a refund with refund_allocations (refund -> refund_allocation).
 * Reduces net payments, increasing balance accordingly.
 * RBAC: Requires finance:write
 */
paymentsRouter.post(
  "/refunds",
  requirePermission(["finance:write", "all:access"]),
  validateBody(RefundSchema),
  async (req: Request, res: Response) => {
    try {
      const { refund } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      const result = await financeService.recordRefund(refund, actorUserId, actorRole);
      return res.status(201).json(result);
    } catch (err: any) {
      logger.error("POST /api/payments/refunds error:", err);
      return res.status(500).json({ error: "Failed to record refund" });
    }
  }
);

/**
 * GET /api/payments/summary
 * Aggregates overall financial health metrics server-side.
 */
paymentsRouter.get(
  "/summary",
  requirePermission(["finance:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const invoicesRes = await financeService.getInvoices(undefined, user);
      const txsRes = await financeService.getTransactions(undefined, user);

      const totalBilled = invoicesRes.invoices.reduce((acc, i) => acc + (i.totalTuition || 0), 0);
      const totalCollected = txsRes.transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
      const totalOutstanding = invoicesRes.invoices.reduce((acc, i) => acc + (i.outstandingBalance || 0), 0);
      const pendingCount = invoicesRes.invoices.filter((i) => i.status !== "Paid").length;

      return res.status(200).json({
        totalPayments: txsRes.total,
        totalCollected,
        totalBilled,
        totalOutstanding,
        pendingCount,
        currency: "USD",
      });
    } catch (err: any) {
      logger.error("GET /api/payments/summary error:", err);
      return res.status(500).json({ error: "Failed to get payment summary" });
    }
  }
);

/**
 * GET /api/payments/sequence/next
 * Returns the next authoritative database sequence number (e.g. INV-2026-000001, PAY-2026-000001).
 */
paymentsRouter.get(
  "/sequence/next",
  requirePermission(["finance:read", "finance:write", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const type = (req.query.type as any) || "invoice";
      const year = (req.query.year as string) || "2026";
      const sequenceNumber = await financeService.getNextSequenceNumber(type, year);
      return res.status(200).json({ sequenceNumber });
    } catch (err: any) {
      logger.error("GET /api/payments/sequence/next error:", err);
      return res.status(500).json({ error: "Failed to generate sequence number" });
    }
  }
);

