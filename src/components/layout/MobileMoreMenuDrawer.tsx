import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  X,
  Bookmark,
  BookOpenCheck,
  Calendar,
  DollarSign,
  GraduationCap,
  FileText,
  MessageSquare,
  Smartphone,
  Search,
  Settings
} from 'lucide-react';
import { PWAInstallButton } from '../PWAInstallButton';

export interface MobileMoreMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeErpTab: string;
  setActiveErpTab: (tab: any) => void;
  appUser: any;
  uniqueStudentsCount: number;
  unreadMessagesCount: number;
  setShowLoginModal: (show: boolean) => void;
  setShowLiveCheckinModal: (show: boolean) => void;
  liveCheckinDayId: string | null;
  setLiveCheckinDayId: (id: string) => void;
  classDays: any[];
  setShowIntro: (show: boolean) => void;
  setShowCommandPalette: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  setShowRoleMenu: (show: boolean) => void;
}

export function MobileMoreMenuDrawer({
  isOpen,
  onClose,
  activeErpTab,
  setActiveErpTab,
  appUser,
  uniqueStudentsCount,
  unreadMessagesCount,
  setShowLoginModal,
  setShowLiveCheckinModal,
  liveCheckinDayId,
  setLiveCheckinDayId,
  classDays,
  setShowIntro,
  setShowCommandPalette,
  setShowSettingsModal,
  setShowRoleMenu,
}: MobileMoreMenuDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="relative z-10 w-full bg-slate-900 border-t-2 border-indigo-500/40 rounded-t-3xl shadow-xl p-4 text-white max-h-[85dvh] overflow-y-auto custom-scrollbar pb-safe"
          >
            {/* Drawer Drag Handle / Header */}
            <div className="flex flex-col items-center mb-3">
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mb-3" />
              <div className="flex items-center justify-between w-full pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-black text-amber-300">HTEIM Mobile Navigation & Tools</h3>
                </div>
                <button 
                  onClick={onClose}
                  className="p-1 bg-slate-800 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Quick Modules Section */}
            <div className="space-y-2">
              <div>
                <p className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-2">Modules</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setActiveErpTab('library');
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      activeErpTab === 'library'
                        ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <div>
                      <p className="text-xs font-semibold">Library</p>
                      <p className="text-[9px] text-slate-400">Files & Media</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveErpTab('notes');
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      activeErpTab === 'notes'
                        ? 'bg-[#023264] dark:bg-white border-[#023264] dark:border-white text-[#dfc18b] dark:text-[#023264]'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <BookOpenCheck className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-xs font-semibold">Notes & AMP Bible</p>
                      <p className="text-[9px] text-slate-400">Class Lecture Notes</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveErpTab('schedule');
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      activeErpTab === 'schedule'
                        ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <div>
                      <p className="text-xs font-semibold">Schedule</p>
                      <p className="text-[9px] text-slate-400">Class Dates</p>
                    </div>
                  </button>

                  {(!appUser || appUser?.role === 'admin' || appUser?.role === 'student') && (
                    <button
                      onClick={() => {
                        if (!appUser) {
                          onClose();
                          setShowLoginModal(true);
                        } else {
                          setActiveErpTab('payments');
                          onClose();
                        }
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        activeErpTab === 'payments'
                          ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      <div>
                        <p className="text-xs font-semibold">Tuition</p>
                        <p className="text-[9px] text-slate-400">{appUser ? 'Payment Ledger' : 'Tuition Info'}</p>
                      </div>
                    </button>
                  )}

                  {appUser && (appUser?.role as string) !== 'student' && (
                    <button
                      onClick={() => {
                        setActiveErpTab('students');
                        onClose();
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        activeErpTab === 'students'
                          ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <div>
                        <p className="text-xs font-semibold">Students</p>
                        <p className="text-[9px] text-slate-400">{uniqueStudentsCount} Enrolled</p>
                      </div>
                    </button>
                  )}

                  {appUser && ((appUser?.role as string) === 'admin' || (appUser?.role as string) === 'teacher') && (
                    <button
                      onClick={() => {
                        setActiveErpTab('reports');
                        onClose();
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        activeErpTab === 'reports'
                          ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <div>
                        <p className="text-xs font-semibold">Reports</p>
                        <p className="text-[9px] text-slate-400">Analytics & PDF</p>
                      </div>
                    </button>
                  )}

                  {appUser && (
                    <button
                      onClick={() => {
                        setActiveErpTab('messages');
                        onClose();
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all col-span-2 ${
                        activeErpTab === 'messages'
                          ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4" />
                        <div>
                          <p className="text-xs font-semibold">Messaging</p>
                          <p className="text-[9px] text-slate-400">Direct Messages</p>
                        </div>
                      </div>
                      {unreadMessagesCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold">
                          {unreadMessagesCount} New
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-mono">
                          Open
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Quick Actions */}
              <div>
                <p className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-2">Quick Actions</p>
                <div className="space-y-1.5">
                  <div className="w-full">
                    <PWAInstallButton />
                  </div>
                  {(appUser?.role as string) !== 'student' && (
                    <button
                      onClick={() => {
                        onClose();
                        setShowLiveCheckinModal(true);
                        if (!liveCheckinDayId && classDays.length > 0) {
                          setLiveCheckinDayId(classDays[classDays.length - 1].id);
                        }
                      }}
                      className="w-full p-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-xl flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        <span>Live Check-In</span>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onClose();
                      setShowIntro(true);
                    }}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Play Intro (6s)</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      setShowCommandPalette(true);
                    }}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span>Search</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">⌘K</span>
                  </button>

                  {appUser?.role === 'admin' ? (
                    <button
                      onClick={() => {
                        onClose();
                        setShowSettingsModal(true);
                      }}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>Settings</span>
                      </div>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 text-slate-400 dark:text-slate-600 text-xs font-medium rounded-xl flex items-center justify-between cursor-not-allowed opacity-60"
                      title="Settings can only be changed by Administrator"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                        <span>Settings</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-400">Admin Only</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Role & Account Section */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-2">Account</p>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      appUser?.role === 'admin' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' :
                      appUser?.role === 'teacher' ? 'bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900' :
                      'bg-slate-500 dark:bg-slate-400 text-white'
                    }`}>
                      {appUser ? appUser.name.charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">{appUser ? appUser.name : 'Guest User'}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">{appUser?.role || 'Guest'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      setShowRoleMenu(true);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Switch Role
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
