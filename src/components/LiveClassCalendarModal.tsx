import React, { useState } from 'react';
import { Calendar, Video, Download, Link, AlertTriangle, CheckCircle2, Clock, ExternalLink, Sparkles } from 'lucide-react';
import { ScheduleItem } from '../types';

interface LiveClassCalendarModalProps {
  scheduleItems?: ScheduleItem[];
  onClose: () => void;
}

export const LiveClassCalendarModal: React.FC<LiveClassCalendarModalProps> = ({
  scheduleItems = [],
  onClose
}) => {
  const safeScheduleItems = scheduleItems || [];
  const [selectedItem, setSelectedItem] = useState<ScheduleItem>(safeScheduleItems[0] || {
    id: 'sch-1',
    title: 'Module 3: Ministerial Ethics Live Lecture',
    courseCode: 'MOD-301',
    date: '2026-08-08',
    timeSlot: '7:00 PM - 9:00 PM EST',
    instructor: 'Apostle Dr. H.E. Alexander',
    room: 'Virtual Sanctuary Room 1',
    status: 'live',
    zoomUrl: 'https://zoom.us/j/8849201928?pwd=HTEIM',
    recordingUrl: 'https://hteim.edu/recordings/mod-301-lecture-1',
    postClassMaterialsUrl: 'https://hteim.edu/handouts/ethics_lecture_notes.pdf',
    meetingPasscode: 'HTEIM2026'
  });

  const exportIcsCalendar = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HTEIM School of Ministry//Portal Calendar//EN
BEGIN:VEVENT
SUMMARY:${selectedItem.title}
DESCRIPTION:HTEIM School of Ministry Live Session. Zoom: ${selectedItem.zoomUrl || 'Online'}
DTSTART:20260808T230000Z
DTEND:20260809T010000Z
LOCATION:${selectedItem.room}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${selectedItem.courseCode}_class_event.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-5 overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-rose-500 text-white font-extrabold text-[10px] rounded uppercase animate-pulse">
                Live Class Session
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white font-syne pt-0.5">
              Calendar & Video Class Launcher
            </h2>
          </div>
        </div>

        {/* Meeting Details Card */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl border border-indigo-500/30 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-amber-400">
                {selectedItem.courseCode} • {selectedItem.timeSlot}
              </span>
              <h3 className="text-lg font-black font-syne">{selectedItem.title}</h3>
              <p className="text-xs text-slate-300">Instructor: {selectedItem.instructor}</p>
            </div>

            <button
              onClick={exportIcsCalendar}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-white/10"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Export .ICS</span>
            </button>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">Zoom Meeting Passcode:</span>
              <span className="font-mono font-black text-amber-400">{selectedItem.meetingPasscode || 'HTEIM2026'}</span>
            </div>

            <a
              href={selectedItem.zoomUrl || 'https://zoom.us'}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Launch Live Zoom Classroom</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Post Class Resources */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <a
              href={selectedItem.recordingUrl || '#'}
              onClick={(e) => { e.preventDefault(); alert('Opening Cloud Class Recording Link...'); }}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
            >
              <Video className="w-3.5 h-3.5 text-indigo-400" />
              <span>Watch Recording</span>
            </a>

            <a
              href={selectedItem.postClassMaterialsUrl || '#'}
              onClick={(e) => { e.preventDefault(); alert('Downloading Post-Class Materials Handout PDF...'); }}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Post-Class Materials</span>
            </a>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Close Calendar Launcher
          </button>
        </div>
      </div>
    </div>
  );
};
