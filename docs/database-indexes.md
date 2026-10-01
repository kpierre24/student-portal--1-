# Database Indexes (Supabase / PostgreSQL)

This document explains the recommended indexes for the authoritative Supabase / PostgreSQL relational schema.

## Supabase / PostgreSQL Relational Database Indexes

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
