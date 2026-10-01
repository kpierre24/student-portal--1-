# Database Indexes

This document explains the recommended indexes for Firestore and Supabase/PostgreSQL.

## Current state

The portal currently stores most operational data in `localStorage` and uses Supabase only for:
- `app_states` / `app_state` sync rows
- Storage buckets (`library`, `assignments`)

Firestore is configured in `firestore.rules` but is not yet used for application data.

## Supabase / PostgreSQL

File: `supabase/migrations/20240101000000_initial_schema.sql`

Apply by opening the Supabase Dashboard → SQL Editor → paste and run, or via the Supabase CLI:

```bash
supabase migration up
```

### Recommended indexes

| Table | Index | Why |
|-------|-------|-----|
| `students` | `idx_students_name` | Lookup by `student_name` |
| `students` | `idx_students_module_status` | Filter by module track + status |
| `attendance` | `idx_attendance_student_day` | Per-student attendance history |
| `attendance` | `idx_attendance_created_at` | Date-range reports |
| `payments` | `idx_payments_student_status` | Outstanding balance queries |
| `submissions` | `idx_submissions_assignment_status` | Pending grading views |
| `assignments` | `idx_assignments_course_module` | Course + module filtering |
| `notifications` | `idx_notifications_student_status` | Unread notification feeds |
| `audit_logs` | `idx_audit_logs_timestamp` | Audit trail time-range scans |

## Firestore

File: `firestore.indexes.json`

Import via the Firebase CLI:

```bash
firebase deploy --only firestore:indexes
```

### Recommended composite indexes

| Collection | Fields | Use case |
|------------|--------|----------|
| `attendance` | `studentName ASC`, `classDayId ASC` | Per-student daily attendance |
| `attendance` | `studentName ASC`, `createdAt DESC` | Student attendance history |
| `payments` | `studentName ASC`, `status ASC` | Outstanding payment reports |
| `submissions` | `assignmentId ASC`, `status ASC` | Pending grading queue |
| `notifications` | `studentName ASC`, `createdAt DESC` | Student notification feed |
| `auditLogs` | `timestamp DESC` | Admin audit trail |

## When to add these

Add these indexes before switching `localStorage` to be the authoritative cache for:
- Attendance records
- Payment ledgers
- Assignment submissions
- Notifications / audit logs

Until then, the current Supabase usage is limited to sync rows and storage buckets, so these indexes are preparatory but low-risk to apply now.
