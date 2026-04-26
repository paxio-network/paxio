import { Providers } from './providers';
import { LiveTicker } from '@paxio/ui';
import { Hero } from './sections/01-hero';
import { Quickstart } from './sections/02-quickstart';
import { BitcoinSection } from './sections/02b-bitcoin';
import { Radar } from './sections/03-radar';
import { Pay } from './sections/04-pay';
import { Network } from './sections/05-network';
import { Doors } from './sections/06-doors';
import { Footer } from '@paxio/ui';

export default function LandingPage() {
  return (
    <Providers>
      <main className="min-h-screen bg-[--color-dark] text-white">
        <LiveTicker className="sticky top-0 z-50" />
        <Hero />
        <Quickstart />
        <BitcoinSection />
        <Radar />
        <Pay />
        <Network />
        <Doors />
        <Footer dark />
      </main>
    </Providers>
  );
}