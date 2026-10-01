import React from 'react';
import { HelpCircle, X, Share2, Download, Printer } from 'lucide-react';

export interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-scaleUp">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-extrabold">HTEIM Portal - Access, Exporting & Sharing Guide</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
            <h4 className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
              <Share2 className="w-4 h-4 text-indigo-600" />
              1. How to Share this Live App with Others
            </h4>
            <p className="text-slate-600 text-[11px]">
              Click the <strong>Share</strong> button located at the top toolbar of Google AI Studio. This generates a direct public link that colleagues, co-teachers, or admins can open in any browser tab to view attendance matrices in real time.
            </p>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
            <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
              <Download className="w-4 h-4 text-emerald-600" />
              2. How to Export Source Code or Publish to GitHub
            </h4>
            <p className="text-slate-600 text-[11px]">
              To download the full source code or publish to GitHub for testing purposes, open the <strong>Settings / Export</strong> menu in the upper right corner of Google AI Studio. You can download a complete ZIP bundle or commit to a GitHub repository with one click.
            </p>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl space-y-1">
            <h4 className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
              <Printer className="w-4 h-4 text-amber-600" />
              3. Export Printable PDF Reports & CSV Data
            </h4>
            <p className="text-slate-600 text-[11px]">
              Use the <strong>Print Report</strong> button in the top bar to generate formatted PDF class summaries for official records, or click <strong>Export CSV</strong> to save raw spreadsheet data.
            </p>
          </div>

          {/* Developer / Creator Info */}
          <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-amber-400 uppercase text-[10px] tracking-wider">Application Software Creator</span>
              <span className="text-[10px] text-slate-400 font-mono">Rockproxy Technologies</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Created by <strong>Rockproxy Technologies</strong> • Director: <strong>Kendell Pierre</strong>
            </p>
            <p className="text-indigo-300 font-mono text-[10px]">
              Email: <a href="mailto:rockproxytechnologies@gmail.com" className="underline hover:text-white">rockproxytechnologies@gmail.com</a>
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <span className="text-[10px] text-slate-500">
            Created by <strong>Rockproxy Technologies</strong> (Kendell Pierre)
          </span>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
