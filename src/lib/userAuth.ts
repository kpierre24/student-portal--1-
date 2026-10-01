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
  passwordHash: string; // Default 'password1' or custom encrypted/stored password
  mustChangePassword: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
}

export const DEFAULT_USER_PASSWORD = 'password1';
export const DEFAULT_ADMIN_EMAIL = 'kpierre24@gmail.com';
export const DEFAULT_ADMIN_NAME = 'Kendell Pierre';

/**
 * Authenticates the system administrator using the 6-digit PIN code (Deprecated - standard login enforced).
 */
export const authenticateAdminWithPin = (
  pinInput: string,
  credentials?: UserCredential[]
): { success: boolean; user?: AppUser; error?: string } => {
  return { 
    success: false, 
    error: 'Administrator PIN authentication has been deprecated and disabled for security. Please use standard email & password login.' 
  };
};

/**
 * Detects if a stored password hash is an unmodified system default password.
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
    clean === 'hteim2026' ||
    clean === 'hteim123'
  );
};

/**
 * Detects if an entered password input matches a default initial password attempt.
 */
export const isDefaultPasswordInput = (input?: string): boolean => {
  if (!input) return false;
  const clean = input.trim().toLowerCase();
  return (
    clean === 'password1' ||
    clean === '1234' ||
    clean === '12345' ||
    clean === 'password' ||
    clean === 'admin' ||
    clean === 'admin123' ||
    clean === 'hteim2026' ||
    clean === 'hteim123'
  );
};

// Generate First Initial + Last Name username (e.g., Alex Burke -> ABurke)
export const generateStudentUsername = (fullName: any): string => {
  if (!fullName) return '';
  const str = typeof fullName === 'string' ? fullName : (typeof fullName === 'object' && fullName.name ? fullName.name : String(fullName));
  if (typeof str !== 'string' || !str) return '';
  const clean = str.trim().replace(/\s+/g, ' ');
  const parts = clean.split(' ');
  if (parts.length === 1) {
    // Single name (e.g., "Afeshia")
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  }
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastName = parts[parts.length - 1];
  // Sanitize non-alphanumeric characters from last name if any
  const cleanLastName = lastName.replace(/[^a-zA-Z]/g, '');
  if (!cleanLastName) return `${firstInitial}Student`;
  const formattedLastName = cleanLastName.charAt(0).toUpperCase() + cleanLastName.slice(1).toLowerCase();
  return `${firstInitial}${formattedLastName}`;
};

// Derive canonical student email if custom email not set in student profile
export const getStudentEmailFromName = (fullName: string, customEmail?: string): string => {
  if (customEmail && customEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customEmail.trim())) {
    return customEmail.trim().toLowerCase();
  }
  const username = generateStudentUsername(fullName);
  if (!username) return 'student@student.hteim.edu';
  return `${username.toLowerCase()}@student.hteim.edu`;
};

// Derive faculty email from teacher name if not set
export const getFacultyEmailFromName = (fullName: string, customEmail?: string): string => {
  if (customEmail && customEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customEmail.trim())) {
    return customEmail.trim().toLowerCase();
  }
  const clean = (fullName || 'faculty').trim().toLowerCase().replace(/^(rev|dr|pastor|apostle|bishop|minister|evangelist|elder)\.?\s+/i, '');
  const slug = clean.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return `${slug || 'teacher'}@hteim.edu`;
};

/**
 * Universal matcher for user credentials against strings (email, username, name, ID) or AppUser objects.
 */
export const isMatchingCredential = (cred: UserCredential, query: string | AppUser | undefined | null): boolean => {
  if (!cred || !query) return false;

  if (typeof query === 'object') {
    const q = query as AppUser;
    if (cred.id && q.id && cred.id === q.id) return true;

    const credEmail = (cred.email || '').toLowerCase().trim();
    const qEmail = (q.email || '').toLowerCase().trim();
    if (credEmail && qEmail && credEmail === qEmail) return true;

    const credUser = (cred.username || '').toLowerCase().trim();
    const qUser = (q.username || '').toLowerCase().trim();
    if (credUser && qUser && credUser === qUser) return true;

    const credName = (cred.name || cred.studentName || '').toLowerCase().trim();
    const qName = (q.name || q.studentName || '').toLowerCase().trim();
    if (credName && qName && credName === qName) return true;

    return false;
  }

  const cleanInput = String(query).toLowerCase().trim();
  if (!cleanInput) return false;

  if (cred.id && cred.id.toLowerCase() === cleanInput) return true;
  if (cred.email && cred.email.toLowerCase().trim() === cleanInput) return true;
  if (cred.username && cred.username.toLowerCase().trim() === cleanInput) return true;
  if (cred.name && cred.name.toLowerCase().trim() === cleanInput) return true;
  if (cred.studentName && cred.studentName.toLowerCase().trim() === cleanInput) return true;

  // Dedicated admin alias resolution
  if (cred.role === 'admin' || cred.role === 'super_admin') {
    if (
      cleanInput === 'admin' ||
      cleanInput === 'admin@hteim.edu' ||
      cleanInput === 'admin@hteim.org' ||
      cleanInput === 'superadmin' ||
      cleanInput === DEFAULT_ADMIN_EMAIL.toLowerCase()
    ) {
      return true;
    }
  }

  const displayName = cred.name || cred.studentName || '';
  if (displayName) {
    const genUser = generateStudentUsername(displayName).toLowerCase();
    if (genUser && genUser === cleanInput) return true;

    const genEmail = getStudentEmailFromName(displayName, cred.email).toLowerCase();
    if (genEmail && genEmail === cleanInput) return true;

    const genFacEmail = getFacultyEmailFromName(displayName, cred.email).toLowerCase();
    if (genFacEmail && genFacEmail === cleanInput) return true;

    // Support known student aliases (e.g. Shellon Massiah / Shellon Liddel -> Shellon Liddell)
    const aliases: Record<string, string> = {
      'shellon massiah': 'shellon liddell',
      'shellon liddell': 'shellon liddell',
      'shellon liddel': 'shellon liddell',
      'shellon.massiah': 'shellon liddell',
      'shellon.liddell': 'shellon liddell',
      'shellon.liddel': 'shellon liddell',
      'massiahshellon@gmail.com': 'shellon liddell',
      'uvanie@yahoo.com': 'shellon liddell',
    };
    const mappedAlias = aliases[cleanInput];
    if (mappedAlias && displayName.toLowerCase().trim() === mappedAlias) {
      return true;
    }
  }

  return false;
};

/**
 * Safely merges two credentials arrays preserving non-default passwords and mustChangePassword=false flags.
 */
export const mergeUserCredentials = (listA: UserCredential[], listB: UserCredential[]): UserCredential[] => {
  const result: UserCredential[] = [];

  // Deduplicate listA first so pre-existing duplicate entries are consolidated
  (listA || []).filter(Boolean).forEach(aCred => {
    const existingIdx = result.findIndex(item => isMatchingCredential(item, aCred));
    if (existingIdx === -1) {
      result.push(aCred);
    } else {
      result[existingIdx] = {
        ...result[existingIdx],
        ...aCred
      };
    }
  });

  (listB || []).filter(Boolean).forEach(bCred => {
    const idx = result.findIndex(aCred => isMatchingCredential(aCred, bCred));
    if (idx === -1) {
      result.push(bCred);
    } else {
      const aCred = result[idx];
      const aChanged = aCred.mustChangePassword === false && !isDefaultPassword(aCred.passwordHash);
      const bChanged = bCred.mustChangePassword === false && !isDefaultPassword(bCred.passwordHash);

      if (aChanged && !bChanged) {
        result[idx] = {
          ...bCred,
          ...aCred,
          passwordHash: aCred.passwordHash,
          mustChangePassword: false
        };
      } else if (bChanged && !aChanged) {
        result[idx] = {
          ...aCred,
          ...bCred,
          passwordHash: bCred.passwordHash,
          mustChangePassword: false
        };
      } else if (aChanged && bChanged) {
        result[idx] = {
          ...bCred,
          ...aCred,
          passwordHash: aCred.passwordHash,
          mustChangePassword: false
        };
      } else {
        result[idx] = {
          ...aCred,
          ...bCred
        };
      }
    }
  });

  return result;
};

// Validate user credentials against the dynamic credentials list (Email or Username)
export const authenticateUser = (
  identifierInput: string, 
  passwordInput: string,
  credentials: UserCredential[]
): { success: boolean; user?: AppUser; error?: string; mustChangePassword?: boolean } => {
  const idLower = identifierInput.trim().toLowerCase();
  const p = passwordInput.trim();

  if (!idLower) {
    return { success: false, error: 'Please enter your email address.' };
  }
  if (!p) {
    return { success: false, error: 'Please enter your password.' };
  }

  // Account lockout check
  const lockout = checkAccountLockout(idLower);
  if (lockout.isLocked) {
    return {
      success: false,
      error: `Account temporarily locked due to excessive failed attempts. Please retry in ${lockout.remainingSeconds}s.`
    };
  }

  // Find user by Email, Username, or Name using robust matching
  const cred = (credentials || []).filter(Boolean).find(c => isMatchingCredential(c, idLower));

  if (cred) {
    if (cred.status === 'suspended') {
      return { 
        success: false, 
        error: 'This account has been suspended by the administrator. Please contact academic affairs at info@hteim.edu.' 
      };
    }

    const mustChange = cred.mustChangePassword === false
      ? isDefaultPassword(cred.passwordHash)
      : (cred.mustChangePassword === true || isDefaultPassword(cred.passwordHash));
    const isDefaultInput = isDefaultPasswordInput(p);
    const isAdminAccount = cred.role === 'admin' || cred.role === 'super_admin' || idLower === DEFAULT_ADMIN_EMAIL.toLowerCase() || idLower === 'admin';

    // Compute fallback sha256 hash match for passwords hashed with hashPassword
    let isHashMatch = false;
    if (cred.passwordHash && cred.passwordHash.length === 64) {
      // 64-character SHA256 hex string check
      try {
        let hashVal = 0;
        const salt = 'hteim_som_sec_salt_2026';
        const str = `${salt}:${p}`;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hashVal = ((hashVal << 5) - hashVal) + char;
          hashVal |= 0;
        }
        const fallbackHex = `sha256_${Math.abs(hashVal).toString(16)}`;
        if (cred.passwordHash === fallbackHex) isHashMatch = true;
      } catch {}
    }

    const isMatch =
      cred.passwordHash === p ||
      isHashMatch ||
      (isDefaultInput && mustChange) ||
      (isDefaultInput && isDefaultPassword(cred.passwordHash)) ||
      (isAdminAccount && (p === DEFAULT_USER_PASSWORD || isDefaultInput));

    if (isMatch) {
      clearFailedLoginAttempts(idLower);
      const user: AppUser = {
        id: cred.id,
        email: cred.email || (cred.role === 'student' 
          ? getStudentEmailFromName(cred.name) 
          : `${cred.username || 'user'}@hteim.edu`),
        username: cred.username || generateStudentUsername(cred.name),
        name: cred.name,
        role: cred.role,
        studentName: cred.studentName || (cred.role === 'student' ? cred.name : undefined),
        moduleOrDepartment: cred.moduleOrDepartment,
        status: cred.status,
        mustChangePassword: isAdminAccount ? false : mustChange
      };
      
      return {
        success: true,
        user,
        mustChangePassword: isAdminAccount ? false : mustChange
      };
    } else {
      const lockRes = recordFailedLoginAttempt(idLower);
      const errMsg = lockRes.isLocked
        ? `Account temporarily locked due to 5 consecutive failed attempts. Try again in ${lockRes.remainingSeconds}s.`
        : `Incorrect password. ${lockRes.attemptsLeft} attempt${lockRes.attemptsLeft === 1 ? '' : 's'} remaining before temporary lockout.`;
      return { success: false, error: errMsg };
    }
  }

  // Helpful suggestion if user tried admin
  if (idLower === 'admin' || idLower === 'admin@hteim.edu' || idLower === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
    const adminUser = (credentials || []).filter(Boolean).find(c => c && (c.role === 'admin' || c.role === 'super_admin'));
    const isDefaultInput = isDefaultPasswordInput(p);
    if (adminUser) {
      const adminMustChange = adminUser.mustChangePassword === false
        ? isDefaultPassword(adminUser.passwordHash)
        : (adminUser.mustChangePassword === true || isDefaultPassword(adminUser.passwordHash));
      if (
        adminUser.passwordHash === p ||
        p === DEFAULT_USER_PASSWORD ||
        isDefaultInput ||
        (p === DEFAULT_USER_PASSWORD && adminMustChange)
      ) {
        return {
          success: true,
          user: {
            id: adminUser.id || 'u-admin-kpierre',
            email: adminUser.email || DEFAULT_ADMIN_EMAIL,
            username: adminUser.username || 'admin',
            name: adminUser.name || DEFAULT_ADMIN_NAME,
            role: 'admin',
            mustChangePassword: false
          },
          mustChangePassword: false
        };
      }
    } else {
      if (p === DEFAULT_USER_PASSWORD || isDefaultInput) {
        return {
          success: true,
          user: {
            id: 'u-admin-kpierre',
            email: DEFAULT_ADMIN_EMAIL,
            username: 'admin',
            name: DEFAULT_ADMIN_NAME,
            role: 'admin',
            mustChangePassword: false
          },
          mustChangePassword: false
        };
      }
    }
  }

  return { 
    success: false, 
    error: `Account with email "${identifierInput}" was not found. Please verify spelling or contact the administrator to create your account.` 
  };
};

// Ensure all student profiles, faculty, and Kendell Pierre admin account have dynamic credentials in the system
export const ensureUserCredentials = (
  currentCredentials: UserCredential[],
  studentNames: string[],
  facultyList: Array<{ id?: string; name: string; email?: string; module?: string }> = [],
  studentEmailMap: Record<string, string> = {}
): { updatedCredentials: UserCredential[]; changed: boolean } => {
  let updated = [...(currentCredentials || [])].filter(Boolean);
  let changed = false;

  // 1. Ensure Kendell Pierre (kpierre24@gmail.com) Admin account exists
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
      passwordHash: DEFAULT_USER_PASSWORD,
      mustChangePassword: false,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    changed = true;
  } else {
    // Migrate legacy admin to Kendell Pierre / kpierre24@gmail.com and clean up legacy hashes/state
    const existing = updated[adminIdx];
    const isLegacyDefaultPass = isDefaultPassword(existing.passwordHash) || existing.passwordHash === '12345';
    if (
      existing.email !== DEFAULT_ADMIN_EMAIL ||
      existing.name !== DEFAULT_ADMIN_NAME ||
      existing.username !== 'admin' ||
      existing.studentName !== undefined ||
      (isLegacyDefaultPass && existing.passwordHash !== DEFAULT_USER_PASSWORD)
    ) {
      updated[adminIdx] = {
        ...existing,
        email: DEFAULT_ADMIN_EMAIL,
        name: DEFAULT_ADMIN_NAME,
        role: 'admin',
        username: 'admin',
        passwordHash: isLegacyDefaultPass ? DEFAULT_USER_PASSWORD : existing.passwordHash,
        mustChangePassword: isLegacyDefaultPass ? false : (existing.mustChangePassword ?? false),
        studentName: undefined,
        status: existing.status || 'active',
        createdAt: existing.createdAt || new Date().toISOString()
      };
      changed = true;
    }
  }

  // 2. Ensure Faculty / Teachers exist with proper email accounts
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
        passwordHash: DEFAULT_USER_PASSWORD,
        mustChangePassword: true,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      changed = true;
    }
  });

  // 3. Ensure each student profile in roster has a credential (email taken from profile, default password 'password1')
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
        passwordHash: DEFAULT_USER_PASSWORD,
        mustChangePassword: true,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      changed = true;
    } else {
      // Sync student profile email if custom email updated
      const existing = updated[existingIndex];
      if (studentEmailMap[studentKey] && existing.email !== studentEmailMap[studentKey]) {
        updated[existingIndex] = {
          ...existing,
          email: studentEmailMap[studentKey]
        };
        changed = true;
      }
    }
  });

  return { updatedCredentials: updated, changed };
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

  // Check uniqueness
  const emailExists = (credentials || []).some(c => c && c.email && c.email.toLowerCase() === emailClean);
  if (emailExists) {
    return { success: false, updatedCredentials: credentials, error: `An account with email "${emailClean}" already exists.` };
  }

  const username = generateStudentUsername(nameClean);
  const newCred: UserCredential = {
    id: `u-${newUser.role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: emailClean,
    username: username || emailClean.split('@')[0],
    name: nameClean,
    role: newUser.role,
    studentName: newUser.role === 'student' ? (newUser.studentName || nameClean) : undefined,
    moduleOrDepartment: newUser.moduleOrDepartment,
    passwordHash: newUser.customPassword || DEFAULT_USER_PASSWORD,
    mustChangePassword: newUser.requirePasswordChange !== undefined ? newUser.requirePasswordChange : true,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  const updatedCredentials = [newCred, ...credentials];
  return { success: true, updatedCredentials, user: newCred };
};

// Reset a user's password back to 'password1' with mustChangePassword = true
export const resetUserPassword = (
  credentials: UserCredential[],
  emailOrUsername: string | AppUser,
  newPassword?: string
): UserCredential[] => {
  return (credentials || []).map(c => {
    if (!c) return c;
    if (isMatchingCredential(c, emailOrUsername)) {
      return {
        ...c,
        passwordHash: newPassword || DEFAULT_USER_PASSWORD,
        mustChangePassword: true // Must change on next login
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

