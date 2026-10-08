import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Trash2, Edit3, Save, X, Shuffle, Check, Search, AlertCircle, UserPlus, Shield } from 'lucide-react';
import { Modal } from './Modal';
import { StudentSummary } from '../types';
import { MASTER_ENROLLED_STUDENTS } from '../data/curriculum';
import {
  AssessmentGroup,
  loadPermanentAssessmentGroups,
  savePermanentAssessmentGroups,
  autoDivideRoster,
  assignStudentToGroup,
} from '../services/assessmentGroupsService';

export interface AssessmentGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students?: StudentSummary[];
  onGroupsUpdated?: (groups: AssessmentGroup[]) => void;
  onStudentsUpdated?: (students: StudentSummary[]) => void;
  appRole?: string;
}

export const AssessmentGroupsModal: React.FC<AssessmentGroupsModalProps> = ({
  isOpen,
  onClose,
  students = [],
  onGroupsUpdated,
  onStudentsUpdated,
  appRole = 'admin',
}) => {
  const [groups, setGroups] = useState<AssessmentGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'manage' | 'autodivide'>('manage');
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
    setActiveTab('manage');
    showToast(`Successfully divided ${studentRoster.length} students into ${divided.length} groups!`);
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
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[var(--md-on-surface)]">
              Permanent Assessment & Ministry Groups
            </h3>
            <p className="text-[11px] font-medium text-[var(--md-on-surface-variant)]">
              Manage fixture groups for collaborative coursework, grading, and student directory.
            </p>
          </div>
        </div>
      }
      size="xl"
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

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Manage Groups ({groups.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('autodivide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'autodivide'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
              }`}
            >
              <Shuffle className="h-3.5 w-3.5" />
              <span>Auto-Divide Roster</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddGroup}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-2xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Group</span>
          </button>
        </div>

        {/* TAB 1: MANAGE GROUPS */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
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

                      {/* Student Roster Selector Pills */}
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

        {/* TAB 2: AUTO-DIVIDE ROSTER */}
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
