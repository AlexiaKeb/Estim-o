import React, { useEffect, useRef, useState } from 'react';
import { ValuationInputs, ValuationResult, Lead } from '../types';
import { OPEN_ASSISTANT_EVENT, LandingHero, HowItWorks, WhyOnSite, SocialProof, ZoneSection, BlogTeaser, FaqSection, FinalCta, StickyMobileCta } from './LandingSections';
import { Robot } from './Mascots';
import { GuidedAssistant, AssistantSeed, clearAssistantDraft } from './GuidedAssistant';

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

  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const leadRef = useRef<Partial<Lead> | null>(null);
  leadRef.current = leadInfo;

  // Opening the pop-up after a finished estimate starts a brand-new one
  const openFresh = () => {
    if (leadRef.current) {
      clearAssistantDraft();
      setLeadInfo(null);
      setSession((n) => n + 1);
    }
    setOpen(true);
  };

  // Opened by every CTA (event) and by blog links (/#simulateur)
  useEffect(() => {
    const show = () => { if (!open) openFresh(); };
    const onHash = () => { if (window.location.hash === '#simulateur') show(); };
    window.addEventListener(OPEN_ASSISTANT_EVENT, show);
    window.addEventListener('hashchange', onHash);
    onHash();
    // Ads landing page: /estimation opens the assistant straight away
    if (window.location.pathname.replace(/\/+$/, '').toLowerCase() === '/estimation') show();
    return () => { window.removeEventListener(OPEN_ASSISTANT_EVENT, show); window.removeEventListener('hashchange', onHash); };
  }, [open]);

  // Scroll lock + Escape while the pop-up is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const prevOverscroll = document.documentElement.style.overscrollBehaviorY;
    document.documentElement.style.overscrollBehaviorY = 'contain';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); document.documentElement.style.overscrollBehaviorY = prevOverscroll; };
  }, [open]);

  const close = () => {
    setOpen(false);
    if (window.location.pathname.replace(/\/+$/, '').toLowerCase() === '/estimation') history.replaceState(null, '', '/' + window.location.search);
    if (window.location.hash === '#simulateur') history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  const handleHeroStart = (a: { address: string; postalCode?: string; city?: string }) => {
    if (!open) openFresh();
    setSeed({ ...a, nonce: Date.now() });
  };

  return (
    <div id="landing-simulator-container" className="w-full flex flex-col">
      <LandingHero onStart={handleHeroStart} />

      {/* Pop-up: always mounted so a conversation in progress survives closing */}
      <div
        id="simulateur"
        role="dialog"
        aria-modal="true"
        aria-label="Votre estimation avec l'assistant"
        className={`${open ? 'flex' : 'hidden'} fixed inset-0 z-[44] items-stretch justify-center overflow-y-auto bg-[#0B0F1F]/70 p-0 overscroll-contain sm:items-center sm:p-6`}
        onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        <div className="relative my-auto flex min-h-[100dvh] w-full max-w-4xl flex-col gap-4 bg-[#FFF7E6] px-4 pb-4 pt-[4rem] sm:min-h-0 sm:rounded-3xl sm:border-[3px] sm:border-[#0B0F1F] sm:px-8 sm:pb-8 sm:pt-8 sm:shadow-[8px_8px_0_#0B0F1F]">
          <button type="button" onClick={close} aria-label="Fermer" id="btn-close-assistant" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#0B0F1F] bg-[#FFD60A] text-xl font-black leading-none text-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F]">×</button>
          <div className="pointer-events-none absolute left-3 top-2 z-10 flex items-start gap-2 sm:left-5 sm:top-4" aria-hidden="true">
            <Robot className="bob h-16 w-12 sm:h-24 sm:w-[4.5rem]" />
            <span className="bubble relative mt-1 hidden rounded-2xl border-[3px] border-[#0B0F1F] bg-white px-3 py-1.5 text-xs font-extrabold text-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F] lg:block">
              Je vous guide !
              <span className="absolute -left-[9px] top-3 h-3.5 w-3.5 rotate-45 border-b-[3px] border-l-[3px] border-[#0B0F1F] bg-white" />
            </span>
          </div>
          <div className="space-y-2 text-center sm:px-10 lg:px-44">
            <h2 className="text-lg font-black leading-tight tracking-tight text-[#0B0F1F] [text-wrap:balance] sm:text-3xl">Votre estimation immobilière en Région Lyonnaise &amp; Beaujolais, pas à pas</h2>
            <p className="hidden text-sm font-medium text-[#0B0F1F]/80 sm:block sm:text-base">Obtenez une première valeur en 2 minutes, puis planifiez votre rendez-vous avec Céline.</p>
          </div>
          <GuidedAssistant key={session} seed={seed} onLeadCaptured={onLeadCaptured} onOpenBooking={(l) => { onOpenBooking?.(l); }} onLeadReady={setLeadInfo} />
        </div>
      </div>

      <div className="pt-2 pb-0">
        <HowItWorks onStart={handleHeroStart} />
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
