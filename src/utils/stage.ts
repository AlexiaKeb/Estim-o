import { Lead } from '../types';

export type Stage = 'lead' | 'r1' | 'r2' | 'mandat' | 'vente';

/** Étape du dossier dans le pipeline : lead → R1 (visite d'estimation) → R2 (seconde visite) → mandat → vente. */
export const stageOf = (l: Lead): Stage => {
  if (l.mandate?.soldDate) return 'vente';
  if (l.mandate?.status === 'signed') return 'mandat';
  if (l.visit2?.date) return 'r2';
  if (l.meetingBooked) return 'r1';
  return 'lead';
};

/** « 2026-10-16 » → « 16 octobre 2026 » */
export const frDate = (d?: string) =>
  d && /^\d{4}-\d{2}-\d{2}/.test(d)
    ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
    : d || '';
