# HTEIM School of Ministry Portal — Unified Architecture

## 1. System Topology

```
React + TypeScript (Vite Single Page Application)
        │
        ▼
Express API Layer (Node.js / tsx on Port 3000)
        │
        ├── /api/auth          - Authentication / Authorization & Role Verification
        ├── /api/students      - Student Management (Roster, Profiles, Cohorts)
        ├── /api/academics     - Academic Management (Courses, Modules, Schedules)
        ├── /api/attendance    - Attendance Logging, Batch Check-in, 75% At-Risk Engine
        ├── /api/payments      - Tuition Management, Statements, Installments, Receipts
        ├── /api/library       - Digital Library, Syllabi, Media Resources
        ├── /api/assignments   - Quizzes, Assignments, Submissions, Rubric Grades
        ├── /api/audit-logs    - System & Administrative Operational Audit History
        ├── /api/state         - Authoritative State Synchronization
        └── /api/ai            - Theological Lesson Evaluation & AI Grading Assistance
        │
        ▼
Supabase PostgreSQL (Primary & Authoritative Source of Truth)
        │
        ├── students           - Student roster, student numbers, admission dates
        ├── courses            - Curriculum catalog, codes, credits
        ├── enrollments        - Term & course student enrollments
        ├── attendance         - Session logs, attendance status, excused absences
        ├── assignments        - Quizzes, homework prompts, due dates, weights
        ├── submissions        - Student answers, files, timestamps
        ├── grades             - Points awarded, letter grades, instructor feedback
        ├── payments           - Tuition transactions, payment numbers, receipts
        ├── audit_history      - Immutable operational audit history
        └── app_states         - Authoritative synchronized workspace snapshots
```

---

## 2. Storage Roles & Boundaries

| Storage Layer | Role & Authority | Data Stored | What Is Prohibited |
| :--- | :--- | :--- | :--- |
| **Supabase PostgreSQL** | **Primary & Sole Authoritative Source of Truth** | Students, Courses, Enrollments, Attendance Records, Assignments, Grades, Tuition & Invoices, Audit Logs | Storing transient client UI toggles |
| **Express API** | **Central Business Logic & Gateway** | Mediates all reads and writes, enforces role permissions, canonicalizes names, calculates >= 75% attendance policy, logs audit entries | Bypassing database validation |
| **Local Storage (`localStorage`)** | **Client Preferences & Temporary Offline Cache Only** | Theme mode (`light`/`dark`), density mode, table search filters, temporary quiz drafts, offline read-only snapshot (`hteim_offline_state_snapshot`) | Must **never** act as an authoritative store or overwrite PostgreSQL business records |
| **Firebase Auth / Firestore** | **Identity Provider & Secondary Realtime** | Client Google OAuth popup login & session tokens. Firestore is restricted to auth / optional realtime broadcast, never as a competing primary store for academic records. | Splitting academic records between Firestore and PostgreSQL |

---

## 3. Academic Policies Enforced
- **Attendance Rate Threshold**: **75%** satisfactory minimum.
- **At-Risk Warning**: Triggered when a student's attendance falls below **75%**.
- **Critical Warning**: Triggered when attendance is **<= 50%**.
- **Grading Scale**:
  - High Distinction / Honor Roll: **>= 85%**
  - Satisfactory: **>= 75%**
  - At-Risk Academic Standing: **< 75%**

---

## 4. Academic Engine Hierarchy: Course vs. Course Offering

The academic engine is structured around a strict separation between **Course Definitions** and **Course Offerings**:

```
Academic Year (e.g. 2025–2026 Academic Year)
   └── Semester / Term (e.g. 2026 Semester 1)
        └── Course (Master definition, e.g. Biblical Hermeneutics)
             └── Course Offering (Scheduled delivery instance)
                  ├── Lecturer (Appointed instructor, e.g. Pastor John)
                  ├── Enrolled Students (Roster with cohort levels & student numbers)
                  ├── Attendance (Session logs & check-ins, evaluated against 75% threshold)
                  ├── Assignments (Exegesis papers, ministry field practicums)
                  ├── Exams (Midterms, quizzes, and comprehensive assessments)
                  └── Grades (Weighted gradebook: 40% assignments, 40% exams, 20% attendance)
```

### Key Distinction
- **Course (Definition)**: Reusable curriculum blueprint (e.g., `SOM-101 Biblical Hermeneutics & Exegesis`). Stored centrally with credits, learning outcomes, syllabus outline, and prerequisites.
- **Course Offering (Instance)**: Specific delivery scheduled in an Academic Year & Term with an appointed Lecturer, enrolled students, scheduled days, attendance check-ins, coursework, and grades.
- **Benefits**: Courses can be reused every year without duplicating or desynchronizing course definitions across the curriculum catalog.

