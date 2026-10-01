import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  Plus, 
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Grid,
  List,
  LayoutGrid,
  Trash2,
  Copy,
  X,
  Edit3,
  BookOpen,
  Filter,
  Sparkles,
  Zap,
  Info,
  Video,
  ExternalLink,
  Check,
  AlertTriangle,
  Bell,
  Download,
  Share2,
  Lock,
  ShieldAlert,
  Globe,
  Repeat,
  Eye,
  Smartphone,
  Layers,
  Tag,
  CalendarDays,
  CheckCheck,
  Send,
  ArrowLeft
} from 'lucide-react';
import { ScheduleItem } from '../types';
import { UserRole } from '../lib/userAuth';
import { downloadICSFile, generateGoogleCalendarUrl, CalendarEventItem } from '../lib/calendarExport';
import { EmptyState } from './UXPrimitives';
import { Modal } from './Modal';
import { usePortalRouter } from '../lib/usePortalRouter';

export const CORE_MODULES = [
  { id: 'm1', code: 'SOM-MOD-1', name: 'Module 1: Introduction', shortName: 'Introduction', color: 'emerald' },
  { id: 'm2', code: 'SOM-MOD-2', name: 'Module 2: Evangelism', shortName: 'Evangelism', color: 'cyan' },
  { id: 'm3', code: 'SOM-MOD-3', name: 'Module 3: Ministerial Ethics', shortName: 'Ministerial Ethics', color: 'purple' },
  { id: 'm4', code: 'SOM-MOD-4', name: 'Module 4: Apostolic Ministry', shortName: 'Apostolic Ministry', color: 'indigo' },
  { id: 'm5', code: 'SOM-MOD-5', name: 'Module 5: Prophetic Ministry', shortName: 'Prophetic Ministry', color: 'amber' },
  { id: 'm6', code: 'SOM-MOD-6', name: 'Module 6: School of the Pastors and Teachers', shortName: 'Pastors & Teachers', color: 'rose' },
];

export const PERIODS = [
  { id: 'p1', label: '1ST PERIOD', time: '09:00 - 10:00 am' },
  { id: 'p2', label: '2ND PERIOD', time: '10:00 - 11:00 am' },
  { id: 'p3', label: '3RD PERIOD', time: '11:15 - 12:15 pm' },
  { id: 'p4', label: '4TH PERIOD', time: '01:15 - 02:15 pm' },
  { id: 'p5', label: '5TH PERIOD', time: '02:15 - 03:15 pm' },
  { id: 'eve', label: 'EVENING SESSION', time: '07:00 - 09:00 pm EST' },
];

export const INITIAL_SCHEDULE: ScheduleItem[] = [];

interface ScheduleTabProps {
  classDays: { id: string; name: string }[];
  onTakeAttendanceForDay: (dayId: string) => void;
  onDeleteClassDay?: (dayId: string) => void;
  onClearClassDayRecords?: (dayId: string) => void;
  userRole?: UserRole;
  schedules?: ScheduleItem[];
  setSchedules?: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  zoomExceptionNote?: string;
  setZoomExceptionNote?: React.Dispatch<React.SetStateAction<string>>;
  hasZoomException?: boolean;
  setHasZoomException?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  classDays,
  onTakeAttendanceForDay,
  onDeleteClassDay,
  onClearClassDayRecords,
  userRole = 'admin',
  schedules: propSchedules,
  setSchedules: propSetSchedules,
  zoomExceptionNote: propZoomExceptionNote,
  setZoomExceptionNote: propSetZoomExceptionNote,
  hasZoomException: propHasZoomException,
  setHasZoomException: propSetHasZoomException
}) => {
  const isStudent = userRole === 'student';

  // Local state fallbacks
  const [localSchedules, setLocalSchedules] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('hteim_scheduled_classes');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULE;
  });

  const schedules = propSchedules !== undefined ? propSchedules : localSchedules;
  const setSchedules = propSetSchedules !== undefined ? propSetSchedules : setLocalSchedules;

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('hteim_scheduled_classes', JSON.stringify(schedules));
  }, [schedules]);

  // View mode: 'calendar' (Monthly Grid), 'timetable' (Weekly Matrix Grid), or 'agenda' (List)
  const [viewMode, setViewMode] = useState<'calendar' | 'timetable' | 'agenda'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'agenda';
    }
    return 'calendar';
  });

  // Selected module filter
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');

  // Selected day for mobile date-picker view
  const [selectedMobileDay, setSelectedMobileDay] = useState<number>(() => {
    const today = new Date();
    return today.getDate();
  });

  // Helper to get formatted date string for selected mobile day
  const getSelectedMobileDateStr = () => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedMobileDay).padStart(2, '0')}`;
  };

  // Zoom Exception & Copy State
  const [zoomCopiedField, setZoomCopiedField] = useState<string | null>(null);
  const [showZoomExceptionModal, setShowZoomExceptionModal] = useState(false);

  const [localZoomExceptionNote, setLocalZoomExceptionNote] = useState<string>(() => {
    return localStorage.getItem('hteim_zoom_exception_note') || '';
  });
  const [localHasZoomException, setLocalHasZoomException] = useState<boolean>(() => {
    return localStorage.getItem('hteim_has_zoom_exception') === 'true';
  });

  const zoomExceptionNote = propZoomExceptionNote !== undefined ? propZoomExceptionNote : localZoomExceptionNote;
  const setZoomExceptionNote = propSetZoomExceptionNote !== undefined ? propSetZoomExceptionNote : setLocalZoomExceptionNote;

  const hasZoomException = propHasZoomException !== undefined ? propHasZoomException : localHasZoomException;
  const setHasZoomException = propSetHasZoomException !== undefined ? propSetHasZoomException : setLocalHasZoomException;

  // Calendar Export Handlers
  const handleExportAllToICS = () => {
    const events: CalendarEventItem[] = filteredSchedules.map(s => ({
      id: s.id,
      title: s.title,
      description: `Course: ${s.moduleName || s.courseCode}\nInstructor: ${s.instructor}\nPeriod: ${s.period || 'Evening Session'}`,
      location: s.room || 'HTEIM Main Sanctuary / Zoom',
      date: s.date,
      startTime: s.timeSlot,
      courseCode: s.courseCode
    }));
    downloadICSFile(events, 'HTEIM_School_of_Ministry_Schedule.ics');
  };

  const handleCopyZoomText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setZoomCopiedField(field);
    setTimeout(() => setZoomCopiedField(null), 2000);
  };

  const handleSaveZoomException = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('hteim_zoom_exception_note', zoomExceptionNote);
    localStorage.setItem('hteim_has_zoom_exception', hasZoomException ? 'true' : 'false');
    setZoomExceptionNote(zoomExceptionNote);
    setHasZoomException(hasZoomException);
    setShowZoomExceptionModal(false);
  };

  // Calendar Month Navigation State (Default July 2026)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1)); // July 2026

  // Modal State for Adding/Editing Class
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [isCopyingMode, setIsCopyingMode] = useState(false);

  const { route, navigate } = usePortalRouter('schedule');

  // Sync route parameters with schedule modal / panel state
  useEffect(() => {
    if (route.action === 'add-session' || route.action === 'edit-session') {
      setShowScheduleModal(true);
      if (route.id) {
        const found = schedules.find(s => s.id === route.id);
        if (found) {
          setEditingItem(found);
          setFormDate(found.date);
          setFormModuleCode(found.courseCode);
          setFormTitle(found.title);
          setFormPeriod(found.period || 'EVENING SESSION');
          setFormTimeSlot(found.timeSlot);
          setFormInstructor(found.instructor);
          setFormRoom(found.room || 'Main Sanctuary Hall A');
          setFormStatus(found.status);
          setFormDeliveryMode((found.room || '').toLowerCase().includes('zoom') ? 'virtual' : 'hybrid');
          setFormZoomUrl('https://zoom.us/j/hteim-school-of-ministry');
        }
      }
    } else if (route.action === 'broadcast-setup') {
      setShowZoomExceptionModal(true);
    } else {
      setShowScheduleModal(false);
      setShowZoomExceptionModal(false);
    }
  }, [route.action, route.id, schedules]);

  // Form State
  const [formDate, setFormDate] = useState<string>('2026-07-24');
  const [formModuleCode, setFormModuleCode] = useState<string>('SOM-MOD-1');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formPeriod, setFormPeriod] = useState<string>('EVENING SESSION');
  const [formTimeSlot, setFormTimeSlot] = useState<string>('07:00 - 09:00 pm EST');
  const [formInstructor, setFormInstructor] = useState<string>('Dr. Faculty Director');
  const [formRoom, setFormRoom] = useState<string>('Main Sanctuary Hall A');
  const [formStatus, setFormStatus] = useState<'upcoming' | 'completed' | 'live'>('upcoming');
  const [formDeliveryMode, setFormDeliveryMode] = useState<'in_person' | 'virtual' | 'hybrid'>('hybrid');
  const [formZoomUrl, setFormZoomUrl] = useState<string>('https://zoom.us/j/hteim-school-of-ministry');
  const [formSyncAttendance, setFormSyncAttendance] = useState<boolean>(true);
  const [formRepeatWeeks, setFormRepeatWeeks] = useState<number>(1);
  const [showLivePreview, setShowLivePreview] = useState<boolean>(true);

  // Quick Date Shortcut Handler
  const handleQuickDateShortcut = (preset: 'today' | 'next_tuesday' | 'next_thursday' | 'plus_week') => {
    const today = new Date();
    if (preset === 'today') {
      setFormDate(today.toISOString().split('T')[0]);
    } else if (preset === 'plus_week') {
      if (formDate) {
        const [y, m, d] = formDate.split('-').map(Number);
        const dt = new Date(y, m - 1, d + 7);
        setFormDate(dt.toISOString().split('T')[0]);
      } else {
        today.setDate(today.getDate() + 7);
        setFormDate(today.toISOString().split('T')[0]);
      }
    } else {
      const targetDay = preset === 'next_tuesday' ? 2 : 4; // 2 = Tuesday, 4 = Thursday
      const currentDay = today.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7;
      today.setDate(today.getDate() + diff);
      setFormDate(today.toISOString().split('T')[0]);
    }
  };

  const getFormattedDayOfWeek = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // Helper to open modal for a fresh date or item
  const handleOpenAddModal = (defaultDateStr?: string, defaultPeriod?: string) => {
    if (isStudent) return;
    setEditingItem(null);
    setIsCopyingMode(false);
    setFormDate(defaultDateStr || new Date().toISOString().split('T')[0]);
    setFormModuleCode(selectedModuleFilter !== 'all' ? selectedModuleFilter : 'SOM-MOD-1');
    setFormTitle('');
    setFormPeriod(defaultPeriod || 'EVENING SESSION');
    setFormTimeSlot(defaultPeriod ? PERIODS.find(p => p.label === defaultPeriod)?.time || '07:00 - 09:00 pm EST' : '07:00 - 09:00 pm EST');
    setFormInstructor('Dr. Faculty Director');
    setFormRoom('Main Sanctuary Hall A');
    setFormStatus('upcoming');
    setFormDeliveryMode('hybrid');
    setFormZoomUrl('https://zoom.us/j/hteim-school-of-ministry');
    setFormSyncAttendance(true);
    setFormRepeatWeeks(1);
    setShowScheduleModal(true);
    navigate({ action: 'add-session' });
  };

  const handleOpenEditModal = (item: ScheduleItem) => {
    if (isStudent) return;
    setEditingItem(item);
    setIsCopyingMode(false);
    setFormDate(item.date);
    setFormModuleCode(item.courseCode || 'SOM-MOD-1');
    setFormTitle(item.title);
    setFormPeriod(item.period || 'EVENING SESSION');
    setFormTimeSlot(item.timeSlot);
    setFormInstructor(item.instructor);
    setFormRoom(item.room);
    setFormStatus(item.status);
    setFormDeliveryMode((item.room || '').toLowerCase().includes('zoom') ? 'virtual' : 'hybrid');
    setFormZoomUrl('https://zoom.us/j/hteim-school-of-ministry');
    setFormSyncAttendance(true);
    setFormRepeatWeeks(1);
    setShowScheduleModal(true);
    navigate({ action: 'edit-session', id: item.id });
  };

  // Save Scheduled Class
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStudent) return;
    if (!formTitle.trim() || !formDate) return;

    const moduleObj = CORE_MODULES.find(m => m.code === formModuleCode) || CORE_MODULES[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const finalRoom = formDeliveryMode === 'virtual' 
      ? `Online Zoom Stream (${formRoom})` 
      : formDeliveryMode === 'hybrid' 
        ? `${formRoom} & Zoom Live` 
        : formRoom;

    if (editingItem) {
      let computedStatus = formStatus;
      if (formDate < todayStr) computedStatus = 'completed';
      else if (formDate === todayStr) computedStatus = 'live';

      setSchedules(prev => prev.map(s => s.id === editingItem.id ? {
        ...s,
        title: formTitle,
        courseCode: moduleObj.code,
        moduleName: moduleObj.name,
        date: formDate,
        timeSlot: formTimeSlot,
        period: formPeriod,
        instructor: formInstructor,
        room: finalRoom,
        status: computedStatus
      } : s));
    } else {
      const newItems: ScheduleItem[] = [];
      const numWeeks = Math.max(1, Math.min(6, formRepeatWeeks));
      const [y, m, d] = formDate.split('-').map(Number);

      for (let i = 0; i < numWeeks; i++) {
        const targetDt = new Date(y, m - 1, d + (i * 7));
        const dtStr = targetDt.toISOString().split('T')[0];

        let computedStatus = formStatus;
        if (dtStr < todayStr) computedStatus = 'completed';
        else if (dtStr === todayStr) computedStatus = 'live';

        const newClass: ScheduleItem = {
          id: `sch_user_${Date.now()}_${i}`,
          classDayId: `cd_custom_${Date.now()}_${i}`,
          title: numWeeks > 1 ? `${formTitle} (Week ${i + 1})` : formTitle,
          courseCode: moduleObj.code,
          moduleName: moduleObj.name,
          date: dtStr,
          timeSlot: formTimeSlot,
          period: formPeriod,
          instructor: formInstructor,
          room: finalRoom,
          status: computedStatus
        };

        newItems.push(newClass);
      }

      setSchedules(prev => [...prev, ...newItems]);
    }

    setShowScheduleModal(false);
    navigate({ action: undefined, id: undefined });
  };

  // Delete Scheduled Class
  const handleDeleteSchedule = (id: string) => {
    if (isStudent) return;
    setSchedules(prev => prev.filter(s => s.id !== id));
    setShowScheduleModal(false);
    navigate({ action: undefined, id: undefined });
  };

  // Copy / Duplicate Scheduled Class to a target date
  const handleCopySchedule = (item: ScheduleItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isStudent) return;
    setEditingItem(null);
    setIsCopyingMode(true);
    setFormDate(item.date); // pre-fills current date as default starting point
    setFormModuleCode(item.courseCode || 'SOM-MOD-1');
    setFormTitle(item.title);
    setFormPeriod(item.period || 'EVENING SESSION');
    setFormTimeSlot(item.timeSlot);
    setFormInstructor(item.instructor);
    setFormRoom(item.room);
    setFormStatus(item.status);
    setShowScheduleModal(true);
  };

  // Filter schedules by module
  const filteredSchedules = schedules.filter(s => {
    if (selectedModuleFilter !== 'all' && s.courseCode !== selectedModuleFilter) {
      return false;
    }
    return true;
  });

  // Calendar Grid Calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // First day of current month
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Prev month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // Next month navigation
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  // Map module code to color classes
  const getModuleBadgeStyle = (code: string) => {
    switch (code) {
      case 'SOM-MOD-1':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'SOM-MOD-2':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'SOM-MOD-3':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'SOM-MOD-4':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'SOM-MOD-5':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'SOM-MOD-6':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  // Weekly Timetable Days (Mon - Fri)
  const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="material-screen min-w-0 space-y-6 animate-fadeIn text-slate-100 pb-28 sm:pb-24 md:pb-8">
      {/* Sleek Dark Header Bar matching uploaded mockup */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2 break-words">
                Class Schedule & Academic Timetable
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Admin Control
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure core classes, assign dates (past & future), set time slots, and designate module assignments.
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
          {/* Module Selector Filter */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 min-h-11 max-w-full">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedModuleFilter}
              onChange={(e) => setSelectedModuleFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 border-none focus:outline-none cursor-pointer pr-2"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Core Modules (6)</option>
              {CORE_MODULES.map(m => (
                <option key={m.id} value={m.code} className="bg-slate-900 text-slate-200">
                  {m.code} - {m.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* iCal / Google Calendar Sync Export Button */}
          <button
            onClick={handleExportAllToICS}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-11 bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-800 shadow-3xs transition-all cursor-pointer active:opacity-80"
            title="Export all lectures to Apple Calendar, Outlook, or iCal (.ics file)"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export iCal (.ics)</span>
          </button>

          {/* View Mode Toggle Switcher */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl max-w-full overflow-x-auto no-scrollbar">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-10 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Monthly Calendar View"
              aria-label="Monthly Calendar View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Monthly Calendar</span><span className="sm:hidden">Month</span>
            </button>
            <button
              onClick={() => setViewMode('timetable')}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-10 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'timetable' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Weekly Matrix Timetable View"
              aria-label="Weekly Timetable View"
            >
              <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Weekly Timetable</span><span className="sm:hidden">Week</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-10 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'agenda' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Agenda List View"
            >
              <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Agenda List</span><span className="sm:hidden">Agenda</span>
            </button>
          </div>

          {/* + Schedule Lecture Button with Restricted Hover Tooltip */}
          {!isStudent && (
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center justify-center gap-2 px-4 py-2 min-h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:opacity-80"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Lecture</span>
            </button>
          )}
        </div>
      </div>

      {/* Weekly Tuesday Live Zoom Schedule Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 relative">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0">
              <Video className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-semibold uppercase rounded-full">
                  Recurring Class Cadence
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Every Tuesday @ 7:00 PM - 9:00 PM EST
                </span>
                {hasZoomException && (
                  <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-semibold uppercase rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-500" /> Exception Active
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Classes Go Live via Zoom Every Tuesday
                <span className="text-slate-400 text-xs font-normal">(Unless notified otherwise)</span>
              </h3>

              {hasZoomException ? (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 mt-1">
                  <Bell className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span><strong>Schedule Update:</strong> {zoomExceptionNote || 'Tuesday class schedule modified for this week.'}</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  All School of Ministry module lectures are hosted live on Zoom every Tuesday evening. Students can join using the meeting credentials below.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto flex-shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 px-3 flex items-center justify-between gap-3 text-xs font-mono">
              <div>
                <p className="text-[9px] uppercase font-semibold text-slate-400">Meeting ID</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">815 0537 7396</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyZoomText('815 0537 7396', 'meetingId')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Copy Meeting ID"
              >
                {zoomCopiedField === 'meetingId' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 px-3 flex items-center justify-between gap-3 text-xs font-mono">
              <div>
                <p className="text-[9px] uppercase font-semibold text-slate-400">Passcode</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">163738</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyZoomText('163738', 'passcode')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Copy Passcode"
              >
                {zoomCopiedField === 'passcode' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <a
              href="https://zoom.us/j/81505377396"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Launch Zoom</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {!isStudent && (
              <button
                type="button"
                onClick={() => setShowZoomExceptionModal(true)}
                className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Broadcast Schedule Exception / Alert"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Exception Alert</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: MONTHLY CALENDAR VIEW (MOBILE OPTIMIZED) */}
      {viewMode === 'calendar' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          {/* Month Header Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <h3 className="text-lg sm:text-xl font-black text-white font-mono tracking-wide">
                {monthName} {year}
              </h3>
              <span className="text-[11px] sm:text-xs font-bold text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded-full border border-indigo-800/60">
                {filteredSchedules.length} Scheduled
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleGoToToday}
                className="px-2.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700 cursor-pointer min-h-[36px]"
              >
                Today
              </button>
              <button
                onClick={handlePrevMonth}
                className="p-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DESKTOP / TABLET 7-COLUMN MATRIX (Visible on md screens and up, with scroll safeguard) */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <div className="min-w-[720px] space-y-2">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-black uppercase tracking-wider text-slate-400 py-2 border-b border-slate-800/80">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Calendar Grid (Days) */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty padding cells for starting day */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[110px] bg-slate-950/40 border border-slate-800/40 rounded-xl p-2 opacity-30" />
                ))}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isToday = dateStr === todayStr;
                  const dayClasses = filteredSchedules.filter(s => s.date === dateStr);

                  return (
                    <div
                      key={`day-${dayNum}`}
                      onClick={() => !isStudent && handleOpenAddModal(dateStr)}
                      className={`min-h-[110px] bg-slate-950 border rounded-xl p-2.5 flex flex-col justify-between transition-all ${
                        !isStudent ? 'cursor-pointer group hover:border-indigo-500/60 hover:bg-slate-900/90' : 'cursor-default'
                      } ${
                        isToday
                          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/20'
                          : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg ${
                          isToday 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'text-slate-300 group-hover:text-indigo-400'
                        }`}>
                          {dayNum}
                        </span>

                        {!isStudent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddModal(dateStr);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-md text-[10px] font-bold transition-all"
                            title="Add class on this date"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Scheduled Classes Badges on this day */}
                      <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar my-1">
                        {dayClasses.map(cls => (
                          <div
                            key={cls.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isStudent) handleOpenEditModal(cls);
                            }}
                            className={`p-1.5 rounded-lg border text-[11px] leading-tight transition-all shadow-xs relative group/item ${
                              !isStudent ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'
                            } ${getModuleBadgeStyle(cls.courseCode)}`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-extrabold font-mono text-[9px] uppercase tracking-wider">
                                {cls.courseCode}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-mono opacity-80">
                                  {cls.timeSlot?.split(' ')[0] || ''}
                                </span>
                                {!isStudent && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopySchedule(cls, e)}
                                      className="opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-indigo-600 hover:text-white rounded text-slate-300 transition-all cursor-pointer"
                                      title="Duplicate / Copy class card"
                                    >
                                      <Copy className="w-2.5 h-2.5 text-indigo-300 hover:text-white" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSchedule(cls.id);
                                      }}
                                      className="opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-rose-600 hover:text-white rounded text-slate-300 transition-all cursor-pointer"
                                      title="Remove class from schedule"
                                    >
                                      <Trash2 className="w-2.5 h-2.5 text-rose-400 hover:text-white" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <p className="font-bold line-clamp-2 text-slate-100">
                              {cls.title}
                            </p>
                            <div className="mt-1 flex items-center justify-between text-[9px] opacity-80 pt-0.5 border-t border-white/10">
                              <span className="truncate max-w-[80px]">{cls.instructor}</span>
                              {cls.status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                              {cls.status === 'live' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                            </div>
                          </div>
                        ))}
                      </div>

                      {dayClasses.length === 0 && (
                        <div className="text-[10px] text-slate-600 italic group-hover:text-slate-400 transition-colors">
                          + Add class
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MOBILE OPTIMIZED CALENDAR VIEW (Visible on screens smaller than md) */}
          <div className="block md:hidden space-y-4">
            {/* 1. Mobile Calendar Date Picker Grid */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400 pb-2 mb-1 border-b border-slate-800">
                <div>Su</div>
                <div>Mo</div>
                <div>Tu</div>
                <div>We</div>
                <div>Th</div>
                <div>Fr</div>
                <div>Sa</div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {/* Empty padding cells */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`m-empty-${i}`} className="h-11 rounded-xl bg-slate-900/20 opacity-20" />
                ))}

                {/* Day Buttons */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isToday = dateStr === todayStr;
                  const isSelected = selectedMobileDay === dayNum;
                  const dayClasses = filteredSchedules.filter(s => s.date === dateStr);
                  const hasClasses = dayClasses.length > 0;

                  return (
                    <button
                      key={`m-day-${dayNum}`}
                      type="button"
                      onClick={() => setSelectedMobileDay(dayNum)}
                      className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-black shadow-lg ring-2 ring-indigo-400'
                          : isToday
                            ? 'bg-indigo-950 border border-indigo-500/70 text-indigo-300 font-bold'
                            : hasClasses
                              ? 'bg-slate-900 border border-slate-700/80 text-slate-100 font-bold'
                              : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xs font-mono">{dayNum}</span>
                      {hasClasses && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {dayClasses.map((c, idx) => (
                            <span 
                              key={c.id || idx} 
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected 
                                  ? 'bg-white' 
                                  : c.status === 'live' 
                                    ? 'bg-rose-500 animate-ping' 
                                    : c.status === 'completed' 
                                      ? 'bg-emerald-400' 
                                      : 'bg-indigo-400'
                              }`} 
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Selected Date Class Panel (Expanded readable card view) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                    Selected Mobile Date
                  </span>
                  <h4 className="text-sm font-black text-white font-mono flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-amber-400" />
                    {(() => {
                      const dtStr = getSelectedMobileDateStr();
                      try {
                        const [y, m, d] = dtStr.split('-').map(Number);
                        const dt = new Date(y, m - 1, d);
                        return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                      } catch (e) {
                        return dtStr;
                      }
                    })()}
                  </h4>
                </div>

                {!isStudent && (
                  <button
                    onClick={() => handleOpenAddModal(getSelectedMobileDateStr())}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Class</span>
                  </button>
                )}
              </div>

              {/* Class Cards for Selected Date */}
              {(() => {
                const targetDate = getSelectedMobileDateStr();
                const dayClasses = filteredSchedules.filter(s => s.date === targetDate);

                if (dayClasses.length === 0) {
                  return (
                    <div className="py-6 text-center text-slate-500 space-y-2">
                      <p className="text-xs italic">No classes scheduled on this date.</p>
                      {!isStudent && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal(targetDate)}
                          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-indigo-600 hover:text-white text-indigo-300 font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Schedule Class for this Date
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {dayClasses.map(cls => (
                      <div
                        key={cls.id}
                        className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all shadow-md ${getModuleBadgeStyle(cls.courseCode)}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-950/70 border border-white/20 text-white font-mono">
                            {cls.courseCode}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            cls.status === 'live' ? 'bg-rose-500 text-white animate-pulse' :
                            cls.status === 'completed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' :
                            'bg-slate-950/60 text-slate-200'
                          }`}>
                            {cls.status}
                          </span>
                        </div>

                        <div>
                          <h5 className="text-sm font-black text-white leading-tight">
                            {cls.title}
                          </h5>
                          <p className="text-xs text-slate-300 opacity-90 mt-0.5 font-medium">
                            {cls.moduleName || cls.courseCode}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-200 bg-slate-950/50 p-2.5 rounded-xl border border-white/10">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span className="truncate">{cls.timeSlot}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                            <span className="truncate">{cls.room}</span>
                          </div>
                          <div className="col-span-2 flex items-center gap-1.5 text-slate-300 text-[11px] font-sans pt-1 border-t border-white/10">
                            <User className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                            <span>Instructor: <strong>{cls.instructor}</strong></span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <a
                            href="https://zoom.us/j/81505377396"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Join Zoom</span>
                          </a>

                          {!isStudent && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(cls)}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleCopySchedule(cls, e)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-xl cursor-pointer"
                                title="Duplicate class"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSchedule(cls.id)}
                                className="p-1.5 bg-slate-900 hover:bg-rose-950 text-rose-400 border border-slate-700 rounded-xl cursor-pointer"
                                title="Delete class"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 3. Monthly Agenda Overview (All classes list for the month) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 uppercase font-mono text-indigo-400 text-[10px]">
                  <List className="w-3.5 h-3.5" /> All Scheduled Classes in {monthName} ({filteredSchedules.length})
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {filteredSchedules.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      try {
                        const [, , dStr] = item.date.split('-');
                        if (dStr) setSelectedMobileDay(Number(dStr));
                      } catch (e) {}
                    }}
                    className={`p-2.5 rounded-xl border bg-slate-900 hover:bg-slate-800/80 border-slate-800 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      item.date === getSelectedMobileDateStr() ? 'ring-1 ring-indigo-500 border-indigo-500/50' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
                          {item.courseCode}
                        </span>
                        <span className="text-[10px] font-mono text-amber-300 font-bold">{item.date}</span>
                      </div>
                      <p className="text-xs font-bold text-white truncate mt-0.5">{item.title}</p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: WEEKLY TIMETABLE MATRIX GRID VIEW (Matches Uploaded Mockup Screenshot) */}
      {viewMode === 'timetable' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Grid className="w-4 h-4 text-indigo-400" />
                Weekly Period Matrix Schedule
              </h3>
              <p className="text-xs text-slate-400">
                Interactive timetable grid by weekday and course periods. Click any cell to assign or edit lectures.
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/30 font-bold">
              5 Daily Periods + Evening Slots
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-black uppercase text-slate-400">
                  <th className="p-4 w-32 border-r border-slate-800">DAY</th>
                  {PERIODS.slice(0, 5).map(p => (
                    <th key={p.id} className="p-4 text-center border-r border-slate-800 min-w-[150px]">
                      <div className="text-slate-200 font-extrabold">{p.label}</div>
                      <div className="text-[10px] text-slate-500 font-mono normal-case font-medium mt-0.5">{p.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {WEEK_DAYS.map((dayName) => (
                  <tr key={dayName} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-black text-slate-200 bg-slate-950/40 border-r border-slate-800 font-mono">
                      {dayName}
                    </td>

                    {PERIODS.slice(0, 5).map((p) => {
                      // Match scheduled classes corresponding to this period/day
                      const cellClasses = filteredSchedules.filter(s => {
                        if (!s || !s.period || !p || !p.label) return false;
                        return (s.period || '').toLowerCase().includes((p.label || '').toLowerCase().slice(0, 3));
                      });

                      const classInSlot = cellClasses[0]; // If mapped

                      return (
                        <td 
                          key={p.id} 
                          className={`p-3 text-center border-r border-slate-800/80 align-top transition-all group relative min-h-[90px] ${
                            !isStudent ? 'hover:bg-slate-800/50 cursor-pointer' : ''
                          }`}
                          onClick={() => {
                            if (isStudent) return;
                            if (classInSlot) handleOpenEditModal(classInSlot);
                            else handleOpenAddModal(undefined, p.label);
                          }}
                        >
                          {classInSlot ? (
                            <div className={`p-2.5 rounded-xl border text-left shadow-xs relative group/cell ${getModuleBadgeStyle(classInSlot.courseCode)}`}>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-black font-mono uppercase">
                                  {classInSlot.courseCode}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold opacity-75">{classInSlot.date}</span>
                                  {!isStudent && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopySchedule(classInSlot, e)}
                                        className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-indigo-600 hover:text-white rounded bg-slate-900/60 text-indigo-300 transition-all cursor-pointer"
                                        title="Copy card"
                                      >
                                        <Copy className="w-3 h-3 text-indigo-400 hover:text-white" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSchedule(classInSlot.id);
                                        }}
                                        className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-rose-600 hover:text-white rounded bg-slate-900/60 text-rose-300 transition-all cursor-pointer"
                                        title="Remove class"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-400 hover:text-white" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <p className="font-extrabold text-white text-xs line-clamp-2">
                                {classInSlot.title}
                              </p>
                              <div className="mt-1.5 text-[10px] text-slate-300 font-medium flex items-center justify-between">
                                <span className="truncate max-w-[100px]">{classInSlot.instructor}</span>
                                <span className="opacity-75">{classInSlot.room}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="py-6 text-slate-500 italic text-xs font-serif transition-colors flex flex-col items-center justify-center gap-1">
                              <span>No Lecture</span>
                              {!isStudent && <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: AGENDA LIST VIEW */}
      {viewMode === 'agenda' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <List className="w-4 h-4 text-indigo-400" />
              All Scheduled Classes ({filteredSchedules.length})
            </h3>
            <span className="text-xs text-slate-400 font-mono">Past, Present & Future Dates</span>
          </div>

          <div className="space-y-3">
            {filteredSchedules.length === 0 ? (
              <EmptyState
                title={schedules.length === 0 ? 'No classes scheduled yet' : 'No classes match this filter'}
                description={schedules.length === 0
                  ? 'Use the "Schedule Lecture" button above to add your first class.'
                  : 'Try switching to "All Core Modules" or a different view mode.'
                }
                icon={<CalendarIcon className="h-6 w-6" />}
                action={
                  selectedModuleFilter !== 'all' ? (
                    <button type="button" onClick={() => setSelectedModuleFilter('all')} className="md-btn-tonal text-sm">
                      Show All Modules
                    </button>
                  ) : undefined
                }
              />
            ) : filteredSchedules.map((item) => (
              <div 
                key={item.id}
                onClick={() => !isStudent && handleOpenEditModal(item)}
                className={`p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                  !isStudent ? 'hover:border-indigo-500/50 cursor-pointer hover:bg-slate-800/40' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl border flex flex-col items-center justify-center font-mono font-bold text-xs min-w-[90px] ${getModuleBadgeStyle(item.courseCode)}`}>
                    <span className="text-[10px] uppercase font-extrabold">{item.courseCode}</span>
                    <span className="text-xs text-white">{item.date}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950 border border-indigo-800/60 px-2 py-0.5 rounded">
                        {item.moduleName || item.courseCode}
                      </span>
                      {item.status === 'completed' && (
                        <span className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {item.status === 'live' && (
                        <span className="text-[10px] font-extrabold text-white bg-rose-600 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 bg-white rounded-full" /> Live Today
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-white">{item.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1 text-slate-300 font-mono">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" /> {item.timeSlot}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-amber-400" /> {item.instructor}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" /> {item.room}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <a
                    href={generateGoogleCalendarUrl({
                      id: item.id,
                      title: item.title,
                      description: `Course: ${item.moduleName || item.courseCode}\nInstructor: ${item.instructor}`,
                      location: item.room,
                      date: item.date,
                      startTime: item.timeSlot,
                      courseCode: item.courseCode
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1.5 bg-blue-950/80 hover:bg-blue-900 text-blue-300 hover:text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-blue-800/60"
                    title="Add event to Google Calendar"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">Google Cal</span>
                  </a>

                  {!isStudent && item.classDayId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTakeAttendanceForDay(item.classDayId!);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Attendance
                    </button>
                  )}
                  {!isStudent && (
                    <>
                      <button
                        onClick={(e) => handleCopySchedule(item, e)}
                        className="p-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 rounded-lg transition-colors cursor-pointer border border-indigo-800/60"
                        title="Copy / Duplicate Class"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(item);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer border border-slate-700"
                        title="Edit Class"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSchedule(item.id);
                        }}
                        className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg transition-colors cursor-pointer border border-rose-800/60"
                        title="Remove Class from Calendar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCHEDULE LECTURE MODAL (OPTIMIZED & MOBILE READY) */}
      {!isStudent && showScheduleModal && (
        <Modal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            navigate({ action: undefined, id: undefined });
          }}
          title={editingItem ? 'Edit Scheduled Class' : isCopyingMode ? 'Duplicate Class Card' : 'Schedule New Class Lecture'}
          subtitle={editingItem ? 'Modify details for this class session' : 'Configure date, period, instructor, and streaming parameters'}
          icon={
            isCopyingMode ? (
              <Copy className="w-5 h-5 text-indigo-400 shrink-0" />
            ) : editingItem ? (
              <Edit3 className="w-5 h-5 text-indigo-400 shrink-0" />
            ) : (
              <Plus className="w-5 h-5 text-indigo-400 shrink-0" />
            )
          }
          size="2xl"
        >
          <form onSubmit={handleSaveSchedule} className="space-y-5">
              {/* Duplication Notice Banner */}
              {isCopyingMode && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
                  <Copy className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-amber-300">Duplicating Class to Target Date</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      Choose a new date below to copy this exact class session to another day on the calendar.
                    </p>
                  </div>
                </div>
              )}

              {/* LIVE CARD PREVIEW BANNER */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-indigo-400">
                    <Eye className="w-3.5 h-3.5" /> Live Student Preview
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    {showLivePreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                </div>

                {showLivePreview && (() => {
                  const mod = CORE_MODULES.find(m => m.code === formModuleCode) || CORE_MODULES[0];
                  return (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {mod.code}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">
                            {formPeriod}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            formStatus === 'live' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                            formStatus === 'completed' ? 'bg-slate-800 text-slate-400' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {formStatus}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white truncate">
                          {formTitle.trim() || 'Untitled Class Lecture'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            {formTimeSlot}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-teal-400" />
                            {formInstructor}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-400" />
                            {formDeliveryMode === 'virtual' ? 'Zoom Live Stream' : formRoom}
                          </span>
                        </div>
                      </div>
                      <div className="text-right sm:border-l sm:border-slate-800 sm:pl-3 flex-shrink-0">
                        <p className="text-xs font-bold text-amber-300 font-mono">
                          {getFormattedDayOfWeek(formDate)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* SECTION 1: TARGET DATE & QUICK SHORTCUTS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-indigo-400" /> Target Class Date *
                  </label>
                  <span className="text-[11px] font-mono font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/50">
                    {getFormattedDayOfWeek(formDate) || 'No date selected'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={`w-full p-2.5 bg-slate-950 border rounded-xl text-xs font-mono font-bold text-white focus:ring-2 focus:outline-none min-h-[44px] ${
                      isCopyingMode 
                        ? 'border-amber-500/70 ring-2 ring-amber-500/30 focus:ring-amber-500' 
                        : 'border-slate-700 focus:ring-indigo-500/50 focus:border-indigo-500'
                    }`}
                  />

                  {/* Quick Date Presets */}
                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                    <button
                      type="button"
                      onClick={() => handleQuickDateShortcut('today')}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer whitespace-nowrap min-h-[44px]"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDateShortcut('next_tuesday')}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold rounded-xl border border-indigo-800/60 transition-colors cursor-pointer whitespace-nowrap min-h-[44px]"
                    >
                      Next Tue
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDateShortcut('next_thursday')}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold rounded-xl border border-teal-800/60 transition-colors cursor-pointer whitespace-nowrap min-h-[44px]"
                    >
                      Next Thu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDateShortcut('plus_week')}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-amber-800/60 transition-colors cursor-pointer whitespace-nowrap min-h-[44px]"
                    >
                      +1 Wk
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CORE MODULE SELECTOR */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" /> Core Module & Course Code
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CORE_MODULES.map(m => {
                    const isSelected = formModuleCode === m.code;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFormModuleCode(m.code)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[48px] ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-400 text-white font-black shadow-md ring-2 ring-indigo-400/30' 
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold tracking-wider opacity-80">{m.code}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="text-xs truncate font-extrabold mt-0.5">{m.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: LECTURE TITLE */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-teal-400" /> Lecture Title & Subject Topic *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Five-Fold Governance & Spiritual Authority (Eph 2:20)"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none min-h-[44px]"
                />
              </div>

              {/* SECTION 4: PERIOD SLOT & TIME RANGE */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" /> Period Slot & Time Slot
                </label>

                {/* Period Slot Quick Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {PERIODS.map(p => {
                    const isSelected = formPeriod === p.label;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setFormPeriod(p.label);
                          setFormTimeSlot(p.time);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          isSelected 
                            ? 'bg-amber-500 text-slate-950 font-black shadow-xs' 
                            : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Period Name Label</label>
                    <input
                      type="text"
                      required
                      value={formPeriod}
                      onChange={(e) => setFormPeriod(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Time Range (EST)</label>
                    <input
                      type="text"
                      required
                      value={formTimeSlot}
                      onChange={(e) => setFormTimeSlot(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500 min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: DELIVERY MODE & LOCATION / ZOOM LINK */}
              <div className="space-y-2.5">
                <label className="block text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-400" /> Delivery Mode & Venue
                </label>

                {/* Delivery Mode Tabs */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormDeliveryMode('in_person')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold ${
                      formDeliveryMode === 'in_person'
                        ? 'bg-rose-600 border-rose-400 text-white font-black shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>In-Person</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormDeliveryMode('virtual')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold ${
                      formDeliveryMode === 'virtual'
                        ? 'bg-indigo-600 border-indigo-400 text-white font-black shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Zoom Stream</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormDeliveryMode('hybrid')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold ${
                      formDeliveryMode === 'hybrid'
                        ? 'bg-teal-600 border-teal-400 text-white font-black shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Hybrid Mode</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sanctuary / Room Hall</label>
                    <select
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer min-h-[44px]"
                    >
                      <option value="Main Sanctuary Hall A">Main Sanctuary Hall A</option>
                      <option value="Main Sanctuary Hall B">Main Sanctuary Hall B</option>
                      <option value="Outreach Training Room">Outreach Training Room</option>
                      <option value="Leadership Center B">Leadership Center B</option>
                      <option value="Prayer & Warfare Chapel">Prayer & Warfare Chapel</option>
                      <option value="Lecture Hall A">Lecture Hall A</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Instructor / Presenter</label>
                    <select
                      value={formInstructor}
                      onChange={(e) => setFormInstructor(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer min-h-[44px]"
                    >
                      <option value="Dr. Faculty Director">Dr. Faculty Director</option>
                      <option value="Rev. Academic Dean">Rev. Academic Dean</option>
                      <option value="Evangelism Ministry Lead">Evangelism Ministry Lead</option>
                      <option value="Pastor Senior Advisor">Pastor Senior Advisor</option>
                      <option value="Prophetic Faculty Director">Prophetic Faculty Director</option>
                      <option value="HTEIM Academic Directorate">HTEIM Academic Directorate</option>
                    </select>
                  </div>
                </div>

                {(formDeliveryMode === 'virtual' || formDeliveryMode === 'hybrid') && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-indigo-300 uppercase">Live Zoom Broadcast Link</label>
                      <button
                        type="button"
                        onClick={() => setFormZoomUrl('https://zoom.us/j/hteim-school-of-ministry')}
                        className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                      >
                        Reset to Default HTEIM Zoom
                      </button>
                    </div>
                    <input
                      type="url"
                      value={formZoomUrl}
                      onChange={(e) => setFormZoomUrl(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-indigo-900/60 rounded-xl text-xs font-mono text-indigo-200 focus:outline-none focus:border-indigo-500 min-h-[44px]"
                    />
                  </div>
                )}
              </div>

              {/* SECTION 6: SESSION STATUS & MULTI-WEEK REPLICATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-extrabold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-400" /> Session Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer min-h-[44px]"
                  >
                    <option value="upcoming">Upcoming Session</option>
                    <option value="live">Live Active Session</option>
                    <option value="completed">Completed Session</option>
                  </select>
                </div>

                {!editingItem && (
                  <div>
                    <label className="block text-xs font-extrabold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5 text-emerald-400" /> Weekly Replication
                    </label>
                    <select
                      value={formRepeatWeeks}
                      onChange={(e) => setFormRepeatWeeks(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer min-h-[44px]"
                    >
                      <option value={1}>Single Class (1 Week)</option>
                      <option value={2}>Repeat for 2 Consecutive Weeks</option>
                      <option value={3}>Repeat for 3 Consecutive Weeks</option>
                      <option value={4}>Repeat for 4 Consecutive Weeks</option>
                      <option value={6}>Repeat for 6 Consecutive Weeks</option>
                    </select>
                  </div>
                )}
              </div>

            {/* Modal Sticky Actions Footer */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
              {editingItem ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteSchedule(editingItem.id)}
                    className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setIsCopyingMode(true);
                    }}
                    className="px-3 py-2 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/60 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Convert this into a copy to place on a new target date"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Duplicate</span>
                  </button>
                </div>
              ) : <div />}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  className={`px-5 py-2 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    isCopyingMode 
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' 
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  }`}
                >
                  {isCopyingMode ? (
                    <>
                      <Copy className="w-4 h-4" /> Copy Class to Date
                    </>
                  ) : editingItem ? (
                    'Update Class'
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save & Schedule Class
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Admin Schedule Exception / Alert Modal */}
      {showZoomExceptionModal && (
        <Modal
          isOpen={showZoomExceptionModal}
          onClose={() => setShowZoomExceptionModal(false)}
          title="Broadcast Schedule Exception Alert"
          icon={<AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />}
          size="md"
        >
          <form onSubmit={handleSaveZoomException} className="space-y-4 text-xs font-medium text-slate-300">
              <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs text-blue-200">
                Standard Rule: <strong>Classes go live via Zoom every Tuesday (7:00 PM - 9:00 PM EST)</strong>. Use this toggle to notify students if a specific Tuesday class is modified, canceled, or moved.
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-white">Activate Schedule Exception Banner</p>
                  <p className="text-[10px] text-slate-400">Display notice on Student Portal & Schedule Tab</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasZoomException}
                    onChange={(e) => setHasZoomException(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                  Exception Details / Announcement Note
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Note: Class on Tuesday, August 4 will start at 7:30 PM EST via Zoom due to faculty convocation."
                  value={zoomExceptionNote ?? ''}
                  onChange={(e) => setZoomExceptionNote(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowZoomExceptionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer"
                >
                  Save & Post Alert
                </button>
              </div>
            </form>
          </Modal>
        )}
    </div>
  );
};
