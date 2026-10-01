import React from 'react';
import {
  FileCode,
  Download,
  FileQuestion,
  FileText,
  Package,
  Calendar,
  User,
  ExternalLink,
  X,
  AlertCircle
} from 'lucide-react';
import { ViewerBaseProps } from './types';

export const ExternalViewer: React.FC<ViewerBaseProps> = ({
  resource,
  onClose,
  canDownload = true,
  className = ''
}) => {
  const rawUrl = (resource as any).downloadUrl || (resource as any).url || (resource as any).fileDataUrl || '';
  const isDownloadPermitted = canDownload && (resource as any).isDownloadable !== false;

  const fileName = (resource as any).fileName || resource.title || 'resource-file';
  const format = ((resource as any).format || 'FILE').toUpperCase();
  const size = (resource as any).size || 'Unknown Size';

  const handleDownload = () => {
    if (!isDownloadPermitted || !rawUrl) return;
    const link = document.createElement('a');
    link.href = rawUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden ${className}`}>
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20 shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-sm">
              {resource.title || 'Downloadable Resource'}
            </h2>
            <p className="text-[10px] text-slate-400">
              Format: <strong className="text-violet-400">{format}</strong> • {size}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDownloadPermitted && rawUrl && (
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-rose-600/80 bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto shadow-inner">
            <FileCode className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-950 border border-violet-800 text-violet-300 rounded-full text-xs font-bold">
              <span>{format} Resource</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white">
              {resource.title}
            </h3>
            {((resource as any).description || (resource as any).summary) && (
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {(resource as any).description || (resource as any).summary}
              </p>
            )}
          </div>

          {/* Details Pill Grid */}
          <div className="grid grid-cols-2 gap-3 text-left max-w-md mx-auto text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">File Name</span>
              <span className="font-mono text-slate-300 truncate block">{fileName}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Size</span>
              <span className="text-slate-300 block">{size}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Curriculum</span>
              <span className="text-slate-300 block">{(resource as any).courseCode || (resource as any).courseId || 'General'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Author</span>
              <span className="text-slate-300 block">{(resource as any).author || 'HTEIM Faculty'}</span>
            </div>
          </div>

          {/* Download Action */}
          <div className="pt-2">
            {isDownloadPermitted && rawUrl ? (
              <button
                type="button"
                onClick={handleDownload}
                className="px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs rounded-xl shadow-xl flex items-center gap-2 mx-auto transition-all hover:scale-105"
              >
                <Download className="w-4 h-4" /> Download Resource ({size})
              </button>
            ) : (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 max-w-md mx-auto">
                <AlertCircle className="w-4 h-4 text-amber-400 inline mr-1.5" />
                This document is marked as restricted view-only by academic administration.
              </div>
            )}
          </div>

          {/* Attached Excerpt or Content Preview */}
          {((resource as any).fullContent || (resource as any).extractedContent) && (
            <div className="text-left bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-48 overflow-y-auto space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                Extracted Text Preview
              </h4>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {(resource as any).fullContent || (resource as any).extractedContent}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
