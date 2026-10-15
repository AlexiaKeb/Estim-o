import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarCheck, CheckCircle2, ChevronDown, Compass, Home, MapPin, MessageSquare, Phone, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { AddressSearch, AddressSuggestion } from './AddressSearch';
import { AGENT, FAQ } from '../data/siteContent';
import { Reveal, scrollToSimulator, TEASER } from './LandingSections';

// Page d'accueil « startup » : fond clair, dégradé indigo → cyan, grands arrondis, mouvements doux.
const GRAD = 'from-indigo-600 via-violet-500 to-cyan-400';
const INK = 'text-[#0b1020]';
const lastName = AGENT.name.split(' ').slice(1).join(' ').toUpperCase();

const Avatar: React.FC<{ size: number }> = ({ size }) =>
  AGENT.photoUrl ? (
    <img src={AGENT.photoUrl} alt="" width={size} height={size} className="rounded-full object-cover object-[50%_20%] ring-2 ring-white" style={{ width: size, height: size }} />
  ) : (
    <span className={`flex items-center justify-center rounded-full bg-gradient-to-br ${GRAD} text-white font-extrabold`} style={{ width: size, height: size }}>{AGENT.firstName[0]}</span>
  );

type DemoMsg = { who: 'bot' | 'me'; text: string };
const DEMO: DemoMsg[] = [
  { who: 'bot', text: "Bonjour ! Je suis l'assistant (IA) de Céline. Quelle est l'adresse du bien ?" },
  { who: 'me', text: '12 rue Mercière, Lyon 2e' },
  { who: 'bot', text: 'Quelle est sa surface, en m² ?' },
  { who: 'me', text: '78 m²' },
];

/** Aperçu animé de l'assistant (exemple illustratif, pas une vraie estimation). */
const Phone3: React.FC = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setStep(DEMO.length + 1); return; }
    const t = window.setInterval(() => setStep((n) => (n >= DEMO.length + 3 ? 0 : n + 1)), 1700);
    return () => window.clearInterval(t);
  }, []);
  const showResult = step >= DEMO.length + 1;
  return (
    <div className="float-slow relative mx-auto w-[16.5rem] sm:w-[18.5rem] rounded-[2.6rem] bg-[#0b1020] p-2 shadow-[0_40px_90px_-20px_rgba(79,70,229,.55)]" aria-hidden="true">
      <div className="overflow-hidden rounded-[2.1rem] bg-white">
        <div className={`flex items-center gap-2.5 bg-gradient-to-r ${GRAD} px-4 py-3`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-[11px] font-extrabold text-white">IA</span>
          <div><p className="text-[13px] font-bold leading-tight text-white">Assistant Estimation</p><p className="text-[10px] leading-tight text-white/80">● En ligne • réponse en 2 min</p></div>
        </div>
        <div className="h-[21.5rem] space-y-2 bg-slate-50 px-3 py-3 text-[12.5px] leading-snug">
          {DEMO.slice(0, Math.min(step, DEMO.length)).map((m, i) => (
            <div key={i} className={`pop-in flex ${m.who === 'me' ? 'justify-end' : ''}`}>
              <span className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.who === 'me' ? `rounded-br-md bg-gradient-to-r ${GRAD} text-white` : 'rounded-bl-md bg-white text-slate-800 shadow-sm ring-1 ring-black/5'}`}>{m.text}</span>
            </div>
          ))}
          {step >= 1 && step < DEMO.length + 1 && step % 2 === 0 && <div className="pop-in flex"><span className="rounded-2xl rounded-bl-md bg-white px-3 py-2 text-slate-400 shadow-sm ring-1 ring-black/5">• • •</span></div>}
          {showResult && (
            <div className="pop-in rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-600">Estimation indicative (IA) • exemple</p>
              <div className="mt-1 flex items-center justify-between text-[15px] font-extrabold text-[#0b1020]"><span>412 000 €</span><span>468 000 €</span></div>
              <div className="relative my-2.5 h-2 rounded-full bg-gradient-to-r from-rose-300 via-amber-200 to-emerald-300">
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#0b1020] px-2 py-0.5 text-[9px] font-bold text-white">🔒 Prix juste à fixer sur place</span>
              </div>
              <p className={`mt-3 rounded-xl bg-gradient-to-r ${GRAD} px-3 py-2 text-center text-[11px] font-extrabold text-white`}>Réserver ma visite offerte</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Chip: React.FC<{ icon: React.ReactNode; title: string; sub?: string; className?: string; delay?: string }> = ({ icon, title, sub, className = '', delay }) => (
  <div className={`float-slow absolute hidden md:flex items-center gap-3 rounded-2xl bg-white/90 p-3 pr-5 shadow-xl ring-1 ring-black/5 backdrop-blur ${className}`} style={{ animationDelay: delay }}>
    <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${GRAD} text-white`}>{icon}</span>
    <span><span className={`block text-[13px] font-extrabold leading-tight ${INK}`}>{title}</span>{sub && <span className="block text-[11px] leading-tight text-slate-500">{sub}</span>}</span>
  </div>
);

export const StartupHero: React.FC<{ onStart: (a: { address: string; postalCode?: string; city?: string }) => void }> = ({ onStart }) => {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<AddressSuggestion | null>(null);
  const start = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (picked && picked.label === text) onStart({ address: picked.street, postalCode: picked.postalCode, city: picked.city });
    else onStart({ address: text.trim() });
  };
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] bg-white px-5 pt-12 pb-16 ring-1 ring-black/5 shadow-[0_30px_80px_-30px_rgba(79,70,229,.35)] sm:px-10 sm:pt-16 lg:pt-20">
      <div aria-hidden className="drift pointer-events-none absolute -left-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-indigo-400/30 blur-3xl" />
      <div aria-hidden className="drift pointer-events-none absolute -right-24 top-10 h-[24rem] w-[24rem] rounded-full bg-cyan-300/40 blur-3xl" style={{ animationDelay: '2s' }} />
      <div aria-hidden className="drift pointer-events-none absolute bottom-0 left-1/3 h-[20rem] w-[20rem] rounded-full bg-fuchsia-300/25 blur-3xl" style={{ animationDelay: '4s' }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(#c7d2fe 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'linear-gradient(to bottom, black, transparent 70%)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 70%)' }} />

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> Lyon &amp; Beaujolais • Estimation par IA, validée par une experte
        </p>
        <h1 className={`mt-6 text-[2.5rem] font-extrabold leading-[1.04] tracking-tight [text-wrap:balance] sm:text-6xl lg:text-7xl ${INK}`}>
          Estimez votre bien à Lyon{' '}
          <span className={`grad-text bg-gradient-to-r ${GRAD} to-indigo-600 bg-clip-text text-transparent`}>en 2 minutes.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-xl">
          Une fourchette de prix basée sur les ventes réelles de votre quartier. Puis {AGENT.firstName} vient la valider chez vous, gratuitement.
        </p>

        <form onSubmit={start} className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-[1.75rem] bg-white p-2.5 text-left shadow-[0_20px_60px_-15px_rgba(79,70,229,.45)] ring-1 ring-indigo-100 sm:flex-row sm:gap-3 sm:p-3" aria-label="Démarrer l'estimation">
          <label htmlFor="hero-address" className="sr-only">Adresse du bien</label>
          <AddressSearch
            id="hero-address"
            size="lg"
            value={text}
            onChange={(t) => { setText(t); setPicked(null); }}
            onSelect={(s) => { setPicked(s); setText(s.label); }}
            placeholder="Adresse de votre bien"
            className="min-w-0 flex-1"
          />
          <button
            type="submit"
            id="btn-hero-start"
            className={`group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${GRAD} px-8 py-4 text-base font-extrabold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2`}
          >
            Estimer
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        <ul className="mt-6 flex flex-wrap justify-center gap-2.5 text-sm font-semibold text-slate-700">
          {['100 % gratuit', 'Sans engagement', 'Sans inscription'].map((t) => (
            <li key={t} className="flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 ring-1 ring-slate-200 backdrop-blur"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{t}</li>
          ))}
        </ul>
      </div>

      <div className="relative mx-auto mt-14 max-w-4xl">
        <Phone3 />
        <Chip icon={<MapPin className="h-5 w-5" />} title="Ventes réelles du quartier" sub="Base DVF de l'État" className="left-0 top-10 lg:-left-6" />
        <Chip icon={<Zap className="h-5 w-5" />} title="Fourchette en 2 minutes" sub="Sans rien télécharger" className="left-10 bottom-16 lg:left-2" delay="1.5s" />
        <div className="float-slow absolute right-0 top-14 hidden items-center gap-3 rounded-2xl bg-white/90 p-2.5 pr-5 shadow-xl ring-1 ring-black/5 backdrop-blur md:flex lg:-right-6" style={{ animationDelay: '.8s' }}>
          <Avatar size={46} />
          <span><span className={`block text-[13px] font-extrabold leading-tight ${INK}`}>{AGENT.firstName} {lastName}</span><span className="block text-[11px] leading-tight text-slate-500">Votre experte locale</span></span>
        </div>
        <Chip icon={<Home className="h-5 w-5" />} title="Visite offerte" sub="Avis de valeur sous 48 h" className="right-8 bottom-20 lg:right-0" delay="2.2s" />
      </div>
    </section>
  );
};

/** Bandeau défilant : les faits sur lesquels repose la page (aucun chiffre inventé). */
export const TrustMarquee: React.FC = () => {
  const items = ['Prix de vente réels (DVF, État)', 'Adresses officielles (BAN)', 'Agenda en temps réel', 'Visite offerte et sans engagement', 'Avis de valeur sous 48 h', 'Une seule interlocutrice : ' + AGENT.firstName];
  return (
    <div className="relative overflow-hidden rounded-full bg-[#0b1020] py-3.5 text-sm font-semibold text-white" aria-hidden="true">
      <div className="marquee flex w-max gap-10 whitespace-nowrap">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-10">{t}<span className="text-cyan-300">✦</span></span>
        ))}
      </div>
    </div>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-indigo-700">{children}</p>
);

/** « Comment ça marche » en blocs façon application. */
export const HowBento: React.FC = () => (
  <section aria-labelledby="how-title">
    <Reveal className="mx-auto max-w-2xl text-center">
      <Eyebrow>Comment ça marche</Eyebrow>
      <h2 id="how-title" className={`mt-3 text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-5xl ${INK}`}>Trois étapes. Zéro paperasse.</h2>
    </Reveal>
    <div className="mt-10 grid gap-4 md:grid-cols-6">
      <Reveal className="md:col-span-3">
        <div className="group relative h-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-50 to-white p-7 ring-1 ring-indigo-100 transition-all hover:-translate-y-1 hover:shadow-xl">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${GRAD} text-white shadow-lg`}><MessageSquare className="h-6 w-6" /></span>
          <p className="mt-1 text-xs font-extrabold text-indigo-500">ÉTAPE 1</p>
          <h3 className={`mt-1 text-2xl font-extrabold ${INK}`}>Évaluez votre bien en ligne</h3>
          <p className="mt-2 text-slate-600">Adresse, surface, quelques questions : l'assistant calcule tout de suite une première fourchette de prix.</p>
          <div className="mt-6 rounded-2xl bg-white p-4 shadow-md ring-1 ring-black/5">
            <div className="flex items-center justify-between text-sm font-extrabold text-[#0b1020]"><span>Fourchette IA</span><span className="text-xs font-bold text-slate-400">exemple</span></div>
            <div className="mt-3 h-2.5 rounded-full bg-gradient-to-r from-rose-300 via-amber-200 to-emerald-300" />
          </div>
        </div>
      </Reveal>
      <Reveal className="md:col-span-3" delay={120}>
        <div className="group relative h-full overflow-hidden rounded-[2rem] bg-[#0b1020] p-7 text-white transition-all hover:-translate-y-1 hover:shadow-2xl">
          <div aria-hidden className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-indigo-500/40 blur-3xl" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-300"><CalendarCheck className="h-6 w-6" /></span>
          <p className="relative mt-1 text-xs font-extrabold text-cyan-300">ÉTAPE 2</p>
          <h3 className="relative mt-1 text-2xl font-extrabold">Choisissez votre créneau</h3>
          <p className="relative mt-2 text-slate-300">Les vraies disponibilités de {AGENT.firstName}, en direct. Un rendez-vous en quelques secondes.</p>
          <div className="relative mt-6 flex flex-wrap gap-2">
            {['Mer. 09:00', 'Jeu. 10:30', 'Ven. 14:00', 'Lun. 16:00'].map((t, i) => (
              <span key={t} className={`rounded-xl px-3.5 py-2 text-sm font-bold ${i === 1 ? `bg-gradient-to-r ${GRAD} text-white shadow-lg` : 'bg-white/10 text-slate-200'}`}>{t}</span>
            ))}
          </div>
        </div>
      </Reveal>
      <Reveal className="md:col-span-6" delay={200}>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-cyan-50 via-white to-indigo-50 p-7 ring-1 ring-cyan-100 transition-all hover:-translate-y-1 hover:shadow-xl md:flex md:items-center md:gap-8">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${GRAD} text-white shadow-lg`}><ShieldCheck className="h-6 w-6" /></span>
          <div className="mt-3 md:mt-0">
            <p className="text-xs font-extrabold text-cyan-600">ÉTAPE 3</p>
            <h3 className={`text-2xl font-extrabold ${INK}`}>{AGENT.firstName} valide l'estimation chez vous</h3>
            <p className="mt-1 max-w-2xl text-slate-600">L'estimation IA est un indicateur. Seule la visite sur place permet de fixer le prix juste. Sous 48 h, vous recevez votre avis de valeur détaillé.</p>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

const BLIND = ['La lumière et la vue', "L'état réel et les travaux", "L'étage, le calme, le vis-à-vis", 'Les matériaux et les prestations', 'Le quartier tel qu\'il se vit', "La demande réelle du secteur"];
const SEEN = ['Adresse et quartier', 'Surface et nombre de pièces', 'Ventes réelles proches (DVF)'];

/** IA vs experte : ce que chacun voit. */
export const AiVsHuman: React.FC = () => {
  const [mode, setMode] = useState<'ai' | 'human'>('human');
  return (
    <section aria-labelledby="why-title" className="overflow-hidden rounded-[2.5rem] bg-[#0b1020] px-6 py-14 text-white sm:px-12 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-cyan-300">IA + humain</p>
        <h2 id="why-title" className="mt-3 text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-5xl">L'algorithme calcule. {AGENT.firstName} comprend.</h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-300">Une IA compare des chiffres. Elle ne perçoit ni la lumière de votre séjour, ni la qualité d'une rénovation. C'est pour ça que la visite compte.</p>
        <div role="tablist" aria-label="Ce que chacun voit" className="mx-auto mt-8 inline-flex rounded-full bg-white/10 p-1">
          {([['ai', '🤖 Ce que voit l\'IA'], ['human', `🏠 Ce que voit ${AGENT.firstName}`]] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${mode === k ? `bg-gradient-to-r ${GRAD} text-white shadow-lg` : 'text-slate-300 hover:text-white'}`}>{l}</button>
          ))}
        </div>
      </div>
      <ul className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
        {SEEN.map((t) => (
          <li key={t} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3.5 font-semibold ring-1 ring-white/10"><CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-300" />{t}</li>
        ))}
        {BLIND.map((t) => (
          <li key={t} className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 font-semibold ring-1 transition-all duration-500 ${mode === 'human' ? `bg-gradient-to-r ${GRAD} text-white ring-white/30 shadow-lg` : 'bg-white/[0.03] text-slate-500 ring-white/5'}`}>
            {mode === 'human' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <span className="flex h-5 w-5 shrink-0 items-center justify-center text-xs">🔒</span>}{t}
          </li>
        ))}
      </ul>
    </section>
  );
};

export const MeetAgent: React.FC = () => (
  <section aria-labelledby="agent-title" className="grid items-center gap-8 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6 ring-1 ring-indigo-100 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
    <Reveal>
      <div className="relative mx-auto max-w-sm">
        <div aria-hidden className={`absolute -inset-3 rounded-[2.2rem] bg-gradient-to-br ${GRAD} opacity-40 blur-xl`} />
        {AGENT.photoUrl ? (
          <img src={AGENT.photoUrl} alt={`${AGENT.name}, conseillère immobilière à Lyon`} width={640} height={720} loading="lazy" className="relative aspect-[4/4.4] w-full rounded-[2rem] object-cover object-[50%_20%] shadow-2xl ring-4 ring-white" />
        ) : (
          <div className={`relative flex aspect-[4/4.4] items-center justify-center rounded-[2rem] bg-gradient-to-br ${GRAD} text-7xl font-extrabold text-white`}>{AGENT.firstName[0]}</div>
        )}
        <div className="absolute -bottom-4 left-4 right-4 rounded-2xl bg-white/95 px-4 py-3 shadow-xl ring-1 ring-black/5 backdrop-blur">
          <p className={`font-extrabold ${INK}`}>{AGENT.firstName} {lastName}</p>
          <p className="text-xs text-slate-500">Votre experte immobilière locale</p>
        </div>
      </div>
    </Reveal>
    <Reveal delay={150}>
      <Eyebrow>Votre interlocutrice</Eyebrow>
      <h2 id="agent-title" className={`mt-3 text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-4xl ${INK}`}>Une vraie personne, pas un centre d'appels.</h2>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">Un accompagnement sur mesure, de l'estimation jusqu'à la signature. Un seul interlocuteur direct, sans intermédiaire.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {[['🚗', 'Déplacement offert'], ['⏱️', 'Avis de valeur sous 48 h'], ['🤝', 'Sans engagement'], ['📍', AGENT.zone]].map(([e, t]) => (
          <li key={t} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-800 shadow-sm ring-1 ring-slate-100"><span className="text-xl">{e}</span>{t}</li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={scrollToSimulator} className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r ${GRAD} px-6 py-3.5 font-extrabold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5`}>Estimer mon bien <ArrowRight className="h-5 w-5" /></button>
        <a href={AGENT.phoneHref} className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50"><Phone className="h-4 w-4 text-indigo-600" />{AGENT.phone}</a>
      </div>
    </Reveal>
  </section>
);

const ZONES: Array<[string, string]> = [
  ['Métropole de Lyon', 'Grand Lyon, Nord & Ouest Lyonnais'],
  ["Val de Saône & Monts d'Or", 'Entre Saône et collines'],
  ['Beaujolais & Pierres Dorées', 'Villages et vignes'],
  ['Villefranche & alentours', 'Capitale du Beaujolais'],
];
export const ZoneBento: React.FC = () => (
  <section aria-labelledby="zone-title" className="grid items-center gap-10 lg:grid-cols-2">
    <Reveal>
      <Eyebrow>Secteur d'expertise</Eyebrow>
      <h2 id="zone-title" className={`mt-3 text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-4xl ${INK}`}>Une experte du terrain, de Lyon au Beaujolais.</h2>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">{AGENT.firstName} intervient exclusivement dans la région lyonnaise et le Beaujolais : elle maîtrise les micromarchés locaux, rue par rue.</p>
    </Reveal>
    <div className="grid gap-3 sm:grid-cols-2">
      {ZONES.map(([t, sub], i) => (
        <Reveal key={t} delay={i * 90}>
          <div className="h-full rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-1 hover:shadow-lg">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${GRAD} text-white`}><Compass className="h-5 w-5" /></span>
            <p className={`mt-3 font-extrabold ${INK}`}>{t}</p>
            <p className="text-sm text-slate-500">{sub}</p>
          </div>
        </Reveal>
      ))}
    </div>
  </section>
);

export const BlogCards: React.FC = () => (
  <section aria-labelledby="blog-teaser-title">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Eyebrow>L'avis de l'expert</Eyebrow>
        <h2 id="blog-teaser-title" className={`mt-3 max-w-2xl text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-4xl ${INK}`}>Vendre à sa vraie valeur : nos conseils</h2>
      </div>
      <a href="/blog" className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-200">Tous les conseils <ArrowRight className="h-4 w-4" /></a>
    </div>
    <ul className="mt-8 grid gap-4 md:grid-cols-3">
      {TEASER.map(([slug, cat, title], i) => (
        <li key={slug}>
          <Reveal delay={i * 100} className="h-full">
            <a href={`/blog/${slug}`} className="group flex h-full flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl">
              <span className={`self-start rounded-full bg-gradient-to-r ${GRAD} px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white`}>{cat}</span>
              <span className={`mt-4 flex-1 text-lg font-extrabold leading-snug ${INK}`}>{title}</span>
              <span className="mt-5 flex items-center gap-1.5 text-sm font-bold text-indigo-600">Lire l'article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </a>
          </Reveal>
        </li>
      ))}
    </ul>
  </section>
);

export const FaqModern: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section aria-labelledby="faq-title" className="grid gap-10 lg:grid-cols-[1fr_1.7fr]">
      <div>
        <Eyebrow>Questions fréquentes</Eyebrow>
        <h2 id="faq-title" className={`mt-3 text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-4xl ${INK}`}>Toutes les réponses sur votre estimation</h2>
        <p className="mt-4 text-slate-600">Une question spécifique ? {AGENT.firstName} vous répond directement par téléphone.</p>
        <a href={AGENT.phoneHref} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#0b1020] px-5 py-3 font-bold text-white transition-colors hover:bg-slate-800"><Phone className="h-4 w-4 text-cyan-300" />{AGENT.phone}</a>
      </div>
      <div className="space-y-3">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className={`rounded-3xl bg-white ring-1 transition-all ${isOpen ? 'shadow-lg ring-indigo-200' : 'ring-slate-100 hover:ring-slate-200'}`}>
              <h3>
                <button type="button" id={`faq-btn-${i}`} aria-expanded={isOpen} aria-controls={`faq-panel-${i}`} onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 rounded-3xl px-5 py-4 text-left font-bold text-[#0b1020] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                  <span>{item.q}</span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${isOpen ? `bg-gradient-to-br ${GRAD} text-white rotate-180` : 'bg-slate-100 text-slate-500'}`}><ChevronDown className="h-4 w-4" /></span>
                </button>
              </h3>
              {isOpen && <div id={`faq-panel-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} className="px-5 pb-5 leading-relaxed text-slate-600">{item.a}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const FinalCtaModern: React.FC = () => (
  <section className={`relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${GRAD} px-6 py-14 text-center text-white shadow-2xl shadow-indigo-500/30 sm:px-12 sm:py-20`}>
    <div aria-hidden className="drift absolute -left-10 -top-10 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
    <div aria-hidden className="drift absolute -bottom-16 right-0 h-64 w-64 rounded-full bg-fuchsia-300/30 blur-3xl" style={{ animationDelay: '3s' }} />
    <div className="relative mx-auto max-w-2xl">
      <h2 className="text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-5xl">Prêt à connaître la valeur de votre bien ?</h2>
      <p className="mt-4 text-lg text-white/90">2 minutes en ligne, une visite offerte pour valider. {AGENT.firstName} s'occupe de tout.</p>
      <button type="button" onClick={scrollToSimulator} className="group mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-extrabold text-[#0b1020] shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl">
        Lancer mon estimation gratuite
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  </section>
);
