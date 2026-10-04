// Contenu éditorial de la page d'accueil.
// RÈGLE : n'ajoutez ici que des avis et des chiffres RÉELS et vérifiables (obligation légale
// en France : pratiques commerciales trompeuses). Tant que ces listes sont vides, les blocs
// correspondants ne s'affichent pas.

export const BRAND = {
  name: 'Agent Estimation',
  tagline: 'Estimation immobilière à Lyon',
};

export const AGENT = {
  name: 'Céline Levrat',
  firstName: 'Céline',
  agency: 'NOVEA Immobilier',
  city: 'Lyon',
  phone: '06 03 58 03 16',
  phoneHref: 'tel:+33603580316',
  // Durée de la visite : DOIT être identique à la durée de l'événement dans Cal.com
  visitMinutes: 60,
  zone: 'Lyon, Villeurbanne, Beaujolais et jusqu\'à 50 km autour',
  // URL ou data: URI d'une vraie photo de Céline (très fort levier de confiance). Vide = initiales.
  photoUrl: '',
};

/** 30 -> "30 minutes", 60 -> "1 heure", 90 -> "1 h 30" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? '1 heure' : `${h} heures`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

export const VISIT_LABEL = formatDuration(AGENT.visitMinutes);

export interface Testimonial {
  quote: string;
  author: string; // ex. "Marie L."
  place: string; // ex. "Villeurbanne"
  detail?: string; // ex. "Appartement T3 vendu en 6 semaines"
}

export interface KeyFigure {
  value: string; // ex. "42"
  label: string; // ex. "biens vendus à Lyon et alentours"
}

export const TESTIMONIALS: Testimonial[] = [];
export const KEY_FIGURES: KeyFigure[] = [];

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'La visite est-elle vraiment gratuite et sans engagement ?',
    a: `Oui. La visite de découverte dure environ ${VISIT_LABEL}, elle est offerte et ne vous engage à rien. Aucun document n'est à préparer.`,
  },
  {
    q: 'Pourquoi une visite, alors que je peux avoir un prix en ligne ?',
    a: 'Une simulation en ligne donne un repère. Elle ne voit ni la luminosité, ni les finitions, ni le calme, ni les travaux réalisés. Ce sont ces détails qui permettent de défendre la valeur haute de votre bien face aux acheteurs.',
  },
  {
    q: 'Dois-je avoir décidé de vendre ?',
    a: 'Non. Beaucoup de propriétaires viennent simplement comparer, anticiper ou préparer un projet à plusieurs mois. Connaître la valeur de son bien permet de décider sereinement.',
  },
  {
    q: 'J\'ai déjà une estimation d\'une autre agence. Est-ce utile ?',
    a: 'Oui, comparer est une excellente démarche. Un second avis permet de vérifier qu\'un prix n\'a pas été sous-évalué pour vendre vite, ni sur-évalué pour obtenir un mandat.',
  },
  {
    q: 'Quelles communes sont couvertes ?',
    a: 'Lyon, Villeurbanne, le Beaujolais et les communes jusqu\'à 50 km autour de Lyon. Pour un projet particulier, appelez directement Céline.',
  },
  {
    q: 'Que deviennent mes coordonnées ?',
    a: 'Elles servent uniquement à vous transmettre votre estimation et à organiser la visite si vous le souhaitez. Vous pouvez demander leur suppression à tout moment.',
  },
];
