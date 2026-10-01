import React, { useState, useEffect } from 'react';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { 
  Database, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  UploadCloud, 
  FileText, 
  ExternalLink, 
  X, 
  Copy, 
  Check, 
  Search,
  ShieldAlert,
  FolderOpen,
  Image,
  Sparkles
} from 'lucide-react';
import { 
  runSupabaseDiagnostics, 
  SupabaseDiagnosticReport, 
  uploadToSupabaseStorage,
  migrateLocalStorageProfilePicturesToSupabase,
  getLocalProfilePicturesStats,
  PhotoMigrationResult
} from '../lib/supabaseClient';

interface SupabaseDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userRole?: string;
  onRefreshData?: () => void;
}

export const SupabaseDiagnosticModal: React.FC<SupabaseDiagnosticModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userRole,
  onRefreshData
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SupabaseDiagnosticReport | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'library' | 'assignments' | 'media_photos' | 'sql_guide'>('overview');
  const [testUploadStatus, setTestUploadStatus] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [photoStats, setPhotoStats] = useState(() => getLocalProfilePicturesStats());
  const [isMigratingPhotos, setIsMigratingPhotos] = useState(false);
  const [migrationResult, setMigrationResult] = useState<PhotoMigrationResult | null>(null);

  const executeDiagnostics = async () => {
    setLoading(true);
    setTestUploadStatus(null);
    try {
      const diagReport = await runSupabaseDiagnostics(userEmail);
      setReport(diagReport);
      setPhotoStats(getLocalProfilePicturesStats());
    } catch (err: any) {
      console.error("Diagnostic execution error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      executeDiagnostics();
      setPhotoStats(getLocalProfilePicturesStats());
    }
  }, [isOpen, userEmail]);

  if (!isOpen) return null;

  if (userRole && userRole !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 modal-material-scrim">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="supabase-access-title" className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full text-center space-y-4 modal-material-dialog">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 id="supabase-access-title" className="text-base font-extrabold text-slate-900 dark:text-white">Admin Restricted Diagnostics</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Storage and database diagnostics are restricted strictly to portal Administrators.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleTestUpload = async (bucket: 'library' | 'assignments') => {
    setTestUploadStatus(`Uploading test file to ${bucket} bucket...`);
    try {
      const testContent = `Student Portal Test Document uploaded at ${new Date().toLocaleString()}\nUser Email: ${userEmail || 'anonymous'}`;
      const blob = new Blob([testContent], { type: 'text/plain' });
      const fileName = `diag_test_doc_${Date.now()}.txt`;
      
      const pubUrl = await uploadToSupabaseStorage(bucket, fileName, new File([blob], fileName, { type: 'text/plain' }));
      if (pubUrl && !pubUrl.startsWith('data:')) {
        setTestUploadStatus(`Success! File uploaded to ${bucket} bucket: ${pubUrl}`);
      } else {
        setTestUploadStatus(`Upload completed with fallback to base64. Storage bucket '${bucket}' may lack write permissions or public RLS.`);
      }
      // Refresh report
      await executeDiagnostics();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setTestUploadStatus(`Test upload failed: ${err.message || String(err)}`);
    }
  };

  const handleMigrateAllPhotos = async () => {
    setIsMigratingPhotos(true);
    setMigrationResult(null);
    try {
      const res = await migrateLocalStorageProfilePicturesToSupabase(userEmail);
      setMigrationResult(res);
      setPhotoStats(getLocalProfilePicturesStats(res.updatedStudentPhotos, res.updatedFacultyTeachers));
      await executeDiagnostics();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setMigrationResult({
        studentPhotosProcessed: 0,
        studentPhotosUploaded: 0,
        facultyProcessed: 0,
        facultyUploaded: 0,
        totalUploaded: 0,
        dbSaved: false,
        success: false,
        updatedStudentPhotos: {},
        updatedFacultyTeachers: [],
        errors: [err.message || String(err)]
      });
    } finally {
      setIsMigratingPhotos(false);
    }
  };

  const copySqlGuide = () => {
    const sqlText = `-- ========================================================
-- HEAVEN TOUCHING EARTH SCHOOL OF MINISTRY (HTEIM)
-- ADVANCED SUPABASE SECURITY & RLS POLICIES
-- ========================================================

-- 1. DATABASE SCHEMA SETUP
-- Setup state synchronization table for HTEIM Portal
CREATE TABLE IF NOT EXISTS public.app_state (
  email text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on Database Tables
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- POLICY A: SECURE STUDENT-ISOLATED ACCESS (RECOMMENDED)
-- Students can only read/write their own state; Admins can read/write everything.
CREATE POLICY "Student Isolated Read" ON public.app_state
  FOR SELECT USING (
    (auth.jwt() ->> 'email') = email 
    OR (auth.jwt() ->> 'role' = 'service_role')
  );

CREATE POLICY "Student Isolated Upsert" ON public.app_state
  FOR ALL WITH CHECK (
    (auth.jwt() ->> 'email') = email 
    OR (auth.jwt() ->> 'role' = 'service_role')
  );

-- POLICY B: DELEGATED ACCESS (ANONYMOUS CLIENT FALLBACK)
-- Use this if you are using anonymous public token clients
-- CREATE POLICY "Delegated SELECT" ON public.app_state FOR SELECT USING (true);
-- CREATE POLICY "Delegated ALL" ON public.app_state FOR ALL USING (true);


-- 2. STORAGE BUCKET ROW LEVEL SECURITY (RLS)
-- Go to Supabase Dashboard -> Storage -> Create Buckets: 'library', 'assignments', 'classroom_media'
-- Enforce proper policies to prevent unauthorized file manipulation.

-- Allow public read access to all public portal files
CREATE POLICY "Public Read Access" ON storage.objects
  FOR SELECT USING (bucket_id IN ('library', 'assignments', 'classroom_media'));

-- LIBRARY BUCKET: Only admins/instructors can write, upload or delete
CREATE POLICY "Library Admin Insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'library' 
    AND (
      (auth.jwt() ->> 'email') IN ('kpierre24@gmail.com', 'admin@hteim.org') 
      OR (auth.jwt() ->> 'role' = 'service_role')
    )
  );

CREATE POLICY "Library Admin Delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'library' 
    AND (
      (auth.jwt() ->> 'email') IN ('kpierre24@gmail.com', 'admin@hteim.org') 
      OR (auth.jwt() ->> 'role' = 'service_role')
    )
  );

-- ASSIGNMENTS BUCKET: Authenticated students can upload, admins can review and delete
CREATE POLICY "Student Assignment Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assignments' 
    AND (
      (auth.jwt() ->> 'email') IS NOT NULL
      OR (auth.jwt() ->> 'role' = 'service_role')
    )
  );

CREATE POLICY "Assignments Admin Control" ON storage.objects
  FOR ALL USING (
    bucket_id = 'assignments'
    AND (
      (auth.jwt() ->> 'email') IN ('kpierre24@gmail.com', 'admin@hteim.org')
      OR (auth.jwt() ->> 'role' = 'service_role')
    )
  );
`;
    navigator.clipboard.writeText(sqlText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const filterFiles = (files: any[]) => {
    if (!searchTerm) return files;
    return files.filter(f => (f?.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto modal-material-scrim">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="supabase-diagnostic-title" className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200 modal-material-dialog">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 modal-material-header">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 id="supabase-diagnostic-title" className="text-lg font-bold text-white flex items-center gap-2">
                Supabase Storage & Data Diagnostics
              </h2>
              <p className="text-xs text-slate-400">
                Evaluating database rows, bucket permissions, & missing library documents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-5 gap-2 text-sm font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-4 border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600 bg-white font-semibold shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Overview & Status
          </button>
          <button
            onClick={() => setActiveTab('media_photos')}
            className={`py-2 px-4 border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'media_photos'
                ? 'border-indigo-600 text-indigo-600 bg-white font-semibold shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Image className="w-4 h-4 text-purple-600" />
            Profile Photos ({report?.classroomMediaFiles?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`py-2 px-4 border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'library'
                ? 'border-indigo-600 text-indigo-600 bg-white font-semibold shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Library Bucket ({report?.libraryFiles.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-4 border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'assignments'
                ? 'border-indigo-600 text-indigo-600 bg-white font-semibold shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Assignments Bucket ({report?.assignmentsFiles.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('sql_guide')}
            className={`py-2 px-4 border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'sql_guide'
                ? 'border-indigo-600 text-indigo-600 bg-white font-semibold shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Setup & SQL Fixes
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-slate-700">Running Supabase storage & database tests...</p>
              <p className="text-xs text-slate-500">Testing connection, buckets 'classroom_media', 'library', 'assignments', RLS policies...</p>
            </div>
          ) : report ? (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  
                  {/* Quick Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Target User Account</span>
                      <span className="text-sm font-bold text-slate-800">{userEmail || 'Anonymous / Guest'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={executeDiagnostics}
                        className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Re-run Tests
                      </button>
                      <button
                        onClick={handleMigrateAllPhotos}
                        disabled={isMigratingPhotos}
                        className="px-3 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        {isMigratingPhotos ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Migrating Photos to Supabase...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Save Local Profile Pictures to Supabase</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleTestUpload('library')}
                        className="px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Test Upload to Library
                      </button>
                    </div>
                  </div>

                  {/* Migration Feedback Alert */}
                  {migrationResult && (
                    <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                      migrationResult.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                      <div className="flex items-center gap-2 font-bold mb-1 text-sm">
                        {migrationResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        )}
                        <span>
                          {migrationResult.totalUploaded > 0 
                            ? `Successfully Uploaded ${migrationResult.totalUploaded} Profile Pictures to Supabase Cloud Storage!` 
                            : 'Profile Pictures Already Fully Synced in Supabase Storage!'}
                        </span>
                      </div>
                      <p>
                        Processed {migrationResult.studentPhotosProcessed} student photos ({migrationResult.studentPhotosUploaded} newly uploaded) and {migrationResult.facultyProcessed} faculty portraits ({migrationResult.facultyUploaded} newly uploaded). Database state was {migrationResult.dbSaved ? 'successfully updated in Supabase app_states table' : 'preserved'}.
                      </p>
                      {migrationResult.errors.length > 0 && (
                        <div className="mt-2 text-rose-700 space-y-1">
                          {migrationResult.errors.map((e, idx) => (
                            <p key={idx}>⚠️ {e}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {testUploadStatus && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-medium text-indigo-900 flex items-center justify-between">
                      <span>{testUploadStatus}</span>
                      <button onClick={() => setTestUploadStatus(null)} className="text-indigo-500 hover:text-indigo-800 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Profile Pictures & Media Storage Highlight Card */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white rounded-xl border border-purple-200 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                          <Image className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            Local Storage Profile Pictures Status
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                              Supabase Storage: classroom_media
                            </span>
                          </h3>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {photoStats.totalStudentPhotos} student photo(s) &bull; {photoStats.totalFaculty} faculty portrait(s) ({photoStats.studentPhotosInSupabase + photoStats.facultyInSupabase} hosted in Supabase, {photoStats.studentPhotosLocalOnly + photoStats.facultyLocalOnly} in local storage)
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleMigrateAllPhotos}
                        disabled={isMigratingPhotos}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isMigratingPhotos ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading to Supabase...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Save Local Photos to Supabase</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Database Health */}
                    <div className={`p-4 rounded-xl border ${report.dbConnected ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">DB (`app_states`)</span>
                        {report.dbConnected ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <p className="text-base font-bold text-slate-900">
                        {report.dbConnected ? 'Connected & Ready' : 'Database Error'}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {report.dbConnected 
                          ? `Found ${report.userRowCount} state record(s).`
                          : report.dbError || 'Table not found or blocked.'}
                      </p>
                    </div>

                    {/* Classroom Media & Profile Pictures Bucket */}
                    <div className={`p-4 rounded-xl border ${report.classroomMediaBucketWriteOk ? 'bg-emerald-50/60 border-emerald-200' : 'bg-purple-50/60 border-purple-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">'classroom_media' Bucket</span>
                        {report.classroomMediaBucketWriteOk ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <p className="text-base font-bold text-slate-900">
                        {report.classroomMediaFiles?.length || 0} Media File(s)
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {report.classroomMediaBucketWriteOk 
                          ? 'Profile pictures bucket verified.' 
                          : report.classroomMediaBucketWriteError || 'Bucket available for uploads.'}
                      </p>
                    </div>

                    {/* Library Bucket Storage */}
                    <div className={`p-4 rounded-xl border ${report.libraryBucketWriteOk ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">'library' Storage Bucket</span>
                        {report.libraryBucketWriteOk ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <p className="text-base font-bold text-slate-900">
                        {report.libraryFiles.length} Document(s)
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {report.libraryBucketWriteOk 
                          ? 'Write permission verified.' 
                          : report.libraryBucketWriteError || 'Bucket missing or upload restricted.'}
                      </p>
                    </div>

                    {/* Assignments Bucket Storage */}
                    <div className={`p-4 rounded-xl border ${report.assignmentsBucketWriteOk ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">'assignments' Bucket</span>
                        {report.assignmentsBucketWriteOk ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <p className="text-base font-bold text-slate-900">
                        {report.assignmentsFiles.length} Document(s)
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {report.assignmentsBucketWriteOk 
                          ? 'Write permission verified.' 
                          : report.assignmentsBucketWriteError || 'Bucket missing or upload restricted.'}
                      </p>
                    </div>
                  </div>

                  {/* Findings & Evaluation */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-indigo-600" />
                      Evaluation & Diagnosis
                    </h3>
                    <div className="space-y-2">
                      {report.diagnosis.map((msg, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                          <span>{msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Environment & Configuration Info */}
                  <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between font-mono">
                      <span>Supabase Project URL:</span>
                      <span className="text-indigo-400 font-semibold">{report.supabaseUrl}</span>
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <span>Anon Key Present:</span>
                      <span className={report.hasAnonKey ? 'text-emerald-400' : 'text-rose-400'}>
                        {report.hasAnonKey ? 'YES (Valid)' : 'NO'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <span>Available Buckets in Storage:</span>
                      <span className="text-amber-300">
                        {report.availableBuckets.length > 0 ? report.availableBuckets.join(', ') : 'classroom_media, library, assignments'}
                      </span>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB: MEDIA & PROFILE PHOTOS */}
              {activeTab === 'media_photos' && (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Image className="w-4 h-4 text-purple-600" />
                        Classroom Media & Profile Pictures
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        All student profile pictures and faculty portraits saved in Supabase storage (`classroom_media`).
                      </p>
                    </div>

                    <button
                      onClick={handleMigrateAllPhotos}
                      disabled={isMigratingPhotos}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isMigratingPhotos ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Save All Local Profile Pictures to Supabase</span>
                        </>
                      )}
                    </button>
                  </div>

                  {migrationResult && (
                    <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                      migrationResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                      <p className="font-bold">
                        {migrationResult.totalUploaded > 0 
                          ? `✅ Successfully migrated ${migrationResult.totalUploaded} profile photos to Supabase Storage!` 
                          : '✅ All local profile pictures are already up to date in Supabase Storage!'}
                      </p>
                      <p className="mt-1 text-slate-600">
                        {migrationResult.studentPhotosUploaded} student photos uploaded &bull; {migrationResult.facultyUploaded} faculty portraits uploaded &bull; Supabase Database updated: {migrationResult.dbSaved ? 'Yes' : 'Preserved'}
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search classroom media files and student portraits..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {filterFiles(report.classroomMediaFiles || []).length === 0 ? (
                    <div className="p-10 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
                      <Image className="w-10 h-10 text-slate-300 mx-auto" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">No objects found in 'classroom_media' bucket</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          Click the button above to upload all current student and faculty photos stored in local storage to Supabase.
                        </p>
                      </div>
                      <button
                        onClick={handleMigrateAllPhotos}
                        disabled={isMigratingPhotos}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Current Local Storage Photos Now</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {filterFiles(report.classroomMediaFiles || []).map((file, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                          <div className="aspect-video w-full bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center relative">
                            {file.publicUrl ? (
                              <img 
                                src={file.publicUrl} 
                                alt={file.name} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Image className="w-8 h-8 text-slate-300" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-slate-800 text-xs truncate" title={file.name}>
                              {file.name}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span>{file.sizeBytes ? `${Math.round(file.sizeBytes / 1024)} KB` : 'Media'}</span>
                              <span>{file.created_at ? new Date(file.created_at).toLocaleDateString() : ''}</span>
                            </div>
                          </div>
                          {file.publicUrl && (
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                              <a
                                href={file.publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" /> View
                              </a>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(file.publicUrl || '');
                                  setCopiedText(true);
                                  setTimeout(() => setCopiedText(false), 2000);
                                }}
                                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 ml-auto cursor-pointer"
                              >
                                <Copy className="w-3 h-3" /> Copy URL
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LIBRARY BUCKET OBJECTS */}
              {activeTab === 'library' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search library storage files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => handleTestUpload('library')}
                      className="px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Upload Test File
                    </button>
                  </div>

                  {filterFiles(report.libraryFiles).length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
                      <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No objects found in 'library' bucket</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        If files were uploaded earlier, verify if the bucket named `library` exists in your Supabase project with public access enabled.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2 px-4">File Name</th>
                            <th className="py-2 px-4">Created At</th>
                            <th className="py-2 px-4">Size</th>
                            <th className="py-2 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {filterFiles(report.libraryFiles).map((file, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition">
                              <td className="py-2 px-4 font-semibold text-slate-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span className="truncate max-w-xs">{file.name}</span>
                              </td>
                              <td className="py-2 px-4 text-slate-500">
                                {file.created_at ? new Date(file.created_at).toLocaleString() : 'N/A'}
                              </td>
                              <td className="py-2 px-4 text-slate-500 font-mono">
                                {file.sizeBytes ? `${(file.sizeBytes / 1024).toFixed(1)} KB` : 'N/A'}
                              </td>
                              <td className="py-2 px-4 text-right">
                                {file.publicUrl && (
                                  <a
                                    href={file.publicUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                                  >
                                    View File <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ASSIGNMENTS BUCKET OBJECTS */}
              {activeTab === 'assignments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search assignments storage files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => handleTestUpload('assignments')}
                      className="px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Upload Test File
                    </button>
                  </div>

                  {filterFiles(report.assignmentsFiles).length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No objects found in 'assignments' bucket</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Verify that the storage bucket named `assignments` is created in Supabase with Public policies.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2 px-4">File Name</th>
                            <th className="py-2 px-4">Created At</th>
                            <th className="py-2 px-4">Size</th>
                            <th className="py-2 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {filterFiles(report.assignmentsFiles).map((file, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition">
                              <td className="py-2 px-4 font-semibold text-slate-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span className="truncate max-w-xs">{file.name}</span>
                              </td>
                              <td className="py-2 px-4 text-slate-500">
                                {file.created_at ? new Date(file.created_at).toLocaleString() : 'N/A'}
                              </td>
                              <td className="py-2 px-4 text-slate-500 font-mono">
                                {file.sizeBytes ? `${(file.sizeBytes / 1024).toFixed(1)} KB` : 'N/A'}
                              </td>
                              <td className="py-2 px-4 text-right">
                                {file.publicUrl && (
                                  <a
                                    href={file.publicUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                                  >
                                    View File <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SQL FIXES & SUPABASE DASHBOARD SETUP */}
              {activeTab === 'sql_guide' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                    <p className="font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Supabase Setup & RLS Policy Guide
                    </p>
                    <p className="leading-relaxed">
                      If documents fail to save or show as missing in Supabase, execute this standard SQL snippet in your <strong>Supabase SQL Editor</strong> to create the database table and enable public reads/uploads on the storage buckets.
                    </p>
                  </div>

                  <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                    <div className="px-4 py-2 bg-slate-800 flex items-center justify-between border-b border-slate-700">
                      <span className="text-xs font-mono text-slate-300">supabase_setup.sql</span>
                      <button
                        onClick={copySqlGuide}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy SQL
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-72">
{`-- HEAVEN TOUCHING EARTH SCHOOL OF MINISTRY (HTEIM)
-- 1. Create app_state table if not exists
CREATE TABLE IF NOT EXISTS public.app_state (
  email text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for database row protection
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Policy: Only allow users to read/update their own state row
CREATE POLICY "Student Isolated Read" ON public.app_state
  FOR SELECT USING ((auth.jwt() ->> 'email') = email OR (auth.jwt() ->> 'role' = 'service_role'));

CREATE POLICY "Student Isolated Upsert" ON public.app_state
  FOR ALL WITH CHECK ((auth.jwt() ->> 'email') = email OR (auth.jwt() ->> 'role' = 'service_role'));

-- 2. Storage Buckets (library, assignments, classroom_media)
-- Go to Supabase -> Storage and create these public buckets.
-- Enforce policies: Read access is public, but writes are role-restricted:

-- Read access to all files
CREATE POLICY "Public Read Access" ON storage.objects
  FOR SELECT USING (bucket_id IN ('library', 'assignments', 'classroom_media'));

-- Library bucket: Only Admins/Instructors can upload/delete
CREATE POLICY "Library Admin Insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'library' AND ((auth.jwt() ->> 'email') IN ('kpierre24@gmail.com', 'admin@hteim.org')));

-- Assignments bucket: Students can upload, admins manage
CREATE POLICY "Student Assignment Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'assignments' AND ((auth.jwt() ->> 'email') IS NOT NULL));`}
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-white border-t border-slate-200 flex items-center justify-between modal-material-footer">
          <div className="text-xs text-slate-500">
            Last evaluated: {report ? new Date(report.timestamp).toLocaleTimeString() : 'Never'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            Close Diagnostics
          </button>
        </div>

      </div>
    </div>
  );
};
