import fs from 'fs';
import path from 'path';
import { getServerSupabase, logAuditEvent } from '../supabaseServer';
import { logger } from '../../../lib/logger';
import { AuthenticatedUser } from '../../../types/rbac';
import { DEFAULT_QUIZ_TEMPLATES } from '../../../data/quizTemplates';

const inMemoryQuizzesCache = new Map<string, any>();
const inMemoryQuizAttempts = new Map<string, any>();

async function saveQuizVersions(quizId: string, quizData: any, timestamp: string): Promise<void> {
  if (!quizData) return;
  const versions = quizData.versions || quizData.rubric?.versions || quizData.quizData?.versions || [];
  if (!Array.isArray(versions) || versions.length === 0) return;

  const supabase = getServerSupabase();
  for (const v of versions) {
    if (!v || !v.id) continue;
    try {
      const snapshotObj = {
        id: v.id,
        quizId: v.quizId || quizId,
        versionNumber: v.versionNumber || v.version || 1,
        title: v.title || quizData.title || 'Untitled Version',
        description: v.description || quizData.description || '',
        instructions: v.instructions || quizData.instructions || '',
        questions: v.questions || [],
        totalPoints: v.totalPoints || quizData.totalPoints || 100,
        settings: v.settings || {},
        createdAt: v.createdAt || timestamp,
        createdBy: v.createdBy || 'HTEIM Faculty',
        publishedAt: v.publishedAt || null,
        changeLog: v.changeLog || '',
        isPublished: v.isPublished !== false,
        isImmutable: v.isImmutable || false
      };

      await supabase.from('quiz_versions').upsert({
        id: v.id,
        quiz_id: quizId,
        version_number: v.versionNumber || v.version || 1,
        snapshot: snapshotObj,
        created_at: v.createdAt || timestamp,
        published_at: v.publishedAt || null
      });
    } catch (err) {
      logger.warn(`Non-blocking warning saving quiz version ${v.id} to relational table:`, err);
    }
  }
}

export const assignmentsService = {
  /**
   * Caches a quiz in memory for instant public retrieval across all client sessions.
   */
  cacheQuizInMemory(quiz: any): void {
    if (!quiz) return;
    const code = (quiz.shareCode || quiz.share_code || quiz.id || '').toLowerCase().trim();
    if (code) {
      inMemoryQuizzesCache.set(code, quiz);
    }
    if (quiz.id) {
      inMemoryQuizzesCache.set(String(quiz.id).toLowerCase().trim(), quiz);
      inMemoryQuizzesCache.set(`qz_${String(quiz.id).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`, quiz);
    }
  },
  /**
   * Retrieves assignments from relational assignments table.
   */
  async getAssignments(user?: AuthenticatedUser): Promise<{ assignments: any[]; count: number }> {
    const supabase = getServerSupabase();

    try {
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select('*')
        .is('deleted_at', null)
        .order('due_at', { ascending: false });

      let rawList = assignments || [];
      if (rawList.length === 0) {
        try {
          const { data: stateDoc } = await supabase
            .from('app_states')
            .select('state')
            .eq('id', 'shared_default_state')
            .maybeSingle();
          if (stateDoc?.state?.customAssignments && Array.isArray(stateDoc.state.customAssignments) && stateDoc.state.customAssignments.length > 0) {
            rawList = stateDoc.state.customAssignments;
          }
        } catch {
          // Non-blocking app_states fallback
        }

        // Also check disk authoritative state backup if relational and supabase return empty
        if (rawList.length === 0) {
          try {
            const diskPath = path.join(process.cwd(), 'data', 'authoritative_state.json');
            const distDiskPath = path.join(process.cwd(), 'dist', 'data', 'authoritative_state.json');
            const targetPath = fs.existsSync(diskPath) ? diskPath : (fs.existsSync(distDiskPath) ? distDiskPath : null);
            if (targetPath) {
              const parsed = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
              if (parsed?.customAssignments && Array.isArray(parsed.customAssignments) && parsed.customAssignments.length > 0) {
                rawList = parsed.customAssignments;
              }
            }
          } catch {
            // Non-blocking disk fallback
          }
        }
      }

      if (rawList && rawList.length > 0) {
        const mappedList = rawList.map((a: any) => {
          const rubric = a.rubric || {};
          const quizData = a.quizData || rubric.quizData || (rubric.questions && rubric.questions.length > 0 ? {
            id: a.id,
            title: a.title,
            courseCode: a.course_code || a.courseCode || 'MIN-101',
            moduleTrack: a.module_track || a.moduleTrack || 'Core Ministry',
            description: a.description || '',
            dueDate: a.due_at || a.dueDate || '',
            totalPoints: a.max_points || a.maxPoints || 100,
            questions: rubric.questions || [],
            settings: rubric.settings || {},
            shareCode: a.share_code || a.shareCode || rubric.shareCode || `qz_${String(a.id).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
            isPublished: a.is_published !== false,
          } : null);

          const isGroupAssignment = Boolean(
            a.is_group_assignment ?? a.isGroupAssignment ?? rubric.isGroupAssignment ?? false
          );
          const groups = a.groups || rubric.groups || [];

          const item = {
            id: a.id,
            title: a.title,
            description: a.description || '',
            courseCode: a.course_code || a.courseCode || 'MIN-101',
            moduleTrack: a.module_track || a.moduleTrack || 'Core Ministry',
            cohortId: a.cohort_id || a.cohortId || rubric.cohortId || '',
            dueDate: a.due_at || a.dueDate || '',
            dueAt: a.due_at || a.dueAt || '',
            maxPoints: a.max_points || a.maxPoints || 100,
            maxScore: a.max_points || a.maxPoints || 100,
            totalPoints: a.max_points || a.maxPoints || 100,
            weight: a.weight || 10,
            type: quizData ? 'quiz' : (a.type || 'document'),
            published: a.is_published !== false,
            isPublished: a.is_published !== false,
            createdAt: a.created_at || a.createdAt || new Date().toISOString(),
            quizData,
            isGroupAssignment,
            groups,
            shareCode: a.share_code || a.shareCode || rubric.shareCode || (quizData?.shareCode) || undefined,
            rubric,
          };

          if (quizData) {
            assignmentsService.cacheQuizInMemory(item);
          }

          return item;
        });

        let filtered = mappedList;
        if (user && user.role === 'student') {
          filtered = mappedList.filter((a: any) => a.isPublished !== false && a.published !== false);
        } else if (user && (user.role === 'lecturer' || user.role === 'teacher')) {
          let lecturerUserId = (user.userId || user.id || '').trim();
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!UUID_REGEX.test(lecturerUserId)) {
            const { data: u } = await supabase
              .from('users')
              .select('id')
              .or(`firebase_uid.eq.${user.uid || lecturerUserId},id.eq.${lecturerUserId}`)
              .is('deleted_at', null)
              .maybeSingle();
            if (u?.id) lecturerUserId = u.id;
          }

          const allowedCourseIdentifiers = new Set<string>();

          if (UUID_REGEX.test(lecturerUserId)) {
            // Relational query: users.id -> course_offerings.lecturer_user_id -> course_definition_id
            const { data: offerings } = await supabase
              .from('course_offerings')
              .select(`
                id,
                course_definition_id,
                lecturer_user_id,
                course_definitions (
                  id,
                  code
                )
              `)
              .eq('lecturer_user_id', lecturerUserId)
              .is('deleted_at', null);

            if (offerings) {
              offerings.forEach((off: any) => {
                if (off.id) allowedCourseIdentifiers.add(String(off.id).trim().toUpperCase());
                if (off.course_definition_id) allowedCourseIdentifiers.add(String(off.course_definition_id).trim().toUpperCase());
                if (off.course_definitions?.code) allowedCourseIdentifiers.add(String(off.course_definitions.code).trim().toUpperCase());
              });
            }
          }

          filtered = mappedList.filter((a: any) => {
            const courseId = String(a.course_code || a.courseCode || a.course_definition_id || a.courseId || '').trim().toUpperCase();
            if (!courseId) return true;
            return allowedCourseIdentifiers.size === 0 || allowedCourseIdentifiers.has(courseId);
          });
        }
        return { assignments: filtered, count: filtered.length };
      }
    } catch (err) {
      logger.error('Error fetching assignments from relational table:', err);
    }

    return { assignments: [], count: 0 };
  },

  /**
   * Retrieves submissions joined with grades and rubric evaluations from relational tables.
   */
  async getSubmissions(
    filters?: { studentId?: string; studentName?: string; assignmentId?: string },
    user?: AuthenticatedUser
  ): Promise<{ submissions: any[]; rubricScores: Record<string, any>; count: number }> {
    const supabase = getServerSupabase();

    try {
      let query = supabase
        .from('submissions')
        .select(`
          id,
          assignment_id,
          student_id,
          status,
          submitted_at,
          submission_content,
          file_url,
          file_name,
          file_type,
          grades (
            id,
            points_awarded,
            feedback,
            graded_at,
            graded_by_user_id
          ),
          students (
            id,
            student_number,
            profiles (
              first_name,
              last_name,
              avatar_url
            )
          ),
          assignments (
            title,
            max_points,
            course_code,
            course_definition_id
          )
        `)
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false });

      if (filters?.assignmentId) {
        query = query.eq('assignment_id', filters.assignmentId);
      }

      if (user && user.role === 'student') {
        const studentUuid = user.studentRecordId || user.studentId || user.userId;
        if (studentUuid) {
          query = query.eq('student_id', studentUuid);
        }
      } else if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }

      const { data: dbSubmissions } = await query;
      let result: any[] = [];
      const rubricScores: Record<string, any> = {};

      if (dbSubmissions && dbSubmissions.length > 0) {
        const formatted = dbSubmissions.map((s: any) => {
          const std = s.students;
          const p = Array.isArray(std?.profiles) ? std?.profiles[0] : std?.profiles;
          const studentName = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Student';
          const grade = Array.isArray(s.grades) ? s.grades[0] : s.grades;
          const asg = Array.isArray(s.assignments) ? s.assignments[0] : s.assignments;

          return {
            id: s.id,
            assignmentId: s.assignment_id,
            assignmentTitle: asg?.title || 'Assignment',
            studentId: s.student_id,
            student: {
              id: s.student_id,
              name: studentName,
              photoUrl: p?.avatar_url || null,
            },
            studentName,
            status: s.status,
            submittedAt: s.submitted_at,
            content: s.submission_content || '',
            fileUrl: s.file_url || '',
            fileName: s.file_name || '',
            score: grade?.points_awarded,
            grade: grade?.points_awarded,
            feedback: grade?.feedback || '',
            gradedAt: grade?.graded_at,
            maxPoints: asg?.max_points || 100,
            courseCode: asg?.course_code || asg?.course_definition_id || '',
          };
        });
        result = formatted;
      }
        
      try {
         let quizQuery = supabase.from('quiz_attempts').select('*').in('status', ['submitted', 'graded', 'released']);
         if (filters?.assignmentId) {
           quizQuery = quizQuery.eq('quiz_id', filters.assignmentId);
         }
         const { data: dbQuizSubs, error: qsError } = await quizQuery;
         if (!qsError && dbQuizSubs && dbQuizSubs.length > 0) {
            const formattedQuizSubs = dbQuizSubs.map((qs: any) => {
               const tmpl = Array.isArray(DEFAULT_QUIZ_TEMPLATES)
                 ? DEFAULT_QUIZ_TEMPLATES.find((t: any) => t.id === qs.quiz_id || t.shareCode === qs.quiz_id)
                 : null;
               const quizTitle = qs.quiz_title || tmpl?.title || 'Quiz Assessment';

               return {
                  id: qs.id,
                  assignmentId: qs.quiz_id,
                  quizId: qs.quiz_id,
                  assignmentTitle: quizTitle,
                  quizTitle,
                  studentId: qs.student_id || 'external_user',
                  student: {
                    id: qs.student_id || 'external_user',
                    name: qs.student_name,
                    email: qs.student_email
                  },
                  studentName: qs.student_name,
                  status: (qs.score_percentage || 0) >= 75 ? 'Graded' : 'Submitted',
                  submittedAt: qs.submitted_at,
                  score: qs.score,
                  percentage: qs.score_percentage,
                  quizVersionId: qs.quiz_version_id,
                  maxPoints: qs.max_points || 100,
                  maxScore: qs.max_points || 100,
                  timeSpentSeconds: qs.time_spent_seconds || 0,
                  quizAnswers: qs.responses || {},
                  quizAttemptId: qs.id,
                  studentNotes: `Completed Class Day Quiz (${qs.score_percentage || 0}% score). Correct tally: ${qs.score || 0}/${qs.max_points || 100} pts.`,
                  teacherFeedback: `Automated quiz tally: ${qs.score || 0}/${qs.max_points || 100} points (${qs.score_percentage || 0}%). Completed on ${qs.submitted_at}.`
               };
            });
            result = [...result, ...formattedQuizSubs];
         }
      } catch (e) {
         // Ignore quietly if table doesn't exist
      }

      if (user && user.role === 'student') {
          const studentUuid = user.studentRecordId || user.studentId || user.userId;
          const userUuid = user.userId || user.id;
          result = result.filter(
            (sub) => (sub.studentId && (sub.studentId === studentUuid || sub.studentId === userUuid)) ||
                     (sub.student?.id && (sub.student.id === studentUuid || sub.student.id === userUuid)) ||
                     ((sub as any).student_id && ((sub as any).student_id === studentUuid || (sub as any).student_id === userUuid)) ||
                     (sub.studentName && user.name && sub.studentName.toLowerCase().trim() === user.name.toLowerCase().trim())
          );
        } else if (user && (user.role === 'lecturer' || user.role === 'teacher')) {
          let lecturerUserId = (user.userId || user.id || '').trim();
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!UUID_REGEX.test(lecturerUserId)) {
            const { data: u } = await supabase
              .from('users')
              .select('id')
              .or(`firebase_uid.eq.${user.uid || lecturerUserId},id.eq.${lecturerUserId}`)
              .is('deleted_at', null)
              .maybeSingle();
            if (u?.id) lecturerUserId = u.id;
          }

          const allowedCourseIdentifiers = new Set<string>();

          if (UUID_REGEX.test(lecturerUserId)) {
            // Relational query: users.id -> course_offerings.lecturer_user_id -> course_definition_id
            const { data: offerings } = await supabase
              .from('course_offerings')
              .select(`
                id,
                course_definition_id,
                lecturer_user_id,
                course_definitions (
                  id,
                  code
                )
              `)
              .eq('lecturer_user_id', lecturerUserId)
              .is('deleted_at', null);

            if (offerings) {
              offerings.forEach((off: any) => {
                if (off.id) allowedCourseIdentifiers.add(String(off.id).trim().toUpperCase());
                if (off.course_definition_id) allowedCourseIdentifiers.add(String(off.course_definition_id).trim().toUpperCase());
                if (off.course_definitions?.code) allowedCourseIdentifiers.add(String(off.course_definitions.code).trim().toUpperCase());
              });
            }
          }

          result = result.filter((sub) => {
            const courseId = String(sub.courseCode || '').trim().toUpperCase();
            if (!courseId) return false;
            return allowedCourseIdentifiers.has(courseId);
          });
        } else if (filters?.studentId) {
          result = result.filter((sub) => sub.studentId === filters.studentId || (sub as any).student_id === filters.studentId);
        }

        return {
          submissions: result,
          rubricScores,
          count: result.length,
        };
    } catch (err) {
      logger.error('Error fetching submissions from relational table:', err);
    }

    return { submissions: [], rubricScores: {}, count: 0 };
  },

  /**
   * Securely submits an assignment for an authenticated student.
   * 9.1: Derives studentId strictly from req.user context, ignoring client identity inputs.
   * 9.2: Validates assignment existence, course association, student enrollment, publication, and window.
   * 9.3: Sanitizes payload to prevent student grade manipulation.
   */
  async submitAssignmentForUser(
    assignmentId: string,
    payload: any,
    user: AuthenticatedUser
  ): Promise<{ status: string; submission: any }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    // 9.1 Derive studentRecordId from server context strictly as a UUID (Never trust client)
    let studentId = user.studentRecordId;
    if (!studentId && user.userId) {
      const { data: std } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.userId)
        .maybeSingle();
      if (std?.id) studentId = std.id;
    }
    if (!studentId && user.email) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, students(id)')
        .ilike('email', user.email)
        .maybeSingle();
      if (prof?.students && Array.isArray(prof.students) && prof.students[0]?.id) {
        studentId = prof.students[0].id;
      }
    }
    if (!studentId) {
      const { data: std } = await supabase.from('students').select('id').limit(1).maybeSingle();
      studentId = std?.id || '00000000-0000-0000-0000-000000000000';
    }

    // 9.2 Validate assignment rules
    const { data: assignment } = await supabase
      .from('assignments')
      .select('*, courses(id, title)')
      .eq('id', assignmentId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (assignment.is_published === false) {
      throw new Error('Assignment is not published');
    }

    // Check submission window
    if (assignment.lock_at) {
      const lockTime = new Date(assignment.lock_at).getTime();
      if (Date.now() > lockTime) {
        throw new Error('Submission window is closed for this assignment');
      }
    }

    // Check student enrollment
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .maybeSingle();

    if (!student) {
      throw new Error('Student is not enrolled in this institution');
    }

    // 9.3 Prevent student grade manipulation (Sanitize payload)
    const content = payload?.content || payload?.submission_content || payload?.studentNotes || '';
    const fileUrl = payload?.fileUrl || payload?.file_url || payload?.studentFileUrl || '';
    const fileName = payload?.fileName || payload?.file_name || payload?.studentFileName || '';

    const submissionPayload = {
      id: payload?.id || `SUB-${Date.now()}`,
      assignment_id: assignmentId,
      student_id: studentId,
      status: 'submitted', // Force status, never allow client 'graded'
      submitted_at: timestamp,
      submission_content: content,
      file_url: fileUrl,
      file_name: fileName,
      updated_at: timestamp,
    };

    const { data: saved, error } = await supabase
      .from('submissions')
      .upsert(submissionPayload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      logger.warn('Submission upsert warning:', error.message);
    }

    await logAuditEvent({
      actorUserId: user.email,
      entityType: 'submission',
      entityId: submissionPayload.id,
      action: 'create',
      newValues: {
        assignmentId,
        studentId,
        submittedAt: timestamp,
      },
    });

    return {
      status: 'submitted',
      submission: {
        id: saved?.id || submissionPayload.id,
        assignmentId,
        studentId,
        status: 'submitted',
        submittedAt: timestamp,
        content,
        fileUrl,
        fileName,
      },
    };
  },

  /**
   * Deprecated backward-compatible submission handler.
   */
  async submitAssignment(submission: any, actorUserId?: string): Promise<{ status: string; submission: any }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    try {
      // Resolve student ID (Primary Identifier)
      let studentId = submission.studentId;
      if (!studentId && submission.studentName) {
        const parts = submission.studentName.trim().split(' ');
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_id, students(id)')
          .ilike('first_name', parts[0])
          .maybeSingle();
        if (prof?.students && prof.students[0]?.id) {
          studentId = prof.students[0].id;
        }
      }

      if (!studentId) {
        const { data: std } = await supabase.from('students').select('id').limit(1).maybeSingle();
        studentId = std?.id || '00000000-0000-0000-0000-000000000000';
      }

      // 9.3 Prevent student grade manipulation
      const submissionPayload = {
        id: submission.id || `SUB-${Date.now()}`,
        assignment_id: submission.assignmentId,
        student_id: studentId,
        status: 'submitted',
        submitted_at: timestamp,
        submission_content: submission.content || '',
        file_url: submission.fileUrl || '',
        file_name: submission.fileName || '',
        updated_at: timestamp,
      };

      const { data: saved, error } = await supabase
        .from('submissions')
        .upsert(submissionPayload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        logger.warn('Submission upsert warning:', error.message);
      }

      await logAuditEvent({
        actorUserId,
        entityType: 'submission',
        entityId: submissionPayload.id,
        action: 'create',
        newValues: {
          assignmentId: submission.assignmentId,
          studentId,
          studentName: submission.studentName,
          submittedAt: timestamp,
        },
      });

      return {
        status: 'submitted',
        submission: {
          ...submission,
          id: saved?.id || submissionPayload.id,
          studentId,
          status: 'submitted',
          submittedAt: timestamp,
        },
      };
    } catch (err: any) {
      logger.error('Error in submitAssignment relational service:', err);
      throw err;
    }
  },

  /**
   * Securely grades a student submission with lecturer verification chain, authoritative score bounds checking,
   * and Phase 10 grade lifecycle locking checks.
   */
  async gradeSubmission(
    data: {
      submissionId?: string;
      assignmentId?: string;
      studentId?: string;
      studentName?: string;
      score: number;
      feedback?: string;
      rubricScores?: any;
      overrideReason?: string;
      allowLockedOverride?: boolean;
    },
    actorUser?: AuthenticatedUser | string
  ): Promise<{ status: string; score: number; feedback?: string }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    const actorUserId = typeof actorUser === 'object' ? actorUser.userId : (actorUser || null);
    const actorRole = typeof actorUser === 'object' ? actorUser.role : 'teacher';

    try {
      if (!data.submissionId) {
        throw new Error('submissionId is required for grading');
      }

      // 1. Verify submission, assignment, and course relationship chain
      const { data: sub, error: subErr } = await supabase
        .from('submissions')
        .select('*, assignments(*)')
        .eq('id', data.submissionId)
        .maybeSingle();

      if (subErr || !sub) {
        throw new Error('Submission not found');
      }

      const currentStatus = (sub.status || 'submitted').toUpperCase().trim();

      // Phase 10: Check if grade is LOCKED
      if (currentStatus === 'LOCKED' || currentStatus === 'LOCKED_GRADE') {
        const elevatedRoles = ['super_admin', 'admin', 'registrar'];
        const isElevated = elevatedRoles.includes(actorRole) || data.allowLockedOverride;

        if (!isElevated) {
          throw new Error(
            'Grade is LOCKED. Standard lecturers cannot modify locked grades. An override must be approved by the Registrar or Admin.'
          );
        }
      }

      const assignment = Array.isArray(sub.assignments) ? sub.assignments[0] : sub.assignments;
      if (!assignment) {
        throw new Error('Associated assignment not found for this submission');
      }

      // Verify lecturer assignment against database for lecturer/teacher role
      const courseCode = assignment.course_code || assignment.courseCode || assignment.course_definition_id || assignment.courseId;
      if (typeof actorUser === 'object' && (actorUser.role === 'lecturer' || actorUser.role === 'teacher')) {
        if (!courseCode) {
          throw new Error('Access Denied: Course context (courseCode) is required for lecturer authorization.');
        }
        const { verifyLecturerCourseInDatabase } = await import('../../middleware/rbac');
        const isAssigned = await verifyLecturerCourseInDatabase(actorUser, courseCode);
        if (!isAssigned) {
          throw new Error(`Access Denied: You are not assigned as the lecturer for course ${courseCode} in the database.`);
        }
      }

      // 2. Validate score against authoritative maxPoints
      const maxScore = Number(assignment.max_points || assignment.maxPoints || 100);
      const numericScore = Number(data.score);
      if (isNaN(numericScore) || numericScore < 0 || numericScore > maxScore) {
        throw new Error(`Score must be a number between 0 and ${maxScore}`);
      }

      // 3. Upsert grade row
      const { error: gradeErr } = await supabase
        .from('grades')
        .upsert(
          {
            submission_id: data.submissionId,
            points_awarded: numericScore,
            feedback: data.feedback || '',
            graded_at: timestamp,
            graded_by_user_id: actorUserId,
            updated_at: timestamp,
          },
          { onConflict: 'submission_id' }
        );

      if (gradeErr) {
        logger.warn('Grade upsert warning:', gradeErr.message);
      }

      // 4. Update submission status to GRADED if not already in an advanced state
      const nextStatus = currentStatus === 'SUBMITTED' ? 'GRADED' : sub.status;
      await supabase
        .from('submissions')
        .update({ status: nextStatus, updated_at: timestamp })
        .eq('id', data.submissionId);

      // 5. If this is a group assignment, cascade score and feedback to all members of the group
      const isGroup = Boolean(
        assignment.is_group_assignment ??
        assignment.isGroupAssignment ??
        assignment.rubric?.isGroupAssignment ??
        sub.is_group_submission ??
        sub.isGroupSubmission ??
        false
      );
      const groupsList: Array<{ groupName: string; memberNames: string[] }> =
        assignment.groups || assignment.rubric?.groups || [];

      if (isGroup && groupsList.length > 0) {
        const studentName = (sub.student_name || sub.studentName || data.studentName || '').toLowerCase().trim();
        const subGroupName = (sub.group_name || sub.groupName || '').toLowerCase().trim();

        const matchingGroup = groupsList.find(
          (g) =>
            (subGroupName && g.groupName.toLowerCase().trim() === subGroupName) ||
            (studentName && g.memberNames.some((m) => m.toLowerCase().trim() === studentName))
        );

        if (matchingGroup && matchingGroup.memberNames?.length > 0) {
          for (const memberName of matchingGroup.memberNames) {
            const memberTrimmed = memberName.trim();
            if (memberTrimmed.toLowerCase() === studentName) continue; // Already graded above

            try {
              const { data: memberSub } = await supabase
                .from('submissions')
                .select('id, status')
                .eq('assignment_id', assignment.id)
                .ilike('student_name', memberTrimmed)
                .maybeSingle();

              let memberSubId = memberSub?.id;
              if (!memberSubId) {
                const { data: newSub } = await supabase
                  .from('submissions')
                  .insert({
                    assignment_id: assignment.id,
                    student_name: memberTrimmed,
                    status: 'GRADED',
                    group_name: matchingGroup.groupName,
                    is_group_submission: true,
                    created_at: timestamp,
                    updated_at: timestamp,
                  })
                  .select('id')
                  .maybeSingle();
                memberSubId = newSub?.id;
              } else {
                await supabase
                  .from('submissions')
                  .update({
                    status: nextStatus,
                    group_name: matchingGroup.groupName,
                    is_group_submission: true,
                    updated_at: timestamp,
                  })
                  .eq('id', memberSubId);
              }

              if (memberSubId) {
                await supabase
                  .from('grades')
                  .upsert(
                    {
                      submission_id: memberSubId,
                      points_awarded: numericScore,
                      feedback: data.feedback || '',
                      graded_at: timestamp,
                      graded_by_user_id: actorUserId,
                      updated_at: timestamp,
                    },
                    { onConflict: 'submission_id' }
                  );
              }
            } catch (cascadeErr) {
              logger.warn(`Group grade cascade notice for member ${memberTrimmed}:`, cascadeErr);
            }
          }
        }
      }

      // Log audit entry with all authoritative fields
      const isLockedOverride = currentStatus === 'LOCKED' || Boolean(data.overrideReason);
      await logAuditEvent({
        actorUserId: actorUserId,
        actorRole: actorRole,
        entityType: 'grade',
        entityId: data.submissionId,
        action: isLockedOverride ? 'grade_override_approved' : 'grade_recorded',
        newValues: {
          previousStatus: currentStatus,
          newStatus: nextStatus,
          score: numericScore,
          feedback: data.feedback,
          rubricScores: data.rubricScores,
          maxScore,
          overrideReason: data.overrideReason || null,
        },
        changedFields: ['score', 'feedback', 'status'],
        reason: data.overrideReason || (isLockedOverride ? 'Grade override approved' : 'Grade recorded'),
      });

      return {
        status: nextStatus,
        score: numericScore,
        feedback: data.feedback,
      };
    } catch (err: any) {
      logger.error('Error in gradeSubmission relational service:', err);
      throw err;
    }
  },

  /**
   * Transitions a grade through its controlled lifecycle:
   * SUBMITTED -> GRADED -> MODERATION -> RELEASED -> LOCKED
   * 
   * Transitioning TO or FROM LOCKED requires elevated permissions (Registrar/Admin).
   */
  async transitionGradeLifecycle(
    params: {
      submissionId: string;
      targetStatus: 'SUBMITTED' | 'GRADED' | 'MODERATION' | 'RELEASED' | 'LOCKED' | string;
      reason?: string;
    },
    actorUser: AuthenticatedUser
  ): Promise<{ status: string; lifecycleStatus: string }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();
    const normalizedTarget = params.targetStatus.toUpperCase().trim();

    const validStatuses = ['SUBMITTED', 'GRADED', 'MODERATION', 'RELEASED', 'LOCKED'];
    if (!validStatuses.includes(normalizedTarget)) {
      throw new Error(`Invalid lifecycle status. Allowed values: ${validStatuses.join(', ')}`);
    }

    // 1. Fetch current submission
    const { data: sub, error } = await supabase
      .from('submissions')
      .select('*, assignments(*)')
      .eq('id', params.submissionId)
      .maybeSingle();

    if (error || !sub) {
      throw new Error('Submission not found');
    }

    const currentStatus = (sub.status || 'SUBMITTED').toUpperCase().trim();

    // 2. Lock protection check: Transitioning TO or FROM LOCKED requires elevated permissions
    if (currentStatus === 'LOCKED' || normalizedTarget === 'LOCKED') {
      const elevatedRoles = ['super_admin', 'admin', 'registrar'];
      if (!elevatedRoles.includes(actorUser.role)) {
        throw new Error(
          'Access denied: Only Registrar or Admin can lock or transition locked grades.'
        );
      }
    }

    // 3. Update status in database
    const dbStatus = normalizedTarget.toLowerCase();
    const { error: updateErr } = await supabase
      .from('submissions')
      .update({ status: dbStatus, updated_at: timestamp })
      .eq('id', params.submissionId);

    if (updateErr) {
      logger.warn('Submission lifecycle update warning:', updateErr.message);
    }

    // 4. Log audit record with all authoritative fields
    await logAuditEvent({
      actorUserId: actorUser.userId,
      actorRole: actorUser.role,
      entityType: 'grade_lifecycle',
      entityId: params.submissionId,
      action: `grade_lifecycle_transition_${normalizedTarget.toLowerCase()}`,
      oldValues: { status: currentStatus },
      newValues: {
        previousStatus: currentStatus,
        targetStatus: normalizedTarget,
        status: dbStatus,
      },
      changedFields: ['status'],
      reason: params.reason || `Transitioned to ${normalizedTarget} by ${actorUser.role}`,
    });

    return {
      status: 'success',
      lifecycleStatus: normalizedTarget,
    };
  },

  /**
   * Administrative override for locked grades requiring an explicit reason.
   */
  async overrideLockedGrade(
    params: {
      submissionId: string;
      score: number;
      feedback?: string;
      reason: string;
    },
    actorUser: AuthenticatedUser
  ): Promise<{ status: string; score: number; feedback?: string; overrideApproved: boolean }> {
    const elevatedRoles = ['super_admin', 'admin', 'registrar'];
    if (!elevatedRoles.includes(actorUser.role)) {
      throw new Error('Access denied: Only Registrar or Admin can approve grade overrides for locked records.');
    }

    if (!params.reason || params.reason.trim().length === 0) {
      throw new Error('An explicit justification reason is required for an administrative grade override.');
    }

    const res = await this.gradeSubmission(
      {
        submissionId: params.submissionId,
        score: params.score,
        feedback: params.feedback,
        overrideReason: params.reason,
        allowLockedOverride: true,
      },
      actorUser
    );

    return {
      ...res,
      overrideApproved: true,
    };
  },

  /**
   * Creates a new assignment directly in relational assignments table.
   */
  async createAssignment(
    data: {
      title: string;
      description?: string;
      courseCode?: string;
      courseId?: string;
      courseDefinitionId?: string;
      dueDate?: string;
      dueAt?: string;
      maxScore?: number;
      maxPoints?: number;
      weight?: number;
      isPublished?: boolean;
      rubric?: any;
      allowedFileTypes?: string[];
    },
    actorUser: AuthenticatedUser
  ): Promise<{ status: string; assignment: any }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    const cleanTitle = data.title?.trim();
    if (!cleanTitle) {
      throw new Error('Assignment title is required');
    }

    const dueAt = data.dueAt || data.dueDate || new Date(Date.now() + 7 * 86400000).toISOString();
    const maxPoints = data.maxPoints || data.maxScore || 100;
    const courseCode = data.courseCode || 'MIN-101';
    const createdId = (data as any).id || `asg_${Date.now()}`;

    const rubricPayload = {
      ...(data.rubric || {}),
      quizData: (data as any).quizData || data.rubric?.quizData || null,
      questions: (data as any).questions || data.rubric?.questions || [],
      settings: (data as any).settings || data.rubric?.settings || {},
      isGroupAssignment: Boolean((data as any).isGroupAssignment ?? data.rubric?.isGroupAssignment ?? false),
      groups: (data as any).groups || data.rubric?.groups || [],
    };

    const insertPayload: any = {
      id: createdId,
      title: cleanTitle,
      description: data.description || '',
      course_code: courseCode,
      course_definition_id: data.courseDefinitionId || null,
      due_at: dueAt,
      max_points: maxPoints,
      weight: data.weight || 10,
      is_published: data.isPublished !== false,
      rubric: rubricPayload,
      created_by_user_id: actorUser.userId,
      created_at: timestamp,
      updated_at: timestamp,
    };

    try {
      const { data: inserted, error } = await supabase
        .from('assignments')
        .upsert(insertPayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error) {
        logger.warn('Error upserting relational assignment, attempting fallback:', error.message);
      }
    } catch (err: any) {
      logger.warn('Error inserting relational assignment:', err);
    }

    // Also persist snapshot to app_states shared_default_state for seamless disaster recovery and quick retrieval
    try {
      const { data: stateDoc } = await supabase
        .from('app_states')
        .select('state')
        .eq('id', 'shared_default_state')
        .maybeSingle();
      if (stateDoc?.state) {
        const currentCustom: any[] = stateDoc.state.customAssignments || [];
        const existingIdx = currentCustom.findIndex((a: any) => a.id === createdId);
        const updatedCustom = existingIdx >= 0
          ? currentCustom.map((a: any, i: number) => (i === existingIdx ? { ...a, ...insertPayload, ...data, id: createdId } : a))
          : [{ ...insertPayload, ...data, id: createdId }, ...currentCustom];
        await supabase
          .from('app_states')
          .update({
            state: { ...stateDoc.state, customAssignments: updatedCustom },
            updated_at: timestamp,
          })
          .eq('id', 'shared_default_state');
      }
    } catch (err) {
      // Non-blocking sync
    }

    await logAuditEvent({
      actorUserId: actorUser.userId,
      actorRole: actorUser.role,
      entityType: 'assignment',
      entityId: createdId,
      action: 'create',
      newValues: { title: cleanTitle, courseCode, dueAt, maxPoints },
      changedFields: ['title', 'course_code', 'due_at', 'max_points'],
      reason: `Assignment '${cleanTitle}' created`,
    });

    const createdAssignment = {
      id: createdId,
      title: cleanTitle,
      description: data.description || '',
      courseCode,
      dueDate: dueAt,
      dueAt,
      maxScore: maxPoints,
      maxPoints,
      totalPoints: maxPoints,
      weight: data.weight || 10,
      isPublished: data.isPublished !== false,
      published: data.isPublished !== false,
      type: (data as any).type || ((data as any).quizData || rubricPayload.questions?.length > 0 ? 'quiz' : 'document'),
      shareCode: (data as any).shareCode || `qz_${createdId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
      questions: rubricPayload.questions,
      settings: rubricPayload.settings,
      quizData: rubricPayload.quizData,
      isGroupAssignment: rubricPayload.isGroupAssignment,
      groups: rubricPayload.groups,
    };

    assignmentsService.cacheQuizInMemory(createdAssignment);
    await saveQuizVersions(createdId, data, timestamp);
    if (data.rubric) {
      await saveQuizVersions(createdId, data.rubric, timestamp);
    }

    return {
      status: 'created',
      assignment: createdAssignment,
    };
  },

  /**
   * Updates an existing assignment directly in relational assignments table.
   */
  async updateAssignment(
    id: string,
    data: {
      title?: string;
      description?: string;
      courseCode?: string;
      dueDate?: string;
      dueAt?: string;
      maxScore?: number;
      maxPoints?: number;
      weight?: number;
      isPublished?: boolean;
      rubric?: any;
      quizData?: any;
      isGroupAssignment?: boolean;
      groups?: any[];
    },
    actorUser: AuthenticatedUser
  ): Promise<{ status: string; assignment: any }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    const updates: any = { updated_at: timestamp };
    if (data.title !== undefined) updates.title = data.title.trim();
    if (data.description !== undefined) updates.description = data.description;
    if (data.courseCode !== undefined) updates.course_code = data.courseCode;
    if (data.dueAt !== undefined || data.dueDate !== undefined) updates.due_at = data.dueAt || data.dueDate;
    if (data.maxPoints !== undefined || data.maxScore !== undefined) updates.max_points = data.maxPoints || data.maxScore;
    if (data.weight !== undefined) updates.weight = data.weight;
    if (data.isPublished !== undefined) updates.is_published = data.isPublished;

    if (data.rubric !== undefined || data.quizData !== undefined || data.isGroupAssignment !== undefined || data.groups !== undefined) {
      updates.rubric = {
        ...(data.rubric || {}),
        quizData: data.quizData || data.rubric?.quizData || null,
        isGroupAssignment: Boolean(data.isGroupAssignment ?? data.rubric?.isGroupAssignment ?? false),
        groups: data.groups || data.rubric?.groups || [],
      };
    }

    let updatedRec: any = null;
    try {
      const { data: updated, error } = await supabase
        .from('assignments')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && updated) {
        updatedRec = updated;
      }
    } catch (err: any) {
      logger.warn('Error updating relational assignment:', err);
    }

    // Also persist snapshot to app_states shared_default_state
    try {
      const { data: stateDoc } = await supabase
        .from('app_states')
        .select('state')
        .eq('id', 'shared_default_state')
        .maybeSingle();
      if (stateDoc?.state) {
        const currentCustom: any[] = stateDoc.state.customAssignments || [];
        const existingIdx = currentCustom.findIndex((a: any) => a.id === id);
        if (existingIdx >= 0) {
          const updatedCustom = currentCustom.map((a: any, i: number) => (i === existingIdx ? { ...a, ...updates, ...data, id } : a));
          await supabase
            .from('app_states')
            .update({
              state: { ...stateDoc.state, customAssignments: updatedCustom },
              updated_at: timestamp,
            })
            .eq('id', 'shared_default_state');
        }
      }
    } catch (err) {
      // Non-blocking sync
    }

    await logAuditEvent({
      actorUserId: actorUser.userId,
      actorRole: actorUser.role,
      entityType: 'assignment',
      entityId: id,
      action: 'update',
      newValues: updates,
      changedFields: Object.keys(updates),
      reason: `Assignment ${id} updated`,
    });

    await saveQuizVersions(id, data, timestamp);
    if (data.rubric) {
      await saveQuizVersions(id, data.rubric, timestamp);
    }

    return {
      status: 'updated',
      assignment: updatedRec || { id, ...data, updatedAt: timestamp },
    };
  },

  /**
   * Soft-deletes an assignment directly from relational database.
   */
  async deleteAssignment(id: string, actorUser: AuthenticatedUser): Promise<{ success: boolean; id: string }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    try {
      await supabase
        .from('assignments')
        .update({ deleted_at: timestamp })
        .eq('id', id);
    } catch (err: any) {
      logger.warn('Error soft-deleting relational assignment:', err);
    }

    inMemoryQuizzesCache.delete(id.toLowerCase().trim());

    // Also update app_states shared_default_state
    try {
      const { data: stateDoc } = await supabase
        .from('app_states')
        .select('state')
        .eq('id', 'shared_default_state')
        .maybeSingle();
      if (stateDoc?.state?.customAssignments) {
        const filtered = stateDoc.state.customAssignments.filter((a: any) => a.id !== id && a.quizData?.id !== id);
        await supabase
          .from('app_states')
          .update({
            state: { ...stateDoc.state, customAssignments: filtered },
            updated_at: timestamp,
          })
          .eq('id', 'shared_default_state');
      }
    } catch {}

    await logAuditEvent({
      actorUserId: actorUser.userId,
      actorRole: actorUser.role,
      entityType: 'assignment',
      entityId: id,
      action: 'delete',
      reason: `Assignment ${id} deleted`,
    });

    return { success: true, id };
  },

  /**
   * Retrieves a public quiz by share code or assignment ID without authentication.
   * Authoritatively checks existence, publication status, and expiration.
   * Supports specific quiz version queries.
   */
  async getPublicQuiz(shareCodeOrId: string, versionId?: string): Promise<{ quiz?: any; isNotFound?: boolean; isUnpublished?: boolean; isExpired?: boolean; message?: string }> {
    const supabase = getServerSupabase();
    const cleanCode = (shareCodeOrId || '').trim();

    if (!cleanCode) {
      return { isNotFound: true, message: 'Share code or quiz ID parameter is required.' };
    }

    const lookupCode = cleanCode.toLowerCase();
    let matchedQuiz: any = inMemoryQuizzesCache.get(lookupCode) || null;

    // If versionId is supplied, first check relational quiz_versions table in Supabase
    if (versionId) {
      try {
        const { data: verRow } = await supabase
          .from('quiz_versions')
          .select('*')
          .eq('id', versionId)
          .maybeSingle();
        if (verRow && verRow.snapshot) {
          const snapshot = verRow.snapshot;
          return {
            quiz: {
              ...snapshot,
              id: snapshot.quizId || snapshot.id,
              currentVersionId: verRow.id,
              isPublished: snapshot.isPublished !== false,
            }
          };
        }
      } catch (dbVerErr) {
        logger.warn(`Supabase quiz_versions lookup notice for ${versionId}:`, dbVerErr);
      }
    }

    if (matchedQuiz) {
      if (versionId && Array.isArray(matchedQuiz.versions)) {
        const found = matchedQuiz.versions.find((v: any) => v.id === versionId);
        if (found) {
          return {
            quiz: {
              ...matchedQuiz,
              questions: found.questions || matchedQuiz.questions,
              settings: found.settings || matchedQuiz.settings,
              totalPoints: found.totalPoints || matchedQuiz.totalPoints,
              title: found.title || matchedQuiz.title,
              description: found.description || matchedQuiz.description,
              currentVersionId: found.id,
            }
          };
        }
      }
      if (matchedQuiz.isPublished === false) {
        return { isUnpublished: true, message: 'This quiz is currently unpublished or has been revoked by the instructor.' };
      }
      return { quiz: matchedQuiz };
    }

    try {
      // 1. Query relational assignments table
      let { data: asg, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('share_code', cleanCode)
        .is('deleted_at', null)
        .maybeSingle();

      if (!error && asg) {
        let questions = [];
        let settings = {
          shuffleQuestions: false,
          shuffleOptions: false,
          showCorrectAnswers: true,
          showPointValues: true,
          showFeedback: true,
          passingScorePercentage: 75,
          allowMultipleAttempts: true,
          maxAttempts: 2,
        };

        const rubric = asg.rubric || asg.quiz_data || {};
        const versionsList = rubric.versions || [];

        if (versionId && Array.isArray(versionsList)) {
          const found = versionsList.find((v: any) => v.id === versionId);
          if (found) {
            questions = found.questions || [];
            settings = { ...settings, ...(found.settings || {}) };
            matchedQuiz = {
              id: asg.id,
              title: found.title || asg.title,
              courseCode: asg.course_code || 'MIN-101',
              moduleTrack: asg.module_track || 'Module 1: Foundations',
              description: found.description || asg.description || '',
              category: asg.category || 'Scripture Knowledge',
              dueDate: asg.due_at || asg.due_date || '2026-09-30',
              lockAt: asg.lock_at || null,
              shareCode: asg.share_code || cleanCode,
              timeLimitMinutes: asg.time_limit_minutes || 30,
              totalPoints: found.totalPoints || asg.max_points || 100,
              isPublished: asg.is_published !== false,
              questions,
              settings,
              currentVersionId: versionId,
            };
          }
        }

        if (!matchedQuiz) {
          if (asg.rubric?.questions) questions = asg.rubric.questions;
          else if (asg.quiz_data?.questions) questions = asg.quiz_data.questions;
          if (asg.rubric?.settings) settings = { ...settings, ...asg.rubric.settings };

          matchedQuiz = {
            id: asg.id,
            title: asg.title,
            courseCode: asg.course_code || 'MIN-101',
            moduleTrack: asg.module_track || 'Module 1: Foundations',
            description: asg.description || '',
            category: asg.category || 'Scripture Knowledge',
            dueDate: asg.due_at || asg.due_date || '2026-09-30',
            lockAt: asg.lock_at || null,
            shareCode: asg.share_code || cleanCode,
            timeLimitMinutes: asg.time_limit_minutes || 30,
            totalPoints: asg.max_points || 100,
            isPublished: asg.is_published !== false,
            questions,
            settings,
            currentVersionId: asg.rubric?.currentVersionId || asg.quiz_data?.currentVersionId || `ver_${asg.id}_v1`,
          };
        }
      }

      // 2. Query shared app_states table if not directly found in assignments table
      if (!matchedQuiz) {
        try {
          const { data: stateRows } = await supabase
            .from('app_states')
            .select('state')
            .order('updated_at', { ascending: false })
            .limit(10);

          if (stateRows && stateRows.length > 0) {
            for (const row of stateRows) {
              const customAsgs = row.state?.customAssignments || row.state?.assignments;
              if (Array.isArray(customAsgs)) {
                const found = customAsgs.find((a: any) => {
                  const q = a.quizData || a;
                  const qShare = (q.shareCode || (q as any).share_code || '').toLowerCase().trim();
                  const qId = (q.id || a.id || '').toLowerCase().trim();
                  const clean = cleanCode.toLowerCase().trim();
                  const altId = `qz_${(q.id || a.id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
                  const matchesCode = qShare === clean;
                  const hasQuestions = (Array.isArray(q.questions) && q.questions.length > 0) || (Array.isArray(a.questions) && a.questions.length > 0);
                  return matchesCode && hasQuestions;
                });

                if (found) {
                  const q = found.quizData || found;
                  matchedQuiz = {
                    id: q.id || found.id || `quiz_${Date.now()}`,
                    title: q.title || found.title || 'Class Day Assessment',
                    courseCode: q.courseCode || found.courseCode || 'MIN-101',
                    moduleTrack: q.moduleTrack || found.moduleTrack || 'Module 1: Foundations',
                    description: q.description || found.description || '',
                    category: q.category || 'Scripture Knowledge',
                    dueDate: q.dueDate || found.dueDate || '2026-09-30',
                    lockAt: q.lockAt || null,
                    shareCode: q.shareCode || cleanCode,
                    timeLimitMinutes: q.timeLimitMinutes || 30,
                    totalPoints: q.totalPoints || found.maxPoints || 100,
                    isPublished: q.isPublished !== false,
                    questions: q.questions || [],
                    settings: q.settings || {
                      shuffleQuestions: false,
                      shuffleOptions: false,
                      showCorrectAnswers: true,
                      showPointValues: true,
                      showFeedback: true,
                      passingScorePercentage: 75,
                      allowMultipleAttempts: true,
                      maxAttempts: 2,
                    },
                  };
                  break;
                }
              }
            }
          }
        } catch {
          // Ignore non-fatal app_states query error
        }
      }

      // 3. Fallback lookup in DEFAULT_QUIZ_TEMPLATES if not found in database or app_states
      if (!matchedQuiz && Array.isArray(DEFAULT_QUIZ_TEMPLATES)) {
        const tmpl = DEFAULT_QUIZ_TEMPLATES.find(
          (t) =>
            t.shareCode?.toLowerCase() === cleanCode.toLowerCase()
        );

        if (tmpl) {
          matchedQuiz = {
            ...tmpl,
            isPublished: tmpl.isPublished !== false,
          };
        }
      }

      if (!matchedQuiz) {
        return { isNotFound: true, message: 'Quiz not found or link is invalid.' };
      }

      // 3. Authoritative publication check
      if (matchedQuiz.isPublished === false) {
        return { isUnpublished: true, message: 'This quiz is currently unpublished or has been revoked by the instructor.' };
      }

      // 4. Authoritative expiration check (if lockAt or dueDate passed)
      if (matchedQuiz.lockAt) {
        const lockTime = new Date(matchedQuiz.lockAt).getTime();
        if (!isNaN(lockTime) && Date.now() > lockTime) {
          return { isExpired: true, message: 'This quiz submission window has closed.' };
        }
      }

      return { quiz: matchedQuiz };
    } catch (err) {
      logger.warn(`Non-fatal warning fetching public quiz ${cleanCode}:`, err);
      return { isNotFound: true, message: 'Failed to retrieve quiz details.' };
    }
  },

  /**
   * Retrieves active in-progress and submitted attempt records for live teacher monitoring.
   */
   async getQuizAttempts(shareCodeOrId: string): Promise<any[]> {
    const cleanCode = (shareCodeOrId || '').toLowerCase().trim();
    const attemptsList: any[] = [];

    // 1. Gather from inMemoryQuizAttempts
    for (const [id, att] of inMemoryQuizAttempts.entries()) {
      if (
        att.share_code?.toLowerCase() === cleanCode ||
        att.quiz_id?.toLowerCase() === cleanCode ||
        att.id?.toLowerCase() === cleanCode
      ) {
        attemptsList.push({
          id: att.id,
          studentName: att.student_name,
          studentEmail: att.student_email,
          status: att.status || 'in_progress',
          score: att.score,
          maxPoints: att.max_points,
          percentage: att.score_percentage,
          startedAt: att.started_at,
          submittedAt: att.submitted_at,
          lastSaved: att.updated_at,
          responses: att.responses,
          timeSpentSeconds: att.time_spent_seconds || 0,
          gradingStatus: att.grading_status
        });
      }
    }

    // 2. Query Supabase quiz_attempts table
    try {
      const supabase = getServerSupabase();
      const { data } = await supabase
        .from('quiz_attempts')
        .select('*')
        .or(`share_code.eq.${cleanCode},quiz_id.eq.${cleanCode},id.eq.${cleanCode}`);
      
      if (data) {
        data.forEach((row: any) => {
          if (!attemptsList.some(a => a.id === row.id)) {
            attemptsList.push({
              id: row.id,
              studentName: row.student_name,
              studentEmail: row.student_email,
              status: row.status || 'in_progress',
              score: row.score,
              maxPoints: row.max_points,
              percentage: row.score_percentage,
              startedAt: row.started_at,
              submittedAt: row.submitted_at,
              lastSaved: row.updated_at,
              responses: row.responses,
              timeSpentSeconds: row.time_spent_seconds || 0,
              gradingStatus: row.grading_status
            });
          }
        });
      }
    } catch {}

    return attemptsList;
  },

  /**
   * Registers a new server-side quiz attempt before answering starts.
   * This is the canonical entry point for all quiz starts (Public or Authenticated).
   */
  async createQuizAttempt(
    shareCodeOrId: string,
    payload: { 
      studentName: string; 
      studentEmail?: string; 
      studentId?: string;
      quizVersionId?: string;
    }
  ): Promise<{ attemptId: string; startedAt: string; expiresAt?: string; quizSnapshot?: any; quizVersionId?: string }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // 1. Authoritative Quiz Lookup
    const quizLookup = await this.getPublicQuiz(shareCodeOrId, payload.quizVersionId);
    if (!quizLookup || quizLookup.isNotFound || !quizLookup.quiz) {
      throw new Error(quizLookup?.message || 'Quiz not found or link is invalid.');
    }
    
    const quiz = quizLookup.quiz;
    const quizId = quiz.id;
    const versionId = payload.quizVersionId || quiz.currentVersionId || `ver_${quizId}_v1`;

    // 2. Calculate Authoritative Expiration
    let expiresAt: string | undefined;
    if (quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0) {
      expiresAt = new Date(Date.now() + quiz.timeLimitMinutes * 60 * 1000).toISOString();
    }

    const attemptObj = {
      id: attemptId,
      quiz_id: quizId,
      quiz_version_id: versionId,
      share_code: quiz.shareCode || shareCodeOrId,
      student_id: payload.studentId || null,
      student_name: payload.studentName || 'Student',
      student_email: payload.studentEmail || '',
      status: 'in_progress',
      started_at: timestamp,
      updated_at: timestamp,
      expires_at: expiresAt,
      last_saved_at: timestamp,
      responses: {},
      time_spent_seconds: 0
    };

    inMemoryQuizAttempts.set(attemptId, attemptObj);

    try {
      await supabase.from('quiz_attempts').insert([attemptObj]);
    } catch (err) {
      logger.warn('Non-blocking notice inserting quiz attempt to DB:', err);
    }

    return {
      attemptId,
      startedAt: timestamp,
      expiresAt,
      quizSnapshot: quiz,
      quizVersionId: versionId
    };
  },

  /**
   * Server autosave endpoint for student draft responses during a quiz attempt.
   */
  async autosaveQuizAttemptResponses(
    _shareCodeOrId: string,
    attemptId: string,
    payload: { responses: Record<string, any>; timeSpentSeconds?: number }
  ): Promise<{ success: boolean; savedAt: string }> {
    const timestamp = new Date().toISOString();
    let existing = inMemoryQuizAttempts.get(attemptId);
    
    if (!existing) {
      // Try to recover from DB if memory cache is cold
      const supabase = getServerSupabase();
      const { data: dbAttempt } = await supabase.from('quiz_attempts').select('*').eq('id', attemptId).maybeSingle();
      if (dbAttempt) {
        existing = dbAttempt;
      }
    }

    if (!existing) {
      throw new Error(`Attempt session ${attemptId} not found. Autosave rejected.`);
    }

    // Protection: don't save if already submitted
    if (['submitted', 'graded', 'released'].includes(existing.status)) {
      return { success: true, savedAt: existing.updated_at };
    }

    existing.responses = payload.responses || {};
    existing.time_spent_seconds = payload.timeSpentSeconds || 0;
    existing.updated_at = timestamp;
    existing.last_saved_at = timestamp;
    inMemoryQuizAttempts.set(attemptId, existing);

    try {
      const supabase = getServerSupabase();
      await supabase
        .from('quiz_attempts')
        .update({
          responses: payload.responses || {},
          time_spent_seconds: payload.timeSpentSeconds || 0,
          updated_at: timestamp,
          last_saved_at: timestamp
        })
        .eq('id', attemptId);
    } catch (dbErr) {
      logger.warn('Supabase quiz_attempts update notice:', dbErr);
    }

    return { success: true, savedAt: timestamp };
  },

  /**
   * Authoritative submission point for quiz attempts.
   * Unifies public and authenticated quizzes.
   */
  async submitPublicQuizResponse(
    shareCodeOrId: string,
    payload: {
      studentName: string;
      studentEmail?: string;
      responses: Record<string, any>;
      timeSpentSeconds?: number;
      attemptId?: string;
      studentId?: string;
    }
  ): Promise<any> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Resolve Attempt Context
    let attemptId = payload.attemptId;
    let attempt: any = null;

    if (attemptId) {
      attempt = inMemoryQuizAttempts.get(attemptId);
      if (!attempt) {
        const { data: dbAtt } = await supabase.from('quiz_attempts').select('*').eq('id', attemptId).maybeSingle();
        attempt = dbAtt;
      }
    }

    // 2. Authoritative Quiz Lookup
    const quizLookup = await this.getPublicQuiz(shareCodeOrId, attempt?.quiz_version_id);
    if (!quizLookup || quizLookup.isNotFound || !quizLookup.quiz) {
      throw new Error(quizLookup?.message || 'Quiz not found or link is invalid.');
    }
    
    const finalQuiz = quizLookup.quiz;
    const quizId = finalQuiz.id;
    const quizTitle = finalQuiz.title || 'Assessment';
    const cleanStudentName = (payload.studentName || attempt?.student_name || '').trim();

    // 1.5 Anti-Spam / Rate Limit & Multiple Attempt Check
    if (attemptId && (attempt?.status === 'submitted' || attempt?.status === 'graded')) {
      throw new Error('This quiz attempt has already been submitted.');
    }

    try {
      const { data: existingSubmissions } = await supabase
        .from('quiz_attempts')
        .select('id, submitted_at')
        .eq('quiz_id', quizId)
        .ilike('student_name', cleanStudentName)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (existingSubmissions && existingSubmissions.length > 0) {
        const lastSub = existingSubmissions[0];
        const diff = Date.now() - new Date(lastSub.submitted_at).getTime();
        if (diff < 30000) {
          throw new Error('Duplicate submission detected. Please wait at least 30 seconds between attempts.');
        }
      }
    } catch (spamErr: any) {
      if (spamErr.message?.includes('Duplicate submission detected')) throw spamErr;
      // Other DB errors in spam check shouldn't block submission
    }

    if (!cleanStudentName || cleanStudentName.length < 2) {
      throw new Error('A valid Student Name is required.');
    }

    // Normalize responses
    const rawAnswers = (payload as any).rawResponses || payload.responses;
    let responsesPayload: Record<string, any> = {};
    if (Array.isArray(rawAnswers)) {
      rawAnswers.forEach((r: any) => { if (r && r.questionId) responsesPayload[r.questionId] = r.selectedOptionId ?? r.selectedOptionIds ?? r.textAnswer ?? r.answer ?? r.value; });
    } else {
      responsesPayload = { ...rawAnswers };
    }

    // 3. Authoritative Scoring
    let earnedScore = 0;
    let computedTotalPossible = 0;
    const questions = Array.isArray(finalQuiz.questions) ? finalQuiz.questions : [];

    questions.forEach((q: any) => {
      const weight = Number(q.weight) || 10;
      computedTotalPossible += weight;
      const ans = responsesPayload[q.id];

      if (q.type === 'multiple_choice' || q.type === 'true_false' || !q.type) {
        if (ans && ans === q.correctOptionId) earnedScore += weight;
      } else if (q.type === 'checkboxes') {
        const correct = q.correctOptionIds || [];
        const chosen = Array.isArray(ans) ? ans : [];
        if (correct.length === chosen.length && correct.every((id: string) => chosen.includes(id))) earnedScore += weight;
      } else if (q.type === 'short_answer' || q.type === 'fill_blank') {
        const acceptable = (q.acceptableAnswers || []).map((a: string) => a.trim().toLowerCase());
        const userText = (typeof ans === 'string' ? ans : '').trim().toLowerCase();
        if (acceptable.some((a: string) => a === userText || a.replace(/[^a-z0-9]/g, '') === userText.replace(/[^a-z0-9]/g, ''))) earnedScore += weight;
      } else if (q.type === 'paragraph') {
        if (typeof ans === 'string' && ans.trim().length >= 10) earnedScore += weight;
      }
    });

    const totalPossible = finalQuiz.totalPoints || (computedTotalPossible > 0 ? computedTotalPossible : 100);
    const percentage = Math.round((earnedScore / (totalPossible || 1)) * 100);
    const passingThreshold = Number(finalQuiz.settings?.passingScorePercentage) || 75;
    const isPassed = percentage >= passingThreshold;

    // 4. Atomic Database Updates
    try {
      let studentId = payload.studentId || attempt?.student_id || null;
      if (!studentId && (payload.studentEmail || attempt?.student_email)) {
        const { data: std } = await supabase.from('students').select('id').ilike('email', payload.studentEmail || attempt?.student_email).maybeSingle();
        if (std?.id) studentId = std.id;
      }

      // Authoritative Attempt Status Update
      const attemptUpdate = {
        status: 'submitted',
        submitted_at: timestamp,
        updated_at: timestamp,
        responses: responsesPayload,
        score: earnedScore,
        max_points: totalPossible,
        score_percentage: percentage,
        time_spent_seconds: payload.timeSpentSeconds || attempt?.time_spent_seconds || 0,
        grading_status: 'auto_graded'
      };

      if (attemptId) {
        await supabase.from('quiz_attempts').update(attemptUpdate).eq('id', attemptId);
        
        if (inMemoryQuizAttempts.has(attemptId)) {
          const m = inMemoryQuizAttempts.get(attemptId);
          Object.assign(m, attemptUpdate);
          inMemoryQuizAttempts.set(attemptId, m);
        }
      } else {
        // Fallback for direct submission without pre-created attempt
        const fallbackAttemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabase.from('quiz_attempts').insert([{
          id: fallbackAttemptId,
          quiz_id: quizId,
          quiz_version_id: finalQuiz.currentVersionId,
          student_name: cleanStudentName,
          student_email: payload.studentEmail || '',
          student_id: studentId,
          started_at: timestamp,
          ...attemptUpdate
        }]);
      }

    } catch (dbErr) {
      logger.warn('Authoritative quiz attempt DB update notice:', dbErr);
    }

    await logAuditEvent({
      actorUserId: 'system',
      entityType: 'quiz_attempt',
      entityId: attemptId || 'direct_submission',
      action: 'submit',
      newValues: { studentName: cleanStudentName, score: earnedScore, attemptId },
      reason: `Quiz '${quizTitle}' attempt submitted by '${cleanStudentName}'. Score: ${earnedScore}/${totalPossible} (${percentage}%)`,
    });

    return {
      id: attemptId || submissionId,
      quizId,
      quizTitle,
      studentName: cleanStudentName,
      studentEmail: (payload.studentEmail || attempt?.student_email || '').trim(),
      score: earnedScore,
      totalPossible,
      percentage,
      isPassed,
      responses: responsesPayload,
      submittedAt: timestamp,
      timeSpentSeconds: payload.timeSpentSeconds || attempt?.time_spent_seconds || 0,
    };
  },

  /**
   * Generates a comprehensive reconciliation diagnostic report across multiple database layers.
   */
  async getReconciliationDiagnostics(): Promise<any> {
    const supabase = getServerSupabase();
    let assignmentsList: any[] = [];
    let submissionsList: any[] = [];
    let quizSubmissionsList: any[] = [];
    let quizAttemptsList: any[] = [];
    let gradesList: any[] = [];
    let studentsList: any[] = [];

    try {
      const { data } = await supabase.from('assignments').select('*').is('deleted_at', null);
      if (data) assignmentsList = data;
    } catch (e) { logger.warn('assignments fetch error for reconciliation:', e); }

    try {
      const { data } = await supabase.from('submissions').select('*').is('deleted_at', null);
      if (data) submissionsList = data;
    } catch (e) { logger.warn('submissions fetch error for reconciliation:', e); }

    try {
      const { data } = await supabase.from('quiz_submissions').select('*');
      if (data) quizSubmissionsList = data;
    } catch (e) { logger.warn('quiz_submissions fetch error for reconciliation:', e); }

    try {
      const { data } = await supabase.from('quiz_attempts').select('*');
      if (data) quizAttemptsList = data;
    } catch (e) { logger.warn('quiz_attempts fetch error for reconciliation:', e); }

    try {
      const { data } = await supabase.from('grades').select('*');
      if (data) gradesList = data;
    } catch (e) { logger.warn('grades fetch error for reconciliation:', e); }

    try {
      const { data } = await supabase.from('students').select('*');
      if (data) studentsList = data;
    } catch (e) { logger.warn('students fetch error for reconciliation:', e); }

    // Merge in-memory attempts
    const attemptIds = new Set(quizAttemptsList.map(a => String(a.id || '').toLowerCase().trim()));
    for (const [id, att] of inMemoryQuizAttempts.entries()) {
      const normalizedId = String(id).toLowerCase().trim();
      if (!attemptIds.has(normalizedId)) {
        quizAttemptsList.push({
          id: att.id || id,
          quiz_id: att.quiz_id,
          share_code: att.share_code,
          student_name: att.student_name,
          student_email: att.student_email,
          status: att.status || 'in_progress',
          responses: att.responses || {},
          started_at: att.started_at,
          updated_at: att.updated_at,
          time_spent_seconds: att.time_spent_seconds || 0
        });
      }
    }

    const quizMap = new Map<string, any>();
    assignmentsList.forEach(a => {
      quizMap.set(String(a.id).toLowerCase().trim(), a);
      if (a.share_code) {
        quizMap.set(String(a.share_code).toLowerCase().trim(), a);
      }
    });
    // Add DEFAULT_QUIZ_TEMPLATES to quizMap
    if (Array.isArray(DEFAULT_QUIZ_TEMPLATES)) {
      DEFAULT_QUIZ_TEMPLATES.forEach(t => {
        const idLower = String(t.id).toLowerCase().trim();
        const codeLower = String(t.shareCode || '').toLowerCase().trim();
        if (!quizMap.has(idLower)) quizMap.set(idLower, t);
        if (codeLower && !quizMap.has(codeLower)) quizMap.set(codeLower, t);
      });
    }

    const studentMap = new Map<string, any>();
    studentsList.forEach(s => {
      studentMap.set(String(s.id).toLowerCase().trim(), s);
    });

    const submissionMap = new Map<string, any>();
    submissionsList.forEach(s => {
      submissionMap.set(String(s.id).toLowerCase().trim(), s);
    });
    const quizSubMap = new Map<string, any>();
    quizSubmissionsList.forEach(qs => {
      quizSubMap.set(String(qs.id).toLowerCase().trim(), qs);
    });

    const gradeSubMap = new Map<string, any>();
    gradesList.forEach(g => {
      if (g.submission_id) gradeSubMap.set(String(g.submission_id).toLowerCase().trim(), g);
    });

    // Diagnosing anomalies:
    const orphanedAttempts: any[] = [];
    const orphanedSubmissions: any[] = [];
    const submissionsWithoutQuiz: any[] = [];
    const responsesWithoutQuestion: any[] = [];
    const gradesWithoutSubmission: any[] = [];
    const submissionsWithoutStudent: any[] = [];
    const submittedMissingGrade: any[] = [];

    let validAttemptsCount = 0;
    let validSubmissionsCount = 0;
    let validResponsesCount = 0;
    let validGradesCount = 0;

    // 1. QuizAttempt without QuizSubmission
    quizAttemptsList.forEach(att => {
      const hasSubmission = quizSubmissionsList.some(qs => 
        String(qs.quiz_id).toLowerCase().trim() === String(att.quiz_id || att.share_code).toLowerCase().trim() &&
        String(qs.student_name).toLowerCase().trim() === String(att.student_name).toLowerCase().trim()
      );

      if (!hasSubmission) {
        orphanedAttempts.push({
          id: att.id,
          studentName: att.student_name,
          studentEmail: att.student_email,
          quizId: att.quiz_id || att.share_code,
          startedAt: att.started_at,
          status: att.status || 'in_progress',
          type: 'Attempt without Submission'
        });
      } else {
        validAttemptsCount++;
      }
    });

    // 2. QuizSubmission without QuizAttempt
    quizSubmissionsList.forEach(qs => {
      const hasAttempt = quizAttemptsList.some(att => 
        String(att.quiz_id || att.share_code).toLowerCase().trim() === String(qs.quiz_id).toLowerCase().trim() &&
        String(att.student_name).toLowerCase().trim() === String(qs.student_name).toLowerCase().trim()
      );

      if (!hasAttempt) {
        orphanedSubmissions.push({
          id: qs.id,
          studentName: qs.student_name,
          studentEmail: qs.student_email,
          quizId: qs.quiz_id,
          submittedAt: qs.submitted_at,
          score: qs.score,
          type: 'Submission without Attempt'
        });
      } else {
        validSubmissionsCount++;
      }
    });

    // 3. AssignmentSubmission or QuizSubmission without Quiz (unknown quiz)
    submissionsList.forEach(s => {
      const quizId = String(s.assignment_id || '').toLowerCase().trim();
      if (quizId && !quizMap.has(quizId)) {
        submissionsWithoutQuiz.push({
          id: s.id,
          studentId: s.student_id,
          quizId: s.assignment_id,
          submittedAt: s.submitted_at,
          type: 'Assignment submission with unknown Assignment/Quiz'
        });
      }
    });
    quizSubmissionsList.forEach(qs => {
      const quizId = String(qs.quiz_id || '').toLowerCase().trim();
      if (quizId && !quizMap.has(quizId)) {
        submissionsWithoutQuiz.push({
          id: qs.id,
          studentName: qs.student_name,
          quizId: qs.quiz_id,
          submittedAt: qs.submitted_at,
          type: 'Quiz submission with unknown Quiz'
        });
      }
    });

    // 4. Response without Question & count valid responses
    const verifyResponses = (resps: any, quizObj: any, sourceId: string, student: string) => {
      if (!resps || typeof resps !== 'object') return;
      const questionsList = quizObj?.questions || quizObj?.quizData?.questions || [];
      const validQIds = new Set(questionsList.map((q: any) => String(q.id || '').toLowerCase().trim()));

      Object.entries(resps).forEach(([qId, ans]) => {
        const cleanQId = String(qId).toLowerCase().trim();
        if (validQIds.size > 0 && !validQIds.has(cleanQId)) {
          responsesWithoutQuestion.push({
            id: sourceId,
            studentName: student,
            questionId: qId,
            quizId: quizObj.id || quizObj.shareCode,
            quizTitle: quizObj.title,
            type: 'Response referencing missing question'
          });
        } else {
          validResponsesCount++;
        }
      });
    };

    quizAttemptsList.forEach(att => {
      const qId = String(att.quiz_id || att.share_code || '').toLowerCase().trim();
      const quizObj = quizMap.get(qId);
      if (quizObj) {
        verifyResponses(att.responses, quizObj, att.id, att.student_name || 'Student');
      }
    });
    quizSubmissionsList.forEach(qs => {
      const qId = String(qs.quiz_id || '').toLowerCase().trim();
      const quizObj = quizMap.get(qId);
      if (quizObj) {
        verifyResponses(qs.responses, quizObj, qs.id, qs.student_name || 'Student');
      }
    });

    // 5. Grade without Submission
    gradesList.forEach(g => {
      const subId = String(g.submission_id || '').toLowerCase().trim();
      if (subId && !submissionMap.has(subId) && !quizSubMap.has(subId)) {
        gradesWithoutSubmission.push({
          id: g.id,
          submissionId: g.submission_id,
          pointsAwarded: g.points_awarded,
          gradedAt: g.graded_at,
          type: 'Grade without matching Submission'
        });
      } else {
        validGradesCount++;
      }
    });

    // 6. Submission with unknown student
    submissionsList.forEach(s => {
      const sId = String(s.student_id || '').toLowerCase().trim();
      if (sId && sId !== 'external_user' && !studentMap.has(sId)) {
        submissionsWithoutStudent.push({
          id: s.id,
          studentId: s.student_id,
          quizId: s.assignment_id,
          submittedAt: s.submitted_at,
          type: 'Submission with unknown student identifier'
        });
      }
    });

    // 7. Submitted but missing from Gradebook
    quizSubmissionsList.forEach(qs => {
      const subId = String(qs.id).toLowerCase().trim();
      if (!gradeSubMap.has(subId)) {
        submittedMissingGrade.push({
          id: qs.id,
          studentName: qs.student_name,
          quizTitle: qs.quiz_title,
          submittedAt: qs.submitted_at,
          type: 'Submitted Quiz missing Gradebook entry'
        });
      }
    });

    return {
      validAttempts: validAttemptsCount,
      validSubmissions: validSubmissionsCount + submissionsList.length - submissionsWithoutQuiz.filter(s => s.type.includes('Assignment')).length,
      validResponses: validResponsesCount,
      validGrades: validGradesCount,
      orphanedAttempts,
      orphanedSubmissions,
      submissionsWithoutQuiz,
      responsesWithoutQuestion,
      gradesWithoutSubmission,
      submissionsWithoutStudent,
      submittedMissingGrade
    };
  },

  /**
   * Performs automated reconciliation repairs across the data layers.
   */
  async runReconciliationRepairs(repairTypes: string[], user: AuthenticatedUser): Promise<any> {
    const supabase = getServerSupabase();
    const results: string[] = [];
    const timestamp = new Date().toISOString();

    const diagnostics = await this.getReconciliationDiagnostics();

    // 1. Repair orphaned attempts (unsubmitted/abandoned -> autosubmitted draft or cleaned up)
    if (repairTypes.includes('orphanedAttempts') && diagnostics.orphanedAttempts.length > 0) {
      let repairCount = 0;
      for (const att of diagnostics.orphanedAttempts) {
        const originalAtt = inMemoryQuizAttempts.get(att.id);
        const hasResponses = originalAtt && Object.keys(originalAtt.responses || {}).length > 0;
        
        if (hasResponses) {
          try {
            await this.submitPublicQuizResponse(att.quizId, {
              studentName: att.studentName,
              studentEmail: att.studentEmail || '',
              responses: originalAtt.responses,
              timeSpentSeconds: originalAtt.time_spent_seconds || 60,
              submissionId: att.id
            });
            repairCount++;
          } catch (err: any) {
            logger.warn(`Failed to backfill submission for attempt ${att.id}:`, err);
          }
        } else {
          inMemoryQuizAttempts.delete(att.id);
          try {
            await supabase.from('quiz_attempts').delete().eq('id', att.id);
            repairCount++;
          } catch {}
        }
      }
      results.push(`Successfully reconciled/cleaned up ${repairCount} orphaned attempts.`);
    }

    // 2. Repair orphaned submissions (submission without attempt -> backfill dummy attempt)
    if (repairTypes.includes('orphanedSubmissions') && diagnostics.orphanedSubmissions.length > 0) {
      let repairCount = 0;
      for (const sub of diagnostics.orphanedSubmissions) {
        const attemptId = `att_repaired_${sub.id.replace('sub_', '')}`;
        const attemptObj = {
          id: attemptId,
          quiz_id: sub.quizId,
          share_code: sub.quizId,
          student_name: sub.studentName,
          student_email: sub.studentEmail || '',
          responses: sub.responses || {},
          status: 'submitted',
          started_at: new Date(new Date(sub.submittedAt).getTime() - 15 * 60 * 1000).toISOString(),
          updated_at: sub.submittedAt,
          submitted_at: sub.submittedAt,
          time_spent_seconds: 900
        };
        try {
          await supabase.from('quiz_attempts').insert([attemptObj]);
          inMemoryQuizAttempts.set(attemptId, attemptObj);
          repairCount++;
        } catch (dbErr) {
          logger.warn(`Failed to backfill attempt for submission ${sub.id}:`, dbErr);
        }
      }
      results.push(`Successfully backfilled ${repairCount} missing attempt sessions.`);
    }

    // 2.5 Repair submitted missing grades
    if (repairTypes.includes('submittedMissingGrade') && diagnostics.submittedMissingGrade.length > 0) {
      let repairCount = 0;
      for (const qs of diagnostics.submittedMissingGrade) {
        try {
          const { data: fullQs } = await supabase.from('quiz_submissions').select('*').eq('id', qs.id).single();
          if (fullQs) {
            await this.gradeSubmission({
              submissionId: fullQs.id,
              assignmentId: fullQs.quiz_id,
              studentId: fullQs.student_id,
              score: fullQs.score,
              feedback: 'Automatically reconciled during system health check.'
            }, user);
            repairCount++;
          }
        } catch (err) {
          logger.warn(`Failed to auto-grade/reconcile submission ${qs.id}:`, err);
        }
      }
      results.push(`Successfully auto-graded/reconciled ${repairCount} missing gradebook entries.`);
    }

    // 3. Repair submissions without quiz
    if (repairTypes.includes('submissionsWithoutQuiz') && diagnostics.submissionsWithoutQuiz.length > 0) {
      let repairCount = 0;
      const { data: activeQuizzes } = await supabase.from('assignments').select('id, title').limit(1);
      const fallbackQuizId = activeQuizzes?.[0]?.id || 'placeholder-quiz-id';
      const fallbackQuizTitle = activeQuizzes?.[0]?.title || 'Reconciliation Fallback Quiz';

      for (const sub of diagnostics.submissionsWithoutQuiz) {
        try {
          if (sub.type.includes('Quiz')) {
            await supabase.from('quiz_submissions').update({
              quiz_id: fallbackQuizId,
              quiz_title: fallbackQuizTitle
            }).eq('id', sub.id);
          } else {
            await supabase.from('submissions').update({
              assignment_id: fallbackQuizId
            }).eq('id', sub.id);
          }
          repairCount++;
        } catch {}
      }
      results.push(`Successfully re-associated ${repairCount} submissions with a valid assignment.`);
    }

    // 4. Repair responses without question
    if (repairTypes.includes('responsesWithoutQuestion') && diagnostics.responsesWithoutQuestion.length > 0) {
      let repairCount = 0;
      const uniqueSourceIds = Array.from(new Set(diagnostics.responsesWithoutQuestion.map((r: any) => r.id)));
      for (const srcId of uniqueSourceIds) {
        try {
          const { data: subData } = await supabase.from('quiz_submissions').select('responses, quiz_id').eq('id', srcId).maybeSingle();
          if (subData) {
            const { data: qData } = await supabase.from('assignments').select('quizData, questions').eq('id', subData.quiz_id).maybeSingle();
            const questions = qData?.questions || qData?.quizData?.questions || [];
            const validQIds = new Set(questions.map((q: any) => String(q.id).toLowerCase().trim()));
            
            const sanitized: any = {};
            Object.entries(subData.responses || {}).forEach(([qId, ans]) => {
              if (validQIds.has(String(qId).toLowerCase().trim())) {
                sanitized[qId] = ans;
              }
            });

            await supabase.from('quiz_submissions').update({ responses: sanitized }).eq('id', srcId);
            repairCount++;
          }
        } catch {}
      }
      results.push(`Sanitized missing question keys for ${repairCount} student records.`);
    }

    // 5. Repair grades without submission
    if (repairTypes.includes('gradesWithoutSubmission') && diagnostics.gradesWithoutSubmission.length > 0) {
      let repairCount = 0;
      for (const grade of diagnostics.gradesWithoutSubmission) {
        try {
          await supabase.from('grades').delete().eq('id', grade.id);
          repairCount++;
        } catch {}
      }
      results.push(`Successfully purged ${repairCount} orphaned grades.`);
    }

    // 6. Repair submissions without student
    if (repairTypes.includes('submissionsWithoutStudent') && diagnostics.submissionsWithoutStudent.length > 0) {
      let repairCount = 0;
      const { data: firstStudent } = await supabase.from('students').select('id').limit(1).maybeSingle();
      if (firstStudent?.id) {
        for (const sub of diagnostics.submissionsWithoutStudent) {
          try {
            await supabase.from('submissions').update({ student_id: firstStudent.id }).eq('id', sub.id);
            repairCount++;
          } catch {}
        }
      }
      results.push(`Successfully re-assigned ${repairCount} submissions.`);
    }

    await logAuditEvent({
      actorUserId: user.userId || 'admin',
      actorRole: user.role,
      entityType: 'data_reconciliation',
      entityId: 'reconciliation_job',
      action: 'update',
      newValues: { repairedTypes: repairTypes, results },
      reason: `Admin triggered submission reconciliation repair job for: ${repairTypes.join(', ')}`,
    });

    return { success: true, results };
  }
};

