import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Download, ExternalLink, Share2, Check, ChevronDown } from 'lucide-react';
import { CalendarEventItem, generateGoogleCalendarUrl, downloadICSFile } from '../lib/calendarExport';
import { shareNativeContent, triggerHapticFeedback } from '../lib/capacitorBridge';

interface AddToCalendarButtonProps {
  event: CalendarEventItem;
  className?: string;
  variant?: 'primary' | 'secondary' | 'compact' | 'icon';
  size?: 'sm' | 'md';
}

export const AddToCalendarButton: React.FC<AddToCalendarButtonProps> = ({
  event,
  className = '',
  variant = 'secondary',
  size = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleGoogleCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticFeedback('light');
    const url = generateGoogleCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleDownloadICS = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticFeedback('light');
    const sanitizedTitle = event.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    downloadICSFile([event], `${sanitizedTitle}_HTEIM.ics`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setIsOpen(false);
  };

  const handleDeviceShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticFeedback('light');
    const url = generateGoogleCalendarUrl(event);
    const shared = await shareNativeContent(
      `[HTEIM] ${event.title}`,
      `Date: ${event.date} at ${event.startTime || '7:00 PM EST'}\nLocation: ${event.location || 'HTEIM Main Sanctuary / Zoom'}\n\nAdd to calendar: ${url}`,
      url
    );
    if (!shared) {
      handleGoogleCalendar(e);
    }
    setIsOpen(false);
  };

  const baseBtnStyle = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm';

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Add to Calendar"
          aria-label="Add event to calendar"
          aria-expanded={isOpen}
        >
          <Calendar className="w-4 h-4" />
        </button>
      ) : variant === 'primary' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className={`inline-flex items-center gap-1.5 font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-2xs transition-all cursor-pointer ${baseBtnStyle}`}
          aria-expanded={isOpen}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Add to Calendar</span>
          <ChevronDown className="w-3 h-3 opacity-80" />
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className={`inline-flex items-center gap-1 font-semibold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer ${baseBtnStyle}`}
          aria-expanded={isOpen}
        >
          <Calendar className="w-3.5 h-3.5 text-amber-500" />
          <span>Calendar</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className={`inline-flex items-center gap-1.5 font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer ${baseBtnStyle}`}
          aria-expanded={isOpen}
        >
          <Calendar className="w-3.5 h-3.5 text-amber-500" />
          <span>Add to Calendar</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg py-1.5 z-50 text-xs animate-fade-slide-up"
          role="menu"
        >
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Add to Calendar
          </div>

          <button
            type="button"
            onClick={handleGoogleCalendar}
            className="w-full px-3 py-2 text-left flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            role="menuitem"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-medium">Google Calendar</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={handleDownloadICS}
            className="w-full px-3 py-2 text-left flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            role="menuitem"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="font-medium">Apple / Outlook (.ics)</span>
            </div>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              type="button"
              onClick={handleDeviceShare}
              className="w-full px-3 py-2 text-left flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800/50"
              role="menuitem"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-medium">Device Share / Native</span>
              </div>
              <Share2 className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
