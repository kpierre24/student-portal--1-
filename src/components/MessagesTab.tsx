import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  MessageSquarePlus, 
  Send, 
  Paperclip, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  X, 
  User, 
  Users,
  Shield, 
  GraduationCap, 
  ChevronRight, 
  Download, 
  Trash2, 
  Archive, 
  Check, 
  Sparkles, 
  Mail, 
  Tag,
  ArrowLeft,
  PaperclipIcon,
  RefreshCw,
  HelpCircle,
  Briefcase,
  Database,
  ExternalLink,
  Copy,
  CheckCheck,
  Settings,
  Bell,
  Radio,
  Share2
} from 'lucide-react';
import { EmptyState } from './UXPrimitives';
import { Modal } from './Modal';
import { AppMessage, MessageCategory, MessagePriority, MessageReply, MessageAttachment, WhatsAppGroupConfig } from '../types';
import { AppUser } from '../lib/userAuth';
import { sanitizeInput } from '../lib/securityHelper';
import { portalApi } from '../services/api/portalApiClient';

export const INITIAL_MESSAGES: AppMessage[] = [];

interface MessagesTabProps {
  appUser?: AppUser | null;
  messages: AppMessage[];
  onSendMessage: (msg: Omit<AppMessage, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'isReadByRecipient' | 'isReadBySender' | 'status'>) => void;
  onReplyMessage: (messageId: string, replyText: string, attachments?: MessageAttachment[]) => void;
  onUpdateStatus: (messageId: string, status: AppMessage['status']) => void;
  onDeleteMessage?: (messageId: string) => void;
  availableStudents?: { name: string; email?: string }[];
  initialNewMsgOpen?: boolean;
  prefilledRecipient?: string;
  prefilledCategory?: MessageCategory;
  prefilledSubject?: string;
}

interface ChatReplyInputFormProps {
  currentUserRole: string;
  onSendReply: (replyText: string) => void;
}

const ChatReplyInputForm: React.FC<ChatReplyInputFormProps> = React.memo(({ currentUserRole, onSendReply }) => {
  const [localReplyText, setLocalReplyText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localReplyText.trim()) return;
    onSendReply(localReplyText);
    setLocalReplyText('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 sm:space-y-3 sticky bottom-0">
      {/* Staff Quick Reply Presets */}
      {currentUserRole !== 'student' && (
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 overflow-x-auto custom-scrollbar pb-1">
          <span className="text-slate-400 uppercase text-[9px] shrink-0">Quick Reply:</span>
          <button
            type="button"
            onClick={() => setLocalReplyText('Thank you for reaching out. Your request has been approved and logged in your student portal.')}
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#025798]/15 text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer"
          >
            "Request Approved"
          </button>
          <button
            type="button"
            onClick={() => setLocalReplyText('Greetings! We have verified your tuition payment receipt. Your account status is now Paid In Full.')}
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#025798]/15 text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer"
          >
            "Payment Confirmed"
          </button>
          <button
            type="button"
            onClick={() => setLocalReplyText('Please refer to the Library tab and Classroom Media player for the recorded Zoom session audio.')}
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#025798]/15 text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer"
          >
            "Check Class Recording"
          </button>
        </div>
      )}

      {/* Text-Only Policy Banner */}
      <div className="p-2 sm:p-2.5 rounded-xl bg-[#b38f53]/15 border border-[#b38f53]/30 text-[#8c6a32] dark:text-[#dfc18b] text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#b38f53] shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-medium">
            Messaging is for <strong>typed text only</strong>. Submit assignment files in the <strong>Exams</strong> tab.
          </span>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            rows={2}
            placeholder="Write a typed reply or follow-up question..."
            value={localReplyText}
            onChange={(e) => setLocalReplyText(e.target.value)}
            className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#025798]/50 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={!localReplyText.trim()}
          className="min-h-[44px] px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl bg-[#023264] hover:bg-[#025798] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#b38f53]/30 active:opacity-80"
        >
          <Send className="w-4 h-4 text-[#dfc18b]" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </form>
  );
});

export const MessagesTab: React.FC<MessagesTabProps> = ({
  appUser,
  messages,
  onSendMessage,
  onReplyMessage,
  onUpdateStatus,
  onDeleteMessage,
  availableStudents = [],
  initialNewMsgOpen = false,
  prefilledRecipient = 'All Administration & Faculty',
  prefilledCategory = 'general',
  prefilledSubject = ''
}) => {
  // On mobile screens default to null so the user lands on the inbox threads list; on desktop auto-select first
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return messages[0]?.id || null;
    }
    return null;
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'group' | 'whatsapp' | 'open' | 'in_progress' | 'resolved' | 'archived' | 'sent_by_me'>('all');
  const [selectedCategory, setSelectedCategory] = useState<MessageCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Message Modal State
  const [showNewMsgModal, setShowNewMsgModal] = useState(initialNewMsgOpen);
  const [recipientName, setRecipientName] = useState(prefilledRecipient);
  const [category, setCategory] = useState<MessageCategory>(prefilledCategory);
  const [priority, setPriority] = useState<MessagePriority>('normal');
  const [subject, setSubject] = useState(prefilledSubject);
  const [content, setContent] = useState('');
  const [newAttachments, setNewAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Group & WhatsApp Messaging Controls (for Teachers / Admins)
  const [composeMode, setComposeMode] = useState<'direct' | 'group'>('direct');
  const [groupTarget, setGroupTarget] = useState<'all_students' | 'whatsapp_group' | 'cohort' | 'pending_tuition'>('all_students');
  const [channelPortal, setChannelPortal] = useState(true);
  const [channelWhatsApp, setChannelWhatsApp] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // WhatsApp Group Configuration
  const [whatsAppConfig, setWhatsAppConfig] = useState<WhatsAppGroupConfig>(() => {
    try {
      const saved = localStorage.getItem('hteim_whatsapp_group_config');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      groupName: 'HTEIM School of Ministry - Class Fellowship & Announcements',
      groupInviteUrl: 'https://chat.whatsapp.com/invite/HTEIMClassGroup2026',
      description: 'Official WhatsApp group for live Tuesday lecture links, ministry announcements, and prayer requests.'
    };
  });
  const [showWhatsAppConfigModal, setShowWhatsAppConfigModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState(whatsAppConfig.groupName);
  const [editGroupUrl, setEditGroupUrl] = useState(whatsAppConfig.groupInviteUrl);
  const [editGroupDesc, setEditGroupDesc] = useState(whatsAppConfig.description || '');
  
  // Reply State
  const [replyAttachments, setReplyAttachments] = useState<MessageAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const currentUserRole = appUser?.role || 'student';
  const currentUserName = appUser?.studentName || appUser?.name || 'Student';
  const currentUserEmail = appUser?.email || `${(currentUserName || '').toLowerCase().replace(/\s+/g, '.')}@hteim.edu`;
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin';

  // Load authoritative WhatsApp config from server API
  useEffect(() => {
    let isMounted = true;
    portalApi.getWhatsAppConfig()
      .then(res => {
        if (isMounted && res?.success && res.config) {
          setWhatsAppConfig(res.config);
          setEditGroupName(res.config.groupName || '');
          setEditGroupUrl(res.config.groupInviteUrl || '');
          setEditGroupDesc(res.config.description || '');
          try {
            localStorage.setItem('hteim_whatsapp_group_config', JSON.stringify(res.config));
          } catch {}
        }
      })
      .catch(err => {
        console.warn('Could not fetch remote WhatsApp config, using cached local config:', err);
      });
    return () => { isMounted = false; };
  }, []);

  // WhatsApp formatted broadcast text generator
  const generateWhatsAppBroadcastText = (subj: string, body: string, sender: string, role: string) => {
    return [
      `*📢 HTEIM SCHOOL OF MINISTRY ANNOUNCEMENT*`,
      `*Subject:* ${subj.trim() || 'Ministry Update'}`,
      `*Date:* ${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`,
      ``,
      `${body.trim() || 'No additional details provided.'}`,
      ``,
      `────────────────────────`,
      `🏛️ *HTEIM Student Portal:* ${typeof window !== 'undefined' ? window.location.origin : 'https://hteim.edu'}`,
      `💬 *Broadcasted by:* ${sender} (${role.toUpperCase()})`
    ].join('\n');
  };

  const handleOpenWhatsApp = (text?: string) => {
    const formatted = text || generateWhatsAppBroadcastText(subject || 'Class Update', content || '', currentUserName, currentUserRole);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(formatted)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenWhatsAppGroup = () => {
    if (typeof window !== 'undefined') {
      window.open(whatsAppConfig.groupInviteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyWhatsAppText = (text?: string) => {
    const formatted = text || generateWhatsAppBroadcastText(subject || 'Class Update', content || '', currentUserName, currentUserRole);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(formatted);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2000);
    }
  };

  const handleSaveWhatsAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Unauthorized: Only administrators can update the official WhatsApp group configuration.');
      return;
    }
    const updated: WhatsAppGroupConfig = {
      groupName: editGroupName.trim() || whatsAppConfig.groupName,
      groupInviteUrl: editGroupUrl.trim() || whatsAppConfig.groupInviteUrl,
      description: editGroupDesc.trim() || whatsAppConfig.description
    };
    setWhatsAppConfig(updated);
    try {
      localStorage.setItem('hteim_whatsapp_group_config', JSON.stringify(updated));
      await portalApi.updateWhatsAppConfig(updated);
    } catch (err: any) {
      console.warn('Failed to persist WhatsApp config to server API:', err);
    }
    setShowWhatsAppConfigModal(false);
  };

  // Filtered Messages
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      // Role filter visibility
      if (currentUserRole === 'student') {
        const isSender = (msg.senderName || '').toLowerCase() === (currentUserName || '').toLowerCase() || msg.senderEmail === currentUserEmail;
        const isRecipient = (msg.recipientName || '').toLowerCase().includes((currentUserName || '').toLowerCase()) ||
          msg.recipientType === 'all_staff' ||
          msg.recipientType === 'all_students' ||
          msg.recipientType === 'group' ||
          msg.recipientType === 'whatsapp_group' ||
          Boolean(msg.isGroupMessage) ||
          (msg.recipientName || '').toLowerCase().includes('all student') ||
          (msg.recipientName || '').toLowerCase().includes('all enrolled') ||
          (msg.recipientName || '').toLowerCase().includes('cohort') ||
          (msg.recipientName || '').toLowerCase().includes('whatsapp');
        if (!isSender && !isRecipient) return false;
      }

      // Filter Tab
      if (activeFilter === 'archived') {
        if (msg.status !== 'archived') return false;
      } else if (activeFilter === 'all') {
        if (msg.status === 'archived' && !searchQuery) return false;
      } else {
        if (msg.status === 'archived') return false;
      }

      if (activeFilter === 'unread' && msg.isReadByRecipient) return false;
      if (activeFilter === 'open' && msg.status !== 'open') return false;
      if (activeFilter === 'in_progress' && msg.status !== 'in_progress') return false;
      if (activeFilter === 'resolved' && msg.status !== 'resolved') return false;
      if (activeFilter === 'sent_by_me' && (msg.senderName || '').toLowerCase() !== (currentUserName || '').toLowerCase()) return false;
      
      // Group & WhatsApp filter tabs
      if (activeFilter === 'group' && !msg.isGroupMessage && msg.recipientType !== 'all_students' && msg.recipientType !== 'group' && msg.recipientType !== 'whatsapp_group') return false;
      if (activeFilter === 'whatsapp' && msg.recipientType !== 'whatsapp_group' && !msg.channelsSent?.includes('whatsapp') && msg.groupType !== 'whatsapp_group') return false;

      // Category
      if (selectedCategory !== 'all' && msg.category !== selectedCategory) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = (msg.subject || '').toLowerCase().includes(q);
        const matchSender = (msg.senderName || '').toLowerCase().includes(q);
        const matchBody = (msg.content || '').toLowerCase().includes(q);
        const matchRecipient = (msg.recipientName || '').toLowerCase().includes(q);
        if (!matchSub && !matchSender && !matchBody && !matchRecipient) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [messages, currentUserRole, currentUserName, currentUserEmail, activeFilter, selectedCategory, searchQuery]);

  const activeMessage = useMemo(() => {
    if (!selectedMessageId) return null;
    return messages.find(m => m.id === selectedMessageId) || null;
  }, [messages, selectedMessageId]);

  // Statistics
  const stats = useMemo(() => {
    const total = messages.length;
    const unread = messages.filter(m => !m.isReadByRecipient).length;
    const open = messages.filter(m => m.status === 'open' || m.status === 'in_progress').length;
    const resolved = messages.filter(m => m.status === 'resolved').length;
    return { total, unread, open, resolved };
  }, [messages]);

  // Handle File Upload to Base64 Data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'reply') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const promises: Promise<MessageAttachment>[] = (Array.from(files) as File[]).map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            name: file.name,
            url: event.target?.result as string,
            type: file.type
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(uploadedFiles => {
      if (target === 'new') {
        setNewAttachments(prev => [...prev, ...uploadedFiles]);
      } else {
        setReplyAttachments(prev => [...prev, ...uploadedFiles]);
      }
      setIsUploading(false);
      e.target.value = '';
    });
  };

  const handleSendNewMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) return;

    let computedRecipientType: AppMessage['recipientType'] = 'admin';
    let computedRecipientName = recipientName;
    let isGroup = false;

    if (composeMode === 'group' && currentUserRole !== 'student') {
      isGroup = true;
      if (groupTarget === 'all_students') {
        computedRecipientType = 'all_students';
        computedRecipientName = 'All Enrolled Students';
      } else if (groupTarget === 'whatsapp_group') {
        computedRecipientType = 'whatsapp_group';
        computedRecipientName = whatsAppConfig.groupName || 'HTEIM WhatsApp Community Group';
      } else if (groupTarget === 'cohort') {
        computedRecipientType = 'group';
        computedRecipientName = 'Active Ministry Module Cohort';
      } else if (groupTarget === 'pending_tuition') {
        computedRecipientType = 'group';
        computedRecipientName = 'Pending Tuition Students';
      }
    } else {
      if (recipientName === 'All Enrolled Students') {
        computedRecipientType = 'all_students';
        isGroup = true;
      } else if (recipientName.includes('Student')) {
        computedRecipientType = 'student';
      } else if (recipientName.includes('Faculty') || recipientName.includes('Teacher')) {
        computedRecipientType = 'teacher';
      } else {
        computedRecipientType = 'admin';
      }
    }

    const selectedChannels: ('portal' | 'whatsapp')[] = [];
    if (channelPortal) selectedChannels.push('portal');
    if (channelWhatsApp || groupTarget === 'whatsapp_group') selectedChannels.push('whatsapp');
    if (selectedChannels.length === 0) selectedChannels.push('portal');

    onSendMessage({
      subject: sanitizeInput(subject),
      category,
      priority,
      senderName: currentUserName,
      senderRole: currentUserRole === 'admin' ? 'admin' : (currentUserRole === 'teacher' ? 'teacher' : 'student'),
      senderEmail: currentUserEmail,
      senderStudentId: appUser?.studentId,
      recipientType: computedRecipientType,
      recipientName: computedRecipientName,
      content: sanitizeInput(content),
      attachments: [],
      isGroupMessage: isGroup,
      groupType: isGroup ? groupTarget : undefined,
      whatsappGroupUrl: whatsAppConfig.groupInviteUrl,
      channelsSent: selectedChannels
    });

    if (channelWhatsApp || groupTarget === 'whatsapp_group') {
      const formatted = generateWhatsAppBroadcastText(subject, content, currentUserName, currentUserRole);
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(formatted)}`;
      try {
        if (typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } catch (err) {
        console.warn('Could not launch WhatsApp window:', err);
      }
    }

    setShowNewMsgModal(false);
    setSubject('');
    setContent('');
    setChannelWhatsApp(false);
  };

  // Quick Preset Templates for Teachers & Admins
  const applyGroupTemplate = (templateType: 'zoom' | 'exam' | 'schedule' | 'tuition' | 'devotional') => {
    if (templateType === 'zoom') {
      setCategory('general');
      setPriority('important');
      setSubject('Tuesday Live Zoom Class Link & Credentials');
      setContent('Greetings Students of Ministry,\n\nOur live lecture session is scheduled for Tuesday at 7:00 PM EST.\n\n📍 Zoom Meeting ID: 842 9102 3841\n🔑 Passcode: HTEIM2026\n\nPlease ensure your AMP Bible and lecture notebooks are prepared prior to class.\n\nIn Christ,\n' + currentUserName);
      setChannelWhatsApp(true);
    } else if (templateType === 'exam') {
      setCategory('exam');
      setPriority('urgent');
      setSubject('Upcoming Ministry Evaluation & Assessment Guidelines');
      setContent('Grace and peace everyone,\n\nPlease take note that the Module Evaluation is now open. All students are expected to complete their submissions through the Exams tab by Sunday 11:59 PM.\n\nBe blessed in your study and preparation.\n' + currentUserName);
      setChannelWhatsApp(true);
    } else if (templateType === 'schedule') {
      setCategory('general');
      setPriority('normal');
      setSubject('Class Schedule & Chapel Fellowship Update');
      setContent('Dear Ministry Class,\n\nPlease review this week\'s revised schedule of classes and prayer fellowship. Lecture audio and accompanying syllabus slides are available in the Library tab.\n\nBlessings,\n' + currentUserName);
      setChannelWhatsApp(true);
    } else if (templateType === 'tuition') {
      setCategory('tuition');
      setPriority('important');
      setSubject('Tuition Balance Clearance Notice');
      setContent('Dear Students,\n\nThis is a friendly reminder from the Financial Office regarding tuition installment settlements. Please review your balance statement in the Payments tab and verify all receipts.\n\nRespectfully,\nHTEIM Bursar');
      setChannelWhatsApp(false);
    } else if (templateType === 'devotional') {
      setCategory('general');
      setPriority('normal');
      setSubject('Weekly Ministry Scripture & Exhortation');
      setContent('“Trust in the LORD with all your heart and lean not on your own understanding; in all your ways acknowledge Him, and He will make your paths straight.” — Proverbs 3:5-6\n\nMay this scripture uplift you in your academic and spiritual walk this week!\n\nIn Christ,\n' + currentUserName);
      setChannelWhatsApp(true);
    }
  };

  // Quick Preset Templates for Students
  const applyStudentTemplate = (templateType: 'absence' | 'tuition' | 'extension' | 'peer') => {
    if (templateType === 'absence') {
      setCategory('attendance');
      setSubject('Notice of Absence - Tuesday Live Zoom Class');
      setContent('Greetings Instructor,\n\nI am writing to respectfully inform you that I will be unable to attend the upcoming Tuesday Live Zoom Class due to prior commitments. I will review the class recording and study materials once posted.\n\nThank you for your understanding.\n\nBlessings,\n' + currentUserName);
    } else if (templateType === 'tuition') {
      setCategory('tuition');
      setRecipientName('Bursar & Financial Office');
      setSubject('Tuition Balance Inquiry / Receipt Verification');
      setContent('Dear Financial Office,\n\nI would like to inquire about my current tuition statement and confirm receipt of my recent payment submission.\n\nPlease let me know if any further documents or receipts are required.\n\nRespectfully,\n' + currentUserName);
    } else if (templateType === 'extension') {
      setCategory('assignment');
      setSubject('Assignment Extension Request - Module Coursework');
      setContent('Dear Course Instructor,\n\nI am requesting a short extension on the upcoming assignment submission due to unforeseen personal obligations. Please let me know if an extension is possible and the revised deadline.\n\nThank you,\n' + currentUserName);
    } else if (templateType === 'peer') {
      setCategory('general');
      setSubject('Classmate Inquiry / Peer Study Collaboration');
      setContent('Greetings,\n\nI am reaching out to connect regarding our course topics and upcoming class discussions. Let me know if you would like to collaborate on study notes or discuss the lecture material.\n\nBlessings,\n' + currentUserName);
    }
  };

  return (
    <div className="material-screen space-y-4 sm:space-y-6 animate-fadeIn pb-36 sm:pb-28 md:pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-5 md:p-6 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#025798]" />
              Direct & Group Communication Center
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <Share2 className="w-3 h-3 text-emerald-600" />
              WhatsApp Group Connected
            </span>
          </div>
          <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Messages, Group Broadcasts & WhatsApp
          </h2>
          <p className="hidden sm:block text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
            {currentUserRole !== 'student'
              ? 'Send 1-on-1 direct messages to students and faculty, or broadcast class announcements across the Student Portal and official WhatsApp Group.'
              : 'Send direct inquiries to Course Instructors, Academic Deans, or the Bursar\'s Office. View official class broadcasts and join WhatsApp discussions.'}
          </p>
        </div>

        <div className="w-full md:w-auto shrink-0 flex flex-col sm:flex-row items-center gap-2">
          {currentUserRole !== 'student' && (
            <button
              onClick={() => {
                setComposeMode('group');
                setGroupTarget('all_students');
                setChannelWhatsApp(false);
                setShowNewMsgModal(true);
              }}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Users className="w-4 h-4" />
              <span>Send Group Message</span>
            </button>
          )}

          <button
            onClick={() => {
              setComposeMode('direct');
              setRecipientName(prefilledRecipient);
              setShowNewMsgModal(true);
            }}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-[#023264] hover:bg-[#025798] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.98] border border-[#b38f53]/30"
          >
            <MessageSquarePlus className="w-4 h-4 text-[#dfc18b]" />
            <span>Compose Direct Message</span>
          </button>
        </div>
      </div>

      {/* Official Class WhatsApp Group Hub Card */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-100/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 rounded-xl p-3.5 sm:p-4 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                {whatsAppConfig.groupName}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold uppercase border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Community Hub
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              {currentUserRole !== 'student' 
                ? 'Teachers and admins can broadcast official lecture links, Tuesday Zoom credentials, and urgent notices directly to all enrolled students via WhatsApp.'
                : 'Connect with fellow ministry students and professors. Receive instant school alerts, Tuesday Zoom links, and prayer fellowship updates on WhatsApp.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={handleOpenWhatsAppGroup}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
            title="Open or join WhatsApp group in a new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{currentUserRole === 'student' ? 'Join Class WhatsApp Group' : 'Open WhatsApp Group'}</span>
          </button>

          {currentUserRole !== 'student' && (
            <>
              <button
                onClick={() => {
                  setComposeMode('group');
                  setGroupTarget('whatsapp_group');
                  setChannelWhatsApp(true);
                  setShowNewMsgModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs flex items-center gap-1.5 border border-slate-700 shadow-xs transition-all cursor-pointer active:scale-95"
                title="Broadcast directly to WhatsApp Group"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Broadcast to WhatsApp</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    setEditGroupName(whatsAppConfig.groupName);
                    setEditGroupUrl(whatsAppConfig.groupInviteUrl);
                    setEditGroupDesc(whatsAppConfig.description || '');
                    setShowWhatsAppConfigModal(true);
                  }}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                  title="Configure WhatsApp Group Name & Link"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2 sm:gap-2.5">
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#023264]/10 dark:bg-[#023264]/40 text-[#023264] dark:text-[#7dd3fc] shrink-0">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate">Total</p>
            <p className="text-sm sm:text-xl font-black text-slate-900 dark:text-white leading-tight">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2 sm:gap-2.5">
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#b38f53]/15 dark:bg-[#b38f53]/30 text-[#8c6a32] dark:text-[#dfc18b] shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate">Unread</p>
            <p className="text-sm sm:text-xl font-black text-[#8c6a32] dark:text-[#dfc18b] leading-tight">{stats.unread}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2 sm:gap-2.5">
          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate">Group Broadcasts</p>
            <p className="text-sm sm:text-xl font-black text-indigo-700 dark:text-indigo-300 leading-tight">
              {messages.filter(m => m.isGroupMessage || m.recipientType === 'all_students' || m.recipientType === 'whatsapp_group').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2 sm:gap-2.5">
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shrink-0">
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate">WhatsApp msgs</p>
            <p className="text-sm sm:text-xl font-black text-emerald-700 dark:text-emerald-300 leading-tight">
              {messages.filter(m => m.recipientType === 'whatsapp_group' || m.channelsSent?.includes('whatsapp')).length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout (Sidebar Threads List + Chat View) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-xl shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[500px] md:min-h-[620px]">
        
        {/* LEFT COLUMN: Threads List (5 cols on lg) */}
        <div className={`lg:col-span-5 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/40 ${activeMessage ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search & Filter Header */}
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5 sm:space-y-3 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search messages, group broadcasts, or recipients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#025798]/50"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 text-[11px] font-bold">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[#023264] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({messages.length})
              </button>

              <button
                onClick={() => setActiveFilter('unread')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'unread'
                    ? 'bg-[#b38f53] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Unread
              </button>

              <button
                onClick={() => setActiveFilter('group')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeFilter === 'group'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Group ({messages.filter(m => m.isGroupMessage || m.recipientType === 'all_students' || m.recipientType === 'whatsapp_group').length})</span>
              </button>

              <button
                onClick={() => setActiveFilter('whatsapp')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeFilter === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                <span>WhatsApp ({messages.filter(m => m.recipientType === 'whatsapp_group' || m.channelsSent?.includes('whatsapp')).length})</span>
              </button>

              <button
                onClick={() => setActiveFilter('open')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'open'
                    ? 'bg-[#0277b8] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Open
              </button>

              <button
                onClick={() => setActiveFilter('resolved')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'resolved'
                    ? 'bg-[#01883c] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Resolved
              </button>

              <button
                onClick={() => setActiveFilter('sent_by_me')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'sent_by_me'
                    ? 'bg-[#025798] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sent by Me
              </button>

              <button
                onClick={() => setActiveFilter('archived')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeFilter === 'archived'
                    ? 'bg-slate-800 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Archive className="w-3 h-3" />
                Archived ({messages.filter(m => m.status === 'archived').length})
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-1 text-[10px] font-semibold text-slate-500">
              <span className="text-slate-400 uppercase font-black text-[9px]">Category:</span>
              {(['all', 'general', 'assignment', 'attendance', 'tuition', 'exam', 'technical'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-full capitalize transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-[#023264]/15 text-[#023264] dark:bg-[#023264]/60 dark:text-[#bae6fd] font-bold border border-[#025798]/30'
                      : 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Thread List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-200/80 dark:divide-slate-800 max-h-[580px] lg:max-h-[680px]">
            {filteredMessages.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <EmptyState
                  title="No messages match these filters"
                  description="Try clearing the search or selecting a different message category."
                  icon={<MessageSquare className="h-6 w-6 text-slate-400" />}
                  action={
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-2">
                      <button type="button" onClick={() => { setActiveFilter('all'); setSelectedCategory('all'); setSearchQuery(''); }} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold">
                        Reset filters
                      </button>
                      <button type="button" onClick={() => setShowNewMsgModal(true)} className="px-3 py-1.5 bg-[#023264] text-white rounded-lg text-xs font-bold flex items-center gap-1">
                        <MessageSquarePlus className="w-3.5 h-3.5" /> Compose Message
                      </button>
                    </div>
                  }
                />
              </div>
            ) : (
              filteredMessages.map(msg => {
                const isSelected = activeMessage?.id === msg.id;
                const isUnread = !msg.isReadByRecipient;
                const replyCount = msg.replies.length;
                const latestReply = msg.replies[msg.replies.length - 1];
                const isGroup = msg.isGroupMessage || msg.recipientType === 'all_students' || msg.recipientType === 'group' || msg.recipientType === 'whatsapp_group';
                const hasWhatsApp = msg.recipientType === 'whatsapp_group' || msg.channelsSent?.includes('whatsapp') || msg.groupType === 'whatsapp_group';

                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessageId(msg.id)}
                    className={`p-3.5 sm:p-4 transition-all cursor-pointer relative active:bg-slate-100/80 ${
                      isSelected
                        ? 'bg-[#025798]/10 dark:bg-[#025798]/25 border-l-4 border-[#025798] dark:border-[#7dd3fc]'
                        : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                    } ${isUnread ? 'bg-[#b38f53]/10 dark:bg-[#b38f53]/20 font-medium' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 overflow-hidden flex-wrap">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          msg.status === 'open' ? 'bg-[#0277b8]' :
                          msg.status === 'in_progress' ? 'bg-[#b38f53]' :
                          msg.status === 'resolved' ? 'bg-[#01883c]' : 'bg-slate-400'
                        }`} />
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {msg.senderName}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                          msg.senderRole === 'admin' ? 'bg-[#023264]/15 text-[#023264] dark:bg-[#023264]/50 dark:text-[#bae6fd]' :
                          msg.senderRole === 'teacher' ? 'bg-[#01883c]/15 text-[#01883c] dark:bg-[#01883c]/50 dark:text-[#a7f3d0]' :
                          'bg-[#b38f53]/15 text-[#8c6a32] dark:bg-[#b38f53]/50 dark:text-[#dfc18b]'
                        }`}>
                          {msg.senderRole}
                        </span>

                        {isGroup && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
                            <Users className="w-2.5 h-2.5 text-indigo-600" />
                            Group
                          </span>
                        )}

                        {hasWhatsApp && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                            <Share2 className="w-2.5 h-2.5 text-emerald-600" />
                            WhatsApp
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1 flex items-center gap-1.5">
                      {msg.subject}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight mb-2">
                      {latestReply ? `Re: ${latestReply.message}` : msg.content}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold capitalize">
                          {msg.category}
                        </span>
                        {msg.priority === 'urgent' && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 font-black uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                            Urgent
                          </span>
                        )}
                        <span className="text-slate-400 text-[10px] truncate max-w-[120px]">
                          → {msg.recipientName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <Paperclip className="w-3 h-3 text-slate-400" />
                        )}
                        {replyCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#025798]/15 dark:bg-[#025798]/40 text-[#025798] dark:text-[#7dd3fc] font-bold">
                            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Conversation Workspace (7 cols on lg) */}
        <div className={`lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 ${activeMessage ? 'flex' : 'hidden lg:flex'}`}>
          {activeMessage ? (
            <div className="flex flex-col h-full">
              {/* Thread Top Header */}
              <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="space-y-1 w-full sm:w-auto">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedMessageId(null)}
                    className="lg:hidden text-[#023264] dark:text-[#7dd3fc] text-xs font-black flex items-center gap-1.5 mb-2 py-2 px-3.5 rounded-xl bg-[#025798]/15 dark:bg-[#025798]/30 border border-[#025798]/30 dark:border-[#0277b8]/40 shadow-2xs hover:bg-[#025798]/25 transition-all cursor-pointer active:opacity-80 touch-min-44 min-h-[44px]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Messages Inbox</span>
                  </button>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      activeMessage.status === 'open' ? 'bg-[#0277b8]/15 text-[#0277b8] dark:bg-[#0277b8]/30 dark:text-[#7dd3fc]' :
                      activeMessage.status === 'in_progress' ? 'bg-[#b38f53]/15 text-[#8c6a32] dark:bg-[#b38f53]/30 dark:text-[#dfc18b]' :
                      activeMessage.status === 'resolved' ? 'bg-[#01883c]/15 text-[#01883c] dark:bg-[#01883c]/30 dark:text-[#a7f3d0]' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {activeMessage.status.replace('_', ' ')}
                    </span>

                    <span className="px-2 py-0.5 rounded-full bg-[#023264]/10 dark:bg-[#023264]/40 text-[#023264] dark:text-[#bae6fd] text-[10px] font-bold capitalize">
                      {activeMessage.category}
                    </span>

                    {activeMessage.isGroupMessage && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-extrabold uppercase flex items-center gap-1 border border-indigo-300 dark:border-indigo-800">
                        <Users className="w-3 h-3 text-indigo-600" /> Group Broadcast
                      </span>
                    )}

                    {(activeMessage.recipientType === 'whatsapp_group' || activeMessage.channelsSent?.includes('whatsapp')) && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold uppercase flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                        <Share2 className="w-3 h-3 text-emerald-600" /> WhatsApp Synced
                      </span>
                    )}

                    {activeMessage.priority === 'urgent' && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 text-[10px] font-black uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Urgent
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white leading-snug">
                    {activeMessage.subject}
                  </h3>

                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                    <span>From: <strong className="text-slate-800 dark:text-slate-200">{activeMessage.senderName}</strong> ({activeMessage.senderRole})</span>
                    <span>•</span>
                    <span>To: <strong className="text-slate-800 dark:text-slate-200">{activeMessage.recipientName}</strong></span>
                  </p>
                </div>

                {/* Status Toggle & WhatsApp Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto justify-start sm:justify-end pt-1 sm:pt-0">
                  <button
                    onClick={() => handleOpenWhatsApp(generateWhatsAppBroadcastText(activeMessage.subject, activeMessage.content, activeMessage.senderName, activeMessage.senderRole))}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer min-h-[38px]"
                    title="Forward/Share this message to WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleCopyWhatsAppText(generateWhatsAppBroadcastText(activeMessage.subject, activeMessage.content, activeMessage.senderName, activeMessage.senderRole))}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer min-h-[38px]"
                    title="Copy formatted text for WhatsApp"
                  >
                    {copiedWhatsApp ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWhatsApp ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <select
                    value={activeMessage?.status ?? 'unread'}
                    onChange={(e) => onUpdateStatus(activeMessage.id, e.target.value as AppMessage['status'])}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-[#025798]/50 cursor-pointer min-h-[38px]"
                  >
                    <option value="open">Status: Open</option>
                    <option value="in_progress">Status: In Progress</option>
                    <option value="resolved">Status: Resolved</option>
                    <option value="archived">Status: Archived</option>
                  </select>

                  {activeMessage.status !== 'archived' ? (
                    <button
                      onClick={() => onUpdateStatus(activeMessage.id, 'archived')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-[#023264] hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer min-h-[38px]"
                      title="Archive this message thread"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(activeMessage.id, 'open')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#01883c]/15 text-[#01883c] dark:bg-[#01883c]/30 dark:text-[#a7f3d0] hover:bg-[#01883c]/25 text-xs font-bold flex items-center gap-1.5 border border-[#01883c]/30 transition-all cursor-pointer min-h-[38px]"
                      title="Unarchive and reopen this thread"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Unarchive</span>
                    </button>
                  )}

                  {onDeleteMessage && currentUserRole === 'admin' && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this message thread?')) {
                          onDeleteMessage(activeMessage.id);
                          setSelectedMessageId(null);
                        }
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all min-h-[38px] flex items-center justify-center"
                      title="Delete Thread"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Conversation Bubbles */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/20 max-h-[420px] sm:max-h-[480px]">
                {/* Original Parent Message Card */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 sm:p-5 shadow-2xs space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2.5 sm:pb-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#023264] text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs">
                        {activeMessage.senderName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          {activeMessage.senderName}
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-[#025798]/15 text-[#025798] dark:bg-[#025798]/40 dark:text-[#7dd3fc]">
                            {activeMessage.senderRole}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">{activeMessage.senderEmail}</p>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400">
                      {new Date(activeMessage.createdAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {activeMessage.content}
                  </div>

                  {/* Attachments list if any */}
                  {activeMessage.attachments && activeMessage.attachments.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> Attachments ({activeMessage.attachments.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeMessage.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            download={att.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-[#025798]/15 text-[#025798] dark:text-[#7dd3fc] text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="max-w-[140px] truncate">{att.name}</span>
                            <Download className="w-3 h-3 ml-1 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Conversation Replies Timeline */}
                {activeMessage.replies.map((reply) => {
                  const isStaffReply = reply.senderRole === 'teacher' || reply.senderRole === 'admin';

                  return (
                    <div
                      key={reply.id}
                      className="flex gap-2.5 sm:gap-3 justify-start"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs flex items-center justify-center shrink-0 mt-1">
                        {reply.senderName.charAt(0)}
                      </div>

                      <div className={`flex-1 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-1.5 sm:space-y-2 border ${
                        isStaffReply
                          ? 'bg-[#025798]/10 dark:bg-[#025798]/20 border-[#025798]/30 dark:border-[#0277b8]/40'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}>
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {reply.senderName}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                              isStaffReply ? 'bg-[#023264]/15 text-[#023264] dark:bg-[#023264]/50 dark:text-[#bae6fd]' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {reply.senderRole}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-400">
                            {new Date(reply.createdAt).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {reply.message}
                        </p>

                        {reply.attachments && reply.attachments.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-2">
                            {reply.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                download={att.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-[#025798] dark:text-[#7dd3fc] text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-600"
                              >
                                <Paperclip className="w-3 h-3" />
                                <span className="max-w-[120px] truncate">{att.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Box */}
              <ChatReplyInputForm
                currentUserRole={currentUserRole}
                onSendReply={(replyTextToSend) => {
                  if (activeMessage && replyTextToSend.trim()) {
                    onReplyMessage(activeMessage.id, sanitizeInput(replyTextToSend), []);
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#023264]/10 dark:bg-[#023264]/40 flex items-center justify-center text-[#023264] dark:text-[#7dd3fc] border border-[#025798]/30 shadow-md">
                <MessageSquare className="w-8 h-8" />
              </div>

              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Select a Conversation Thread
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose an existing message from the left panel or compose a new direct message to administration or fellow students.
                </p>
              </div>

              <button
                onClick={() => setShowNewMsgModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#023264] hover:bg-[#025798] text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer border border-[#b38f53]/30"
              >
                <MessageSquarePlus className="w-4 h-4 text-[#dfc18b]" />
                <span>Compose New Message</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* COMPOSE NEW MESSAGE MODAL */}
      {showNewMsgModal && (
        <Modal
          isOpen={showNewMsgModal}
          onClose={() => setShowNewMsgModal(false)}
          title={composeMode === 'group' ? "Broadcast Group Message" : "Compose Direct Message"}
          subtitle={composeMode === 'group' ? "Send a class-wide announcement or broadcast to the WhatsApp Group" : "Send a typed message to faculty, staff, or fellow students"}
          icon={composeMode === 'group' ? <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <MessageSquarePlus className="w-5 h-5 text-[#023264] dark:text-[#7dd3fc] shrink-0" />}
          size="xl"
        >
          {/* Mode Switcher for Teachers & Admins */}
          {currentUserRole !== 'student' && (
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setComposeMode('direct')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  composeMode === 'direct'
                    ? 'bg-white dark:bg-slate-700 text-[#023264] dark:text-[#7dd3fc] shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Direct 1-on-1 Message</span>
              </button>

              <button
                type="button"
                onClick={() => setComposeMode('group')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  composeMode === 'group'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Group & WhatsApp Broadcast</span>
              </button>
            </div>
          )}

          {/* Group Broadcast Quick Presets (Teacher/Admin) */}
          {composeMode === 'group' && currentUserRole !== 'student' && (
            <div className="space-y-1.5 p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 mb-4">
              <p className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Quick Group Templates:
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => applyGroupTemplate('zoom')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 shadow-2xs transition-all cursor-pointer"
                >
                  Tuesday Zoom Link
                </button>
                <button
                  type="button"
                  onClick={() => applyGroupTemplate('exam')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-300 dark:border-rose-800 shadow-2xs transition-all cursor-pointer"
                >
                  Module Exam & Assessment
                </button>
                <button
                  type="button"
                  onClick={() => applyGroupTemplate('schedule')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-300 dark:border-indigo-800 shadow-2xs transition-all cursor-pointer"
                >
                  Schedule Update
                </button>
                <button
                  type="button"
                  onClick={() => applyGroupTemplate('devotional')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-300 dark:border-amber-800 shadow-2xs transition-all cursor-pointer"
                >
                  Weekly Devotional
                </button>
                <button
                  type="button"
                  onClick={() => applyGroupTemplate('tuition')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[#025798] dark:text-[#7dd3fc] hover:bg-blue-100 border border-blue-300 dark:border-blue-800 shadow-2xs transition-all cursor-pointer"
                >
                  Tuition Notice
                </button>
              </div>
            </div>
          )}

          {/* Student Presets */}
          {composeMode === 'direct' && currentUserRole === 'student' && (
            <div className="space-y-1.5 p-3 rounded-xl bg-[#023264]/10 dark:bg-[#023264]/30 border border-[#025798]/30 mb-4">
              <p className="text-[11px] font-black text-[#023264] dark:text-[#bae6fd] uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#b38f53]" /> Quick Message Templates:
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => applyStudentTemplate('absence')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[#025798] dark:text-[#7dd3fc] hover:bg-[#025798]/10 border border-[#025798]/30 shadow-2xs transition-all cursor-pointer"
                >
                  Class Absence Notice
                </button>
                <button
                  type="button"
                  onClick={() => applyStudentTemplate('tuition')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[#01883c] dark:text-[#4ade80] hover:bg-[#01883c]/10 border border-[#01883c]/30 shadow-2xs transition-all cursor-pointer"
                >
                  Tuition Balance Query
                </button>
                <button
                  type="button"
                  onClick={() => applyStudentTemplate('extension')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[#b38f53] dark:text-[#dfc18b] hover:bg-[#b38f53]/10 border border-[#b38f53]/30 shadow-2xs transition-all cursor-pointer"
                >
                  Assignment Extension
                </button>
                <button
                  type="button"
                  onClick={() => applyStudentTemplate('peer')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[#0277b8] dark:text-[#7dd3fc] hover:bg-[#0277b8]/10 border border-[#0277b8]/30 shadow-2xs transition-all cursor-pointer"
                >
                  Classmate Study Question
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendNewMessage} className="space-y-4">
            {/* Recipient / Target */}
            {composeMode === 'group' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Group Broadcast Target:
                  </label>
                  <select
                    value={groupTarget}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setGroupTarget(val);
                      if (val === 'whatsapp_group') {
                        setChannelWhatsApp(true);
                      }
                    }}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="all_students">All Enrolled Students (Full Class Broadcast)</option>
                    <option value="whatsapp_group">{whatsAppConfig.groupName} (Official WhatsApp Community)</option>
                    <option value="cohort">Active Ministry Module Cohort</option>
                    <option value="pending_tuition">Students with Outstanding Tuition Installments</option>
                  </select>
                </div>

                {/* Delivery Channels */}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Broadcast Channels:</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channelPortal}
                        onChange={(e) => setChannelPortal(e.target.checked)}
                        className="w-4 h-4 rounded text-[#023264] focus:ring-[#025798]"
                      />
                      <span>HTEIM Student Portal Messages Inbox</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channelWhatsApp}
                        onChange={(e) => setChannelWhatsApp(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>WhatsApp Broadcast (Opens with formatted group message)</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Send To (Recipient):
                </label>
                <select
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:ring-2 focus:ring-[#025798]/50"
                >
                  <optgroup label="Faculty & Administration">
                    <option value="All Administration & Faculty">All Administration & Faculty</option>
                    <option value="Dr. Joseph - Dean of Academics">Dr. Joseph - Dean of Academics</option>
                    <option value="Apostolic Ministry Faculty">Apostolic Ministry Faculty</option>
                    <option value="Bursar & Financial Office">Bursar & Financial Office</option>
                  </optgroup>

                  {availableStudents.length > 0 && (
                    <optgroup label="Enrolled Classmates & Students">
                      {availableStudents
                        .filter(st => (st.name || '').toLowerCase() !== (currentUserName || '').toLowerCase())
                        .map(st => {
                          const val = st.name.startsWith('Student:') ? st.name : `Student: ${st.name}`;
                          return (
                            <option key={st.name} value={val}>
                              {val}
                            </option>
                          );
                        })}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MessageCategory)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                >
                  <option value="general">General Inquiry / Class Announcement</option>
                  <option value="assignment">Assignment & Coursework</option>
                  <option value="attendance">Attendance & Absence</option>
                  <option value="tuition">Tuition & Financial</option>
                  <option value="exam">Exam & Grades</option>
                  <option value="technical">Technical Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Priority Level:
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as MessagePriority)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject Header:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tuesday Live Zoom Class Link & Lecture Details"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#025798]/50"
              />
            </div>

            {/* Message Content */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Message Content:
              </label>
              <textarea
                rows={4}
                required
                placeholder="Type the message or announcement to be sent..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#025798]/50 resize-none"
              />
            </div>

            {/* WhatsApp Live Preview when WhatsApp Channel is toggled */}
            {(channelWhatsApp || groupTarget === 'whatsapp_group') && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    WhatsApp Formatted Broadcast Preview
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyWhatsAppText()}
                    className="text-[11px] font-bold px-2 py-1 rounded bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 cursor-pointer hover:bg-emerald-100"
                  >
                    {copiedWhatsApp ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedWhatsApp ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>

                <pre className="text-[11px] font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 whitespace-pre-wrap text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto">
                  {generateWhatsAppBroadcastText(subject || 'Class Update', content || 'Type your message details...', currentUserName, currentUserRole)}
                </pre>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNewMsgModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!subject.trim() || !content.trim()}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                  composeMode === 'group' || channelWhatsApp
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-[#023264] hover:bg-[#025798] border border-[#b38f53]/30'
                }`}
              >
                {composeMode === 'group' ? <Users className="w-4 h-4" /> : <Send className="w-4 h-4 text-[#dfc18b]" />}
                <span>
                  {composeMode === 'group' 
                    ? (channelWhatsApp ? 'Broadcast to Portal & WhatsApp' : 'Broadcast to Group')
                    : 'Send Direct Message'}
                </span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* WHATSAPP GROUP CONFIGURATION MODAL (Teachers/Admins) */}
      {showWhatsAppConfigModal && (
        <Modal
          isOpen={showWhatsAppConfigModal}
          onClose={() => setShowWhatsAppConfigModal(false)}
          title="Configure WhatsApp Community Group"
          subtitle="Set official class WhatsApp group name and invite URL"
          icon={<Settings className="w-5 h-5 text-emerald-600 shrink-0" />}
          size="md"
        >
          <form onSubmit={handleSaveWhatsAppConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp Group Name:
              </label>
              <input
                type="text"
                required
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                placeholder="e.g. HTEIM School of Ministry 2026"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp Group Invite Link:
              </label>
              <input
                type="url"
                required
                value={editGroupUrl}
                onChange={(e) => setEditGroupUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/50"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                This link will be used for students to join the official class WhatsApp fellowship.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Group Description / Purpose:
              </label>
              <textarea
                rows={2}
                value={editGroupDesc}
                onChange={(e) => setEditGroupDesc(e.target.value)}
                placeholder="Official WhatsApp group for announcements, lecture links, and prayer requests."
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/50 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWhatsAppConfigModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                Save WhatsApp Settings
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
