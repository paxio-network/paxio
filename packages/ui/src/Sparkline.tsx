'use client';
import { useRef } from 'react';
import { computeSparkline } from './sparkline-utils';

interface SparklineProps {
  seed?: number;
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({ seed = 42, width = 120, height = 32, color = '#533483', className }: SparklineProps) {
  const pathRef = useRef<SVGPathElement>(null!);

  const d = computeSparkline(seed, width, height);

  // Area fill — extend curve down to baseline and close the shape.
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
