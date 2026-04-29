import type { Metadata } from 'next';
import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from './_components/ThemeProvider';

// M-L10.2 — Editorial display + utility fonts via next/font/google.
// Each font binds a CSS variable (--f-display / --f-sans / --f-mono) so
// globals.css can reference them without a runtime <link> tag.

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--f-display',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--f-sans',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--f-mono',
});

export const metadata: Metadata = {
  title: 'Paxio — Agent Financial OS',
  description:
    'Universal registry, multi-protocol payments, and trust infrastructure for AI agents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontClass = `${fraunces.variable} ${interTight.variable} ${jetBrainsMono.variable}`;
  return (
    <html lang="en" className={fontClass}>
      <body data-production="false" data-motion="live">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}