/**
 * Home GRYD — landing courte (neuro-UX 2026).
 * Hero → boucle → sources → accès → waitlist → FAQ.
 * Ancres : #concept #connect #pricing #waitlist #faq.
 */

import { BackgroundFx } from './components/landing/BackgroundFx';
import { GameplayLoop } from './components/landing/Concept';
import { ConnectGear } from './components/landing/ConnectGear';
import { FaqSection } from './components/landing/FaqSection';
import { Footer } from './components/landing/Footer';
import { Hero } from './components/landing/Hero';
import { LangProvider } from './components/landing/LangProvider';
import { PhoneProvider } from './components/landing/PhoneContext';
import { PricingCompact } from './components/landing/PricingCompact';
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
            <GameplayLoop />
            <ConnectGear />
            <PricingCompact />
            <WaitlistSection />
            <FaqSection />
          </main>
          <Footer />
        </PhoneProvider>
      </ToastProvider>
    </LangProvider>
  );
}
