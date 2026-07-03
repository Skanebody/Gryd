/**
 * Home GRYD — landing V2 « war room sportive » (AMENDEMENT-05 §3).
 * Server Component léger : assemble les sections client de app/components/landing/
 * dans l'ordre V2. Metadata SEO : layout.tsx.
 * Ancres : #concept #map #warroom #badges #crews #performance #pricing #waitlist.
 */

import { BackgroundFx } from './components/landing/BackgroundFx';
import { BadgeGallery } from './components/landing/BadgeGallery';
import { GameplayLoop } from './components/landing/Concept';
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
import { WarRoomSection } from './components/landing/WarRoom';

export default function Page() {
  return (
    <LangProvider>
      <ToastProvider>
        <PhoneProvider>
          <BackgroundFx />
          <SiteHeader />
          <main id="top">
            <Hero />
            <GameplayLoop />
            <FranceMapSection />
            <WarRoomSection />
            <RewardSection />
            <BadgeGallery />
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
