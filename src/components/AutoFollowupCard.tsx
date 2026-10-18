import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { RichEmailEditor, RichEmailEditorHandle } from './RichEmailEditor';
import { AutoFollowupConfig, DEFAULT_AUTO_FOLLOWUP } from '../data/autoFollowup';

const VARS = ['{Prénom}', '{Ville}', '{TypeBien}', '{PrixBas}', '{PrixHaut}'];

/** Settings of the e-mail sent automatically to a visitor who got an estimate but did not book. */
export const AutoFollowupCard: React.FC = () => {
  const [cfg, setCfg] = useState<AutoFollowupConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<RichEmailEditorHandle>(null);

  useEffect(() => {
    fetch('/api/auto-followup', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setCfg(d.config || DEFAULT_AUTO_FOLLOWUP))
      .catch(() => setCfg(DEFAULT_AUTO_FOLLOWUP));
  }, []);

  const save = async (next: AutoFollowupConfig) => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/auto-followup', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setCfg(d.config); setMsg({ ok: true, text: 'Enregistré.' }); } else setMsg({ ok: false, text: d.error || 'Enregistrement impossible.' });
    } catch {
      setMsg({ ok: false, text: 'Serveur injoignable.' });
    }
    setSaving(false);
  };

  if (!cfg) return <div className="mb-4"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  return (
    <section id="auto-followup" className="mb-4 rounded-2xl border-[3px] border-[#0B0F1F] bg-white p-4 shadow-[4px_4px_0_#0B0F1F]">
      <div className="flex flex-wrap items-center gap-3">
        <MailCheck className="w-5 h-5 text-[#2B4BFF]" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-stone-900">Relance automatique après l'estimation</h2>
          <p className="text-xs text-stone-600">Un seul e-mail, envoyé peu après l'estimation aux visiteurs qui ont reçu leur fourchette de prix mais n'ont pas pris rendez-vous. Il n'est pas envoyé si un rendez-vous est pris entre-temps.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-stone-800">
          <input id="auto-followup-enabled" type="checkbox" className="h-5 w-5 accent-[#2B4BFF]" checked={cfg.enabled} disabled={saving} onChange={(e) => void save({ ...cfg, enabled: e.target.checked })} />
          {cfg.enabled ? 'Activée' : 'Désactivée'}
        </label>
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 text-xs font-bold text-sky-700 underline">{open ? 'Masquer le message' : 'Voir / modifier le message'}</button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor="auto-followup-delay" className="font-semibold text-stone-800">Envoi</label>
            <input id="auto-followup-delay" type="number" min={1} max={1440} value={cfg.delayMinutes} onChange={(e) => setCfg({ ...cfg, delayMinutes: Number(e.target.value) })} className="w-20 rounded-lg border border-stone-300 px-2 py-1.5" />
            <span className="text-stone-600">minutes après l'estimation (une seule relance, de jour comme de nuit)</span>
          </div>
          <div>
            <label htmlFor="auto-followup-subject" className="text-sm font-semibold text-stone-800">Objet</label>
            <input id="auto-followup-subject" value={cfg.subject} onChange={(e) => setCfg({ ...cfg, subject: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">Message</p>
            <div className="mt-1 mb-1 flex flex-wrap gap-1.5 text-xs">
              {VARS.map((v) => <button key={v} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => ref.current?.insertText(v)} className="rounded-full border border-sky-200 bg-sky-50 text-sky-800 px-2.5 py-1 font-semibold hover:bg-sky-100">{v}</button>)}
            </div>
            <RichEmailEditor id="auto-followup-body" ref={ref} value={cfg.body} onChange={(h) => setCfg((c) => (c ? { ...c, body: h } : c))} />
            <p className="mt-1 text-[11px] text-stone-500">Le bouton « Choisir mon créneau », la signature et le lien de désinscription sont ajoutés automatiquement.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" id="btn-save-auto-followup" disabled={saving} onClick={() => void save(cfg)} className="rounded-full bg-[#0B0F1F] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" onClick={() => setCfg({ ...DEFAULT_AUTO_FOLLOWUP, enabled: cfg.enabled })} className="text-xs underline text-stone-600">Rétablir le texte d'origine</button>
            {msg && <span role="status" className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</span>}
          </div>
        </div>
      )}
    </section>
  );
};
