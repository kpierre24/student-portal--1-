import React, { useState, useEffect } from 'react';
import { User, Mail, GraduationCap, AlertCircle, Calendar } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { StudentSummary, ACADEMIC_LEVELS, StudentEnrollmentStatus } from '../../../types';
import { StudentFormData } from '../types';

export interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: StudentFormData) => void;
  initialData?: StudentSummary | StudentFormData | null;
  isLoading?: boolean;
}

export function StudentForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: StudentFormProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    studentNumber: '',
    email: '',
    phone: '',
    levelId: 'level_1',
    enrolledModule: '',
    note: '',
    cohortId: 'HTEIM-2026',
    enrollmentStatus: 'active',
    dropoutReason: '',
    dropoutDate: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || '',
        studentNumber: initialData.studentNumber || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        levelId: initialData.levelId || 'level_1',
        enrolledModule: initialData.enrolledModule || '',
        note: initialData.note || '',
        cohortId: initialData.cohortId || 'HTEIM-2026',
        enrollmentStatus: initialData.enrollmentStatus || (initialData.isDroppedOut ? 'dropped_out' : 'active'),
        dropoutReason: initialData.dropoutReason || '',
        dropoutDate: initialData.dropoutDate || (initialData.isDroppedOut ? new Date().toISOString().slice(0, 10) : ''),
      });
    } else {
      setFormData({
        name: '',
        studentNumber: '',
        email: '',
        phone: '',
        levelId: 'level_1',
        enrolledModule: '',
        note: '',
        cohortId: 'HTEIM-2026',
        enrollmentStatus: 'active',
        dropoutReason: '',
        dropoutDate: '',
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
    onClose();
  };

  const isDroppedOrWithdrawn = formData.enrollmentStatus === 'dropped_out' || formData.enrollmentStatus === 'withdrawn';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Student Record' : 'Enroll New Ministry Student'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--md-on-surface-variant)]" />
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Brother John Doe"
              className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] py-2 pl-9 pr-3 text-xs font-medium text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
            />
          </div>
        </div>

        {/* Student Number & Email Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
              Student ID Number
            </label>
            <input
              type="text"
              value={formData.studentNumber}
              onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
              placeholder="HTEIM-2026-001"
              className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] py-2 px-3 text-xs font-medium text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--md-on-surface-variant)]" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@hteim.org"
                className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] py-2 pl-9 pr-3 text-xs font-medium text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Academic Level & Enrollment Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
              Academic Level
            </label>
            <select
              value={formData.levelId}
              onChange={(e) => setFormData({ ...formData, levelId: e.target.value })}
              className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] py-2 px-3 text-xs font-semibold text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
            >
              {ACADEMIC_LEVELS.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
              Enrollment Status
            </label>
            <select
              value={formData.enrollmentStatus || 'active'}
              onChange={(e) => setFormData({ ...formData, enrollmentStatus: e.target.value as StudentEnrollmentStatus })}
              className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] py-2 px-3 text-xs font-semibold text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
            >
              <option value="active">🟢 Active Enrollment</option>
              <option value="dropped_out">🔴 Dropped Out</option>
              <option value="withdrawn">🟡 Officially Withdrawn</option>
              <option value="graduated">🎓 Graduated</option>
              <option value="leave_of_absence">🔵 Leave of Absence</option>
            </select>
          </div>
        </div>

        {/* Dropout Reason & Date (Conditional if Dropped Out / Withdrawn) */}
        {isDroppedOrWithdrawn && (
          <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Dropout / Withdrawal Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-200 mb-1">
                  Reason for Leaving
                </label>
                <input
                  type="text"
                  value={formData.dropoutReason || ''}
                  onChange={(e) => setFormData({ ...formData, dropoutReason: e.target.value })}
                  placeholder="e.g. Relocated, Work schedule conflict"
                  className="w-full rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 py-1.5 px-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-200 mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={formData.dropoutDate || ''}
                  onChange={(e) => setFormData({ ...formData, dropoutDate: e.target.value })}
                  className="w-full rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 py-1.5 px-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Enrolled Module & Academic Notes */}
        <div>
          <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
            Faculty Notes & Remarks
          </label>
          <textarea
            rows={3}
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Academic standings, special accommodations, or attendance records..."
            className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-3 text-xs font-medium text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none resize-none"
          />
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--md-outline-variant)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {initialData ? 'Save Changes' : 'Enroll Student'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
