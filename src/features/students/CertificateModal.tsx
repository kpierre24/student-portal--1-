import React from 'react';
import { Download, Printer } from 'lucide-react';
import { LogoImage } from '../../components/LogoImage';

export interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificateData: {
    studentName: string;
    awardTitle: string;
    criteria: string;
    rate?: number;
    avgScore?: number;
  } | null;
  isGeneratingPDF: boolean;
  handleExportPDF: (elementId: string, fileName: string) => void;
}

export function CertificateModal({
  isOpen,
  onClose,
  certificateData,
  isGeneratingPDF,
  handleExportPDF,
}: CertificateModalProps) {
  if (!isOpen || !certificateData) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden"
      onScroll={(e) => { e.currentTarget.scrollTop = 0; }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Spacebar') {
          e.stopPropagation();
          const target = e.target as HTMLElement;
          const isInput = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;
          if (!isInput) {
            e.preventDefault();
          }
        }
      }}
    >
      <div className="bg-white border-8 border-double border-amber-600 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden my-auto animate-scaleUp p-8 text-center relative text-slate-900 print:border-8 print:shadow-none print:m-0" id="printable-certificate">
        {/* Top Certificate Header */}
        <div className="flex flex-col items-center justify-center mb-6">
          <LogoImage 
            alt="HTEIM School of Ministry Logo" 
            className="w-20 h-20 rounded-full border border-amber-500 shadow-md object-contain bg-white p-1 mb-2"
          />
          <h1 className="text-2xl font-black tracking-wider text-slate-900 uppercase">HTEIM SCHOOL OF MINISTRY</h1>
          <p className="text-xs font-extrabold text-amber-800 uppercase tracking-widest mt-0.5">Heaven Touching Earth Int'l Ministries</p>
          <p className="text-xs italic font-serif text-slate-600 mt-1">"Bringing Heaven to Earth, Taking People to Heaven"</p>
        </div>

        <div className="my-6 py-4 border-y border-amber-200 bg-amber-50/40 rounded-lg">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            Official Academic Commendation
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-3 uppercase">
            {certificateData.awardTitle}
          </h2>
        </div>

        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">This Certificate is Proudly Awarded To</p>
        <h3 className="text-3xl font-serif font-black text-slate-900 my-3 text-amber-950 underline decoration-amber-400 underline-offset-8">
          {certificateData.studentName}
        </h3>

        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed my-4">
          In recognition of exceptional diligence, spiritual commitment, and outstanding academic engagement during the ministry training program at HTEIM School of Ministry.
        </p>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg inline-block text-xs font-mono font-bold text-slate-800 my-2">
          {certificateData.criteria}
        </div>

        {/* Signature Block */}
        <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t border-slate-200 text-slate-700 text-xs">
          <div className="flex flex-col items-center">
            <div className="w-36 border-b border-slate-800 mb-1"></div>
            <p className="font-bold text-slate-900">Dr. Faculty Director</p>
            <p className="text-[10px] text-slate-400">Academic Dean, HTEIM</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-36 border-b border-slate-800 mb-1"></div>
            <p className="font-bold text-slate-900">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p className="text-[10px] text-slate-400">Date of Presentation</p>
          </div>
        </div>

        {/* Modal Action Buttons (Hidden when printing) */}
        <div className="mt-8 flex justify-end gap-2 print:hidden">
          <button 
            onClick={() => handleExportPDF('printable-certificate', `HTEIM_Certificate_${certificateData.studentName.replace(/\s+/g, '_')}.pdf`)}
            disabled={isGeneratingPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className={`w-3.5 h-3.5 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
            {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF Certificate'}
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Browser Print
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
