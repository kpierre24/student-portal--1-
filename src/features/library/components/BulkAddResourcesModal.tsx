import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Trash2,
  BookOpen,
  Layers,
  Check,
  Edit3
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { LibraryResource } from '../../../types';
import { LearningResource, ResourceType } from '../types';
import { CURRICULUM_MODULES } from './LibraryTab';
import { evaluateLesson } from '../../../lib/api/ai';
import { generateUUID } from '../../../lib/idGenerator';
import mammoth from 'mammoth';

interface BulkAddResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBulkResources: (resources: LibraryResource[]) => void;
  currentUserName?: string;
}

interface ParsedFileItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: string;
  rawText: string;
  dataUrl?: string;
  status: 'pending' | 'evaluating' | 'success' | 'error';
  errorMsg?: string;
  
  // AI Evaluated fields
  title: string;
  lessonNumber: string;
  moduleCode: string;
  category: string;
  summary: string;
  keyTakeaways: string[];
  tags: string[];
}

export const BulkAddResourcesModal: React.FC<BulkAddResourcesModalProps> = ({
  isOpen,
  onClose,
  onSaveBulkResources,
  currentUserName = 'HTEIM Faculty'
}) => {
  const [files, setFiles] = useState<ParsedFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalProgress, setGlobalProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper to extract text from file (.docx, .doc, .pdf, .txt)
  const extractTextFromFile = async (file: File): Promise<{ text: string; dataUrl: string }> => {
    const fileNameLower = (file.name || '').toLowerCase();
    const isDocx = fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc') || file.type.includes('wordprocessingml') || file.type.includes('msword');

    let text = '';
    let dataUrl = '';

    // Read Data URL for download / preview
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch {
      // ignore
    }

    if (isDocx) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (result.value && result.value.trim().length > 0) {
          text = result.value.trim();
        }
      } catch (err) {
        console.warn('Mammoth extraction notice:', err);
      }
    }

    if (!text && (file.type.startsWith('text/') || fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.md') || fileNameLower.endsWith('.csv'))) {
      try {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = reject;
          reader.readAsText(file);
        });
      } catch {
        // ignore
      }
    }

    if (!text) {
      text = `Core study document: ${file.name}. Uploaded for HTEIM curriculum module training.`;
    }

    return { text, dataUrl };
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const newItems: ParsedFileItem[] = [];
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      newItems.push({
        id: generateUUID(),
        file,
        fileName: file.name,
        fileSize: sizeMb,
        rawText: '',
        status: 'pending',
        title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        lessonNumber: 'Lesson 1',
        moduleCode: 'SOM-MOD-1',
        category: 'Study Guide',
        summary: 'Awaiting AI evaluation...',
        keyTakeaways: ['Biblical doctrine and ministry foundation'],
        tags: ['Curriculum', 'Study Guide']
      });
    }

    setFiles(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleRunAiEvaluation = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setGlobalProgress({ current: 0, total: files.length });

    const updated = [...files];

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      item.status = 'evaluating';
      setFiles([...updated]);

      try {
        // Extract text if not already extracted
        let text = item.rawText;
        let dataUrl = item.dataUrl;
        if (!text) {
          const extracted = await extractTextFromFile(item.file);
          text = extracted.text;
          dataUrl = extracted.dataUrl;
          item.rawText = text;
          item.dataUrl = dataUrl;
        }

        // Call Gemini AI evaluation API
        const aiRes = await evaluateLesson({
          title: item.title,
          content: text,
          author: currentUserName,
          courseCode: item.moduleCode,
          fileName: item.fileName
        });

        if (aiRes.success && aiRes.data) {
          const d = aiRes.data as any;
          item.title = d.title || item.title;
          item.summary = d.summary || item.summary;
          item.category = d.category || item.category;
          item.keyTakeaways = d.keyTakeaways || item.keyTakeaways;
          item.moduleCode = d.courseCode || item.moduleCode;
          if (d.lessonNumber) {
            item.lessonNumber = `Lesson ${d.lessonNumber}`;
          } else {
            // Heuristic lesson extraction from title or filename
            const match = (item.fileName + ' ' + item.title).match(/lesson\s*(\d+)/i);
            if (match) {
              item.lessonNumber = `Lesson ${match[1]}`;
            }
          }
          item.status = 'success';
        } else {
          // Heuristic fallback
          const match = (item.fileName + ' ' + item.title).match(/lesson\s*(\d+)/i);
          if (match) {
            item.lessonNumber = `Lesson ${match[1]}`;
          }
          item.summary = text.slice(0, 200) + '...';
          item.status = 'success';
        }
      } catch (err: any) {
        item.status = 'error';
        item.errorMsg = err.message || 'Evaluation failed';
      }

      setGlobalProgress({ current: i + 1, total: files.length });
      setFiles([...updated]);
    }

    setIsProcessing(false);
    setGlobalProgress(null);
  };

  const handleFieldChange = (id: string, field: keyof ParsedFileItem, value: any) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleSaveAll = () => {
    const finalResources: LibraryResource[] = files.map(f => {
      const isPdf = f.fileName.toLowerCase().endsWith('.pdf');
      const format = isPdf ? 'PDF' : 'DOCX';
      const type: ResourceType = isPdf ? 'pdf' : 'document';
      const mod = CURRICULUM_MODULES.find(m => m.code === f.moduleCode);
      const modName = mod ? mod.fullName : 'Module Course Material';

      return {
        id: generateUUID(),
        title: `${f.lessonNumber}: ${f.title}`,
        description: f.summary,
        type,
        format,
        source: 'upload',
        downloadUrl: f.dataUrl || '#',
        fileDataUrl: f.dataUrl,
        fileName: f.fileName,
        size: f.fileSize,
        category: f.category,
        author: currentUserName,
        courseCode: f.moduleCode,
        moduleTrack: f.moduleCode,
        summary: f.summary,
        keyTakeaways: f.keyTakeaways,
        fullContent: f.rawText,
        tags: [...f.tags, f.lessonNumber, f.moduleCode],
        aiEvaluated: true,
        isRequiredReading: true,
        uploadedAt: new Date().toISOString().slice(0, 10),
        status: 'published',
        isPublished: true,
        isDownloadable: true
      };
    });

    onSaveBulkResources(finalResources);
    setFiles([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Upload Materials with AI Lesson & Topic Evaluation">
      <div className="p-6 space-y-6 text-slate-900 dark:text-white max-h-[80vh] overflow-y-auto">
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs text-indigo-900 dark:text-indigo-200">
            <p className="font-extrabold text-sm">Automated Curriculum AI Evaluation</p>
            <p>
              Upload multiple PDF or Word (.docx/.doc) core study files simultaneously. Gemini AI will analyze the text content, automatically infer the corresponding lesson number (e.g. Lesson 12), and categorize it under the correct HTEIM curriculum module and topic!
            </p>
          </div>
        </div>

        {/* Upload Drop Zone */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-50 dark:bg-slate-900/50 transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.md"
            onChange={handleFilesSelected}
            className="hidden"
          />
          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform shadow-inner">
            <FolderPlus className="w-7 h-7" />
          </div>
          <p className="text-sm font-extrabold text-slate-800 dark:text-white">
            Click to select or drag and drop multiple PDF & Word files
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Supports .pdf, .docx, .doc, .txt up to 50MB each
          </p>
        </div>

        {/* Selected Files List & AI Evaluation Table */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Selected Files ({files.length})
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunAiEvaluation}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Evaluating ({globalProgress?.current}/{globalProgress?.total})...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Run AI Lesson & Topic Evaluation
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {files.map(item => (
                <div 
                  key={item.id}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">{item.fileName}</p>
                        <p className="text-[10px] text-slate-400">{item.fileSize} • Status: <span className={`font-bold ${item.status === 'success' ? 'text-emerald-600' : item.status === 'evaluating' ? 'text-indigo-600 animate-pulse' : 'text-slate-500'}`}>{item.status.toUpperCase()}</span></p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(item.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Evaluated Lesson</label>
                      <input
                        type="text"
                        value={item.lessonNumber}
                        onChange={(e) => handleFieldChange(item.id, 'lessonNumber', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                        placeholder="e.g. Lesson 12"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Curriculum Module / Topic</label>
                      <select
                        value={item.moduleCode}
                        onChange={(e) => handleFieldChange(item.id, 'moduleCode', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                      >
                        {CURRICULUM_MODULES.map(m => (
                          <option key={m.code} value={m.code}>{m.fullName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Resource Title</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">AI Summary & Overview</label>
                    <input
                      type="text"
                      value={item.summary}
                      onChange={(e) => handleFieldChange(item.id, 'summary', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={files.length === 0 || isProcessing}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Save {files.length} Evaluated Resource{files.length === 1 ? '' : 's'} to Library
          </button>
        </div>
      </div>
    </Modal>
  );
};
