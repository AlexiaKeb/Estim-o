import { trackConversion } from '../utils/tracking';
import React, { useState, useMemo, useEffect } from 'react';
import { Lead } from '../types';
import { syncLeadToSupabase, invokeBookAppointmentEdgeFunction, fetchCalSlotsDetailed } from '../lib/supabaseService';
import { AGENT } from '../data/siteContent';
import { isValidFrPhone } from '../utils/phone';
import confetti from 'canvas-confetti';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  X, 
  Sparkles, 
  ShieldCheck,
  PhoneCall,
  Home,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface Props {
  initialLeadInfo?: Partial<Lead> | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmBooking: (lead: Lead) => void;
}

export const CalendarBookingModal: React.FC<Props> = ({
  initialLeadInfo,
  isOpen,
  onClose,
  onConfirmBooking,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingLead, setPendingLead] = useState<Lead | null>(null);
  const proceededRef = React.useRef(false);
  const proceed = (l: Lead) => {
    if (proceededRef.current) return;
    proceededRef.current = true;
    try { trackConversion('booking'); } catch { /* the measurement must never block the confirmation */ }
    onConfirmBooking(l);
  };
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsMap, setSlotsMap] = useState<Record<string, string[]>>({});
  const [slotsSource, setSlotsSource] = useState<'cal.com'>('cal.com');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Generate rolling 30 days starting from tomorrow
  const availableDates = useMemo(() => {
    const dates = [];
    const baseDate = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      
      // Skip Sundays if preferred
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0) continue;

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const value = `${yyyy}-${mm}-${dd}`;
      
      const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' });
      const monthName = d.toLocaleDateString('fr-FR', { month: 'short' });
      const formattedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

      dates.push({
        label: `${formattedDayName} ${d.getDate()} ${monthName}`,
        dayNumber: d.getDate(),
        dayName: formattedDayName,
        monthName,
        value,
      });
    }
    return dates;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0]?.value || '2026-09-01');
  const [selectedTime, setSelectedTime] = useState('');
  const [meetingType, setMeetingType] = useState<'Visite estimation à domicile' | 'Point téléphonique approfondi (15 min)'>(
    'Visite estimation à domicile'
  );
  const [formData, setFormData] = useState({
    name: initialLeadInfo?.name || '',
    phone: initialLeadInfo?.phone || '',
    email: initialLeadInfo?.email || '',
    address: initialLeadInfo?.address || initialLeadInfo?.city || '',
    notes: 'Souhaite une analyse comparative de marché et vérifier les atouts du bien avant mise en vente.',
  });

  // Load real slots strictly from Cal.com v2 API on modal open
  useEffect(() => {
    if (isOpen) {
      setIsLoadingSlots(true);
      setBookingError(null);
      setSlotsError(null);
      setSlotsMap({});
      setSelectedTime('');

      fetchCalSlotsDetailed({
        start: new Date().toISOString(),
        end: new Date(Date.now() + 30 * 86400000).toISOString(),
      })
        .then((result) => {
          setIsLoadingSlots(false);
          if (result.success) {
            const rawSlots = result.slots || {};
            setSlotsMap(rawSlots);
            setSlotsSource(result.source);

            // Find first available day that actually has slots
            const pref = initialLeadInfo?.preferredSlot;
            const firstDateWithSlots =
              pref && rawSlots[pref.date]?.includes(pref.time)
                ? pref.date
                : Object.keys(rawSlots).find((k) => (rawSlots[k]?.length || 0) > 0);
            if (firstDateWithSlots && pref && firstDateWithSlots === pref.date) {
              setSelectedDate(pref.date);
              setSelectedTime(pref.time);
              setWeekOffset(Math.max(0, Math.floor(availableDates.findIndex((d) => d.value === pref.date) / 6)));
            } else if (firstDateWithSlots) {
              setSelectedDate(firstDateWithSlots);
              if (rawSlots[firstDateWithSlots]?.length > 0) {
                setSelectedTime(rawSlots[firstDateWithSlots][0]);
              }
            } else {
              // 0 verified slots from Cal.com
              setSlotsError("La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.");
            }
          } else {
            // API failure or 404/500/timeout
            setSlotsMap({});
            setSlotsError(result.message || "La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.");
          }
        })
        .catch(() => {
          setIsLoadingSlots(false);
          setSlotsMap({});
          setSlotsError("La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.");
        });
    }
  }, [isOpen]);

  // Adjust selectedTime if the current selected date has specific slots
  useEffect(() => {
    const daySlots = slotsMap[selectedDate];
    if (daySlots && daySlots.length > 0) {
      if (!selectedTime || !daySlots.includes(selectedTime)) {
        setSelectedTime(daySlots[0]);
      }
    } else {
      setSelectedTime('');
    }
  }, [selectedDate, slotsMap]);

  // Keep formData in sync when opening modal with new lead data
  useEffect(() => {
    if (initialLeadInfo) {
      setFormData((prev) => ({
        ...prev,
        name: initialLeadInfo.name || prev.name,
        phone: initialLeadInfo.phone || prev.phone,
        email: initialLeadInfo.email || prev.email,
        address: initialLeadInfo.address || initialLeadInfo.city || prev.address,
      }));
    }
  }, [initialLeadInfo, isOpen]);

  const [isBooked, setIsBooked] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // UTC offset of Paris on the selected day (UTC+1 in winter, UTC+2 in summer)
  const parisUtcLabel = (() => {
    try {
      const part = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' })
        .formatToParts(new Date(`${selectedDate}T12:00:00Z`))
        .find((x) => x.type === 'timeZoneName')?.value || 'GMT+1';
      return part.replace('GMT', 'UTC');
    } catch {
      return 'UTC+1/+2';
    }
  })();
  const selectedSummary = selectedTime
    ? `${new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })} à ${selectedTime}`
    : '';

  if (!isOpen) return null;

  // Real slots for selected date from Cal.com
  const rawDaySlots = slotsMap[selectedDate];
  const dayAvailableSlots = rawDaySlots !== undefined ? rawDaySlots : [];

  // Count total real slots available
  const totalValidSlotsCount = Object.values(slotsMap).reduce((acc: number, curr: string[]) => acc + (curr?.length || 0), 0);

  // 6 days per view page
  const visibleDates = availableDates.slice(weekOffset * 6, weekOffset * 6 + 6);
  const maxPages = Math.ceil(availableDates.length / 6);

  // Fallback submit when Cal.com is unavailable (records lead with statut: 'qualifie', not 'rdv_pris')
  const handleFallbackCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email) return;

    setIsSubmitting(true);
    let leadId = initialLeadInfo?.id;
    try {
      const persistedLeadId = await syncLeadToSupabase({
        id: leadId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address || initialLeadInfo?.address || initialLeadInfo?.city || 'Lyon',
        propertyType: initialLeadInfo?.propertyType || 'Appartement',
        surface: initialLeadInfo?.surface || 80,
        city: initialLeadInfo?.city || 'Lyon',
        score: initialLeadInfo?.score || 85,
        status: 'WARM',
        meetingBooked: false,
      });
      if (persistedLeadId) leadId = persistedLeadId;
    } catch (err) {
      console.warn('Error syncing qualified lead:', err);
    }

    const finalLead: Lead = {
      id: leadId || `lead-${Date.now()}`,
      createdAt: initialLeadInfo?.createdAt || new Date().toISOString(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address || initialLeadInfo?.address || initialLeadInfo?.city || 'Lyon',
      propertyType: initialLeadInfo?.propertyType || 'Appartement',
      surface: initialLeadInfo?.surface || 80,
      city: initialLeadInfo?.city || 'Lyon',
      estimatedValue: initialLeadInfo?.estimatedValue || 380000,
      motive: initialLeadInfo?.motive || 'Estimation & Projet de vente',
      timeframe: initialLeadInfo?.timeframe || '1-3 mois',
      score: initialLeadInfo?.score || 85,
      status: 'WARM',
      meetingBooked: false,
      lastAction: {
        type: 'call',
        label: 'Dossier transmis pour rappel prioritaire (Statut qualifié)',
        date: 'À l\'instant',
      },
      tasks: [
        { id: `t-${Date.now()}-1`, label: 'Dossier d\'estimation qualifié', done: true, category: 'qualification' },
        { id: `t-${Date.now()}-2`, label: 'Rappeler le prospect sous 2h pour convenir du rendez-vous', done: false, category: 'rdv' },
      ],
      activities: [
        { id: `act-${Date.now()}`, type: 'chat', label: 'Lead qualifié (demande de rappel enregistrée)', date: 'À l\'instant' },
        ...(initialLeadInfo?.activities || []),
      ],
      conversationHistory: initialLeadInfo?.conversationHistory,
    };

    setIsSubmitting(false);
    setIsBooked(true);
    setPendingLead(finalLead);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email) return;
    if (!isValidFrPhone(formData.phone)) {
      setBookingError('Indiquez un numéro de téléphone français valide (ex : 06 12 34 56 78) : Céline doit pouvoir vous joindre.');
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    // 1. First sync or update Lead in Supabase
    let leadId = initialLeadInfo?.id;
    try {
      const persistedLeadId = await syncLeadToSupabase({
        id: leadId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address || initialLeadInfo?.address || initialLeadInfo?.city || 'Lyon',
        propertyType: initialLeadInfo?.propertyType || 'Appartement',
        surface: initialLeadInfo?.surface || 80,
        city: initialLeadInfo?.city || 'Lyon',
        score: initialLeadInfo?.score || 95,
        status: 'HOT',
        // Only flagged as booked by the server once Cal.com has really confirmed the slot
        meetingBooked: false,
      });

      if (persistedLeadId) {
        leadId = persistedLeadId;
      }
    } catch (err) {
      console.warn('Error pre-syncing lead to Supabase:', err);
    }

    // Format ISO string for selected date and slot
    const isoSlot = `${selectedDate}T${selectedTime}:00`;

    // 2. Invoke Supabase 'book-appointment' Edge Function (calls Cal.com v2 POST /bookings)
    let confirmedSlotTime = selectedTime;
    let confirmedSlotDate = selectedDate;
    let bookResponse: any = null;

    try {
      bookResponse = await invokeBookAppointmentEdgeFunction({
        lead_id: leadId || `lead-${Date.now()}`,
        creneau: isoSlot,
        date: selectedDate,
        time: selectedTime,
        notes: `Format : ${meetingType === 'Visite estimation à domicile' ? 'Visite sur place du bien' : 'Échange téléphonique préparatoire'}. Notes : ${formData.notes || 'Aucune note particulière'}`,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address || initialLeadInfo?.address || initialLeadInfo?.city || 'Lyon',
        property_type: initialLeadInfo?.propertyType || 'Appartement',
        surface: initialLeadInfo?.surface || 80,
        estimated_value: initialLeadInfo?.estimatedValue || 380000,
        timeframe: initialLeadInfo?.timeframe || '1-3 mois',
        motive: initialLeadInfo?.motive || 'Agrandissement',
      });

      // 3. Strict Cal.com validation: if booking failed with slot conflict, display error
      if (bookResponse && bookResponse.success === false) {
        setIsSubmitting(false);
        setBookingError(
          bookResponse?.error ||
          "Ce créneau vient d'être réservé ou est indisponible dans l'agenda du conseiller. Merci d'en choisir un autre."
        );

        // Refresh slots from Cal.com without hardcoded fallback parameters
        fetchCalSlotsDetailed({
          start: new Date().toISOString(),
          end: new Date(Date.now() + 30 * 86400000).toISOString(),
        }).then((freshResult) => {
          setSlotsMap(freshResult.slots);
          setSlotsSource(freshResult.source);
        });
        return;
      }

      if (!bookResponse || bookResponse.success !== true) {
        setIsSubmitting(false);
        setBookingError(bookResponse?.error || "La réservation n'a pas pu être confirmée. Merci de réessayer.");
        return;
      }
      // The slot was chosen in Paris time and booked as such: show exactly that, whatever the browser timezone
    } catch (bookErr: any) {
      console.warn('book-appointment invocation error:', bookErr);
      setIsSubmitting(false);
      setBookingError("La réservation n'a pas pu être confirmée. Merci de réessayer.");
      return;
    }

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignored if confetti fails
    }

    const finalLead: Lead = {
      id: bookResponse?.lead?.id || leadId || `lead-${Date.now()}`,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address || initialLeadInfo?.address || initialLeadInfo?.city || 'Lyon',
      propertyType: initialLeadInfo?.propertyType || 'Appartement',
      surface: initialLeadInfo?.surface || 80,
      city: initialLeadInfo?.city || 'Lyon',
      estimatedValue: initialLeadInfo?.estimatedValue || 380000,
      motive: initialLeadInfo?.motive || 'Agrandissement',
      timeframe: initialLeadInfo?.timeframe || '1-3 mois',
      status: 'HOT',
      score: initialLeadInfo?.score || 95,
      meetingBooked: true,
      meetingDate: confirmedSlotDate,
      meetingTime: confirmedSlotTime,
      meetingType,
      createdAt: 'À l\'instant',
      notes: formData.notes,
      lastAction: {
        type: 'booking',
        label: `Visite sur place fixée pour le ${confirmedSlotDate} à ${confirmedSlotTime}`,
        date: 'À l\'instant',
      },
      tasks: [
        { id: `t-${Date.now()}-1`, label: 'Simulation en ligne complétée', done: true, category: 'qualification' },
        { id: `t-${Date.now()}-2`, label: 'Qualification des motivations & délai', done: true, category: 'qualification' },
        { id: `t-${Date.now()}-3`, label: `Visite sur place planifiée (${confirmedSlotDate} à ${confirmedSlotTime})`, done: true, category: 'rdv' },
        { id: `t-${Date.now()}-4`, label: 'Préparer le dossier d\'estimation DVF & cadastre', done: false, dueDate: confirmedSlotDate, category: 'preparation' },
        { id: `t-${Date.now()}-5`, label: 'Réaliser la visite in situ avec le vendeur', done: false, dueDate: confirmedSlotDate, category: 'rdv' },
        { id: `t-${Date.now()}-6`, label: 'Présenter l\'avis de valeur & signer le mandat exclusif', done: false, category: 'mandat' },
      ],
      activities: [
        { id: `act-${Date.now()}`, type: 'booking', label: `Visite programmée (${confirmedSlotDate} à ${confirmedSlotTime})`, date: 'À l\'instant' },
        ...(initialLeadInfo?.activities || []),
      ],
      conversationHistory: initialLeadInfo?.conversationHistory,
    };

    setIsSubmitting(false);
    setIsBooked(true);
    // The confirmation stays on screen until the visitor chooses to continue (button or close)
    setPendingLead(finalLead);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 bg-[#0B0F1F]/70 animate-in fade-in">
      <div className="bg-white sm:rounded-3xl sm:border border-slate-200 shadow-2xl w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[94vh] overflow-y-auto relative">
        {/* Header */}
        <div className="bg-[#2B4BFF] text-white p-5 md:p-7 flex items-start justify-between sticky top-0 z-10 border-b-[3px] border-[#0B0F1F]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFD60A] text-[#0B0F1F] border-[3px] border-[#0B0F1F] text-xs font-black uppercase tracking-wider mb-2">
              <HeartHandshake className="w-3.5 h-3.5" />
              Visite sur place & avis de valeur
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white">
              Votre visite d'estimation offerte et sans engagement
            </h3>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              Céline se déplace chez vous pour analyser les atouts de votre logement et fixer le prix juste.
            </p>
          </div>

          <button
            type="button"
            onClick={() => (pendingLead ? proceed(pendingLead) : onClose())}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Advisor direct contact ribbon */}
        <div className="bg-[#FFF7E6] border-b-[3px] border-[#0B0F1F] px-6 py-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex min-w-0 items-center gap-2 text-stone-800">
            <div className="w-7 h-7 rounded-full bg-[#2B4BFF] text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
              C
            </div>
            <div className="min-w-0">
              <span className="font-bold text-stone-900">Votre conseillère de proximité : Céline LEVRAT</span>
              <span className="text-stone-500 hidden sm:inline"> • Spécialiste Région Lyonnaise & Beaujolais</span>
            </div>
          </div>
          <a
            href="tel:0603580316"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-900 font-bold hover:bg-stone-900 hover:text-white transition-all shadow-xs"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#2B4BFF]" />
            <span>06 03 58 03 16</span>
          </a>
        </div>

        {/* Content Body */}
        {isBooked ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#FFD60A] text-[#2B4BFF] flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h4 className="text-2xl font-bold text-slate-900">
                {slotsError ? 'Demande de rappel transmise !' : "Visite d'estimation enregistrée !"}
              </h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                {slotsError
                  ? 'Votre dossier d\'estimation a été transmis en priorité à Céline. Vous serez recontacté dans les plus brefs délais pour convenir ensemble du rendez-vous.'
                  : `Votre rendez-vous du ${selectedSummary} est validé. Céline viendra analyser votre bien sur place pour préparer votre avis de valeur.`}
              </p>
            </div>

            {pendingLead && (
              <button type="button" onClick={() => proceed(pendingLead)} className="mx-auto inline-flex items-center gap-2 rounded-xl bg-[#2B4BFF] hover:bg-[#0B0F1F] text-white text-sm font-bold px-5 py-3">
                Voir ma confirmation
              </button>
            )}
          </div>
        ) : isLoadingSlots ? (
          /* Real-time slot verification in progress */
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7E6] text-[#2B4BFF] flex items-center justify-center mx-auto border border-[#0B0F1F]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900">Vérification de l'agenda en temps réel...</div>
              <p className="text-xs text-slate-500">Connexion sécurisée aux disponibilités de Céline</p>
            </div>
          </div>
        ) : slotsError ? (
          /* Cal.com Unavailable / Error State - NO FAKE SLOTS EVER DISPLAYED */
          <div className="p-6 md:p-8 space-y-6">
            <div className="p-5 rounded-2xl bg-[#FFF7E6] border border-[#0B0F1F] text-[#0B0F1F] text-xs sm:text-sm space-y-3 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#2B4BFF] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#0B0F1F] text-sm">
                    Prise de rendez-vous en ligne temporairement indisponible
                  </div>
                  <p className="mt-1 text-[#0B0F1F] leading-relaxed font-medium">
                    La prise de rendez-vous est momentanément indisponible, un conseiller vous recontactera sous peu.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleFallbackCallbackSubmit} className="space-y-4">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Laissez vos coordonnées pour être recontacté en priorité :
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Nom & Prénom"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A]/20 focus:border-[#FFD60A]"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="Numéro de téléphone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A]/20 focus:border-[#FFD60A]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="Adresse email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A]/20 focus:border-[#FFD60A]"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Adresse du bien à estimer"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A]/20 focus:border-[#FFD60A]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-4">
                <a
                  href="tel:0603580316"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-800 hover:text-[#2B4BFF]"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-[#2B4BFF]" />
                  Appeler directement : 06 03 58 03 16
                </a>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-3 px-6 rounded-xl bg-[#FFD60A] hover:brightness-95 text-[#0B0F1F] border-[3px] border-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F] disabled:opacity-50 text-xs font-black transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmission en cours...</span>
                    </>
                  ) : (
                    <span>Être recontacté par Céline</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Error Notification Banner */}
            {bookingError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-900">Créneau indisponible</div>
                  <p>{bookingError}</p>
                </div>
              </div>
            )}

            {/* Single format: the event type in Cal.com is the on-site visit */}
            <div className="flex items-start gap-3 rounded-xl border border-[#0B0F1F] bg-[#FFF7E6] p-3.5 text-sm text-stone-800">
              <Home className="w-4 h-4 text-[#2B4BFF] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Visite sur place 100 % offerte</div>
                <div className="text-xs text-stone-600">Céline se déplace à l'adresse indiquée pour affiner l'estimation.</div>
              </div>
            </div>

            {/* 30-Day Date selection with pagination / week carousel */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Sélectionnez le jour de votre rendez-vous
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={weekOffset === 0}
                    onClick={() => setWeekOffset((p) => Math.max(0, p - 1))}
                    className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600"
                    title="Jours précédents"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-medium text-slate-500 px-1">
                    Semaine {weekOffset + 1}/{maxPages}
                  </span>
                  <button
                    type="button"
                    disabled={weekOffset >= maxPages - 1}
                    onClick={() => setWeekOffset((p) => Math.min(maxPages - 1, p + 1))}
                    className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600"
                    title="Jours suivants"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {visibleDates.map((d) => {
                  const slotsCount = slotsMap[d.value]?.length || 0;
                  const isSelected = selectedDate === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setSelectedDate(d.value)}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? 'border-[#0B0F1F] bg-[#2B4BFF] text-white shadow-xs'
                          : slotsCount > 0
                          ? 'border-slate-200 bg-white text-slate-800 hover:border-[#0B0F1F] hover:bg-[#FFF7E6]/50'
                          : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 opacity-75'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">
                        {d.dayName}
                      </span>
                      <span className="text-base font-black my-0.5">
                        {d.dayNumber}
                      </span>
                      <span className="text-[10px] font-medium opacity-85">
                        {d.monthName}
                      </span>
                      {!isLoadingSlots && (
                        <span
                          className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-stone-800 text-white'
                              : slotsCount > 0
                              ? 'bg-[#FFF7E6] text-[#2B4BFF] border border-[#0B0F1F]/80'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {slotsCount > 0 ? `${slotsCount} dispo` : 'Complet'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot selection */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Choisissez un horaire de passage (heure de Paris)
                </label>
                {isLoadingSlots ? (
                  <span className="text-[11px] text-[#2B4BFF] flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Mise à jour des disponibilités...
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">
                    Fuseau : Europe/Paris ({parisUtcLabel})
                  </span>
                )}
              </div>

              {dayAvailableSlots.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#FFF7E6] border border-[#0B0F1F] text-[#0B0F1F] text-xs">
                  Aucun créneau disponible à cette date dans l'agenda. Veuillez sélectionner un autre jour ci-dessus.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dayAvailableSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        setSelectedTime(time);
                        setBookingError(null);
                      }}
                      className={`py-2 px-4 rounded-xl border text-xs font-semibold transition-all ${
                        selectedTime === time
                          ? 'border-stone-900 bg-[#FFF7E6] text-[#0B0F1F] font-bold ring-2 ring-[#2B4BFF]/30'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 inline-block mr-1.5" />
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Contact details */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Vos coordonnées pour valider le rendez-vous
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Nom & Prénom"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4BFF]/30 focus:border-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="Numéro de téléphone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4BFF]/30 focus:border-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="Adresse email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4BFF]/30 focus:border-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Adresse du bien (rue, code postal, ville)"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4BFF]/30 focus:border-stone-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-[#2B4BFF]" />
                🔒 Rendez-vous offert, confidentiel et sans engagement
              </div>

              <button
                type="submit"
                id="btn-confirm-calendar-booking"
                disabled={isSubmitting || !selectedTime}
                className="py-3.5 px-6 rounded-xl bg-[#2B4BFF] hover:bg-[#0B0F1F] disabled:bg-stone-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enregistrement en cours...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>{selectedSummary ? `Valider mon rendez-vous : ${selectedSummary}` : 'Choisissez un horaire'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
