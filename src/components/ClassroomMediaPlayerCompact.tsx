import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  Music, 
  Video as VideoIcon, 
  User, 
  Plus, 
  X, 
  Sparkles,
  ListMusic,
  Globe,
  ExternalLink,
  Edit3,
  Check,
  Clock,
  FileText,
  BookOpen,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  Radio,
  RotateCcw,
  RotateCw
} from 'lucide-react';
import { MediaResource } from '../types';
import { UserRole } from '../lib/userAuth';
import { parseVideoMediaUrl } from '../lib/mediaUtils';
import { createNoteFromLibraryExcerpt } from '../utils/notesStorage';
import { CompactVideoPlayer } from './CompactVideoPlayer';

interface ClassroomMediaPlayerCompactProps {
  mediaResources: MediaResource[];
  courseCode?: string;
  courseTitle?: string;
  userRole?: UserRole;
  studentName?: string;
  onAddMedia?: (newMedia: MediaResource) => void;
  onUpdateMedia?: (updatedMedia: MediaResource) => void;
  onRemoveMedia?: (mediaId: string) => void;
  onOpenNotes?: (lectureTitle?: string) => void;
}

export const DEFAULT_PRESET_MEDIA: MediaResource[] = [];

export const ClassroomMediaPlayerCompact: React.FC<ClassroomMediaPlayerCompactProps> = ({
  mediaResources,
  courseCode,
  userRole = 'admin',
  studentName = 'General Student',
  onAddMedia,
  onUpdateMedia,
  onRemoveMedia,
  onOpenNotes
}) => {
  const isStudent = userRole === 'student';
  const playlist = mediaResources && mediaResources.length > 0 ? mediaResources : DEFAULT_PRESET_MEDIA;
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const currentTrack = playlist[currentTrackIndex] || playlist[0];

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [useDirectStream, setUseDirectStream] = useState(true);
  const [timestampNoteToast, setTimestampNoteToast] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Timestamp Seeking
  const seekToSeconds = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  // Capture current playback timestamp to Student Notes
  const handleCaptureTimestampNote = () => {
    if (!currentTrack) return;
    const mins = Math.floor(currentTime / 60);
    const secs = Math.floor(currentTime % 60);
    const timeLabel = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    createNoteFromLibraryExcerpt(studentName, {
      resourceTitle: currentTrack.title,
      instructor: currentTrack.speaker,
      excerpt: currentTrack.description || `Lecture note captured at timestamp ${timeLabel}`,
      isAudioTimestamp: true,
      timestampLabel: timeLabel
    });

    setTimestampNoteToast(`Captured [${timeLabel}] into your Class Notes!`);
    setTimeout(() => setTimestampNoteToast(null), 3500);
  };

  // Parse chapter markers or timestamps from description
  const parsedChapters = useMemo(() => {
    if (!currentTrack) return [];
    if (currentTrack.chapters && currentTrack.chapters.length > 0) {
      return currentTrack.chapters.map(ch => {
        const mins = Math.floor(ch.time / 60);
        const secs = Math.floor(ch.time % 60);
        return {
          raw: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
          seconds: ch.time,
          label: ch.title
        };
      });
    }

    const regex = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*(?:[-–—:]\s*([^\n\r]+))?/g;
    const list: { raw: string; seconds: number; label: string }[] = [];
    const text = currentTrack.description || '';
    const matches = [...text.matchAll(regex)];

    for (const m of matches) {
      const hours = m[1] ? parseInt(m[1], 10) : 0;
      const mins = parseInt(m[2], 10);
      const secs = parseInt(m[3], 10);
      const label = (m[4] || '').trim();
      const totalSeconds = hours * 3600 + mins * 60 + secs;

      list.push({
        raw: m[0].split(/[-–—:]/)[0].trim(),
        seconds: totalSeconds,
        label: label || `Marker at ${m[0].split(/[-–—:]/)[0].trim()}`
      });
    }

    return list;
  }, [currentTrack]);

  // Modal for adding new audio/video resource
  const [showAddModal, setShowAddModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formSpeaker, setFormSpeaker] = useState('Dr. Faculty Director');
  const [formDuration, setFormDuration] = useState('35:00');
  const [formType, setFormType] = useState<'audio' | 'video'>('audio');
  const [formUrl, setFormUrl] = useState('');
  const [formDesc, setFormDesc] = useState('');

  // Modal for editing existing recording / media resource
  const [editingTrack, setEditingTrack] = useState<MediaResource | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSpeaker, setEditSpeaker] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editType, setEditType] = useState<'audio' | 'video'>('video');
  const [editUrl, setEditUrl] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDateAdded, setEditDateAdded] = useState('');
  const [editSuccessFeedback, setEditSuccessFeedback] = useState(false);

  // Auto handle reset audio state when track changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [currentTrackIndex]);

  const parsedMedia = useMemo(() => {
    return parseVideoMediaUrl(currentTrack?.url || '');
  }, [currentTrack?.url]);

  const parsedFormUrl = useMemo(() => {
    return parseVideoMediaUrl(formUrl);
  }, [formUrl]);

  const parsedEditUrl = useMemo(() => {
    return parseVideoMediaUrl(editUrl);
  }, [editUrl]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().then(() => setIsPlaying(true)).catch(e => console.log('Media playback error:', e));
    }
  };

  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (el) {
      setCurrentTime(el.currentTime);
      setDuration(el.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    const el = audioRef.current;
    if (el) {
      el.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) audioRef.current.volume = val;
  };

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    const el = audioRef.current;
    if (el) el.muted = newMute;
  };

  const handleSetSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    try {
      localStorage.setItem('hteim_media_speed', String(speed));
    } catch {
      // ignore
    }
    if (audioRef.current) audioRef.current.playbackRate = speed;
  };

  const skipTime = (seconds: number) => {
    const el = audioRef.current;
    if (el) {
      const newTime = Math.max(0, Math.min(el.duration || Infinity, el.currentTime + seconds));
      el.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatSecs = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formUrl.trim()) return;

    const newRes: MediaResource = {
      id: `media_${Date.now()}`,
      title: formTitle.trim(),
      speaker: formSpeaker.trim() || 'HTEIM Faculty Member',
      duration: formDuration.trim() || '30:00',
      type: formType,
      url: formUrl.trim(),
      description: formDesc.trim() || 'Sermon recording & classroom lecture.',
      dateAdded: new Date().toISOString().split('T')[0]
    };

    if (onAddMedia) {
      onAddMedia(newRes);
    }
    setShowAddModal(false);
    setFormTitle('');
    setFormUrl('');
  };

  const startEditingMedia = (track: MediaResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTrack(track);
    setEditTitle(track.title);
    setEditSpeaker(track.speaker || 'HTEIM Faculty');
    setEditDuration(track.duration || '35:00');
    setEditType(track.type || 'video');
    setEditUrl(track.url);
    setEditDesc(track.description || '');
    setEditDateAdded(track.dateAdded || new Date().toISOString().split('T')[0]);
    setEditSuccessFeedback(false);
  };

  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack || !editTitle.trim() || !editUrl.trim()) return;

    const updated: MediaResource = {
      ...editingTrack,
      title: editTitle.trim(),
      speaker: editSpeaker.trim() || 'HTEIM Faculty Member',
      duration: editDuration.trim() || '30:00',
      type: editType,
      url: editUrl.trim(),
      description: editDesc.trim(),
      dateAdded: editDateAdded.trim() || editingTrack.dateAdded || new Date().toISOString().split('T')[0]
    };

    if (onUpdateMedia) {
      onUpdateMedia(updated);
    }

    setEditSuccessFeedback(true);
    setTimeout(() => {
      setEditSuccessFeedback(false);
      setEditingTrack(null);
    }, 500);
  };

  const isDriveVideo = parsedMedia.isDrive;
  const isYouTubeVideo = parsedMedia.isYouTube;
  const isIframeVideo = isYouTubeVideo || (isDriveVideo && !useDirectStream);

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl text-white shadow-xl transition-all duration-300 ${isTheaterMode ? 'fixed inset-4 z-50 rounded-2xl' : 'p-4 space-y-3'}`}>
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              Media Player
              {courseCode && (
                <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono text-[9px] font-bold rounded border border-indigo-500/30">
                  {courseCode}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400">{playlist.length} tracks</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onOpenNotes && (
            <button
              type="button"
              onClick={() => onOpenNotes(currentTrack?.title)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              title="Open notes"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title={isTheaterMode ? "Exit theater mode" : "Theater mode"}
          >
            {isTheaterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {!isStudent && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors"
              title="Add recording"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isExpanded && currentTrack && (
        <div className="space-y-3">
          {/* Video Player */}
          {currentTrack.type === 'video' && (
            <div className="space-y-2">
              {isDriveVideo && useDirectStream ? (
                <CompactVideoPlayer
                  src={parsedMedia.proxyStreamUrl || `/api/drive-proxy/stream/${parsedMedia.fileId}`}
                  title={currentTrack.title}
                  className="rounded-lg"
                  onTimeUpdate={(currentTime, duration) => {
                    setCurrentTime(currentTime);
                    setDuration(duration);
                  }}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : isYouTubeVideo ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={parsedMedia.embedUrl}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={currentTrack.title}
                  />
                </div>
              ) : isDriveVideo && !useDirectStream ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={parsedMedia.embedUrl}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={currentTrack.title}
                  />
                </div>
              ) : (
                <CompactVideoPlayer
                  src={currentTrack.url}
                  title={currentTrack.title}
                  className="rounded-lg"
                  onTimeUpdate={(currentTime, duration) => {
                    setCurrentTime(currentTime);
                    setDuration(duration);
                  }}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              )}

              {/* Video Controls */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isDriveVideo && (
                    <div className="flex items-center bg-slate-800 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setUseDirectStream(true)}
                        className={`px-2 py-1 text-[10px] font-bold transition-colors ${
                          useDirectStream ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Proxy
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseDirectStream(false)}
                        className={`px-2 py-1 text-[10px] font-bold transition-colors ${
                          !useDirectStream ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Drive
                      </button>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleCaptureTimestampNote}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Note {formatSecs(currentTime)}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {!isStudent && (
                    <button
                      type="button"
                      onClick={() => startEditingMedia(currentTrack)}
                      className="p-1.5 bg-slate-800 hover:bg-amber-500/20 text-amber-300 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <a
                    href={currentTrack.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Audio Player */}
          {currentTrack.type === 'audio' && (
            <div className="bg-slate-950 rounded-lg p-3 space-y-2">
              <audio
                ref={audioRef}
                src={currentTrack.url}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white truncate max-w-[200px]">{currentTrack.title}</span>
                    <span className="text-[10px] text-slate-400">{currentTrack.speaker}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureTimestampNote}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] flex items-center gap-1 transition-colors"
                  >
                    <Clock className="w-3 h-3" />
                    <span>{formatSecs(currentTime)}</span>
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{formatSecs(currentTime)}</span>
                  <span>{currentTrack.duration || formatSecs(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => skipTime(-10)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => skipTime(10)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  
                  <div className="flex items-center bg-slate-900 rounded-lg p-0.5 ml-1">
                    {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => handleSetSpeed(spd)}
                        className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded transition-colors ${
                          playbackSpeed === spd
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={toggleMute} className="text-slate-400 hover:text-white">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                  />
                </div>
              </div>

              {/* Chapters */}
              {parsedChapters.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1 flex-wrap">
                    {parsedChapters.slice(0, 5).map((ch, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => seekToSeconds(ch.seconds)}
                        className="px-2 py-1 bg-slate-900 hover:bg-indigo-950 text-slate-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-600 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <span className="px-1 py-0.2 bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold rounded">
                          {ch.raw}
                        </span>
                        <span className="truncate max-w-[100px]">{ch.label}</span>
                      </button>
                    ))}
                    {parsedChapters.length > 5 && (
                      <span className="text-[10px] text-slate-400">+{parsedChapters.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Playlist */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
              <span className="flex items-center gap-1">
                <ListMusic className="w-3 h-3" /> Playlist
              </span>
            </div>

            <div className="space-y-1 max-h-32 overflow-y-auto">
              {playlist.map((item, idx) => {
                const isSelected = idx === currentTrackIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => setCurrentTrackIndex(idx)}
                    className={`p-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.type === 'video' ? <VideoIcon className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold truncate">{item.title}</p>
                        <p className="text-[9px] text-slate-400 truncate">{item.speaker}</p>
                      </div>
                    </div>

                    {isSelected && isPlaying && (
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Timestamp Note Toast */}
      {timestampNoteToast && (
        <div className="fixed bottom-4 right-4 p-3 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn z-50">
          <Check className="w-4 h-4" />
          <span>{timestampNoteToast}</span>
        </div>
      )}

      {/* Add Media Modal */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddSubmit} className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden text-slate-100">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" /> Add Media
              </h4>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Title *</label>
                <input
                  required
                  type="text"
                  placeholder="Recording title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Speaker</label>
                  <input
                    type="text"
                    placeholder="Speaker name"
                    value={formSpeaker}
                    onChange={(e) => setFormSpeaker(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'audio' | 'video')}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">URL *</label>
                <input
                  required
                  type="url"
                  placeholder="https://..."
                  value={formUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormUrl(val);
                    const parsed = parseVideoMediaUrl(val);
                    if (parsed.isDrive || parsed.isYouTube) {
                      setFormType('video');
                    }
                  }}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 text-indigo-300"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg">Add</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Edit Media Modal */}
      {editingTrack && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveEditSubmit} className="bg-slate-900 border border-amber-500/40 rounded-xl shadow-xl w-full max-w-lg overflow-hidden text-slate-100">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" /> Edit Media
              </h4>
              <button type="button" onClick={() => setEditingTrack(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold uppercase text-amber-400 mb-1">Title *</label>
                <input
                  required
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:outline-none focus:border-amber-400 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Speaker</label>
                  <input
                    type="text"
                    value={editSpeaker}
                    onChange={(e) => setEditSpeaker(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:outline-none focus:border-indigo-400 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as 'audio' | 'video')}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">URL *</label>
                <input
                  required
                  type="url"
                  value={editUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditUrl(val);
                    const parsed = parseVideoMediaUrl(val);
                    if (parsed.isDrive || parsed.isYouTube) {
                      setEditType('video');
                    }
                  }}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-400 text-blue-300"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:outline-none focus:border-amber-400 text-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              {editSuccessFeedback && (
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <Check className="w-4 h-4" /> Updated!
                </span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={() => setEditingTrack(null)} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg">Save</button>
              </div>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClassroomMediaPlayerCompact;