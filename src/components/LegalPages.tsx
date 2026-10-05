import React from 'react';
import { AGENT, BRAND, LEGAL } from '../data/siteContent';
import { BrandLogo } from './BrandLogo';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-8">
    <h2 className="text-lg font-bold text-stone-900 mb-2">{title}</h2>
    <div className="text-sm text-stone-600 leading-relaxed space-y-2">{children}</div>
  </section>
);

const Shell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="min-h-screen bg-stone-50">
    <header className="bg-white border-b border-stone-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <BrandLogo />
        <a href="/" className="text-sm text-stone-500 hover:text-stone-800">← Retour à l'estimation</a>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">{title}</h1>
      {children}
      <p className="mt-10 text-xs text-stone-400">Dernière mise à jour : octobre 2026</p>
    </main>
  </div>
);

const Contact: React.FC = () => (
  <>
    Téléphone : <a className="underline" href={AGENT.phoneHref}>{AGENT.phone}</a>
    {LEGAL.contactEmail && (
      <> · E-mail : <a className="underline" href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a></>
    )}
  </>
);

export const MentionsLegales: React.FC = () => (
  <Shell title="Mentions légales">
    <Section title="Éditeur du site">
      <p>
        Le site « {BRAND.name} » est édité à l'initiative de <strong>{AGENT.name}</strong>, agent commercial
        indépendant en immobilier{LEGAL.rsac ? ` (${LEGAL.rsac})` : ''}, mandataire de {LEGAL.company}.
      </p>
      <p><Contact /></p>
    </Section>
    <Section title="Agence mandante">
      <p>
        <strong>{LEGAL.company}</strong>, {LEGAL.form}.<br />
        Siège social : {LEGAL.address}.<br />
        SIRET : {LEGAL.siret}.<br />
        {LEGAL.cartePro}.<br />
        {LEGAL.fonds}.
      </p>
      <p>
        Activité de transaction sur immeubles et fonds de commerce, soumise à la loi n° 70-9 du 2 janvier 1970
        (loi Hoguet).
      </p>
    </Section>
    <Section title="Conception du site">
      <p>Application conçue par La Digitale School.</p>
    </Section>
    <Section title="Hébergement">
      <p>Render Services, Inc., 525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis.</p>
    </Section>
    {LEGAL.mediator && (
      <Section title="Médiation de la consommation">
        <p>En cas de litige, vous pouvez recourir gratuitement au médiateur suivant : {LEGAL.mediator}.</p>
      </Section>
    )}
    <Section title="Nature des estimations">
      <p>
        L'estimation affichée en ligne est un ordre de grandeur calculé à partir des ventes publiées
        (base « Demandes de valeurs foncières » de l'État). Elle ne constitue ni une expertise ni un avis de valeur :
        seule une visite du bien permet d'établir une estimation personnalisée.
      </p>
    </Section>
    <Section title="Propriété intellectuelle">
      <p>
        Les textes, la mise en page et la marque du site sont protégés. Toute reproduction sans autorisation écrite
        est interdite.
      </p>
    </Section>
    <p className="mt-8 text-sm"><a className="underline text-stone-800" href="/confidentialite">Politique de confidentialité</a></p>
  </Shell>
);

export const Confidentialite: React.FC = () => (
  <Shell title="Politique de confidentialité">
    <Section title="Qui traite vos données ?">
      <p>
        Le responsable du traitement est {AGENT.name}, agent commercial indépendant, mandataire de {LEGAL.company}
        ({LEGAL.address}, SIRET {LEGAL.siret}). <Contact />
      </p>
    </Section>
    <Section title="Quelles données et pourquoi ?">
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Votre bien</strong> (adresse, type, surface) : calculer votre estimation. L'adresse est transmise au
          service public de géocodage (Base Adresse Nationale) pour être localisée.
        </li>
        <li>
          <strong>Vos coordonnées</strong> (nom, téléphone, e-mail), <strong>votre projet</strong> et vos réponses aux
          questions : vous recontacter au sujet de votre estimation et organiser une visite. Base légale : votre
          consentement, donné en cochant la case du formulaire.
        </li>
        <li>
          <strong>Vos échanges avec l'assistant</strong> : l'assistant est une intelligence artificielle, pas une
          personne. Ses réponses sont générées automatiquement ; la conversation est enregistrée pour que la
          conseillère prépare la visite. Aucune décision n'est prise sans intervention humaine.
        </li>
        <li>
          <strong>Origine de votre venue</strong> (annonce Google, campagne) : savoir quelle annonce a mené à votre
          demande. Elle est jointe à votre dossier ; la balise de mesure Google n'est chargée qu'avec votre accord.
        </li>
        <li>
          <strong>Relances par e-mail</strong> : quelques messages utiles après votre estimation. Chaque e-mail contient
          un lien de désinscription en un clic.
        </li>
      </ul>
    </Section>
    <Section title="Qui reçoit vos données ?">
      <p>
        {AGENT.name} et {LEGAL.company}. Prestataires techniques agissant pour notre compte : Render (hébergement),
        Supabase (base de données), Cal.com (prise de rendez-vous), Anthropic (génération des réponses de
        l'assistant et de la fiche de préparation), un service d'envoi d'e-mails, et Google (mesure des annonces, si
        vous l'acceptez). Certains sont situés hors de l'Union européenne ; les transferts s'appuient sur les
        garanties prévues par le RGPD (clauses contractuelles types). Vos données ne sont jamais vendues.
      </p>
    </Section>
    <Section title="Combien de temps ?">
      <p>
        Trois ans après notre dernier échange, puis suppression. Si vous vous opposez aux relances, vous n'en recevez
        plus ; votre adresse est conservée uniquement pour respecter ce refus.
      </p>
    </Section>
    <Section title="Vos droits">
      <p>
        Vous pouvez à tout moment accéder à vos données, les corriger, les faire supprimer, vous opposer à leur
        utilisation, retirer votre consentement ou demander leur portabilité. Écrivez-nous ou appelez : <Contact />.
        Vous pouvez aussi introduire une réclamation auprès de la CNIL (<a className="underline" href="https://www.cnil.fr">cnil.fr</a>).
      </p>
    </Section>
    <Section title="Cookies">
      <p>
        Le site n'utilise aucun cookie sans votre accord, hormis ce qui est nécessaire à son fonctionnement. Vous
        pouvez accepter ou refuser la mesure publicitaire dans le bandeau affiché à votre première visite ; effacer les
        données de votre navigateur permet de refaire ce choix.
      </p>
    </Section>
    <p className="mt-8 text-sm"><a className="underline text-stone-800" href="/mentions-legales">Mentions légales</a></p>
  </Shell>
);
