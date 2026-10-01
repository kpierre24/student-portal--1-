import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Calendar, 
  Clock, 
  Award, 
  FileText, 
  Save, 
  UploadCloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CustomAssignment } from '../../../types';
import { generateUUID } from '../../../lib/idGenerator';

interface ExamFormProps {
  assignment?: CustomAssignment | null;
  onSave: (asg: CustomAssignment) => void;
  onCancel: () => void;
}

export const ExamForm: React.FC<ExamFormProps> = ({
  assignment,
  onSave,
  onCancel
}) => {
  const isEditing = !!assignment;

  const [title, setTitle] = useState(assignment?.title || '');
  const [courseCode, setCourseCode] = useState(assignment?.courseCode || 'MIN-101');
  const [moduleTrack, setModuleTrack] = useState(assignment?.moduleTrack || 'Active Ministry Module');
  const [description, setDescription] = useState(assignment?.description || '');
  const [dueDate, setDueDate] = useState(assignment?.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [maxPoints, setMaxPoints] = useState<number>(assignment?.maxPoints || 100);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an assignment title.');
      return;
    }
    if (!courseCode.trim()) {
      setError('Please provide a course code.');
      return;
    }

    const payload: CustomAssignment = {
      id: assignment?.id || `ASG-${generateUUID().slice(0, 8)}`,
      title: title.trim(),
      courseCode: courseCode.trim().toUpperCase(),
      moduleTrack,
      description: description.trim(),
      dueDate,
      maxPoints: Number(maxPoints) || 100,
      createdAt: assignment?.createdAt || new Date().toISOString().split('T')[0],
      type: assignment?.type || 'document',
      quizData: assignment?.quizData
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isEditing ? 'Edit Assignment / Exam' : 'Create New Assignment'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Assignment Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Exegesis of Romans 8: Ministry Reflection"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Course Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="MIN-101"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white uppercase font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Max Points
              </label>
              <input
                type="number"
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                min="1"
                max="500"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Module Track
              </label>
              <select
                value={moduleTrack}
                onChange={(e) => setModuleTrack(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              >
                <option value="Active Ministry Module">Active Ministry Module</option>
                <option value="General Ministry Studies">General Ministry Studies</option>
                <option value="Advanced Theology">Advanced Theology</option>
                <option value="Pastoral Care & Counseling">Pastoral Care & Counseling</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Instructions / Prompt
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Detailed submission guidelines, rubric requirements, and references..."
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Save Changes' : 'Publish Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
