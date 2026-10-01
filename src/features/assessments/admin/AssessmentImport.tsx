import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

export interface AssessmentImportProps {
  onImportComplete?: (count: number) => void;
  className?: string;
}

export const AssessmentImport: React.FC<AssessmentImportProps> = ({
  onImportComplete,
  className = '',
}) => {
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'done'>('idle');

  const sampleRows = [
    { name: 'John Pierre', module: 'Pastoral Leadership', score: 92, date: '2026-09-12' },
    { name: 'Hannah Abbott', module: 'Biblical Hermeneutics', score: 88, date: '2026-09-12' },
    { name: 'Grace Emmanuel', module: 'Evangelism & Outreach', score: 84, date: '2026-09-11' },
    { name: 'Samuel Taylor', module: 'Pastoral Care', score: 79, date: '2026-09-10' },
  ];

  const handleExecuteImport = () => {
    setImportStatus('importing');
    setTimeout(() => {
      setImportStatus('done');
      onImportComplete?.(sampleRows.length);
    }, 800);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-base font-bold text-[var(--color-text)]">
          Import Assessment Records
        </h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          Ingest grade records from CSV spreadsheets, Google Classroom, or legacy archives.
        </p>
      </div>

      {!sampleLoaded ? (
        <Card className="p-8 text-center space-y-4 border-2 border-dashed border-[var(--color-border)]">
          <FileSpreadsheet className="h-10 w-10 text-[var(--color-primary)] mx-auto opacity-70" />
          <div>
            <h4 className="text-sm font-bold text-[var(--color-text)]">
              Drop CSV or Click to Load Assessment File
            </h4>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Required headers: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">Student Name, Module, Score, Date</code>
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSampleLoaded(true)}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              Load Sample Assessment CSV
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">
                4 Valid Rows Detected
              </Badge>
              <span className="text-xs text-[var(--color-text-muted)]">
                Ready for database ingestion
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSampleLoaded(false);
                setImportStatus('idle');
              }}
            >
              Reset
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] dark:border-slate-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-[var(--color-border)] text-slate-500 uppercase tracking-wider font-bold dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Student Name</th>
                  <th className="px-4 py-2.5">Module</th>
                  <th className="px-4 py-2.5">Score</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] dark:divide-slate-800">
                {sampleRows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-2.5 font-bold text-[var(--color-text)]">{row.name}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{row.module}</td>
                    <td className="px-4 py-2.5 font-bold text-emerald-600">{row.score}%</td>
                    <td className="px-4 py-2.5 text-slate-400">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {importStatus === 'done' ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> 4 records successfully imported!
              </span>
            ) : (
              <Button
                variant="primary"
                size="sm"
                isLoading={importStatus === 'importing'}
                onClick={handleExecuteImport}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Confirm & Import Records
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
