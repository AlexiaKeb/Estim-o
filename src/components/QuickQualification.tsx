import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Robot } from './Mascots';

export interface QuickAnswers {
  ownership?: 'seul' | 'plusieurs' | 'pas_encore';
  mandate?: 'aucun' | 'estimations' | 'simple' | 'exclusif';
  occupancy?: 'occupe' | 'libre' | 'loue';
  condition?: 'refait' | 'bon' | 'rafraichir' | 'travaux';
  purchase?: 'aucun' | 'recherche' | 'trouve';
  extras?: string[];
  expectedPrice?: number;
}

interface Props {
  leadId?: string;
  low?: number;
  high?: number;
  onSubmitted: (a: QuickAnswers) => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SingleKey = 'ownership' | 'mandate' | 'occupancy' | 'condition' | 'purchase';
const QUESTIONS: Array<{ key: SingleKey; label: string; options: Array<[string, string]> }> = [
  {
    key: 'ownership',
    label: 'Vous êtes…',
    options: [
      ['seul', 'Seul propriétaire'],
      ['plusieurs', 'Plusieurs propriétaires'],
      ['pas_encore', 'Pas encore propriétaire'],
    ],
  },
  {
    key: 'condition',
    label: "Dans quel état est votre bien ?",
    options: [
      ['refait', 'Refait à neuf'],
      ['bon', 'Bon état général'],
      ['rafraichir', 'À rafraîchir'],
      ['travaux', 'Travaux importants à prévoir'],
    ],
  },
  {
    key: 'occupancy',
    label: 'Votre bien est…',
    options: [
      ['occupe', 'Occupé par moi'],
      ['libre', 'Libre'],
      ['loue', 'Loué'],
    ],
  },
  {
    key: 'mandate',
    label: 'Un mandat de vente est-il déjà signé ?',
    options: [
      ['aucun', 'Non, aucun'],
      ['estimations', "J'ai des estimations, sans mandat"],
      ['simple', 'Oui, mandat simple'],
      ['exclusif', 'Oui, mandat exclusif'],
    ],
  },
  {
    key: 'purchase',
    label: 'Un achat est-il lié à votre vente ?',
    options: [
      ['aucun', "Non, je ne rachète pas"],
      ['recherche', 'Je cherche mon prochain bien'],
      ['trouve', "J'ai déjà trouvé"],
    ],
  },
];

const EXTRAS: Array<[string, string]> = [
  ['balcon', 'Balcon / terrasse'],
  ['jardin', 'Jardin'],
  ['parking', 'Garage / parking'],
  ['cave', 'Cave'],
  ['ascenseur', 'Ascenseur'],
];

/** Robot-led complementary questions shown once the visit is confirmed: what the advisor needs to know about the property. Fully optional. */
export const QuickQualification: React.FC<Props> = ({ leadId, low, high, onSubmitted }) => {
  const [answers, setAnswers] = useState<QuickAnswers>({});
  const [priceText, setPriceText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const pending = useRef<QuickAnswers | null>(null);

  const send = async (payload: QuickAnswers) => {
    try {
      await fetch('/api/supabase/qualification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, ...payload }),
      });
    } catch {
      /* the visit can be booked anyway: answers are a bonus */
    }
    setState('done');
  };

  // The lead id arrives a moment after unlocking: wait for it instead of losing the answers
  useEffect(() => {
    if (state === 'sending' && pending.current && leadId && UUID_RE.test(leadId)) {
      const p = pending.current;
      pending.current = null;
      void send(p);
    }
  }, [state, leadId]);

  const count = Object.values(answers).filter((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined)).length + (priceText.trim() ? 1 : 0);
  const total = QUESTIONS.length + 2;
  const answered = count > 0;

  const submit = () => {
    const price = Number(priceText.replace(/[^\d]/g, ''));
    const payload: QuickAnswers = { ...answers, ...(price >= 20000 ? { expectedPrice: price } : {}) };
    onSubmitted(payload);
    pending.current = payload;
    setState('sending');
  };

  if (state !== 'idle') {
    return (
      <div role="status" className="rounded-2xl border-[3px] border-[#0B0F1F] bg-[#E4E9FF] p-4 flex items-start gap-3 text-sm font-semibold text-[#0B0F1F]">
        <CheckCircle2 className="w-5 h-5 text-[#2B4BFF] shrink-0 mt-0.5" />
        <span>Merci, vos réponses sont transmises à Céline. Elles lui permettent de préparer votre visite.</span>
      </div>
    );
  }

  return (
    <section aria-labelledby="quick-q-title" className="rounded-3xl border-[3px] border-[#0B0F1F] bg-white p-5 sm:p-6 space-y-5 shadow-[5px_5px_0_#0B0F1F]">
      <div className="flex items-center gap-3 sm:gap-4">
        <Robot className="bob h-20 w-16 shrink-0" />
        <div className="min-w-0 space-y-1.5">
          <p className="bubble relative inline-block rounded-2xl border-[3px] border-[#0B0F1F] bg-[#2B4BFF] px-3 py-2 text-sm font-black text-white shadow-[3px_3px_0_#0B0F1F]">
            Dites-m'en plus sur votre bien !
            <span className="absolute -left-[9px] top-4 h-3.5 w-3.5 rotate-45 border-b-[3px] border-l-[3px] border-[#0B0F1F] bg-[#2B4BFF]" />
          </p>
          <h3 id="quick-q-title" className="text-base font-black text-[#0B0F1F]">Quelques questions complémentaires</h3>
          <p className="text-xs text-[#0B0F1F]/70">Facultatif, à votre rythme : vos réponses sont transmises à Céline, qui connaîtra mieux votre projet. <span className="font-bold">{count}/{total}</span></p>
        </div>
      </div>

      {QUESTIONS.map((q) => (
        <fieldset key={q.key} className="space-y-2">
          <legend className="text-xs font-bold text-[#0B0F1F]">{q.label}</legend>
          <div role="radiogroup" aria-label={q.label} className="flex flex-wrap gap-2">
            {q.options.map(([value, label]) => {
              const on = answers[q.key] === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setAnswers((a) => ({ ...a, [q.key]: on ? undefined : value } as QuickAnswers))}
                  className={`px-3 py-2 rounded-xl border-[3px] text-xs font-bold transition-colors ${
                    on ? 'bg-[#2B4BFF] border-[#0B0F1F] text-white' : 'bg-white border-[#0B0F1F] text-[#0B0F1F] hover:bg-[#FFF7E6]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <fieldset className="space-y-2">
        <legend className="text-xs font-bold text-[#0B0F1F]">Quels atouts a votre bien ? (plusieurs choix possibles)</legend>
        <div role="group" aria-label="Atouts du bien" className="flex flex-wrap gap-2">
          {EXTRAS.map(([value, label]) => {
            const on = (answers.extras || []).includes(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => setAnswers((a) => {
                  const cur = a.extras || [];
                  const next = on ? cur.filter((x) => x !== value) : [...cur, value];
                  return { ...a, extras: next.length ? next : undefined };
                })}
                className={`px-3 py-2 rounded-xl border-[3px] text-xs font-bold transition-colors ${
                  on ? 'bg-[#FFD60A] border-[#0B0F1F] text-[#0B0F1F]' : 'bg-white border-[#0B0F1F] text-[#0B0F1F] hover:bg-[#FFF7E6]'
                }`}
              >
                {on ? '✓ ' : ''}{label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="quick-price" className="text-xs font-bold text-[#0B0F1F]">
          Prix que vous espérez (facultatif)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="quick-price"
            inputMode="numeric"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value.replace(/[^\d\s]/g, ''))}
            placeholder={low && high ? `Ex : ${Math.round(((low + high) / 2) / 1000) * 1000}` : 'Ex : 350000'}
            className="w-44 rounded-xl border-[3px] border-[#0B0F1F] px-3 py-2 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#FFD60A]"
          />
          <span className="text-sm font-bold text-[#0B0F1F]">€</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          id="btn-quick-submit"
          disabled={!answered}
          onClick={submit}
          className="rounded-xl border-[3px] border-[#0B0F1F] bg-[#FFD60A] hover:brightness-95 disabled:bg-stone-200 disabled:text-[#0B0F1F]/50 text-[#0B0F1F] text-sm font-black px-4 py-2.5 shadow-[3px_3px_0_#0B0F1F] transition-colors"
        >
          Envoyer mes réponses
        </button>
        <button type="button" onClick={() => setState('done')} className="text-xs font-semibold text-[#0B0F1F]/70 underline underline-offset-2 hover:text-[#0B0F1F]">
          Passer
        </button>
      </div>
    </section>
  );
};
