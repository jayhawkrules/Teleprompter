import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlassToastProps {
  message: string;
  subtext?: string;
  icon?: string;
  accentColor: string;
  showAfter?: number;
  hideAfter?: number;
}

const prefersReduced = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export const GlassToast = ({ message, subtext, icon = '✓', accentColor, showAfter = 3000, hideAfter = 3000 }: GlassToastProps) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = setTimeout(() => setVisible(true), showAfter);
    const hide = setTimeout(() => setVisible(false), showAfter + hideAfter);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [showAfter, hideAfter]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={prefersReduced ? {} : { y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={prefersReduced ? {} : { y: 60, opacity: 0 }}
          transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'absolute', bottom: '20px', left: '12px', right: '12px',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)',
            borderRadius: '16px', padding: '14px 16px',
            border: `1px solid ${accentColor}40`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}20`,
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: `${accentColor}20`, border: `1px solid ${accentColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', flexShrink: 0,
          }}>{icon}</div>
          <div>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{message}</div>
            {subtext && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{subtext}</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
