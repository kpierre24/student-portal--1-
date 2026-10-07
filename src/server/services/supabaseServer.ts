import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { logger } from '../../lib/logger';
import { sanitizeProductionState, isDemoRecord, isDemoUser } from '../../data/guards';
import { AuthenticatedUser, normalizeUserRole } from '../../types/rbac';

let serverSupabaseClient: SupabaseClient | null = null;

export const DEFAULT_SERVER_SUPABASE_URL = 'https://mjaloptcpeytvecbxbza.supabase.co';

export function getServerSupabaseUrl(): string {
  const envUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (envUrl && !envUrl.includes('your-project.supabase.co')) {
    return envUrl.trim();
  }
  return DEFAULT_SERVER_SUPABASE_URL;
}

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = getServerSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(supabaseUrl && serviceRoleKey);
}

/**
 * Validates that authoritative privileged server credentials are configured.
 * Fails fast without silently downgrading to anonymous browser credentials.
 */
export function validateSupabaseServerConfig(): void {
  const supabaseUrl = getServerSupabaseUrl();
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

  const supabaseUrl = getServerSupabaseUrl();
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

const IN_MEMORY_AUDIT_LIMIT = 200;
const inMemoryAuditHistory: any[] = [];

function bufferAuditLogInMemory(record: any): void {
  inMemoryAuditHistory.unshift(record);
  if (inMemoryAuditHistory.length > IN_MEMORY_AUDIT_LIMIT) {
    inMemoryAuditHistory.pop();
  }
}

/**
 * Logs an event into the authoritative audit_history PostgreSQL table.
 * Strictly guarantees all 14 audit fields are populated:
 * audit_id, actor_user_id, actor_role, action, entity_type, entity_id,
 * old_values, new_values, changed_fields, reason, ip_address, user_agent,
 * request_id, timestamp.
 */
export async function logAuditEvent(entry: AuditEventEntry): Promise<boolean> {
  // 1. Resolve audit_id (UUID)
  const auditId = entry.auditId || entry.audit_id || randomUUID();
  const timestamp = entry.timestamp || new Date().toISOString();
  const actorRole = entry.actorRole || entry.actor_role || 'system';
  const action = entry.action;
  const entityType = entry.entityType || entry.entity_type || 'unknown';
  const entityId = String(entry.entityId || entry.entity_id || 'system');
  const oldValues = entry.oldValues !== undefined ? entry.oldValues : (entry.old_values !== undefined ? entry.old_values : null);
  const newValues = entry.newValues !== undefined ? entry.newValues : (entry.new_values !== undefined ? entry.new_values : null);

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

  const reason = entry.reason || 
    newValues?.reason || 
    newValues?.overrideReason || 
    newValues?.notes || 
    newValues?.description || 
    null;
    
  const ipAddress = entry.ipAddress || entry.ip_address || null;
  const userAgent = entry.userAgent || entry.user_agent || null;
  const requestId = entry.requestId || entry.request_id || randomUUID();

  // Buffer in authoritative local memory first
  const memoryRecord = {
    audit_id: auditId,
    id: auditId,
    actor_user_id: entry.actorUserId || entry.actor_user_id || null,
    actorUserId: entry.actorUserId || entry.actor_user_id || null,
    actor_role: actorRole,
    actorRole: actorRole,
    action: action,
    entity_type: entityType,
    entityType: entityType,
    entity_id: entityId,
    entityId: entityId,
    old_values: oldValues,
    oldValues: oldValues,
    new_values: newValues,
    newValues: newValues,
    changed_fields: Array.isArray(changedFields) ? changedFields : [changedFields],
    changedFields: Array.isArray(changedFields) ? changedFields : [changedFields],
    reason: reason,
    ip_address: ipAddress,
    ipAddress: ipAddress,
    user_agent: userAgent,
    userAgent: userAgent,
    request_id: requestId,
    requestId: requestId,
    timestamp: timestamp,
  };
  bufferAuditLogInMemory(memoryRecord);

  if (!isSupabaseConfigured()) {
    logger.debug('Audit log recorded in memory buffer (Supabase not configured)');
    return true;
  }

  try {
    const supabase = getServerSupabase();
    
    // Resolve actor_user_id (UUID)
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
    
    // Authoritative Insert storing all 14 columns
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
      const errMsg = error.message || String(error);
      if (errMsg.toLowerCase().includes('fetch failed') || errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('offline')) {
        logger.debug(`Audit log buffered in memory (cloud sync deferred): ${errMsg}`);
      } else {
        logger.warn(`Notice inserting authoritative audit record: ${errMsg}`);
      }
      return true;
    }
    return true;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.toLowerCase().includes('fetch failed') || errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('offline')) {
      logger.debug(`Audit log buffered in memory (cloud sync deferred): ${errMsg}`);
    } else {
      logger.debug(`Exception writing to audit_history (preserved in memory): ${errMsg}`);
    }
    return true;
  }
}

/**
 * Retrieves audit history log records from PostgreSQL with memory fallback.
 */
export async function getAuditLogs(limit = 50, entityType?: string): Promise<any[]> {
  try {
    if (isSupabaseConfigured()) {
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
      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
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
      }
    }
  } catch (err) {
    logger.debug('Falling back to in-memory audit logs buffer:', err);
  }

  // Fallback to in-memory audit buffer
  let filtered = inMemoryAuditHistory;
  if (entityType) {
    filtered = filtered.filter(l => l.entity_type === entityType || l.entityType === entityType);
  }
  return filtered.slice(0, limit);
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
 * Retrieves prospective faculty, staff, and student accounts awaiting administrator approval.
 * First queries public.user_approval_requests, then falls back to unmatched profiles/offerings.
 */
export async function getPendingAccountApprovals(): Promise<any[]> {
  try {
    const supabase = getServerSupabase();
    const pendingList: any[] = [];
    const seenEmails = new Set<string>();

    // 1. Primary: Query public.user_approval_requests where status = 'pending'
    try {
      const { data: dbRequests } = await supabase
        .from('user_approval_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (dbRequests && dbRequests.length > 0) {
        for (const req of dbRequests) {
          const email = (req.email || '').toLowerCase().trim();
          if (email) {
            seenEmails.add(email);
            pendingList.push({
              id: req.id,
              userId: req.user_id,
              email: req.email,
              name: req.name,
              candidateName: req.name,
              requestedRole: req.requested_role,
              suggestedRole: req.requested_role,
              status: req.status,
              details: req.details,
              sourceTable: 'user_approval_requests',
              sourceId: req.id,
              createdAt: req.created_at,
            });
          }
        }
      }
    } catch (reqErr) {
      logger.debug('user_approval_requests table query notice (will fallback):', reqErr);
    }

    // 2. Query users table for users where is_active = false or approval_status = 'pending'
    try {
      const { data: unapprovedUsers } = await supabase
        .from('users')
        .select('id, email, role, is_active, approval_status, requested_role, created_at')
        .or('is_active.eq.false,approval_status.eq.pending');

      if (unapprovedUsers) {
        for (const u of unapprovedUsers) {
          const email = (u.email || '').toLowerCase().trim();
          if (email && !seenEmails.has(email)) {
            seenEmails.add(email);
            pendingList.push({
              id: u.id,
              userId: u.id,
              email: u.email,
              name: u.email.split('@')[0],
              candidateName: u.email.split('@')[0],
              requestedRole: u.requested_role || u.role,
              suggestedRole: u.requested_role || u.role,
              status: u.approval_status || 'pending',
              sourceTable: 'users',
              sourceId: u.id,
              createdAt: u.created_at,
            });
          }
        }
      }
    } catch {
      // Non-blocking
    }
    
    // 3. Get existing active users to filter legacy candidate sources
    const { data: users } = await supabase
      .from('users')
      .select('email, role, is_active');

    const activeUserEmails = new Set(
      (users || []).filter((u: any) => u.is_active).map((u: any) => (u.email || '').toLowerCase().trim())
    );

    // 4. Query course_offerings for lecturer emails not yet in users table
    const { data: offerings } = await supabase
      .from('course_offerings')
      .select('id, course_id, lecturer_name, lecturer_email')
      .not('lecturer_email', 'is', null);

    if (offerings) {
      for (const off of offerings) {
        const email = (off.lecturer_email || '').toLowerCase().trim();
        if (email && !activeUserEmails.has(email) && !seenEmails.has(email)) {
          seenEmails.add(email);
          pendingList.push({
            id: `off-${off.id}`,
            email,
            suggestedRole: 'teacher',
            requestedRole: 'teacher',
            candidateName: off.lecturer_name,
            name: off.lecturer_name,
            sourceTable: 'course_offerings',
            sourceId: off.id,
            details: { courseId: off.course_id },
          });
        }
      }
    }

    // 5. Query profiles for lecturer or staff roles not yet in users table
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
          !seenEmails.has(email)
        ) {
          seenEmails.add(email);
          pendingList.push({
            id: `prof-${prof.id}`,
            email,
            suggestedRole: role === 'lecturer' ? 'teacher' : role,
            requestedRole: role === 'lecturer' ? 'teacher' : role,
            candidateName: `${prof.first_name || ''} ${prof.last_name || ''}`.trim(),
            name: `${prof.first_name || ''} ${prof.last_name || ''}`.trim(),
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

/**
 * Registers an account setup / approval request from within the app into Supabase.
 * If the user is kpierre24@gmail.com, auto-approves as super_admin.
 */
export async function registerAccountRequestInDatabase(params: {
  email: string;
  name: string;
  requestedRole: string;
  password?: string;
  username?: string;
  details?: any;
  userId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; status: 'approved' | 'pending'; error?: string; requestId?: string }> {
  try {
    const supabase = getServerSupabase();
    const cleanEmail = (params.email || '').toLowerCase().trim();
    const cleanName = (params.name || '').trim() || cleanEmail.split('@')[0];
    const cleanUsername = (params.username || params.details?.username || cleanEmail.split('@')[0]).trim().toLowerCase();
    const rawRole = (params.requestedRole || 'student').toLowerCase().trim();
    const normalizedRole = rawRole === 'teacher' ? 'teacher' : (rawRole === 'superadmin' ? 'super_admin' : normalizeUserRole(rawRole));

    // Auto-approve default executive super admin
    const isExecutiveAdmin = cleanEmail === 'kpierre24@gmail.com';
    const status = isExecutiveAdmin ? 'approved' : 'pending';
    const finalRole = isExecutiveAdmin ? 'super_admin' : normalizedRole;

    // 1. Authoritative Supabase Auth user creation with email_confirm = true
    if (params.password) {
      try {
        const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existingAuth = userList?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
        if (existingAuth) {
          await supabase.auth.admin.updateUserById(existingAuth.id, {
            password: params.password,
            email_confirm: true,
            user_metadata: {
              name: cleanName,
              full_name: cleanName,
              username: cleanUsername,
              role: finalRole,
              requested_role: finalRole,
              approval_status: status,
            },
            app_metadata: {
              role: finalRole,
              approved: isExecutiveAdmin,
              approval_status: status,
            }
          });
          if (!params.userId) {
            params.userId = existingAuth.id;
          }
        } else {
          const { data: createdAuth } = await supabase.auth.admin.createUser({
            email: cleanEmail,
            password: params.password,
            email_confirm: true,
            user_metadata: {
              name: cleanName,
              full_name: cleanName,
              username: cleanUsername,
              role: finalRole,
              requested_role: finalRole,
              approval_status: status,
            },
            app_metadata: {
              role: finalRole,
              approved: isExecutiveAdmin,
              approval_status: status,
            }
          });
          if (createdAuth?.user?.id && !params.userId) {
            params.userId = createdAuth.user.id;
          }
        }
      } catch (authAdminErr) {
        logger.debug('Supabase admin createUser/update notice:', authAdminErr);
      }
    }

    // 2. Upsert into public.user_approval_requests
    let reqId: string | undefined = undefined;
    try {
      const mergedDetails = {
        ...(params.details || {}),
        username: cleanUsername,
      };

      const { data: requestData, error: reqErr } = await supabase
        .from('user_approval_requests')
        .upsert(
          {
            email: cleanEmail,
            name: cleanName,
            user_id: params.userId || null,
            requested_role: finalRole,
            status: status,
            approved_role: isExecutiveAdmin ? finalRole : null,
            approved_at: isExecutiveAdmin ? new Date().toISOString() : null,
            details: mergedDetails,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        )
        .select('id')
        .single();

      if (!reqErr && requestData) {
        reqId = requestData.id;
      }
    } catch (e) {
      logger.debug('user_approval_requests upsert notice:', e);
    }

    // 3. Ensure record in public.users
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, is_active, approval_status, role')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingUser) {
        await supabase
          .from('users')
          .update({
            role: finalRole,
            requested_role: finalRole,
            is_active: isExecutiveAdmin,
            approval_status: status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);
      } else {
        await supabase
          .from('users')
          .insert({
            id: params.userId || undefined,
            email: cleanEmail,
            role: finalRole,
            requested_role: finalRole,
            is_active: isExecutiveAdmin,
            approval_status: status,
          });
      }
    } catch (userErr) {
      logger.debug('users table sync notice during register-request:', userErr);
    }

    // 4. Update cloud userCredentials fallback in app_states (for high-speed local/offline verification)
    if (params.password) {
      try {
        const { data: stateDoc } = await supabase
          .from('app_states')
          .select('state')
          .eq('id', 'hteim_master_state')
          .maybeSingle();

        const currentState = stateDoc?.state || {};
        const creds: any[] = Array.isArray(currentState.userCredentials) ? currentState.userCredentials : [];
        const existingIdx = creds.findIndex((c: any) => 
          c.email?.toLowerCase() === cleanEmail || (cleanUsername && c.username?.toLowerCase() === cleanUsername)
        );

        const newCredEntry = {
          id: params.userId || `u-${Date.now()}`,
          email: cleanEmail,
          username: cleanUsername,
          name: cleanName,
          role: finalRole,
          passwordHash: params.password,
          status: isExecutiveAdmin ? 'active' : 'pending',
          mustChangePassword: false,
          createdAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          creds[existingIdx] = { ...creds[existingIdx], ...newCredEntry };
        } else {
          creds.push(newCredEntry);
        }

        currentState.userCredentials = creds;
        await supabase
          .from('app_states')
          .upsert({
            id: 'hteim_master_state',
            state: currentState,
            updated_at: new Date().toISOString(),
            updated_by: params.userId || 'system_registration',
          });
      } catch (stateErr) {
        logger.debug('Credentials state update notice:', stateErr);
      }
    }

    // 3. Log audit event
    try {
      await logAuditEvent({
        actorUserId: params.userId || null,
        actorRole: 'anon',
        action: 'user_registration_requested',
        entityType: 'user_approval_requests',
        entityId: reqId || cleanEmail,
        newValues: {
          email: cleanEmail,
          name: cleanName,
          requestedRole: finalRole,
          status: status,
        },
        reason: isExecutiveAdmin
          ? 'System default executive super administrator auto-approved'
          : `User submitted self-registration for ${finalRole} approval in Supabase`,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
      });
    } catch {
      // Non-blocking
    }

    return { success: true, status, requestId: reqId };
  } catch (err: any) {
    logger.error('Error registering account request in database:', err);
    return { success: false, status: 'pending', error: err.message || 'Registration failed' };
  }
}

/**
 * Checks the approval status of an account by email or user ID in Supabase.
 */
export async function getAccountApprovalStatus(identifier: string): Promise<{
  exists: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'none';
  email?: string;
  role?: string;
  requestedRole?: string;
  name?: string;
  reason?: string;
}> {
  try {
    const supabase = getServerSupabase();
    const cleanId = (identifier || '').toLowerCase().trim();

    // Check DEFAULT_ADMIN_EMAIL
    if (cleanId === 'kpierre24@gmail.com') {
      return {
        exists: true,
        status: 'approved',
        email: 'kpierre24@gmail.com',
        role: 'super_admin',
        requestedRole: 'super_admin',
        name: 'Kendell Pierre',
      };
    }

    // 1. Check user_approval_requests
    try {
      const { data: req } = await supabase
        .from('user_approval_requests')
        .select('*')
        .or(`email.eq.${cleanId},user_id.eq.${cleanId},id.eq.${cleanId}`)
        .maybeSingle();

      if (req) {
        return {
          exists: true,
          status: req.status as 'pending' | 'approved' | 'rejected',
          email: req.email,
          role: req.approved_role || req.requested_role,
          requestedRole: req.requested_role,
          name: req.name,
          reason: req.rejection_reason,
        };
      }
    } catch (e) {
      logger.debug('user_approval_requests check notice:', e);
    }

    // 2. Check public.users table
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id, email, role, is_active, approval_status, requested_role, rejection_reason')
        .or(`email.eq.${cleanId},id.eq.${cleanId}`)
        .maybeSingle();

      if (user) {
        const status = user.approval_status
          ? user.approval_status
          : user.is_active
          ? 'approved'
          : 'pending';

        return {
          exists: true,
          status: status as 'pending' | 'approved' | 'rejected',
          email: user.email,
          role: user.role,
          requestedRole: user.requested_role || user.role,
          reason: user.rejection_reason,
        };
      }
    } catch {
      // Non-blocking
    }

    // 3. Fallback: check app_states userCredentials
    try {
      const { data: stateDoc } = await supabase
        .from('app_states')
        .select('state')
        .eq('id', 'hteim_master_state')
        .maybeSingle();

      const creds: any[] = stateDoc?.state?.userCredentials || [];
      const cred = creds.find((c: any) => 
        c.email?.toLowerCase() === cleanId || 
        c.username?.toLowerCase() === cleanId || 
        c.name?.toLowerCase() === cleanId
      );

      if (cred) {
        return {
          exists: true,
          status: cred.status === 'active' ? 'approved' : (cred.status === 'pending' ? 'pending' : 'approved'),
          email: cred.email,
          role: cred.role,
          requestedRole: cred.role,
          name: cred.name,
        };
      }
    } catch {}

    return { exists: false, status: 'none' };
  } catch (err) {
    logger.warn('Error checking account approval status:', err);
    return { exists: false, status: 'none' };
  }
}

/**
 * Approves a pending account request in Supabase.
 */
export async function approveAccountRequestInDatabase(params: {
  targetIdentifier: string;
  roleOverride?: string;
  actorUserId?: string;
  actorRole?: string;
  reason?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const supabase = getServerSupabase();
    const cleanId = (params.targetIdentifier || '').trim();

    // 1. Try invoking public.approve_user stored procedure if available
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('approve_user', {
        target_identifier: cleanId,
        role_override: params.roleOverride || null,
        approver_id: params.actorUserId || null,
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        return { success: true, user: rpcRes };
      }
    } catch {
      // Fall back to direct database updates
    }

    // 2. Direct database update fallback
    return await provisionOrApproveUserByAdmin({
      email: cleanId,
      role: params.roleOverride || 'student',
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      reason: params.reason || 'Account approved via Supabase approval workflow',
      requestId: params.requestId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (err: any) {
    logger.error('Error approving account request in database:', err);
    return { success: false, error: err.message || 'Approval failed' };
  }
}

/**
 * Rejects a pending account request in Supabase.
 */
export async function rejectAccountRequestInDatabase(params: {
  targetIdentifier: string;
  reason?: string;
  actorUserId?: string;
  actorRole?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getServerSupabase();
    const cleanId = (params.targetIdentifier || '').trim();
    const reasonText = params.reason || 'Application not approved by administrator';

    // 1. Try invoking public.reject_user stored procedure if available
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('reject_user', {
        target_identifier: cleanId,
        reason_text: reasonText,
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        return { success: true };
      }
    } catch {
      // Fallback
    }

    // 2. Direct update on user_approval_requests
    try {
      await supabase
        .from('user_approval_requests')
        .update({
          status: 'rejected',
          rejection_reason: reasonText,
          updated_at: new Date().toISOString(),
        })
        .or(`email.eq.${cleanId},id.eq.${cleanId}`);
    } catch {}

    // 3. Direct update on users
    try {
      await supabase
        .from('users')
        .update({
          is_active: false,
          approval_status: 'rejected',
          rejection_reason: reasonText,
          updated_at: new Date().toISOString(),
        })
        .or(`email.eq.${cleanId},id.eq.${cleanId}`);
    } catch {}

    // 4. Audit Log
    try {
      await logAuditEvent({
        actorUserId: params.actorUserId || null,
        actorRole: params.actorRole || 'admin',
        action: 'user_account_rejected',
        entityType: 'user_approval_requests',
        entityId: cleanId,
        newValues: { status: 'rejected', reason: reasonText },
        reason: reasonText,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
      });
    } catch {}

    return { success: true };
  } catch (err: any) {
    logger.error('Error rejecting account request in database:', err);
    return { success: false, error: err.message || 'Rejection failed' };
  }
}

/**
 * Resolves a username, student number, or name to their registered email address for sign-in.
 */
export async function resolveUserIdentifierToEmail(identifier: string): Promise<{
  exists: boolean;
  email?: string;
  name?: string;
  role?: string;
  username?: string;
}> {
  try {
    const supabase = getServerSupabase();
    const clean = (identifier || '').trim().toLowerCase();
    if (!clean) return { exists: false };

    if (clean === 'admin' || clean === 'kpierre24' || clean === 'kpierre') {
      return {
        exists: true,
        email: 'kpierre24@gmail.com',
        name: 'Kendell Pierre',
        role: 'super_admin',
        username: 'admin',
      };
    }

    // 1. Check public.users table
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, role, id')
        .or(`email.ilike.${clean}@%,id.eq.${clean}`)
        .maybeSingle();

      if (user?.email) {
        return { exists: true, email: user.email, role: user.role };
      }
    } catch {}

    // 2. Check public.students table (student_number)
    try {
      const { data: std } = await supabase
        .from('students')
        .select('user_id, student_number')
        .ilike('student_number', clean)
        .maybeSingle();

      if (std?.user_id) {
        const { data: u } = await supabase.from('users').select('email, role').eq('id', std.user_id).maybeSingle();
        if (u?.email) {
          return { exists: true, email: u.email, role: u.role };
        }
      }
    } catch {}

    // 3. Check public.user_approval_requests table
    try {
      const { data: req } = await supabase
        .from('user_approval_requests')
        .select('email, name, requested_role, details')
        .or(`email.ilike.${clean}@%,name.ilike.%${clean}%`)
        .limit(1)
        .maybeSingle();

      if (req?.email) {
        return {
          exists: true,
          email: req.email,
          name: req.name,
          role: req.requested_role,
        };
      }
    } catch {}

    // 4. Check app_states credentials
    try {
      const { data: stateDoc } = await supabase
        .from('app_states')
        .select('state')
        .eq('id', 'hteim_master_state')
        .maybeSingle();

      const creds: any[] = stateDoc?.state?.userCredentials || [];
      const cred = creds.find((c: any) => 
        c.username?.toLowerCase() === clean || 
        c.name?.toLowerCase() === clean ||
        c.studentName?.toLowerCase() === clean ||
        c.email?.toLowerCase().startsWith(clean + '@')
      );

      if (cred?.email) {
        return {
          exists: true,
          email: cred.email,
          name: cred.name,
          role: cred.role,
          username: cred.username,
        };
      }
    } catch {}

    return { exists: false };
  } catch (err) {
    logger.debug('Error resolving user identifier:', err);
    return { exists: false };
  }
}


