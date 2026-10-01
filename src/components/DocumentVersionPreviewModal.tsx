import React, { useState } from 'react';
import { FileText, Download, Eye, History, FileCheck, Film, Music, Layers, Lock, Sparkles, Check } from 'lucide-react';
import { LibraryResource, ResourceVersion } from '../types';

interface DocumentVersionPreviewModalProps {
  resource: LibraryResource;
  onClose: () => void;
  onUploadNewVersion?: (resourceId: string, versionNote: string) => void;
}

export const DocumentVersionPreviewModal: React.FC<DocumentVersionPreviewModalProps> = ({
  resource = {} as LibraryResource,
  onClose,
  onUploadNewVersion
}) => {
  const [downloadCount, setDownloadCount] = useState(resource?.downloadCount || 14);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [newVersionNote, setNewVersionNote] = useState('');

  const versions: ResourceVersion[] = resource?.versionsHistory || [
    { version: 'v1.0', date: '2026-07-15', note: 'Initial Release' },
    { version: 'v1.1', date: '2026-08-01', note: 'Added Scripture Exegesis Study Guide Annex' },
  ];

  const handleDownload = () => {
    setDownloadCount(prev => prev + 1);
    alert(`Downloading ${resource.title} (${resource.format} - ${resource.size})`);
  };

  const handleUploadVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionNote.trim()) return;
    if (onUploadNewVersion) onUploadNewVersion(resource.id, newVersionNote);
    alert(`Version v1.2 updated successfully with note: "${newVersionNote}"`);
    setNewVersionNote('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-xl space-y-5 overflow-hidden relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            {resource.format === 'Audio' ? <Music className="w-6 h-6" /> :
             resource.format === 'Video' ? <Film className="w-6 h-6" /> :
             <FileText className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-extrabold text-[10px] rounded uppercase">
                {resource.courseCode} • {resource.category}
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-extrabold text-[10px] rounded uppercase">
                Version {resource.version || 'v1.1'}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white font-syne pt-1">
              {resource.title}
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-black">Author / Faculty</p>
              <p className="font-bold text-slate-900 dark:text-white truncate">{resource.author}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-black">Target Audience</p>
              <p className="font-bold text-slate-900 dark:text-white">{resource.audience || 'All Students'}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-black">Format & Size</p>
              <p className="font-bold text-slate-900 dark:text-white">{resource.format} ({resource.size})</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-black">Total Downloads</p>
              <p className="font-bold text-indigo-600 dark:text-indigo-400">{downloadCount} Accesses</p>
            </div>
          </div>

          {/* Embedded Previewer Simulation */}
          <div className="p-6 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-400" /> Embedded Interactive Document Preview
              </span>
              <span>{resource.title}.{(resource.format || '').toLowerCase()}</span>
            </div>

            <div className="p-4 bg-slate-900/80 rounded-xl leading-relaxed text-slate-300 max-h-48 overflow-y-auto">
              <p className="font-bold text-amber-300 font-sans text-sm mb-1">{resource.title} — Study Syllabus & Handout</p>
              <p className="font-sans text-xs text-slate-300">{resource.summary}</p>
              {resource.keyTakeaways && (
                <ul className="list-disc pl-5 pt-2 space-y-1 font-sans text-xs text-slate-400">
                  {resource.keyTakeaways.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Version History Toggle */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-500" /> Document Version Control
              </span>
              <button
                type="button"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {showVersionHistory ? 'Hide History' : 'View All Versions'}
              </button>
            </div>

            {showVersionHistory && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                {versions.map((v, i) => (
                  <div key={i} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-black text-slate-900 dark:text-white">{v.version}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">Released {v.date}</span>
                      <p className="text-slate-500 text-[11px]">{v.note}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">Verified</span>
                  </div>
                ))}

                <form onSubmit={handleUploadVersion} className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="New version release note (e.g. Added Module 4 annex)..."
                    value={newVersionNote}
                    onChange={(e) => setNewVersionNote(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Upload v1.2
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handleDownload}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Handout Material ({resource.size})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
