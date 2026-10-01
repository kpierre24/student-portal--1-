# Strict State Architecture & Persistence Boundaries

**HTEIM School of Ministry Portal**

---

## The Three Core Axioms

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PostgreSQL (Supabase) = AUTHORITATIVE DATA               │
│    - Single source of truth for all business entities.      │
│    - Enforced via Express API & Domain Services.            │
├─────────────────────────────────────────────────────────────┤
│ 2. React State = UI STATE                                   │
│    - Modals, active tabs, filters, search terms, pagination │
│    - Optimistic mutations & temporary input states.         │
├─────────────────────────────────────────────────────────────┤
│ 3. localStorage = PREFERENCES & OFFLINE DRAFTS ONLY         │
│    - Theme (dark/light), locale, table column preferences   │
│    - Offline sync queue & transient offline cache fallback  │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. PostgreSQL = Authoritative Data

All business logic, record creation, grading, ledger updates, and calculations must query and persist directly to the PostgreSQL relational tables.

| Domain Entity | PostgreSQL Relational Tables | Authoritative API Endpoint |
| :--- | :--- | :--- |
| **Students** | `students`, `profiles`, `users` | `/api/students`, `/api/students/:id` |
| **Academics** | `academic_years`, `terms`, `course_definitions`, `course_offerings` | `/api/academics/structure`, `/api/academics/courses` |
| **Attendance** | `attendance_sessions`, `attendance_records`, `excused_absences` | `/api/attendance`, `/api/attendance/batch` |
| **Assignments & Quizzes** | `assignments`, `submissions`, `quiz_submissions` | `/api/assignments`, `/api/assignments/:id/submit` |
| **Grades** | `grades`, `rubric_scores`, `grade_audit_logs` | `/api/grades`, `/api/grades/override` |
| **Tuition & Finance** | `invoices`, `invoice_lines`, `payments`, `payment_allocations`, `adjustments`, `refunds` | `/api/invoices`, `/api/payments`, `/api/payments/refunds` |
| **Governance & Audit** | `audit_history`, `notifications` | `/api/audit-logs`, `/api/notifications` |

### Rules:
- No client-side code may claim authoritative truth from `localStorage` if network is available.
- Balance calculations, grade percentages, and attendance rates are computed server-side in PostgreSQL / Domain Services.
- All writes must execute with strict Row-Level Security (RLS) policies and Role-Based Access Control (RBAC).

---

## 2. React State = UI State

React hooks (`useState`, `useReducer`, `useMemo`, `useCallback`) are strictly reserved for managing transient UI states:

- **Visibility & Navigation**: Active tabs (`attendance`, `grades`, `finance`), modal open/close states, drawer toggles.
- **Search & Filtering**: Search queries, selected cohort filters, level filters, date range pickers, sort column and direction.
- **Form Inputs**: Live form values, unsaved input changes, field validation feedback.
- **Async Workflow States**: `isLoading`, `isSubmitting`, `isSyncing`, `error`, `successBanner`.
- **Optimistic Rendering**: Immediately rendering a user action while sending the network request to PostgreSQL.

---

## 3. localStorage = Preferences & Offline Drafts Only

`localStorage` is strictly forbidden from acting as a replacement database for institutional records. Its usage is restricted to:

### Permitted Usages:
1. **User UI Preferences**:
   - `hteim_theme` (`'light'` / `'dark'`)
   - `hteim_notification_preferences`
   - `hteim_sheet_settings` (`sheetUrl`, `autoSyncInterval`, `syncOnTabFocus`, `sheetMergePolicy`)
2. **Offline Drafts & Resilient Sync**:
   - `hteim_offline_sync_queue`: Buffered mutation operations waiting for network restoration.
   - `hteim_offline_state_snapshot`: Read-only transient cache used solely when the device is disconnected from the internet.
   - `hteim_draft_quiz_answers`: Temporary auto-saved draft answers in case of browser refresh before submission.

### Strictly Forbidden in localStorage:
- ❌ Hardcoding or persisting authoritative financial balances or invoice totals.
- ❌ Modifying student grades or attendance records locally without pushing to PostgreSQL.
- ❌ Storing production student PII as permanent master datasets.
