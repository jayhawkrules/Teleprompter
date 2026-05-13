import { motion } from 'framer-motion';
import { PhoneMockup } from './PhoneMockup';

interface HeroSectionProps {
  prefix: string;
  appName: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  onCtaClick: () => void;
  accentColor: string;
  darkBg: string;
  phoneContent: React.ReactNode;
  badgeText?: string;
}

const prefersReduced = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export const HeroSection = ({ prefix, appName, headline, subheadline, ctaLabel, onCtaClick, accentColor, darkBg, phoneContent, badgeText }: HeroSectionProps) => (
  <section style={{ minHeight: '100vh', background: darkBg, display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '0 80px', gap: '60px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`, filter: 'blur(60px)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}10 0%, transparent 70%)`, filter: 'blur(80px)', pointerEvents: 'none' }} />
    <motion.div
      initial={prefersReduced ? {} : { opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{ display: 'inline-block', background: `${accentColor}20`, border: `1px solid ${accentColor}40`, padding: '6px 16px', borderRadius: '100px', color: accentColor, fontSize: '13px', fontWeight: 600, marginBottom: '24px' }}>{badgeText ?? appName}</div>
      <h1 style={{ color: '#fff', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.1, marginBottom: '20px' }}>{headline}</h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px', lineHeight: 1.6, marginBottom: '40px', maxWidth: '420px' }}>{subheadline}</p>
      <motion.button
        whileHover={prefersReduced ? {} : { scale: 1.04 }}
        whileTap={prefersReduced ? {} : { scale: 0.97 }}
        onClick={onCtaClick}
        style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#000', border: 'none', borderRadius: '14px', padding: '16px 36px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: `0 8px 32px ${accentColor}40` }}
      >{ctaLabel}</motion.button>
    </motion.div>
    <motion.div style={{ display: 'flex', justifyContent: 'center' }}
      initial={prefersReduced ? {} : { opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <PhoneMockup prefix={prefix} accentColor={accentColor}>{phoneContent}</PhoneMockup>
    </motion.div>
  </section>
);
