import React, { useEffect, useState } from 'react';
import { Calculator, Copy, Check, RotateCcw } from 'lucide-react';

type Key = 'price' | 'rate' | 'fee' | 'net';

const LABELS: Record<Key, { label: string; unit: string; hint: string }> = {
  price: { label: 'Prix de vente (FAI)', unit: '€', hint: 'Prix affiché, honoraires inclus' },
  rate: { label: 'Commission agence', unit: '%', hint: 'Honoraires en % du prix de vente' },
  fee: { label: 'Montant commission agence', unit: '€', hint: 'Honoraires en euros' },
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
  // Ordre des modifications : les deux derniers champs RENSEIGNÉS (valides) sont la source, les autres sont calculés
  const [order, setOrder] = useState<Key[]>(['fee', 'net', 'rate', 'price']);
  const lastEdited = order[order.length - 1];

  const usable = (k: Key) => {
    const v = parse(texts[k]);
    return v !== null && (k !== 'price' || v > 0);
  };
  const sources = [...order].reverse().filter(usable).slice(0, 2);
  const result = sources.length === 2 ? solve(sources[0], parse(texts[sources[0]])!, sources[1], parse(texts[sources[1]])!) : null;
  const invalid = sources.length === 2 && !result;
  const sig = result ? `${result.price}|${result.rate}|${result.fee}|${result.net}` : '';
  useEffect(() => { onResult?.(result); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sig]);

  const edit = (k: Key, value: string) => {
    setTexts((t) => ({ ...t, [k]: value }));
    setOrder((o) => [...o.filter((x) => x !== k), k]);
  };

  const isSource = (k: Key) => sources.includes(k);
  const shown = (k: Key) => (isSource(k) || k === lastEdited ? texts[k] : result ? String(round(result[k], k === 'rate' ? 2 : 0)) : '');
  const isCalc = (k: Key) => !isSource(k) && k !== lastEdited && Boolean(result);

  const TONE: Record<Key, { icon: string; ring: string; tint: string; badge: string }> = {
    price: { icon: '🏠', ring: 'focus:ring-sky-300 focus:border-sky-400', tint: 'bg-sky-50 border-sky-200', badge: 'from-sky-500 to-sky-600' },
    rate: { icon: '％', ring: 'focus:ring-amber-300 focus:border-amber-400', tint: 'bg-amber-50 border-amber-200', badge: 'from-amber-500 to-amber-600' },
    fee: { icon: '💼', ring: 'focus:ring-orange-300 focus:border-orange-400', tint: 'bg-orange-50 border-orange-200', badge: 'from-orange-500 to-orange-600' },
    net: { icon: '🤝', ring: 'focus:ring-emerald-300 focus:border-emerald-400', tint: 'bg-emerald-50 border-emerald-200', badge: 'from-emerald-500 to-emerald-600' },
  };

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        {(['price', 'rate', 'fee', 'net'] as Key[]).map((k) => (
          <div key={k} className={`rounded-3xl border-2 p-4 sm:p-5 transition-all ${isCalc(k) ? `${TONE[k].tint} shadow-inner` : 'bg-white border-stone-200 shadow-sm'}`}>
            <label htmlFor={`calc-${k}`} className="flex items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${TONE[k].badge} text-white text-base font-extrabold shadow`}>{TONE[k].icon}</span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-stone-700">{LABELS[k].label}</span>
              </span>
              {isCalc(k) && <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">✨ calculé</span>}
            </label>
            <div className="relative">
              <input
                id={`calc-${k}`}
                inputMode="decimal"
                value={shown(k)}
                onChange={(e) => edit(k, e.target.value)}
                placeholder="0"
                className={`w-full rounded-2xl border bg-white px-4 py-3.5 pr-12 text-2xl font-extrabold text-stone-900 focus:outline-none focus:ring-4 ${TONE[k].ring} ${isCalc(k) ? 'border-transparent' : 'border-stone-300'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-stone-400">{LABELS[k].unit}</span>
            </div>
            <p className="mt-1.5 text-[11px] text-stone-500">{LABELS[k].hint}</p>
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

  const feePct = result ? Math.min(100, Math.max(0, (result.fee / result.price) * 100)) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#0f1f3d] to-[#1d3566] text-white p-5 sm:p-7 shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-amber-400/10" aria-hidden="true" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2.5"><Calculator className="w-7 h-7 text-amber-300" /> Calculatrice de commission</h1>
          <p className="mt-1.5 text-sm text-slate-300 max-w-xl">Renseignez deux champs, n'importe lesquels : les deux autres se calculent tout seuls. Changez-en un autre à tout moment pour repartir sur une autre base.</p>
        </div>
      </div>

      <CommissionFields key={resetKey} initial={resetKey ? {} : { price: 350000, rate: 4 }} onResult={setResult} />

      {result && (
        <div className="rounded-3xl bg-white border border-stone-200 shadow-sm p-5 sm:p-6 space-y-5">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-base font-extrabold text-stone-900">Répartition du prix de vente</h2>
              <span className="text-xs text-stone-500">{showNum(result.price, 'price')} €</span>
            </div>
            <div className="flex h-10 w-full overflow-hidden rounded-2xl bg-stone-100 text-xs font-extrabold text-white" role="img" aria-label={`Net vendeur ${showNum(100 - feePct, 'rate')} %, commission ${showNum(feePct, 'rate')} %`}>
              <div className="flex items-center justify-center bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all" style={{ width: `${100 - feePct}%` }}>{feePct < 92 ? `Net vendeur ${showNum(100 - feePct, 'rate')} %` : ''}</div>
              <div className="flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 transition-all" style={{ width: `${feePct}%` }}>{feePct >= 12 ? `${showNum(feePct, 'rate')} %` : ''}</div>
            </div>
            <div className="mt-2 flex justify-between text-[11px] font-semibold">
              <span className="text-emerald-700">● Net vendeur</span>
              <span className="text-orange-600">● Commission agence</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4"><p className="text-[11px] font-bold uppercase text-sky-800">Prix de vente</p><p className="mt-1 text-2xl font-extrabold text-sky-950">{showNum(result.price, 'price')} €</p></div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4"><p className="text-[11px] font-bold uppercase text-amber-800">Commission {showNum(result.rate, 'rate')} %</p><p className="mt-1 text-2xl font-extrabold text-amber-950">{showNum(result.fee, 'fee')} €</p></div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4"><p className="text-[11px] font-bold uppercase text-emerald-800">Net vendeur</p><p className="mt-1 text-2xl font-extrabold text-emerald-950">{showNum(result.net, 'net')} €</p></div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-[#0f1f3d] hover:bg-[#1a3060] px-5 py-2.5 text-sm font-bold text-white">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copié' : 'Copier le résumé'}
            </button>
            <button type="button" onClick={() => setResetKey((k) => k + 1)} className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white hover:bg-stone-50 px-5 py-2.5 text-sm font-bold text-stone-700">
              <RotateCcw className="w-4 h-4" /> Effacer
            </button>
          </div>
        </div>
      )}
      <p className="text-center text-[11px] text-stone-400">Calcul indicatif : net vendeur = prix de vente − commission. Les honoraires sont supposés à la charge du vendeur et compris dans le prix de vente.</p>
    </div>
  );
};
