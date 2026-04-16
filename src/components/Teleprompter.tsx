import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';

interface TeleprompterProps {
  text: string;
  fontSize: number;
  scrollSpeed: number;
  isAutoScroll: boolean;
  isVoiceActive: boolean;
  opacity: number;
}

function clean(w: string): string {
  return w.replace(/[^a-z0-9']/gi, '').toLowerCase();
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
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const currentWordIndexRef = useRef(-1);
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── FIX 2: single source of truth for words ────────────────────────────────
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const wordsRef = useRef(words);
  useEffect(() => { wordsRef.current = words; }, [words]);

  // Keep index ref in sync
  useEffect(() => { currentWordIndexRef.current = currentWordIndex; }, [currentWordIndex]);

  // Reset word index when script changes
  useEffect(() => {
    setCurrentWordIndex(-1);
    setScrollPos(0);
  }, [text]);

  // Voice-sync scroll
  useEffect(() => {
    if (!isVoiceActive || currentWordIndex < 0) return;
    const wordEl = document.getElementById(`word-${currentWordIndex}`);
    if (wordEl && containerRef.current) {
      const containerH = containerRef.current.clientHeight;
      setScrollPos(wordEl.offsetTop - containerH / 3);
    }
  }, [currentWordIndex, isVoiceActive]);

  // Auto-scroll (timer-based, when voice is OFF)
  useEffect(() => {
    if (!isAutoScroll || isVoiceActive) return;
    const interval = setInterval(() => {
      setScrollPos(prev => prev + scrollSpeed / 10);
    }, 16);
    return () => clearInterval(interval);
  }, [isAutoScroll, isVoiceActive, scrollSpeed]);

  // Speech Recognition
  useEffect(() => {
    if (!isVoiceActive) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      return;
    }

    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }

    let active = true;

    function startRecognition() {
      if (!active) return;
      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        const spokenWords = fullTranscript.trim().split(/\s+/).map(clean).filter(Boolean);
        const scriptWords = wordsRef.current;
        let bestIndex = currentWordIndexRef.current;
        const windowSize = 6;
        const recentSpoken = spokenWords.slice(-windowSize);

        for (let si = bestIndex + 1; si < scriptWords.length; si++) {
          const scriptWord = clean(scriptWords[si]);
          if (!scriptWord) continue;
          const matched = recentSpoken.some(
            sw => sw === scriptWord || (scriptWord.length > 3 && sw.startsWith(scriptWord.slice(0, Math.floor(scriptWord.length * 0.75))))
          );
          if (matched) bestIndex = si;
        }

        if (bestIndex > currentWordIndexRef.current) {
          setCurrentWordIndex(bestIndex);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          console.warn('[Voice] Microphone permission denied.');
          active = false;
          return;
        }
        scheduleRestart();
      };

      recognition.onend = () => { scheduleRestart(); };

      try {
        recognition.start();
      } catch {
        scheduleRestart();
      }
    }

    function scheduleRestart() {
      if (!active) return;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (active) startRecognition();
      }, 300);
    }

    startRecognition();

    return () => {
      active = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try { recognitionRef.current?.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [isVoiceActive]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: `rgba(0, 0, 0, ${opacity / 100})` }}
    >
      <div className="w-full max-w-md h-full overflow-hidden relative">
        <div className="absolute top-1/3 left-0 right-0 h-20 border-y border-white/20 pointer-events-none z-20 bg-white/5" />
        <motion.div
          animate={{ y: -scrollPos }}
          transition={{ type: 'spring', damping: 30, stiffness: 100, mass: 0.5 }}
          className="flex flex-wrap justify-center content-start gap-x-2 gap-y-1 pt-[33vh] pb-[50vh]"
        >
          {words.map((word, i) => (
            <span
              key={i}
              id={`word-${i}`}
              className={`transition-all duration-300 ${
                i === currentWordIndex
                  ? 'text-white font-bold scale-110'
                  : i < currentWordIndex
                  ? 'text-white/30'
                  : 'text-white/80'
              }`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {word}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
