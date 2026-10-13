import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Mail, Send } from 'lucide-react';
import { Lead } from '../types';
import { AGENT } from '../data/siteContent';

import { stageOf, type Stage } from '../utils/stage';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const STAGES: Array<{ key: Stage; label: string; badge: string; badgeCls: string }> = [
  { key: 'lead', label: 'Leads', badge: 'LEAD', badgeCls: 'bg-sky-100 text-sky-800' },
  { key: 'r1', label: 'R1', badge: 'R1', badgeCls: 'bg-amber-100 text-amber-800' },
  { key: 'r2', label: 'R2', badge: 'R2', badgeCls: 'bg-orange-100 text-orange-800' },
  { key: 'mandat', label: 'Mandat', badge: 'MANDAT', badgeCls: 'bg-violet-100 text-violet-800' },
  { key: 'vente', label: 'Vente', badge: 'VENTE', badgeCls: 'bg-emerald-100 text-emerald-800' },
];

/** Messages prêts à l'emploi par étape. Aucun fait inventé : uniquement les variables du dossier. */
const TEMPLATES: Record<Stage, Array<{ label: string; subject: string; body: string }>> = {
  lead: [
    { label: 'Votre estimation à {Ville}', subject: 'Votre estimation à {Ville}', body: "Bonjour {Prénom},\n\nMerci d'avoir demandé l'estimation de votre {TypeBien} à {Ville}. La simulation situe sa valeur autour de {PrixEstime}. C'est un repère : seule une visite rapide permet d'ajuster l'évaluation selon l'état réel et la vue.\n\nSi vous le souhaitez, je peux passer voir votre bien. La visite est gratuite et sans engagement." },
    { label: 'Ce qui fait varier le prix', subject: 'Ce qui fait varier le prix d\'un bien', body: "Bonjour {Prénom},\n\nLuminosité, étage, état général, travaux, vue : plusieurs éléments font varier le prix d'un {TypeBien} à {Ville}, et ils ne se voient que sur place.\n\nJe peux venir les observer et vous remettre un avis de valeur sous 48h, sans engagement." },
    { label: 'Où en est votre projet ?', subject: 'Où en est votre projet immobilier ?', body: "Bonjour {Prénom},\n\nJe reviens simplement vers vous au sujet de votre projet ({Motif}). Où en est votre réflexion ? Je reste disponible pour en parler quelques minutes, à votre rythme." },
    { label: 'Documents utiles', subject: 'Les documents utiles pour une vente', body: "Bonjour {Prénom},\n\nSi vous les avez, ces éléments m'aideront à affiner l'avis de valeur : taxe foncière, charges de copropriété, diagnostics, plan et liste des travaux réalisés. Rien d'obligatoire, je vous guiderai sur place." },
  ],
  r1: [
    { label: 'Rappel de visite', subject: 'Rappel de notre rendez-vous', body: "Bonjour {Prénom},\n\nJe vous rappelle notre rendez-vous pour la visite de votre {TypeBien} à {Ville}. Si vous avez un imprévu, répondez simplement à cet e-mail ou appelez-moi : je m'adapterai." },
    { label: 'Après la visite', subject: 'Merci pour votre accueil', body: "Bonjour {Prénom},\n\nMerci de m'avoir accueillie pour la visite de votre {TypeBien}. Je prépare votre avis de valeur et je reviens vers vous très vite pour vous le présenter." },
  ],
  r2: [
    { label: 'Rappel de la seconde visite', subject: 'Rappel de notre prochain rendez-vous', body: "Bonjour {Prénom},\n\nJe vous rappelle notre prochain rendez-vous au sujet de votre {TypeBien} à {Ville}. Si vous avez un imprévu, répondez simplement à cet e-mail ou appelez-moi : je m'adapterai." },
    { label: 'Après la seconde visite', subject: 'Suite à notre rendez-vous', body: "Bonjour {Prénom},\n\nMerci pour notre échange. Je reste à votre disposition pour toute question avant que vous preniez votre décision, sans aucune pression." },
  ],
  mandat: [
    { label: 'Point sur votre vente', subject: 'Point sur la vente de votre bien', body: "Bonjour {Prénom},\n\nJe fais un point avec vous sur la commercialisation de votre {TypeBien} à {Ville}. Avez-vous un moment cette semaine pour en discuter ?" },
  ],
  vente: [
    { label: 'Remerciements', subject: 'Merci pour votre confiance', body: "Bonjour {Prénom},\n\nMerci pour la confiance que vous m'avez accordée pour la vente de votre bien. Je reste à votre disposition pour toute question." },
  ],
};

const VARS = ['{Prénom}', '{Nom}', '{Adresse}', '{Ville}', '{TypeBien}', '{PrixEstime}', '{Motif}'];

interface Props {
  leads: Lead[];
  onUpdateLead: (l: Lead) => void;
  onShowToast?: (m: string) => void;
}

export const EmailManagerView: React.FC<Props> = ({ leads, onUpdateLead, onShowToast }) => {
  const [stage, setStage] = useState<Stage>('lead');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tplIdx, setTplIdx] = useState(0);
  const [subject, setSubject] = useState(TEMPLATES.lead[0].subject);
  const [body, setBody] = useState(TEMPLATES.lead[0].body);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:30');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ ok: boolean; text: string } | null>(null);
  const [status, setStatus] = useState<{ emailConfigured: boolean; baseUrlConfigured: boolean; dailyLimit: number; sentLast24h: number } | null>(null);

  useEffect(() => {
    fetch('/api/relances/status', { credentials: 'same-origin' }).then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
  }, []);

  const byStage = useMemo(() => {
    const m: Record<Stage, Lead[]> = { lead: [], r1: [], r2: [], mandat: [], vente: [] };
    leads.filter((l) => !l.archive).forEach((l) => m[stageOf(l)].push(l));
    return m;
  }, [leads]);

  const list = byStage[stage];
  const sendable = (l: Lead) => UUID_RE.test(l.id) && EMAIL_RE.test(l.email || '');
  const chosen = list.filter((l) => selected.has(l.id));
  const targets = chosen.filter(sendable);

  const pickStage = (s: Stage) => {
    setStage(s);
    setSelected(new Set());
    setTplIdx(0);
    setSubject(TEMPLATES[s][0].subject);
    setBody(TEMPLATES[s][0].body);
    setReport(null);
  };
  const pickTemplate = (i: number) => {
    setTplIdx(i);
    setSubject(TEMPLATES[stage][i].subject);
    setBody(TEMPLATES[stage][i].body);
  };
  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = list.length > 0 && list.every((l) => selected.has(l.id));

  const advance = (l: Lead) => {
    const today = new Date().toISOString().slice(0, 10);
    const s = stageOf(l);
    if (s === 'lead') onUpdateLead({ ...l, meetingBooked: true });
    else if (s === 'r1') {
      const d = window.prompt(`Date du R2 pour ${l.name} (AAAA-MM-JJ) :`, today);
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      onUpdateLead({ ...l, visit2: { date: d, time: '10:00' } });
    } else if (s === 'r2') {
      if (!window.confirm(`Passer ${l.name} en « Mandat signé » ? Les statistiques seront mises à jour.`)) return;
      onUpdateLead({ ...l, mandate: { ...(l.mandate || { type: 'simple' as const }), type: l.mandate?.type && l.mandate.type !== 'none' ? l.mandate.type : 'simple', status: 'signed', signedDate: today } as Lead['mandate'] });
    } else if (s === 'mandat') {
      if (!window.confirm(`Marquer la vente de ${l.name} comme conclue ? Pensez à renseigner les honoraires encaissés dans sa fiche.`)) return;
      onUpdateLead({ ...l, mandate: { ...l.mandate!, soldDate: today, saleFee: l.mandate?.saleFee || 0 } });
    }
    setSelected((p) => { const n = new Set(p); n.delete(l.id); return n; });
  };

  const sendNow = async () => {
    if (!targets.length || !subject.trim() || body.trim().length < 5) return;
    if (!window.confirm(`Envoyer cet e-mail maintenant à ${targets.length} contact(s) ?`)) return;
    setBusy(true);
    setReport(null);
    let ok = 0;
    let lastErr = '';
    for (const l of targets) {
      try {
        const r = await fetch('/api/relances/send', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: l.id, subject, message: body, step: 'Envoi groupé' }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.success) ok++;
        else {
          lastErr = d.error || "L'envoi a échoué.";
          if (r.status === 429 || r.status === 503) break;
        }
      } catch {
        lastErr = 'Serveur injoignable.';
        break;
      }
    }
    setBusy(false);
    setReport({ ok: ok === targets.length, text: `${ok} e-mail(s) envoyé(s) sur ${targets.length}.${lastErr ? ` ${lastErr}` : ''}` });
    if (ok) onShowToast?.(`${ok} e-mail(s) envoyé(s).`);
  };

  const schedule = async () => {
    if (!targets.length || !date || !subject.trim() || body.trim().length < 5) return;
    const sendAt = new Date(`${date}T${time || '09:30'}:00`);
    if (isNaN(sendAt.getTime()) || sendAt.getTime() < Date.now()) {
      setReport({ ok: false, text: 'Choisissez une date et une heure à venir.' });
      return;
    }
    setBusy(true);
    setReport(null);
    try {
      const r = await fetch('/api/relances/schedule-bulk', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: targets.map((l) => l.id), subject, message: body, sendAt: sendAt.toISOString(), step: 'Envoi groupé programmé' }),
      });
      const d = await r.json().catch(() => ({}));
      setReport(r.ok && d.success ? { ok: true, text: `Envoi programmé pour ${d.scheduled} contact(s) le ${sendAt.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}.` } : { ok: false, text: d.error || 'Programmation impossible.' });
    } catch {
      setReport({ ok: false, text: 'Serveur injoignable.' });
    }
    setBusy(false);
  };

  const field = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20';
  const nextLabel: Record<Stage, string> = { lead: 'Passer en R1', r1: 'Passer en R2', r2: 'Passer en Mandat', mandat: 'Passer en Vente', vente: '' };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg sm:text-xl font-extrabold text-stone-900 flex items-center gap-2"><Mail className="w-5 h-5" /> Gestionnaire d'e-mails</h1>
          <span className="text-xs bg-sky-50 text-sky-800 border border-sky-200 rounded-full px-2.5 py-0.5">{AGENT.name} • Lyon &amp; Beaujolais</span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Étape du pipeline">
          {STAGES.map((s, i) => (
            <button key={s.key} type="button" role="tab" aria-selected={stage === s.key} onClick={() => pickStage(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${stage === s.key ? 'bg-[#0f1f3d] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
              {i + 1}. {s.label} ({byStage[s.key].length})
            </button>
          ))}
        </div>
      </div>

      {status && (!status.emailConfigured || !status.baseUrlConfigured) && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">L'envoi d'e-mails n'est pas encore configuré sur le serveur (Resend / APP_URL). Vous pouvez préparer vos messages, mais ils ne partiront pas.</p>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between text-sm">
          <span className="font-bold text-stone-800">Sélectionner le ou les contacts</span>
          <span className="text-xs font-semibold text-emerald-700">{chosen.length} sélectionné(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-[11px] uppercase text-stone-500 bg-stone-50">
              <tr>
                <th className="p-3 w-10"><input type="checkbox" aria-label="Tout sélectionner" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(list.map((l) => l.id)))} /></th>
                <th className="p-3 text-left">Contact</th><th className="p-3 text-left">Bien &amp; localisation</th><th className="p-3 text-left">Estimation</th><th className="p-3 text-left">Téléphone</th><th className="p-3 text-left">Statut</th><th className="p-3 text-right">Évolution</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-stone-400">Aucun contact à cette étape.</td></tr>}
              {list.map((l) => {
                const st = STAGES.find((s) => s.key === stage)!;
                return (
                  <tr key={l.id} className={`border-t border-stone-100 ${selected.has(l.id) ? 'bg-sky-50' : ''}`}>
                    <td className="p-3"><input type="checkbox" aria-label={`Sélectionner ${l.name}`} checked={selected.has(l.id)} onChange={() => toggle(l.id)} /></td>
                    <td className="p-3 font-semibold text-stone-900">{l.name}{!sendable(l) && <span className="ml-2 text-[10px] font-normal text-rose-600" title="Adresse e-mail ou fiche non enregistrée">sans e-mail valide</span>}</td>
                    <td className="p-3 text-stone-700">{l.propertyType} {l.surface} m² • {l.city}</td>
                    <td className="p-3 font-semibold">{l.estimatedValue ? `${l.estimatedValue.toLocaleString('fr-FR')} €` : '—'}</td>
                    <td className="p-3 text-stone-600 whitespace-nowrap">{l.phone}</td>
                    <td className="p-3"><span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${st.badgeCls}`}>{st.badge}</span></td>
                    <td className="p-3 text-right">
                      {stage === 'vente' ? <span className="text-xs text-emerald-700 font-semibold">✓ Transaction clôturée</span> : (
                        <button type="button" onClick={() => advance(l)} className="rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold px-2.5 py-1.5">{nextLabel[stage]} →</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-[18rem_1fr] gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-3">
          <div className="text-xs font-bold uppercase text-stone-500 mb-2">Messages types ({TEMPLATES[stage].length})</div>
          <div className="space-y-2">
            {TEMPLATES[stage].map((t, i) => (
              <button key={t.label} type="button" onClick={() => pickTemplate(i)} className={`w-full text-left rounded-xl border p-2.5 text-sm ${tplIdx === i ? 'border-sky-500 bg-sky-50' : 'border-stone-200 hover:bg-stone-50'}`}>
                <span className="inline-flex w-5 h-5 mr-2 items-center justify-center rounded-full bg-[#0f1f3d] text-white text-[11px] font-bold">{i + 1}</span>
                <span className="font-semibold text-stone-800">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 flex flex-wrap items-end gap-3 text-xs">
            <div><div className="font-bold text-stone-500 uppercase mb-1">Canal</div><span className="inline-block rounded bg-[#0f1f3d] text-white font-bold px-3 py-1.5">E-mail</span> <span className="text-stone-400 ml-1">SMS et WhatsApp : pas encore connectés</span></div>
            <div><label htmlFor="bulk-date" className="font-bold text-stone-500 uppercase block mb-1">Date (optionnel)</label><input id="bulk-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border border-stone-300 px-2 py-1" /></div>
            <div><label htmlFor="bulk-time" className="font-bold text-stone-500 uppercase block mb-1">Heure</label><input id="bulk-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded border border-stone-300 px-2 py-1" /></div>
          </div>
          <div>
            <label htmlFor="bulk-subject" className="text-xs font-bold text-stone-600">Objet de l'e-mail</label>
            <input id="bulk-subject" className={field} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label htmlFor="bulk-body" className="text-xs font-bold text-stone-600">Corps du message</label>
            <textarea id="bulk-body" rows={9} className={field} value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
              <span className="text-stone-500">Balises :</span>
              {VARS.map((v) => <button key={v} type="button" onClick={() => setBody((b) => `${b}${v}`)} className="rounded border border-sky-200 bg-sky-50 text-sky-800 px-2 py-0.5 font-semibold">+ {v}</button>)}
            </div>
          </div>
          {report && <p role="status" className={`text-sm rounded-lg p-2.5 ${report.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{report.text}</p>}
          <div className="rounded-xl bg-[#0f1f3d] text-white p-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold">⚡ Action groupée : {targets.length} contact(s){chosen.length !== targets.length ? ` (${chosen.length - targets.length} sans e-mail valide ignoré(s))` : ''}</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={schedule} disabled={busy || !targets.length || !date} className="rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-xs font-bold px-3 py-2 flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> Programmer</button>
              <button type="button" onClick={sendNow} disabled={busy || !targets.length} className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-bold px-3 py-2 flex items-center gap-1.5">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer maintenant à {targets.length}
              </button>
            </div>
          </div>
          {status && <p className="text-[11px] text-stone-400">Limite d'envoi : {status.sentLast24h} / {status.dailyLimit} e-mails sur 24 h. Les variables sont remplacées contact par contact.</p>}
        </div>
      </div>
    </div>
  );
};
