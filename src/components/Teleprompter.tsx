import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { Pause, Play } from 'lucide-react';

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
  scrollSpeed,
  isAutoScroll,
  isVoiceActive,
  opacity,
}: TeleprompterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseHint, setShowPauseHint] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  // Reset when script changes
  useEffect(() => {
    setScrollPos(0);
    setIsPaused(false);
  }, [text]);

  // Show pause hint briefly on mount
  useEffect(() => {
    setShowPauseHint(true);
    hintTimerRef.current = setTimeout(() => setShowPauseHint(false), 3000);
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  }, []);

  // Auto-scroll — slow, smooth
  useEffect(() => {
    if (!isAutoScroll || isVoiceActive || isPaused) return;
    // scrollSpeed 1-100, we want ~8-80 px/sec
    // at 60fps: px per frame = (scrollSpeed * 0.8) / 60
    const pxPerFrame = (scrollSpeed * 0.8) / 60;
    const interval = setInterval(() => {
      setScrollPos(prev => prev + pxPerFrame);
    }, 16);
    return () => clearInterval(interval);
  }, [isAutoScroll, isVoiceActive, isPaused, scrollSpeed]);

  const handleTap = useCallback(() => {
    setIsPaused(p => !p);
    setShowPauseHint(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setShowPauseHint(false), 2000);
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={handleTap}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 cursor-pointer select-none"
      style={{ backgroundColor: `rgba(0, 0, 0, ${opacity / 100})` }}
    >
      {/* Tap to pause hint */}
      {showPauseHint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-full border border-white/20 transition-opacity z-30">
          {isPaused
            ? <><Play className="w-3 h-3 text-white" /><span className="text-[10px] text-white font-medium">Tap to resume</span></>
            : <><Pause className="w-3 h-3 text-white" /><span className="text-[10px] text-white font-medium">Tap to pause</span></>
          }
        </div>
      )}

      {/* Paused badge */}
      {isPaused && !showPauseHint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-full border border-white/20 z-30">
          <Pause className="w-3 h-3 text-white" />
          <span className="text-[10px] text-white font-medium">Paused</span>
        </div>
      )}

      <div className="w-full max-w-md h-full overflow-hidden relative pointer-events-none">
        {/* Reading line highlight */}
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
