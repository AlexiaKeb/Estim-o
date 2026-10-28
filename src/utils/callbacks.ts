import type { Lead, CallLogEntry } from '../types';

/** Date du jour à Paris, au format AAAA-MM-JJ */
export const todayParis = (): string => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

/** AAAA-MM-JJ décalé de n jours (calcul sur la date, sans dépendre du fuseau) */
export const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const OUTCOMES: Array<{ key: CallLogEntry['outcome']; label: string }> = [
  { key: 'joint', label: 'Joint(e)' },
  { key: 'repondeur', label: 'Message laissé' },
  { key: 'pas_de_reponse', label: 'Pas de réponse' },
  { key: 'rappel_demande', label: 'Rappel demandé' },
  { key: 'refus', label: 'Pas intéressé(e)' },
];

export const outcomeLabel = (k: CallLogEntry['outcome']) => OUTCOMES.find((o) => o.key === k)?.label || k;

/** Rappel prévu à une date passée (ou aujourd'hui) : « en retard » = strictement avant aujourd'hui */
export const callbackState = (l: Pick<Lead, 'callbackDate'>): 'none' | 'overdue' | 'today' | 'later' => {
  const d = l.callbackDate;
  if (!d) return 'none';
  const t = todayParis();
  return d < t ? 'overdue' : d === t ? 'today' : 'later';
};
