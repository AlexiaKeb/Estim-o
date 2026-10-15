import React, { useEffect, useState } from 'react';
import { ValuationInputs, ValuationResult, Lead } from '../types';
import { scrollToSimulator, SocialProof, StickyMobileCta } from './LandingSections';
import { StartupHero, TrustMarquee, HowBento, AiVsHuman, MeetAgent, ZoneBento, BlogCards, FaqModern, FinalCtaModern } from './LandingStartup';
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
    <div id="landing-simulator-container" className="w-full max-w-6xl mx-auto flex flex-col gap-16 sm:gap-24">
      <StartupHero onStart={handleHeroStart} />
      <TrustMarquee />

      <section id="simulateur" aria-label="Votre estimation avec l'assistant" className="scroll-mt-20 space-y-5 -mt-6 sm:-mt-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0b1020] [text-wrap:balance]">Votre estimation, pas à pas</h2>
          <p className="text-slate-600 text-base sm:text-lg">Une première valeur en 2 minutes, puis un rendez-vous avec Céline si vous le souhaitez.</p>
        </div>
        <GuidedAssistant seed={seed} onLeadCaptured={onLeadCaptured} onOpenBooking={onOpenBooking} onLeadReady={setLeadInfo} />
      </section>

      <HowBento />
      <AiVsHuman />
      <MeetAgent />
      <SocialProof />
      <ZoneBento />
      <BlogCards />
      <FaqModern />
      <FinalCtaModern />
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
