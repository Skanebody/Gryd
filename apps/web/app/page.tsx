/**
 * Home GRYD — landing de vente interactive (Server Component léger : assemble
 * les sections client de app/components/landing/). Metadata SEO : layout.tsx.
 * Ancres : #concept #map #crews #performance #pricing #waitlist.
 */

import { BackgroundFx } from './components/landing/BackgroundFx';
import { Concept } from './components/landing/Concept';
import { CrewBuilder } from './components/landing/CrewBuilder';
import { FaqSection } from './components/landing/FaqSection';
import { Footer } from './components/landing/Footer';
import { FranceMapSection } from './components/landing/FranceMapSection';
import { Hero } from './components/landing/Hero';
import { LangProvider } from './components/landing/LangProvider';
import { PerformanceSection } from './components/landing/PerformanceSection';
import { PhoneProvider } from './components/landing/PhoneContext';
import { PricingSection } from './components/landing/PricingSection';
import { RewardSection } from './components/landing/RewardSection';
import { SiteHeader } from './components/landing/SiteHeader';
import { ToastProvider } from './components/landing/Toast';
import { WaitlistSection } from './components/landing/WaitlistSection';

export default function Page() {
  return (
    <LangProvider>
      <ToastProvider>
        <PhoneProvider>
          <BackgroundFx />
          <SiteHeader />
          <main id="top">
            <Hero />
            <Concept />
            <FranceMapSection />
            <RewardSection />
            <CrewBuilder />
            <PerformanceSection />
            <PricingSection />
            <WaitlistSection />
            <FaqSection />
          </main>
          <Footer />
        </PhoneProvider>
      </ToastProvider>
    </LangProvider>
  );
}
