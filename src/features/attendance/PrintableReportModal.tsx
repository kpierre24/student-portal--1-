import React, { useState } from 'react';
import { FileText, Download, Printer, X, Filter, Search, AlertCircle } from 'lucide-react';
import { LogoImage } from '../../components/LogoImage';

export interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  uniqueStudents: any[];
  effectiveClassDays: any[];
  atRiskThreshold: number;
  satisfactoryThreshold: number;
  isGeneratingPDF: boolean;
  handleExportPDF: (elementId: string, fileName: string) => void;
  selectedReportAttendanceFilter: 'all' | 'fifty_percent' | 'at_risk' | 'satisfactory';
  setSelectedReportAttendanceFilter: React.Dispatch<React.SetStateAction<'all' | 'fifty_percent' | 'at_risk' | 'satisfactory'>>;
}

export function PrintableReportModal({
  isOpen,
  onClose,
  uniqueStudents,
  effectiveClassDays,
  atRiskThreshold,
  satisfactoryThreshold,
  isGeneratingPDF,
  handleExportPDF,
  selectedReportAttendanceFilter,
  setSelectedReportAttendanceFilter,
}: PrintableReportModalProps) {
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportSortBy, setReportSortBy] = useState<'name' | 'rate' | 'score'>('name');
  const [reportSortDir, setReportSortDir] = useState<'asc' | 'desc'>('asc');
  const [reportViewDetailMode, setReportViewDetailMode] = useState<'compact' | 'detailed'>('compact');

  if (!isOpen) return null;

  // Filter by Attendance Status only
  let reportStudents = uniqueStudents;
  
  if (selectedReportAttendanceFilter === 'fifty_percent') {
    reportStudents = reportStudents.filter(s => s.rate <= 50);
  } else if (selectedReportAttendanceFilter === 'at_risk') {
    reportStudents = reportStudents.filter(s => s.rate < atRiskThreshold);
  } else if (selectedReportAttendanceFilter === 'satisfactory') {
    reportStudents = reportStudents.filter(s => s.rate >= satisfactoryThreshold);
  }

  if (reportSearchQuery.trim()) {
    const q = reportSearchQuery.toLowerCase().trim();
    reportStudents = reportStudents.filter(s => 
      s.name.toLowerCase().includes(q) || (s.note && s.note.toLowerCase().includes(q))
    );
  }

  // Apply sorting
  reportStudents = [...reportStudents].sort((a, b) => {
    let comp = 0;
    if (reportSortBy === 'name') {
      comp = a.name.localeCompare(b.name);
    } else if (reportSortBy === 'rate') {
      comp = a.rate - b.rate;
    } else if (reportSortBy === 'score') {
      const scoreA = a.avgScore ?? -1;
      const scoreB = b.avgScore ?? -1;
      comp = scoreA - scoreB;
    }
    return reportSortDir === 'asc' ? comp : -comp;
  });
  
  let filterSuffix = '';
  if (selectedReportAttendanceFilter === 'fifty_percent') {
    filterSuffix = ' (Low Attendance: \u2264 50%)';
  } else if (selectedReportAttendanceFilter === 'at_risk') {
    filterSuffix = ' (At Risk)';
  } else if (selectedReportAttendanceFilter === 'satisfactory') {
    filterSuffix = ' (Satisfactory Standing)';
  }

  const reportTitle = `School of Ministry Academic Attendance & Evaluation Report${filterSuffix}`;

  const reportAvgRate = reportStudents.length > 0 
    ? reportStudents.reduce((acc, s) => acc + s.rate, 0) / reportStudents.length 
    : 0;

  const scoresWithValues = reportStudents.map(s => s.avgScore).filter((s): s is number => s !== null);
  const reportAvgScore = scoresWithValues.length > 0
    ? scoresWithValues.reduce((a, b) => a + b, 0) / scoresWithValues.length
    : null;

  const atRiskInReport = reportStudents.filter(s => s.rate < atRiskThreshold);
  const fiftyPercentInReport = reportStudents.filter(s => s.rate <= 50);

  const handleHeaderSort = (field: 'name' | 'rate' | 'score') => {
    if (reportSortBy === field) {
      setReportSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setReportSortBy(field);
      setReportSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Report Header Toolbar */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-extrabold leading-tight">Academic Attendance Report</h2>
              <p className="text-[11px] text-slate-400">
                Overall student attendance and grading roster
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportPDF('printable-report', `HTEIM_Attendance_Report_${selectedReportAttendanceFilter}.pdf`)}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Export high-definition PDF document for selected filters"
            >
              <Download className={`w-3.5 h-3.5 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-slate-700"
              title="Print or save via browser print dialog"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Advanced Filter & Search Sub-Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          {/* Attendance Criteria Row */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 mr-1.5 flex items-center gap-1 flex-shrink-0">
              <Filter className="w-3 h-3 text-purple-600" /> Filter:
            </span>
            <button
              onClick={() => setSelectedReportAttendanceFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedReportAttendanceFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setSelectedReportAttendanceFilter('fifty_percent')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                selectedReportAttendanceFilter === 'fifty_percent'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
              }`}
            >
              <span>Low (&le;50%)</span>
              <span className="opacity-75 font-mono text-[10px]">
                ({uniqueStudents.filter(s => s.rate <= 50).length})
              </span>
            </button>
            <button
              onClick={() => setSelectedReportAttendanceFilter('at_risk')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                selectedReportAttendanceFilter === 'at_risk'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <span>At-Risk Students</span>
              <span className="opacity-75 font-mono text-[10px]">
                ({uniqueStudents.filter(s => s.rate < atRiskThreshold).length})
              </span>
            </button>
            <button
              onClick={() => setSelectedReportAttendanceFilter('satisfactory')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                selectedReportAttendanceFilter === 'satisfactory'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <span>Satisfactory Standing</span>
              <span className="opacity-75 font-mono text-[10px]">
                ({uniqueStudents.filter(s => s.rate >= satisfactoryThreshold).length})
              </span>
            </button>
          </div>

          {/* Quick Search in Report */}
          <div className="relative flex-1 min-w-[200px] max-w-[280px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={reportSearchQuery}
              onChange={(e) => setReportSearchQuery(e.target.value)}
              placeholder="Search roster..."
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-hidden focus:border-indigo-500 shadow-2xs"
            />
            {reportSearchQuery && (
              <button
                onClick={() => setReportSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Report Document Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6 text-slate-800 print-container" id="printable-report">
          {/* Document Header with HTEIM Logo & Ministry Letterhead */}
          <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <LogoImage 
                alt="HTEIM School of Ministry Logo" 
                className="w-16 h-16 rounded-full border border-amber-500 shadow-md object-contain bg-white p-0.5 flex-shrink-0"
              />
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">HTEIM SCHOOL OF MINISTRY</h1>
                <p className="text-xs font-bold text-amber-900 tracking-wide">HEAVEN TOUCHING EARTH INT'L MINISTRIES</p>
                <p className="text-[11px] italic font-serif text-slate-600 mt-0.5">"Bringing Heaven to Earth, Taking People to Heaven"</p>
                <div className="mt-1.5 inline-block px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-extrabold uppercase tracking-wider rounded-lg shadow-2xs">
                  {reportTitle}
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-600 font-mono space-y-0.5">
              <p className="font-sans font-bold text-slate-800">{new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}</p>
              <p>Evaluated Sessions: <strong className="text-slate-900">{effectiveClassDays.length}</strong></p>
              <p>Students in Report: <strong className="text-slate-900">{reportStudents.length}</strong></p>
            </div>
          </div>

          {/* KPI Summary Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Avg Attendance Rate</p>
              <p className="text-2xl font-mono font-bold text-emerald-600 mt-1">{Math.round(reportAvgRate)}%</p>
            </div>
            {reportAvgScore !== null && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Avg Evaluation Score</p>
                <p className="text-2xl font-mono font-bold text-amber-600 mt-1">{Math.round(reportAvgScore)}%</p>
              </div>
            )}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">At-Risk Students</p>
              <p className="text-2xl font-mono font-bold text-rose-600 mt-1">
                {atRiskInReport.length}
              </p>
            </div>
          </div>

          {/* At Risk List Callout */}
          {atRiskInReport.length > 0 && selectedReportAttendanceFilter !== 'fifty_percent' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <h3 className="text-xs font-bold uppercase text-rose-800 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                At-Risk Students (Attendance Follow-Up)
              </h3>
              <div className="flex flex-wrap gap-2">
                {atRiskInReport.map((st, i) => (
                  <span key={i} className="px-2.5 py-1 bg-white border border-rose-200 rounded-md text-xs font-semibold text-rose-800 shadow-2xs flex items-center gap-1.5">
                    <span>{st.name}</span>
                    <span className="font-mono font-bold">({Math.round(st.rate)}%)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Critical Low Attendance (<=50%) Callout */}
          {fiftyPercentInReport.length > 0 && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <h3 className="text-xs font-bold uppercase text-purple-900 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                Critical Low Attendance (&le;50% Attendance) - Academic Standing Warning
              </h3>
              <p className="text-[11px] text-purple-700 mb-2.5">
                The following students have attended 50% or fewer of the overall academic sessions and may require academic module recovery or attendance counseling.
              </p>
              <div className="flex flex-wrap gap-2">
                {fiftyPercentInReport.map((st, i) => (
                  <span key={i} className="px-2.5 py-1 bg-white border border-purple-200 rounded-md text-xs font-semibold text-purple-800 shadow-2xs flex items-center gap-1.5">
                    <span>{st.name}</span>
                    <span className="font-mono font-bold">({Math.round(st.rate)}%)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Student Table for Selected Level */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Student Roster ({reportStudents.length})
                </h3>
                <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setReportViewDetailMode('compact')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      reportViewDetailMode === 'compact' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Compact Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportViewDetailMode('detailed')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      reportViewDetailMode === 'detailed' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Detailed Session Grid
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium italic">
                Click headers to sort column values
              </p>
            </div>

            {reportStudents.length > 0 ? (
              reportViewDetailMode === 'compact' ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-700">
                    <th 
                      onClick={() => handleHeaderSort('name')}
                      className="p-2 font-bold cursor-pointer hover:bg-slate-200 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        Student Name
                        {reportSortBy === 'name' && (
                          <span className="text-indigo-600 font-extrabold">{reportSortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="p-2 font-bold text-center">Attended / Total</th>
                    <th 
                      onClick={() => handleHeaderSort('rate')}
                      className="p-2 font-bold text-center cursor-pointer hover:bg-slate-200 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Attendance %
                        {reportSortBy === 'rate' && (
                          <span className="text-indigo-600 font-extrabold">{reportSortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleHeaderSort('score')}
                      className="p-2 font-bold text-center cursor-pointer hover:bg-slate-200 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Avg Score
                        {reportSortBy === 'score' && (
                          <span className="text-indigo-600 font-extrabold">{reportSortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="p-2 font-bold">Notes / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportStudents.map((st, idx) => {
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="p-2 font-bold text-slate-900">{st.name}</td>
                        <td className="p-2 text-center font-mono">{st.attended} / {effectiveClassDays.length}</td>
                        <td className="p-2 text-center font-mono font-bold">
                          <span className={st.rate >= satisfactoryThreshold ? 'text-emerald-700' : st.rate >= atRiskThreshold ? 'text-amber-700' : 'text-rose-700'}>
                            {Math.round(st.rate)}%
                          </span>
                        </td>
                        <td className="p-2 text-center font-mono">
                          {st.avgScore !== null ? `${Math.round(st.avgScore)}%` : '—'}
                        </td>
                        <td className="p-2 text-slate-600 italic">
                          {st.note || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              ) : (
                /* Detailed Session Grid View */
                <div className="overflow-x-auto custom-scrollbar border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-700">
                        <th className="p-2 font-bold sticky left-0 bg-slate-100 z-10 w-48 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">Student Name</th>
                        {effectiveClassDays.map((day, dIdx) => (
                          <th key={`rep-th-day-${day.id || 'day'}-${dIdx}`} className="p-2 font-bold text-center border-r border-slate-200 min-w-[70px]">
                            {day.name.substring(0, 8)}
                          </th>
                        ))}
                        <th className="p-2 font-bold text-center bg-slate-200/80 min-w-[75px]">Rate %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportStudents.map((st, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="p-2 font-bold text-slate-900 sticky left-0 bg-white z-10 shadow-[1px_0_3px_rgba(0,0,0,0.05)] truncate max-w-[192px]">
                            {st.name}
                          </td>
                          {effectiveClassDays.map((day, dIdx) => {
                            const attendance = st.attendanceByDay[day.id];
                            const isPresent = attendance?.present;
                            return (
                              <td key={`rep-td-day-${day.id || 'day'}-${dIdx}`} className="p-1.5 text-center border-r border-slate-100 font-bold font-mono">
                                {isPresent ? (
                                  <span className="text-emerald-600">✓</span>
                                ) : (
                                  <span className="text-rose-500">✗</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-mono font-bold bg-slate-50">
                            <span className={st.rate >= satisfactoryThreshold ? 'text-emerald-700' : st.rate >= atRiskThreshold ? 'text-amber-700' : 'text-rose-700'}>
                              {Math.round(st.rate)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                No students match the selected attendance filter criteria.
              </div>
            )}
          </div>

          {/* Report Footer & Official Seal */}
          <div className="pt-6 mt-6 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[10px]">
            <div className="flex items-center gap-2">
              <LogoImage alt="HTEIM Logo" className="w-6 h-6 rounded-full border border-amber-400 p-0.5 object-contain bg-white" />
              <span className="font-bold text-slate-700">HTEIM School of Ministry</span>
              <span>•</span>
              <span>Heaven Touching Earth Int'l Ministries</span>
            </div>
            <div className="text-right italic font-serif text-slate-600">
              "Bringing Heaven to Earth, Taking People to Heaven"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
