'use client';
import { useEffect, useRef, useState } from 'react';

interface TerminalWidgetProps {
  title?: string;
  lines?: string[];
  className?: string;
}

export function TerminalWidget({ title = 'paxio-fap', lines = [], className }: TerminalWidgetProps) {
  const [displayLines] = useState<string[]>(lines.slice(0, 6));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayLines]);

  return (
    <div className={`rounded-lg border border-white/10 bg-black/90 overflow-hidden font-mono text-xs ${className}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-white/5">
        <span className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </span>
        {title && <span className="text-white/40 ml-2">{title}</span>}
      </div>
      <div ref={scrollRef} className="p-3 space-y-0.5 max-h-40 overflow-y-auto">
        {displayLines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-white/20 shrink-0 select-none">&gt;</span>
            <span className="text-[#a3e635]">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}