import React, { useState, useEffect } from 'react';
import { Lead, ScheduledMessage } from '../types';
import { generateDefaultSequenceForLead } from '../utils/sequenceHelper';
import { 
  MailCheck, 
  Sparkles, 
  Clock, 
  Send, 
  Copy, 
  Check, 
  Smartphone, 
  Zap,
  RefreshCw,
  Calendar,
  User,
  Plus,
  Trash2,
  PauseCircle,
  PlayCircle,
  Edit3,
  CheckCircle2,
  Search,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Radio,
  FileText,
  Mail,
  History,
  Settings2
} from 'lucide-react';

interface DispatchLog {
  id: string;
  leadId: string;
  leadName: string;
  recipient: string;
  channel: 'SMS' | 'Email' | 'WhatsApp';
  subject: string;
  message: string;
  sentAt: string;
  deliveryStatus: 'Délivré' | 'Envoyé (En attente confirmation)' | 'Remis au réseau';
  operatorId: string;
}

interface Props {
  leads: Lead[];
  selectedLeadId?: string;
  onUpdateLead: (updatedLead: Lead) => void;
  onShowToast?: (message: string) => void;
}

export const NurtureEngineView: React.FC<Props> = ({
  leads,
  selectedLeadId,
  onUpdateLead,
  onShowToast,
}) => {
  // Navigation tabs inside Nurture module
  const [activeTab, setActiveTab] = useState<'prospect' | 'agenda' | 'logs' | 'settings'>('prospect');

  // Currently selected lead
  const [currentLeadId, setCurrentLeadId] = useState<string>(() => {
    if (selectedLeadId && leads.some((l) => l.id === selectedLeadId)) {
      return selectedLeadId;
    }
    return leads[0]?.id || '';
  });

  // Sync if prop changes
  useEffect(() => {
    if (selectedLeadId && leads.some((l) => l.id === selectedLeadId)) {
      setCurrentLeadId(selectedLeadId);
      setActiveTab('prospect');
    }
  }, [selectedLeadId, leads]);

  const currentLead = leads.find((l) => l.id === currentLeadId) || leads[0];

  // Get or initialize sequence for the current lead
  const currentSequence: ScheduledMessage[] = currentLead
    ? currentLead.customSequence && currentLead.customSequence.length > 0
      ? currentLead.customSequence
      : generateDefaultSequenceForLead(currentLead)
    : [];

  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [generatingWithAi, setGeneratingWithAi] = useState<boolean>(false);
  const [sendingDirectly, setSendingDirectly] = useState<boolean>(false);
  
  // Search & Filter in agenda
  const [agendaSearch, setAgendaSearch] = useState<string>('');
  const [agendaChannelFilter, setAgendaChannelFilter] = useState<'ALL' | 'SMS' | 'Email' | 'WhatsApp'>('ALL');

  // Working state for active message edit form
  const activeMessage: ScheduledMessage | undefined = currentSequence[selectedStepIndex] || currentSequence[0];

  const [editSubject, setEditSubject] = useState<string>(activeMessage?.subject || '');
  const [editMessage, setEditMessage] = useState<string>(activeMessage?.message || '');
  const [editChannel, setEditChannel] = useState<'SMS' | 'Email' | 'WhatsApp'>(activeMessage?.channel || 'SMS');
  const [editDate, setEditDate] = useState<string>(activeMessage?.scheduledDate || '');
  const [editTime, setEditTime] = useState<string>(activeMessage?.scheduledTime || '09:30');
  const [editGoal, setEditGoal] = useState<string>(activeMessage?.goal || '');

  // Sender settings (Local Storage persistence)
  const [senderAgencyName, setSenderAgencyName] = useState<string>(() => {
    return localStorage.getItem('agent_agency_name') || 'Conseil Immobilier & Estimation';
  });
  const [senderEmail, setSenderEmail] = useState<string>(() => {
    return localStorage.getItem('agent_sender_email') || 'contact@agence-immobiliere.fr';
  });
  const [senderPhone, setSenderPhone] = useState<string>(() => {
    return localStorage.getItem('agent_sender_phone') || '06 00 00 00 00';
  });
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState<boolean>(true);

  // Live Dispatch Logs from server
  const [liveLogs, setLiveLogs] = useState<DispatchLog[]>([]);
  const [logsSearch, setLogsSearch] = useState<string>('');

  // Fetch dispatch logs on mount and when tab changes
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/dispatch-logs');
      const data = await res.json();
      if (data && data.logs) {
        setLiveLogs(data.logs);
      }
    } catch (e) {
      console.warn('Could not fetch dispatch logs:', e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeTab]);

  // Update edit form when active message or lead changes
  useEffect(() => {
    if (activeMessage) {
      setEditSubject(activeMessage.subject);
      setEditMessage(activeMessage.message);
      setEditChannel(activeMessage.channel);
      setEditDate(activeMessage.scheduledDate);
      setEditTime(activeMessage.scheduledTime);
      setEditGoal(activeMessage.goal);
    }
  }, [selectedStepIndex, currentLeadId, activeMessage]);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Save settings
  const handleSaveSettings = () => {
    localStorage.setItem('agent_agency_name', senderAgencyName);
    localStorage.setItem('agent_sender_email', senderEmail);
    localStorage.setItem('agent_sender_phone', senderPhone);
    onShowToast?.('Paramètres d\'envoi direct enregistrés avec succès !');
  };

  // Helper to save current sequence back to the lead in CRM
  const saveSequenceToLead = (newSequence: ScheduledMessage[]) => {
    if (!currentLead) return;
    const updatedLead: Lead = {
      ...currentLead,
      customSequence: newSequence,
    };
    onUpdateLead(updatedLead);
  };

  // Save current active message changes
  const handleSaveActiveMessage = () => {
    if (!activeMessage || !currentLead) return;
    const updated = currentSequence.map((item, idx) => {
      if (idx === selectedStepIndex) {
        return {
          ...item,
          subject: editSubject,
          message: editMessage,
          channel: editChannel,
          scheduledDate: editDate,
          scheduledTime: editTime,
          goal: editGoal,
        };
      }
      return item;
    });

    saveSequenceToLead(updated);
    onShowToast?.(`Message mis à jour pour ${currentLead.name} !`);
  };

  // Direct In-Dashboard Send Function (Connects directly to /api/send-message)
  const handleDirectSend = async (idx: number) => {
    if (!currentLead) return;
    const msgToSend = currentSequence[idx] || activeMessage;
    if (!msgToSend) return;

    setSendingDirectly(true);

    const recipient =
      msgToSend.channel === 'Email'
        ? currentLead.email || 'vendeur@contact.fr'
        : currentLead.phone || '06 00 00 00 00';

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentLead.id,
          leadName: currentLead.name,
          recipient,
          channel: msgToSend.channel,
          subject: editSubject || msgToSend.subject,
          message: editMessage || msgToSend.message,
        }),
      });

      const data = await res.json();

      const now = new Date();
      const formattedDate = now.toLocaleDateString('fr-FR');
      const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      // Update lead state to mark message as sent
      const updated = currentSequence.map((item, i) => {
        if (i === idx) {
          return {
            ...item,
            status: 'sent' as const,
            sentAt: `Envoyé le ${formattedDate} à ${formattedTime}`,
          };
        }
        return item;
      });

      saveSequenceToLead(updated);
      await fetchLogs();

      onShowToast?.(`✅ ${msgToSend.channel} envoyé directement avec succès à ${currentLead.name} (${recipient}) !`);
    } catch (err) {
      console.error('Direct send error:', err);
      onShowToast?.(`Erreur lors de l'envoi direct.`);
    } finally {
      setSendingDirectly(false);
    }
  };

  // Toggle Pause / Resume for single message
  const handleToggleMessageStatus = (idx: number) => {
    if (!currentLead) return;
    const updated = currentSequence.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          status: (item.status === 'paused' ? 'scheduled' : 'paused') as 'scheduled' | 'paused',
        };
      }
      return item;
    });
    saveSequenceToLead(updated);
    const newStatus = updated[idx].status === 'paused' ? 'mis en pause' : 'réactivé';
    onShowToast?.(`Message ${newStatus} pour ${currentLead.name}.`);
  };

  // Add a new custom message step to this lead
  const handleAddNewMessage = () => {
    if (!currentLead) return;
    const nextIdx = currentSequence.length + 1;
    const today = new Date();
    today.setDate(today.getDate() + (nextIdx * 10));
    const nextDate = today.toISOString().split('T')[0];

    const firstName = currentLead.name.split(' ')[0] || 'Bonjour';

    const newItem: ScheduledMessage = {
      id: `${currentLead.id}-step-${Date.now()}`,
      step: `Message ${nextIdx} (J+${nextIdx * 10})`,
      channel: 'SMS',
      delay: `${nextIdx * 10} jours après`,
      scheduledDate: nextDate,
      scheduledTime: '10:00',
      subject: `Suivi personnalisé pour votre ${currentLead.propertyType.toLowerCase()}`,
      message: `Bonjour ${firstName}, je me permets de prendre de vos nouvelles concernant votre projet à ${currentLead.city}. Avez-vous pu avancer sur votre réflexion ? Restant à votre entière écoute !`,
      goal: 'Reprendre contact et proposer un point téléphonique sans engagement.',
      status: 'scheduled',
    };

    const updated = [...currentSequence, newItem];
    saveSequenceToLead(updated);
    setSelectedStepIndex(updated.length - 1);
    onShowToast?.(`Nouveau message ajouté pour ${currentLead.name}.`);
  };

  // Delete message step
  const handleDeleteMessage = (idx: number) => {
    if (!currentLead || currentSequence.length <= 1) {
      onShowToast?.('Une séquence doit contenir au moins 1 message.');
      return;
    }
    const updated = currentSequence.filter((_, i) => i !== idx);
    saveSequenceToLead(updated);
    setSelectedStepIndex(Math.max(0, idx - 1));
    onShowToast?.('Message supprimé.');
  };

  // Insert dynamic variable tag into message
  const handleInsertTag = (tag: string) => {
    setEditMessage((prev) => prev + tag);
  };

  // Preset date quick selector (+1j, +3j, +7j, +15j, +30j)
  const handleQuickAddDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setEditDate(d.toISOString().split('T')[0]);
  };

  // AI-powered tailor sequence using Claude API
  const handleGenerateAiSequenceForLead = async () => {
    if (!currentLead) return;
    setGeneratingWithAi(true);

    try {
      const res = await fetch('/api/generate-nurture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadProfile: {
            name: currentLead.name,
            propertyType: currentLead.propertyType,
            surface: currentLead.surface,
            city: currentLead.city,
            estimatedValue: currentLead.estimatedValue,
            motive: currentLead.motive,
            timeframe: currentLead.timeframe,
            notes: currentLead.notes,
            status: currentLead.status,
          },
        }),
      });

      const data = await res.json();
      if (data.sequence && Array.isArray(data.sequence) && data.sequence.length > 0) {
        const today = new Date();
        const mapped: ScheduledMessage[] = data.sequence.map((item: any, i: number) => {
          const sendDate = new Date(today);
          const daysOffset = i === 0 ? 1 : i === 1 ? 5 : i === 2 ? 14 : i === 3 ? 30 : 60;
          sendDate.setDate(sendDate.getDate() + daysOffset);

          return {
            id: `${currentLead.id}-ai-step-${i + 1}`,
            step: item.step || `Message ${i + 1}`,
            channel: (item.channel === 'Email' ? 'Email' : item.channel === 'WhatsApp' ? 'WhatsApp' : 'SMS') as 'SMS' | 'Email' | 'WhatsApp',
            delay: `J+${daysOffset}`,
            scheduledDate: sendDate.toISOString().split('T')[0],
            scheduledTime: i % 2 === 0 ? '09:30' : '14:00',
            subject: item.subject || `Conseil personnalisé pour votre ${currentLead.propertyType.toLowerCase()}`,
            message: item.message || '',
            goal: item.goal || `Consolider la relation avec ${currentLead.name} et finaliser l'avis de valeur expert au juste prix.`,
            status: 'scheduled',
          };
        });

        saveSequenceToLead(mapped);
        setSelectedStepIndex(0);
        onShowToast?.(`✨ Séquence 100% personnalisée par IA pour ${currentLead.name} !`);
      }
    } catch (err) {
      console.error('Nurture generation error:', err);
      onShowToast?.('Génération par IA indisponible, séquence standard conservée.');
    } finally {
      setGeneratingWithAi(false);
    }
  };

  // Compile all scheduled messages across ALL leads for the global agenda
  const allScheduledMessages: Array<{
    lead: Lead;
    message: ScheduledMessage;
    msgIndex: number;
  }> = [];

  leads.forEach((l) => {
    const seq = l.customSequence && l.customSequence.length > 0 ? l.customSequence : generateDefaultSequenceForLead(l);
    seq.forEach((msg, idx) => {
      allScheduledMessages.push({
        lead: l,
        message: msg,
        msgIndex: idx,
      });
    });
  });

  // Sort chronologically
  allScheduledMessages.sort((a, b) => {
    const dateA = new Date(`${a.message.scheduledDate}T${a.message.scheduledTime || '00:00'}`).getTime();
    const dateB = new Date(`${b.message.scheduledDate}T${b.message.scheduledTime || '00:00'}`).getTime();
    return dateA - dateB;
  });

  const filteredAgenda = allScheduledMessages.filter((item) => {
    const matchesSearch =
      item.lead.name.toLowerCase().includes(agendaSearch.toLowerCase()) ||
      item.lead.city.toLowerCase().includes(agendaSearch.toLowerCase()) ||
      item.message.subject.toLowerCase().includes(agendaSearch.toLowerCase());
    const matchesChannel = agendaChannelFilter === 'ALL' || item.message.channel === agendaChannelFilter;
    return matchesSearch && matchesChannel;
  });

  // Create Native 1-Click URLs
  const getMailtoUrl = () => {
    const email = currentLead?.email || '';
    const subject = encodeURIComponent(editSubject);
    const body = encodeURIComponent(editMessage);
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const getSmsUrl = () => {
    const phone = (currentLead?.phone || '').replace(/\s+/g, '');
    const body = encodeURIComponent(editMessage);
    return `sms:${phone}?body=${body}`;
  };

  const getWhatsAppUrl = () => {
    let cleanPhone = (currentLead?.phone || '').replace(/[\s\.\-\(\)]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '33' + cleanPhone.substring(1);
    }
    const text = encodeURIComponent(editMessage);
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div id="nurture-engine-container" className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in">
      {/* Top Main Banner with Status & Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold uppercase tracking-wider">
              <MailCheck className="w-3.5 h-3.5 text-blue-600" />
              Centre d'Envoi Direct Intégré
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Envoi Autonome Actif</span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            Envoi & Relances Directs depuis le Tableau de Bord
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Vos e-mails et SMS partent directement depuis votre tableau de bord sans nécessiter d'abonnement ou d'outil externe.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('prospect')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeTab === 'prospect'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Par Prospect</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeTab === 'agenda'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Planning ({allScheduledMessages.filter(m => m.message.status === 'scheduled').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeTab === 'logs'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historique des Envois ({liveLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeTab === 'settings'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Expéditeur</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: PROSPECT-SPECIFIC PERSONALIZATION & DIRECT SENDER                 */}
      {/* ========================================================================= */}
      {activeTab === 'prospect' && (
        <div className="space-y-6">
          {/* Prospect Selector & Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Sélectionner le prospect vendeur :</span>
              </label>

              {/* Prospect Quick Dropdown */}
              <div className="relative flex-1 max-w-md">
                <select
                  value={currentLeadId}
                  onChange={(e) => {
                    setCurrentLeadId(e.target.value);
                    setSelectedStepIndex(0);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.propertyType} {l.surface}m² à {l.city} ({l.estimatedValue.toLocaleString('fr-FR')} €)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Lead Details Summary Strip */}
            {currentLead && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-bold text-slate-900 text-sm">{currentLead.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold text-[11px]">
                    {currentLead.propertyType} • {currentLead.surface} m²
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-semibold text-[11px]">
                    📍 {currentLead.city}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    💰 {currentLead.estimatedValue.toLocaleString('fr-FR')} €
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-[11px]">
                    Motif : {currentLead.motive}
                  </span>
                  <span className="text-slate-600 font-mono text-[11px] flex items-center gap-1">
                    📞 {currentLead.phone || 'Non renseigné'}
                  </span>
                  <span className="text-slate-600 font-mono text-[11px] flex items-center gap-1">
                    ✉️ {currentLead.email || 'Non renseigné'}
                  </span>
                </div>

                {/* AI Regenerate Sequence Button */}
                <button
                  type="button"
                  onClick={handleGenerateAiSequenceForLead}
                  disabled={generatingWithAi}
                  className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Générer 5 messages 100% sur-mesure pour ce vendeur avec Claude"
                >
                  {generatingWithAi ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                  )}
                  <span>Réécrire avec l'Assistant IA</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Grid: Steps List on the Left, Rich Direct Dispatcher on the Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Steps Timeline */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Messages Programmés ({currentSequence.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">Pour {currentLead?.name}</p>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewMessage}
                  className="py-1 px-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>

              <div className="space-y-2">
                {currentSequence.map((item, idx) => {
                  const isSelected = selectedStepIndex === idx;
                  const isSent = item.status === 'sent';
                  const isPaused = item.status === 'paused';

                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => setSelectedStepIndex(idx)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/20'
                          : isPaused
                          ? 'border-slate-200 bg-slate-100/50 opacity-60'
                          : isSent
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : isSent
                              ? 'bg-emerald-600 text-white'
                              : isPaused
                              ? 'bg-slate-400 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isSent ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>

                        <div className="truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-bold text-slate-900 truncate">{item.subject}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : item.delay}
                              {item.scheduledTime ? ` à ${item.scheduledTime}` : ''}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">{item.channel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.channel === 'SMS'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.channel === 'WhatsApp'
                              ? 'bg-teal-100 text-teal-800 border border-teal-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {item.channel}
                        </span>

                        {isSent && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black">
                            ENVOYÉ
                          </span>
                        )}
                        {isPaused && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black">
                            PAUSE
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Direct Sender & Editor */}
            {activeMessage && (
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                {/* Header with Direct Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                        {activeMessage.step}
                      </span>
                      {activeMessage.status === 'sent' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {activeMessage.sentAt || 'Message envoyé'}
                        </span>
                      ) : activeMessage.status === 'paused' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1">
                          <PauseCircle className="w-3 h-3 text-amber-600" />
                          Envoi suspendu
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600" />
                          Envoi programmé au {editDate ? new Date(editDate).toLocaleDateString('fr-FR') : 'J+'} à {editTime}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{editSubject || activeMessage.subject}</h3>
                  </div>

                  {/* Actions (Pause / Delete) */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleMessageStatus(selectedStepIndex)}
                      className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                        activeMessage.status === 'paused'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                      title={activeMessage.status === 'paused' ? 'Réactiver cet envoi' : 'Mettre en pause cet envoi'}
                    >
                      {activeMessage.status === 'paused' ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Réactiver</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(selectedStepIndex)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                      title="Supprimer ce message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Scheduling Parameters Bar (Channel, Date, Hour) */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Paramètres de distribution pour ce message :
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Canal selector */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Canal d'envoi</label>
                      <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-slate-200">
                        {(['SMS', 'Email', 'WhatsApp'] as const).map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => setEditChannel(ch)}
                            className={`py-1 text-[11px] font-bold rounded transition-colors text-center ${
                              editChannel === ch
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scheduled Date */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Date d'envoi</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Scheduled Time */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Heure d'envoi</label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons for Date */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-slate-400">Raccourcis délai :</span>
                    {[
                      { label: '+1 jour', days: 1 },
                      { label: '+3 jours', days: 3 },
                      { label: '+7 jours', days: 7 },
                      { label: '+15 jours', days: 15 },
                      { label: '+30 jours', days: 30 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleQuickAddDays(preset.days)}
                        className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-[10px] font-bold text-slate-600 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject and Message Editor */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {editChannel === 'Email' ? "Objet de l'e-mail :" : "Titre de référence :"}
                    </label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      placeholder="Ex: Estimation de votre bien..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Corps du message :</label>
                      {editChannel === 'SMS' && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {editMessage.length} car. ({Math.ceil(editMessage.length / 160) || 1} SMS)
                        </span>
                      )}
                    </div>

                    <textarea
                      rows={6}
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      placeholder="Rédigez votre message personnalisé..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans whitespace-pre-wrap"
                    />

                    {/* Quick Insert Dynamic Variables */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-semibold text-slate-400">Insérer :</span>
                      {[
                        { label: '{Prénom}', tag: `{Prénom}` },
                        { label: '{Ville}', tag: `{Ville}` },
                        { label: '{TypeBien}', tag: `{TypeBien}` },
                        { label: '{PrixEstime}', tag: `{PrixEstime}` },
                        { label: '{Motif}', tag: `{Motif}` },
                      ].map((t) => (
                        <button
                          key={t.tag}
                          type="button"
                          onClick={() => handleInsertTag(t.tag)}
                          className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[10px] font-bold text-blue-700 transition-colors"
                        >
                          + {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Direct Action Hub (Send from Dashboard / 1-Click Launchers) */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Envoi Direct Intégré
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Destinataire : {editChannel === 'Email' ? (currentLead.email || 'Email non fourni') : (currentLead.phone || 'Tél non fourni')}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* PRIMARY ACTION: DIRECT IN-DASHBOARD SEND */}
                    <button
                      type="button"
                      onClick={() => handleDirectSend(selectedStepIndex)}
                      disabled={sendingDirectly}
                      className="w-full sm:flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {sendingDirectly ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Transmission en cours...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-blue-200" />
                          <span>Envoyer directement depuis le Dashboard ({editChannel})</span>
                        </>
                      )}
                    </button>

                    {/* SECONDARY 1-CLICK NATIVE LAUNCHER (Opens user's default app) */}
                    {editChannel === 'Email' && (
                      <a
                        href={getMailtoUrl()}
                        className="w-full sm:w-auto py-3 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                        title="Ouvrir dans votre messagerie (Gmail, Outlook, Mail)"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ouvrir dans ma boîte mail</span>
                      </a>
                    )}

                    {editChannel === 'SMS' && (
                      <a
                        href={getSmsUrl()}
                        className="w-full sm:w-auto py-3 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                        title="Ouvrir l'application SMS de votre téléphone ou ordinateur"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Ouvrir dans l'app SMS</span>
                      </a>
                    )}

                    {editChannel === 'WhatsApp' && (
                      <a
                        href={getWhatsAppUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto py-3 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                        title="Ouvrir directement WhatsApp avec le message pré-rempli"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ouvrir WhatsApp</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={handleSaveActiveMessage}
                      className="text-slate-300 hover:text-white font-bold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Enregistrer les modifications pour plus tard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(editMessage, selectedStepIndex)}
                      className="text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      {copiedIndex === selectedStepIndex ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier le texte</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: GLOBAL DISPATCH AGENDA (ACROSS ALL PROSPECTS)                     */}
      {/* ========================================================================= */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {/* Filter and search bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom de prospect, ville ou mot-clé..."
                value={agendaSearch}
                onChange={(e) => setAgendaSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto justify-center">
              {(['ALL', 'SMS', 'Email', 'WhatsApp'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setAgendaChannelFilter(ch)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    agendaChannelFilter === ch
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ch === 'ALL' ? 'Tous les canaux' : ch}
                </button>
              ))}
            </div>
          </div>

          {/* Chronological Table of Scheduled Dispatches */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Planning Chronologique des Relances
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {filteredAgenda.length} envois au planning
              </span>
            </div>

            {filteredAgenda.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun message programmé ne correspond à votre filtre.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredAgenda.map((item, i) => {
                  const isSent = item.message.status === 'sent';
                  const isPaused = item.message.status === 'paused';

                  return (
                    <div
                      key={`${item.lead.id}-${item.message.id}-${i}`}
                      className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      {/* Left: Date & Prospect Info */}
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-14 shrink-0 text-center p-2 rounded-xl bg-slate-100 border border-slate-200">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">
                            {item.message.scheduledDate
                              ? new Date(item.message.scheduledDate).toLocaleDateString('fr-FR', { month: 'short' })
                              : 'J+'}
                          </div>
                          <div className="text-sm font-black text-slate-900">
                            {item.message.scheduledDate
                              ? new Date(item.message.scheduledDate).getDate()
                              : item.message.delay}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{item.lead.name}</span>
                            <span className="text-[11px] text-slate-500">({item.lead.propertyType} • {item.lead.city})</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.message.channel === 'SMS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.message.channel === 'WhatsApp'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.message.channel}
                            </span>
                          </div>

                          <div className="text-slate-700 font-medium text-xs mt-0.5">
                            {item.message.subject}
                          </div>

                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {item.message.message}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status and Quick Direct Button */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isSent ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Envoyé
                          </span>
                        ) : isPaused ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold flex items-center gap-1">
                            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                            En pause
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            {item.message.scheduledTime || '09:30'}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentLeadId(item.lead.id);
                            setSelectedStepIndex(item.msgIndex);
                            setActiveTab('prospect');
                          }}
                          className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Gérer & Envoyer</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: LIVE DISPATCH LOGS (HISTORIQUE DES ENVOIS DIRECTS)                */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer l'historique par destinataire, nom ou sujet..."
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={fetchLogs}
              className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser les accusés</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Accusés de Réception & Historique des Transmissions
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {liveLogs.length} messages envoyés
              </span>
            </div>

            {liveLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun message envoyé pour le moment. Utilisez le bouton "Envoyer directement" sur un prospect pour tester l'envoi.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {liveLogs
                  .filter(
                    (l) =>
                      l.leadName.toLowerCase().includes(logsSearch.toLowerCase()) ||
                      l.recipient.toLowerCase().includes(logsSearch.toLowerCase()) ||
                      l.subject.toLowerCase().includes(logsSearch.toLowerCase())
                  )
                  .map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50/80 transition-colors space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.channel === 'SMS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.channel === 'WhatsApp'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {log.channel}
                          </span>

                          <span className="font-bold text-slate-900">{log.leadName}</span>
                          <span className="text-slate-500 font-mono text-[11px]">({log.recipient})</span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span className="font-mono text-slate-500">{log.operatorId}</span>
                          <span>•</span>
                          <span>{new Date(log.sentAt).toLocaleString('fr-FR')}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {log.deliveryStatus}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                        <div className="font-bold text-slate-900 mb-1">{log.subject}</div>
                        {log.message}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: SENDER PROFILE & DIRECT DISPATCH SETTINGS                         */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Configuration de l'Expéditeur Direct
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ces coordonnées s'affichent comme signature et en-tête de vos e-mails et SMS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Nom commercial / Nom du conseiller ou de l'agence :
              </label>
              <input
                type="text"
                value={senderAgencyName}
                onChange={(e) => setSenderAgencyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Adresse e-mail d'expédition et de réponse :
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Numéro de téléphone professionnel (SMS & WhatsApp) :
              </label>
              <input
                type="tel"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl">
              <div>
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Moteur d'envoi autonome
                </div>
                <div className="text-[11px] text-emerald-800 mt-0.5">
                  Les messages programmés sont délivrés automatiquement selon le calendrier.
                </div>
              </div>

              <input
                type="checkbox"
                checked={autoDispatchEnabled}
                onChange={(e) => setAutoDispatchEnabled(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleSaveSettings}
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Enregistrer mes préférences d'expéditeur
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
