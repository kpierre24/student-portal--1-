# Manual Tuition & Fees Management & React Key Disambiguation Plan

Transition the Tuition & Fees portal from Google Sheets synchronization to a fully manual, self-contained tuition and fees management experience with inline quick-edits and record modals, while eliminating duplicate key collision warnings across invoice and ledger renders.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following directions have been confirmed and will guide the implementation:

- **Confirmed Decision 1: Complete Removal of Tuition Google Sheet Sync**:
  - Remove "Sync from Google Sheets", "Sheet Settings", background tuition sync polling, and tuition-specific sheet modals from the Tuition & Fees tab.
  - The Google Sheets integration remains strictly isolated for attendance and student directory check-ins without polluting or overwriting manual tuition figures.
- **Confirmed Decision 2: Full Manual Editing Experience**:
  - Implement direct manual control: inline tuition and payment adjustment controls on the table rows, along with quick-entry modals for "Record Payment", "Edit Balance", and "Add Fee / Adjustment".
  - Instant ledger recalculation with local persistence via `safeStorage`.
- **Confirmed Decision 3: Fix React Duplicate Key Error (`7bda2678-2693-4c67-86a1-9de522e667cc`)**:
  - Sanitize and deduplicate loaded invoice, transaction, and receipt arrays so no duplicate entities with identical IDs coexist in memory or storage.
  - Make JSX list keys strictly compound and collision-proof (e.g. `key={`inv-${inv.id}-${idx}`}`) across invoice cards, invoice table rows, transactions, and receipts.

---

### 1. Overview & Core Concept

- **What It Does**: Shifts the Tuition & Fees ledger to an authoritative manual control system. School administrators and teachers can directly update tuition charges, enter payments, apply scholarships or discounts, edit student balances inline or via modals, and export financial summaries to CSV/PDF without external spreadsheet sync overwriting their manual figures.
- **Target Audience**: School administrators, financial bursars, and teachers managing student accounts.
- **Key Value**: Guarantees zero unexpected data overwrites from external sheets, gives fast 1-click manual editing, and eliminates React rendering key collision warnings.

---

### 2. User Experience & Visual Design

- **Tuition Header & Action Bar**:
  - Replace the "Sync from Google Sheets" and "Sheet Settings" buttons with prominent, high-utility manual actions:
    - **+ Record Payment**: Quick modal to log a check, cash, Zelle, card, or scholarship payment.
    - **+ Add Adjustment / Fee**: Quick modal to add a fee waiver, institutional discount, or special curriculum charge.
    - **Export CSV / Report**: Retain one-click financial audit report export.
    - **Installments & Scholarships**: Retain multi-phase installment schedule and scholarship allocation modals.
- **Invoice & Student Ledger Table**:
  - Clean, unboxed typography and clear tabular layout conforming to zero-pill guidelines.
  - **Inline Quick Edits**:
    - Allow rapid manual adjustments to Amount Paid or Total Tuition directly from the ledger row with auto-saving indicator.
    - Action buttons on each row: "Record Payment", "Adjust / Discount", "Print Receipt / Statement", and "Archive Student".
- **Visual Palette & Feedback**:
  - Tailwind emerald/slate theme tokens with high-contrast dark and light mode support.
  - Instant toast feedback on edits with instant undo capabilities.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Complete Decoupling of Tuition from Google Sheets**:
  - *Chosen Approach*: Completely remove tuition sheet sync triggers, hooks, and modals from `PaymentTab.tsx`. Keep attendance sheet sync intact in its respective attendance tab.
  - *Why*: Eliminates accidental data overwrites and removes confusing sync error states for financial staff who want authoritative manual ledger control.
  - *Alternatives Considered*: Retaining an optional tuition sync button was considered, but rejected per user confirmation to prevent accidental overwrites.
- **Decision 2: Comprehensive Key Collision Hardening**:
  - *Chosen Approach*: Both clean the underlying data arrays (deduplicating by ID and canonical student identity during `getInvoices` and state initialization) AND harden the JSX keys with compound indexes (`key={`inv-${inv.id || inv.invoiceNumber}-${idx}`}`).
  - *Why*: Ensures total resilience against legacy stored data or rapid state transitions where two entries might share a generated ID.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│               HTEIM School of Ministry                 │
│               Tuition & Fees Workspace                 │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│    Manual Action Bar        │ │    Authoritative Ledger     │
│ - Record Payment Modal      │ │ - 4 Live KPI Cards          │
│ - Add Fee / Adjustment      │ │ - Deduplicated Invoices     │
│ - Installment Manager       │ │ - Inline Balance Adjuster   │
│ - Export CSV / Audit Report │ │ - Transaction Receipts      │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │
               └───────────────┬───────────────┘
                               ▼
        ┌──────────────────────────────────────────────┐
        │       Authoritative Financial Engine         │
        │       (`src/lib/financialWorkflow.ts`)       │
        │ - Strict deduplication of Invoices/TXs       │
        │ - Real-time ledger recalculation             │
        │ - Zero-overwrite safeStorage persistence     │
        └──────────────────────────────────────────────┘
```

- **Execution Steps**:
  1. **Data Sanitization & Key Deduplication**:
     - Update `getInvoices`, `getTransactions`, and `getReceipts` in `src/lib/financialWorkflow.ts` and `src/features/finance/services/` to enforce strict uniqueness on `id`.
     - Update all JSX render loops in `src/components/PaymentTab.tsx` (cards view, desktop table view, transaction log, and receipts log) to use guaranteed unique composite keys.
  2. **Removal of Google Sheets Tuition Sync**:
     - Remove `GoogleSheetsTuitionModal` and its import from `src/components/PaymentTab.tsx`.
     - Remove the "Sync from Google Sheets" and "Sheet Settings" buttons from the toolbar.
     - Remove `tuitionSheetUrl`, `isTuitionLoading`, `lastTuitionSyncedTime`, and `fetchTuitionSpreadsheet` calls from `PaymentTab.tsx`.
  3. **Enhanced Manual Workflow Controls**:
     - Add inline balance/tuition editing and rapid-action buttons on the ledger rows.
     - Ensure all manual changes trigger `recalculateInvoiceLedger` and persist immediately via `safeStorage`.
  4. **Verification**:
     - Run `npx vitest run` to ensure all tests pass.
     - Run `npm run lint` (`tsc --noEmit && eslint .`).
     - Run `compile_applet` to verify clean build compilation.
