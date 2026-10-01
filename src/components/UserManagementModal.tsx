import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  ShieldCheck, 
  GraduationCap, 
  UserCheck, 
  KeyRound, 
  Lock, 
  Mail, 
  RotateCcw, 
  Copy, 
  Check, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  X, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  Cloud, 
  UserX, 
  Info,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { 
  UserCredential, 
  UserRole, 
  createUserCredential, 
  resetUserPassword, 
  updateUserCredential, 
  deleteUserCredential, 
  DEFAULT_USER_PASSWORD,
  DEFAULT_ADMIN_EMAIL,
  getStudentEmailFromName,
  getFacultyEmailFromName
} from '../lib/userAuth';
import { StudentSummary, FacultyTeacher } from '../types';
import { getAuthHeaders } from '../lib/rbacClient';
import { AppUser } from '../lib/userAuth';

interface PendingApproval {
  id: string;
  email: string;
  name?: string;
  requested_role: string;
  source_record?: string;
  reason?: string;
  created_at?: string;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCredentials: UserCredential[];
  onUpdateCredentials: (credentials: UserCredential[]) => void;
  uniqueStudents?: StudentSummary[];
  facultyTeachers?: FacultyTeacher[];
  currentAdminEmail?: string;
  onTriggerCloudSync?: () => void;
  /** Authenticated admin — needed to attach auth headers to provisioning API calls */
  appUser?: AppUser | null;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  userCredentials = [],
  onUpdateCredentials,
  uniqueStudents = [],
  facultyTeachers = [],
  currentAdminEmail = DEFAULT_ADMIN_EMAIL,
  onTriggerCloudSync,
  appUser
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);

  // Tab state
  const [activeTab, setActiveTab] = useState<'directory' | 'pending'>('directory');

  // ── Pending Approvals ──────────────────────────────────────────────────────
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [approveReason, setApproveReason] = useState<Record<string, string>>({});

  const fetchPendingApprovals = useCallback(async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const res = await fetch('/api/auth/pending-approvals', {
        headers: getAuthHeaders(appUser),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setPendingApprovals(data.pending ?? []);
    } catch (err: any) {
      setPendingError(err.message || 'Failed to load pending approvals');
    } finally {
      setPendingLoading(false);
    }
  }, [appUser]);

  useEffect(() => {
    if (isOpen) {
      fetchPendingApprovals();
    }
  }, [isOpen, fetchPendingApprovals]);

  const handleApprove = async (approval: PendingApproval) => {
    setApprovingId(approval.id);
    try {
      const res = await fetch('/api/auth/users/provision', {
        method: 'POST',
        headers: getAuthHeaders(appUser),
        body: JSON.stringify({
          email: approval.email,
          role: approval.requested_role,
          reason: approveReason[approval.id] || 'Approved by administrator via portal',
          sourceRecord: approval.source_record,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPendingApprovals(prev => prev.filter(p => p.id !== approval.id));
      setSuccessToast(`Account for ${approval.name || approval.email} approved as ${approval.requested_role}.`);
    } catch (err: any) {
      setPendingError(err.message || 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDenyApproval = (approval: PendingApproval) => {
    setDenyingId(approval.id);
    // Remove from local queue immediately; a future POST /deny endpoint can persist this
    setPendingApprovals(prev => prev.filter(p => p.id !== approval.id));
    setSuccessToast(`Access request for ${approval.name || approval.email} has been denied and removed.`);
    setDenyingId(null);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending_password'>('all');
  
  // Create / Edit User State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserCredential | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: UserRole;
    studentName: string;
    moduleOrDepartment: string;
    requirePasswordChange: boolean;
  }>({
    name: '',
    email: '',
    role: 'student',
    studentName: '',
    moduleOrDepartment: '',
    requirePasswordChange: true
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Auto-dismiss toast
  React.useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return userCredentials.filter(user => {
      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;

      // Status filter
      if (statusFilter === 'active' && user.status === 'suspended') return false;
      if (statusFilter === 'suspended' && user.status !== 'suspended') return false;
      if (statusFilter === 'pending_password' && !user.mustChangePassword) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (user.name || '').toLowerCase().includes(q);
        const matchEmail = (user.email || '').toLowerCase().includes(q);
        const matchRole = (user.role || '').toLowerCase().includes(q);
        const matchDept = (user.moduleOrDepartment || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRole && !matchDept) return false;
      }

      return true;
    });
  }, [userCredentials, roleFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = userCredentials.length;
    const admins = userCredentials.filter(u => u.role === 'admin').length;
    const teachers = userCredentials.filter(u => u.role === 'teacher').length;
    const students = userCredentials.filter(u => u.role === 'student').length;
    const pendingChange = userCredentials.filter(u => u.mustChangePassword).length;
    const suspended = userCredentials.filter(u => u.status === 'suspended').length;
    return { total, admins, teachers, students, pendingChange, suspended };
  }, [userCredentials]);

  // Handle Form Submit (Create or Edit)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();

    if (!name) {
      setFormError('Please provide the full name.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Please provide a valid email address.');
      return;
    }

    if (editingUser) {
      // Check if email changed and is taken by someone else
      if (email !== (editingUser.email || '').toLowerCase()) {
        const exists = userCredentials.some(c => c.id !== editingUser.id && (c.email || '').toLowerCase() === email);
        if (exists) {
          setFormError(`An account with email "${email}" already exists.`);
          return;
        }
      }

      const updated = updateUserCredential(userCredentials, editingUser.id, {
        name: name,
        email: email,
        role: formData.role,
        studentName: formData.role === 'student' ? (formData.studentName || name) : undefined,
        moduleOrDepartment: formData.moduleOrDepartment || undefined,
        mustChangePassword: formData.requirePasswordChange
      });

      onUpdateCredentials(updated);
      setEditingUser(null);
      setShowCreateModal(false);
      setSuccessToast(`User profile for "${name}" successfully updated.`);
    } else {
      const result = createUserCredential(userCredentials, {
        name: name,
        email: email,
        role: formData.role,
        studentName: formData.role === 'student' ? (formData.studentName || name) : undefined,
        moduleOrDepartment: formData.moduleOrDepartment || undefined,
        requirePasswordChange: formData.requirePasswordChange
      });

      if (!result.success) {
        setFormError(result.error || 'Failed to create user.');
        return;
      }

      onUpdateCredentials(result.updatedCredentials);
      setShowCreateModal(false);
      setSuccessToast(`New ${formData.role} account created for "${name}" with email "${email}" and default password "${DEFAULT_USER_PASSWORD}".`);
    }

    // Reset Form
    setFormData({
      name: '',
      email: '',
      role: 'student',
      studentName: '',
      moduleOrDepartment: '',
      requirePasswordChange: true
    });

    if (onTriggerCloudSync) onTriggerCloudSync();
  };

  // Open Edit User Modal
  const handleStartEdit = (user: UserCredential) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      studentName: user.studentName || '',
      moduleOrDepartment: user.moduleOrDepartment || '',
      requirePasswordChange: user.mustChangePassword
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  // Reset Password for User
  const handleResetPassword = (user: UserCredential) => {
    const updated = resetUserPassword(userCredentials, user.email, DEFAULT_USER_PASSWORD);
    onUpdateCredentials(updated);
    setSuccessToast(`Password for ${user.name} (${user.email}) has been reset to default "${DEFAULT_USER_PASSWORD}". They will be prompted to change it on next login.`);
    if (onTriggerCloudSync) onTriggerCloudSync();
  };

  // Toggle Suspend / Active
  const handleToggleStatus = (user: UserCredential) => {
    if ((user.email || '').toLowerCase() === currentAdminEmail.toLowerCase()) {
      alert('You cannot suspend your primary active administrator account.');
      return;
    }
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const updated = updateUserCredential(userCredentials, user.id, { status: newStatus });
    onUpdateCredentials(updated);
    setSuccessToast(`Account for ${user.name} is now ${newStatus === 'active' ? 'Active' : 'Suspended'}.`);
    if (onTriggerCloudSync) onTriggerCloudSync();
  };

  // Delete User
  const handleDeleteUser = (user: UserCredential) => {
    if ((user.email || '').toLowerCase() === currentAdminEmail.toLowerCase()) {
      alert('You cannot delete your primary active administrator account.');
      return;
    }
    const updated = deleteUserCredential(userCredentials, user.id);
    onUpdateCredentials(updated);
    setConfirmDeleteId(null);
    setSuccessToast(`User account for ${user.name} was successfully removed.`);
    if (onTriggerCloudSync) onTriggerCloudSync();
  };

  // Copy Invitation & Credentials
  const handleCopyInvite = (user: UserCredential) => {
    const inviteText = `=========================================
HTEIM SCHOOL OF MINISTRY — PORTAL ACCESS
=========================================
Dear ${user.name},

You have been granted access to the official HTEIM School of Ministry Teaching & Academic Portal.

• Role: ${user.role.toUpperCase()}
• Login Email: ${user.email}
• Default Password: ${DEFAULT_USER_PASSWORD}
• Security Requirement: You will be asked to set a secure personal password on your first login.

Access Portal: ${window.location.origin}
=========================================`;

    navigator.clipboard.writeText(inviteText);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 3000);
    setSuccessToast(`Login instructions and credentials for ${user.name} copied to clipboard!`);
  };

  // Bulk Auto-Provision Missing Students from Roster
  const handleProvisionMissingStudents = () => {
    if (!uniqueStudents || uniqueStudents.length === 0) {
      alert('No student roster records found to provision.');
      return;
    }

    let addedCount = 0;
    let currentList = [...userCredentials];

    uniqueStudents.forEach(st => {
      if (!st || !st.name) return;
      const stName = st.name.trim();
      const stEmail = getStudentEmailFromName(stName, st.email || (st.note && st.note.includes('@') ? st.note : undefined));

      const exists = currentList.some(c => 
        (c.studentName && (c?.studentName || '').toLowerCase().trim() === (stName || '').toLowerCase().trim()) ||
        (c.email && (c?.email || '').toLowerCase().trim() === (stEmail || '').toLowerCase().trim()) ||
        (c.name && (c?.name || '').toLowerCase().trim() === (stName || '').toLowerCase().trim())
      );

      if (!exists) {
        const res = createUserCredential(currentList, {
          name: stName,
          email: stEmail,
          role: 'student',
          studentName: stName,
          requirePasswordChange: true
        });
        if (res.success && res.updatedCredentials) {
          currentList = res.updatedCredentials;
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      onUpdateCredentials(currentList);
      setSuccessToast(`Successfully provisioned ${addedCount} new student accounts with default password "${DEFAULT_USER_PASSWORD}".`);
      if (onTriggerCloudSync) onTriggerCloudSync();
    } else {
      setSuccessToast('All enrolled students in the roster already have active login accounts.');
    }
  };

  // Export User Directory to CSV
  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Password Set', 'Department/Module', 'Created At'];
    const rows = userCredentials.map(u => [
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${u.role}"`,
      `"${u.status || 'active'}"`,
      `"${u.mustChangePassword ? 'Pending First Login' : 'Custom Password Set'}"`,
      `"${(u.moduleOrDepartment || '').replace(/"/g, '""')}"`,
      `"${u.createdAt || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HTEIM_User_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn modal-material-scrim">
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="User Account Management and Access Control"
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[92vh] flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between relative flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                User Authentication & Account Management
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  Supabase Verified
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Create and manage login accounts for Admins, Teachers, and Students using Email & Password.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex-shrink-0">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'directory'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            User Directory
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'pending'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Pending Approvals
            {pendingApprovals.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full">
                {pendingApprovals.length}
              </span>
            )}
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn flex-shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Directory Tab ── */}
        {activeTab === 'directory' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Total Users</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">{stats.total}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider block">Teachers & Faculty</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{stats.teachers}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider block">Students</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.students}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider block">Pending 1st Login</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">{stats.pendingChange}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-extrabold text-purple-500 uppercase tracking-wider block">Admins</span>
                <span className="text-lg font-black text-purple-600 dark:text-purple-400">{stats.admins}</span>
              </div>
            </div>

        {/* Action Toolbar & Filters */}
        <div className="p-4 sm:p-6 pb-2 space-y-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, role, or module..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setFormData({
                    name: '',
                    email: '',
                    role: 'teacher',
                    studentName: '',
                    moduleOrDepartment: '',
                    requirePasswordChange: true
                  });
                  setFormError(null);
                  setShowCreateModal(true);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create User</span>
              </button>

              <button
                onClick={handleProvisionMissingStudents}
                title="Automatically create accounts for enrolled students missing credentials"
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Sync Student Roster</span>
                <span className="sm:hidden">Sync Roster</span>
              </button>

              <button
                onClick={handleExportCSV}
                title="Export User Directory to CSV"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Role:</span>
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                  roleFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setRoleFilter('admin')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                  roleFilter === 'admin' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Admins ({stats.admins})
              </button>
              <button
                onClick={() => setRoleFilter('teacher')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                  roleFilter === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Teachers ({stats.teachers})
              </button>
              <button
                onClick={() => setRoleFilter('student')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                  roleFilter === 'student' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Students ({stats.students})
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Status:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${statusFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending_password')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${statusFilter === 'pending_password' ? 'bg-amber-600 text-white' : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'}`}
              >
                Pending 1st Login ({stats.pendingChange})
              </button>
              <button
                onClick={() => setStatusFilter('suspended')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${statusFilter === 'suspended' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'}`}
              >
                Suspended ({stats.suspended})
              </button>
            </div>
          </div>
        </div>

        {/* User Directory Table / List */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-6">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-4">User Details</th>
                    <th className="py-2 px-4">Role</th>
                    <th className="py-2 px-4">Login Email</th>
                    <th className="py-2 px-4">Password Status</th>
                    <th className="py-2 px-4">Account Status</th>
                    <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <UserX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No users match your criteria</p>
                        <p className="text-xs text-slate-400 mt-1">Try clearing your search query or role filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, uIdx) => {
                      const isMainAdmin = (user.email || '').toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

                      return (
                        <tr 
                          key={user.id ? `user-${user.id}-${uIdx}` : `user-${uIdx}`} 
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* User Details */}
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0 ${
                                user.role === 'admin' ? 'bg-purple-600' : user.role === 'teacher' ? 'bg-indigo-600' : 'bg-emerald-600'
                              }`}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                  {isMainAdmin && (
                                    <span className="text-[9px] bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 px-1.5 py-0.2 rounded font-black">
                                      Primary Admin
                                    </span>
                                  )}
                                </div>
                                {user.moduleOrDepartment && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                                    {user.moduleOrDepartment}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-2 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              user.role === 'admin'
                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : user.role === 'teacher'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {user.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                              {user.role === 'teacher' && <UserCheck className="w-3 h-3" />}
                              {user.role === 'student' && <GraduationCap className="w-3 h-3" />}
                              <span>{user.role}</span>
                            </span>
                          </td>

                          {/* Login Email */}
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>{user.email}</span>
                            </div>
                          </td>

                          {/* Password Status */}
                          <td className="py-2 px-4">
                            {user.mustChangePassword ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold">
                                <Lock className="w-3 h-3" />
                                <span>Default (password1)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                                <Check className="w-3 h-3" />
                                <span>Custom Password</span>
                              </span>
                            )}
                          </td>

                          {/* Account Status */}
                          <td className="py-2 px-4">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                              user.status === 'suspended' ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'suspended' ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                              <span>{user.status === 'suspended' ? 'Suspended' : 'Active'}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Copy Invite Credentials */}
                              <button
                                onClick={() => handleCopyInvite(user)}
                                title="Copy invitation details and login credentials"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                              >
                                {copiedId === user.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={() => handleResetPassword(user)}
                                title="Reset password back to default 'password1' and force change on next login"
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>

                              {/* Edit User */}
                              <button
                                onClick={() => handleStartEdit(user)}
                                title="Edit user details"
                                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Suspend / Activate Toggle */}
                              {!isMainAdmin && (
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  title={user.status === 'suspended' ? 'Reactivate user' : 'Suspend user'}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    user.status === 'suspended' 
                                      ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40' 
                                      : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                  }`}
                                >
                                  {user.status === 'suspended' ? <Check className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                </button>
                              )}

                              {/* Delete User */}
                              {!isMainAdmin && (
                                <>
                                  {confirmDeleteId === user.id ? (
                                    <div className="flex items-center gap-1 ml-1 bg-rose-50 p-0.5 rounded-lg border border-rose-200">
                                      <button
                                        onClick={() => handleDeleteUser(user)}
                                        className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="p-1 text-slate-500 hover:text-slate-800"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmDeleteId(user.id)}
                                      title="Delete user account"
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
          </>
        )}

        {/* ── Pending Approvals Panel ── */}
        {activeTab === 'pending' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Accounts Awaiting Administrator Approval
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Lecturer and staff accounts blocked from automatic provisioning require your explicit sign-off.
                </p>
              </div>
              <button onClick={fetchPendingApprovals} disabled={pendingLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${pendingLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            {pendingError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{pendingError}</span>
              </div>
            )}
            {pendingLoading && pendingApprovals.length === 0 && (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
              </div>
            )}
            {!pendingLoading && !pendingError && pendingApprovals.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">All clear — no pending approvals</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Elevated-role accounts blocked during enrollment will appear here for your review.</p>
              </div>
            )}
            {!pendingLoading && pendingApprovals.length > 0 && (
              <div className="space-y-3">
                {pendingApprovals.map(approval => (
                  <div key={approval.id} className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center flex-shrink-0">
                          <UserCheck className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{approval.name || approval.email}</div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                            <Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{approval.email}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <ShieldCheck className="w-3 h-3" />Requested: {approval.requested_role}
                            </span>
                            {approval.source_record && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                <Info className="w-3 h-3" />Source: {approval.source_record}
                              </span>
                            )}
                            {approval.created_at && <span className="text-[10px] text-slate-400">{new Date(approval.created_at).toLocaleDateString()}</span>}
                          </div>
                          {approval.reason && <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 italic">"{approval.reason}"</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleDenyApproval(approval)} disabled={denyingId === approval.id || approvingId === approval.id}
                            className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50">
                            Deny
                          </button>
                          <button onClick={() => handleApprove(approval)} disabled={approvingId === approval.id || denyingId === approval.id}
                            className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1">
                            {approvingId === approval.id ? <><RefreshCw className="w-3 h-3 animate-spin" />Approving…</> : <><Check className="w-3 h-3" />Approve</>}
                          </button>
                        </div>
                        <input type="text" placeholder="Approval reason (optional)"
                          value={approveReason[approval.id] || ''}
                          onChange={e => setApproveReason(prev => ({ ...prev, [approval.id]: e.target.value }))}
                          className="w-48 px-2.5 py-1.5 text-[11px] font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Dialog for Create / Edit User */}
        {showCreateModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden animate-scaleUp">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="text-sm font-black flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <span>{editingUser ? 'Edit User Account' : 'Create New User Account'}</span>
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs font-medium">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Role Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Account Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ 
                          ...prev, 
                          role: 'teacher',
                          email: prev.name ? getFacultyEmailFromName(prev.name) : prev.email 
                        }));
                      }}
                      className={`py-2 px-2 rounded-xl font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                        formData.role === 'teacher'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Teacher</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ 
                          ...prev, 
                          role: 'student',
                          email: prev.name ? getStudentEmailFromName(prev.name) : prev.email 
                        }));
                      }}
                      className={`py-2 px-2 rounded-xl font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                        formData.role === 'student'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Student</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                      className={`py-2 px-2 rounded-xl font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                        formData.role === 'admin'
                          ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Admin</span>
                    </button>
                  </div>
                </div>

                {/* If Student: Optional Link to Existing Student from Roster */}
                {formData.role === 'student' && uniqueStudents && uniqueStudents.length > 0 && !editingUser && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Or Select Enrolled Student from Roster:
                    </label>
                    <select
                      onChange={(e) => {
                        const sName = e.target.value;
                        if (sName) {
                          const derivedEmail = getStudentEmailFromName(sName);
                          setFormData(prev => ({
                            ...prev,
                            name: sName,
                            studentName: sName,
                            email: derivedEmail
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                    >
                      <option value="">-- Choose from Enrolled Roster --</option>
                      {uniqueStudents.map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={formData.name ?? ''}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        name: newName,
                        email: prev.email || (prev.role === 'student' ? getStudentEmailFromName(newName) : getFacultyEmailFromName(newName))
                      }));
                    }}
                    placeholder="e.g. Pastor John Doe"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                    required
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Login Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={formData.email ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. john.doe@hteim.edu"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Department / Module / Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    {formData.role === 'student' ? 'Academic Track / Cohort' : 'Department / Assigned Module'}
                  </label>
                  <input
                    type="text"
                    value={formData.moduleOrDepartment ?? ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, moduleOrDepartment: e.target.value }))}
                    placeholder={formData.role === 'student' ? 'e.g. Level 1: Foundation Certificate' : 'e.g. Module 1: Apostolic Foundations'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                {/* Initial Default Password Badge */}
                {!editingUser && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                    <div className="flex items-center gap-1.5 font-bold">
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>Initial Default Password: <strong className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-amber-300">{DEFAULT_USER_PASSWORD}</strong></span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400">
                      The user will be required to change this default password upon their initial sign-in.
                    </p>
                  </div>
                )}

                {/* Force Password Change Toggle */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.requirePasswordChange}
                    onChange={(e) => setFormData(prev => ({ ...prev, requirePasswordChange: e.target.checked }))}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Require user to change password upon next login
                  </span>
                </label>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    {editingUser ? 'Save Changes' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Admin Control Panel • Kendell Pierre (<span className="font-mono font-bold text-slate-700 dark:text-slate-300">{currentAdminEmail}</span>)</span>
          </div>
          <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
            All passwords hashed and stored securely with Supabase synchronization
          </span>
        </div>
      </div>
    </div>
  );
};
