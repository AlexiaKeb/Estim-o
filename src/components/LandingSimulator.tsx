import { renderRichText } from '../utils/richText';
import React, { useState, useRef, useEffect } from 'react';
import { ValuationInputs, ValuationResult, Lead } from '../types';
import { syncLeadToSupabase } from '../lib/supabaseService';
import confetti from 'canvas-confetti';
import { AGENT, VISIT_LABEL } from '../data/siteContent';
import { getAttribution, trackConversion } from '../utils/tracking';
import { AddressSearch } from './AddressSearch';
import { QuickQualification, QuickAnswers } from './QuickQualification';
import { scrollToSimulator, ValuationEvidence, LandingHero, HowItWorks, WhyOnSite, SocialProof, FaqSection, FinalCta, StickyMobileCta } from './LandingSections';
import { 
  Building2, 
  Home, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight, 
  ArrowRight, 
  TrendingUp, 
  CheckCircle2, 
  Zap,
  Info,
  Layers,
  Eye,
  Calendar,
  Warehouse,
  Paintbrush,
  ThermometerSnowflake,
  Lock,
  Unlock,
  Phone,
  Mail,
  User,
  Clock,
  PhoneCall,
  FileText,
  AlertCircle,
  HeartHandshake,
  MessageSquare,
  Send,
  Bot,
  UserCheck,
  X,
  Flame,
  HelpCircle,
  Award,
  Car,
  Trees,
  Store,
  Compass
} from 'lucide-react';

interface Props {
  onValuationComplete: (inputs: ValuationInputs, result: ValuationResult) => void;
  onOpenChatDirect: () => void;
  onLeadCaptured?: (lead: Lead, replacesId?: string) => void;
  onOpenBooking?: (leadInfo: Partial<Lead>) => void;
}

export const LandingSimulator: React.FC<Props> = ({
  onValuationComplete,
  onOpenChatDirect,
  onLeadCaptured,
  onOpenBooking,
}) => {
  const [inputs, setInputs] = useState<ValuationInputs>({
    propertyType: 'apartment',
    address: '',
    surface: 78,
    rooms: 3,
    city: '',
    postalCode: '',
    condition: 'good',
    outdoor: 'balcony',
    dpe: 'C',
    hasParking: true,
    hasElevator: true,
    hasCellar: false,
    floor: 'intermediate',
    viewType: 'standard',
    facadeState: 'good',
    heatingType: 'electric_indiv',
    constructionPeriod: '1975_1999',
    yearBuilt: 1995,
  });

  // Hero search: carries the address into the form, then lands the visitor on the next thing to fill
  const handleHeroStart = (a: { address: string; postalCode?: string; city?: string }) => {
    setInputs((prev) => ({
      ...prev,
      address: a.address || prev.address,
      postalCode: a.postalCode || prev.postalCode,
      city: a.city || prev.city,
    }));
    scrollToSimulator();
  };

  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);

  // Lead Gate State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [leadContact, setLeadContact] = useState({
    name: '',
    phone: '',
    email: '',
    timeframe: '1-3 mois' as '< 1 mois' | '1-3 mois' | '3-6 mois' | '> 6 mois' | 'Curiosité',
    motive: 'Agrandissement' as 'Succession' | 'Mutation pro' | 'Agrandissement' | 'Divorce / Séparation' | 'Vente investissement' | 'Autre',
    consent: false,
  });
  const [contactError, setContactError] = useState<string | null>(null);
  const [capturedLead, setCapturedLead] = useState<Lead | null>(null);
  const [quickAnswers, setQuickAnswers] = useState<QuickAnswers>({});

  // Interactive Closer Bot State
  const [closerMessages, setCloserMessages] = useState<Array<{ id: string; role: 'assistant' | 'user'; content: string; showBookingBtn?: boolean }>>([]);
  const [closerInput, setCloserInput] = useState('');
  const [closerTyping, setCloserTyping] = useState(false);
  const [showFloatingDrawer, setShowFloatingDrawer] = useState(false);
  const closerChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (closerChatEndRef.current) {
      closerChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [closerMessages, closerTyping]);

  const calculateEstimation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setContactError(null);

    try {
      const res = await fetch('/api/valuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
      } else {
        // Fallback local calculation
        const baseM2 = inputs.city.toLowerCase().includes('paris') ? 9800 : 4400;
        let mult = inputs.propertyType === 'house' ? 1.08 : 1.0;
        if (inputs.condition === 'to_renovate') mult *= 0.82;
        if (inputs.condition === 'refresh_needed') mult *= 0.92;
        if (inputs.condition === 'renovated') mult *= 1.08;
        if (inputs.condition === 'new') mult *= 1.18;
        if (inputs.viewType === 'exceptional') mult *= 1.12;
        if (inputs.viewType === 'open') mult *= 1.05;
        if (inputs.floor === 'top_floor') mult *= 1.07;
        if (inputs.hasCellar) mult *= 1.02;

        const avg = Math.round(inputs.surface * baseM2 * mult);
        const resObj: ValuationResult = {
          lowPrice: Math.round(avg * 0.94),
          highPrice: Math.round(avg * 1.06),
          estimatedAvg: avg,
          avgM2: Math.round(avg / inputs.surface),
          currency: '€',
          address: inputs.address,
          city: inputs.city,
          postalCode: inputs.postalCode,
          surface: inputs.surface,
          propertyType: inputs.propertyType === 'apartment' ? 'Appartement' : 'Maison',
          marketTension: 'Forte demande sur ce secteur',
          confidenceScore: 94,
        };
        setResult(resObj);
      }
    } catch {
      const avg = inputs.surface * 4200;
      setResult({
        lowPrice: Math.round(avg * 0.94),
        highPrice: Math.round(avg * 1.06),
        estimatedAvg: avg,
        avgM2: 4200,
        currency: '€',
        address: inputs.address,
        city: inputs.city,
        postalCode: inputs.postalCode,
        surface: inputs.surface,
        propertyType: inputs.propertyType === 'apartment' ? 'Appartement' : 'Maison',
        marketTension: 'Forte demande sur ce secteur',
        confidenceScore: 92,
      });
    } finally {
      setLoading(false);
      // Scroll smoothly to the gate card on mobile
      setTimeout(() => {
        const resultElement = document.getElementById('lead-gate-card-anchor');
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  // Lead Gate Unlock Handler - Captures prospect contact info BEFORE giving the price
  const handleUnlockEstimation = (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);

    // Validation
    const cleanName = leadContact.name.trim();
    const cleanPhone = leadContact.phone.trim();
    const cleanEmail = leadContact.email.trim();

    if (!cleanName || cleanName.length < 2) {
      setContactError('Veuillez renseigner votre nom et prénom.');
      return;
    }

    // Phone validation (min 8 digits)
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (!cleanPhone || digitsOnly.length < 8) {
      setContactError('Veuillez renseigner un numéro de téléphone valide (ex: 06 03 58 03 16) pour recevoir votre confirmation.');
      return;
    }

    if (!leadContact.consent) {
      setContactError("Merci de cocher la case de consentement pour recevoir votre estimation.");
      return;
    }

    // Email validation
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setContactError('Veuillez renseigner une adresse email valide pour recevoir votre dossier complet.');
      return;
    }

    if (!result) return;

    // Create the lead object
    const isHot = leadContact.timeframe === '< 1 mois' || leadContact.timeframe === '1-3 mois';
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      address: inputs.address 
        ? `${inputs.address}, ${inputs.postalCode} ${inputs.city}` 
        : `${inputs.postalCode} ${inputs.city}`,
      propertyType: inputs.propertyType === 'apartment' ? 'Appartement' : 'Maison',
      surface: inputs.surface,
      city: inputs.city,
      estimatedValue: result.estimatedAvg,
      motive: leadContact.motive,
      timeframe: leadContact.timeframe,
      status: isHot ? 'HOT' : 'WARM',
      score: isHot ? 92 : 78,
      meetingBooked: false,
      createdAt: 'À l\'instant',
      valuation: {
        dataSource: result.dataSource,
        lowPrice: result.lowPrice,
        highPrice: result.highPrice,
        medianM2: result.medianM2,
        sampleSize: result.sampleSize,
        radiusM: result.radiusM,
        periodFrom: result.periodFrom,
        periodTo: result.periodTo,
      },
      attribution: getAttribution(),
      notes: `Lead capturé via simulateur d'estimation. Source du prix : ${
        result.dataSource === 'dvf'
          ? `${result.sampleSize} ventes réelles DVF${result.radiusM ? ` dans ${result.radiusM} m` : ' de la commune'} (médiane ${result.medianM2?.toLocaleString('fr-FR')} €/m²)`
          : 'prix moyen de secteur, ventes comparables indisponibles (fourchette large, à affiner en visite)'
      }. Projet : ${leadContact.motive} (${leadContact.timeframe}). Bien : ${inputs.propertyType === 'apartment' ? 'Appartement' : 'Maison'} ${inputs.surface} m² à ${inputs.city}. Fourchette : ${result.lowPrice.toLocaleString('fr-FR')} € - ${result.highPrice.toLocaleString('fr-FR')} €.`,
      tasks: [
        { id: `t-${Date.now()}-1`, label: 'Coordonnées capturées avant affichage du prix', done: true, category: 'qualification' },
        { id: `t-${Date.now()}-2`, label: 'Rappeler le vendeur sous 2h (Priorité)', done: false, category: 'qualification' },
        { id: `t-${Date.now()}-3`, label: 'Proposer et fixer la visite d\'expertise in situ', done: false, category: 'rdv' },
      ],
      activities: [
        { 
          id: `act-${Date.now()}`, 
          type: 'call', 
          label: `Simulation en ligne déverrouillée (${result.estimatedAvg.toLocaleString('fr-FR')} €) - Contact capturé`, 
          date: 'À l\'instant' 
        },
      ],
    };

    // Save lead in CRM & sync to Supabase
    setCapturedLead(newLead);
    trackConversion('lead');
    if (onLeadCaptured) {
      onLeadCaptured(newLead);
    }

    // Persist to Supabase, then adopt the database id so every later step (chat, booking) reuses this one lead
    syncLeadToSupabase(newLead)
      .then((realId) => {
        if (realId && realId !== newLead.id) {
          const synced = { ...newLead, id: realId };
          setCapturedLead(synced);
          onLeadCaptured?.(synced, newLead.id);
        }
      })
      .catch((err) => {
        console.warn('Simulator lead Supabase sync error:', err);
      });

    // Trigger celebration & unlock
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore
    }

    setIsUnlocked(true);

    // Initialize Advisor Bot with a direct personalized pitch
    const initialCloserPitch = `Bonjour ${cleanName} ! Je suis l'assistant virtuel de ${AGENT.firstName} (une intelligence artificielle). La fourchette de votre ${inputs.propertyType === 'apartment' ? 'appartement' : 'maison'} de ${inputs.surface} m² à ${inputs.city} : **${result.lowPrice.toLocaleString('fr-FR')} € à ${result.highPrice.toLocaleString('fr-FR')} €**.\n\nC'est un repère : une simulation ne voit ni la luminosité, ni l'état réel du bien. Pour un avis plus précis, ${AGENT.firstName} propose une visite de ${VISIT_LABEL}, gratuite et sans engagement.\n\nJe peux répondre à vos questions, ou vous pouvez choisir un créneau directement.`;

    setCloserMessages([
      {
        id: `closer-init-${Date.now()}`,
        role: 'assistant',
        content: initialCloserPitch,
        showBookingBtn: true,
      },
    ]);
  };

  const handleSendCloserMessage = async (customText?: string) => {
    const text = (customText || closerInput).trim();
    if (!text || closerTyping) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: text,
    };

    const newHistory = [...closerMessages, userMsg];
    setCloserMessages(newHistory);
    setCloserInput('');
    setCloserTyping(true);

    try {
      const response = await fetch('/api/chat-qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          leadId: capturedLead?.id,
          leadData: {
            name: leadContact.name,
            phone: leadContact.phone,
            email: leadContact.email,
            propertyType: inputs.propertyType === 'apartment' ? 'Appartement' : 'Maison',
            surface: inputs.surface,
            city: inputs.city,
            motive: leadContact.motive,
            timeframe: leadContact.timeframe,
            estimatedAvg: result?.estimatedAvg,
            // Already answered by tap: the assistant must not ask again
            reponsesRapides: quickAnswers,
          },
        }),
      });

      const data = await response.json();
      const reply = data.reply || `C'est une excellente décision d'anticiper ! Une visite sur place de ${VISIT_LABEL} permet de fixer votre valeur exacte sans aucun engagement.`;
      const isBookingTime = data.recommendedAction === 'BOOK_MEETING' || /\b(rdv|rendez-vous|créneau|visite|disponibilit)/i.test(text);

      setCloserMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply,
          showBookingBtn: isBookingTime,
        },
      ]);
    } catch {
      setCloserMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Je rencontre un souci technique et ne peux pas répondre pour l'instant. Vous pouvez choisir un créneau de visite avec ${AGENT.firstName}, ou l'appeler au ${AGENT.phone}.`,
          showBookingBtn: true,
        },
      ]);
    } finally {
      setCloserTyping(false);
    }
  };

  const handleStartQualification = () => {
    if (result) {
      onValuationComplete(inputs, result);
    } else {
      onOpenChatDirect();
    }
  };

  const handleTriggerBooking = () => {
    if (onOpenBooking) {
      onOpenBooking({
        id: capturedLead?.id,
        name: leadContact.name,
        phone: leadContact.phone,
        email: leadContact.email,
        city: inputs.city,
        address: inputs.address || inputs.city,
        surface: inputs.surface,
        propertyType: inputs.propertyType === 'apartment' ? 'Appartement' : 'Maison',
        estimatedValue: result?.estimatedAvg,
        motive: leadContact.motive,
        timeframe: leadContact.timeframe,
      });
    } else {
      handleStartQualification();
    }
  };

  return (
    <div id="landing-simulator-container" className="w-full max-w-6xl mx-auto space-y-8">
      <LandingHero onStart={handleHeroStart} />

      {/* Main Grid: Form + Result / Lead Gate Card */}
      <div id="simulateur" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Inputs */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200/80 shadow-2xs p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Votre bien</h2>
              <p className="text-xs text-stone-500 font-normal">Quelques informations suffisent. Vous pourrez affiner ensuite si vous le souhaitez.</p>
            </div>
            <span className="px-2.5 py-1 bg-stone-100 text-stone-700 text-xs font-medium rounded-lg border border-stone-200">
              Étape 1 sur 2
            </span>
          </div>

          <form onSubmit={calculateEstimation} className="space-y-5">
            {/* Property Type selection */}
            <div>
              <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider mb-2">
                Type de bien
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  id="btn-prop-apartment"
                  onClick={() => setInputs({ ...inputs, propertyType: 'apartment' })}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                    inputs.propertyType === 'apartment'
                      ? 'border-stone-900 bg-stone-900 text-white shadow-2xs'
                      : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-stone-400" />
                  Appartement
                </button>
                <button
                  type="button"
                  id="btn-prop-house"
                  onClick={() => setInputs({ ...inputs, propertyType: 'house' })}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                    inputs.propertyType === 'house'
                      ? 'border-stone-900 bg-stone-900 text-white shadow-2xs'
                      : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Home className="w-4 h-4 text-stone-400" />
                  Maison / Villa
                </button>
                <button
                  type="button"
                  id="btn-prop-garage"
                  onClick={() => setInputs({ ...inputs, propertyType: 'garage' })}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                    inputs.propertyType === 'garage'
                      ? 'border-stone-900 bg-stone-900 text-white shadow-2xs'
                      : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Car className="w-4 h-4 text-stone-400" />
                  Garage / Box
                </button>
                <button
                  type="button"
                  id="btn-prop-terrain"
                  onClick={() => setInputs({ ...inputs, propertyType: 'terrain' })}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                    inputs.propertyType === 'terrain'
                      ? 'border-stone-900 bg-stone-900 text-white shadow-2xs'
                      : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Trees className="w-4 h-4 text-stone-400" />
                  Terrain
                </button>
                <button
                  type="button"
                  id="btn-prop-commercial"
                  onClick={() => setInputs({ ...inputs, propertyType: 'commercial' })}
                  className={`col-span-2 sm:col-span-2 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                    inputs.propertyType === 'commercial' || inputs.propertyType === 'building'
                      ? 'border-stone-900 bg-stone-900 text-white shadow-2xs'
                      : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Store className="w-4 h-4 text-stone-400" />
                  Immeuble / Local commercial / Autre
                </button>
              </div>
            </div>

            {/* Special Notice for non-standard property types */}
            {(inputs.propertyType === 'garage' || inputs.propertyType === 'terrain' || inputs.propertyType === 'commercial' || inputs.propertyType === 'building') && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-stone-800 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Bien spécifique : Étude directe sur-mesure avec Céline</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Pour un {inputs.propertyType === 'garage' ? 'garage / box' : inputs.propertyType === 'terrain' ? 'terrain' : 'immeuble / local commercial'}, une estimation algorithmique standard ne peut pas refléter les règles d'urbanisme (PLU), la constructibilité, les charges de copropriété ou les baux. <strong>Céline étudie directement votre bien</strong> pour vous donner une valorisation exacte.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href="tel:0603580316"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-all shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                    Appeler Céline au 06 03 58 03 16
                  </a>
                  <button
                    type="button"
                    onClick={onOpenChatDirect}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-50 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                    Échanger par messagerie
                  </button>
                </div>
              </div>
            )}

            {/* Address, City & Postal Code */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider mb-1.5">
                  Adresse précise du bien (N° et Rue)
                </label>
                <AddressSearch
                  id="input-address"
                  value={inputs.address || ''}
                  onChange={(text) => setInputs({ ...inputs, address: text })}
                  onSelect={(s) => setInputs({ ...inputs, address: s.street, postalCode: s.postalCode, city: s.city })}
                  placeholder="Commencez à saisir l'adresse"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider">
                      Ville ou Commune *
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Secteur Lyon & 50 km
                    </span>
                  </div>
                  <input
                    type="text"
                    id="input-city"
                    value={inputs.city}
                    onChange={(e) => setInputs({ ...inputs, city: e.target.value })}
                    required
                    placeholder="Ex: Lyon, Villeurbanne, Caluire..."
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm font-normal text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 bg-white"
                  />

                  {/* Quick sector selection tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[
                      { city: 'Lyon', cp: '69006' },
                      { city: 'Villeurbanne', cp: '69100' },
                      { city: 'Caluire-et-Cuire', cp: '69300' },
                      { city: 'Villefranche (Beaujolais)', cp: '69400' },
                      { city: 'Écully', cp: '69130' },
                      { city: 'Bron', cp: '69500' },
                    ].map((hub) => (
                      <button
                        key={hub.city}
                        type="button"
                        onClick={() => setInputs({ ...inputs, city: hub.city, postalCode: hub.cp })}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                          inputs.city === hub.city
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {hub.city}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider mb-1.5">
                    Code Postal *
                  </label>
                  <input
                    type="text"
                    id="input-postal-code"
                    value={inputs.postalCode}
                    onChange={(e) => setInputs({ ...inputs, postalCode: e.target.value })}
                    required
                    placeholder="Ex: 69006"
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-200 text-sm font-normal text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Surface & Rooms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Surface habitable
                  </label>
                  <span className="text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                    {inputs.surface} m²
                  </span>
                </div>
                <input
                  type="range"
                  id="input-surface-range"
                  min="15"
                  max="400"
                  step="1"
                  value={inputs.surface}
                  onChange={(e) => setInputs({ ...inputs, surface: Number(e.target.value) })}
                  className="w-full accent-stone-900 h-2 bg-stone-100 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre de pièces
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setInputs({ ...inputs, rooms: num })}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        inputs.rooms === num
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {num === 6 ? '6+' : num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional refinements: kept out of the way so the first step stays short */}
            <button
              type="button"
              id="btn-toggle-advanced"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
              className="w-full flex items-center justify-between rounded-xl border border-dashed border-stone-300 bg-stone-50 hover:bg-stone-100 px-4 py-3 text-left transition-colors"
            >
              <span>
                <span className="block text-sm font-semibold text-stone-900">
                  {showAdvanced ? 'Masquer les précisions' : 'Affiner mon estimation (facultatif)'}
                </span>
                <span className="block text-xs text-stone-500">
                  Étage, état, DPE, extérieur… plus vous précisez, plus la fourchette est juste.
                </span>
              </span>
              <span className={`text-stone-500 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>›</span>
            </button>

            {showAdvanced && (
              <div className="space-y-6">
            {/* Étage & Vue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  {inputs.propertyType === 'apartment' ? 'Étage du bien' : 'Configuration'}
                </label>
                {inputs.propertyType === 'apartment' ? (
                  <select
                    id="select-floor"
                    value={inputs.floor || 'intermediate'}
                    onChange={(e) => setInputs({ ...inputs, floor: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                  >
                    <option value="rdc">Rez-de-chaussée (RDC)</option>
                    <option value="intermediate">Étage intermédiaire (1er - 2e étage)</option>
                    <option value="high_floor">Étage élevé (3e - 5e étage)</option>
                    <option value="top_floor">Dernier étage / Attique / Rooftop</option>
                  </select>
                ) : (
                  <select
                    id="select-floor-house"
                    value={inputs.floor || 'single_storey'}
                    onChange={(e) => setInputs({ ...inputs, floor: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                  >
                    <option value="single_storey">Maison de Plain-pied</option>
                    <option value="multi_storey">Maison à étage(s) (R+1 ou plus)</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  Exposition & Vue
                </label>
                <select
                  id="select-view"
                  value={inputs.viewType || 'standard'}
                  onChange={(e) => setInputs({ ...inputs, viewType: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="open">Vue dégagée / Sans vis-à-vis</option>
                  <option value="standard">Vue standard quartier / Résidence</option>
                  <option value="street">Vue sur rue / Environnement urbain</option>
                  <option value="exceptional">Vue exceptionnelle (Parc, Mer, Monument, Panoramique)</option>
                  <option value="vis_a_vis">Vis-à-vis direct / Proche</option>
                </select>
              </div>
            </div>

            {/* État général & Ravalement de façade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Paintbrush className="w-3.5 h-3.5 text-slate-400" />
                  État général du bien
                </label>
                <select
                  id="select-condition"
                  value={inputs.condition}
                  onChange={(e) => setInputs({ ...inputs, condition: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="to_renovate">À rénover entièrement (Gros travaux / Réhabilitation)</option>
                  <option value="refresh_needed">Travaux de rafraîchissement / À moderniser</option>
                  <option value="good">Bon état / Habitable de suite</option>
                  <option value="renovated">Très bon état / Rénové récemment</option>
                  <option value="new">Neuf / Prestations haut de gamme</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                  Ravalement de façade / Toiture
                </label>
                <select
                  id="select-facade"
                  value={inputs.facadeState || 'good'}
                  onChange={(e) => setInputs({ ...inputs, facadeState: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="recent">Ravalement récent (&lt; 5 ans)</option>
                  <option value="good">Bon état général / Entretenu</option>
                  <option value="to_plan">À prévoir / Travaux votés ou nécessaires</option>
                  <option value="not_applicable">Maison individuelle / Non concerné</option>
                </select>
              </div>
            </div>

            {/* Type de Chauffage & Année de construction */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-slate-400" />
                  Type de Chauffage
                </label>
                <select
                  id="select-heating"
                  value={inputs.heatingType || 'electric_indiv'}
                  onChange={(e) => setInputs({ ...inputs, heatingType: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="electric_indiv">Individuel Électrique (Radiateurs / Inertie)</option>
                  <option value="gas_indiv">Individuel Gaz (Chaudière)</option>
                  <option value="gas_collective">Collectif (Gaz / Réseau urbain)</option>
                  <option value="heat_pump">Pompe à chaleur / Climatisation réversible</option>
                  <option value="wood_pellet">Poêle à bois / Granulés / Cheminée</option>
                  <option value="other">Autre / Chauffage au sol</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Année / Époque de construction
                </label>
                <select
                  id="select-construction-period"
                  value={inputs.constructionPeriod || '1975_1999'}
                  onChange={(e) => setInputs({ ...inputs, constructionPeriod: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="before_1948">Avant 1948 (Ancien de caractère, pierre, haussmannien)</option>
                  <option value="1949_1974">1949 – 1974 (Années 50-70)</option>
                  <option value="1975_1999">1975 – 1999 (Années 80-90)</option>
                  <option value="2000_2015">2000 – 2015 (Construction récente)</option>
                  <option value="after_2016">Après 2016 / Neuf (RT 2012 / RE 2020)</option>
                  <option value="unknown">Je ne sais pas exactement</option>
                </select>
              </div>
            </div>

            {/* Extérieur */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Extérieur privatif
              </label>
              <select
                id="select-outdoor"
                value={inputs.outdoor}
                onChange={(e) => setInputs({ ...inputs, outdoor: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                <option value="none">Aucun extérieur</option>
                <option value="balcony">Balcon</option>
                <option value="terrace">Grande terrasse</option>
                <option value="garden">Jardin privatif</option>
              </select>
            </div>

            {/* Diagnostic DPE */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Diagnostic de Performance Énergétique (DPE)
              </label>
              <div className="grid grid-cols-8 gap-1.5">
                {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map((letter) => {
                  const colors: Record<string, string> = {
                    A: 'bg-emerald-600 text-white',
                    B: 'bg-emerald-500 text-white',
                    C: 'bg-lime-500 text-white',
                    D: 'bg-amber-400 text-slate-900',
                    E: 'bg-orange-500 text-white',
                    F: 'bg-red-500 text-white',
                    G: 'bg-red-700 text-white',
                  };
                  const isSelected = inputs.dpe === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setInputs({ ...inputs, dpe: letter })}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? `${colors[letter]} ring-2 ring-slate-900 scale-105 shadow-xs`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}

                <button
                  type="button"
                  id="btn-dpe-unknown"
                  onClick={() => setInputs({ ...inputs, dpe: 'unknown' })}
                  className={`col-span-8 md:col-span-1 py-2 px-2 rounded-lg text-[11px] font-bold transition-all ${
                    inputs.dpe === 'unknown'
                      ? 'bg-stone-900 text-white ring-2 ring-stone-900 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title="DPE en cours ou inconnu"
                >
                  ? / En cours
                </button>
              </div>
            </div>

            {/* Annexes */}
            <div className="flex flex-wrap gap-5 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  id="checkbox-has-cellar"
                  checked={inputs.hasCellar}
                  onChange={(e) => setInputs({ ...inputs, hasCellar: e.target.checked })}
                  className="w-4 h-4 text-stone-900 rounded border-slate-300 focus:ring-stone-500"
                />
                Cave / Sous-sol privatif
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  id="checkbox-has-parking"
                  checked={inputs.hasParking}
                  onChange={(e) => setInputs({ ...inputs, hasParking: e.target.checked })}
                  className="w-4 h-4 text-stone-900 rounded border-slate-300 focus:ring-stone-500"
                />
                Parking / Garage / Box fermé
              </label>

              {inputs.propertyType === 'apartment' && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    id="checkbox-has-elevator"
                    checked={inputs.hasElevator}
                    onChange={(e) => setInputs({ ...inputs, hasElevator: e.target.checked })}
                    className="w-4 h-4 text-stone-900 rounded border-slate-300 focus:ring-stone-500"
                  />
                  Ascenseur
                </label>
              )}
            </div>

              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-calculate-estimation"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-black text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 group disabled:opacity-75"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Générer mon rapport & Déverrouiller l'estimation</span>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Card: Lead Gate & Unveiled Estimation Box */}
        <div id="lead-gate-card-anchor" className="lg:col-span-5 space-y-6">
          {result ? (
            !isUnlocked ? (
              /* ========================================================================= */
              /* LEAD GATE STEP: Prospect must provide contact info BEFORE seeing the price */
              /* ========================================================================= */
              <div id="lead-gate-form-box" className="bg-white rounded-2xl border border-stone-200 shadow-lg p-4 sm:p-6 space-y-4 animate-in fade-in duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-stone-900 to-emerald-500" />
                
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Estimation calculée & prête
                  </span>
                  <span className="text-[11px] text-stone-500 font-medium">18 ventes analysées</span>
                </div>

                {/* Refined & Responsive Locked Price Card */}
                <div className="p-4 rounded-xl bg-stone-950 text-white border border-stone-800 shadow-inner space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-stone-300">
                    <span className="font-medium text-stone-200">Fourchette de valorisation</span>
                    <span className="inline-flex items-center gap-1 text-amber-300 text-[10px] font-semibold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                      Accès réservé propriétaire
                    </span>
                  </div>

                  {/* Masked Value Display (Clean & Ultra-Responsive) */}
                  <div className="py-2 px-3 rounded-lg bg-stone-900/90 border border-stone-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 select-none pointer-events-none">
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-600 animate-pulse" />
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-600 animate-pulse" style={{ animationDelay: '100ms' }} />
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-600 animate-pulse" style={{ animationDelay: '200ms' }} />
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-600 animate-pulse" style={{ animationDelay: '300ms' }} />
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-600 animate-pulse" style={{ animationDelay: '400ms' }} />
                        <span className="text-stone-400 font-bold text-xs ml-1">€</span>
                      </div>
                      <span className="text-stone-600 font-bold text-xs px-0.5">–</span>
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-600 animate-pulse" />
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-600 animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-600 animate-pulse" style={{ animationDelay: '250ms' }} />
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-600 animate-pulse" style={{ animationDelay: '350ms' }} />
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-600 animate-pulse" style={{ animationDelay: '450ms' }} />
                        <span className="text-stone-400 font-bold text-xs ml-1">€</span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold whitespace-nowrap flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Prêt
                    </span>
                  </div>

                  <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-stone-500 flex-shrink-0" />
                      {inputs.city} ({inputs.surface} m²)
                    </span>
                    <span className="text-emerald-400 font-semibold flex-shrink-0">100% Gratuit</span>
                  </div>
                </div>

                {/* Lead Capture Form */}
                <form onSubmit={handleUnlockEstimation} className="space-y-3.5 pt-1">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-stone-700 flex-shrink-0" />
                      Où vous transmettre votre avis de valeur ?
                    </h3>
                    <p className="text-xs text-stone-500">
                      Gratuit, sans engagement et 100% confidentiel.
                    </p>
                  </div>

                  {contactError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <span>{contactError}</span>
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Nom & Prénom *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        id="input-prospect-name"
                        value={leadContact.name}
                        onChange={(e) => setLeadContact({ ...leadContact, name: e.target.value })}
                        placeholder="Ex: Jean Dupont"
                        required
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 text-sm font-normal text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 bg-stone-50/50"
                      />
                    </div>
                  </div>

                  {/* Phone & Email Grid */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-stone-700 uppercase tracking-wider">
                          Téléphone mobile *
                        </label>
                        <span className="text-[10px] text-stone-500 font-medium">Pour validation par SMS</span>
                      </div>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          id="input-prospect-phone"
                          value={leadContact.phone}
                          onChange={(e) => setLeadContact({ ...leadContact, phone: e.target.value })}
                          placeholder="Ex: 06 03 58 03 16"
                          required
                          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 text-sm font-normal text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 bg-stone-50/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        Adresse e-mail *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          id="input-prospect-email"
                          value={leadContact.email}
                          onChange={(e) => setLeadContact({ ...leadContact, email: e.target.value })}
                          placeholder="Ex: jean.dupont@email.com"
                          required
                          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 text-sm font-normal text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 bg-stone-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timeframe selector (Key qualification trigger) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                      Votre délai de vente envisagé
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: '< 1 mois (Urgent)', value: '< 1 mois' },
                        { label: '1 à 3 mois', value: '1-3 mois' },
                        { label: '3 à 6 mois', value: '3-6 mois' },
                        { label: 'Simple estimation', value: 'Curiosité' },
                      ].map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setLeadContact({ ...leadContact, timeframe: t.value as any })}
                          className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                            leadContact.timeframe === t.value
                              ? 'border-stone-900 bg-stone-900 text-white shadow-2xs font-semibold'
                              : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Motive selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Contexte de votre démarche
                    </label>
                    <select
                      value={leadContact.motive}
                      onChange={(e) => setLeadContact({ ...leadContact, motive: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-800 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-stone-400"
                    >
                      <option value="Agrandissement">Agrandissement / Projet familial</option>
                      <option value="Mutation pro">Mutation / Déménagement</option>
                      <option value="Succession">Succession / Héritage</option>
                      <option value="Divorce / Séparation">Séparation / Changement</option>
                      <option value="Vente investissement">Vente investissement / Arbitrage</option>
                      <option value="Autre">Autre projet de vente</option>
                    </select>
                  </div>

                  {/* Consent checkbox */}
                  <label className="flex items-start gap-2 pt-0.5 text-[11px] text-stone-500 cursor-pointer">
                    <input
                      type="checkbox"
                      id="checkbox-consent"
                      checked={leadContact.consent}
                      onChange={(e) => setLeadContact({ ...leadContact, consent: e.target.checked })}
                      required
                      className="w-3.5 h-3.5 text-stone-900 rounded border-stone-300 mt-0.5 flex-shrink-0"
                    />
                    <span className="leading-tight">
                      J'accepte que mes coordonnées servent à m'envoyer mon estimation et à être recontacté(e) à ce sujet par {AGENT.name} ({AGENT.agency}). Mes données ne sont jamais revendues et je peux me désinscrire à tout moment.
                    </span>
                  </label>

                  {/* Submit to Unlock */}
                  <button
                    type="submit"
                    id="btn-submit-lead-gate"
                    className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-black text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 group"
                  >
                    <Unlock className="w-4 h-4 text-emerald-400" />
                    <span>Déverrouiller mon estimation & Voir le prix</span>
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="text-center pt-0.5">
                    <span className="text-[10px] text-stone-400 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      Zéro spam • Données protégées RGPD • Accompagnement local
                    </span>
                  </div>
                </form>
              </div>
            ) : (
              /* ========================================================================= */
              /* UNVEILED RESULT: Price revealed + Primary Interactive Closer Bot */
              /* ========================================================================= */
              <div id="valuation-result-box" className="space-y-4 animate-in zoom-in-95 duration-300">
                {/* 1. Unlocked Price Card */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-md p-4 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      Estimation Déverrouillée
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium">Fourchette indicative</span>
                  </div>

                  <div>
                    <p className="text-[11px] text-stone-500 font-normal">Valorisation calculée pour {leadContact.name}</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
                        {result.lowPrice.toLocaleString('fr-FR')} € – {result.highPrice.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs font-medium text-stone-700 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-800 font-semibold text-[11px]">~{result.avgM2.toLocaleString('fr-FR')} €/m²</span>
                      <span className="text-stone-300">•</span>
                      <span className="text-[11px]">{result.propertyType} de {result.surface} m² à {result.city}</span>
                    </div>
                    {result.address && (
                      <div className="mt-1 text-[11px] text-stone-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400 flex-shrink-0" />
                        <span className="truncate">{result.address}</span>
                      </div>
                    )}
                    <ValuationEvidence result={result} />
                  </div>
                </div>

                {/* Quick qualification: three taps, optional, saved for the advisor */}
                <QuickQualification leadId={capturedLead?.id} low={result.lowPrice} high={result.highPrice} onSubmitted={setQuickAnswers} />

                {/* 2. PROMINENT ADVISOR CHAT INTERFACE (CÉLINE) */}
                <div className="bg-stone-900 text-white rounded-2xl border border-stone-800 shadow-xl overflow-hidden">
                  {/* Advisor Header */}
                  <div className="bg-stone-950/80 px-4 py-3 border-b border-stone-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-stone-950 text-sm shadow-md border border-stone-800">
                          IA
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-stone-950 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs sm:text-sm text-white">Assistant de Céline</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                            IA
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400">
                          Secteur {inputs.city} • En ligne
                        </p>
                      </div>
                    </div>

                    <a
                      href="tel:0603580316"
                      className="flex items-center gap-1 text-xs text-stone-300 hover:text-white bg-stone-800/80 px-2 py-1 rounded-lg border border-stone-700 transition-all"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="hidden xs:inline">06 03 58 03 16</span>
                    </a>
                  </div>

                  {/* Live Chat Thread */}
                  <div className="p-3 sm:p-4 space-y-3 max-h-80 sm:max-h-96 overflow-y-auto bg-stone-900/60">
                    {closerMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 mt-0.5">
                            IA
                          </div>
                        )}
                        <div className="space-y-2 max-w-[88%] sm:max-w-[85%]">
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-amber-500 text-stone-950 font-medium rounded-tr-xs ml-auto shadow-sm'
                                : 'bg-stone-800/90 text-stone-100 border border-stone-700/70 rounded-tl-xs shadow-inner'
                            }`}
                          >
                            <p className="whitespace-pre-line">{renderRichText(msg.content)}</p>
                          </div>

                          {msg.showBookingBtn && msg.role === 'assistant' && (
                            <button
                              type="button"
                              onClick={handleTriggerBooking}
                              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 group text-center"
                            >
                              <Calendar className="w-3.5 h-3.5 text-emerald-200 flex-shrink-0" />
                              <span className="truncate">Bloquer mon créneau d'expertise (Offert)</span>
                              <ChevronRight className="w-3.5 h-3.5 text-emerald-200 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {closerTyping && (
                      <div className="flex gap-2 sm:gap-3 justify-start items-center">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0">
                          IA
                        </div>
                        <div className="p-2.5 rounded-2xl bg-stone-800 text-stone-300 text-xs border border-stone-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={closerChatEndRef} />
                  </div>

                  {/* Quick Reaction Chips */}
                  <div className="px-3 py-2.5 bg-stone-950/60 border-t border-stone-800/80 space-y-1.5">
                    <div className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Actions rapides :
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendCloserMessage("Je souhaite bloquer une visite d'expertise gratuite cette semaine.")}
                        className="py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>Bloquer un créneau</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendCloserMessage("Pourquoi une visite sur place permet de fixer le meilleur prix ?")}
                        className="py-1.5 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-[11px] font-medium transition-all"
                      >
                        💡 Intérêt de la visite
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendCloserMessage("J'ai fait des travaux et aménagements récents, comment les valoriser ?")}
                        className="py-1.5 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-[11px] font-medium transition-all"
                      >
                        🛠️ Valoriser mes travaux
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendCloserMessage("J'ai déjà fait faire une première estimation par une autre agence.")}
                        className="py-1.5 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-[11px] font-medium transition-all"
                      >
                        ⚖️ Autre avis d'agence
                      </button>
                    </div>
                  </div>

                  {/* Input Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendCloserMessage();
                    }}
                    className="p-2.5 sm:p-3 bg-stone-950 border-t border-stone-800 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={closerInput}
                      onChange={(e) => setCloserInput(e.target.value)}
                      placeholder="Posez votre question..."
                      className="flex-1 bg-stone-900 border border-stone-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={!closerInput.trim() || closerTyping}
                      className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold transition-all flex items-center justify-center shadow-xs flex-shrink-0"
                      title="Envoyer à Céline"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                {/* 3. Direct Primary Action CTA Bar */}
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    id="btn-book-direct-appointment"
                    onClick={handleTriggerBooking}
                    className="w-full py-4 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-black text-white font-medium text-sm transition-all shadow-md flex items-center justify-between group"
                  >
                    <div className="text-left">
                      <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Étape recommandée
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        Réserver mon créneau d'expertise avec Céline
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-300 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href="tel:0603580316"
                      className="py-2.5 px-3 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-stone-600" />
                      <span>Appeler Céline (06 03 58 03 16)</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleStartQualification}
                      className="py-2.5 px-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-all text-center"
                    >
                      <span>Ouvrir l'assistant grand écran</span>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="bg-white border border-stone-200/80 rounded-xl p-8 text-center space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-700 border border-stone-200 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5 text-stone-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-stone-800">
                  Prêt à découvrir la valeur de votre bien ?
                </h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto font-normal">
                  Renseignez les caractéristiques de votre bien à gauche et cliquez sur « Générer mon rapport » pour lancer la simulation.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenChatDirect}
                className="text-xs font-medium text-stone-800 hover:text-stone-900 underline underline-offset-4"
              >
                Ou échanger directement sur votre projet d'estimation →
              </button>
            </div>
          )}

          {/* Trust badges */}
          <div className="bg-white rounded-xl border border-stone-200/80 p-5 space-y-3 shadow-2xs">
            <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
              Pourquoi notre avis de valeur est supérieur ?
            </h4>
            <div className="space-y-2.5 text-xs text-stone-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Filtrage anti-curieux :</strong> Données protégées, aucun démarchage abusif.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Analyse personnalisée :</strong> Prise en compte de vos impératifs de calendrier et des particularités du bien.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Accès direct à l'agenda :</strong> Créneau réservable en 1 clic pour un avis de valeur complet offert.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-14 pt-6 pb-16 sm:pb-0">
        <HowItWorks />
        <WhyOnSite />
        <SocialProof />
        <FaqSection />
        <FinalCta />
      </div>
      <StickyMobileCta />

      {/* Floating Closer Concierge Widget (Always Visible & Accessible) */}
      <div className="hidden sm:block fixed bottom-5 right-5 z-40">
        {!showFloatingDrawer ? (
          <button
            type="button"
            onClick={() => {
              setShowFloatingDrawer(true);
              if (closerMessages.length === 0) {
                const initialPitch = `Bonjour ! Je suis l'assistant virtuel de ${AGENT.firstName} (une intelligence artificielle).\n\nUne question sur l'estimation de votre bien à ${inputs.city} ou sur la visite gratuite ? Je vous réponds, et ${AGENT.firstName} reste joignable au ${AGENT.phone}.`;
                setCloserMessages([
                  {
                    id: `float-init-${Date.now()}`,
                    role: 'assistant',
                    content: initialPitch,
                    showBookingBtn: true,
                  },
                ]);
              }
            }}
            className="flex items-center gap-3 bg-stone-900 hover:bg-stone-800 text-white pl-2.5 pr-4 py-2 rounded-full shadow-xl border border-stone-700 transition-all hover:scale-105 group"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-stone-950 font-bold text-xs flex items-center justify-center shadow-xs">
                IA
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-stone-900 animate-pulse" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold flex items-center gap-1 text-white">
                <span>Assistant de Céline</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-amber-300 font-normal">IA</span>
              </div>
              <div className="text-[10px] text-stone-300">
                Poser une question
              </div>
            </div>
          </button>
        ) : (
          <div className="w-80 sm:w-96 bg-stone-900 border border-stone-700 text-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[500px] animate-in slide-in-from-bottom-5 duration-200">
            {/* Drawer Header */}
            <div className="p-3.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center">
                    IA
                  </div>
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-stone-950" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Assistant virtuel de Céline (IA)</span>
                  </div>
                  <div className="text-[10px] text-stone-400">
                    Secteur {inputs.city} • En ligne
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFloatingDrawer(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Messages */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs max-h-72">
              {closerMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-stone-950 font-medium'
                        : 'bg-stone-800 text-stone-100 border border-stone-700'
                    }`}
                  >
                    <p className="whitespace-pre-line">{renderRichText(msg.content)}</p>
                    {msg.showBookingBtn && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowFloatingDrawer(false);
                          handleTriggerBooking();
                        }}
                        className="mt-2 w-full py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Bloquer un créneau d'expertise</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {closerTyping && (
                <div className="p-2 text-[11px] text-stone-400 flex items-center gap-1">
                  <span>Céline écrit...</span>
                </div>
              )}
            </div>

            {/* Drawer Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCloserMessage();
              }}
              className="p-2.5 bg-stone-950 border-t border-stone-800 flex items-center gap-1.5"
            >
              <input
                type="text"
                value={closerInput}
                onChange={(e) => setCloserInput(e.target.value)}
                placeholder="Posez votre question..."
                className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <button
                type="submit"
                disabled={!closerInput.trim() || closerTyping}
                className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
