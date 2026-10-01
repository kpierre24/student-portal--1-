import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  CheckCircle2,
  XCircle,
  Lock,
  Eye,
  BookOpen,
  DollarSign,
  GraduationCap,
  Sparkles,
  Info,
  X,
  UserCheck,
  Key
} from 'lucide-react';
import { UserRole, Permission, ROLE_DEFINITIONS } from '../types/rbac';
import { getAllRoles, getRoleDefinition } from '../lib/rbacClient';
import { AppUser } from '../lib/userAuth';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onSwitchRole: (role: UserRole, customName?: string, studentId?: string) => void;
}

export function RoleManagementModal({
  isOpen,
  onClose,
  currentUser,
  onSwitchRole,
}: RoleManagementModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    currentUser ? currentUser.role : 'admin'
  );
  const [activeView, setActiveView] = useState<'matrix' | 'switcher' | 'architecture'>('switcher');

  if (!isOpen) return null;

  const roles = getAllRoles();
  const currentDef = getRoleDefinition(currentUser?.role);
  const selectedDef = getRoleDefinition(selectedRole);

  const demoAccounts: Record<UserRole, { name: string; email: string; studentId?: string }> = {
    super_admin: { name: 'Apostle Kendell Pierre', email: 'kpierre24@gmail.com' },
    admin: { name: 'Kendell Pierre', email: 'kpierre24@gmail.com' },
    registrar: { name: 'Dr. Evelyn Registrar', email: 'registrar@hteim.edu' },
    lecturer: { name: 'Rev. Dr. Matthew Faculty', email: 'lecturer@hteim.edu' },
    student: { name: 'Afeshia Burke', email: 'aburke@student.hteim.edu', studentId: 'HTEIM-2026-0001' },
    finance_officer: { name: 'Minister David Bursar', email: 'finance@hteim.edu' },
    librarian: { name: 'Sister Grace Librarian', email: 'librarian@hteim.edu' },
    viewer: { name: 'Guest Observer', email: 'guest@hteim.edu' },
    teacher: { name: 'Rev. Faculty', email: 'teacher@hteim.edu' },
    staff: { name: 'Staff Admin', email: 'admin@hteim.edu' },
  };

  const permissionCategories: { title: string; perms: { key: Permission; label: string }[] }[] = [
    {
      title: 'Students & Enrollment',
      perms: [
        { key: 'students:read', label: 'View Student Records & Roster' },
        { key: 'students:write', label: 'Enroll & Edit Student Records' },
      ],
    },
    {
      title: 'Attendance & Sessions',
      perms: [
        { key: 'attendance:read', label: 'View Attendance Records' },
        { key: 'attendance:write', label: 'Take & Record Attendance' },
        { key: 'attendance:approve', label: 'Approve Attendance & Overrides' },
      ],
    },
    {
      title: 'Assignments & Coursework',
      perms: [
        { key: 'assignments:read', label: 'View Homework & Coursework' },
        { key: 'assignments:submit', label: 'Submit Student Homework' },
        { key: 'assignments:grade', label: 'Grade Coursework & Submissions' },
      ],
    },
    {
      title: 'Academic Grades & Transcripts',
      perms: [
        { key: 'grades:read', label: 'View Grades & Transcripts' },
        { key: 'grades:write', label: 'Record & Update Grades' },
        { key: 'grades:release', label: 'Release Official Transcripts & Grades' },
      ],
    },
    {
      title: 'Finance & Tuition',
      perms: [
        { key: 'finance:read', label: 'View Invoices & Balances' },
        { key: 'finance:write', label: 'Record Payments & Issue Invoices' },
        { key: 'finance:refund', label: 'Authorize Refunds & Fee Adjustments' },
      ],
    },
    {
      title: 'System & Governance',
      perms: [
        { key: 'audit:read', label: 'View System Audit Trail & Logs' },
        { key: 'users:manage', label: 'Manage Registered User Accounts' },
        { key: 'roles:manage', label: 'Assign & Configure Database Roles' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/10 dark:bg-purple-400/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Role-Based Access Control (RBAC)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Institutional security matrix, permission boundaries & resource ownership checks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/30 dark:bg-slate-950/20">
          <button
            onClick={() => setActiveView('switcher')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeView === 'switcher'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Switch Role Persona (8 Roles)
          </button>
          <button
            onClick={() => setActiveView('matrix')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeView === 'matrix'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Permissions Matrix & Tab Access
          </button>
          <button
            onClick={() => setActiveView('architecture')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeView === 'architecture'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Server-Side Enforcement Architecture
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeView === 'switcher' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-purple-900 dark:text-purple-200">
                    Active Session: <span className="underline">{currentUser?.name || 'Guest'}</span> ({currentDef.title})
                  </p>
                  <p className="text-purple-700 dark:text-purple-300">
                    Switching roles immediately adapts navigation tabs, client UI actions, and backend authentication headers for real-time sandbox verification.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {roles.map((r) => {
                  const isCurrent = currentUser?.role === r.id;
                  const isSelected = selectedRole === r.id;
                  const demo = demoAccounts[r.id];

                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRole(r.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer text-left ${
                        isSelected
                          ? 'border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/40 dark:bg-purple-950/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${r.badgeBg} ${r.color}`}
                          >
                            {r.badge}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md">
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">
                        {r.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                        {r.description}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500">
                        <span>User: <strong className="text-slate-700 dark:text-slate-300">{demo?.name}</strong></span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSwitchRole(r.id, demo?.name, demo?.studentId);
                            onClose();
                          }}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-lg shadow-sm transition"
                        >
                          Switch
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'matrix' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Granular Permissions Matrix</h3>
                  <p className="text-xs text-slate-500">
                    Inspecting role capabilities for: <span className="font-bold text-purple-600">{selectedDef.title}</span>
                  </p>
                </div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Accessible Navigation Tabs */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Authorized Navigation Tabs ({selectedDef.accessibleTabs.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDef.accessibleTabs.map((tab) => (
                    <span
                      key={tab}
                      className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs"
                    >
                      ✓ {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-4">
                {permissionCategories.map((cat) => (
                  <div
                    key={cat.title}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                  >
                    <div className="px-4 py-2 bg-slate-100/60 dark:bg-slate-800/40 font-semibold text-xs text-slate-700 dark:text-slate-300">
                      {cat.title}
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {cat.perms.map((p) => {
                        const has =
                          selectedRole === 'super_admin' ||
                          selectedDef.permissions.includes('all:access') ||
                          selectedDef.permissions.includes(p.key);

                        return (
                          <div
                            key={p.key}
                            className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/20"
                          >
                            <span className="font-mono text-slate-600 dark:text-slate-400">
                              {p.label} <span className="text-[10px] text-slate-400">({p.key})</span>
                            </span>
                            {has ? (
                              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" /> Allowed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                                <XCircle className="w-4 h-4" /> Restricted
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'architecture' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-widest">
                  <Lock className="w-4 h-4" /> Multi-Layer Security Architecture
                </div>
                <h3 className="text-lg font-bold">End-to-End API Authorization Pipeline</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Security is not merely hiding UI buttons in React. Direct API requests to any endpoint (such as <code>GET /api/students/:id/grades</code> or <code>GET /api/payments/invoices</code>) must strictly pass all 4 defense gates:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">Gate 1</span>
                    <h4 className="font-bold text-xs text-white">Authentication</h4>
                    <p className="text-[11px] text-slate-300">
                      Validates session Bearer token / identity headers. Rejects unauthenticated callers with HTTP 401.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                    <span className="text-[10px] font-bold text-blue-400 uppercase">Gate 2</span>
                    <h4 className="font-bold text-xs text-white">Role & Permission Check</h4>
                    <p className="text-[11px] text-slate-300">
                      Confirms role permissions (e.g. <code>grades:view_own</code> vs <code>grades:view_all</code>).
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Gate 3</span>
                    <h4 className="font-bold text-xs text-white">Resource Ownership</h4>
                    <p className="text-[11px] text-slate-300">
                      Verifies whether student owns the targeted record or user has instructor/admin privilege. Rejects with 403.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Gate 4</span>
                    <h4 className="font-bold text-xs text-white">Authorized Query</h4>
                    <p className="text-[11px] text-slate-300">
                      Server filters results authoritatively before returning JSON payload to the client.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Active Security Safeguards in this Portal
                </h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc pl-4">
                  <li><strong>Student Privacy</strong>: Students cannot access other students' grades, transcripts, or financial invoices via query parameter injection or direct endpoint manipulation.</li>
                  <li><strong>Faculty Scoping</strong>: Lecturers can record attendance and grade coursework for their assigned ministry modules.</li>
                  <li><strong>Financial Segregation</strong>: Only Super Admins, Administrators, and Finance Officers can issue invoices, post transaction receipts, or modify adjustments.</li>
                  <li><strong>Immutable Audit Trail</strong>: Every administrative grade override, attendance change, and payment transaction logs an actor record to the Supabase audit ledger.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Current Role: <span className="font-bold text-slate-700 dark:text-slate-300">{currentDef.title}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl transition"
          >
            Close RBAC Panel
          </button>
        </div>
      </div>
    </div>
  );
}
