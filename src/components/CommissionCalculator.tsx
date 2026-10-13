import React, { useEffect, useState } from 'react';
import { Calculator, Copy, Check, RotateCcw } from 'lucide-react';

type Key = 'price' | 'rate' | 'fee' | 'net';

const LABELS: Record<Key, { label: string; unit: string; hint: string }> = {
  price: { label: 'Prix de vente (FAI)', unit: '€', hint: 'Prix affiché, honoraires inclus' },
  rate: { label: 'Commission', unit: '%', hint: 'Honoraires en % du prix de vente' },
  fee: { label: 'Montant de la commission', unit: '€', hint: 'Honoraires en euros' },
  net: { label: 'Prix net vendeur', unit: '€', hint: 'Ce que touche le vendeur' },
};

const parse = (t: string): number | null => {
  const n = Number(t.replace(/\s/g, '').replace(',', '.'));
  return t.trim() !== '' && isFinite(n) && n >= 0 ? n : null;
};

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
export const showNum = (n: number, key: Key) => n.toLocaleString('fr-FR', { maximumFractionDigits: key === 'rate' ? 2 : 0 });

/** Calcule les deux champs manquants à partir des deux derniers champs saisis. */
export type CommissionResult = Record<Key, number>;

function solve(a: Key, av: number, b: Key, bv: number): Record<Key, number> | null {
  const v: Partial<Record<Key, number>> = { [a]: av, [b]: bv };
  const has = (k: Key) => v[k] !== undefined;
  // Les relations : fee = price × rate / 100 ; net = price − fee
  for (let i = 0; i < 4; i++) {
    if (!has('fee') && has('price') && has('rate')) v.fee = (v.price! * v.rate!) / 100;
    if (!has('net') && has('price') && has('fee')) v.net = v.price! - v.fee!;
    if (!has('price') && has('net') && has('fee')) v.price = v.net! + v.fee!;
    if (!has('rate') && has('price') && has('fee') && v.price! > 0) v.rate = (v.fee! / v.price!) * 100;
    if (!has('fee') && has('price') && has('net')) v.fee = v.price! - v.net!;
    if (!has('price') && has('net') && has('rate') && v.rate! < 100) v.price = v.net! / (1 - v.rate! / 100);
    if (!has('price') && has('fee') && has('rate') && v.rate! > 0) v.price = (v.fee! * 100) / v.rate!;
  }
  if (!(['price', 'rate', 'fee', 'net'] as Key[]).every(has)) return null;
  const out = v as Record<Key, number>;
  if (out.net < 0 || out.fee < 0 || out.rate > 100 || out.price <= 0) return null;
  return out;
}

/** Les quatre champs liés (prix, %, commission, net) : deux saisis, deux calculés. */
export const CommissionFields: React.FC<{ initial?: { price?: number; rate?: number }; onResult?: (r: CommissionResult | null) => void }> = ({ initial, onResult }) => {
  const [texts, setTexts] = useState<Record<Key, string>>({ price: initial?.price ? String(initial.price) : '', rate: initial?.rate ? String(initial.rate) : '', fee: '', net: '' });
  // Les deux derniers champs modifiés sont la source ; les deux autres sont calculés
  const [inputs, setInputs] = useState<[Key, Key]>(['price', 'rate']);

  const a = parse(texts[inputs[0]]);
  const b = parse(texts[inputs[1]]);
  const result = a !== null && b !== null ? solve(inputs[0], a, inputs[1], b) : null;
  const invalid = a !== null && b !== null && !result;
  const sig = result ? `${result.price}|${result.rate}|${result.fee}|${result.net}` : '';
  useEffect(() => { onResult?.(result); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sig]);

  const edit = (k: Key, value: string) => {
    setTexts((t) => ({ ...t, [k]: value }));
    setInputs((prev) => (prev.includes(k) ? (prev[0] === k ? prev : [prev[1], k]) : [prev[1], k]));
  };

  const shown = (k: Key) => (inputs.includes(k) ? texts[k] : result ? String(round(result[k], k === 'rate' ? 2 : 0)) : '');
  const isCalc = (k: Key) => !inputs.includes(k);

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200 p-5 grid sm:grid-cols-2 gap-4">
        {(['price', 'rate', 'fee', 'net'] as Key[]).map((k) => (
          <div key={k}>
            <label htmlFor={`calc-${k}`} className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
              {LABELS[k].label}
              {isCalc(k) && <span className="text-[10px] normal-case font-semibold text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">calculé</span>}
            </label>
            <div className="relative">
              <input
                id={`calc-${k}`}
                inputMode="decimal"
                value={shown(k)}
                onChange={(e) => edit(k, e.target.value)}
                placeholder="0"
                className={`w-full rounded-xl border px-4 py-3 pr-10 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 ${isCalc(k) ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-white border-stone-300 text-stone-900'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">{LABELS[k].unit}</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">{LABELS[k].hint}</p>
          </div>
        ))}
      </div>

      {invalid && <p role="alert" className="rounded-xl bg-rose-50 text-rose-800 text-sm p-3">Ces deux valeurs sont incompatibles (par exemple un net supérieur au prix de vente, ou une commission au-dessus de 100 %).</p>}

    </>
  );
};

export const CommissionCalculator: React.FC = () => {
  const [result, setResult] = useState<CommissionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const summary = result
    ? `Prix de vente : ${showNum(result.price, 'price')} € • Commission : ${showNum(result.rate, 'rate')} % (${showNum(result.fee, 'fee')} €) • Prix net vendeur : ${showNum(result.net, 'net')} €`
    : '';

  const copy = () => {
    if (!summary) return;
    navigator.clipboard?.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <h1 className="text-xl font-extrabold text-stone-900 flex items-center gap-2"><Calculator className="w-5 h-5" /> Calculatrice de commission</h1>
        <p className="text-sm text-stone-500 mt-1">Renseignez deux champs, quels qu'ils soient : les deux autres se calculent automatiquement. Modifiez-en un autre à tout moment pour changer la base du calcul.</p>
      </div>
      <CommissionFields key={resetKey} initial={resetKey ? {} : { price: 350000, rate: 4 }} onResult={setResult} />
      {result && (
        <div className="rounded-2xl bg-[#0f1f3d] text-white p-5 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3 text-center">
            <div><div className="text-[11px] uppercase text-slate-300">Prix de vente</div><div className="text-xl font-extrabold">{showNum(result.price, 'price')} €</div></div>
            <div><div className="text-[11px] uppercase text-amber-300">Commission {showNum(result.rate, 'rate')} %</div><div className="text-xl font-extrabold text-amber-300">{showNum(result.fee, 'fee')} €</div></div>
            <div><div className="text-[11px] uppercase text-slate-300">Net vendeur</div><div className="text-xl font-extrabold">{showNum(result.net, 'net')} €</div></div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <button type="button" onClick={copy} className="rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold px-3 py-2 flex items-center gap-1.5">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copié' : 'Copier le résumé'}
            </button>
            <button type="button" onClick={() => setResetKey((k) => k + 1)} className="rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold px-3 py-2 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Effacer
            </button>
          </div>
        </div>
      )}
      <p className="text-[11px] text-stone-400 text-center">Calcul indicatif : net vendeur = prix de vente − commission. Les honoraires sont supposés à la charge du vendeur et compris dans le prix de vente.</p>
    </div>
  );
};
