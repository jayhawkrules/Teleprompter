import { motion } from 'framer-motion';

interface PhoneMockupProps {
  prefix: string;
  accentColor: string;
  children: React.ReactNode;
  className?: string;
  scale?: number;
}

const prefersReduced = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export const PhoneMockup = ({ prefix, accentColor, children, className, scale = 1 }: PhoneMockupProps) => (
  <motion.div
    className={`${prefix}-phone ${className ?? ''}`}
    initial={prefersReduced ? {} : { opacity: 0, y: 40, rotateX: 8 }}
    animate={{ opacity: 1, y: 0, rotateX: 0 }}
    transition={prefersReduced ? { duration: 0 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    style={{ perspective: '1200px', transform: `scale(${scale})` }}
  >
    <div style={{
      width: '280px', height: '560px', borderRadius: '40px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px ${accentColor}22`,
      backdropFilter: 'blur(20px)', padding: '16px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      }} />
      <div style={{ width: '80px', height: '28px', background: '#000', borderRadius: '20px', margin: '0 auto 12px' }} />
      <div style={{ width: '100%', height: '460px', borderRadius: '28px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  </motion.div>
);
