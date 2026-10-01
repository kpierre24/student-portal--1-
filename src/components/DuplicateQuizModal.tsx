import React, { useState } from 'react';
import { QuizAssignment } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Copy, CheckSquare, Square } from 'lucide-react';

interface DuplicateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizAssignment;
  onDuplicate: (options: {
    newTitle: string;
    duplicateQuestions: boolean;
    duplicateSettings: boolean;
    duplicateRubric: boolean;
    duplicateSchedule: boolean;
    duplicateAssignments: boolean; // Just tracking to match requested options
  }) => void;
}

export const DuplicateQuizModal: React.FC<DuplicateQuizModalProps> = ({
  isOpen,
  onClose,
  quiz,
  onDuplicate
}) => {
  const [newTitle, setNewTitle] = useState(`${quiz.title} (Copy)`);
  const [options, setOptions] = useState({
    duplicateQuestions: true,
    duplicateSettings: true,
    duplicateRubric: true,
    duplicateSchedule: true,
    duplicateAssignments: true
  });

  const toggleOption = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDuplicate = () => {
    onDuplicate({ newTitle, ...options });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Duplicate Quiz"
      icon={<Copy className="w-5 h-5 text-purple-600" />}
      size="md"
    >
      <div className="space-y-6">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">New Title</label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Duplication Options</h4>
          
          <div className="space-y-2">
            {[
              { key: 'duplicateQuestions', label: 'Duplicate questions' },
              { key: 'duplicateSettings', label: 'Duplicate settings' },
              { key: 'duplicateRubric', label: 'Duplicate rubric' },
              { key: 'duplicateSchedule', label: 'Duplicate schedule' },
              { key: 'duplicateAssignments', label: 'Duplicate assignments' }
            ].map(opt => (
              <div 
                key={opt.key}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => toggleOption(opt.key as keyof typeof options)}
              >
                {options[opt.key as keyof typeof options] ? (
                  <CheckSquare className="w-5 h-5 text-purple-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{opt.label}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-200 dark:border-rose-800">
            Note: Submissions are never duplicated. A cloned quiz always starts with 0 submissions.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleDuplicate} leftIcon={<Copy className="w-4 h-4" />}>
            Duplicate Quiz
          </Button>
        </div>
      </div>
    </Modal>
  );
};
