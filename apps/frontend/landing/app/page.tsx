import { Providers } from './providers';
import { Header } from './sections/00-header';
import { PreviewRibbon } from './sections/preview-ribbon';
import { LiveTicker } from '@paxio/ui';
import { Hero } from './sections/01-hero';
import { Quickstart } from './sections/02-quickstart';
import { BitcoinSection } from './sections/02b-bitcoin';
import { Radar } from './sections/03-radar';
import { Pay } from './sections/04-pay';
import { Network } from './sections/05-network';
import { Doors } from './sections/06-doors';
import { Foot } from './sections/07-foot';

export default function LandingPage() {
  return (
    <Providers>
      <Header />
      <PreviewRibbon />
      <main className="min-h-screen bg-[var(--color-bg0)] text-[var(--color-ink0)]">
        <LiveTicker className="sticky top-0 z-40" />
        <Hero />
        <Quickstart />
        <BitcoinSection />
        <Radar />
        <Pay />
        <Network />
        <Doors />
        <Foot />
      </main>
    </Providers>
  );
}