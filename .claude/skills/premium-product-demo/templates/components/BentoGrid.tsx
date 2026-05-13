import { motion } from 'framer-motion';

interface BentoItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  size: 'small' | 'medium' | 'large';
  accentColor?: string;
}
interface BentoGridProps { items: BentoItem[]; defaultAccent: string; }

const prefersReduced = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export const BentoGrid = ({ items, defaultAccent }: BentoGridProps) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '24px' }}>
    {items.map((item, i) => (
      <motion.div key={item.id}
        initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={prefersReduced ? { duration: 0 } : { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        whileHover={prefersReduced ? {} : { y: -4, transition: { duration: 0.2 } }}
        style={{
          gridColumn: item.size === 'large' ? 'span 2' : 'span 1',
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px',
          padding: '24px', position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
        <div style={{ fontSize: '28px', marginBottom: '12px' }}>{item.icon}</div>
        <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>{item.title}</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.5 }}>{item.description}</p>
        <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: `${item.accentColor ?? defaultAccent}15`, filter: 'blur(20px)' }} />
      </motion.div>
    ))}
  </div>
);
