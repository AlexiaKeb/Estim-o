import React, { useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { AbandonBadge, isAbandonStep } from './AbandonBadge';
import type { Lead } from '../types';

interface MailRow {
  id: string;
  step?: string | null;
  subject?: string | null;
  status: string;
  sent_at?: string | null;
  send_at?: string | null;
  created_at?: string | null;
}

interface MailDetail {
  subject: string;
  html: string;
  recipient: string;
  error: string | null;
}

const when = (r: MailRow) => r.sent_at || r.send_at || r.created_at || '';

/** Dossier client : les e-mails déjà envoyés à ce contact, avec aperçu du message tel qu'il est parti. Les envois annulés ne sont pas listés. */
export const LeadMailHistory: React.FC<{ leadId: string; lead?: Pick<Lead, 'email' | 'meetingBooked' | 'meetingDate' | 'meetingTime' | 'address' | 'city' | 'visit1'> }> = ({ leadId, lead }) => {
  const [rows, setRows] = useState<MailRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, MailDetail | 'loading' | 'error'>>({});

  useEffect(() => {
    let alive = true;
    setRows(null);
    setOpen(null);
    fetch(`/api/relances/lead/${encodeURIComponent(leadId)}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list: MailRow[] = (d.relances || []).filter((r: MailRow) => r.status === 'envoye' || r.status === 'erreur');
        list.sort((a, b) => when(b).localeCompare(when(a)));
        setRows(list);
      })
      .catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, [leadId]);

  const toggle = (id: string) => {
    setOpen((cur) => (cur === id ? null : id));
    if (detail[id]) return;
    setDetail((d) => ({ ...d, [id]: 'loading' }));
    fetch(`/api/relances/${encodeURIComponent(id)}/content`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setDetail((m) => ({ ...m, [id]: { subject: d.subject, html: d.html, recipient: d.recipient, error: d.error } })))
      .catch(() => setDetail((m) => ({ ...m, [id]: 'error' })));
  };

  // Le client qui a réservé en ligne reçoit automatiquement la confirmation de Cal.com : le site n'en garde pas le texte, on en signale l'envoi
  const calConfirm = lead?.meetingBooked && !lead.visit1 && lead.meetingDate ? lead : null;
  const calWhen = calConfirm
    ? new Date(`${calConfirm.meetingDate}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }) + (calConfirm.meetingTime ? ` à ${calConfirm.meetingTime}` : '')
    : '';
  const calOpen = open === 'cal-confirmation';
  const total = (rows?.length || 0) + (calConfirm ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs" id="lead-mail-history">
      <div className="flex items-center gap-2 border-b border-stone-100 pb-3 mb-3">
        <Mail className="w-4 h-4 text-stone-500" />
        <h4 className="text-sm font-bold text-stone-900">E-mails envoyés</h4>
        {total > 0 && <span className="text-xs text-stone-500">({total})</span>}
      </div>
      {rows === null ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : total === 0 ? (
        <p className="text-sm text-stone-400">Aucun e-mail envoyé à ce contact pour l'instant.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {calConfirm && (
            <li className="py-2 text-sm">
              <button type="button" onClick={() => setOpen((cur) => (cur === 'cal-confirmation' ? null : 'cal-confirmation'))} aria-expanded={calOpen} className="w-full text-left rounded-lg hover:bg-stone-50 -mx-1 px-1">
                <p className="font-semibold text-stone-900 truncate">
                  Confirmation de rendez-vous <span className="text-[10px] font-bold text-sky-800 bg-sky-50 rounded px-1.5 py-0.5 ml-1 align-middle">envoyé par Cal.com</span>
                </p>
                <p className="text-xs text-stone-500">À la prise de rendez-vous • <span className="font-bold text-sky-700">{calOpen ? 'Masquer' : 'Voir le détail'}</span></p>
              </button>
              {calOpen && (
                <div className="mt-2 rounded-xl border-[3px] border-[#0B0F1F] bg-[#FFF7E6] p-3 text-sm space-y-1.5">
                  <p className="text-[11px] text-stone-600">À : <strong>{calConfirm.email || 'adresse du client'}</strong></p>
                  <p className="font-bold text-stone-900 border-b border-stone-300 pb-2">Confirmation de votre rendez-vous</p>
                  <p>E-mail envoyé automatiquement par l'agenda (Cal.com) dès que le client a réservé en ligne.</p>
                  <p><strong>Rendez-vous :</strong> {calWhen} (heure de Paris)</p>
                  {(calConfirm.address || calConfirm.city) && <p><strong>Lieu :</strong> {calConfirm.address || calConfirm.city}</p>}
                  <p className="text-xs text-stone-500">Le texte exact de ce message est celui de Cal.com : il n'est pas conservé par le site.</p>
                </div>
              )}
            </li>
          )}
          {rows.map((r) => {
            const det = detail[r.id];
            const isOpen = open === r.id;
            const d = when(r);
            return (
              <li key={r.id} className="py-2 text-sm">
                <button type="button" onClick={() => toggle(r.id)} aria-expanded={isOpen} className="w-full text-left rounded-lg hover:bg-stone-50 -mx-1 px-1">
                  <p className="font-semibold text-stone-900 truncate">
                    {r.subject || 'Sans objet'} {isAbandonStep(r.step) && <AbandonBadge className="ml-1 align-middle" />}
                    {r.status === 'erreur' && <span className="text-[10px] font-bold text-rose-700 bg-rose-50 rounded px-1.5 py-0.5 ml-1">échec</span>}
                  </p>
                  <p className="text-xs text-stone-500">
                    {d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) : ''} • <span className="font-bold text-sky-700">{isOpen ? 'Masquer' : 'Voir le message'}</span>
                  </p>
                </button>
                {isOpen && (
                  <div className="mt-2 rounded-xl border-[3px] border-[#0B0F1F] bg-[#FFF7E6] p-3 text-sm">
                    {det === 'loading' || !det ? <Loader2 className="w-4 h-4 animate-spin" /> : det === 'error' ? <p className="text-rose-700">Impossible d'afficher ce message.</p> : (
                      <>
                        <p className="text-[11px] text-stone-600">À : <strong>{det.recipient || 'adresse inconnue'}</strong></p>
                        <p className="mt-1 font-bold text-stone-900 border-b border-stone-300 pb-2 mb-2">{det.subject}</p>
                        <div className="rich-email text-stone-800" dangerouslySetInnerHTML={{ __html: det.html }} />
                        {r.status === 'erreur' && det.error && <p className="mt-2 text-xs text-rose-700">Erreur d'envoi : {det.error}</p>}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
