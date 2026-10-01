import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileEdit, 
  GraduationCap, 
  Award, 
  Sparkles,
  Calendar,
  DollarSign,
  Play,
  FileCheck,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { TabType } from '../../types';

export interface ActionTask {
  id: string;
  title: string;
  subtitle: string;
  urgency: 'high' | 'medium' | 'normal';
  badge: string;
  actionText: string;
  targetTab: TabType;
  actionPayload?: any;
}

interface RoleActionHeroProps {
  roleTitle: string;
  roleBadge: string;
  userName: string;
  tasks: ActionTask[];
  onNavigate: (tab: TabType, extra?: any) => void;
}

export const RoleActionHero: React.FC<RoleActionHeroProps> = ({
  roleTitle,
  roleBadge,
  userName,
  tasks = [],
  onNavigate
}) => {
  const primaryTask = tasks[0];
  const secondaryTasks = tasks.slice(1, 3);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#023264] to-[#011a36] text-white p-5 sm:p-6 shadow-xl border border-sky-500/30">
      {/* Background Ambient Glow */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header Greeting & Role Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
              {roleBadge}
            </span>
            <span className="text-xs text-sky-200/70 font-medium">
              HTEIM Academic Portal
            </span>
          </div>
          <div className="text-xs font-bold text-sky-200/90">
            Welcome back, <span className="text-white font-extrabold">{userName}</span>
          </div>
        </div>

        {/* Primary Next Action Card */}
        {primaryTask ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-5 border border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                  primaryTask.urgency === 'high' 
                    ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                    : primaryTask.urgency === 'medium'
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                    : 'bg-sky-500/30 text-sky-200 border border-sky-400/40'
                }`}>
                  {primaryTask.badge}
                </span>
                <span className="text-xs font-semibold text-amber-300 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Urgent Priority
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {primaryTask.title}
              </h2>
              <p className="text-xs sm:text-sm text-sky-100/80 leading-relaxed">
                {primaryTask.subtitle}
              </p>
            </div>

            <button
              onClick={() => onNavigate(primaryTask.targetTab, primaryTask.actionPayload)}
              className="w-full md:w-auto px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-amber-400/20 transition-all shrink-0 active:scale-95"
            >
              <span>{primaryTask.actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl p-4 text-center text-xs text-sky-200/70">
            All primary administrative tasks completed for this period!
          </div>
        )}

        {/* Secondary Tasks Bar */}
        {secondaryTasks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {secondaryTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => onNavigate(t.targetTab, t.actionPayload)}
                className="bg-white/5 hover:bg-white/10 rounded-lg p-2.5 border border-white/10 flex items-center justify-between gap-2 cursor-pointer transition-colors group"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider block">
                    {t.badge}
                  </span>
                  <p className="text-xs font-bold text-white truncate">
                    {t.title}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-sky-300 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
