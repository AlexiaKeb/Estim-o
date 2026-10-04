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
    <div id="landing-simulator-container" className="w-full max-w-6xl mx-auto space-y-10">
      <LandingHero onStart={handleHeroStart} />

      <section id="simulateur" aria-label="Votre estimation avec l'assistant" className="scroll-mt-20 space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900">Votre estimation, pas à pas</h2>
          <p className="text-stone-600 text-sm sm:text-base">L'assistant vous guide jusqu'à la visite. Quelques clics suffisent.</p>
        </div>
        <GuidedAssistant seed={seed} onLeadCaptured={onLeadCaptured} onOpenBooking={onOpenBooking} onLeadReady={setLeadInfo} />
      </section>

      <div className="space-y-14 pt-2 pb-24 sm:pb-0">
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
