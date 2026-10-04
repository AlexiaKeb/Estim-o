// Suivi des campagnes Google Ads.
// - L'origine du clic (gclid, utm_*) est lue dans l'URL et jointe au dossier que le visiteur envoie lui-même :
//   cela permet à la conseillère de savoir quelle annonce a rapporté quel contact.
// - La balise Google n'est chargée QU'APRÈS acceptation explicite du visiteur (bandeau de consentement).
// Variables Vite (à définir sur Render avant le build) :
//   VITE_GOOGLE_ADS_ID            ex. AW-1234567890
//   VITE_GOOGLE_ADS_LEAD_LABEL    étiquette de conversion « demande d'estimation »
//   VITE_GOOGLE_ADS_BOOKING_LABEL étiquette de conversion « rendez-vous pris »

export interface Attribution {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  landingPage?: string;
  capturedAt?: string;
}

const KEY = 'agent-estimation-attribution';
const CONSENT_KEY = 'agent-estimation-ads-consent';
const env = (import.meta as any).env || {};
const ADS_ID: string = env.VITE_GOOGLE_ADS_ID || '';
const LABELS: Record<string, string> = {
  lead: env.VITE_GOOGLE_ADS_LEAD_LABEL || '',
  booking: env.VITE_GOOGLE_ADS_BOOKING_LABEL || '',
};

export const trackingConfigured = Boolean(ADS_ID);

const safeGet = (k: string): string | null => {
  try { return window.localStorage.getItem(k); } catch { return null; }
};
const safeSet = (k: string, v: string) => {
  try { window.localStorage.setItem(k, v); } catch { /* navigation privée */ }
};

export function captureAttribution(): void {
  try {
    const p = new URLSearchParams(window.location.search);
    const found: Attribution = {};
    const map: Record<string, keyof Attribution> = {
      gclid: 'gclid', gbraid: 'gbraid', wbraid: 'wbraid',
      utm_source: 'utmSource', utm_medium: 'utmMedium', utm_campaign: 'utmCampaign',
      utm_term: 'utmTerm', utm_content: 'utmContent',
    };
    for (const [param, key] of Object.entries(map)) {
      const v = p.get(param);
      if (v) (found as any)[key] = v.slice(0, 200);
    }
    if (Object.keys(found).length === 0) return; // on garde la première origine connue
    found.landingPage = window.location.pathname;
    found.capturedAt = new Date().toISOString();
    window.sessionStorage.setItem(KEY, JSON.stringify(found));
  } catch { /* ignoré */ }
}

export function getAttribution(): Attribution | undefined {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : undefined;
  } catch {
    return undefined;
  }
}

export type AdsConsent = 'granted' | 'denied' | null;
export const getConsent = (): AdsConsent => {
  const v = safeGet(CONSENT_KEY);
  return v === 'granted' || v === 'denied' ? v : null;
};

let loaded = false;
function loadGoogleTag(): void {
  if (loaded || !ADS_ID || typeof document === 'undefined') return;
  loaded = true;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () { w.dataLayer.push(arguments); };
  w.gtag('js', new Date());
  w.gtag('config', ADS_ID);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ADS_ID)}`;
  document.head.appendChild(s);
}

export function setConsent(value: 'granted' | 'denied'): void {
  safeSet(CONSENT_KEY, value);
  if (value === 'granted') loadGoogleTag();
}

export function initTracking(): void {
  captureAttribution();
  if (getConsent() === 'granted') loadGoogleTag();
}

/** Conversion Google Ads (uniquement si le visiteur a accepté et que les identifiants sont configurés). */
export function trackConversion(kind: 'lead' | 'booking', value?: number): void {
  if (!ADS_ID || !LABELS[kind] || getConsent() !== 'granted') return;
  loadGoogleTag();
  try {
    (window as any).gtag?.('event', 'conversion', {
      send_to: `${ADS_ID}/${LABELS[kind]}`,
      ...(value ? { value, currency: 'EUR' } : {}),
    });
  } catch { /* ignoré */ }
}
