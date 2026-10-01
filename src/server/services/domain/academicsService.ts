import { getServerSupabase, logAuditEvent } from '../supabaseServer';
import { logger } from '../../../lib/logger';
import { AuthenticatedUser } from '../../../types/rbac';
import { 
  DEFAULT_ACADEMIC_YEARS, 
  DEFAULT_TERMS, 
  DEFAULT_MASTER_COURSES, 
  DEFAULT_COURSE_OFFERINGS 
} from '../../../data/defaultAcademicData';

export const academicsService = {
  /**
   * Returns the complete relational academic hierarchy snapshot:
   * academic_years -> terms -> course_definitions/courses -> course_offerings.
   */
  async getAcademicStructure(): Promise<{
    academicYears: any[];
    terms: any[];
    masterCourses: any[];
    courseOfferings: any[];
    activeTermId: string | null;
  }> {
    const supabase = getServerSupabase();

    try {
      const [yearsRes, termsRes, coursesRes, defsRes, offeringsRes] = await Promise.all([
        supabase.from('academic_years').select('*').is('deleted_at', null).order('start_date', { ascending: true }),
        supabase.from('terms').select('*').is('deleted_at', null).order('sequence_order', { ascending: true }),
        supabase.from('courses').select('*').is('deleted_at', null),
        supabase.from('course_definitions').select('*').is('deleted_at', null),
        supabase.from('course_offerings').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      ]);

      const academicYears = (yearsRes.data && yearsRes.data.length > 0) ? yearsRes.data : DEFAULT_ACADEMIC_YEARS;
      const terms = (termsRes.data && termsRes.data.length > 0) ? termsRes.data : DEFAULT_TERMS;
      const masterCourses = (defsRes.data && defsRes.data.length > 0) 
        ? defsRes.data 
        : ((coursesRes.data && coursesRes.data.length >= 6) ? coursesRes.data : DEFAULT_MASTER_COURSES);
      
      const courseOfferings = (offeringsRes.data && offeringsRes.data.length > 0)
        ? offeringsRes.data
        : DEFAULT_COURSE_OFFERINGS;

      const activeTerm = terms.find((t: any) => t.status === 'active') || terms[0];

      return {
        academicYears,
        terms,
        masterCourses,
        courseOfferings,
        activeTermId: activeTerm?.id || 'term_2026_s1',
      };
    } catch (err) {
      logger.error('Error fetching academic structure from relational tables, using defaults:', err);
      return {
        academicYears: DEFAULT_ACADEMIC_YEARS,
        terms: DEFAULT_TERMS,
        masterCourses: DEFAULT_MASTER_COURSES,
        courseOfferings: DEFAULT_COURSE_OFFERINGS,
        activeTermId: 'term_2026_s1',
      };
    }
  },

  /**
   * Retrieves courses from relational catalog.
   */
  async getCourses(): Promise<{ courses: any[]; count: number }> {
    const supabase = getServerSupabase();

    try {
      const { data: defs } = await supabase
        .from('course_definitions')
        .select('*')
        .is('deleted_at', null)
        .order('core_module_number', { ascending: true });

      if (defs && defs.length > 0) {
        return { courses: defs, count: defs.length };
      }

      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .is('deleted_at', null);

      return { courses: courses || [], count: courses?.length || 0 };
    } catch (err) {
      logger.error('Error querying courses from relational tables:', err);
      return { courses: [], count: 0 };
    }
  },

  /**
   * Saves or updates a master course definition in PostgreSQL.
   */
  async saveCourse(course: any, actorUserId?: string, actorRole?: string): Promise<{ status: string; course: any }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    try {
      const coursePayload = {
        code: course.code,
        title: course.title,
        credits: course.credits || 5.0,
        department: course.department || 'Biblical Studies',
        level: course.level || 'Foundation',
        description: course.description || '',
        is_active: course.isActive !== false,
        updated_at: timestamp,
      };

      const { data: saved, error } = await supabase
        .from('course_definitions')
        .upsert(coursePayload, { onConflict: 'code' })
        .select()
        .single();

      if (error) {
        logger.warn('Course definition upsert warning:', error.message);
      }

      await logAuditEvent({
        actorUserId: actorUserId || null,
        actorRole: actorRole || 'system',
        entityType: 'course',
        entityId: course.code,
        action: 'update',
        newValues: course,
        changedFields: Object.keys(course),
        reason: `Course definition ${course.code} updated`,
      });

      return {
        status: 'saved',
        course: saved || course,
      };
    } catch (err: any) {
      logger.error('Error saving course in relational service:', err);
      throw err;
    }
  },

  /**
   * Saves or updates a course offering in PostgreSQL.
   */
  async saveCourseOffering(offering: any, actorUserId?: string, actorRole?: string): Promise<{ status: string; offering: any }> {
    const supabase = getServerSupabase();
    const timestamp = new Date().toISOString();

    try {
      let lecturerUserId = offering.lecturerUserId || offering.lecturer_user_id || null;
      if (!lecturerUserId && offering.lecturerEmail) {
        const { data: u } = await supabase
          .from('users')
          .select('id')
          .eq('email', offering.lecturerEmail.trim().toLowerCase())
          .is('deleted_at', null)
          .maybeSingle();
        if (u?.id) {
          lecturerUserId = u.id;
        }
      }

      const offeringPayload = {
        id: offering.id,
        course_definition_id: offering.courseDefinitionId || offering.course_definition_id || offering.courseId,
        term_id: offering.termId,
        academic_year_id: offering.academicYearId,
        lecturer_user_id: lecturerUserId,
        lecturer_name: offering.lecturerName || 'Faculty Instructor',
        lecturer_title: offering.lecturerTitle || 'Pastor / Lecturer',
        lecturer_email: offering.lecturerEmail || '',
        section: offering.section || 'Section 01',
        schedule_days: offering.scheduleDays || 'Saturday',
        location: offering.location || 'Main Sanctuary & Zoom',
        zoom_link: offering.zoomLink || '',
        capacity: offering.capacity || 40,
        status: offering.status || 'active',
        credits: offering.credits || 5.0,
        updated_at: timestamp,
      };

      const { data: saved, error } = await supabase
        .from('course_offerings')
        .upsert(offeringPayload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        logger.warn('Course offering upsert warning:', error.message);
      }

      await logAuditEvent({
        actorUserId: actorUserId || null,
        actorRole: actorRole || 'system',
        entityType: 'course_offering',
        entityId: offering.id,
        action: 'update',
        newValues: offering,
        changedFields: Object.keys(offering),
        reason: `Course offering ${offering.id} updated`,
      });

      return {
        status: 'saved',
        offering: saved || offering,
      };
    } catch (err: any) {
      logger.error('Error saving course offering in relational service:', err);
      throw err;
    }
  },
};
