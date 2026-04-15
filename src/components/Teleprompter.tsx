import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  opacity 
}: TeleprompterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const words = text.split(/\s+/);
  
  const currentWordIndexRef = useRef(currentWordIndex);
  useEffect(() => { currentWordIndexRef.current = currentWordIndex; }, [currentWordIndex]);

  const wordsRef = useRef(words);
  useEffect(() => { wordsRef.current = words; }, [words]);

  // Speech Recognition setup
  useEffect(() => {
    if (!isVoiceActive) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.toLowerCase();
      
      // Try to find the spoken words in our text
      const spokenWords = transcript.split(/\s+/);
      spokenWords.forEach((word: string) => {
        const index = wordsRef.current.findIndex((w, i) => i > currentWordIndexRef.current && w.toLowerCase().includes(word));
        if (index !== -1) {
          setCurrentWordIndex(index);
        }
      });
    };

    recognition.start();
    return () => recognition.stop();
  }, [isVoiceActive]);

  // Auto-scroll logic
  useEffect(() => {
    if (!isAutoScroll || isVoiceActive) return;

    const interval = setInterval(() => {
      setScrollPos(prev => prev + scrollSpeed / 10);
    }, 16);

    return () => clearInterval(interval);
  }, [isAutoScroll, isVoiceActive, scrollSpeed]);

  // Voice-sync scroll logic
  useEffect(() => {
    if (!isVoiceActive || currentWordIndex === -1) return;

    // Scroll to the current word
    const wordElement = document.getElementById(`word-${currentWordIndex}`);
    if (wordElement && containerRef.current) {
      const containerHeight = containerRef.current.clientHeight;
      const wordTop = wordElement.offsetTop;
      // Keep the current word roughly in the upper third
      setScrollPos(wordTop - containerHeight / 3);
    }
  }, [currentWordIndex, isVoiceActive]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: `rgba(0, 0, 0, ${opacity / 100})` }}
    >
      <div className="w-full max-w-md h-full overflow-hidden relative">
        {/* Focus Area Indicator */}
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
