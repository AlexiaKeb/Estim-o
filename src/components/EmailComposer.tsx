import React, { useEffect, useMemo, useState } from 'react';
import { X, Send, Loader2, CheckCircle2, AlertCircle, Mail, Settings } from 'lucide-react';
import { Lead } from '../types';

interface Props {
  lead: Lead;
  onClose: () => void;
  onSent: (subject: string) => void;
}

interface MailStatus {
  emailConfigured: boolean;
  from: string | null;
  replyTo: string | null;
  baseUrlConfigured: boolean;
  dailyLimit: number;
  sentLast24h: number;
}

interface Sent {
  id: string;
  subject: string | null;
  message: string;
  status: string;
  sent_at: string | null;
  error: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Les variables {Prénom}, {Ville}, {TypeBien}, {PrixEstime}, {Motif} sont remplacées par le serveur à l'envoi. */
const fillPreview = (text: string, lead: Lead) =>
  text
    .replace(/\{Prénom\}/g, lead.name.split(' ')[0] || '')
    .replace(/\{Ville\}/g, lead.city || 'votre commune')
    .replace(/\{TypeBien\}/g, (lead.propertyType || 'bien').toLowerCase())
    .replace(/\{PrixEstime\}/g, lead.estimatedValue ? `${lead.estimatedValue.toLocaleString('fr-FR')} €` : 'votre estimation')
    .replace(/\{Motif\}/g, lead.motive || 'votre projet');

function templatesFor(lead: Lead): Array<{ id: string; label: string; subject: string; body: string }> {
  const rdv = lead.meetingDate && lead.meetingTime ? `${new Date(`${lead.meetingDate}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })} à ${lead.meetingTime}` : '';
  return [
    {
      id: 'contact',
      label: "Suite à la demande d'estimation",
      subject: 'Votre estimation à {Ville}',
      body: "Bonjour {Prénom},\n\nJe vous remercie d'avoir demandé l'estimation de votre {TypeBien} à {Ville}. Je me permets de revenir vers vous pour en discuter et, si vous le souhaitez, convenir d'une visite gratuite et sans engagement.\n\nQuand seriez-vous disponible pour en parler ?",
    },
    {
      id: 'rdv',
      label: 'Confirmation de rendez-vous',
      subject: 'Confirmation de notre rendez-vous',
      body: `Bonjour {Prénom},\n\nJe vous confirme notre rendez-vous${rdv ? ` le ${rdv}` : ''} pour la visite de votre {TypeBien} à {Ville}.\n\nSi vous avez un imprévu, répondez simplement à cet e-mail ou appelez-moi : je m'adapterai à vos disponibilités.\n\nÀ très bientôt,`,
    },
    {
      id: 'visite',
      label: 'Après la visite',
      subject: 'Merci pour votre accueil',
      body: "Bonjour {Prénom},\n\nMerci de m'avoir accueillie pour la visite de votre {TypeBien}. Je prépare l'avis de valeur et je reviens vers vous très vite pour vous le présenter.\n\nN'hésitez pas si une question vous revient d'ici là.",
    },
    {
      id: 'relance',
      label: 'Relance après un premier contact',
      subject: 'Où en est votre projet ?',
      body: "Bonjour {Prénom},\n\nJe reviens simplement vers vous au sujet de votre projet ({Motif}). Où en est votre réflexion ? Je reste disponible pour en parler quelques minutes, à votre rythme.",
    },
  ];
}

export const EmailComposer: React.FC<Props> = ({ lead, onClose, onSent }) => {
  const templates = useMemo(() => templatesFor(lead), [lead]);
  const [subject, setSubject] = useState(templates[0].subject);
  const [message, setMessage] = useState(templates[0].body);
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [history, setHistory] = useState<Sent[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState(false);

  const hasId = UUID_RE.test(lead.id);
  const hasEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email || '');

  const loadHistory = () => {
    if (!hasId) return;
    fetch(`/api/relances/lead/${encodeURIComponent(lead.id)}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setHistory(((d.relances || []) as Sent[]).filter((r) => r.status === 'envoye' || r.status === 'erreur').reverse().slice(0, 5)))
      .catch(() => {});
  };

  useEffect(() => {
    fetch('/api/relances/status', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ready = status?.emailConfigured && status.baseUrlConfigured;
  const canSend = Boolean(ready && hasId && hasEmail && subject.trim() && message.trim().length >= 5 && !sending);

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/relances/send', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, subject, message, step: 'E-mail personnalisé' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setResult({ ok: true, text: `E-mail envoyé à ${data.recipient}.` });
        onSent(subject);
        loadHistory();
      } else {
        setResult({ ok: false, text: data.error || "L'envoi a échoué." });
      }
    } catch {
      setResult({ ok: false, text: 'Serveur injoignable.' });
    } finally {
      setSending(false);
    }
  };

  const field = 'w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60" role="dialog" aria-modal="true" aria-labelledby="mail-title" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-stone-200">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-stone-200">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0"><Mail className="w-5 h-5" /></span>
            <div className="min-w-0">
              <h2 id="mail-title" className="font-bold text-stone-900">Envoyer un e-mail</h2>
              <p className="text-xs text-stone-500 truncate">À : {lead.name} {hasEmail ? `<${lead.email}>` : '(pas d\'adresse e-mail)'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {status && !ready && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-2">
              <p className="font-semibold flex items-center gap-2"><Settings className="w-4 h-4" />L'envoi d'e-mails n'est pas encore activé</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Créez un compte gratuit sur <strong>resend.com</strong> (3 000 e-mails par mois offerts) et vérifiez votre nom de domaine.</li>
                <li>Sur Render (Environment), ajoutez : <code className="bg-white px-1 rounded">RESEND_API_KEY</code>, <code className="bg-white px-1 rounded">MAIL_FROM_EMAIL</code> (ex. celine@votredomaine.fr), <code className="bg-white px-1 rounded">MAIL_FROM_NAME</code>, <code className="bg-white px-1 rounded">MAIL_REPLY_TO</code> et <code className="bg-white px-1 rounded">APP_URL</code> (l'adresse du site).</li>
                <li>Enregistrez : le service redémarre, puis revenez ici.</li>
              </ol>
            </div>
          )}
          {!hasId && <p role="alert" className="text-sm text-rose-700">Ce contact n'est pas encore enregistré en base : impossible d'envoyer un e-mail.</p>}
          {hasId && !hasEmail && <p role="alert" className="text-sm text-rose-700">Ce contact n'a pas d'adresse e-mail valide.</p>}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">Modèles</p>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button key={t.id} type="button" onClick={() => { setSubject(t.subject); setMessage(t.body); setResult(null); }} className="rounded-full border border-stone-300 hover:border-stone-900 px-3 py-1.5 text-xs font-medium text-stone-700">
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mail-subject" className="text-xs font-semibold uppercase tracking-wider text-stone-600">Objet</label>
            <input id="mail-subject" className={field} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="mail-body" className="text-xs font-semibold uppercase tracking-wider text-stone-600">Message</label>
              <button type="button" onClick={() => setPreview((v) => !v)} className="text-xs underline text-stone-600">{preview ? 'Modifier' : 'Aperçu'}</button>
            </div>
            {preview ? (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-800 whitespace-pre-wrap">
                <p className="font-semibold mb-2">{fillPreview(subject, lead)}</p>
                {fillPreview(message, lead)}
                <p className="mt-4 text-xs text-stone-500">Votre signature, votre téléphone et le lien de désinscription sont ajoutés automatiquement.</p>
              </div>
            ) : (
              <textarea id="mail-body" className={`${field} min-h-[220px] leading-relaxed`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} />
            )}
            <p className="text-xs text-stone-500">Variables : {'{Prénom}'} {'{Ville}'} {'{TypeBien}'} {'{PrixEstime}'} {'{Motif}'}, remplacées à l'envoi.</p>
          </div>

          {result && (
            <div role="status" className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${result.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              {result.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              {result.text}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-stone-500">
              {status?.emailConfigured ? `Expéditeur : ${status.from} · ${status.sentLast24h}/${status.dailyLimit} envoyés sur 24 h` : ''}
            </p>
            <button type="button" id="btn-send-email" onClick={send} disabled={!canSend} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-semibold px-5 py-2.5 text-sm">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer maintenant
            </button>
          </div>

          {history.length > 0 && (
            <div className="border-t border-stone-200 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">Derniers e-mails à ce contact</p>
              <ul className="space-y-1.5 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex items-start justify-between gap-3">
                    <span className="truncate text-stone-800">{fillPreview(h.subject || '(sans objet)', lead)}</span>
                    <span className={`shrink-0 text-xs ${h.status === 'envoye' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {h.status === 'envoye' ? `envoyé ${h.sent_at ? new Date(h.sent_at).toLocaleDateString('fr-FR') : ''}` : `échec : ${h.error || ''}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
