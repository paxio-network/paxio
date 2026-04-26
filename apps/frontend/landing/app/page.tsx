import { Providers } from './providers';
import { LiveTicker } from '@paxio/ui';
import { Header } from './sections/00-header';
import { PreviewRibbon } from './sections/preview-ribbon';
import { Hero } from './sections/01-hero';
import { Quickstart } from './sections/02-quickstart';
import { BitcoinSection } from './sections/02b-bitcoin';
import { Radar } from './sections/03-radar';
import { Pay } from './sections/04-pay';
import { Network } from './sections/05-network';
import { Doors } from './sections/06-doors';
import { Footer } from './sections/07-foot';

export default function LandingPage() {
  return (
    <Providers>
      <main className="min-h-screen bg-[--color-dark] text-white">
        <PreviewRibbon />
        <Header />
        <LiveTicker className="sticky top-[65px] z-40" />
        <Hero />
        <Quickstart />
        <BitcoinSection />
        <Radar />
        <Pay />
        <Network />
        <Doors />
        <Footer />
      </main>
    </Providers>
  );
}