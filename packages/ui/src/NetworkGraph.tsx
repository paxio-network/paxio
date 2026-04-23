'use client';
import { useEffect, useRef } from 'react';
import type { NetworkSnapshot, NetworkNode } from '@paxio/types';

interface NetworkGraphProps {
  snapshot: NetworkSnapshot;
  className?: string;
}

function nodeColor(node: NetworkNode): string {
  if (node.bitcoin_native) return '#D97706';
  const r = Math.round((node.volume_usd_5m / 10_000) * 255);
  return `rgb(${Math.min(r, 200)}, ${Math.min(100, r / 2)}, ${Math.min(80, r / 4)})`;
}

function nodeRadius(node: NetworkNode): number {
  return Math.max(4, Math.min(12, 4 + Math.log10(node.volume_usd_5m + 1)));
}

export function NetworkGraph({ snapshot, className }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 800;
  const height = 400;

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const existing = svg.querySelectorAll('[data-nodes], [data-pairs], [data-labels]');
    existing.forEach(el => el.remove());

    const gPairs = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gPairs.setAttribute('data-pairs', '');

    for (const pair of snapshot.pairs) {
      const from = snapshot.nodes.find(n => n.id === pair.from_id);
      const to = snapshot.nodes.find(n => n.id === pair.to_id);
      if (!from || !to) continue;
      const x1 = (from.x_pct / 100) * width;
      const y1 = (from.y_pct / 100) * height;
      const x2 = (to.x_pct / 100) * width;
      const y2 = (to.y_pct / 100) * height;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y2', String(y2));
      line.setAttribute('stroke', '#533483');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-opacity', '0.4');
      gPairs.appendChild(line);
    }
    svg.appendChild(gPairs);

    const gNodes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gNodes.setAttribute('data-nodes', '');

    for (const node of snapshot.nodes) {
      const cx = (node.x_pct / 100) * width;
      const cy = (node.y_pct / 100) * height;
      const r = nodeRadius(node);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(cx));
      circle.setAttribute('cy', String(cy));
      circle.setAttribute('r', String(r));
      circle.setAttribute('fill', nodeColor(node));
      circle.setAttribute('opacity', '0.85');
      circle.setAttribute('class', 'cursor-pointer');
      gNodes.appendChild(circle);
    }
    svg.appendChild(gNodes);

    const gLabels = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gLabels.setAttribute('data-labels', '');
    gLabels.setAttribute('font-size', '9');
    gLabels.setAttribute('font-family', 'JetBrains Mono, monospace');
    gLabels.setAttribute('fill', 'rgba(255,255,255,0.4)');

    for (const node of snapshot.nodes) {
      const cx = (node.x_pct / 100) * width;
      const cy = (node.y_pct / 100) * height;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(cx));
      text.setAttribute('y', String(cy + nodeRadius(node) + 10));
      text.setAttribute('text-anchor', 'middle');
      text.textContent = node.name.length > 14 ? node.name.slice(0, 12) + '…' : node.name;
      gLabels.appendChild(text);
    }
    svg.appendChild(gLabels);
  }, [snapshot]);

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto rounded-lg bg-black/40 border border-white/10"
        aria-label="Agent network graph"
      />
      <p className="text-xs font-mono text-white/30 text-center mt-2">
        {snapshot.nodes.length} agents · {snapshot.pairs.length} connections · {snapshot.generated_at}
      </p>
    </div>
  );
}