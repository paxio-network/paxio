import { Header, Footer, PreviewRibbon } from '@paxio/ui';
import { HeroB5 } from './sections/01-hero-b5';
import { ScrollsB5 } from './sections/02-scrolls-b5';

export default function Page() {
  return (
    <>
      <Header />
      <PreviewRibbon />
      <main>
        <HeroB5 />
        <ScrollsB5 />
      </main>
      <Footer year={2026} />
    </>
  );
}