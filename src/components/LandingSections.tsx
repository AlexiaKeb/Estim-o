import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Home,
  MapPin,
  MessageSquare,
  Phone,
  Quote,
  ShieldCheck,
} from 'lucide-react';
import { AddressSearch, AddressSuggestion } from './AddressSearch';
import { AGENT, FAQ, KEY_FIGURES, TESTIMONIALS } from '../data/siteContent';
import { Duo, Human, Robot, Spark } from './Mascots';

export const scrollToSimulator = () => {
  document.getElementById('simulateur')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => document.getElementById('input-surface-range')?.focus({ preventScroll: true }), 450);
};

const AgentAvatar: React.FC<{ size?: number }> = ({ size = 56 }) =>
  AGENT.photoUrl ? (
    <img
      src={AGENT.photoUrl}
      alt={AGENT.name}
      width={size}
      height={size}
      className="rounded-full object-cover border-2 border-white shadow-sm"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-[#FFD60A] text-[#0B0F1F] font-bold flex items-center justify-center border-2 border-white shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {AGENT.firstName[0]}
      {AGENT.name.split(' ')[1]?.[0]}
    </div>
  );

// Palette unique, couleurs franches (aucun dégradé) : bleu #2B4BFF, jaune #FFD60A, encre #0B0F1F, crème #FFF7E6.
const BTN = 'inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] border-[#0B0F1F] bg-[#FFD60A] px-7 py-4 text-base font-black text-[#0B0F1F] shadow-[5px_5px_0_#0B0F1F] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#0B0F1F] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#0B0F1F] focus:outline-none focus-visible:ring-4 focus-visible:ring-white';

/** Above the fold: one promise, one field to start, the robot and the human face to face. */
export const LandingHero: React.FC<{ onStart: (a: { address: string; postalCode?: string; city?: string }) => void }> = ({ onStart }) => {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<AddressSuggestion | null>(null);

  const start = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (picked && picked.label === text) onStart({ address: picked.street, postalCode: picked.postalCode, city: picked.city });
    else onStart({ address: text.trim() });
  };

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-screen overflow-hidden bg-[#2B4BFF] text-white">
      <div aria-hidden className="spin-slow pointer-events-none absolute -right-10 top-24 hidden h-14 w-14 rounded-xl border-[5px] border-[#0B0F1F] bg-[#FFF7E6] lg:block" />
      <div aria-hidden className="pointer-events-none absolute -left-16 bottom-10 h-40 w-40 rounded-full border-[5px] border-[#0B0F1F] bg-[#FFD60A]" />
      <section className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8 lg:px-8">
        <div className="min-w-0 space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full border-[3px] border-[#0B0F1F] bg-[#FFF7E6] px-4 py-1.5 text-xs font-black tracking-wide text-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F]">
            <MapPin className="h-3.5 w-3.5" />
            Région Lyonnaise &amp; Beaujolais
          </p>

          <h1 className="text-[2.6rem] font-black leading-[1.02] tracking-tight [text-wrap:balance] sm:text-6xl lg:text-7xl">
            Quelle est la <span className="inline-block -rotate-1 rounded-xl bg-[#FFD60A] px-3 text-[#0B0F1F]">valeur réelle</span> de votre bien à&nbsp;Lyon et sa région&nbsp;?
          </h1>

          <p className="max-w-xl text-base font-medium leading-relaxed text-white/95 sm:text-xl">
            Obtenez une estimation basée sur les ventes réelles de votre quartier, affinée sur place par {AGENT.firstName}, votre conseillère de proximité.
          </p>

          <form onSubmit={start} className="flex max-w-2xl flex-col gap-3 rounded-3xl border-[3px] border-[#0B0F1F] bg-white p-3 text-[#0B0F1F] shadow-[7px_7px_0_#0B0F1F] sm:flex-row" aria-label="Démarrer l'estimation">
            <label htmlFor="hero-address" className="sr-only">Adresse du bien</label>
            <AddressSearch
              id="hero-address"
              size="lg"
              value={text}
              onChange={(t) => {
                setText(t);
                setPicked(null);
              }}
              onSelect={(s) => {
                setPicked(s);
                setText(s.label);
              }}
              placeholder="Saisissez l'adresse de votre bien"
              className="min-w-0 flex-1"
            />
            <button type="submit" id="btn-hero-start" className={`group ${BTN}`}>
              Estimer
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <ul className="flex flex-wrap gap-3 text-sm font-bold">
            {['Estimation en 2 minutes', '100 % gratuit', 'Sans engagement'].map((t) => (
              <li key={t} className="flex items-center gap-2 rounded-full border-[3px] border-[#0B0F1F] bg-[#FFF7E6] px-4 py-1.5 text-[#0B0F1F]">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2B4BFF]" />
                {t}
              </li>
            ))}
          </ul>
          <p className="flex max-w-xl items-start gap-2 text-xs font-medium text-white/90">
            <ShieldCheck className="mt-px h-4 w-4 shrink-0" />
            Appuyée sur les prix de vente enregistrés par l'État (base DVF), pas sur des prix d'annonces.
          </p>
        </div>

        <aside className="min-w-0 pt-14 sm:pt-16 lg:pt-10">
          <Duo robotText="Estimation en 2 minutes" humanText="Rendez-vous offert, sans aucun engagement" />
          <div className="mx-auto mt-6 max-w-md rounded-3xl border-[3px] border-[#0B0F1F] bg-white p-5 text-[#0B0F1F] shadow-[6px_6px_0_#0B0F1F]">
            <div className="text-lg font-black">{AGENT.firstName} {AGENT.name.split(' ').slice(1).join(' ').toUpperCase()}</div>
            <div className="text-sm font-semibold text-[#2B4BFF]">Votre experte immobilière locale</div>
            <p className="mt-2 text-sm leading-relaxed text-[#0B0F1F]/80">
              Un accompagnement sur mesure, de l'estimation jusqu'à la signature. Un seul interlocuteur direct, sans intermédiaire ni centre d'appels.
            </p>
            <dl className="mt-3 space-y-1.5 border-t-[3px] border-[#0B0F1F] pt-3 text-sm font-semibold">
              <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2B4BFF]" /><dd>{AGENT.zone}</dd></div>
              <div className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#2B4BFF]" /><dd>Déplacement &amp; rendez-vous offerts</dd></div>
            </dl>
            <a href={AGENT.phoneHref} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-[#0B0F1F] bg-[#0B0F1F] px-4 py-3 text-sm font-black text-white transition-colors hover:bg-[#2B4BFF]">
              <Phone className="h-4 w-4 text-[#FFD60A]" />
              Appeler {AGENT.firstName} au {AGENT.phone}
            </a>
          </div>
        </aside>
      </section>
      <div className="relative overflow-hidden border-y-[3px] border-[#0B0F1F] bg-[#FFD60A] py-3 text-[#0B0F1F]" aria-hidden="true">
        <div className="marquee2 flex w-max gap-10 whitespace-nowrap text-sm font-black uppercase tracking-wide">
          {[0, 1].map((k) => (
            <span key={k} className="flex gap-10">
              {['Estimation en 2 minutes', '100 % gratuit', 'Sans engagement', 'Région Lyonnaise & Beaujolais', 'Estimation en 2 minutes', '100 % gratuit', 'Sans engagement', 'Région Lyonnaise & Beaujolais'].map((t, i) => (
                <span key={i} className="flex items-center gap-10">{t}<span>★</span></span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

type Tone = 'cream' | 'blue' | 'yellow' | 'ink' | 'white';
const TONES: Record<Tone, string> = {
  cream: 'bg-[#FFF7E6] text-[#0B0F1F]',
  white: 'bg-white text-[#0B0F1F]',
  blue: 'bg-[#2B4BFF] text-white',
  yellow: 'bg-[#FFD60A] text-[#0B0F1F]',
  ink: 'bg-[#0B0F1F] text-white',
};

/** Pleine largeur : chaque partie de la page a sa couleur franche et occupe (au moins) tout l'écran. */
const Band: React.FC<{ tone: Tone; children: React.ReactNode; id?: string; full?: boolean }> = ({ tone, children, id, full = true }) => (
  <div id={id} className={`relative left-1/2 w-screen -translate-x-1/2 ${TONES[tone]} ${full ? 'flex min-h-[calc(100svh-4rem)] items-center' : ''}`}>
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">{children}</div>
  </div>
);

const Eyebrow: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light }) => (
  <p className={`inline-block rounded-full border-[3px] border-[#0B0F1F] px-4 py-1 text-xs font-black uppercase tracking-[0.14em] shadow-[3px_3px_0_#0B0F1F] ${light ? 'bg-[#FFD60A] text-[#0B0F1F]' : 'bg-[#2B4BFF] text-white'}`}>{children}</p>
);

const H2: React.FC<{ id: string; children: React.ReactNode; light?: boolean }> = ({ id, children }) => (
  <h2 id={id} className="mt-4 text-3xl font-black tracking-tight [text-wrap:balance] sm:text-5xl">
    {children}
  </h2>
);

export const STEPS = [
  {
    icon: Home,
    title: 'Évaluez votre bien en ligne',
    text: "Indiquez l'adresse, la surface et les caractéristiques de votre logement. L'assistant calcule immédiatement une première fourchette de prix.",
  },
  {
    icon: MessageSquare,
    title: 'Choisissez votre créneau',
    text: `Accédez directement aux disponibilités de ${AGENT.firstName} et fixez un rendez-vous selon votre agenda, en quelques secondes.`,
  },
  {
    icon: CheckCircle2,
    title: `Validez l'estimation lors de la visite de ${AGENT.firstName}`,
    text: `L'estimation IA n'est qu'un indicateur. Seule la visite physique de ${AGENT.firstName} sur place permet de prendre en compte la réalité de votre bien. Sous 48h, elle vous remet votre dossier d'estimation complet et argumenté.`,
  },
];

export const HowItWorks: React.FC = () => (
  <Band tone="yellow">
    <section aria-labelledby="how-title">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>Votre estimation en 3 étapes</Eyebrow>
        <H2 id="how-title">Comment obtenir l'estimation de votre bien ?</H2>
      </div>
      <ol className="relative mt-14 grid gap-8 md:grid-cols-3">
        {STEPS.map((st, i) => (
          <li key={st.title} className={`pop-card relative rounded-3xl border-[3px] border-[#0B0F1F] p-7 shadow-[6px_6px_0_#0B0F1F] ${i === 1 ? 'bg-[#2B4BFF] text-white' : 'bg-white text-[#0B0F1F]'}`}>
            <span className="absolute -top-6 left-6 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[#0B0F1F] bg-[#FFD60A] text-xl font-black text-[#0B0F1F]">{i + 1}</span>
            <div className={`mt-2 flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-[#0B0F1F] ${i === 1 ? 'bg-[#FFD60A] text-[#0B0F1F]' : 'bg-[#2B4BFF] text-white'}`}>
              <st.icon className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-black leading-snug">{st.title}</h3>
            <p className={`mt-3 leading-relaxed ${i === 1 ? 'text-white/95' : 'text-[#0B0F1F]/80'}`}>{st.text}</p>
          </li>
        ))}
      </ol>
    </section>
  </Band>
);

export const WhyOnSite: React.FC = () => (
  <Band tone="ink">
    <section aria-labelledby="why-title">
      <div className="mx-auto max-w-4xl text-center">
        <Eyebrow light>Estimation en ligne vs estimation sur place</Eyebrow>
        <H2 id="why-title" light>Pourquoi l'estimation en ligne doit être confirmée sur place&nbsp;?</H2>
        <p className="mt-5 text-lg leading-relaxed text-white/90">
          Un algorithme compare des données froides. Il ne perçoit ni la luminosité de votre séjour, ni la qualité des matériaux, ni le charme d'un jardin ou le calme du quartier. En région lyonnaise comme dans le Beaujolais, ce sont précisément ces prestations qui déclenchent un coup de cœur et valorisent votre prix au m².
        </p>
      </div>
      <div className="relative mt-14 grid gap-8 md:grid-cols-2">
        <div className="pop-card relative flex items-start gap-4 rounded-3xl border-[3px] border-[#FFF7E6] bg-[#2B4BFF] p-7 text-white shadow-[6px_6px_0_#FFF7E6]">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wider text-[#FFD60A]">En ligne · 2 minutes</p>
            <h3 className="mt-1 text-2xl font-black">La simulation automatique</h3>
            <ul className="mt-4 space-y-2.5 font-semibold">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#FFD60A]" />Base de données DVF des ventes réelles</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#FFD60A]" />Fixe une première fourchette de prix</li>
              <li className="flex gap-2 text-white/80"><span className="w-5 shrink-0 text-center">–</span>Ne prend pas en compte l'état du bien</li>
            </ul>
          </div>
          <Robot className="bob hidden h-40 w-32 shrink-0 sm:block" />
        </div>
        <div className="pop-card relative flex items-start gap-4 rounded-3xl border-[3px] border-[#0B0F1F] bg-[#FFD60A] p-7 text-[#0B0F1F] shadow-[6px_6px_0_#FFF7E6]">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wider text-[#2B4BFF]">Gratuite · sans engagement</p>
            <h3 className="mt-1 text-2xl font-black">L'expertise sur place par {AGENT.firstName}</h3>
            <ul className="mt-4 space-y-2.5 font-semibold">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2B4BFF]" />Analyse de la vue, de l'exposition et des travaux</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2B4BFF]" />Avis de valeur détaillé</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2B4BFF]" />Rendez-vous offert, sans aucun engagement</li>
            </ul>
          </div>
          <Human className="bob hidden h-40 w-32 shrink-0 sm:block" />
        </div>
        <Spark className="spark absolute left-1/2 top-1/2 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 md:block" />
      </div>
    </section>
  </Band>
);

/** Renders only with real data (see src/data/siteContent.ts). */
export const SocialProof: React.FC = () => {
  if (TESTIMONIALS.length === 0 && KEY_FIGURES.length === 0) return null;
  return (
    <Band tone="white" full={false}>
    <section aria-labelledby="proof-title" className="space-y-6">
      <Eyebrow>Témoignages</Eyebrow>
      <H2 id="proof-title">Ils ont confié leur bien à {AGENT.firstName}</H2>
      {KEY_FIGURES.length > 0 && (
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {KEY_FIGURES.map((k) => (
            <div key={k.label} className="rounded-2xl border-[3px] border-[#0B0F1F] bg-white p-5 shadow-[4px_4px_0_#0B0F1F]">
              <dt className="sr-only">{k.label}</dt>
              <dd className="text-3xl font-black tabular-nums">{k.value}</dd>
              <p className="text-sm font-semibold">{k.label}</p>
            </div>
          ))}
        </dl>
      )}
      {TESTIMONIALS.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.author + t.quote} className="space-y-3 rounded-2xl border-[3px] border-[#0B0F1F] bg-white p-6 shadow-[4px_4px_0_#0B0F1F]">
              <Quote className="h-5 w-5 text-[#2B4BFF]" />
              <blockquote className="leading-relaxed">{t.quote}</blockquote>
              <figcaption className="text-sm">
                <span className="font-black">{t.author}</span>, {t.place}
                {t.detail ? ` · ${t.detail}` : ''}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
    </Band>
  );
};

export const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Band tone="cream">
      <section aria-labelledby="faq-title" className="grid gap-10 lg:grid-cols-[1fr_1.7fr] lg:gap-14">
        <div>
          <Eyebrow>Questions fréquentes</Eyebrow>
          <H2 id="faq-title">Toutes les réponses sur votre estimation</H2>
          <p className="mt-4 text-lg font-medium leading-relaxed">Une question spécifique ? {AGENT.firstName} vous répond directement par téléphone.</p>
          <a href={AGENT.phoneHref} className="mt-6 inline-flex items-center gap-2 rounded-2xl border-[3px] border-[#0B0F1F] bg-[#2B4BFF] px-5 py-3 font-black text-white shadow-[5px_5px_0_#0B0F1F] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#0B0F1F]">
            <Phone className="h-4 w-4 text-[#FFD60A]" />
            {AGENT.phone}
          </a>
          <Robot className="bob mt-8 hidden h-44 w-36 lg:block" />
        </div>
        <div className="space-y-4">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className={`rounded-2xl border-[3px] border-[#0B0F1F] shadow-[5px_5px_0_#0B0F1F] ${isOpen ? 'bg-[#FFD60A]' : 'bg-white'}`}>
                <h3>
                  <button
                    type="button"
                    id={`faq-btn-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-black focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2B4BFF]"
                  >
                    <span>{item.q}</span>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-[#0B0F1F] transition-transform ${isOpen ? 'rotate-180 bg-white' : 'bg-[#FFD60A]'}`}><ChevronDown className="h-5 w-5" /></span>
                  </button>
                </h3>
                {isOpen && (
                  <div id={`faq-panel-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} className="px-5 pb-5 font-medium leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </Band>
  );
};

export const FinalCta: React.FC = () => (
  <Band tone="blue">
    <section className="grid items-center gap-10 text-center lg:grid-cols-[1.1fr_1fr] lg:text-left">
      <div className="min-w-0">
        <h2 className="text-4xl font-black tracking-tight [text-wrap:balance] sm:text-6xl">Prêt à connaître la valeur réelle de votre bien&nbsp;?</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-white/95 lg:mx-0 sm:text-xl">2 minutes pour la simulation en ligne, une visite offerte pour valider. {AGENT.firstName} s'occupe de tout.</p>
        <button type="button" onClick={scrollToSimulator} className={`group mt-8 ${BTN}`}>
          Lancer mon estimation gratuite
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
      <Duo />
    </section>
  </Band>
);

/** Mobile only: the action stays one tap away while the visitor reads. */
export const StickyMobileCta: React.FC<{ unlocked?: boolean; onBook?: () => void; priceLabel?: string }> = ({ unlocked, onBook, priceLabel }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 560);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // Once the estimate is shown, the bar always offers the visit, whatever the scroll position
  const show = unlocked || visible;
  if (!show) return null;
  return (
    <div
      className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FFF7E6] border-t-[3px] border-[#0B0F1F] px-4 pt-2.5 flex flex-wrap gap-x-2 gap-y-1.5"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {unlocked && priceLabel && (
        <div className="basis-full flex items-baseline justify-between text-xs">
          <span className="font-black uppercase tracking-wider text-[#2B4BFF]">Votre estimation</span>
          <span className="text-base font-bold text-[#0f1f3d]">{priceLabel}</span>
        </div>
      )}
      {unlocked && onBook ? (
        <button
          type="button"
          onClick={onBook}
          className="flex-1 rounded-xl border-[3px] border-[#0B0F1F] bg-[#FFD60A] text-[#0B0F1F] font-black py-3.5 text-sm shadow-[3px_3px_0_#0B0F1F]"
        >
          Réserver ma visite gratuite
        </button>
      ) : (
        <button type="button" onClick={scrollToSimulator} className="flex-1 rounded-xl border-[3px] border-[#0B0F1F] bg-[#2B4BFF] text-white font-black py-3 text-sm shadow-[3px_3px_0_#0B0F1F]">
          Estimer mon bien
        </button>
      )}
      <a
        href={AGENT.phoneHref}
        aria-label={`Appeler ${AGENT.firstName}`}
        className="rounded-xl border-[3px] border-[#0B0F1F] bg-white px-4 flex items-center justify-center"
      >
        <Phone className="w-5 h-5 text-stone-900" />
      </a>
    </div>
  );
};

/** Shows where the price comes from: real recorded sales (DVF) or, failing that, a plain sector average. */
export const ValuationEvidence: React.FC<{ result: import('../types').ValuationResult }> = ({ result }) => {
  const [open, setOpen] = useState(false);
  const fmtMonth = (iso?: string) =>
    iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';

  if (result.dataSource !== 'dvf') {
    return (
      <p className="mt-3 text-[11px] leading-relaxed text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
        Estimation indicative fondée sur un prix moyen de secteur. Les ventes comparables n'ont pas pu être consultées : la visite permet d'affiner.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 text-[11px] text-stone-700">
      <div className="flex items-start gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          Calculée à partir de <strong>{result.sampleSize} ventes réelles</strong> de biens comparables
          {result.radiusM ? ` dans un rayon de ${result.radiusM} m` : ` à ${result.city}`}, entre {fmtMonth(result.periodFrom)} et {fmtMonth(result.periodTo)}{' '}
          (source : base DVF de l'État). Médiane du secteur : {result.medianM2?.toLocaleString('fr-FR')} €/m².
        </p>
      </div>
      {result.comparables && result.comparables.length > 0 && (
        <>
          <button
            type="button"
            id="btn-toggle-comparables"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="mt-2 font-semibold text-emerald-800 underline underline-offset-2"
          >
            {open ? 'Masquer les ventes comparables' : 'Voir quelques ventes comparables'}
          </button>
          {open && (
            <ul className="mt-2 divide-y divide-emerald-200/70">
              {result.comparables.map((c, i) => (
                <li key={i} className="py-1.5 flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate capitalize">{c.street.toLowerCase()}</span>
                    <span className="text-stone-500">
                      {c.month} · {c.surface} m²{c.rooms ? ` · ${c.rooms} p.` : ''}
                      {c.distanceM !== null ? ` · à ${c.distanceM} m` : ''}
                    </span>
                  </span>
                  <span className="text-right tabular-nums shrink-0">
                    <span className="block font-semibold">{c.price.toLocaleString('fr-FR')} €</span>
                    <span className="text-stone-500">{c.ppm2.toLocaleString('fr-FR')} €/m²</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

/** Local context for visitors and search engines: who is served, and where the numbers come from. */
export const ZoneSection: React.FC = () => (
  <Band tone="cream">
    <section aria-labelledby="zone-title" className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
      <div>
        <Eyebrow>Secteur d'expertise</Eyebrow>
        <H2 id="zone-title">Une estimation humaine, bien au-delà des algorithmes</H2>
        <p className="mt-5 text-lg font-medium leading-relaxed">
          Une IA calcule des prix au m². {AGENT.firstName} connaît la vraie valeur de votre logement : elle croise les ventes réelles de votre secteur (base DVF) avec ce qu'aucun ordinateur ne peut évaluer, la luminosité, la vue, l'étage, l'agencement et le coup de cœur du bien. C'est cette étude sur le terrain qui garantit un avis de valeur juste pour vendre efficacement.
        </p>
      </div>
      <ul className="grid gap-4">
        {[
          'Métropole de Lyon (Grand Lyon, Nord & Ouest Lyonnais)',
          "Val de Saône & Monts d'Or",
          'Beaujolais & Pierres Dorées',
          'Villefranche & alentours',
        ].map((c) => (
          <li key={c} className="pop-card flex items-center gap-3 rounded-2xl border-[3px] border-[#0B0F1F] bg-white px-5 py-4 text-lg font-black shadow-[5px_5px_0_#0B0F1F]">
            <MapPin className="h-5 w-5 shrink-0 text-[#2B4BFF]" />
            {c}
          </li>
        ))}
      </ul>
    </section>
  </Band>
);

const TEASER = [
  ['estimer-appartement-lyon-criteres-prix', 'Estimation', 'Estimer son appartement à Lyon : les 8 critères qui font varier le prix'],
  ['prix-immobilier-dvf-ventes-reelles-quartier', 'Marché', "Ventes réelles (DVF) : ce qu'elles disent de votre bien, et leurs limites"],
  ['documents-vendre-appartement-maison', 'Préparer sa vente', 'Vendre son bien : la liste des documents à rassembler'],
];

/** Internal links to the blog: help visitors and search engines find the guides. */
export const BlogTeaser: React.FC = () => (
  <Band tone="white" full={false}>
    <section aria-labelledby="blog-teaser-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>L'avis de l'expert</Eyebrow>
          <H2 id="blog-teaser-title">Comment valoriser et vendre votre logement à sa vraie valeur</H2>
        </div>
        <a href="/blog" className="inline-flex items-center gap-1.5 text-base font-black text-[#0B0F1F] underline decoration-[3px] underline-offset-4">Tous les conseils d'experts <ArrowRight className="w-4 h-4" /></a>
      </div>
      <ul className="mt-8 grid md:grid-cols-3 gap-5">
        {TEASER.map(([slug, cat, title]) => (
          <li key={slug}>
            <a href={`/blog/${slug}`} className="group pop-card flex h-full flex-col rounded-3xl border-[3px] border-[#0B0F1F] bg-[#FFD60A] p-6 shadow-[5px_5px_0_#0B0F1F]">
              <span className="self-start rounded-full border-2 border-[#0B0F1F] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#0B0F1F]">{cat}</span>
              <span className="mt-4 flex-1 text-xl font-black leading-snug text-[#0B0F1F]">{title}</span>
              <span className="mt-5 flex items-center gap-1.5 text-sm font-black text-[#0B0F1F]">Lire l'article <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  </Band>
);
