# Database Row Level Security (RLS) Policy & Audit

**Organization**: Heaven Touching Earth International Ministries (HTEIM) School of Ministry  
**Database**: Supabase Cloud PostgreSQL  
**Audit Scope**: All 11 sensitive relational operational and financial tables.

---

## 1. Executive Summary & Security Model

Row Level Security (RLS) is enforced at the PostgreSQL database tier for every operational and sensitive entity. This ensures that even if client-side code, external integrations, or direct PostgREST endpoints are queried using user JWT credentials, the database engine itself enforces strict role-based and ownership-based isolation boundaries.

### Core RBAC Roles in Database Context
- **`super_admin` / `admin`**: Full administrative governance across all academic and institutional records.
- **`teacher` / `ta`**: Academic instruction, assignment creation, submission evaluation, and attendance tracking.
- **`finance_officer`**: Invoicing, payment transaction processing, refunds, and financial adjustments.
- **`registrar`**: Student directory admissions, cohort tracking, transcripts, and enrollment status.
- **`student`**: Personal student self-service (own attendance, own grades, personal assignments, own tuition statement). Strictly prohibited from viewing or altering peer records or administrative audit trails.

---

## 2. Sensitive Tables RLS Audit Matrix

| Table | Sensitivity | Read (SELECT) | Write (INSERT) | Modify (UPDATE) | Delete (DELETE) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`students`** | **High** (PII, Academic Standing) | Faculty, Staff, or Student Owner (`user_id = auth.uid()`) | Admin & Registrar Only | Admin & Registrar Only | Admin Only |
| **`grades`** | **High** (FERPA, Academic Privacy) | Faculty/Staff, or Student on their OWN submission | Faculty Instructors & Admin | Faculty Instructors & Admin | Admin Only |
| **`attendance`** | **High** (75% Attendance Standard) | Faculty/Staff, or Student Owner (`student_id = current_student`) | Faculty Instructors & Staff | Faculty Instructors & Staff | Admin Only |
| **`assignments`** | **Medium/High** (Course Exams) | Faculty/Staff (all), Students (published only) | Faculty & Admin | Faculty & Admin | Admin Only |
| **`submissions`** | **High** (Student Work, Privacy) | Faculty/Staff, or Student Owner | Student Owner (`student_id = current_student`) or Faculty | Student Owner (drafts only) or Faculty (grading) | Student (draft only) or Admin |
| **`payments`** | **Critical** (Financial Transactions) | Finance Officers, Staff, or Student Owner (own receipts) | Finance Officers & Admin Only | Finance Officers & Admin Only | Super Admin Only |
| **`invoices`** | **High** (Tuition Billing) | Finance Officers, Staff, or Student Owner (own invoices) | Finance Officers & Admin Only | Finance Officers & Admin Only | Admin Only |
| **`financial_adjustments`** | **High** (Discounts, Scholarships) | Finance Officers, Staff, or Student Owner (own adjustments) | Finance Officers & Admin Only | Finance Officers & Admin Only | Admin Only |
| **`refunds`** | **Critical** (Fund Disbursements) | Finance Officers, Staff, or Student Owner (own refunds) | Finance Officers & Admin Only | Finance Officers & Admin Only | Super Admin Only |
| **`notifications`** | **Medium/High** (Private Alerts) | Staff, or Direct Recipient (`recipient_user_id` / `recipient_student_id`) | Faculty, Staff, or System Services | Recipient (mark as read) or Staff | Recipient (dismiss) or Admin |
| **`audit_history`** | **Critical** (Immutable Audit Trail) | Staff & Governance Only (`super_admin`, `admin`, `registrar`, `finance_officer`) | System Services & Authenticated Actors | **FORBIDDEN (Immutable)** | **FORBIDDEN (Append-Only)** |

---

## 3. Detailed Audit by Table

### 1. `students`
- **Threat Vector**: Unauthorized scrapers or students reading other students' personal records, emails, or cohort standings.
- **Intentional Strategy**:
  - `students_select_policy`: Evaluates `is_academic_faculty()`, `is_staff()`, or `user_id = auth.uid()`.
  - `students_insert_policy`: Restricted strictly to `admin` and `registrar`.
  - `students_update_policy`: Students cannot self-promote cohort levels or alter enrollment statuses (`active`, `at_risk`, `withdrawn`).

### 2. `grades`
- **Threat Vector**: Grade tampering, unauthorized inspection of peer scores or class grading curves.
- **Intentional Strategy**:
  - `grades_select_policy`: Students are scoped via an `EXISTS` subquery verifying that `grades.submission_id` links directly to their own `public.get_current_student_id()`.
  - `grades_insert_policy` & `grades_update_policy`: Students are explicitly blocked (`public.get_auth_user_role() != 'student'`). Only designated instructors, TAs, and admins can award points or write feedback.

### 3. `attendance` (and `attendance_records`, `attendance_sessions`)
- **Threat Vector**: Falsification of attendance check-ins to bypass the 75% graduation threshold.
- **Intentional Strategy**:
  - `attendance_select_policy`: Scoped to `student_id = public.get_current_student_id()`.
  - `attendance_insert_policy` & `attendance_update_policy`: Only instructors and administrative staff can create or modify attendance records. Students cannot mark themselves present.

### 4. `assignments`
- **Threat Vector**: Early leak of unreleased quizzes, exam questions, or homework prompts.
- **Intentional Strategy**:
  - `assignments_select_policy`: Students can only read records where `is_published = true AND deleted_at IS NULL`. Draft assignments are visible only to instructors.

### 5. `submissions` (and `quiz_submissions`)
- **Threat Vector**: Plagiarism, submission tampering after grade release, peer submission browsing.
- **Intentional Strategy**:
  - `submissions_select_policy`: Scoped strictly to `student_id = public.get_current_student_id()` or instructors.
  - `submissions_update_policy`: Students can only edit their own submission while `status IN ('draft', 'resubmitted', 'submitted')`. Once graded, updates are restricted to evaluators.

### 6. `payments` (and `payment_allocations`)
- **Threat Vector**: Fraudulent insertion of payment receipts, fake transaction references, balance manipulation.
- **Intentional Strategy**:
  - `payments_select_policy`: Students can view their personal payment ledger.
  - `payments_insert_policy`: Restricted strictly to `is_finance_manager()`. Students cannot post completed payments directly.

### 7. `invoices` (and `invoice_lines`)
- **Threat Vector**: Unauthorized manipulation of tuition amounts, line item deletion, or balance spoofing.
- **Intentional Strategy**:
  - `invoices_select_policy`: Scoped to `student_id = public.get_current_student_id()`.
  - `invoices_insert_policy` & `invoices_update_policy`: Only Finance Officers can modify billing schedules.

### 8. `financial_adjustments`
- **Threat Vector**: Self-awarding scholarships, unauthorized tuition discounts, or fraudulent fee waivers.
- **Intentional Strategy**:
  - `financial_adjustments_select_policy`: Students can only view adjustments explicitly applied to their student ID or invoice.
  - `financial_adjustments_insert_policy`: Restricted to Finance Managers.

### 9. `refunds` (and `refund_allocations`)
- **Threat Vector**: Fraudulent disbursement of institutional funds or altering refund audit records.
- **Intentional Strategy**:
  - `refunds_select_policy`: Scoped to `student_id = public.get_current_student_id()`.
  - `refunds_insert_policy` & `refunds_update_policy`: Authorized exclusively by Finance Officers and Super Admins.

### 10. `notifications` (and delivery logs & preferences)
- **Threat Vector**: Interception of private administrative notices, disciplinary warnings, or at-risk alerts.
- **Intentional Strategy**:
  - `notifications_select_policy`: Scoped to `recipient_user_id = auth.uid()`, `recipient_student_id = current_student_id()`, or role broadcast.
  - `notifications_update_policy`: Allows recipients to toggle `read = true`.

### 11. `audit_history`
- **Threat Vector**: Tampering with compliance trails, log erasure, or unauthorized inspection of administrative changes.
- **Intentional Strategy**:
  - `audit_history_select_policy`: Strictly restricted to governance roles (`super_admin`, `admin`, `registrar`, `finance_officer`). Students and instructors are denied access.
  - `audit_history_no_update_policy` & `audit_history_no_delete_policy`: Explicit `USING (false)` guarantees immutable, append-only persistence.

---

## 4. Helper Functions Architecture

To prevent infinite recursion during RLS policy evaluation, helper functions are declared as `SECURITY DEFINER STABLE`:
- `public.get_auth_user_role()`: Looks up `public.users.role` directly using elevated definer rights, falling back to JWT claims.
- `public.get_current_student_id()`: Looks up `public.students.id` corresponding to `auth.uid()`.
- `public.is_admin()`, `public.is_academic_faculty()`, `public.is_finance_manager()`, `public.is_staff()`, `public.is_student()`.
