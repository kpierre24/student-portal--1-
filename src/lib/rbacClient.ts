import { UserRole, Permission, RoleDefinition, ROLE_DEFINITIONS, normalizeUserRole, roleHasPermission } from '../types/rbac';
import { TabType } from '../types';
import { AppUser } from './userAuth';
import { isRouteAccessible } from '../app/navigation';

/**
 * Returns role metadata definition with styling and permission scopes.
 */
export function getRoleDefinition(role: UserRole | string | undefined | null): RoleDefinition {
  const norm = normalizeUserRole(role);
  return ROLE_DEFINITIONS[norm] || ROLE_DEFINITIONS.student;
}

/**
 * Returns all active system role definitions for UI switchers and permission tables.
 */
export function getAllRoles(): RoleDefinition[] {
  const uniqueKeys: UserRole[] = [
    'super_admin',
    'admin',
    'registrar',
    'lecturer',
    'student',
    'finance_officer',
    'librarian',
    'viewer'
  ];
  return uniqueKeys.map(k => ROLE_DEFINITIONS[k]).filter(Boolean);
}

/**
 * Checks if a given user/role can access a primary portal navigation tab.
 * Evaluates authorization according to: Role -> Permissions -> Route Access -> Navigation.
 */
export function canAccessTab(role: UserRole | string | undefined | null, tab: TabType): boolean {
  const norm = normalizeUserRole(role);
  return isRouteAccessible(tab, norm);
}

/**
 * Checks if the current AppUser has a specific granular permission.
 */
export function hasUserPermission(user: AppUser | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return roleHasPermission(user.role, permission);
}

/**
 * Helper to construct authentication and ownership headers for API requests.
 */
export function getAuthHeaders(appUser: AppUser | null | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (!appUser) return headers;

  const cleanRole = normalizeUserRole(appUser.role);
  headers['x-user-email'] = appUser.email;
  headers['x-user-role'] = cleanRole;
  
  if (appUser.studentRecordId) {
    headers['x-student-record-id'] = appUser.studentRecordId;
  }
  if (appUser.studentNumber) {
    headers['x-student-number'] = appUser.studentNumber;
  }
  if (appUser.studentRecordId || appUser.studentId) {
    headers['x-student-id'] = appUser.studentRecordId || appUser.studentId!;
  }
  if (appUser.studentName || appUser.name) {
    headers['x-student-name'] = appUser.studentName || appUser.name;
  }

  // Create standard bearer token representation
  const tokenPayload = {
    id: appUser.id,
    email: appUser.email,
    role: cleanRole,
    studentRecordId: appUser.studentRecordId,
    studentNumber: appUser.studentNumber,
    studentId: appUser.studentRecordId || appUser.studentId,
    studentName: appUser.studentName || appUser.name
  };
  try {
    const b64 = btoa(JSON.stringify(tokenPayload));
    headers['Authorization'] = `Bearer ${b64}`;
  } catch {
    headers['Authorization'] = `Bearer ${appUser.email}`;
  }

  return headers;
}
