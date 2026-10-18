import React, { useState } from 'react';
import { Lead } from '../types';
import { QuickQualification } from './QuickQualification';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  PhoneCall, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Download, 
  Share2, 
  ArrowRight, 
  FileText, 
  Home, 
  HelpCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Smartphone,
  CalendarPlus,
  FileCheck2,
  Award,
  ChevronRight
} from 'lucide-react';

interface Props {
  confirmedLead: Lead;
  onModifyBooking?: () => void;
  onBackToEstimator?: () => void;
}

export const BookingConfirmationView: React.FC<Props> = ({
  confirmedLead,
  onModifyBooking,
  onBackToEstimator,
}) => {
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    info_travaux: true,
    info_taxe: false,
    info_copro: false,
    info_plan: false,
    info_dpe: false,
  });
  const firstName = (confirmedLead.name || '').trim().split(/\s+/)[0] || '';
  const PREP_ITEMS: Array<[string, string, string]> = [
    ['info_travaux', '1. Travaux réalisés ou à prévoir', 'Rénovations récentes ou travaux envisagés (toiture, ravalement, chaudière, ascenseur...).'],
    ['info_taxe', '2. Taxe foncière', 'Le montant annuel approximatif.'],
    ['info_copro', '3. Charges de copropriété (si appartement)', 'Le montant moyen trimestriel ou annuel des charges courantes.'],
    ['info_plan', '4. Plan du logement (si disponible)', 'Un plan ou même un schéma aide à apprécier la distribution des espaces.'],
    ['info_dpe', '5. Diagnostic technique & DPE (si disponibles)', 'Les diagnostics déjà réalisés.'],
  ];

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedCalendar, setCopiedCalendar] = useState(false);

  const toggleCheck = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formattedDate = confirmedLead.meetingDate 
    ? new Date(confirmedLead.meetingDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Créneau à confirmer';

  // Capitalize first letter of day
  const cleanFormattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Generate Google Calendar Link
  const handleAddToGoogleCalendar = () => {
    const title = encodeURIComponent(`Visite d'estimation Agent Estimation - ${confirmedLead.name}`);
    const details = encodeURIComponent(
      `Rendez-vous de découverte et estimation avec Céline (Agent Estimation).\n\nBien : ${confirmedLead.propertyType} (${confirmedLead.surface} m²)\nLieu : ${confirmedLead.address || confirmedLead.city}\nObjectif : Faire connaissance, découvrir votre projet et échanger sur les spécificités du bien pour établir votre avis de valeur.\nPour modifier votre créneau, contactez directement Céline au 06 03 58 03 16`
    );
    const location = encodeURIComponent(confirmedLead.address || `${confirmedLead.city}, France`);
    
    // Default 1 hour slot
    const dateStr = (confirmedLead.meetingDate || '2026-09-01').replace(/-/g, '');
    const timeStr = (confirmedLead.meetingTime || '14:30').replace(':', '') + '00';
    const startIso = `${dateStr}T${timeStr}`;
    const endIso = `${dateStr}T${parseInt(timeStr.slice(0, 2)) + 1}${timeStr.slice(2)}`;

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startIso}/${endIso}`;
    window.open(url, '_blank');
  };

  // Generate iCal (.ics) download
  const handleDownloadiCal = () => {
    const dateStr = (confirmedLead.meetingDate || '2026-09-01').replace(/-/g, '');
    const timeStr = (confirmedLead.meetingTime || '14:30').replace(':', '') + '00';
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Agent Estimation//RDV Decouverte//FR',
      'BEGIN:VEVENT',
      `SUMMARY:Visite découverte & estimation - ${confirmedLead.name}`,
      `DESCRIPTION:Visite sur place avec Céline pour analyser le bien et préparer votre avis de valeur. Tél Céline: 06 03 58 03 16`,
      `LOCATION:${confirmedLead.address || confirmedLead.city}`,
      `DTSTART:${dateStr}T${timeStr}`,
      `DTEND:${dateStr}T${(parseInt(timeStr.slice(0, 2)) + 1).toString().padStart(2, '0')}${timeStr.slice(2)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `rdv-decouverte-agent-estimation-${confirmedLead.meetingDate}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedCalendar(true);
    setTimeout(() => setCopiedCalendar(false), 3000);
  };

  const faqItems = [
    {
      q: "Que dois-je préparer pour la visite ?",
      a: "Rien d'obligatoire. Si vous les avez, Céline apprécie de pouvoir consulter : la taxe foncière, les charges de copropriété, le plan du logement, les diagnostics (dont le DPE) et la liste des travaux réalisés. Sinon, elle vous guidera sur place.",
    },
    {
      q: "Comment est établie mon estimation après le passage de Céline ?",
      a: "Après la visite, Céline confronte les éléments relevés sur place (état, luminosité, étage, vue, prestations) avec les transactions récentes de votre secteur pour établir un avis de valeur, qu'elle vous remet ensuite.",
    },
    {
      q: "Dois-je ranger ou nettoyer mon logement avant la visite ?",
      a: "Pas besoin d'une mise en scène : Céline a besoin de voir votre logement tel qu'il est, avec ses atouts réels. Un logement simplement aéré et accessible suffit.",
    },
    {
      q: "Mon conjoint ou mes proches peuvent-ils être présents ?",
      a: "Bien sûr, c'est même recommandé si le bien est détenu à plusieurs : chacun peut poser ses questions et exprimer ses attentes.",
    },
    {
      q: "Que se passe-t-il après la remise de l'avis de valeur ?",
      a: "Vous êtes libre de la suite : l'avis de valeur est offert et sans engagement. Vous pouvez en discuter avec Céline, prendre le temps de la réflexion, ou lui demander de vous accompagner dans votre projet de vente.",
    },
    {
      q: "Combien de temps dure la visite sur place ?",
      a: "Comptez environ 30 à 45 minutes. Céline visite les lieux avec vous, écoute votre projet et répond à toutes vos questions.",
    },
    {
      q: "J'ai un imprévu : puis-je modifier ou annuler mon rendez-vous ?",
      a: "Oui, sans aucune justification. Appelez directement Céline au 06 03 58 03 16 : elle adaptera l'horaire selon vos disponibilités.",
    },
  ];

  const faqBlock = (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-7 space-y-4">
      <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-stone-700" />
        Tout savoir sur le déroulement de votre visite
      </h3>

      <div className="space-y-2.5">
        {faqItems.map((item, idx) => {
          const isOpen = openFaqIndex === idx;
          return (
            <div
              key={idx}
              className="border border-stone-200 rounded-2xl overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-bold text-stone-800 hover:bg-stone-50 transition-colors"
              >
                <span>{item.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-stone-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-500 flex-shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-xs text-stone-600 leading-relaxed border-t border-stone-100 pt-3 bg-stone-50/50">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      <div className="text-center space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">Estimation Immobilière Région Lyonnaise &amp; Beaujolais</div>
        <ol className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-stone-500">
          <li>1. Estimation IA</li>
          <li>2. Choix du créneau</li>
          <li className="font-bold text-[#2B4BFF]">3. Visite confirmée</li>
        </ol>
      </div>
      {/* 1. TOP CONFIRMATION BANNER */}
      <div className="bg-[#2B4BFF] text-white rounded-3xl p-6 sm:p-8 md:p-10 border-[3px] border-[#0B0F1F] shadow-[8px_8px_0_#0B0F1F] relative overflow-hidden">

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD60A] text-[#0B0F1F] border-[3px] border-[#0B0F1F] text-xs font-black">
              <CheckCircle2 className="w-4 h-4 text-[#FFD60A]" />
              ✓ Rendez-vous confirmé
            </span>

            <div className="flex items-center gap-2 text-stone-400 text-xs">
              <Smartphone className="w-3.5 h-3.5 text-[#FFD60A]" />
              <span>Confirmation envoyée par e-mail à <strong className="text-stone-200">{confirmedLead.email}</strong></span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              {firstName}, votre visite sur place est bien confirmée !
            </h1>
            <p className="text-sm sm:text-base text-stone-300 max-w-2xl leading-relaxed">
              Céline se rendra à l'adresse indiquée <strong className="text-[#FFD60A] font-semibold">{confirmedLead.address || confirmedLead.city}</strong> pour réaliser l'analyse complète de votre bien et préparer votre avis de valeur.
            </p>
          </div>

          {/* Core Appointment Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-[#0B0F1F] border-[3px] border-[#0B0F1F] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-[#FFD60A] text-[#0B0F1F] border-[3px] border-[#0B0F1F] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="w-5 h-5 text-[#0B0F1F]" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Date du rendez-vous</div>
                <div className="text-sm sm:text-base font-bold text-white mt-0.5">{cleanFormattedDate}</div>
                <div className="text-xs text-[#FFD60A] font-medium mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{confirmedLead.meetingTime || '14:30'}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0B0F1F] border-[3px] border-[#0B0F1F] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-[#FFD60A] text-[#0B0F1F] border-[3px] border-[#0B0F1F] flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-5 h-5 text-[#0B0F1F]" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Adresse de la visite</div>
                <div className="text-sm font-bold text-white mt-0.5 truncate">{confirmedLead.address || confirmedLead.city}</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {confirmedLead.propertyType} • {confirmedLead.surface} m²
                </div>
              </div>
            </div>

            <div className="bg-[#0B0F1F] border-[3px] border-[#0B0F1F] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-[#0B0F1F] text-[#FFD60A] border-[3px] border-[#FFD60A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-[#FFD60A]" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Votre visite</div>
                <div className="text-sm font-bold text-white mt-0.5">Expertise sur place par Céline</div>
                <div className="text-xs text-[#FFD60A] font-semibold mt-0.5">
                  100 % offerte & sans engagement
                </div>
              </div>
            </div>
          </div>

          {/* Quick Calendar & Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAddToGoogleCalendar}
              className="py-2.5 px-4 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
            >
              <CalendarPlus className="w-4 h-4 text-[#2B4BFF]" />
              <span>Ajouter à Google Calendar</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadiCal}
              className="py-2.5 px-4 rounded-xl bg-[#0B0F1F] hover:bg-white hover:text-[#0B0F1F] text-white font-black text-xs border-[3px] border-[#0B0F1F] flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4 text-stone-400" />
              <span>{copiedCalendar ? 'Téléchargé !' : 'Télécharger (.ics / Apple & Outlook)'}</span>
            </button>

            {onModifyBooking && (
              <button
                type="button"
                onClick={onModifyBooking}
                className="py-2.5 px-4 rounded-xl bg-[#0B0F1F] hover:bg-white hover:text-[#0B0F1F] text-white text-xs font-black border-[3px] border-[#0B0F1F] transition-all ml-auto"
              >
                Modifier ou annuler le rendez-vous
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. SINGLE COLUMN: advisor, complementary questions, preparation, sector, FAQ */}
      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Votre conseillère dédiée
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FFF7E6] text-[#2B4BFF] border border-[#0B0F1F] text-[10px] font-bold">
              Dossier attribué
            </span>
          </div>

          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[#FFD60A] border-[3px] border-[#0B0F1F] flex items-center justify-center font-black text-stone-950 text-2xl shadow-md border-2 border-white">
                C
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#FFF7E6]0 border-2 border-white" title="En ligne" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-stone-900">Céline LEVRAT</h3>
              <p className="text-xs font-medium text-[#2B4BFF]">Experte immobilière locale</p>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 rounded-2xl p-4 border border-stone-200/70 italic">
            « Bonjour {firstName} ! Cette visite est un moment d'échange pour comprendre votre projet et observer les atouts de votre logement. Suite à notre rencontre, je réaliserai une analyse pour vous remettre un avis de valeur au prix juste. »
          </p>

          <div className="space-y-2 pt-1 sm:flex sm:items-center sm:gap-5 sm:space-y-0">
            <a
              href="tel:0603580316"
              className="w-full sm:w-auto sm:shrink-0 py-3 px-4 sm:px-8 rounded-2xl bg-[#2B4BFF] hover:bg-[#0B0F1F] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm group"
            >
              <PhoneCall className="w-4 h-4 text-[#FFD60A]" />
              <span className="flex flex-col items-center leading-tight"><span>Appeler Céline</span><span>06 03 58 03 16</span></span>
            </a>

            <div className="text-center sm:text-left">
              <span className="text-[11px] text-stone-500">
                Pour modifier ou décaler votre créneau, appelez Céline au <strong className="whitespace-nowrap">06 03 58 03 16</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Optional robot-led complementary questions about the property */}
        <QuickQualification
          leadId={confirmedLead.id}
          low={confirmedLead.valuation?.lowPrice}
          high={confirmedLead.valuation?.highPrice}
          onSubmitted={() => {}}
        />

        {/* Discovery & Key Info Card */}
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2B4BFF]" />
                Préparer votre visite : les éléments utiles
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Pour optimiser notre rendez-vous, vous pouvez préparer ces quelques éléments si vous les avez (rien d'obligatoire).
              </p>
            </div>
          </div>

          {/* Checklist items */}
          <div className="space-y-3">
            {PREP_ITEMS.map(([key, title, hint]) => (
              <div
                key={key}
                onClick={() => toggleCheck(key)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  checklist[key]
                    ? 'bg-[#FFF7E6]/60 border-[#0B0F1F] text-emerald-950'
                    : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/70 text-stone-800'
                }`}
              >
                <input type="checkbox" checked={!!checklist[key]} onChange={() => {}} className="w-4 h-4 text-[#2B4BFF] rounded border-stone-300 mt-0.5 cursor-pointer" />
                <div className="text-xs">
                  <div className="font-semibold">{title}</div>
                  <div className="text-stone-500 text-[11px] mt-0.5">{hint}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Team Evaluation Highlight */}
          <div className="p-4 rounded-2xl bg-[#FFF7E6] text-[#0B0F1F] border-[3px] border-[#0B0F1F] space-y-1.5 mt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0B0F1F]">
              <Award className="w-4 h-4 text-[#2B4BFF]" />
              <span>Votre avis de valeur</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Après la visite, Céline analyse votre bien à la lumière des transactions récentes de votre secteur. Vous recevez ensuite un avis de valeur au plus juste du marché local.
            </p>
          </div>
        </div>

        {faqBlock}
      </div>

      {/* Back to Home / Simulator if needed */}
      {onBackToEstimator && (
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={onBackToEstimator}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 inline-flex items-center gap-1.5 transition-colors"
          >
            <span>← Revenir au simulateur d'estimation</span>
          </button>
        </div>
      )}
    </div>
  );
};
