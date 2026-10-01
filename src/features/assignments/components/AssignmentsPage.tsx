import React, { useState } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  Award,
  BarChart2,
  Upload,
  BookOpen,
  Send,
  Paperclip,
} from 'lucide-react';
import { CustomAssignment, AssignmentSubmission, AppNotification, StudentSummary } from '../../../types';
import { useAssignments } from '../hooks/useAssignments';
import { useSubmissions } from '../hooks/useSubmissions';
import { AssignmentList } from './AssignmentList';
import { AssignmentForm } from './AssignmentForm';
import { SubmissionList } from './SubmissionList';
import { SubmissionDetails } from './SubmissionDetails';
import { Modal } from '../../../components/Modal';
import { AssignmentFormData, SubmissionFormData } from '../types';

interface AssignmentsPageProps {
  customAssignments: CustomAssignment[];
  setCustomAssignments: React.Dispatch<React.SetStateAction<CustomAssignment[]>>;
  submissions: AssignmentSubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<AssignmentSubmission[]>>;
  students?: StudentSummary[];
  userRole?: 'admin' | 'teacher' | 'student' | string;
  studentName?: string;
  onNotificationCreated?: (notif: AppNotification) => void;
}

export const AssignmentsPage: React.FC<AssignmentsPageProps> = ({
  customAssignments,
  setCustomAssignments,
  submissions,
  setSubmissions,
  students = [],
  userRole = 'admin',
  studentName = '',
  onNotificationCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'assignments' | 'submissions'>('assignments');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<CustomAssignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  // Student submission modal state
  const [isStudentSubmitModalOpen, setIsStudentSubmitModalOpen] = useState(false);
  const [targetAssignmentForSubmit, setTargetAssignmentForSubmit] = useState<CustomAssignment | null>(null);
  const [studentFileUrl, setStudentFileUrl] = useState('');
  const [studentFileName, setStudentFileName] = useState('');
  const [studentNotes, setStudentNotes] = useState('');
  const [studentTypedResponse, setStudentTypedResponse] = useState('');

  // Hooks
  const {
    filteredAssignments,
    stats,
    selectedAssignment,
    setSelectedAssignmentId,
    searchQuery: asgSearch,
    setSearchQuery: setAsgSearch,
    statusFilter: asgStatus,
    setStatusFilter: setAsgStatus,
    addAssignment,
    updateAssignment,
    deleteAssignment,
  } = useAssignments({
    initialAssignments: customAssignments,
    userRole,
    studentName,
    onAssignmentsChange: setCustomAssignments,
  });

  const {
    filteredSubmissions,
    selectedSubmission,
    setSelectedSubmissionId,
    searchQuery: subSearch,
    setSearchQuery: setSubSearch,
    statusFilter: subStatus,
    setStatusFilter: setSubStatus,
    submitAssignment,
    gradeSubmission,
    deleteSubmission,
  } = useSubmissions({
    initialSubmissions: submissions,
    studentName: userRole === 'student' ? studentName : undefined,
    onSubmissionsChange: setSubmissions,
  });

  const isTeacherOrAdmin = userRole === 'admin' || userRole === 'teacher' || userRole === 'lecturer';

  // Open creation modal
  const handleOpenCreateModal = () => {
    setEditingAssignment(null);
    setIsFormModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (asg: CustomAssignment) => {
    setEditingAssignment(asg);
    setIsFormModalOpen(true);
  };

  // Submit assignment creation/editing form
  const handleFormSubmit = (formData: AssignmentFormData) => {
    if (editingAssignment) {
      updateAssignment(editingAssignment.id, formData);
    } else {
      const created = addAssignment(formData);
      if (onNotificationCreated) {
        onNotificationCreated({
          id: `notif_${Date.now()}`,
          title: `New Assignment: ${created.title}`,
          message: `A new coursework assignment for ${created.courseCode} has been published with due date ${created.dueDate}.`,
          type: 'assignment',
          targetRole: 'all',
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    }
  };

  // Open student submission modal
  const handleOpenStudentSubmit = (asg: CustomAssignment) => {
    setTargetAssignmentForSubmit(asg);
    // Pre-fill existing submission data if any
    const existingSub = submissions.find(
      (s) => s.assignmentId === asg.id && (s.studentName || s.student?.name || '').toLowerCase() === studentName.toLowerCase()
    );
    if (existingSub) {
      setStudentFileUrl(existingSub.studentFileUrl || '');
      setStudentFileName(existingSub.studentFileName || '');
      setStudentNotes(existingSub.studentNotes || '');
      setStudentTypedResponse(existingSub.studentTypedResponse || '');
    } else {
      setStudentFileUrl('');
      setStudentFileName('');
      setStudentNotes('');
      setStudentTypedResponse('');
    }
    setIsStudentSubmitModalOpen(true);
  };

  // Submit student response
  const handleStudentSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssignmentForSubmit || !studentName) return;

    submitAssignment({
      assignmentId: targetAssignmentForSubmit.id,
      studentName,
      fileUrl: studentFileUrl.trim() || undefined,
      fileName: studentFileName.trim() || undefined,
      studentNotes: studentNotes.trim() || undefined,
      studentTypedResponse: studentTypedResponse.trim() || undefined,
    });

    if (onNotificationCreated) {
      onNotificationCreated({
        id: `notif_${Date.now()}`,
        title: `Submission Received: ${studentName}`,
        message: `${studentName} submitted coursework for ${targetAssignmentForSubmit.title}.`,
        type: 'submission',
        targetRole: 'admin',
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    setIsStudentSubmitModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Assignments</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalAssignments}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.publishedCount} Published • {stats.draftCount} Drafts
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Submissions</span>
            <Upload className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSubmissions}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Total Records</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Grading</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingGradingCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Needs Review</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Class Score</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.averageScore}%</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{stats.gradedCount} Graded</p>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'assignments'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Coursework Assignments</span>
          </button>

          {isTeacherOrAdmin && (
            <button
              onClick={() => setActiveTab('submissions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'submissions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Submissions & Grading Workspace</span>
            </button>
          )}
        </div>

        {isTeacherOrAdmin && activeTab === 'assignments' && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Assignment</span>
          </button>
        )}
      </div>

      {/* Active View Container */}
      {activeTab === 'assignments' ? (
        <AssignmentList
          assignments={filteredAssignments}
          submissions={submissions}
          userRole={userRole}
          studentName={studentName}
          searchQuery={asgSearch}
          onSearchChange={setAsgSearch}
          statusFilter={asgStatus}
          onStatusFilterChange={setAsgStatus}
          onSelectAssignment={(asg) => {
            setSelectedAssignmentId(asg.id);
            if (isTeacherOrAdmin) {
              setActiveTab('submissions');
            }
          }}
          onCreateNew={handleOpenCreateModal}
          onEditAssignment={handleOpenEditModal}
          onDeleteAssignment={(id) => setAssignmentToDelete(id)}
          onOpenSubmissions={(asg) => {
            setSelectedAssignmentId(asg.id);
            setActiveTab('submissions');
          }}
          onOpenStudentSubmit={handleOpenStudentSubmit}
        />
      ) : (
        <SubmissionList
          submissions={filteredSubmissions}
          assignments={customAssignments}
          selectedAssignment={selectedAssignment}
          searchQuery={subSearch}
          onSearchChange={setSubSearch}
          statusFilter={subStatus}
          onStatusFilterChange={setSubStatus}
          onSelectSubmission={(sub) => setSelectedSubmissionId(sub.id)}
          onDeleteSubmission={deleteSubmission}
          onCloseAssignmentFilter={() => setSelectedAssignmentId(null)}
        />
      )}

      {/* Assignment Creation / Editing Form Modal */}
      <AssignmentForm
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        assignment={editingAssignment}
        students={students}
        studentRoster={students.map((s) => s.name || (s as any).studentName).filter(Boolean)}
      />

      {/* Submission Details & Grading Modal */}
      <SubmissionDetails
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmissionId(null)}
        submission={selectedSubmission}
        assignment={
          selectedSubmission
            ? customAssignments.find((a) => a.id === selectedSubmission.assignmentId) || null
            : null
        }
        onGradeSubmit={(gradeData) => gradeSubmission(gradeData)}
      />

      {/* Student Submission Upload Modal */}
      {targetAssignmentForSubmit && (
        <Modal
          isOpen={isStudentSubmitModalOpen}
          onClose={() => setIsStudentSubmitModalOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Submit Assignment Work</span>
            </div>
          }
          size="lg"
        >
          <form onSubmit={handleStudentSubmitForm} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                {targetAssignmentForSubmit.title}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Course: {targetAssignmentForSubmit.courseCode} | Due: {targetAssignmentForSubmit.dueDate} | Max Pts: {targetAssignmentForSubmit.maxPoints}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                File Attachment URL / Link
              </label>
              <div className="relative">
                <Paperclip className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="Paste URL to PDF, Word doc, or Google Doc..."
                  value={studentFileUrl}
                  onChange={(e) => setStudentFileUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                File Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. My_Hermeneutics_Essay.pdf"
                value={studentFileName}
                onChange={(e) => setStudentFileName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Typed Response / Direct Answer
              </label>
              <textarea
                rows={4}
                placeholder="Type or paste your response directly here if not uploading a file..."
                value={studentTypedResponse}
                onChange={(e) => setStudentTypedResponse(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Student Comments or Notes for Faculty
              </label>
              <textarea
                rows={2}
                placeholder="Optional notes or context for the instructor..."
                value={studentNotes}
                onChange={(e) => setStudentNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsStudentSubmitModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Submit Work</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {assignmentToDelete && (
        <Modal
          isOpen={!!assignmentToDelete}
          onClose={() => setAssignmentToDelete(null)}
          title="Delete Coursework Assignment"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete this assignment and all associated student submission records? This action cannot be undone.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignmentToDelete(null)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAssignment(assignmentToDelete);
                  setAssignmentToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
              >
                Delete Assignment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
