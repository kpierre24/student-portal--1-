import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Code,
  Sparkles,
  Globe
} from 'lucide-react';
import { Quiz } from '../types/quiz.types';

export interface QuizShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
}

export const QuizShareModal: React.FC<QuizShareModalProps> = ({
  isOpen,
  onClose,
  quiz
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'embed' | 'qr'>('link');

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hteim.edu';
  const publicShareUrl = `${origin}/?quiz=${quiz.shareCode || quiz.id}`;
  const embedCode = `<iframe src="${publicShareUrl}" width="100%" height="700" frameborder="0" allowfullscreen></iframe>`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Share Assessment
              </h3>
              <p className="text-[10px] text-slate-400">{quiz.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'link' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Direct Link
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'embed' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Embed Code
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'qr' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            QR Code
          </button>
        </div>

        {/* Link Tab */}
        {activeTab === 'link' && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Student / Public Assessment URL:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicShareUrl}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Share Code: <strong className="text-amber-600">{quiz.shareCode || quiz.id}</strong></span>
              <a
                href={publicShareUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-600 hover:underline flex items-center gap-1 font-bold"
              >
                Open in new tab <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Embed Tab */}
        {activeTab === 'embed' && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              HTML Iframe Embed Code:
            </label>
            <textarea
              readOnly
              rows={3}
              value={embedCode}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none select-all"
            />
            <button
              onClick={handleCopyEmbed}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedEmbed ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedEmbed ? 'Embed Code Copied to Clipboard' : 'Copy Embed Code'}
            </button>
          </div>
        )}

        {/* QR Code Tab */}
        {activeTab === 'qr' && (
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            {/* SVG Representation of QR Code pattern */}
            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
              <svg className="w-36 h-36" viewBox="0 0 100 100" fill="currentColor">
                {/* QR corner squares and data matrix pattern */}
                <rect x="10" y="10" width="25" height="25" fill="#1e293b" />
                <rect x="15" y="15" width="15" height="15" fill="#ffffff" />
                <rect x="18" y="18" width="9" height="9" fill="#1e293b" />
                
                <rect x="65" y="10" width="25" height="25" fill="#1e293b" />
                <rect x="70" y="15" width="15" height="15" fill="#ffffff" />
                <rect x="73" y="18" width="9" height="9" fill="#1e293b" />

                <rect x="10" y="65" width="25" height="25" fill="#1e293b" />
                <rect x="15" y="70" width="15" height="15" fill="#ffffff" />
                <rect x="18" y="73" width="9" height="9" fill="#1e293b" />

                {/* Random sample pixel matrix dots */}
                <rect x="42" y="15" width="6" height="6" fill="#1e293b" />
                <rect x="52" y="22" width="6" height="6" fill="#1e293b" />
                <rect x="42" y="32" width="6" height="6" fill="#1e293b" />
                <rect x="52" y="42" width="6" height="6" fill="#1e293b" />
                <rect x="25" y="45" width="6" height="6" fill="#1e293b" />
                <rect x="65" y="45" width="6" height="6" fill="#1e293b" />
                <rect x="75" y="55" width="6" height="6" fill="#1e293b" />
                <rect x="45" y="65" width="6" height="6" fill="#1e293b" />
                <rect x="55" y="75" width="6" height="6" fill="#1e293b" />
                <rect x="65" y="80" width="6" height="6" fill="#1e293b" />
                <rect x="78" y="75" width="6" height="6" fill="#1e293b" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500 text-center max-w-xs">
              Scan this QR code with any mobile device camera to launch this quiz instantly.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
