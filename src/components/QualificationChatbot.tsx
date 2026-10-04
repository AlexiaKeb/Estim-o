import { renderRichText } from '../utils/richText';
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Lead, ValuationInputs, ValuationResult, AgentPrivacySettings } from '../types';
import { syncLeadToSupabase, invokeQualifyLeadEdgeFunction } from '../lib/supabaseService';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Calendar, 
  Flame, 
  CheckCircle, 
  Clock, 
  RotateCcw, 
  ArrowRight, 
  User, 
  Zap, 
  MailCheck, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Lock, 
  Building2, 
  CheckCircle2, 
  Info, 
  Copy, 
  Check, 
  Download,
  PhoneCall,
  HeartHandshake,
  UserCheck
} from 'lucide-react';

interface Props {
  initialValuationInputs?: ValuationInputs | null;
  initialValuationResult?: ValuationResult | null;
  privacySettings?: AgentPrivacySettings;
  existingLeadId?: string;
  isAgentMode?: boolean;
  onBookMeeting: (leadInfo: Partial<Lead>) => void;
  onSaveLead: (lead: Lead) => void;
  onBackToSimulator: () => void;
  onOpenPrivacySettings?: () => void;
}

export const QualificationChatbot: React.FC<Props> = ({
  initialValuationInputs,
  initialValuationResult,
  privacySettings,
  existingLeadId,
  isAgentMode = false,
  onBookMeeting,
  onSaveLead,
  onBackToSimulator,
  onOpenPrivacySettings,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [qualificationScore, setQualificationScore] = useState<number>(35);
  const [leadStatus, setLeadStatus] = useState<'HOT' | 'WARM' | 'COLD'>('WARM');
  const [isQualified, setIsQualified] = useState(false);
  
  // Real Supabase Lead ID tracked for edge function execution
  const [supabaseLeadId, setSupabaseLeadId] = useState<string | null>(null);

  // View mode: 'prospect' (what the vendor sees - 100% sanitized/masked) vs 'supervisor' (internal agent telemetry)
  const [viewMode, setViewMode] = useState<'prospect' | 'supervisor'>('prospect');

  const [collectedData, setCollectedData] = useState<Record<string, any>>({
    propertyType: initialValuationInputs?.propertyType === 'apartment' ? 'Appartement' : 'Maison',
    surface: initialValuationInputs?.surface || 75,
    city: initialValuationInputs?.city || 'Lyon',
    estimatedValue: initialValuationResult?.estimatedAvg || 350000,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // One seller = one lead: reuse the lead created by the simulator. Only a visitor who opens the chat
  // directly (no simulation yet) gets a new lead, and only once.
  const createdOwnLead = useRef(false);
  useEffect(() => {
    if (existingLeadId) {
      setSupabaseLeadId(existingLeadId);
      return;
    }
    if (createdOwnLead.current) return;
    createdOwnLead.current = true;
    syncLeadToSupabase({
      name: 'Visiteur Simulateur',
      propertyType: initialValuationInputs?.propertyType === 'apartment' ? 'Appartement' : 'Maison',
      surface: initialValuationInputs?.surface || 75,
      city: initialValuationInputs?.city || 'Lyon',
      score: 35,
      status: 'WARM',
      estimatedValue: initialValuationResult?.estimatedAvg,
    }).then((createdLeadId) => {
      if (createdLeadId) setSupabaseLeadId(createdLeadId);
    });
  }, [existingLeadId]);

  // Initialize conversation with warm human tone
  useEffect(() => {
    const propertyLabel = initialValuationInputs?.propertyType === 'apartment' ? 'appartement' : 'maison';
    const cityLabel = initialValuationInputs?.city || 'votre commune';
    const surfaceLabel = initialValuationInputs?.surface ? `${initialValuationInputs.surface} m²` : '';

    const welcomeText = initialValuationResult
      ? `Bonjour et merci pour votre simulation ! Pour votre ${propertyLabel} ${surfaceLabel} à ${cityLabel}, la fourchette indicative est de **${initialValuationResult.lowPrice.toLocaleString('fr-FR')} € à ${initialValuationResult.highPrice.toLocaleString('fr-FR')} €**.\n\nC'est un repère : seule une visite permet d'affiner. Je prépare la vôtre avec Céline, en quelques questions.\n\nPour commencer, quel est le contexte de votre projet ?`
      : `Bonjour et bienvenue ! Je prépare votre estimation avec Céline, en quelques questions.\n\nQuel type de bien souhaitez-vous valoriser, et dans quelle commune ?`;

    setMessages([
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        qualificationData: {
          score: 35,
          status: 'WARM',
        },
      },
    ]);
  }, [initialValuationInputs, initialValuationResult]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const [copiedChat, setCopiedChat] = useState(false);

  const getChatTranscript = () => {
    const header = `=====================================================
SYNTHÈSE DE L'ÉTUDE D'ESTIMATION - AGENT ESTIMATION
Date : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
Bien : ${collectedData.propertyType || 'Bien'} ${collectedData.surface ? `• ${collectedData.surface} m²` : ''} à ${collectedData.city || 'Secteur'}
Valorisation indicative : ${collectedData.estimatedValue ? Number(collectedData.estimatedValue).toLocaleString('fr-FR') + ' €' : 'En cours'}
-----------------------------------------------------\n`;

    const body = messages
      .map((m) => {
        const speaker = m.role === 'assistant' ? '🏢 CONSEILLÈRE CÉLINE' : '👤 PROSPECT';
        return `[${m.timestamp || 'Message'}] ${speaker} :\n${m.content}\n`;
      })
      .join('\n');

    return header + body + '\n=====================================================';
  };

  const handleCopyChat = () => {
    const text = getChatTranscript();
    navigator.clipboard.writeText(text);
    setCopiedChat(true);
    setTimeout(() => setCopiedChat(false), 2500);
  };

  const handleDownloadChat = () => {
    const text = getChatTranscript();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Synthese_Estimation_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Detect nonsense, gibberish or off-topic spam input
  const isClientGibberish = (text: string) => {
    const clean = text.trim().toLowerCase();
    if (!clean) return true;
    if (/(.)\1{4,}/.test(clean)) return true;
    if (/^(ha|he|hi|ho|lol|mdr|ptdr){2,}$/i.test(clean)) return true;
    if (/^[bcdfghjklmnpqrstvwxz]{3,}$/i.test(clean)) return true;
    const knownKeys = ["asdf", "qwert", "azerty", "wxcv", "poiuy", "lkjh", "ghjk", "dsfsd", "test", "blabla", "nawak", "prout", "balek", "osef"];
    if (knownKeys.some(k => clean === k || (clean.length < 12 && clean.includes(k)))) return true;
    if (clean.length <= 2 && !["1", "2", "3", "4", "5", "ok", "si", "ou"].includes(clean)) return true;
    return false;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = textToSend || inputMessage.trim();
    if (!content || isTyping) return;

    const startTime = Date.now();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setIsTyping(true);

    // Human-like typing delay helper (at least 1.6s to 2.8s)
    const ensureTypingDelay = async (replyLen: number = 100) => {
      const targetDelay = Math.min(2600, Math.max(1600, 1200 + replyLen * 8));
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDelay) {
        await new Promise((resolve) => setTimeout(resolve, targetDelay - elapsed));
      }
    };

    // Immediate recadrage if gibberish is entered
    if (isClientGibberish(content)) {
      const userMsgs = newHistory.filter((m) => m.role === 'user');
      const count = userMsgs.length;
      const city = collectedData.city || 'votre secteur';

      let recadreText = `Je ne suis pas sûre d'avoir bien saisi votre message ☺️\n\nPour que notre échange vous soit réellement utile et que nous puissions valoriser votre bien à ${city}, quel est le motif principal de votre démarche ? (Par exemple : agrandissement, mutation, succession ou nouveau projet ?)`;
      if (count === 2) {
        recadreText = `Je ne suis pas certaine d'avoir compris ☺️\n\nPour vous conseiller au plus juste pour votre bien à ${city}, avez-vous déjà consulté une agence ou s'agit-il d'une première démarche ?`;
      } else if (count >= 3) {
        recadreText = `Je n'ai pas bien saisi votre message ☺️\n\nPour convenir d'une visite de découverte en toute simplicité (ou joindre directement Céline au 06 03 58 03 16), quel est le moment qui vous conviendrait le mieux ?`;
      }

      await ensureTypingDelay(recadreText.length);

      const gibberishBotMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: recadreText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        qualificationData: {
          score: Math.max(40, qualificationScore),
          status: leadStatus,
          recommendedAction: 'CONTINUE_QUESTIONS',
        },
      };

      setMessages((prev) => [...prev, gibberishBotMsg]);
      setIsTyping(false);
      return;
    }

    // 1. Try real Supabase qualify-lead Edge Function if leadId is available
    let edgeSuccess = false;

    if (supabaseLeadId) {
      try {
        const edgeRes = await invokeQualifyLeadEdgeFunction(supabaseLeadId, content);
        if (edgeRes && edgeRes.message_a_afficher) {
          edgeSuccess = true;
          const replyContent = edgeRes.message_a_afficher;
          const newScore = edgeRes.score_qualification || (edgeRes.lead_chaud ? 90 : 50);
          const newStatus = edgeRes.lead_chaud || newScore >= 75 ? 'HOT' : newScore >= 50 ? 'WARM' : 'COLD';

          await ensureTypingDelay(replyContent.length);

          setQualificationScore(newScore);
          setLeadStatus(newStatus);

          if (edgeRes.donnees_extraites) {
            setCollectedData((prev) => ({
              ...prev,
              ...edgeRes.donnees_extraites,
            }));
          }

          if (edgeRes.conversation_terminee || edgeRes.lead_chaud || newScore >= 75) {
            setIsQualified(true);
          }

          const botMsg: ChatMessage = {
            id: `bot-${Date.now()}`,
            role: 'assistant',
            content: replyContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            qualificationData: {
              score: newScore,
              status: newStatus,
              extracted: edgeRes.donnees_extraites,
              recommendedAction: (edgeRes.lead_chaud ? 'BOOK_MEETING' : 'CONTINUE_QUESTIONS') as any,
            },
          };

          setMessages((prev) => [...prev, botMsg]);
          setIsTyping(false);
          return;
        }
      } catch (e) {
        console.warn('qualify-lead Edge Function attempt returned error, falling back to server API:', e);
      }
    }

    // 2. Fallback to /api/chat-qualify (server-side Claude)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/chat-qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          leadData: collectedData,
          leadId: supabaseLeadId,
        }),
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      const newScore = data.qualificationScore || Math.min(100, qualificationScore + 20);
      const newStatus = data.leadStatus || (newScore >= 75 ? 'HOT' : newScore >= 50 ? 'WARM' : 'COLD');
      
      const replyContent = data.reply || "Merci pour ces précisions. Votre dossier d'estimation a bien été préparé.";
      
      // Natural typing time delay
      await ensureTypingDelay(replyContent.length);

      setQualificationScore(newScore);
      setLeadStatus(newStatus);

      if (data.extractedData) {
        setCollectedData((prev) => ({
          ...prev,
          ...data.extractedData,
        }));
      }

      const isMeetingReady = data.recommendedAction === 'BOOK_MEETING' || newScore >= 75;
      if (isMeetingReady) {
        setIsQualified(true);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        qualificationData: {
          score: newScore,
          status: newStatus,
          extracted: data.extractedData,
          recommendedAction: data.recommendedAction,
        },
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('Chat request handled with client-side fallback:', error);

      // Intelligent Client-Side Fallback based on message count & keywords
      const userMsgs = newHistory.filter(m => m.role === 'user');
      const count = userMsgs.length;
      const lower = content.toLowerCase();

      let reply = "";
      let score = 50 + count * 15;
      let status: 'HOT' | 'WARM' | 'COLD' = 'WARM';

      if (lower.includes('email') || lower.includes('mail') || lower.includes('envoyer') || lower.includes('dossier')) {
        reply = `Je comprends tout à fait votre souhait de recevoir les éléments rapidement ! Cependant, un simple envoi automatique par e-mail ne refléterait pas la vraie valeur de votre bien.\n\nUne estimation juste ne se résume pas à des algorithmes froids : une simple visite de découverte sans engagement avec Céline (ou joignable au 06 03 58 03 16) permet de faire connaissance, d'évoquer les éventuels travaux, charges ou taxe foncière, et de confier l'analyse à notre équipe d'experts.\n\nCette visite est 100% offerte et sans aucun document requis. Avez-vous déjà consulté une autre agence pour ce bien ?`;
        score = 80;
        status = 'WARM';
      } else if (count === 1) {
        reply = `Merci infiniment pour ce partage. C'est un très beau projet et votre bien présente un potentiel remarquable sur votre secteur ! Avez-vous déjà consulté une agence immobilière ou fait réaliser une première estimation pour ce bien ?`;
        score = 55;
      } else if (count === 2) {
        reply = `C'est très clair et parfaitement noté. Sous quel horizon de temps souhaiteriez-vous idéalement concrétiser cette vente ou avancer dans votre projet (urgent sous 1 mois, 1 à 3 mois, ou simple réflexion) ?`;
        score = 70;
      } else if (count === 3) {
        reply = `Superbe ! Pour aller au-delà de cette simulation indicative et évaluer la valeur exacte de votre bien en équipe, une visite de découverte sur place permet de faire connaissance et de découvrir les lieux en toute sérénité.\n\nSeriez-vous disponible pour convenir d'une visite de découverte avec Céline (ou la joindre directement au 06 03 58 03 16) ?`;
        score = 85;
        status = 'HOT';
      } else {
        reply = `Merci pour ces précieux échanges ! Votre bien bénéficie d'une vraie attractivité sur votre secteur. Pour finaliser notre évaluation en équipe, je vous propose de fixer une visite de découverte (100% offerte, sans engagement et sans paperasse) avec Céline (joignable au 06 03 58 03 16).\n\nVous pouvez choisir votre créneau privilégié ci-dessous :`;
        score = 92;
        status = 'HOT';
      }

      if (lower.includes('oui') || lower.includes('disponible') || lower.includes('créneau') || lower.includes('visite') || lower.includes('rdv') || count >= 3) {
        setIsQualified(true);
        status = 'HOT';
        score = Math.max(score, 85);
      }

      await ensureTypingDelay(reply.length);

      setQualificationScore(Math.min(100, score));
      setLeadStatus(status);

      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        qualificationData: {
          score,
          status,
          recommendedAction: status === 'HOT' ? 'BOOK_MEETING' : 'CONTINUE_QUESTIONS',
        },
      };

      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickReply = (text: string) => {
    handleSendMessage(text);
  };

  const triggerCalendar = () => {
    onBookMeeting({
      propertyType: collectedData.propertyType || 'Appartement',
      surface: collectedData.surface || 75,
      city: collectedData.city || collectedData.location || 'Lyon',
      address: collectedData.city ? `Secteur ${collectedData.city}` : 'Lyon et agglomération',
      estimatedValue: collectedData.estimatedValue || 350000,
      motive: collectedData.motive || 'Agrandissement',
      timeframe: collectedData.timeframe || '1-3 mois',
      score: qualificationScore,
      status: leadStatus,
      conversationHistory: messages,
      lastAction: {
        type: 'chat',
        label: 'Chat de qualification complété avec succès',
        date: 'À l\'instant',
      },
      tasks: [
        { id: `t-${Date.now()}-1`, label: 'Simulation & coordonnées validées', done: true, category: 'qualification' },
        { id: `t-${Date.now()}-2`, label: 'Qualification conversationnelle IA terminée', done: true, category: 'qualification' },
        { id: `t-${Date.now()}-3`, label: 'Visite sur place à fixer avec le conseiller', done: false, category: 'rdv' },
        { id: `t-${Date.now()}-4`, label: 'Préparer l\'étude comparative DVF in situ', done: false, category: 'preparation' },
        { id: `t-${Date.now()}-5`, label: 'Effectuer la visite sur place & remettre l\'avis', done: false, category: 'rdv' },
      ],
      activities: [
        { id: `act-${Date.now()}`, type: 'chat', label: 'Échange chat IA qualifié', date: 'À l\'instant' }
      ]
    });
  };

  const handleSaveToNurture = () => {
    const lead: Lead = {
      id: `lead-${Date.now()}`,
      name: 'Prospect Qualifié en Réflexion',
      phone: '06 03 58 03 16',
      email: 'prospect@suivi.immo',
      address: collectedData.city ? `Secteur ${collectedData.city}` : 'Lyon',
      propertyType: collectedData.propertyType || 'Appartement',
      surface: collectedData.surface || 75,
      city: collectedData.city || 'Lyon',
      estimatedValue: collectedData.estimatedValue || 350000,
      motive: collectedData.motive || 'Autre',
      timeframe: collectedData.timeframe || '3-6 mois',
      status: leadStatus,
      score: qualificationScore,
      meetingBooked: false,
      nurtureStep: 'Séquence 6 semaines activée (J+1)',
      createdAt: 'À l\'instant',
      conversationHistory: messages,
      lastAction: {
        type: 'sms',
        label: 'Lead inscrit dans la séquence d\'accompagnement (SMS J+1 programmé)',
        date: 'À l\'instant',
      },
      tasks: [
        { id: `t-${Date.now()}-1`, label: 'Simulation en ligne & scoring complétés', done: true, category: 'qualification' },
        { id: `t-${Date.now()}-2`, label: 'Envoi du premier SMS récapitulatif J+1', done: false, dueDate: 'Demain', category: 'preparation' },
        { id: `t-${Date.now()}-3`, label: 'Relance téléphonique pour proposer visite sans engagement', done: false, dueDate: 'J+3', category: 'rdv' },
      ],
      activities: [
        { id: `act-${Date.now()}`, type: 'chat', label: 'Simulation enregistrée via le chatbot', date: 'À l\'instant' }
      ]
    };
    onSaveLead(lead);
  };

  // Quick suggestion chips based on progress
  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  let suggestionChips: string[] = [];
  if (userMsgCount === 0) {
    suggestionChips = [
      'Agrandissement familial',
      'Mutation professionnelle',
      'Succession / Héritage',
      'Vente d\'un investissement',
    ];
  } else if (userMsgCount === 1) {
    suggestionChips = [
      'Non, vous êtes les premiers consultés',
      'Oui, nous avons déjà une estimation d\'agence',
      'Nous comparons différentes estimations',
    ];
  } else if (userMsgCount === 2) {
    suggestionChips = [
      'Dans moins d\'un mois (urgent)',
      'D\'ici 1 à 3 mois',
      'D\'ici 3 à 6 mois',
      'Simple réflexion pour l\'instant',
    ];
  } else if (userMsgCount === 3) {
    suggestionChips = [
      'Disponible pour une visite de découverte sans engagement',
      'Je préfère appeler Céline au 06 03 58 03 16',
      'Pouvez-vous m\'envoyer le dossier par email ?',
    ];
  }

  const brandTitle = privacySettings?.publicBrandName || "Service d'Estimation & Qualification Immobilière";

  // Force prospect mode if not authenticated as agent
  const currentEffectiveViewMode = isAgentMode ? viewMode : 'prospect';

  return (
    <div id="qualification-chatbot-container" className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in">
      {/* Privacy Mode Switcher & Shield Alert (ONLY visible in authenticated Agent Mode) */}
      {isAgentMode && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Mode Superviseur Conseiller
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  Session Agent Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Vous observez le tunnel de qualification. Le prospect ne voit que la version épurée ci-dessous.
              </p>
            </div>
          </div>

          {/* Segmented View Mode Controller */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center gap-1 w-full sm:w-auto">
              <button
                type="button"
                id="btn-view-mode-prospect"
                onClick={() => setViewMode('prospect')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'prospect'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Vue Prospect</span>
              </button>

              <button
                type="button"
                id="btn-view-mode-supervisor"
                onClick={() => setViewMode('supervisor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'supervisor'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Vue Superviseur</span>
              </button>
            </div>

            {onOpenPrivacySettings && (
              <button
                type="button"
                onClick={onOpenPrivacySettings}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Paramètres de confidentialité"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Container Header */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-2xs p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {currentEffectiveViewMode === 'prospect' ? (
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-base shadow-2xs border border-stone-800">
                C
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-2xs">
              <Bot className="w-5 h-5" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-stone-900">
                {currentEffectiveViewMode === 'prospect' ? 'Céline • Votre Conseillère Immobilière' : 'Console Superviseur : Agent IA'}
              </h2>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5 font-normal">
              {currentEffectiveViewMode === 'prospect'
                ? 'Accompagnement personnalisé • Échange confidentiel & sans engagement'
                : 'Scoring temps réel • Extraction de données • Synchronisation CRM'}
            </p>
          </div>
        </div>

        {/* Right Header: In Prospect Mode, show direct phone contact for Céline. In Supervisor Mode, show lead scoring */}
        {currentEffectiveViewMode === 'prospect' ? (
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            <a
              href="tel:0603580316"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition-all font-medium text-xs shadow-2xs"
              title="Appeler directement Céline"
            >
              <PhoneCall className="w-3.5 h-3.5 text-stone-600" />
              <span>Joindre Céline : 06 03 58 03 16</span>
            </a>

            <button
              type="button"
              onClick={onBackToSimulator}
              className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors border border-stone-200"
              title="Modifier mes critères d'estimation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
                Score Dossier
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-bold text-stone-900">{qualificationScore}/100</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                    leadStatus === 'HOT'
                      ? 'bg-amber-50 text-amber-900 border border-amber-200 font-semibold'
                      : leadStatus === 'WARM'
                      ? 'bg-stone-100 text-stone-700 border border-stone-200'
                      : 'bg-stone-50 text-stone-500 border border-stone-200'
                  }`}
                >
                  {leadStatus === 'HOT' && <Flame className="w-3 h-3 text-amber-600 fill-amber-600" />}
                  {leadStatus === 'WARM' && <Clock className="w-3 h-3 text-stone-500" />}
                  {leadStatus === 'HOT' ? 'LEAD CHAUD' : leadStatus === 'WARM' ? 'LEAD TIÈDE' : 'LEAD FROID'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onBackToSimulator}
              className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors border border-stone-200"
              title="Revenir au simulateur"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Box */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-2xs flex flex-col h-[560px] overflow-hidden">
        {/* Chat Utility Bar */}
        <div className="bg-stone-50/80 px-4 py-2 border-b border-stone-200/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-stone-600 font-normal text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{isAgentMode ? `${messages.length} message${messages.length > 1 ? 's' : ''} échangé${messages.length > 1 ? 's' : ''}` : 'Céline est en ligne · réponse immédiate'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isAgentMode ? (
              <>
            <button
              type="button"
              id="btn-copy-live-chat"
              onClick={handleCopyChat}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all ${
                copiedChat
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs'
              }`}
              title="Copier toute la conversation"
            >
              {copiedChat ? (
                <>
                  <Check className="w-3 h-3 text-white" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-stone-400" />
                  <span>Copier</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="btn-download-live-chat"
              onClick={handleDownloadChat}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1 transition-all shadow-2xs"
              title="Télécharger la conversation au format texte"
            >
              <Download className="w-3 h-3 text-stone-400" />
              <span>Télécharger .txt</span>
            </button>
              </>
            ) : (
              <button
                type="button"
                id="btn-chat-book-now"
                onClick={triggerCalendar}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-stone-900 text-white hover:bg-stone-800 flex items-center gap-1.5 transition-colors"
              >
                Réserver ma visite sans attendre
                <span aria-hidden>→</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-stone-50/30">
          {messages.map((msg) => {
            const isBot = msg.role === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[88%] md:max-w-[78%] ${
                  isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                    isBot
                      ? currentEffectiveViewMode === 'prospect'
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-800 text-white shadow-2xs'
                      : 'bg-stone-200 text-stone-800 shadow-2xs'
                  }`}
                >
                  {isBot ? (
                    currentEffectiveViewMode === 'prospect' ? 'C' : <Bot className="w-3.5 h-3.5" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="space-y-1">
                  <div
                    className={`rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                      isBot
                        ? 'bg-white border border-stone-200/90 text-stone-800 shadow-2xs'
                        : 'bg-stone-900 text-stone-100 shadow-2xs'
                    }`}
                  >
                    <p className="whitespace-pre-line font-normal">{renderRichText(msg.content)}</p>
                  </div>
                  <span className={`text-[10px] text-stone-400 block ${isBot ? 'text-left' : 'text-right'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3 mr-auto max-w-[80%] items-center animate-in fade-in duration-300">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs shadow-2xs ${
                  currentEffectiveViewMode === 'prospect'
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'bg-stone-800 text-white'
                }`}
              >
                {currentEffectiveViewMode === 'prospect' ? 'C' : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className="bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 shadow-2xs flex items-center gap-2">
                <span className="text-xs text-stone-500 font-normal italic">
                  {currentEffectiveViewMode === 'prospect' ? "Céline est en train d'écrire..." : "Rédaction en cours..."}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Prospect-facing vs Supervisor completion banner */}
        {isQualified && (
          <div className="bg-emerald-50/80 border-t border-b border-emerald-200 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3 text-emerald-900 text-xs md:text-sm font-medium">
              <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-emerald-950">
                  {viewMode === 'prospect'
                    ? 'Votre étude comparative personnalisée est prête !'
                    : `Lead Qualifié "Chaud" (${qualificationScore}/100)`}
                </div>
                <div className="text-emerald-800 text-xs font-normal">
                  {viewMode === 'prospect'
                    ? 'Réservez votre visite de découverte ou contactez Céline au 06 03 58 03 16.'
                    : 'Le prospect remplit les critères d\'intention de vente.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                id="btn-book-calendar-hot-lead"
                onClick={triggerCalendar}
                className="w-full sm:w-auto py-2 px-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg shadow-2xs transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-3.5 h-3.5 text-stone-300" />
                <span>
                  {viewMode === 'prospect'
                    ? 'Choisir mon créneau de visite gratuite'
                    : 'Proposer un créneau de visite sur place'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        {suggestionChips.length > 0 && !isTyping && (
          <div className="px-4 py-2 bg-white border-t border-stone-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
              <Zap className="w-3 h-3 text-stone-400" />
              Suggestions :
            </span>
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickReply(chip)}
                className="px-2.5 py-1 rounded-md bg-stone-100/80 hover:bg-stone-200 text-stone-700 text-xs font-normal whitespace-nowrap border border-stone-200 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 md:p-3.5 bg-white border-t border-stone-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              id="input-chat-message"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Écrivez votre réponse ici..."
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-stone-200 text-xs sm:text-sm text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 transition-colors font-normal"
            />

            <button
              type="submit"
              id="btn-send-chat"
              disabled={!inputMessage.trim() || isTyping}
              className="py-2.5 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 active:bg-black text-white text-xs sm:text-sm font-medium transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-2xs"
            >
              <span>Envoyer</span>
              <Send className="w-3.5 h-3.5 text-stone-300" />
            </button>
          </form>
        </div>
      </div>

      {/* Internal Routing Action Cards (Visible ONLY in Supervisor Mode so prospects never see backend logic) */}
      {viewMode === 'supervisor' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
          {/* Branch 1: Calendar direct */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                Branche A : Leads Chauds (&lt; 3 mois)
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-1">Prise de RDV Automatique Cal.com</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Le bot pousse directement les créneaux disponibles de l'agent immobilier uniquement lorsque le dossier est jugé mature.
              </p>
            </div>

            <button
              type="button"
              onClick={triggerCalendar}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Ouvrir le module de réservation d'agenda</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Branch 2: Nurture Sequence */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                <MailCheck className="w-4 h-4" />
                Branche B : Leads Non-Mûrs (&gt; 3 mois)
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-1">Routage vers Séquence Nurture (6-8 sem.)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ne perdez plus aucun lead tiède : intégrez le prospect dans la boucle automatisée de relance personnalisée avec contenu de valeur.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveToNurture}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span>Activer la séquence de nurture pour ce prospect</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
