import React, { useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { AbandonBadge, isAbandonStep } from './AbandonBadge';

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
export const LeadMailHistory: React.FC<{ leadId: string }> = ({ leadId }) => {
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

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs" id="lead-mail-history">
      <div className="flex items-center gap-2 border-b border-stone-100 pb-3 mb-3">
        <Mail className="w-4 h-4 text-stone-500" />
        <h4 className="text-sm font-bold text-stone-900">E-mails envoyés</h4>
        {rows && rows.length > 0 && <span className="text-xs text-stone-500">({rows.length})</span>}
      </div>
      {rows === null ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-stone-400">Aucun e-mail envoyé à ce contact pour l'instant.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
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
