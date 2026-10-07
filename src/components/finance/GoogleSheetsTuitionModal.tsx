import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Table, 
  ShieldCheck, 
  Sparkles,
  Search,
  Check,
  X,
  DollarSign,
  Users,
  CreditCard,
  Layers,
  ArrowDownCircle
} from 'lucide-react';
import { Modal } from '../Modal';
import { PaymentRecord } from '../../types';
import { 
  fetchTuitionSpreadsheet, 
  mergeTuitionRecords, 
  persistTuitionRecords, 
  parseTuitionCSV,
  ParsedTuitionResult 
} from '../../lib/tuitionSheets';
import { logActivity } from '../../lib/auditLogger';
import { toast } from 'sonner';

interface GoogleSheetsTuitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPayments: PaymentRecord[];
  onUpdatePayments: (records: PaymentRecord[]) => void;
  tuitionSheetUrl?: string;
  onSaveTuitionSheetUrl?: (url: string) => void;
  mainSheetUrl?: string;
  lastSyncedTime?: string | null;
}

export const GoogleSheetsTuitionModal: React.FC<GoogleSheetsTuitionModalProps> = ({
  isOpen,
  onClose,
  currentPayments,
  onUpdatePayments,
  tuitionSheetUrl = '',
  onSaveTuitionSheetUrl,
  mainSheetUrl = '',
  lastSyncedTime,
}) => {
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(() => {
    return tuitionSheetUrl || mainSheetUrl || localStorage.getItem('sheetUrl') || '';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<ParsedTuitionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mergePolicy, setMergePolicy] = useState<'manual' | 'sheets'>('manual');
  const [searchTerm, setSearchTerm] = useState('');

  const handleUseMainSheet = () => {
    const main = mainSheetUrl || localStorage.getItem('sheetUrl') || 'https://docs.google.com/spreadsheets/d/1k9Vn2-ZkHtePYeQO0mQstzesCW4-UJLAELoFCVuVfEI/edit?gid=614888378#gid=614888378';
    setSheetUrlInput(main);
  };

  const handleTestAndPreview = async () => {
    if (!sheetUrlInput.trim()) {
      setErrorMessage('Please enter a Google Sheets URL or Spreadsheet ID.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (sheetUrlInput.includes(',') && sheetUrlInput.includes('\n')) {
        // Direct CSV input fallback
        const records = parseTuitionCSV(sheetUrlInput, currentPayments);
        const totalBilled = records.reduce((s, r) => s + (r.totalTuition || 0), 0);
        const totalCollected = records.reduce((s, r) => s + (r.amountPaid || 0), 0);
        const result: ParsedTuitionResult = {
          sheetTitle: 'Imported CSV Data',
          spreadsheetId: 'csv-direct',
          records,
          totalStudents: records.length,
          totalTuitionBilled: totalBilled,
          totalAmountCollected: totalCollected,
          totalOutstandingBalance: Math.max(0, totalBilled - totalCollected),
          collectionRatePercent: totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0,
          detectedTabs: ['CSV'],
          lastSyncedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
        setPreviewResult(result);
        toast.success(`Found ${result.totalStudents} student records from CSV input.`);
        return;
      }
      const result = await fetchTuitionSpreadsheet(sheetUrlInput.trim(), null, currentPayments);
      setPreviewResult(result);
      if (onSaveTuitionSheetUrl) {
        onSaveTuitionSheetUrl(sheetUrlInput.trim());
      }
      toast.success(`Found ${result.totalStudents} student records across ${result.detectedTabs.length} tab(s).`);
    } catch (err: any) {
      const msg = err?.message || 'Failed to connect to Google Sheets. Verify sharing settings are set to "Anyone with the link can view".';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySync = () => {
    if (!previewResult || previewResult.records.length === 0) {
      toast.error('No student records to sync. Test the sheet first.');
      return;
    }

    const merged = mergeTuitionRecords(currentPayments, previewResult.records, mergePolicy);
    onUpdatePayments(merged);
    persistTuitionRecords(merged);

    if (onSaveTuitionSheetUrl) {
      onSaveTuitionSheetUrl(sheetUrlInput.trim());
    }

    logActivity({
      action: 'RECORD_PAYMENT',
      actionCategory: 'Payment Entry',
      actionTitle: 'Google Sheets Tuition Sync',
      details: `Imported ${previewResult.totalStudents} tuition records ($${previewResult.totalTuitionBilled.toLocaleString()} billed, $${previewResult.totalAmountCollected.toLocaleString()} collected) from Google Sheet (${previewResult.sheetTitle})`,
    });

    toast.success(`Successfully synchronized ${merged.length} student tuition records!`);
    onClose();
  };

  const filteredPreviewRecords = previewResult?.records.filter(r => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (r.studentName || '').toLowerCase().includes(s) ||
      (r.studentId || '').toLowerCase().includes(s) ||
      (r.status || '').toLowerCase().includes(s)
    );
  }) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Google Sheets Tuition & Fees Connector" size="3xl">
      <div className="space-y-6">
        {/* Header Intro Banner */}
        <div className="p-4 bg-gradient-to-r from-[#023264]/10 via-emerald-500/10 to-transparent border border-[#023264]/20 rounded-2xl flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#023264] text-white flex items-center justify-center shrink-0 shadow-sm">
            <FileSpreadsheet className="w-5 h-5 text-[#dfc18b]" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Synchronize Tuition & Fee Schedules from Google Sheets</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase">Live Sync</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Connect your Google Spreadsheet to automatically pull student tuition invoices, installments received, and balances. 
              Supports automatic detection of columns for student name, student ID, total tuition, amount paid, and status.
            </p>
          </div>
        </div>

        {/* Input Configuration Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
              <span>Google Spreadsheet URL or ID</span>
              <button
                type="button"
                onClick={handleUseMainSheet}
                className="text-[11px] font-bold text-[#025798] hover:text-[#023264] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-500" /> Use Main Course Sheet
              </button>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1k9Vn2-ZkHtePYeQO0mQstzesCW4-UJLAELoFCVuVfEI/edit#gid=..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#025798]"
                />
              </div>
              <button
                type="button"
                onClick={handleTestAndPreview}
                disabled={isLoading || !sheetUrlInput.trim()}
                className="px-5 py-2.5 bg-[#023264] hover:bg-[#025798] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#dfc18b]" />
                    <span>Fetching Sheet...</span>
                  </>
                ) : (
                  <>
                    <Table className="w-4 h-4 text-[#dfc18b]" />
                    <span>Preview & Test Sheet</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Make sure the Google Spreadsheet is shared with <strong>"Anyone with the link can view"</strong>.
            </p>
          </div>

          {/* Merge Policy Selector */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="font-extrabold text-slate-700 dark:text-slate-300">Conflict & Merge Strategy:</span>
            <div className="flex items-center gap-2">
              <label className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                mergePolicy === 'manual' 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' 
                  : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700'
              }`}>
                <input
                  type="radio"
                  name="mergePolicy"
                  value="manual"
                  checked={mergePolicy === 'manual'}
                  onChange={() => setMergePolicy('manual')}
                  className="sr-only"
                />
                Smart Merge (Keep Local Notes & Receipts)
              </label>
              <label className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                mergePolicy === 'sheets' 
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300' 
                  : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700'
              }`}>
                <input
                  type="radio"
                  name="mergePolicy"
                  value="sheets"
                  checked={mergePolicy === 'sheets'}
                  onChange={() => setMergePolicy('sheets')}
                  className="sr-only"
                />
                Full Overwrite (Sheets Authoritative)
              </label>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs space-y-1 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold">Failed to Fetch Google Sheets Data</p>
              <p className="text-rose-700 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Live Preview Results */}
        {previewResult && (
          <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sheet Preview: {previewResult.sheetTitle}</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Detected tabs: <span className="font-semibold text-slate-700 dark:text-slate-300">{previewResult.detectedTabs.join(', ')}</span>
                </p>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter preview..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                />
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
                  <Users className="w-3.5 h-3.5 text-blue-500" /> Students Found
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {previewResult.totalStudents}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> Total Billed
                </div>
                <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  ${previewResult.totalTuitionBilled.toLocaleString()}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Total Paid
                </div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  ${previewResult.totalAmountCollected.toLocaleString()}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Outstanding
                </div>
                <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                  ${previewResult.totalOutstandingBalance.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Scrollable Preview Table */}
            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5">Student</th>
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5 text-right">Total Tuition</th>
                    <th className="p-2.5 text-right">Amount Paid</th>
                    <th className="p-2.5 text-right">Balance</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredPreviewRecords.map((r, idx) => {
                    const bal = Math.max(0, (r.totalTuition || 0) - (r.amountPaid || 0));
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{r.studentName}</td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-500">{r.studentId}</td>
                        <td className="p-2.5 text-right font-bold text-slate-800 dark:text-slate-200">${r.totalTuition.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-extrabold text-emerald-600">${r.amountPaid.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-bold text-amber-600">${bal.toLocaleString()}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            r.status === 'Paid In Full' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : r.status === 'Partial'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400 text-[11px]">{r.paymentMethod}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {lastSyncedTime && <span>Last synchronized: <strong>{lastSyncedTime}</strong></span>}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplySync}
              disabled={!previewResult || previewResult.records.length === 0}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <ArrowDownCircle className="w-4 h-4 text-emerald-200" />
              <span>Import & Sync Tuition Data ({previewResult?.records.length || 0})</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
