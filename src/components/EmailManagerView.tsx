import React, { useEffect, useMemo, useRef, useState } from 'react';
import { insertAtCursor } from '../utils/insertAtCursor';
import { CalendarClock, Loader2, Mail, Plus, Save, Send, Trash2 } from 'lucide-react';
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
    { label: 'Votre estimation à {Ville}', subject: 'Votre estimation à {Ville}', body: "Bonjour {Prénom},\n\nMerci d'avoir demandé l'estimation de votre {TypeBien} à {Ville}. La simulation situe sa valeur autour de {PrixEstime}. C'est un repère : seule une visite rapide permet d'ajuster l'évaluation selon l'état réel et la vue.\n\nSi vous le souhaitez, je peux passer voir votre bien. La visite est offerte et sans engagement." },
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

interface CustomTpl { id: string; stage: Stage; label: string; subject: string; body: string }

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
  const [customs, setCustoms] = useState<CustomTpl[]>([]);
  // Modèle sélectionné : intégré (index), personnalisé (id) ou nouveau message (null)
  const [current, setCurrent] = useState<{ kind: 'builtin'; i: number } | { kind: 'custom'; id: string } | null>({ kind: 'builtin', i: 0 });
  // Quand envoyer : tout de suite, à une date, ou en séquence (plusieurs messages espacés de quelques jours)
  const [when, setWhen] = useState<'now' | 'date' | 'seq'>('now');
  const [steps, setSteps] = useState<Array<{ delay: number; subject: string; body: string }>>([]);
  const [active, setActive] = useState(0);
  const [view, setView] = useState<'compose' | 'follow'>('compose');
  const [upcoming, setUpcoming] = useState<Array<{ id: string; leadName: string; subject: string; sendAt: string }> | null>(null);
  const [sentLogs, setSentLogs] = useState<Array<{ id: string; leadName: string; subject: string; status: string; sentAt: string }> | null>(null);
  // Recherche et filtres de la liste des contacts (utile avec des centaines de dossiers)
  const [q, setQ] = useState('');
  const [cityF, setCityF] = useState('');
  const [heatF, setHeatF] = useState<'ALL' | 'HOT' | 'WARM' | 'COLD'>('ALL');
  const [onlyEmail, setOnlyEmail] = useState(false);
  const [limit, setLimit] = useState(50);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [tplName, setTplName] = useState('');
  const [tplMsg, setTplMsg] = useState<string | null>(null);
  const [subject, setSubject] = useState(TEMPLATES.lead[0].subject);
  const [body, setBody] = useState(TEMPLATES.lead[0].body);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:30');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ ok: boolean; text: string } | null>(null);
  const [status, setStatus] = useState<{ emailConfigured: boolean; baseUrlConfigured: boolean; dailyLimit: number; sentLast24h: number } | null>(null);

  useEffect(() => {
    fetch('/api/relances/status', { credentials: 'same-origin' }).then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
    fetch('/api/email-templates', { credentials: 'same-origin' }).then((r) => r.json()).then((d) => setCustoms(Array.isArray(d.templates) ? d.templates : [])).catch(() => {});
  }, []);

  const byStage = useMemo(() => {
    const m: Record<Stage, Lead[]> = { lead: [], r1: [], r2: [], mandat: [], vente: [] };
    leads.filter((l) => !l.archive).forEach((l) => m[stageOf(l)].push(l));
    return m;
  }, [leads]);

  const list = byStage[stage];
  const sendable = (l: Lead) => UUID_RE.test(l.id) && EMAIL_RE.test(l.email || '');
  const cities = useMemo(() => (Array.from(new Set(list.map((l) => l.city).filter(Boolean))) as string[]).sort((a, b) => a.localeCompare(b, 'fr')), [list]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((l) => {
      if (needle && !`${l.name} ${l.city} ${l.email} ${l.phone}`.toLowerCase().includes(needle)) return false;
      if (cityF && l.city !== cityF) return false;
      if (heatF !== 'ALL' && l.status !== heatF) return false;
      if (onlyEmail && !(UUID_RE.test(l.id) && EMAIL_RE.test(l.email || ''))) return false;
      return true;
    });
  }, [list, q, cityF, heatF, onlyEmail]);
  const chosen = list.filter((l) => selected.has(l.id));
  const targets = chosen.filter(sendable);

  const seq = when === 'seq';
  const curSubject = seq ? steps[active]?.subject ?? '' : subject;
  const curBody = seq ? steps[active]?.body ?? '' : body;
  const setCurSubject = (v: string) => (seq ? setSteps((st) => st.map((x, i) => (i === active ? { ...x, subject: v } : x))) : setSubject(v));
  const setCurBody = (v: string | ((b: string) => string)) =>
    seq
      ? setSteps((st) => st.map((x, i) => (i === active ? { ...x, body: typeof v === 'function' ? v(x.body) : v } : x)))
      : setBody(v as any);
  const addStep = (sub: string, bod: string) => {
    setSteps((st) => {
      const delay = st.length ? st[st.length - 1].delay + 3 : 0;
      setActive(st.length);
      return [...st, { delay, subject: sub, body: bod }];
    });
  };
  const switchWhen = (w: 'now' | 'date' | 'seq') => {
    setWhen(w);
    setReport(null);
    if (w === 'seq' && steps.length === 0) {
      setSteps([{ delay: 0, subject, body }]);
      setActive(0);
    }
  };
  const recommended = () => {
    const list = TEMPLATES[stage];
    const delays = [0, 3, 7, 14, 21];
    setSteps(list.map((t, i) => ({ delay: delays[i] ?? delays[delays.length - 1] + (i - delays.length + 1) * 7, subject: t.subject, body: t.body })));
    setActive(0);
    setWhen('seq');
  };

  const pickStage = (s: Stage) => {
    setStage(s);
    setSelected(new Set());
    setQ('');
    setCityF('');
    setHeatF('ALL');
    setOnlyEmail(false);
    setLimit(50);
    setTplIdx(0);
    setCurrent({ kind: 'builtin', i: 0 });
    setTplName('');
    setTplMsg(null);
    setSubject(TEMPLATES[s][0].subject);
    setBody(TEMPLATES[s][0].body);
    setSteps([]);
    setActive(0);
    if (when === 'seq') setWhen('now');
    setReport(null);
  };
  const pickTemplate = (i: number) => {
    if (seq) { addStep(TEMPLATES[stage][i].subject, TEMPLATES[stage][i].body); return; }
    setTplIdx(i);
    setCurrent({ kind: 'builtin', i });
    setTplName('');
    setTplMsg(null);
    setSubject(TEMPLATES[stage][i].subject);
    setBody(TEMPLATES[stage][i].body);
  };
  const pickCustom = (t: CustomTpl) => {
    if (seq) { addStep(t.subject, t.body); return; }
    setCurrent({ kind: 'custom', id: t.id });
    setTplName(t.label);
    setTplMsg(null);
    setSubject(t.subject);
    setBody(t.body);
  };
  const newMessage = () => {
    if (seq) { addStep('', 'Bonjour {Prénom},\n\n'); return; }
    setCurrent(null);
    setTplName('');
    setTplMsg(null);
    setSubject('');
    setBody('Bonjour {Prénom},\n\n');
  };
  const persistCustoms = async (next: CustomTpl[]) => {
    try {
      const r = await fetch('/api/email-templates', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templates: next }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setTplMsg(d.error || "L'enregistrement a échoué."); return false; }
      setCustoms(d.templates || next);
      return true;
    } catch {
      setTplMsg('Serveur injoignable.');
      return false;
    }
  };
  const saveTemplate = async () => {
    const label = tplName.trim();
    const subject = curSubject;
    const body = curBody;
    if (!label || body.trim().length < 5) { setTplMsg('Donnez un nom au message et écrivez son contenu.'); return; }
    const existing = current?.kind === 'custom' ? customs.find((c) => c.id === current.id) : undefined;
    const tpl: CustomTpl = { id: existing?.id || `t-${Date.now()}`, stage, label, subject, body };
    const next = existing ? customs.map((c) => (c.id === existing.id ? tpl : c)) : [...customs, tpl];
    if (await persistCustoms(next)) {
      setCurrent({ kind: 'custom', id: tpl.id });
      setTplMsg(existing ? 'Message mis à jour.' : 'Message enregistré : il reste disponible pour cette étape.');
    }
  };
  const deleteTemplate = async (t: CustomTpl) => {
    if (!window.confirm(`Supprimer le message « ${t.label} » ?`)) return;
    if (await persistCustoms(customs.filter((c) => c.id !== t.id))) {
      if (current?.kind === 'custom' && current.id === t.id) pickTemplate(0);
    }
  };
  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const selectFiltered = (on: boolean) => setSelected((p) => { const n = new Set(p); filtered.forEach((l) => (on ? n.add(l.id) : n.delete(l.id))); return n; });

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

  const loadFollow = () => {
    fetch('/api/relances/scheduled', { credentials: 'same-origin' }).then((r) => r.json()).then((d) => setUpcoming(d.items || [])).catch(() => setUpcoming([]));
    fetch('/api/relances/history', { credentials: 'same-origin' }).then((r) => r.json()).then((d) => setSentLogs((d.logs || []).map((l: any) => ({ id: l.id, leadName: l.leadName, subject: l.subject, status: l.status, sentAt: l.sentAt })))).catch(() => setSentLogs([]));
  };
  useEffect(() => { if (view === 'follow') loadFollow(); }, [view]);
  const cancelScheduled = async (id: string) => {
    await fetch(`/api/relances/scheduled/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
    setUpcoming((u) => (u || []).filter((x) => x.id !== id));
  };

  const launchSequence = async () => {
    const valid = steps.filter((st) => st.body.trim().length >= 5 && st.subject.trim());
    if (!targets.length || !valid.length || valid.length !== steps.length) {
      setReport({ ok: false, text: 'Chaque message de la séquence doit avoir un objet et un texte.' });
      return;
    }
    const [hh, mm] = (time || '09:30').split(':').map(Number);
    const base = date ? new Date(`${date}T00:00:00`) : new Date();
    const at = (delay: number) => {
      const d = new Date(base);
      d.setDate(d.getDate() + delay);
      d.setHours(hh || 9, mm || 0, 0, 0);
      return d;
    };
    const immediate = !date && steps[0].delay === 0; // sans date de départ, le premier message part tout de suite
    if (!window.confirm(`Lancer la séquence de ${steps.length} message(s) pour ${targets.length} contact(s) ?${immediate ? ' Le premier message part tout de suite.' : ''}`)) return;
    setBusy(true);
    setReport(null);
    let sentNow = 0;
    let lastErr = '';
    if (immediate) {
      for (const l of targets) {
        try {
          const r = await fetch('/api/relances/send', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: l.id, subject: steps[0].subject, message: steps[0].body, step: 'Séquence • message 1' }) });
          const d = await r.json().catch(() => ({}));
          if (r.ok && d.success) sentNow++;
          else { lastErr = d.error || "L'envoi a échoué."; if (r.status === 429 || r.status === 503) break; }
        } catch { lastErr = 'Serveur injoignable.'; break; }
      }
    }
    const rest = steps.map((st, i) => ({ st, i })).filter(({ i }) => !(immediate && i === 0));
    let scheduled = 0;
    if (rest.length) {
      try {
        const r = await fetch('/api/relances/schedule-bulk', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadIds: targets.map((l) => l.id), steps: rest.map(({ st, i }) => ({ subject: st.subject, message: st.body, sendAt: at(st.delay).toISOString(), step: `Séquence • message ${i + 1} (J+${st.delay})` })) }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.success) scheduled = d.scheduled; else lastErr = d.error || 'Programmation impossible.';
      } catch { lastErr = 'Serveur injoignable.'; }
    }
    setBusy(false);
    setReport({ ok: !lastErr, text: `${immediate ? `${sentNow} e-mail(s) envoyé(s) tout de suite. ` : ''}${scheduled ? `${scheduled} envoi(s) programmé(s) pour la suite (voir l'onglet Suivi).` : ''}${lastErr ? ` ${lastErr}` : ''}`.trim() });
  };

  const field = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20';
  const nextLabel: Record<Stage, string> = { lead: 'Passer en R1', r1: 'Passer en R2', r2: 'Passer en Mandat', mandat: 'Passer en Vente', vente: '' };

  const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  const first = targets[0] || chosen[0];
  const fill = (t: string) =>
    t
      .replace(/\{Pr[ée]nom\}/g, first ? first.name.split(' ')[0] : 'Prénom')
      .replace(/\{Nom\}/g, first?.name || 'Nom Prénom')
      .replace(/\{Adresse\}/g, first?.address || first?.city || 'adresse du bien')
      .replace(/\{Ville\}/g, first?.city || 'Ville')
      .replace(/\{TypeBien\}/g, (first?.propertyType || 'bien').toLowerCase())
      .replace(/\{PrixEstime\}/g, first?.estimatedValue ? `${first.estimatedValue.toLocaleString('fr-FR')} €` : 'votre estimation')
      .replace(/\{Motif\}/g, first?.motive || 'votre projet');
  const stageStyle: Record<Stage, string> = {
    lead: 'bg-sky-500',
    r1: 'bg-amber-500',
    r2: 'bg-orange-500',
    mandat: 'bg-violet-500',
    vente: 'bg-emerald-500',
  };
  const stepNo = (n: number, t: string, sub?: string) => (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B0F1F] text-white text-sm font-extrabold shadow-sm">{n}</span>
      <div><h2 className="text-base font-bold text-stone-900 leading-tight">{t}</h2>{sub && <p className="text-xs text-stone-500">{sub}</p>}</div>
    </div>
  );
  const whenOptions: Array<['now' | 'date' | 'seq', string, string, string]> = [
    ['now', '⚡', 'Maintenant', "L'e-mail part tout de suite"],
    ['date', '📅', 'À une date', 'Choisissez le jour et l\'heure'],
    ['seq', '🔁', 'En séquence', 'Plusieurs e-mails espacés de quelques jours'],
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="rounded-3xl bg-[#0B0F1F] text-white p-5 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2"><Mail className="w-6 h-6 text-amber-300" /> Vos e-mails</h1>
          <p className="text-sm text-slate-300 mt-0.5">Choisissez vos contacts, écrivez, envoyez. Un seul endroit.</p>
        </div>
        <div className="inline-flex rounded-xl bg-white/10 p-1" role="tablist" aria-label="Outil e-mail">
          {([['compose', 'Écrire & envoyer'], ['follow', 'Suivi']] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${view === k ? 'bg-white text-[#0B0F1F] shadow-sm' : 'text-slate-200 hover:text-white'}`}>{l}</button>
          ))}
        </div>
      </div>

      {view === 'follow' ? (
        <div className="grid md:grid-cols-2 gap-4">
          <section className="bg-white rounded-2xl border border-stone-200 p-4">
            <h2 className="text-base font-bold text-stone-900">À venir</h2>
            <p className="text-xs text-stone-500 mb-3">Messages programmés, y compris les séquences. Vous pouvez en annuler un.</p>
            {upcoming === null ? <Loader2 className="w-4 h-4 animate-spin" /> : upcoming.length === 0 ? <p className="text-sm text-stone-400">Rien de programmé.</p> : (
              <ul className="divide-y divide-stone-100 max-h-[32rem] overflow-y-auto">
                {upcoming.map((u) => (
                  <li key={u.id} className="py-2 flex items-center gap-2 text-sm">
                    <div className="min-w-0 flex-1"><p className="font-semibold text-stone-900 truncate uppercase">{u.leadName}</p><p className="text-xs text-stone-500 truncate">{u.subject || 'Sans objet'} • {new Date(u.sendAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p></div>
                    <button type="button" onClick={() => cancelScheduled(u.id)} className="text-xs underline text-rose-700 shrink-0">Annuler</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="bg-white rounded-2xl border border-stone-200 p-4">
            <h2 className="text-base font-bold text-stone-900">Envoyés</h2>
            <p className="text-xs text-stone-500 mb-3">Les 100 derniers messages.</p>
            {sentLogs === null ? <Loader2 className="w-4 h-4 animate-spin" /> : sentLogs.length === 0 ? <p className="text-sm text-stone-400">Aucun message envoyé.</p> : (
              <ul className="divide-y divide-stone-100 max-h-[32rem] overflow-y-auto">
                {sentLogs.map((l) => (
                  <li key={l.id} className="py-2 text-sm">
                    <p className="font-semibold text-stone-900 truncate"><span className="uppercase">{l.leadName}</span> {l.status === 'erreur' && <span className="text-[10px] font-bold text-rose-700 bg-rose-50 rounded px-1.5 py-0.5 ml-1">échec</span>}{l.status === 'annule' && <span className="text-[10px] font-bold text-stone-600 bg-stone-100 rounded px-1.5 py-0.5 ml-1">annulé</span>}</p>
                    <p className="text-xs text-stone-500 truncate">{l.subject || 'Sans objet'} • {new Date(l.sentAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
      <>
      {status && (!status.emailConfigured || !status.baseUrlConfigured) && (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">L'envoi d'e-mails n'est pas encore configuré sur le serveur (Resend / APP_URL). Vous pouvez préparer vos messages, mais ils ne partiront pas.</p>
      )}

      {/* 1. CONTACTS */}
      <section className="rounded-3xl bg-white border border-stone-200 shadow-sm p-5 sm:p-6">
        {stepNo(1, 'À qui ?', 'Choisissez une étape, puis cochez les contacts.')}
        <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Étape du pipeline">
          {STAGES.map((st) => (
            <button key={st.key} type="button" role="tab" aria-selected={stage === st.key} onClick={() => pickStage(st.key)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${stage === st.key ? `${stageStyle[st.key]} text-white shadow-md` : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
              {st.label} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${stage === st.key ? 'bg-white/25' : 'bg-white'}`}>{byStage[st.key].length}</span>
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-400">Aucun contact à cette étape.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[14rem] flex-1">
                <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(50); }} placeholder="Rechercher un nom, une ville, un e-mail…" aria-label="Rechercher un contact" className="w-full rounded-full border border-stone-300 bg-stone-50 py-2.5 pl-4 pr-9 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300" />
                {q && <button type="button" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700" aria-label="Effacer la recherche">✕</button>}
              </div>
              <select value={cityF} onChange={(e) => { setCityF(e.target.value); setLimit(50); }} aria-label="Filtrer par ville" className="rounded-full border border-stone-300 bg-white px-3 py-2.5 text-sm">
                <option value="">Toutes les villes</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-1">
                {([['ALL', 'Tous'], ['HOT', '🔥'], ['WARM', '🟡'], ['COLD', '❄️']] as const).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => { setHeatF(k); setLimit(50); }} title={k === 'HOT' ? 'Chauds' : k === 'WARM' ? 'Tièdes' : k === 'COLD' ? 'Froids' : 'Tous'} className={`rounded-full px-3 py-2 text-xs font-bold ${heatF === k ? 'bg-[#0B0F1F] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{l}</button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-stone-600"><input type="checkbox" checked={onlyEmail} onChange={(e) => { setOnlyEmail(e.target.checked); setLimit(50); }} className="h-4 w-4" /> Avec e-mail valide</label>
            </div>

            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2 font-semibold text-stone-700"><input type="checkbox" aria-label="Tout sélectionner" checked={allOn} onChange={() => selectFiltered(!allOn)} className="h-4 w-4" /> Tout sélectionner{filtered.length !== list.length ? ` (${filtered.length} résultat${filtered.length > 1 ? 's' : ''})` : ` (${filtered.length})`}</label>
              <span className="flex items-center gap-2">
                {chosen.length > 0 && <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-semibold text-stone-500 underline">Tout désélectionner</button>}
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${chosen.length ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>{chosen.length} sélectionné{chosen.length > 1 ? 's' : ''}</span>
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200">
              <ul className="max-h-[22rem] divide-y divide-stone-100 overflow-y-auto">
                {filtered.length === 0 && <li className="p-6 text-center text-sm text-stone-400">Aucun contact ne correspond à cette recherche.</li>}
                {filtered.slice(0, limit).map((l) => {
                  const on = selected.has(l.id);
                  return (
                    <li key={l.id} onClick={() => toggle(l.id)} className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors ${on ? 'bg-sky-50' : 'hover:bg-stone-50'}`}>
                      <input type="checkbox" aria-label={`Sélectionner ${l.name}`} checked={on} onChange={() => toggle(l.id)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 shrink-0" />
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${stageStyle[stage]} text-[11px] font-extrabold text-white`}>{initials(l.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold uppercase text-stone-900">{l.name}</span>
                        <span className="block truncate text-[11px] text-stone-500">{l.city} • {l.propertyType} {l.surface} m²{l.estimatedValue ? ` • ${l.estimatedValue.toLocaleString('fr-FR')} €` : ''}</span>
                      </span>
                      <span className="hidden w-52 truncate text-xs text-stone-500 md:block">{sendable(l) ? l.email : <span className="font-semibold text-rose-600">pas d'e-mail valide</span>}</span>
                      {stage !== 'vente' && <button type="button" onClick={(e) => { e.stopPropagation(); advance(l); }} className="hidden shrink-0 text-[11px] font-semibold text-sky-700 underline sm:block">{nextLabel[stage]} →</button>}
                    </li>
                  );
                })}
              </ul>
            </div>
            {filtered.length > limit && (
              <button type="button" onClick={() => setLimit((n) => n + 100)} className="mt-3 w-full rounded-full border border-stone-300 bg-white py-2 text-sm font-bold text-stone-700 hover:bg-stone-50">Afficher plus ({filtered.length - limit} restants)</button>
            )}
          </>
        )}
      </section>

      {/* 2. MESSAGE */}
      <section className="rounded-3xl bg-white border border-stone-200 shadow-sm p-5 sm:p-6">
        {stepNo(2, 'Quel message ?', seq ? 'Cliquez un message pour l\'ajouter à la séquence, ou écrivez le vôtre.' : 'Choisissez un message prêt à l\'emploi ou écrivez le vôtre.')}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {TEMPLATES[stage].map((t, i) => (
            <button key={t.label} type="button" onClick={() => pickTemplate(i)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all ${!seq && current?.kind === 'builtin' && current.i === i ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`}>{t.label}</button>
          ))}
          {customs.filter((c) => c.stage === stage).map((c) => (
            <span key={c.id} className={`inline-flex items-center rounded-full border pl-3.5 pr-1.5 py-1 text-sm font-semibold ${!seq && current?.kind === 'custom' && current.id === c.id ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
              <button type="button" onClick={() => pickCustom(c)}>{c.label}</button>
              <button type="button" onClick={() => deleteTemplate(c)} aria-label={`Supprimer ${c.label}`} className="ml-1 rounded-full p-1 text-stone-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </span>
          ))}
          <button type="button" id="btn-new-mail" onClick={newMessage} className="inline-flex items-center gap-1 rounded-full bg-[#0B0F1F] hover:bg-[#2B4BFF] text-white text-sm font-bold px-3.5 py-1.5"><Plus className="w-4 h-4" /> Nouveau</button>
        </div>

        {seq && (
          <div className="mb-4 rounded-2xl bg-stone-50 border border-stone-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Votre séquence</p>
              <button type="button" onClick={recommended} className="text-xs font-bold text-sky-700 underline">Utiliser la séquence conseillée</button>
            </div>
            <ol className="flex flex-wrap items-stretch gap-2">
              {steps.map((st, i) => (
                <li key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => setActive(i)} className={`rounded-2xl border-2 px-3 py-2 text-left transition-all ${active === i ? 'border-sky-500 bg-white shadow-md' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                    <span className="block text-[10px] font-extrabold uppercase text-sky-700">Jour J+{st.delay}</span>
                    <span className="block max-w-[11rem] truncate text-sm font-semibold text-stone-800">{st.subject || `Message ${i + 1}`}</span>
                  </button>
                  {i < steps.length - 1 && <span className="text-stone-300">→</span>}
                </li>
              ))}
              <li><button type="button" onClick={() => addStep('', 'Bonjour {Prénom},\n\n')} className="h-full rounded-2xl border-2 border-dashed border-stone-300 px-4 py-2 text-sm font-bold text-stone-500 hover:bg-white">+ Ajouter</button></li>
            </ol>
            {steps[active] && (
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2 font-semibold text-stone-700">Envoyé au jour J+
                  <input type="number" min={0} max={365} value={steps[active].delay} onChange={(e) => setSteps((st) => st.map((x, i) => (i === active ? { ...x, delay: Math.max(0, Math.min(365, Number(e.target.value) || 0)) } : x)))} className="w-20 rounded-lg border border-stone-300 px-2 py-1.5" aria-label="Délai en jours" />
                </label>
                {steps.length > 1 && <button type="button" onClick={() => { setSteps((st) => st.filter((_, i) => i !== active)); setActive(0); }} className="text-xs font-semibold text-rose-700 underline">Retirer ce message</button>}
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div>
              <label htmlFor="bulk-subject" className="text-xs font-bold uppercase tracking-wider text-stone-500">Objet</label>
              <input id="bulk-subject" className={field} value={curSubject} onChange={(e) => setCurSubject(e.target.value)} placeholder="Ex : Votre estimation à {Ville}" />
            </div>
            <div>
              <label htmlFor="bulk-body" className="text-xs font-bold uppercase tracking-wider text-stone-500">Message</label>
              <textarea id="bulk-body" ref={bodyRef} rows={10} className={field} value={curBody} onChange={(e) => setCurBody(e.target.value)} />
              <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                <span className="text-stone-500">Insérer :</span>
                {VARS.map((v) => <button key={v} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertAtCursor(bodyRef.current, v, curBody, setCurBody)} className="rounded-full border border-sky-200 bg-sky-50 text-sky-800 px-2.5 py-1 font-semibold hover:bg-sky-100">{v}</button>)}
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-stone-50 border border-stone-200 p-3">
              <div className="flex-1 min-w-[10rem]">
                <label htmlFor="tpl-name" className="text-[10px] font-bold uppercase text-stone-500 block mb-1">Garder ce message pour plus tard</label>
                <input id="tpl-name" className={field} value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Nom du message" />
              </div>
              <button type="button" id="btn-save-tpl" onClick={saveTemplate} className="rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-2.5 flex items-center gap-1.5"><Save className="w-4 h-4" /> {current?.kind === 'custom' && !seq ? 'Mettre à jour' : 'Enregistrer'}</button>
              {tplMsg && <p role="status" className="basis-full text-xs text-stone-600">{tplMsg}</p>}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Aperçu{first ? ` pour ${first.name}` : ''}</p>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 shadow-inner min-h-[16rem]">
              <p className="text-sm font-bold text-stone-900 border-b border-stone-200 pb-2 mb-3">{fill(curSubject) || <span className="text-stone-300">Objet de l'e-mail</span>}</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700">{fill(curBody)}</p>
              <p className="mt-4 text-[11px] text-stone-400">Votre signature, votre téléphone et le lien de désinscription sont ajoutés automatiquement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. QUAND */}
      <section className="rounded-3xl bg-white border border-stone-200 shadow-sm p-5 sm:p-6">
        {stepNo(3, 'Quand ?', 'E-mail uniquement pour le moment (SMS et WhatsApp pas encore connectés).')}
        <div className="grid sm:grid-cols-3 gap-3" role="tablist" aria-label="Quand envoyer">
          {whenOptions.map(([k, icon, label, hint]) => (
            <button key={k} type="button" role="tab" aria-selected={when === k} onClick={() => switchWhen(k)} className={`rounded-2xl border-2 p-4 text-left transition-all ${when === k ? 'border-sky-500 bg-sky-50 shadow-md' : 'border-stone-200 hover:border-stone-300'}`}>
              <span className="text-2xl">{icon}</span>
              <span className="block mt-1 font-extrabold text-stone-900">{label}</span>
              <span className="block text-xs text-stone-500">{hint}</span>
            </button>
          ))}
        </div>
        {when !== 'now' && (
          <div className="mt-4 flex flex-wrap items-end gap-4 rounded-2xl bg-stone-50 border border-stone-200 p-4 text-sm">
            <div><label htmlFor="bulk-date" className="block text-[11px] font-bold uppercase text-stone-500 mb-1">{seq ? 'Premier envoi (J+0)' : 'Date'}</label><input id="bulk-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-stone-300 px-3 py-2" /></div>
            <div><label htmlFor="bulk-time" className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Heure</label><input id="bulk-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg border border-stone-300 px-3 py-2" /></div>
            {seq && <p className="text-xs text-stone-500 max-w-xs">{date ? 'Tous les messages sont programmés à partir de cette date.' : 'Sans date, le premier message part tout de suite et les suivants sont programmés.'}</p>}
          </div>
        )}
      </section>

      {report && <p role="status" className={`rounded-2xl p-3 text-sm font-semibold ${report.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>{report.text}</p>}

      {/* ACTION */}
      <div className="sticky bottom-3 z-10 rounded-3xl bg-[#0B0F1F] text-white p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{targets.length} contact{targets.length > 1 ? 's' : ''} prêt{targets.length > 1 ? 's' : ''}{chosen.length !== targets.length ? ` • ${chosen.length - targets.length} sans e-mail valide ignoré(s)` : ''}</p>
          {status && <p className="text-[11px] text-slate-300">Limite d'envoi : {status.sentLast24h} / {status.dailyLimit} e-mails sur 24 h</p>}
        </div>
        {when === 'now' && (
          <button type="button" onClick={sendNow} disabled={busy || !targets.length} className="rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B0F1F] disabled:opacity-40 text-sm font-extrabold px-5 py-3 flex items-center gap-2">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Envoyer maintenant à {targets.length}
          </button>
        )}
        {when === 'date' && (
          <button type="button" onClick={schedule} disabled={busy || !targets.length || !date} className="rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B0F1F] disabled:opacity-40 text-sm font-extrabold px-5 py-3 flex items-center gap-2"><CalendarClock className="w-5 h-5" /> Programmer pour {targets.length}</button>
        )}
        {when === 'seq' && (
          <button type="button" id="btn-launch-seq" onClick={launchSequence} disabled={busy || !targets.length || steps.length === 0} className="rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B0F1F] disabled:opacity-40 text-sm font-extrabold px-5 py-3 flex items-center gap-2">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Lancer la séquence ({steps.length}) pour {targets.length}
          </button>
        )}
      </div>
      </>
      )}
    </div>
  );
};
