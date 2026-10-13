/** Numéro français plausible : 10 chiffres commençant par 0 (ou +33 / 0033), pas un numéro bidon (0000000000, 0612121212…). */
export function normalizeFrPhone(raw: string): string | null {
  let d = String(raw || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+33')) d = '0' + d.slice(3);
  else if (d.startsWith('0033')) d = '0' + d.slice(4);
  d = d.replace(/\D/g, '');
  if (!/^0[1-9]\d{8}$/.test(d)) return null;
  // Numéros manifestement inventés : peu de chiffres différents, ou suite croissante/décroissante
  const tail = d.slice(1);
  if (new Set(tail).size <= 3) return null;
  if ('0123456789'.includes(tail) || '9876543210'.includes(tail)) return null;
  return d;
}

export const isValidFrPhone = (raw: string) => normalizeFrPhone(raw) !== null;
