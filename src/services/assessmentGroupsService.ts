import { MASTER_ENROLLED_STUDENTS } from '../data/curriculum';
import { CustomAssignment, AssignmentGroup } from '../types';

export interface AssessmentGroup {
  id: string;
  groupName: string;
  memberNames: string[];
  description?: string;
  leaderName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const LOCAL_STORAGE_GROUPS_KEY = 'hteim_permanent_assessment_groups';

export const CANONICAL_DEFAULT_GROUP_NAMES = [
  'Group 1 — Berean Exegetes',
  'Group 2 — Apostolic Pioneers',
  'Group 3 — Prophetic Watchmen',
  'Group 4 — Pastoral Shepherds',
  'Group 5 — Evangelistic Harvesters',
];

/**
 * Generates default permanent study & assessment groups dividing the master roster evenly.
 */
export function generateDefaultAssessmentGroups(studentRoster: string[] = MASTER_ENROLLED_STUDENTS): AssessmentGroup[] {
  const roster = studentRoster && studentRoster.length > 0 ? studentRoster : MASTER_ENROLLED_STUDENTS;
  const groupCount = CANONICAL_DEFAULT_GROUP_NAMES.length;
  const timestamp = new Date().toISOString();

  const groups: AssessmentGroup[] = CANONICAL_DEFAULT_GROUP_NAMES.map((name, idx) => ({
    id: `permanent-grp-${idx + 1}`,
    groupName: name,
    memberNames: [],
    description: `Cohort 2026 Core Assessment & Ministry Practicum Team ${idx + 1}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  // Distribute students evenly into groups
  roster.forEach((studentName, idx) => {
    if (!studentName) return;
    const gIdx = idx % groupCount;
    groups[gIdx].memberNames.push(studentName.trim());
  });

  return groups;
}

/**
 * Extracts any groups previously created within assignments and normalizes them into permanent groups.
 */
export function extractGroupsFromAssignments(assignments?: CustomAssignment[]): AssessmentGroup[] {
  if (!assignments || !Array.isArray(assignments)) return [];

  const extractedMap = new Map<string, AssessmentGroup>();
  const timestamp = new Date().toISOString();

  assignments.forEach((asg) => {
    const rawGroups: AssignmentGroup[] = (asg.groups || (asg as any).rubric?.groups || []);
    if (Array.isArray(rawGroups) && rawGroups.length > 0) {
      rawGroups.forEach((g) => {
        if (!g || !g.groupName) return;
        const normKey = g.groupName.toLowerCase().trim();
        const existing = extractedMap.get(normKey);

        const currentMembers = Array.isArray(g.memberNames) ? g.memberNames : [];
        if (existing) {
          // Merge unique members
          const merged = Array.from(new Set([...existing.memberNames, ...currentMembers]));
          existing.memberNames = merged;
          existing.updatedAt = timestamp;
        } else {
          extractedMap.set(normKey, {
            id: g.id || `permanent-grp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            groupName: g.groupName.trim(),
            memberNames: Array.from(new Set(currentMembers)),
            description: `Assessment Study Group: ${g.groupName}`,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
      });
    }
  });

  return Array.from(extractedMap.values());
}

/**
 * Loads the permanent assessment groups from localStorage, existing assignments, or default seed.
 */
export function loadPermanentAssessmentGroups(
  assignments?: CustomAssignment[],
  studentRoster: string[] = MASTER_ENROLLED_STUDENTS
): AssessmentGroup[] {
  // 1. Check localStorage first
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_GROUPS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading permanent assessment groups from storage:', e);
    }
  }

  // 2. Extract groups created within assessments
  const extracted = extractGroupsFromAssignments(assignments);
  if (extracted.length > 0) {
    savePermanentAssessmentGroups(extracted);
    return extracted;
  }

  // 3. Fallback to default generated groups
  const defaults = generateDefaultAssessmentGroups(studentRoster);
  savePermanentAssessmentGroups(defaults);
  return defaults;
}

/**
 * Persists permanent assessment groups to localStorage and dispatches a broadcast event.
 */
export function savePermanentAssessmentGroups(groups: AssessmentGroup[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(LOCAL_STORAGE_GROUPS_KEY, JSON.stringify(groups));
    window.dispatchEvent(new CustomEvent('hteim_groups_updated', { detail: { groups } }));
  } catch (e) {
    console.error('Error saving permanent assessment groups:', e);
  }
}

/**
 * Finds the primary assessment group a student belongs to.
 */
export function findStudentAssessmentGroup(
  groups: AssessmentGroup[],
  studentName: string
): AssessmentGroup | null {
  if (!studentName || !groups || groups.length === 0) return null;
  const cleanTarget = studentName.toLowerCase().trim();

  for (const grp of groups) {
    if (grp.memberNames.some((m) => m && m.toLowerCase().trim() === cleanTarget)) {
      return grp;
    }
  }
  return null;
}

/**
 * Finds all groups a student belongs to.
 */
export function findAllStudentAssessmentGroups(
  groups: AssessmentGroup[],
  studentName: string
): AssessmentGroup[] {
  if (!studentName || !groups || groups.length === 0) return [];
  const cleanTarget = studentName.toLowerCase().trim();

  return groups.filter((grp) =>
    grp.memberNames.some((m) => m && m.toLowerCase().trim() === cleanTarget)
  );
}

/**
 * Assigns a student to a target group and removes them from other groups (or keeps single group membership).
 */
export function assignStudentToGroup(
  currentGroups: AssessmentGroup[],
  studentName: string,
  targetGroupIdOrName: string | null
): AssessmentGroup[] {
  if (!studentName) return currentGroups;
  const cleanStudent = studentName.trim();
  const cleanTarget = (targetGroupIdOrName || '').toLowerCase().trim();
  const timestamp = new Date().toISOString();

  return currentGroups.map((grp) => {
    const isTarget =
      cleanTarget &&
      (grp.id.toLowerCase() === cleanTarget || grp.groupName.toLowerCase().trim() === cleanTarget);

    const hasStudent = grp.memberNames.some(
      (m) => m.toLowerCase().trim() === cleanStudent.toLowerCase()
    );

    if (isTarget) {
      if (!hasStudent) {
        return {
          ...grp,
          memberNames: [...grp.memberNames, cleanStudent],
          updatedAt: timestamp,
        };
      }
      return grp;
    } else {
      // Remove from other groups so student has a single primary group
      if (hasStudent) {
        return {
          ...grp,
          memberNames: grp.memberNames.filter(
            (m) => m.toLowerCase().trim() !== cleanStudent.toLowerCase()
          ),
          updatedAt: timestamp,
        };
      }
      return grp;
    }
  });
}

/**
 * Auto-divides a roster of students into N balanced groups.
 */
export function autoDivideRoster(
  studentRoster: string[],
  groupCount: number = 4,
  customGroupNames?: string[]
): AssessmentGroup[] {
  const roster = Array.from(new Set(studentRoster.filter(Boolean).map((s) => s.trim())));
  const count = Math.max(2, Math.min(groupCount, roster.length || 2));
  const timestamp = new Date().toISOString();

  const newGroups: AssessmentGroup[] = Array.from({ length: count }, (_, i) => {
    const name =
      customGroupNames && customGroupNames[i]
        ? customGroupNames[i]
        : CANONICAL_DEFAULT_GROUP_NAMES[i] || `Group ${i + 1}`;

    return {
      id: `permanent-grp-${Date.now()}-${i + 1}`,
      groupName: name,
      memberNames: [],
      description: `Permanent Assessment & Study Group ${i + 1}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  roster.forEach((student, idx) => {
    const gIdx = idx % count;
    newGroups[gIdx].memberNames.push(student);
  });

  return newGroups;
}

export interface GroupDistributionMetric {
  groupId: string;
  groupName: string;
  shortName: string;
  memberCount: number;
  percentageOfRoster: number;
  isBalanced: boolean;
  memberNames: string[];
  description?: string;
}

export interface CohortDistributionSummary {
  totalRosterCount: number;
  totalAssignedCount: number;
  totalUnassignedCount: number;
  groupCount: number;
  targetPerGroup: number;
  minGroupSize: number;
  maxGroupSize: number;
  variance: number;
  isOptimalBalance: boolean;
  unassignedStudentNames: string[];
  groups: GroupDistributionMetric[];
}

/**
 * Computes cohort distribution metrics across assessment groups.
 */
export function computeGroupDistributionSummary(
  groups: AssessmentGroup[],
  studentRoster: string[]
): CohortDistributionSummary {
  const cleanRoster = Array.from(new Set(studentRoster.filter(Boolean).map((s) => s.trim())));
  const totalRosterCount = cleanRoster.length;
  const groupCount = groups.length;

  const targetPerGroup = groupCount > 0 ? Math.round(totalRosterCount / groupCount) : 0;

  const assignedSet = new Set<string>();
  groups.forEach((g) => {
    (g.memberNames || []).forEach((m) => {
      if (m) assignedSet.add(m.toLowerCase().trim());
    });
  });

  const unassignedStudentNames = cleanRoster.filter(
    (name) => !assignedSet.has(name.toLowerCase().trim())
  );
  const totalUnassignedCount = unassignedStudentNames.length;
  const totalAssignedCount = totalRosterCount - totalUnassignedCount;

  const sizes = groups.map((g) => (g.memberNames ? g.memberNames.length : 0));
  const minGroupSize = sizes.length > 0 ? Math.min(...sizes) : 0;
  const maxGroupSize = sizes.length > 0 ? Math.max(...sizes) : 0;
  const variance = maxGroupSize - minGroupSize;
  const isOptimalBalance = variance <= 1 && totalUnassignedCount === 0;

  const groupMetrics: GroupDistributionMetric[] = groups.map((g) => {
    const memberCount = (g.memberNames || []).length;
    const percentageOfRoster =
      totalRosterCount > 0 ? Math.round((memberCount / totalRosterCount) * 100) : 0;
    const isBalanced = Math.abs(memberCount - targetPerGroup) <= 1;

    const shortName =
      g.groupName.replace(/^Group\s*\d+\s*[—–-]\s*/i, '').trim().slice(0, 16) ||
      g.groupName.slice(0, 16);

    return {
      groupId: g.id,
      groupName: g.groupName,
      shortName,
      memberCount,
      percentageOfRoster,
      isBalanced,
      memberNames: g.memberNames || [],
      description: g.description,
    };
  });

  return {
    totalRosterCount,
    totalAssignedCount,
    totalUnassignedCount,
    groupCount,
    targetPerGroup,
    minGroupSize,
    maxGroupSize,
    variance,
    isOptimalBalance,
    unassignedStudentNames,
    groups: groupMetrics,
  };
}
