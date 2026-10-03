import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Sparkles, 
  Layers, 
  Bot, 
  Calendar, 
  MailCheck, 
  Calculator, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  Menu, 
  X,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Flame,
  Lock,
  Unlock,
  Eye,
  LogOut,
  Sliders,
  Settings,
  ChevronRight
} from 'lucide-react';
import { ValuationInputs, ValuationResult, Lead, AgentPrivacySettings } from './types';
import { INITIAL_LEADS } from './data/mockLeads';
import { LandingSimulator } from './components/LandingSimulator';
import { QualificationChatbot } from './components/QualificationChatbot';
import { CrmPipelineView } from './components/CrmPipelineView';
import { NurtureEngineView } from './components/NurtureEngineView';
import { KpiRoiCalculator } from './components/KpiRoiCalculator';
import { CalendarBookingModal } from './components/CalendarBookingModal';
import { BookingConfirmationView } from './components/BookingConfirmationView';
import { PrivacyShieldModal } from './components/PrivacyShieldModal';
import { AgentAuthModal } from './components/AgentAuthModal';

type NavView = 'landing' | 'chat' | 'confirmation' | 'pipeline' | 'nurture' | 'calculator';

export default function App() {
  // Agent Authentication & View Mode State - Default to authenticated pro mode for immediate dashboard view
  const [isAgentAuthenticated, setIsAgentAuthenticated] = useState<boolean>(() => {
    // Visitors are sellers by default: the agent space only opens with an explicit, remembered login
    return localStorage.getItem('estimeo_agent_session') === 'true';
  });
  const [isAgentMode, setIsAgentMode] = useState<boolean>(() => {
    return localStorage.getItem('estimeo_agent_session') === 'true' &&
      typeof window !== 'undefined' && /^\/(agent|pro|conseiller|admin)\/?$/i.test(window.location.pathname);
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Logo secret multi-click counter
  const [logoClicks, setLogoClicks] = useState(0);

  // Active view - Default to CRM Pipeline Dashboard
  const [currentView, setCurrentView] = useState<NavView>(() => {
    return localStorage.getItem('estimeo_agent_session') === 'true' &&
      typeof window !== 'undefined' && /^\/(agent|pro|conseiller|admin)\/?$/i.test(window.location.pathname)
      ? 'pipeline'
      : 'landing';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Privacy & Stealth Settings
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<AgentPrivacySettings>(() => {
    const saved = localStorage.getItem('estimeo_privacy_settings') || localStorage.getItem('valoria_privacy_settings') || localStorage.getItem('estival_privacy_settings') || localStorage.getItem('mandatflow_privacy_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.publicBrandName && (parsed.publicBrandName.includes('MandatFlow') || parsed.publicBrandName.includes('EstiVal') || parsed.publicBrandName.includes('Valoria'))) {
          parsed.publicBrandName = "Estiméo • Estimation & Valorisation Sur-Mesure";
        }
        if (parsed.hidePublicLoginButton === undefined) {
          parsed.hidePublicLoginButton = true;
        }
        if (!parsed.stealthLoginToken) {
          parsed.stealthLoginToken = 'pro-conseil-2026';
        }
        if (!parsed.agentPassword) {
          parsed.agentPassword = 'Estimeo2026!';
        }
        if (!parsed.agentEmail) {
          parsed.agentEmail = 'celine@estimeo.fr';
        }
        return parsed;
      } catch {
        // fallback
      }
    }
    return {
      hidePersonalIdentity: true,
      publicBrandName: "Estiméo • Estimation & Valorisation Sur-Mesure",
      publicContactEmail: "contact@estimeo-immobilier.fr",
      publicContactPhone: "06 03 58 03 16 (Céline - Conseillère référente)",
      hideInternalScoringFromProspect: true,
      stealthModeEnabled: true,
      customPrivacyDisclaimer: "Données protégées sous secret professionnel et conformité RGPD.",
      agentPinCode: "1234",
      agentPassword: "Estimeo2026!",
      agentEmail: "celine@estimeo.fr",
      stealthLoginToken: "pro-conseil-2026",
      hidePublicLoginButton: true,
      sessionTimeoutMinutes: 30,
    };
  });

  // Helper to determine if a pathname matches the agent portal
  const isAgentPath = (path: string, slug = 'agent') => {
    const clean = path.toLowerCase().replace(/\/+$/, '');
    const normalizedSlug = slug.toLowerCase().replace(/^\/+|\/+$/g, '');
    return (
      clean === '/agent' ||
      clean === '/pro' ||
      clean === '/conseiller' ||
      clean === '/admin' ||
      clean === `/${normalizedSlug}`
    );
  };

  // Check for /agent path or stealth URL parameters on initial mount and route accordingly
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const customSlug = privacySettings.customAgentSlug || 'agent';

    const isDirectAgentUrl = isAgentPath(pathname, customSlug);
    const proParam = urlParams.get('pro') || urlParams.get('agent') || urlParams.get('access') || urlParams.get('secret');
    const hasProFlag = urlParams.has('pro') || urlParams.has('agent') || hash.includes('pro') || hash.includes('access');

    const isCurrentAuth = localStorage.getItem('estimeo_agent_session') === 'true' || localStorage.getItem('mandatflow_agent_session') === 'true';

    // 1. Direct /agent URL access
    if (isDirectAgentUrl) {
      if (isCurrentAuth) {
        setIsAgentAuthenticated(true);
        setIsAgentMode(true);
        setCurrentView('pipeline');
        showToast('Espace Conseiller (/agent) : Session active connectée.');
      } else {
        setIsAuthModalOpen(true);
        showToast('🔒 Espace Conseiller : Entrez votre code PIN ou vos identifiants.');
      }
    } 
    // 2. Stealth parameter access (?pro=...)
    else if (proParam || hasProFlag) {
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (err) {
        // Ignore history replace errors
      }

      if (isCurrentAuth) {
        setIsAgentMode(true);
        setCurrentView('pipeline');
        showToast('Accès Pro Sécurisé : Session active restaurée.');
      } else {
        setIsAuthModalOpen(true);
        showToast('🔒 Accès Espace Conseiller détecté. URL nettoyée pour votre sécurité.');
      }
    }

    // Popstate listener for browser back/forward buttons
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (isAgentPath(currentPath, customSlug)) {
        const auth = localStorage.getItem('estimeo_agent_session') === 'true';
        if (auth) {
          setIsAgentMode(true);
          setCurrentView('pipeline');
        } else {
          setIsAuthModalOpen(true);
        }
      } else if (currentPath === '/' || currentPath === '') {
        setIsAgentMode(false);
        setCurrentView('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [privacySettings.customAgentSlug]);

  // Reconcile with Cal.com whenever the advisor opens the pipeline (cancellations / reschedules)
  useEffect(() => {
    if (currentView === 'pipeline' && isAgentMode) {
      fetch('/api/cal/sync', { method: 'POST' }).catch(() => {});
    }
  }, [currentView, isAgentMode]);

  // Global Keyboard Shortcut: Ctrl + Shift + P or Cmd + Shift + P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (isAgentAuthenticated) {
          setIsAgentMode((prev) => !prev);
          setCurrentView((prev) => (prev === 'pipeline' ? 'landing' : 'pipeline'));
          showToast('Bascule rapide Espace Conseiller / Vue Vendeur');
        } else {
          setIsAuthModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAgentAuthenticated]);

  // Logo secret triple-click handler
  const handleLogoSecretClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        if (isAgentAuthenticated) {
          setIsAgentMode(true);
          setCurrentView('pipeline');
          showToast('Espace Conseiller activé via accès discret.');
        } else {
          setIsAuthModalOpen(true);
        }
        return 0;
      }
      return next;
    });

    setTimeout(() => {
      setLogoClicks(0);
    }, 2000);
  };

  const handleUpdatePrivacySettings = (newSettings: AgentPrivacySettings) => {
    setPrivacySettings(newSettings);
    localStorage.setItem('estimeo_privacy_settings', JSON.stringify(newSettings));
    showToast('Paramètres mis à jour : vos données et votre code secret sont enregistrés.');
  };

  // Shared state
  const [valuationInputs, setValuationInputs] = useState<ValuationInputs | null>(null);
  const [valuationResult, setValuationResult] = useState<ValuationResult | null>(null);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);

  // Booking modal
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingLeadInfo, setBookingLeadInfo] = useState<Partial<Lead> | null>(null);
  const [latestConfirmedLead, setLatestConfirmedLead] = useState<Lead | null>(null);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedLeadForNurtureId, setSelectedLeadForNurtureId] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
  };

  const handleNavigateToNurture = (leadId: string) => {
    setSelectedLeadForNurtureId(leadId);
    handleNavigate('nurture');
  };

  // Login handler
  const handleAuthSuccess = (rememberSession: boolean) => {
    setIsAgentAuthenticated(true);
    setIsAgentMode(true);
    if (rememberSession) {
      localStorage.setItem('estimeo_agent_session', 'true');
      localStorage.setItem('mandatflow_agent_session', 'true');
    }
    const slug = privacySettings.customAgentSlug || 'agent';
    try {
      window.history.pushState(null, '', `/${slug}`);
    } catch {
      // Ignore
    }
    setCurrentView('pipeline');
    showToast('Authentification réussie ! Bienvenue dans votre Espace Agent sécurisé (/agent).');
  };

  // Logout / Lock handler
  const handleLockAgentMode = () => {
    setIsAgentAuthenticated(false);
    setIsAgentMode(false);
    localStorage.removeItem('estimeo_agent_session');
    localStorage.removeItem('mandatflow_agent_session');
    try {
      window.history.pushState(null, '', '/');
    } catch {
      // Ignore
    }
    setCurrentView('landing');
    showToast('Session verrouillée. Retour à l\'interface publique vendeur.');
  };

  // Safe navigation switcher
  const handleNavigate = (view: NavView) => {
    const isInternalAgentView = ['pipeline', 'nurture', 'calculator'].includes(view);

    if (isInternalAgentView && !isAgentAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (isInternalAgentView) {
      const slug = privacySettings.customAgentSlug || 'agent';
      try {
        window.history.pushState(null, '', `/${slug}`);
      } catch {
        // Ignore
      }
    } else if (view === 'landing' && !isAgentMode) {
      try {
        window.history.pushState(null, '', '/');
      } catch {
        // Ignore
      }
    }

    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  // Handler when user finishes valuation in simulator
  const handleValuationComplete = (inputs: ValuationInputs, result: ValuationResult) => {
    setValuationInputs(inputs);
    setValuationResult(result);
    setCurrentView('chat');
    showToast('Simulation validée ! Finalisation de votre étude d\'estimation personnalisée...');
  };

  // Handler when lead qualifies for booking
  const handleOpenBooking = (leadInfo: Partial<Lead>) => {
    setBookingLeadInfo(leadInfo);
    setIsBookingOpen(true);
  };

  // Handler when meeting is confirmed
  const handleConfirmBooking = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
    setLatestConfirmedLead(newLead);
    setIsBookingOpen(false);

    if (isAgentMode) {
      showToast(`Rendez-vous confirmé pour ${newLead.name} ! Synchronisation CRM effectuée.`);
      setCurrentView('pipeline');
    } else {
      showToast(`✅ Merci ${newLead.name}, votre rendez-vous d'estimation est confirmé !`);
      setCurrentView('confirmation');
    }
  };

  // Handler when lead is captured in simulator before showing price
  const handleSimulatorLeadCaptured = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
    showToast(`🔒 Estimation déverrouillée pour ${newLead.name} ! Dossier enregistré dans le CRM.`);
  };

  // Handler when non-mature lead is saved to nurture
  const handleSaveLead = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);

    if (isAgentMode) {
      showToast('Lead enregistré ! Séquence de nurture 6 semaines activée.');
      setCurrentView('pipeline');
    } else {
      showToast('✅ Votre dossier d\'estimation a été transmis pour étude personnalisée.');
      setCurrentView('landing');
    }
  };

  const handleUpdateLeadStatus = (leadId: string, newStatus: 'HOT' | 'WARM' | 'COLD') => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    showToast(`Statut du lead mis à jour : ${newStatus}`);
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa] text-stone-900 flex flex-col font-sans selection:bg-stone-900 selection:text-white">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-stone-100 px-4 py-3 rounded-xl shadow-lg border border-stone-800 flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER: DUAL MODE (Agent Mode vs Client Mode) */}
      {isAgentMode ? (
        /* =================== AGENT AUTHENTICATED HEADER (Warm Attio/Linear SaaS) =================== */
        <header className="sticky top-0 z-40 bg-[#18181b] text-stone-100 border-b border-zinc-800 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Agent Logo & Security Indicator */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleNavigate('pipeline')}
                className="flex items-center gap-2.5 text-left focus:outline-none group"
              >
                <div className="w-8.5 h-8.5 rounded-xl bg-stone-100 text-stone-900 flex items-center justify-center font-bold text-sm group-hover:bg-white transition-all shadow-xs">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white tracking-tight">Estiméo</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-stone-800 text-stone-300 font-semibold text-[10px] uppercase border border-stone-700">
                      Conseil Pro
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-400 font-normal">Dossiers Vendeurs & Estimations</div>
                </div>
              </button>
            </div>

            {/* Desktop Agent Nav Items */}
            <nav className="hidden lg:flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                id="agent-nav-pipeline"
                onClick={() => handleNavigate('pipeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  currentView === 'pipeline'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>Dossiers & Mandats</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  {leads.filter(l => l.status === 'HOT').length} prioritaires
                </span>
              </button>

              <button
                type="button"
                id="agent-nav-nurture"
                onClick={() => handleNavigate('nurture')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentView === 'nurture'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <MailCheck className="w-3.5 h-3.5" />
                <span>Accompagnement & Relances</span>
              </button>

              <button
                type="button"
                id="agent-nav-calculator"
                onClick={() => handleNavigate('calculator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentView === 'calculator'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Honoraires & Barème</span>
              </button>

              <button
                type="button"
                id="agent-nav-simulator"
                onClick={() => handleNavigate('landing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentView === 'landing' || currentView === 'chat'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Tester le simulateur d'estimation et l'agent de qualification côté client"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Simulateur Vendeur (Test)</span>
              </button>
            </nav>

            {/* Right Action Controls for Agent */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                id="btn-agent-privacy-shield"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="py-1.5 px-3 rounded-lg border border-stone-700 bg-stone-800/80 hover:bg-stone-800 text-stone-200 text-xs font-medium transition-all flex items-center gap-1.5"
                title="Gérer votre anonymat, nom de marque et code PIN"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                <span>Confidentialité & PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAgentMode(false);
                  setCurrentView('landing');
                  showToast('Mode aperçu vendeur activé. Les onglets agent sont masqués.');
                }}
                className="py-1.5 px-3 rounded-lg border border-stone-700 bg-stone-800/50 hover:bg-stone-800 text-stone-300 text-xs font-medium transition-all flex items-center gap-1.5"
                title="Voir ce que voit un vendeur lorsqu'il arrive sur le site"
              >
                <Eye className="w-3.5 h-3.5 text-stone-400" />
                <span>Vue Vendeur</span>
              </button>

              <button
                type="button"
                onClick={handleLockAgentMode}
                className="py-1.5 px-3 rounded-lg border border-rose-950/60 bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 text-xs font-medium transition-all flex items-center gap-1.5"
                title="Verrouiller et masquer le dashboard agent"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Verrouiller</span>
              </button>
            </div>

            {/* Mobile Agent Menu Button */}
            <div className="flex lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-stone-300 hover:bg-stone-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown for Agent */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-zinc-900 border-b border-zinc-800 px-4 py-3 space-y-1">
              {[
                { key: 'pipeline', label: `Dossiers & Mandats (${leads.length})` },
                { key: 'nurture', label: 'Accompagnement & Relances' },
                { key: 'calculator', label: 'Honoraires & Barème' },
                { key: 'landing', label: 'Simulateur Vendeur (Test)' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigate(item.key as NavView)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                    currentView === item.key
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-stone-300 hover:bg-zinc-800/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-stone-200 bg-stone-800/50 border border-stone-700 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-stone-400" />
                  <span>Confidentialité & Code PIN</span>
                </button>
                <button
                  type="button"
                  onClick={handleLockAgentMode}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-rose-300 bg-rose-950/40 border border-rose-800 flex items-center gap-2"
                >
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>Verrouiller l'Espace Pro</span>
                </button>
              </div>
            </div>
          )}
        </header>
      ) : (
        /* =================== PUBLIC CLIENT HEADER (Warm SaaS Editorial) =================== */
        <>
          {/* If authenticated agent is previewing the client view, show subtle floating banner */}
          {isAgentAuthenticated && (
            <div className="bg-stone-900 text-stone-200 px-4 py-2 text-xs flex items-center justify-between border-b border-stone-800 z-50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-medium text-stone-200">
                  Aperçu Public Vendeur actif : Vos prospects profitent d'un portail clair et sans distractions techniques.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAgentMode(true);
                    setCurrentView('pipeline');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-medium text-[11px] flex items-center gap-1 transition-all border border-stone-700"
                >
                  <span>Retour Espace Pro</span>
                  <ArrowRight className="w-3 h-3 text-stone-300" />
                </button>
                <button
                  type="button"
                  onClick={handleLockAgentMode}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 font-medium text-[11px] flex items-center gap-1 border border-rose-900/50"
                >
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>Verrouiller</span>
                </button>
              </div>
            </div>
          )}

          <header className="sticky top-0 z-40 bg-[#fbfbfa]/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              {/* Public Brand Logo with subtle triple-click detection */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleLogoSecretClick();
                    setCurrentView('landing');
                  }}
                  className="flex items-center gap-2.5 text-left focus:outline-none group select-none"
                  title={privacySettings.publicBrandName}
                >
                  <div className="w-8.5 h-8.5 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center font-bold text-sm group-hover:bg-stone-800 transition-all shadow-xs">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-stone-900 tracking-tight">
                        {privacySettings.publicBrandName.split('•')[0].trim() || 'Estiméo'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold text-[10px] uppercase border border-stone-200">
                        Estimation offerte
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-normal">
                      Estimation & Valorisation Immobilière
                    </div>
                  </div>
                </button>
              </div>

              {/* Public Client Funnel: linear progress, no jumping ahead */}
              <nav aria-label="Progression" className="hidden sm:flex items-center gap-2 text-xs font-semibold">
                {[
                  { n: 1, label: 'Estimation', active: currentView === 'landing', done: currentView !== 'landing' },
                  { n: 2, label: 'Échange avec Céline', active: currentView === 'chat', done: currentView === 'confirmation' || !!latestConfirmedLead },
                  { n: 3, label: 'Rendez-vous', active: currentView === 'confirmation', done: false },
                ].map((st, idx) => (
                  <React.Fragment key={st.n}>
                    {idx > 0 && <span className="w-6 h-px bg-stone-300" />}
                    <button
                      type="button"
                      id={`client-nav-step-${st.n}`}
                      disabled={!st.active && !st.done}
                      onClick={() => setCurrentView(st.n === 1 ? 'landing' : st.n === 2 ? 'chat' : 'confirmation')}
                      className={`flex items-center gap-2 transition-colors ${
                        st.active ? 'text-stone-900' : st.done ? 'text-emerald-700 hover:text-emerald-800' : 'text-stone-400 cursor-default'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          st.active ? 'bg-stone-900 text-white' : st.done ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'
                        }`}
                      >
                        {st.done && !st.active ? '✓' : st.n}
                      </span>
                      {st.label}
                    </button>
                  </React.Fragment>
                ))}
              </nav>

              {/* Public Right Area: Discreet Reassurance & Optional Pro Login */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-[11px] font-medium text-stone-600 border border-stone-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Confidentialité garantie</span>
                </div>

                {!privacySettings.hidePublicLoginButton && (
                  <button
                    type="button"
                    id="btn-open-agent-auth"
                    onClick={() => {
                      if (isAgentAuthenticated) {
                        setIsAgentMode(true);
                        setCurrentView('pipeline');
                      } else {
                        setIsAuthModalOpen(true);
                      }
                    }}
                    className="py-1.5 px-3 rounded-lg border border-stone-200/80 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-all flex items-center gap-1.5 shadow-2xs"
                    title="Accès réservé au conseiller immobilier référent"
                  >
                    <Lock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Espace Conseiller</span>
                  </button>
                )}
              </div>
            </div>
          </header>
        </>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'landing' && (
          <LandingSimulator
            onValuationComplete={handleValuationComplete}
            onOpenChatDirect={() => setCurrentView('chat')}
            onLeadCaptured={handleSimulatorLeadCaptured}
            onOpenBooking={handleOpenBooking}
          />
        )}

        {currentView === 'chat' && (
          <QualificationChatbot
            initialValuationInputs={valuationInputs}
            initialValuationResult={valuationResult}
            privacySettings={privacySettings}
            isAgentMode={isAgentMode}
            onBookMeeting={handleOpenBooking}
            onSaveLead={handleSaveLead}
            onBackToSimulator={() => setCurrentView('landing')}
            onOpenPrivacySettings={isAgentMode ? () => setIsPrivacyModalOpen(true) : undefined}
          />
        )}

        {currentView === 'confirmation' && (
          <BookingConfirmationView
            confirmedLead={latestConfirmedLead || leads[0]}
            onModifyBooking={() => {
              setBookingLeadInfo(latestConfirmedLead || leads[0]);
              setIsBookingOpen(true);
            }}
            onBackToEstimator={() => setCurrentView('landing')}
          />
        )}

        {/* Protected Views: rendered only when accessed in authenticated agent mode */}
        {currentView === 'pipeline' && (
          <CrmPipelineView
            leads={leads}
            onSelectLead={(l) => {
              setBookingLeadInfo(l);
              setIsBookingOpen(true);
            }}
            onOpenBookingModal={handleOpenBooking}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onUpdateLead={handleUpdateLead}
            onNavigateToNurture={handleNavigateToNurture}
          />
        )}

        {currentView === 'nurture' && (
          <NurtureEngineView
            leads={leads}
            selectedLeadId={selectedLeadForNurtureId}
            onUpdateLead={handleUpdateLead}
            onShowToast={showToast}
          />
        )}

        {currentView === 'calculator' && <KpiRoiCalculator />}
      </main>

      {/* Calendar Booking Modal */}
      <CalendarBookingModal
        isOpen={isBookingOpen}
        initialLeadInfo={bookingLeadInfo}
        onClose={() => setIsBookingOpen(false)}
        onConfirmBooking={handleConfirmBooking}
      />

      {/* Agent Privacy & PIN Configuration Modal */}
      <PrivacyShieldModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        settings={privacySettings}
        onUpdateSettings={handleUpdatePrivacySettings}
      />

      {/* Agent Authentication / PIN Modal */}
      <AgentAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        settings={privacySettings}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200/80 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">
              {isAgentMode ? 'Estiméo • Suite Conseiller Expert' : privacySettings.publicBrandName}
            </span>
            <span>•</span>
            <span>Conformité RGPD & Secret Professionnel</span>
          </div>

          <div className="flex items-center gap-4 text-stone-500">
            {isAgentMode ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Session Conseiller Active
              </span>
            ) : !privacySettings.hidePublicLoginButton ? (
              <button
                type="button"
                onClick={() => {
                  if (isAgentAuthenticated) {
                    setIsAgentMode(true);
                    setCurrentView('pipeline');
                  } else {
                    setIsAuthModalOpen(true);
                  }
                }}
                className="text-stone-400 hover:text-stone-700 text-xs flex items-center gap-1 transition-colors"
              >
                <Lock className="w-3 h-3 text-stone-400" />
                <span>Espace réservé aux conseillers référents</span>
              </button>
            ) : (
              <span className="text-stone-400 text-xs">
                Audit & estimations certifiés
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
