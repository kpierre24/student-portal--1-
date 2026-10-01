import { studentsService } from './studentsService';
import { attendanceService } from './attendanceService';
import { academicsService } from './academicsService';
import { assignmentsService } from './assignmentsService';
import { financeService } from './financeService';
import { getServerSupabase, isSupabaseConfigured } from '../supabaseServer';
import { AuthenticatedUser } from '../../../types/rbac';
import { logger } from '../../../lib/logger';
import { MASTER_ENROLLED_STUDENTS, CURRICULUM_CLASS_DAYS } from '../../../data/curriculum';

/**
 * StateHydrationService dynamically composes application state directly from
 * domain relational tables (PostgreSQL) instead of using a giant monolithic JSON blob.
 */
export const stateHydrationService = {
  /**
   * Hydrates relational tables deterministically from static curriculum declarations if empty.
   */
  async ensureRelationalDataSeeded(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const supabase = getServerSupabase();

    try {
      // Check if students exist in relational table
      const { data: existingStudents } = await supabase.from('students').select('id').limit(1);
      if (existingStudents && existingStudents.length > 0) {
        // Relational database already has domain records
        return;
      }

      logger.info('Relational tables are unseeded. Performing deterministic migration bootstrap into PostgreSQL tables...');

      // 1. Seed Academic Years & Terms
      const { data: year } = await supabase
        .from('academic_years')
        .upsert({
          name: '2026-2027 Academic Year',
          code: 'AY-2026-2027',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          status: 'active',
        }, { onConflict: 'code' })
        .select()
        .single();

      if (year?.id) {
        await supabase.from('terms').upsert([
          {
            academic_year_id: year.id,
            name: '2026 Semester 1 (Foundation)',
            code: 'SEM-2026-1',
            sequence_order: 1,
            start_date: '2026-01-10',
            end_date: '2026-06-30',
            status: 'active',
          },
          {
            academic_year_id: year.id,
            name: '2026 Semester 2 (Practicum)',
            code: 'SEM-2026-2',
            sequence_order: 2,
            start_date: '2026-07-01',
            end_date: '2026-12-15',
            status: 'upcoming',
          },
        ], { onConflict: 'code' });
      }

      // 2. Seed Master Courses & Offerings
      const defaultCourses = [
        { code: 'MIN-101', title: 'Biblical Foundations & Covenant Life', core_module_number: 1, credits: 5.0, department: 'Biblical Studies' },
        { code: 'MIN-102', title: 'Spiritual Authority & Prayer Warfare', core_module_number: 2, credits: 5.0, department: 'Ministry Practice' },
        { code: 'MIN-103', title: 'Prophetic Ministry & Holy Spirit Gifts', core_module_number: 3, credits: 5.0, department: 'Ministry Practice' },
        { code: 'MIN-104', title: 'Pastoral Leadership & Church Administration', core_module_number: 4, credits: 5.0, department: 'Leadership' },
        { code: 'MIN-105', title: 'Evangelism, Missions & Community Impact', core_module_number: 5, credits: 5.0, department: 'Missions' },
        { code: 'MIN-106', title: 'Ministerial Ethics, Integrity & Honor', core_module_number: 6, credits: 5.0, department: 'Ethics' },
      ];

      for (const c of defaultCourses) {
        await supabase.from('course_definitions').upsert(c, { onConflict: 'code' });
      }

      // 3. Seed Students & Profiles deterministically
      const studentNames = MASTER_ENROLLED_STUDENTS;

      for (let i = 0; i < studentNames.length; i++) {
        const name = studentNames[i];
        const parts = name.split(' ');
        const firstName = parts[0] || name;
        const lastName = parts.slice(1).join(' ') || 'Student';
        const email = `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.hteim.org`;
        const studentNumber = `SOM-2026-${(100 + i).toString().padStart(4, '0')}`;

        const { data: user } = await supabase
          .from('users')
          .upsert({ email, role: 'student', is_active: true }, { onConflict: 'email' })
          .select()
          .single();

        if (user?.id) {
          await supabase.from('profiles').upsert({
            user_id: user.id,
            first_name: firstName,
            last_name: lastName,
          }, { onConflict: 'user_id' });

          await supabase.from('students').upsert({
            user_id: user.id,
            student_number: studentNumber,
            cohort_level: 'Level 1 Foundation',
            enrollment_status: 'active',
            admission_date: '2026-01-10',
          }, { onConflict: 'user_id' });
        }
      }

      logger.info('Relational domain bootstrap completed successfully.');
    } catch (bootstrapErr) {
      logger.warn('Initial relational seeding notice:', bootstrapErr);
    }
  },

  /**
   * Composes authorized portal state directly from relational services for the logged-in user.
   */
  async getComposedStateForUser(user: AuthenticatedUser): Promise<any> {
    // Ensure relational database is populated
    await this.ensureRelationalDataSeeded();

    try {
      // 1. Fetch domain data in parallel directly from relational domain services
      const [
        studentsRes,
        attendanceRes,
        academicsRes,
        coursesRes,
        assignmentsRes,
        submissionsRes,
        invoicesRes,
        transactionsRes,
      ] = await Promise.all([
        studentsService.getStudents(user),
        attendanceService.getAttendance(user),
        academicsService.getAcademicStructure(),
        academicsService.getCourses(),
        assignmentsService.getAssignments(user),
        assignmentsService.getSubmissions({}, user),
        financeService.getInvoices(undefined, user),
        financeService.getTransactions({}, user),
      ]);

      // Safely extract domain data with fallbacks
      const studentsList = studentsRes?.students || [];
      const recordsList = attendanceRes?.records || [];
      const classDaysList = (attendanceRes?.classDays && attendanceRes.classDays.length > 0)
        ? attendanceRes.classDays
        : CURRICULUM_CLASS_DAYS;
      const excusedAbsences = attendanceRes?.excusedAbsences || {};
      const academicYears = academicsRes?.academicYears || [];
      const terms = academicsRes?.terms || [];
      const activeTermId = academicsRes?.activeTermId || null;
      const masterCourses = academicsRes?.masterCourses || [];
      const courses = coursesRes?.courses || [];
      const courseOfferings = academicsRes?.courseOfferings || [];
      const customAssignments = assignmentsRes?.assignments || [];
      const submissions = submissionsRes?.submissions || [];
      const rubricScores = submissionsRes?.rubricScores || {};
      const invoicesList = invoicesRes?.invoices || [];
      const transactionsList = transactionsRes?.transactions || [];

      // Build dictionary structures expected by frontend views for backward compatibility
      const studentLevels: Record<string, string> = {};
      const studentPhotos: Record<string, string> = {};
      const studentNotes: Record<string, string> = {};

      studentsList.forEach((s) => {
        if (s?.name) {
          studentLevels[s.name] = s.level || 'Level 1 Foundation';
          if (s.photoUrl) studentPhotos[s.name.toLowerCase().trim()] = s.photoUrl;
          if (s.note) studentNotes[s.name] = s.note;
        }
      });

      // Assemble unified authoritative state composed dynamically from relational tables
      const composedState = {
        // Metadata & version
        version: 2,
        isRelationalAuthoritative: true,
        updatedAt: new Date().toISOString(),

        // Academic Structure
        academicYears,
        terms,
        activeTermId,
        masterCourses,
        courses,
        courseOfferings,

        // Student & Attendance Domain
        students: studentsList,
        studentLevels,
        studentPhotos,
        studentNotes,
        records: recordsList,
        classDays: classDaysList,
        excusedAbsences,

        // Academic Assignments & Grades
        customAssignments,
        submissions,
        rubricScores,

        // Financial Domain
        invoices: invoicesList,
        transactions: transactionsList,
        payments: transactionsList,
        receipts: [],
        adjustments: [],

        // Library & Config
        libraryResources: [],
        sheetsUrl: '',
        portalConfig: {
          policyThreshold: '75%',
          honorThreshold: '85%',
          criticalThreshold: '50%',
        },
      };

      return composedState;
    } catch (err) {
      logger.error('Error composing state from relational tables:', err);
      return {
        version: 2,
        isRelationalAuthoritative: true,
        updatedAt: new Date().toISOString(),
        academicYears: [],
        terms: [],
        activeTermId: null,
        masterCourses: [],
        courses: [],
        courseOfferings: [],
        students: [],
        studentLevels: {},
        studentPhotos: {},
        studentNotes: {},
        records: [],
        classDays: CURRICULUM_CLASS_DAYS,
        excusedAbsences: {},
        customAssignments: [],
        submissions: [],
        rubricScores: {},
        invoices: [],
        transactions: [],
        payments: [],
        receipts: [],
        adjustments: [],
        libraryResources: [],
        sheetsUrl: '',
        portalConfig: {
          policyThreshold: '75%',
          honorThreshold: '85%',
          criticalThreshold: '50%',
        },
      };
    }
  },
};
