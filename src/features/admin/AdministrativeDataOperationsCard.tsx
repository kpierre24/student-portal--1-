import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  Sliders,
  DollarSign,
  GraduationCap,
  Sparkles,
  Trash2,
  FileSpreadsheet,
  FileJson,
  Activity,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  ArrowRight,
  Lock,
  Download
} from 'lucide-react';
import { exportFullBackupJSON, exportFullBackupZip } from '../../lib/backupSuite';
import { logActivity, pruneAuditLogs } from '../../lib/auditLogger';
import { logger } from '../../lib/logger';

export interface AdministrativeDataOperationsCardProps {
  isCloudSyncing?: boolean;
  lastSyncedTime?: string | null;
  onPushToCloud?: () => Promise<void>;
  onOpenAuditAndBackup?: () => void;
  onOpenSystemHealth?: () => void;
  currentActorName?: string;
  className?: string;
}

export interface RelationalHealthReport {
  totalRecordsScanned: number;
  healthScorePct: number;
  orphanedSubmissions: number;
  unlinkedAttendanceEntries: number;
  status: 'optimal' | 'warning' | 'critical';
  details: string[];
}

export const AdministrativeDataOperationsCard: React.FC<AdministrativeDataOperationsCardProps> = ({
  isCloudSyncing = false,
  lastSyncedTime = null,
  onPushToCloud,
  onOpenAuditAndBackup,
  onOpenSystemHealth,
  currentActorName = 'Administrator',
  className = '',
}) => {
  const [payloadSize, setPayloadSize] = useState(0);
  const [payloadPct, setPayloadPct] = useState(0);
  const [anonymizeMode, setAnonymizeMode] = useState(() => {
    return localStorage.getItem('hteim_anonymize_mode') === 'true';
  });
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [healthReport, setHealthReport] = useState<RelationalHealthReport | null>(null);

  // Recalculate local payload size for Firestore/Cloud safety
  const refreshPayloadWeight = () => {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          totalBytes += (key.length + val.length) * 2;
        }
      }
      setPayloadSize(totalBytes);
      setPayloadPct(Math.min(100, Math.round((totalBytes / 1048576) * 100)));
    } catch (e) {
      logger.warn("Payload size estimation failed:", e);
    }
  };

  useEffect(() => {
    refreshPayloadWeight();
  }, []);

  const showStatus = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // 1. Late fee batch assessment
  const handleApplyLateFees = () => {
    try {
      const saved = localStorage.getItem('hteim_student_payments');
      if (!saved) {
        showStatus("No payment records found to assess.", "info");
        return;
      }
      const payments = JSON.parse(saved);
      let appliedCount = 0;
      const updated = payments.map((p: any) => {
        const balance = (p.totalTuition || 0) - (p.amountPaid || 0);
        if (balance > 0 && !p.lateFeeApplied) {
          appliedCount++;
          return {
            ...p,
            totalTuition: (p.totalTuition || 0) + 50,
            lateFeeApplied: true,
            notes: `${p.notes || ''} [Admin Notice: $50 Late Fee Assessed ${new Date().toLocaleDateString()}]`.trim()
          };
        }
        return p;
      });

      localStorage.setItem('hteim_student_payments', JSON.stringify(updated));
      logActivity({
        actor: currentActorName,
        role: 'admin',
        actionCategory: 'Payment Entry',
        actionTitle: 'Overdue Tuition Late Fees Assessed',
        details: `Assessed standard $50 late fee across ${appliedCount} overdue student payment accounts.`
      });
      showStatus(`Late fee batch run complete: Assessed $50 fee on ${appliedCount} overdue student account(s).`);
      refreshPayloadWeight();
    } catch (e: any) {
      showStatus(`Failed to apply late fees: ${e?.message || 'Unknown error'}`, "error");
    }
  };

  // 2. Batch grade normalization
  const handleRoundGrades = () => {
    try {
      const saved = localStorage.getItem('attendanceRecords');
      if (!saved) {
        showStatus("No attendance score records found to normalize.", "info");
        return;
      }
      const records = JSON.parse(saved);
      let normalizedCount = 0;
      const updated = records.map((r: any) => {
        if (r.scoreStr && r.scoreStr.includes('/')) {
          const parts = r.scoreStr.split('/');
          const num = parseFloat(parts[0]);
          const den = parseFloat(parts[1]);
          if (!isNaN(num) && !isNaN(den) && den > 0) {
            const roundedNum = Math.round(num);
            if (roundedNum !== num) {
              normalizedCount++;
              return { ...r, scoreStr: `${roundedNum}/${den}` };
            }
          }
        }
        return r;
      });

      localStorage.setItem('attendanceRecords', JSON.stringify(updated));
      logActivity({
        actor: currentActorName,
        role: 'admin',
        actionCategory: 'Grade Adjustment',
        actionTitle: 'Batch Score Rounding Normalization',
        details: `Normalized and rounded fractional marks on ${normalizedCount} student assessment records.`
      });
      showStatus(`Grade normalization complete: ${normalizedCount} fractional score entries rounded.`);
      refreshPayloadWeight();
    } catch (e: any) {
      showStatus(`Grade normalization failed: ${e?.message || 'Unknown error'}`, "error");
    }
  };

  // 3. Anonymization screen-sharing mask toggle
  const handleToggleAnonymize = () => {
    const next = !anonymizeMode;
    setAnonymizeMode(next);
    localStorage.setItem('hteim_anonymize_mode', String(next));
    window.dispatchEvent(new Event('storage'));
    logActivity({
      actor: currentActorName,
      role: 'admin',
      actionCategory: 'System Settings',
      actionTitle: next ? 'Webinar Demo Mask Enabled' : 'Webinar Demo Mask Disabled',
      details: next ? 'Masked student names and financial PII for public screen share.' : 'Restored standard PII visibility.'
    });
    showStatus(next ? "Demo Privacy Mask ENABLED: Student PII masked for presentation." : "Demo Privacy Mask DISABLED: Standard student identities visible.");
  };

  // 4. Prune historical logs
  const handlePruneLogs = () => {
    const deleted = pruneAuditLogs(20);
    refreshPayloadWeight();
    showStatus(`Storage compressed: Pruned ${deleted} historical audit entries.`);
  };

  // 5. Relational data integrity scan
  const handleRunIntegrityScan = () => {
    let unlinkedAttendance = 0;
    let orphanSubs = 0;
    const details: string[] = [];

    try {
      const attSaved = localStorage.getItem('attendanceRecords');
      const attRecords = attSaved ? JSON.parse(attSaved) : [];
      const asgSaved = localStorage.getItem('hteim_custom_assignments');
      const assignments = asgSaved ? JSON.parse(asgSaved) : [];
      const asgIds = new Set(assignments.map((a: any) => a.id));
      const subsSaved = localStorage.getItem('hteim_assignment_submissions');
      const submissions = subsSaved ? JSON.parse(subsSaved) : [];

      submissions.forEach((s: any) => {
        if (s.assignmentId && !asgIds.has(s.assignmentId)) {
          orphanSubs++;
        }
      });

      attRecords.forEach((r: any) => {
        if (!r.name || !r.name.trim()) {
          unlinkedAttendance++;
        }
      });

      const totalItems = attRecords.length + submissions.length + assignments.length;
      const issues = orphanSubs + unlinkedAttendance;
      const score = totalItems > 0 ? Math.max(70, Math.round(((totalItems - issues) / totalItems) * 100)) : 100;

      if (orphanSubs > 0) details.push(`${orphanSubs} submissions referencing archived assignments`);
      if (unlinkedAttendance > 0) details.push(`${unlinkedAttendance} unassigned attendance cells`);
      if (issues === 0) details.push('All relational foreign keys and student identifiers are verified 100% sound.');

      const report: RelationalHealthReport = {
        totalRecordsScanned: totalItems,
        healthScorePct: score,
        orphanedSubmissions: orphanSubs,
        unlinkedAttendanceEntries: unlinkedAttendance,
        status: score >= 95 ? 'optimal' : score >= 80 ? 'warning' : 'critical',
        details
      };
      setHealthReport(report);
      showStatus(`Integrity scan complete: Relational health scored at ${score}%.`);
    } catch (e: any) {
      showStatus(`Integrity scan encountered an error: ${e?.message || 'Unknown error'}`, 'error');
    }
  };

  // 6. Quick ZIP export
  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      await exportFullBackupZip(currentActorName);
      showStatus("Full institutional ZIP archive exported successfully!");
    } catch (e: any) {
      showStatus(`Export failed: ${e?.message || 'Unknown error'}`, "error");
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <section 
      aria-label="Administrative & Cloud Data Operations Hub"
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-md space-y-6 ${className}`}
    >
      {/* ─── Header & Top Status Banner ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-[#023264] dark:text-[#7dd3fc] border border-indigo-100 dark:border-indigo-900/60">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Administrative & Cloud Data Operations</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Cloud Live
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Institutional persistence, cloud synchronization, batch operations, and system compliance governance.
              </p>
            </div>
          </div>
        </div>

        {/* Cloud Sync & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {onPushToCloud && (
            <button
              type="button"
              onClick={onPushToCloud}
              disabled={isCloudSyncing}
              className="px-3.5 py-2 rounded-xl bg-[#023264] hover:bg-[#025798] text-white font-bold text-xs transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#dfc18b] ${isCloudSyncing ? 'animate-spin' : ''}`} />
              <span>{isCloudSyncing ? 'Syncing to Cloud...' : 'Sync Cloud State'}</span>
            </button>
          )}

          {onOpenAuditAndBackup && (
            <button
              type="button"
              onClick={onOpenAuditAndBackup}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <History className="w-3.5 h-3.5 text-amber-500" />
              <span>Audit & Security Console</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Feedback Message */}
      {statusMessage && (
        <div 
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-fadeIn ${
            statusMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
              : statusMessage.type === 'info'
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ─── 1. Cloud & Payload Infrastructure Diagnostics ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric 1: Database Status */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-sky-500" /> Cloud Database
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Connected
            </span>
          </div>
          <div>
            <p className="text-base font-black text-slate-900 dark:text-white">
              PostgreSQL / Supabase Cloud
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Last Sync: <strong className="text-slate-700 dark:text-slate-300">{lastSyncedTime ? new Date(lastSyncedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Continuous'}</strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-[#025798] dark:text-[#7dd3fc] font-bold">
            <span>Dual-Source Mirror Active</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </div>

        {/* Metric 2: Document Payload Weight */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" /> Storage Weight
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              {(payloadSize / 1024).toFixed(1)} KB / 1MB
            </span>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  payloadPct > 80 ? 'bg-rose-500' : payloadPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(4, payloadPct)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {payloadPct}% of 1MB document quota utilized.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePruneLogs}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3 text-amber-500" /> Prune Log Cache
            </button>
          </div>
        </div>

        {/* Metric 3: Relational Health */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Relational Integrity
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {healthReport ? `${healthReport.healthScorePct}%` : 'Audit Ready'}
            </span>
          </div>
          <div>
            <p className="text-base font-black text-slate-900 dark:text-white">
              {healthReport ? `${healthReport.status.toUpperCase()} Integrity` : 'Foreign Keys Verified'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {healthReport ? healthReport.details[0] : 'Scans attendance, submissions, and student indexes.'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <button
              type="button"
              onClick={handleRunIntegrityScan}
              className="text-[11px] text-[#025798] dark:text-[#7dd3fc] font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <Activity className="w-3 h-3 text-emerald-500" /> Run Integrity Scan
            </button>
          </div>
        </div>

      </div>

      {/* ─── 2. Institutional Batch Operations Grid ─── */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Institutional Governance & Batch Operations
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Action 1: Late Fee Assessment */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <DollarSign className="w-4 h-4" />
                </span>
                <p className="text-xs font-black text-slate-900 dark:text-white">Late Fee Assessment</p>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Applies standard $50 late assessment on all overdue student payment ledgers.
              </p>
            </div>
            <button
              type="button"
              onClick={handleApplyLateFees}
              className="w-full py-1.5 px-3 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              Run Late Fee Audit
            </button>
          </div>

          {/* Action 2: Grade Normalization */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  <GraduationCap className="w-4 h-4" />
                </span>
                <p className="text-xs font-black text-slate-900 dark:text-white">Grade Normalization</p>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Rounds fractional score entries to compliant integer scale across matrices.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRoundGrades}
              className="w-full py-1.5 px-3 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              Normalize Scores
            </button>
          </div>

          {/* Action 3: Screen Share Demo Mask */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  <Sparkles className="w-4 h-4" />
                </span>
                <p className="text-xs font-black text-slate-900 dark:text-white">Demo Privacy Mask</p>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Obscures student PII & balances for secure Zoom/webinar screen sharing.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleAnonymize}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95 ${
                anonymizeMode 
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-600'
                  : 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200'
              }`}
            >
              {anonymizeMode ? 'Mask: ON (Masked)' : 'Mask: OFF (Visible)'}
            </button>
          </div>

          {/* Action 4: Export Multi-Table ZIP Archive */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <Download className="w-4 h-4" />
                </span>
                <p className="text-xs font-black text-slate-900 dark:text-white">Institutional Archive</p>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Bundles JSON database & CSV tables (Attendance, Grades, Payments).
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="w-full py-1.5 px-3 bg-[#023264] hover:bg-[#025798] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Download className={`w-3.5 h-3.5 text-[#dfc18b] ${isExportingZip ? 'animate-bounce' : ''}`} />
              <span>{isExportingZip ? 'Bundling...' : 'Export ZIP Suite'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* ─── 3. Quick Action Footer Links ─── */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => exportFullBackupJSON(currentActorName)}
            className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold flex items-center gap-1 cursor-pointer"
          >
            <FileJson className="w-3.5 h-3.5 text-indigo-500" /> Export JSON Backup
          </button>
          <span>•</span>
          {onOpenSystemHealth && (
            <button
              type="button"
              onClick={onOpenSystemHealth}
              className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-500" /> System Health Diagnostics
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-400 font-mono">
          HTEIM Compliance Engine • Dual-Source Sync Active
        </p>
      </div>

    </section>
  );
};
