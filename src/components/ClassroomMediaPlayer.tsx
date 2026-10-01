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
  Radio, 
  Plus, 
  X, 
  Sparkles,
  Disc,
  ListMusic,
  Globe,
  ExternalLink,
  Edit3,
  Check,
  Clock,
  FileText,
  Calendar,
  Layers,
  BookOpen,
  RotateCcw,
  RotateCw
} from 'lucide-react';
import { MediaResource } from '../types';
import { UserRole } from '../lib/userAuth';
import { parseVideoMediaUrl } from '../lib/mediaUtils';
import { createNoteFromLibraryExcerpt } from '../utils/notesStorage';

interface ClassroomMediaPlayerProps {
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

export const DEFAULT_PRESET_MEDIA: MediaResource[] = [
  {
    id: 'media_som_mod4',
    title: 'Livestream Video: Apostolic Governance & Five-Fold Ministry Alignment',
    speaker: 'Apostle Dr. Kendell Pierre',
    duration: '1:18:40',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
    description: 'Official HTEIM livestream recording covering the foundational apostolic mandate, Ephesians 4:11 five-fold synergy, church governance, and spiritual fathering.',
    dateAdded: '2026-08-25',
    chapters: [
      { time: 0, title: 'Opening & Apostolic Mandate' },
      { time: 900, title: 'Ephesians 4:11 Alignment' },
      { time: 2400, title: 'Governmental Order' },
      { time: 3900, title: 'Q&A & Impartation' }
    ]
  },
  {
    id: 'media_som_mod5',
    title: 'Livestream Video: Prophetic Ministry, Spiritual Discernment & Warfare',
    speaker: 'Apostolic Faculty Team',
    duration: '59:10',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    description: 'Classroom video recording on the gift vs office of prophecy, testing prophetic words according to 1 Cor 14, spiritual discernment, and assembly protocols.',
    dateAdded: '2026-08-18',
    chapters: [
      { time: 0, title: 'Introduction to Prophetic Gifts' },
      { time: 720, title: 'Judging & Testing Prophecy' },
      { time: 1800, title: 'Spiritual Discernment' },
      { time: 2800, title: 'Prophetic Protocol' }
    ]
  },
  {
    id: 'media_som_mod1',
    title: 'Livestream Video: Biblical Hermeneutics & Exegesis Methodologies',
    speaker: 'Pastor Samuel Selkridge',
    duration: '54:30',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
    description: 'Foundational lecture on sound biblical interpretation, historical-grammatical context, avoiding eisegesis, and homiletical exegesis.',
    dateAdded: '2026-05-05',
    chapters: [
      { time: 0, title: 'Hermeneutics Overview' },
      { time: 600, title: 'Historical-Grammatical Context' },
      { time: 1500, title: 'Christocentric Principle' },
      { time: 2600, title: 'Expository Practice' }
    ]
  },
  {
    id: 'media_som_mod2',
    title: 'Livestream Video: Evangelism, The Great Commission & Soul Winning',
    speaker: 'Pastor Christy Arthur',
    duration: '48:15',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
    description: 'Practical soul-winning strategies, personal witnessing, overcoming objections, the Matthew 28 mandate, and follow-up discipleship.',
    dateAdded: '2026-05-19',
    chapters: [
      { time: 0, title: 'The Great Commission' },
      { time: 540, title: 'Personal Witnessing' },
      { time: 1400, title: 'Handling Objections' },
      { time: 2200, title: 'Discipleship Pathways' }
    ]
  },
  {
    id: 'media_som_mod3',
    title: 'Livestream Video: Ministerial Ethics, Financial Integrity & Pastoral Care',
    speaker: 'Apostle Gillian Selkridge',
    duration: '1:02:00',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'High ethical standards for ministers, financial transparency, pastoral counseling confidentiality, handling church conflict, and servant leadership.',
    dateAdded: '2026-06-16',
    chapters: [
      { time: 0, title: 'The Character of the Leader' },
      { time: 800, title: 'Financial Stewardship' },
      { time: 1900, title: 'Counseling Confidentiality' },
      { time: 2900, title: 'Servant Leadership' }
    ]
  },
  {
    id: 'media_som_mod6',
    title: 'Livestream Video: School of the Pastors & Expository Preaching',
    speaker: 'Pastor Samuel Selkridge',
    duration: '1:12:00',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    description: 'Pastoral theology, caring for the sheepfold, sermon manuscript development, expository delivery, and ministry longevity.',
    dateAdded: '2026-09-01',
    chapters: [
      { time: 0, title: 'Pastoral Heart & Calling' },
      { time: 950, title: 'Shepherding the Flock' },
      { time: 2200, title: 'Expository Preaching' },
      { time: 3400, title: 'Ministry Longevity' }
    ]
  }
];

export const ClassroomMediaPlayer: React.FC<ClassroomMediaPlayerProps> = ({
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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [useDirectStream, setUseDirectStream] = useState(false);
  const [youtubeEmbedMode, setYoutubeEmbedMode] = useState<'nocookie' | 'standard'>('nocookie');
  const [timestampNoteToast, setTimestampNoteToast] = useState<string | null>(null);

  // Timestamp Seeking
  const seekToSeconds = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (!isPlaying) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
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
    const el = currentTrack?.type === 'video' ? videoRef.current : audioRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().then(() => setIsPlaying(true)).catch(e => console.log('Media playback error:', e));
    }
  };

  const handleTimeUpdate = () => {
    const el = currentTrack?.type === 'video' ? videoRef.current : audioRef.current;
    if (el) {
      setCurrentTime(el.currentTime);
      setDuration(el.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    const el = currentTrack?.type === 'video' ? videoRef.current : audioRef.current;
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
    if (videoRef.current) videoRef.current.volume = val;
  };

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    const el = currentTrack?.type === 'video' ? videoRef.current : audioRef.current;
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
    if (videoRef.current) videoRef.current.playbackRate = speed;
  };

  const skipTime = (seconds: number) => {
    const el = currentTrack?.type === 'video' ? videoRef.current : audioRef.current;
    if (el) {
      const newTime = Math.max(0, Math.min(el.duration || Infinity, el.currentTime + seconds));
      el.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const changeSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    handleSetSpeed(newSpeed);
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-xl space-y-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white tracking-tight">
                Classroom Sermon & Lecture Audio/Video Player
              </h3>
              {courseCode && (
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-extrabold rounded border border-indigo-500/30">
                  {courseCode}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Listen to recorded sermon MP3s, stream lecture sessions, and download offline audio guides.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenNotes && (
            <button
              type="button"
              onClick={() => onOpenNotes(currentTrack?.title)}
              className="px-3 py-1.5 bg-[#023264] hover:bg-[#022347] text-[#dfc18b] font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:opacity-80 border border-[#b38f53]/40"
              title="Open parallel class notes and Amplified Bible"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Notes & AMP Bible</span>
            </button>
          )}

          {!isStudent && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:opacity-80"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Recording</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Player Display */}
      {currentTrack && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5">
          {/* Active Media Container */}
          <div className="flex flex-col space-y-3">
            {/* If it's a Video track, render the high-impact large screen */}
            {currentTrack.type === 'video' && (
              <div className="w-full flex flex-col space-y-2">
                <div className="w-full h-72 md:h-[380px] bg-black rounded-xl overflow-hidden border border-slate-800 relative shadow-xl group">
                  {/* Ambient Glow Backdrop under video */}
                  <div className="absolute -inset-4 bg-indigo-500/15 blur-2xl pointer-events-none rounded-xl" />

                  {parsedMedia.isYouTube ? (
                    <iframe
                      src={youtubeEmbedMode === 'nocookie' ? parsedMedia.embedUrl : (parsedMedia.standardEmbedUrl || parsedMedia.embedUrl)}
                      className="w-full h-full border-0 rounded-xl relative z-10"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      title={currentTrack.title}
                    />
                  ) : parsedMedia.isVimeo || parsedMedia.isLoom ? (
                    <iframe
                      src={parsedMedia.embedUrl}
                      className="w-full h-full border-0 rounded-xl relative z-10"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      title={currentTrack.title}
                    />
                  ) : (isDriveVideo && !useDirectStream) ? (
                    <iframe
                      src={parsedMedia.embedUrl}
                      className="w-full h-full border-0 rounded-xl relative z-10"
                      allow="autoplay; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      title={currentTrack.title}
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={isDriveVideo ? (parsedMedia.proxyStreamUrl || `/api/drive-proxy/stream/${parsedMedia.fileId}`) : currentTrack.url}
                      className="w-full h-full rounded-xl bg-black object-contain relative z-10"
                      controls
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={() => setIsPlaying(false)}
                    />
                  )}
                </div>

                {/* Mode Selector and Status Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-1 gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-blue-400 font-extrabold flex items-center gap-1.5 bg-blue-950/70 border border-blue-800/80 px-2.5 py-1 rounded-lg">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      {isDriveVideo 
                        ? (useDirectStream ? 'Proxy Video Stream (Recommended)' : 'Google Drive Embedded Player') 
                        : parsedMedia.isYouTube ? 'YouTube Player'
                        : parsedMedia.isVimeo ? 'Vimeo Player'
                        : parsedMedia.isLoom ? 'Loom Player'
                        : 'Direct HTML5 Stream'}
                    </span>
                    
                    {parsedMedia.isYouTube && (
                      <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden p-0.5">
                        <button
                          type="button"
                          onClick={() => setYoutubeEmbedMode('nocookie')}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            youtubeEmbedMode === 'nocookie' ? 'bg-rose-600 text-white font-black' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Uses youtube-nocookie.com to bypass third-party cookie iframe blocking"
                        >
                          No-Cookie Embed
                        </button>
                        <button
                          type="button"
                          onClick={() => setYoutubeEmbedMode('standard')}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            youtubeEmbedMode === 'standard' ? 'bg-rose-600 text-white font-black' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Standard youtube.com embed"
                        >
                          Standard
                        </button>
                      </div>
                    )}

                    {isDriveVideo && (
                      <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden p-0.5">
                        <button
                          type="button"
                          onClick={() => setUseDirectStream(true)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            useDirectStream ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Proxy Stream
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseDirectStream(false)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            !useDirectStream ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Drive Iframe
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 self-end">
                    {!isStudent && (
                      <button
                        type="button"
                        onClick={() => startEditingMedia(currentTrack)}
                        className="text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                        title="Edit recording title and details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Details</span>
                      </button>
                    )}
                    <a
                      href={parsedMedia.directWatchUrl || currentTrack.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white font-extrabold flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 px-3 py-1 rounded-lg text-xs shadow-md transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {parsedMedia.isYouTube ? 'Watch on YouTube' : isDriveVideo ? 'Open in Drive' : 'Open Link'}
                    </a>
                  </div>
                </div>

                {/* Informational Guidance for YouTube / Drive links */}
                {parsedMedia.isYouTube && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-[11px] text-rose-200/90 leading-relaxed flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>YouTube Stream Helper:</strong> If YouTube displays <em>"This content is blocked"</em> in your current browser session, YouTube restricts nested iframe playback. Click <strong>Watch on YouTube</strong> or toggle between <strong>No-Cookie Embed</strong> and <strong>Standard</strong> above to launch directly!
                      </div>
                    </div>
                    <a
                      href={parsedMedia.directWatchUrl || currentTrack.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] rounded-md transition-all flex items-center gap-1 shadow-sm"
                    >
                      <ExternalLink className="w-3 h-3" /> Launch Video
                    </a>
                  </div>
                )}

                {isDriveVideo && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Google Drive Video Note:</strong> If Google displays a "Content blocked" warning or error, keep <strong>Proxy Stream</strong> selected or ensure the Google Drive sharing setting is set to <em>"Anyone with the link can view"</em>. Alternatively, you can use YouTube, Vimeo, or Loom links for iframe-friendly streaming.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If it's an Audio track, show the beautiful visual spectrum split block */}
            {currentTrack.type === 'audio' && (
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-full md:w-44 h-32 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-950 rounded-xl border border-indigo-500/40 flex flex-col items-center justify-center p-3 text-center flex-shrink-0 relative overflow-hidden group shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <audio
                    ref={audioRef}
                    src={currentTrack.url}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                  />
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <Disc className={`w-8 h-8 text-amber-400 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                    {/* Futuristic Audio Spectrum Bars */}
                    <div className="flex items-end gap-0.5 h-6">
                      <span className={`w-1 bg-amber-400 rounded-full transition-all ${isPlaying ? 'h-5 animate-pulse' : 'h-1.5'}`} />
                      <span className={`w-1 bg-indigo-400 rounded-full transition-all ${isPlaying ? 'h-3 animate-pulse delay-75' : 'h-2'}`} />
                      <span className={`w-1 bg-cyan-400 rounded-full transition-all ${isPlaying ? 'h-6 animate-pulse delay-150' : 'h-1'}`} />
                      <span className={`w-1 bg-emerald-400 rounded-full transition-all ${isPlaying ? 'h-4 animate-pulse' : 'h-2'}`} />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-black text-indigo-300 uppercase tracking-widest bg-indigo-900/60 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    {isPlaying ? 'LIVE STREAM' : 'AUDIO RECORDING'}
                  </span>
                </div>

                {/* Track Info (for audio we show it inside this layout box) */}
                <div className="flex-1 w-full space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-800 text-amber-300 text-[10px] font-extrabold uppercase rounded border border-slate-700">
                        audio
                      </span>
                      <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                        <User className="w-3 h-3" /> {currentTrack.speaker}
                      </span>
                    </div>

                    {!isStudent && (
                      <button
                        type="button"
                        onClick={() => startEditingMedia(currentTrack)}
                        className="text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Edit recording details"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Details</span>
                      </button>
                    )}
                  </div>
                  <h4 className="text-sm font-extrabold text-white leading-snug">
                    {currentTrack.title}
                  </h4>
                  {currentTrack.description && (
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5 line-clamp-2">
                      {currentTrack.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Controls and metadata for non-iframe streams */}
            {!isIframeVideo && (
              <div className="pt-2 border-t border-slate-900 space-y-3">
                {/* Metadata header block (video only) */}
                {currentTrack.type === 'video' && (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-800 text-amber-300 text-[10px] font-extrabold uppercase rounded border border-slate-700">
                          {currentTrack.type}
                        </span>
                        <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                          <User className="w-3 h-3" /> {currentTrack.speaker}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-white mt-1 leading-snug">
                        {currentTrack.title}
                      </h4>
                      {currentTrack.description && (
                        <p className="text-xs text-slate-400 leading-relaxed mt-0.5 line-clamp-2">
                          {currentTrack.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!isStudent && (
                        <button
                          type="button"
                          onClick={() => startEditingMedia(currentTrack)}
                          className="p-2 bg-slate-800 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-slate-700 hover:border-amber-500/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit recording details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <a
                        href={currentTrack.url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer flex-shrink-0 animate-fadeIn"
                        title="Download File"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Progress Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{formatSecs(currentTime)}</span>
                    <span>{currentTrack.duration || formatSecs(duration)}</span>
                  </div>
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => skipTime(-10)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Skip backward 10 seconds"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:opacity-80 animate-fadeIn"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => skipTime(10)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Skip forward 10 seconds"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    {/* Speed Pill Selectors */}
                    <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-750 ml-1">
                      {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => handleSetSpeed(spd)}
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                            playbackSpeed === spd
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>

                    {/* Capture Timestamp to Note Button */}
                    <button
                      type="button"
                      onClick={handleCaptureTimestampNote}
                      className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-700/60 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Save current playback timestamp to Class Notes"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Note Timestamp</span>
                      <span className="font-mono text-[10px] bg-slate-900 px-1 py-0.2 rounded text-amber-300 font-bold">
                        {formatSecs(currentTime)}
                      </span>
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={toggleMute} className="text-slate-400 hover:text-white cursor-pointer">
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                  </div>
                </div>

                {/* Timestamp Note Toast Notification */}
                {timestampNoteToast && (
                  <div className="p-2 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{timestampNoteToast}</span>
                    </div>
                    {onOpenNotes && (
                      <button
                        type="button"
                        onClick={() => onOpenNotes(currentTrack.title)}
                        className="underline text-amber-300 hover:text-white text-[11px] cursor-pointer"
                      >
                        Open Notes →
                      </button>
                    )}
                  </div>
                )}

                {/* Clickable Chapter Markers & Timestamps */}
                {parsedChapters.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-400" /> Lecture Timestamps & Chapters ({parsedChapters.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                      {parsedChapters.map((ch, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => seekToSeconds(ch.seconds)}
                          className="px-2 py-1 bg-slate-900 hover:bg-indigo-950 text-slate-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
                          title={`Seek to ${ch.raw} - ${ch.label}`}
                        >
                          <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold rounded group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                            {ch.raw}
                          </span>
                          <span className="truncate max-w-[200px]">{ch.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Header info if embedded player is active */}
            {isIframeVideo && (
              <div className="pt-2 border-t border-slate-900 flex items-center justify-between animate-fadeIn">
                <div>
                  <h4 className="text-sm font-extrabold text-white leading-snug">
                    {currentTrack.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span className="text-indigo-300 font-bold flex items-center gap-1">
                      <User className="w-3 h-3" /> {currentTrack.speaker}
                    </span>
                    <span>•</span>
                    <span>{currentTrack.duration}</span>
                  </p>
                </div>

                {!isStudent && (
                  <button
                    type="button"
                    onClick={() => startEditingMedia(currentTrack)}
                    className="text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    title="Edit recording title and details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Playlist Tracks List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
          <span className="flex items-center gap-1.5">
            <ListMusic className="w-3.5 h-3.5 text-amber-400" />
            Classroom Audio & Media Tracklist ({playlist.length})
          </span>
          <span>Click track to play</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
          {playlist.map((item, idx) => {
            const isSelected = idx === currentTrackIndex;
            return (
              <div
                key={item.id}
                onClick={() => setCurrentTrackIndex(idx)}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-950/70 border-indigo-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.type === 'video' ? <VideoIcon className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{item.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.speaker} • {item.duration}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isSelected && isPlaying && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold uppercase rounded border border-emerald-500/30 animate-pulse">
                      Playing
                    </span>
                  )}
                  {!isStudent && (
                    <button
                      type="button"
                      onClick={(e) => startEditingMedia(item, e)}
                      className="p-1.5 hover:bg-amber-950/60 text-slate-400 hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
                      title="Edit recording title and details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isStudent && onRemoveMedia && playlist.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveMedia(item.id);
                      }}
                      className="p-1.5 hover:bg-rose-950 hover:text-rose-400 rounded-lg text-slate-500 transition-colors cursor-pointer"
                      title="Remove recording"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Media Modal */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleAddSubmit} className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden text-slate-100 animate-scaleIn">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" /> Add Livestream Recording / Audio Media
              </h4>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Recording Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Livestream: Sunday Worship & Prophetic Teaching"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Speaker / Preacher</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Faculty Director"
                    value={formSpeaker}
                    onChange={(e) => setFormSpeaker(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Media Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'audio' | 'video')}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="video">Video Stream / Google Drive</option>
                    <option value="audio">Audio MP3</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">
                    Audio / Video or Google Drive Link *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormUrl('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing');
                      setFormType('video');
                      if (!formTitle) setFormTitle('Google Drive Livestream Recording');
                    }}
                    className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" /> Insert Sample Drive Link
                  </button>
                </div>
                <input
                  required
                  type="url"
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
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
                <p className="text-[10px] text-slate-400 mt-1">
                  Paste any Google Drive share link, YouTube video URL, or direct MP4/MP3 web link.
                </p>
              </div>

              {/* Google Drive Detection Banner */}
              {parsedFormUrl.isDrive && (
                <div className="p-2.5 bg-blue-950/80 border border-blue-600/80 rounded-xl text-blue-200 text-[11px] font-bold flex items-center gap-2 animate-fadeIn">
                  <Globe className="w-4 h-4 text-blue-400 flex-shrink-0 animate-pulse" />
                  <div>
                    <p className="text-white font-extrabold">Google Drive Video Link Detected!</p>
                    <p className="text-[10px] text-blue-300">File ID: {parsedFormUrl.fileId}. The video will play directly inside the app using the embedded video player.</p>
                  </div>
                </div>
              )}

              {parsedFormUrl.isYouTube && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-600/80 rounded-xl text-rose-200 text-[11px] font-bold flex items-center gap-2 animate-fadeIn">
                  <VideoIcon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-extrabold">YouTube Video Link Detected!</p>
                    <p className="text-[10px] text-rose-300">Video ID: {parsedFormUrl.fileId}. Will play in the embedded YouTube player.</p>
                  </div>
                </div>
              )}

              {parsedFormUrl.isVimeo && (
                <div className="p-2.5 bg-teal-950/80 border border-teal-600/80 rounded-xl text-teal-200 text-[11px] font-bold flex items-center gap-2 animate-fadeIn">
                  <VideoIcon className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-extrabold">Vimeo Video Link Detected!</p>
                    <p className="text-[10px] text-teal-300">Video ID: {parsedFormUrl.fileId}. Will play in the embedded Vimeo player.</p>
                  </div>
                </div>
              )}

              {parsedFormUrl.isLoom && (
                <div className="p-2.5 bg-indigo-950/80 border border-indigo-600/80 rounded-xl text-indigo-200 text-[11px] font-bold flex items-center gap-2 animate-fadeIn">
                  <VideoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-extrabold">Loom Video Link Detected!</p>
                    <p className="text-[10px] text-indigo-300">Video ID: {parsedFormUrl.fileId}. Will play in the embedded Loom player.</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Brief Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes on the livestream recording or lecture highlights..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg cursor-pointer">Add Track</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Edit Media Modal */}
      {editingTrack && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleSaveEditSubmit} className="bg-slate-900 border border-amber-500/40 rounded-xl shadow-xl w-full max-w-lg overflow-hidden text-slate-100 animate-scaleIn">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    Edit Recording Details
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ID: {editingTrack.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTrack(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Recording Title */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-amber-400 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Recording Title *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Module 4: Apostolic Governance & Ephesian Foundations - Session 2"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-400 text-white shadow-inner"
                />
              </div>

              {/* Speaker and Media Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-indigo-400" /> Speaker / Preacher
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pastor Samuel Selkridge"
                    value={editSpeaker}
                    onChange={(e) => setEditSpeaker(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-400 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-400" /> Media Format / Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as 'audio' | 'video')}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="video">Video Stream / Google Drive / YouTube</option>
                    <option value="audio">Audio MP3 / Podcast Stream</option>
                  </select>
                </div>
              </div>

              {/* Duration and Date Added */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" /> Duration / Runtime
                    </span>
                    <div className="flex gap-1">
                      {['30:00', '45:00', '1:15:00'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEditDuration(preset)}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[9px] rounded text-slate-300 font-mono"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 45:00 or Livestream"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:border-cyan-400 text-cyan-300"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-400" /> Date Recorded / Added
                  </label>
                  <input
                    type="date"
                    value={editDateAdded}
                    onChange={(e) => setEditDateAdded(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-400 text-emerald-300"
                  />
                </div>
              </div>

              {/* URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-blue-400" /> Stream URL / Google Drive Link *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditUrl('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing');
                      setEditType('video');
                    }}
                    className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    Insert Sample Drive Link
                  </button>
                </div>
                <input
                  required
                  type="url"
                  placeholder="https://drive.google.com/file/d/... or https://youtube.com/watch?v=..."
                  value={editUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditUrl(val);
                    const parsed = parseVideoMediaUrl(val);
                    if (parsed.isDrive || parsed.isYouTube || parsed.isVimeo || parsed.isLoom) {
                      setEditType('video');
                    }
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-400 text-blue-300"
                />
              </div>

              {/* Detected Platform Badges */}
              {parsedEditUrl.isDrive && (
                <div className="p-2.5 bg-blue-950/80 border border-blue-600/80 rounded-xl text-blue-200 text-[11px] font-bold flex items-center gap-2 animate-fadeIn">
                  <Globe className="w-4 h-4 text-blue-400 flex-shrink-0 animate-pulse" />
                  <div>
                    <p className="text-white font-extrabold">Google Drive Video Link Detected!</p>
                    <p className="text-[10px] text-blue-300">File ID: {parsedEditUrl.fileId}. The video will be playable through Google Drive iframe & direct proxy stream.</p>
                  </div>
                </div>
              )}

              {parsedEditUrl.isYouTube && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-600/80 rounded-xl text-rose-200 text-[11px] font-bold flex items-center gap-2 animate-fadeIn">
                  <VideoIcon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-extrabold">YouTube Video Link Detected!</p>
                    <p className="text-[10px] text-rose-300">Video ID: {parsedEditUrl.fileId}. Plays in the integrated YouTube player.</p>
                  </div>
                </div>
              )}

              {parsedEditUrl.isVimeo && (
                <div className="p-2.5 bg-teal-950/80 border border-teal-600/80 rounded-xl text-teal-200 text-[11px] font-bold flex items-center gap-2 animate-fadeIn">
                  <VideoIcon className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-extrabold">Vimeo Video Link Detected!</p>
                    <p className="text-[10px] text-teal-300">Video ID: {parsedEditUrl.fileId}. Plays in the embedded Vimeo player.</p>
                  </div>
                </div>
              )}

              {parsedEditUrl.isLoom && (
                <div className="p-2.5 bg-indigo-950/80 border border-indigo-600/80 rounded-xl text-indigo-200 text-[11px] font-bold flex items-center gap-2 animate-fadeIn">
                  <VideoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-extrabold">Loom Video Link Detected!</p>
                    <p className="text-[10px] text-indigo-300">Video ID: {parsedEditUrl.fileId}. Plays in the embedded Loom player.</p>
                  </div>
                </div>
              )}

              {/* Description & Sermon Notes */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                  Description & Sermon Highlights
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of topics covered, scripture references, homework notes..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs focus:outline-none focus:border-amber-400 text-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <div>
                {editSuccessFeedback && (
                  <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 animate-fadeIn">
                    <Check className="w-4 h-4" /> Recording details updated!
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTrack(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:opacity-80"
                >
                  <Check className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};
