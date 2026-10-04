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
      className="rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-stone-950 font-bold flex items-center justify-center border-2 border-white shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {AGENT.firstName[0]}
      {AGENT.name.split(' ')[1]?.[0]}
    </div>
  );

/** Above the fold: one promise, one field to start, proof of who is behind it. */
export const LandingHero: React.FC<{ onStart: (a: { address: string; postalCode?: string; city?: string }) => void }> = ({ onStart }) => {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<AddressSuggestion | null>(null);

  const start = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (picked && picked.label === text) onStart({ address: picked.street, postalCode: picked.postalCode, city: picked.city });
    else onStart({ address: text.trim() });
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#0f1f3d] text-white shadow-xl">
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="relative grid lg:grid-cols-[1.35fr_1fr] gap-10 lg:gap-14 p-6 sm:p-10 lg:p-14 items-center">
        <div className="space-y-6 min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-200 bg-white/10 border border-white/15 rounded-full px-3 py-1">
            <MapPin className="w-3.5 h-3.5" />
            Lyon, Villeurbanne, Beaujolais et 50 km autour
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] [text-wrap:balance]">
            Combien vaut vraiment <span className="text-amber-300">votre bien</span> à&nbsp;Lyon et autour&nbsp;?
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
            Une estimation appuyée sur les ventes réelles de votre quartier, confirmée sur place par {AGENT.firstName}, conseillère locale. Gratuit et sans engagement.
          </p>

          <form onSubmit={start} className="rounded-2xl bg-white shadow-2xl shadow-black/30 p-2 sm:p-3 flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-2xl text-stone-900" aria-label="Démarrer l'estimation">
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
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0f1f3d] font-bold px-7 py-4 text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2"
            >
              Estimer
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-200">
            {['Résultat en 2 minutes', '100 % gratuit', 'Sans engagement'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 text-xs text-slate-400 max-w-xl">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
            Appuyée sur les prix de vente enregistrés par l'État (base DVF), pas sur des prix d'annonces.
          </p>
        </div>

        {/* Who you will talk to */}
        <aside className="rounded-3xl bg-white text-stone-900 shadow-2xl shadow-black/30 overflow-hidden min-w-0 max-w-md w-full justify-self-center lg:justify-self-end">
          {AGENT.photoUrl ? (
            <img src={AGENT.photoUrl} alt={`${AGENT.name}, conseillère immobilière à Lyon`} width={640} height={480} decoding="async" className="w-full aspect-[4/3] object-cover object-[50%_25%]" />
          ) : (
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center">
              <AgentAvatar size={96} />
            </div>
          )}
          <div className="p-6 space-y-4">
            <div>
              <div className="text-lg font-semibold">{AGENT.name}</div>
              <div className="text-sm text-stone-600">Conseillère immobilière indépendante</div>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              C'est {AGENT.firstName} qui vous accompagne, de l'estimation jusqu'à la visite. Pas de centre d'appels.
            </p>
            <dl className="text-sm space-y-2 border-t border-stone-200 pt-4">
              <div className="flex gap-2">
                <MapPin className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <dd className="text-stone-700">{AGENT.zone}</dd>
              </div>
              <div className="flex gap-2">
                <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <dd className="text-stone-700">Visite de découverte gratuite, sans engagement</dd>
              </div>
            </dl>
            <a
              href={AGENT.phoneHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f1f3d] hover:bg-[#1a3060] px-4 py-3 text-sm font-semibold text-white transition-colors"
            >
              <Phone className="w-4 h-4 text-amber-300" />
              {AGENT.phone}
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
};

type Tone = 'white' | 'cream' | 'navy' | 'gold';
const TONES: Record<Tone, string> = {
  white: 'bg-white',
  cream: 'bg-[#f7f2e8]',
  navy: 'bg-[#0f1f3d] text-white',
  gold: 'bg-gradient-to-br from-amber-400 to-amber-300 text-[#0f1f3d]',
};

/** Full-width horizontal band: gives each part of the page its own background and rhythm. */
const Band: React.FC<{ tone: Tone; children: React.ReactNode; id?: string }> = ({ tone, children, id }) => (
  <div id={id} className={`relative left-1/2 -translate-x-1/2 w-screen ${TONES[tone]}`}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">{children}</div>
  </div>
);

const Eyebrow: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light }) => (
  <p className={`text-xs font-bold uppercase tracking-[0.18em] ${light ? 'text-amber-300' : 'text-amber-600'}`}>{children}</p>
);

const H2: React.FC<{ id: string; children: React.ReactNode; light?: boolean }> = ({ id, children, light }) => (
  <h2 id={id} className={`mt-2 text-3xl sm:text-4xl font-bold tracking-tight [text-wrap:balance] ${light ? 'text-white' : 'text-[#0f1f3d]'}`}>
    {children}
  </h2>
);

const STEPS = [
  {
    icon: Home,
    title: "Répondez à l'assistant",
    text: "Adresse, surface, projet : l'assistant IA de Céline vous guide en quelques clics et affiche votre fourchette de prix.",
  },
  {
    icon: MessageSquare,
    title: 'Choisissez votre créneau',
    text: `L'assistant vous montre les disponibilités réelles de ${AGENT.firstName} et réserve la visite avec vous.`,
  },
  {
    icon: CheckCircle2,
    title: 'Faites confirmer sur place',
    text: 'Une visite sur place, offerte. Vous repartez avec un avis de valeur argumenté.',
  },
];

export const HowItWorks: React.FC = () => (
  <Band tone="white">
    <section aria-labelledby="how-title">
      <div className="text-center max-w-2xl mx-auto">
        <Eyebrow>Simple et rapide</Eyebrow>
        <H2 id="how-title">Comment ça se passe</H2>
      </div>
      <ol className="mt-12 grid md:grid-cols-3 gap-10 md:gap-8 relative">
        <div aria-hidden className="hidden md:block absolute top-8 left-[16%] right-[16%] border-t-2 border-dashed border-amber-300" />
        {STEPS.map((st, i) => (
          <li key={st.title} className="relative text-center px-2">
            <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm ring-4 ring-white">
              <st.icon className="w-7 h-7" />
              <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#0f1f3d] text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
            </div>
            <h3 className="mt-5 text-lg font-bold text-[#0f1f3d]">{st.title}</h3>
            <p className="mt-2 text-stone-600 leading-relaxed">{st.text}</p>
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
        <Eyebrow light>Simulation ou visite ?</Eyebrow>
        <H2 id="why-title" light>Pourquoi une simulation ne suffit pas</H2>
        <p className="mt-4 text-lg text-slate-300 leading-relaxed">
          Un algorithme compare des mètres carrés. Il ne voit pas la lumière de votre séjour, la qualité de la rénovation, le calme de la rue ou la vue. Ce sont ces détails qui font la différence au moment de négocier.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 min-w-0">
        <div className="rounded-2xl bg-white/5 border border-white/15 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">En ligne · 2 minutes</p>
          <h3 className="mt-1 text-lg font-bold text-white">La simulation</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />Fondée sur les ventes réelles</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />Un repère indicatif</li>
            <li className="flex gap-2 text-slate-400"><span className="w-4 text-center shrink-0">–</span>Ne voit pas l'état réel du bien</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-white text-stone-800 border-2 border-amber-400 p-5 shadow-xl sm:-translate-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Gratuite · sans engagement</p>
          <h3 className="mt-1 text-lg font-bold text-[#0f1f3d]">La visite sur place</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />Tient compte de votre bien réel</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />Un avis argumenté, chiffre par chiffre</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />Vous gardez la décision</li>
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
              <Quote className="w-5 h-5 text-amber-600" />
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
          <Eyebrow>FAQ</Eyebrow>
          <H2 id="faq-title">Vos questions</H2>
          <p className="mt-4 text-stone-600 leading-relaxed">Une autre question ? {AGENT.firstName} vous répond directement.</p>
          <a href={AGENT.phoneHref} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0f1f3d] hover:bg-[#1a3060] text-white font-semibold px-5 py-3 transition-colors">
            <Phone className="w-4 h-4 text-amber-300" />
            {AGENT.phone}
          </a>
        </div>
        <div className="space-y-3">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className={`rounded-2xl bg-white border transition-shadow ${isOpen ? 'border-amber-300 shadow-md' : 'border-stone-200'}`}>
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
                    <ChevronDown className={`w-5 h-5 shrink-0 text-amber-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight [text-wrap:balance]">Prêt à connaître la valeur de votre bien&nbsp;?</h2>
        <p className="mt-3 text-lg text-[#0f1f3d]/80 max-w-xl">Deux minutes pour la simulation, une visite gratuite pour affiner. {AGENT.firstName} s'occupe du reste.</p>
      </div>
      <button
        type="button"
        onClick={scrollToSimulator}
        className="inline-flex items-center gap-2 rounded-xl bg-[#0f1f3d] hover:bg-[#1a3060] text-white font-bold px-7 py-4 text-base shadow-xl transition-colors shrink-0"
      >
        Estimer mon bien gratuitement
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
          <span className="font-semibold uppercase tracking-wider text-amber-800">Votre estimation</span>
          <span className="text-base font-bold text-[#0f1f3d]">{priceLabel}</span>
        </div>
      )}
      {unlocked && onBook ? (
        <button
          type="button"
          onClick={onBook}
          className="flex-1 rounded-xl bg-amber-400 active:bg-amber-500 text-[#0f1f3d] font-bold py-3.5 text-sm shadow"
        >
          Réserver ma visite gratuite
        </button>
      ) : (
        <button type="button" onClick={scrollToSimulator} className="flex-1 rounded-xl bg-stone-900 text-white font-semibold py-3 text-sm">
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
        <Eyebrow>Zone d'intervention</Eyebrow>
        <H2 id="zone-title">Estimation immobilière à Lyon, Villeurbanne et en Beaujolais</H2>
        <p className="mt-4 text-stone-600 leading-relaxed">
          {AGENT.name} accompagne les propriétaires de la métropole lyonnaise et du Beaujolais, jusqu'à 50 km autour de Lyon. Votre estimation en ligne s'appuie sur les ventes réellement enregistrées par l'État (base DVF) autour de votre adresse. La visite permet ensuite de tenir compte de ce qu'aucune base de données ne voit : l'état du bien, la luminosité, l'étage, la vue, les travaux réalisés.
        </p>
        <a href="/estimation-immobiliere" className="mt-5 inline-flex items-center gap-2 font-semibold text-[#0f1f3d] underline underline-offset-4">
          Voir les prix par secteur <ArrowRight className="w-4 h-4" />
        </a>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {[
          ['Lyon', '/estimation-immobiliere'],
          ['Villeurbanne', '/estimation-immobiliere/villeurbanne'],
          ['Caluire-et-Cuire', '/estimation-immobiliere/caluire-et-cuire'],
          ['Bron', '/estimation-immobiliere/bron'],
          ['Écully', '/estimation-immobiliere/ecully'],
          ['Villefranche-sur-Saône', '/estimation-immobiliere/villefranche-sur-saone'],
        ].map(([c, href]) => (
          <li key={c}>
            <a href={href} className="flex items-center gap-2 rounded-xl bg-white border border-stone-200 px-4 py-3.5 font-semibold text-[#0f1f3d] hover:border-amber-400 hover:shadow-md transition">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
              {c}
            </a>
          </li>
        ))}
        <li className="col-span-2 rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-600">Beaujolais et communes alentour</li>
      </ul>
    </section>
  </Band>
);

const TEASER = [
  ['estimer-appartement-lyon-criteres-prix', 'Estimation', 'Estimer son appartement à Lyon : les 8 critères qui font varier le prix'],
  ['prix-immobilier-dvf-ventes-reelles-quartier', 'Marché', 'Comment lire les ventes réelles de son quartier (base DVF)'],
  ['documents-vendre-appartement-maison', 'Préparer sa vente', 'Vendre son bien : la liste des documents à rassembler'],
];

/** Internal links to the blog: help visitors and search engines find the guides. */
export const BlogTeaser: React.FC = () => (
  <Band tone="white">
    <section aria-labelledby="blog-teaser-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Conseils</Eyebrow>
          <H2 id="blog-teaser-title">Préparer votre vente</H2>
        </div>
        <a href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f1f3d] underline underline-offset-4">Tous les conseils <ArrowRight className="w-4 h-4" /></a>
      </div>
      <ul className="mt-8 grid md:grid-cols-3 gap-5">
        {TEASER.map(([slug, cat, title]) => (
          <li key={slug}>
            <a href={`/blog/${slug}`} className="group flex h-full flex-col rounded-2xl bg-[#f7f2e8] border border-transparent p-6 hover:border-amber-300 hover:shadow-lg transition">
              <span className="self-start rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">{cat}</span>
              <span className="mt-4 flex-1 text-lg font-bold leading-snug text-[#0f1f3d]">{title}</span>
              <span className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-amber-700">Lire l'article <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  </Band>
);
