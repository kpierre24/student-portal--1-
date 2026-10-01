import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Award,
  FileUp,
  X,
  Calendar,
  Trash2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  Zap,
  GraduationCap,
  Sliders,
  DollarSign,
  CheckCircle,
  UserCheck,
  Radio,
  Shield,
  BookOpen,
  FileText,
  AlertTriangle,
  Send,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { AppNotification, TabType } from '../types';
import { 
  CentralNotification, 
  NotificationCategory, 
  NotificationEventType,
  CATEGORY_LABELS,
  NOTIFICATION_DEFINITIONS 
} from '../types/notifications';
import { CentralNotificationService } from '../services/notification/CentralNotificationService';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onSelectNotification: (notification: AppNotification) => void;
  onTriggerScan?: () => void;
  onAddTestNotification?: (notif: AppNotification) => void;
  currentRole?: string;
  currentStudentName?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotifications,
  onSelectNotification,
  onTriggerScan,
  onAddTestNotification,
  currentRole = 'admin',
  currentStudentName = 'Abigail Selkridge'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showTestDrawer, setShowTestDrawer] = useState(false);
  const isAdminOrTeacher = currentRole === 'admin' || currentRole === 'teacher';
  
  // Category Filter Tabs
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter notifications by active category, unread status, and role relevance
  const filteredNotifications = notifications.filter(n => {
    if (unreadOnly && n.read) return false;
    
    if (activeCategory !== 'all') {
      if (n.category && n.category === activeCategory) return true;
      if (activeCategory === 'academic' && (n.type === 'due_date' || n.type === 'graded' || n.type === 'submission' || n.type === 'new_assignment' || n.type === 'assignment_deadline' || n.type === 'grade_published' || n.type === 'assignment_submitted' || n.type === 'lecturer_pending_grades')) return true;
      if (activeCategory === 'attendance' && (n.type === 'at_risk_attendance' || n.type === 'attendance_warning' || n.type === 'attendance_issue')) return true;
      if (activeCategory === 'financial' && (n.type === 'payment_past_due' || n.type === 'payment_reminder' || n.type === 'payment_received' || n.type === 'outstanding_balance')) return true;
      if (activeCategory === 'announcement' && (n.type === 'general' || n.type === 'new_announcement')) return true;
      if (activeCategory === 'enrollment' && (n.type === 'registration_confirmation' || n.type === 'new_enrollment')) return true;
      if (activeCategory === 'library' && n.type === 'library_resource_added') return true;
      return false;
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowTestDrawer(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getNotifIcon = (notif: AppNotification) => {
    const eventType = (notif.type || notif.category) as string;
    switch (eventType) {
      // Student events
      case 'new_assignment':
      case 'due_date':
        return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'assignment_deadline':
      case 'past_due':
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'grade_published':
      case 'graded':
        return <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'attendance_warning':
      case 'at_risk_attendance':
      case 'attendance_issue':
        return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse" />;
      case 'payment_reminder':
      case 'payment_due':
      case 'payment_past_due':
      case 'outstanding_balance':
        return <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'payment_received':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'new_announcement':
      case 'general':
        return <Radio className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'registration_confirmation':
      case 'new_enrollment':
      case 'application_status':
        return <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'library_resource_added':
        return <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'assignment_submitted':
        return <FileUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'lecturer_pending_grades':
        return <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /> Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300">
            High
          </span>
        );
      case 'low':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-400">
            Low
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300">
            Normal
          </span>
        );
    }
  };

  // Helper trigger test notifications for any of the 14 defined events
  const handleTriggerTestEvent = async (eventType: NotificationEventType) => {
    const def = NOTIFICATION_DEFINITIONS[eventType];
    if (!def) return;

    const sampleTargets: Record<string, any> = {
      new_assignment: { title: 'New Exegesis Paper Assigned: SOM-101', msg: 'Pastor Samuel Selkridge has posted a new Hermeneutical Exegesis assignment due next Tuesday.', role: 'student', tab: 'courses' },
      assignment_deadline: { title: 'Deadline Approaching: Evangelism Practicum Log', msg: 'Your 2-page personal soul-winning practicum report is due in 48 hours for SOM-102.', role: 'student', tab: 'courses' },
      grade_published: { title: 'Grade Published: Pastoral Ethics Exam', msg: 'Your evaluation for Ministerial Ethics Module 3 has been graded: 92% (A - High Distinction).', role: 'student', tab: 'courses' },
      attendance_warning: { title: 'Institutional Attendance Warning (< 75%)', msg: 'Your attendance rate in Module 2 Evangelism is currently 66.7%, below the mandatory 75% threshold.', role: 'student', tab: 'attendance', prio: 'urgent' },
      payment_reminder: { title: 'Tuition Installment Notice: 2026 Semester 1', msg: 'Your second semester tuition installment is due on the 15th. Check your payment statement to view receipts.', role: 'student', tab: 'payments' },
      new_announcement: { title: 'Apostolic Convocation & Live Broadcast', msg: 'Special Ministry Convocation this Friday at 7:00 PM EST with Apostle Gillian Selkridge.', role: 'student', tab: 'home' },
      registration_confirmation: { title: 'Course Registration Confirmed: SOM-101', msg: 'You are officially enrolled in SOM-101 Biblical Hermeneutics & Exegesis for 2026 Semester 1.', role: 'student', tab: 'courses' },
      library_resource_added: { title: 'New Ministerial Resource Uploaded', msg: 'The "Hermeneutics & Exegesis Handout 2026" PDF syllabus has been added to the institutional digital library.', role: 'student', tab: 'library' },
      
      // Admin events
      new_enrollment: { title: 'New Student Application Submitted', msg: 'Pastor David Warner submitted an application for the Level 1 Foundation Cohort.', role: 'admin', tab: 'students' },
      payment_received: { title: 'Tuition Payment Received: $250.00', msg: 'Student Abigail Selkridge submitted payment for 2026 Semester 1 tuition via Bank Transfer.', role: 'admin', tab: 'payments' },
      outstanding_balance: { title: 'Overdue Balance Notice: 3 Students', msg: 'Three students have outstanding tuition balances totaling $750.00 that are past due for Semester 1.', role: 'admin', tab: 'payments', prio: 'high' },
      attendance_issue: { title: 'At-Risk Attendance Flagged: Pastor Christy Arthur', msg: 'Pastor Christy Arthur attendance rate dropped to 66.7% in SOM-102 (At-Risk trigger < 75%).', role: 'admin', tab: 'attendance', prio: 'urgent' },
      assignment_submitted: { title: 'Assignment Submissions Ready for Grading', msg: '4 students have submitted their Module 1 Exegesis papers in SOM-101.', role: 'admin', tab: 'courses' },
      lecturer_pending_grades: { title: 'Pending Grades Alert: SOM-104', msg: 'Lecturer grades for Apostolic Governance Quiz #1 are pending evaluation beyond the 5-day SLA.', role: 'admin', tab: 'courses', prio: 'high' }
    };

    const targetData = sampleTargets[eventType] || { title: def.label, msg: def.description, role: def.role, tab: def.actionTab };

    const newNotif = await CentralNotificationService.notify({
      eventType,
      category: def.category,
      title: targetData.title,
      message: targetData.msg,
      targetRole: targetData.role === 'both' ? 'all' : targetData.role,
      studentName: targetData.role === 'student' ? currentStudentName : undefined,
      priority: (targetData.prio || def.defaultPriority || 'normal') as any,
      actionTab: targetData.tab
    });

    if (onAddTestNotification) {
      onAddTestNotification(newNotif as any);
    }
  };

  return (
    <div className="relative inline-block text-left" id="header-notification-center" ref={dropdownRef}>
      {/* Bell Icon Button with Unread Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50 shadow-md font-bold'
            : unreadCount > 0
            ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}
        title="Real-Time Notification Center"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className={`w-4.5 h-4.5 ${isOpen ? 'text-slate-950' : 'text-amber-500 animate-bounce'}`} />
        ) : (
          <Bell className="w-4.5 h-4.5" />
        )}

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-rose-600 text-white font-mono font-black text-[10px] items-center justify-center shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-[420px] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Bell className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  Notification Center
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-bold text-[10px] rounded-full">
                      {unreadCount} Unread
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {isAdminOrTeacher ? 'Institutional alerts & student oversight' : `Academic updates for ${currentStudentName}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPreferencesModal(true)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
                title="Delivery Channel Preferences"
              >
                <Sliders className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer font-bold ${
                  unreadOnly
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {unreadOnly ? 'Showing Unread' : 'Show All'}
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
                >
                  <CheckCheck className="w-3 h-3" /> Mark All Read
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isAdminOrTeacher && (
                <button
                  onClick={() => setShowTestDrawer(!showTestDrawer)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
                >
                  <Zap className="w-3 h-3 text-amber-500" /> {showTestDrawer ? 'Hide Simulator' : 'Test Events'}
                </button>
              )}

              <button
                onClick={onClearNotifications}
                className="text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors text-[10px]"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>

          {/* Test Event Simulator Drawer (for Admins / Developers) */}
          {showTestDrawer && (
            <div className="p-3 bg-slate-950 border-b border-slate-800 text-white space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-400 tracking-wider">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Trigger Simulated Notification:
                </span>
              </div>
              
              {/* Student Events */}
              <div>
                <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">Student Notifications (8 Types):</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[9px] font-bold">
                  <button onClick={() => handleTriggerTestEvent('new_assignment')} className="p-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded truncate text-left cursor-pointer">
                    + New Assignment
                  </button>
                  <button onClick={() => handleTriggerTestEvent('assignment_deadline')} className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded truncate text-left cursor-pointer">
                    + Due Deadline
                  </button>
                  <button onClick={() => handleTriggerTestEvent('grade_published')} className="p-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded truncate text-left cursor-pointer">
                    + Grade Published
                  </button>
                  <button onClick={() => handleTriggerTestEvent('attendance_warning')} className="p-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded truncate text-left cursor-pointer">
                    + Att. Warning &lt;75%
                  </button>
                  <button onClick={() => handleTriggerTestEvent('payment_reminder')} className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded truncate text-left cursor-pointer">
                    + Tuition Reminder
                  </button>
                  <button onClick={() => handleTriggerTestEvent('new_announcement')} className="p-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded truncate text-left cursor-pointer">
                    + Broadcast Alert
                  </button>
                  <button onClick={() => handleTriggerTestEvent('registration_confirmation')} className="p-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded truncate text-left cursor-pointer">
                    + Reg Confirmed
                  </button>
                  <button onClick={() => handleTriggerTestEvent('library_resource_added')} className="p-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded truncate text-left cursor-pointer">
                    + Library Resource
                  </button>
                </div>
              </div>

              {/* Administrator Events */}
              <div>
                <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">Administrator Notifications (6 Types):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[9px] font-bold">
                  <button onClick={() => handleTriggerTestEvent('new_enrollment')} className="p-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded truncate text-left cursor-pointer">
                    + New Enrollment
                  </button>
                  <button onClick={() => handleTriggerTestEvent('payment_received')} className="p-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded truncate text-left cursor-pointer">
                    + Payment Received
                  </button>
                  <button onClick={() => handleTriggerTestEvent('outstanding_balance')} className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded truncate text-left cursor-pointer">
                    + Overdue Balance
                  </button>
                  <button onClick={() => handleTriggerTestEvent('attendance_issue')} className="p-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded truncate text-left cursor-pointer">
                    + At-Risk Att. Issue
                  </button>
                  <button onClick={() => handleTriggerTestEvent('assignment_submitted')} className="p-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded truncate text-left cursor-pointer">
                    + Submission Ready
                  </button>
                  <button onClick={() => handleTriggerTestEvent('lecturer_pending_grades')} className="p-1 bg-slate-800 hover:bg-slate-700 text-orange-300 rounded truncate text-left cursor-pointer">
                    + Pending Grades
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center justify-start bg-slate-100 dark:bg-slate-800/90 p-1.5 border-b border-slate-200 dark:border-slate-700 text-[10px] font-extrabold gap-1 overflow-x-auto custom-scrollbar">
            {['all', 'academic', 'attendance', 'financial', 'announcement', 'enrollment', 'library'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap capitalize ${
                  activeCategory === cat
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat === 'all' ? `All (${notifications.length})` : cat}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  No Notifications
                </p>
                <p className="text-[10px] text-slate-400">
                  {unreadOnly
                    ? 'All notifications in this view are marked as read!'
                    : 'You are all caught up! Real-time alerts will appear here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => {
                    onMarkAsRead(notif.id);
                    onSelectNotification(notif);
                    setIsOpen(false);
                  }}
                  className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer flex items-start gap-3 relative ${
                    !notif.read
                      ? 'bg-amber-500/5 dark:bg-amber-500/10 border-l-4 border-amber-500'
                      : 'opacity-85'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 mt-0.5">
                    {getNotifIcon(notif)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {(notif.category || notif.type || 'system').replace('_', ' ')}
                        </span>
                        {getPriorityBadge(notif.priority)}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {notif.createdAt?.includes('T') ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : notif.createdAt}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                      {notif.title}
                    </h4>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1">
                      <span className="text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-0.5 hover:underline">
                        {notif.actionTab
                          ? `Open in ${notif.actionTab.charAt(0).toUpperCase() + notif.actionTab.slice(1)}`
                          : 'View Record'}{' '}
                        <ChevronRight className="w-3 h-3" />
                      </span>

                      {!notif.read && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onMarkAsRead(notif.id);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Delivery Channels Engine Status Footer */}
          <div className="p-3 bg-slate-900 text-white border-t border-slate-800 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-bold text-slate-300">Channels:</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Check className="w-3 h-3" /> In-App
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Check className="w-3 h-3" /> Email
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Check className="w-3 h-3" /> Push
              </span>
              <span className="text-slate-500 font-medium">
                WhatsApp (Planned)
              </span>
            </div>

            <button
              onClick={() => setShowPreferencesModal(true)}
              className="text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              Configure <Sliders className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
      />
    </div>
  );
};
