import { PreVisitBrief } from './PreVisitBrief';
import { stageOf, frDate } from '../utils/stage';
import { CommissionFields, type CommissionResult } from './CommissionCalculator';
import { SecurityPanel } from './SecurityPanel';
import { EmailComposer } from './EmailComposer';

/** Rendez-vous R1 / R2 : date et heure, fixés à la main depuis la fiche (le R1 peut aussi venir de la réservation en ligne). */
const VisitBox: React.FC<{ title: string; idPrefix: string; value?: { date: string; time?: string }; note?: string; onSave: (v: { date: string; time?: string } | undefined) => void }> = ({ title, idPrefix, value, note, onSave }) => {
  const [date, setDate] = useState(value?.date || '');
  const [time, setTime] = useState(value?.time || '10:00');
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-orange-800">{title}</div>
      {note && <p className="text-xs text-stone-600">{note}</p>}
      {value?.date ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-stone-900">📅 {frDate(value.date)}{value.time ? ` à ${value.time}` : ''}</p>
          <button type="button" onClick={() => onSave(undefined)} className="text-xs underline text-stone-600">Retirer</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={`${idPrefix}-date`} className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Date</label>
            <input id={`${idPrefix}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm bg-white" />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-time`} className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Heure</label>
            <input id={`${idPrefix}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm bg-white" />
          </div>
          <button type="button" id={`btn-save-${idPrefix}`} disabled={!date} onClick={() => onSave({ date, time })} className="rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold px-4 py-2">Ajouter</button>
        </div>
      )}
    </div>
  );
};

/** Vente conclue : date, prix de vente final et commission de Céline (champs liés : prix, %, commission, net vendeur). */
const SaleBox: React.FC<{ lead: Lead; onSave: (soldDate: string, saleFee: number, salePrice?: number, ratePercent?: number, netFee?: number) => void }> = ({ lead, onSave }) => {
  const m = lead.mandate!;
  const [date, setDate] = useState(m.soldDate || new Date().toISOString().slice(0, 10));
  const [res, setRes] = useState<CommissionResult | null>(null);
  const [netFee, setNetFee] = useState('');
  if (m.soldDate) {
    const price = m.salePrice || 0;
    const fee = m.saleFee || 0;
    const card = 'p-3 rounded-xl border border-stone-200 bg-stone-50';
    const lab = 'text-[10px] text-stone-500 font-bold uppercase';
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
          <p className="text-sm text-emerald-900"><strong>🏁 Vente conclue le {frDate(m.soldDate)}</strong></p>
          <button type="button" onClick={() => onSave('', 0)} className="text-xs underline text-emerald-900">Annuler la vente</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={card}><span className={lab}>Valorisation estimée IA</span><div className="text-sm font-extrabold text-stone-900 mt-1">{lead.estimatedValue ? `${lead.estimatedValue.toLocaleString('fr-FR')} €` : '—'}</div></div>
          <div className={card}><span className={lab}>Prix de vente final</span><div className="text-sm font-extrabold text-stone-900 mt-1">{price ? `${price.toLocaleString('fr-FR')} €` : '—'}</div></div>
          <div className={card}>
            <span className={lab}>Commission agence</span>
            <div className="text-sm font-extrabold text-stone-900 mt-1">{fee.toLocaleString('fr-FR')} €</div>
            {price && fee ? <div className="text-[10px] text-stone-400 mt-0.5">{((fee / price) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} % du prix</div> : null}
          </div>
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/80"><span className="text-[10px] text-amber-800 font-bold uppercase">Commission nette</span><div className="text-sm font-black text-amber-950 mt-1">{m.saleNetFee ? `${m.saleNetFee.toLocaleString('fr-FR')} €` : '—'}</div></div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
      <div className="text-xs font-bold uppercase tracking-wider text-stone-600">Enregistrer la vente</div>
      <div>
        <label htmlFor="sale-date" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Vente conclue le</label>
        <input id="sale-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm" />
      </div>
      <CommissionFields initial={{ price: m.sellingPrice || undefined }} onResult={setRes} />
      <div>
        <label htmlFor="sale-net-fee" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Commission nette (€) • ce que vous touchez, à saisir à la main</label>
        <div className="relative max-w-xs">
          <input id="sale-net-fee" inputMode="decimal" value={netFee} onChange={(e) => setNetFee(e.target.value)} placeholder="Ce que vous touchez réellement" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 pr-9 text-base font-bold" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">€</span>
        </div>
      </div>
      <button
        type="button"
        id="btn-save-sale"
        disabled={!res || !date}
        onClick={() => res && date && onSave(date, Math.round(res.fee), Math.round(res.price), Math.round(res.rate * 100) / 100, Math.round(Number(netFee.replace(/\s/g, '').replace(',', '.')) || 0) || undefined)}
        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold px-4 py-2"
      >
        🏁 Enregistrer la vente
      </button>
      <p className="text-[11px] text-stone-500">Indiquez le prix de vente final et la commission de l'agence (en € ou en %) : les deux autres champs se calculent.</p>
    </div>
  );
};
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
  Trash2,
  Tag,
  Award,
  Users,
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
  onDeleteLead?: (lead: Lead) => Promise<boolean>;
}

export const CrmPipelineView: React.FC<Props> = ({
  leads,
  onSelectLead,
  onOpenBookingModal,
  onUpdateLeadStatus,
  onUpdateLead,
  onNavigateToNurture,
  onDeleteLead,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HOT' | 'WARM' | 'COLD'>('ALL');
  const [mandateFilter, setMandateFilter] = useState<'ALL' | 'lead' | 'r1' | 'r2' | 'mandat' | 'vente' | 'archive'>('ALL');
  const [activeTab, setActiveTab] = useState<'leads' | 'action_plan'>('leads');
  const [selectedLeadDrawer, setSelectedLeadDrawer] = useState<Lead | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [customNoteInput, setCustomNoteInput] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingMandate, setIsEditingMandate] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [mailLead, setMailLead] = useState<Lead | null>(null);
  const [openCol, setOpenCol] = useState<string | null>(null);

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
      ? `MANDAT ${lead.mandate.type === 'exclusive' ? 'EXCLUSIF' : 'SIMPLE'} SIGNÉ (N° ${lead.mandate.mandateNumber || 'En cours'}, ${lead.mandate.sellingPrice?.toLocaleString('fr-FR')} €)`
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
📅 VISITE : ${lead.meetingBooked ? `Rendez-vous fixé le ${frDate(lead.meetingDate)} à ${lead.meetingTime} (${lead.meetingType || 'Visite sur place'})` : 'En séquence d\'accompagnement'}
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

    const matchesMandate = mandateFilter === 'archive' ? Boolean(l.archive) : !l.archive && (mandateFilter === 'ALL' || mandateFilter === stageOf(l));

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
  const activeLeads = leads.filter((l) => !l.archive);
  const archivedLeads = leads.filter((l) => l.archive);
  const pipeSold = activeLeads.filter((l) => stageOf(l) === 'vente');
  const pipeMandates = activeLeads.filter((l) => stageOf(l) === 'mandat');
  const pipeR2 = activeLeads.filter((l) => stageOf(l) === 'r2');
  const pipeVisits = activeLeads.filter((l) => stageOf(l) === 'r1');
  const pipeLeads = activeLeads.filter((l) => stageOf(l) === 'lead');


  const archiveLead = (lead: Lead, kind: 'mandat_perdu' | 'autre') => {
    const reason = window.prompt(kind === 'mandat_perdu' ? 'Mandat perdu : pourquoi ? (facultatif, par exemple « signé avec une autre agence »)' : 'Archiver ce dossier : motif ? (facultatif)', '');
    if (reason === null) return;
    const today = new Date().toISOString().slice(0, 10);
    const updated: Lead = {
      ...lead,
      archive: { date: today, kind, reason: reason.trim() || undefined, stage: stageOf(lead) },
      activities: [{ id: `act-${Date.now()}`, type: 'note', label: `${kind === 'mandat_perdu' ? 'Mandat perdu' : 'Dossier archivé'}${reason.trim() ? ` : ${reason.trim()}` : ''}`, date: "À l'instant" }, ...(lead.activities || [])],
    };
    onUpdateLead?.(updated);
    setSelectedLeadDrawer(updated);
  };

  const restoreLead = (lead: Lead) => {
    const updated: Lead = {
      ...lead,
      archive: undefined,
      activities: [{ id: `act-${Date.now()}`, type: 'note', label: 'Dossier réactivé', date: "À l'instant" }, ...(lead.activities || [])],
    };
    onUpdateLead?.(updated);
    setSelectedLeadDrawer(updated);
  };

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

    const updatedMandate: MandateDetails = {
      ...currentMandate,
      ...mandateData,
      sellingPrice: newSellingPrice,
      signedBy: mandateData.signedBy || currentMandate.signedBy || 'Céline (Conseillère Référente)',
    };

    let actionLabel = '';
    if (mandateData.soldDate) {
      actionLabel = `Vente conclue le ${mandateData.soldDate} (prix ${(updatedMandate.salePrice || 0).toLocaleString('fr-FR')} €, commission agence ${(updatedMandate.saleFee || 0).toLocaleString('fr-FR')} €)`;
    } else if (mandateData.soldDate === '') {
      actionLabel = 'Vente annulée (retour au mandat signé)';
    } else if (updatedMandate.status === 'signed') {
      actionLabel = updatedMandate.type === 'exclusive'
        ? `Mandat Exclusif N° ${updatedMandate.mandateNumber || 'M-2026-X'} signé (${(newSellingPrice / 1000).toFixed(0)}k€)`
        : `Mandat Simple N° ${updatedMandate.mandateNumber || 'M-2026-X'} signé (${(newSellingPrice / 1000).toFixed(0)}k€)`;
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
      {mailLead && (
        <EmailComposer
          lead={mailLead}
          onClose={() => setMailLead(null)}
          onSent={(subject) => {
            const updated = {
              ...mailLead,
              activities: [{ id: `act-${Date.now()}`, type: 'email', label: `E-mail envoyé : ${subject}`, date: "À l'instant" }, ...(mailLead.activities || [])],
            } as Lead;
            onUpdateLead?.(updated);
            if (selectedLeadDrawer?.id === updated.id) setSelectedLeadDrawer(updated);
            setMailLead(updated);
          }}
        />
      )}
      {securityOpen && <SecurityPanel onClose={() => setSecurityOpen(false)} onLoggedOut={() => window.location.assign('/')} />}
      {/* Bandeau d'accueil */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0f1f3d] to-[#1d3566] text-white p-5 sm:p-7 shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-amber-400/10" aria-hidden="true" />
        <div className="absolute right-24 -bottom-16 h-40 w-40 rounded-full bg-sky-400/10" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold">Bonjour Céline 👋</h1>
          <p className="mt-1 text-sm text-slate-300">
            {activeLeads.length} dossier{activeLeads.length > 1 ? 's' : ''} en cours
            {pipeVisits.length + pipeR2.length > 0 ? ` • ${pipeVisits.length + pipeR2.length} rendez-vous à suivre` : ''}
            {pipeMandates.length > 0 ? ` • ${pipeMandates.length} mandat${pipeMandates.length > 1 ? 's' : ''} actif${pipeMandates.length > 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          ['Leads', leads.length, 'demandes reçues via le site', <Users className="w-5 h-5" />, 'from-sky-500 to-sky-600', 'bg-sky-50'],
          ['Rendez-vous', pipeVisits.length + pipeR2.length + pipeMandates.length + pipeSold.length, `${leads.length ? Math.round(((pipeVisits.length + pipeR2.length + pipeMandates.length + pipeSold.length) / leads.length) * 100) : 0} % des leads`, <Calendar className="w-5 h-5" />, 'from-amber-500 to-orange-500', 'bg-amber-50'],
          ['Mandats', pipeMandates.length, `${(pipeMandates.reduce((n, l) => n + (l.mandate?.sellingPrice || 0), 0) / 1e6).toFixed(2).replace('.', ',')} M€ sous mandat`, <ScrollText className="w-5 h-5" />, 'from-violet-500 to-purple-600', 'bg-violet-50'],
          ['Ventes', pipeSold.length, `${pipeSold.reduce((n, l) => n + (l.mandate?.saleFee || 0), 0).toLocaleString('fr-FR')} € de commission`, <Award className="w-5 h-5" />, 'from-emerald-500 to-teal-600', 'bg-emerald-50'],
        ] as Array<[string, number, string, React.ReactNode, string, string]>).map(([label, value, sub, icon, grad, tint]) => (
          <div key={label} className={`rounded-2xl border border-stone-200 ${tint} p-4 sm:p-5 shadow-sm`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">{label}</span>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow`}>{icon}</span>
            </div>
            <p className="mt-2 text-4xl font-extrabold text-stone-900 leading-none">{value}</p>
            <p className="mt-1.5 text-xs text-stone-600">{sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="rounded-3xl bg-white border border-stone-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">Votre pipeline</h2>
            <p className="text-xs text-stone-500">De la demande d'estimation à la vente. Cliquez un dossier pour l'ouvrir.</p>
          </div>
          {openCol && <button type="button" onClick={() => setOpenCol(null)} className="text-sm font-bold text-sky-700 underline">← Voir toutes les étapes</button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {([
            ['LEADS', 'from-sky-500 to-sky-600', 'bg-sky-50/60', pipeLeads],
            ['R1', 'from-amber-500 to-amber-600', 'bg-amber-50/60', pipeVisits],
            ['R2', 'from-orange-500 to-orange-600', 'bg-orange-50/60', pipeR2],
            ['MANDAT', 'from-violet-500 to-violet-600', 'bg-violet-50/60', pipeMandates],
            ['VENTE', 'from-emerald-500 to-emerald-600', 'bg-emerald-50/60', pipeSold],
          ] as Array<[string, string, string, Lead[]]>).map(([title, grad, tint, list]) => (
            <div key={title} className={`rounded-2xl ${tint} border border-stone-200 overflow-hidden ${openCol === title ? 'sm:col-span-2 lg:col-span-5' : openCol ? 'hidden' : ''}`}>
              <button
                type="button"
                onClick={() => setOpenCol(openCol === title ? null : title)}
                aria-expanded={openCol === title}
                title={openCol === title ? 'Réduire' : 'Voir tous les dossiers de cette étape'}
                className={`w-full flex items-center justify-between bg-gradient-to-r ${grad} text-white px-3.5 py-2.5 text-left`}
              >
                <span className="text-sm font-extrabold tracking-wide">{title}</span>
                <span className="flex items-center gap-2">
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-extrabold">{list.length}</span>
                  <span className="text-[11px] font-semibold underline">{openCol === title ? 'Retour' : 'Tout voir'}</span>
                </span>
              </button>
              <div className={`p-2.5 ${openCol === title ? 'grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2 max-h-72 overflow-y-auto'}`}>
                {list.length === 0 && <p className="text-xs text-stone-400 text-center py-6">Aucun dossier</p>}
                {list.map((l) => (
                  <button key={l.id} type="button" onClick={() => setSelectedLeadDrawer(l)} className="w-full text-left rounded-xl bg-white border border-stone-200 hover:border-stone-400 hover:shadow-md p-3 shadow-2xs transition-all">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${grad} text-white text-xs font-extrabold`}>{l.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-stone-900">{l.name}</p>
                        <p className="truncate text-[11px] text-stone-500">📍 {l.city} • {l.propertyType} {l.surface} m²</p>
                      </div>
                    </div>
                    {openCol === title && <p className="mt-1.5 truncate text-[11px] text-stone-500">📞 {l.phone || '—'} • ✉️ {l.email || '—'}</p>}
                    <p className="mt-2 rounded-lg bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-700">
                      {title === 'VENTE'
                        ? `Commission : ${(l.mandate?.saleFee || 0).toLocaleString('fr-FR')} €`
                        : title === 'MANDAT'
                          ? `${l.mandate?.type === 'exclusive' ? 'Exclusif' : 'Simple'} • ${(l.mandate?.sellingPrice || l.estimatedValue || 0).toLocaleString('fr-FR')} €`
                          : title === 'R2'
                            ? `📅 ${l.visit2?.date ? frDate(l.visit2.date) : 'Date à fixer'}${l.visit2?.time ? ` à ${l.visit2.time}` : ''}`
                            : title === 'R1'
                              ? `📅 ${l.meetingDate ? frDate(l.meetingDate) : 'Date à confirmer'}${l.meetingTime ? ` à ${l.meetingTime}` : ''}`
                              : `${l.estimatedValue ? `${l.estimatedValue.toLocaleString('fr-FR')} € estimés` : 'À contacter'}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-stone-200">
        {/* Tab switcher: Leads Table vs Full Action Plan */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'leads'
                ? 'bg-[#0f1f3d] text-white font-semibold shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Mes dossiers ({filteredLeads.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSecurityOpen(true)}
            id="btn-security"
            className="sm:ml-auto px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 bg-stone-100 text-stone-700 hover:bg-stone-200"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sécurité</span>
          </button>

          <a
            href="/api/crm/export.csv"
            download
            id="btn-export-leads"
            title="Télécharge tous les dossiers dans un fichier Excel (CSV) : votre sauvegarde"
            className="px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter mes dossiers (Excel)</span>
          </a>
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

            {/* Tri par étape du pipeline */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100 overflow-x-auto scrollbar-none">
              <span className="text-xs font-semibold text-stone-600 mr-1 whitespace-nowrap flex-shrink-0">Étape :</span>
              {([
                ['ALL', 'Tous', activeLeads.length],
                ['lead', 'Leads', pipeLeads.length],
                ['r1', 'R1', pipeVisits.length],
                ['r2', 'R2', pipeR2.length],
                ['mandat', 'Mandat', pipeMandates.length],
                ['vente', 'Vente', pipeSold.length],
                ['archive', 'Archivés', archivedLeads.length],
              ] as const).map(([k, label, n]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMandateFilter(k)}
                  className={`py-1 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    mandateFilter === k ? 'bg-stone-800 text-white font-semibold' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {label}
                  <span className="px-1.5 rounded-full bg-white/25 text-[10px] font-bold">{n}</span>
                </button>
              ))}
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
                  {(mandate?.status === 'signed' || mandate?.type === 'in_negotiation' || mandate?.status === 'pending_signature') && (
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
                  </div>
                  )}

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
                          <span>Visite le {frDate(lead.meetingDate)}</span>
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
                    <th className="py-3 px-4">Bien</th>
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
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-stone-400 flex-shrink-0" />
                            <span>{lead.city}</span>
                          </div>
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
                              <span>Visite le {frDate(lead.meetingDate)}</span>
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

                            {lead.email && (
                              <button
                                type="button"
                                onClick={() => setMailLead(lead)}
                                className="py-1.5 px-2.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
                                title={`Écrire un e-mail à ${lead.name}`}
                              >
                                <Mail className="w-3 h-3" />
                                <span>E-mail</span>
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
              
              {selectedLeadDrawer.archive && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-300 bg-stone-100 p-3">
                  <p className="text-sm text-stone-800">
                    <strong>🗄️ {selectedLeadDrawer.archive.kind === 'mandat_perdu' ? 'Mandat perdu' : 'Dossier archivé'}</strong> le {frDate(selectedLeadDrawer.archive.date)}
                    {selectedLeadDrawer.archive.reason ? ` • ${selectedLeadDrawer.archive.reason}` : ''}
                  </p>
                  <button type="button" onClick={() => restoreLead(selectedLeadDrawer)} className="text-xs font-bold underline text-stone-800">Réactiver le dossier</button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  id="btn-open-email"
                  onClick={() => setMailLead(selectedLeadDrawer)}
                  className="inline-flex items-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold px-4 py-2.5 shadow-sm"
                >
                  <Mail className="w-4 h-4" />
                  Envoyer un e-mail à {selectedLeadDrawer.name.split(' ')[0]}
                </button>
                {!selectedLeadDrawer.archive && (
                  <button
                    type="button"
                    id="btn-archive-lead"
                    onClick={() => archiveLead(selectedLeadDrawer, 'autre')}
                    className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-sm font-semibold px-4 py-2.5"
                  >
                    🗄️ Archiver
                  </button>
                )}
                {onDeleteLead && (
                  <button
                    type="button"
                    id="btn-delete-lead"
                    onClick={async () => {
                      const l = selectedLeadDrawer;
                      const ok = window.confirm(
                        `Supprimer définitivement le dossier de ${l.name} ?\n\nSont supprimés avec lui : ses e-mails et messages, sa conversation avec l'assistant, ses rendez-vous (le créneau Cal.com est annulé et redevient libre). Cette action est irréversible.`,
                      );
                      if (!ok) return;
                      if (await onDeleteLead(l)) setSelectedLeadDrawer(null);
                    }}
                    className="sm:ml-auto inline-flex items-center gap-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm font-semibold px-4 py-2.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer ce dossier
                  </button>
                )}
                {selectedLeadDrawer.phone && (
                  <a href={`tel:${(selectedLeadDrawer.phone || '').replace(/\s/g, '')}`} className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-sm font-semibold px-4 py-2.5">
                    <Phone className="w-4 h-4" />
                    Appeler
                  </a>
                )}
              </div>

              {/* 1. COORDONNÉES */}
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
                        href={`tel:${(selectedLeadDrawer.phone || '').replace(/\s+/g, '')}`}
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

              {/* 2. PRÉ-VISITE + R1 */}
              <div className="space-y-3">
              <PreVisitBrief
                lead={selectedLeadDrawer}
                onBrief={(brief) => {
                  const updated = { ...selectedLeadDrawer, brief };
                  onUpdateLead?.(updated);
                  setSelectedLeadDrawer(updated);
                }}
              />

                <VisitBox
                  key={`r1-${selectedLeadDrawer.id}-${selectedLeadDrawer.meetingDate || ''}`}
                  title="R1 • Visite d'estimation"
                  idPrefix="r1"
                  value={selectedLeadDrawer.meetingBooked && selectedLeadDrawer.meetingDate ? { date: selectedLeadDrawer.meetingDate, time: selectedLeadDrawer.meetingTime } : undefined}
                  note={selectedLeadDrawer.meetingBooked && !selectedLeadDrawer.visit1 ? 'Réservé en ligne par le client.' : selectedLeadDrawer.visit1 ? 'Ajouté manuellement.' : "Le client n'a pas réservé en ligne : vous pouvez ajouter le R1 à la main."}
                  onSave={(v) => {
                    if (!v && !selectedLeadDrawer.visit1) {
                      window.alert("Ce R1 a été réservé en ligne par le client : il se modifie depuis l'agenda (Cal.com).");
                      return;
                    }
                    const updated = {
                      ...selectedLeadDrawer,
                      visit1: v,
                      meetingBooked: Boolean(v),
                      meetingDate: v?.date,
                      meetingTime: v?.time,
                      meetingType: v ? ('Visite estimation à domicile' as const) : undefined,
                      activities: [{ id: `act-${Date.now()}`, type: 'visit', label: v ? `R1 fixé le ${frDate(v.date)}${v.time ? ` à ${v.time}` : ''}` : 'R1 retiré', date: "À l'instant" }, ...(selectedLeadDrawer.activities || [])],
                    } as Lead;
                    onUpdateLead?.(updated);
                    setSelectedLeadDrawer(updated);
                  }}
                />
              </div>

              {/* 3. R2 */}
              <VisitBox
                key={`r2-${selectedLeadDrawer.id}-${selectedLeadDrawer.visit2?.date || ''}`}
                title="R2 • Seconde visite"
                idPrefix="r2"
                value={selectedLeadDrawer.visit2}
                onSave={(v) => {
                  const updated = {
                    ...selectedLeadDrawer,
                    visit2: v,
                    activities: [{ id: `act-${Date.now()}`, type: 'visit', label: v ? `R2 fixé le ${frDate(v.date)}${v.time ? ` à ${v.time}` : ''}` : 'R2 retiré', date: "À l'instant" }, ...(selectedLeadDrawer.activities || [])],
                  } as Lead;
                  onUpdateLead?.(updated);
                  setSelectedLeadDrawer(updated);
                }}
              />

              {/* 4. MANDAT */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <Award className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                        <span>Mandat</span>
                        {selectedLeadDrawer.mandate?.status === 'signed' && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            selectedLeadDrawer.mandate.type === 'exclusive'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}>
                            {selectedLeadDrawer.mandate.type === 'exclusive' ? 'EXCLUSIF' : 'SIMPLE'}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        {selectedLeadDrawer.mandate?.status === 'signed' ? `Signé le ${frDate(selectedLeadDrawer.mandate.signedDate)}` : 'Simple ou exclusif'}
                      </p>
                    </div>
                  </div>

                  {/* Type de mandat : simple ou exclusif */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {([['simple', 'Mandat simple'], ['exclusive', 'Mandat exclusif']] as const).map(([type, label]) => {
                      const active = selectedLeadDrawer.mandate?.type === type && selectedLeadDrawer.mandate?.status === 'signed';
                      return (
                        <button
                          key={type}
                          type="button"
                          id={`btn-mandate-${type}`}
                          onClick={() => handleUpdateLeadMandate(selectedLeadDrawer, { type, status: 'signed', signedDate: selectedLeadDrawer.mandate?.signedDate || new Date().toISOString().split('T')[0] })}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${active ? 'bg-stone-900 text-white shadow-2xs' : 'bg-white text-stone-800 hover:bg-stone-100 border border-stone-300'}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      id="btn-mandate-lost"
                      onClick={() => archiveLead(selectedLeadDrawer, 'mandat_perdu')}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300"
                    >
                      Mandat perdu
                    </button>
                    {selectedLeadDrawer.mandate?.status === 'signed' && !selectedLeadDrawer.mandate?.soldDate && (
                      <button
                        type="button"
                        onClick={() => handleUpdateLeadMandate(selectedLeadDrawer, { type: 'none', status: 'draft', signedDate: undefined })}
                        className="text-xs underline text-stone-500 px-1"
                      >
                        Retirer le mandat
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* 5. VENTE */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-stone-900">Vente</h4>
                {selectedLeadDrawer.mandate?.status === 'signed' ? (
                  <SaleBox
                    key={selectedLeadDrawer.id + (selectedLeadDrawer.mandate?.soldDate || '')}
                    lead={selectedLeadDrawer}
                    onSave={(soldDate, saleFee, salePrice, ratePercent, saleNetFee) => handleUpdateLeadMandate(selectedLeadDrawer, { soldDate, saleFee, salePrice, feeRatePercent: ratePercent, saleNetFee })}
                  />
                ) : (
                  <p className="text-xs text-stone-500">La vente s'enregistre une fois le mandat signé.</p>
                )}
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
                    Visite confirmée le {frDate(selectedLeadDrawer.meetingDate)} à {selectedLeadDrawer.meetingTime}
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
