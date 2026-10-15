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
      className="rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 text-stone-950 font-bold flex items-center justify-center border-2 border-white shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {AGENT.firstName[0]}
      {AGENT.name.split(' ')[1]?.[0]}
    </div>
  );

/** Apparition douce au défilement (aucun effet si le visiteur préfère moins de mouvement). */
export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
};

type DemoMsg = { who: 'bot' | 'me'; text: string };
const DEMO: DemoMsg[] = [
  { who: 'bot', text: "Bonjour ! Je suis l'assistant (IA) de Céline. Quelle est l'adresse du bien ?" },
  { who: 'me', text: '12 rue Mercière, Lyon 2e' },
  { who: 'bot', text: 'Quelle est sa surface, en m² ?' },
  { who: 'me', text: '78 m²' },
];

/** Aperçu animé de l'assistant (exemple illustratif, pas une vraie estimation). */
const PhoneDemo: React.FC = () => {
  const [step, setStep] = useState(0); // 0..DEMO.length = messages, +1 = fourchette
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setStep(DEMO.length + 1); return; }
    const t = window.setInterval(() => setStep((n) => (n >= DEMO.length + 3 ? 0 : n + 1)), 1700);
    return () => window.clearInterval(t);
  }, []);
  const showResult = step >= DEMO.length + 1;
  return (
    <div className="relative mx-auto w-[17.5rem] sm:w-[19rem]" aria-hidden="true">
      <div className="float-slow rounded-[2.4rem] border-[7px] border-[#1b2d57] bg-[#f4f1ea] shadow-2xl shadow-black/40 overflow-hidden">
        <div className="bg-[#0f1f3d] px-4 py-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 hover:brightness-110 text-white text-xs font-extrabold">IA</span>
          <div><p className="text-[13px] font-bold text-white leading-tight">Assistant Estimation</p><p className="text-[10px] text-slate-300 leading-tight">En ligne • réponse en 2 min</p></div>
        </div>
        <div className="h-[22.5rem] space-y-2 px-3 py-3 text-[12.5px] leading-snug">
          {DEMO.slice(0, Math.min(step, DEMO.length)).map((m, i) => (
            <div key={i} className={`pop-in flex ${m.who === 'me' ? 'justify-end' : ''}`}>
              <span className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.who === 'me' ? 'rounded-br-md bg-[#0f1f3d] text-white' : 'rounded-bl-md bg-white text-stone-800 shadow-sm'}`}>{m.text}</span>
            </div>
          ))}
          {step >= 1 && step < DEMO.length + 1 && step % 2 === 0 && <div className="pop-in flex"><span className="rounded-2xl rounded-bl-md bg-white px-3 py-2 text-stone-400 shadow-sm">• • •</span></div>}
          {showResult && (
            <div className="pop-in rounded-2xl bg-white p-3 shadow-md">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">Estimation indicative (IA) • exemple</p>
              <div className="mt-1 flex items-center justify-between text-[15px] font-extrabold text-[#0f1f3d]"><span>412 000 €</span><span>468 000 €</span></div>
              <div className="relative my-2 h-2 rounded-full bg-gradient-to-r from-rose-300 via-amber-200 to-emerald-300">
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0f1f3d] px-2 py-0.5 text-[9px] font-bold text-white whitespace-nowrap">🔒 Prix juste à fixer sur place</span>
              </div>
              <p className="mt-3 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 hover:brightness-110 px-3 py-2 text-center text-[11px] font-extrabold text-white">Réserver ma visite offerte</p>
            </div>
          )}
        </div>
      </div>
      <div className="absolute -left-6 bottom-10 sm:-left-10 flex items-center gap-2.5 rounded-2xl bg-white/95 p-2 pr-4 shadow-xl backdrop-blur float-slow" style={{ animationDelay: '1.2s' }}>
        {AGENT.photoUrl ? <img src={AGENT.photoUrl} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover object-[50%_20%]" /> : <AgentAvatar size={44} />}
        <div><p className="text-[12px] font-extrabold text-[#0f1f3d] leading-tight">{AGENT.firstName} {AGENT.name.split(' ').slice(1).join(' ').toUpperCase()}</p><p className="text-[10px] text-stone-500 leading-tight">Votre experte locale</p></div>
      </div>
    </div>
  );
};

/** Au-dessus de la ligne de flottaison : une promesse, un champ pour démarrer, l'assistant en action. */
export const LandingHero: React.FC<{ onStart: (a: { address: string; postalCode?: string; city?: string }) => void }> = ({ onStart }) => {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<AddressSuggestion | null>(null);

  const start = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (picked && picked.label === text) onStart({ address: picked.street, postalCode: picked.postalCode, city: picked.city });
    else onStart({ address: text.trim() });
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#0a1530] text-white shadow-2xl">
      <div aria-hidden className="drift pointer-events-none absolute -top-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 hover:brightness-110 blur-3xl" />
      <div aria-hidden className="drift pointer-events-none absolute -bottom-48 -left-28 h-[28rem] w-[28rem] rounded-full bg-sky-500/20 blur-3xl" style={{ animationDelay: '3s' }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
      <div className="relative grid lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-8 p-6 sm:p-12 lg:p-16 items-center">
        <div className="space-y-7 min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-cyan-200 bg-white/10 border border-white/15 backdrop-blur rounded-full px-3.5 py-1.5">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
            Région Lyonnaise &amp; Beaujolais
          </p>

          <h1 className="text-[2.6rem] sm:text-6xl lg:text-[4.4rem] font-extrabold tracking-tight leading-[1.02] [text-wrap:balance]">
            Quelle est la{' '}
            <span className="text-shimmer bg-gradient-to-r from-amber-300 via-amber-100 to-cyan-400 bg-clip-text text-transparent">valeur réelle</span>{' '}
            de votre bien à&nbsp;Lyon&nbsp;?
          </h1>

          <p className="text-base sm:text-xl text-slate-300 leading-relaxed max-w-xl">
            Une estimation basée sur les ventes réelles de votre quartier, puis affinée sur place par {AGENT.firstName}, votre conseillère de proximité.
          </p>

          <form onSubmit={start} className="rounded-3xl bg-white/95 backdrop-blur shadow-2xl shadow-black/40 p-2.5 sm:p-3 flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-2xl text-stone-900 ring-1 ring-white/40" aria-label="Démarrer l'estimation">
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
              className="flex-1 min-w-0"
            />
            <button
              type="submit"
              id="btn-hero-start"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-cyan-400 hover:from-amber-300 hover:to-amber-200 text-[#0f1f3d] font-extrabold px-8 py-4 text-base shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2"
            >
              Estimer
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <ul className="flex flex-wrap gap-2.5 text-sm text-slate-100">
            {['2 minutes', '100 % gratuit', 'Sans engagement'].map((t) => (
              <li key={t} className="flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 backdrop-blur">
                <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 text-xs text-slate-400 max-w-xl">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
            Appuyée sur les prix de vente enregistrés par l'État (base DVF), pas sur des prix d'annonces.
          </p>
        </div>

        <div className="min-w-0 pb-4 lg:pb-0 pl-6 sm:pl-10 lg:pl-0">
          <PhoneDemo />
          <a href={AGENT.phoneHref} className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition-colors">
            <Phone className="w-4 h-4 text-cyan-300" />
            Appeler {AGENT.firstName} : {AGENT.phone}
          </a>
        </div>
      </div>
    </section>
  );
};

type Tone = 'white' | 'cream' | 'navy' | 'gold';
const TONES: Record<Tone, string> = {
  white: 'bg-white',
  cream: 'bg-[#f7f2e8]',
  navy: 'bg-[#0f1f3d] text-white',
  gold: 'bg-gradient-to-br from-amber-400 to-cyan-400 text-[#0f1f3d]',
};

/** Full-width horizontal band: gives each part of the page its own background and rhythm. */
const Band: React.FC<{ tone: Tone; children: React.ReactNode; id?: string }> = ({ tone, children, id }) => (
  <div id={id} className={`relative left-1/2 -translate-x-1/2 w-screen ${TONES[tone]}`}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">{children}</div>
  </div>
);

const Eyebrow: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light }) => (
  <p className={`text-xs font-bold uppercase tracking-[0.18em] ${light ? 'text-cyan-300' : 'text-indigo-600'}`}>{children}</p>
);

const H2: React.FC<{ id: string; children: React.ReactNode; light?: boolean }> = ({ id, children, light }) => (
  <h2 id={id} className={`mt-2 text-3xl sm:text-4xl font-bold tracking-tight [text-wrap:balance] ${light ? 'text-white' : 'text-[#0f1f3d]'}`}>
    {children}
  </h2>
);

const STEPS = [
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
  <Band tone="white">
    <section aria-labelledby="how-title">
      <Reveal className="text-center max-w-2xl mx-auto">
        <Eyebrow>Votre estimation en 3 étapes</Eyebrow>
        <H2 id="how-title">Comment obtenir l'estimation de votre bien ?</H2>
      </Reveal>
      <ol className="mt-12 grid md:grid-cols-3 gap-5">
        {STEPS.map((st, i) => (
          <li key={st.title} className="contents">
            <Reveal delay={i * 120}>
              <div className={`group relative h-full overflow-hidden rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${i === 1 ? 'bg-gradient-to-br from-[#0f1f3d] to-[#1d3566] text-white shadow-xl' : i === 2 ? 'bg-gradient-to-br from-amber-100 to-amber-50 text-[#0f1f3d] border border-indigo-200' : 'bg-stone-50 text-[#0f1f3d] border border-stone-200'}`}>
                <span className={`absolute -right-3 -top-6 select-none text-[8rem] font-extrabold leading-none ${i === 1 ? 'text-white/10' : 'text-[#0f1f3d]/[0.06]'}`}>{i + 1}</span>
                <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-md transition-transform duration-300 group-hover:rotate-6 ${i === 1 ? 'bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 hover:brightness-110 text-white' : 'bg-[#0f1f3d] text-cyan-300'}`}>
                  <st.icon className="w-7 h-7" />
                </div>
                <h3 className="relative mt-6 text-xl font-extrabold leading-snug">{st.title}</h3>
                <p className={`relative mt-3 leading-relaxed ${i === 1 ? 'text-slate-300' : 'text-stone-600'}`}>{st.text}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  </Band>
);

export const WhyOnSite: React.FC = () => (
  <Band tone="navy">
    <section aria-labelledby="why-title" className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
      <div className="min-w-0">
        <Eyebrow light>Estimation en ligne vs estimation sur place</Eyebrow>
        <H2 id="why-title" light>Pourquoi l'estimation en ligne doit être confirmée sur place&nbsp;?</H2>
        <p className="mt-4 text-lg text-slate-300 leading-relaxed">
          Un algorithme compare des données froides. Il ne perçoit ni la luminosité de votre séjour, ni la qualité des matériaux, ni le charme d'un jardin ou le calme du quartier. En région lyonnaise comme dans le Beaujolais, ce sont précisément ces prestations qui déclenchent un coup de cœur et valorisent votre prix au m².
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 min-w-0">
        <div className="rounded-2xl bg-white/5 border border-white/15 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">En ligne · 2 minutes</p>
          <h3 className="mt-1 text-lg font-bold text-white">La simulation automatique</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />Base de données DVF des ventes réelles</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />Fixe une première fourchette de prix</li>
            <li className="flex gap-2 text-slate-400"><span className="w-4 text-center shrink-0">–</span>Ne prend pas en compte l'état du bien</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-white text-stone-800 border-2 border-amber-400 p-5 shadow-xl sm:-translate-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Gratuite · sans engagement</p>
          <h3 className="mt-1 text-lg font-bold text-[#0f1f3d]">L'expertise sur place par {AGENT.firstName}</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />Analyse de la vue, de l'exposition et des travaux</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />Avis de valeur détaillé</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />Rendez-vous offert, sans aucun engagement</li>
          </ul>
        </div>
      </div>
    </section>
  </Band>
);

/** Renders only with real data (see src/data/siteContent.ts). */
export const SocialProof: React.FC = () => {
  if (TESTIMONIALS.length === 0 && KEY_FIGURES.length === 0) return null;
  return (
    <Band tone="white">
    <section aria-labelledby="proof-title" className="space-y-6">
      <Eyebrow>Témoignages</Eyebrow>
      <H2 id="proof-title">Ils ont confié leur bien à {AGENT.firstName}</H2>
      {KEY_FIGURES.length > 0 && (
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KEY_FIGURES.map((k) => (
            <div key={k.label} className="rounded-xl bg-white border border-stone-200 p-5">
              <dt className="sr-only">{k.label}</dt>
              <dd className="text-3xl font-semibold text-stone-900 tabular-nums">{k.value}</dd>
              <p className="text-sm text-stone-600">{k.label}</p>
            </div>
          ))}
        </dl>
      )}
      {TESTIMONIALS.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <figure key={t.author + t.quote} className="rounded-xl bg-white border border-stone-200 p-6 space-y-3">
              <Quote className="w-5 h-5 text-indigo-600" />
              <blockquote className="text-stone-800 leading-relaxed">{t.quote}</blockquote>
              <figcaption className="text-sm text-stone-600">
                <span className="font-semibold text-stone-900">{t.author}</span>, {t.place}
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
      <section aria-labelledby="faq-title" className="grid lg:grid-cols-[1fr_1.7fr] gap-10 lg:gap-14">
        <div>
          <Eyebrow>Questions fréquentes</Eyebrow>
          <H2 id="faq-title">Toutes les réponses sur votre estimation</H2>
          <p className="mt-4 text-stone-600 leading-relaxed">Une question spécifique ? {AGENT.firstName} vous répond directement par téléphone.</p>
          <a href={AGENT.phoneHref} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0f1f3d] hover:bg-[#1a3060] text-white font-semibold px-5 py-3 transition-colors">
            <Phone className="w-4 h-4 text-cyan-300" />
            {AGENT.phone}
          </a>
        </div>
        <div className="space-y-3">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className={`rounded-2xl bg-white border transition-shadow ${isOpen ? 'border-indigo-300 shadow-md' : 'border-stone-200'}`}>
                <h3>
                  <button
                    type="button"
                    id={`faq-btn-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 font-semibold text-[#0f1f3d] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-2xl"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-5 h-5 shrink-0 text-indigo-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </h3>
                {isOpen && (
                  <div id={`faq-panel-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} className="px-5 pb-5 text-stone-600 leading-relaxed">
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
  <Band tone="gold">
    <section className="flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left">
      {AGENT.photoUrl && (
        <img src={AGENT.photoUrl} alt={AGENT.name} width={160} height={160} loading="lazy" className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white shadow-xl shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight [text-wrap:balance]">Prêt à connaître la valeur réelle de votre bien&nbsp;?</h2>
        <p className="mt-3 text-lg text-[#0f1f3d]/80 max-w-xl">2 minutes pour la simulation en ligne, une visite offerte pour valider. {AGENT.firstName} s'occupe de tout.</p>
      </div>
      <button
        type="button"
        onClick={scrollToSimulator}
        className="inline-flex items-center gap-2 rounded-xl bg-[#0f1f3d] hover:bg-[#1a3060] text-white font-bold px-7 py-4 text-base shadow-xl transition-colors shrink-0"
      >
        Lancer mon estimation gratuite
        <ArrowRight className="w-5 h-5" />
      </button>
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
      className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-stone-200 px-4 pt-2.5 flex flex-wrap gap-x-2 gap-y-1.5"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {unlocked && priceLabel && (
        <div className="basis-full flex items-baseline justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-indigo-800">Votre estimation</span>
          <span className="text-base font-bold text-[#0f1f3d]">{priceLabel}</span>
        </div>
      )}
      {unlocked && onBook ? (
        <button
          type="button"
          onClick={onBook}
          className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 hover:brightness-110 active:bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 hover:brightness-110 text-white font-bold py-3.5 text-sm shadow"
        >
          Réserver ma visite gratuite
        </button>
      ) : (
        <button type="button" onClick={scrollToSimulator} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 text-white font-semibold py-3 text-sm">
          Estimer mon bien
        </button>
      )}
      <a
        href={AGENT.phoneHref}
        aria-label={`Appeler ${AGENT.firstName}`}
        className="rounded-xl border border-stone-300 px-4 flex items-center justify-center"
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
        <p className="mt-4 text-stone-600 leading-relaxed">
          Une IA calcule des prix au m². {AGENT.firstName} connaît la vraie valeur de votre logement : elle croise les ventes réelles de votre secteur (base DVF) avec ce qu'aucun ordinateur ne peut évaluer, la luminosité, la vue, l'étage, l'agencement et le coup de cœur du bien. C'est cette étude sur le terrain qui garantit un avis de valeur juste pour vendre efficacement.
        </p>
      </div>
      <ul className="grid gap-3">
        {[
          'Métropole de Lyon (Grand Lyon, Nord & Ouest Lyonnais)',
          "Val de Saône & Monts d'Or",
          'Beaujolais & Pierres Dorées',
          'Villefranche & alentours',
        ].map((c) => (
          <li key={c} className="flex items-center gap-2 rounded-xl bg-white border border-stone-200 px-4 py-3.5 font-semibold text-[#0f1f3d]">
            <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
            {c}
          </li>
        ))}
      </ul>
    </section>
  </Band>
);

export const TEASER = [
  ['estimer-appartement-lyon-criteres-prix', 'Estimation', 'Estimer son appartement à Lyon : les 8 critères qui font varier le prix'],
  ['prix-immobilier-dvf-ventes-reelles-quartier', 'Marché', "Ventes réelles (DVF) : ce qu'elles disent de votre bien, et leurs limites"],
  ['documents-vendre-appartement-maison', 'Préparer sa vente', 'Vendre son bien : la liste des documents à rassembler'],
];

/** Internal links to the blog: help visitors and search engines find the guides. */
export const BlogTeaser: React.FC = () => (
  <Band tone="white">
    <section aria-labelledby="blog-teaser-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>L'avis de l'expert</Eyebrow>
          <H2 id="blog-teaser-title">Comment valoriser et vendre votre logement à sa vraie valeur</H2>
        </div>
        <a href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f1f3d] underline underline-offset-4">Tous les conseils d'experts <ArrowRight className="w-4 h-4" /></a>
      </div>
      <ul className="mt-8 grid md:grid-cols-3 gap-5">
        {TEASER.map(([slug, cat, title]) => (
          <li key={slug}>
            <a href={`/blog/${slug}`} className="group flex h-full flex-col rounded-2xl bg-[#f7f2e8] border border-transparent p-6 hover:border-indigo-300 hover:shadow-lg transition">
              <span className="self-start rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700">{cat}</span>
              <span className="mt-4 flex-1 text-lg font-bold leading-snug text-[#0f1f3d]">{title}</span>
              <span className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-indigo-700">Lire l'article <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  </Band>
);
