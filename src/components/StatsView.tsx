import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, Euro, TrendingUp, Users, CalendarCheck, FileSignature, BadgeCheck } from 'lucide-react';
import { Lead } from '../types';

type Period = 'month' | '3m' | '12m' | 'all';
const PERIODS: Array<[Period, string]> = [
  ['month', 'Ce mois'],
  ['3m', '3 derniers mois'],
  ['12m', '12 derniers mois'],
  ['all', 'Depuis le début'],
];

const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10} %` : '—');
const ratio = (a: number, b: number) => (b > 0 ? eur(a / b) : '—');
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function periodStart(p: Period): Date | null {
  const now = new Date();
  if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === '3m') return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  if (p === '12m') return new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return null;
}

const isSold = (l: Lead) => Boolean(l.mandate?.soldDate);
const hasMandate = (l: Lead) => l.mandate?.status === 'signed' || isSold(l);
const hasVisit = (l: Lead) => l.meetingBooked || hasMandate(l);
const saleFee = (l: Lead) => l.mandate?.saleFee || l.mandate?.feeAmount || 0;
const isAds = (l: Lead) => Boolean(l.attribution?.gclid || /google/i.test(l.attribution?.utmSource || ''));

const Step: React.FC<{ icon: React.ReactNode; label: string; value: number; sub: string; tone: string }> = ({ icon, label, value, sub, tone }) => (
  <div className={`flex-1 min-w-[130px] rounded-2xl border p-4 ${tone}`}>
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">{icon}{label}</div>
    <div className="mt-1 text-3xl font-extrabold">{value}</div>
    <div className="text-xs opacity-80">{sub}</div>
  </div>
);

const Rate: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center justify-center px-1 text-center shrink-0">
    <ArrowRight className="w-4 h-4 text-stone-400 hidden md:block" />
    <span className="text-sm font-extrabold text-[#0f1f3d]">{value}</span>
    <span className="text-[10px] text-stone-500 leading-tight">{label}</span>
  </div>
);

export const StatsView: React.FC<{ leads: Lead[] }> = ({ leads }) => {
  const [period, setPeriod] = useState<Period>('3m');
  const [spend, setSpend] = useState<Record<string, number> | null>(null);
  const [month, setMonth] = useState(monthKey(new Date()));
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stats/spend', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setSpend(d.spend || {}))
      .catch(() => setSpend({}));
  }, []);

  useEffect(() => {
    setAmount(spend && spend[month] ? String(spend[month]) : '');
  }, [month, spend]);

  const saveSpend = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/stats/spend', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, amount: Number(amount.replace(',', '.')) || 0 }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || "L'enregistrement a échoué.");
      else setSpend(d.spend || {});
    } catch {
      setError('Serveur injoignable.');
    } finally {
      setSaving(false);
    }
  };

  const s = useMemo(() => {
    const from = periodStart(period);
    const inPeriod = leads.filter((l) => !from || !l.createdAtIso || new Date(l.createdAtIso) >= from);
    const visits = inPeriod.filter(hasVisit);
    const mandates = inPeriod.filter(hasMandate);
    const sales = inPeriod.filter(isSold);
    const revenue = sales.reduce((a, l) => a + saleFee(l), 0);
    const fromKey = from ? monthKey(from) : '';
    const budget = Object.entries(spend || {}).filter(([k]) => !fromKey || k >= fromKey).reduce((a, [, v]) => a + (Number(v) || 0), 0);
    const ads = inPeriod.filter(isAds);
    return { inPeriod, visits, mandates, sales, revenue, budget, ads };
  }, [leads, period, spend]);

  const L = s.inPeriod.length;
  const V = s.visits.length;
  const M = s.mandates.length;
  const S = s.sales.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Statistiques</h1>
          <p className="text-sm text-stone-600">De la demande d'estimation à la vente : ce qui rapporte, et ce que ça coûte.</p>
        </div>
        <div role="tablist" aria-label="Période" className="flex flex-wrap gap-1.5">
          {PERIODS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={period === k} onClick={() => setPeriod(k)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${period === k ? 'bg-stone-900 text-white' : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Entonnoir */}
      <section aria-labelledby="funnel-title" className="rounded-2xl bg-white border border-stone-200 p-5">
        <h2 id="funnel-title" className="text-sm font-bold uppercase tracking-wider text-stone-700 mb-4">Entonnoir : Leads ⇒ Estimations ⇒ Mandats ⇒ Ventes</h2>
        <div className="flex flex-col md:flex-row md:items-stretch gap-2">
          <Step icon={<Users className="w-4 h-4" />} label="Leads" value={L} sub="demandes reçues" tone="bg-sky-50 border-sky-200 text-sky-900" />
          <Rate value={pct(V, L)} label="prennent RDV" />
          <Step icon={<CalendarCheck className="w-4 h-4" />} label="Estimations" value={V} sub="visites d'estimation" tone="bg-amber-50 border-amber-200 text-amber-900" />
          <Rate value={pct(M, V)} label="signent un mandat" />
          <Step icon={<FileSignature className="w-4 h-4" />} label="Mandats" value={M} sub="mandats signés" tone="bg-violet-50 border-violet-200 text-violet-900" />
          <Rate value={pct(S, M)} label="aboutissent à une vente" />
          <Step icon={<BadgeCheck className="w-4 h-4" />} label="Ventes" value={S} sub="ventes conclues" tone="bg-emerald-50 border-emerald-200 text-emerald-900" />
        </div>
        <p className="mt-4 text-sm text-stone-700">
          <strong>Taux global lead ⇒ vente :</strong> {pct(S, L)}. Une vente se déclare dans la fiche du dossier, après la signature du mandat (bouton « Enregistrer la vente »).
        </p>
      </section>

      {/* Coût / Leads / CA */}
      <section aria-labelledby="cost-title" className="rounded-2xl bg-white border border-stone-200 p-5 space-y-4">
        <h2 id="cost-title" className="text-sm font-bold uppercase tracking-wider text-stone-700">Coût ⇒ Leads ⇒ Chiffre d'affaires</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-4"><p className="text-[11px] font-bold uppercase text-stone-500 flex items-center gap-1"><Euro className="w-3.5 h-3.5" />Budget publicité</p><p className="mt-1 text-2xl font-extrabold text-stone-900">{eur(s.budget)}</p></div>
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-4"><p className="text-[11px] font-bold uppercase text-stone-500">Coût par lead</p><p className="mt-1 text-2xl font-extrabold text-stone-900">{ratio(s.budget, L)}</p></div>
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-4"><p className="text-[11px] font-bold uppercase text-stone-500">Coût par estimation (RDV)</p><p className="mt-1 text-2xl font-extrabold text-stone-900">{ratio(s.budget, V)}</p></div>
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-4"><p className="text-[11px] font-bold uppercase text-stone-500">Coût par mandat</p><p className="mt-1 text-2xl font-extrabold text-stone-900">{ratio(s.budget, M)}</p></div>
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-4"><p className="text-[11px] font-bold uppercase text-stone-500">Coût par vente</p><p className="mt-1 text-2xl font-extrabold text-stone-900">{ratio(s.budget, S)}</p></div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4"><p className="text-[11px] font-bold uppercase text-emerald-800">Chiffre d'affaires (honoraires)</p><p className="mt-1 text-2xl font-extrabold text-emerald-900">{eur(s.revenue)}</p></div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4"><p className="text-[11px] font-bold uppercase text-emerald-800 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Retour sur publicité</p><p className="mt-1 text-2xl font-extrabold text-emerald-900">{s.budget > 0 ? `× ${Math.round((s.revenue / s.budget) * 10) / 10}` : '—'}</p><p className="text-[11px] text-emerald-800">CA ÷ budget</p></div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4"><p className="text-[11px] font-bold uppercase text-emerald-800">Résultat (CA − budget)</p><p className="mt-1 text-2xl font-extrabold text-emerald-900">{eur(s.revenue - s.budget)}</p></div>
        </div>

        <div className="rounded-xl border border-dashed border-stone-300 p-4">
          <p className="text-sm font-semibold text-stone-800">Budget publicité dépensé</p>
          <p className="text-xs text-stone-500 mb-3">Saisissez chaque mois le montant dépensé dans Google Ads (visible dans votre compte Google Ads). Il sert à calculer vos coûts.</p>
          {spend === null ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="spend-month" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Mois</label>
                <input id="spend-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm" />
              </div>
              <div>
                <label htmlFor="spend-amount" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Montant dépensé (€)</label>
                <input id="spend-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-36 rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm" />
              </div>
              <button type="button" id="btn-save-spend" onClick={saveSpend} disabled={saving} className="rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2 disabled:opacity-60">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
            </div>
          )}
          {spend && Object.keys(spend).length > 0 && (
            <p className="mt-3 text-xs text-stone-600">
              {Object.entries(spend).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6).map(([k, v]) => `${k} : ${eur(Number(v))}`).join(' · ')}
            </p>
          )}
        </div>
      </section>

      {/* Origine */}
      <section aria-labelledby="src-title" className="rounded-2xl bg-white border border-stone-200 p-5">
        <h2 id="src-title" className="text-sm font-bold uppercase tracking-wider text-stone-700 mb-3">Origine des leads</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-stone-500">
              <tr><th className="py-1.5 pr-4 font-semibold">Origine</th><th className="py-1.5 pr-4 font-semibold">Leads</th><th className="py-1.5 pr-4 font-semibold">Estimations</th><th className="py-1.5 pr-4 font-semibold">Mandats</th><th className="py-1.5 font-semibold">Ventes</th></tr>
            </thead>
            <tbody>
              {[
                ['Publicité Google', s.ads],
                ['Autres (direct, blog, bouche à oreille)', s.inPeriod.filter((l) => !isAds(l))],
              ].map(([label, set]) => {
                const arr = set as Lead[];
                return (
                  <tr key={label as string} className="border-t border-stone-200">
                    <th scope="row" className="py-2 pr-4 font-medium text-stone-900">{label as string}</th>
                    <td className="py-2 pr-4">{arr.length}</td>
                    <td className="py-2 pr-4">{arr.filter(hasVisit).length}</td>
                    <td className="py-2 pr-4">{arr.filter(hasMandate).length}</td>
                    <td className="py-2">{arr.filter(isSold).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-stone-500">Les leads venant d'une annonce Google sont repérés automatiquement (clic publicitaire). Les chiffres démarrent à partir du lancement de la publicité.</p>
      </section>
    </div>
  );
};
