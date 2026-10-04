// Secteurs couverts par les pages « prix et estimation » (une page par secteur, chiffres calculés sur les ventes réelles DVF).
// Les codes sont les codes INSEE des fichiers DVF (Lyon est découpée par arrondissement).

export interface Area {
  slug: string;
  name: string; // « Lyon 3e »
  inName: string; // « à Lyon 3e »
  codes: string[];
  postalCode?: string;
  group: 'Lyon' | 'Métropole de Lyon' | 'Beaujolais';
  /** Texte local rédigé par Céline (quartiers, rues, ambiance, acheteurs). Vide = non affiché. */
  localNote?: string;
}

const ord = (n: number) => (n === 1 ? '1er' : `${n}e`);

export const AREAS: Area[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
    (n): Area => ({
      slug: `lyon-${n}e`,
      name: `Lyon ${ord(n)}`,
      inName: `à Lyon ${ord(n)}`,
      codes: [`6938${n}`],
      postalCode: `6900${n}`,
      group: 'Lyon',
    }),
  ),
  { slug: 'villeurbanne', name: 'Villeurbanne', inName: 'à Villeurbanne', codes: ['69266'], postalCode: '69100', group: 'Métropole de Lyon' },
  { slug: 'caluire-et-cuire', name: 'Caluire-et-Cuire', inName: 'à Caluire-et-Cuire', codes: ['69034'], postalCode: '69300', group: 'Métropole de Lyon' },
  { slug: 'bron', name: 'Bron', inName: 'à Bron', codes: ['69029'], postalCode: '69500', group: 'Métropole de Lyon' },
  { slug: 'ecully', name: 'Écully', inName: 'à Écully', codes: ['69081'], postalCode: '69130', group: 'Métropole de Lyon' },
  { slug: 'tassin-la-demi-lune', name: 'Tassin-la-Demi-Lune', inName: 'à Tassin-la-Demi-Lune', codes: ['69244'], postalCode: '69160', group: 'Métropole de Lyon' },
  { slug: 'sainte-foy-les-lyon', name: 'Sainte-Foy-lès-Lyon', inName: 'à Sainte-Foy-lès-Lyon', codes: ['69202'], postalCode: '69110', group: 'Métropole de Lyon' },
  { slug: 'villefranche-sur-saone', name: 'Villefranche-sur-Saône', inName: 'à Villefranche-sur-Saône', codes: ['69264'], postalCode: '69400', group: 'Beaujolais' },
];

export const getArea = (slug: string): Area | undefined => AREAS.find((a) => a.slug === slug);
