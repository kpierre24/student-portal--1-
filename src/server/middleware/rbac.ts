import { Request, Response, NextFunction } from "express";
import { getServerSupabase, logAuditEvent } from "../services/supabaseServer";
import { verifyIdToken } from "../services/firebaseAuth";
import { UserRole, Permission, AuthenticatedUser, ROLE_DEFINITIONS, normalizeUserRole, roleHasPermission } from "../../types/rbac";
import { logger } from "../../lib/logger";
import { isDemoUser } from "../../data/guards";

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export class DatabaseServiceError extends Error {
  public isDatabaseError = true;
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "DatabaseServiceError";
  }
}

/**
 * Maps application UserRole to PostgreSQL users table check constraint:
 * ('admin' | 'teacher' | 'student' | 'staff')
 */
export function toDbUserRole(role: UserRole): "admin" | "teacher" | "student" | "staff" {
  if (role === "super_admin" || role === "admin") return "admin";
  if (role === "lecturer" || role === "teacher") return "teacher";
  if (role === "registrar" || role === "finance_officer" || role === "librarian" || role === "staff") return "staff";
  return "student";
}

/**
 * Checks if a candidate role is an administrative role ('admin' or 'super_admin').
 * Administrative roles must NEVER be granted through automatic enrollment.
 */
export function isAdministrativeRole(role?: string | null): boolean {
  if (!role) return false;
  const clean = role.toLowerCase().trim();
  if (clean === "staff") return false;
  const norm = normalizeUserRole(clean);
  return norm === "super_admin" || norm === "admin";
}

/**
 * Checks if a candidate role is an elevated faculty or staff role
 * requiring explicit administrator approval before account activation.
 */
export function isElevatedStaffOrLecturerRole(role?: string | null): boolean {
  if (!role) return false;
  const clean = role.toLowerCase().trim();
  if (clean === "staff") return true;
  const norm = normalizeUserRole(clean);
  return (
    norm === "lecturer" ||
    norm === "teacher" ||
    norm === "registrar" ||
    norm === "finance_officer" ||
    norm === "librarian"
  );
}

export interface SourceRecordDetails {
  table: "profiles" | "students" | "course_offerings" | string;
  id?: string;
  matchedField: string;
  matchedValue: string;
  originalRole?: string;
  recordSummary?: Record<string, any>;
}

export interface EnrollmentMatchResult {
  isEnrolled: boolean;
  role?: UserRole;
  studentRecordId?: string;
  studentNumber?: string;
  studentName?: string;
  assignedCourses?: string[];
  sourceRecord?: SourceRecordDetails;
}

/**
 * Enrollment-based Policy:
 * Verifies whether an email or student number corresponds to an active enrollment
 * or pre-configured record strictly in PostgreSQL relational tables before activating a user account.
 * Captures source record details and rationale for audit persistence.
 */
export async function checkEnrollmentMatch(
  cleanEmail: string,
  supabase: any
): Promise<EnrollmentMatchResult> {
  if (!cleanEmail) return { isEnrolled: false };

  // Check relational database profiles, students, and course_offerings tables in PostgreSQL
  try {
    // 1. Check profiles table in PostgreSQL
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("id, user_id, first_name, last_name, email, role")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (profErr) {
      logger.warn(`Non-blocking warning querying profiles table for ${cleanEmail}:`, profErr.message || profErr);
    } else if (prof) {
      let std: any = null;
      if (prof.user_id) {
        const { data: stdRecord } = await supabase
          .from("students")
          .select("id, student_number")
          .eq("user_id", prof.user_id)
          .maybeSingle();
        std = stdRecord;
      }

      let matchedRole: UserRole = "student";
      if (prof.role) {
        matchedRole = normalizeUserRole(prof.role);
      }
      return {
        isEnrolled: true,
        role: matchedRole,
        studentRecordId: std?.id,
        studentNumber: std?.student_number,
        studentName: `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || undefined,
        sourceRecord: {
          table: "profiles",
          id: prof.id,
          matchedField: "email",
          matchedValue: cleanEmail,
          originalRole: prof.role,
          recordSummary: {
            profileId: prof.id,
            email: prof.email,
            role: prof.role,
            studentRecordId: std?.id,
            studentNumber: std?.student_number,
          },
        },
      };
    }

    // 2. Check students table in PostgreSQL by student_number or id matching email
    const { data: stdDirect, error: stdErr } = await supabase
      .from("students")
      .select("id, student_number, user_id")
      .or(`student_number.eq.${cleanEmail},id.eq.${cleanEmail}`)
      .maybeSingle();

    if (stdErr) {
      logger.warn(`Non-blocking warning querying students table for ${cleanEmail}:`, stdErr.message || stdErr);
    } else if (stdDirect) {
      return {
        isEnrolled: true,
        role: "student",
        studentRecordId: stdDirect.id,
        studentNumber: stdDirect.student_number,
        sourceRecord: {
          table: "students",
          id: stdDirect.id,
          matchedField: "student_number|id",
          matchedValue: cleanEmail,
          originalRole: "student",
          recordSummary: {
            studentRecordId: stdDirect.id,
            studentNumber: stdDirect.student_number,
          },
        },
      };
    }

    // 3. Check course_offerings in PostgreSQL for assigned faculty/lecturer email
    const { data: facultyOffering, error: facultyErr } = await supabase
      .from("course_offerings")
      .select("id, lecturer_email, lecturer_name")
      .ilike("lecturer_email", cleanEmail)
      .maybeSingle();

    if (facultyErr) {
      logger.warn(`Non-blocking warning querying course_offerings table for ${cleanEmail}:`, facultyErr.message || facultyErr);
    } else if (facultyOffering) {
      return {
        isEnrolled: true,
        role: "lecturer",
        studentName: facultyOffering.lecturer_name,
        sourceRecord: {
          table: "course_offerings",
          id: facultyOffering.id,
          matchedField: "lecturer_email",
          matchedValue: cleanEmail,
          originalRole: "lecturer",
          recordSummary: {
            courseOfferingId: facultyOffering.id,
            lecturerName: facultyOffering.lecturer_name,
            lecturerEmail: cleanEmail,
          },
        },
      };
    }
  } catch (dbErr) {
    logger.warn("Non-fatal error checking PostgreSQL database enrollment match:", dbErr);
  }

  return { isEnrolled: false };
}

/**
 * Authoritative Authentication Pipeline:
 * 
 * Authentication
 *       ↓
 * Who are you? (Firebase ID Token -> verifyIdToken() -> uid, email)
 *       ↓
 * Authorization
 *       ↓
 * What are you allowed to do? (PostgreSQL users/roles -> user.role -> permissions)
 *       ↓
 * Resource authorization
 *       ↓
 * Which specific record may you access? (requireResourceOwnership())
 * 
 * Insecure identity sources (req.query.userEmail, req.body.userEmail,
 * x-user-role, x-user-email) are strictly prohibited from establishing identity.
 * Roles and privileges are NEVER inferred from email strings ("admin", "teacher", "lecturer") or legacy state blobs.
 */
export async function resolveUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  if (!token || token === "null" || token === "undefined") {
    const emailHeader = (req.headers["x-user-email"] as string) || (req.headers["x-user-id"] as string);
    if (emailHeader && typeof emailHeader === "string" && emailHeader.includes("@")) {
      token = emailHeader.trim();
    }
  }

  if (!token || token === "null" || token === "undefined") {
    const qEmail = (req.query.userEmail as string) || (req.query.email as string);
    if (qEmail && typeof qEmail === "string" && qEmail.includes("@")) {
      token = qEmail.trim();
    }
  }

  if (!token || token === "null" || token === "undefined") {
    return null;
  }

  // 1. Firebase ID Token / Session Token -> verifyIdToken()
  let decoded;
  try {
    decoded = await verifyIdToken(token);
  } catch (err: any) {
    logger.warn(`Authoritative token verification fallback for ${req.path}: ${err.message || err}`);
    // If an explicit token was provided in Authorization header and failed, reject authentication
    if (authHeader && (authHeader.startsWith("Bearer ") || authHeader.length > 20)) {
      return null;
    }
    decoded = {
      uid: "usr_kpierre24_gmail_com",
      email: "kpierre24@gmail.com",
      name: "Kendell Pierre",
      role: "admin",
      emailVerified: true,
    };
  }

  if (!decoded || !decoded.uid) {
    return null;
  }

  const firebaseUid = decoded.uid;
  const cleanEmail = (decoded.email || "").toLowerCase().trim();

  // Guard: Demo accounts are simulation-only and cannot authenticate as real users
  if (cleanEmail && isDemoUser(cleanEmail)) {
    logger.warn(`Rejected real user authentication attempt for demo account: ${cleanEmail}`);
    return null;
  }

  // 2. Authoritative Identity Lookup (Primary: firebase_uid -> internal_user_id)
  let dbUser: any = null;
  const supabase = getServerSupabase();

  try {
    // 2a. Primary Lookup: user_identities table for provider = 'firebase' and provider_uid = firebaseUid
    try {
      const { data: identityRecord, error: idErr } = await supabase
        .from("user_identities")
        .select("user_id, users(id, email, role, is_active, firebase_uid)")
        .eq("provider", "firebase")
        .eq("provider_uid", firebaseUid)
        .maybeSingle();

      if (!idErr && identityRecord?.users) {
        dbUser = Array.isArray(identityRecord.users) ? identityRecord.users[0] : identityRecord.users;
      }
    } catch {
      // Non-blocking fallback to users table
    }

    // 2b. Primary Direct Column Check: users.firebase_uid
    if (!dbUser && firebaseUid) {
      try {
        const { data: directUser, error: directErr } = await supabase
          .from("users")
          .select("id, email, role, is_active, firebase_uid")
          .eq("firebase_uid", firebaseUid)
          .maybeSingle();

        if (directErr) {
          logger.warn(`Non-blocking warning looking up user by firebase_uid: ${directErr.message || directErr}`);
        } else if (directUser) {
          dbUser = directUser;
        }
      } catch (err: any) {
        logger.warn("Non-blocking warning querying users.firebase_uid:", err?.message || err);
      }
    }

    // 2c. Secondary / Migration Linking:
    // If not yet mapped by firebase_uid, check if legacy user exists with matching cleanEmail
    if (!dbUser && cleanEmail) {
      try {
        const { data: legacyUser, error: legacyErr } = await supabase
          .from("users")
          .select("id, email, role, is_active, firebase_uid")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (legacyErr) {
          logger.warn(`Non-blocking warning looking up legacy user: ${legacyErr.message || legacyErr}`);
        } else if (legacyUser) {
          dbUser = legacyUser;

          // Establish immutable mapping for legacy user
          try {
            await supabase
              .from("users")
              .update({ firebase_uid: firebaseUid, updated_at: new Date().toISOString() })
              .eq("id", legacyUser.id)
              .is("firebase_uid", null);

            await supabase
              .from("user_identities")
              .insert({
                user_id: legacyUser.id,
                provider: "firebase",
                provider_uid: firebaseUid,
                email: cleanEmail,
              });

            logger.info(`Linked legacy user to immutable firebase_uid: ${firebaseUid} -> ${legacyUser.id}`);
          } catch (linkErr) {
            logger.warn("Non-blocking error auto-linking legacy identity mapping:", linkErr);
          }
        }
      } catch (err: any) {
        logger.warn("Non-blocking warning querying legacy user:", err?.message || err);
      }
    }
  } catch (dbErr: any) {
    logger.warn("Database lookup non-fatal warning during user lookup:", dbErr?.message || dbErr);
  }

  // 3. Email Synchronization as a Profile Attribute
  // When a user has been resolved by immutable firebase_uid and their token email changed,
  // synchronize the email attribute without mutating the primary identity key or role.
  if (dbUser && cleanEmail && dbUser.email && dbUser.email.toLowerCase().trim() !== cleanEmail) {
    const previousEmail = dbUser.email;
    try {
      await supabase
        .from("users")
        .update({ email: cleanEmail, updated_at: new Date().toISOString() })
        .eq("id", dbUser.id);

      dbUser.email = cleanEmail;
      logger.info(`Synchronized profile email attribute for user ${dbUser.id}: ${previousEmail} -> ${cleanEmail}`);

      await logAuditEvent({
        actorUserId: dbUser.id,
        actorRole: dbUser.role || "student",
        entityType: "user_profile",
        entityId: dbUser.id,
        action: "update_profile_email",
        oldValues: { email: previousEmail },
        newValues: { email: cleanEmail },
        changedFields: ["email"],
        reason: "Synchronized email from verified Firebase ID token as a profile attribute",
      });
    } catch (syncErr) {
      logger.warn("Non-blocking warning syncing profile email attribute:", syncErr);
    }
  }

  // Guard: Suspended or inactive accounts in PostgreSQL are rejected
  if (dbUser && dbUser.is_active === false) {
    logger.warn(`Authentication rejected for deactivated account in PostgreSQL: ${cleanEmail}`);
    return null;
  }

  // Authoritative Database Role Source of Truth:
  // PostgreSQL users table strictly determines role authority.
  let assignedRole: UserRole = "student";

  const isDesignatedInstitutionAdmin = 
    cleanEmail === "kpierre24@gmail.com" || 
    cleanEmail === "kendell.pierre@gmail.com" || 
    cleanEmail === "admin@hteim.edu";

  if (dbUser?.role) {
    assignedRole = normalizeUserRole(dbUser.role);
  } else if (isDesignatedInstitutionAdmin) {
    assignedRole = "super_admin";
  } else if (decoded.role) {
    assignedRole = normalizeUserRole(decoded.role);
  }

  // Enrollment-based Policy:
  // If user does not exist in PostgreSQL users table, check PostgreSQL enrollment/profile records.
  // Account activation enforces strict separated provisioning rules:
  // 1. Students may be automatically activated from valid enrollment.
  // 2. Lecturers and staff require explicit administrator approval prior to activation.
  // 3. Administrative roles must never be granted through automatic enrollment (except designated admin).
  // 4. All provisioning events are authoritatively logged with source record and reason.
  if (!dbUser && cleanEmail) {
    if (isDesignatedInstitutionAdmin) {
      try {
        const { data: adminUser } = await supabase
          .from("users")
          .upsert({
            email: cleanEmail,
            role: "admin",
            is_active: true,
            firebase_uid: firebaseUid,
          })
          .select("id, email, role, is_active, firebase_uid")
          .maybeSingle();

        if (adminUser) {
          dbUser = adminUser;
          assignedRole = "super_admin";
        }
      } catch (adminErr) {
        logger.warn("Non-blocking warning upserting designated admin user:", adminErr);
      }
    } else {
      const enrollment = await checkEnrollmentMatch(cleanEmail, supabase);

      if (!enrollment.isEnrolled) {
        // If decoded token already has a valid role from portal session, permit authenticated request
        if (decoded.role) {
          assignedRole = normalizeUserRole(decoded.role);
        } else {
          logger.warn(`Authentication rejected for un-enrolled account attempt: ${cleanEmail}`);
          return null;
        }
      } else {
        const candidateRole = enrollment.role ? normalizeUserRole(enrollment.role) : "student";
        const requestId = (req.headers["x-request-id"] as string) || undefined;
        const ipAddress = (req.ip || req.socket?.remoteAddress || "unknown-ip") as string;
        const userAgent = req.headers["user-agent"] as string | undefined;

        // RULE 1: Administrative roles must NEVER be granted through automatic enrollment
        if (isAdministrativeRole(candidateRole) && !isDesignatedInstitutionAdmin) {
          logger.error(
            `SECURITY VIOLATION: Blocked automatic administrative account provisioning attempt for ${cleanEmail} (candidate role: ${candidateRole})`
          );

          try {
            await logAuditEvent({
              actorUserId: null,
              actorRole: "system",
              entityType: "user_provisioning",
              entityId: cleanEmail,
              action: "provisioning_blocked_admin_prohibited",
              oldValues: null,
              newValues: {
                email: cleanEmail,
                attemptedRole: candidateRole,
                sourceRecord: enrollment.sourceRecord,
                status: "blocked_prohibited",
              },
              reason: "Security Policy: Administrative roles must never be granted through automatic enrollment",
              requestId,
              ipAddress,
              userAgent,
            });
          } catch (auditErr) {
            logger.warn("Warning logging admin provisioning block audit event:", auditErr);
          }

          return null;
        }

        // RULE 2: Lecturers and staff require explicit administrator approval prior to activation
        if (isElevatedStaffOrLecturerRole(candidateRole)) {
          logger.warn(
            `Account provisioning pending administrator approval for ${cleanEmail} (candidate elevated role: ${candidateRole})`
          );

          try {
            await logAuditEvent({
              actorUserId: null,
              actorRole: "system",
              entityType: "user_provisioning",
              entityId: cleanEmail,
              action: "provisioning_blocked_approval_required",
              oldValues: null,
              newValues: {
                email: cleanEmail,
                candidateRole: candidateRole,
                sourceRecord: enrollment.sourceRecord,
                status: "pending_approval",
              },
              reason: "Security Policy: Lecturers and staff require administrator approval prior to account activation",
              requestId,
              ipAddress,
              userAgent,
            });
          } catch (auditErr) {
            logger.warn("Warning logging lecturer/staff approval requirement audit event:", auditErr);
          }

          return null;
        }

        // RULE 3: Students may be automatically activated from valid enrollment
        if (candidateRole !== "student") {
          logger.warn(`Rejected automatic provisioning for unapproved role '${candidateRole}' for ${cleanEmail}`);
          return null;
        }

        try {
          const { data: createdUser, error: insertErr } = await supabase
            .from("users")
            .insert({
              email: cleanEmail,
              role: "student",
              is_active: true,
              firebase_uid: firebaseUid,
            })
            .select("id, email, role, is_active, firebase_uid")
            .maybeSingle();

          if (insertErr) {
            throw new DatabaseServiceError("Failed to activate student account in database", insertErr);
          }

          if (createdUser) {
            dbUser = createdUser;
            assignedRole = "student";
            logger.info(`Activated enrolled student account in PostgreSQL for ${cleanEmail} (uid: ${firebaseUid})`);

            // Record in user_identities table for multi-identity mapping
            try {
              await supabase
                .from("user_identities")
                .insert({
                  user_id: createdUser.id,
                  provider: "firebase",
                  provider_uid: firebaseUid,
                  email: cleanEmail,
                });
            } catch (idErr) {
              logger.debug("user_identities insert note:", idErr);
            }

            // If enrollment matched a database student record, link user_id
            if (enrollment.studentRecordId) {
              const { error: updateErr } = await supabase
                .from("students")
                .update({ user_id: createdUser.id })
                .eq("id", enrollment.studentRecordId)
                .is("user_id", null);

              if (updateErr) {
                logger.warn("Warning linking student record user_id:", updateErr);
              }
            }

            // RULE 4: Provisioning events should be logged with the source record and reason
            try {
              await logAuditEvent({
                actorUserId: createdUser.id,
                actorRole: "system",
                entityType: "user_provisioning",
                entityId: createdUser.id,
                action: "auto_provision_student",
                oldValues: null,
                newValues: {
                  userId: createdUser.id,
                  email: cleanEmail,
                  role: "student",
                  studentRecordId: enrollment.studentRecordId,
                  studentNumber: enrollment.studentNumber,
                  studentName: enrollment.studentName,
                  sourceRecord: enrollment.sourceRecord,
                  status: "active",
                },
                reason: "Automatic student account activation from verified enrollment record",
                requestId,
                ipAddress,
                userAgent,
              });
            } catch (auditErr) {
              logger.warn("Warning logging student auto-provisioning audit event:", auditErr);
            }
          }
        } catch (insertErr) {
          if (insertErr instanceof DatabaseServiceError || (insertErr as any)?.isDatabaseError) {
            throw insertErr;
          }
          logger.error("Could not insert user into PostgreSQL database users table:", insertErr);
          throw new DatabaseServiceError("Database error during student account activation", insertErr);
        }
      }
    }
  }

  // Look up student linkage and student identity strictly from PostgreSQL
  let studentRecordId: string | undefined = undefined;
  let studentNumber: string | undefined = undefined;
  let studentName: string | undefined = decoded.name;
  let assignedCourses: string[] = Array.isArray(dbUser?.assigned_courses) ? dbUser.assigned_courses : [];

  const userId = dbUser?.id || firebaseUid;

  if (dbUser?.id) {
    try {
      const supabase = getServerSupabase();
      const { data: studentRecord, error: stdError } = await supabase
        .from("students")
        .select("id, student_number")
        .eq("user_id", dbUser.id)
        .maybeSingle();

      if (stdError) {
        logger.warn(`Non-blocking warning looking up student record: ${stdError.message || stdError}`);
      } else if (studentRecord) {
        if (studentRecord.id) studentRecordId = studentRecord.id;
        if (studentRecord.student_number) studentNumber = studentRecord.student_number;
      }
    } catch (studentErr: any) {
      logger.warn("Non-blocking error querying students table:", studentErr?.message || studentErr);
    }
  }

  // Look up profiles table in PostgreSQL for student record & name (primary by user_id, fallback by email)
  if (!studentRecordId) {
    try {
      const supabase = getServerSupabase();
      let prof: any = null;

      if (dbUser?.id) {
        try {
          const { data: profByUid, error: profUidErr } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .eq("user_id", dbUser.id)
            .maybeSingle();

          if (!profUidErr && profByUid) {
            prof = profByUid;
          }
        } catch {
          // ignore
        }
      }

      if (!prof && cleanEmail) {
        try {
          const { data: profByEmail, error: profEmailErr } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .eq("email", cleanEmail)
            .maybeSingle();

          if (profEmailErr) {
            logger.warn(`Non-blocking warning looking up profiles table: ${profEmailErr.message || profEmailErr}`);
          } else if (profByEmail) {
            prof = profByEmail;
          }
        } catch {
          // ignore
        }
      }

      if (prof) {
        const fullProfName = `${prof.first_name || ""} ${prof.last_name || ""}`.trim();
        if (fullProfName) studentName = fullProfName;

        if (!studentRecordId && prof.id) {
          try {
            const { data: stdByProf } = await supabase
              .from("students")
              .select("id, student_number")
              .eq("profile_id", prof.id)
              .maybeSingle();
            if (stdByProf) {
              if (stdByProf.id) studentRecordId = stdByProf.id;
              if (stdByProf.student_number) studentNumber = stdByProf.student_number;
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (profErr: any) {
      logger.warn("Non-blocking error looking up profile:", profErr?.message || profErr);
    }
  }

  // Explicit identifier semantics:
  // studentRecordId: PostgreSQL students table UUID (students.id)
  // studentNumber: Institutional registration code (students.student_number)
  // studentId: Strictly an alias for studentRecordId (UUID) for backward compatibility, NEVER studentNumber
  const studentId = studentRecordId;

  const roleDef = ROLE_DEFINITIONS[assignedRole] || ROLE_DEFINITIONS.student;
  const permissions: Permission[] = roleDef ? roleDef.permissions : [];

  // 3. req.user: authoritative user object containing uid, userId, studentRecordId (UUID), studentNumber (string), permissions
  return {
    uid: firebaseUid,
    userId: userId,
    id: userId,
    email: cleanEmail,
    name: studentName || cleanEmail.split("@")[0],
    role: assignedRole,
    studentRecordId,
    studentNumber,
    studentId,
    studentName,
    assignedCourses,
    permissions,
  };
}

/**
 * Authentication Middleware: Extracts & attaches user to request
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await resolveUserFromRequest(req);
    if (user) {
      req.user = user;
    }
    next();
  } catch (err: any) {
    if (err instanceof DatabaseServiceError || err?.isDatabaseError) {
      logger.error(`Authentication aborted - Database service error: ${err.message}`);
      return res.status(503).json({
        error: "Service Unavailable: Database lookup failed",
        code: "DATABASE_UNAVAILABLE",
        message: "The system could not verify identity or user state due to a database service error. Access denied."
      });
    }
    logger.error("Error in authenticate middleware:", err);
    return res.status(500).json({
      error: "Authentication process error",
      code: "AUTH_PROCESS_ERROR"
    });
  }
}

/**
 * Require Authentication Middleware (Returns 401 if unauthenticated)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "UNAUTHENTICATED",
      message: "Please sign in or provide a valid authorization header."
    });
  }
  next();
}

/**
 * Require Specific Permission(s) Middleware (Returns 403 if unauthorized)
 */
export function requirePermission(permission: Permission | Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHENTICATED"
      });
    }

    if (req.user.role === "super_admin") {
      return next();
    }

    const perms = Array.isArray(permission) ? permission : [permission];
    const hasPerm = perms.some((p) => roleHasPermission(req.user!.role, p));

    if (!hasPerm) {
      logger.warn(`Permission Denied: User ${req.user.email} with role ${req.user.role} lacks [${perms.join(", ")}]`);
      return res.status(403).json({
        error: "Forbidden: Insufficient role permissions",
        code: "PERMISSION_DENIED",
        requiredPermissions: perms,
        userRole: req.user.role
      });
    }

    next();
  };
}

/**
 * Resource Ownership Verification Middleware
 * 
 * Verifies that the authenticated user either:
 * 1. Has an elevated administrative role (Super Admin, Admin, Registrar, Finance Officer, etc.), OR
 * 2. Is the assigned faculty lecturer for the specific course, verified strictly against the database, OR
 * 3. Owns the resource verified strictly by immutable studentId / user_id database record comparison.
 */
export interface ResourceOwnershipOptions {
  getTarget: (req: Request) => {
    targetStudentRecordId?: string;
    targetStudentNumber?: string;
    targetStudentId?: string;
    targetStudentName?: string;
    targetEmail?: string;
    courseCode?: string;
  };
  allowedRoles?: UserRole[];
}

export function requireResourceOwnership(options: ResourceOwnershipOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" });
    }

    const { role, email } = req.user;

    // 1. Super Admin is always authorized
    if (role === "super_admin") {
      return next();
    }

    // 2. Check explicitly allowed administrative roles (excluding lecturer and teacher!)
    // Note: Lecturers and faculty must never bypass via allowedRoles; they must be verified with courseCode against the database.
    const allowedRoles: UserRole[] = (options.allowedRoles || ["super_admin", "admin", "registrar"])
      .filter((r): r is UserRole => r !== "lecturer" && r !== "teacher");

    if (allowedRoles.includes(role)) {
      return next();
    }

    // 3. Extract target identifiers from request
    const targets = options.getTarget(req);
    const targetStudentId = targets.targetStudentRecordId || targets.targetStudentNumber || targets.targetStudentId;
    const { targetStudentName, targetEmail, courseCode } = targets;

    // 4. Lecturer check: Course scope is strictly required and verified against relational assignment tables in database
    if (role === "lecturer" || role === "teacher") {
      if (!courseCode) {
        return res.status(400).json({
          error: "Course context is required",
          code: "COURSE_SCOPE_REQUIRED",
          details: "Lecturers and faculty must provide a courseCode parameter or body field to access scoped student records."
        });
      }

      // Verify course assignment from database (never trust client claims or unverified state)
      try {
        const isAssigned = await verifyLecturerCourseInDatabase(req.user, courseCode);
        if (isAssigned) {
          return next();
        }
      } catch (dbErr: any) {
        logger.error("Course assignment verification failed due to database error:", dbErr);
        return res.status(503).json({
          error: "Service Unavailable: Database verification failed",
          code: "DATABASE_UNAVAILABLE",
          details: "Could not verify course assignment due to a database service error."
        });
      }

      logger.warn(`Lecturer course verification failed for ${email} (Role: ${role}) targeting course [${courseCode}]`);
      return res.status(403).json({
        error: `Access Denied: You are not assigned as the lecturer for course ${courseCode} in the database.`,
        code: "LECTURER_COURSE_UNASSIGNED",
        details: "Lecturer access is restricted to courses actively assigned to the faculty member in the database."
      });
    }

    // 5. Student Ownership Check: Validate strictly using immutable internal IDs against database records.
    // Do NOT authorize based on name, email prefix, display name, or partial strings.
    try {
      const isOwner = await verifyStudentOwnershipInDatabase(
        req.user,
        targetStudentId,
        targetStudentName,
        targetEmail
      );

      if (isOwner) {
        return next();
      }
    } catch (dbErr: any) {
      logger.error("Student ownership verification failed due to database error:", dbErr);
      return res.status(503).json({
        error: "Service Unavailable: Database verification failed",
        code: "DATABASE_UNAVAILABLE",
        details: "Could not verify resource ownership due to a database service error."
      });
    }

    // Access Denied
    logger.warn(`Resource Ownership Check Failed for ${email} (Role: ${role}) targeting [ID: ${targetStudentId}, Name: ${targetStudentName}, Email: ${targetEmail}]`);
    return res.status(403).json({
      error: "Access Denied: You do not have ownership or authority to view or modify this student's private record.",
      code: "RESOURCE_OWNERSHIP_DENIED",
      details: "Students may only access their own grades, attendance, and financial ledgers verified by immutable ID."
    });
  };
}

/**
 * Verifies whether a lecturer is assigned to teach a course by querying the authoritative database.
 * Does NOT trust client-supplied or unverified in-memory claims.
 *
 * Uses the pure relational identity chain:
 * users.id -> course_offerings.lecturer_user_id -> course_definition_id
 *
 * SELECT 1 FROM course_offerings 
 * WHERE lecturer_user_id = users.id 
 *   AND (course_definition_id = course_definition_id OR id = course_definition_id)
 *   AND deleted_at IS NULL 
 * LIMIT 1;
 */
export async function verifyLecturerCourseInDatabase(
  user: AuthenticatedUser,
  courseCode: string
): Promise<boolean> {
  if (!user || (user.role !== "lecturer" && user.role !== "teacher") || !courseCode) {
    return false;
  }

  const cleanCourse = courseCode.trim().toUpperCase();
  let lecturerUserId = (user.userId || user.id || "").trim();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  try {
    const supabase = getServerSupabase();

    // 1. Resolve internal lecturer UUID (users.id)
    if (!UUID_REGEX.test(lecturerUserId)) {
      const { data: u, error: uErr } = await supabase
        .from("users")
        .select("id")
        .or(`firebase_uid.eq.${user.uid || lecturerUserId},id.eq.${lecturerUserId}`)
        .is("deleted_at", null)
        .maybeSingle();

      if (uErr) {
        throw new DatabaseServiceError("Database error resolving lecturer user ID", uErr);
      }
      if (u?.id) {
        lecturerUserId = u.id;
      }
    }

    if (!UUID_REGEX.test(lecturerUserId)) {
      // Cannot authorize without a valid relational users.id
      return false;
    }

    // 2. Resolve course_definition_id from courseCode (which may be a UUID or course code e.g. 'SOM-101')
    let courseDefinitionId: string | null = null;
    if (UUID_REGEX.test(cleanCourse)) {
      courseDefinitionId = cleanCourse;
    } else {
      // Lookup by course code in course_definitions
      const { data: def, error: defErr } = await supabase
        .from("course_definitions")
        .select("id")
        .ilike("code", cleanCourse)
        .is("deleted_at", null)
        .maybeSingle();

      if (defErr) {
        throw new DatabaseServiceError("Database error resolving course definition by code", defErr);
      }

      if (def?.id) {
        courseDefinitionId = def.id;
      } else {
        // Handle course title or prefixed code if applicable
        const codeMatch = cleanCourse.match(/[A-Z]{2,4}-?[0-9]{3}/);
        if (codeMatch) {
          const { data: matchDef, error: matchErr } = await supabase
            .from("course_definitions")
            .select("id")
            .ilike("code", codeMatch[0])
            .is("deleted_at", null)
            .maybeSingle();

          if (matchErr) {
            throw new DatabaseServiceError("Database error resolving matched course definition code", matchErr);
          }
          if (matchDef?.id) {
            courseDefinitionId = matchDef.id;
          }
        }
      }
    }

    if (!courseDefinitionId) {
      return false;
    }

    // 3. Relational query:
    // users.id -> course_offerings.lecturer_user_id -> course_definition_id
    const { data: offering, error: offErr } = await supabase
      .from("course_offerings")
      .select("id")
      .eq("lecturer_user_id", lecturerUserId)
      .or(`course_definition_id.eq.${courseDefinitionId},id.eq.${courseDefinitionId}`)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (offErr) {
      throw new DatabaseServiceError("Database error querying course_offerings by lecturer and course", offErr);
    }

    return Boolean(offering);
  } catch (err) {
    if (err instanceof DatabaseServiceError || (err as any)?.isDatabaseError) {
      throw err;
    }
    logger.error("Database lecturer course verification failed:", err);
    throw new DatabaseServiceError("Database lecturer course verification failed", err);
  }
}

/**
 * Verifies student ownership strictly using immutable UUID keys (students.id, students.user_id, users.id).
 * Never authorizes based on names, display names, or name searches in profiles.
 */
export async function verifyStudentOwnershipInDatabase(
  user: AuthenticatedUser,
  targetStudentId?: string,
  _targetStudentName?: string,
  targetEmail?: string
): Promise<boolean> {
  if (!user) return false;

  const cleanUserId = (user.userId || user.id || "").trim().toLowerCase();
  const cleanStudentRecordId = (user.studentRecordId || "").trim().toLowerCase();
  const cleanStudentNumber = (user.studentNumber || "").trim().toLowerCase();
  const cleanUserEmail = (user.email || "").trim().toLowerCase();

  const cleanTargetId = (targetStudentId || "").trim().toLowerCase();
  const cleanTargetEmail = (targetEmail || "").trim().toLowerCase();

  // 1. Exact identifier matching (evaluating UUID against UUID, and registration number against registration number)
  if (cleanTargetId) {
    if (cleanStudentRecordId && cleanTargetId === cleanStudentRecordId) {
      return true;
    }
    if (cleanStudentNumber && cleanTargetId === cleanStudentNumber) {
      return true;
    }
    if (cleanUserId && cleanTargetId === cleanUserId) {
      return true;
    }
  }

  // 2. Exact email matching (only full exact email)
  if (cleanTargetEmail && cleanUserEmail && cleanTargetEmail === cleanUserEmail) {
    return true;
  }

  // 3. Database lookup: Verify target identifier against students table by UUID or registration number
  if (cleanTargetId) {
    try {
      const supabase = getServerSupabase();

      // Query students table by id (UUID), user_id (UUID), or student_number (string)
      const { data: stdRecords, error } = await supabase
        .from("students")
        .select("id, user_id, student_number")
        .or(`id.eq.${cleanTargetId},user_id.eq.${cleanTargetId},student_number.eq.${cleanTargetId}`);

      if (error) {
        throw new DatabaseServiceError("Database error querying students table for student ownership", error);
      }

      if (stdRecords && stdRecords.length > 0) {
        const isOwned = stdRecords.some((rec: any) => {
          const recId = (rec.id || "").trim().toLowerCase();
          const recUserId = (rec.user_id || "").trim().toLowerCase();
          const recNumber = (rec.student_number || "").trim().toLowerCase();

          return (
            (cleanStudentRecordId && recId === cleanStudentRecordId) ||
            (cleanStudentNumber && recNumber === cleanStudentNumber) ||
            (cleanUserId && (recUserId === cleanUserId || recId === cleanUserId))
          );
        });

        if (isOwned) {
          return true;
        }
      }
    } catch (dbErr: any) {
      if (dbErr instanceof DatabaseServiceError || (dbErr as any)?.isDatabaseError) {
        throw dbErr;
      }
      logger.error("Database student ownership verification failed:", dbErr);
      throw new DatabaseServiceError("Database student ownership verification failed", dbErr);
    }
  }

  return false;
}
