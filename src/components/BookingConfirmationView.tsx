import React, { useState } from 'react';
import { Lead } from '../types';
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
  Compass,
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
  });

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
    const title = encodeURIComponent(`Visite de découverte Agent Estimation - ${confirmedLead.name}`);
    const details = encodeURIComponent(
      `Rendez-vous de découverte et estimation avec Céline (Agent Estimation).\n\nBien : ${confirmedLead.propertyType} (${confirmedLead.surface} m²)\nLieu : ${confirmedLead.address || confirmedLead.city}\nObjectif : Faire connaissance, découvrir votre projet et échanger sur les spécificités du bien pour notre évaluation en équipe.\nPour modifier votre créneau, contactez directement Céline au 06 03 58 03 16`
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
      `DESCRIPTION:Visite de découverte avec Céline. Découvrir votre projet et analyser le bien pour l'évaluation en équipe. Tél Céline: 06 03 58 03 16`,
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
      q: "Ai-je besoin de préparer des documents pour cette première visite ?",
      a: "Non, aucun document officiel n'est requis pour cette première rencontre ! C'est avant tout une phase de découverte : Céline vient faire connaissance, visiter votre bien et échanger sur votre projet. Si vous avez un plan sous la main ou si vous connaissez le montant de la taxe foncière, des charges ou d'éventuels travaux votés, c'est un plus, mais rien n'est obligatoire."
    },
    {
      q: "Comment se déroule l'évaluation après la visite ?",
      a: "L'évaluation est réalisée collégialement en équipe. De retour à l'agence, Céline confronte les éléments relevés sur place avec nos experts du secteur et les données des transactions notariales récentes pour calibrer l'avis de valeur le plus juste et le plus solide."
    },
    {
      q: "Combien de temps dure cette visite de découverte ?",
      a: "Comptez environ 20 à 30 minutes d'échange convivial. Céline découvre les lieux avec vous, écoute vos souhaits, vos échéances et répond en toute transparence à toutes vos questions."
    },
    {
      q: "J'ai un imprévu, comment modifier mon créneau de visite ?",
      a: "Pour modifier ou reporter votre créneau, il vous suffit d'appeler directement Céline par téléphone au 06 03 58 03 16. Elle adaptera l'horaire selon vos disponibilités."
    }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* 1. TOP CONFIRMATION BANNER */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 border border-stone-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -top-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Rendez-vous confirmé & sécurisé
            </span>

            <div className="flex items-center gap-2 text-stone-400 text-xs">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confirmation envoyée par e-mail à <strong className="text-stone-200">{confirmedLead.email}</strong></span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Merci {confirmedLead.name}, votre visite d'expertise est planifiée !
            </h1>
            <p className="text-sm sm:text-base text-stone-300 max-w-2xl leading-relaxed">
              Votre créneau a bien été réservé avec votre conseillère dédiée. Céline vous attend à l'adresse du bien : <strong className="text-amber-300 font-semibold">{confirmedLead.address || confirmedLead.city}</strong>.
            </p>
          </div>

          {/* Core Appointment Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Date retenue</div>
                <div className="text-sm sm:text-base font-bold text-white mt-0.5">{cleanFormattedDate}</div>
                <div className="text-xs text-amber-300 font-medium mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{confirmedLead.meetingTime || '14:30'}</span>
                </div>
              </div>
            </div>

            <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Lieu de rendez-vous</div>
                <div className="text-sm font-bold text-white mt-0.5 truncate">{confirmedLead.address || confirmedLead.city}</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {confirmedLead.propertyType} • {confirmedLead.surface} m²
                </div>
              </div>
            </div>

            <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Type d'échange</div>
                <div className="text-sm font-bold text-white mt-0.5">{confirmedLead.meetingType || "Visite d'expertise in situ"}</div>
                <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                  100% Offert & Sans engagement
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
              <CalendarPlus className="w-4 h-4 text-emerald-600" />
              <span>Ajouter à Google Calendar</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadiCal}
              className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700 flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4 text-stone-400" />
              <span>{copiedCalendar ? 'Téléchargé !' : 'Télécharger (.ics / Apple & Outlook)'}</span>
            </button>

            {onModifyBooking && (
              <button
                type="button"
                onClick={onModifyBooking}
                className="py-2.5 px-4 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 text-xs font-medium border border-stone-700/80 transition-all ml-auto"
              >
                Modifier mon créneau
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. TWO COLUMNS: DEDICATED ADVISOR PROFILE + INTERACTIVE CHECKLIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Conseillère Référente Card (Trust & Human Touch) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Votre interlocutrice dédiée
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                Assignée à votre dossier
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center font-black text-stone-950 text-2xl shadow-md border-2 border-white">
                  C
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="En ligne" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-stone-900">Céline</h3>
                <p className="text-xs font-medium text-amber-700">Conseillère immobilière indépendante</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 rounded-2xl p-4 border border-stone-200/70 italic">
              « Bonjour {confirmedLead.name} ! Cette première visite est avant tout une phase de découverte : nous allons faire connaissance, échanger en toute simplicité sur votre projet et vos attentes. Aucun document formel n'est nécessaire. Après notre échange, notre évaluation sera réalisée en équipe pour vous garantir la vision la plus juste. »
            </p>

            <div className="space-y-2 pt-1">
              <a
                href="tel:0603580316"
                className="w-full py-3 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm group"
              >
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>Joindre Céline au 06 03 58 03 16</span>
              </a>

              <div className="text-center">
                <span className="text-[11px] text-stone-500">
                  Pour modifier ou décaler votre créneau, appelez Céline au <strong>06 03 58 03 16</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Secteur & Engagement Spécifique */}
          <div className="bg-stone-900 text-white rounded-3xl p-5 sm:p-6 border border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>Secteur d'Intervention Garanti</span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">Lyon, Villeurbanne & Rayon 50 km (Beaujolais inclus)</h4>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                Céline et son équipe opèrent exclusivement sur la métropole lyonnaise, Villeurbanne et le Beaujolais jusqu'à 50 km autour de Lyon pour garantir une maîtrise parfaite des micromarchés locaux.
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Discovery Phase & Simple Info */}
        <div className="lg:col-span-7 space-y-6">
          {/* Discovery & Key Info Card */}
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Phase découverte : Faire connaissance & échanger sur votre projet
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Aucun document obligatoire pour cette 1ère visite. Voici simplement les informations utiles à évoquer :
                </p>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-3">
              <div
                onClick={() => toggleCheck('info_travaux')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  checklist.info_travaux 
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                    : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/70 text-stone-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checklist.info_travaux}
                  onChange={() => {}}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-semibold">1. Travaux déjà votés ou à prévoir</div>
                  <div className="text-stone-500 text-[11px] mt-0.5">Y a-t-il eu des rénovations récentes ou des travaux votés/envisagés (toiture, ravalement, chaudière, ascenseur...) ?</div>
                </div>
              </div>

              <div
                onClick={() => toggleCheck('info_taxe')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  checklist.info_taxe 
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                    : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/70 text-stone-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checklist.info_taxe}
                  onChange={() => {}}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-semibold">2. Montant de la taxe foncière</div>
                  <div className="text-stone-500 text-[11px] mt-0.5">Le montant annuel approximatif de votre taxe foncière.</div>
                </div>
              </div>

              <div
                onClick={() => toggleCheck('info_copro')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  checklist.info_copro 
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                    : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/70 text-stone-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checklist.info_copro}
                  onChange={() => {}}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-semibold">3. Charges de copropriété (si applicable)</div>
                  <div className="text-stone-500 text-[11px] mt-0.5">Le montant moyen trimestriel ou annuel des charges courantes.</div>
                </div>
              </div>

              <div
                onClick={() => toggleCheck('info_plan')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  checklist.info_plan 
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                    : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/70 text-stone-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checklist.info_plan}
                  onChange={() => {}}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-semibold">4. Avez-vous un plan du bien ? (C'est encore mieux !)</div>
                  <div className="text-stone-500 text-[11px] mt-0.5">Un plan d'architecte ou même un schéma aide grandement notre équipe à apprécier la distribution des espaces.</div>
                </div>
              </div>
            </div>

            {/* Team Evaluation Highlight */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-stone-800 space-y-1.5 mt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Une évaluation collégiale réalisée en équipe</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Après cette visite de découverte, Céline analyse le bien de manière concertée avec toute l'équipe d'experts de l'agence. Cette évaluation croisée garantit une analyse objective, solide et parfaitement corrélée aux réalités du marché local.
              </p>
            </div>
          </div>

          {/* Interactive FAQ Accordion */}
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-7 space-y-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-stone-700" />
              Questions fréquentes sur votre visite
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
        </div>
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
