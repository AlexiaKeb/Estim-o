import { Lead, ScheduledMessage } from '../types';

/**
 * Default follow-up sequence: five e-mails, plain and useful.
 * Rules: no invented facts (no made-up sales, buyers, statistics or partners), no pressure,
 * only data we really have about the contact. Dates count from the day of the estimation.
 */
export function generateDefaultSequenceForLead(lead: Lead): ScheduledMessage[] {
  const firstName = lead.name.split(' ')[0] || '';
  const hello = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const base = lead.createdAtIso ? new Date(lead.createdAtIso) : new Date();
  const type = (lead.propertyType || 'bien').toLowerCase();
  const city = lead.city || 'votre commune';

  const dayAt = (days: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const range =
    lead.valuation && lead.valuation.lowPrice && lead.valuation.highPrice
      ? `${lead.valuation.lowPrice.toLocaleString('fr-FR')} € et ${lead.valuation.highPrice.toLocaleString('fr-FR')} €`
      : lead.estimatedValue
        ? `environ ${lead.estimatedValue.toLocaleString('fr-FR')} €`
        : null;

  return [
    {
      id: `${lead.id}-step-1`,
      step: 'Message 1 (J+1)',
      channel: 'Email',
      delay: 'Le lendemain',
      scheduledDate: dayAt(1),
      scheduledTime: '09:30',
      subject: `Votre estimation à ${city}`,
      message: `${hello}\n\nMerci d'avoir demandé l'estimation de votre ${type} à ${city}.${range ? ` La simulation situe sa valeur entre ${range}.` : ''} C'est un repère : seule une visite permet de tenir compte de l'état réel, de la luminosité, de l'étage ou de la vue.\n\nSi vous le souhaitez, je peux passer voir votre bien. La visite est gratuite et sans engagement. Vous pouvez répondre directement à cet e-mail ou choisir un créneau ci-dessous.`,
      goal: "Confirmer la prise en compte de la demande et proposer la visite.",
      status: 'scheduled',
    },
    {
      id: `${lead.id}-step-2`,
      step: 'Message 2 (J+4)',
      channel: 'Email',
      delay: '4 jours après',
      scheduledDate: dayAt(4),
      scheduledTime: '10:00',
      subject: `Ce qui fait varier le prix d'un ${type}`,
      message: `${hello}\n\nPour un ${type} comme le vôtre, plusieurs éléments font varier le prix d'une vente à l'autre : l'état général et les travaux récents, l'étage et l'exposition, la performance énergétique (DPE), les charges, le calme de la rue.\n\nCe sont justement ces points que je regarde sur place. Y a-t-il un élément de votre bien que vous aimeriez que je valorise en particulier ?`,
      goal: "Donner des repères utiles et inviter à répondre.",
      status: 'scheduled',
    },
    {
      id: `${lead.id}-step-3`,
      step: 'Message 3 (J+10)',
      channel: 'Email',
      delay: '10 jours après',
      scheduledDate: dayAt(10),
      scheduledTime: '14:00',
      subject: `Les documents utiles pour préparer une vente`,
      message: `${hello}\n\nSi vous envisagez de vendre${lead.timeframe && lead.timeframe !== 'Curiosité' ? ` (${lead.timeframe})` : ''}, il est utile de rassembler dès maintenant quelques documents : le titre de propriété, les dernières taxes foncières, les diagnostics déjà réalisés (dont le DPE) et, en copropriété, les derniers procès-verbaux d'assemblée et le montant des charges.\n\nLes avoir sous la main le jour de la visite permet d'aller plus vite et d'affiner l'avis de valeur.`,
      goal: "Apporter une aide concrète, sans pression.",
      status: 'scheduled',
    },
    {
      id: `${lead.id}-step-4`,
      step: 'Message 4 (J+21)',
      channel: 'Email',
      delay: '21 jours après',
      scheduledDate: dayAt(21),
      scheduledTime: '11:00',
      subject: `Où en est votre projet ?`,
      message: `${hello}\n\nJe reviens simplement vers vous : où en est votre réflexion sur votre ${type} à ${city} ? Que votre projet ait avancé, changé ou soit mis en pause, je reste disponible pour en parler quelques minutes.`,
      goal: "Reprendre le contact avec une question simple.",
      status: 'scheduled',
    },
    {
      id: `${lead.id}-step-5`,
      step: 'Message 5 (J+45)',
      channel: 'Email',
      delay: '45 jours après',
      scheduledDate: dayAt(45),
      scheduledTime: '15:30',
      subject: `Votre estimation a plus d'un mois`,
      message: `${hello}\n\nVotre estimation date d'un mois et demi. Le marché évolue : si vous le souhaitez, je peux la mettre à jour gratuitement, avec les ventes les plus récentes de votre secteur.\n\nIl suffit de répondre à cet e-mail.`,
      goal: "Proposer une mise à jour de l'estimation.",
      status: 'scheduled',
    },
  ];
}
