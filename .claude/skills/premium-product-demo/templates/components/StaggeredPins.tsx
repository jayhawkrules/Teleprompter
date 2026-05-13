import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Pin { id: string; label: string; top: string; left: string; color?: string; }
interface StaggeredPinsProps {
  pins: Pin[];
  accentColor: string;
  delayBetween?: number;
  initialDelay?: number;
}

const prefersReduced = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export const StaggeredPins = ({ pins, accentColor, delayBetween = 600, initialDelay = 800 }: StaggeredPinsProps) => {
  const [visibleCount, setVisibleCount] = useState(prefersReduced ? pins.length : 0);

  useEffect(() => {
    if (prefersReduced || visibleCount >= pins.length) return;
    const delay = visibleCount === 0 ? initialDelay : delayBetween;
    const timer = setTimeout(() => setVisibleCount(c => c + 1), delay);
    return () => clearTimeout(timer);
  }, [visibleCount, pins.length, delayBetween, initialDelay]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <AnimatePresence>
        {pins.slice(0, visibleCount).map(pin => (
          <motion.div key={pin.id} style={{ position: 'absolute', top: pin.top, left: pin.left }}
            initial={prefersReduced ? {} : { scale: 0, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 20 }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50% 50% 50% 0',
              background: pin.color ?? accentColor, transform: 'rotate(-45deg)',
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: `0 4px 12px ${pin.color ?? accentColor}66`,
            }} />
            <motion.div
              initial={prefersReduced ? {} : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReduced ? { duration: 0 } : { delay: 0.2 }}
              style={{
                position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                padding: '4px 8px', borderRadius: '8px',
                fontSize: '11px', color: '#fff', whiteSpace: 'nowrap',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >{pin.label}</motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
