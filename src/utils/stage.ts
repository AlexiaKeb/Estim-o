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

/** Instant ISO → « 3 novembre 2026 à 14:32 » (heure de Paris) */
export const frDateTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  return `${date} à ${time}`;
};

/** Version courte pour les cartes : « 03/11 à 14:32 » */
export const frDateTimeShort = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  return `${date} à ${time}`;
};

/** « Lyon » + 69008 → « Lyon 8e » (le code postal peut aussi être lu dans l'adresse) ; les autres villes restent telles quelles */
export const cityLabel = (l: Pick<Lead, 'city' | 'postalCode' | 'address'>): string => {
  const city = l.city || '';
  if (!/^lyon(\s+\d+e?r?)?$/i.test(city.trim())) return city;
  const m = (l.postalCode || '').match(/^690(0[1-9])$/) || (l.address || '').match(/\b690(0[1-9])\b/);
  if (!m) return city;
  const n = parseInt(m[1], 10);
  return `Lyon ${n === 1 ? '1er' : `${n}e`}`;
};
