import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  Hand, 
  Users, 
  Settings, 
  Maximize2, 
  Minimize2, 
  PhoneOff, 
  Sparkles, 
  ShieldCheck, 
  Radio, 
  MessageSquare,
  Volume2,
  RefreshCw,
  Share2,
  Lock,
  ExternalLink,
  Disc,
  Download,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play
} from 'lucide-react';
import { logger } from '../../lib/logger';
import { AppUser } from '../../lib/userAuth';
import { LiveClassroomSession } from './types';

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

export interface LiveWebRTCStudioProps {
  session: LiveClassroomSession;
  appUser: AppUser | null;
  onParticipantJoined?: (name: string) => void;
  onAttendanceVerified?: (studentName: string) => void;
  isModerator?: boolean;
  className?: string;
}

export const LiveWebRTCStudio: React.FC<LiveWebRTCStudioProps> = ({
  session,
  appUser,
  onParticipantJoined,
  onAttendanceVerified,
  isModerator = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const nativeVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Engine Mode: 'native' (HTML5 WebRTC MediaStream) or 'jitsi' (Cloud WebRTC Room)
  const [webrtcMode, setWebrtcMode] = useState<'native' | 'jitsi'>('native');
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Media States
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participantCount, setParticipantCount] = useState(14);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio VU Level Meter
  const [audioVolumeLevel, setAudioVolumeLevel] = useState(0);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const displayName = appUser?.name || 'Ministry Student';
  const userEmail = appUser?.email || 'student@hteim.edu';
  const sanitizedRoom = (session.roomName || 'HTEIM-SchoolOfMinistry-LiveClass').replace(/[^a-zA-Z0-9-_]/g, '');

  // ─── Native WebRTC MediaStream Handler ───
  const startNativeMediaStream = useCallback(async () => {
    setConnectionError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      if (nativeVideoRef.current) {
        nativeVideoRef.current.srcObject = stream;
      }

      setIsRoomConnected(true);
      setIsAudioMuted(false);
      setIsVideoMuted(false);

      if (onAttendanceVerified && appUser?.name) {
        onAttendanceVerified(appUser.name);
      }

      // Initialize Audio Volume Visualizer Analyser
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVU = () => {
          if (!mediaStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
          requestAnimationFrame(updateVU);
        };
        updateVU();
      } catch (e) {
        logger.warn('AudioContext VU meter not supported in this browser:', e);
      }

    } catch (err: any) {
      logger.warn('Failed acquiring camera/microphone stream:', err);
      // Fallback to video disabled or error state
      setIsVideoMuted(true);
      setConnectionError('Camera or Microphone access was denied or not available. Running in Audio-Only or Participant view.');
      setIsRoomConnected(true);
    }
  }, [appUser?.name, onAttendanceVerified]);

  // Stop Native Media Tracks
  const stopNativeMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (nativeVideoRef.current) {
      nativeVideoRef.current.srcObject = null;
    }
    setIsRoomConnected(false);
  }, []);

  // ─── Jitsi External API Room Loader ───
  useEffect(() => {
    if (window.JitsiMeetExternalAPI) {
      setIsScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById('jitsi-external-api');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsScriptLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'jitsi-external-api';
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => {
      logger.info('Jitsi External API loaded successfully.');
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      logger.warn('Jitsi script load error, keeping native WebRTC stream.');
    };
    document.body.appendChild(script);
  }, []);

  const initJitsiConference = useCallback(() => {
    if (!containerRef.current || !window.JitsiMeetExternalAPI) return;

    try {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }

      const domain = 'meet.jit.si';
      const options = {
        roomName: sanitizedRoom,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          displayName,
          email: userEmail,
        },
        configOverwrite: {
          startWithAudioMuted: !isModerator,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          toolbarButtons: [
            'camera',
            'chat',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'microphone',
            'participants-pane',
            'profile',
            'raisehand',
            'tileview',
            'videoquality',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Cohort Student',
          TOOLBAR_ALWAYS_VISIBLE: false,
        },
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      jitsiApiRef.current = api;

      // Ensure iframe permissions are attached
      const iframe = containerRef.current.querySelector('iframe');
      if (iframe) {
        iframe.setAttribute('allow', 'camera; microphone; display-capture; autoplay; clipboard-write; picture-in-picture; speaker-selection');
      }

      api.addEventListener('videoConferenceJoined', () => {
        setIsRoomConnected(true);
        setConnectionError(null);
        if (onAttendanceVerified && appUser?.name) {
          onAttendanceVerified(appUser.name);
        }
      });

      api.addEventListener('participantJoined', (participant: any) => {
        setParticipantCount(prev => prev + 1);
        if (onParticipantJoined && participant.displayName) {
          onParticipantJoined(participant.displayName);
        }
      });

      api.addEventListener('participantLeft', () => {
        setParticipantCount(prev => Math.max(1, prev - 1));
      });

      api.addEventListener('audioMuteStatusChanged', ({ muted }: { muted: boolean }) => {
        setIsAudioMuted(muted);
      });

      api.addEventListener('videoMuteStatusChanged', ({ muted }: { muted: boolean }) => {
        setIsVideoMuted(muted);
      });

      api.addEventListener('readyToClose', () => {
        setIsRoomConnected(false);
      });

    } catch (err: any) {
      logger.error('Failed initializing Jitsi conference:', err);
      setConnectionError('Room initialization error. Switching to Native WebRTC mode.');
      setWebrtcMode('native');
    }
  }, [sanitizedRoom, displayName, userEmail, isModerator, onAttendanceVerified, onParticipantJoined, appUser?.name]);

  // ─── Mode Effect Hook ───
  useEffect(() => {
    if (webrtcMode === 'native') {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      startNativeMediaStream();
    } else if (webrtcMode === 'jitsi') {
      stopNativeMediaStream();
      if (isScriptLoaded) {
        initJitsiConference();
      }
    }

    return () => {
      stopNativeMediaStream();
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [webrtcMode, isScriptLoaded, startNativeMediaStream, stopNativeMediaStream, initJitsiConference]);

  // ─── Interactive Device Controls ───
  const toggleAudio = () => {
    if (webrtcMode === 'jitsi' && jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
      return;
    }

    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (webrtcMode === 'jitsi' && jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
      return;
    }

    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (webrtcMode === 'jitsi' && jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleShareScreen');
      return;
    }

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        if (nativeVideoRef.current && mediaStreamRef.current) {
          const oldVideoTrack = mediaStreamRef.current.getVideoTracks()[0];
          if (oldVideoTrack) mediaStreamRef.current.removeTrack(oldVideoTrack);
          mediaStreamRef.current.addTrack(screenTrack);
          nativeVideoRef.current.srcObject = mediaStreamRef.current;
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          startNativeMediaStream();
        };

        setIsScreenSharing(true);
      } catch (e) {
        logger.warn('Screen share cancelled or not allowed:', e);
      }
    } else {
      setIsScreenSharing(false);
      startNativeMediaStream();
    }
  };

  const toggleRaiseHand = () => {
    if (webrtcMode === 'jitsi' && jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleRaiseHand');
    }
    setIsHandRaised(!isHandRaised);
  };

  // ─── WebRTC Local Video Recording ───
  const toggleRecording = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (!mediaStreamRef.current) return;
      recordedChunksRef.current = [];
      try {
        const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType: 'video/webm' });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (e) {
        logger.error('Failed starting WebRTC MediaRecorder:', e);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current && !nativeVideoRef.current) return;
    const elem = containerRef.current || nativeVideoRef.current;
    if (!document.fullscreenElement) {
      elem?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`relative flex flex-col bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl ${className}`}>
      
      {/* ─── Top Studio Status Header ─── */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/95 border-b border-slate-800 z-10 text-white flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
            <span className="text-[11px] font-mono font-black uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800">
              WebRTC Live Feed
            </span>
          </div>

          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-2">
              <span>{session.title}</span>
              <span className="text-[10px] font-mono font-bold text-[#dfc18b] hidden md:inline">
                [{session.moduleCode}]
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 hidden sm:block truncate">
              Instructor: <strong className="text-slate-200">{session.instructorName}</strong> • Room: <span className="font-mono">{sanitizedRoom}</span>
            </p>
          </div>
        </div>

        {/* Engine Switcher & Status Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mode Selector Pill */}
          <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setWebrtcMode('native')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                webrtcMode === 'native'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Native HTML5 WebRTC Local Studio Stream"
            >
              Native WebRTC
            </button>
            <button
              type="button"
              onClick={() => setWebrtcMode('jitsi')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                webrtcMode === 'jitsi'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to Cloud Multi-User Jitsi WebRTC Room"
            >
              Jitsi Cloud
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono font-bold text-slate-300">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>{participantCount} Active</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── Main Video Canvas Container ─── */}
      <div className="relative flex-1 w-full min-h-[420px] sm:min-h-[520px] bg-slate-950 flex items-center justify-center overflow-hidden">
        
        {/* NATIVE WEBRTC MODE CANVAS */}
        {webrtcMode === 'native' && (
          <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
            <video 
              ref={nativeVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover rounded-2xl ${isVideoMuted ? 'hidden' : 'block'}`}
            />

            {/* Camera Off / Audio Only Watermark */}
            {isVideoMuted && (
              <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center text-slate-400">
                <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-2xl">
                  <VideoOff className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">{displayName}</h4>
                  <p className="text-xs text-slate-500">Camera is turned off • WebRTC Audio Stream Active</p>
                </div>
              </div>
            )}

            {/* Audio VU Level Meter Bar */}
            {!isAudioMuted && (
              <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${audioVolumeLevel}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-300">{audioVolumeLevel}%</span>
              </div>
            )}

            {/* Hand Raised Banner Overlay */}
            {isHandRaised && (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-amber-500 text-slate-950 font-black px-3.5 py-1.5 rounded-xl shadow-lg animate-bounce text-xs">
                <Hand className="w-4 h-4 text-slate-950" />
                <span>Hand Raised for Question!</span>
              </div>
            )}
          </div>
        )}

        {/* JITSI CLOUD WEBRTC MODE CANVAS */}
        {webrtcMode === 'jitsi' && (
          <div ref={containerRef} className="w-full h-full absolute inset-0 z-0" />
        )}

        {/* Connection Error Fallback */}
        {connectionError && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-base font-black text-white">Live Stream Connection Notice</h4>
              <p className="text-xs text-slate-300">{connectionError}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => { setWebrtcMode('native'); startNativeMediaStream(); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Launch Native WebRTC Studio
              </button>
              <a
                href={`https://meet.jit.si/${sanitizedRoom}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" /> Standalone Room in New Tab
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom Studio Controls Bar ─── */}
      <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap z-10">
        
        {/* Left: Device Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 ${
              isAudioMuted 
                ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
            }`}
            title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isAudioMuted ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isAudioMuted ? 'Muted' : 'Mic On'}</span>
          </button>

          <button
            type="button"
            onClick={toggleVideo}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 ${
              isVideoMuted 
                ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
            }`}
            title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoMuted ? <VideoOff className="w-4 h-4 text-white" /> : <Video className="w-4 h-4 text-sky-400" />}
            <span className="hidden sm:inline">{isVideoMuted ? 'Camera Off' : 'Camera On'}</span>
          </button>
        </div>

        {/* Center: Interactive Classroom Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700 shadow-2xs active:scale-95 ${
              isScreenSharing
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
            title="Share Screen or Slides"
          >
            <Monitor className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline">Share Screen</span>
          </button>

          <button
            type="button"
            onClick={toggleRaiseHand}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700 shadow-2xs active:scale-95 ${
              isHandRaised 
                ? 'bg-amber-500 text-slate-950 font-black' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
            title={isHandRaised ? 'Lower Hand' : 'Raise Hand for Question'}
          >
            <Hand className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{isHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
          </button>

          {/* Local WebRTC Recorder Button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700 shadow-2xs active:scale-95 ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
            title={isRecording ? 'Stop Recording' : 'Record Live Lecture Studio'}
          >
            <Disc className={`w-4 h-4 ${isRecording ? 'text-white' : 'text-rose-400'}`} />
            <span className="hidden md:inline">{isRecording ? 'Recording...' : 'Record Studio'}</span>
          </button>

          {recordedVideoUrl && (
            <a
              href={recordedVideoUrl}
              download={`HTEIM_Live_Lecture_${session.moduleCode}.webm`}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Download Recorded WebRTC Video (.webm)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Download Recording</span>
            </a>
          )}
        </div>

        {/* Right: Faculty Moderation Tools & Popout */}
        <div className="flex items-center gap-2">
          <a
            href={`https://meet.jit.si/${sanitizedRoom}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-1.5"
            title="Open Fullscreen in New Browser Tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-300" />
            <span className="hidden sm:inline">Popout</span>
          </a>
        </div>

      </div>

    </div>
  );
};
