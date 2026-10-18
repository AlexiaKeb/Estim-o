import { AGENT } from './siteContent';

// Relance automatique envoyée aux visiteurs qui ont fait l'estimation sans prendre rendez-vous.
export const AUTO_FOLLOWUP_STEP = 'Relance automatique : estimation sans rendez-vous';

export interface AutoFollowupConfig {
  enabled: boolean;
  delayHours: number;
  subject: string;
  body: string;
}

export const DEFAULT_AUTO_FOLLOWUP: AutoFollowupConfig = {
  enabled: true,
  delayHours: 24,
  subject: '{Prénom}, votre estimation à {Ville} : de {PrixBas} à {PrixHaut}',
  body: [
    '<p>Bonjour {Prénom},</p>',
    "<p>Vous avez récemment estimé votre {TypeBien} à {Ville} avec notre assistant. Il l'évalue entre <strong>{PrixBas} et {PrixHaut}</strong>.</p>",
    "<p>Cette fourchette est un bon point de départ. Elle s'appuie sur les ventes réelles de votre secteur, mais elle reste une première indication : un robot ne peut pas voir votre bien.</p>",
    "<p>Ce qui fait vraiment la valeur d'un logement, c'est ce qu'on ne voit pas sur une carte : l'état, la luminosité, l'agencement, les travaux faits, l'environnement immédiat. Sur ces points, l'écart entre une estimation automatique et la réalité peut être important, dans un sens comme dans l'autre.</p>",
    "<p>C'est pourquoi je vous propose une visite d'une heure, <strong>offerte et sans engagement</strong>. Je vous remets ensuite un avis de valeur précis, basé sur votre bien et sur les ventes récentes autour de chez vous. Vous repartez avec un vrai prix, que vous vendiez ou non.</p>",
    `<p>Il suffit de choisir un créneau ci-dessous. Si vous préférez m'appeler, je réponds au ${AGENT.phone}.</p>`,
  ].join(''),
};
