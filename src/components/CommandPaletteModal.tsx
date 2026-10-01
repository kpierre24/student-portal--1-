import React, { useState, useEffect, useRef } from 'react';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { 
  Search, 
  X, 
  User, 
  BookOpen, 
  Award, 
  DollarSign, 
  Calendar, 
  Bookmark, 
  Settings, 
  ShieldCheck, 
  Radio, 
  Smartphone, 
  Sparkles, 
  ArrowRight, 
  CornerDownLeft,
  UserCheck,
  CheckCircle2,
  Clock,
  Sliders
} from 'lucide-react';
import { TabType } from '../types';
import { AppUser } from '../lib/userAuth';
import { getCommandPaletteRoutes } from '../app/navigation';


export interface CommandPaletteItem {
  id: string;
  category: 'Actions & Views' | 'Students' | 'Courses' | 'Exams' | 'Payments';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: TabType) => void;
  appUser: AppUser | null;
  studentList: { name: string; rate?: number; levelId?: string; studentId?: string }[];
  paymentList?: { name: string; status: string; track: string }[];
  onOpenSettings: () => void;
  onOpenAdminTools: () => void;
  onOpenBatchBroadcast: () => void;
  onOpenLiveCheckin?: () => void;
  onOpenMobileDownload: () => void;
  onOpenLogin: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  appUser,
  studentList,
  paymentList,
  onOpenSettings,
  onOpenAdminTools,
  onOpenBatchBroadcast,
  onOpenLiveCheckin,
  onOpenMobileDownload,
  onOpenLogin
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Core static items for modules & exams
  const coreModules = [
    { code: 'SOM-MOD-1', title: 'Module 1: Introduction & Orientation', instructor: 'HTEIM Academic Directorate' },
    { code: 'SOM-MOD-2', title: 'Module 2: Evangelism & Soul Winning', instructor: 'Evangelism Ministry Lead' },
    { code: 'SOM-MOD-3', title: 'Module 3: Ministerial Character & Ethics', instructor: 'Pastor Senior Advisor' },
    { code: 'SOM-MOD-4', title: 'Module 4: Apostolic Governance & Epistles', instructor: 'Dr. Faculty Director' },
    { code: 'SOM-MOD-5', title: 'Module 5: Prophetic Ministry & Discernment', instructor: 'Prophetic Faculty Director' },
    { code: 'SOM-MOD-6', title: 'Module 6: School of Pastors & Expository Preaching', instructor: 'Rev. Academic Dean' },
  ];

  const coreExams: { code: string; title: string; weight: string }[] = [];

  // Use live payment data passed as prop; fall back to empty if not provided
  const corePayments = (paymentList ?? []).slice(0, 20);

  // Focus input automatically when modal opens and bind global key listener
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      const handleGlobalModalKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener('keydown', handleGlobalModalKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleGlobalModalKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const dialogRef = useAccessibleModal(isOpen, onClose);

  if (!isOpen) return null;

  // Build searchable list
  const allItems: CommandPaletteItem[] = [];

  // 1. Core Navigation & System Actions derived from Canonical Route Registry
  const canonicalRouteItems = getCommandPaletteRoutes(appUser?.role, appUser?.permissions);
  canonicalRouteItems.forEach(routeItem => {
    const IconComp = routeItem.icon;
    allItems.push({
      id: routeItem.id,
      category: 'Actions & Views',
      title: routeItem.title,
      subtitle: routeItem.subtitle,
      icon: <IconComp className="w-4 h-4 text-amber-500" />,
      badge: routeItem.badge,
      badgeColor: routeItem.badgeColor,
      action: () => { onNavigate(routeItem.tab); onClose(); }
    });
  });

  // System Tool Triggers
  if (appUser?.role !== 'student') {
    allItems.push(
      {
        id: 'action-broadcast',
        category: 'Actions & Views',
        title: 'Send Batch Email & SMS Broadcast',
        subtitle: 'Announce class updates or due dates to student cohorts',
        icon: <Radio className="w-4 h-4 text-indigo-600" />,
        badge: 'Admin',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        action: () => { onOpenBatchBroadcast(); onClose(); }
      }
    );
  }

  if (appUser?.role === 'admin') {
    allItems.push(
      {
        id: 'action-system-health',
        category: 'Actions & Views',
        title: 'System Health & Readiness Center',
        subtitle: 'Telemetry, subsystem readiness score, database persistence & security posture',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
        badge: 'Health',
        badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
        action: () => { onOpenAdminTools(); onClose(); }
      },
      {
        id: 'action-admin-tools',
        category: 'Actions & Views',
        title: 'Admin Audit Trail & Database Backup Suite',
        subtitle: 'Inspect system logs, security audit history & JSON backups',
        icon: <ShieldCheck className="w-4 h-4 text-amber-500" />,
        badge: 'Security',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        action: () => { onOpenAdminTools(); onClose(); }
      }
    );
  }

  allItems.push(
    {
      id: 'action-settings',
      category: 'Actions & Views',
      title: 'System Settings & Customization',
      subtitle: 'Theme color modes, notification preferences & regional format',
      icon: <Settings className="w-4 h-4 text-slate-600" />,
      badge: 'Settings',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      action: () => { onOpenSettings(); onClose(); }
    },
    {
      id: 'action-mobile',
      category: 'Actions & Views',
      title: 'Install HTEIM App',
      subtitle: 'Install on Android, iPhone/iPad, or Computer for offline study',
      icon: <Smartphone className="w-4 h-4 text-emerald-500" />,
      badge: 'App',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      action: () => { onOpenMobileDownload(); onClose(); }
    },
    {
      id: 'action-login',
      category: 'Actions & Views',
      title: appUser ? `Switch Account / Relogin (Signed in as ${appUser.name})` : 'Log in to Student / Faculty Portal',
      subtitle: 'Manage user credentials and role privileges',
      icon: <User className="w-4 h-4 text-indigo-500" />,
      badge: 'Auth',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      action: () => { onOpenLogin(); onClose(); }
    }
  );

  if (appUser) {
    // 2. Students List
    studentList.forEach((st, idx) => {
      allItems.push({
        id: `student-${idx}-${st.name}`,
        category: 'Students',
        title: st.name,
        subtitle: `Student Record • Attendance Rate: ${st.rate !== undefined ? Math.round(st.rate) : 95}%`,
        icon: <User className="w-4 h-4 text-indigo-600" />,
        badge: 'Student',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        action: () => {
          onNavigate('students');
          onClose();
        }
      });
    });

    // 3. Courses List
    coreModules.forEach((mod) => {
      allItems.push({
        id: `course-${mod.code}`,
        category: 'Courses',
        title: `${mod.code}: ${mod.title}`,
        subtitle: `Faculty: ${mod.instructor} • 5 Credits`,
        icon: <BookOpen className="w-4 h-4 text-amber-600" />,
        badge: 'Module',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        action: () => {
          onNavigate('courses');
          onClose();
        }
      });
    });

    // 4. Exams List
    coreExams.forEach((exam) => {
      allItems.push({
        id: `exam-${exam.code}`,
        category: 'Exams',
        title: exam.title,
        subtitle: `Academic Evaluation • Weight: ${exam.weight}`,
        icon: <Award className="w-4 h-4 text-rose-600" />,
        badge: 'Exam',
        badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
        action: () => {
          onNavigate('exams');
          onClose();
        }
      });
    });

    // 5. Payment Records
    corePayments.forEach((pm, idx) => {
      const isPaid = pm.status === 'Paid In Full';
      allItems.push({
        id: `payment-${idx}`,
        category: 'Payments',
        title: `Tuition Statement: ${pm.name}`,
        subtitle: `Track: ${pm.track} • Status: ${pm.status}`,
        icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
        badge: pm.status,
        badgeColor: isPaid ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200',
        action: () => {
          onNavigate('payments');
          onClose();
        }
      });
    });
  }

  // Filter items based on user search query
  const filtered = query.trim() === '' 
    ? allItems 
    : allItems.filter(item => {
        const q = query.toLowerCase();
        return (
          (item.title || '').toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          (item.category || '').toLowerCase().includes(q)
        );
      });

  // Clamp selection index
  const safeSelectedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, filtered.length - 1));

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, filtered.length - 1)));
    } else if (e.key === 'Tab') {
      // Prevent tab key from losing focus and cycle items smoothly
      e.preventDefault();
      if (e.shiftKey) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, filtered.length - 1)));
      } else {
        setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[safeSelectedIndex]) {
        filtered[safeSelectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Group filtered results by Category
  const categories = ['Actions & Views', 'Students', 'Courses', 'Exams', 'Payments'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn modal-material-scrim">
      {/* Outside Click Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Command Box */}
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Universal Search & Navigation Command Palette"
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[82vh] z-10 animate-scaleUp modal-material-dialog"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3 text-white modal-material-header">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, student name, module, exam or setting..."
            className="w-full bg-transparent text-sm font-semibold text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Clear Search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-extrabold rounded border border-slate-700 cursor-pointer flex items-center gap-1 transition-colors"
              title="Close Command Palette (ESC)"
            >
              <span>ESC</span>
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Results Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4 bg-slate-50">
          {filtered.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-extrabold text-slate-800">No results found for "{query}"</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try searching for student names, module codes like <code className="bg-slate-200 px-1 rounded text-slate-800">SOM-MOD-1</code>, or actions like <code className="bg-slate-200 px-1 rounded text-slate-800">Settings</code> or <code className="bg-slate-200 px-1 rounded text-slate-800">Live Check-In</code>.
              </p>
            </div>
          ) : (
            (() => {
              let currentIndexCounter = 0;

              return categories.map((cat) => {
                const categoryItems = filtered.filter(item => item.category === cat);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="px-3 py-1 flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-widest text-slate-400">
                      <span>{cat}</span>
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">{categoryItems.length}</span>
                    </div>

                    <div className="space-y-1">
                      {categoryItems.map((item) => {
                        const itemIndex = currentIndexCounter++;
                        const isSelected = itemIndex === safeSelectedIndex;

                        return (
                          <div
                            key={item.id}
                            onClick={() => item.action()}
                            onMouseEnter={() => setSelectedIndex(itemIndex)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/30'
                                : 'bg-white hover:bg-slate-100/80 text-slate-800 border-slate-200/80 shadow-3xs'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded-xl flex-shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {item.icon}
                              </div>
                              <div className="min-w-0">
                                <h4 className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                  {item.title}
                                </h4>
                                {item.subtitle && (
                                  <p className={`text-[11px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {item.badge && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                                  isSelected ? 'bg-white/20 text-white border-white/30' : item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                              <CornerDownLeft className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-300'}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 text-slate-400 text-[10px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono border border-slate-700">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono border border-slate-700">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono border border-slate-700">ESC</kbd>
              Close
            </span>
          </div>

          <span className="font-extrabold text-amber-400">HTEIM Command Palette</span>
        </div>
      </div>
    </div>
  );
};
