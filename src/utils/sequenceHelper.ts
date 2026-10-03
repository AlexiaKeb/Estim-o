import { Lead, ScheduledMessage } from '../types';

export function generateDefaultSequenceForLead(lead: Lead): ScheduledMessage[] {
  const firstName = lead.name.split(' ')[0] || 'Bonjour';
  const today = new Date();

  const addDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: `${lead.id}-step-1`,
      step: 'Message 1 (J+1)',
      channel: 'SMS',
      delay: '24h après estimation',
      scheduledDate: addDays(1),
      scheduledTime: '09:30',
      subject: `Avis de valeur pour votre ${lead.propertyType.toLowerCase()} à ${lead.city}`,
      message: `Bonjour ${firstName}, suite à votre estimation pour votre ${lead.propertyType.toLowerCase()} (${lead.surface} m² à ${lead.city}), nous avons validé la valorisation indicative de ${lead.estimatedValue.toLocaleString('fr-FR')} €. Un conseiller de notre équipe reste à votre disposition si vous souhaitez affiner les points clés.`,
      goal: 'Confirmer la prise en compte du dossier et ouvrir le canal direct par SMS.',
      status: 'scheduled',
    },
    {
      id: `${lead.id}-step-2`,
      step: 'Message 2 (J+5)',
      channel: 'Email',
      delay: '5 jours après',
      scheduledDate: addDays(5),
      scheduledTime: '10:00',
      subject: `3 ventes récentes comparables à votre bien à ${lead.city}`,
      message: `Bonjour ${firstName},\n\nDans le cadre de votre projet (${lead.motive}), voici un récapitulatif des dernières transactions constatées dans votre secteur à ${lead.city} pour des biens comparables :\n• Bien similaire dans votre secteur : Vendu en 24 jours au prix du marché\n• Tendance actuelle : Forte demande d'acheteurs avec financement validé\n\nSouhaitez-vous recevoir notre analyse détaillée des prix constatés par rue ?`,
      goal: 'Démontrer l\'expertise locale avec des repères concrets de prix.',
      status: 'scheduled',
    },
    {
      id: `${lead.id}-step-3`,
      step: 'Message 3 (J+12)',
      channel: 'Email',
      delay: '12 jours après',
      scheduledDate: addDays(12),
      scheduledTime: '14:00',
      subject: `Dossier technique & DPE : Sécurisez votre prix net vendeur`,
      message: `Bonjour ${firstName},\n\nPour réussir votre vente dans votre calendrier (${lead.timeframe}), l'anticipation du dossier technique (DPE, électricité, mesurage) permet d'éviter les négociations de dernière minute lors du compromis.\n\nNous pouvons vous orienter vers nos diagnostiqueurs certifiés partenaires avec tarifs négociés.`,
      goal: 'Apporter une valeur technique et juridique rassurante.',
      status: 'scheduled',
    },
    {
      id: `${lead.id}-step-4`,
      step: 'Message 4 (J+25)',
      channel: 'SMS',
      delay: '25 jours après',
      scheduledDate: addDays(25),
      scheduledTime: '11:15',
      subject: `Point d'étape sur votre projet`,
      message: `Bonjour ${firstName}, où en est votre réflexion sur votre projet de vente à ${lead.city} ? Plusieurs acquéreurs qualifiés recherchent actuellement un ${lead.propertyType.toLowerCase()} sur votre secteur. Souhaitez-vous faire un point rapide de 5 min ?`,
      goal: 'Réengager la conversation pour caler le rendez-vous d\'estimation physique.',
      status: 'scheduled',
    },
    {
      id: `${lead.id}-step-5`,
      step: 'Message 5 (J+45)',
      channel: 'WhatsApp',
      delay: '45 jours après',
      scheduledDate: addDays(45),
      scheduledTime: '15:30',
      subject: `Acheteur qualifié en recherche sur ${lead.city}`,
      message: `Bonjour ${firstName}, nous venons de valider la solvabilité d'un acquéreur qui recherche activement un ${lead.propertyType.toLowerCase()} sur ${lead.city}. Si votre projet a évolué, faites-moi signe pour organiser un échange !`,
      goal: 'Créer une opportunité concrète avec un acquéreur sérieux.',
      status: 'scheduled',
    },
  ];
}
