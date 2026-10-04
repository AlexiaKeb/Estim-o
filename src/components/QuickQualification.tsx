import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ClipboardList } from 'lucide-react';

export interface QuickAnswers {
  ownership?: 'seul' | 'plusieurs' | 'pas_encore';
  mandate?: 'aucun' | 'estimations' | 'simple' | 'exclusif';
  occupancy?: 'occupe' | 'libre' | 'loue';
  expectedPrice?: number;
}

interface Props {
  leadId?: string;
  low?: number;
  high?: number;
  onSubmitted: (a: QuickAnswers) => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const QUESTIONS: Array<{ key: 'ownership' | 'mandate' | 'occupancy'; label: string; options: Array<[string, string]> }> = [
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
    key: 'occupancy',
    label: 'Votre bien est…',
    options: [
      ['occupe', 'Occupé par moi'],
      ['libre', 'Libre'],
      ['loue', 'Loué'],
    ],
  },
];

/** Three taps and an optional price: what the advisor needs to prepare the visit. Fully optional. */
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

  const answered = Object.keys(answers).length > 0 || priceText.trim() !== '';

  const submit = () => {
    const price = Number(priceText.replace(/[^\d]/g, ''));
    const payload: QuickAnswers = { ...answers, ...(price >= 20000 ? { expectedPrice: price } : {}) };
    onSubmitted(payload);
    pending.current = payload;
    setState('sending');
  };

  if (state !== 'idle') {
    return (
      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3 text-sm text-emerald-900">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <span>Merci, vos réponses sont transmises à Céline. Elles lui permettent de préparer votre visite.</span>
      </div>
    );
  }

  return (
    <section aria-labelledby="quick-q-title" className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4 shadow-xs">
      <div className="flex items-start gap-3">
        <ClipboardList className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <h3 id="quick-q-title" className="font-semibold text-stone-900">Préparons votre visite</h3>
          <p className="text-xs text-stone-500">Trois questions rapides, facultatives. Elles évitent à Céline de vous les poser sur place.</p>
        </div>
      </div>

      {QUESTIONS.map((q) => (
        <fieldset key={q.key} className="space-y-2">
          <legend className="text-xs font-semibold text-stone-700">{q.label}</legend>
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
                  className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                    on ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="space-y-1.5">
        <label htmlFor="quick-price" className="text-xs font-semibold text-stone-700">
          Prix que vous espérez (facultatif)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="quick-price"
            inputMode="numeric"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value.replace(/[^\d\s]/g, ''))}
            placeholder={low && high ? `Ex : ${Math.round(((low + high) / 2) / 1000) * 1000}` : 'Ex : 350000'}
            className="w-44 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60"
          />
          <span className="text-sm text-stone-500">€</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          id="btn-quick-submit"
          disabled={!answered}
          onClick={submit}
          className="rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
        >
          Envoyer mes réponses
        </button>
        <button type="button" onClick={() => setState('done')} className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800">
          Passer
        </button>
      </div>
    </section>
  );
};
