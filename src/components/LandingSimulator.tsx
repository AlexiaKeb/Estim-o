import React, { useEffect, useState } from 'react';
import { ValuationInputs, ValuationResult, Lead } from '../types';
import { scrollToSimulator, LandingHero, HowItWorks, WhyOnSite, SocialProof, ZoneSection, BlogTeaser, FaqSection, FinalCta, StickyMobileCta } from './LandingSections';
import { GuidedAssistant, AssistantSeed } from './GuidedAssistant';

interface Props {
  onValuationComplete: (inputs: ValuationInputs, result: ValuationResult) => void;
  onOpenChatDirect: () => void;
  onLeadCaptured?: (lead: Lead, replacesId?: string) => void;
  onOpenBooking?: (leadInfo: Partial<Lead>) => void;
}

/**
 * Seller journey: the AI assistant leads the whole conversation (address, property, project, contact,
 * estimate, quick questions, available slots) and hands over to the booking step.
 */
export const LandingSimulator: React.FC<Props> = ({ onLeadCaptured, onOpenBooking }) => {
  const [seed, setSeed] = useState<AssistantSeed | null>(null);
  const [leadInfo, setLeadInfo] = useState<Partial<Lead> | null>(null);

  // Links from the blog (/#simulateur) land directly on the assistant
  useEffect(() => {
    if (window.location.hash === '#simulateur') window.setTimeout(() => document.getElementById('simulateur')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }, []);

  const handleHeroStart = (a: { address: string; postalCode?: string; city?: string }) => {
    setSeed({ ...a, nonce: Date.now() });
    scrollToSimulator();
  };

  return (
    <div id="landing-simulator-container" className="w-full flex flex-col">
      <LandingHero onStart={handleHeroStart} />

      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-[#FFF7E6]">
        <section id="simulateur" aria-label="Votre estimation avec l'assistant" className="mx-auto max-w-6xl scroll-mt-16 space-y-6 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="space-y-2 text-center">
            <h2 className="mx-auto max-w-4xl text-3xl font-black tracking-tight text-[#0B0F1F] [text-wrap:balance] sm:text-5xl">Votre estimation immobilière en Région Lyonnaise &amp; Beaujolais, pas à pas</h2>
            <p className="text-base font-medium text-[#0B0F1F]/80 sm:text-lg">Obtenez une première valeur en 2 minutes, puis planifiez votre rendez-vous avec Céline.</p>
          </div>
          <GuidedAssistant seed={seed} onLeadCaptured={onLeadCaptured} onOpenBooking={onOpenBooking} onLeadReady={setLeadInfo} />
        </section>
      </div>

      <div className="pt-2 pb-0">
        <HowItWorks />
        <WhyOnSite />
        <SocialProof />
        <ZoneSection />
        <BlogTeaser />
        <FaqSection />
        <FinalCta />
      </div>
      <StickyMobileCta
        unlocked={Boolean(leadInfo)}
        onBook={() => onOpenBooking?.(leadInfo || {})}
        priceLabel={
          leadInfo?.valuation
            ? `${leadInfo.valuation.lowPrice.toLocaleString('fr-FR')} – ${leadInfo.valuation.highPrice.toLocaleString('fr-FR')} €`
            : undefined
        }
      />
    </div>
  );
};
