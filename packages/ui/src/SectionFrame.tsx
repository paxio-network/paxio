import type { ReactNode } from 'react';

interface SectionFrameProps {
  id?: string;
  label?: string;
  eyebrow?: string;
  children: ReactNode;
  dark?: boolean;
}

export function SectionFrame({ id, label, eyebrow, children, dark = false }: SectionFrameProps) {
  return (
    <section
      id={id}
      className={`relative px-6 py-20 lg:px-16 ${dark ? 'bg-[--color-dark]' : 'bg-[--color-bg]'}`}
      data-section={label}
    >
      {label && (
        <div className="absolute top-0 left-0 right-0 flex items-center gap-3 px-6 lg:px-16">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[--color-primary]/20 to-transparent" />
          <span className="text-xs font-mono text-[--color-primary]/40 uppercase tracking-widest shrink-0">{label}</span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[--color-primary]/20 to-transparent" />
        </div>
      )}
      {eyebrow && <p className="text-sm font-mono text-[--color-accent] mb-3 tracking-widest uppercase">{eyebrow}</p>}
      {children}
    </section>
  );
}