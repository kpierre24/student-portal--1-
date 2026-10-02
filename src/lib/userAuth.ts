import { UserRole, Permission, ROLE_DEFINITIONS, normalizeUserRole, roleHasPermission } from '../types/rbac';
import { checkAccountLockout, recordFailedLoginAttempt, clearFailedLoginAttempts, verifyPasswordHash } from './securityHelper';

export type { UserRole };

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  username?: string;
  studentName?: string; // If role is student, links to student profile name
  studentRecordId?: string; // Database students table UUID (students.id)
  studentNumber?: string;   // Administrative registration code (students.student_number)
  /** @deprecated Use explicit studentRecordId (UUID) or studentNumber instead */
  studentId?: string;       // Strictly aliases studentRecordId (UUID)
  assignedCourses?: string[];
  permissions?: Permission[];
  moduleOrDepartment?: string;
  avatarUrl?: string;
  phone?: string;
  status?: 'active' | 'suspended';
  mustChangePassword?: boolean;
}

export interface UserCredential {
  id: string;
  email: string; // Primary login email
  username?: string; // Canonical format / username alias (e.g. ABurke, admin)
  name: string;
  role: UserRole;
  studentName?: string;
  moduleOrDepartment?: string;
  passwordHash: string; // Hashed password
  mustChangePassword: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
}

export const DEFAULT_ADMIN_EMAIL = 'kpierre24@gmail.com';
export const DEFAULT_ADMIN_NAME = 'Kendell Pierre';

/**
 * Authenticates the system administrator using the 6-digit PIN code (Deprecated - standard login enforced).
 */
export const authenticateAdminWithPin = (
  _pinInput: string,
  _credentials?: UserCredential[]
): { success: boolean; user?: AppUser; error?: string } => {
  return { 
    success: false, 
    error: 'Administrator PIN authentication has been deprecated and disabled for security. Please use standard email & password login.' 
  };
};

/**
 * Validates credentials in memory for test suites or offline simulation.
 */
export const authenticateUser = (
  identifierInput: string,
  passwordInput: string,
  credentials?: UserCredential[]
): { success: boolean; user?: AppUser; error?: string; mustChangePassword?: boolean } => {
  const cleanId = (identifierInput || '').trim().toLowerCase();
  const cleanPassword = (passwordInput || '').trim();

  if (!cleanId || !cleanPassword) {
    return { success: false, error: 'Email and password are required.' };
  }

  const match = (credentials || []).find(c => isMatchingCredential(c, cleanId));
  if (match && match.passwordHash === cleanPassword) {
    return {
      success: true,
      user: {
        id: match.id,
        email: match.email,
        name: match.name,
        role: match.role,
        username: match.username,
        studentName: match.studentName,
        status: match.status,
        mustChangePassword: match.mustChangePassword
      },
      mustChangePassword: match.mustChangePassword
    };
  }

  return { success: false, error: 'Invalid credentials.' };
};

/**
 * Generates a cryptographically random temporary password for account provisioning.
 */
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

/**
 * Detects if a stored password hash is an unmodified legacy weak password.
 */
export const isDefaultPassword = (hash?: string): boolean => {
  if (!hash) return true;
  const clean = hash.trim().toLowerCase();
  return (
    clean === 'password1' ||
    clean === '1234' ||
    clean === '12345' ||
    clean === 'password' ||
    clean === 'admin' ||
    clean === 'admin123' ||
    clean.length < 6
  );
};

export const isDefaultPasswordInput = (input?: string): boolean => {
  if (!input) return false;
  const clean = input.trim().toLowerCase();
  return clean === 'password1' || clean === '1234' || clean === '12345' || clean === 'password' || clean === 'admin';
};

/**
 * Standardizes email lookup
 */
export const generateStudentUsername = (fullName: string): string => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0].charAt(0).toUpperCase();
  const rawLast = parts[parts.length - 1].replace(/[^a-zA-Z0-9]/g, '');
  const last = rawLast.length > 0 ? rawLast.charAt(0).toUpperCase() + rawLast.slice(1).toLowerCase() : '';
  return `${first}${last}`;
};

export const getStudentEmailFromName = (name: string, customEmail?: string): string => {
  if (customEmail && customEmail.includes('@')) return customEmail.toLowerCase().trim();
  const username = generateStudentUsername(name).toLowerCase();
  return `${username}@student.hteim.edu`;
};

export const getFacultyEmailFromName = (name: string, customEmail?: string): string => {
  if (customEmail && customEmail.includes('@')) return customEmail.toLowerCase().trim();
  const cleanName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '.');
  return `${cleanName}@hteim.edu`;
};

export const isMatchingCredential = (
  cred: UserCredential,
  identifier: string | AppUser
): boolean => {
  if (!cred || !identifier) return false;
  const cleanId = typeof identifier === 'string'
    ? identifier.toLowerCase().trim()
    : (identifier.email || identifier.username || '').toLowerCase().trim();

  const credEmail = (cred.email || '').toLowerCase().trim();
  const credUser = (cred.username || '').toLowerCase().trim();
  const credName = (cred.name || '').toLowerCase().trim();
  const credStudent = (cred.studentName || '').toLowerCase().trim();

  return (
    credEmail === cleanId ||
    credUser === cleanId ||
    credName === cleanId ||
    credStudent === cleanId
  );
};

export const mergeUserCredentials = (
  base: UserCredential[],
  incoming: UserCredential[]
): UserCredential[] => {
  const map = new Map<string, UserCredential>();
  (base || []).filter(Boolean).forEach(c => map.set(c.id || c.email.toLowerCase(), c));
  (incoming || []).filter(Boolean).forEach(c => map.set(c.id || c.email.toLowerCase(), c));
  return Array.from(map.values());
};

// Create a new user (Admin, Teacher, or Student)
export const createUserCredential = (
  credentials: UserCredential[],
  newUser: {
    name: string;
    email: string;
    role: UserRole;
    studentName?: string;
    moduleOrDepartment?: string;
    customPassword?: string;
    requirePasswordChange?: boolean;
  }
): { success: boolean; updatedCredentials: UserCredential[]; error?: string; user?: UserCredential } => {
  const emailClean = newUser.email.trim().toLowerCase();
  const nameClean = newUser.name.trim();

  if (!nameClean) {
    return { success: false, updatedCredentials: credentials, error: 'Full name is required.' };
  }
  if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    return { success: false, updatedCredentials: credentials, error: 'A valid email address is required.' };
  }

  const emailExists = (credentials || []).some(c => c && c.email && c.email.toLowerCase() === emailClean);
  if (emailExists) {
    return { success: false, updatedCredentials: credentials, error: `An account with email "${emailClean}" already exists.` };
  }

  const username = generateStudentUsername(nameClean);
  const tempPassword = newUser.customPassword || generateTemporaryPassword();
  const newCred: UserCredential = {
    id: `u-${newUser.role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: emailClean,
    username: username || emailClean.split('@')[0],
    name: nameClean,
    role: newUser.role,
    studentName: newUser.role === 'student' ? (newUser.studentName || nameClean) : undefined,
    moduleOrDepartment: newUser.moduleOrDepartment,
    passwordHash: tempPassword,
    mustChangePassword: newUser.requirePasswordChange !== undefined ? newUser.requirePasswordChange : true,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  const updatedCredentials = [newCred, ...credentials];
  return { success: true, updatedCredentials, user: newCred };
};

// Reset a user's password with mustChangePassword = true
export const resetUserPassword = (
  credentials: UserCredential[],
  emailOrUsername: string | AppUser,
  newPassword?: string
): UserCredential[] => {
  const securePass = newPassword || generateTemporaryPassword();
  return (credentials || []).map(c => {
    if (!c) return c;
    if (isMatchingCredential(c, emailOrUsername)) {
      return {
        ...c,
        passwordHash: securePass,
        mustChangePassword: true
      };
    }
    return c;
  });
};

// Update user details
export const updateUserCredential = (
  credentials: UserCredential[],
  id: string,
  updates: Partial<Omit<UserCredential, 'id' | 'createdAt'>>
): UserCredential[] => {
  return credentials.map(c => {
    if (c.id === id) {
      return {
        ...c,
        ...updates
      };
    }
    return c;
  });
};

// Delete user account
export const deleteUserCredential = (
  credentials: UserCredential[],
  id: string
): UserCredential[] => {
  return credentials.filter(c => c.id !== id);
};

export const ensureUserCredentials = (
  currentCredentials: UserCredential[],
  studentNames: string[],
  facultyList: Array<{ id?: string; name: string; email?: string; module?: string }> = [],
  studentEmailMap: Record<string, string> = {}
): { updatedCredentials: UserCredential[]; changed: boolean } => {
  let updated = [...(currentCredentials || [])].filter(Boolean);
  let changed = false;

  const adminIdx = updated.findIndex(c => 
    c && (
      (c.email && c.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) ||
      (c.username && c.username.toLowerCase() === 'admin')
    )
  );

  if (adminIdx === -1) {
    updated.unshift({
      id: 'u-admin-kpierre',
      email: DEFAULT_ADMIN_EMAIL,
      username: 'admin',
      name: DEFAULT_ADMIN_NAME,
      role: 'admin',
      passwordHash: generateTemporaryPassword(),
      mustChangePassword: false,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    changed = true;
  }

  const defaultTeachers = [
    { name: 'Apostle Gillian Selkridge', email: 'apostle.gillian@hteim.edu', module: 'School of the Apostles' },
    { name: 'Pastor Samuel Selkridge', email: 'pastor.samuel@hteim.edu', module: 'Introduction & School of the Pastor' },
    { name: 'Pastor Gale Grant', email: 'gale.grant@hteim.edu', module: 'Ministerial Ethics' },
    { name: 'Pastor Christy Arthur', email: 'christy.arthur@hteim.edu', module: 'School of the Pastor and Holy Spirit' },
    { name: 'Prophet Garod Andrews', email: 'garod.andrews@hteim.edu', module: 'School of the Prophets' }
  ];

  const allFaculty = facultyList && facultyList.length > 0 ? facultyList : defaultTeachers;

  allFaculty.forEach(teacher => {
    if (!teacher || !teacher.name) return;
    const email = getFacultyEmailFromName(teacher.name, teacher.email);
    const hasTeacher = updated.some(c => 
      c && (
        (c.email && c.email.toLowerCase() === email.toLowerCase()) ||
        (c.name && c.name.toLowerCase() === teacher.name.toLowerCase())
      )
    );

    if (!hasTeacher) {
      updated.push({
        id: `u-teacher-${teacher.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        email: email,
        username: teacher.name.toLowerCase().replace(/[^a-z0-9]/g, '.'),
        name: teacher.name,
        role: 'teacher',
        moduleOrDepartment: teacher.module || 'Faculty Instructor',
        passwordHash: generateTemporaryPassword(),
        mustChangePassword: true,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      changed = true;
    }
  });

  studentNames.forEach(sName => {
    if (!sName || typeof sName !== 'string') return;
    const nameClean = sName.trim();
    if (!nameClean) return;
    const username = generateStudentUsername(nameClean);
    const studentKey = nameClean.toLowerCase().trim();
    const email = getStudentEmailFromName(nameClean, studentEmailMap[studentKey]);
    
    const existingIndex = updated.findIndex(c => 
      c && (
        (c.studentName && c.studentName.toLowerCase().trim() === studentKey) ||
        (c.name && c.name.toLowerCase().trim() === studentKey) ||
        (c.email && c.email.toLowerCase().trim() === email.toLowerCase()) ||
        (c.username && c.username.toLowerCase() === username.toLowerCase())
      )
    );

    if (existingIndex === -1) {
      updated.push({
        id: `u-student-${nameClean.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        email: email,
        username: username,
        name: nameClean,
        role: 'student',
        studentName: nameClean,
        passwordHash: generateTemporaryPassword(),
        mustChangePassword: true,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      changed = true;
    }
  });

  return { updatedCredentials: updated, changed };
};
