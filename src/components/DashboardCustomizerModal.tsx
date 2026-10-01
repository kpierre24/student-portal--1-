import React, { useState } from 'react';
import { 
  X, 
  MoveUp, 
  MoveDown, 
  RotateCcw, 
  Check, 
  Sliders, 
  LayoutGrid, 
  Users, 
  GraduationCap, 
  Calendar, 
  TrendingUp, 
  PenSquare, 
  DollarSign, 
  BookOpen, 
  Clock 
} from 'lucide-react';

export interface DashboardWidgetMeta {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  category: string;
}

export const WIDGET_CATALOG: DashboardWidgetMeta[] = [
  {
    id: 'total_enrolled',
    title: 'Total Enrolled Students',
    subtitle: 'Active cohort count & link to Students Directory',
    icon: <Users className="w-4 h-4 text-indigo-600" />,
    category: 'Student Metrics'
  },
  {
    id: 'active_curriculum',
    title: 'Active Curriculum Modules',
    subtitle: '6 Core Theological Modules & Syllabi',
    icon: <GraduationCap className="w-4 h-4 text-amber-600" />,
    category: 'Academic'
  },
  {
    id: 'scheduled_lessons',
    title: 'Scheduled Classroom Days',
    subtitle: 'Classroom schedule days & lecture slots',
    icon: <Calendar className="w-4 h-4 text-emerald-600" />,
    category: 'Academic'
  },
  {
    id: 'avg_attendance',
    title: 'Avg Attendance Rate',
    subtitle: 'Overall attendance percentage indicator',
    icon: <TrendingUp className="w-4 h-4 text-rose-600" />,
    category: 'Performance'
  },
  {
    id: 'pending_assignments',
    title: 'Pending Assignments & Quizzes',
    subtitle: 'Scripture quizzes to be graded or submitted',
    icon: <PenSquare className="w-4 h-4 text-purple-600" />,
    category: 'Evaluations'
  },
  {
    id: 'uncollected_tuition',
    title: 'Uncollected Tuition & Past Due',
    subtitle: 'Sum of past due & pending student tuition balances',
    icon: <DollarSign className="w-4 h-4 text-rose-600" />,
    category: 'Financial'
  },
  {
    id: 'library_resources',
    title: 'Digital Library Resources',
    subtitle: 'Count of downloadable reading booklets & handouts',
    icon: <BookOpen className="w-4 h-4 text-teal-600" />,
    category: 'Resources'
  },
  {
    id: 'upcoming_class',
    title: 'Next Live Session',
    subtitle: 'Upcoming classroom session date & room',
    icon: <Clock className="w-4 h-4 text-sky-600" />,
    category: 'Schedule'
  }
];

export const DEFAULT_WIDGET_ORDER = [
  'total_enrolled',
  'active_curriculum',
  'scheduled_lessons',
  'avg_attendance',
  'pending_assignments',
  'uncollected_tuition',
  'library_resources',
  'upcoming_class'
];

export const DEFAULT_ENABLED_WIDGETS = [
  'total_enrolled',
  'active_curriculum',
  'scheduled_lessons',
  'avg_attendance',
  'pending_assignments',
  'uncollected_tuition'
];

interface DashboardCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgetOrder: string[];
  enabledWidgets: string[];
  onSave: (newOrder: string[], newEnabled: string[]) => void;
  onReset: () => void;
}

export const DashboardCustomizerModal: React.FC<DashboardCustomizerModalProps> = ({
  isOpen,
  onClose,
  widgetOrder,
  enabledWidgets,
  onSave,
  onReset
}) => {
  const [tempOrder, setTempOrder] = useState<string[]>(widgetOrder.length > 0 ? widgetOrder : DEFAULT_WIDGET_ORDER);
  const [tempEnabled, setTempEnabled] = useState<string[]>(enabledWidgets.length > 0 ? enabledWidgets : DEFAULT_ENABLED_WIDGETS);

  if (!isOpen) return null;

  const handleToggleWidget = (id: string) => {
    if (tempEnabled.includes(id)) {
      setTempEnabled(tempEnabled.filter(wId => wId !== id));
    } else {
      setTempEnabled([...tempEnabled, id]);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newArr = [...tempOrder];
    const prev = newArr[index - 1];
    newArr[index - 1] = newArr[index];
    newArr[index] = prev;
    setTempOrder(newArr);
  };

  const handleMoveDown = (index: number) => {
    if (index === tempOrder.length - 1) return;
    const newArr = [...tempOrder];
    const next = newArr[index + 1];
    newArr[index + 1] = newArr[index];
    newArr[index] = next;
    setTempOrder(newArr);
  };

  const handleSave = () => {
    onSave(tempOrder, tempEnabled);
    onClose();
  };

  const handleResetDefaults = () => {
    setTempOrder(DEFAULT_WIDGET_ORDER);
    setTempEnabled(DEFAULT_ENABLED_WIDGETS);
    onReset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn modal-material-scrim">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[88vh] z-10 animate-scaleUp modal-material-dialog">
        
        {/* Header */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 modal-material-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Customize Dashboard Metric Widgets</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reorder or toggle key performance metric cards on the Home dashboard</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
           aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-slate-50">
          <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
            <span className="font-extrabold text-slate-700">Available Dashboard Widgets ({tempEnabled.length} Active)</span>
            <button
              onClick={handleResetDefaults}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
          </div>

          <div className="space-y-2">
            {tempOrder.map((wId, idx) => {
              const meta = WIDGET_CATALOG.find(w => w.id === wId);
              if (!meta) return null;
              const isEnabled = tempEnabled.includes(wId);

              return (
                <div
                  key={wId}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isEnabled
                      ? 'bg-white border-slate-200 shadow-2xs'
                      : 'bg-slate-100/70 border-slate-200/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleWidget(wId)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${
                        isEnabled
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                      title={isEnabled ? 'Hide widget from dashboard' : 'Show widget on dashboard'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl shrink-0">
                      {meta.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900 truncate">{meta.title}</h4>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          {meta.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{meta.subtitle}</p>
                    </div>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(idx)}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                      title="Move Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      disabled={idx === tempOrder.length - 1}
                      onClick={() => handleMoveDown(idx)}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                      title="Move Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">Changes save locally to your device dashboard.</p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:opacity-80"
            >
              <Check className="w-4 h-4" />
              Save Layout
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
