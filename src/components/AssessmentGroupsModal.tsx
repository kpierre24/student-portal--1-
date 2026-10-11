import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  X,
  Shuffle,
  Check,
  Search,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  UserCheck,
  UserX,
  Copy,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  PieChart,
  Pie,
  ReferenceLine,
} from 'recharts';
import { Modal } from './Modal';
import { StudentSummary } from '../types';
import { MASTER_ENROLLED_STUDENTS } from '../data/curriculum';
import {
  AssessmentGroup,
  loadPermanentAssessmentGroups,
  savePermanentAssessmentGroups,
  autoDivideRoster,
  assignStudentToGroup,
  computeGroupDistributionSummary,
} from '../services/assessmentGroupsService';

export interface AssessmentGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students?: StudentSummary[];
  onGroupsUpdated?: (groups: AssessmentGroup[]) => void;
  onStudentsUpdated?: (students: StudentSummary[]) => void;
  appRole?: string;
  defaultTab?: 'distribution' | 'manage' | 'autodivide';
}

const GROUP_PALETTE = [
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#0EA5E9', // Sky
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#A855F7', // Violet
];

interface CustomBarTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomBarTooltip: React.FC<CustomBarTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3 shadow-lg backdrop-blur-md text-xs space-y-1.5 max-w-xs">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
          <span className="font-extrabold text-slate-900 dark:text-white truncate">
            {data.groupName}
          </span>
          <span className="shrink-0 font-black text-indigo-600 dark:text-indigo-400">
            {data.memberCount} {data.memberCount === 1 ? 'student' : 'students'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Cohort share</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {data.percentageOfRoster}%
          </span>
        </div>
        {data.memberNames && data.memberNames.length > 0 && (
          <div className="pt-1.5 text-[10px] text-slate-600 dark:text-slate-300">
            <span className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
              Members ({data.memberNames.length}):
            </span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
              {data.memberNames.map((m: string, i: number) => (
                <span key={i} className="text-slate-700 dark:text-slate-300">
                  {m}
                  {i < data.memberNames.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

interface CustomPieTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomPieTooltip: React.FC<CustomPieTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-2.5 shadow-lg backdrop-blur-md text-xs space-y-0.5">
        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.payload?.fill || item.color }}
          />
          <span className="truncate">{item.name}</span>
        </div>
        <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold pl-4.5">
          {item.value} {item.value === 1 ? 'student' : 'students'} ({item.payload?.percentageOfRoster || 0}%)
        </div>
      </div>
    );
  }
  return null;
};

export const AssessmentGroupsModal: React.FC<AssessmentGroupsModalProps> = ({
  isOpen,
  onClose,
  students = [],
  onGroupsUpdated,
  onStudentsUpdated,
  appRole = 'admin',
  defaultTab = 'distribution',
}) => {
  const [groups, setGroups] = useState<AssessmentGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'distribution' | 'manage' | 'autodivide'>(defaultTab);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [desiredGroupCount, setDesiredGroupCount] = useState(5);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active roster of student display names
  const studentRoster = useMemo(() => {
    if (students && students.length > 0) {
      const names = students
        .filter((s) => !s.isDroppedOut)
        .map((s) => s.name.trim())
        .filter(Boolean);
      if (names.length > 0) return Array.from(new Set(names));
    }
    return MASTER_ENROLLED_STUDENTS && MASTER_ENROLLED_STUDENTS.length > 0
      ? MASTER_ENROLLED_STUDENTS
      : [];
  }, [students]);

  useEffect(() => {
    if (isOpen) {
      const loaded = loadPermanentAssessmentGroups();
      setGroups(loaded);
      if (studentRoster.length > 0) {
        setDesiredGroupCount(Math.max(2, Math.min(10, Math.ceil(studentRoster.length / 4))));
      }
    }
  }, [isOpen, studentRoster]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveAll = (updatedGroups: AssessmentGroup[]) => {
    setGroups(updatedGroups);
    savePermanentAssessmentGroups(updatedGroups);

    if (onGroupsUpdated) {
      onGroupsUpdated(updatedGroups);
    }

    // Update students' groupName attribute
    if (students && students.length > 0 && onStudentsUpdated) {
      const nextStudents = students.map((s) => {
        const cleanName = s.name.trim().toLowerCase();
        const matchedGrp = updatedGroups.find((g) =>
          g.memberNames.some((m) => m && m.trim().toLowerCase() === cleanName)
        );
        return {
          ...s,
          groupName: matchedGrp ? matchedGrp.groupName : undefined,
          groupId: matchedGrp ? matchedGrp.id : undefined,
          groups: matchedGrp ? [matchedGrp.groupName] : undefined,
        };
      });
      onStudentsUpdated(nextStudents);
    }

    showToast('Permanent Assessment Groups updated and saved!');
  };

  const handleAddGroup = () => {
    const timestamp = new Date().toISOString();
    const newGrp: AssessmentGroup = {
      id: `permanent-grp-${Date.now()}`,
      groupName: `Group ${groups.length + 1} — New Team`,
      memberNames: [],
      description: 'Permanent Assessment & Ministry Practicum Group',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const updated = [...groups, newGrp];
    handleSaveAll(updated);
    setEditingGroupId(newGrp.id);
    setActiveTab('manage');
  };

  const handleRemoveGroup = (groupId: string) => {
    const updated = groups.filter((g) => g.id !== groupId);
    handleSaveAll(updated);
  };

  const handleUpdateGroupName = (groupId: string, newName: string) => {
    const timestamp = new Date().toISOString();
    const updated = groups.map((g) =>
      g.id === groupId ? { ...g, groupName: newName, updatedAt: timestamp } : g
    );
    setGroups(updated);
  };

  const handleUpdateGroupDescription = (groupId: string, desc: string) => {
    const timestamp = new Date().toISOString();
    const updated = groups.map((g) =>
      g.id === groupId ? { ...g, description: desc, updatedAt: timestamp } : g
    );
    setGroups(updated);
  };

  const handleToggleStudentInGroup = (groupId: string, studentName: string) => {
    const targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup) return;

    const isMember = targetGroup.memberNames.some(
      (m) => m.toLowerCase().trim() === studentName.toLowerCase().trim()
    );

    let updated: AssessmentGroup[];
    if (isMember) {
      // Remove student from target group
      updated = groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              memberNames: g.memberNames.filter(
                (m) => m.toLowerCase().trim() !== studentName.toLowerCase().trim()
              ),
              updatedAt: new Date().toISOString(),
            }
          : g
      );
    } else {
      // Assign student to target group (and remove from other groups so they belong to 1 group)
      updated = assignStudentToGroup(groups, studentName, groupId);
    }
    handleSaveAll(updated);
  };

  const handleAutoDivide = () => {
    if (studentRoster.length === 0) return;
    const divided = autoDivideRoster(studentRoster, desiredGroupCount);
    handleSaveAll(divided);
    setActiveTab('distribution');
    showToast(`Successfully divided ${studentRoster.length} students into ${divided.length} groups!`);
  };

  // Compute Distribution Metrics
  const distributionSummary = useMemo(() => {
    return computeGroupDistributionSummary(groups, studentRoster);
  }, [groups, studentRoster]);

  const pieChartData = useMemo(() => {
    const items = distributionSummary.groups.map((g, idx) => ({
      name: g.groupName,
      shortName: g.shortName,
      value: g.memberCount,
      percentageOfRoster: g.percentageOfRoster,
      fill: GROUP_PALETTE[idx % GROUP_PALETTE.length],
    }));

    if (distributionSummary.totalUnassignedCount > 0) {
      items.push({
        name: 'Unassigned Students',
        shortName: 'Unassigned',
        value: distributionSummary.totalUnassignedCount,
        percentageOfRoster: Math.round(
          (distributionSummary.totalUnassignedCount / (distributionSummary.totalRosterCount || 1)) * 100
        ),
        fill: '#94A3B8',
      });
    }

    return items;
  }, [distributionSummary]);

  const handleDistributeUnassigned = () => {
    if (distributionSummary.unassignedStudentNames.length === 0 || groups.length === 0) return;
    const nextGroups = groups.map((g) => ({ ...g, memberNames: [...g.memberNames] }));
    distributionSummary.unassignedStudentNames.forEach((studentName) => {
      // Find the group with the fewest members
      nextGroups.sort((a, b) => a.memberNames.length - b.memberNames.length);
      nextGroups[0].memberNames.push(studentName);
    });
    handleSaveAll(nextGroups);
    showToast(`Evenly assigned ${distributionSummary.unassignedStudentNames.length} students to groups!`);
  };

  const handleCopyRosterSummary = () => {
    const lines: string[] = [
      `HTEIM School of Ministry — Assessment & Ministry Groups`,
      `Total Enrolled: ${studentRoster.length} | Groups: ${groups.length} | Balance: ${distributionSummary.isOptimalBalance ? 'Optimal' : 'Custom'}`,
      '',
    ];
    groups.forEach((grp) => {
      lines.push(`## ${grp.groupName} (${grp.memberNames.length} Students)`);
      if (grp.description) lines.push(`Focus: ${grp.description}`);
      grp.memberNames.forEach((name) => lines.push(`  • ${name}`));
      lines.push('');
    });
    if (distributionSummary.unassignedStudentNames.length > 0) {
      lines.push(`## Unassigned Students (${distributionSummary.unassignedStudentNames.length}):`);
      distributionSummary.unassignedStudentNames.forEach((name) => lines.push(`  • ${name}`));
    }
    navigator.clipboard.writeText(lines.join('\n'));
    showToast('Copied group distribution summary to clipboard!');
  };

  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return studentRoster;
    const q = searchQuery.toLowerCase().trim();
    return studentRoster.filter((s) => s.toLowerCase().includes(q));
  }, [studentRoster, searchQuery]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold shadow-2xs">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[var(--md-on-surface)]">
              Permanent Assessment & Ministry Groups
            </h3>
            <p className="text-[11px] font-medium text-[var(--md-on-surface-variant)]">
              Visual roster distribution, group balance, and cohort assignment analytics.
            </p>
          </div>
        </div>
      }
      size="3xl"
    >
      <div className="space-y-4">
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation Bar */}
        <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('distribution')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'distribution'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Distribution Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Manage Groups ({groups.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('autodivide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'autodivide'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shuffle className="h-3.5 w-3.5" />
              <span>Auto-Divide Roster</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyRosterSummary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-1.5 text-xs font-bold text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition cursor-pointer"
              title="Copy formatted markdown roster summary to clipboard"
            >
              <Copy className="h-3.5 w-3.5 text-slate-500" />
              <span>Copy Summary</span>
            </button>

            <button
              type="button"
              onClick={handleAddGroup}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-2xs transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Group</span>
            </button>
          </div>
        </div>

        {/* TAB 1: VISUAL DISTRIBUTION DASHBOARD (RECHARTS) */}
        {activeTab === 'distribution' && (
          <div className="space-y-4">
            {/* KPI Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                  <span>Enrolled Roster</span>
                  <Users className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black text-[var(--md-on-surface)] tracking-tight">
                  {distributionSummary.totalRosterCount}
                </div>
                <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">
                  Active ministry students
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                  <span>Assigned to Groups</span>
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {distributionSummary.totalAssignedCount}
                </div>
                <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">
                  {distributionSummary.totalRosterCount > 0
                    ? `${Math.round((distributionSummary.totalAssignedCount / distributionSummary.totalRosterCount) * 100)}% of cohort placed`
                    : 'No students enrolled'}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                  <span>Avg Group Size</span>
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-[var(--md-on-surface)] tracking-tight">
                  {groups.length > 0
                    ? (distributionSummary.totalAssignedCount / groups.length).toFixed(1)
                    : '0'}
                </div>
                <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">
                  Target: ~{distributionSummary.targetPerGroup} per group
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                  <span>Balance Health</span>
                  <Shield className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black tracking-tight flex items-center gap-1.5">
                  {distributionSummary.isOptimalBalance ? (
                    <span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">
                      Balanced
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 text-lg font-black">
                      ±{distributionSummary.variance} Var.
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">
                  {distributionSummary.groups.length} active teams defined
                </div>
              </div>
            </div>

            {/* Unassigned Students Alert Callout (If Any) */}
            {distributionSummary.totalUnassignedCount > 0 && (
              <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                        {distributionSummary.totalUnassignedCount} Unassigned Students
                      </h4>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        These students are active on the roster but haven't been placed in any assessment group.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDistributeUnassigned}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-2xs transition cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Distribute to Smallest Groups</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('autodivide')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-400 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition cursor-pointer"
                    >
                      <span>Auto-Divide All</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-amber-900 dark:text-amber-200 pt-1 border-t border-amber-200 dark:border-amber-800/60 flex flex-wrap gap-1.5">
                  <span className="font-bold text-[11px] text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Unassigned:
                  </span>
                  {distributionSummary.unassignedStudentNames.map((name, i) => (
                    <span key={name} className="font-semibold text-amber-950 dark:text-amber-100">
                      {name}
                      {i < distributionSummary.unassignedStudentNames.length - 1 ? ' · ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recharts Visual Charts Row */}
            {groups.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--md-outline-variant)] bg-[var(--md-surface-container)]">
                <Users className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-extrabold text-[var(--md-on-surface)]">
                  No Assessment Groups Created Yet
                </h4>
                <p className="text-xs text-[var(--md-on-surface-variant)] mt-1 max-w-md mx-auto">
                  Create groups manually or run the Auto-Divide tool to view graphical member distribution charts.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddGroup}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                  >
                    Add First Group
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('autodivide')}
                    className="px-4 py-2 rounded-xl border border-[var(--md-outline-variant)] text-xs font-bold hover:bg-[var(--md-surface-container-high)] cursor-pointer"
                  >
                    Auto-Divide Roster
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Bar Chart: Student Counts per Group */}
                <div className="lg:col-span-7 rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--md-outline-variant)]">
                    <div>
                      <h4 className="text-xs font-extrabold text-[var(--md-on-surface)] flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Students Distribution Across Groups</span>
                      </h4>
                      <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">
                        Member volume compared against cohort target of ~{distributionSummary.targetPerGroup} students
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600"></span>
                      <span>Members</span>
                      <span className="w-3 border-t-2 border-dashed border-indigo-500 ml-1"></span>
                      <span>Target</span>
                    </div>
                  </div>

                  <div className="h-64 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={distributionSummary.groups}
                        margin={{ top: 12, right: 12, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#334155"
                          opacity={0.15}
                        />
                        <XAxis
                          dataKey="shortName"
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }}
                          axisLine={{ stroke: '#94A3B8', opacity: 0.3 }}
                          tickLine={false}
                          interval={0}
                          angle={-18}
                          textAnchor="end"
                        />
                        <YAxis
                          domain={[0, (dataMax: number) => Math.max(dataMax + 2, 5)]}
                          allowDecimals={false}
                          tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomBarTooltip />} />
                        {distributionSummary.targetPerGroup > 0 && (
                          <ReferenceLine
                            y={distributionSummary.targetPerGroup}
                            stroke="#6366F1"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                              value: `Target: ~${distributionSummary.targetPerGroup}`,
                              position: 'insideTopRight',
                              fill: '#6366F1',
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          />
                        )}
                        <Bar dataKey="memberCount" radius={[6, 6, 0, 0]}>
                          {distributionSummary.groups.map((entry, index) => (
                            <Cell
                              key={`cell-${entry.groupId}`}
                              fill={GROUP_PALETTE[index % GROUP_PALETTE.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut Chart: Cohort Share & Allocation */}
                <div className="lg:col-span-5 rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="pb-2 border-b border-[var(--md-outline-variant)]">
                      <h4 className="text-xs font-extrabold text-[var(--md-on-surface)] flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span>Cohort Allocation Share</span>
                      </h4>
                      <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">
                        Proportion of total cohort assigned per group
                      </p>
                    </div>

                    <div className="h-44 w-full relative mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`donut-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center Stat in Donut */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black text-[var(--md-on-surface)] leading-none">
                          {distributionSummary.totalAssignedCount}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                          Assigned
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Group Legend / Breakdown list */}
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1 border-t border-[var(--md-outline-variant)] pt-2">
                    {pieChartData.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-0.5 text-slate-700 dark:text-slate-300"
                      >
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="truncate font-semibold">{item.name}</span>
                        </div>
                        <span className="font-extrabold shrink-0 text-slate-900 dark:text-white">
                          {item.value} ({item.percentageOfRoster}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Group Breakdown Grid */}
            {groups.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-[var(--md-on-surface)] flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Group Roster Cards & Quick Edit</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manage')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Manage Full Roster</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {distributionSummary.groups.map((grpMetric, idx) => {
                    const color = GROUP_PALETTE[idx % GROUP_PALETTE.length];
                    return (
                      <div
                        key={grpMetric.groupId}
                        className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-3.5 shadow-2xs space-y-2.5 hover:border-indigo-300 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                              style={{ backgroundColor: color }}
                            />
                            <div>
                              <h5 className="text-xs font-extrabold text-[var(--md-on-surface)] leading-snug">
                                {grpMetric.groupName}
                              </h5>
                              <p className="text-[10px] text-[var(--md-on-surface-variant)] line-clamp-1">
                                {grpMetric.description || 'Assessment study team'}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 rounded-lg text-[11px] font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {grpMetric.memberCount}
                          </span>
                        </div>

                        {/* Progress Bar vs Target */}
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.round((grpMetric.memberCount / Math.max(distributionSummary.targetPerGroup || 1, 1)) * 100))}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>

                        {/* Members snippet */}
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {grpMetric.memberNames.length > 0 ? (
                            grpMetric.memberNames.join(', ')
                          ) : (
                            <span className="italic text-slate-400">No members assigned yet</span>
                          )}
                        </div>

                        <div className="pt-1 border-t border-[var(--md-outline-variant)] flex items-center justify-between">
                          <span className="text-[10px] font-medium text-slate-400">
                            {grpMetric.percentageOfRoster}% cohort
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroupId(grpMetric.groupId);
                              setActiveTab('manage');
                            }}
                            className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>Edit Members</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANAGE GROUPS */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
            {/* Quick summary strip */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--md-outline-variant)] px-3.5 py-2.5">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-extrabold text-[var(--md-on-surface)]">
                  {groups.length} Groups Active
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {distributionSummary.totalAssignedCount} of {distributionSummary.totalRosterCount} Students Assigned
                </span>
                {distributionSummary.totalUnassignedCount > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    ({distributionSummary.totalUnassignedCount} unassigned)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('distribution')}
                className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>View Distribution Chart</span>
              </button>
            </div>

            {/* Search Student Filter */}
            {studentRoster.length > 6 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--md-on-surface-variant)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter student names to easily assign..."
                  className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] py-1.5 pl-9 pr-3 text-xs font-medium text-[var(--md-on-surface)] focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            {groups.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-[var(--md-outline-variant)] bg-[var(--md-surface-container)]">
                <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-[var(--md-on-surface)]">No permanent assessment groups created yet.</p>
                <p className="text-[11px] text-[var(--md-on-surface-variant)] mt-1">
                  Click "Add Group" or "Auto-Divide Roster" to automatically create balanced study teams.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                {groups.map((grp) => {
                  const isEditing = editingGroupId === grp.id;
                  return (
                    <div
                      key={grp.id}
                      className="rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-4 shadow-2xs space-y-3"
                    >
                      {/* Group Name Header Bar */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <input
                            type="text"
                            value={grp.groupName}
                            onChange={(e) => handleUpdateGroupName(grp.id, e.target.value)}
                            onBlur={() => handleSaveAll(groups)}
                            placeholder="Group Name (e.g. Group 1 — Berean Exegetes)"
                            className="flex-1 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-1.5 text-xs font-extrabold text-[var(--md-on-surface)] focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                            {grp.memberNames.length} Members
                          </span>

                          <button
                            type="button"
                            onClick={() => setEditingGroupId(isEditing ? null : grp.id)}
                            className="p-1.5 text-[var(--md-on-surface-variant)] hover:text-indigo-600 rounded-lg transition cursor-pointer"
                            title="Toggle Details"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveGroup(grp.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                            title="Delete Group"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Description input if expanded/editing */}
                      {isEditing && (
                        <div>
                          <input
                            type="text"
                            value={grp.description || ''}
                            onChange={(e) => handleUpdateGroupDescription(grp.id, e.target.value)}
                            onBlur={() => handleSaveAll(groups)}
                            placeholder="Group description or practicum focus..."
                            className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-1 text-[11px] text-[var(--md-on-surface-variant)] focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Student Roster Selector Buttons */}
                      <div>
                        <div className="text-[10px] font-extrabold uppercase text-[var(--md-on-surface-variant)] mb-1.5">
                          Click to Add or Remove Members:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {filteredRoster.map((stName) => {
                            const isMember = grp.memberNames.some(
                              (m) => m && m.toLowerCase().trim() === stName.toLowerCase().trim()
                            );
                            return (
                              <button
                                type="button"
                                key={stName}
                                onClick={() => handleToggleStudentInGroup(grp.id, stName)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                  isMember
                                    ? 'bg-indigo-600 text-white font-extrabold shadow-2xs'
                                    : 'bg-[var(--md-surface)] text-[var(--md-on-surface-variant)] border border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-high)]'
                                }`}
                              >
                                {isMember && <Check className="h-3 w-3 shrink-0" />}
                                <span>{stName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUTO-DIVIDE ROSTER */}
        {activeTab === 'autodivide' && (
          <div className="space-y-4 p-4 rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)]">
            <div className="flex items-start gap-3">
              <Shuffle className="h-6 w-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-[var(--md-on-surface)]">
                  Balanced Roster Auto-Division
                </h4>
                <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5 leading-relaxed">
                  Automatically divide all active students (<strong className="text-indigo-600">{studentRoster.length} students</strong>) into equal permanent assessment groups.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-extrabold text-[var(--md-on-surface)] mb-1">
                  Number of Target Groups
                </label>
                <input
                  type="number"
                  min="2"
                  max="12"
                  value={desiredGroupCount}
                  onChange={(e) => setDesiredGroupCount(Math.max(2, Math.min(12, Number(e.target.value))))}
                  className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface)] py-2 px-3 text-xs font-bold text-[var(--md-on-surface)] focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-end">
                <p className="text-[11px] text-[var(--md-on-surface-variant)] mb-2 font-medium">
                  Average ~{Math.ceil(studentRoster.length / (desiredGroupCount || 1))} students per group.
                </p>
                <button
                  type="button"
                  onClick={handleAutoDivide}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-sm transition cursor-pointer"
                >
                  <Shuffle className="h-4 w-4" />
                  <span>Execute Auto-Divide</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--md-outline-variant)] text-xs">
          <span className="text-[11px] text-[var(--md-on-surface-variant)] font-medium">
            Changes auto-save and propagate to student directory & assessment submissions.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
