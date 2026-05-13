---
name: premium-product-demo
description: |
  Use when building or improving a hero section, phone mockup, interactive product demo, 
  app walkthrough, social launch visual, or any marketing-facing demo for any app in the 
  Andrew Ward / Toronado Entertainment portfolio. Generates premium dark-glass UI components 
  with orchestrated animations, staggered reveals, SVG route drawing, toast notifications, 
  and bento-grid feature layouts — all wired to the app's own design tokens.
triggers:
  - "add a phone mockup"
  - "build a hero section"
  - "make an interactive demo"
  - "create a product walkthrough"
  - "add a feature showcase"
  - "build a landing page section"
  - "animate the app"
  - "make pins appear"
  - "draw the route"
  - "social launch visual"
  - "investor demo"
  - "app store preview"
stacks:
  - React + TypeScript + Vite + Tailwind CSS
  - Framer Motion (primary animation engine)
  - GSAP with useGSAP (complex timeline sequences)
  - CSS custom properties for design tokens
author: Andrew Ward (jayhawkrules)
version: 1.0.0
---

# Premium Product Demo Skill

This skill produces production-ready, conversion-optimised demo components for the Andrew Ward app portfolio. Every output must feel premium, purposeful, and channel-appropriate.

---

## 1. Design Principles

### The 3-Second Rule
Every demo must communicate its core value within 3 seconds. If a user cannot understand what the app does from the first viewport within 3 seconds, the demo has failed.

### Motion Must Earn Its Place
Every animation must either:
- Communicate a product feature (e.g. pins appearing = real-time updates)
- Guide the eye toward the CTA
- Reduce perceived complexity (e.g. route drawing = one tap away)

Never animate purely for decoration.

### Real > Generic
Always prefer:
- Real app screenshots over placeholder mockups
- Real copy from the app over lorem ipsum
- Real brand colours from the app's token system
- Real user scenarios over invented ones

### Conversion Intent
Every demo component must include or connect to a CTA. Demos without a clear next action are incomplete.

---

## 2. App Prefix Map

All CSS class names must use the app-specific prefix to avoid collisions:

| App | Prefix | Primary Accent | Dark BG |
|-----|--------|---------------|---------|
| Noelly (holiday lights) | `nl-` | `#F59E0B` (amber) | `#0a0f1e` |
| Mythie / CastHub | `ch-` | `#7C3AED` (violet) | `#0d0d1a` |
| Teleprompter | `tp-` | `#10B981` (emerald) | `#0a1a12` |
| Run of Show | `rs-` | `#EF4444` (red) | `#1a0a0a` |
| Awards / ARTAS | `aw-` | `#D97706` (gold) | `#12100a` |
| Producing Hollywood | `ph-` | `#3B82F6` (blue) | `#0a0f1a` |
| The Production Shelf | `ps-` | `#8B5CF6` (purple) | `#0d0a1a` |

When a new app is built, extend this table. Never reuse another app's prefix.

---

## 3. Core Component Patterns

### 3.1 Dark Glass Phone Mockup

```tsx
// PhoneMockup.tsx — drop into any app, swap the prefix
import { motion } from 'framer-motion';

interface PhoneMockupProps {
  prefix: string;            // e.g. 'nl' for Noelly
  accentColor: string;       // e.g. '#F59E0B'
  children: React.ReactNode; // app screen content
  className?: string;
}

export const PhoneMockup = ({ prefix, accentColor, children, className }: PhoneMockupProps) => (
  <motion.div
    className={`${prefix}-phone ${className ?? ''}`}
    initial={{ opacity: 0, y: 40, rotateX: 8 }}
    animate={{ opacity: 1, y: 0, rotateX: 0 }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    style={{ perspective: '1200px' }}
  >
    {/* Outer shell */}
    <div style={{
      width: '280px',
      height: '560px',
      borderRadius: '40px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px ${accentColor}22`,
      backdropFilter: 'blur(20px)',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Inset top-edge highlight */}
      <div style={{
        position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      }} />
      {/* Dynamic island */}
      <div style={{
        width: '80px', height: '28px', background: '#000',
        borderRadius: '20px', margin: '0 auto 12px',
      }} />
      {/* Screen content */}
      <div style={{
        width: '100%', height: '460px', borderRadius: '28px',
        background: 'rgba(255,255,255,0.03)', overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  </motion.div>
);
```

### 3.2 Staggered Pin Reveal

```tsx
// StaggeredPins.tsx — pins appear one-by-one
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Pin { id: string; label: string; top: string; left: string; color?: string; }

interface StaggeredPinsProps {
  pins: Pin[];
  accentColor: string;
  delayBetween?: number; // ms between each pin (default 600)
  initialDelay?: number; // ms before first pin (default 800)
}

export const StaggeredPins = ({ pins, accentColor, delayBetween = 600, initialDelay = 800 }: StaggeredPinsProps) => {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= pins.length) return;
    const delay = visibleCount === 0 ? initialDelay : delayBetween;
    const timer = setTimeout(() => setVisibleCount(c => c + 1), delay);
    return () => clearTimeout(timer);
  }, [visibleCount, pins.length, delayBetween, initialDelay]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <AnimatePresence>
        {pins.slice(0, visibleCount).map(pin => (
          <motion.div
            key={pin.id}
            style={{ position: 'absolute', top: pin.top, left: pin.left }}
            initial={{ scale: 0, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50% 50% 50% 0',
              background: pin.color ?? accentColor,
              transform: 'rotate(-45deg)',
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: `0 4px 12px ${pin.color ?? accentColor}66`,
            }} />
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                position: 'absolute', top: '-28px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(8px)',
                padding: '4px 8px', borderRadius: '8px',
                fontSize: '11px', color: '#fff', whiteSpace: 'nowrap',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {pin.label}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
```

### 3.3 SVG Route Drawing

```tsx
// RouteDrawing.tsx — path draws itself with stroke-dashoffset
import { useEffect, useRef } from 'react';

interface RouteDrawingProps {
  pathD: string;       // SVG path data
  color: string;       // route line color
  duration?: number;   // animation duration in ms (default 2000)
  delay?: number;      // delay before drawing starts (default 1000)
  viewBox?: string;
}

export const RouteDrawing = ({ pathD, color, duration = 2000, delay = 1000, viewBox = '0 0 280 460' }: RouteDrawingProps) => {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    const timer = setTimeout(() => {
      path.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      path.style.strokeDashoffset = '0';
    }, delay);

    return () => clearTimeout(timer);
  }, [duration, delay]);

  return (
    <svg viewBox={viewBox} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <path
        ref={pathRef}
        d={pathD}
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
```

### 3.4 Glassmorphism Toast Notification

```tsx
// GlassToast.tsx — slide-up notification on a timer
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlassToastProps {
  message: string;
  subtext?: string;
  icon?: string;       // emoji or text icon
  accentColor: string;
  showAfter?: number;  // ms delay before appearing (default 3000)
  hideAfter?: number;  // ms to stay visible (default 3000)
}

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
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'absolute', bottom: '20px', left: '12px', right: '12px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '14px 16px',
            border: `1px solid ${accentColor}40`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}20`,
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: `${accentColor}20`,
            border: `1px solid ${accentColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', flexShrink: 0,
          }}>
            {icon}
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{message}</div>
            {subtext && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{subtext}</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

### 3.5 Bento Grid Feature Layout

```tsx
// BentoGrid.tsx — responsive feature showcase
import { motion } from 'framer-motion';

interface BentoItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  size: 'small' | 'medium' | 'large'; // controls grid-column span
  accentColor?: string;
}

interface BentoGridProps {
  items: BentoItem[];
  defaultAccent: string;
}

export const BentoGrid = ({ items, defaultAccent }: BentoGridProps) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    padding: '24px',
  }}>
    {items.map((item, i) => (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        style={{
          gridColumn: item.size === 'large' ? 'span 2' : item.size === 'medium' ? 'span 1' : 'span 1',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '24px',
          cursor: 'default',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top-edge highlight */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        }} />
        <div style={{ fontSize: '28px', marginBottom: '12px' }}>{item.icon}</div>
        <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>{item.title}</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.5 }}>{item.description}</p>
        {/* Accent glow */}
        <div style={{
          position: 'absolute', bottom: '-20px', right: '-20px',
          width: '80px', height: '80px', borderRadius: '50%',
          background: `${item.accentColor ?? defaultAccent}15`,
          filter: 'blur(20px)',
        }} />
      </motion.div>
    ))}
  </div>
);
```

### 3.6 Hero Section (Text Left / Phone Right)

```tsx
// HeroSection.tsx — full-width hero with phone mockup
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
}

export const HeroSection = ({
  prefix, appName, headline, subheadline, ctaLabel,
  onCtaClick, accentColor, darkBg, phoneContent
}: HeroSectionProps) => (
  <section style={{
    minHeight: '100vh',
    background: darkBg,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    alignItems: 'center',
    padding: '0 80px',
    gap: '60px',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {/* Aurora background blobs */}
    <div style={{
      position: 'absolute', top: '-20%', left: '-10%',
      width: '600px', height: '600px', borderRadius: '50%',
      background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
      filter: 'blur(60px)', pointerEvents: 'none',
    }} />
    <div style={{
      position: 'absolute', bottom: '-20%', right: '-10%',
      width: '500px', height: '500px', borderRadius: '50%',
      background: `radial-gradient(circle, ${accentColor}10 0%, transparent 70%)`,
      filter: 'blur(80px)', pointerEvents: 'none',
    }} />

    {/* Left: Copy */}
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{
        display: 'inline-block',
        background: `${accentColor}20`,
        border: `1px solid ${accentColor}40`,
        padding: '6px 16px', borderRadius: '100px',
        color: accentColor, fontSize: '13px', fontWeight: 600,
        marginBottom: '24px',
      }}>
        {appName}
      </div>
      <h1 style={{
        color: '#fff', fontSize: 'clamp(36px, 5vw, 64px)',
        fontWeight: 800, lineHeight: 1.1, marginBottom: '20px',
      }}>
        {headline}
      </h1>
      <p style={{
        color: 'rgba(255,255,255,0.6)', fontSize: '18px',
        lineHeight: 1.6, marginBottom: '40px', maxWidth: '420px',
      }}>
        {subheadline}
      </p>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={onCtaClick}
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          color: '#000', border: 'none', borderRadius: '14px',
          padding: '16px 36px', fontSize: '16px', fontWeight: 700,
          cursor: 'pointer',
          boxShadow: `0 8px 32px ${accentColor}40`,
        }}
      >
        {ctaLabel}
      </motion.button>
    </motion.div>

    {/* Right: Phone */}
    <motion.div
      style={{ display: 'flex', justifyContent: 'center' }}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <PhoneMockup prefix={prefix} accentColor={accentColor}>
        {phoneContent}
      </PhoneMockup>
    </motion.div>
  </section>
);
```

---

## 4. Demo Quality Rubric (100 points)

Before shipping any demo component, score it against this rubric. Target 80+.

| Dimension | Max Points | Criteria |
|-----------|-----------|----------|
| First-3-seconds clarity | 20 | Can a new visitor understand the app's value in 3 seconds? |
| Authentic assets | 15 | Uses real screenshots, real copy, real brand colours — not placeholders |
| Motion purpose | 15 | Every animation communicates a feature or guides the eye |
| CTA visibility | 15 | CTA is above the fold, visually prominent, action-oriented copy |
| Responsiveness | 10 | Works on mobile (375px) without horizontal scroll |
| Accessibility | 10 | `prefers-reduced-motion` respected; contrast ratio ≥ 4.5:1 |
| Performance | 10 | Only `transform` and `opacity` animated; `will-change` used sparingly |
| Export readiness | 5 | Component can be passed to `video-export-remotion` skill if needed |

---

## 5. Channel Output Modes

When asked to generate a demo, ask or infer which channel(s) are needed:

| Channel | Key Constraints |
|---------|---------------|
| **Landing page hero** | Above fold, CTA required, aurora blobs allowed, atmospheric |
| **App Store preview** | 30s max, real app footage only, no device frame in-video, portrait preferred, no prices |
| **Social promo (TikTok/Reels)** | 9:16, first 3 seconds must hook, captions required (auto-muted), 15–30s |
| **Investor demo** | Proof points + product narrative, professional pacing, no gimmicks |
| **Interactive walkthrough** | 10–15 steps, above fold CTA visible, ungated preferred for top of funnel |

---

## 6. Accessibility Requirements

All demo components MUST:

```css
@media (prefers-reduced-motion: reduce) {
  .nl-phone, .ch-phone, .tp-phone, .rs-phone, .aw-phone, .ph-phone, .ps-phone,
  [class*="-phone"] * {
    animation: none !important;
    transition: opacity 0.3s ease !important;
    transform: none !important;
  }
}
```

In React/Framer Motion, check before animating:

```tsx
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const transition = prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 };
```

---

## 7. Performance Rules

- Only animate `transform` and `opacity` — never `width`, `height`, `top`, `left`, `margin`
- Add `will-change: transform` only when animation is about to start; remove after
- Limit simultaneous animations to 5 or fewer elements at once
- Use `viewport={{ once: true }}` on scroll-triggered Framer Motion animations
- Test on a throttled mobile device before shipping

---

## 8. Porting to a New App

When asked to port a demo to a different app:

1. Replace the CSS prefix (`nl-` → `ch-`, etc.) throughout
2. Swap `accentColor` and `darkBg` to the target app's tokens (see prefix map above)
3. Update `phoneContent` with real screenshots or UI from the target app
4. Update all copy to match the target app's value proposition
5. Check the asset manifest (see `asset-aware-creative-pipeline` skill) for approved imagery

---

## 9. Integration With Other Skills

- **`asset-aware-creative-pipeline`** — always check for an `asset-manifest.json` before generating placeholder content. If real assets exist, use them.
- **`video-export-remotion`** — any component built with this skill can be passed to the Remotion export skill to generate MP4 for App Store previews or social promos.
- **`feature-scaffold`** — if the demo requires a new route or page, invoke `feature-scaffold` first to scaffold the full stack layer.
