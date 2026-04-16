import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { Pause, Play, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';

interface TeleprompterProps {
  text: string;
  fontSize: number;
  scrollSpeed: number;
  isAutoScroll: boolean;
  isVoiceActive: boolean;
  opacity: number;
}

export function Teleprompter({
  text,
  fontSize,
  scrollSpeed: externalSpeed,
  isAutoScroll,
  isVoiceActive,
  opacity,
}: TeleprompterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseHint, setShowPauseHint] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(externalSpeed);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  // Sync if parent speed changes
  useEffect(() => { setLocalSpeed(externalSpeed); }, [externalSpeed]);

  // Reset scroll when script changes
  useEffect(() => {
    setScrollPos(0);
    setIsPaused(false);
  }, [text]);

  useEffect(() => {
    setShowPauseHint(true);
    hintTimerRef.current = setTimeout(() => setShowPauseHint(false), 3000);
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  }, []);

  useEffect(() => {
    if (!isAutoScroll || isVoiceActive || isPaused) return;
    const pxPerFrame = (localSpeed * 3) / 60;
    const interval = setInterval(() => {
      setScrollPos(prev => prev + pxPerFrame);
    }, 16);
    return () => clearInterval(interval);
  }, [isAutoScroll, isVoiceActive, isPaused, localSpeed]);

  const handleTap = useCallback(() => {
    setIsPaused(p => !p);
    setShowPauseHint(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setShowPauseHint(false), 2000);
  }, []);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setScrollPos(0);
    setIsPaused(false);
  }, []);

  const handleSpeedUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalSpeed(s => Math.min(100, s + 5));
  }, []);

  const handleSpeedDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalSpeed(s => Math.max(1, s - 5));
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 select-none pointer-events-none"
      style={{ backgroundColor: `rgba(0, 0, 0, ${opacity / 100})` }}
    >
      {/* Pause hint */}
      {showPauseHint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-full border border-white/20 z-30 pointer-events-none">
          {isPaused
            ? <><Play  className="w-3 h-3 text-white" /><span className="text-[10px] text-white font-medium">Tap to resume</span></>
            : <><Pause className="w-3 h-3 text-white" /><span className="text-[10px] text-white font-medium">Tap to pause</span></>
          }
        </div>
      )}

      {isPaused && !showPauseHint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-full border border-white/20 z-30 pointer-events-none">
          <Pause className="w-3 h-3 text-white" />
          <span className="text-[10px] text-white font-medium">Paused</span>
        </div>
      )}

      {/* Speed controls + Reset — right side of camera */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 pointer-events-auto">
        {/* Speed up */}
        <button
          onClick={handleSpeedUp}
          className="w-9 h-9 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-black/80 active:scale-95 transition-all"
          aria-label="Increase speed"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* Speed indicator */}
        <div className="flex flex-col items-center bg-black/60 backdrop-blur-md border border-white/20 rounded-xl px-2 py-2 gap-1">
          <span className="text-[8px] uppercase tracking-widest text-white/50">spd</span>
          <span className="text-xs font-bold font-mono text-white">{localSpeed}</span>
        </div>

        {/* Speed down */}
        <button
          onClick={handleSpeedDown}
          className="w-9 h-9 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-black/80 active:scale-95 transition-all"
          aria-label="Decrease speed"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-white/10" />

        {/* Reset button */}
        <button
          onClick={handleReset}
          className="w-9 h-9 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-black/80 active:scale-95 transition-all"
          aria-label="Reset teleprompter"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Scrolling text — tap to pause */}
      <div
        onClick={handleTap}
        className="w-full max-w-md h-full overflow-hidden relative pointer-events-auto cursor-pointer"
      >
        <div className="absolute top-1/3 left-0 right-0 h-20 border-y border-white/20 z-20 bg-white/5" />
        <motion.div
          animate={{ y: -scrollPos }}
          transition={{ type: 'tween', duration: 0, ease: 'linear' }}
          className="flex flex-wrap justify-center content-start gap-x-2 gap-y-1 pt-[33vh] pb-[50vh]"
        >
          {words.map((word, i) => (
            <span
              key={i}
              className="text-white/90"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
            >
              {word}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
