// Origine d'un lead, déduite de ce que le navigateur du visiteur a transmis (clic publicitaire, UTM, site d'où il vient).
export interface AttributionLike {
  gclid?: string; gbraid?: string; wbraid?: string;
  utmSource?: string; utmMedium?: string; utmCampaign?: string; utmTerm?: string; utmContent?: string;
  referrer?: string; landingPage?: string;
}

export type ChannelKey = 'ads' | 'seo' | 'social' | 'email' | 'site' | 'direct';

export interface Channel { key: ChannelKey; label: string; detail: string }

export const CHANNELS: Array<{ key: ChannelKey; label: string; bar: string }> = [
  { key: 'ads', label: 'Publicité Google', bar: 'bg-sky-500' },
  { key: 'seo', label: 'Recherche naturelle (Google, Bing…)', bar: 'bg-emerald-500' },
  { key: 'social', label: 'Réseaux sociaux', bar: 'bg-violet-500' },
  { key: 'email', label: 'E-mail', bar: 'bg-amber-500' },
  { key: 'site', label: 'Autre site', bar: 'bg-rose-400' },
  { key: 'direct', label: 'Direct ou non renseigné', bar: 'bg-stone-400' },
];

const SEARCH = /(^|\.)(google|bing|ecosia|duckduckgo|qwant|yahoo|brave)\./i;
const SOCIAL = /(^|\.)(facebook|instagram|linkedin|youtube|tiktok|pinterest|twitter|x)\.com$|^l\.facebook|^t\.co$|^lnkd\.in$|^fb\.me$/i;

const pageDetail = (landing?: string): string => {
  if (!landing || landing === '/') return '';
  if (landing.startsWith('/blog/')) return `article de blog (${landing.slice(6)})`;
  if (landing === '/blog') return 'page Blog';
  if (landing === '/faq') return 'page FAQ';
  return `page ${landing}`;
};

export function leadChannel(a?: AttributionLike | null): Channel {
  const x = a || {};
  const src = (x.utmSource || '').toLowerCase();
  const med = (x.utmMedium || '').toLowerCase();
  const camp = x.utmCampaign ? `campagne « ${x.utmCampaign} »` : '';
  const term = x.utmTerm ? `mot-clé « ${x.utmTerm} »` : '';
  const join = (...p: string[]) => p.filter(Boolean).join(' · ');
  if (x.gclid || x.gbraid || x.wbraid || (/google/.test(src) && /(cpc|ppc|paid)/.test(med))) {
    return { key: 'ads', label: 'Publicité Google', detail: join(camp, term, pageDetail(x.landingPage)) };
  }
  if (/(facebook|instagram|meta|fb|linkedin|tiktok|youtube)/.test(src)) {
    return { key: 'social', label: src.replace(/^./, (c) => c.toUpperCase()), detail: join(camp, pageDetail(x.landingPage)) };
  }
  if (med === 'email' || /(mail|newsletter|brevo|mailchimp)/.test(src)) {
    return { key: 'email', label: 'E-mail', detail: join(camp, pageDetail(x.landingPage)) };
  }
  if (src) return { key: 'site', label: x.utmSource!, detail: join(camp, pageDetail(x.landingPage)) };
  const ref = (x.referrer || '').toLowerCase();
  if (ref) {
    if (SEARCH.test(ref)) return { key: 'seo', label: 'Recherche naturelle', detail: join(ref.replace(/^www\./, ''), pageDetail(x.landingPage)) };
    if (SOCIAL.test(ref)) return { key: 'social', label: (/facebook|fb\.me/.test(ref) ? 'Facebook' : /instagram/.test(ref) ? 'Instagram' : /linkedin|lnkd/.test(ref) ? 'LinkedIn' : /youtube/.test(ref) ? 'YouTube' : /tiktok/.test(ref) ? 'TikTok' : ref.replace(/^www\./, '').replace(/\.com$/, '').replace(/^./, (c) => c.toUpperCase())), detail: pageDetail(x.landingPage) };
    return { key: 'site', label: ref.replace(/^www\./, ''), detail: pageDetail(x.landingPage) };
  }
  return { key: 'direct', label: 'Direct ou non renseigné', detail: pageDetail(x.landingPage) };
}
