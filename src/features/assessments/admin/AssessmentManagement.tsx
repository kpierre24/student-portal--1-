import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  RefreshCw, 
  History, 
  Sliders, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

export interface AssessmentManagementProps {
  onImportCsv?: () => void;
  onExportGrades?: () => void;
  onSyncGoogleSheets?: () => void;
  onRunBulkOperation?: (operation: string) => void;
  className?: string;
}

export const AssessmentManagement: React.FC<AssessmentManagementProps> = ({
  onImportCsv,
  onExportGrades,
  onSyncGoogleSheets,
  onRunBulkOperation,
  className = '',
}) => {
  const [activeSection, setActiveSection] = useState<
    'imports' | 'exports' | 'bulk' | 'sheets' | 'audit' | 'config'
  >('sheets');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      onSyncGoogleSheets?.();
      setTimeout(() => setSyncSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-base font-black text-[var(--color-text)] dark:text-slate-100 font-sans">
          Manage Assessments & Institutional Operations
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Administrative control center for bulk data ingestion, spreadsheets, accreditation exports, and grading policy.
        </p>
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)]/60 pb-3">
        {[
          { id: 'sheets', label: 'Google Sheets & Sync', icon: <RefreshCw className="h-3.5 w-3.5" /> },
          { id: 'imports', label: 'CSV / Data Import', icon: <Upload className="h-3.5 w-3.5" /> },
          { id: 'exports', label: 'Official Exports', icon: <Download className="h-3.5 w-3.5" /> },
          { id: 'bulk', label: 'Bulk Operations', icon: <Layers className="h-3.5 w-3.5" /> },
          { id: 'audit', label: 'Audit Log', icon: <History className="h-3.5 w-3.5" /> },
          { id: 'config', label: 'Grading Config', icon: <Sliders className="h-3.5 w-3.5" /> },
        ].map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id as any)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === sec.id
                ? 'bg-[var(--color-primary)] text-white shadow-xs dark:bg-sky-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {sec.icon}
            <span>{sec.label}</span>
          </button>
        ))}
      </div>

      {/* Progressive Disclosure Panels */}

      {/* 1. Google Sheets & Cloud Sync */}
      {activeSection === 'sheets' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[var(--color-text)]">
                Dual-Source Google Sheets Synchronization
              </h4>
              <p className="text-xs text-[var(--color-text-muted)]">
                Synchronizes student roster scores with the external master spreadsheet. Local overrides are safely preserved.
              </p>
            </div>
            <Badge variant="success" size="sm">
              Live Connected
            </Badge>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 text-xs dark:bg-slate-900/50 space-y-2 border border-[var(--color-border)]/60">
            <div className="flex justify-between font-semibold">
              <span className="text-[var(--color-text-muted)]">Source URL:</span>
              <span className="font-mono text-sky-700 dark:text-sky-300 truncate max-w-xs">
                https://docs.google.com/spreadsheets/d/...
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-[var(--color-text-muted)]">Merge Policy:</span>
              <span className="text-[var(--color-text)]">Manual Preserved (Default)</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-[var(--color-text-muted)]">Last Sync Status:</span>
              <span className="text-emerald-600">All 42 records verified</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {syncSuccess && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Synchronized successfully
              </span>
            )}
            <Button
              variant="primary"
              size="sm"
              isLoading={isSyncing}
              onClick={handleSync}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Sync With Google Sheets
            </Button>
          </div>
        </Card>
      )}

      {/* 2. CSV / Data Import */}
      {activeSection === 'imports' && (
        <Card className="space-y-4">
          <h4 className="text-sm font-bold text-[var(--color-text)]">
            Upload & Ingest External CSV Grade Files
          </h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            Upload student score files formatted as CSV (Columns: Student Name, Module, Score, Date).
          </p>

          <div className="border-2 border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/30 hover:border-[var(--color-primary)] transition-colors cursor-pointer">
            <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-[var(--color-text)]">
              Click to select or drag and drop your .csv score file
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
              Supports UTF-8 CSV exports from Excel, Canvas, and Google Classroom.
            </p>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onImportCsv}>
              Parse & Validate Sample Data
            </Button>
          </div>
        </Card>
      )}

      {/* 3. Official Exports */}
      {activeSection === 'exports' && (
        <Card className="space-y-4">
          <h4 className="text-sm font-bold text-[var(--color-text)]">
            Accreditation & Registrar Grade Exports
          </h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            Generate compliant academic records for graduation clearance and archival.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--color-border)] p-3.5 space-y-2">
              <h5 className="text-xs font-bold text-[var(--color-text)]">
                Master Cohort Grade Matrix (CSV)
              </h5>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Includes all student names, module scores, attendance rates, and honors rankings.
              </p>
              <Button size="sm" variant="outline" onClick={onExportGrades} leftIcon={<Download className="h-3 w-3" />}>
                Export CSV
              </Button>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] p-3.5 space-y-2">
              <h5 className="text-xs font-bold text-[var(--color-text)]">
                Graduation Clearance Roster (PDF)
              </h5>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Formatted transcript summaries with official HTEIM seal and signature blocks.
              </p>
              <Button size="sm" variant="outline" onClick={onExportGrades} leftIcon={<Download className="h-3 w-3" />}>
                Export PDF
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Bulk Operations */}
      {activeSection === 'bulk' && (
        <Card className="space-y-4">
          <h4 className="text-sm font-bold text-[var(--color-text)]">
            Cohort-Wide Bulk Operations
          </h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            Perform batch updates across all 42 registered ministry students.
          </p>

          <div className="space-y-2">
            {[
              {
                id: 'publish_all',
                title: 'Publish All Draft Quizzes',
                desc: 'Make all pending module assessments live for student access immediately.',
              },
              {
                id: 'finalize_grades',
                title: 'Lock Gradebook for Term 1',
                desc: 'Prevent further modifications to Term 1 modules without administrative override.',
              },
              {
                id: 'recalc_averages',
                title: 'Recalculate Honors & At-Risk Standings',
                desc: 'Update weighted GPAs based on latest submitted attendance and assignment scores.',
              },
            ].map((op) => (
              <div
                key={op.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] bg-slate-50/50 dark:bg-slate-800/40"
              >
                <div>
                  <h5 className="text-xs font-bold text-[var(--color-text)]">{op.title}</h5>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{op.desc}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRunBulkOperation?.(op.id)}
                >
                  Execute
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 5. Audit Log */}
      {activeSection === 'audit' && (
        <Card className="space-y-3">
          <h4 className="text-sm font-bold text-[var(--color-text)]">
            Academic Assessment Audit Trail
          </h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            Immutable log of score entries, grade adjustments, and teacher approvals.
          </p>

          <div className="divide-y divide-[var(--color-border)]/60 text-xs">
            {[
              { user: 'Senior Pastor Pierre', action: 'Approved final exam score (94%) for student John Pierre', time: '2 hours ago' },
              { user: 'Faculty Assistant', action: 'Synchronized Google Sheets quiz matrix', time: '5 hours ago' },
              { user: 'Academic Registrar', action: 'Exported official cohort graduation roster', time: 'Yesterday' },
            ].map((log, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[var(--color-text)]">{log.user}: </span>
                  <span className="text-[var(--color-text-muted)]">{log.action}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 ml-4">{log.time}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 6. Grading Configuration */}
      {activeSection === 'config' && (
        <Card className="space-y-4">
          <h4 className="text-sm font-bold text-[var(--color-text)]">
            Curriculum Grading Scale & Thresholds
          </h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            Standard thresholds adhering to School of Ministry academic policies.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:bg-amber-950/20 dark:border-amber-900">
              <span className="font-bold text-amber-800 dark:text-amber-300 block">Honor Roll Distinction</span>
              <span className="text-lg font-black text-amber-900 dark:text-amber-200 block mt-1">≥ 85%</span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400">Requires ≥75% attendance</span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:bg-emerald-950/20 dark:border-emerald-900">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block">Satisfactory Passing</span>
              <span className="text-lg font-black text-emerald-900 dark:text-emerald-200 block mt-1">≥ 75%</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Standard graduation threshold</span>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:bg-rose-950/20 dark:border-rose-900">
              <span className="font-bold text-rose-800 dark:text-rose-300 block">At-Risk Intervention</span>
              <span className="text-lg font-black text-rose-900 dark:text-rose-200 block mt-1">&lt; 75%</span>
              <span className="text-[10px] text-rose-700 dark:text-rose-400">Triggers faculty alert notice</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
