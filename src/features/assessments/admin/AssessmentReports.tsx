import React from 'react';
import { BarChart3, Download, Trophy, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { MetricCard } from '../../../components/ui/MetricCard';

export interface AssessmentReportsProps {
  onExportReport?: () => void;
  className?: string;
}

export const AssessmentReports: React.FC<AssessmentReportsProps> = ({
  onExportReport,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--color-text)]">
            Accreditation & Grade Analytics
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Cohort aggregate statistics for academic moderation and Ministry compliance.
          </p>
        </div>

        {onExportReport && (
          <Button
            size="sm"
            variant="outline"
            onClick={onExportReport}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export Audit PDF
          </Button>
        )}
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="High Distinction"
          value="24 Students"
          caption="Score ≥ 85% with regular attendance"
          icon={<Trophy className="h-5 w-5 text-amber-500" />}
          tone="accent"
        />

        <MetricCard
          label="Satisfactory Standing"
          value="15 Students"
          caption="Passing threshold (75%–84%)"
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
          tone="success"
        />

        <MetricCard
          label="At-Risk Academic Notice"
          value="3 Students"
          caption="Score < 75% or attendance warning"
          icon={<AlertTriangle className="h-5 w-5 text-rose-500" />}
          tone="danger"
        />
      </div>

      {/* Cohort Grade Distribution Card */}
      <Card className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          COHORT SCORE DISTRIBUTION (CLASS OF 2026)
        </h4>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between font-bold mb-1">
              <span>90% – 100% (Summa Cum Laude)</span>
              <span className="text-amber-600 font-black">14 students (33%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '33%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between font-bold mb-1">
              <span>80% – 89% (High Distinction)</span>
              <span className="text-sky-600 font-black">18 students (43%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: '43%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between font-bold mb-1">
              <span>75% – 79% (Satisfactory Passing)</span>
              <span className="text-emerald-600 font-black">7 students (17%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '17%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between font-bold mb-1">
              <span>&lt; 75% (Intervention Required)</span>
              <span className="text-rose-600 font-black">3 students (7%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: '7%' }} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
