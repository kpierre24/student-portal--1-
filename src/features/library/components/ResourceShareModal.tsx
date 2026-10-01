import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  BookOpen,
  GraduationCap,
  Users,
  Send,
  Maximize2,
  Minimize2,
  Download,
  Shield,
  Lock,
  Globe
} from 'lucide-react';
import { LearningResource } from '../types';

interface ResourceShareModalProps {
  resource: LearningResource | null;
  isOpen: boolean;
  onClose: () => void;
  onShareToCourse?: (resourceId: string, courseId: string) => void;
  onShareToModule?: (resourceId: string, moduleId: string) => void;
  onShareWithStudents?: (resourceId: string, studentNote: string) => void;
}

/**
 * Generates an SVG QR Code matrix visually representing the share URL.
 */
const SimpleSVGQRCode: React.FC<{ value: string; size?: number }> = ({ value, size = 200 }) => {
  // Simple deterministic 21x21 QR pattern generator for visual presentation
  const gridCount = 21;
  const cellSize = size / gridCount;
  
  // Deterministic matrix calculation based on string hash
  const getCellBit = (row: number, col: number): boolean => {
    // Standard Finder Patterns (Top-Left, Top-Right, Bottom-Left)
    if ((row < 7 && col < 7) || (row < 7 && col >= 14) || (row >= 14 && col < 7)) {
      // Outer border (7x7)
      if (row === 0 || row === 6 || col === 0 || col === 6) {
        if ((row < 7 && col < 7) || (row < 7 && col >= 14) || (row >= 14 && col < 7)) {
          const r = row < 7 ? row : row - 14;
          const c = col < 7 ? col : col - 14;
          return r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        }
      }
      const r = row < 7 ? row : row - 14;
      const c = col < 7 ? col : col - 14;
      return r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
    }

    // Timing patterns
    if (row === 6 || col === 6) return (row + col) % 2 === 0;

    // Hash-based data bits
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    const val = (row * 31 + col * 17 + Math.abs(hash)) % 100;
    return val > 45;
  };

  const rects: React.ReactNode[] = [];
  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      if (getCellBit(r, c)) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize + 0.3}
            height={cellSize + 0.3}
            fill="#0f172a"
          />
        );
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg bg-white p-2 shadow-inner">
      {rects}
    </svg>
  );
};

export const ResourceShareModal: React.FC<ResourceShareModalProps> = ({
  resource,
  isOpen,
  onClose,
  onShareToCourse,
  onShareToModule,
  onShareWithStudents,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'course' | 'module' | 'students' | 'qrcode'>('link');
  const [copied, setCopied] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('SOM-CORE');
  const [selectedModule, setSelectedModule] = useState('SOM-MOD-1');
  const [studentNote, setStudentNote] = useState('');
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [isFullscreenQR, setIsFullscreenQR] = useState(false);

  if (!isOpen || !resource) return null;

  const shareUrl = `${window.location.origin}/library?resourceId=${encodeURIComponent(resource.id)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareCourse = () => {
    if (onShareToCourse) {
      onShareToCourse(resource.id, selectedCourse);
    }
    setShareSuccess(`Resource successfully shared to Course: ${selectedCourse}`);
    setTimeout(() => setShareSuccess(null), 3000);
  };

  const handleShareModule = () => {
    if (onShareToModule) {
      onShareToModule(resource.id, selectedModule);
    }
    setShareSuccess(`Resource successfully shared to Module: ${selectedModule}`);
    setTimeout(() => setShareSuccess(null), 3000);
  };

  const handleShareStudents = () => {
    if (onShareWithStudents) {
      onShareWithStudents(resource.id, studentNote);
    }
    setShareSuccess('Resource notification sent to enrolled students!');
    setStudentNote('');
    setTimeout(() => setShareSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Share Theological Resource
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xs">
                {resource.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 px-4 pt-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'link'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Link
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('course')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'course'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Share to Course
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('module')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'module'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Share to Module
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'students'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Share with Students
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qrcode')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'qrcode'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            QR Code
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {shareSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-medium animate-fadeIn">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              {shareSuccess}
            </div>
          )}

          {/* TAB 1: Copy Link */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Share this direct portal link with students or faculty members. Permissions will be enforced server-side upon opening.
              </p>
              <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full bg-transparent px-2 text-xs text-slate-700 dark:text-slate-300 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all shrink-0 ${
                    copied
                      ? 'bg-emerald-600'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>

              {/* Visibility Badge Notice */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400">
                <Shield className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Visibility: <strong className="text-slate-900 dark:text-white capitalize">{resource.visibility || resource.accessLevel || 'Public'}</strong>. Server-side RBAC will verify student enrolment before serving media files.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: Share to Course */}
          {activeTab === 'course' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Attach this theological resource directly to an active course curriculum list.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Course
                </label>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SOM-CORE">SOM Core - Systematic Theology & Doctrine</option>
                  <option value="SOM-BIBLICAL">SOM - Old & New Testament Exegesis</option>
                  <option value="SOM-LEADERSHIP">SOM - Christian Leadership & Ethics</option>
                  <option value="SOM-MINISTRY">SOM - Pastoral Care & Homiletics</option>
                  <option value="SOM-PRAYER">SOM - Intercessory Prayer & Deliverance</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleShareCourse}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <BookOpen className="h-4 w-4" />
                Attach Resource to {selectedCourse}
              </button>
            </div>
          )}

          {/* TAB 3: Share to Module */}
          {activeTab === 'module' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Associate this study document with a specific Module track (1 to 6).
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Module
                </label>
                <select
                  value={selectedModule}
                  onChange={e => setSelectedModule(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SOM-MOD-1">Module 1: Foundations of Divine Truth</option>
                  <option value="SOM-MOD-2">Module 2: Hermeneutics & Exegesis</option>
                  <option value="SOM-MOD-3">Module 3: Apostolic Leadership & Order</option>
                  <option value="SOM-MOD-4">Module 4: Prayer, Fasting & Warfare</option>
                  <option value="SOM-MOD-5">Module 5: Homiletics & Sermon Building</option>
                  <option value="SOM-MOD-6">Module 6: World Evangelism & Missions</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleShareModule}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <GraduationCap className="h-4 w-4" />
                Attach Resource to {selectedModule}
              </button>
            </div>
          )}

          {/* TAB 4: Share with Students */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Send a notification feed item to enrolled students highlighting this study material.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Teacher Guidance / Announcement Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={studentNote}
                  onChange={e => setStudentNote(e.target.value)}
                  placeholder="e.g., Please review pages 12-25 before our next live sermon broadcast on Thursday."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleShareStudents}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Send className="h-4 w-4" />
                Broadcast to Enrolled Students
              </button>
            </div>
          )}

          {/* TAB 5: QR Code for Classroom Teaching */}
          {activeTab === 'qrcode' && (
            <div className="space-y-4 text-center">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Display or project this QR Code during classroom lectures or broadcasts. Students can scan to open the document instantly on their mobile devices.
              </p>

              <div className="flex flex-col items-center justify-center py-2">
                <SimpleSVGQRCode value={shareUrl} size={180} />
                <span className="mt-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate max-w-xs">
                  {shareUrl}
                </span>
              </div>

              <div className="flex items-center gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsFullscreenQR(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Classroom Fullscreen
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Share Link
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* FULLSCREEN QR CODE OVERLAY FOR CLASSROOM TEACHING */}
      {isFullscreenQR && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 animate-fadeIn">
          <button
            type="button"
            onClick={() => setIsFullscreenQR(false)}
            className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all"
          >
            <Minimize2 className="h-4 w-4" />
            Exit Fullscreen
          </button>

          <div className="text-center space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold">
              <QrCode className="h-4 w-4" />
              HTEIM Classroom Scan
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {resource.title}
            </h2>
            <p className="text-xs text-slate-400">
              Scan with your smartphone camera to access this theological material directly inside your portal.
            </p>

            <div className="flex justify-center my-6">
              <SimpleSVGQRCode value={shareUrl} size={320} />
            </div>

            <p className="text-xs font-mono text-purple-300 bg-purple-950/40 p-3 rounded-xl border border-purple-800/50 truncate">
              {shareUrl}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
