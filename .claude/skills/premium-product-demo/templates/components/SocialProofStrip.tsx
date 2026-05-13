import { motion } from 'framer-motion';

interface Testimonial { id: string; name: string; role: string; quote: string; avatarUrl?: string; }
interface SocialProofStripProps {
  waitlistCount?: number;
  testimonials?: Testimonial[];
  accentColor: string;
  counterLabel?: string;
}

const prefersReduced = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export const SocialProofStrip = ({ waitlistCount, testimonials = [], accentColor, counterLabel = 'families on the waitlist' }: SocialProofStripProps) => (
  <div style={{ padding: '40px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
    {waitlistCount != null && (
      <motion.div
        initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '100px', padding: '12px 24px' }}
      >
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e88' }} />
        <span style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>{waitlistCount.toLocaleString()}</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>{counterLabel}</span>
      </motion.div>
    )}
    {testimonials.length > 0 && (
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {testimonials.map((t, i) => (
          <motion.div key={t.id}
            initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={prefersReduced ? { duration: 0 } : { delay: i * 0.15 }}
            style={{ maxWidth: '320px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}
          >
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.6, marginBottom: '12px', fontStyle: 'italic' }}>"{ t.quote}"</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {t.avatarUrl
                ? <img src={t.avatarUrl} alt={t.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${accentColor}20`, border: `1px solid ${accentColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor, fontSize: '14px', fontWeight: 600 }}>{t.name[0]}</div>
              }
              <div>
                <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{t.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    )}
  </div>
);
