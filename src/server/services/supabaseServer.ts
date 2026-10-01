import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { logger } from '../../lib/logger';
import { sanitizeProductionState, isDemoRecord, isDemoUser } from '../../data/guards';
import { AuthenticatedUser, normalizeUserRole } from '../../types/rbac';

let serverSupabaseClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(supabaseUrl && serviceRoleKey);
}

/**
 * Validates that authoritative privileged server credentials are configured.
 * Fails fast without silently downgrading to anonymous browser credentials.
 */
export function validateSupabaseServerConfig(): void {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "FATAL: Missing required Supabase URL (SUPABASE_URL or VITE_SUPABASE_URL). Server cannot start."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "FATAL: Missing required privileged server credential: SUPABASE_SERVICE_ROLE_KEY. " +
      "Server domain operations, database management, and authoritative audit logging require privileged service role access and will not downgrade to anonymous client credentials."
    );
  }
}

export function getServerSupabase(): SupabaseClient {
  if (serverSupabaseClient) {
    return serverSupabaseClient;
  }

  validateSupabaseServerConfig();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  serverSupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  logger.info("Initialized authoritative server-side Supabase client with SUPABASE_SERVICE_ROLE_KEY");
  return serverSupabaseClient;
}

/**
 * Test & mocking helper to set the internal server Supabase client.
 */
export function setServerSupabaseClient(client: any): void {
  serverSupabaseClient = client;
}

export class StateConcurrencyError extends Error {
  public readonly code = "CONCURRENCY_CONFLICT";
  public readonly status = 409;
  public readonly expectedVersion: number;
  public readonly currentVersion: number;
  public readonly currentUpdatedAt?: string;

  constructor(expectedVersion: number, currentVersion: number, currentUpdatedAt?: string) {
    super(
      `State concurrency conflict. Client expected version ${expectedVersion}, but database is currently at version ${currentVersion}.`
    );
    this.name = "StateConcurrencyError";
    this.expectedVersion = expectedVersion;
    this.currentVersion = currentVersion;
    this.currentUpdatedAt = currentUpdatedAt;
  }
}

/**
 * Strips all private student, grade, financial, attendance, submission, audit, and PII data
 * from the shared default state object, ensuring it contains ONLY public system configuration.
 */
export function sanitizePublicSharedState(rawState: any): any {
  if (!rawState || typeof rawState !== 'object') {
    return {
      version: 1,
      academicYears: [],
      terms: [],
      masterCourses: [],
      courses: [],
      courseOfferings: [],
      classDays: [],
      portalConfig: {
        policyThreshold: '75%',
        honorThreshold: '85%',
        criticalThreshold: '50%',
      },
      libraryResources: [],
      records: [],
      submissions: [],
      rubricScores: {},
      payments: [],
      invoices: [],
      transactions: [],
      receipts: [],
      adjustments: [],
      refunds: [],
      students: [],
      studentLevels: {},
      studentPhotos: {},
      studentNotes: {},
      notifications: [],
      auditHistory: [],
      systemAuditLog: [],
    };
  }

  const clean = sanitizeProductionState(rawState);

  // Filter notifications to keep only global public system announcements
  const publicNotifications = Array.isArray(clean.notifications)
    ? clean.notifications.filter((n: any) => {
        if (!n) return false;
        const recipient = String(n.recipient || n.targetRole || '').toLowerCase();
        const hasSpecificStudentTarget = Boolean(n.studentId || n.student_id || n.studentName);
        return (recipient === 'all' || recipient === 'public' || !recipient) && !hasSpecificStudentTarget;
      })
    : [];

  return {
    ...clean,
    // Strip all private student PII and records
    students: [],
    studentLevels: {},
    studentPhotos: {},
    studentNotes: {},
    // Strip attendance history
    records: [],
    // Strip assignments homework submissions & rubric scores
    submissions: [],
    rubricScores: {},
    // Strip all financial ledgers, invoices, transactions, payments, receipts, adjustments, refunds
    invoices: [],
    payments: [],
    transactions: [],
    receipts: [],
    adjustments: [],
    refunds: [],
    // Strip administrative audit history
    auditHistory: [],
    systemAuditLog: [],
    // Keep only global public notifications
    notifications: publicNotifications,
  };
}

/**
 * Loads raw authoritative application state.
 * Deprecated in favor of pure relational domain composition (stateHydrationService).
 */
export async function getAuthoritativeState(_userIdOrKey?: string | null): Promise<any | null> {
  return null;
}

/**
 * Loads authoritative state strictly scoped and authorized for the requesting user
 * dynamically composed from PostgreSQL relational domain services.
 */
export async function getAuthorizedStateForUser(user: AuthenticatedUser): Promise<any | null> {
  const { stateHydrationService } = await import('./domain/stateHydrationService');
  return stateHydrationService.getComposedStateForUser(user);
}

/**
 * Deprecated: Monolithic state save for user.
 * Relational tables are mutated directly via domain-specific REST endpoints.
 */
export async function saveAuthoritativeStateForUser(
  user: AuthenticatedUser,
  _state: any,
  actionDescription?: string,
  _expectedVersion?: number | null
): Promise<{ success: boolean; version: number; updatedAt: string }> {
  const timestamp = new Date().toISOString();
  logger.info(`[StatePersistence] User ${user.userId} state persist request acknowledged. State is maintained in relational domain tables.`);
  return { success: true, version: 2, updatedAt: timestamp };
}

/**
 * Deprecated: Monolithic state save.
 * Relational tables are mutated directly via domain-specific REST endpoints.
 */
export async function saveAuthoritativeState(
  _state: any,
  actorUserId?: string | null,
  _actionDescription?: string,
  _expectedVersion?: number | null
): Promise<{ success: boolean; version: number; updatedAt: string }> {
  const timestamp = new Date().toISOString();
  logger.info(`[StatePersistence] saveAuthoritativeState invoked for ${actorUserId || 'system'}. State managed via relational domain services.`);
  return { success: true, version: 2, updatedAt: timestamp };
}


export interface AuditEventEntry {
  auditId?: string;
  audit_id?: string;
  actorUserId?: string | null;
  actor_user_id?: string | null;
  actorRole?: string | null;
  actor_role?: string | null;
  action: string;
  entityType: string;
  entity_type?: string;
  entityId: string;
  entity_id?: string;
  oldValues?: any;
  old_values?: any;
  newValues?: any;
  new_values?: any;
  changedFields?: string[] | any;
  changed_fields?: string[] | any;
  reason?: string | null;
  ipAddress?: string | null;
  ip_address?: string | null;
  userAgent?: string | null;
  user_agent?: string | null;
  requestId?: string | null;
  request_id?: string | null;
  timestamp?: string;
}

/**
 * Logs an event into the authoritative audit_history PostgreSQL table.
 * Strictly guarantees all 14 audit fields are populated:
 * audit_id, actor_user_id, actor_role, action, entity_type, entity_id,
 * old_values, new_values, changed_fields, reason, ip_address, user_agent,
 * request_id, timestamp.
 */
export async function logAuditEvent(entry: AuditEventEntry): Promise<boolean> {
  try {
    const supabase = getServerSupabase();
    
    // 1. Resolve audit_id (UUID)
    const auditId = entry.auditId || entry.audit_id || randomUUID();
    
    // 2. Resolve actor_user_id (UUID)
    const rawActor = entry.actorUserId !== undefined ? entry.actorUserId : (entry.actor_user_id !== undefined ? entry.actor_user_id : null);
    let resolvedUserId: string | null = null;
    
    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    if (rawActor) {
      if (isUuid(rawActor)) {
        resolvedUserId = rawActor;
      } else {
        // If an email/username/firebase_uid is passed, query users table to retrieve the canonical UUID
        try {
          const { data: userByUid } = await supabase
            .from('users')
            .select('id')
            .eq('firebase_uid', rawActor)
            .maybeSingle();
          
          if (userByUid?.id) {
            resolvedUserId = userByUid.id;
          } else {
            const { data: userRecord } = await supabase
              .from('users')
              .select('id')
              .eq('email', rawActor.toLowerCase().trim())
              .maybeSingle();
            
            if (userRecord?.id) {
              resolvedUserId = userRecord.id;
            }
          }
        } catch {
          // Non-blocking lookup fallback
        }
      }
    }
    
    // 3. Resolve actor_role
    const actorRole = entry.actorRole || entry.actor_role || 'system';
    
    // 4. Resolve action, entity_type, entity_id
    const action = entry.action;
    const entityType = entry.entityType || entry.entity_type || 'unknown';
    const entityId = String(entry.entityId || entry.entity_id || 'system');
    
    // 5. Resolve old_values and new_values
    const oldValues = entry.oldValues !== undefined ? entry.oldValues : (entry.old_values !== undefined ? entry.old_values : null);
    const newValues = entry.newValues !== undefined ? entry.newValues : (entry.new_values !== undefined ? entry.new_values : null);
    
    // 6. Compute changed_fields if not explicitly passed
    let changedFields: any = entry.changedFields || entry.changed_fields;
    if (!changedFields && oldValues && newValues && typeof oldValues === 'object' && typeof newValues === 'object') {
      const keys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
      const diffKeys: string[] = [];
      for (const k of keys) {
        if (JSON.stringify(oldValues[k]) !== JSON.stringify(newValues[k])) {
          diffKeys.push(k);
        }
      }
      changedFields = diffKeys;
    } else if (!changedFields) {
      changedFields = [];
    }
    
    // 7. Resolve reason
    const reason = entry.reason || 
      newValues?.reason || 
      newValues?.overrideReason || 
      newValues?.notes || 
      newValues?.description || 
      null;
      
    // 8. Resolve request metadata
    const ipAddress = entry.ipAddress || entry.ip_address || null;
    const userAgent = entry.userAgent || entry.user_agent || null;
    const requestId = entry.requestId || entry.request_id || randomUUID();
    const timestamp = entry.timestamp || new Date().toISOString();
    
    // 9. Authoritative Insert storing all 14 columns
    const { error } = await supabase.from('audit_history').insert({
      audit_id: auditId,
      actor_user_id: resolvedUserId,
      actor_role: actorRole,
      action: action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      changed_fields: Array.isArray(changedFields) ? changedFields : [changedFields],
      reason: reason,
      ip_address: ipAddress,
      user_agent: userAgent,
      request_id: requestId,
      timestamp: timestamp,
    });

    if (error) {
      logger.error(`Failed to insert authoritative audit record: ${error.message}`);
      throw new Error(`Audit persistence failed: ${error.message}`);
    }
    return true;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Audit persistence failed:')) {
      throw err;
    }
    logger.error(`Exception writing to audit_history:`, err);
    throw new Error(`Audit persistence failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Retrieves audit history log records from PostgreSQL.
 */
export async function getAuditLogs(limit = 50, entityType?: string): Promise<any[]> {
  try {
    const supabase = getServerSupabase();
    let query = supabase
      .from('audit_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;
    if (error) {
      logger.warn(`Failed to fetch audit logs: ${error.message}`);
      return [];
    }
    
    return (data || []).map((row: any) => ({
      audit_id: row.audit_id || row.id,
      id: row.audit_id || row.id,
      actor_user_id: row.actor_user_id,
      actorUserId: row.actor_user_id,
      actor_role: row.actor_role || 'system',
      actorRole: row.actor_role || 'system',
      action: row.action,
      entity_type: row.entity_type,
      entityType: row.entity_type,
      entity_id: row.entity_id,
      entityId: row.entity_id,
      old_values: row.old_values,
      oldValues: row.old_values,
      new_values: row.new_values,
      newValues: row.new_values,
      changed_fields: row.changed_fields || [],
      changedFields: row.changed_fields || [],
      reason: row.reason || null,
      ip_address: row.ip_address,
      ipAddress: row.ip_address,
      user_agent: row.user_agent,
      userAgent: row.user_agent,
      request_id: row.request_id,
      requestId: row.request_id,
      timestamp: row.timestamp,
    }));
  } catch (err) {
    logger.warn(`Exception fetching audit logs:`, err);
    return [];
  }
}

/**
 * Retrieves all registered users from PostgreSQL users table.
 */
export async function getDatabaseUsers(): Promise<any[]> {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      logger.warn(`Failed to fetch database users: ${error.message}`);
      return [];
    }
    return data || [];
  } catch (err) {
    logger.warn('Exception fetching database users:', err);
    return [];
  }
}

/**
 * Updates a user's role in the database and records an audit log.
 */
export async function updateUserRoleInDatabase(
  userId: string,
  newRole: string,
  actorUserId?: string,
  actorRole?: string,
  reason?: string,
  requestId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const supabase = getServerSupabase();
    
    // Fetch previous user info for old_values in audit
    const { data: previousUser } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    // Security Restriction: No client or API call can assign super_admin.
    if (newRole === 'super_admin') {
      await logAuditEvent({
        actorUserId: actorUserId || null,
        actorRole: actorRole || 'unknown',
        entityType: 'super_admin_role',
        entityId: userId,
        action: 'unauthorized_super_admin_assignment_attempt',
        oldValues: { role: previousUser?.role || 'unknown' },
        newValues: { attemptedRole: 'super_admin' },
        changedFields: ['role'],
        reason: reason || 'Attempted client-side assignment of super_admin role',
        requestId,
        ipAddress,
        userAgent,
      });

      return {
        success: false,
        error: 'Security Policy Violation: The super_admin role cannot be assigned via client API calls. Explicit database provisioning is required.',
      };
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, email, role, is_active, updated_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const isSuperAdminChange = previousUser?.role === 'super_admin' || newRole === 'super_admin';
    await logAuditEvent({
      actorUserId: actorUserId || null,
      actorRole: actorRole || 'system',
      entityType: isSuperAdminChange ? 'super_admin_role' : 'user_role',
      entityId: userId,
      action: previousUser?.role === 'super_admin' && newRole !== 'super_admin' ? 'revoke_super_admin' : 'update',
      oldValues: { role: previousUser?.role || 'unknown' },
      newValues: { role: newRole, userEmail: data?.email },
      changedFields: ['role'],
      reason: reason || `Updated role from ${previousUser?.role || 'unknown'} to ${newRole}`,
      requestId,
      ipAddress,
      userAgent,
    });

    return { success: true, user: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update user role' };
  }
}

/**
 * Maps application UserRole to PostgreSQL users table check constraint:
 * ('admin' | 'teacher' | 'student' | 'staff')
 */
function toDbUserRole(role: string): "admin" | "teacher" | "student" | "staff" {
  if (role === "super_admin" || role === "admin") return "admin";
  if (role === "lecturer" || role === "teacher") return "teacher";
  if (role === "registrar" || role === "finance_officer" || role === "librarian" || role === "staff") return "staff";
  return "student";
}

/**
 * Explicitly provisions or approves a user account (e.g. lecturer, staff, student) by an administrator.
 * Authoritatively persists the record in PostgreSQL users table and records an audit trail.
 */
export async function provisionOrApproveUserByAdmin({
  email,
  role,
  actorUserId,
  actorRole,
  reason,
  assignedCourses,
  sourceRecord,
  requestId,
  ipAddress,
  userAgent,
  firebaseUid,
}: {
  email: string;
  role: string;
  actorUserId: string;
  actorRole: string;
  reason?: string;
  assignedCourses?: string[];
  sourceRecord?: any;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  firebaseUid?: string;
}): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const supabase = getServerSupabase();
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) {
      return { success: false, error: 'Valid email is required for account provisioning' };
    }

    const normalizedRole = normalizeUserRole(role);

    // Security Restriction: No client/API call can assign super_admin.
    if (normalizedRole === 'super_admin') {
      try {
        await logAuditEvent({
          actorUserId: actorUserId || null,
          actorRole: actorRole || 'unknown',
          entityType: 'super_admin_role',
          entityId: cleanEmail,
          action: 'unauthorized_super_admin_provisioning_attempt',
          oldValues: null,
          newValues: { attemptedRole: 'super_admin', email: cleanEmail },
          changedFields: ['role'],
          reason: reason || 'Attempted administrative API assignment of super_admin role',
          requestId,
          ipAddress,
          userAgent,
        });
      } catch (auditErr) {
        logger.warn('Warning writing super_admin provisioning rejection audit event:', auditErr);
      }

      return {
        success: false,
        error: 'Security Policy Violation: The super_admin role cannot be assigned via client API calls. Explicit database provisioning is required.',
      };
    }

    const dbRole = toDbUserRole(normalizedRole);

    // Check if user already exists in PostgreSQL users table (primary: firebase_uid, secondary: email)
    let existingUser: any = null;
    if (firebaseUid) {
      const { data: userByUid } = await supabase
        .from('users')
        .select('id, email, role, is_active, firebase_uid')
        .eq('firebase_uid', firebaseUid)
        .maybeSingle();
      if (userByUid) existingUser = userByUid;
    }

    if (!existingUser) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, email, role, is_active, firebase_uid')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (userByEmail) existingUser = userByEmail;
    }

    let savedUser: any = null;
    let action = 'admin_provision_user';

    if (existingUser) {
      action = 'admin_approve_user';
      const updatePayload: any = {
        role: dbRole,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (firebaseUid && !existingUser.firebase_uid) {
        updatePayload.firebase_uid = firebaseUid;
      }

      const { data: updated, error: updateErr } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', existingUser.id)
        .select('id, email, role, is_active, firebase_uid, updated_at')
        .single();

      if (updateErr) {
        return { success: false, error: `Failed to update user approval: ${updateErr.message}` };
      }
      savedUser = updated;
    } else {
      const insertPayload: any = {
        email: cleanEmail,
        role: dbRole,
        is_active: true,
      };
      if (firebaseUid) {
        insertPayload.firebase_uid = firebaseUid;
      }

      const { data: created, error: insertErr } = await supabase
        .from('users')
        .insert(insertPayload)
        .select('id, email, role, is_active, firebase_uid, created_at')
        .single();

      if (insertErr) {
        return { success: false, error: `Failed to provision user: ${insertErr.message}` };
      }
      savedUser = created;
    }

    // Record immutable identity mapping in user_identities
    if (firebaseUid && savedUser?.id) {
      try {
        await supabase
          .from('user_identities')
          .upsert(
            {
              user_id: savedUser.id,
              provider: 'firebase',
              provider_uid: firebaseUid,
              email: cleanEmail,
            },
            { onConflict: 'provider,provider_uid' }
          );
      } catch (idErr) {
        logger.debug('user_identities upsert note:', idErr);
      }
    }

    // Link corresponding students table record if role is student or if a matching record exists
    try {
      const { data: matchedStudent } = await supabase
        .from('students')
        .select('id')
        .or(`student_number.eq.${cleanEmail},id.eq.${cleanEmail}`)
        .is('user_id', null)
        .maybeSingle();

      if (matchedStudent?.id && savedUser?.id) {
        await supabase
          .from('students')
          .update({ user_id: savedUser.id })
          .eq('id', matchedStudent.id);
      }
    } catch {
      // Non-blocking student linkage fallback
    }

    // Link corresponding course_offerings table records if role is lecturer or teacher
    if (savedUser?.id && (normalizedRole === 'lecturer' || normalizedRole === 'teacher')) {
      try {
        await supabase
          .from('course_offerings')
          .update({ lecturer_user_id: savedUser.id })
          .ilike('lecturer_email', cleanEmail)
          .is('lecturer_user_id', null);
      } catch {
        // Non-blocking course_offerings linkage fallback
      }
    }

    // Authoritative Audit Log
    try {
      await logAuditEvent({
        actorUserId: actorUserId || null,
        actorRole: actorRole || 'admin',
        entityType: 'user_provisioning',
        entityId: savedUser.id,
        action: action,
        oldValues: existingUser ? { role: existingUser.role, is_active: existingUser.is_active } : null,
        newValues: {
          userId: savedUser.id,
          email: cleanEmail,
          role: dbRole,
          assignedRole: normalizedRole,
          is_active: true,
          sourceRecord: sourceRecord || { type: 'admin_approval', actorUserId },
        },
        changedFields: existingUser ? ['role', 'is_active'] : ['email', 'role', 'is_active'],
        reason: reason || `Explicit administrator approval and activation of ${normalizedRole} account`,
        requestId,
        ipAddress,
        userAgent,
      });
    } catch (auditErr) {
      logger.warn('Warning writing admin provisioning audit event:', auditErr);
    }

    return { success: true, user: savedUser };
  } catch (err: any) {
    logger.error('Exception during administrator account provisioning:', err);
    return { success: false, error: err.message || 'Failed to provision user account' };
  }
}

/**
 * Retrieves prospective faculty and staff accounts that match profile or course records
 * but have not yet been activated/approved in PostgreSQL users table.
 */
export async function getPendingAccountApprovals(): Promise<any[]> {
  try {
    const supabase = getServerSupabase();
    
    // 1. Get existing active users
    const { data: users } = await supabase
      .from('users')
      .select('email, role, is_active');

    const activeUserEmails = new Set(
      (users || []).filter((u: any) => u.is_active).map((u: any) => (u.email || '').toLowerCase().trim())
    );

    const pendingList: any[] = [];

    // 2. Query course_offerings for lecturer emails not yet in users table
    const { data: offerings } = await supabase
      .from('course_offerings')
      .select('id, course_id, lecturer_name, lecturer_email')
      .not('lecturer_email', 'is', null);

    if (offerings) {
      for (const off of offerings) {
        const email = (off.lecturer_email || '').toLowerCase().trim();
        if (email && !activeUserEmails.has(email) && !pendingList.some((p) => p.email === email)) {
          pendingList.push({
            email,
            suggestedRole: 'lecturer',
            candidateName: off.lecturer_name,
            sourceTable: 'course_offerings',
            sourceId: off.id,
            details: { courseId: off.course_id },
          });
        }
      }
    }

    // 3. Query profiles for lecturer or staff roles not yet in users table
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .not('role', 'is', null);

    if (profiles) {
      for (const prof of profiles) {
        const email = (prof.email || '').toLowerCase().trim();
        const role = prof.role ? normalizeUserRole(prof.role) : '';
        if (
          email &&
          (role === 'lecturer' ||
            role === 'teacher' ||
            role === 'staff' ||
            role === 'registrar' ||
            role === 'finance_officer' ||
            role === 'librarian') &&
          !activeUserEmails.has(email) &&
          !pendingList.some((p) => p.email === email)
        ) {
          pendingList.push({
            email,
            suggestedRole: role,
            candidateName: `${prof.first_name || ''} ${prof.last_name || ''}`.trim(),
            sourceTable: 'profiles',
            sourceId: prof.id,
            details: { profileRole: prof.role },
          });
        }
      }
    }

    return pendingList;
  } catch (err) {
    logger.warn('Exception querying pending account approvals:', err);
    return [];
  }
}

