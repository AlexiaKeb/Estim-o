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
const hasVisit = (l: Lead) => l.meetingBooked || Boolean(l.visit2?.date) || hasMandate(l);
const saleFee = (l: Lead) => l.mandate?.saleFee || 0;
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
    const archived = inPeriod.filter((l) => l.archive);
    const lostMandates = archived.filter((l) => l.archive?.kind === 'mandat_perdu');
    const byStage: Record<string, number> = {};
    archived.forEach((l) => { const k = l.archive!.stage; byStage[k] = (byStage[k] || 0) + 1; });
    return { inPeriod, visits, mandates, sales, revenue, budget, ads, archived, lostMandates, byStage };
  }, [leads, period, spend]);

  const L = s.inPeriod.length;
  const V = s.visits.length;
  const M = s.mandates.length;
  const S = s.sales.length;

  const periodLabel = PERIODS.find(([k]) => k === period)?.[1].toLowerCase() || '';
  const result = s.revenue - s.budget;
  const maxBar = Math.max(L, 1);
  const funnel: Array<{ label: string; hint: string; value: number; rate: string | null; rateLabel: string; bar: string; icon: React.ReactNode }> = [
    { label: 'Leads', hint: 'demandes reçues', value: L, rate: null, rateLabel: '', bar: 'bg-sky-500', icon: <Users className="w-4 h-4" /> },
    { label: 'Estimations', hint: 'visites d\'estimation (R1)', value: V, rate: pct(V, L), rateLabel: 'des leads', bar: 'bg-amber-500', icon: <CalendarCheck className="w-4 h-4" /> },
    { label: 'Mandats', hint: 'mandats signés', value: M, rate: pct(M, V), rateLabel: 'des estimations', bar: 'bg-violet-500', icon: <FileSignature className="w-4 h-4" /> },
    { label: 'Ventes', hint: 'ventes conclues', value: S, rate: pct(S, M), rateLabel: 'des mandats', bar: 'bg-emerald-500', icon: <BadgeCheck className="w-4 h-4" /> },
  ];
  const card = 'rounded-2xl bg-white border border-stone-200 shadow-sm';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Statistiques</h1>
          <p className="text-sm text-stone-600">De la demande d'estimation à la vente : ce qui rapporte, et ce que ça coûte.</p>
        </div>
        <div role="tablist" aria-label="Période" className="inline-flex rounded-xl bg-stone-100 p-1">
          {PERIODS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={period === k} onClick={() => setPeriod(k)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${period === k ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* En un coup d'œil */}
      <section aria-label="Résumé" className="rounded-2xl bg-gradient-to-br from-[#0f1f3d] to-[#1d3566] text-white p-5 sm:p-6 shadow-md">
        <p className="text-xs uppercase tracking-wider text-amber-300 font-bold">En un coup d'œil • {periodLabel}</p>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-3xl font-extrabold">{L}</p><p className="text-xs text-slate-300">leads reçus</p></div>
          <div><p className="text-3xl font-extrabold">{S}</p><p className="text-xs text-slate-300">vente{S > 1 ? 's' : ''} conclue{S > 1 ? 's' : ''}</p></div>
          <div><p className="text-3xl font-extrabold text-amber-300">{eur(s.revenue)}</p><p className="text-xs text-slate-300">de chiffre d'affaires</p></div>
          <div><p className={`text-3xl font-extrabold ${result < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{eur(result)}</p><p className="text-xs text-slate-300">de résultat (CA − pub)</p></div>
        </div>
      </section>

      {/* Entonnoir */}
      <section aria-labelledby="funnel-title" className={`${card} p-5 sm:p-6`}>
        <h2 id="funnel-title" className="text-base font-bold text-stone-900">Du lead à la vente</h2>
        <p className="text-xs text-stone-500 mb-4">Combien de contacts passent chaque étape.</p>
        <div className="space-y-3">
          {funnel.map((f) => (
            <div key={f.label} className="grid grid-cols-[7rem_1fr_auto] sm:grid-cols-[9rem_1fr_9rem] items-center gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-stone-900">{f.icon}{f.label}</p>
                <p className="text-[11px] text-stone-500 hidden sm:block">{f.hint}</p>
              </div>
              <div className="h-8 rounded-lg bg-stone-100 overflow-hidden">
                <div className={`h-full ${f.bar} rounded-lg flex items-center justify-end pr-2 text-white text-sm font-extrabold transition-all`} style={{ width: `${Math.max((f.value / maxBar) * 100, f.value > 0 ? 8 : 0)}%` }}>
                  {f.value > 0 ? f.value : ''}
                </div>
              </div>
              <div className="text-right">
                {f.rate ? <><span className="text-sm font-extrabold text-stone-900">{f.rate}</span><span className="block text-[10px] text-stone-500 leading-tight">{f.rateLabel}</span></> : <span className="text-[11px] text-stone-400">départ</span>}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-stone-700 rounded-xl bg-stone-50 border border-stone-200 p-3">
          <strong>Taux global lead ⇒ vente : {pct(S, L)}.</strong> La vente se déclare dans la fiche du dossier, après la signature du mandat.
        </p>
      </section>

      {/* Argent */}
      <section aria-labelledby="cost-title" className={`${card} p-5 sm:p-6 space-y-5`}>
        <div>
          <h2 id="cost-title" className="text-base font-bold text-stone-900">Ce que ça coûte, ce que ça rapporte</h2>
          <p className="text-xs text-stone-500">Les coûts se calculent à partir du budget publicité saisi ci-dessous.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-4"><p className="text-[11px] font-bold uppercase text-stone-500 flex items-center gap-1"><Euro className="w-3.5 h-3.5" />Budget pub</p><p className="mt-1 text-2xl font-extrabold text-stone-900">{eur(s.budget)}</p></div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4"><p className="text-[11px] font-bold uppercase text-emerald-800">Chiffre d'affaires</p><p className="mt-1 text-2xl font-extrabold text-emerald-900">{eur(s.revenue)}</p><p className="text-[11px] text-emerald-800">commissions des ventes</p></div>
          <div className={`rounded-xl border p-4 ${result < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}><p className={`text-[11px] font-bold uppercase ${result < 0 ? 'text-rose-800' : 'text-emerald-800'}`}>Résultat</p><p className={`mt-1 text-2xl font-extrabold ${result < 0 ? 'text-rose-900' : 'text-emerald-900'}`}>{eur(result)}</p><p className={`text-[11px] ${result < 0 ? 'text-rose-800' : 'text-emerald-800'}`}>CA − budget pub</p></div>
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-4"><p className="text-[11px] font-bold uppercase text-stone-500 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Retour pub</p><p className="mt-1 text-2xl font-extrabold text-stone-900">{s.budget > 0 ? `× ${Math.round((s.revenue / s.budget) * 10) / 10}` : '—'}</p><p className="text-[11px] text-stone-500">1 € de pub = {s.budget > 0 ? eur(s.revenue / s.budget) : '—'}</p></div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Coût pour obtenir…</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([['un lead', L], ['une estimation', V], ['un mandat', M], ['une vente', S]] as Array<[string, number]>).map(([label, n]) => (
              <div key={label} className="rounded-xl border border-stone-200 p-3 text-center"><p className="text-xl font-extrabold text-stone-900">{ratio(s.budget, n)}</p><p className="text-[11px] text-stone-500">{label}</p></div>
            ))}
          </div>
        </div>

        <details className="rounded-xl border border-dashed border-stone-300 p-4 group">
          <summary className="cursor-pointer text-sm font-semibold text-stone-800">Saisir le budget publicité du mois</summary>
          <p className="text-xs text-stone-500 mt-2 mb-3">Reportez le montant dépensé dans Google Ads (visible dans votre compte Google Ads).</p>
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
        </details>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Origine */}
        <section aria-labelledby="src-title" className={`${card} p-5 sm:p-6`}>
          <h2 id="src-title" className="text-base font-bold text-stone-900">D'où viennent les leads ?</h2>
          <div className="mt-4 space-y-4">
            {([
              ['Publicité Google', s.ads, 'bg-sky-500'],
              ['Autres (direct, blog, bouche à oreille)', s.inPeriod.filter((l) => !isAds(l)), 'bg-stone-400'],
            ] as Array<[string, Lead[], string]>).map(([label, arr, bar]) => (
              <div key={label}>
                <div className="flex justify-between text-sm"><span className="font-semibold text-stone-900">{label}</span><span className="font-extrabold">{arr.length}</span></div>
                <div className="h-2 rounded-full bg-stone-100 mt-1.5 overflow-hidden"><div className={`h-full ${bar}`} style={{ width: `${(arr.length / maxBar) * 100}%` }} /></div>
                <p className="text-[11px] text-stone-500 mt-1">{arr.filter(hasVisit).length} estimation(s) • {arr.filter(hasMandate).length} mandat(s) • {arr.filter(isSold).length} vente(s)</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-stone-500">Les leads d'une annonce Google sont repérés automatiquement (clic publicitaire).</p>
        </section>

        {/* Archivés */}
        <section aria-labelledby="archive-title" className={`${card} p-5 sm:p-6`}>
          <h2 id="archive-title" className="text-base font-bold text-stone-900">Dossiers archivés &amp; mandats perdus</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-stone-50 border border-stone-200 p-3"><p className="text-2xl font-extrabold text-stone-900">{s.archived.length}</p><p className="text-[11px] text-stone-500">archivés ({pct(s.archived.length, L)} des leads)</p></div>
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3"><p className="text-2xl font-extrabold text-rose-900">{s.lostMandates.length}</p><p className="text-[11px] text-rose-700">mandats perdus ({pct(s.lostMandates.length, M + s.lostMandates.filter((l) => !hasMandate(l)).length)})</p></div>
          </div>
          <p className="mt-3 text-xs text-stone-600">
            {s.archived.length === 0 ? 'Aucun dossier archivé sur la période.' : `Perdus à l'étape : ${(['lead', 'r1', 'r2', 'mandat', 'vente'] as const).map((k) => `${{ lead: 'Lead', r1: 'R1', r2: 'R2', mandat: 'Mandat', vente: 'Vente' }[k]} ${s.byStage[k] || 0}`).join(' • ')}`}
          </p>
          {s.archived.length > 0 && (
            <ul className="mt-2 text-xs text-stone-700 space-y-1">
              {s.archived.slice(0, 6).map((l) => (
                <li key={l.id}>• <strong className="uppercase">{l.name}</strong> ({l.city}) : {l.archive!.kind === 'mandat_perdu' ? 'mandat perdu' : 'archivé'}{l.archive!.reason ? `, ${l.archive!.reason}` : ''}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
