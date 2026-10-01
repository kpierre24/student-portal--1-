# HTEIM School of Ministry Portal — Current System Architecture

**Authoritative Architecture & System Design Specification**  
**Organization:** Heaven Touching Earth International Ministries (HTEIM) School of Ministry  
**Version:** 3.0.0 (Production Relational & RBAC Hardened)

---

## Table of Contents

1. [Executive Summary & System Topology](#1-executive-summary--system-topology)
2. [Authentication](#2-authentication)
3. [Authorization & RBAC Matrix](#3-authorization--rbac-matrix)
4. [Database & Relational Domain Architecture](#4-database--relational-domain-architecture)
5. [API Layer & REST Endpoints](#5-api-layer--rest-endpoints)
6. [Frontend Architecture & State Boundaries](#6-frontend-architecture--state-boundaries)
7. [Storage & Digital Asset Management](#7-storage--digital-asset-management)
8. [Centralized Notification System](#8-centralized-notification-system)
9. [AI Engine & Theological Evaluation](#9-ai-engine--theological-evaluation)
10. [Mobile, PWA & Offline Sync Architecture](#10-mobile-pwa--offline-sync-architecture)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Security Model, Threat Mitigations & Audit History](#12-security-model-threat-mitigations--audit-history)

---

## 1. Executive Summary & System Topology

The **HTEIM School of Ministry Portal** is an institutional education and student management platform designed to track academic curriculum across 6 core ministry modules, course offerings, attendance compliance (with a strict 75% at-risk policy), assignments, automated/manual grading, tuition accounting, digital library assets, and live broadcasts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT TIER (PWA / SPA)                          │
│   React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Motion UI   │
│   - React State: Pure UI State (Modals, Filters, Tabs, Form Buffers)        │
│   - Local Storage: Preferences (Theme, Language) & Offline Draft Queues     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / WSS / REST
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER GATEWAY TIER                                │
│   Express HTTP API (Node.js / tsx on Port 3000)                             │
│   ├── /api/auth          - JWT Session Verification & Role Resolution        │
│   ├── /api/students      - Student Enrollment, Roster & Profiles            │
│   ├── /api/academics     - Academic Years, Terms, Courses & Offerings       │
│   ├── /api/attendance    - Session Check-ins, Overrides & 75% At-Risk Engine│
│   ├── /api/assignments   - Assignments, Submissions & Grading               │
│   ├── /api/grades        - Gradebook Aggregations & Audit Overrides          │
│   ├── /api/invoices      - Invoicing & Tuition Ledgers                      │
│   ├── /api/payments      - Transactions, Allocations & Refunds              │
│   ├── /api/library       - Digital Library Catalog & Resource Borrowing     │
│   ├── /api/notifications- Central Notification In-App & Multi-Channel Feed  │
│   ├── /api/audit-logs    - Immutable Operational & Governance Audit Trail   │
│   └── /api/ai            - Theological Lesson Evaluation & Rubric Grading   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Service-Role Connection / Pooling
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCE & AUTH TIER                            │
│   Supabase PostgreSQL (Primary Authoritative Source of Truth)               │
│   ├── Identity: Supabase Auth (JWT, OAuth 2.0, WebAuthn Biometric)          │
│   ├── Relational Domain Tables (Foreign Keys, Indexes, Cascades)            │
│   ├── Row-Level Security (RLS) Database Policies                            │
│   └── Supabase Storage: S3-Compatible Buckets for Handouts & Submissions    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication

The portal implements a multi-modal authentication flow supporting institutional email/password credentials, single sign-on (SSO), and biometric passkeys:

1. **Supabase Auth / JWT Engine**:
   - Authenticated sessions issue signed RS256/HS256 JSON Web Tokens (JWTs).
   - Token payload encodes `sub` (User UUID), `email`, `role`, and token expiration (`exp`).
   - Every API call sends `Authorization: Bearer <jwt_token>` in the HTTP header.
   - The server middleware (`authenticate` in `src/server/middleware/rbac.ts`) validates the signature and decodes user metadata.

2. **WebAuthn Biometric Authentication**:
   - Biometric fingerprint/face recognition is supported on compatible mobile and desktop browsers via standard WebAuthn / FIDO2 APIs (`src/lib/biometricAuth.ts`).
   - Credentials map securely to student/faculty profiles.

3. **Session Verification & Fallback**:
   - If an authenticated Supabase session is active, the JWT is attached directly.
   - For test environments and simulated dev personas, base64-encoded structured user claims are decoded and validated by the backend authentication middleware.

---

## 3. Authorization & RBAC Matrix

The platform enforces strict **Default-Deny Role-Based Access Control (RBAC)** across all endpoints.

### Role Definitions

| Role | Hierarchy Level | Target Audience | Primary Permissions |
| :--- | :--- | :--- | :--- |
| `super_admin` | Tier 1 (Apex) | Institutional Directors & System Architects | Full access to all modules, system configurations, and raw audit histories (`all:access`). |
| `admin` | Tier 2 | Deans, Directors & Administrative Officers | Student enrollment, user roles, faculty assignments, finance governance, attendance overrides. |
| `registrar` | Tier 3 | Office of the Registrar | Student roster management, academic standing, course enrollment, term progression. |
| `lecturer` / `teacher` | Tier 4 | Course Instructors & Faculty | Attendance logging and grading for **assigned courses only**, assignment creation. |
| `finance_officer` | Tier 4 (Finance) | Bursars & Financial Staff | Invoicing, payment recording, fee adjustments, tuition refunds, financial reports. |
| `student` | Tier 5 | Enrolled Ministry Students | View personal profile, personal grades, personal attendance, personal invoices, submit coursework. |
| `librarian` | Tier 5 (Library) | Library Curators | Catalog management, upload syllabi and reading resources. |
| `viewer` | Tier 6 (Read-Only) | Guest Auditors | Read-only access to published public curriculum and announcements. |

### Endpoint Authorization Matrix

| Endpoint Route | HTTP Method | Required Permission / Policy | Access Rules & Scope Constraints |
| :--- | :--- | :--- | :--- |
| `/api/students` | `GET` | `students:read` | Admins/Registrars/Faculty view all; Students view own record. |
| `/api/students` | `POST` | `students:write` | Only Admins & Registrars can enroll new students. |
| `/api/attendance` | `GET` | `attendance:read` | Faculty views assigned course attendance; Students view own. |
| `/api/attendance` | `POST` | `attendance:write` | Faculty can log check-ins for assigned courses. |
| `/api/attendance/override` | `POST` | `attendance:approve` | Requires administrative override authorization. |
| `/api/assignments` | `POST` | `assignments:write` | Lecturers can only create assignments for assigned courses. |
| `/api/assignments/:id/submit` | `POST` | `assignments:submit` | Students submit own coursework; verified against identity. |
| `/api/grades` | `GET` | `grades:read` | Faculty view assigned courses; Students view own grades only. |
| `/api/grades` | `POST` / `PATCH` | `grades:write` | Faculty can ONLY grade assigned courses (`checkLecturerCourseAssignment`). |
| `/api/grades/override` | `POST` | `grades:override` | Requires Dean / Administrative authorization. |
| `/api/invoices` | `GET` | `finance:read` | Finance officers & Admins; Students view own invoices only. |
| `/api/payments` | `POST` | `finance:write` | Restricted strictly to Finance Officers & Admins. |
| `/api/payments/refunds` | `POST` | `finance:refund` | Restricted strictly to Finance Officers & Admins. |
| `/api/audit-logs` | `GET` | `system:logs` | Super Admins & Admins only. |

---

## 4. Database & Relational Domain Architecture

The database is built on **PostgreSQL (Supabase)** using third-normal-form relational domain schemas.

### Core Relational Schema

```
┌──────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│  academic_years  │◀──────│        terms         │◀──────│  course_offerings   │
│  - id (PK)       │       │  - id (PK)           │       │  - id (PK)          │
│  - name, code    │       │  - academic_year_id  │       │  - term_id (FK)     │
│  - start/end_date│       │  - sequence_order    │       │  - course_id (FK)   │
└──────────────────┘       └──────────────────────┘       │  - lecturer_id (FK) │
                                                          └──────────┬──────────┘
                                                                     │
┌──────────────────┐       ┌──────────────────────┐                  │
│course_definitions│◀──────┴──────────────────────┼──────────────────┘
│  - id (PK)       │                              ▼
│  - code, title   │                   ┌──────────────────────┐
│  - core_module   │                   │     enrollments      │
└──────────────────┘                   │  - id (PK)           │
                                       │  - student_id (FK)   │
┌──────────────────┐                   │  - offering_id (FK)  │
│     students     │◀──────────────────┴──────────────────────┘
│  - id (PK)       │
│  - user_id (FK)  │                   ┌──────────────────────┐
│  - student_number│◀──────────────────│       invoices       │
│  - cohort_level  │                   │  - id (PK)           │
└────────┬─────────┘                   │  - student_id (FK)   │
         │                             │  - total_tuition     │
         │                             └──────────┬───────────┘
         │                                        │
         ▼                                        ▼
┌──────────────────┐                   ┌──────────────────────┐
│attendance_records│                   │       payments       │
│  - id (PK)       │                   │  - id (PK)           │
│  - student_id(FK)│                   │  - invoice_id (FK)   │
│  - session_id(FK)│                   │  - student_id (FK)   │
│  - status        │                   │  - amount, method    │
└──────────────────┘                   └──────────────────────┘
```

### Key Relational Tables:
1. `users` & `profiles`: Identity profiles, email addresses, and canonical display names.
2. `students`: Official student numbers (`SOM-2026-XXXX`), cohort levels, enrollment standings.
3. `course_definitions`: Universal course catalog (`MIN-101` through `MIN-106`).
4. `course_offerings`: Scheduled delivery instances linking terms, definitions, and assigned lecturers.
5. `attendance_sessions` & `attendance_records`: Date-specific class meetings and check-in statuses (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`).
6. `assignments` & `submissions`: Coursework prompts, due dates, student responses, file links, and rubric scores.
7. `grades`: Normalized academic scores, letter marks, weighted composites, and audit trails.
8. `invoices`, `invoice_lines`, `payments`, `payment_allocations`, `adjustments`, `refunds`: Authoritative double-entry tuition accounting ledger.
9. `audit_history`: Immutable tamper-evident audit records capturing actor, action, payload diff, and IP.

---

## 5. API Layer & REST Endpoints

The API tier is constructed with Express 4 / Node.js running under TypeScript:

### Route Architecture & Implementation
- **Student Roster & Profiles**: `/api/students` (`src/server/routes/students.ts`)
- **Academic Hierarchy**: `/api/academics` (`src/server/routes/academics.ts`)
- **Attendance & Compliance**: `/api/attendance` (`src/server/routes/attendance.ts`)
  - Automatically evaluates student attendance against the mandatory **75% threshold**.
  - Identifies at-risk students and flags critical risk (`<= 50%`).
- **Coursework & Submissions**: `/api/assignments` (`src/server/routes/assignments.ts`)
- **Gradebook & Evaluations**: `/api/grades` (`src/server/routes/grades.ts`)
- **Financial Invoicing**: `/api/invoices` (`src/server/routes/invoices.ts`)
- **Tuition & Payment Transactions**: `/api/payments` (`src/server/routes/payments.ts`)
- **Digital Library**: `/api/library` (`src/server/routes/library.ts`)
- **Governance Audit Trail**: `/api/audit-logs` (`src/server/routes/auditLogs.ts`)
- **State Hydration Gateway**: `/api/state` (`src/server/routes/state.ts`)

---

## 6. Frontend Architecture & State Boundaries

The frontend application follows the **Strict Three-Tier State Boundary Rule**:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PostgreSQL (Supabase) = AUTHORITATIVE DATA               │
│    - Authoritative source of truth for all business state.  │
│    - All CRUD mutations execute via Domain Services.        │
├─────────────────────────────────────────────────────────────┤
│ 2. React State = UI STATE                                   │
│    - Active tabs, open modals, drawer toggles               │
│    - Live search filters, sort criteria, pagination         │
│    - Transient form input buffers & optimistic mutations    │
├─────────────────────────────────────────────────────────────┤
│ 3. localStorage = PREFERENCES & OFFLINE DRAFTS ONLY         │
│    - User UI preferences (theme, sync intervals, locale)    │
│    - Temporary offline mutation queue for background sync   │
│    - Read-only transient offline snapshots for resilience   │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure:
- **`src/features/students/`**: Student directory, profile cards, cohort selectors.
- **`src/features/academics/`**: Course catalog, syllabus outlines, term planners.
- **`src/features/attendance/`**: Live class check-in grid, badge filters, excused absence modals.
- **`src/features/assignments/`**: Assignment creation forms, student submission dropzones, rubric evaluators.
- **`src/features/grades/`**: Gradebook matrix, weighted score calculators, honor roll indicators.
- **`src/features/finance/`**: Invoicing ledger, payment transaction logs, receipt generator, PDF download.
- **`src/features/library/`**: Digital asset browser, category filters, PDF viewer.
- **`src/features/notifications/`**: Central notification drawer and toast dispatcher.

---

## 7. Storage & Digital Asset Management

Digital media and academic assets are stored across dedicated S3-compatible **Supabase Storage Buckets**:

1. **`library-resources`**:
   - Course syllabi, theological reading materials, handouts, and study guides.
   - Public / authenticated read access; write access restricted to librarians and administrators.
2. **`assignment-submissions`**:
   - Student homework essays, exegesis papers, and audio practicum recordings.
   - Restricted access: Only the submitting student and assigned course faculty/admins can access files.
3. **`student-avatars`**:
   - Profile photos for student ID badges and directory listings.
4. **`financial-receipts`**:
   - Generated transaction receipts and PDF statement exports.

---

## 8. Centralized Notification System

The **Central Notification Service** (`src/services/notification/CentralNotificationService.ts`) coordinates institutional announcements, compliance warnings, and academic deadlines across channels:

- **Attendance At-Risk Alerts**: Dispatched when attendance dips below 75%.
- **Assignment Grade Notifications**: Notifies students when faculty evaluates and posts marks.
- **Financial Balance Notices**: Invoices issued, upcoming due dates, and payment confirmations.
- **Multi-Channel Delivery**:
  - In-App Notification Center with real-time badges.
  - Push Notifications via Service Worker (PWA).
  - Outgoing email alerts via backend notification queue.

---

## 9. AI Engine & Theological Evaluation

The platform integrates Google Gemini (`@google/genai` TypeScript SDK) via server-side endpoints (`/api/ai`):

- **Theological Rubric Evaluation**:
  - Assists faculty with grading exegesis essays based on standardized biblical ministry rubrics.
  - Checks for scriptural grounding, hermeneutical accuracy, practical ministry application, and theological consistency.
- **Assignment Prompt Generation**:
  - Helps instructors formulate thought-provoking discussion questions and module quizzes.
- **Security & Privacy**:
  - AI analysis runs strictly on the backend; student PII (names, email addresses, student IDs) is stripped before prompt dispatch.

---

## 10. Mobile, PWA & Offline Sync Architecture

The portal is a full **Progressive Web App (PWA)** optimized for mobile smartphones, tablets, and field ministry devices:

1. **Service Worker & Manifest**:
   - Registered service worker (`sw.js`) caches application shells, core UI assets, and fonts.
   - Manifest configuration enables standalone full-screen home screen installation on iOS and Android.
2. **Resilient Background Sync Queue**:
   - In offline mode (e.g. remote ministry missions without cellular connectivity), attendance check-ins and grade entries are stored in `hteim_offline_sync_queue`.
   - `backgroundSyncWorker.ts` detects network restoration and executes sequential idempotency-keyed batch syncs to the server.

---

## 11. Deployment & Infrastructure

- **Frontend Build**: Built with Vite (`npm run build`), generating static assets with tree-shaking and oxc/esbuild optimization.
- **Backend Server**: Full-stack runtime entry point running `tsx server.ts` mounted on Express with Vite middleware in dev and production static file serving.
- **Cloud Hosting**: Deployed on Google Cloud Run container infrastructure behind Google Cloud Load Balancing with managed SSL/TLS termination.
- **Database Provisioning**: Supabase Managed PostgreSQL Instance with SSL mode enforced.

---

## 12. Security Model, Threat Mitigations & Audit History

### Adversarial Threat Mitigations Verified by Automated Penetration Tests

| # | Attack Vector | Security Countermeasure | Verified Status |
| :--- | :--- | :--- | :--- |
| 1 | **Cross-Student Grade Snooping** | `requireResourceOwnership` validates student identity against record UUIDs in PostgreSQL. | **403 Forbidden** |
| 2 | **Cross-Student Ledger Snooping** | Financial API filters ledger queries by caller identity; rejects non-owned queries. | **403 Forbidden** |
| 3 | **Attendance Tampering by Students** | Write endpoints strictly require `attendance:write` or `attendance:approve`. | **403 Forbidden** |
| 4 | **Cross-Course Lecturer Tampering** | `checkLecturerCourseAssignment` checks `course_offerings` in database before allowing grading. | **403 Forbidden** |
| 5 | **Finance Role Grade Manipulation** | RBAC permission separation isolates `grades:write` from `finance:write`. | **403 Forbidden** |
| 6 | **Faculty Invoicing/Refund Intrusion** | Invoicing and refund disbursement endpoints strictly require `finance:refund`. | **403 Forbidden** |
| 7 | **Student Calling Admin Endpoints** | Default-deny router blocks administrative operations for student roles. | **403 Forbidden** |
| 8 | **Unauthenticated Anonymous Probe** | Gateway authentication middleware returns `401 Unauthorized` for missing/invalid credentials. | **401 Unauthorized** |

### Immutable Audit History
All administrative actions (grade overrides, attendance modifications, refund issuances, role modifications) write an entry to `audit_history` capturing:
- `actor_user_id` & `actor_email`
- `action_type` & `entity_name`
- `target_id`
- `old_state` and `new_state` JSON diffs
- Timestamp & caller IP address
