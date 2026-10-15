import React, { useEffect, useRef, useState } from 'react';
import { Robot } from './Mascots';

export interface QuickAnswers {
  ownership?: 'seul' | 'plusieurs' | 'pas_encore';
  mandate?: 'aucun' | 'estimations' | 'simple' | 'exclusif';
  occupancy?: 'occupe' | 'libre' | 'loue';
  condition?: 'refait' | 'bon' | 'rafraichir' | 'travaux';
  purchase?: 'aucun' | 'recherche' | 'trouve';
  extras?: string[];
  profession?: string;
  expectedPrice?: number;
}

interface Props {
  leadId?: string;
  low?: number;
  high?: number;
  onSubmitted: (a: QuickAnswers) => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Choice = Array<[string, string]>;
type Step =
  | { key: 'ownership' | 'mandate' | 'occupancy' | 'condition' | 'purchase'; kind: 'single'; ask: string; options: Choice }
  | { key: 'extras'; kind: 'multi'; ask: string; options: Choice }
  | { key: 'profession'; kind: 'text'; ask: string; placeholder: string }
  | { key: 'expectedPrice'; kind: 'price'; ask: string };

const STEPS: Step[] = [
  { key: 'ownership', kind: 'single', ask: 'Pour commencer : vous êtes…', options: [['seul', 'Seul propriétaire'], ['plusieurs', 'Plusieurs propriétaires'], ['pas_encore', 'Pas encore propriétaire']] },
  { key: 'profession', kind: 'text', ask: 'Quel est votre métier ?', placeholder: 'Ex : infirmière, artisan, retraité…' },
  { key: 'mandate', kind: 'single', ask: 'Avez-vous déjà reçu une estimation, ou signé un mandat de vente ?', options: [['aucun', 'Non, aucune'], ['estimations', "Estimation reçue, sans mandat"], ['simple', 'Oui, mandat simple'], ['exclusif', 'Oui, mandat exclusif']] },
  { key: 'occupancy', kind: 'single', ask: 'Votre bien est…', options: [['occupe', 'Occupé par moi'], ['libre', 'Libre'], ['loue', 'Loué']] },
  { key: 'condition', kind: 'single', ask: 'Dans quel état est-il ?', options: [['refait', 'Refait à neuf'], ['bon', 'Bon état général'], ['rafraichir', 'À rafraîchir'], ['travaux', 'Travaux importants à prévoir']] },
  { key: 'purchase', kind: 'single', ask: 'Un achat est-il lié à votre vente ?', options: [['aucun', 'Non, je ne rachète pas'], ['recherche', 'Je cherche mon prochain bien'], ['trouve', "J'ai déjà trouvé"]] },
  { key: 'extras', kind: 'multi', ask: 'Quels atouts a votre bien ? Plusieurs choix possibles.', options: [['balcon', 'Balcon / terrasse'], ['jardin', 'Jardin'], ['parking', 'Garage / parking'], ['cave', 'Cave'], ['ascenseur', 'Ascenseur']] },
  { key: 'expectedPrice', kind: 'price', ask: 'Dernière question : quel prix espérez-vous ? (facultatif)' },
];

interface Msg { from: 'bot' | 'user'; text: string }

const chip = 'rounded-full border-[3px] border-white bg-white px-4 py-2.5 text-sm font-bold text-[#0B0F1F] transition-colors hover:bg-[#FFF7E6]';
const chipStrong = 'rounded-full border-[3px] border-white bg-[#FFD60A] px-4 py-2.5 text-sm font-black text-[#0B0F1F] transition-colors hover:brightness-95';
const field = 'w-full rounded-xl border-[3px] border-white bg-white px-4 py-3 text-base font-medium text-[#0B0F1F] placeholder:text-[#0B0F1F]/50 focus:outline-none focus:ring-4 focus:ring-[#FFD60A]';

/** Conversational complementary questions shown once the visit is confirmed: the robot asks, the visitor taps. Fully optional. */
export const QuickQualification: React.FC<Props> = ({ leadId, low, high, onSubmitted }) => {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: "Votre rendez-vous est confirmé ! Quelques questions rapides, si vous le souhaitez, pour que Céline connaisse déjà bien votre projet." }]);
  const [idx, setIdx] = useState(-1); // -1 = intro shown, waiting for "C'est parti"
  const [typing, setTyping] = useState(false);
  const [answers, setAnswers] = useState<QuickAnswers>({});
  const [multi, setMulti] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [state, setState] = useState<'chat' | 'sending' | 'done'>('chat');
  const pending = useRef<QuickAnswers | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing, idx]);

  const botSays = (t: string, then?: () => void) => {
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { from: 'bot', text: t }]);
      then?.();
    }, 650);
  };

  const send = async (payload: QuickAnswers) => {
    try {
      await fetch('/api/supabase/qualification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, ...payload }),
      });
    } catch {
      /* the visit is booked anyway: answers are a bonus */
    }
    setState('done');
  };

  // The lead id can arrive a moment late: wait for it instead of losing the answers
  useEffect(() => {
    if (state === 'sending' && pending.current && leadId && UUID_RE.test(leadId)) {
      const p = pending.current;
      pending.current = null;
      void send(p);
    }
  }, [state, leadId]);

  const finish = (final: QuickAnswers) => {
    const has = Object.values(final).some((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== ''));
    setIdx(STEPS.length);
    botSays(has ? 'Merci ! Vos réponses sont transmises à Céline : elle pourra préparer votre rendez-vous.' : 'Pas de souci, Céline vous posera ces questions sur place. À très bientôt !');
    if (has) {
      onSubmitted(final);
      pending.current = final;
      setState('sending');
    } else {
      setState('done');
    }
  };

  const advance = (final: QuickAnswers, userText: string | null, from: number) => {
    if (userText) setMsgs((m) => [...m, { from: 'user', text: userText }]);
    setAnswers(final);
    setText('');
    setMulti([]);
    const next = from + 1;
    if (next >= STEPS.length) return finish(final);
    setIdx(next);
    botSays(STEPS[next].ask);
  };

  const start = () => {
    setMsgs((m) => [...m, { from: 'user', text: "C'est parti" }]);
    setIdx(0);
    botSays(STEPS[0].ask);
  };

  const step = idx >= 0 && idx < STEPS.length ? STEPS[idx] : null;
  const over = idx >= STEPS.length;

  const controls = (() => {
    if (typing || over) return null;
    if (idx === -1)
      return (
        <div className="flex flex-wrap gap-2">
          <button type="button" id="btn-quick-start" className={chipStrong} onClick={start}>C'est parti</button>
          <button type="button" className={chip} onClick={() => finish({})}>Plus tard</button>
        </div>
      );
    if (!step) return null;
    if (step.kind === 'single')
      return (
        <div className="flex flex-wrap gap-2">
          {step.options.map(([v, l]) => (
            <button key={v} type="button" className={chip} onClick={() => advance({ ...answers, [step.key]: v } as QuickAnswers, l, idx)}>{l}</button>
          ))}
          <button type="button" className="px-2 text-xs font-semibold text-white/70 underline underline-offset-2" onClick={() => advance(answers, 'Je passe', idx)}>Passer</button>
        </div>
      );
    if (step.kind === 'multi')
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {step.options.map(([v, l]) => {
              const on = multi.includes(v);
              return (
                <button key={v} type="button" aria-pressed={on} className={on ? chipStrong : chip} onClick={() => setMulti((m) => (on ? m.filter((x) => x !== v) : [...m, v]))}>
                  {on ? '✓ ' : ''}{l}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button type="button" className={chipStrong} onClick={() => advance({ ...answers, extras: multi.length ? multi : undefined }, multi.length ? step.options.filter(([v]) => multi.includes(v)).map(([, l]) => l).join(', ') : 'Aucun en particulier', idx)}>Valider</button>
            <button type="button" className="px-2 text-xs font-semibold text-white/70 underline underline-offset-2" onClick={() => advance(answers, 'Je passe', idx)}>Passer</button>
          </div>
        </div>
      );
    if (step.kind === 'text')
      return (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = text.trim().slice(0, 80);
            advance(v ? { ...answers, profession: v } : answers, v || 'Je passe', idx);
          }}
        >
          <input id="quick-job" className={`${field} min-w-[10rem] flex-1`} maxLength={80} placeholder={step.placeholder} value={text} onChange={(e) => setText(e.target.value)} aria-label="Votre métier" />
          <button type="submit" className={chipStrong}>Valider</button>
          <button type="button" className={chip} onClick={() => advance(answers, 'Je passe', idx)}>Passer</button>
        </form>
      );
    return (
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const price = Number(text.replace(/[^\d]/g, ''));
          advance(price >= 20000 ? { ...answers, expectedPrice: price } : answers, price >= 20000 ? `${price.toLocaleString('fr-FR')} €` : 'Je passe', idx);
        }}
      >
        <input id="quick-price" className={`${field} min-w-[10rem] flex-1`} inputMode="numeric" placeholder={low && high ? `Ex : ${Math.round((low + high) / 2 / 1000) * 1000}` : 'Ex : 350000'} value={text} onChange={(e) => setText(e.target.value.replace(/[^\d\s]/g, ''))} aria-label="Prix espéré en euros" />
        <button type="submit" className={chipStrong}>Valider</button>
        <button type="button" className={chip} onClick={() => advance(answers, 'Je passe', idx)}>Passer</button>
      </form>
    );
  })();

  return (
    <section aria-labelledby="quick-q-title" className="overflow-hidden rounded-3xl border-[3px] border-[#0B0F1F] bg-white shadow-[5px_5px_0_#0B0F1F]">
      <div className="flex items-center gap-3 bg-[#2B4BFF] px-4 py-3 text-white sm:px-5">
        <Robot className="bob h-14 w-11 shrink-0" />
        <div className="min-w-0">
          <h3 id="quick-q-title" className="text-sm font-black sm:text-base">Quelques questions complémentaires</h3>
          <p className="text-xs text-white/85">Avec l'assistant IA de Céline · facultatif, à votre rythme</p>
        </div>
      </div>

      <div ref={logRef} className="max-h-[22rem] space-y-3 overflow-y-auto bg-[#FFF7E6] px-4 py-4 sm:px-5" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p className={`bubble max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium leading-snug ${m.from === 'user' ? 'rounded-br-md bg-[#2B4BFF] text-white' : 'rounded-bl-md border-[3px] border-[#0B0F1F] bg-white text-[#0B0F1F]'}`}>{m.text}</p>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start" role="status" aria-label="L'assistant écrit">
            <span className="rounded-2xl rounded-bl-md border-[3px] border-[#0B0F1F] bg-white px-4 py-3 text-sm font-black tracking-widest text-[#0B0F1F]">• • •</span>
          </div>
        )}
      </div>

      {controls && <div className="border-t-[3px] border-[#0B0F1F] bg-[#0B0F1F] px-4 py-4 sm:px-5">{controls}</div>}
    </section>
  );
};
