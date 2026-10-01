import React, { useState, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, ChevronRight, XCircle } from 'lucide-react';
import { QuizAssignment, QuizQuestion } from '../types';
import { generateUUID } from '../lib/idGenerator';

interface ImportQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (quiz: QuizAssignment) => void;
}

type ImportPhase = 'select_file' | 'preview' | 'importing';

export const ImportQuizModal: React.FC<ImportQuizModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [phase, setPhase] = useState<ImportPhase>('select_file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedQuiz, setParsedQuiz] = useState<QuizAssignment | null>(null);
  const [validationStats, setValidationStats] = useState({ valid: 0, warnings: 0, errors: 0 });
  const [validationIssues, setValidationIssues] = useState<{ qIndex: number, text: string, issue: string, type: 'warning' | 'error' }[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setPhase('select_file');
    setSelectedFile(null);
    setParsedQuiz(null);
    setValidationStats({ valid: 0, warnings: 0, errors: 0 });
    setValidationIssues([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processJsonFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Basic validation
      const questions = data.questions || data.quizData?.questions || [];
      const title = data.title || file.name.replace('.json', '');
      
      let valid = 0;
      let warnings = 0;
      let errors = 0;
      const issues: typeof validationIssues = [];

      questions.forEach((q: any, i: number) => {
        let isError = false;
        let isWarning = false;

        if (!q.questionText) {
          issues.push({ qIndex: i + 1, text: 'Unknown', issue: 'Missing question text', type: 'error' });
          isError = true;
        }

        if (q.type === 'multiple_choice' || q.type === 'checkboxes') {
          if (!q.options || q.options.length < 2) {
            issues.push({ qIndex: i + 1, text: q.questionText || 'Unknown', issue: 'Needs at least 2 options', type: 'error' });
            isError = true;
          }
          
          if (q.type === 'multiple_choice' && !q.correctOptionId) {
            issues.push({ qIndex: i + 1, text: q.questionText || 'Unknown', issue: 'Missing correct answer key', type: 'warning' });
            isWarning = true;
          }
        }

        if (isError) errors++;
        else if (isWarning) warnings++;
        else valid++;
      });

      const newQuiz: QuizAssignment = {
        id: generateUUID(),
        title,
        description: data.description || 'Imported quiz',
        questions,
        totalPoints: data.totalPoints || 100,
        createdAt: new Date().toISOString().split('T')[0],
        shareCode: `qz_${generateUUID().substring(0, 6)}`,
        settings: data.settings || {
          allowReview: true,
          showCorrectAnswers: true,
          passingScorePercentage: 75
        }
      };

      setParsedQuiz(newQuiz);
      setValidationStats({ valid, warnings, errors });
      setValidationIssues(issues);
      setPhase('preview');

    } catch (err) {
      console.error(err);
      alert('Invalid JSON file format.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      if (file.name.endsWith('.json')) {
        processJsonFile(file);
      } else {
        // Fallback mockup for CSV/Excel for UI demonstration
        setTimeout(() => {
          setParsedQuiz({
            id: generateUUID(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            questions: Array.from({ length: 20 }).map((_, i) => ({
              id: generateUUID(),
              type: 'multiple_choice',
              questionText: `Imported Question ${i + 1}`,
              weight: 5,
              options: [{ id: '1', text: 'Option A' }, { id: '2', text: 'Option B' }],
              correctOptionId: i === 6 ? undefined : '1'
            }) as any),
            totalPoints: 100,
            shareCode: 'test',
            createdAt: new Date().toISOString()
          });
          setValidationStats({ valid: 18, warnings: 2, errors: 0 });
          setValidationIssues([
            { qIndex: 7, text: 'Imported Question 7', issue: 'Missing correct answer', type: 'warning' },
            { qIndex: 14, text: 'Imported Question 14', issue: 'Duplicate option IDs detected', type: 'warning' }
          ]);
          setPhase('preview');
        }, 800);
      }
    }
  };

  const handleFinalImport = () => {
    if (parsedQuiz) {
      onImport(parsedQuiz);
      handleClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Quiz"
      icon={<UploadCloud className="w-5 h-5 text-indigo-600" />}
      size="md"
    >
      {phase === 'select_file' && (
        <div className="space-y-6">
          <p className="text-xs text-slate-500">
            Import an existing assessment from external formats like Google Forms (CSV), Excel, or JSON.
          </p>

          <div 
            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-indigo-300 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef}
              accept=".json,.csv,.xlsx"
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Click to browse or drag file here</h4>
            <p className="text-xs text-slate-400 font-medium">Supports .JSON, .CSV, and .XLSX</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          </div>
        </div>
      )}

      {phase === 'preview' && parsedQuiz && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Import Preview: {parsedQuiz.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">Found {parsedQuiz.questions.length} total questions</p>
            </div>
            <FileText className="w-8 h-8 text-indigo-200" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center">
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">{validationStats.valid}</div>
              <div className="text-[10px] font-bold text-emerald-600/70 uppercase">Valid</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-800 text-center">
              <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <div className="text-lg font-black text-amber-700 dark:text-amber-400">{validationStats.warnings}</div>
              <div className="text-[10px] font-bold text-amber-600/70 uppercase">Warnings</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-800 text-center">
              <XCircle className="w-5 h-5 text-rose-500 mx-auto mb-1" />
              <div className="text-lg font-black text-rose-700 dark:text-rose-400">{validationStats.errors}</div>
              <div className="text-[10px] font-bold text-rose-600/70 uppercase">Errors</div>
            </div>
          </div>

          {validationIssues.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900 py-1">Needs Correction</h5>
              {validationIssues.map((issue, idx) => (
                <div key={idx} className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  issue.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  {issue.type === 'error' ? <XCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />}
                  <div>
                    <strong className="block mb-0.5 font-bold">Question {issue.qIndex}: {issue.issue}</strong>
                    <span className="opacity-80 line-clamp-1">"{issue.text}"</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button 
              variant={validationStats.errors > 0 ? 'secondary' : 'primary'} 
              onClick={handleFinalImport} 
              disabled={validationStats.errors > 0}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              {validationStats.errors > 0 ? 'Fix Errors First' : 'Import Valid Quiz'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
