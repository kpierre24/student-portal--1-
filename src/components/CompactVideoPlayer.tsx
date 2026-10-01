import React, { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Settings, X } from 'lucide-react';

interface CompactVideoPlayerProps {
  src: string;
  poster?: string;
  autoplay?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
  title?: string;
}

export const CompactVideoPlayer: React.FC<CompactVideoPlayerProps> = ({
  src,
  poster,
  autoplay = false,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
  className = '',
  title
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize Video.js player
    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: autoplay,
      preload: 'auto',
      fluid: true,
      responsive: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      controlBar: {
        volumePanel: { inline: false },
        pictureInPictureToggle: true,
        playbackRateMenuButton: true
      },
      html5: {
        vhs: {
          overrideNative: true
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false
      }
    });

    playerRef.current = player;

    // Event listeners
    player.on('timeupdate', () => {
      if (onTimeUpdate) {
        onTimeUpdate(player.currentTime(), player.duration());
      }
    });

    player.on('ended', () => {
      if (onEnded) onEnded();
    });

    player.on('play', () => {
      if (onPlay) onPlay();
    });

    player.on('pause', () => {
      if (onPause) onPause();
    });

    player.on('volumechange', () => {
      setIsMuted(player.muted());
      setVolume(player.volume());
    });

    // Hide controls when playing
    player.on('play', () => {
      hideControlsDelayed();
    });

    player.on('useractive', () => {
      setShowControls(true);
      if (controlsTimeout) clearTimeout(controlsTimeout);
    });

    player.on('userinactive', () => {
      if (!player.paused()) {
        setShowControls(false);
      }
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [src, autoplay, onTimeUpdate, onEnded, onPlay, onPause]);

  const hideControlsDelayed = () => {
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => {
      if (playerRef.current && !playerRef.current.paused()) {
        setShowControls(false);
      }
    }, 3000);
    setControlsTimeout(timeout);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      playerRef.current.muted(!playerRef.current.muted());
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.volume(newVolume);
      playerRef.current.muted(newVolume === 0);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    hideControlsDelayed();
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => hideControlsDelayed()}
    >
      {/* Video.js Player */}
      <div data-vjs-player>
        <video
          ref={videoRef}
          className="video-js vjs-default-skin vjs-big-play-centered"
          poster={poster}
        >
          <source src={src} type="video/mp4" />
          <p className="vjs-no-js">
            To view this video please enable JavaScript, and consider upgrading to a web browser that
            <a href="https://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a>
          </p>
        </video>
      </div>

      {/* Custom Minimalist Controls Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Title */}
        {title && (
          <div className="text-white text-sm font-semibold mb-2 truncate">
            {title}
          </div>
        )}

        {/* Progress Bar - Custom */}
        <div className="w-full h-1 bg-white/20 rounded-full mb-3 cursor-pointer">
          <div 
            className="h-full bg-amber-500 rounded-full relative"
            style={{ width: playerRef.current ? `${(playerRef.current.currentTime() / playerRef.current.duration()) * 100}%` : '0%' }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-500 rounded-full shadow-lg" />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause - handled by video.js but we can add custom */}
            <button
              onClick={() => playerRef.current?.paused() ? playerRef.current?.play() : playerRef.current?.pause()}
              className="text-white hover:text-amber-400 transition-colors"
            >
              {playerRef.current?.paused() ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-amber-400 transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Time Display */}
            <div className="text-white text-xs font-mono">
              {playerRef.current ? `${Math.floor(playerRef.current.currentTime() / 60)}:${String(Math.floor(playerRef.current.currentTime() % 60)).padStart(2, '0')} / ${Math.floor(playerRef.current.duration() / 60)}:${String(Math.floor(playerRef.current.duration() % 60)).padStart(2, '0')}` : '0:00 / 0:00'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Settings (handled by video.js) */}
            <button className="text-white hover:text-amber-400 transition-colors">
              <Settings className="w-5 h-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-amber-400 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Loading Spinner */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
};

export default CompactVideoPlayer;