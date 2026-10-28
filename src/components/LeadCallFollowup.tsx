import React, { useState } from 'react';
import { Phone, CalendarClock, Check } from 'lucide-react';
import type { Lead, CallLogEntry } from '../types';
import { frDate } from '../utils/stage';
import { OUTCOMES, outcomeLabel, todayParis, addDays, callbackState } from '../utils/callbacks';

const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

/** Dossier client : journal des appels (qui, quand, résultat, note) et date du prochain rappel. */
export const LeadCallFollowup: React.FC<{ lead: Lead; onUpdate: (l: Lead) => void }> = ({ lead, onUpdate }) => {
  const [outcome, setOutcome] = useState<CallLogEntry['outcome']>('repondeur');
  const [note, setNote] = useState('');
  const [next, setNext] = useState<string>('');
  const log = lead.callLog || [];
  const state = callbackState(lead);

  const save = () => {
    const entry: CallLogEntry = { id: `call-${Date.now()}`, at: new Date().toISOString(), outcome, ...(note.trim() ? { note: note.trim() } : {}) };
    const label = `Appel : ${outcomeLabel(outcome)}${note.trim() ? ` — ${note.trim()}` : ''}`;
    onUpdate({
      ...lead,
      callLog: [entry, ...log],
      // Le rappel choisi remplace l'ancien ; sans date, on efface le rappel précédent (déjà traité)
      callbackDate: next || '',
      lastAction: { type: 'call', label, date: "À l'instant" },
      activities: [{ id: `act-${Date.now()}`, type: 'call', label, date: "À l'instant" }, ...(lead.activities || [])],
    });
    setNote('');
    setNext('');
  };

  const setCallback = (d: string) => onUpdate({ ...lead, callbackDate: d });

  const chip = (active: boolean) => `rounded-full border-2 px-3 py-1.5 text-xs font-bold ${active ? 'border-[#0B0F1F] bg-[#0B0F1F] text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4" id="lead-call-followup">
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 pb-3">
        <Phone className="w-4 h-4 text-stone-500" />
        <h4 className="text-sm font-bold text-stone-900">Suivi des appels</h4>
        {log.length > 0 && <span className="text-xs text-stone-500">({log.length})</span>}
        {lead.callbackDate && (
          <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${state === 'overdue' ? 'bg-red-100 text-red-800 border-2 border-red-600' : state === 'today' ? 'bg-amber-100 text-amber-900 border-2 border-amber-500' : 'bg-sky-50 text-sky-800 border-2 border-sky-300'}`}>
            <CalendarClock className="w-3.5 h-3.5" />
            {state === 'overdue' ? 'Rappel en retard' : state === 'today' ? "À rappeler aujourd'hui" : 'À rappeler le'} · {frDate(lead.callbackDate)}
          </span>
        )}
      </div>

      {lead.callbackDate && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-stone-700">Prochain rappel :</span>
          <input type="date" value={lead.callbackDate} onChange={(e) => setCallback(e.target.value)} aria-label="Date du prochain rappel" className="rounded-lg border border-stone-300 px-2 py-1 text-sm" />
          <button type="button" onClick={() => setCallback('')} className="inline-flex items-center gap-1 rounded-full bg-stone-100 hover:bg-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700"><Check className="w-3.5 h-3.5" /> Rappel fait / retirer</button>
        </div>
      )}

      <div className="space-y-3 rounded-xl bg-stone-50 border border-stone-200 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-600">Noter un appel</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Résultat de l'appel">
          {OUTCOMES.map((o) => (
            <button key={o.key} type="button" role="radio" aria-checked={outcome === o.key} onClick={() => setOutcome(o.key)} className={chip(outcome === o.key)}>{o.label}</button>
          ))}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note (ex. : message laissé, recontacter après 18 h)" aria-label="Note sur l'appel" className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-700">Rappeler :</span>
          {([['Demain', 1], ['Dans 2 jours', 2], ['Dans 1 semaine', 7]] as const).map(([l, n]) => (
            <button key={l} type="button" onClick={() => setNext(addDays(todayParis(), n))} className={chip(next === addDays(todayParis(), n))}>{l}</button>
          ))}
          <input type="date" value={next} min={todayParis()} onChange={(e) => setNext(e.target.value)} aria-label="Choisir une date de rappel" className="rounded-lg border border-stone-300 px-2 py-1 text-sm" />
          {next && <button type="button" onClick={() => setNext('')} className="text-xs underline text-stone-500">sans rappel</button>}
        </div>
        <button type="button" id="btn-save-call" onClick={save} className="inline-flex items-center gap-2 rounded-xl border-[3px] border-[#0B0F1F] bg-[#FFD60A] px-4 py-2 text-sm font-black text-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F]">
          <Phone className="w-4 h-4" /> Enregistrer l'appel
        </button>
      </div>

      {log.length === 0 ? (
        <p className="text-sm text-stone-400">Aucun appel noté pour l'instant.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {log.map((c) => (
            <li key={c.id} className="py-2 text-sm">
              <p className="font-semibold text-stone-900">{outcomeLabel(c.outcome)} <span className="text-xs font-normal text-stone-500">• {fmt(c.at)}</span></p>
              {c.note && <p className="text-stone-700">{c.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
