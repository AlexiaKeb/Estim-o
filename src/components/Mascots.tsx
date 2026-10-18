import React from 'react';
import { AGENT } from '../data/siteContent';

// Univers « robot × humain » : aplats francs, contours épais, aucun dégradé.
// Palette unique : bleu #2B4BFF, jaune #FFD60A, encre #0B0F1F, crème #FFF7E6.
const BLUE = '#2B4BFF';
const YELLOW = '#FFD60A';
const INK = '#0B0F1F';
const CREAM = '#FFF7E6';

/** Le robot (l'IA) : il cligne des yeux, salue et sa balise oscille. */
export const Robot: React.FC<{ className?: string; waving?: boolean }> = ({ className = '', waving = true }) => (
  <svg viewBox="0 0 200 250" className={className} role="img" aria-label="Robot assistant (IA)" xmlns="http://www.w3.org/2000/svg">
    <g className="robot-antenna" style={{ transformOrigin: '100px 46px' }}>
      <line x1="100" y1="46" x2="100" y2="22" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <circle cx="100" cy="16" r="11" fill={YELLOW} stroke={INK} strokeWidth="5" />
    </g>
    <rect x="22" y="76" width="20" height="38" rx="9" fill={YELLOW} stroke={INK} strokeWidth="5" />
    <rect x="158" y="76" width="20" height="38" rx="9" fill={YELLOW} stroke={INK} strokeWidth="5" />
    <rect x="40" y="46" width="120" height="98" rx="28" fill={BLUE} stroke={INK} strokeWidth="6" />
    <rect x="58" y="64" width="84" height="58" rx="18" fill={INK} />
    <g className="robot-eyes" style={{ transformOrigin: '100px 92px' }}>
      <rect x="73" y="80" width="17" height="22" rx="8" fill={YELLOW} />
      <rect x="110" y="80" width="17" height="22" rx="8" fill={YELLOW} />
    </g>
    <path d="M86 110 Q100 119 114 110" fill="none" stroke={YELLOW} strokeWidth="5" strokeLinecap="round" />
    <rect x="56" y="154" width="88" height="72" rx="22" fill={BLUE} stroke={INK} strokeWidth="6" />
    <circle cx="100" cy="190" r="13" fill={YELLOW} stroke={INK} strokeWidth="4" className="robot-pulse" style={{ transformOrigin: '100px 190px' }} />
    <rect x="22" y="164" width="34" height="16" rx="8" fill={YELLOW} stroke={INK} strokeWidth="5" />
    <g className={waving ? 'robot-wave' : ''} style={{ transformOrigin: '148px 172px' }}>
      <rect x="144" y="164" width="34" height="16" rx="8" fill={YELLOW} stroke={INK} strokeWidth="5" />
    </g>
    <rect x="70" y="226" width="22" height="16" rx="6" fill={INK} />
    <rect x="108" y="226" width="22" height="16" rx="6" fill={INK} />
  </svg>
);

/** L'humaine (Céline) : sa photo en grand, éclaircie, dans un cadre franc. */
export const Human: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative ${className}`} style={{ aspectRatio: '200 / 250' }}>
    <svg viewBox="0 0 200 250" className="absolute inset-0 h-full w-full" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 250 Q24 160 100 160 Q176 160 176 250 Z" fill={YELLOW} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M78 160 L100 196 L122 160" fill={CREAM} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    </svg>
    {AGENT.photoUrl ? (
      <div className="absolute left-1/2 top-[2%] aspect-square w-[74%] -translate-x-1/2 overflow-hidden rounded-full border-[6px] border-[#0B0F1F] bg-[#FFD60A]">
        <img src={AGENT.photoUrl} alt={`${AGENT.name}, conseillère immobilière`} width={480} height={480} className="h-full w-full object-cover" style={{ transformOrigin: '57% 32%', transform: 'translate(-7%, 18%) scale(2.5)', filter: 'brightness(1.3) contrast(1.08)' }} />
      </div>
    ) : (
      <div className="absolute left-1/2 top-[2%] flex aspect-square w-[74%] -translate-x-1/2 items-center justify-center rounded-full border-[6px] border-[#0B0F1F] bg-[#FFD60A] text-5xl font-black text-[#0B0F1F]">{AGENT.firstName[0]}</div>
    )}
  </div>
);

/** Visage de Céline en pastille ronde (photo recadrée sur le visage, éclaircie). */
export const CelineFace: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#0B0F1F] bg-[#FFD60A] font-black text-[#0B0F1F] ${className}`}>
    {AGENT.photoUrl ? (
      <img src={AGENT.photoUrl} alt={`${AGENT.name}, conseillère immobilière`} width={96} height={96} className="h-full w-full object-cover" style={{ transformOrigin: '57% 32%', transform: 'translate(-7%, 18%) scale(2.5)', filter: 'brightness(1.3) contrast(1.08)' }} />
    ) : (
      AGENT.firstName[0]
    )}
  </span>
);

/** Étincelle qui pétille quand l'IA et l'humaine se rejoignent. */
export const Spark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 60 60" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 2 L36 24 L58 30 L36 36 L30 58 L24 36 L2 30 L24 24 Z" fill={YELLOW} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
  </svg>
);

/** Duo robot + humaine, avec leurs bulles. */
export const Duo: React.FC<{ robotText?: string; humanText?: string; className?: string }> = ({ robotText, humanText, className = '' }) => (
  <div className={`relative mx-auto grid w-full max-w-2xl grid-cols-[0.8fr_1.2fr] items-end gap-3 ${className}`}>
    <div className="relative">
      {robotText && <p className="bubble absolute -top-2 left-0 right-6 z-10 -translate-y-full rounded-2xl border-[3px] border-[#0B0F1F] bg-white px-3 py-2 text-xs font-extrabold leading-tight text-[#0B0F1F] shadow-[4px_4px_0_#0B0F1F] sm:text-sm">{robotText}<span className="absolute -bottom-[11px] left-8 h-4 w-4 rotate-45 border-b-[3px] border-r-[3px] border-[#0B0F1F] bg-white" /></p>}
      <Robot className="bob mx-auto w-full max-w-[11rem]" />
    </div>
    <div className="relative">
      {humanText && <p className="bubble absolute -top-2 left-6 right-0 z-10 -translate-y-full rounded-2xl border-[3px] border-[#0B0F1F] bg-[#FFD60A] px-3 py-2 text-xs font-extrabold leading-tight text-[#0B0F1F] shadow-[4px_4px_0_#0B0F1F] sm:text-sm" style={{ animationDelay: '.5s' }}>{humanText}<span className="absolute -bottom-[11px] right-8 h-4 w-4 rotate-45 border-b-[3px] border-r-[3px] border-[#0B0F1F] bg-[#FFD60A]" /></p>}
      <Human className="mx-auto w-full max-w-[18rem]" />
    </div>
    <Spark className="spark absolute left-[40%] top-[30%] h-9 w-9 -translate-x-1/2 sm:h-12 sm:w-12" />
  </div>
);
