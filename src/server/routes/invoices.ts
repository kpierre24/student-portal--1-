import { Router, Request, Response } from "express";
import { financeService } from "../services/domain";
import { requireAuth, requirePermission, requireResourceOwnership } from "../middleware/rbac";
import { getServerSupabase } from "../services/supabaseServer";
import { logger } from "../../lib/logger";
import { validateBody } from "../middleware/validation";
import { InvoiceSchema, AdjustmentSchema } from "../schemas/finance.schema";

export const invoicesRouter = Router();

// Default-deny at the router level: All routes require authentication
invoicesRouter.use(requireAuth);

/**
 * GET /api/invoices
 * Retrieves invoices from relational invoices table.
 * RBAC: Requires finance:read. Students can only view their own invoices.
 */
invoicesRouter.get(
  "/",
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
      logger.error("GET /api/invoices error:", err);
      return res.status(500).json({ error: "Failed to fetch invoices" });
    }
  }
);

/**
 * GET /api/invoices/:id
 * Retrieves a single invoice with line items, allocations, and adjustments.
 */
invoicesRouter.get(
  "/:id",
  requirePermission(["finance:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const invoiceId = req.params.id;
      const supabase = getServerSupabase();

      // Check if invoice exists in PostgreSQL database
      const { data: rawInvoice } = await supabase
        .from("invoices")
        .select("id, invoice_number, student_id")
        .or(`id.eq.${invoiceId},invoice_number.eq.${invoiceId}`)
        .is("deleted_at", null)
        .maybeSingle();

      if (!rawInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Enforce student resource ownership: Student A cannot access Student B's invoice
      if (user.role === "student") {
        const studentUuid = (user.studentRecordId || user.userId || "").toLowerCase().trim();
        const invoiceStudentId = (rawInvoice.student_id || "").toLowerCase().trim();
        if (invoiceStudentId && invoiceStudentId !== studentUuid) {
          logger.warn(`Student ${user.email} attempted to access invoice ${invoiceId} belonging to student ${rawInvoice.student_id}`);
          return res.status(403).json({
            error: "Access Denied: You do not have permission to view another student's invoice.",
            code: "RESOURCE_OWNERSHIP_DENIED"
          });
        }
      }

      const result = await financeService.getInvoices(undefined, user);
      const invoice = result.invoices.find((i: any) => i.id === invoiceId || i.invoiceNumber === invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      return res.status(200).json({ invoice });
    } catch (err: any) {
      logger.error(`GET /api/invoices/${req.params.id} error:`, err);
      return res.status(500).json({ error: "Failed to fetch invoice" });
    }
  }
);


/**
 * POST /api/invoices
 * Creates an institutional invoice with line items.
 * Server calculates authoritative totals and balance.
 * RBAC: Requires finance:write
 */
invoicesRouter.post(
  "/",
  requirePermission(["finance:write", "all:access"]),
  validateBody(InvoiceSchema),
  async (req: Request, res: Response) => {
    try {
      const invoicePayload = req.body?.invoice || req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      const result = await financeService.saveInvoice(invoicePayload, actorUserId, actorRole);
      return res.status(201).json(result);
    } catch (err: any) {
      logger.error("POST /api/invoices error:", err);
      return res.status(500).json({ error: err?.message || "Failed to create invoice" });
    }
  }
);

/**
 * PATCH /api/invoices/:id
 * Updates an existing invoice (due date, lines, status).
 * RBAC: Requires finance:write
 */
invoicesRouter.patch(
  "/:id",
  requirePermission(["finance:write", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const invoiceId = req.params.id;
      const invoicePayload = { ...(req.body?.invoice || req.body), id: invoiceId };
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      const result = await financeService.saveInvoice(invoicePayload, actorUserId, actorRole);
      return res.status(200).json(result);
    } catch (err: any) {
      logger.error(`PATCH /api/invoices/${req.params.id} error:`, err);
      return res.status(500).json({ error: err?.message || "Failed to update invoice" });
    }
  }
);

/**
 * POST /api/invoices/adjustments
 * Submits a financial adjustment (scholarship, discount, fee waiver).
 */
invoicesRouter.post(
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
      logger.error("POST /api/invoices/adjustments error:", err);
      return res.status(500).json({ error: err?.message || "Failed to record adjustment" });
    }
  }
);
