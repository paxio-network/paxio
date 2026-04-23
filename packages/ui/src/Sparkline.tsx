'use client';
import { useRef } from 'react';

interface SparklineProps {
  seed?: number;
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

// Deterministic pseudo-random from seed — no Math.random() leaks in render
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function Sparkline({ seed = 42, width = 120, height = 32, color = '#533483', className }: SparklineProps) {
  const pathRef = useRef<SVGPathElement>(null!);
  const rand = seededRandom(seed);

  const pts: [number, number][] = Array.from({ length: 24 }, (_, i) => [
    (i / 23) * width,
    height - rand() * height * 0.7 - height * 0.15,
  ]);

  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
    const [px, py] = pts[i - 1];
    const cpX = (px + x) / 2;
    return `${acc} C${cpX.toFixed(1)},${py.toFixed(1)} ${cpX.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
  }, '');

  // Area fill
  const area = `${d} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`sg-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${seed})`} />
      <path ref={pathRef} d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}