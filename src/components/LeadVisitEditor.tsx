import React, { useState } from 'react';
import { Pencil, Loader2, Check } from 'lucide-react';
import type { Lead } from '../types';
import { frDate } from '../utils/stage';
import { saveLeadVisit } from '../lib/supabaseService';

const isDbId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** R1 réservé en ligne par le client : la conseillère peut le déplacer (accord pris à l'oral), l'agenda Cal.com suit. */
export const LeadVisitEditor: React.FC<{ lead: Lead; onUpdate: (l: Lead) => void }> = ({ lead, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [syncCal, setSyncCal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calRefused, setCalRefused] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const start = () => {
    setDate(lead.meetingDate || '');
    setTime(lead.meetingTime || '10:00');
    setSyncCal(true);
    setError(null);
    setCalRefused(false);
    setDone(null);
    setOpen(true);
  };

  const apply = async (syncCalendar: boolean) => {
    setBusy(true);
    setError(null);
    const r: Awaited<ReturnType<typeof saveLeadVisit>> = isDbId(lead.id) ? await saveLeadVisit(lead.id, { date, time, syncCalendar }) : { ok: true, calSynced: false };
    setBusy(false);
    if (r.ok === false) {
      setError(r.error);
      setCalRefused(Boolean(r.calRefused));
      return;
    }
    const label = `R1 déplacé au ${frDate(date)} à ${time} (accord pris avec le client)${r.calSynced ? ', agenda mis à jour' : ', agenda inchangé'}`;
    onUpdate({
      ...lead,
      meetingDate: date,
      meetingTime: time,
      lastAction: { type: 'visit', label, date: "À l'instant" },
      activities: [{ id: `act-${Date.now()}`, type: 'visit', label, date: "À l'instant" }, ...(lead.activities || [])],
    });
    setOpen(false);
    setDone(r.calSynced ? 'Rendez-vous modifié, agenda Cal.com mis à jour.' : "Rendez-vous modifié dans le dossier (agenda Cal.com non modifié : pense à le déplacer à la main).");
  };

  const field = 'rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm';

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 space-y-2" id="lead-visit-editor">
      <div className="text-[11px] font-bold uppercase tracking-wider text-orange-800">R1 • Visite d'estimation</div>
      <p className="text-xs text-stone-600">Réservé en ligne par le client.</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-stone-900">📅 {lead.meetingDate ? frDate(lead.meetingDate) : 'Date à confirmer'}{lead.meetingTime ? ` à ${lead.meetingTime}` : ''}</p>
        {!open && (
          <button type="button" id="btn-edit-visit" onClick={start} className="inline-flex items-center gap-1.5 rounded-lg border-2 border-orange-300 bg-white px-3 py-1.5 text-xs font-bold text-orange-900 hover:border-orange-500">
            <Pencil className="w-3.5 h-3.5" /> Modifier la date ou l'heure
          </button>
        )}
      </div>
      {done && <p role="status" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800"><Check className="w-3.5 h-3.5" /> {done}</p>}
      {open && (
        <form onSubmit={(e) => { e.preventDefault(); void apply(syncCal); }} className="space-y-3 rounded-lg bg-white p-3 border border-orange-200" aria-label="Modifier le rendez-vous">
          <div className="flex flex-wrap items-end gap-3">
            <div><label htmlFor="rv-date" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Nouvelle date</label><input id="rv-date" type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><label htmlFor="rv-time" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Nouvelle heure</label><input id="rv-time" type="time" step={900} className={field} value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <label className="flex items-start gap-2 text-xs text-stone-700 cursor-pointer">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#2B4BFF]" checked={syncCal} onChange={(e) => setSyncCal(e.target.checked)} />
            <span>Déplacer aussi le rendez-vous dans l'agenda Cal.com (conseillé). Le client reçoit alors la mise à jour de Cal.com.</span>
          </label>
          {error && <p role="alert" className="text-sm font-bold text-rose-700">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" id="btn-save-visit" disabled={busy || !date || !time} className="inline-flex items-center gap-2 rounded-xl border-[3px] border-[#0B0F1F] bg-[#FFD60A] px-4 py-2 text-sm font-black text-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F] disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enregistrer
            </button>
            {calRefused && (
              <button type="button" id="btn-save-visit-dashboard" disabled={busy} onClick={() => void apply(false)} className="text-xs font-bold underline text-stone-700">
                Enregistrer quand même dans le dossier (sans changer l'agenda)
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold underline text-stone-600">Annuler</button>
          </div>
        </form>
      )}
    </div>
  );
};
