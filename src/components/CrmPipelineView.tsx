import { PreVisitBrief } from './PreVisitBrief';
import React, { useState } from 'react';
import { Lead, LeadTask, LeadActivity, MandateDetails, MandateType, MandateStatus } from '../types';
import { 
  Flame, 
  Clock, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Home, 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  ChevronRight, 
  UserCheck, 
  MessageSquare,
  Sparkles,
  TrendingUp,
  FileText,
  Copy,
  Check,
  Download,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Plus,
  ExternalLink,
  PhoneCall,
  ListTodo,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Tag,
  Award,
  ScrollText,
  BadgePercent
} from 'lucide-react';

interface Props {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onOpenBookingModal: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: 'HOT' | 'WARM' | 'COLD') => void;
  onUpdateLead?: (updatedLead: Lead) => void;
  onNavigateToNurture?: (leadId: string) => void;
}

export const CrmPipelineView: React.FC<Props> = ({
  leads,
  onSelectLead,
  onOpenBookingModal,
  onUpdateLeadStatus,
  onUpdateLead,
  onNavigateToNurture,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HOT' | 'WARM' | 'COLD'>('ALL');
  const [mandateFilter, setMandateFilter] = useState<'ALL' | 'EXCLUSIVE' | 'SIMPLE' | 'NEGOTIATION' | 'NONE'>('ALL');
  const [activeTab, setActiveTab] = useState<'leads' | 'action_plan'>('leads');
  const [selectedLeadDrawer, setSelectedLeadDrawer] = useState<Lead | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [customNoteInput, setCustomNoteInput] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingMandate, setIsEditingMandate] = useState(false);

  // Helper copy function with temporary notification
  const handleCopyValue = (fieldKey: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Build a complete formatted card for external CRM or WhatsApp
  const handleCopyFullLeadCard = (lead: Lead) => {
    const mandateStr = lead.mandate?.status === 'signed'
      ? `MANDAT ${lead.mandate.type === 'exclusive' ? 'EXCLUSIF' : 'SIMPLE'} SIGNÉ (N° ${lead.mandate.mandateNumber || 'En cours'}, ${lead.mandate.sellingPrice?.toLocaleString('fr-FR')} €, honoraires ${lead.mandate.feeRatePercent || 4.5}%)`
      : lead.mandate?.type === 'in_negotiation'
      ? `Mandat en cours de négociation (${lead.mandate.type})`
      : 'Aucun mandat signé pour le moment';

    const text = `📋 FICHE PROSPECT - AGENT ESTIMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 NOM : ${lead.name}
📞 TÉL : ${lead.phone}
✉️ EMAIL : ${lead.email}
📍 ADRESSE : ${lead.address || lead.city}
🏡 BIEN : ${lead.propertyType} • ${lead.surface} m² à ${lead.city}
💰 ESTIMATION : ${lead.estimatedValue.toLocaleString('fr-FR')} €
📜 MANDAT : ${mandateStr}
🎯 MOTIF : ${lead.motive}
⏱️ DÉLAI : ${lead.timeframe}
🔥 STATUT : ${lead.status} (Score : ${lead.score}/100)
📅 VISITE : ${lead.meetingBooked ? `Rendez-vous fixé le ${lead.meetingDate} à ${lead.meetingTime} (${lead.meetingType || 'Visite sur place'})` : 'En séquence d\'accompagnement'}
⚡ DERNIÈRE ACTION : ${lead.lastAction ? `${lead.lastAction.label} (${lead.lastAction.date})` : 'Simulation validée'}
📝 SYNTHÈSE : ${lead.notes || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    handleCopyValue(`full-${lead.id}`, text);
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.address && l.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.motive.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.mandate?.mandateNumber && l.mandate.mandateNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;

    let matchesMandate = true;
    if (mandateFilter === 'EXCLUSIVE') {
      matchesMandate = l.mandate?.type === 'exclusive' && l.mandate?.status === 'signed';
    } else if (mandateFilter === 'SIMPLE') {
      matchesMandate = l.mandate?.type === 'simple' && l.mandate?.status === 'signed';
    } else if (mandateFilter === 'NEGOTIATION') {
      matchesMandate = l.mandate?.type === 'in_negotiation' || l.mandate?.status === 'pending_signature' || l.mandate?.status === 'draft';
    } else if (mandateFilter === 'NONE') {
      matchesMandate = !l.mandate || l.mandate.type === 'none' || (!l.mandate.status);
    }

    return matchesSearch && matchesStatus && matchesMandate;
  });

  const totalValue = leads.reduce((acc, l) => acc + l.estimatedValue, 0);
  const hotLeadsCount = leads.filter((l) => l.status === 'HOT').length;
  const meetingsBookedCount = leads.filter((l) => l.meetingBooked).length;
  
  // Mandate KPIs
  const signedExclusiveLeads = leads.filter((l) => l.mandate?.status === 'signed' && l.mandate?.type === 'exclusive');
  const signedSimpleLeads = leads.filter((l) => l.mandate?.status === 'signed' && l.mandate?.type === 'simple');
  const negotiationLeads = leads.filter((l) => l.mandate?.type === 'in_negotiation' || l.mandate?.status === 'pending_signature');
  const signedMandatesCount = signedExclusiveLeads.length + signedSimpleLeads.length;

  const exclusiveCommissions = signedExclusiveLeads.reduce(
    (acc, l) => acc + (l.mandate?.feeAmount || Math.round((l.mandate?.sellingPrice || l.estimatedValue) * ((l.mandate?.feeRatePercent || 4.5) / 100))),
    0
  );
  const simpleCommissions = signedSimpleLeads.reduce(
    (acc, l) => acc + (l.mandate?.feeAmount || Math.round((l.mandate?.sellingPrice || l.estimatedValue) * ((l.mandate?.feeRatePercent || 4.8) / 100))),
    0
  );
  const totalSignedCommissions = exclusiveCommissions + simpleCommissions;
  const estimatedCommissions = Math.round(totalValue * 0.045);

  // Update Mandate Handler
  const handleUpdateLeadMandate = (
    lead: Lead,
    mandateData: Partial<MandateDetails>
  ) => {
    const currentMandate = lead.mandate || {
      type: 'none',
      status: 'draft',
      signedBy: 'Céline (Conseillère Référente)',
    };

    const newSellingPrice = mandateData.sellingPrice ?? currentMandate.sellingPrice ?? lead.estimatedValue;
    const newFeeRate = mandateData.feeRatePercent ?? currentMandate.feeRatePercent ?? 4.5;
    const computedFeeAmount = Math.round(newSellingPrice * (newFeeRate / 100));

    const updatedMandate: MandateDetails = {
      ...currentMandate,
      ...mandateData,
      sellingPrice: newSellingPrice,
      feeRatePercent: newFeeRate,
      feeAmount: computedFeeAmount,
      signedBy: mandateData.signedBy || currentMandate.signedBy || 'Céline (Conseillère Référente)',
    };

    let actionLabel = '';
    if (updatedMandate.status === 'signed') {
      actionLabel = updatedMandate.type === 'exclusive'
        ? `Mandat Exclusif N° ${updatedMandate.mandateNumber || 'M-2026-X'} signé (${(newSellingPrice / 1000).toFixed(0)}k€ - ${computedFeeAmount.toLocaleString('fr-FR')}€ hono)`
        : `Mandat Simple N° ${updatedMandate.mandateNumber || 'M-2026-X'} signé (${(newSellingPrice / 1000).toFixed(0)}k€ - ${computedFeeAmount.toLocaleString('fr-FR')}€ hono)`;
    } else {
      actionLabel = `Statut mandat mis à jour : ${updatedMandate.type === 'exclusive' ? 'Exclusif' : updatedMandate.type === 'simple' ? 'Simple' : 'En négo'} (${updatedMandate.status})`;
    }

    const updatedLead: Lead = {
      ...lead,
      mandate: updatedMandate,
      lastAction: {
        type: updatedMandate.status === 'signed' ? 'visit' : 'note',
        label: actionLabel,
        date: 'À l\'instant',
      },
      activities: [
        {
          id: `act-${Date.now()}`,
          type: 'visit',
          label: actionLabel,
          description: `Mandat ${updatedMandate.type} mis à jour par Céline`,
          date: 'À l\'instant',
        },
        ...(lead.activities || []),
      ],
    };

    if (onUpdateLead) {
      onUpdateLead(updatedLead);
    }
    if (selectedLeadDrawer?.id === lead.id) {
      setSelectedLeadDrawer(updatedLead);
    }
    setIsEditingMandate(false);
  };

  // Compute aggregate task metrics
  const allTasksAcrossLeads = leads.flatMap((l) => l.tasks || []);
  const totalTasksDone = allTasksAcrossLeads.filter((t) => t.done).length;
  const totalTasksPending = allTasksAcrossLeads.filter((t) => !t.done).length;
  const globalProgress = allTasksAcrossLeads.length > 0 
    ? Math.round((totalTasksDone / allTasksAcrossLeads.length) * 100)
    : 0;

  // Toggle a task's done state
  const handleToggleTask = (lead: Lead, taskId: string) => {
    if (!lead.tasks) return;
    const task = lead.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTasks = lead.tasks.map((t) =>
      t.id === taskId ? { ...t, done: !t.done } : t
    );

    const isNowDone = !task.done;
    const newActivity: LeadActivity = {
      id: `act-${Date.now()}`,
      type: 'task',
      label: isNowDone ? `Tâche complétée : "${task.label}"` : `Tâche rouverte : "${task.label}"`,
      date: 'À l\'instant',
    };

    const updatedLead: Lead = {
      ...lead,
      tasks: updatedTasks,
      lastAction: {
        type: 'note',
        label: isNowDone ? `Tâche terminée : ${task.label}` : `Tâche en cours : ${task.label}`,
        date: 'À l\'instant',
      },
      activities: [newActivity, ...(lead.activities || [])],
    };

    if (onUpdateLead) {
      onUpdateLead(updatedLead);
    }
    if (selectedLeadDrawer?.id === lead.id) {
      setSelectedLeadDrawer(updatedLead);
    }
  };

  // Add a new task to the lead
  const handleAddNewTask = (lead: Lead) => {
    if (!newTaskInput.trim()) return;

    const newTask: LeadTask = {
      id: `task-${Date.now()}`,
      label: newTaskInput.trim(),
      done: false,
      dueDate: 'À planifier',
      category: 'preparation',
    };

    const updatedLead: Lead = {
      ...lead,
      tasks: [...(lead.tasks || []), newTask],
      lastAction: {
        type: 'note',
        label: `Nouvelle tâche ajoutée : ${newTask.label}`,
        date: 'À l\'instant',
      },
    };

    if (onUpdateLead) {
      onUpdateLead(updatedLead);
    }
    if (selectedLeadDrawer?.id === lead.id) {
      setSelectedLeadDrawer(updatedLead);
    }
    setNewTaskInput('');
  };

  // Quick log an agent action (Call, Email, SMS, Visit, Note)
  const handleQuickLogAction = (lead: Lead, type: 'call' | 'email' | 'sms' | 'visit' | 'note', label: string) => {
    const newActivity: LeadActivity = {
      id: `act-${Date.now()}`,
      type,
      label,
      date: 'À l\'instant',
    };

    const updatedLead: Lead = {
      ...lead,
      lastAction: {
        type,
        label,
        date: 'À l\'instant',
      },
      activities: [newActivity, ...(lead.activities || [])],
    };

    if (onUpdateLead) {
      onUpdateLead(updatedLead);
    }
    if (selectedLeadDrawer?.id === lead.id) {
      setSelectedLeadDrawer(updatedLead);
    }
  };

  // Add a custom note
  const handleSaveCustomNote = (lead: Lead) => {
    if (!customNoteInput.trim()) return;

    const existingNotes = lead.notes ? `${lead.notes}\n• ${customNoteInput.trim()}` : `• ${customNoteInput.trim()}`;
    const updatedLead: Lead = {
      ...lead,
      notes: existingNotes,
      lastAction: {
        type: 'note',
        label: `Note ajoutée : "${customNoteInput.trim().slice(0, 40)}..."`,
        date: 'À l\'instant',
      },
    };

    if (onUpdateLead) {
      onUpdateLead(updatedLead);
    }
    if (selectedLeadDrawer?.id === lead.id) {
      setSelectedLeadDrawer(updatedLead);
    }
    setCustomNoteInput('');
    setIsAddingNote(false);
  };

  // Helper icon for action types
  const getActionIcon = (type?: string) => {
    switch (type) {
      case 'booking':
      case 'visit':
        return <Calendar className="w-3.5 h-3.5 text-emerald-600" />;
      case 'sms':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-600" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-purple-600" />;
      case 'call':
        return <Phone className="w-3.5 h-3.5 text-amber-600" />;
      case 'chat':
        return <Bot className="w-3.5 h-3.5 text-blue-600" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div id="crm-pipeline-container" className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in">
      {/* Top Metrics Banner - Clean Warm SaaS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-1 shadow-2xs">
          <div className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">
            Total Dossiers Qualifiés
          </div>
          <div className="text-xl font-bold text-stone-900">{leads.length}</div>
          <div className="text-[10px] text-stone-400 font-normal">Secteur Lyon + 50km</div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-1 shadow-2xs">
          <div className="text-[10px] font-medium text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
            Projets Chauds (&lt;3 mois)
          </div>
          <div className="text-xl font-bold text-stone-900">{hotLeadsCount}</div>
          <div className="text-[10px] text-amber-700/90 font-medium">Priorité de contact</div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-1 shadow-2xs">
          <div className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3 text-emerald-600" />
            Visites sur Place
          </div>
          <div className="text-xl font-bold text-stone-900">{meetingsBookedCount}</div>
          <div className="text-[10px] text-emerald-700/90 font-medium">Synchronisées agenda</div>
        </div>

        {/* DEDICATED MANDATE KPI: MANDATS SIGNÉS (EXCLUSIFS VS SIMPLES) */}
        <div className="bg-amber-50/70 rounded-xl border border-amber-200/80 p-3.5 space-y-1 shadow-2xs">
          <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3 h-3 text-amber-600" />
            Mandats Signés
          </div>
          <div className="text-xl font-extrabold text-amber-950 flex items-baseline gap-2">
            <span>{signedMandatesCount}</span>
            <span className="text-xs font-semibold text-amber-800">
              ({signedExclusiveLeads.length} Excl. • {signedSimpleLeads.length} Simple)
            </span>
          </div>
          <div className="text-[10px] text-amber-800 font-medium">
            {totalSignedCommissions.toLocaleString('fr-FR')} € d'honoraires signés
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-1 shadow-2xs col-span-2 lg:col-span-1">
          <div className="text-[10px] font-medium text-stone-600 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-stone-600" />
            Pipeline Total
          </div>
          <div className="text-xl font-bold text-stone-900">
            {estimatedCommissions.toLocaleString('fr-FR')} €
          </div>
          <div className="text-[10px] text-stone-500 font-normal">{(totalValue / 1000000).toFixed(2)} M€ de valeur sous mandat/estimation</div>
        </div>
      </div>

      {/* REFINED OPERATIONAL ACTION TRACKER BANNER (Attio / Notion Style) */}
      <div className="bg-[#18181b] rounded-2xl p-5 sm:p-6 text-stone-100 shadow-xs border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 text-stone-300 border border-zinc-700 text-[11px] font-medium">
              <ListTodo className="w-3.5 h-3.5 text-amber-400" />
              Pilotage Opérationnel Vendeurs & Mandats
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Suivi Opérationnel : Fait vs À Réaliser & Mandats Signés
            </h2>
            <p className="text-xs text-stone-400 max-w-xl font-normal leading-relaxed">
              Consultez en un coup d'œil l'avancée de chaque mandat (Exclusif ou Simple) et dossier vendeur : estimations remises, visites préparées, et signatures de mandats.
            </p>
          </div>

          {/* Global Progress Gauge */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 min-w-[260px]">
            <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-zinc-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-700"
                  strokeDasharray={`${globalProgress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold text-white">{globalProgress}%</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">{totalTasksDone} faites</span>
                <span className="text-zinc-500">/</span>
                <span className="text-amber-300 font-medium">{totalTasksPending} à faire</span>
              </div>
              <div className="text-[11px] text-stone-400 font-normal">Sur tous les dossiers en cours</div>
            </div>
          </div>
        </div>

        {/* Tab switcher: Leads Table vs Full Action Plan */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-5 pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'leads'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'bg-zinc-800/80 text-stone-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Tableau des Dossiers & Mandats ({filteredLeads.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('action_plan')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'action_plan'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'bg-zinc-800/80 text-stone-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Vue Tâches & Mandats ({signedMandatesCount} signés)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: LEADS TABLE & MOBILE CARDS WITH VISUAL LAST ACTIONS AND QUICK COPY */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 sm:p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  id="input-crm-search"
                  placeholder="Rechercher par nom, ville, n° mandat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-200 text-xs font-normal text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none w-full md:w-auto">
                <span className="text-xs font-medium text-stone-400 mr-1 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                  <Filter className="w-3 h-3" />
                  Statut :
                </span>
                {(['ALL', 'HOT', 'WARM', 'COLD'] as const).map((st) => {
                  const labels = {
                    ALL: 'Tous',
                    HOT: '🔥 Chauds',
                    WARM: '🟡 Tièdes',
                    COLD: '❄️ Froids',
                  };
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                        statusFilter === st
                          ? 'bg-stone-900 text-white font-semibold shadow-2xs'
                          : 'bg-stone-100/80 text-stone-600 hover:bg-stone-200/80'
                      }`}
                    >
                      {labels[st]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MANDATE FILTER ROW: CLASSIFICATION DES MANDATS (EXCLUSIF / SIMPLE / NÉGO) */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100 overflow-x-auto scrollbar-none">
              <span className="text-xs font-semibold text-amber-900 mr-1 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                Type de Mandat :
              </span>
              
              <button
                type="button"
                onClick={() => setMandateFilter('ALL')}
                className={`py-1 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  mandateFilter === 'ALL'
                    ? 'bg-stone-800 text-white font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Tous les mandats
              </button>

              <button
                type="button"
                onClick={() => setMandateFilter('EXCLUSIVE')}
                className={`py-1 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                  mandateFilter === 'EXCLUSIVE'
                    ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/80'
                }`}
              >
                <span>🌟 Exclusifs Signés</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">
                  {signedExclusiveLeads.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMandateFilter('SIMPLE')}
                className={`py-1 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                  mandateFilter === 'SIMPLE'
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200/80'
                }`}
              >
                <span>📄 Simples Signés</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">
                  {signedSimpleLeads.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMandateFilter('NEGOTIATION')}
                className={`py-1 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                  mandateFilter === 'NEGOTIATION'
                    ? 'bg-purple-600 text-white font-semibold shadow-2xs'
                    : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200/80'
                }`}
              >
                <span>⏳ En Négociation</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">
                  {negotiationLeads.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMandateFilter('NONE')}
                className={`py-1 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  mandateFilter === 'NONE'
                    ? 'bg-stone-700 text-white font-semibold'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                Sans mandat
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MOBILE RESPONSIVE CARDS VIEW (< md screen width) */}
          {/* ========================================================= */}
          <div className="block md:hidden space-y-3.5">
            {filteredLeads.map((lead) => {
              const hasChat = (lead.conversationHistory?.length || 0) > 0;
              const tasks = lead.tasks || [];
              const doneCount = tasks.filter((t) => t.done).length;
              const pendingCount = tasks.filter((t) => !t.done).length;
              const leadProgress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 50;
              const mandate = lead.mandate;

              return (
                <div
                  key={`mobile-lead-${lead.id}`}
                  className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs space-y-3.5 transition-all hover:border-stone-400"
                  onClick={() => setSelectedLeadDrawer(lead)}
                >
                  {/* Top Bar: Name + Status Badge + Score */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-stone-900 text-sm">{lead.name}</span>
                        {hasChat && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-medium border border-stone-200">
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>{lead.conversationHistory?.length}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 font-normal mt-0.5">
                        {lead.propertyType} • {lead.surface} m² • <strong className="text-stone-800 font-semibold">{lead.estimatedValue.toLocaleString('fr-FR')} €</strong>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          lead.status === 'HOT'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200 font-semibold'
                            : lead.status === 'WARM'
                            ? 'bg-stone-100 text-stone-700 border border-stone-200'
                            : 'bg-stone-50 text-stone-500 border border-stone-200'
                        }`}
                      >
                        {lead.status === 'HOT' ? '🔥 Chaud' : lead.status === 'WARM' ? '🟡 Tiède' : '❄️ Froid'} ({lead.score}/100)
                      </span>
                      <span className="text-[10px] text-stone-400">{lead.createdAt}</span>
                    </div>
                  </div>

                  {/* MANDATE STATUS BADGE (Mobile) */}
                  <div className="p-2 rounded-lg border text-xs flex items-center justify-between gap-2 bg-stone-50/70 border-stone-200">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Award className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      {mandate?.status === 'signed' ? (
                        mandate.type === 'exclusive' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-900">
                            <span>🌟 Mandat Exclusif Signé</span>
                            <span className="text-[10px] text-amber-700">({mandate.mandateNumber})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-900">
                            <span>📄 Mandat Simple Signé</span>
                            <span className="text-[10px] text-blue-700">({mandate.mandateNumber})</span>
                          </span>
                        )
                      ) : mandate?.type === 'in_negotiation' || mandate?.status === 'pending_signature' ? (
                        <span className="text-purple-800 font-semibold">⏳ Mandat en négociation ({mandate.type === 'exclusive' ? 'Exclusif' : 'Simple'})</span>
                      ) : (
                        <span className="text-stone-500 font-normal">⚪ Pas de mandat signé</span>
                      )}
                    </div>
                    {mandate?.feeAmount && (
                      <span className="font-bold text-stone-900 text-[11px] whitespace-nowrap">
                        {mandate.feeAmount.toLocaleString('fr-FR')} € hono
                      </span>
                    )}
                  </div>

                  {/* 1-Tap Quick Action Copy Bar (Mobile Optimized, No Wrapping) */}
                  <div
                    className="grid grid-cols-3 gap-1.5 p-2 bg-stone-50/80 rounded-lg border border-stone-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Copy Phone */}
                    <button
                      type="button"
                      onClick={() => handleCopyValue(`row-phone-${lead.id}`, lead.phone)}
                      className="py-1.5 px-2 rounded-md bg-white hover:bg-stone-50 text-stone-700 font-medium text-[11px] flex items-center justify-center gap-1 border border-stone-200 shadow-2xs transition-colors"
                      title="Copier le téléphone"
                    >
                      <Phone className="w-3 h-3 text-stone-400 flex-shrink-0" />
                      <span className="truncate">{lead.phone}</span>
                      {copiedField === `row-phone-${lead.id}` && (
                        <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      )}
                    </button>

                    {/* Copy Email */}
                    <button
                      type="button"
                      onClick={() => handleCopyValue(`row-email-${lead.id}`, lead.email)}
                      className="py-1.5 px-2 rounded-md bg-white hover:bg-stone-50 text-stone-700 font-medium text-[11px] flex items-center justify-center gap-1 border border-stone-200 shadow-2xs transition-colors"
                      title="Copier l'email"
                    >
                      <Mail className="w-3 h-3 text-stone-400 flex-shrink-0" />
                      <span className="truncate">{copiedField === `row-email-${lead.id}` ? 'Copié !' : 'Email'}</span>
                    </button>

                    {/* Copy Entire Card */}
                    <button
                      type="button"
                      onClick={() => handleCopyFullLeadCard(lead)}
                      className="py-1.5 px-2 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-100 font-medium text-[11px] flex items-center justify-center gap-1 shadow-2xs transition-colors"
                      title="Copier toute la fiche pour CRM / WhatsApp"
                    >
                      {copiedField === `full-${lead.id}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <span className="text-emerald-300 font-semibold">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-stone-400 flex-shrink-0" />
                          <span>Fiche</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Address & Motive */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-600 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate font-medium text-slate-700">{lead.address || lead.city}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyValue(`row-addr-${lead.id}`, lead.address || lead.city);
                        }}
                        className="text-slate-400 hover:text-blue-600 p-1 flex-shrink-0"
                        title="Copier l'adresse"
                      >
                        {copiedField === `row-addr-${lead.id}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500">Motif : <strong className="text-slate-700">{lead.motive}</strong></span>
                      <span className="text-slate-500">Délai : <strong className="text-slate-700">{lead.timeframe}</strong></span>
                    </div>
                  </div>

                  {/* Dernière Action Effectuée */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Dernière action</span>
                      {lead.lastAction?.date && <span>{lead.lastAction.date}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      {lead.lastAction ? (
                        <>
                          {getActionIcon(lead.lastAction.type)}
                          <span className="truncate">{lead.lastAction.label}</span>
                        </>
                      ) : lead.meetingBooked ? (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Visite posée {lead.meetingDate}</span>
                        </>
                      ) : (
                        <span>Simulation validée</span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar (Fait vs À Faire) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600">{doneCount}/{tasks.length || 6} étapes faites</span>
                      <span className={`font-bold ${leadProgress >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {leadProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          leadProgress >= 75
                            ? 'bg-emerald-500'
                            : leadProgress >= 40
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.max(15, leadProgress)}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    {!lead.meetingBooked && (
                      <button
                        type="button"
                        onClick={() => onOpenBookingModal(lead)}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Fixer Visite</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedLeadDrawer(lead)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Fiche & Mandat</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================= */}
          {/* DESKTOP TABLE VIEW (>= md screen width) - Warm SaaS */}
          {/* ========================================================= */}
          <div className="hidden md:block bg-white rounded-xl border border-stone-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-stone-50/70 border-b border-stone-200/80 text-stone-500 font-medium uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Prospect & Contact</th>
                    <th className="py-3 px-4">Bien & Localisation</th>
                    <th className="py-3 px-4">Mandat & Statut</th>
                    <th className="py-3 px-4">Motif & Délai</th>
                    <th className="py-3 px-4">Dernière Action Réalisée</th>
                    <th className="py-3 px-4">Avancement Dossier</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredLeads.map((lead) => {
                    const hasChat = (lead.conversationHistory?.length || 0) > 0;
                    const tasks = lead.tasks || [];
                    const doneCount = tasks.filter((t) => t.done).length;
                    const pendingCount = tasks.filter((t) => !t.done).length;
                    const leadProgress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 50;
                    const mandate = lead.mandate;

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-stone-50/60 transition-colors cursor-pointer group"
                        onClick={() => setSelectedLeadDrawer(lead)}
                      >
                        {/* Prospect Name & Quick Copy */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                            <span>{lead.name}</span>
                            {hasChat && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-medium border border-stone-200" title="Historique d'échange complet">
                                <MessageSquare className="w-3 h-3 text-stone-500" />
                                <span>{lead.conversationHistory?.length}</span>
                              </span>
                            )}
                          </div>
                          
                          {/* Quick copy chips right on row */}
                          <div className="flex items-center gap-1.5 mt-1 text-[11px]" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleCopyValue(`row-phone-${lead.id}`, lead.phone)}
                              className="px-1.5 py-0.5 rounded bg-stone-100/80 hover:bg-stone-200 text-stone-700 font-medium flex items-center gap-1 transition-colors whitespace-nowrap text-[11px]"
                              title="Copier le numéro de téléphone"
                            >
                              <Phone className="w-3 h-3 text-stone-400" />
                              <span>{lead.phone}</span>
                              {copiedField === `row-phone-${lead.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-stone-400" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyValue(`row-email-${lead.id}`, lead.email)}
                              className="p-1 rounded bg-stone-100/80 hover:bg-stone-200 text-stone-700 transition-colors"
                              title={`Copier l'email (${lead.email})`}
                            >
                              {copiedField === `row-email-${lead.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Mail className="w-3 h-3 text-stone-400" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyFullLeadCard(lead)}
                              className="px-1.5 py-0.5 rounded bg-stone-900 hover:bg-stone-800 text-stone-100 font-medium text-[10px] flex items-center gap-1 transition-colors whitespace-nowrap shadow-2xs"
                              title="Copier toute la fiche contact pour CRM / WhatsApp"
                            >
                              {copiedField === `full-${lead.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Copié !</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5 text-stone-400" />
                                  <span>Fiche</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Property & Address */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-stone-800 flex items-center gap-1.5">
                            {lead.propertyType === 'Appartement' ? (
                              <Building2 className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                            ) : (
                              <Home className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                            )}
                            <span>{lead.propertyType} • {lead.surface} m²</span>
                          </div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                            <MapPin className="w-3 h-3 text-stone-400 flex-shrink-0" />
                            <span className="truncate max-w-[170px]" title={lead.address || lead.city}>
                              {lead.address || lead.city}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyValue(`row-addr-${lead.id}`, lead.address || lead.city)}
                              className="text-stone-400 hover:text-stone-700 p-0.5"
                              title="Copier l'adresse"
                            >
                              {copiedField === `row-addr-${lead.id}` ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* DEDICATED COLUMN: MANDAT & HONORAIRES (EXCLUSIF VS SIMPLE) */}
                        <td className="py-3.5 px-4">
                          {mandate?.status === 'signed' ? (
                            <div className="space-y-1">
                              {mandate.type === 'exclusive' ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300/80 text-amber-950 font-bold text-[11px] shadow-2xs">
                                  <Award className="w-3.5 h-3.5 text-amber-600 fill-amber-500/30" />
                                  <span>🌟 EXCLUSIF SIGNÉ</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-300/80 text-blue-950 font-bold text-[11px] shadow-2xs">
                                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                                  <span>📄 SIMPLE SIGNÉ</span>
                                </div>
                              )}
                              <div className="text-[10px] text-stone-600 font-medium flex items-center gap-1.5">
                                <span>N° {mandate.mandateNumber}</span>
                                <span>•</span>
                                <strong className="text-stone-900 font-bold">{(mandate.feeAmount || 0).toLocaleString('fr-FR')} €</strong>
                                <span className="text-stone-400">({mandate.feeRatePercent || 4.5}%)</span>
                              </div>
                            </div>
                          ) : mandate?.type === 'in_negotiation' || mandate?.status === 'pending_signature' ? (
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-900 font-semibold text-[11px]">
                                <Clock className="w-3 h-3 text-purple-600" />
                                <span>⏳ Négo {mandate.type === 'exclusive' ? 'Exclusif' : 'Simple'}</span>
                              </div>
                              <div className="text-[10px] text-stone-500">
                                Objectif {(mandate.feeAmount || Math.round(lead.estimatedValue * 0.045)).toLocaleString('fr-FR')} €
                              </div>
                            </div>
                          ) : (
                            <div className="text-stone-400 text-[11px] font-normal flex items-center gap-1">
                              <span>⚪ Pas de mandat</span>
                            </div>
                          )}
                        </td>

                        {/* Motive & Timeframe */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-medium text-[11px] border border-stone-200">
                            {lead.motive}
                          </span>
                          <div className="text-[11px] text-stone-500 font-normal mt-1">
                            Délai : <strong className="text-stone-800 font-semibold">{lead.timeframe}</strong>
                          </div>
                        </td>

                        {/* DEDICATED COLUMN: DERNIÈRE ACTION EFFECTUÉE */}
                        <td className="py-3.5 px-4">
                          {lead.lastAction ? (
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100/90 border border-stone-200 text-stone-800 font-medium text-[11px] max-w-[200px] truncate">
                                {getActionIcon(lead.lastAction.type)}
                                <span className="truncate" title={lead.lastAction.label}>
                                  {lead.lastAction.label}
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{lead.lastAction.date}</span>
                              </div>
                            </div>
                          ) : lead.meetingBooked ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Visite posée {lead.meetingDate}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[11px]">
                              <span>Estimation transmise</span>
                            </div>
                          )}
                        </td>

                        {/* Progress Stepper (Fait vs À Faire) */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-stone-700">{doneCount}/{tasks.length || 6} faites</span>
                              <span className={`font-semibold ${leadProgress >= 70 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {leadProgress}%
                              </span>
                            </div>
                            {/* Visual Progress Bar */}
                            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden border border-stone-200/80">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  leadProgress >= 75
                                    ? 'bg-emerald-600'
                                    : leadProgress >= 40
                                    ? 'bg-stone-800'
                                    : 'bg-amber-600'
                                }`}
                                style={{ width: `${Math.max(15, leadProgress)}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-stone-400">
                              {pendingCount > 0 ? `${pendingCount} étape(s) en attente` : 'Dossier complet'}
                            </div>
                          </div>
                        </td>

                        {/* Quick Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {!lead.meetingBooked && (
                              <button
                                type="button"
                                onClick={() => onOpenBookingModal(lead)}
                                className="py-1.5 px-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-medium shadow-2xs transition-colors whitespace-nowrap"
                              >
                                Fixer Visite
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedLeadDrawer(lead)}
                              className="py-1.5 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
                              title="Ouvrir la fiche et les tâches"
                            >
                              <span>Dossier</span>
                              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL ACTION PLAN KANBAN (CE QUI A ÉTÉ FAIT vs CE QU'IL RESTE À FAIRE) */}
      {activeTab === 'action_plan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          {/* COLUMN 1: CE QUI A ÉTÉ FAIT */}
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-xs overflow-hidden flex flex-col">
            <div className="bg-emerald-50/80 border-b border-emerald-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Ce qui a été fait ({totalTasksDone} actions accomplies)
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    Étapes validées par l'agent et le tunnel IA
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                Terminé
              </span>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[600px] divide-y divide-slate-100">
              {leads.map((lead) => {
                const doneTasks = (lead.tasks || []).filter((t) => t.done);
                if (doneTasks.length === 0) return null;

                return (
                  <div key={`done-lead-${lead.id}`} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{lead.name}</span>
                        <span className="text-[10px] text-slate-500">({lead.city})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedLeadDrawer(lead)}
                        className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        <span>Voir fiche</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1.5 pl-2">
                      {doneTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-start gap-2 text-xs text-slate-700 bg-emerald-50/40 p-2 rounded-xl border border-emerald-100/60"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleTask(lead, t.id)}
                            className="mt-0.5 text-emerald-600 hover:text-slate-400 transition-colors"
                            title="Cliquer pour rouvrir cette tâche"
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>
                          <span className="line-through text-slate-500 flex-1">{t.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: CE QU'IL RESTE À FAIRE */}
          <div className="bg-white rounded-2xl border border-amber-200 shadow-xs overflow-hidden flex flex-col">
            <div className="bg-amber-50/80 border-b border-amber-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Ce qu'il reste à faire ({totalTasksPending} actions en attente)
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    Actions prioritaires pour transformer les estimations en mandats
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs">
                À traiter
              </span>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[600px] divide-y divide-slate-100">
              {leads.map((lead) => {
                const pendingTasks = (lead.tasks || []).filter((t) => !t.done);
                if (pendingTasks.length === 0) return null;

                return (
                  <div key={`pending-lead-${lead.id}`} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{lead.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lead.status === 'HOT' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {lead.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyValue(`pending-phone-${lead.id}`, lead.phone)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1"
                          title="Copier le numéro de téléphone"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{copiedField === `pending-phone-${lead.id}` ? 'Copié !' : 'Appeler'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedLeadDrawer(lead)}
                          className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-0.5"
                        >
                          <span>Fiche</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 pl-2">
                      {pendingTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-start justify-between gap-2 text-xs text-slate-800 bg-amber-50/40 hover:bg-amber-50 p-2.5 rounded-xl border border-amber-200/60 transition-colors"
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleTask(lead, t.id)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Cliquer pour marquer comme fait"
                            >
                              <Square className="w-4 h-4" />
                            </button>
                            <span className="font-medium">{t.label}</span>
                          </div>
                          {t.dueDate && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-800 whitespace-nowrap">
                              Échéance : {t.dueDate}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LEAD DETAILS DRAWER / MODAL WITH ACTION TRACKER & QUICK-COPY BAR */}
      {selectedLeadDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-white">{selectedLeadDrawer.name}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedLeadDrawer.status === 'HOT'
                        ? 'bg-rose-500 text-white'
                        : selectedLeadDrawer.status === 'WARM'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    Score {selectedLeadDrawer.score}/100 • {selectedLeadDrawer.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Enregistré {selectedLeadDrawer.createdAt} • {selectedLeadDrawer.propertyType} {selectedLeadDrawer.surface} m² à {selectedLeadDrawer.city}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLeadDrawer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
              
              <PreVisitBrief
                lead={selectedLeadDrawer}
                onBrief={(brief) => {
                  const updated = { ...selectedLeadDrawer, brief };
                  onUpdateLead?.(updated);
                  setSelectedLeadDrawer(updated);
                }}
              />

              {/* DEDICATED QUICK-COPY BAR FOR EXTERNAL TOOLS (CRM, WHATSAPP, PHONE) */}
              <div className="bg-white rounded-2xl border-2 border-blue-500/30 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <Copy className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Copie Rapide pour Outils Externes (CRM, WhatsApp, Logiciel)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Copiez chaque information en 1 clic pour l'insérer dans votre CRM de pige ou WhatsApp
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyFullLeadCard(selectedLeadDrawer)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                    title="Copier l'intégralité de la fiche contact formatée"
                  >
                    {copiedField === `full-${selectedLeadDrawer.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Fiche Complète Copiée !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier Toute la Fiche</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 4 Direct Copy Buttons: Name, Phone, Email, Address */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {/* Copy Name */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Nom / Vendeur</span>
                    <div className="text-xs font-bold text-slate-900 truncate my-1">{selectedLeadDrawer.name}</div>
                    <button
                      type="button"
                      onClick={() => handleCopyValue('name', selectedLeadDrawer.name)}
                      className={`w-full py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        copiedField === 'name' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {copiedField === 'name' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'name' ? 'Copié !' : 'Copier Nom'}</span>
                    </button>
                  </div>

                  {/* Copy Phone + Direct Call */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Téléphone</span>
                    <div className="text-xs font-bold text-slate-900 truncate my-1">{selectedLeadDrawer.phone}</div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyValue('phone', selectedLeadDrawer.phone)}
                        className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                          copiedField === 'phone' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                        title="Copier le numéro"
                      >
                        {copiedField === 'phone' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'phone' ? 'Copié !' : 'Copier'}</span>
                      </button>
                      <a
                        href={`tel:${selectedLeadDrawer.phone.replace(/\s+/g, '')}`}
                        className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center"
                        title="Appeler directement"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Copy Email + Direct Mail */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Email</span>
                    <div className="text-xs font-bold text-slate-900 truncate my-1" title={selectedLeadDrawer.email}>
                      {selectedLeadDrawer.email}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyValue('email', selectedLeadDrawer.email)}
                        className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                          copiedField === 'email' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                        title="Copier l'email"
                      >
                        {copiedField === 'email' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'email' ? 'Copié !' : 'Copier'}</span>
                      </button>
                      <a
                        href={`mailto:${selectedLeadDrawer.email}`}
                        className="p-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center"
                        title="Envoyer un email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Copy Address */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Adresse Complète</span>
                    <div className="text-xs font-bold text-slate-900 truncate my-1" title={selectedLeadDrawer.address || selectedLeadDrawer.city}>
                      {selectedLeadDrawer.address || selectedLeadDrawer.city}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyValue('address', selectedLeadDrawer.address || selectedLeadDrawer.city)}
                      className={`w-full py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        copiedField === 'address' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {copiedField === 'address' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'address' ? 'Copié !' : 'Copier Adresse'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* DEDICATED MANDATE STATUS & MANAGEMENT CARD (EXCLUSIF VS SIMPLE) */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <Award className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                        <span>Statut du Mandat & Honoraires</span>
                        {selectedLeadDrawer.mandate?.status === 'signed' && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            selectedLeadDrawer.mandate.type === 'exclusive'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}>
                            {selectedLeadDrawer.mandate.type === 'exclusive' ? '🌟 EXCLUSIF SIGNÉ' : '📄 SIMPLE SIGNÉ'}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Définissez le type de mandat, les honoraires d'agence et le numéro de registre
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Mandate Type Switcher */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleUpdateLeadMandate(
                        selectedLeadDrawer,
                        {
                          type: 'exclusive',
                          status: 'signed',
                          mandateNumber: selectedLeadDrawer.mandate?.mandateNumber || `M-2026-${Math.floor(100 + Math.random() * 900)}`,
                          sellingPrice: selectedLeadDrawer.mandate?.sellingPrice || selectedLeadDrawer.estimatedValue,
                          feeRatePercent: 4.5,
                          signedDate: new Date().toISOString().split('T')[0],
                        }
                      )}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        selectedLeadDrawer.mandate?.type === 'exclusive' && selectedLeadDrawer.mandate?.status === 'signed'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      <span>🌟 Passer en Exclusif Signé</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateLeadMandate(
                        selectedLeadDrawer,
                        {
                          type: 'simple',
                          status: 'signed',
                          mandateNumber: selectedLeadDrawer.mandate?.mandateNumber || `M-2026-${Math.floor(100 + Math.random() * 900)}`,
                          sellingPrice: selectedLeadDrawer.mandate?.sellingPrice || selectedLeadDrawer.estimatedValue,
                          feeRatePercent: 4.8,
                          signedDate: new Date().toISOString().split('T')[0],
                        }
                      )}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        selectedLeadDrawer.mandate?.type === 'simple' && selectedLeadDrawer.mandate?.status === 'signed'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      <span>📄 Passer en Simple Signé</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateLeadMandate(
                        selectedLeadDrawer,
                        {
                          type: 'in_negotiation',
                          status: 'pending_signature',
                          sellingPrice: selectedLeadDrawer.estimatedValue,
                          feeRatePercent: 4.5,
                        }
                      )}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedLeadDrawer.mandate?.type === 'in_negotiation' || selectedLeadDrawer.mandate?.status === 'pending_signature'
                          ? 'bg-purple-600 text-white font-semibold'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      ⏳ En Négociation
                    </button>
                  </div>
                </div>

                {/* Mandate Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-500 font-bold uppercase">Type de Mandat</span>
                    <div className="text-xs font-extrabold text-stone-900 mt-1">
                      {selectedLeadDrawer.mandate?.type === 'exclusive'
                        ? '🌟 Exclusivité Totale'
                        : selectedLeadDrawer.mandate?.type === 'simple'
                        ? '📄 Mandat Simple'
                        : selectedLeadDrawer.mandate?.type === 'in_negotiation'
                        ? '⏳ En Négociation'
                        : 'Aucun mandat'}
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      {selectedLeadDrawer.mandate?.status === 'signed' ? `Signé le ${selectedLeadDrawer.mandate.signedDate || 'Récemment'}` : 'En cours de négociation'}
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-500 font-bold uppercase">Prix FAI Estimé</span>
                    <div className="text-xs font-extrabold text-stone-900 mt-1">
                      {(selectedLeadDrawer.mandate?.sellingPrice || selectedLeadDrawer.estimatedValue).toLocaleString('fr-FR')} €
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">Net vendeur + honoraires</div>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-500 font-bold uppercase">Taux d'Honoraires</span>
                    <div className="text-xs font-extrabold text-stone-900 mt-1">
                      {selectedLeadDrawer.mandate?.feeRatePercent || 4.5}% TTC
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">Barème agence</div>
                  </div>

                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-800 font-bold uppercase">Honoraires d'Agence</span>
                    <div className="text-xs font-black text-amber-950 mt-1">
                      {(selectedLeadDrawer.mandate?.feeAmount || Math.round(selectedLeadDrawer.estimatedValue * 0.045)).toLocaleString('fr-FR')} €
                    </div>
                    <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                      {selectedLeadDrawer.mandate?.mandateNumber ? `Réf: ${selectedLeadDrawer.mandate.mandateNumber}` : 'À attribuer'}
                    </div>
                  </div>
                </div>
              </div>

              {/* DEDICATED BANNER: DERNIÈRE ACTION EFFECTUÉE & QUICK LOGGER */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-blue-400" />
                      Dernière Action Enregistrée dans le CRM
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
                      {getActionIcon(selectedLeadDrawer.lastAction?.type)}
                      <span>{selectedLeadDrawer.lastAction?.label || 'Simulation en ligne validée par le prospect'}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                    {selectedLeadDrawer.lastAction?.date || selectedLeadDrawer.createdAt}
                  </span>
                </div>

                {/* Agent Quick Action Buttons (1-click logger) */}
                <div>
                  <div className="text-[11px] text-slate-300 font-semibold mb-2">
                    Enregistrer une nouvelle action immédiate :
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickLogAction(selectedLeadDrawer, 'call', 'Appel téléphonique passé au vendeur')}
                      className="py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>📞 Appel passé</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogAction(selectedLeadDrawer, 'email', 'Email d\'étude de marché envoyé')}
                      className="py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5 text-purple-400" />
                      <span>✉️ Email envoyé</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogAction(selectedLeadDrawer, 'sms', 'SMS de relance / confirmation envoyé')}
                      className="py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span>💬 SMS envoyé</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogAction(selectedLeadDrawer, 'visit', 'Visite d\'estimation sur place réalisée')}
                      className="py-1.5 px-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Home className="w-3.5 h-3.5 text-emerald-400" />
                      <span>🏡 Visite faite</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTION PLAN SECTION: CE QUI A ÉTÉ FAIT vs CE QU'IL RESTE À FAIRE */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Plan d'Action du Dossier : Ce qui a été fait & Ce qu'il reste à faire
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-blue-600">
                    {(selectedLeadDrawer.tasks || []).filter((t) => t.done).length} / {(selectedLeadDrawer.tasks || []).length} étapes terminées
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Ce qui a été fait */}
                  <div className="space-y-2 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100">
                    <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>✅ Ce qui a été fait</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {(selectedLeadDrawer.tasks || [])
                        .filter((t) => t.done)
                        .map((t) => (
                          <div
                            key={t.id}
                            className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-200/80 shadow-2xs"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleTask(selectedLeadDrawer, t.id)}
                              className="mt-0.5 text-emerald-600 hover:text-slate-400 transition-colors"
                              title="Cliquer pour rouvrir cette tâche"
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-medium text-slate-600 line-through flex-1">
                              {t.label}
                            </span>
                          </div>
                        ))}
                      {(selectedLeadDrawer.tasks || []).filter((t) => t.done).length === 0 && (
                        <div className="text-xs text-slate-400 italic p-2">Aucune tâche terminée pour l'instant.</div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Ce qu'il reste à faire */}
                  <div className="space-y-2 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100">
                    <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>⏳ Ce qu'il reste à faire</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {(selectedLeadDrawer.tasks || [])
                        .filter((t) => !t.done)
                        .map((t) => (
                          <div
                            key={t.id}
                            className="flex items-start justify-between gap-2 bg-white hover:bg-amber-50/40 p-2.5 rounded-xl border border-amber-200/80 shadow-2xs transition-colors"
                          >
                            <div className="flex items-start gap-2 flex-1">
                              <button
                                type="button"
                                onClick={() => handleToggleTask(selectedLeadDrawer, t.id)}
                                className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                                title="Cliquer pour valider cette tâche"
                              >
                                <Square className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-semibold text-slate-800">{t.label}</span>
                            </div>
                            {t.dueDate && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                {t.dueDate}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Add Custom Task Input */}
                    <div className="pt-2 flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Ajouter une tâche personnalisée..."
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNewTask(selectedLeadDrawer);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNewTask(selectedLeadDrawer)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Key Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Bien & Surface</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {selectedLeadDrawer.propertyType} • {selectedLeadDrawer.surface} m²
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{selectedLeadDrawer.city}</div>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Valorisation Estimée</div>
                  <div className="text-sm font-extrabold text-blue-600 mt-1">
                    {selectedLeadDrawer.estimatedValue.toLocaleString('fr-FR')} €
                  </div>
                  <div className="text-[10px] text-slate-400">Avis de valeur initial</div>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Motif & Délai</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {selectedLeadDrawer.motive}
                  </div>
                  <div className="text-[11px] text-slate-500">{selectedLeadDrawer.timeframe}</div>
                </div>
              </div>

              {/* Status Selector */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Modifier le statut du lead
                </label>
                <div className="flex gap-2">
                  {(['HOT', 'WARM', 'COLD'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        onUpdateLeadStatus(selectedLeadDrawer.id, st);
                        setSelectedLeadDrawer({ ...selectedLeadDrawer, status: st });
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        selectedLeadDrawer.status === st
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {st === 'HOT' ? '🔥 CHAUD' : st === 'WARM' ? '🟡 TIÈDE' : '❄️ FROID'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes & Summary */}
              {selectedLeadDrawer.notes && (
                <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-1.5 shadow-2xs">
                  <div className="text-xs font-bold text-amber-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-700" />
                      <span>Synthèse de l'Agent IA & Contexte Vendeur</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(!isAddingNote)}
                      className="text-[11px] text-amber-800 font-bold hover:underline"
                    >
                      {isAddingNote ? 'Annuler' : '+ Ajouter une note'}
                    </button>
                  </div>
                  <p className="text-xs text-amber-950 leading-relaxed font-medium whitespace-pre-wrap">
                    {selectedLeadDrawer.notes}
                  </p>

                  {isAddingNote && (
                    <div className="pt-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="Ajouter une note de suivi..."
                        value={customNoteInput}
                        onChange={(e) => setCustomNoteInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-amber-300 text-xs text-slate-900 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveCustomNote(selectedLeadDrawer)}
                        className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold"
                      >
                        Enregistrer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CONVERSATION HISTORY SECTION */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Historique de la conversation avec le Bot IA
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        {selectedLeadDrawer.conversationHistory?.length || 0} messages échangés
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsChatExpanded(!isChatExpanded)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center gap-1 transition-colors"
                    >
                      <span>{isChatExpanded ? 'Masquer le dialogue' : 'Afficher le dialogue'}</span>
                      {isChatExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {isChatExpanded && (
                  <div className="p-4 sm:p-5 space-y-3.5 max-h-80 overflow-y-auto bg-slate-50/70 border-t border-slate-100">
                    {selectedLeadDrawer.conversationHistory && selectedLeadDrawer.conversationHistory.length > 0 ? (
                      selectedLeadDrawer.conversationHistory.map((msg, idx) => {
                        const isAssistant = msg.role === 'assistant';
                        return (
                          <div
                            key={msg.id || idx}
                            className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                          >
                            {isAssistant && (
                              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                                <Bot className="w-4 h-4" />
                              </div>
                            )}

                            <div
                              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs ${
                                isAssistant
                                  ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                                  : 'bg-blue-600 text-white rounded-tr-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4 mb-1 text-[10px] font-semibold opacity-75">
                                <span>{isAssistant ? 'Conseillère Céline • Agent Estimation' : selectedLeadDrawer.name}</span>
                                <span>{msg.timestamp || 'Enregistré'}</span>
                              </div>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>

                            {!isAssistant && (
                              <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500">
                        Ce prospect a complété le questionnaire d'estimation initiale directement.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                {!selectedLeadDrawer.meetingBooked ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenBookingModal(selectedLeadDrawer);
                      setSelectedLeadDrawer(null);
                    }}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Fixer une Visite d'Estimation sur Place
                  </button>
                ) : (
                  <div className="flex-1 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Visite confirmée le {selectedLeadDrawer.meetingDate} à {selectedLeadDrawer.meetingTime}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
