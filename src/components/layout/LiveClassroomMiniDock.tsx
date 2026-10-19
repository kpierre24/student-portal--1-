import React, { useState } from 'react';
import { Radio, Video, ExternalLink, X, Maximize2, ChevronUp, ChevronDown } from 'lucide-react';
import { TabType } from '../../types';

export interface LiveClassroomMiniDockProps {
  activeErpTab: TabType;
  onNavigate: (tab: TabType) => void;
  googleMeetUrl?: string;
  zoomUrl?: string;
}

export const LiveClassroomMiniDock: React.FC<LiveClassroomMiniDockProps> = ({
  activeErpTab,
  onNavigate,
  googleMeetUrl = 'https://meet.google.com/wgd-vrrq-sjm',
  zoomUrl = 'https://zoom.us/j/81505377396',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Only show when user is NOT already on the live classroom tab and hasn't dismissed it
  if (activeErpTab === 'classroom' || isDismissed) {
    return null;
  }

  return (
    <aside 
      aria-label="Live Classroom stream controls"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 transition-all duration-300 animate-slide-up"
    >
      <div className="bg-slate-900/95 text-white backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden w-80 sm:w-96">
        
        {/* Header bar */}
        <div className="bg-gradient-to-r from-[#022044] to-[#041a33] px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-white">Live Classroom Active</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCollapsed(prev => !prev)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={isCollapsed ? "Expand Mini Player" : "Collapse"}
            >
              {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Dock"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        {!isCollapsed && (
          <div className="p-3.5 space-y-3">
            <div>
              <p className="text-xs font-extrabold text-white truncate">Module 6: Homiletics Lab & Pastoral Shepherding</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Pastor Samuel Selkridge • Live via Google Meet</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('classroom')}
                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Return to Class</span>
              </button>

              <a
                href={googleMeetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Open Google Meet in separate window"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pop Out</span>
              </a>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
};
