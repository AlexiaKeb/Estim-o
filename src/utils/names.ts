const cap = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '');
const capWords = (s: string) => s.split(/([-\s']+)/).map((p) => (/^[-\s']+$/.test(p) ? p : cap(p))).join('');

/**
 * Splits "Prénom Nom" into a first name (Capitalised) and a family name (UPPERCASE).
 * "KEBIR Alexia" (family name typed first, in capitals) is recognised too.
 */
export function splitName(full: string): { first: string; last: string } {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: capWords(parts[0]), last: '' };
  const isUpper = (w: string) => w.length > 1 && w === w.toUpperCase() && w !== w.toLowerCase();
  if (isUpper(parts[0]) && !isUpper(parts[parts.length - 1])) {
    const lastIdx = parts.findIndex((w, i) => i > 0 && !isUpper(w));
    return { first: capWords(parts.slice(lastIdx).join(' ')), last: parts.slice(0, lastIdx).join(' ').toUpperCase() };
  }
  return { first: capWords(parts[0]), last: parts.slice(1).join(' ').toUpperCase() };
}
