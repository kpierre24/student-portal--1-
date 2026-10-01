# Database Migrations

This directory contains versioned SQL migrations for the HTEIM School of Ministry PostgreSQL / Supabase database.

## Migration Inventory

- `20240101000000_initial_schema.sql`: Initial `app_states` table schema.
- `20260817200000_scalable_academic_data_model.sql`: Normalized academic schema including:
  - `academic_years`, `terms`, `courses`, `modules`, `lessons`, `assignments`, `submissions`, `grades`
  - `user_profiles`, `students`, `enrollments`, `attendance_records`, `payments`, `documents`, `audit_logs`
