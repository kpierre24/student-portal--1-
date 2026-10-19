import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, 
  Video, 
  UserCheck, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Clock, 
  ExternalLink, 
  Award, 
  DollarSign, 
  ShieldCheck, 
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { TabType, StudentSummary, ClassDay } from '../../types';
import { AppUser } from '../../lib/userAuth';

export interface MyTodayLiveGatewayProps {
  appUser: AppUser | null;
  onNavigate: (tab: TabType) => void;
  // Student specific props
  studentData?: StudentSummary | null;
  attendanceRate?: number;
  atRiskThreshold?: number;
  safeAbsenceMargin?: number;
  pendingAssignmentsCount?: number;
  outstandingBalance?: number;
  // Faculty specific props
  atRiskStudentsCount?: number;
  totalStudentsCount?: number;
  classDays?: ClassDay[];
}

export const MyTodayLiveGateway: React.FC<MyTodayLiveGatewayProps> = ({
  appUser,
  onNavigate,
  studentData,
  attendanceRate,
  atRiskThreshold = 75,
  safeAbsenceMargin,
  pendingAssignmentsCount = 0,
  outstandingBalance = 0,
  atRiskStudentsCount = 0,
  totalStudentsCount = 0,
  classDays = [],
}) => {
  const isStudent = appUser?.role === 'student' || (!appUser && !atRiskStudentsCount);
  const isFaculty = appUser?.role === 'admin' || appUser?.role === 'teacher' || appUser?.role === 'super_admin';

  // Calculate countdown to next Tuesday 7:00 PM EST
  const [countdownText, setCountdownText] = useState<string>('');
  const [isLiveNow, setIsLiveNow] = useState<boolean>(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // Tuesday is day 2 (0 = Sunday, 1 = Monday, 2 = Tuesday)
      const currentDay = now.getUTCDay();
      // Tuesday 7:00 PM EST is Wednesday 00:00 UTC (during standard time) or Tuesday 23:00 UTC (daylight)
      // For local browser calculation:
      const dayOfWeek = now.getDay();
      let daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
      
      const nextTuesday = new Date(now);
      nextTuesday.setDate(now.getDate() + daysUntilTuesday);
      nextTuesday.setHours(19, 0, 0, 0); // 7:00 PM local

      if (daysUntilTuesday === 0) {
        // Today is Tuesday!
        const classEnd = new Date(now);
        classEnd.setHours(21, 0, 0, 0); // 9:00 PM

        if (now >= nextTuesday && now <= classEnd) {
          setIsLiveNow(true);
          setCountdownText('Live Stream in Session');
          return;
        } else if (now > classEnd) {
          // Passed today, next Tuesday is in 7 days
          nextTuesday.setDate(nextTuesday.getDate() + 7);
          setIsLiveNow(false);
        }
      } else {
        setIsLiveNow(false);
      }

      const diffMs = nextTuesday.getTime() - now.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHrs < 24) {
        setCountdownText(`In ${diffHrs}h ${diffMins}m`);
      } else {
        const diffDays = Math.floor(diffHrs / 24);
        setCountdownText(`In ${diffDays} day${diffDays === 1 ? '' : 's'} (Tuesday 7:00 PM EST)`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const rate = attendanceRate ?? studentData?.rate ?? 92.8;
  const isSatisfactory = rate >= atRiskThreshold;
  const isHonor = rate >= 85;

  return (
    <div className="rounded-3xl bg-gradient-to-r from-[#022044] via-[#023264] to-[#052852] border border-[#025798]/50 shadow-2xl overflow-hidden text-white p-5 sm:p-6 mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Left Section: Live Class Broadcast Status */}
        <div className="flex items-start gap-4 max-w-xl">
          <div className="relative shrink-0">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-lg ${
              isLiveNow 
                ? 'bg-rose-500/20 border-rose-400 text-rose-300 animate-pulse' 
                : 'bg-[#b38f53]/20 border-[#dfc18b]/40 text-[#dfc18b]'
            }`}>
              <Radio className={`w-7 h-7 ${isLiveNow ? 'animate-ping' : ''}`} />
            </div>
            {isLiveNow && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-[#022044]" />
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isLiveNow
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400/40 inline-flex items-center gap-1.5'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
              }`}>
                {isLiveNow && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                {isLiveNow ? 'Broadcast Active' : 'Next Tuesday Lecture'}
              </span>
              <span className="text-[10px] font-mono text-sky-200/90 px-2 py-0.5 rounded-full bg-white/10">
                {countdownText}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
              Module 6: School of the Pastors & Practical Homiletics
            </h2>
            <p className="text-xs text-sky-100/80 leading-relaxed">
              Pastor Samuel Selkridge • Live via Google Meet & Zoom Studio with automatic recording
            </p>
          </div>
        </div>

        {/* Center / Right Section: 1-Click Launch & Role Hub */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
          {/* Quick Meet / Zoom launch */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('classroom')}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Video className="w-4 h-4" />
              <span>Enter Classroom</span>
            </button>

            <a
              href="https://meet.google.com/wgd-vrrq-sjm"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              title="Launch directly in Google Meet app/tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google Meet</span>
            </a>
          </div>

          {/* Quick Stats Pill */}
          {isStudent && (
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl px-4 py-2 text-xs flex items-center justify-between sm:justify-start gap-4">
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-400">Attendance</span>
                <span className={`font-mono font-black text-sm ${
                  isHonor ? 'text-amber-400' : isSatisfactory ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {Math.round(rate)}%
                </span>
              </div>
              <div className="w-px h-6 bg-slate-700" />
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-400">Assignments</span>
                <span className="font-mono font-black text-sm text-indigo-300">
                  {pendingAssignmentsCount} Pending
                </span>
              </div>
              <div className="w-px h-6 bg-slate-700" />
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-400">Tuition</span>
                <span className={`font-mono font-black text-sm ${outstandingBalance > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                  {outstandingBalance > 0 ? `$${outstandingBalance}` : 'Paid'}
                </span>
              </div>
            </div>
          )}

          {isFaculty && (
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl px-4 py-2 text-xs flex items-center justify-between sm:justify-start gap-4">
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-400">Total Roster</span>
                <span className="font-mono font-black text-sm text-sky-300">
                  {totalStudentsCount || 14} Students
                </span>
              </div>
              <div className="w-px h-6 bg-slate-700" />
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-400">At-Risk Alert</span>
                <span className={`font-mono font-black text-sm ${atRiskStudentsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {atRiskStudentsCount} Below 75%
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('attendance')}
                className="text-amber-300 hover:text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Roll Call</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
