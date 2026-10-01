import React, { useState } from 'react';
import { Calendar, Tag } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { AttendanceFormData } from '../types';

export interface AttendanceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AttendanceFormData) => void;
  isLoading?: boolean;
}

export function AttendanceForm({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: AttendanceFormProps) {
  const [formData, setFormData] = useState<AttendanceFormData>({
    classDayName: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classDayName.trim()) return;
    onSubmit(formData);
    setFormData({ classDayName: '', date: new Date().toISOString().split('T')[0], notes: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Attendance Session" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
            Session / Class Day Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--md-on-surface-variant)]" />
            <input
              type="text"
              required
              value={formData.classDayName}
              onChange={(e) => setFormData({ ...formData, classDayName: e.target.value })}
              placeholder="e.g. Session 12: Hermeneutics & Exegesis"
              className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] py-2 pl-9 pr-3 text-xs font-medium text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
            Session Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--md-on-surface-variant)]" />
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] py-2 pl-9 pr-3 text-xs font-medium text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--md-on-surface)] mb-1">
            Faculty Notes (Optional)
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Special instructions or live broadcast details for this lecture session..."
            className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-3 text-xs font-medium text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--md-outline-variant)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            Create Session
          </Button>
        </div>
      </form>
    </Modal>
  );
}
