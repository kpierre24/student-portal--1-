import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Volume2, VolumeX, ShieldCheck, BookOpen, GraduationCap, CheckCircle2 } from 'lucide-react';
import { AppUser } from '../lib/userAuth';

interface IntroSplashScreenProps {
  onComplete: () => void;
  appUser?: AppUser | null;
}

interface LightParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

export const IntroSplashScreen: React.FC<IntroSplashScreenProps> = ({ onComplete, appUser }) => {
  // 3 Harmonious, seamless progressive stages:
  // 1. 'crest' (0.0s - 1.8s): Deep royal navy atmosphere, glowing golden halo, and official HTEIM seal entrance
  // 2. 'orientation' (1.8s - 4.4s): Institutional welcome, vision motto, and 3 academic pillars card
  // 3. 'transition' (4.4s - 5.4s): Smooth scale & dissolve docking into the active portal
  const [stage, setStage] = useState<'crest' | 'orientation' | 'transition'>('crest');
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Soft ambient golden particles
  const particles = useRef<LightParticle[]>(
    Array.from({ length: 32 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2.5,
      delay: Math.random() * 1.5,
      duration: Math.random() * 3.5 + 3,
      opacity: Math.random() * 0.45 + 0.2,
    }))
  ).current;

  // Synthesize ambient celestial chord progression
  const playAmbientSound = () => {
    try {
      if (audioContextRef.current) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, ctx.currentTime);
      filter.Q.setValueAtTime(1.0, ctx.currentTime);

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0, ctx.currentTime);
      mainGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 1.2);

      filter.connect(mainGain);
      mainGain.connect(ctx.destination);

      // Majestic celestial chord (D major 9th)
      const freqs = [146.83, 220.0, 293.66, 369.99, 440.0, 554.37];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = index % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 5, ctx.currentTime);

        oscGain.gain.setValueAtTime(0, ctx.currentTime);
        oscGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1.0 + index * 0.1);

        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start();

        oscGain.gain.setValueAtTime(0.05, ctx.currentTime + 4.5);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 5.3);
        osc.stop(ctx.currentTime + 5.4);
      });

      // Warm crystal chime bell at orientation transition (1.8s)
      setTimeout(() => {
        if (ctx.state === 'closed') return;
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(1174.66, ctx.currentTime); // D6 bell
        chimeGain.gain.setValueAtTime(0, ctx.currentTime);
        chimeGain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.08);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0);
        chimeOsc.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chimeOsc.start();
        chimeOsc.stop(ctx.currentTime + 2.1);
      }, 1800);
    } catch (e) {
      console.warn("AudioContext init skipped:", e);
    }
  };

  // Structured seamless timeline: 5.4 seconds total or user skip
  useEffect(() => {
    const startTime = Date.now();
    const totalDuration = 5400; // 5.4s seamless transition

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentPct = Math.min(100, (elapsed / totalDuration) * 100);
      setProgress(currentPct);
    }, 35);

    const tOrientation = setTimeout(() => setStage('orientation'), 1800);
    const tTransition = setTimeout(() => setStage('transition'), 4400);
    const tComplete = setTimeout(() => {
      onComplete();
    }, 5400);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(tOrientation);
      clearTimeout(tTransition);
      clearTimeout(tComplete);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
      }
    };
  }, [onComplete]);

  const handleMuteToggle = () => {
    if (muted) {
      setMuted(false);
      playAmbientSound();
    } else {
      setMuted(true);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
    }
  };

  const userDisplayName = appUser?.name?.split(' ')[0] || (appUser?.role === 'admin' ? 'Apostle' : 'Beloved Student');

  return (
    <motion.div
      id="intro-splash-screen"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[9999] bg-[#030914] flex flex-col items-center justify-center overflow-hidden select-none"
      role="region"
      aria-label="HTEIM School of Ministry Institutional Welcome"
    >
      {/* Deep Royal Midnight Canvas with Ambient Golden Bloom */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0a1d3b_0%,_#051021_50%,_#02060e_100%)] pointer-events-none" />

      {/* Rotating Divine Golden Light Rays in Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="w-[900px] h-[900px] sm:w-[1200px] sm:h-[1200px] rounded-full opacity-25 pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(217,119,6,0.18) 20deg, transparent 40deg, rgba(245,158,11,0.22) 60deg, transparent 80deg, rgba(217,119,6,0.15) 110deg, transparent 140deg, rgba(245,158,11,0.25) 180deg, transparent 210deg, rgba(217,119,6,0.15) 240deg, transparent 270deg, rgba(245,158,11,0.2) 310deg, transparent 360deg)'
          }}
        />
      </div>

      {/* Floating Golden Bokeh Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              opacity: 0, 
              x: `${p.x}vw`, 
              y: `${p.y + 6}vh`, 
              scale: 0.5 
            }}
            animate={{ 
              opacity: [0, p.opacity, p.opacity, 0],
              y: [`${p.y + 6}vh`, `${p.y - 14}vh`],
              scale: [0.5, 1.1, 1.1, 0.4]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut"
            }}
            style={{ width: p.size, height: p.size }}
            className="absolute rounded-full bg-amber-300/60 shadow-[0_0_12px_rgba(251,191,36,0.5)] blur-[0.5px]"
          />
        ))}
      </div>

      {/* Top Header Controls: Sound & Institutional Tag */}
      <div className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-200/90 font-mono">
            HTEIM • Academic Portal 2026
          </span>
        </div>

        <button
          onClick={handleMuteToggle}
          type="button"
          className="p-2 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-amber-300 transition-all cursor-pointer flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider shadow-lg backdrop-blur-md"
          title="Toggle atmospheric audio"
        >
          {muted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Sound Off</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline text-emerald-300">Sound On</span>
            </>
          )}
        </button>
      </div>

      {/* Central Visual Stage */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-2xl px-4 text-center w-full">
        
        {/* Stage 1: Divine Seal & Crest Reveal */}
        <AnimatePresence mode="wait">
          {stage === 'crest' && (
            <motion.div
              key="stage-crest"
              initial={{ scale: 0.8, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: -10 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              {/* Radiant Halo Backlight */}
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-300/20 to-sky-400/20 blur-2xl animate-pulse" />
                
                {/* Official HTEIM Seal */}
                <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full p-2 bg-gradient-to-br from-amber-400/30 via-slate-900 to-amber-500/20 border-2 border-amber-400/80 shadow-[0_0_40px_rgba(245,158,11,0.35)] flex items-center justify-center">
                  <img
                    src="/hteim_logo.svg"
                    alt="Heaven Touching Earth International Ministries Seal"
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/hteim_logo.png';
                    }}
                  />
                  {/* Subtle Light Sweep */}
                  <motion.div
                    initial={{ x: '-150%' }}
                    animate={{ x: '150%' }}
                    transition={{ duration: 1.4, delay: 0.3, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none rounded-full"
                  />
                </div>
              </div>

              {/* Title & Organization */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mt-6 space-y-2"
              >
                <span className="text-xs sm:text-sm font-bold tracking-[0.25em] uppercase text-amber-400 block font-mono">
                  Heaven Touching Earth Int&apos;l Ministries
                </span>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white font-serif">
                  School of Ministry
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto italic font-serif">
                  &ldquo;Bringing Heaven to Earth, Taking People to Heaven&rdquo;
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* Stage 2 & 3: Institutional Orientation & Academic Pillars Card */}
          {(stage === 'orientation' || stage === 'transition') && (
            <motion.div
              key="stage-orientation"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ 
                scale: stage === 'transition' ? 1.02 : 1, 
                opacity: 1, 
                y: 0 
              }}
              exit={{ scale: 1.05, opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center w-full max-w-lg"
            >
              {/* Compact Seal Badge */}
              <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-amber-400 to-amber-600 border border-amber-300 shadow-lg shadow-amber-500/20 mb-3 flex items-center justify-center">
                <img
                  src="/hteim_logo.svg"
                  alt="HTEIM Crest"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/hteim_logo.png';
                  }}
                />
              </div>

              {/* Personalized Institutional Welcome */}
              <div className="space-y-1 mb-4">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Academic Session In Progress
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-2 font-serif">
                  Welcome, {userDisplayName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300/90 max-w-md mx-auto leading-relaxed">
                  Equipping ministerial leaders in Kingdom governance, biblical exegesis, and active supernatural ministry.
                </p>
              </div>

              {/* 3 Academic Pillars Orientation Grid */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full my-2">
                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3 text-center backdrop-blur-md shadow-lg flex flex-col items-center justify-center space-y-1">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">6 Modules</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Core Curriculum</span>
                </div>

                <div className="bg-slate-900/80 border border-amber-500/40 rounded-2xl p-3 text-center backdrop-blur-md shadow-lg flex flex-col items-center justify-center space-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/10 rounded-full blur-sm" />
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">75% Standard</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Attendance Standing</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3 text-center backdrop-blur-md shadow-lg flex flex-col items-center justify-center space-y-1">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">Honors</span>
                  <span className="text-[10px] text-slate-400 leading-tight">85%+ High Distinction</span>
                </div>
              </div>

              {/* Ready prompt indicator */}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-300/80 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Entering your ministerial portal...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Progress Bar & Skip Intro Control */}
      <div className="absolute bottom-8 w-full max-w-xs px-4 flex flex-col items-center gap-2.5 z-50">
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-md border border-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <button
          type="button"
          onClick={onComplete}
          className="px-5 py-2 rounded-full flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer shadow-md backdrop-blur-md active:scale-95"
        >
          <span>Enter Portal Now</span>
          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>
    </motion.div>
  );
};

export default IntroSplashScreen;
