import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Download, FileJson, FileText, FileSpreadsheet } from 'lucide-react';
import { QuizAssignment } from '../types';

interface ExportQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizAssignment;
}

export const ExportQuizModal: React.FC<ExportQuizModalProps> = ({
  isOpen,
  onClose,
  quiz
}) => {
  const handleExportJson = () => {
    const dataStr = JSON.stringify(quiz, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HTEIM_Quiz_${quiz.title.replace(/\s+/g, '_')}.json`;
    link.click();
    onClose();
  };

  const handleExportCsv = () => {
    // Generate a basic CSV structure of the quiz questions
    const headers = ['Question Number', 'Type', 'Question Text', 'Points', 'Correct Answer', 'Options (comma separated)'];
    const rows = quiz.questions.map((q, idx) => {
      const optionsStr = q.options?.map(o => o.text).join(' | ') || '';
      let correctAns = '';
      if (q.type === 'multiple_choice' && q.correctOptionId) {
        correctAns = q.options?.find(o => o.id === q.correctOptionId)?.text || '';
      } else if (q.type === 'checkboxes' && q.correctOptionIds) {
        correctAns = q.options?.filter(o => q.correctOptionIds?.includes(o.id)).map(o => o.text).join(' | ') || '';
      } else if (q.type === 'short_answer' || q.type === 'fill_blank') {
        correctAns = q.acceptableAnswers?.join(' | ') || '';
      }
      return [
        idx + 1,
        q.type,
        `"${q.questionText.replace(/"/g, '""')}"`,
        q.weight,
        `"${correctAns.replace(/"/g, '""')}"`,
        `"${optionsStr.replace(/"/g, '""')}"`
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HTEIM_Quiz_${quiz.title.replace(/\s+/g, '_')}_Questions.csv`;
    link.click();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Quiz"
      icon={<Download className="w-5 h-5 text-indigo-600" />}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Export "{quiz.title}" to standard formats for offline editing, sharing, or backup.
        </p>
        
        <div className="space-y-2">
          <button 
            onClick={handleExportJson}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-bold text-slate-800 dark:text-slate-200">JSON Format</strong>
                <span className="text-xs text-slate-500">Full backup including settings and rubrics</span>
              </div>
            </div>
          </button>

          <button 
            onClick={handleExportCsv}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-bold text-slate-800 dark:text-slate-200">CSV Spreadsheet</strong>
                <span className="text-xs text-slate-500">Questions and answer keys for Excel</span>
              </div>
            </div>
          </button>

          <button 
            onClick={() => alert('PDF generation for offline printing will be implemented soon.')}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-bold text-slate-800 dark:text-slate-200">Printable PDF</strong>
                <span className="text-xs text-slate-500">Student worksheet style document</span>
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
};
