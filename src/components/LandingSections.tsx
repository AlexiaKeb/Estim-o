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
import { AGENT, FAQ, KEY_FIGURES, TESTIMONIALS } from '../data/siteContent';

const scrollToSimulator = () => {
  document.getElementById('simulateur')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => document.getElementById('input-address')?.focus({ preventScroll: true }), 450);
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

/** Above the fold: one promise, one action, proof of who is behind it. */
export const LandingHero: React.FC = () => (
  <section className="relative overflow-hidden rounded-2xl bg-stone-900 text-stone-100 border border-stone-800">
    <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
    <div className="relative grid lg:grid-cols-[1.35fr_1fr] gap-8 p-6 sm:p-9 lg:p-12 items-center">
      <div className="space-y-6 min-w-0">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-300">
          <MapPin className="w-3.5 h-3.5" />
          Estimation immobilière à Lyon, Villeurbanne et Beaujolais
        </p>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] text-white [text-wrap:balance]">
          Combien vaut vraiment votre bien à {AGENT.city}&nbsp;?
        </h1>

        <p className="text-base sm:text-lg text-stone-300 leading-relaxed max-w-xl">
          Obtenez une fourchette de prix en 2 minutes, puis faites-la confirmer sur place par {AGENT.firstName}, conseillère locale. Sans frais, sans engagement.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <button
            type="button"
            id="btn-hero-start"
            onClick={scrollToSimulator}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold px-6 py-3.5 text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
          >
            Estimer mon bien gratuitement
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <a
            href={AGENT.phoneHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-600 hover:border-stone-400 px-5 py-3.5 text-sm font-medium text-stone-100 transition-colors"
          >
            <Phone className="w-4 h-4 text-amber-300" />
            {AGENT.phone}
          </a>
        </div>

        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-300">
          {['2 minutes', '100 % gratuit', 'Sans engagement', 'Sans document à fournir'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Who you will talk to */}
      <aside className="rounded-2xl bg-stone-800/70 border border-stone-700 p-6 space-y-4 min-w-0">
        <div className="flex items-center gap-4">
          <AgentAvatar size={64} />
          <div className="min-w-0">
            <div className="font-semibold text-white">{AGENT.name}</div>
            <div className="text-sm text-stone-300">
              Conseillère immobilière, {AGENT.agency}
            </div>
          </div>
        </div>
        <p className="text-sm text-stone-300 leading-relaxed">
          C'est {AGENT.firstName} qui vous accompagne, de l'estimation jusqu'à la visite. Vous n'êtes pas rappelé par un call center.
        </p>
        <dl className="text-sm space-y-2 border-t border-stone-700 pt-4">
          <div className="flex gap-2">
            <MapPin className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
            <dd className="text-stone-300">{AGENT.zone}</dd>
          </div>
          <div className="flex gap-2">
            <Clock className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
            <dd className="text-stone-300">Visite de découverte : environ 20 minutes</dd>
          </div>
        </dl>
      </aside>
    </div>
  </section>
);

const STEPS = [
  {
    icon: Home,
    title: 'Décrivez votre bien',
    text: 'Adresse, surface, nombre de pièces. Deux minutes suffisent pour obtenir une première fourchette.',
  },
  {
    icon: MessageSquare,
    title: `Échangez avec ${AGENT.firstName}`,
    text: 'Quelques questions sur votre projet pour préparer la suite, par messagerie ou par téléphone.',
  },
  {
    icon: CheckCircle2,
    title: 'Faites confirmer sur place',
    text: 'Une visite de 20 minutes, offerte. Vous repartez avec un avis de valeur argumenté.',
  },
];

export const HowItWorks: React.FC = () => (
  <section aria-labelledby="how-title" className="space-y-6">
    <h2 id="how-title" className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 [text-wrap:balance]">
      Comment ça se passe
    </h2>
    <ol className="grid md:grid-cols-3 gap-4">
      {STEPS.map((s, i) => (
        <li key={s.title} className="rounded-xl bg-white border border-stone-200 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-stone-900 text-white text-sm font-semibold flex items-center justify-center">
              {i + 1}
            </span>
            <s.icon className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="font-semibold text-stone-900">{s.title}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{s.text}</p>
        </li>
      ))}
    </ol>
  </section>
);

export const WhyOnSite: React.FC = () => (
  <section aria-labelledby="why-title" className="rounded-2xl bg-stone-100 border border-stone-200 p-6 sm:p-10 grid md:grid-cols-2 gap-8">
    <div className="space-y-3 min-w-0">
      <h2 id="why-title" className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 [text-wrap:balance]">
        Pourquoi une simulation ne suffit pas
      </h2>
      <p className="text-stone-600 leading-relaxed">
        Un algorithme compare des mètres carrés. Il ne voit pas la lumière de votre séjour, la qualité de la rénovation, le calme de la rue ou la vue. Ce sont ces détails qui font la différence au moment de négocier.
      </p>
    </div>
    <ul className="space-y-3 min-w-0">
      {[
        ['Simulation en ligne', 'Un repère indicatif, en 2 minutes.'],
        ['Visite sur place', 'Un avis de valeur qui tient compte de votre bien réel.'],
        ['Avis établi en équipe', 'La valeur finale est discutée collégialement, pas décidée seul.'],
      ].map(([t, d]) => (
        <li key={t} className="flex gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-stone-900">{t}</div>
            <div className="text-sm text-stone-600">{d}</div>
          </div>
        </li>
      ))}
    </ul>
  </section>
);

/** Renders only with real data (see src/data/siteContent.ts). */
export const SocialProof: React.FC = () => {
  if (TESTIMONIALS.length === 0 && KEY_FIGURES.length === 0) return null;
  return (
    <section aria-labelledby="proof-title" className="space-y-6">
      <h2 id="proof-title" className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900">
        Ils ont confié leur bien à {AGENT.firstName}
      </h2>
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
  );
};

export const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section aria-labelledby="faq-title" className="space-y-6">
      <h2 id="faq-title" className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900">
        Vos questions
      </h2>
      <div className="rounded-xl bg-white border border-stone-200 divide-y divide-stone-200">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q}>
              <h3>
                <button
                  type="button"
                  id={`faq-btn-${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 font-semibold text-stone-900 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-inset"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-stone-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
  );
};

export const FinalCta: React.FC = () => (
  <section className="rounded-2xl bg-stone-900 text-white p-8 sm:p-12 text-center space-y-5">
    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight [text-wrap:balance]">
      Prêt à connaître la valeur de votre bien&nbsp;?
    </h2>
    <p className="text-stone-300 max-w-xl mx-auto">Deux minutes pour la simulation, vingt minutes pour la visite. Le reste est entre vos mains.</p>
    <button
      type="button"
      onClick={scrollToSimulator}
      className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold px-6 py-3.5 transition-colors"
    >
      Estimer mon bien gratuitement
      <ArrowRight className="w-4 h-4" />
    </button>
  </section>
);

/** Mobile only: the action stays one tap away while the visitor reads. */
export const StickyMobileCta: React.FC = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 560);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
  <div
    className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-stone-200 px-4 pt-3 flex gap-2"
    style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
  >
    <button
      type="button"
      onClick={scrollToSimulator}
      className="flex-1 rounded-xl bg-stone-900 text-white font-semibold py-3 text-sm"
    >
      Estimer mon bien
    </button>
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
