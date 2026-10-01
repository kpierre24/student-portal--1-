import { z } from "zod";

export const RecordPaymentSchema = z.object({
  payment: z.object({
    invoiceId: z.string().uuid("Invalid UUID format for invoiceId"),
    amount: z.number()
      .positive("Amount must be a positive number")
      .refine((val) => val > 0, "Amount must be strictly greater than 0"),
    paymentMethod: z.enum([
      'stripe', 'card', 'bank_transfer', 'cash', 'check', 'scholarship', 'other'
    ]).refine(val => ['stripe', 'card', 'bank_transfer', 'cash', 'check', 'scholarship', 'other'].includes(val), {
      message: "Unsupported payment method"
    }),
    paymentDate: z.string().datetime({ message: "Invalid ISO date format for paymentDate" }),
    transactionReference: z.string().max(100, "Reference excessively long").optional(),
    studentId: z.string().uuid().optional(),
    studentName: z.string().optional(),
  }).strict().optional(),
  
  transaction: z.object({
    invoiceId: z.string().uuid("Invalid UUID format for invoiceId"),
    amount: z.number()
      .positive("Amount must be a positive number")
      .refine((val) => val > 0, "Amount must be strictly greater than 0"),
    paymentMethod: z.enum([
      'stripe', 'card', 'bank_transfer', 'cash', 'check', 'scholarship', 'other'
    ]).refine(val => ['stripe', 'card', 'bank_transfer', 'cash', 'check', 'scholarship', 'other'].includes(val), {
      message: "Unsupported payment method"
    }),
    paymentDate: z.string().datetime({ message: "Invalid ISO date format for paymentDate" }),
    transactionReference: z.string().max(100, "Reference excessively long").optional(),
    studentId: z.string().uuid().optional(),
    studentName: z.string().optional(),
  }).strict().optional(),
}).refine(data => data.payment !== undefined || data.transaction !== undefined, {
  message: "Request body must contain either 'payment' or 'transaction' object",
});

export const InvoiceSchema = z.object({
  invoice: z.object({
    studentId: z.string().uuid().optional(),
    studentName: z.string().optional(),
    moduleTrack: z.string().min(1),
    term: z.string().min(1),
    academicYear: z.string().min(1),
    dueDate: z.string().datetime(),
    lines: z.array(z.object({
      lineType: z.enum(['tuition', 'fee', 'other']),
      description: z.string().min(1),
      quantity: z.number().positive(),
      unitAmount: z.number().nonnegative(),
    })).min(1),
  }).strict(),
});

export const AdjustmentSchema = z.object({
  adjustment: z.object({
    invoiceId: z.string().uuid(),
    amount: z.number().positive(),
    adjustmentType: z.string().min(1),
    isCharge: z.boolean(),
    reason: z.string().min(1),
  }).strict(),
});

export const RefundSchema = z.object({
  refund: z.object({
    paymentId: z.string().uuid().optional(),
    invoiceId: z.string().uuid().optional(),
    amount: z.number().positive(),
    reason: z.string().min(1),
  }).strict(),
});
