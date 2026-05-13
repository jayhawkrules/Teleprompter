import { useEffect, useRef } from 'react';

interface RouteDrawingProps {
  pathD: string;
  color: string;
  duration?: number;
  delay?: number;
  strokeWidth?: number;
  viewBox?: string;
}

const prefersReduced = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export const RouteDrawing = ({ pathD, color, duration = 2000, delay = 1000, strokeWidth = 3, viewBox = '0 0 280 460' }: RouteDrawingProps) => {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    if (prefersReduced) { path.style.strokeDasharray = 'none'; path.style.strokeDashoffset = '0'; return; }
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
      <path ref={pathRef} d={pathD} stroke={color} strokeWidth={strokeWidth}
        fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
