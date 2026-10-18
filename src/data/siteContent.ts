// Contenu éditorial de la page d'accueil.
// RÈGLE : n'ajoutez ici que des avis et des chiffres RÉELS et vérifiables (obligation légale
// en France : pratiques commerciales trompeuses). Tant que ces listes sont vides, les blocs
// correspondants ne s'affichent pas.

export const BRAND = {
  name: 'Agent Estimation',
  tagline: 'Estimation immobilière à Lyon',
};

// Réseaux sociaux de Céline (s'ouvrent dans un nouvel onglet)
export const SOCIALS = [
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/celinelevrat_novea/' },
  { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/celine-levrat/' },
  { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/celinelevratNovea' },
] as const;

export const AGENT = {
  name: 'Céline Levrat',
  firstName: 'Céline',
  agency: 'Agent Estimation',
  city: 'Lyon',
  phone: '06 03 58 03 16',
  phoneHref: 'tel:+33603580316',
  // Durée de la visite : DOIT être identique à la durée de l'événement dans Cal.com
  visitMinutes: 60,
  zone: 'Région Lyonnaise & Beaujolais',
  // URL ou data: URI d'une vraie photo de Céline (très fort levier de confiance). Vide = initiales.
  photoUrl: '/celine.jpg',
};

// Lien du crédit « App conçue par La Digitale School » (pied de page et mentions légales)
export const DIGITALE_SCHOOL_URL = 'https://www.facebook.com/alexiakebir/';

// Informations légales affichées sur les pages « Mentions légales » et « Confidentialité ».
// Les champs laissés vides ne s'affichent pas : à compléter par Céline (voir la liste dans le message de livraison).
export const LEGAL = {
  company: 'NOVEA IMMOBILIER transaction',
  form: 'SAS (société par actions simplifiée) au capital de 5 441,00 €',
  address: '10 chemin du Vieux Moulin, 69270 Saint-Romain-au-Mont-d\'Or',
  rcs: 'RCS Lyon 902 615 194',
  rcp: 'Responsabilité civile professionnelle : contrat n° 120137405, MMA Assurance (14 boulevard Marie et Alexandre Oyon, 72030 Le Mans)',
  garantie: 'Garantie financière de 200 000 € : Galian Assurances',
  siret: '902 615 194',
  cartePro:
    'Carte professionnelle « Transaction » n° CPI 69012021000000167, délivrée par la Chambre de Commerce et d\'Industrie de Lyon',
  fonds: 'Sans maniement de fonds',
  // À compléter : numéro d'immatriculation de Céline au RSAC (agent commercial) et greffe
  rsac: 'RSAC de Lyon n° 800 580 540',
  // Céline : entreprise individuelle (agent commercial)
  agentSiret: '800 580 540 00063',
  agentRcp: 'RCP n° H278359750',
  // À compléter : e-mail de contact et nom du médiateur de la consommation de NOVEA
  contactEmail: 'cel@novea-immobilier.fr',
  mediator: '',
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

/** Number of questions shown on the home page (the full list lives on /faq). */
export const FAQ_HOME_COUNT = 5;

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'La visite sur place est-elle réellement offerte et sans engagement ?',
    a: "Absolument. La visite à votre domicile est 100 % offerte et ne vous engage à rien. Céline vient analyser les atouts de votre bien sur place et vous indiquera simplement les quelques documents utiles à préparer (taxe foncière, métrage, diagnostics si disponibles).",
  },
  {
    q: "Pourquoi faire une visite alors que j'ai déjà un prix avec l'IA ?",
    a: "L'estimation en ligne offre une première fourchette indicative. Mais sur le terrain, le prix juste est la clé d'une vente réussie : vendre au bon prix permet d'attirer des acheteurs qualifiés, d'éviter les négociations agressives et de concrétiser la vente dans les meilleurs délais. Seule la visite de Céline permet d'ajuster ce prix juste en analysant l'état réel, la luminosité et les atouts uniques de votre logement.",
  },
  {
    q: "Sur quelles données repose l'estimation en ligne ?",
    a: "L'outil s'appuie sur la base officielle DVF (Demandes de Valeurs Foncières) de l'État, qui recense les prix réels constatés lors des ventes récentes chez le notaire dans votre secteur, et non sur de simples prix d'annonces surévalués.",
  },
  {
    q: 'Sous quel délai vais-je recevoir mon estimation ?',
    a: "La simulation en ligne vous donne un résultat immédiat en 2 minutes. Suite à la visite sur place, Céline prend le temps d'analyser le marché local et vous remet un avis de valeur détaillé.",
  },
  {
    q: "Comment est calculée l'estimation lors de la visite ?",
    a: "Céline réalise une analyse comparative de marché en croisant les caractéristiques de votre bien (surface, état, prestations) avec les ventes réelles très récentes du secteur et la concurrence actuelle.",
  },
  {
    q: "La visite m'engage-t-elle à vous confier la vente de mon bien ?",
    a: "Non, aucunement. La visite et la remise de l'avis de valeur sont 100 % offertes et sans obligation d'exclusivité ni de mandat de vente. Vous restez totalement libre de la suite.",
  },
  {
    q: "Que se passe-t-il après avoir validé l'étape en ligne ?",
    a: "Dès la validation de vos informations, vous recevez une première fourchette de prix. Si vous avez choisi un créneau, Céline vous recontacte directement pour confirmer le rendez-vous.",
  },
  {
    q: 'Faut-il avoir un projet de vente immédiat pour demander une estimation ?',
    a: "Pas du tout. Que vous souhaitiez vendre prochainement, anticiper une succession, arbitrer un patrimoine ou simplement connaître la valeur actuelle de votre logement, l'estimation reste offerte et confidentielle.",
  },
  {
    q: "J'ai déjà une estimation d'une autre agence : quel est l'intérêt d'un second avis ?",
    a: "Un second avis permet de sécuriser votre projet. Céline étudie votre bien au regard des ventes réelles du secteur et de la concurrence actuelle. Vous obtenez ainsi une évaluation neutre, objective et fondée sur la réalité du marché, sans surévaluation artificielle pour décrocher un mandat.",
  },
  {
    q: "Quelles sont les communes couvertes par l'expertise de Céline ?",
    a: "Céline intervient sur l'ensemble de la Région Lyonnaise et du Beaujolais (notamment le Val de Saône, les Monts d'Or, Chasselay, Anse, Villefranche-sur-Saône et les communes avoisinantes).",
  },
  {
    q: 'Que deviennent mes données personnelles ?',
    a: "Vos informations restent strictement confidentielles. Elles servent uniquement à vous transmettre votre estimation et à planifier le rendez-vous si vous le souhaitez. Elles ne sont jamais revendues à des tiers.",
  },
];

/** Barème d'honoraires « Transaction » de l'agence mandante (affichage obligatoire). */
export const FEES_DATE = '7 janvier 2026';
export const FEES: Array<{ title: string; payer: string; rows: Array<[string, string]> }> = [
  {
    title: "Ventes de locaux à usage d'habitation",
    payer: 'le vendeur',
    rows: [
      ['Entre 0 € et 50 000 €', 'Forfait de 3 600 €'],
      ['Entre 50 001 € et 100 000 €', '8,00 %'],
      ['Entre 100 001 € et 200 000 €', '7,00 %'],
      ['Entre 200 001 € et 250 000 €', '6,00 %'],
      ['Entre 250 001 € et 300 000 €', '5,50 %'],
      ['Plus de 300 000 €', '5,00 %'],
    ],
  },
  {
    title: "Vente d'immeubles, de locaux à usage professionnel, commercial, industriel et cession de bail",
    payer: "l'acquéreur",
    rows: [
      ['Entre 0 € et 100 000 €', 'Forfait de 8 000 €'],
      ['Entre 100 001 € et 200 000 €', '8 %'],
      ['Entre 200 001 € et 1 000 000 €', '7 %'],
      ['Plus de 1 000 000 €', '5,5 %'],
    ],
  },
  {
    title: 'Vente de terrains à bâtir',
    payer: 'le vendeur',
    rows: [
      ['Entre 0 € et 500 000 €', '10,00 %'],
      ['Plus de 500 000 €', '7,00 %'],
    ],
  },
];
